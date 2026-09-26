import "server-only";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase/config";
import { getPublicCardPrintingOptions } from "@/lib/cards/getPublicCardPrintingOptions";
import { VENDOR_PILOT_DATABASE } from "@/lib/vendorPilot.mjs";
import { vendorBatchLocalTest } from "@/lib/collectorStaging.mjs";
import { productionStoreTarget } from "./storeProductionTarget.mjs";
import { createReferenceDelivery, eligibleReferenceIds, readBoundedResponse } from "./scanReferenceDeliveryV24.mjs";
import { visualReferenceMetadataV24 } from "./scanVisualCatalogV24.mjs";
import { visualReferenceMetadataV27 } from "./scanReferenceMetadataV27.mjs";
import { runVisualProcessV24 } from "./scanVisualProcessV24.mjs";
import type { VisualReferenceV24 } from "./scanVisualProcessV24.mjs";
import { featureManifestV29 } from "./scanFeatureManifestV29.mjs";
import { createFeatureDeliveryV29, FEATURE_BUCKET_V29, featurePathV29 } from "./scanFeatureDeliveryV29.mjs";

export async function visualCandidatesV24(bytes: Uint8Array, callerSignal?: AbortSignal) {
  const started = performance.now();
  const cached = process.env.GROOKAI_STORE_SCAN_FEATURES_V29_ENABLED === "true";
  const pipelined = !cached && process.env.GROOKAI_STORE_SCAN_VISUAL_V26_ENABLED === "true";
  const optimized = cached || pipelined || process.env.GROOKAI_STORE_SCAN_VISUAL_V25_ENABLED === "true";
  const budget = optimized ? 30_000 : 20_000;
  const signal = AbortSignal.any([AbortSignal.timeout(budget), ...(callerSignal ? [callerSignal] : [])]);
  signal.throwIfAborted();
  const { url, publishableKey } = getSupabaseServerConfig();
  if (!productionStoreTarget() && url !== VENDOR_PILOT_DATABASE && !(vendorBatchLocalTest && url === "http://127.0.0.1:27621")) throw new Error("Invalid visual reference target.");
  const byId = cached || process.env.GROOKAI_STORE_SCAN_METADATA_V27_ENABLED === "true"
    ? visualReferenceMetadataV27() : visualReferenceMetadataV24();
  const features = cached ? featureManifestV29(byId) : undefined;
  const loadReferences = async (ids: string[], options: { signal: AbortSignal }) => {
    const deliverySignal = AbortSignal.any([options.signal, AbortSignal.timeout(7_000)]);
    // Supabase SDK uses the canonical server configuration; only its fetch transport
    // is bounded. No owner cookies/session or admin key enter anonymous reads.
    const boundedFetch: typeof fetch = async (input, init) => {
      const requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (requestUrl.origin !== url) throw new Error("Invalid reference service target.");
      const response = await fetch(input, { ...init, signal: deliverySignal, cache: "no-store", redirect: "error" });
      const body = await readBoundedResponse(response, 2 * 1024 * 1024, deliverySignal);
      return new Response(new Uint8Array(body), { status: response.status, headers: { "content-type": "application/json" } });
    };
    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: boundedFetch } };
    const publicClient = createClient(url, publishableKey, clientOptions);
    const authorize = async (rows: VisualReferenceV24[]) => {
      const { data, error } = await publicClient.from("card_prints")
        .select("id,gv_id,image_path,image_status,image_source").in("id", rows.map(row => row.id));
      if (error) throw new Error("Reference visibility unavailable.");
      const printings = await getPublicCardPrintingOptions(publicClient, (data ?? []).map(row => row.id));
      return eligibleReferenceIds(rows, data ?? [], printings);
    };
    const signPaths = async (bucket: string, paths: string[]) => {
      const secret = process.env.SUPABASE_SECRET_KEY;
      if (!secret) throw new Error("Reference storage unavailable.");
      // Administrative capability is limited to signing already authorized,
      // pinned reference paths. Signed URLs never leave this parent process.
      const admin = createClient(url, secret, clientOptions);
      const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, 30);
      if (error || data?.length !== paths.length) throw new Error("Reference storage unavailable.");
      return paths.map(pinnedPath => {
        const item = data.find(value => value.path === pinnedPath);
        if (!item?.signedUrl || item.error) throw new Error("Reference storage unavailable.");
        return item.signedUrl;
      });
    };
    const loader = features ? createFeatureDeliveryV29({ byId, manifest: features, origin: url, authorize,
      sign: rows => signPaths(FEATURE_BUCKET_V29, rows.map(featurePathV29)) })
      : createReferenceDelivery({ byId, origin: url, authorize,
        sign: rows => signPaths("user-card-images", rows.map(row => row.image_path)) });
    return loader(ids, { signal: deliverySignal });
  };
  signal.throwIfAborted();
  const remaining = Math.floor(budget - (performance.now() - started));
  if (remaining < 1) throw new Error("Visual request expired.");
  const worker = cached ? "scanVisualWorkerV29.mjs" : pipelined ? "scanVisualWorkerV26.mjs" : optimized ? "scanVisualWorkerV25.mjs" : "scanVisualWorkerV24.mjs";
  return runVisualProcessV24(path.join(process.cwd(), "src/lib/stores", worker), bytes,
    { byId, loadReferences, featureManifest: features, signal, timeoutMs: remaining,
      onResources: process.env.GROOKAI_STORE_SCAN_RESOURCE_DIAGNOSTICS === "true"
        ? resources => console.info("store_scan_resources_v26", JSON.stringify(resources)) : undefined,
      onProgress: process.env.GROOKAI_STORE_SCAN_VISUAL_DIAGNOSTICS === "true"
        ? progress => console.info("store_scan_visual_v24", JSON.stringify(progress)) : undefined });
}
