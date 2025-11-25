// scripts/backend/supabase_backend_client.mjs
import { createClient } from '@supabase/supabase-js';

export function createBackendClient() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error('[backend-client] Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  }

  const client = createClient(url, secret, {
    global: {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    },
    auth: { persistSession: false },
  });

  return client;
}

