import {
  buildOnePieceDurableSourceExpectationV1,
  ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT,
} from "./one_piece_canonical_import_durable_payload_preflight_v1.mjs";
import {
  validateOnePieceDurablePayloadPlanV1,
} from "./one_piece_canonical_import_durable_payload_v1.mjs";
import {
  compareOnePieceProtectedSnapshotsAllowingMtgProgressV1,
  evaluateOnePieceSourceSnapshotV1,
} from "./one_piece_canonical_import_rollback_canary_v1.mjs";
import {
  evaluateOnePieceSchemaReadbackV1,
} from "./one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import { sha256, stableJson } from "./one_piece_canonical_import_staging_v1.mjs";

export const ONE_PIECE_DURABLE_PAYLOAD_APPLY_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_PAYLOAD_APPLY_V1";
export const ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_FINGERPRINT =
  "6ad9563bdfde6a62c50acf2eef00d7e6f4b7267d419a4e34b27fc68f7a26407d";
export const ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_SUMMARY_SHA256 =
  "9b2dfdbf3a2cda8a3989721c2215e82bbdc61f9d13ce685c711bc43119416301";
export const ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT =
  "3af8e474e2bf8036bcb6683c6bdb82c0f81a94015851f148b5a7f8e7c60b4a00";
export const ONE_PIECE_DURABLE_PAYLOAD_APPLY_APPROVAL_ENV =
  "ONE_PIECE_DURABLE_PAYLOAD_APPLY_APPROVAL";
export const ONE_PIECE_DURABLE_PAYLOAD_APPLY_GUARD = [
  "EXECUTE_ONE_PIECE_DURABLE_PAYLOAD_APPLY_V1",
  ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_FINGERPRINT,
  ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT,
  ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT,
  "ONE_BATCH_21_ROWS_NO_PROMOTION",
].join(":");

export function validateOnePieceDurablePayloadApplyInputsV1({
  plan,
  preflight,
  preflightSummaryText,
}) {
  const findings = [...validateOnePieceDurablePayloadPlanV1(plan).findings];
  if (plan.plan_fingerprint_sha256 !== ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT) {
    findings.push("payload_plan_fingerprint_mismatch");
  }
  if (plan.payload_fingerprint_sha256 !== ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT) {
    findings.push("payload_fingerprint_mismatch");
  }
  if (sha256(preflightSummaryText) !==
      ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_SUMMARY_SHA256) {
    findings.push("preflight_summary_hash_mismatch");
  }
  if (preflight.status !== "pass" || preflight.findings?.length !== 0 ||
      preflight.preflight_fingerprint_sha256 !==
        ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_FINGERPRINT ||
      preflight.payload_plan_fingerprint_sha256 !==
        ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT ||
      preflight.payload_fingerprint_sha256 !==
        ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT ||
      Number(preflight.selected_rows) !== 21) {
    findings.push("preflight_not_exact_and_passing");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function expectedOnePieceDurableBatchV1(plan) {
  const batch = plan.batch;
  return {
    id: batch.id,
    payload_fingerprint_sha256: batch.payload_fingerprint_sha256,
    source_manifest_logical_sha256: batch.source_manifest_logical_sha256,
    migration_candidate_sha256: batch.migration_candidate_sha256,
    plan_version: batch.plan_version,
    schema_version: batch.schema_version,
    producing_commit_sha: batch.producing_commit_sha,
    producing_branch: batch.producing_branch,
    source_category_id: Number(batch.source_category_id),
    source_group_id: Number(batch.source_group_id),
    source_group_name: batch.source_group_name,
    source_group_released_on: batch.source_group_released_on,
    staging_mode: batch.staging_mode,
    authorized_durable_batch_rows: Number(batch.authorized_durable_batch_rows),
    authorized_durable_staging_rows: Number(batch.authorized_durable_staging_rows),
    row_counts: batch.row_counts,
    execution_boundaries: batch.execution_boundaries,
  };
}

export function expectedOnePieceDurableRowsV1(plan) {
  return plan.staging_rows.map((row) => ({
    id: row.id,
    batch_id: row.batch_id,
    source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id),
    record_class: row.record_class,
    single_card_kind: row.single_card_kind ?? null,
    language_key: row.language_key,
    promotion_state: row.promotion_state,
    row_ordinal: Number(row.row_ordinal),
    payload: row.payload,
    payload_sha256: row.payload_sha256,
  }));
}

export function evaluateOnePieceDurablePayloadReadbackV1({
  plan,
  schemaPlan,
  readback,
  sourceSnapshot,
  protectedBefore,
  protectedAfter,
  schemaRequireReadOnly = true,
  schemaRequireClosed = true,
}) {
  const findings = [];
  if (Number(readback.total_batch_count) !== 1) findings.push("total_batch_count_mismatch");
  if (Number(readback.total_row_count) !== 21) findings.push("total_row_count_mismatch");
  if (Number(readback.batch_count) !== 1) findings.push("selected_batch_count_mismatch");
  if (Number(readback.row_count) !== 21) findings.push("selected_row_count_mismatch");
  if (stableJson(readback.batch) !== stableJson(expectedOnePieceDurableBatchV1(plan))) {
    findings.push("batch_readback_mismatch");
  }
  if (stableJson(readback.rows) !== stableJson(expectedOnePieceDurableRowsV1(plan))) {
    findings.push("row_readback_mismatch");
  }
  findings.push(...evaluateOnePieceSchemaReadbackV1({
    plan: schemaPlan,
    readback: readback.schema,
    requireReadOnly: schemaRequireReadOnly,
    requireClosed: schemaRequireClosed,
    expectedTableRowCounts: {
      one_piece_canonical_import_batches: 1,
      one_piece_canonical_import_rows: 21,
    },
  }).map((value) => `schema:${value}`));
  findings.push(...evaluateOnePieceSourceSnapshotV1(
    buildOnePieceDurableSourceExpectationV1(plan),
    sourceSnapshot,
  ).map((value) => `source:${value}`));
  if (protectedBefore && protectedAfter) {
    findings.push(...compareOnePieceProtectedSnapshotsAllowingMtgProgressV1(
      protectedBefore,
      protectedAfter,
    ).map((value) => `protected:${value}`));
  }
  if (readback.rows?.some((row) => row.payload?.publishable !== false ||
      row.payload?.canonical_write_authorized !== false ||
      row.payload?.sealed_write_authorized !== false)) {
    findings.push("staged_row_authority_open");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
