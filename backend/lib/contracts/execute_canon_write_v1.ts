export type CanonWriteExecutionResult =
  | { ok: true; proof_passed: true }
  | {
      ok: false;
      stage: 'scope' | 'validation' | 'write' | 'post_write_proof';
      failure_type: 'hard_fail' | 'quarantine';
      contract_name?: string;
      reason: string;
      violation_id?: string;
      quarantine_id?: string;
    };

export {
  CANON_WRITE_EXECUTION_POLICIES_V1,
  CanonWriteExecutionError,
  executeCanonWriteV1,
  assertExecuteCanonWriteV1,
  getCanonWriteExecutionPolicyV1,
} from './execute_canon_write_v1.mjs';
