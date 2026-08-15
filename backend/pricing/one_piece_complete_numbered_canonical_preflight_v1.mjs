import {
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";
import {
  validateOnePieceCompleteNumberedPromotionPlanV1,
} from "./one_piece_complete_numbered_canonical_promotion_v1.mjs";

export const ONE_PIECE_COMPLETE_NUMBERED_PREFLIGHT_VERSION =
  "ONE_PIECE_COMPLETE_NUMBERED_CANONICAL_PREFLIGHT_V1";
export const ONE_PIECE_COMPLETE_NUMBERED_BASELINE = Object.freeze({
  sets: 1,
  card_prints: 31,
  card_print_identity: 17,
  card_print_identity_source_evidence: 17,
  external_mappings: 17,
  card_printings: 14,
  external_printing_mappings: 14,
  set_codes: ["ST01"],
});

const REQUIRED_SCHEMA = Object.freeze([
  "sets",
  "card_prints",
  "card_print_identity",
  "card_print_identity_source_evidence",
  "external_mappings",
  "card_printings",
  "external_printing_mappings",
  "one_piece_canonical_import_batches",
  "one_piece_canonical_import_rows",
  "catalog_games",
  "catalog_game_release_controls",
]);

export function expectedOnePieceCompleteNumberedStagingRowsV1(plan) {
  return (plan?.payload?.numbered_cards ?? []).map((row) => ({
    id: row.staging.staging_row_id,
    batch_id: row.staging.staging_batch_id,
    source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id),
    record_class: "exact_single_card_candidate",
    single_card_kind: "numbered_card",
    language_key: "en",
    promotion_state: "current_candidate",
    payload_sha256: row.staging.staging_payload_sha256,
    source_payload_hash: row.staging.source_payload_hash,
  })).sort((left, right) => left.source_product_id - right.source_product_id);
}

export function expectedOnePieceCompleteNumberedRetainedRowsV1(plan) {
  return (plan?.payload?.retained_existing_rows ?? []).map((row) => ({
    source_product_id: Number(row.source_product_id),
    card_number: row.card_number,
    card_print_id: row.card_print_id,
    card_print_identity_id: row.card_print_identity_id,
    external_mapping_source: row.external_mapping_source,
    external_mapping_id: row.external_mapping_id,
    gv_id: row.gv_id,
  })).sort((left, right) => left.source_product_id - right.source_product_id);
}

export function summarizeOnePieceCompleteNumberedStagingV1(rows) {
  const ordered = [...(rows ?? [])].sort((left, right) =>
    Number(left.source_product_id) - Number(right.source_product_id));
  return {
    row_count: ordered.length,
    rows_sha256: sha256(stableJson(ordered)),
    source_product_ids_sha256: sha256(stableJson(
      ordered.map((row) => Number(row.source_product_id)),
    )),
    staging_row_ids_sha256: sha256(stableJson(
      ordered.map((row) => row.id),
    )),
    payload_hashes_sha256: sha256(stableJson(
      ordered.map((row) => row.payload_sha256),
    )),
  };
}

export function evaluateOnePieceCompleteNumberedPreflightV1({ plan, snapshot }) {
  const findings = validateOnePieceCompleteNumberedPromotionPlanV1(plan).findings
    .map((finding) => `plan:${finding}`);
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  add(snapshot?.transaction_read_only !== true, "transaction_not_read_only");
  add(Number(snapshot?.foundation?.game_count) !== 1 ||
    snapshot?.foundation?.game_id !==
      "4f504300-0000-4000-8000-000000000001",
  "foundation_game_mismatch");
  add(Number(snapshot?.foundation?.release_count) !== 1 ||
    snapshot?.foundation?.release_status !== "hidden" ||
    snapshot?.foundation?.release_version !==
      "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1",
  "foundation_release_mismatch");
  for (const role of ["anon", "authenticated", "service_role"]) {
    add(snapshot?.foundation?.[`${role}_visible`] !== false,
      `foundation_visibility_open:${role}`);
  }
  add(stableJson(snapshot?.baseline) !==
    stableJson(ONE_PIECE_COMPLETE_NUMBERED_BASELINE),
  "protected_st01_baseline_mismatch");
  for (const table of REQUIRED_SCHEMA) {
    add(snapshot?.schema?.[table] !== true, `schema_missing:${table}`);
  }
  add(stableJson(snapshot?.retained_rows ?? []) !== stableJson(
    expectedOnePieceCompleteNumberedRetainedRowsV1(plan)),
  "retained_st01_readback_mismatch");
  const expectedStaging = expectedOnePieceCompleteNumberedStagingRowsV1(plan);
  add(stableJson(snapshot?.staging_rows ?? []) !== stableJson(expectedStaging),
    "durable_staging_readback_mismatch");
  for (const [key, value] of Object.entries(snapshot?.collisions ?? {})) {
    add(Number(value) !== 0, `collision:${key}`);
  }
  add((snapshot?.blocking_pids ?? []).length !== 0, "database_session_blocked");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function buildOnePieceCompleteNumberedPreflightFingerprintV1({
  producerCommitSha,
  planFingerprint,
  compactSnapshot,
}) {
  return sha256(stableJson({
    version: ONE_PIECE_COMPLETE_NUMBERED_PREFLIGHT_VERSION,
    producer_commit_sha: producerCommitSha,
    plan_fingerprint_sha256: planFingerprint,
    snapshot: compactSnapshot,
  }));
}

export { REQUIRED_SCHEMA as ONE_PIECE_COMPLETE_NUMBERED_REQUIRED_SCHEMA };

