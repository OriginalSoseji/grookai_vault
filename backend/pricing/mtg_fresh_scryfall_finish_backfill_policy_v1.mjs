import { createHash } from "node:crypto";
import assert from "node:assert/strict";

export const MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1 =
  "MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";

export function mtgFreshScryfallDatabaseConfigV1(connectionString, env = process.env) {
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, "0", "insecure_tls_environment");
  const url = new URL(connectionString);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "invalid_database_protocol");
  const user = decodeURIComponent(url.username);
  const direct = url.hostname === `db.${PROJECT_REF}.supabase.co` && user === "postgres";
  const pooler = url.hostname === "aws-1-us-east-2.pooler.supabase.com" &&
    user === `postgres.${PROJECT_REF}`;
  assert.ok(direct || pooler, "wrong_database_project");
  assert.equal(url.pathname, "/postgres", "wrong_database_name");
  assert.ok(["", "5432", "6543"].includes(url.port), "wrong_database_port");
  for (const key of url.searchParams.keys()) {
    assert.ok(["sslmode", "sslcert", "sslkey", "sslrootcert"].includes(key), "unexpected_database_option");
  }
  url.search = "";
  const ca = env.SUPABASE_DB_CA_CERT?.trim();
  if (ca) assert.match(ca, /-----BEGIN CERTIFICATE-----/, "invalid_database_ca_certificate");
  return {
    connectionString: url.href,
    ssl: {
      rejectUnauthorized: true,
      servername: url.hostname,
      ...(ca ? { ca } : {}),
    },
    connectionTimeoutMillis: 15_000,
    query_timeout: 900_000,
    statement_timeout: 900_000,
    application_name: MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1,
  };
}

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

function sortedUnique(values) {
  return [...new Set(values.map(String))].sort();
}

export function scryfallLinkSupportsFinishV1(link, finish) {
  if (String(link?.role) !== "standard") return false;
  const finishes = new Set(
    (link?.finishes ?? []).map((value) => String(value).toLowerCase()),
  );
  if (finish === "normal") return finishes.has("nonfoil");
  if (finish === "foil") return finishes.has("foil");
  return false;
}

export function canonicalChildSupportsFinishV1(row, finish) {
  return (
    String(row?.finish ?? "").toLowerCase() === finish &&
    row?.finish_is_active === true &&
    row?.card_is_visible === true &&
    row?.is_provisional !== true &&
    Number(row?.exact_identity_count) === 1 &&
    Number(row?.hidden_review_count) === 0
  );
}

export function classifyMtgFreshScryfallFinishGapV1({
  finish,
  total_scryfall_link_count = 0,
  standard_scryfall_link_count = 0,
  finish_compatible_scryfall_link_count = 0,
  canonical_row_count = 0,
  finish_matching_canonical_row_count = 0,
  active_finish_row_count = 0,
  visible_parent_row_count = 0,
  non_provisional_row_count = 0,
  exact_identity_row_count = 0,
  review_clear_row_count = 0,
  eligible_child_candidate_count = 0,
} = {}) {
  if (!["normal", "foil"].includes(String(finish ?? "").toLowerCase())) {
    return "unsupported_source_subtype";
  }
  if (Number(total_scryfall_link_count) === 0) return "missing_scryfall_product_link";
  if (Number(standard_scryfall_link_count) === 0) return "etched_only_scryfall_product_link";
  if (Number(finish_compatible_scryfall_link_count) === 0) {
    return "scryfall_finish_not_supported";
  }
  if (Number(canonical_row_count) === 0) return "missing_canonical_scryfall_mapping";
  if (Number(finish_matching_canonical_row_count) === 0) {
    return "missing_canonical_finish_child";
  }
  if (Number(active_finish_row_count) === 0) return "inactive_finish_child";
  if (Number(visible_parent_row_count) === 0) return "hidden_canonical_parent";
  if (Number(non_provisional_row_count) === 0) return "provisional_finish_child";
  if (Number(exact_identity_row_count) === 0) return "non_exact_canonical_identity";
  if (Number(review_clear_row_count) === 0) return "hidden_printing_truth_review";
  if (Number(eligible_child_candidate_count) > 1) return "ambiguous_eligible_finish_children";
  if (Number(eligible_child_candidate_count) === 1) return "exact";
  return "unclassified_finish_gap";
}

function normalizeLane(row) {
  const candidates = [...(row.child_candidates ?? [])]
    .map((candidate) => ({
      card_print_id: String(candidate.card_print_id),
      card_printing_id: String(candidate.card_printing_id),
      supporting_scryfall_print_ids: sortedUnique(
        candidate.supporting_scryfall_print_ids ?? [],
      ),
    }))
    .sort((left, right) =>
      left.card_printing_id.localeCompare(right.card_printing_id),
    );
  const existing = [...(row.existing_mappings ?? [])]
    .map((mapping) => ({
      id: String(mapping.id),
      card_printing_id: String(mapping.card_printing_id),
      active: mapping.active === true,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    product_id: String(row.product_id),
    group_id: Number(row.group_id),
    group_name: String(row.group_name),
    product_name: String(row.product_name),
    subtype: String(row.subtype).toLowerCase(),
    finish: row.finish ? String(row.finish).toLowerCase() : null,
    source_observation_id: String(row.source_observation_id),
    child_candidates: candidates,
    existing_mappings: existing,
    gap_classification: String(row.gap_classification ?? "unclassified_finish_gap"),
    evidence_counts: Object.fromEntries(
      Object.entries(row.evidence_counts ?? {})
        .map(([key, value]) => [String(key), Number(value)])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

export function buildMtgFreshScryfallFinishPlanV1(
  rows,
  repository = {},
  authority = {},
) {
  const lanes = rows.map(normalizeLane).sort(
    (left, right) =>
      Number(left.product_id) - Number(right.product_id) ||
      String(left.finish).localeCompare(String(right.finish)),
  );
  const byProduct = new Map();
  for (const lane of lanes) {
    const product = byProduct.get(lane.product_id) ?? [];
    product.push(lane);
    byProduct.set(lane.product_id, product);
  }

  const insertRows = [];
  const alreadyExactRows = [];
  const reviewOnlyRows = [];
  const unsafeRows = [];
  let fullyExactProducts = 0;
  const reviewClassificationCounts = {};

  for (const [productId, productLanes] of byProduct) {
    const finishKeys = productLanes.map((lane) => lane.finish);
    const duplicateFinish = finishKeys.some(
      (finish, index) => finishKeys.indexOf(finish) !== index,
    );
    const fullyExact =
      !duplicateFinish &&
      productLanes.length > 0 &&
      productLanes.every(
        (lane) =>
          ["normal", "foil"].includes(lane.finish) &&
          lane.child_candidates.length === 1,
      );
    if (!fullyExact) {
      for (const lane of productLanes) {
        if (lane.child_candidates.length === 1 && lane.gap_classification === "exact") continue;
        reviewClassificationCounts[lane.gap_classification] =
          (reviewClassificationCounts[lane.gap_classification] ?? 0) + 1;
      }
      reviewOnlyRows.push({
        product_id: productId,
        group_id: productLanes[0]?.group_id ?? null,
        group_name: productLanes[0]?.group_name ?? null,
        product_name: productLanes[0]?.product_name ?? null,
        reason: duplicateFinish ? "duplicate_finish_lane" : "incomplete_or_ambiguous_product",
        lanes: productLanes.map((lane) => ({
          subtype: lane.subtype,
          finish: lane.finish,
          child_candidate_count: lane.child_candidates.length,
          gap_classification: lane.gap_classification,
          evidence_counts: lane.evidence_counts,
        })),
      });
      continue;
    }
    fullyExactProducts += 1;
    for (const lane of productLanes) {
      const candidate = lane.child_candidates[0];
      const externalId = `${lane.product_id}:${lane.finish}`;
      if (lane.existing_mappings.length === 0) {
        insertRows.push({
          source_product_id: lane.product_id,
          source_observation_id: lane.source_observation_id,
          group_id: lane.group_id,
          group_name: lane.group_name,
          product_name: lane.product_name,
          finish: lane.finish,
          external_id: externalId,
          card_print_id: candidate.card_print_id,
          card_printing_id: candidate.card_printing_id,
          supporting_scryfall_print_ids: candidate.supporting_scryfall_print_ids,
        });
        continue;
      }
      if (
        lane.existing_mappings.length === 1 &&
        lane.existing_mappings[0].active &&
        lane.existing_mappings[0].card_printing_id === candidate.card_printing_id
      ) {
        alreadyExactRows.push({
          source_product_id: lane.product_id,
          finish: lane.finish,
          external_id: externalId,
          card_printing_id: candidate.card_printing_id,
          mapping_id: lane.existing_mappings[0].id,
        });
        continue;
      }
      unsafeRows.push({
        source_product_id: lane.product_id,
        finish: lane.finish,
        external_id: externalId,
        expected_card_printing_id: candidate.card_printing_id,
        existing_mappings: lane.existing_mappings,
        reason: "existing_mapping_conflict",
      });
    }
  }

  const sortRows = (values) => values.sort(
    (left, right) =>
      Number(left.source_product_id) - Number(right.source_product_id) ||
      String(left.finish).localeCompare(String(right.finish)),
  );
  sortRows(insertRows);
  sortRows(alreadyExactRows);
  sortRows(unsafeRows);
  reviewOnlyRows.sort((left, right) => Number(left.product_id) - Number(right.product_id));

  const core = {
    version: MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1,
    repository,
    authority,
    source: "tcgplayer_market",
    source_category_id: 1,
    observed_product_count: byProduct.size,
    observed_lane_count: lanes.length,
    fully_exact_product_count: fullyExactProducts,
    selected_insert_count: insertRows.length,
    already_exact_count: alreadyExactRows.length,
    review_only_product_count: reviewOnlyRows.length,
    review_classification_counts: Object.fromEntries(
      Object.entries(reviewClassificationCounts)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    blocking_unsafe_count: unsafeRows.length,
    insert_rows_sha256: sha256(insertRows),
    already_exact_rows_sha256: sha256(alreadyExactRows),
    review_only_rows_sha256: sha256(reviewOnlyRows),
    unsafe_rows_sha256: sha256(unsafeRows),
    boundaries: {
      insert_only: true,
      allowed_table: "public.external_printing_mappings",
      updates: false,
      deletes: false,
      pricing_writes: false,
      publication_writes: false,
      catalog_writes: false,
      pokemon_mutation: false,
    },
  };
  const planFingerprint = sha256(core);
  return {
    ...core,
    plan_fingerprint: planFingerprint,
    required_approval: `APPLY_MTG_FRESH_SCRYFALL_FINISH_MAPPINGS_V1:${planFingerprint}:${insertRows.length}`,
    insert_rows: insertRows,
    already_exact_rows: alreadyExactRows,
    review_only_rows: reviewOnlyRows,
    unsafe_rows: unsafeRows,
  };
}
