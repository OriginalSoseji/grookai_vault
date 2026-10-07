import type { SupabaseClient } from "@supabase/supabase-js";
import { normalize, parseCsv } from "../../../../../supabase/functions/vault-import-collection-v2/source.ts";
import { readImportPages, type CollectionSelection } from "./collectionPreviewV2.ts";

export type CollectionAttemptV2 = { version: 2; ownerUserId: string; requestId: string; csvText: string; targets: CollectionSelection[]; fileName: string };
export type CollectionReceiptV2 = { success: true; requestId: string; sourceSha256: string; sourceRows: number; reviewRows: number; importedCards: number; importedEntries: number; targets: (CollectionSelection & { instanceIds: string[] })[] };
const uncertain = () => new Error("The saved result could not be confirmed. Retry this same import safely.");
const canonical = (value: unknown): string => JSON.stringify(value, (_, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
type ImportGroup = { group_key: string; source_indices: number[]; instance_ids: string[]; target?: {cardId: string; cardPrintingId: string | null; sourceIndices: number[]; desiredQuantity: number} };
type PriorGroups = { ownerUserId: string; sourceSha256: string; groups: ImportGroup[] };
async function sourceSha256(csvText: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(csvText));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
}
function readGroups(client: SupabaseClient, ownerUserId: string, sha: string) {
  return readImportPages<ImportGroup>(after => {
    let query = client.from("vault_collection_import_groups_v2").select("group_key,source_indices,instance_ids,target").eq("user_id", ownerUserId).eq("source_sha256", sha).order("group_key").limit(500);
    if (after) query = query.gt("group_key", after);
    return query;
  }, group => group.group_key);
}
// Server-only call before the writer. A browser-supplied list is never authority
// to relax a fresh copy's printing check. Failed/incomplete reads stop the save.
export async function readPriorCollectionGroupsV3(client: SupabaseClient, attempt: Pick<CollectionAttemptV2, "ownerUserId" | "csvText">): Promise<PriorGroups> {
  const sha = await sourceSha256(attempt.csvText);
  return {ownerUserId: attempt.ownerUserId, sourceSha256: sha, groups: structuredClone(await readGroups(client, attempt.ownerUserId, sha))};
}
function timestampMicros(value: string) {
  const fraction = /\.(\d+)(?=Z|[+-]\d\d:\d\d$)/.exec(value)?.[1] ?? "";
  return BigInt(Date.parse(value.replace(/\.\d+(?=Z|[+-]\d\d:\d\d$)/, ""))) * 1000n + BigInt(fraction.padEnd(6, "0"));
}

// Read the persisted document, group mapping and exact copies through owner RLS.
// A historical receipt remains valid after a copy is sold or archived.
export async function verifyCollectionReadbackV2(client: SupabaseClient, attempt: CollectionAttemptV2, receipt: CollectionReceiptV2, options: {verifyCurrentMetadata?: boolean; priorGroups?: PriorGroups} = {}) {
  const source = parseCsv(attempt.csvText);
  const sha = await sourceSha256(attempt.csvText);
  if (options.priorGroups && (options.priorGroups.ownerUserId !== attempt.ownerUserId || options.priorGroups.sourceSha256 !== sha)) throw uncertain();
  if (receipt.success !== true || receipt.requestId !== attempt.requestId || receipt.sourceSha256 !== sha || receipt.sourceRows !== source.length || !Array.isArray(receipt.targets)) throw uncertain();
  const expected = new Map(attempt.targets.map(row => [JSON.stringify(row.sourceIndices), row]));
  const returned = new Map<string, string[]>();
  const copies = new Map<string, CollectionSelection>();
  for (const target of receipt.targets) {
    const key = JSON.stringify(target.sourceIndices), original = expected.get(key);
    if (!original || returned.has(key) || target.cardId !== original.cardId || target.cardPrintingId !== original.cardPrintingId || !Array.isArray(target.instanceIds) || target.instanceIds.length !== original.sourceIndices.reduce((sum, index) => sum + normalize(source[index]).quantity, 0)) throw uncertain();
    returned.set(key, target.instanceIds);
    for (const id of target.instanceIds) { if (copies.has(id)) throw uncertain(); copies.set(id, original); }
  }
  if (returned.size !== expected.size) throw uncertain();
  const document = await client.from("vault_collection_import_documents_v2").select("source_rows").eq("user_id", attempt.ownerUserId).eq("source_sha256", sha).single();
  if (document.error || canonical(document.data?.source_rows) !== canonical(source)) throw uncertain();
  // Bind historical copies to immutable groups captured before this write.
  // Mixed increments may add cards while retaining earlier owner printing edits.
  // Fresh groups and all V2 copies retain strict current-printing checks.
  const existingCardsOnly = options.verifyCurrentMetadata === false && receipt.importedCards === 0;
  const prior = new Map((options.priorGroups?.groups ?? []).map(g => [g.group_key, g]));
  if (prior.size !== (options.priorGroups?.groups.length ?? 0)) throw uncertain();
  const historicalCopies = new Set<string>();
  const groups = await readGroups(client, attempt.ownerUserId, sha);
  let mapped = 0;
  const verified = new Set<string>();
  for (const group of groups) {
    if (!Array.isArray(group.source_indices) || !Array.isArray(group.instance_ids)) throw uncertain();
    mapped += group.source_indices.length;
    const key = JSON.stringify(group.source_indices), ids = returned.get(key);
    if (ids) {
      if (canonical([...ids].sort()) !== canonical([...group.instance_ids].sort()) || verified.has(key)) throw uncertain();
      const original = expected.get(key)!;
      const before = prior.get(group.group_key);
      if (before && canonical(before) !== canonical(group)) throw uncertain();
      if (options.verifyCurrentMetadata === false) {
        if (!group.target || group.target.cardId !== original.cardId || group.target.cardPrintingId !== original.cardPrintingId || canonical(group.target.sourceIndices) !== canonical(original.sourceIndices) || group.target.desiredQuantity !== ids.length) throw uncertain();
        if (existingCardsOnly || before) for (const id of ids) historicalCopies.add(id);
      }
      verified.add(key);
    }
  }
  if (verified.size !== expected.size || receipt.reviewRows !== source.length - mapped) throw uncertain();
  const ids = [...copies.keys()], seen = new Set<string>();
  for (let start = 0; start < ids.length; start += 100) {
    const chunk = ids.slice(start, start + 100);
    const { data, error } = await client.rpc("get_collection_import_copies_v2", { p_source_sha256: sha, p_instance_ids: chunk });
    if (error || !Array.isArray(data)) throw uncertain();
    for (const copy of data) {
      const target = copies.get(copy.id);
      if (!target || !chunk.includes(copy.id) || seen.has(copy.id) || copy.card_print_id !== target.cardId || (!historicalCopies.has(copy.id) && copy.card_printing_id !== target.cardPrintingId) || copy.is_graded === true) throw uncertain();
      seen.add(copy.id);
      const row = normalize(source[target.sourceIndices[0]]);
      if (options.verifyCurrentMetadata !== false && receipt.importedCards > 0 && (copy.condition_label !== row.condition || copy.acquisition_cost !== row.acquisitionCost || copy.notes !== row.notes || (row.createdAt && (row.createdAtDateOnly ? new Date(copy.created_at).toISOString().slice(0, 10) !== row.createdAt.slice(0, 10) : timestampMicros(copy.created_at) !== timestampMicros(row.createdAt))))) throw uncertain();
    }
  }
  if (seen.size !== copies.size) throw uncertain();
}
