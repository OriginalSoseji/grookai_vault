import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase/config";
import { collectorPreview, createPreviewReadFetch } from "@/lib/collectorPreview";

export function createPublicServerClient(revalidateSeconds = 60, requestTimeoutMs?: number) {
  const { url, publishableKey } = getSupabaseServerConfig();
  const publicFetch: typeof fetch = (input, init) => {
    const existingSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const deadline = requestTimeoutMs === undefined ? undefined : AbortSignal.timeout(requestTimeoutMs);
    const signal = deadline && existingSignal ? AbortSignal.any([deadline, existingSignal]) : deadline ?? existingSignal;
    const nextInit = {
      ...init,
      ...(signal ? { signal } : {}),
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
      fetch: collectorPreview ? createPreviewReadFetch(url, publishableKey, publicFetch) : publicFetch,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
