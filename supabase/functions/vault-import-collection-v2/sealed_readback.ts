import type { Client } from "./handler.ts";
import { parseCsv } from "./source.ts";
import { sealedMetadata } from "./sealed_metadata.ts";
import { sealedSelections, type SealedSelection } from "./sealed_targets.ts";

export type SealedReadbackAttempt = { ownerUserId: string; requestId: string; csvText: string; sealedTargets: SealedSelection[]; sealedAcquisitionCurrency?: string | null };
const fail = (): never => { throw new Error("import_readback_unconfirmed"); };
const canonical = (value: unknown): string => JSON.stringify(value, (_, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
// Complements the existing card readback. This confirms immutable source/group
// evidence and the continued existence/identity of each exact sealed copy.
// Current owner-edited notes or archived status do not invalidate old receipts.
export async function verifySealedImportReadback(client: Client, attempt: SealedReadbackAttempt, receipt: any): Promise<void> {
  const source = parseCsv(attempt.csvText);
  const sha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(attempt.csvText))), n => n.toString(16).padStart(2, "0")).join("");
  if (!receipt || receipt.success !== true || receipt.version !== 3 || receipt.requestId !== attempt.requestId || receipt.sourceSha256 !== sha || receipt.sourceRows !== source.length || !Array.isArray(receipt.sealedTargets)) fail();
  const selected = sealedSelections(attempt.sealedTargets, source.length);
  const expected = new Map(selected.map(s => [JSON.stringify(s.sourceIndices), s]));
  const returned = new Map<string, string[]>(), copies = new Map<string, string>();
  for (const target of receipt.sealedTargets) {
    const k = JSON.stringify(target.sourceIndices), selection = expected.get(k);
    if (!selection) return fail();
    if (returned.has(k) || target.objectKind !== "sealed" || target.sealedVariantId !== selection.sealedVariantId || !Array.isArray(target.instanceIds) ||
      target.instanceIds.length !== selection.sourceIndices.reduce((n, i) => n + sealedMetadata(source[i], attempt.sealedAcquisitionCurrency).quantity, 0)) fail();
    returned.set(k, target.instanceIds);
    for (const copy of target.instanceIds) {
      if (typeof copy !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(copy) || copies.has(copy)) fail();
      copies.set(copy, selection.sealedVariantId);
    }
  }
  if (returned.size !== expected.size) fail();
  const document = await client.from("vault_collection_import_documents_v2").select("source_rows").eq("user_id", attempt.ownerUserId).eq("source_sha256", sha).single();
  if (document.error || canonical(document.data?.source_rows) !== canonical(source)) fail();
  let after: string | null = null;
  const verified = new Set<string>(), mappedIndices = new Set<number>();
  while (true) {
    let query = client.from("vault_collection_import_groups_v2").select("group_key,source_indices,instance_ids,target").eq("user_id", attempt.ownerUserId).eq("source_sha256", sha).order("group_key").limit(500);
    if (after) query = query.gt("group_key", after);
    const page = await query;
    if (page.error || !Array.isArray(page.data)) fail();
    if (!page.data.length) break;
    for (const group of page.data) {
      if (typeof group.group_key !== "string" || !/^[a-f0-9]{64}$/.test(group.group_key) || (after !== null && group.group_key <= after) || !Array.isArray(group.source_indices) || !group.source_indices.length) fail();
      after = group.group_key;
      for (const i of group.source_indices) {
        if (!Number.isInteger(i) || i < 0 || i >= source.length || mappedIndices.has(i)) fail();
        mappedIndices.add(i);
      }
      const k = JSON.stringify(group.source_indices), ids = returned.get(k), selection = expected.get(k);
      if (!ids || !selection) continue;
      if (verified.has(k) || !Array.isArray(group.instance_ids) || canonical([...ids].sort()) !== canonical([...group.instance_ids].sort()) ||
        !group.target || group.target.objectKind !== "sealed" || group.target.sealedVariantId !== selection.sealedVariantId ||
        canonical(group.target.sourceIndices) !== canonical(selection.sourceIndices) || group.target.desiredQuantity !== ids.length) fail();
      const {quantity: _quantity, ...metadata} = sealedMetadata(source[selection.sourceIndices[0]], attempt.sealedAcquisitionCurrency);
      for (const [key, value] of Object.entries(metadata)) if (group.target[key] !== value) fail();
      verified.add(k);
    }
  }
  if (verified.size !== expected.size || receipt.reviewRows !== source.length - mappedIndices.size) fail();
  const ids = [...copies.keys()], seen = new Set<string>();
  for (let start = 0; start < ids.length; start += 100) {
    const chunk = ids.slice(start, start + 100);
    const response = await client.rpc("get_collection_import_sealed_copies_v3", {p_source_sha256: sha, p_instance_ids: chunk});
    if (response.error || !Array.isArray(response.data)) fail();
    for (const copy of response.data) {
      if (!copy || !chunk.includes(copy.id) || seen.has(copy.id) || copy.sealed_product_variant_id !== copies.get(copy.id)) fail();
      seen.add(copy.id);
    }
  }
  if (seen.size !== copies.size) fail();
}
