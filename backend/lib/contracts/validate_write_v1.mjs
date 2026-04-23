import crypto from 'node:crypto';

import { createBackendClient } from '../../supabase_backend_client.mjs';
import {
  loadAuthoritativeContractIndexMapV1,
  loadCheckpointNameSetV1,
} from './contract_index_v1.mjs';
import { getContractScopeV1 } from './contract_scope_v1.mjs';
import { insertQuarantine } from './quarantine_service_v1.mjs';
import {
  CONTRACT_RUNTIME_CATALOG_V1,
  getContractPrecedenceRankV1,
} from './runtime_contract_catalog_v1.mjs';

// LOCK: Runtime may block or quarantine canon writes, but it may not invent canon authority.
// LOCK: Quarantine preserves evidence; it never authorizes canonical truth.

const LEDGER_TABLES = new Set(['contract_violations', 'quarantine_records']);
let defaultLedgerTarget = null;

function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function isPgTarget(target) {
  return Boolean(target && typeof target.query === 'function');
}

function isSupabaseTarget(target) {
  return Boolean(target && typeof target.from === 'function');
}

async function getLedgerTargetV1(explicitTarget = null) {
  if (explicitTarget) {
    return explicitTarget;
  }
  if (!defaultLedgerTarget) {
    defaultLedgerTarget = createBackendClient();
  }
  return defaultLedgerTarget;
}

function insertSqlForTable(tableName, row) {
  if (!LEDGER_TABLES.has(tableName)) {
    throw new Error(`[contracts] unsupported ledger table ${tableName}`);
  }
  const columns = Object.keys(row);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  return {
    sql: `insert into public.${tableName} (${columns.join(', ')}) values (${placeholders.join(', ')})`,
    params: columns.map((column) => row[column]),
  };
}

async function insertLedgerRowV1(target, tableName, row) {
  const resolvedTarget = await getLedgerTargetV1(target);
  if (isPgTarget(resolvedTarget)) {
    const statement = insertSqlForTable(tableName, row);
    const { rows } = await resolvedTarget.query(`${statement.sql} returning id`, statement.params);
    return rows[0] ?? null;
  }
  if (isSupabaseTarget(resolvedTarget)) {
    const { data, error } = await resolvedTarget.from(tableName).insert(row).select('id').single();
    if (error) {
      throw new Error(`[contracts] ${tableName} insert failed: ${error.message}`);
    }
    return data ?? null;
  }
  throw new Error('[contracts] unsupported ledger target');
}

function compareFailures(left, right) {
  const leftRank = getContractPrecedenceRankV1(left.contract_name);
  const rightRank = getContractPrecedenceRankV1(right.contract_name);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  if (left.severity !== right.severity) {
    return left.severity === 'hard_fail' ? -1 : 1;
  }
  return left.contract_name.localeCompare(right.contract_name);
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

function normalizeAssertion(assertion, payloadSnapshot) {
  if (!assertion || assertion.ok !== false) {
    return null;
  }
  return createFailure({
    contract_name: normalizeTextOrNull(assertion.contract_name) ?? 'GROOKAI_GUARDRAILS',
    violation_type: normalizeTextOrNull(assertion.violation_type) ?? 'contract_assertion_failed',
    severity: assertion.severity === 'quarantine' ? 'quarantine' : 'hard_fail',
    reason: normalizeTextOrNull(assertion.reason) ?? 'Contract assertion failed.',
    payload_snapshot:
      assertion.payload_snapshot === undefined ? payloadSnapshot ?? null : assertion.payload_snapshot,
  });
}

/**
 * @typedef {(
 *   | { ok: true }
 *   | {
 *       ok: false;
 *       contract_name: string;
 *       violation_type: string;
 *       severity: 'hard_fail' | 'quarantine';
 *       reason: string;
 *       payload_snapshot: unknown;
 *     }
 * )} ValidationResult
 */

export class ContractRuntimeViolationError extends Error {
  constructor(validation) {
    super(`[contracts:${validation.contract_name}] ${validation.violation_type}: ${validation.reason}`);
    this.name = 'ContractRuntimeViolationError';
    this.validation = validation;
  }
}

export function stableStringifyV1(value) {
  return JSON.stringify(canonicalizeJson(value ?? null));
}

export function buildPayloadHashV1(value) {
  return crypto.createHash('sha256').update(stableStringifyV1(value)).digest('hex');
}

export async function validateWriteV1({
  execution_name,
  scope = null,
  payload_snapshot = null,
  contract_assertions = [],
}) {
  const resolvedScope = scope ?? getContractScopeV1(execution_name);
  if (!resolvedScope) {
    return createFailure({
      contract_name: 'GROOKAI_GUARDRAILS',
      violation_type: 'missing_contract_scope',
      reason: `No contract scope is registered for ${execution_name}.`,
      payload_snapshot,
    });
  }

  if (resolvedScope.canon_affecting !== true) {
    return createFailure({
      contract_name: 'GROOKAI_GUARDRAILS',
      violation_type: 'non_canon_scope_used_for_canon_write',
      reason: `Contract scope ${resolvedScope.execution_name} is not marked canon_affecting.`,
      payload_snapshot,
    });
  }

  const authoritativeContracts = await loadAuthoritativeContractIndexMapV1();
  const checkpoints = await loadCheckpointNameSetV1();
  const failures = [];

  for (const contractName of resolvedScope.active_contracts) {
    if (!authoritativeContracts.has(contractName)) {
      failures.push(
        createFailure({
          contract_name: 'GROOKAI_GUARDRAILS',
          violation_type: 'unknown_contract_name',
          reason: `${execution_name} declared non-authoritative contract ${contractName}.`,
          payload_snapshot,
        }),
      );
      continue;
    }
    if (!CONTRACT_RUNTIME_CATALOG_V1[contractName]) {
      failures.push(
        createFailure({
          contract_name: 'GROOKAI_GUARDRAILS',
          violation_type: 'missing_runtime_enforcement_map',
          reason: `${execution_name} declared ${contractName}, but runtime has no enforcement map entry.`,
          payload_snapshot,
        }),
      );
    }
  }

  for (const checkpointName of resolvedScope.checkpoints) {
    if (!checkpoints.has(checkpointName)) {
      failures.push(
        createFailure({
          contract_name: 'GROOKAI_GUARDRAILS',
          violation_type: 'unknown_checkpoint_name',
          reason: `${execution_name} declared unknown checkpoint ${checkpointName}.`,
          payload_snapshot,
        }),
      );
    }
  }

  for (const assertion of contract_assertions) {
    const normalized = normalizeAssertion(assertion, payload_snapshot);
    if (!normalized) {
      continue;
    }
    if (!authoritativeContracts.has(normalized.contract_name)) {
      failures.push(
        createFailure({
          contract_name: 'GROOKAI_GUARDRAILS',
          violation_type: 'unknown_assertion_contract',
          reason: `${execution_name} emitted an assertion for non-authoritative contract ${normalized.contract_name}.`,
          payload_snapshot,
        }),
      );
      continue;
    }
    if (!resolvedScope.active_contracts.includes(normalized.contract_name)) {
      failures.push(
        createFailure({
          contract_name: 'GROOKAI_GUARDRAILS',
          violation_type: 'assertion_contract_outside_scope',
          reason: `${execution_name} emitted an assertion for ${normalized.contract_name}, but that contract is not in scope.`,
          payload_snapshot,
        }),
      );
      continue;
    }
    failures.push(normalized);
  }

  if (failures.length === 0) {
    return { ok: true };
  }

  failures.sort(compareFailures);
  return failures[0];
}

export async function recordValidationFailureV1({
  validation,
  execution_name,
  actor_type,
  actor_id = null,
  source_worker = null,
  source_api = null,
  source_system = null,
  payload_snapshot = null,
  ledger_target = null,
}) {
  if (!validation || validation.ok !== false) {
    return {
      violation_id: null,
      quarantine_id: null,
    };
  }

  const effectivePayload =
    validation.payload_snapshot === undefined ? payload_snapshot ?? null : validation.payload_snapshot;
  const payloadHash = buildPayloadHashV1(effectivePayload);

  const violationRow = await insertLedgerRowV1(ledger_target, 'contract_violations', {
    contract_name: validation.contract_name,
    violation_type: validation.violation_type,
    severity: validation.severity,
    execution_name,
    actor_type,
    actor_id,
    source_worker,
    source_api,
    source_payload_hash: payloadHash,
    payload_snapshot: effectivePayload,
    reason: validation.reason,
  });

  let quarantineRow = null;
  if (validation.severity === 'quarantine') {
    quarantineRow = await insertQuarantine({
      target: ledger_target,
      source_system: normalizeTextOrNull(source_system) ?? normalizeTextOrNull(source_worker) ?? execution_name,
      execution_name,
      contract_name: validation.contract_name,
      quarantine_reason: validation.reason,
      source_payload_hash: payloadHash,
      payload_snapshot: effectivePayload,
      canonical_write_blocked: true,
    });
  }

  return {
    violation_id: normalizeTextOrNull(violationRow?.id),
    quarantine_id: normalizeTextOrNull(quarantineRow?.id),
  };
}

export async function assertValidContractWriteV1({
  execution_name,
  scope = null,
  payload_snapshot = null,
  contract_assertions = [],
  actor_type = 'system_worker',
  actor_id = null,
  source_worker = null,
  source_api = null,
  source_system = null,
  ledger_target = null,
}) {
  const validation = await validateWriteV1({
    execution_name,
    scope,
    payload_snapshot,
    contract_assertions,
  });

  if (validation.ok) {
    return validation;
  }

  await recordValidationFailureV1({
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
  throw new ContractRuntimeViolationError(validation);
}

export async function runPostWriteAuditV1({
  execution_name,
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
  for (const proof of proofs) {
    let result;
    if (typeof proof.run === 'function') {
      result = await proof.run(audit_target);
    } else if (proof.query && audit_target && typeof audit_target.query === 'function') {
      const queryResult = await audit_target.query(proof.query, proof.params ?? []);
      result = typeof proof.evaluate === 'function' ? await proof.evaluate(queryResult) : { ok: true };
    } else {
      throw new Error(`[contracts] invalid proof for ${execution_name}`);
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

    await recordValidationFailureV1({
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
    throw new ContractRuntimeViolationError(validation);
  }
}
