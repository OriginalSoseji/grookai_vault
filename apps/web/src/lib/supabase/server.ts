import "server-only";

import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const CODE_VERIFIER_SUFFIX = "-code-verifier";

export function createClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = cookies();

  return createSupabaseClient(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: false,
      storage: {
        getItem(keyName: string) {
          if (!keyName.endsWith(CODE_VERIFIER_SUFFIX)) {
            return null;
          }

          return cookieStore.get(keyName)?.value ?? null;
        },
        setItem() {
          // The browser client already persists the PKCE verifier before redirect.
        },
        removeItem() {
          // Cleanup is handled by response cookies in the callback route.
        },
      },
    },
  });
}
