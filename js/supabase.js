/* DIRI Supabase client configuration.
   The publishable key is intentionally safe for browser use. Never add a
   secret or service_role key to this file. */
(function () {
  'use strict';

  const projectUrl = 'https://ivibodfupmwebnjsttqz.supabase.co';
  const publishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2aWJvZGZ1cG13ZWJuanN0dHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjkwNTUsImV4cCI6MjEwMDIwNTA1NX0.yT87OrAmkHDO_dH7WnTLWXQ2XC2phPRySbB9Pb5yzbc';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase client library failed to load.');
    return;
  }

  window.diriSupabase = window.supabase.createClient(projectUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
})();
