import { getContractScopeV1 } from './contract_scope_v1.mjs';
import {
  recordValidationFailureV1,
  validateWriteV1,
} from './validate_write_v1.mjs';
import {
  getPostWriteProofModeV1,
  runPostWriteProofsV1,
} from './run_post_write_proofs_v1.mjs';

// LOCK: Canon-affecting writes must enter through execute_canon_write_v1 or be explicitly deferred in RUNTIME_WRITE_PATH_AUDIT_V1.
// LOCK: No shared executor coverage means no implicit canon write coverage.

export const CANON_WRITE_EXECUTION_POLICIES_V1 = {
  external_discovery_to_warehouse_bridge_v1: { transaction_mode: 'transactional_authoritative' },
  classification_apply_write_plan_v1: { transaction_mode: 'transactional_authoritative' },
  classification_apply_reclassification_result_v1: { transaction_mode: 'transactional_authoritative' },
  promotion_stage_create_stage_v1: { transaction_mode: 'transactional_authoritative' },
  alias_mapping_execution_v1: { transaction_mode: 'transactional_authoritative' },
  promotion_executor_execute_claimed_stage_v1: { transaction_mode: 'transactional_authoritative' },
  gv_id_assignment_worker_v1: { transaction_mode: 'compensated_non_transactional' },
  source_image_enrichment_worker_v1: { transaction_mode: 'transactional_authoritative' },
  promote_source_backed_justtcg_mapping_v1: { transaction_mode: 'compensated_non_transactional' },
  printing_upsert_v1: { transaction_mode: 'compensated_non_transactional' },
};

export class CanonWriteExecutionError extends Error {
  constructor(result) {
    super(`[contracts:${result.stage}] ${result.reason}`);
    this.name = 'CanonWriteExecutionError';
    this.result = result;
  }
}

function isPgTarget(target) {
  return Boolean(target && typeof target.query === 'function');
}

function createFailure({
  stage,
  failure_type,
  contract_name = null,
  reason,
  violation_id = null,
  quarantine_id = null,
}) {
  return {
    ok: false,
    stage,
    failure_type,
    ...(contract_name ? { contract_name } : {}),
    reason,
    ...(violation_id ? { violation_id } : {}),
    ...(quarantine_id ? { quarantine_id } : {}),
  };
}

function determineFailureStage(violationType) {
  switch (violationType) {
    case 'missing_contract_scope':
    case 'non_canon_scope_used_for_canon_write':
    case 'unknown_contract_name':
    case 'missing_runtime_enforcement_map':
    case 'unknown_checkpoint_name':
      return 'scope';
    default:
      return 'validation';
  }
}

function getCanonWriteExecutionPolicyV1(executionName) {
  return CANON_WRITE_EXECUTION_POLICIES_V1[executionName] ?? null;
}

export async function executeCanonWriteV1({
  execution_name,
  payload_snapshot = null,
  contract_assertions = [],
  proofs = [],
  actor_type = 'system_worker',
  actor_id = null,
  source_worker = null,
  source_api = null,
  source_system = null,
  ledger_target = null,
  audit_target = null,
  write_target = null,
  transaction_control = 'none',
  write,
}) {
  const scope = getContractScopeV1(execution_name);
  const validation = await validateWriteV1({
    execution_name,
    scope,
    payload_snapshot,
    contract_assertions,
  });

  if (!validation.ok) {
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

    return createFailure({
      stage: determineFailureStage(validation.violation_type),
      failure_type: validation.severity,
      contract_name: validation.contract_name,
      reason: validation.reason,
      violation_id: evidence.violation_id,
      quarantine_id: evidence.quarantine_id,
    });
  }

  const policy = getCanonWriteExecutionPolicyV1(execution_name);
  if (!policy) {
    const policyFailure = {
      ok: false,
      contract_name: 'GROOKAI_GUARDRAILS',
      violation_type: 'missing_canon_write_execution_policy',
      severity: 'hard_fail',
      reason: `${execution_name} has no registered canon write execution policy.`,
      payload_snapshot,
    };
    const evidence = await recordValidationFailureV1({
      validation: policyFailure,
      execution_name,
      actor_type,
      actor_id,
      source_worker,
      source_api,
      source_system,
      payload_snapshot,
      ledger_target,
    });
    return createFailure({
      stage: 'scope',
      failure_type: 'hard_fail',
      contract_name: policyFailure.contract_name,
      reason: policyFailure.reason,
      violation_id: evidence.violation_id,
    });
  }

  const resolvedWriteTarget = write_target ?? audit_target ?? ledger_target;
  const resolvedAuditTarget = audit_target ?? resolvedWriteTarget;
  const resolvedTransactionMode = policy.transaction_mode;
  const proofMode = getPostWriteProofModeV1(execution_name);

  if (typeof write !== 'function') {
    const writeFailure = {
      ok: false,
      contract_name: 'GROOKAI_GUARDRAILS',
      violation_type: 'missing_canon_write_executor',
      severity: 'hard_fail',
      reason: `${execution_name} did not provide a write executor.`,
      payload_snapshot,
    };
    const evidence = await recordValidationFailureV1({
      validation: writeFailure,
      execution_name,
      actor_type,
      actor_id,
      source_worker,
      source_api,
      source_system,
      payload_snapshot,
      ledger_target,
    });
    return createFailure({
      stage: 'write',
      failure_type: 'hard_fail',
      contract_name: writeFailure.contract_name,
      reason: writeFailure.reason,
      violation_id: evidence.violation_id,
    });
  }

  if (
    resolvedTransactionMode === 'transactional_authoritative' &&
    (transaction_control === 'managed' || transaction_control === 'external') &&
    !isPgTarget(resolvedWriteTarget)
  ) {
    const targetFailure = {
      ok: false,
      contract_name: 'GROOKAI_GUARDRAILS',
      violation_type: 'transactional_authoritative_requires_pg_target',
      severity: 'hard_fail',
      reason: `${execution_name} requires a pg query target for transactional authoritative execution.`,
      payload_snapshot,
    };
    const evidence = await recordValidationFailureV1({
      validation: targetFailure,
      execution_name,
      actor_type,
      actor_id,
      source_worker,
      source_api,
      source_system,
      payload_snapshot,
      ledger_target,
    });
    return createFailure({
      stage: 'write',
      failure_type: 'hard_fail',
      contract_name: targetFailure.contract_name,
      reason: targetFailure.reason,
      violation_id: evidence.violation_id,
    });
  }

  let beganTransaction = false;
  try {
    if (transaction_control === 'managed' && isPgTarget(resolvedWriteTarget)) {
      await resolvedWriteTarget.query('begin');
      beganTransaction = true;
    }

    await write(resolvedWriteTarget);

    const proofResult = await runPostWriteProofsV1({
      execution_name,
      proof_mode: proofMode,
      payload_snapshot,
      proofs,
      audit_target: resolvedAuditTarget,
      ledger_target,
      actor_type,
      actor_id,
      source_worker,
      source_api,
      source_system,
    });

    if (!proofResult.ok) {
      if (beganTransaction) {
        await resolvedWriteTarget.query('rollback');
        beganTransaction = false;
      }
      return proofResult;
    }

    if (beganTransaction) {
      await resolvedWriteTarget.query('commit');
      beganTransaction = false;
    }

    return { ok: true, proof_passed: true };
  } catch (error) {
    if (beganTransaction) {
      await resolvedWriteTarget.query('rollback');
    }

    const writeFailure = {
      ok: false,
      contract_name: 'GROOKAI_GUARDRAILS',
      violation_type: 'canon_write_execution_error',
      severity: 'hard_fail',
      reason:
        error instanceof Error
          ? `${execution_name} write stage failed: ${error.message}`
          : `${execution_name} write stage failed: ${String(error)}`,
      payload_snapshot,
    };
    const evidence = await recordValidationFailureV1({
      validation: writeFailure,
      execution_name,
      actor_type,
      actor_id,
      source_worker,
      source_api,
      source_system,
      payload_snapshot,
      ledger_target,
    });

    return createFailure({
      stage: 'write',
      failure_type: 'hard_fail',
      contract_name: writeFailure.contract_name,
      reason: writeFailure.reason,
      violation_id: evidence.violation_id,
    });
  }
}

export async function assertExecuteCanonWriteV1(args) {
  const result = await executeCanonWriteV1(args);
  if (!result.ok) {
    throw new CanonWriteExecutionError(result);
  }
  return result;
}

export { getCanonWriteExecutionPolicyV1 };
