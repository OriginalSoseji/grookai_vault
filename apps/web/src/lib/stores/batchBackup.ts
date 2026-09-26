import { BATCH_FILE_LIMIT, BATCH_TOTAL_LIMIT, type IntakeBatch, type BatchSettings, type BatchItem, type BatchAsset } from "./batchIntake.ts";
import { parseBatchCommit } from "./batchCommitInput.ts";
import { inventoryId, type CatalogChoice } from "./storeInventoryInput.ts";

// Binary framing avoids base64 inflation and never extracts filenames or fetches URLs.
const MAGIC = new TextEncoder().encode("GVBATCH1\n");
const HEADER_LIMIT = 2 * 1024 * 1024;
export const BACKUP_LIMIT = 512 * 1024 * 1024;
const fail = (): never => { throw new Error("This backup is incomplete or invalid. Keep the original file and batch."); };
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : fail();
const text = (v: unknown, max: number): string => typeof v === "string" && v.length <= max ? v : fail();
const bool = (v: unknown): boolean => typeof v === "boolean" ? v : fail();
const list = (v: unknown, max: number): unknown[] => Array.isArray(v) && v.length <= max ? v : fail();
const integer = (v: unknown, max: number): number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max ? Number(v) : fail();
const digest = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())), n => n.toString(16).padStart(2, "0")).join("");
const unique = (ids: string[]) => { if (new Set(ids).size !== ids.length) fail(); };
function settings(value: unknown): BatchSettings {
  const v = record(value), intent = text(v.intent, 4);
  if (intent !== "hold" && intent !== "sell") fail();
  // Incomplete draft values are retained for review; committed requests use stricter validation.
  return { condition: text(v.condition, 8), intent: intent as "hold" | "sell", amount: text(v.amount, 32), currency: text(v.currency, 3), location: text(v.location, 120), sections: list(v.sections, 50).map(inventoryId) };
}
function card(value: unknown): CatalogChoice | null {
  if (value === null) return null;
  const v = record(value);
  return { id: inventoryId(v.id), gv_id: text(v.gv_id, 100), name: text(v.name, 300), number: text(v.number, 100), set_code: text(v.set_code, 100),
    // A backup is untrusted: do not load caller-supplied remote image URLs.
    image: null, printings: list(v.printings, 100).map(p => { const r = record(p); return { id: inventoryId(r.id), printing_gv_id: r.printing_gv_id === null ? null : text(r.printing_gv_id, 100), finish_label: text(r.finish_label, 100) }; }) };
}
export async function exportBatchBackup(batch: IntakeBatch, environment: string): Promise<Blob> {
  if (!environment) throw new Error("Backup environment is unavailable.");
  const blobs: Blob[] = [], references = new Map<Blob, number>();
  const ref = (blob: Blob | null): number | null => {
    if (blob === null) return null;
    const previous = references.get(blob); if (previous !== undefined) return previous;
    const index = blobs.length; references.set(blob, index); blobs.push(blob); return index;
  };
  const saved = { ...batch, assets: batch.assets.map(a => ({ ...a, original: ref(a.original), preview: ref(a.preview) })),
    items: batch.items.map(i => ({ ...i, ...(i.submission ? { submission: { request: i.submission.request, front: ref(i.submission.front), back: ref(i.submission.back) } } : {}) })) };
  if (blobs.reduce((n, b) => n + b.size, 0) > BACKUP_LIMIT - HEADER_LIMIT) throw new Error("This batch is too large for a backup. Keep its original scans and this browser draft.");
  const media = [];
  for (const b of blobs) media.push({ size: b.size, type: b.type, sha256: await digest(b) });
  const header = new TextEncoder().encode(JSON.stringify({ format: "grookai-batch", version: 1, environment, batch: saved, media }));
  if (header.length > HEADER_LIMIT) fail();
  const size = new Uint8Array(4); new DataView(size.buffer).setUint32(0, header.length);
  return new Blob([MAGIC, size, header, ...blobs], { type: "application/octet-stream" });
}
export async function importBatchBackup(file: Blob, storeId: string, environment: string): Promise<IntakeBatch> {
  if (!environment || file.size > BACKUP_LIMIT || file.size < MAGIC.length + 4) fail();
  const start = new Uint8Array(await file.slice(0, MAGIC.length + 4).arrayBuffer());
  if (!MAGIC.every((b, n) => start[n] === b)) fail();
  const length = new DataView(start.buffer).getUint32(MAGIC.length);
  if (!length || length > HEADER_LIMIT || length + start.length > file.size) fail();
  const header = record(JSON.parse(await file.slice(start.length, start.length + length).text()));
  if (header.format !== "grookai-batch" || header.version !== 1) fail();
  const raw = record(header.batch);
  if (header.environment !== environment || raw.storeId !== storeId) throw new Error("This backup belongs to another store or environment. Sign in to its original store to restore it.");
  const media = list(header.media, 3000), blobs: Blob[] = [];
  let position = start.length + length;
  for (const value of media) {
    const m = record(value), size = integer(m.size, BATCH_FILE_LIMIT), type = text(m.type, 100), hash = text(m.sha256, 64);
    if (!/^[a-f0-9]{64}$/.test(hash) || position + size > file.size) fail();
    const b = file.slice(position, position + size, type); position += size;
    if (await digest(b) !== hash) fail();
    blobs.push(b);
  }
  if (position !== file.size) fail();
  const referenced = new Set<number>();
  const blob = (v: unknown, nullable = false): Blob | null => {
    if (nullable && v === null) return null;
    const index = integer(v, blobs.length - 1); referenced.add(index); return blobs[index];
  };
  const preview = async (v: unknown, nullable = true) => {
    const b = blob(v, nullable); if (!b) return null;
    if (!b.size || b.size > 4 * 1024 * 1024) fail();
    const bytes = new Uint8Array(await b.slice(0, 12).arrayBuffer());
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = [137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n);
    const webp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!(jpeg && b.type === "image/jpeg") && !(png && b.type === "image/png") && !(webp && b.type === "image/webp")) fail();
    return b;
  };
  if (raw.version !== 1 || (raw.layout !== "front" && raw.layout !== "pairs")) fail();
  const assets: BatchAsset[] = [];
  for (const value of list(raw.assets, 1000)) {
    const a = record(value), original = blob(a.original)!;
    assets.push({ id: inventoryId(a.id), name: text(a.name, 300), hash: text(a.hash, 64), original, preview: await preview(a.preview), error: a.error === null ? null : text(a.error, 2000) });
  }
  unique(assets.map(a => a.id));
  if (assets.reduce((n, a) => n + a.original.size, 0) > BATCH_TOTAL_LIMIT) fail();
  const id = inventoryId(raw.id), items: BatchItem[] = [];
  for (const value of list(raw.items, 50)) {
    const v = record(value), front = inventoryId(v.front), back = v.back === null ? null : inventoryId(v.back);
    if (!assets.some(a => a.id === front) || (back && !assets.some(a => a.id === back))) fail();
    const rotation = integer(v.rotation, 270); if (rotation % 90) fail();
    const item: BatchItem = { id: inventoryId(v.id), front, back, rotation, requiresBack: bool(v.requiresBack), card: card(v.card), printing: v.printing === "" ? "" : inventoryId(v.printing), settings: settings(v.settings), confirmed: false, overridden: bool(v.overridden), picked: false, receipt: null, error: null };
    if (v.receipt && !v.submission) fail();
    if (v.submission) {
      const sub = record(v.submission), request = parseBatchCommit(sub.request), f = (await preview(sub.front, false))!, b = await preview(sub.back);
      if (request.batch_id !== id || request.item_id !== item.id || request.card_id !== item.card?.id || request.printing_id !== item.printing ||
          await digest(f) !== request.front_sha256 || (b ? await digest(b) : null) !== request.back_sha256) fail();
      const details = parseBatchCommit({ ...request, ...item.settings });
      if (JSON.stringify(details) !== JSON.stringify(request)) fail();
      // Restore the exact frozen media as the visible previews too.
      const fa = assets.find(a => a.id === front)!; if (!fa.preview || await digest(fa.preview) !== request.front_sha256) fail();
      if (Boolean(back) !== Boolean(b)) fail();
      if (back && await digest(assets.find(a => a.id === back)!.preview ?? new Blob()) !== request.back_sha256) fail();
      item.submission = { request, front: f, back: b }; item.confirmed = true;
      // Completion is never trusted from a file. Retry reconciles with the server.
      item.error = "Restored submission. Select and resume to check its saved result.";
    }
    items.push(item);
  }
  unique(items.map(i => i.id)); if (referenced.size !== blobs.length) fail();
  return { version: 1, id, storeId, revision: 0, name: text(raw.name, 100), layout: raw.layout as "front" | "pairs", defaults: settings(raw.defaults), assets, items, updatedAt: new Date().toISOString() };
}
