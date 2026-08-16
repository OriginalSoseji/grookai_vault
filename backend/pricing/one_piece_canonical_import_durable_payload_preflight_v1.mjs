import {
  buildOnePieceSourceExpectationV1,
  evaluateOnePieceSourceSnapshotV1,
} from "./one_piece_canonical_import_rollback_canary_v1.mjs";
import {
  ONE_PIECE_DURABLE_PAYLOAD_PLAN_VERSION,
  validateOnePieceDurablePayloadPlanV1,
} from "./one_piece_canonical_import_durable_payload_v1.mjs";
import {
  evaluateOnePieceSchemaReadbackV1,
} from "./one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import { sha256, stableJson } from "./one_piece_canonical_import_staging_v1.mjs";

export const ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_PAYLOAD_PREFLIGHT_V1";
export const ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT =
  "fc9b66a2ef637a62d13c46e23b09e815e923d8d7b19ff14c2e9dfaff5c5cb804";

export function buildOnePieceDurableSourceExpectationV1(plan) {
  return buildOnePieceSourceExpectationV1({
    ...plan,
    selected_group: {
      source_group_name: plan.batch.source_group_name,
      released_on: [plan.batch.source_group_released_on],
    },
  });
}

export function evaluateOnePieceDurablePayloadPreflightV1({
  plan,
  schemaPlan,
  schemaReadback,
  sourceSnapshot,
  collisionState,
  blockingPids,
}) {
  const findings = [];
  const planValidation = validateOnePieceDurablePayloadPlanV1(plan);
  findings.push(...planValidation.findings.map((value) => `plan:${value}`));
  if (plan.plan_version !== ONE_PIECE_DURABLE_PAYLOAD_PLAN_VERSION) {
    findings.push("plan_version_mismatch");
  }
  if (plan.plan_fingerprint_sha256 !== ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT) {
    findings.push("plan_fingerprint_mismatch");
  }
  findings.push(...evaluateOnePieceSchemaReadbackV1({
    plan: schemaPlan,
    readback: schemaReadback,
  }).map((value) => `schema:${value}`));
  const sourceExpectation = buildOnePieceDurableSourceExpectationV1(plan);
  findings.push(...evaluateOnePieceSourceSnapshotV1(
    sourceExpectation,
    sourceSnapshot,
  ).map((value) => `source:${value}`));
  for (const [key, value] of Object.entries(collisionState ?? {})) {
    if (Number(value) !== 0) findings.push(`collision:${key}`);
  }
  if ((blockingPids ?? []).length !== 0) findings.push("database_session_blocked");
  return {
    valid: findings.length === 0,
    findings: [...new Set(findings)],
    source_expectation_sha256: sha256(stableJson(sourceExpectation)),
  };
}

export function buildOnePieceDurablePayloadPreflightFingerprintV1(input) {
  return sha256(stableJson({
    version: ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_VERSION,
    producer_commit_sha: input.producer_commit_sha,
    payload_plan_fingerprint_sha256: input.payload_plan_fingerprint_sha256,
    payload_fingerprint_sha256: input.payload_fingerprint_sha256,
    schema_apply_plan_fingerprint_sha256: input.schema_apply_plan_fingerprint_sha256,
    source_expectation_sha256: input.source_expectation_sha256,
    schema_readback_sha256: input.schema_readback_sha256,
    source_snapshot_sha256: input.source_snapshot_sha256,
    collision_state_sha256: input.collision_state_sha256,
  }));
}
