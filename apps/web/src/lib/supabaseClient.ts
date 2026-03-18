import { createBrowserClient } from "@supabase/ssr";

// Env authority note:
// Canonical public key source = SUPABASE_PUBLISHABLE_KEY
// NEXT_PUBLIC_SUPABASE_ANON_KEY is a compatibility/framework alias only.
// Do not create additional aliases here.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createBrowserClient(url, anon, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
  },
});
