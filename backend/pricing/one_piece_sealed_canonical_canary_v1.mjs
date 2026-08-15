import { createHash } from "node:crypto";

export const ONE_PIECE_SEALED_CANONICAL_CANARY_VERSION =
  "ONE_PIECE_SEALED_CANONICAL_ROLLBACK_CANARY_V1";

export const ONE_PIECE_SEALED_PACKAGE_FORMS_V1 = Object.freeze([
  "booster_box", "bundle", "case", "collection", "deck", "deck_display",
  "display", "kit", "pack", "promo_pack", "sleeved_pack", "tin",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function stableJsonOnePieceSealedCanonicalCanaryV1(value) {
  return JSON.stringify(stable(value));
}

export function hashOnePieceSealedCanonicalCanaryV1(value) {
  return createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableJsonOnePieceSealedCanonicalCanaryV1(value),
  ).digest("hex");
}

export function selectOnePieceSealedCanonicalCanaryV1(plan) {
  const payload = plan?.payload ?? {};
  const variants = [...(payload.variants ?? [])].sort((left, right) =>
    left.id.localeCompare(right.id));
  const variantsByFamily = new Map();
  for (const variant of variants) {
    const rows = variantsByFamily.get(variant.family_id) ?? [];
    rows.push(variant);
    variantsByFamily.set(variant.family_id, rows);
  }
  const multiFamily = [...variantsByFamily.entries()]
    .filter(([, rows]) => rows.length > 1)
    .sort((left, right) => right[1].length - left[1].length ||
      left[0].localeCompare(right[0]))[0];
  if (!multiFamily) throw new Error("No multi-variant family exists for canary");
  const selected = new Map(multiFamily[1].map((row) => [row.id, row]));
  for (const form of ONE_PIECE_SEALED_PACKAGE_FORMS_V1) {
    const match = variants.find((row) => row.package_form === form);
    if (!match) throw new Error(`Canary package form unavailable: ${form}`);
    selected.set(match.id, match);
  }
  const selectedVariants = [...selected.values()].sort((left, right) =>
    left.id.localeCompare(right.id));
  const variantIds = new Set(selectedVariants.map((row) => row.id));
  const mappings = (payload.source_mappings ?? []).filter((row) =>
    variantIds.has(row.variant_id)).sort((left, right) =>
    left.source_product_id - right.source_product_id);
  const mappingIds = new Set(mappings.map((row) => row.id));
  const reviewIds = new Set(mappings.map((row) => row.review_id));
  const familyIds = new Set(selectedVariants.map((row) => row.family_id));
  const sample = {
    families: (payload.families ?? []).filter((row) => familyIds.has(row.id))
      .sort((left, right) => left.id.localeCompare(right.id)),
    variants: selectedVariants,
    automated_reviews: (payload.automated_reviews ?? []).filter((row) =>
      reviewIds.has(row.id)).sort((left, right) => left.id.localeCompare(right.id)),
    source_mappings: mappings,
    variant_evidence: (payload.variant_evidence ?? []).filter((row) =>
      variantIds.has(row.variant_id) && mappingIds.has(row.source_mapping_id))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
  const core = {
    version: ONE_PIECE_SEALED_CANONICAL_CANARY_VERSION,
    package_forms: [...new Set(selectedVariants.map((row) => row.package_form))]
      .sort(),
    multi_variant_family_id: multiFamily[0],
    sample,
  };
  return { ...core, sample_fingerprint_sha256:
    hashOnePieceSealedCanonicalCanaryV1(core) };
}

export function evaluateOnePieceSealedCanonicalCanaryV1({ selection, proof }) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const sample = selection?.sample ?? {};
  const forms = new Set(selection?.package_forms ?? []);
  for (const form of ONE_PIECE_SEALED_PACKAGE_FORMS_V1) {
    add(!forms.has(form), `package_form_missing:${form}`);
  }
  const sharedFamilyCount = (sample.variants ?? []).filter((row) =>
    row.family_id === selection?.multi_variant_family_id).length;
  add(sharedFamilyCount < 2, "multi_variant_family_not_exercised");
  add((sample.source_mappings ?? []).length !== (sample.variants ?? []).length,
    "variant_mapping_count_mismatch");
  add((sample.automated_reviews ?? []).length !==
    (sample.variants ?? []).length, "variant_review_count_mismatch");
  add(proof?.transaction?.committed !== false ||
    proof?.transaction?.rolled_back !== true, "transaction_not_rolled_back");
  add(proof?.readback?.expected_sha256 !== proof?.readback?.actual_sha256,
    "transaction_readback_mismatch");
  const expectedWrites = {
    sealed_product_families: (sample.families ?? []).length,
    sealed_product_variants: (sample.variants ?? []).length,
    sealed_product_candidate_reviews: (sample.automated_reviews ?? []).length,
    sealed_product_source_mappings: (sample.source_mappings ?? []).length,
    sealed_product_variant_evidence: (sample.variant_evidence ?? []).length,
  };
  const actualWrites = Object.fromEntries((proof?.write_attribution ?? [])
    .map((row) => [row.table_name, Number(row.inserted)]));
  for (const [table, count] of Object.entries(expectedWrites)) {
    add(actualWrites[table] !== count, `write_attribution_mismatch:${table}`);
  }
  add(Object.keys(actualWrites).some((table) => !(table in expectedWrites)),
    "unexpected_table_write");
  add((proof?.write_attribution ?? []).some((row) =>
    Number(row.updated) !== 0 || Number(row.deleted) !== 0 ||
    Number(row.hot_updated) !== 0), "non_insert_write_present");
  add((proof?.post_rollback?.remaining_rows ?? 1) !== 0,
    "rollback_residue_present");
  add(stableJsonOnePieceSealedCanonicalCanaryV1(
    proof?.baseline_before) !== stableJsonOnePieceSealedCanonicalCanaryV1(
    proof?.post_rollback?.baseline), "post_rollback_baseline_mismatch");
  add(proof?.post_rollback?.transaction_read_only !== true,
    "post_rollback_verification_not_read_only");
  add(proof?.boundaries?.database_durable_writes !== 0 ||
    proof?.boundaries?.storage_writes !== 0 ||
    proof?.boundaries?.pricing_writes !== 0 ||
    proof?.boundaries?.publication_writes !== 0,
  "boundary_overclaim");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
