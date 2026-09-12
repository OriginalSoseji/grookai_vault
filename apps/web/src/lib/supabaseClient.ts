import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@supabase/supabase-js";
import { collectorPreview, createPreviewReadFetch } from "@/lib/collectorPreview";

// Env authority note:
// Canonical public key source = SUPABASE_PUBLISHABLE_KEY
// NEXT_PUBLIC_SUPABASE_ANON_KEY is a compatibility/framework alias only.
// Do not create additional aliases here.

const { url, publishableKey } = getSupabasePublicConfig();

export const supabase = collectorPreview ? createClient(url, publishableKey, {
  global: { fetch: createPreviewReadFetch(url, publishableKey) },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : createBrowserClient(url, publishableKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
  },
});
