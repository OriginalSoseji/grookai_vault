import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

const { Client } = pg;

export const SCHEMA_HISTORY_PREFLIGHT_VERSION =
  'JPN-MASTER-INDEX-SCHEMA-HISTORY-PREFLIGHT-V1';
export const MIGRATION_VERSION = '20260805100000';
export const MIGRATION_PATH =
  'supabase/migrations/'
  + '20260805100000_master_identity_graph_jpn_review_surfaces_'
  + 'schema_repair_v1.sql';

const DEFAULT_LOCAL_URL =
  'postgresql://postgres:postgres@127.0.0.1:54330/postgres';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/schema_history_preflight_v1';
const TABLES = [
  'card_print_family_review_queue',
  'card_print_identity_source_evidence',
];

function parseArgs(argv) {
  const options = {
    envFile: null,
    localUrl: DEFAULT_LOCAL_URL,
    outputRoot: DEFAULT_OUTPUT_ROOT,
  };
  for (const argument of argv) {
    if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length);
    } else if (argument.startsWith('--local-url=')) {
      options.localUrl = argument.slice('--local-url='.length);
    } else if (argument.startsWith('--output-root=')) {
      options.outputRoot = argument.slice('--output-root='.length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return options;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function queryRows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

export async function captureReviewSchemaContract(client) {
  const values = [TABLES];
  const tables = await queryRows(client, `
      select
        c.relname as table_name,
        pg_get_userbyid(c.relowner) as owner,
        c.relrowsecurity,
        c.relforcerowsecurity,
        obj_description(c.oid, 'pg_class') as comment
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
      order by c.relname
    `, values);
  const columns = await queryRows(client, `
      select
        table_name,
        ordinal_position,
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name, ordinal_position
    `, values);
  const constraints = await queryRows(client, `
      select
        c.relname as table_name,
        con.conname as constraint_name,
        con.contype as constraint_type,
        con.convalidated,
        pg_get_constraintdef(con.oid, true) as definition
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
      order by c.relname, con.conname
    `, values);
  const indexes = await queryRows(client, `
      select
        tablename as table_name,
        indexname as index_name,
        indexdef as definition
      from pg_indexes
      where schemaname = 'public'
        and tablename = any($1::text[])
      order by tablename, indexname
    `, values);
  const functions = await queryRows(client, `
      select
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as result_type,
        l.lanname as language,
        p.provolatile as volatility,
        p.prosecdef as security_definer,
        coalesce(p.proconfig, array[]::text[]) as configuration,
        p.prosrc as source
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
      where n.nspname = 'public'
        and p.proname =
          'set_master_identity_graph_jpn_review_tables_updated_at_v1'
      order by p.proname, arguments
    `);
  const triggers = await queryRows(client, `
      select
        c.relname as table_name,
        t.tgname as trigger_name,
        pg_get_triggerdef(t.oid, true) as definition
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
        and not t.tgisinternal
      order by c.relname, t.tgname
    `, values);
  const policies = await queryRows(client, `
      select
        tablename as table_name,
        policyname as policy_name,
        permissive,
        roles::text,
        cmd,
        qual,
        with_check
      from pg_policies
      where schemaname = 'public'
        and tablename = any($1::text[])
      order by tablename, policyname
    `, values);
  const grants = await queryRows(client, `
      select
        table_name,
        grantee,
        privilege_type,
        is_grantable
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = any($1::text[])
        and grantee = any(
          array['PUBLIC', 'anon', 'authenticated', 'service_role']
        )
      order by table_name, grantee, privilege_type
    `, values);
  return {
    tables,
    columns,
    constraints,
    indexes,
    functions,
    triggers,
    policies,
    grants,
  };
}

async function captureDatabase(connectionString, applicationName) {
  const client = new Client({
    connectionString,
    application_name: applicationName,
    connectionTimeoutMillis: 30_000,
  });
  await client.connect();
  try {
    await client.query('begin read only');
    const readOnly = (
      await client.query('show transaction_read_only')
    ).rows[0].transaction_read_only;
    if (readOnly !== 'on') {
      throw new Error(`${applicationName} is not read-only.`);
    }
    const [ledger, contract] = await Promise.all([
      queryRows(client, `
        select version, name
        from supabase_migrations.schema_migrations
        where version = $1
        order by version
      `, [MIGRATION_VERSION]),
      captureReviewSchemaContract(client),
    ]);
    await client.query('rollback');
    return {
      transaction_read_only: readOnly,
      migration_ledger: ledger,
      contract,
      contract_fingerprint_sha256: contentFingerprint(contract),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function validateContract(contract) {
  const findings = [];
  if (contract.tables.length !== 2) findings.push('table_count_mismatch');
  if (contract.columns.length !== 27) findings.push('column_count_mismatch');
  if (contract.constraints.length !== 11) {
    findings.push('constraint_count_mismatch');
  }
  if (contract.indexes.length !== 10) findings.push('index_count_mismatch');
  if (contract.functions.length !== 1) findings.push('function_count_mismatch');
  if (contract.triggers.length !== 2) findings.push('trigger_count_mismatch');
  if (contract.policies.length !== 4) findings.push('policy_count_mismatch');
  if (contract.grants.length !== 6) findings.push('grant_count_mismatch');
  if (contract.tables.some((row) => !row.relrowsecurity)) {
    findings.push('rls_not_enabled');
  }
  if (contract.policies.some(
    (row) => row.cmd !== 'ALL'
      || row.qual !== 'false'
      || row.with_check !== 'false',
  )) {
    findings.push('policy_not_fail_closed');
  }
  if (contract.grants.some(
    (row) => row.grantee !== 'service_role'
      || !['INSERT', 'SELECT', 'UPDATE'].includes(row.privilege_type),
  )) {
    findings.push('unexpected_client_or_mutation_grant');
  }
  if (
    contract.functions[0]?.configuration?.includes(
      'search_path=pg_catalog',
    ) !== true
  ) {
    findings.push('function_search_path_not_hardened');
  }
  return findings;
}

function markdown(report) {
  return `# Japanese V4 Schema History Preflight V1

Generated: ${report.generated_at}

## Result

- Status: \`${report.status}\`
- Migration version: \`${report.migration.version}\`
- Migration SHA-256: \`${report.migration.sha256}\`
- Local ledger rows: ${report.local.migration_ledger.length}
- Production ledger rows: ${report.production.migration_ledger.length}
- Local contract fingerprint: \`${report.local.contract_fingerprint_sha256}\`
- Production contract fingerprint: \`${report.production.contract_fingerprint_sha256}\`
- Contracts equivalent: ${report.contracts_equivalent}
- Findings: ${report.findings.length}

## Boundary

Both databases were inspected inside read-only transactions. No schema,
migration-history, table-row, Storage, pricing, identity, vault, image, or
public visibility writes occurred.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.envFile) {
    dotenv.config({ path: options.envFile, quiet: true });
  }
  dotenv.config({ quiet: true });
  const productionUrl = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
  if (!productionUrl) throw new Error('Production database URL is missing.');

  const migrationBuffer = await fs.readFile(MIGRATION_PATH);
  const [local, production] = await Promise.all([
    captureDatabase(options.localUrl, 'jpn_v4_schema_local_read_only'),
    captureDatabase(productionUrl, 'jpn_v4_schema_production_read_only'),
  ]);
  const localFindings = validateContract(local.contract)
    .map((finding) => `local:${finding}`);
  const productionFindings = validateContract(production.contract)
    .map((finding) => `production:${finding}`);
  const contractsEquivalent =
    local.contract_fingerprint_sha256
    === production.contract_fingerprint_sha256;
  const findings = [...localFindings, ...productionFindings];
  if (!contractsEquivalent) findings.push('local_production_contract_drift');
  if (local.migration_ledger.length !== 1) {
    findings.push('local_migration_history_missing');
  }
  if (production.migration_ledger.length > 1) {
    findings.push('production_migration_history_duplicate');
  }
  const status = findings.length > 0
    ? 'blocked_by_schema_or_history_drift'
    : production.migration_ledger.length === 0
      ? 'schema_equivalent_production_migration_pending'
      : 'schema_and_history_equivalent';
  const report = {
    generated_at: new Date().toISOString(),
    generator_version: SCHEMA_HISTORY_PREFLIGHT_VERSION,
    status,
    migration: {
      version: MIGRATION_VERSION,
      path: MIGRATION_PATH,
      sha256: sha256(migrationBuffer),
      bytes: migrationBuffer.length,
    },
    contracts_equivalent: contractsEquivalent,
    findings,
    local,
    production,
    execution_boundary: {
      local_database_reads: true,
      production_database_reads: true,
      transactions_read_only: true,
      database_writes: false,
      migration_history_writes: false,
      storage_writes: false,
      public_visibility_changes: false,
    },
  };
  const generatedAt = report.generated_at;
  const retrieval = {
    access_mode: 'local_and_production_database_proven_read_only',
    database_reads: true,
    database_writes: false,
    source_fetches: false,
    storage_access: false,
  };
  await fs.mkdir(options.outputRoot, { recursive: true });
  await writeJsonArtifact(
    path.join(options.outputRoot, 'jpn_schema_history_preflight_v1.json'),
    buildArtifact({
      packageId: SCHEMA_HISTORY_PREFLIGHT_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_schema_history_preflight_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status,
    migration: report.migration,
    contracts_equivalent: contractsEquivalent,
    local_ledger_rows: local.migration_ledger.length,
    production_ledger_rows: production.migration_ledger.length,
    findings,
    output_root: options.outputRoot,
  }));
  if (findings.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
