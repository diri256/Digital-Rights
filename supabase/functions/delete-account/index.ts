import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required." }, { status: 401, headers: corsHeaders });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: "Account deletion is temporarily unavailable." }, { status: 503, headers: corsHeaders });
  }

  const accessToken = authorization.slice("Bearer ".length);
  const authClient = createClient(projectUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  const user = userData.user;
  if (userError || !user) {
    return Response.json({ error: "Your session is no longer valid. Please log in again." }, { status: 401, headers: corsHeaders });
  }

  const adminClient = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: avatarFiles, error: listError } = await adminClient.storage.from("avatars").list(user.id, { limit: 100 });
  if (!listError && avatarFiles?.length) {
    const paths = avatarFiles.map((file) => `${user.id}/${file.name}`);
    const { error: removeError } = await adminClient.storage.from("avatars").remove(paths);
    if (removeError) console.error("Unable to remove account avatars:", removeError.message);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id, false);
  if (deleteError) {
    console.error("Unable to delete account:", deleteError.message);
    return Response.json({ error: "We could not delete your account right now. Please try again." }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ deleted: true }, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});