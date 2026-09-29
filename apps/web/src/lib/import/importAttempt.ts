import type { MatchResult } from "@/types/import";

export type ImportTarget = {
  cardId: string; gvId: string; desiredQuantity: number; condition: string;
  acquisitionCost: number | null; createdAt: string | null; notes: string | null;
};
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const boundedText = (value: unknown, max: number) => value == null || (typeof value === "string" && value.length <= max);

// Pure validation shared by runtime checks; client-supplied catalog IDs remain
// untrusted until the database validates the UUID/GV-ID pair under its row lock.
export function prepareImportTargets(input: unknown, requestId: string) {
  if (!uuid.test(requestId) || !Array.isArray(input) || input.length > 5000 ||
      // Leave headroom for the Server Action envelope below Next's 1 MiB cap.
      new TextEncoder().encode(JSON.stringify(input)).length > 512 * 1024) throw new Error("invalid_import");
  const merged = new Map<string, ImportTarget>();
  let needsManualMatch = 0;
  for (const item of input) {
    if (!object(item) || !["matched", "missing", "multiple"].includes(String(item.status))) throw new Error("invalid_import");
    if (item.status !== "matched") { needsManualMatch++; continue; }
    if (!object(item.row) || !object(item.match)) throw new Error("invalid_import");
    const row = item.row, match = item.match;
    const meta = object(item.importMeta) ? item.importMeta : null;
    const quantity = meta?.desiredQuantity ?? row.quantity;
    if (typeof match.card_id !== "string" || !uuid.test(match.card_id) ||
        typeof match.gv_id !== "string" || !match.gv_id.trim() || match.gv_id.length > 200 ||
        !integer(quantity) || quantity < 1 || !["NM", "LP", "MP", "HP", "DMG"].includes(String(row.condition)) ||
        !boundedText(row.notes, 4000) || !boundedText(row.added, 40) ||
        (row.added != null && !Number.isFinite(Date.parse(String(row.added)))) ||
        (row.cost != null && (typeof row.cost !== "number" || !Number.isFinite(row.cost) || row.cost < 0 || row.cost > 1e9))) throw new Error("invalid_import");
    const cardId = match.card_id.toLowerCase(), current = merged.get(cardId);
    if (current && current.gvId !== match.gv_id) throw new Error("conflicting_identity");
    const dates = [current?.createdAt, row.added].filter((x): x is string => typeof x === "string").sort();
    merged.set(cardId, { cardId, gvId: match.gv_id, desiredQuantity: (current?.desiredQuantity ?? 0) + quantity,
      condition: current?.condition ?? String(row.condition),
      acquisitionCost: typeof row.cost === "number" ? row.cost : current?.acquisitionCost ?? null,
      createdAt: dates[0] ?? null, notes: current?.notes ?? (typeof row.notes === "string" ? row.notes.trim() || null : null) });
  }
  const targets = [...merged.values()].sort((a, b) => a.cardId.localeCompare(b.cardId));
  if (targets.reduce((sum, row) => sum + row.desiredQuantity, 0) > 50000 ||
      new Set(targets.map(row => row.gvId)).size !== targets.length) throw new Error("invalid_import");
  return { targets, needsManualMatch };
}

export function verifyImportReceipt(value: unknown, targets: ImportTarget[], requestId: string): asserts value is {
  success: true; requestId: string; importedCards: number; importedEntries: number; targets: {cardPrintId: string; expectedCount: number}[];
} {
  if (!object(value) || value.success !== true || value.requestId !== requestId ||
      !integer(value.importedCards) || !integer(value.importedEntries) || value.importedEntries > targets.length ||
      value.importedCards > targets.reduce((sum, t) => sum + t.desiredQuantity, 0) ||
      !Array.isArray(value.targets) || value.targets.length !== targets.length) throw new Error("unverified_receipt");
  const expected = new Map(targets.map(t => [t.cardId, t.desiredQuantity]));
  for (const item of value.targets) {
    if (!object(item) || typeof item.cardPrintId !== "string" || !expected.has(item.cardPrintId) ||
        !integer(item.expectedCount) || item.expectedCount < expected.get(item.cardPrintId)!) throw new Error("unverified_receipt");
    expected.delete(item.cardPrintId);
  }
}

export type StoredImportAttempt = { version: 1; ownerId: string; requestId: string; rows: MatchResult[]; fileName: string | null };
export function parseStoredImportAttempt(raw: string | null, ownerId: string): StoredImportAttempt | null {
  if (!raw) return null;
  try {
    const item: unknown = JSON.parse(raw);
    if (!object(item) || item.version !== 1 || item.ownerId !== ownerId || typeof item.requestId !== "string" ||
        !Array.isArray(item.rows) || !boundedText(item.fileName, 1024)) return null;
    prepareImportTargets(item.rows, item.requestId);
    return item as StoredImportAttempt;
  } catch { return null; }
}
