import { after, NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { createStorePublicClient, STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import type { StoreOwner } from "@/lib/stores/storefrontTypes";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getPublicCardPrintingOptions } from "@/lib/cards/getPublicCardPrintingOptions";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { beginVisualMatch, visualCandidates, visualMatchingEnabled } from "@/lib/stores/visualMatchServer";
import { MAX_SCAN_BYTES } from "@/lib/stores/visualMatchCore.mjs";
import { readScanBody, ScanProcessError } from "@/lib/stores/scanProcessV1.mjs";
import { acquireProductionScan } from "@/lib/stores/scanProductionAdmission";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Allow the bounded upload, V25's 30-second worker, and final public readback.
export const maxDuration = 45;
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: STORE_NO_STORE });

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getSiteOrigin()) return reply({ error: "Invalid request origin" }, 403);
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return reply({ error: "Sign in required" }, 401);
  const { data, error } = await client.rpc("vendor_store_owner_v1");
  const owner = data as StoreOwner | null;
  if (error || !owner?.store || !owner.capabilities.store_app || !owner.rollout.app_enabled) return reply({ error: "Store access unavailable" }, 403);
  if (!visualMatchingEnabled()) return reply({ error: "Visual matching is not enabled here. Search the catalog to continue." }, 503);
  const release = beginVisualMatch(user.id);
  if (!release) return reply({ error: "Matching is busy. Try again shortly or search the catalog." }, 429);
  let releaseShared: (() => Promise<void>) | null;
  try { releaseShared = await acquireProductionScan(user.id); }
  catch { release(); return reply({ error: "Matching is temporarily unavailable. Your draft is unchanged." }, 503); }
  if (!releaseShared) { release(); return reply({ error: "Matching is busy or paused. Try again shortly or search the catalog." }, 429); }
  // Keep the request alive until disposable-worker shutdown and slot release,
  // including when Vercel forwards a client disconnect through request.signal.
  let completeCleanup!: () => void;
  const cleanup = new Promise<void>(resolve => { completeCleanup = resolve; });
  after(() => cleanup);
  try {
    if (!/^image\/(jpeg|png|webp)$/.test(request.headers.get("content-type") ?? "")) return reply({ error: "Send a JPEG, PNG or WebP front preview." }, 415);
    if (Number(request.headers.get("content-length")) > MAX_SCAN_BYTES) return reply({ error: "Scan is too large." }, 413);
    let bytes: Uint8Array;
    try { bytes = await readScanBody(request.body, { maxBytes: MAX_SCAN_BYTES, timeoutMs: 5_000, signal: request.signal }); }
    catch (error) {
      if (error instanceof ScanProcessError && error.code === "too_large") return reply({ error: "Scan is too large." }, 413);
      if (error instanceof ScanProcessError && error.code === "empty") return reply({ error: "Front scan required." }, 400);
      return reply({ error: "Scan upload timed out or was cancelled. Your draft is unchanged; retry or use catalog search." }, 408);
    }
    let matched: Awaited<ReturnType<typeof visualCandidates>>;
    try { matched = await visualCandidates(bytes, request.signal); }
    catch (error) {
      // Bounded operator diagnostic: no scan bytes, OCR text, user ID or URL.
      console.warn("store_scan_process", error instanceof ScanProcessError ? error.code : "failed");
      return reply({ error: "Could not finish matching. Your draft is unchanged; retry, use a clearer front, or search the catalog." }, 503);
    }
    if (!matched.candidates.length) return reply({ status: "no_match", cards: [] });
    // Historical/reference identities never bypass today's anonymous canonical/printing boundary.
    const publicClient = createStorePublicClient();
    const { data: rows, error: readError } = await publicClient.from("card_prints")
      .select("id,gv_id,name,number,set_code,variant_key,printed_identity_modifier,sets(identity_model),image_source,image_path,image_url,image_alt_url,image_status,image_note")
      .in("id", matched.candidates.map(c => c.id));
    if (readError) return reply({ error: "Catalog validation unavailable. Search again shortly." }, 503);
    const printings = await getPublicCardPrintingOptions(publicClient, (rows ?? []).map(r => r.id));
    const cards = [];
    for (const candidate of matched.candidates) {
      const row = rows?.find(r => r.id === candidate.id), reference = matched.references.find(r => r.id === candidate.id);
      if (!row || !reference || row.gv_id !== reference.gv_id || row.image_path !== reference.image_path || row.image_status !== "exact" || row.image_source !== "identity") continue;
      const eligible = printings.filter(p => p.card_print_id === row.id && p.printing_gv_id);
      if (!eligible.length) continue;
      const artwork = await resolveCardImageFieldsV1(row);
      if (artwork.display_image_kind !== "exact") continue;
      const set = (Array.isArray(row.sets) ? row.sets[0] : row.sets) as { identity_model?: string } | null;
      cards.push({ id: row.id, gv_id: row.gv_id, rotation: candidate.rotation, name: resolveDisplayIdentity({ ...row, set_identity_model: set?.identity_model }).display_name, number: row.number, set_code: row.set_code, image: artwork.display_image_url,
        printings: eligible.map(p => ({ id: p.id, printing_gv_id: p.printing_gv_id, finish_label: p.finish_label })) });
    }
    return reply({ status: cards.length > 1 ? "ambiguous" : cards.length ? "suggestions" : "no_match", cards });
  } catch {
    return reply({ error: "Matching could not finish. Your draft is unchanged; use catalog search or retry." }, 503);
  } finally {
    try { await releaseShared(); }
    finally { release(); completeCleanup(); }
  }
}
