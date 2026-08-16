import { sha256, stableJson } from
  "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_COMPLETE_DON_SET_CODE,
  ONE_PIECE_COMPLETE_DON_SET_ID,
  expectedOnePieceCompleteDonAttributableWritesV1,
  validateOnePieceCompleteDonPromotionPlanV1,
} from "./one_piece_complete_don_canonical_v1.mjs";

export const ONE_PIECE_COMPLETE_DON_PREFLIGHT_VERSION =
  "ONE_PIECE_COMPLETE_DON_CANONICAL_PREFLIGHT_V1";
export const ONE_PIECE_COMPLETE_DON_APPLY_VERSION =
  "ONE_PIECE_COMPLETE_DON_CANONICAL_APPLY_V1";
export const ONE_PIECE_COMPLETE_DON_REQUIRED_SCHEMA = Object.freeze([
  "games", "sets", "card_prints", "card_print_identity",
  "card_print_identity_source_evidence", "external_mappings",
  "one_piece_canonical_import_rows", "catalog_game_release_controls",
]);
export const ONE_PIECE_COMPLETE_DON_BASELINE = Object.freeze({
  sets: 59,
  card_prints: 6508,
  card_print_identity: 6508,
  card_print_identity_source_evidence: 6508,
  external_mappings: 6508,
  card_printings: 14,
  external_printing_mappings: 14,
});

export function summarizeOnePieceCompleteDonStagingV1(rows) {
  return {
    row_count: rows.length,
    rows_sha256: sha256(stableJson(rows)),
    source_product_ids_sha256: sha256(stableJson(rows.map((row) =>
      Number(row.source_product_id)))),
  };
}

export function evaluateOnePieceCompleteDonPreflightV1({ plan, snapshot }) {
  const findings = validateOnePieceCompleteDonPromotionPlanV1(plan).findings
    .map((finding) => `plan:${finding}`);
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(snapshot?.transaction_read_only !== true, "transaction_not_read_only");
  add(snapshot?.foundation?.game_count !== 1 ||
    snapshot?.foundation?.game_id !==
      "4f504300-0000-4000-8000-000000000001" ||
    snapshot?.foundation?.release_count !== 1 ||
    snapshot?.foundation?.release_status !== "hidden" ||
    snapshot?.foundation?.anon_visible !== false ||
    snapshot?.foundation?.authenticated_visible !== false ||
    snapshot?.foundation?.service_role_visible !== false,
  "hidden_foundation_mismatch");
  add(stableJson(snapshot?.baseline) !==
    stableJson(ONE_PIECE_COMPLETE_DON_BASELINE), "protected_baseline_mismatch");
  for (const table of ONE_PIECE_COMPLETE_DON_REQUIRED_SCHEMA) {
    add(snapshot?.schema?.[table] !== true, `schema_missing:${table}`);
  }
  const expectedStaging = plan.payload.don_cards.map((row) => ({
    id: row.staging.staging_row_id,
    batch_id: row.staging.staging_batch_id,
    source_product_id: row.source_product_id,
    source_group_id: row.source_group_id,
    record_class: "exact_single_card_candidate",
    single_card_kind: "don_card",
    language_key: "en",
    promotion_state: "current_candidate",
    payload_sha256: row.staging.staging_payload_sha256,
    source_payload_hash: row.staging.source_payload_hash,
  }));
  add(stableJson(snapshot?.staging_rows) !== stableJson(expectedStaging),
    "staging_readback_mismatch");
  add(Object.values(snapshot?.collisions ?? {}).some((value) =>
    Number(value) !== 0), "target_collision_detected");
  add((snapshot?.blocking_pids ?? []).length !== 0, "blocking_session_detected");
  return { valid: findings.length === 0, findings };
}

export function buildOnePieceCompleteDonPreflightFingerprintV1({
  plan,
  snapshot,
}) {
  return sha256(stableJson({
    version: ONE_PIECE_COMPLETE_DON_PREFLIGHT_VERSION,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    snapshot,
  }));
}

export function selectOnePieceCompleteDonCanaryV1(plan) {
  const rows = plan.payload.don_cards;
  const selected = [];
  const take = (predicate) => {
    const row = rows.find((candidate) =>
      !selected.includes(candidate) && predicate(candidate));
    if (row) selected.push(row);
  };
  take((row) => row.source_product_name === "DON!! Card");
  take((row) => row.source_product_name.includes("Alternate Art"));
  take((row) => row.source_product_name.includes("Gold"));
  take((row) => row.source_product_name.includes("Promo"));
  take(() => true);
  if (selected.length !== 5) throw new Error("Unable to select five DON canary rows");
  return { set_row: plan.payload.set_rows[0], don_cards: selected };
}

export function expectedOnePieceCompleteDonReadbackV1(plan) {
  return {
    set_rows: plan.payload.set_rows,
    card_rows: plan.payload.don_cards.map((row) => row.card_print),
    identity_rows: plan.payload.don_cards.map((row) => row.identity),
    evidence_rows: plan.payload.don_cards.map((row) => row.source_evidence),
    mapping_rows: plan.payload.don_cards.map((row) => row.external_mapping),
    release_status: "hidden",
    anon_visible: false,
    authenticated_visible: false,
    service_role_visible: false,
  };
}

export function evaluateOnePieceCompleteDonReadbackV1({ plan, readback }) {
  const expected = expectedOnePieceCompleteDonReadbackV1(plan);
  const findings = [];
  for (const key of ["set_rows", "card_rows", "identity_rows",
    "evidence_rows", "mapping_rows"]) {
    if (stableJson(readback?.[key]) !== stableJson(expected[key])) {
      findings.push(`durable_readback_mismatch:${key}`);
    }
  }
  for (const key of ["release_status", "anon_visible",
    "authenticated_visible", "service_role_visible"]) {
    if (readback?.[key] !== expected[key]) {
      findings.push(`visibility_mismatch:${key}`);
    }
  }
  return findings;
}

export function summarizeOnePieceCompleteDonReadbackV1(readback) {
  const result = {};
  for (const key of ["set_rows", "card_rows", "identity_rows",
    "evidence_rows", "mapping_rows"]) {
    result[key] = {
      row_count: readback?.[key]?.length ?? 0,
      rows_sha256: sha256(stableJson(readback?.[key] ?? [])),
    };
  }
  result.visibility = {
    release_status: readback?.release_status ?? null,
    anon_visible: readback?.anon_visible ?? null,
    authenticated_visible: readback?.authenticated_visible ?? null,
    service_role_visible: readback?.service_role_visible ?? null,
  };
  result.readback_sha256 = sha256(stableJson(readback));
  return result;
}

export function evaluateOnePieceCompleteDonWritesV1(rows, canary = false) {
  const expectedCounts = canary ? {
    sets: 1,
    card_prints: 5,
    card_print_identity: 5,
    card_print_identity_source_evidence: 5,
    external_mappings: 5,
  } : expectedOnePieceCompleteDonAttributableWritesV1();
  const normalize = (input) => (input ?? []).map((row) => ({
    table_name: row.table_name,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    deleted: Number(row.deleted),
    hot_updated: Number(row.hot_updated),
  })).sort((left, right) => left.table_name.localeCompare(right.table_name));
  const expected = Object.entries(expectedCounts).map(([table_name, inserted]) => ({
    table_name, inserted, updated: 0, deleted: 0, hot_updated: 0,
  })).sort((left, right) => left.table_name.localeCompare(right.table_name));
  return stableJson(normalize(rows)) === stableJson(expected)
    ? []
    : ["attributable_writes_mismatch"];
}

export function buildOnePieceCompleteDonApplyPlanV1({
  repository,
  promotionPlan,
  preflightSummary,
  canarySummary,
  proofHashes,
}) {
  if (!validateOnePieceCompleteDonPromotionPlanV1(promotionPlan).valid ||
      preflightSummary?.status !== "production_read_only_preflight_passed" ||
      preflightSummary?.plan_fingerprint_sha256 !==
        promotionPlan.plan_fingerprint_sha256 ||
      preflightSummary?.findings?.length !== 0 ||
      canarySummary?.status !== "production_rollback_canary_passed" ||
      canarySummary?.plan_fingerprint_sha256 !==
        promotionPlan.plan_fingerprint_sha256 ||
      canarySummary?.findings?.length !== 0) {
    throw new Error("DON apply proof chain is not eligible");
  }
  const rows = promotionPlan.payload.don_cards;
  const core = {
    version: ONE_PIECE_COMPLETE_DON_APPLY_VERSION,
    repository,
    proof_hashes: proofHashes,
    target_binding: {
      plan_fingerprint_sha256: promotionPlan.plan_fingerprint_sha256,
      payload_fingerprint_sha256: promotionPlan.payload_fingerprint_sha256,
      preflight_fingerprint_sha256:
        preflightSummary.preflight_fingerprint_sha256,
      canary_fingerprint_sha256: canarySummary.canary_fingerprint_sha256,
      counts: expectedOnePieceCompleteDonAttributableWritesV1(),
      set_ids_sha256: sha256(stableJson([ONE_PIECE_COMPLETE_DON_SET_ID])),
      card_print_ids_sha256: sha256(stableJson(rows.map((row) =>
        row.card_print.id))),
      source_product_ids_sha256: sha256(stableJson(rows.map((row) =>
        row.source_product_id))),
    },
    execution: {
      chunk_size: 100,
      lock_timeout: "5s",
      statement_timeout: "300s",
      idle_in_transaction_session_timeout: "300s",
      advisory_lock_key: "one_piece_complete_don_canonical_apply_v1",
    },
    boundaries: {
      insert_only: true,
      updates: 0,
      deletes: 0,
      child_printing_writes: 0,
      sealed_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_enabled: false,
    },
  };
  return { ...core, apply_plan_fingerprint_sha256: sha256(stableJson(core)) };
}

export function validateOnePieceCompleteDonApplyPlanV1(plan, promotionPlan) {
  const findings = [];
  const { apply_plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  if (plan?.version !== ONE_PIECE_COMPLETE_DON_APPLY_VERSION) {
    findings.push("version_mismatch");
  }
  if (plan?.apply_plan_fingerprint_sha256 !== sha256(stableJson(core))) {
    findings.push("apply_plan_fingerprint_mismatch");
  }
  if (plan?.target_binding?.plan_fingerprint_sha256 !==
      promotionPlan?.plan_fingerprint_sha256 ||
      plan?.target_binding?.payload_fingerprint_sha256 !==
      promotionPlan?.payload_fingerprint_sha256) {
    findings.push("promotion_binding_mismatch");
  }
  if (stableJson(plan?.target_binding?.counts) !==
      stableJson(expectedOnePieceCompleteDonAttributableWritesV1())) {
    findings.push("write_counts_mismatch");
  }
  if (plan?.boundaries?.insert_only !== true ||
      Object.entries(plan?.boundaries ?? {}).some(([key, value]) =>
        !["insert_only", "app_visibility_enabled"].includes(key) && value !== 0) ||
      plan?.boundaries?.app_visibility_enabled !== false) {
    findings.push("boundaries_mismatch");
  }
  return { valid: findings.length === 0, findings };
}

export function onePieceCompleteDonGlobalPostApplyExpectedV1() {
  return {
    sets: 60,
    card_prints: 6730,
    card_print_identity: 6730,
    card_print_identity_source_evidence: 6730,
    external_mappings: 6730,
    card_printings: 14,
    external_printing_mappings: 14,
    don_set_rows: 1,
    don_card_rows: 222,
    don_child_printings: 0,
    release_status: "hidden",
    anon_visible: false,
    authenticated_visible: false,
    service_role_visible: false,
  };
}

export { ONE_PIECE_COMPLETE_DON_SET_CODE };
