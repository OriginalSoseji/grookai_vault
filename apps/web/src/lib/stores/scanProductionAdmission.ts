import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { productionStoreTarget } from "./storeProductionTarget.mjs";
import { METADATA_SHA256, METADATA_SOURCE_SHA256 } from "./scanReferenceMetadataV27.mjs";
import { FEATURE_MANIFEST_PINS } from "./scanFeatureManifestV29.mjs";

// Called only after verified authentication and store access. Lease IDs and
// private release bindings stay server-side; a process-local counter is extra.
export async function acquireProductionScan(userId: string): Promise<(() => Promise<void>) | null> {
  if (!productionStoreTarget()) return async () => {};
  const admin = createServerAdminClient();
  const { data, error } = await admin.rpc("vendor_scan_acquire_v1", { p_owner: userId });
  if (error || !data) return null;
  const lease = data as Record<string, unknown>;
  if (typeof lease.lease !== "string" || !/^[0-9a-f-]{36}$/.test(lease.lease)) return null;
  let released = false;
  const release = async () => {
    if (released) return;
    released = true;
    const result = await admin.rpc("vendor_scan_release_v1", { p_lease: lease.lease });
    // A crash or release outage expires after 60s; never log tokens or owner IDs.
    if (result.error) console.warn("store_scan_lease_release_failed");
  };
  if (lease.database_ref !== "ycdxbpibncqcchqiihfz" || lease.artifact_sha256 !== METADATA_SOURCE_SHA256
    || lease.metadata_sha256 !== METADATA_SHA256 || lease.feature_manifest_sha256 !== FEATURE_MANIFEST_PINS.sha256) {
    await release(); return null;
  }
  return release;
}
