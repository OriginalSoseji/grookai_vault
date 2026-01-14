// backend/supabase_backend_client.mjs
import './env.mjs';
import { createClient } from '@supabase/supabase-js';

let hasLoggedSupabaseUrl = false;

/**
 * Creates a backend Supabase client using the SERVICE ROLE key.
 * This is the "highway" client for all backend workers.
 *
 * Required env vars:
 *   SUPABASE_URL        - https://<project>.supabase.co
 *   SUPABASE_SECRET_KEY - sb_secret_... (service role)
 */
export function createBackendClient() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const userToken = process.env.GV_USER_ACCESS_TOKEN;

  if (!hasLoggedSupabaseUrl) {
    console.log('[supabase-backend] using url=', url);
    hasLoggedSupabaseUrl = true;
  }

  if (!url) {
    throw new Error('[backend-client] SUPABASE_URL is not set.');
  }
  if (!secret) {
    throw new Error('[backend-client] SUPABASE_SECRET_KEY is not set.');
  }

  const options = userToken
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      }
    : {};

  const client = createClient(url, secret, {
    auth: {
      persistSession: false,
    },
    ...options,
  });

  if (process.env.NODE_ENV !== 'production') {
    const mode = userToken ? 'user' : 'system';
    console.log(`[supabase-backend] auth_mode=${mode}`);
  }

  return client;
}
