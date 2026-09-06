import { createHash } from 'node:crypto';

import {
  MTG_SEALED_IMAGE_FUNCTIONS_V1,
  MTG_SEALED_IMAGE_INDEXES_V1,
  MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
  MTG_SEALED_IMAGE_MIGRATION_SHA256_V1,
  MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
  MTG_SEALED_IMAGE_POLICIES_V1,
  MTG_SEALED_IMAGE_TABLES_V1,
  MTG_SEALED_IMAGE_TRIGGERS_V1,
  reconcileMigrationLedgerVersionsV1,
  validateMtgSealedImageMigrationPreflightV1,
} from './mtg_sealed_image_migration_preflight_v1.mjs';
import {
  splitSealedMigrationStatementsV1,
  stripSealedMigrationTransactionWrapperV1,
} from './cross_tcg_sealed_product_schema_apply_v1.mjs';

export const MTG_SEALED_IMAGE_SCHEMA_APPLY_VERSION_V1 =
  'MTG_SEALED_IMAGE_SCHEMA_APPLY_READBACK_V1';
export const MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL_ENV_V1 =
  'MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL';
export const MTG_SEALED_IMAGE_SCHEMA_MIGRATION_NAME_V1 =
  'mtg_sealed_image_evidence_and_signing_authorization_v1';

export function stableMtgSealedImageSchemaJsonV1(value) {
  const stable = (entry) => {
    if (Array.isArray(entry)) return entry.map(stable);
    if (entry && typeof entry === 'object') {
      return Object.fromEntries(Object.keys(entry).sort()
        .map((key) => [key, stable(entry[key])]));
    }
    return entry;
  };
  return JSON.stringify(stable(value));
}

export function mtgSealedImageSchemaSha256V1(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function statementTable(statement) {
  return statement.match(/^create\s+table\s+public\.([a-z0-9_]+)/i)?.[1] ?? null;
}

export function buildMtgSealedImageSchemaInventoryV1(migrationSql) {
  const statements = splitSealedMigrationStatementsV1(migrationSql);
  const createTables = statements
    .map((statement) => ({ statement, table_name: statementTable(statement) }))
    .filter((entry) => entry.table_name);
  const tables = sortedUnique(createTables.map((entry) => entry.table_name));
  const constraints = [];

  for (const { statement, table_name } of createTables) {
    constraints.push({
      table_name,
      constraint_name: `${table_name}_pkey`,
      kind: 'p',
    });
    for (const match of statement.matchAll(/\bconstraint\s+([a-z0-9_]+)\s+/gi)) {
      constraints.push({
        table_name,
        constraint_name: match[1],
        kind: /\bforeign\s+key\b/i.test(statement.slice(match.index,
          statement.indexOf(',', match.index) === -1
            ? statement.length
            : statement.indexOf(',', match.index))) ? 'f' : null,
      });
    }
    for (const match of statement.matchAll(
      /^\s*([a-z][a-z0-9_]*)\s+[^,\r\n]*\breferences\s+public\./gmi,
    )) {
      constraints.push({
        table_name,
        constraint_name: `${table_name}_${match[1]}_fkey`,
        kind: 'f',
      });
    }
  }

  for (const statement of statements) {
    const match = statement.match(
      /^alter\s+table\s+public\.([a-z0-9_]+)[\s\S]*?add\s+constraint\s+([a-z0-9_]+)/i,
    );
    if (match) {
      constraints.push({
        table_name: match[1],
        constraint_name: match[2],
        kind: /\bunique\b/i.test(statement) ? 'u' : null,
      });
    }
  }

  const explicitIndexes = [...migrationSql.matchAll(
    /create\s+(?:unique\s+)?index\s+([a-z0-9_]+)\s+on\s+public\.([a-z0-9_]+)/gi,
  )].map((match) => ({ index_name: match[1], table_name: match[2] }));
  const constraintIndexes = constraints.filter((constraint) =>
    constraint.kind === 'p' || /_unique$/.test(constraint.constraint_name))
    .map((constraint) => ({
      index_name: constraint.constraint_name,
      table_name: constraint.table_name,
    }));

  const inventory = {
    tables,
    constraints: constraints
      .map(({ table_name, constraint_name }) => ({ table_name, constraint_name }))
      .sort((left, right) =>
        `${left.table_name}:${left.constraint_name}`.localeCompare(
          `${right.table_name}:${right.constraint_name}`)),
    indexes: [...explicitIndexes, ...constraintIndexes]
      .sort((left, right) => left.index_name.localeCompare(right.index_name)),
    functions: [...MTG_SEALED_IMAGE_FUNCTIONS_V1].sort(),
    triggers: [...MTG_SEALED_IMAGE_TRIGGERS_V1].sort(),
    policies: MTG_SEALED_IMAGE_TABLES_V1.map((table_name, index) => ({
      table_name,
      policy_name: MTG_SEALED_IMAGE_POLICIES_V1[index],
    })).sort((left, right) => left.table_name.localeCompare(right.table_name)),
  };
  if (stableMtgSealedImageSchemaJsonV1(tables) !==
      stableMtgSealedImageSchemaJsonV1([...MTG_SEALED_IMAGE_TABLES_V1].sort())) {
    throw new Error('Migration table inventory does not match the frozen package');
  }
  if (stableMtgSealedImageSchemaJsonV1(
    explicitIndexes.map((row) => row.index_name).sort()) !==
      stableMtgSealedImageSchemaJsonV1([...MTG_SEALED_IMAGE_INDEXES_V1].sort())) {
    throw new Error('Migration explicit-index inventory does not match the frozen package');
  }
  return inventory;
}

function preflightCore(preflight) {
  return {
    version: preflight.preflight_version,
    local: preflight.local,
    production: {
      api_project_ref: preflight.production.api_project_ref,
      database_project_ref: preflight.production.database_project_ref,
      roles: preflight.production.roles,
      missing_prerequisite_relations:
        preflight.production.missing_prerequisite_relations,
      missing_prerequisite_functions:
        preflight.production.missing_prerequisite_functions,
      collisions: preflight.production.collisions,
      migration_ledger_present: preflight.production.migration_ledger_present,
      migration_ledger_count: preflight.production.migration_ledger_count,
      migration_ledger_reconciliation:
        preflight.production.migration_ledger_reconciliation,
      data_boundaries: preflight.production.data_boundaries,
      before_fingerprint: preflight.production.before_fingerprint,
      after_fingerprint: preflight.production.after_fingerprint,
    },
    boundaries: preflight.boundaries,
  };
}

export function buildMtgSealedImageSchemaApplyPlanV1({
  migrationSql,
  preflight,
}) {
  const validation = validateMtgSealedImageMigrationPreflightV1(preflight);
  if (!validation.valid) {
    const failed = Object.entries(validation.checks)
      .filter(([, passed]) => !passed).map(([name]) => name);
    throw new Error(`Fresh production preflight is not valid: ${failed.join(',')}`);
  }
  const migrationSha256 = mtgSealedImageSchemaSha256V1(migrationSql);
  if (migrationSha256 !== MTG_SEALED_IMAGE_MIGRATION_SHA256_V1) {
    throw new Error(`Migration hash changed: ${migrationSha256}`);
  }
  const statements = splitSealedMigrationStatementsV1(migrationSql);
  const ledgerRow = {
    version: MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
    name: MTG_SEALED_IMAGE_SCHEMA_MIGRATION_NAME_V1,
    statements,
  };
  const inventory = buildMtgSealedImageSchemaInventoryV1(migrationSql);
  const core = {
    version: MTG_SEALED_IMAGE_SCHEMA_APPLY_VERSION_V1,
    producer_commit_sha: preflight.local.head_sha,
    migration: {
      version: MTG_SEALED_IMAGE_MIGRATION_VERSION_V1,
      filename: MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1,
      name: MTG_SEALED_IMAGE_SCHEMA_MIGRATION_NAME_V1,
      sha256: migrationSha256,
    },
    preflight_fingerprint_sha256: mtgSealedImageSchemaSha256V1(
      stableMtgSealedImageSchemaJsonV1(preflightCore(preflight))),
    ledger_fingerprint_sha256: mtgSealedImageSchemaSha256V1(
      stableMtgSealedImageSchemaJsonV1(ledgerRow)),
    ledger_statement_count: statements.length,
    inventory,
    baseline: preflight.production.data_boundaries,
    repository_migration_versions:
      preflight.local.repository_migration_versions,
    timeouts: {
      lock_timeout: '5s',
      statement_timeout: '180s',
      idle_in_transaction_session_timeout: '60s',
    },
    boundaries: {
      migration_ledger_rows: 1,
      schema_only: true,
      image_or_release_rows: 0,
      storage_operations: 0,
      pricing_operations: 0,
      visibility_changes: 0,
      vault_operations: 0,
      signer_deployments: 0,
      client_activations: 0,
    },
  };
  const applyPlanFingerprint = mtgSealedImageSchemaSha256V1(
    stableMtgSealedImageSchemaJsonV1(core));
  const requiredApprovalMessage =
    `I approve applying only production migration ` +
    `${MTG_SEALED_IMAGE_MIGRATION_FILENAME_V1} with SHA-256 ` +
    `${migrationSha256} from execution commit ${core.producer_commit_sha} ` +
    `using apply-plan fingerprint ${applyPlanFingerprint}. This authorizes ` +
    `one migration-ledger row and the schema-only objects in the frozen plan. ` +
    `It does not authorize signer deployment, Storage, image data, pricing, ` +
    `release-pointer, visibility, Vault, cross-game, or client writes.`;
  return {
    ...core,
    apply_plan_fingerprint_sha256: applyPlanFingerprint,
    approval_env: MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL_ENV_V1,
    required_approval_message: requiredApprovalMessage,
    guard_token: requiredApprovalMessage,
    ledger_row: ledgerRow,
  };
}

function compareExactRows(findings, actualRows, expectedRows, key, label) {
  const actual = sortedUnique((actualRows ?? []).map(key));
  const expected = sortedUnique(expectedRows.map(key));
  if (stableMtgSealedImageSchemaJsonV1(actual) !==
      stableMtgSealedImageSchemaJsonV1(expected)) {
    findings.push(`${label}_inventory_mismatch`);
  }
}

const FUNCTION_SECURITY = Object.freeze({
  'sealed_product_image_release_manifest_fingerprint_v1(uuid)': ['s', false],
  'sealed_product_assert_image_release_complete_v1(uuid)': ['s', false],
  'sealed_product_guard_image_evidence_insert_v1()': ['v', false],
  'sealed_product_guard_variant_image_assertion_insert_v1()': ['v', false],
  'sealed_product_guard_image_release_insert_v1()': ['v', false],
  'sealed_product_guard_image_release_mutation_v1()': ['v', false],
  'sealed_product_guard_image_release_member_insert_v1()': ['v', false],
  'sealed_product_freeze_image_release_v1(uuid,text,uuid)': ['v', true],
  'sealed_product_set_active_image_release_v1(uuid,uuid,uuid)': ['v', true],
  'mtg_sealed_image_object_signing_authorized_v1(text,text)': ['s', true],
});

export function evaluateMtgSealedImageSchemaReadbackV1({
  plan,
  readback,
  requireReadOnly = true,
  requireClosed = true,
}) {
  const findings = [];
  const inventory = plan.inventory;
  compareExactRows(findings, readback.tables, inventory.tables,
    (row) => typeof row === 'string' ? row : row.table_name, 'table');
  compareExactRows(findings, readback.constraints, inventory.constraints,
    (row) => `${row.table_name}:${row.constraint_name}`, 'constraint');
  compareExactRows(findings, readback.indexes, inventory.indexes,
    (row) => `${row.table_name}:${row.index_name}`, 'index');
  compareExactRows(findings, readback.functions, inventory.functions,
    (row) => typeof row === 'string' ? row : row.signature, 'function');
  compareExactRows(findings, readback.triggers, inventory.triggers,
    (row) => typeof row === 'string' ? row : row.trigger_name, 'trigger');
  compareExactRows(findings, readback.policies, inventory.policies,
    (row) => `${row.table_name}:${row.policy_name}`, 'policy');

  for (const table of readback.tables ?? []) {
    if (!table.rls_enabled) findings.push(`rls_not_enabled:${table.table_name}`);
    if (!table.rls_forced) findings.push(`rls_not_forced:${table.table_name}`);
    if (Number(table.row_count) !== 0) {
      findings.push(`schema_gate_wrote_data:${table.table_name}`);
    }
  }
  if ((readback.constraints ?? []).some((row) => !row.validated)) {
    findings.push('constraint_not_validated');
  }
  if ((readback.indexes ?? []).some((row) => !row.valid || !row.ready)) {
    findings.push('index_not_valid_or_ready');
  }
  for (const row of readback.functions ?? []) {
    const expected = FUNCTION_SECURITY[row.signature];
    if (!expected || row.volatility !== expected[0] ||
        row.security_definer !== expected[1]) {
      findings.push(`function_security_mismatch:${row.signature}`);
    }
    if (!(row.configuration ?? []).includes('search_path=pg_catalog, public')) {
      findings.push(`function_search_path_mismatch:${row.signature}`);
    }
  }
  for (const row of readback.policies ?? []) {
    if (row.command !== 'ALL' || !String(row.roles).includes('service_role') ||
        !/true/i.test(String(row.using_expression)) ||
        !/true/i.test(String(row.check_expression))) {
      findings.push(`policy_contract_mismatch:${row.policy_name}`);
    }
  }

  const expectedTableGrants = inventory.tables.flatMap((table) =>
    (table === 'sealed_product_image_release_pointer'
      ? ['SELECT'] : ['INSERT', 'SELECT'])
      .map((privilege) => `${table}:service_role:${privilege}`));
  compareExactRows(findings, readback.table_grants, expectedTableGrants,
    (row) => typeof row === 'string' ? row :
      `${row.table_name}:${row.grantee}:${row.privilege_type}`, 'table_grant');

  const expectedRoutineGrants = [
    'sealed_product_freeze_image_release_v1:service_role:EXECUTE',
    'sealed_product_set_active_image_release_v1:service_role:EXECUTE',
    'mtg_sealed_image_object_signing_authorized_v1:authenticated:EXECUTE',
    'mtg_sealed_image_object_signing_authorized_v1:service_role:EXECUTE',
  ];
  compareExactRows(findings, readback.routine_grants, expectedRoutineGrants,
    (row) => typeof row === 'string' ? row :
      `${row.routine_name}:${row.grantee}:${row.privilege_type}`,
    'routine_grant');
  if ((readback.app_table_privileges ?? []).some((row) => row.has_any_privilege)) {
    findings.push('app_role_has_image_table_privilege');
  }
  if (readback.signing_authorization?.authenticated_execute !== true ||
      readback.signing_authorization?.service_role_execute !== true ||
      readback.signing_authorization?.anon_execute !== false ||
      readback.signing_authorization?.empty_state_result !== false) {
    findings.push('signing_authorization_boundary_mismatch');
  }

  if ((readback.migration_ledger ?? []).length !== 1 ||
      readback.migration_ledger[0]?.version !== plan.migration.version ||
      readback.migration_ledger[0]?.name !== plan.migration.name ||
      Number(readback.migration_ledger[0]?.statement_count) !==
        Number(plan.ledger_statement_count) ||
      readback.migration_ledger[0]?.ledger_fingerprint_sha256 !==
        plan.ledger_fingerprint_sha256) {
    findings.push('migration_ledger_mismatch');
  }
  const reconciliation = reconcileMigrationLedgerVersionsV1(
    plan.repository_migration_versions,
    readback.all_migration_ledger ?? [],
    '__no_pending_target__',
  );
  if (reconciliation.missing_repository_versions_on_remote.length ||
      reconciliation.unexpected_remote_versions.length ||
      reconciliation.duplicate_remote_versions.length ||
      reconciliation.pending_repository_versions.length) {
    findings.push('migration_ledger_parity_mismatch');
  }
  if (stableMtgSealedImageSchemaJsonV1(readback.data_boundaries) !==
      stableMtgSealedImageSchemaJsonV1(plan.baseline)) {
    findings.push('protected_data_boundary_changed');
  }
  if (requireReadOnly && readback.transaction_read_only !== 'on') {
    findings.push('readback_not_read_only');
  }
  if (requireClosed && readback.transaction_closed_before_artifacts !== true) {
    findings.push('readback_transaction_not_closed');
  }
  return findings;
}

export { stripSealedMigrationTransactionWrapperV1 };
