import "server-only";

import { createClient } from "@supabase/supabase-js";
import { collectorPreview } from "@/lib/collectorPreview";
import { collectorStaging, assertCollectorStagingTarget } from "@/lib/collectorStaging.mjs";

function createUncachedServerAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  }

  if (collectorStaging) assertCollectorStagingTarget(url);
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let cachedServerAdminClient: ReturnType<typeof createUncachedServerAdminClient> | null = null;

export function createServerAdminClient(): ReturnType<typeof createUncachedServerAdminClient> {
  if (collectorPreview) throw new Error("Administrative access is disabled in the collector preview.");
  if (!cachedServerAdminClient) {
    cachedServerAdminClient = createUncachedServerAdminClient();
  }

  return cachedServerAdminClient;
}
