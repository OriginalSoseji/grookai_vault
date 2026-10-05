import { ImportValidationError, parseCsv, text } from "./source.ts";
import { planCollectrSealedIdentities, type SealedCatalogEvidence } from "./sealed_identity.ts";
import { sealedMetadata } from "./sealed_metadata.ts";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export type SealedSelection = { sourceIndices: number[]; sealedVariantId: string };
export function sealedSelections(raw: unknown, count: number, used = new Set<number>()): SealedSelection[] {
  if (!Array.isArray(raw) || raw.length > 5000) throw new ImportValidationError("invalid_import_targets");
  return raw.map(row => {
    if (!row || typeof row !== "object" || typeof row.sealedVariantId !== "string" || !uuid.test(row.sealedVariantId) ||
      !Array.isArray(row.sourceIndices) || !row.sourceIndices.length || row.sourceIndices.length > count) {
      throw new ImportValidationError("invalid_import_targets");
    }
    const sourceIndices = row.sourceIndices.map((i: unknown) => {
      if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i >= count || used.has(i)) {
        throw new ImportValidationError("invalid_import_source_indices");
      }
      used.add(i); return i;
    }).sort((a: number, b: number) => a - b);
    return { sourceIndices, sealedVariantId: row.sealedVariantId.toLowerCase() };
  });
}
export function resolveSealedTargets(csv: string, catalog: SealedCatalogEvidence, selected: SealedSelection[], currency?: string | null) {
  const source = parseCsv(csv);
  const reviews = new Map(planCollectrSealedIdentities(csv, catalog, selected.flatMap(s => s.sourceIndices)).rows.map(r => [r.sourceIndex, r]));
  let total = 0;
  const signature = (index: number) => JSON.stringify(Object.entries(source[index]).filter(([k]) => !["quantity", "qty"].includes(text(k).toLowerCase())).sort(([a], [b]) => a.localeCompare(b)));
  return selected.map(selection => {
    const first = reviews.get(selection.sourceIndices[0]);
    if (!first || first.status !== "exact_identity" || first.candidates.length !== 1 || first.candidates[0].variantId !== selection.sealedVariantId) {
      throw new ImportValidationError("sealed_identity_requires_review");
    }
    const evidence = first.candidates[0], metadata = sealedMetadata(first.source, currency);
    let desiredQuantity = 0;
    for (const index of selection.sourceIndices) {
      const row = reviews.get(index);
      if (!row || row.status !== "exact_identity" || row.candidates.length !== 1 || row.candidates[0].variantId !== evidence.variantId ||
        signature(index) !== signature(selection.sourceIndices[0])) throw new ImportValidationError("incompatible_import_source_group");
      desiredQuantity += sealedMetadata(row.source, currency).quantity;
    }
    total += desiredQuantity;
    if (total > 50000) throw new ImportValidationError("invalid_import_quantity");
    const { quantity: _quantity, ...properties } = metadata;
    return { ...selection, objectKind: "sealed" as const, identityFingerprint: evidence.identityFingerprint,
      language: evidence.language, releaseId: evidence.releaseId, mappingId: evidence.mappingId, desiredQuantity, ...properties };
  });
}
