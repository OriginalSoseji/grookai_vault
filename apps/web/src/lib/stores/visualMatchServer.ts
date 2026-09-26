import "server-only";
import index from "./visualMatchIndex.json";
import path from "node:path";
import type { VisualResultV24 } from "./scanVisualProcessV24.mjs";
import { runScanProcess } from "./scanProcessV1.mjs";
import expandedManifest from "./scanExpandedManifestV13.json";
import { vendorPilot, VENDOR_PILOT_DATABASE } from "@/lib/vendorPilot.mjs";
import { vendorBatchLocalTest } from "@/lib/collectorStaging.mjs";
import { productionStoreTarget } from "./storeProductionTarget.mjs";

// V1 remains retired. V2 requires its own flag and the fixed isolated pilot.
// A stale V1 deployment flag cannot reopen the failed image-only matcher.
export const visualMatchingEnabled = (): boolean => (productionStoreTarget()
  // Production only admits the fully qualified geometry/feature engine. The
  // shared DB lease additionally requires the exact approved reference pins.
  && process.env.GROOKAI_STORE_SCAN_VISUAL_V24_ENABLED === "true"
  && process.env.GROOKAI_STORE_SCAN_FEATURES_V29_ENABLED === "true"
  && process.env.GROOKAI_STORE_SCAN_MATCH_V14_ENABLED !== "true"
  || vendorPilot
  && process.env.SUPABASE_URL === VENDOR_PILOT_DATABASE || vendorBatchLocalTest
  && process.env.SUPABASE_URL === "http://127.0.0.1:27621"
  && process.env.NEXT_PUBLIC_SUPABASE_URL === process.env.SUPABASE_URL)
  && process.env.GROOKAI_STORE_SCAN_MATCH_V2_ENABLED === "true"
  && VENDOR_PILOT_DATABASE === `https://${index.database}.supabase.co`;
export const expandedVisualMatchingEnabled = (): boolean => visualMatchingEnabled()
  && process.env.GROOKAI_STORE_SCAN_MATCH_V14_ENABLED === "true"
  && expandedManifest.database === index.database;
export const geometryVisualMatchingEnabled = (): boolean => visualMatchingEnabled()
  && process.env.GROOKAI_STORE_SCAN_VISUAL_V24_ENABLED === "true"
  && expandedManifest.database === index.database;
const attempts = new Map<string, { start: number; count: number; busy: boolean }>();
let concurrent = 0;
export function beginVisualMatch(userId: string): (() => void) | null {
  const now = Date.now();
  for (const [id, entry] of attempts) if (!entry.busy && now - entry.start > 60_000) attempts.delete(id);
  const entry = attempts.get(userId) ?? { start: now, count: 0, busy: false };
  if (entry.busy || entry.count >= 50 || concurrent >= (geometryVisualMatchingEnabled() || expandedVisualMatchingEnabled() ? 1 : 2) || attempts.size >= 1000) return null;
  entry.count++; entry.busy = true; concurrent++; attempts.set(userId, entry);
  let released = false;
  return () => { if (released) return; released = true; entry.busy = false; concurrent--; };
}
export async function visualCandidates(bytes: Uint8Array, signal?: AbortSignal) {
  if (geometryVisualMatchingEnabled()) {
    if (expandedVisualMatchingEnabled()) throw new Error("Choose one expanded scan engine.");
    return (await import("./scanVisualServerV24")).visualCandidatesV24(bytes, signal);
  }
  return runScanProcess<VisualResultV24>(path.join(process.cwd(), "src/lib/stores/scanMatchWorker.mjs"), {
    version: expandedVisualMatchingEnabled() ? "v14" : "v2", bytes,
  }, { timeoutMs: 20_000, signal });
}
