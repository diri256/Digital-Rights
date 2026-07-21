/* DIRI Supabase client configuration.
   The publishable key is intentionally safe for browser use. Never add a
   secret or service_role key to this file. */
(function () {
  'use strict';

  const projectUrl = 'https://ivibodfupmwebnjsttqz.supabase.co';
  const publishableKey = 'sb_publishable_pj-flWuy7jeJI7LF2p4RKg_yp98kKJ5';

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
