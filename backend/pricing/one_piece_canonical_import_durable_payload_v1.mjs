import {
  ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
} from "./one_piece_canonical_import_durable_staging_preflight_v1.mjs";
import {
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";

export const ONE_PIECE_DURABLE_PAYLOAD_PLAN_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_PAYLOAD_PLAN_V1";
export const ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_SCHEMA_V1";
export const ONE_PIECE_DURABLE_PAYLOAD_SOURCE_MANIFEST_SHA256 =
  "e55e334b828db7b3a45e4b09cb34a51c81731cf309f3959c08052edb5cf4abf9";
export const ONE_PIECE_DURABLE_PAYLOAD_CANARY_PLAN_SHA256 =
  "174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90";
export const ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PLAN_SHA256 =
  "ee4b70bbfbda797cede83706cccc5234dc9dba619fc23053d02cff6aaad09e58";
export const ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PROOF_SHA256 =
  "dff4e23d0d33773787f9829f847ae26f666a10cdd80b99f0929abf1600def8e9";
export const ONE_PIECE_DURABLE_PAYLOAD_BATCH_ID =
  "998e9eb3-bc80-5306-aa69-61f6d1d4362b";
export const ONE_PIECE_DURABLE_PAYLOAD_APPROVAL_ENV =
  "ONE_PIECE_DURABLE_PAYLOAD_APPLY_APPROVAL";

function sortedNumbers(values) {
  return [...values].map(Number).sort((left, right) => left - right);
}

export function buildOnePieceDurablePayloadPlanV1({
  repository,
  canaryPlan,
  schemaApplyProof,
  schemaApplyProofSha256,
}) {
  if (schemaApplyProofSha256 !==
      ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PROOF_SHA256) {
    throw new Error("Durable schema proof file changed");
  }
  if (canaryPlan?.canary_plan_fingerprint_sha256 !==
      ONE_PIECE_DURABLE_PAYLOAD_CANARY_PLAN_SHA256) {
    throw new Error("Canary plan fingerprint changed");
  }
  if (canaryPlan?.manifest_logical_sha256 !==
      ONE_PIECE_DURABLE_PAYLOAD_SOURCE_MANIFEST_SHA256) {
    throw new Error("Source manifest fingerprint changed");
  }
  if (schemaApplyProof?.status !== "schema_only_applied_and_fresh_readback_passed" ||
      schemaApplyProof?.plan_fingerprint_sha256 !==
        ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PLAN_SHA256 ||
      schemaApplyProof?.migration_sha256 !==
        ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256) {
    throw new Error("Durable schema proof is not exact and passing");
  }
  if (Number(schemaApplyProof?.boundaries?.one_piece_staging_rows_written) !== 0) {
    throw new Error("Schema apply proof contains One Piece staging rows");
  }
  const stagingRows = structuredClone(canaryPlan.staging_rows ?? [])
    .sort((left, right) => Number(left.row_ordinal) - Number(right.row_ordinal));
  const payloadCore = {
    source_manifest_logical_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_SOURCE_MANIFEST_SHA256,
    source_canary_plan_fingerprint_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_CANARY_PLAN_SHA256,
    schema_apply_plan_fingerprint_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PLAN_SHA256,
    migration_candidate_sha256: ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
    source_group_id: 3189,
    source_group_name: "Starter Deck 1: Straw Hat Crew",
    staging_rows: stagingRows,
  };
  const payloadFingerprint = sha256(stableJson(payloadCore));
  const executionBoundaries = {
    durable_staging_only: true,
    authorized_batch_rows: 1,
    authorized_staging_rows: 21,
    canonical_promotion: false,
    sealed_promotion: false,
    pricing_publication: false,
    app_or_public_visibility: false,
    storage_or_image_writes: false,
    vault_writes: false,
    mtg_writes: false,
  };
  const batch = {
    id: ONE_PIECE_DURABLE_PAYLOAD_BATCH_ID,
    payload_fingerprint_sha256: payloadFingerprint,
    source_manifest_logical_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_SOURCE_MANIFEST_SHA256,
    migration_candidate_sha256: ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
    plan_version: ONE_PIECE_DURABLE_PAYLOAD_PLAN_VERSION,
    schema_version: ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_VERSION,
    producing_commit_sha: repository.commit_sha,
    producing_branch: repository.branch,
    source_category_id: 68,
    source_group_id: 3189,
    source_group_name: "Starter Deck 1: Straw Hat Crew",
    source_group_released_on: "2022-12-02",
    staging_mode: "durable_service_only",
    authorized_durable_batch_rows: 1,
    authorized_durable_staging_rows: 21,
    row_counts: structuredClone(canaryPlan.counts),
    execution_boundaries: structuredClone(executionBoundaries),
  };
  const core = {
    plan_version: ONE_PIECE_DURABLE_PAYLOAD_PLAN_VERSION,
    schema_version: ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_VERSION,
    repository,
    source_manifest_logical_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_SOURCE_MANIFEST_SHA256,
    source_canary_plan_fingerprint_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_CANARY_PLAN_SHA256,
    schema_apply_plan_fingerprint_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PLAN_SHA256,
    schema_apply_proof_sha256: schemaApplyProofSha256,
    migration_candidate_sha256: ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
    payload_fingerprint_sha256: payloadFingerprint,
    batch,
    staging_rows: stagingRows,
    counts: structuredClone(canaryPlan.counts),
    boundaries: executionBoundaries,
  };
  const planFingerprint = sha256(stableJson(core));
  return {
    ...core,
    plan_fingerprint_sha256: planFingerprint,
    approval_env: ONE_PIECE_DURABLE_PAYLOAD_APPROVAL_ENV,
    guard_token: [
      "EXECUTE_ONE_PIECE_DURABLE_PAYLOAD_V1",
      planFingerprint,
      payloadFingerprint,
      ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PLAN_SHA256,
      "ONE_BATCH_21_ROWS_NO_PROMOTION",
    ].join(":"),
  };
}

export function validateOnePieceDurablePayloadPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { plan_fingerprint_sha256: ignoredPlan, approval_env: ignoredEnv,
    guard_token: ignoredGuard, ...core } = plan ?? {};
  add(plan?.plan_version !== ONE_PIECE_DURABLE_PAYLOAD_PLAN_VERSION,
    "plan_version_mismatch");
  add(plan?.schema_version !== ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_VERSION,
    "schema_version_mismatch");
  add(plan?.source_manifest_logical_sha256 !==
    ONE_PIECE_DURABLE_PAYLOAD_SOURCE_MANIFEST_SHA256, "manifest_hash_mismatch");
  add(plan?.source_canary_plan_fingerprint_sha256 !==
    ONE_PIECE_DURABLE_PAYLOAD_CANARY_PLAN_SHA256, "canary_plan_mismatch");
  add(plan?.schema_apply_plan_fingerprint_sha256 !==
    ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PLAN_SHA256,
  "schema_apply_plan_mismatch");
  add(plan?.schema_apply_proof_sha256 !==
    ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PROOF_SHA256,
  "schema_apply_proof_mismatch");
  add(plan?.migration_candidate_sha256 !==
    ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256, "migration_hash_mismatch");
  add(!/^[0-9a-f]{40}$/.test(plan?.repository?.commit_sha ?? ""),
    "producer_commit_invalid");
  add(plan?.repository?.branch !== "agent/one-piece-ingestion-readiness-v1",
    "producer_branch_mismatch");
  add(plan?.plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "plan_fingerprint_mismatch");
  add(plan?.approval_env !== ONE_PIECE_DURABLE_PAYLOAD_APPROVAL_ENV,
    "approval_env_mismatch");

  const rows = plan?.staging_rows ?? [];
  add(rows.length !== 21, "staging_row_count_mismatch");
  add(plan?.batch?.id !== ONE_PIECE_DURABLE_PAYLOAD_BATCH_ID,
    "batch_id_mismatch");
  add(plan?.batch?.authorized_durable_batch_rows !== 1,
    "batch_authority_mismatch");
  add(plan?.batch?.authorized_durable_staging_rows !== 21,
    "row_authority_mismatch");
  add(plan?.batch?.payload_fingerprint_sha256 !== plan?.payload_fingerprint_sha256,
    "batch_payload_fingerprint_mismatch");
  const expectedPayloadFingerprint = sha256(stableJson({
    source_manifest_logical_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_SOURCE_MANIFEST_SHA256,
    source_canary_plan_fingerprint_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_CANARY_PLAN_SHA256,
    schema_apply_plan_fingerprint_sha256:
      ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PLAN_SHA256,
    migration_candidate_sha256: ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
    source_group_id: 3189,
    source_group_name: "Starter Deck 1: Straw Hat Crew",
    staging_rows: rows,
  }));
  add(plan?.payload_fingerprint_sha256 !== expectedPayloadFingerprint,
    "payload_fingerprint_mismatch");
  add(plan?.batch?.staging_mode !== "durable_service_only",
    "staging_mode_mismatch");
  add(plan?.batch?.source_category_id !== 68 ||
    plan?.batch?.source_group_id !== 3189, "source_scope_mismatch");
  add(plan?.batch?.producing_commit_sha !== plan?.repository?.commit_sha ||
    plan?.batch?.producing_branch !== plan?.repository?.branch,
  "batch_producer_mismatch");
  add(plan?.batch?.source_manifest_logical_sha256 !==
    ONE_PIECE_DURABLE_PAYLOAD_SOURCE_MANIFEST_SHA256,
  "batch_manifest_mismatch");
  add(plan?.batch?.migration_candidate_sha256 !==
    ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
  "batch_migration_mismatch");

  add(new Set(rows.map((row) => row.id)).size !== rows.length,
    "duplicate_staging_row_ids");
  add(new Set(rows.map((row) => Number(row.source_product_id))).size !== rows.length,
    "duplicate_source_product_ids");
  add(stableJson(sortedNumbers(rows.map((row) => row.row_ordinal))) !==
    stableJson([...Array(21).keys()]), "row_ordinals_not_contiguous");
  for (const row of rows) {
    add(row.batch_id !== ONE_PIECE_DURABLE_PAYLOAD_BATCH_ID,
      `row_batch_mismatch:${row.id}`);
    add(Number(row.source_group_id) !== 3189,
      `row_group_mismatch:${row.id}`);
    add(Number(row.payload?.source_product_id) !== Number(row.source_product_id),
      `row_payload_product_mismatch:${row.id}`);
    add(row.payload_sha256 !== sha256(stableJson(row.payload)),
      `row_payload_hash_mismatch:${row.id}`);
    add(row.payload?.publishable !== false ||
      row.payload?.canonical_write_authorized !== false ||
      row.payload?.sealed_write_authorized !== false,
    `row_authority_open:${row.id}`);
  }
  const classCounts = Object.fromEntries(["exact_single_card_candidate",
    "sealed_product_candidate", "ambiguous_quarantine"].map((recordClass) => [
    recordClass,
    rows.filter((row) => row.record_class === recordClass).length,
  ]));
  add(classCounts.exact_single_card_candidate !== 18,
    "single_candidate_count_mismatch");
  add(classCounts.sealed_product_candidate !== 3,
    "sealed_candidate_count_mismatch");
  add(classCounts.ambiguous_quarantine !== 0,
    "quarantine_count_mismatch");
  const expectedCounts = {
    source_products: 21,
    exact_single_card_candidates: 18,
    numbered_cards: 17,
    don_cards: 1,
    sealed_product_candidates: 3,
    ambiguous_quarantined: 0,
    future_or_presale_holds: 0,
    source_price_lanes: 21,
  };
  add(stableJson(plan?.counts) !== stableJson(expectedCounts),
    "plan_counts_mismatch");
  add(stableJson(plan?.batch?.row_counts) !== stableJson(expectedCounts),
    "batch_counts_mismatch");
  const boundary = plan?.boundaries ?? {};
  add(boundary.durable_staging_only !== true,
    "durable_staging_boundary_closed");
  for (const key of ["canonical_promotion", "sealed_promotion",
    "pricing_publication", "app_or_public_visibility", "storage_or_image_writes",
    "vault_writes", "mtg_writes"]) {
    add(boundary[key] !== false, `forbidden_boundary_open:${key}`);
  }
  add(stableJson(plan?.batch?.execution_boundaries) !== stableJson(boundary),
    "batch_boundary_mismatch");
  const expectedGuard = [
    "EXECUTE_ONE_PIECE_DURABLE_PAYLOAD_V1",
    plan?.plan_fingerprint_sha256,
    plan?.payload_fingerprint_sha256,
    ONE_PIECE_DURABLE_PAYLOAD_SCHEMA_APPLY_PLAN_SHA256,
    "ONE_BATCH_21_ROWS_NO_PROMOTION",
  ].join(":");
  add(plan?.guard_token !== expectedGuard, "guard_token_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
