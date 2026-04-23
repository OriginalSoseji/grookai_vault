import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { CONTRACT_EXECUTION_SCOPES_V1, assertContractScopeRegistryV1 } from '../../backend/lib/contracts/contract_scope_v1.mjs';
import { CANON_WRITE_EXECUTION_POLICIES_V1 } from '../../backend/lib/contracts/execute_canon_write_v1.mjs';
import { POST_WRITE_PROOF_MODES_V1 } from '../../backend/lib/contracts/run_post_write_proofs_v1.mjs';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

export const RUNTIME_WRITE_PATH_AUDIT_PATH_V1 = path.join(
  REPO_ROOT,
  'docs',
  'contracts',
  'RUNTIME_WRITE_PATH_AUDIT_V1.md',
);

export const RUNTIME_AUTOMATION_BOUNDARIES_V1 = {
  auto_run: [
    'contract_scope_validation',
    'pre_write_validation',
    'canon_write_executor',
    'post_write_proofs',
    'ownership_trust_proof_guards',
    'drift_audit',
    'runtime_scope_health_check',
    'runtime_coverage_sanity_check',
    'quarantine_visibility_reporting',
    'deferred_gap_visibility_reporting',
    'violation_logging',
    'quarantine_insertion',
  ],
  explicit_human_only: [
    'canon_promotion_from_ambiguity',
    'quarantine_promotion',
    'repair_actions_that_mutate_truth',
    'reconciliation_actions_needing_judgment',
    'bulk_canon_rewrite_jobs',
  ],
};

function parseTableCells(line) {
  return String(line)
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isSeparatorLine(line) {
  return /^\|\s*[-:]+(?:\s*\|\s*[-:]+)+\s*\|$/.test(String(line ?? '').trim());
}

function normalizeBooleanCell(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'yes') {
    return true;
  }
  if (normalized === 'no') {
    return false;
  }
  return null;
}

function normalizeHeading(line) {
  return String(line ?? '').replace(/^#+\s+/, '').trim();
}

function normalizeTextCell(value) {
  return String(value ?? '')
    .trim()
    .replace(/`([^`]+)`/g, '$1');
}

function normalizeRuntimeAuditRow(sectionName, row) {
  const surface_class =
    sectionName === 'Canon-Affecting Write Paths' ? 'canon' : 'ownership_trust';

  return {
    surface_class,
    path_name: normalizeTextCell(row.path_name),
    source_files: normalizeTextCell(row.source_files),
    canon_affecting: normalizeBooleanCell(row.canon_affecting),
    ownership_affecting: normalizeBooleanCell(row.ownership_affecting),
    public_trust_affecting: normalizeBooleanCell(row.public_trust_affecting),
    runtime_status: normalizeTextCell(row.runtime_status),
    transaction_mode: normalizeTextCell(row.transaction_mode),
    post_write_proof: normalizeBooleanCell(row.post_write_proof),
    risk_level: normalizeTextCell(row.risk_level),
    next_action: normalizeTextCell(row.next_action),
  };
}

export function parseRuntimeWritePathAuditMarkdownV1(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const rows = [];
  let currentHeading = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (line.startsWith('#')) {
      currentHeading = normalizeHeading(line);
      continue;
    }

    if (!line.startsWith('|')) {
      continue;
    }

    const headerCells = parseTableCells(line);
    if (!headerCells.includes('path_name')) {
      continue;
    }

    if (!isSeparatorLine(lines[index + 1] ?? '')) {
      continue;
    }

    index += 2;
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const rowLine = lines[index].trim();
      if (isSeparatorLine(rowLine)) {
        index += 1;
        continue;
      }

      const cells = parseTableCells(rowLine);
      const row = Object.fromEntries(
        headerCells.map((header, headerIndex) => [header, cells[headerIndex] ?? '']),
      );

      if (
        currentHeading === 'Canon-Affecting Write Paths' ||
        currentHeading === 'Ownership / Trust Mutation Paths'
      ) {
        rows.push(normalizeRuntimeAuditRow(currentHeading, row));
      }

      index += 1;
    }

    index -= 1;
  }

  return rows;
}

export async function loadRuntimeWritePathAuditRowsV1(
  auditPath = RUNTIME_WRITE_PATH_AUDIT_PATH_V1,
) {
  const markdown = await fs.readFile(auditPath, 'utf8');
  return parseRuntimeWritePathAuditMarkdownV1(markdown);
}

export function classifyDeferredRuntimeGapV1(row) {
  const runtimeStatus = String(row?.runtime_status ?? '').trim();
  const nextAction = String(row?.next_action ?? '').toLowerCase();

  if (runtimeStatus === 'intentionally blocked') {
    return 'should_be_blocked_from_use';
  }

  if (runtimeStatus === 'unknown') {
    return 'not_yet_audited';
  }

  if (runtimeStatus === 'contained_maintenance_authority') {
    return 'architecture_blocked';
  }

  if (runtimeStatus !== 'bypass') {
    return null;
  }

  if (
    /(architecture|maintenance scope|replay architecture|dedicated .*boundary|dedicated .*service|shared owner-write execution service|separate .*scope|separate .*architecture|needs a dedicated|needs a later .*sweep)/.test(
      nextAction,
    )
  ) {
    return 'architecture_blocked';
  }

  return 'intentionally_deferred';
}

function createHealthCheck(task_name, status, detail) {
  return {
    task_name,
    status,
    detail,
  };
}

export function summarizeRuntimeHealthV1({
  auditRows,
  scopeRegistry = CONTRACT_EXECUTION_SCOPES_V1,
  executionPolicies = CANON_WRITE_EXECUTION_POLICIES_V1,
  proofModes = POST_WRITE_PROOF_MODES_V1,
  scopeRegistryPassed = true,
  scopeRegistryError = null,
}) {
  const checks = [];
  const enforcedCanonRows = auditRows.filter(
    (row) => row.canon_affecting === true && row.runtime_status === 'enforced',
  );
  const enforcedCanonByName = new Map(
    enforcedCanonRows.map((row) => [row.path_name, row]),
  );
  const deferredGapReport = buildDeferredRuntimeGapReportV1(auditRows);

  if (scopeRegistryPassed) {
    checks.push(
      createHealthCheck(
        'contract_scope_registry',
        'pass',
        'Runtime scopes resolve authoritative contract names and known checkpoints.',
      ),
    );
  } else {
    checks.push(
      createHealthCheck(
        'contract_scope_registry',
        'fail',
        scopeRegistryError ?? 'Contract scope registry failed validation.',
      ),
    );
  }

  for (const row of enforcedCanonRows) {
    if (!scopeRegistry[row.path_name]) {
      checks.push(
        createHealthCheck(
          'enforced_canon_scope_coverage',
          'fail',
          `${row.path_name} is marked enforced in the audit but has no contract scope.`,
        ),
      );
    }
    if (!executionPolicies[row.path_name]) {
      checks.push(
        createHealthCheck(
          'enforced_canon_execution_policy',
          'fail',
          `${row.path_name} is marked enforced in the audit but has no canon write execution policy.`,
        ),
      );
    }
    if (!proofModes[row.path_name]) {
      checks.push(
        createHealthCheck(
          'enforced_canon_proof_mode',
          'fail',
          `${row.path_name} is marked enforced in the audit but has no post-write proof mode.`,
        ),
      );
    }
    if (
      executionPolicies[row.path_name]?.transaction_mode &&
      row.transaction_mode &&
      executionPolicies[row.path_name].transaction_mode !== row.transaction_mode
    ) {
      checks.push(
        createHealthCheck(
          'enforced_canon_transaction_mode_alignment',
          'fail',
          `${row.path_name} disagrees between audit (${row.transaction_mode}) and executor policy (${executionPolicies[row.path_name].transaction_mode}).`,
        ),
      );
    }
    if (row.post_write_proof !== true) {
      checks.push(
        createHealthCheck(
          'enforced_canon_post_write_proof',
          'fail',
          `${row.path_name} is marked enforced but the audit does not mark post_write_proof=yes.`,
        ),
      );
    }
  }

  for (const executionName of Object.keys(scopeRegistry)) {
    if (!enforcedCanonByName.has(executionName)) {
      checks.push(
        createHealthCheck(
          'scope_audit_alignment',
          'fail',
          `${executionName} exists in runtime scope registry but is not classified as enforced canon coverage in the audit.`,
        ),
      );
    }
  }

  for (const executionName of Object.keys(executionPolicies)) {
    if (!enforcedCanonByName.has(executionName)) {
      checks.push(
        createHealthCheck(
          'execution_policy_audit_alignment',
          'fail',
          `${executionName} has a canon write policy but is not classified as enforced canon coverage in the audit.`,
        ),
      );
    }
  }

  for (const executionName of Object.keys(proofModes)) {
    if (!enforcedCanonByName.has(executionName)) {
      checks.push(
        createHealthCheck(
          'proof_mode_audit_alignment',
          'fail',
          `${executionName} has a proof mode but is not classified as enforced canon coverage in the audit.`,
        ),
      );
    }
  }

  for (const row of auditRows.filter((entry) => entry.runtime_status === 'unknown')) {
    checks.push(
      createHealthCheck(
        'unknown_runtime_status',
        'fail',
        `${row.path_name} is still classified as unknown and therefore does not meet coverage-accountable requirements.`,
      ),
    );
  }

  for (const row of auditRows.filter(
    (entry) => entry.surface_class === 'ownership_trust' && entry.runtime_status === 'partial',
  )) {
    if (row.post_write_proof !== true) {
      checks.push(
        createHealthCheck(
          'ownership_partial_missing_proof',
          'fail',
          `${row.path_name} is marked partial but does not advertise post_write_proof=yes in the audit.`,
        ),
      );
    }
  }

  for (const row of auditRows.filter((entry) =>
    ['bypass', 'unknown', 'intentionally blocked', 'contained_maintenance_authority'].includes(entry.runtime_status),
  )) {
    const blockerType = classifyDeferredRuntimeGapV1(row);
    if (!blockerType) {
      checks.push(
        createHealthCheck(
          'deferred_gap_classification',
          'fail',
          `${row.path_name} has no deterministic deferred-gap classification.`,
        ),
      );
    }
  }

  if (checks.every((check) => check.status !== 'fail')) {
    checks.push(
      createHealthCheck(
        'runtime_coverage_sanity',
        'pass',
        'Runtime audit, scope registry, execution policies, and proof modes agree for enforced canon paths.',
      ),
    );
  }

  const failedChecks = checks.filter((check) => check.status === 'fail');
  return {
    ok: failedChecks.length === 0,
    summary: {
      total_checks: checks.length,
      failed_checks: failedChecks.length,
      deferred_gap_count: deferredGapReport.summary.total,
    },
    checks,
    deferred_gap_report: deferredGapReport,
  };
}

export async function runRuntimeHealthChecksV1(
  auditPath = RUNTIME_WRITE_PATH_AUDIT_PATH_V1,
) {
  const auditRows = await loadRuntimeWritePathAuditRowsV1(auditPath);
  let scopeRegistryPassed = true;
  let scopeRegistryError = null;

  try {
    await assertContractScopeRegistryV1();
  } catch (error) {
    scopeRegistryPassed = false;
    scopeRegistryError = error instanceof Error ? error.message : String(error);
  }

  return summarizeRuntimeHealthV1({
    auditRows,
    scopeRegistryPassed,
    scopeRegistryError,
  });
}

export function bucketQuarantineAgeV1(
  createdAt,
  now = new Date(),
) {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) {
    return 'unknown';
  }

  const ageMs = Math.max(0, now.getTime() - createdMs);
  const dayMs = 24 * 60 * 60 * 1000;

  if (ageMs < 2 * dayMs) {
    return '0-1 days';
  }
  if (ageMs < 8 * dayMs) {
    return '2-7 days';
  }
  if (ageMs < 30 * dayMs) {
    return '8-30 days';
  }
  return '30+ days';
}

function groupCountBy(rows, keyBuilder) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyBuilder(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, unresolved_count]) => ({
      key,
      unresolved_count,
    }))
    .sort((left, right) => {
      if (right.unresolved_count !== left.unresolved_count) {
        return right.unresolved_count - left.unresolved_count;
      }
      return left.key.localeCompare(right.key);
    });
}

export function buildQuarantineVisibilityReportV1(
  rows,
  {
    now = new Date(),
    stale_threshold_days = 30,
    oldest_limit = 10,
  } = {},
) {
  const unresolvedRows = (rows ?? [])
    .filter((row) => !row.resolved_at)
    .map((row) => ({
      ...row,
      age_bucket: bucketQuarantineAgeV1(row.created_at, now),
    }))
    .sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
    );

  const staleThresholdMs = stale_threshold_days * 24 * 60 * 60 * 1000;
  const staleRows = unresolvedRows.filter((row) => {
    const createdMs = new Date(row.created_at).getTime();
    return Number.isFinite(createdMs) && now.getTime() - createdMs >= staleThresholdMs;
  });

  const by_reason = groupCountBy(
    unresolvedRows,
    (row) => String(row.quarantine_reason ?? '').trim() || 'unknown',
  ).map((row) => ({
    reason: row.key,
    unresolved_count: row.unresolved_count,
  }));

  const by_contract = groupCountBy(
    unresolvedRows,
    (row) => String(row.contract_name ?? '').trim() || 'unknown',
  ).map((row) => ({
    contract_name: row.key,
    unresolved_count: row.unresolved_count,
  }));

  const by_source = groupCountBy(
    unresolvedRows,
    (row) => String(row.source_system ?? '').trim() || 'unknown',
  ).map((row) => ({
    source_system: row.key,
    unresolved_count: row.unresolved_count,
  }));

  const ageBucketOrder = new Map([
    ['0-1 days', 0],
    ['2-7 days', 1],
    ['8-30 days', 2],
    ['30+ days', 3],
    ['unknown', 4],
  ]);

  const by_age_bucket = groupCountBy(unresolvedRows, (row) => row.age_bucket)
    .map((row) => ({
      age_bucket: row.key,
      unresolved_count: row.unresolved_count,
    }))
    .sort(
      (left, right) =>
        (ageBucketOrder.get(left.age_bucket) ?? Number.MAX_SAFE_INTEGER) -
        (ageBucketOrder.get(right.age_bucket) ?? Number.MAX_SAFE_INTEGER),
    );

  return {
    summary: {
      unresolved_count: unresolvedRows.length,
      stale_threshold_days,
      stale_unresolved_count: staleRows.length,
    },
    by_reason,
    by_contract,
    by_source,
    by_age_bucket,
    oldest_unresolved: unresolvedRows.slice(0, oldest_limit).map((row) => ({
      id: row.id,
      source_system: row.source_system,
      execution_name: row.execution_name,
      contract_name: row.contract_name,
      quarantine_reason: row.quarantine_reason,
      created_at: row.created_at,
      age_bucket: row.age_bucket,
    })),
  };
}

export async function runQuarantineVisibilityReportV1(
  connectionString = process.env.SUPABASE_DB_URL,
  options = {},
) {
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(`
      select
        id,
        source_system,
        execution_name,
        contract_name,
        quarantine_reason,
        created_at,
        resolved_at
      from public.quarantine_records
      where resolved_at is null
      order by created_at asc, id asc
    `);
    return buildQuarantineVisibilityReportV1(rows, options);
  } finally {
    await client.end();
  }
}

export function buildDeferredRuntimeGapReportV1(rows) {
  const gapRows = (rows ?? [])
    .filter((row) =>
      ['bypass', 'unknown', 'intentionally blocked', 'contained_maintenance_authority'].includes(row.runtime_status),
    )
    .map((row) => ({
      ...row,
      blocker_type: classifyDeferredRuntimeGapV1(row),
      reason: row.next_action,
    }));

  return {
    summary: {
      total: gapRows.length,
      canon_affecting: gapRows.filter((row) => row.canon_affecting === true).length,
      ownership_or_trust_affecting: gapRows.filter(
        (row) =>
          row.ownership_affecting === true || row.public_trust_affecting === true,
      ).length,
      intentionally_deferred: gapRows.filter(
        (row) => row.blocker_type === 'intentionally_deferred',
      ).length,
      architecture_blocked: gapRows.filter(
        (row) => row.blocker_type === 'architecture_blocked',
      ).length,
      not_yet_audited: gapRows.filter(
        (row) => row.blocker_type === 'not_yet_audited',
      ).length,
      should_be_blocked_from_use: gapRows.filter(
        (row) => row.blocker_type === 'should_be_blocked_from_use',
      ).length,
    },
    canon_paths: gapRows.filter((row) => row.canon_affecting === true),
    ownership_trust_paths: gapRows.filter(
      (row) =>
        row.ownership_affecting === true || row.public_trust_affecting === true,
    ),
    gaps: gapRows,
  };
}

export async function runDeferredRuntimeGapReportV1(
  auditPath = RUNTIME_WRITE_PATH_AUDIT_PATH_V1,
) {
  const rows = await loadRuntimeWritePathAuditRowsV1(auditPath);
  return buildDeferredRuntimeGapReportV1(rows);
}

export function summarizeAutomationPreflightV1({
  driftAudit,
  runtimeHealth,
}) {
  const criticalDriftCount = Number(
    driftAudit?.summary?.critical_fail_checks ?? 0,
  );
  const deferredDriftCount = Number(
    driftAudit?.summary?.known_deferred_debt_checks ?? 0,
  );
  const runtimeFailureCount = Number(
    runtimeHealth?.summary?.failed_checks ?? 0,
  );
  const deferredGapCount = Number(
    runtimeHealth?.summary?.deferred_gap_count ?? 0,
  );

  const status =
    criticalDriftCount > 0 || runtimeFailureCount > 0
      ? 'FAIL'
      : deferredDriftCount > 0 || deferredGapCount > 0
        ? 'PASS_WITH_DEFERRED_DEBT'
        : 'PASS';

  return {
    status,
    summary: {
      critical_fail_checks: criticalDriftCount + runtimeFailureCount,
      known_deferred_debt_checks: deferredDriftCount + deferredGapCount,
    },
    drift_audit: driftAudit,
    runtime_health: runtimeHealth,
  };
}
