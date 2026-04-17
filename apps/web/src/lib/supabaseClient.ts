import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

// Env authority note:
// Canonical public key source = SUPABASE_PUBLISHABLE_KEY
// NEXT_PUBLIC_SUPABASE_ANON_KEY is a compatibility/framework alias only.
// Do not create additional aliases here.

const { url, publishableKey } = getSupabasePublicConfig();

export const supabase = createBrowserClient(url, publishableKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
  },
});
