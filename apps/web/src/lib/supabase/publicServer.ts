import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase/config";

export function createPublicServerClient(revalidateSeconds = 60) {
  const { url, publishableKey } = getSupabaseServerConfig();
  const publicFetch: typeof fetch = (input, init) => {
    const nextInit = {
      ...init,
      next: {
        ...((init as { next?: Record<string, unknown> } | undefined)?.next ?? {}),
        revalidate: revalidateSeconds,
      },
    } as RequestInit & { next: { revalidate: number } };

    return fetch(input, nextInit);
  };

  // LOCK: Public read helpers should be cacheable by default.
  // LOCK: Prefer bounded revalidation over request-by-request dynamic rendering.
  return createClient(url, publishableKey, {
    global: {
      fetch: publicFetch,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
