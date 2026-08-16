import { createHash } from "node:crypto";

export const MTG_TCGPLAYER_PARENT_MAPPING_BACKFILL_V1 =
  "MTG_TCGPLAYER_PARENT_MAPPING_BACKFILL_V1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

export function buildMtgParentMappingPlanV1(rows, repository = {}) {
  const counts = {};
  for (const row of rows) {
    const resolution = String(row.resolution ?? "unknown");
    counts[resolution] = (counts[resolution] ?? 0) + 1;
  }
  const insertRows = rows
    .filter((row) => row.resolution === "insert_candidate")
    .map((row) => ({
      source_product_id: String(row.source_product_id),
      card_print_id: String(row.card_print_id),
      supporting_printing_mapping_count: Number(row.supporting_printing_mapping_count),
    }))
    .sort(
      (left, right) =>
        Number(left.source_product_id) - Number(right.source_product_id) ||
        left.card_print_id.localeCompare(right.card_print_id),
    );
  const normalizeIssueRows = (resolution) =>
    rows
      .filter((row) => String(row.resolution) === resolution)
      .map((row) => ({
        source_product_id: String(row.source_product_id),
        card_print_id: String(row.card_print_id),
        mapped_card_print_id: row.mapped_card_print_id
          ? String(row.mapped_card_print_id)
          : null,
        canonical_parent_count: Number(row.canonical_parent_count),
        supporting_printing_mapping_count: Number(
          row.supporting_printing_mapping_count,
        ),
        resolution,
      }))
      .sort(
        (left, right) =>
          Number(left.source_product_id) - Number(right.source_product_id) ||
          left.card_print_id.localeCompare(right.card_print_id),
      );
  const blockingUnsafe = [
    ...normalizeIssueRows("conflicting_existing_mapping"),
    ...normalizeIssueRows("inactive_existing_mapping"),
  ].sort(
    (left, right) =>
      Number(left.source_product_id) - Number(right.source_product_id) ||
      left.card_print_id.localeCompare(right.card_print_id),
  );
  const reviewOnly = normalizeIssueRows("ambiguous_printing_parents");
  const core = {
    version: MTG_TCGPLAYER_PARENT_MAPPING_BACKFILL_V1,
    repository,
    authority: "exact_tcgplayer_market_printing_mappings",
    source_category_id: 1,
    source: "tcgplayer",
    selected_insert_count: insertRows.length,
    resolution_counts: counts,
    unsafe_count: blockingUnsafe.length,
    blocking_unsafe_count: blockingUnsafe.length,
    review_only_count: reviewOnly.length,
    insert_rows_sha256: sha256(insertRows),
    unsafe_rows_sha256: sha256(blockingUnsafe),
    review_only_rows_sha256: sha256(reviewOnly),
    boundaries: {
      insert_only: true,
      allowed_table: "public.external_mappings",
      updates: false,
      deletes: false,
      pricing_writes: false,
      publication_writes: false,
      image_writes: false,
      catalog_release_writes: false,
      pokemon_mutation: false,
    },
  };
  const planFingerprint = sha256(core);
  return {
    ...core,
    plan_fingerprint: planFingerprint,
    required_approval: `APPLY_MTG_TCGPLAYER_PARENT_MAPPINGS_V1:${planFingerprint}:${insertRows.length}`,
    insert_rows: insertRows,
    unsafe_rows: blockingUnsafe,
    review_only_rows: reviewOnly,
  };
}
