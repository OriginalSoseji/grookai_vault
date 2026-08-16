import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
} from "./one_piece_canonical_import_durable_staging_preflight_v1.mjs";

export const ONE_PIECE_COMPLETE_STAGING_PLAN_VERSION =
  "ONE_PIECE_COMPLETE_CATALOG_STAGING_RELEASE_PLAN_V1";
export const ONE_PIECE_COMPLETE_STAGING_SCHEMA_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_SCHEMA_V1";
export const ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256 =
  "4cf38876576da399747dc8d5d0925c143812f89ecf4a75e6f9ced7a220828824";
export const ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256 =
  "973bec5c186adc8853dcff91218e1057772aea384f9a3318919fb03b9c39bc0e";
export const ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256 =
  "49e0e7d9230f23692df9d9d739ccbf18f2e959722d1cfa52fcc6f3fc50021060";
export const ONE_PIECE_COMPLETE_STAGING_SCHEMA_PROOF_SHA256 =
  "3da87d344822fc44e743297d093d42652f51c13cfad91c14e4456255d872f789";
export const ONE_PIECE_COMPLETE_STAGING_PRIOR_PAYLOAD_PROOF_SHA256 =
  "4abc27cb62c12c71f827e3a2544f74876d44af0408015aa15368b20efa6f8bf9";
export const ONE_PIECE_COMPLETE_STAGING_APPROVAL_ENV =
  "ONE_PIECE_COMPLETE_STAGING_RELEASE_APPROVAL";

export const ONE_PIECE_COMPLETE_STAGING_EXPECTED_COUNTS = Object.freeze({
  warehouse_source_groups: 84,
  materialized_source_groups: 83,
  source_products: 7261,
  exact_single_card_candidates: 6852,
  numbered_cards: 6627,
  don_cards: 225,
  sealed_product_candidates: 403,
  ambiguous_quarantined: 6,
  future_or_presale_holds: 82,
  source_price_lanes: 7053,
});

const RECORD_CLASSES = new Set([
  "exact_single_card_candidate",
  "sealed_product_candidate",
  "ambiguous_quarantine",
]);
const SINGLE_KINDS = new Set(["numbered_card", "don_card"]);
const PROMOTION_STATES = new Set([
  "current_candidate",
  "future_or_presale_hold",
  "inactive_source_hold",
  "separate_sealed_catalog",
  "quarantine",
]);
const CLOSED_BOUNDARIES = Object.freeze({
  durable_service_only: true,
  canonical_promotion: false,
  sealed_promotion: false,
  pricing_publication: false,
  app_or_public_visibility: false,
  storage_or_image_writes: false,
  image_pointer_writes: false,
  vault_writes: false,
  mtg_writes: false,
  one_piece_release_activation: false,
});

function numericCompare(left, right) {
  return Number(left) - Number(right);
}

function countRows(rows) {
  return {
    source_products: rows.length,
    exact_single_card_candidates: rows.filter(
      (row) => row.classification === "exact_single_card_candidate",
    ).length,
    numbered_cards: rows.filter((row) => row.single_card_kind === "numbered_card").length,
    don_cards: rows.filter((row) => row.single_card_kind === "don_card").length,
    sealed_product_candidates: rows.filter(
      (row) => row.classification === "sealed_product_candidate",
    ).length,
    ambiguous_quarantined: rows.filter(
      (row) => row.classification === "ambiguous_quarantine",
    ).length,
    future_or_presale_holds: rows.filter(
      (row) => row.promotion_state === "future_or_presale_hold",
    ).length,
    source_price_lanes: rows.reduce(
      (count, row) => count + (row.source_price_lanes?.length ?? 0),
      0,
    ),
  };
}

function buildStagingRow(batchId, payload, rowOrdinal) {
  return {
    id: deterministicUuidV5(
      `one-piece:complete-staging-row-v1:${batchId}:${payload.source_product_id}`,
    ),
    batch_id: batchId,
    source_product_id: Number(payload.source_product_id),
    source_group_id: Number(payload.source_group_id),
    record_class: payload.classification,
    single_card_kind: payload.single_card_kind,
    language_key: payload.language?.normalized ?? "und",
    promotion_state: payload.promotion_state,
    row_ordinal: rowOrdinal,
    payload,
    payload_sha256: sha256(stableJson(payload)),
  };
}

function summarizeBatchRows(rows) {
  const releaseDates = [...new Set(
    rows.map((row) => row.payload.release?.released_on).filter(Boolean),
  )].sort();
  return {
    ...countRows(rows.map((row) => row.payload)),
    release_dates: releaseDates,
  };
}

function batchPayloadFingerprint(input) {
  return sha256(stableJson({
    release_version: ONE_PIECE_COMPLETE_STAGING_PLAN_VERSION,
    source_manifest_logical_sha256:
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
    source_group_id: input.source_group_id,
    source_group_name: input.source_group_name,
    staging_rows: input.staging_rows,
  }));
}

export function buildOnePieceCompleteStagingReleaseV1(input, options = {}) {
  const allowFixture = options.allowFixture === true;
  const manifestLogicalSha256 = input.manifestLogicalSha256;
  if (!allowFixture && manifestLogicalSha256 !==
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256) {
    throw new Error("Complete One Piece manifest logical hash changed");
  }
  if (!allowFixture && input.manifestCompressedSha256 !==
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256) {
    throw new Error("Complete One Piece manifest compressed hash changed");
  }
  if (!allowFixture && input.sourceSummarySha256 !==
      ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256) {
    throw new Error("Complete One Piece source summary hash changed");
  }
  if (!/^[0-9a-f]{40}$/.test(input.repository?.commit_sha ?? "") ||
      input.repository?.branch !== "agent/one-piece-ingestion-readiness-v1") {
    throw new Error("Exact One Piece producer repository identity is required");
  }

  const manifestRows = structuredClone(input.manifestRows ?? []);
  manifestRows.sort((left, right) =>
    numericCompare(left.source_group_id, right.source_group_id) ||
    numericCompare(left.source_product_id, right.source_product_id));
  const groups = new Map();
  for (const row of manifestRows) {
    const groupId = Number(row.source_group_id);
    const groupRows = groups.get(groupId) ?? [];
    groupRows.push(row);
    groups.set(groupId, groupRows);
  }

  const batches = [];
  for (const [groupId, groupRows] of groups.entries()) {
    const groupNames = [...new Set(groupRows.map((row) => row.source_group_name))];
    if (groupNames.length !== 1) {
      throw new Error(`Source group ${groupId} has inconsistent names`);
    }
    const batchId = deterministicUuidV5(
      `one-piece:complete-staging-batch-v1:${manifestLogicalSha256}:${groupId}`,
    );
    const stagingRows = groupRows.map(
      (payload, rowOrdinal) => buildStagingRow(batchId, payload, rowOrdinal),
    );
    const rowCounts = summarizeBatchRows(stagingRows);
    const payloadFingerprintSha256 = batchPayloadFingerprint({
      source_group_id: groupId,
      source_group_name: groupNames[0],
      staging_rows: stagingRows,
    });
    const releasedOn = rowCounts.release_dates.length === 1
      ? rowCounts.release_dates[0]
      : null;
    batches.push({
      batch: {
        id: batchId,
        payload_fingerprint_sha256: payloadFingerprintSha256,
        source_manifest_logical_sha256: manifestLogicalSha256,
        migration_candidate_sha256: ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
        plan_version: ONE_PIECE_COMPLETE_STAGING_PLAN_VERSION,
        schema_version: ONE_PIECE_COMPLETE_STAGING_SCHEMA_VERSION,
        producing_commit_sha: input.repository.commit_sha,
        producing_branch: input.repository.branch,
        source_category_id: 68,
        source_group_id: groupId,
        source_group_name: groupNames[0],
        source_group_released_on: releasedOn,
        staging_mode: "durable_service_only",
        authorized_durable_batch_rows: 1,
        authorized_durable_staging_rows: stagingRows.length,
        row_counts: rowCounts,
        execution_boundaries: structuredClone(CLOSED_BOUNDARIES),
      },
      staging_rows: stagingRows,
    });
  }

  const aggregateCounts = {
    warehouse_source_groups: Number(input.warehouseSourceGroupCount),
    materialized_source_groups: batches.length,
    ...countRows(manifestRows),
  };
  const batchIndex = batches.map(({ batch }) => ({
    id: batch.id,
    payload_fingerprint_sha256: batch.payload_fingerprint_sha256,
    source_group_id: batch.source_group_id,
    source_group_name: batch.source_group_name,
    source_group_released_on: batch.source_group_released_on,
    authorized_durable_staging_rows: batch.authorized_durable_staging_rows,
    row_counts: batch.row_counts,
  }));
  const releasePayloadFingerprintSha256 = sha256(stableJson({
    source_manifest_logical_sha256: manifestLogicalSha256,
    source_manifest_compressed_sha256: input.manifestCompressedSha256,
    source_summary_sha256: input.sourceSummarySha256,
    aggregate_counts: aggregateCounts,
    batches: batchIndex,
  }));
  const core = {
    plan_version: ONE_PIECE_COMPLETE_STAGING_PLAN_VERSION,
    schema_version: ONE_PIECE_COMPLETE_STAGING_SCHEMA_VERSION,
    repository: input.repository,
    as_of_date: input.asOfDate,
    source_manifest: {
      logical_sha256: manifestLogicalSha256,
      compressed_sha256: input.manifestCompressedSha256,
      summary_sha256: input.sourceSummarySha256,
      row_count: manifestRows.length,
    },
    schema_authority: {
      migration_sha256: ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
      independent_schema_proof_sha256: input.schemaProofSha256,
      prior_durable_payload_proof_sha256: input.priorPayloadProofSha256,
    },
    aggregate_counts: aggregateCounts,
    batch_index: batchIndex,
    release_payload_fingerprint_sha256: releasePayloadFingerprintSha256,
    boundaries: structuredClone(CLOSED_BOUNDARIES),
    empty_source_group_policy: {
      positive_row_batches_only: true,
      warehouse_group_count: Number(input.warehouseSourceGroupCount),
      materialized_group_count: batches.length,
      empty_group_count: Number(input.warehouseSourceGroupCount) - batches.length,
      empty_groups_are_source_coverage_diagnostics_not_missing_products: true,
    },
  };
  const planFingerprintSha256 = sha256(stableJson(core));
  return {
    plan: {
      ...core,
      plan_fingerprint_sha256: planFingerprintSha256,
      approval_env: ONE_PIECE_COMPLETE_STAGING_APPROVAL_ENV,
      guard_token: buildOnePieceCompleteStagingGuardV1({
        planFingerprintSha256,
        releasePayloadFingerprintSha256,
        producerCommitSha: input.repository.commit_sha,
      }),
    },
    batches,
  };
}

export function buildOnePieceCompleteStagingGuardV1({
  planFingerprintSha256,
  releasePayloadFingerprintSha256,
  producerCommitSha,
}) {
  return [
    "EXECUTE_ONE_PIECE_COMPLETE_STAGING_RELEASE_V1",
    producerCommitSha,
    planFingerprintSha256,
    releasePayloadFingerprintSha256,
    "SERVICE_ONLY_83_BATCHES_7261_ROWS_NO_PROMOTION",
  ].join(":");
}

export function validateOnePieceCompleteStagingReleaseV1(
  release,
  options = {},
) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const plan = release?.plan;
  const batches = release?.batches ?? [];
  const expectedCounts = options.expectedCounts ??
    ONE_PIECE_COMPLETE_STAGING_EXPECTED_COUNTS;
  const expectedLogicalHash = options.manifestLogicalSha256 ??
    ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256;
  const { plan_fingerprint_sha256: ignoredPlan, approval_env: ignoredEnv,
    guard_token: ignoredGuard, ...planCore } = plan ?? {};

  add(plan?.plan_version !== ONE_PIECE_COMPLETE_STAGING_PLAN_VERSION,
    "plan_version_mismatch");
  add(plan?.schema_version !== ONE_PIECE_COMPLETE_STAGING_SCHEMA_VERSION,
    "schema_version_mismatch");
  add(plan?.repository?.branch !== "agent/one-piece-ingestion-readiness-v1",
    "producer_branch_mismatch");
  add(!/^[0-9a-f]{40}$/.test(plan?.repository?.commit_sha ?? ""),
    "producer_commit_invalid");
  add(plan?.source_manifest?.logical_sha256 !== expectedLogicalHash,
    "manifest_logical_hash_mismatch");
  add(plan?.schema_authority?.migration_sha256 !==
    ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256, "migration_hash_mismatch");
  add(plan?.plan_fingerprint_sha256 !== sha256(stableJson(planCore)),
    "plan_fingerprint_mismatch");
  add(plan?.approval_env !== ONE_PIECE_COMPLETE_STAGING_APPROVAL_ENV,
    "approval_env_mismatch");
  add(stableJson(plan?.aggregate_counts) !== stableJson(expectedCounts),
    "aggregate_counts_mismatch");
  add(batches.length !== expectedCounts.materialized_source_groups,
    "batch_count_mismatch");
  add(plan?.batch_index?.length !== batches.length, "batch_index_count_mismatch");
  add(plan?.empty_source_group_policy?.empty_group_count !==
    expectedCounts.warehouse_source_groups - expectedCounts.materialized_source_groups,
  "empty_group_diagnostic_mismatch");

  const boundary = plan?.boundaries ?? {};
  add(boundary.durable_service_only !== true, "service_only_boundary_closed");
  for (const [key, value] of Object.entries(CLOSED_BOUNDARIES)) {
    add(boundary[key] !== value, `forbidden_boundary_drift:${key}`);
  }

  const rows = batches.flatMap((entry) => entry.staging_rows ?? []);
  add(rows.length !== expectedCounts.source_products, "staging_row_count_mismatch");
  add(new Set(batches.map((entry) => entry.batch.id)).size !== batches.length,
    "duplicate_batch_ids");
  add(new Set(batches.map((entry) =>
    entry.batch.payload_fingerprint_sha256)).size !== batches.length,
  "duplicate_batch_payload_fingerprints");
  add(new Set(rows.map((row) => row.id)).size !== rows.length,
    "duplicate_staging_row_ids");
  add(new Set(rows.map((row) => Number(row.source_product_id))).size !== rows.length,
    "duplicate_source_product_ids");

  for (const entry of batches) {
    const batch = entry.batch;
    const batchRows = entry.staging_rows ?? [];
    const planIndex = plan?.batch_index?.find((row) => row.id === batch.id);
    add(!planIndex, `batch_missing_from_index:${batch.id}`);
    add(batch.authorized_durable_batch_rows !== 1,
      `batch_authority_mismatch:${batch.id}`);
    add(batch.authorized_durable_staging_rows !== batchRows.length,
      `batch_row_authority_mismatch:${batch.id}`);
    add(batch.staging_mode !== "durable_service_only",
      `batch_mode_mismatch:${batch.id}`);
    add(batch.source_category_id !== 68, `batch_category_mismatch:${batch.id}`);
    add(batch.producing_commit_sha !== plan?.repository?.commit_sha ||
      batch.producing_branch !== plan?.repository?.branch,
    `batch_producer_mismatch:${batch.id}`);
    add(stableJson(batch.execution_boundaries) !== stableJson(boundary),
      `batch_boundary_mismatch:${batch.id}`);
    add(stableJson(batch.row_counts) !== stableJson(summarizeBatchRows(batchRows)),
      `batch_counts_mismatch:${batch.id}`);
    add(batch.payload_fingerprint_sha256 !== batchPayloadFingerprint({
      source_group_id: batch.source_group_id,
      source_group_name: batch.source_group_name,
      staging_rows: batchRows,
    }), `batch_payload_fingerprint_mismatch:${batch.id}`);
    for (const [rowOrdinal, row] of batchRows.entries()) {
      const prefix = `row:${row.id}`;
      add(row.batch_id !== batch.id, `${prefix}:batch_mismatch`);
      add(row.row_ordinal !== rowOrdinal, `${prefix}:ordinal_mismatch`);
      add(row.source_group_id !== batch.source_group_id,
        `${prefix}:group_mismatch`);
      add(!RECORD_CLASSES.has(row.record_class), `${prefix}:record_class_invalid`);
      add(!PROMOTION_STATES.has(row.promotion_state),
        `${prefix}:promotion_state_invalid`);
      if (row.record_class === "exact_single_card_candidate") {
        add(!SINGLE_KINDS.has(row.single_card_kind), `${prefix}:single_kind_invalid`);
      } else {
        add(row.single_card_kind !== null, `${prefix}:non_single_has_kind`);
      }
      add(row.source_product_id !== Number(row.payload?.source_product_id),
        `${prefix}:payload_product_mismatch`);
      add(row.source_group_id !== Number(row.payload?.source_group_id),
        `${prefix}:payload_group_mismatch`);
      add(row.record_class !== row.payload?.classification,
        `${prefix}:payload_class_mismatch`);
      add(row.promotion_state !== row.payload?.promotion_state,
        `${prefix}:payload_state_mismatch`);
      add(row.payload_sha256 !== sha256(stableJson(row.payload)),
        `${prefix}:payload_hash_mismatch`);
      add(row.payload?.publishable !== false ||
        row.payload?.canonical_write_authorized !== false ||
        row.payload?.sealed_write_authorized !== false,
      `${prefix}:authority_open`);
    }
  }

  const releaseFingerprint = sha256(stableJson({
    source_manifest_logical_sha256: plan?.source_manifest?.logical_sha256,
    source_manifest_compressed_sha256: plan?.source_manifest?.compressed_sha256,
    source_summary_sha256: plan?.source_manifest?.summary_sha256,
    aggregate_counts: plan?.aggregate_counts,
    batches: plan?.batch_index,
  }));
  add(plan?.release_payload_fingerprint_sha256 !== releaseFingerprint,
    "release_payload_fingerprint_mismatch");
  add(plan?.guard_token !== buildOnePieceCompleteStagingGuardV1({
    planFingerprintSha256: plan?.plan_fingerprint_sha256,
    releasePayloadFingerprintSha256: plan?.release_payload_fingerprint_sha256,
    producerCommitSha: plan?.repository?.commit_sha,
  }), "guard_token_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateOnePieceCompleteStagingCollisionStateV1(state) {
  const findings = [];
  for (const key of ["batch_ids", "batch_payload_fingerprints", "staging_row_ids"]) {
    if (Number(state?.[key]) !== 0) findings.push(`collision:${key}`);
  }
  return { valid: findings.length === 0, findings };
}
