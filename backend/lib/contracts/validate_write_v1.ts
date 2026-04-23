export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      contract_name: string;
      violation_type: string;
      severity: 'hard_fail' | 'quarantine';
      reason: string;
      payload_snapshot: unknown;
    };

export {
  ContractRuntimeViolationError,
  stableStringifyV1,
  buildPayloadHashV1,
  validateWriteV1,
  recordValidationFailureV1,
  assertValidContractWriteV1,
  runPostWriteAuditV1,
} from './validate_write_v1.mjs';
