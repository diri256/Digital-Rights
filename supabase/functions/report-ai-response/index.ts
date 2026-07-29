import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const recentRequests = new Map<string, number[]>();

function json(status: number, payload: Record<string, unknown>) {
  return Response.json(payload, {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed." });

  const forwarded = request.headers.get("x-forwarded-for") ||
    request.headers.get("cf-connecting-ip") || "unknown";
  const clientId = forwarded.split(",")[0].trim();
  const now = Date.now();
  const recent = (recentRequests.get(clientId) || [])
    .filter((time) => now - time < 60000);
  if (recent.length >= 5) {
    return json(429, { error: "Too many reports. Please wait a minute." });
  }
  recent.push(now);
  recentRequests.set(clientId, recent);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid report." });
  }
  if (body.website) return json(200, { reported: true });

  const question = typeof body.question === "string"
    ? body.question.trim().slice(0, 1000)
    : "";
  const response = typeof body.response === "string"
    ? body.response.trim().slice(0, 5000)
    : "";
  const reason = typeof body.reason === "string"
    ? body.reason.trim().slice(0, 500)
    : "";
  const pageUrl = typeof body.pageUrl === "string"
    ? body.pageUrl.trim().slice(0, 500)
    : null;
  if (!question || !response || reason.length < 3) {
    return json(400, { error: "Please explain what seems incorrect." });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceRoleKey) {
    return json(503, { error: "Reporting is temporarily unavailable." });
  }

  let userId: string | null = null;
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const authClient = createClient(projectUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await authClient.auth.getUser(
      authorization.slice("Bearer ".length),
    );
    userId = data.user?.id || null;
  }

  const adminClient = createClient(projectUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await adminClient.from("ai_response_reports").insert({
    user_id: userId,
    question,
    response,
    reason,
    page_url: pageUrl,
  });
  if (error) {
    console.error("Unable to save AI response report:", error.message);
    return json(500, { error: "We could not save your report right now." });
  }

  return json(201, { reported: true });
});
