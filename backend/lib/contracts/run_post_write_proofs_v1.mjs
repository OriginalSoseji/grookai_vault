import { recordValidationFailureV1 } from './validate_write_v1.mjs';

// LOCK: Post-write proof failure means the write is incomplete.
// LOCK: Proof mode must be explicit for every canon-affecting execution that uses the shared executor.

export const POST_WRITE_PROOF_MODES_V1 = {
  external_discovery_to_warehouse_bridge_v1: 'transactional_authoritative',
  classification_apply_write_plan_v1: 'transactional_authoritative',
  classification_apply_reclassification_result_v1: 'transactional_authoritative',
  promotion_stage_create_stage_v1: 'transactional_authoritative',
  alias_mapping_execution_v1: 'transactional_authoritative',
  promotion_executor_execute_claimed_stage_v1: 'transactional_authoritative',
  gv_id_assignment_worker_v1: 'compensated_non_transactional',
  source_image_enrichment_worker_v1: 'transactional_authoritative',
  promote_source_backed_justtcg_mapping_v1: 'compensated_non_transactional',
  printing_upsert_v1: 'compensated_non_transactional',
};

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function createFailure({
  contract_name,
  violation_type,
  severity = 'hard_fail',
  reason,
  payload_snapshot,
}) {
  return {
    ok: false,
    contract_name,
    violation_type,
    severity,
    reason,
    payload_snapshot,
  };
}

export function getPostWriteProofModeV1(executionName) {
  return POST_WRITE_PROOF_MODES_V1[executionName] ?? null;
}

async function evaluateProofV1(proof, auditTarget, executionName) {
  if (typeof proof.run === 'function') {
    return proof.run(auditTarget);
  }
  if (proof.query && auditTarget && typeof auditTarget.query === 'function') {
    const queryResult = await auditTarget.query(proof.query, proof.params ?? []);
    return typeof proof.evaluate === 'function' ? proof.evaluate(queryResult) : { ok: true };
  }
  throw new Error(`[contracts] invalid post-write proof for ${executionName}`);
}

export async function runPostWriteProofsV1({
  execution_name,
  proof_mode = null,
  payload_snapshot = null,
  proofs = [],
  audit_target = null,
  ledger_target = null,
  actor_type = 'system_worker',
  actor_id = null,
  source_worker = null,
  source_api = null,
  source_system = null,
}) {
  const resolvedProofMode = proof_mode ?? getPostWriteProofModeV1(execution_name);
  if (!resolvedProofMode) {
    const validation = createFailure({
      contract_name: 'GROOKAI_GUARDRAILS',
      violation_type: 'missing_post_write_proof_mode',
      reason: `${execution_name} has no registered post-write proof mode.`,
      payload_snapshot,
    });
    const evidence = await recordValidationFailureV1({
      validation,
      execution_name,
      actor_type,
      actor_id,
      source_worker,
      source_api,
      source_system,
      payload_snapshot,
      ledger_target,
    });
    return {
      ok: false,
      stage: 'post_write_proof',
      failure_type: validation.severity,
      contract_name: validation.contract_name,
      reason: validation.reason,
      proof_mode: resolvedProofMode,
      violation_id: evidence.violation_id,
      quarantine_id: evidence.quarantine_id,
    };
  }

  for (const proof of proofs) {
    let result;
    try {
      result = await evaluateProofV1(proof, audit_target, execution_name);
    } catch (error) {
      result = {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }

    if (result?.ok === true) {
      continue;
    }

    const validation = createFailure({
      contract_name: normalizeTextOrNull(proof.contract_name) ?? 'GROOKAI_GUARDRAILS',
      violation_type: normalizeTextOrNull(proof.violation_type) ?? 'post_write_proof_failed',
      severity: proof.severity === 'quarantine' ? 'quarantine' : 'hard_fail',
      reason:
        normalizeTextOrNull(result?.reason) ??
        normalizeTextOrNull(proof.reason) ??
        `Post-write proof ${proof.name ?? 'unnamed'} failed.`,
      payload_snapshot:
        result?.payload_snapshot === undefined ? payload_snapshot ?? null : result.payload_snapshot,
    });

    const evidence = await recordValidationFailureV1({
      validation,
      execution_name,
      actor_type,
      actor_id,
      source_worker,
      source_api,
      source_system,
      payload_snapshot,
      ledger_target,
    });

    return {
      ok: false,
      stage: 'post_write_proof',
      failure_type: validation.severity,
      contract_name: validation.contract_name,
      reason: validation.reason,
      proof_mode: resolvedProofMode,
      violation_id: evidence.violation_id,
      quarantine_id: evidence.quarantine_id,
    };
  }

  return {
    ok: true,
    proof_passed: true,
    proof_mode: resolvedProofMode,
  };
}
