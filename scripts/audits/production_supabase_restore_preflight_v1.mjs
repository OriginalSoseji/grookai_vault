import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';

const { Client } = pg;
const execFileAsync = promisify(execFile);

export const RESTORE_PREFLIGHT_VERSION = 'PRODUCTION_SUPABASE_RESTORE_PREFLIGHT_V1';
const DEFAULT_SOURCE_PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const DEFAULT_ORGANIZATION_ID = 'rksadomjkuoxvrbhsmxu';
const MINIMUM_RESTORE_HEADROOM_RATIO = 1.2;

function text(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length ? normalized : null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  const content = typeof value === 'string' ? value : JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(content).digest('hex');
}

function stamp(date) {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

function parseArgs(argv, now) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const localDefault = process.platform === 'win32'
    ? path.join('C:\\secure-ops', 'production-backend-launch', 'restore-preflight')
    : path.join('artifacts', 'production-backend-launch', 'restore-preflight');
  const sourceProjectRef = text(value('--source-project-ref')) ?? DEFAULT_SOURCE_PROJECT_REF;
  const organizationId = text(value('--organization-id')) ?? DEFAULT_ORGANIZATION_ID;
  const destinationProjectRef = text(value('--destination-project-ref'));
  if (!/^[a-z0-9]{20}$/.test(sourceProjectRef)) throw new Error('--source-project-ref must be a 20-character project ref');
  if (!/^[a-z0-9]{20}$/.test(organizationId)) throw new Error('--organization-id must be a 20-character organization id');
  if (destinationProjectRef && !/^[a-z0-9]{20}$/.test(destinationProjectRef)) throw new Error('--destination-project-ref must be a 20-character project ref');
  return {
    sourceProjectRef,
    organizationId,
    destinationProjectRef,
    destinationIsolationConfirmed: argv.includes('--destination-isolation-confirmed'),
    destinationCapacityGb: Number(value('--destination-capacity-gb')) || null,
    outDir: path.resolve(value('--out-dir') ?? path.join(localDefault, `${stamp(now)}_read_only`))
  };
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url) ? false : { rejectUnauthorized: false };
}

async function command(executable, args, options = {}) {
  const { stdout } = await execFileAsync(executable, args, {
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
    ...options
  });
  return stdout.trim();
}

async function supabaseJson(args) {
  return JSON.parse(await command('supabase', args));
}

function finding(severity, code, detail, evidence = {}) {
  return { severity, code, detail, evidence };
}

export function evaluateRestorePreflightV1({
  projects,
  backupInventory,
  sourceSnapshot,
  sourceProjectRef,
  organizationId,
  destinationProjectRef = null,
  destinationIsolationConfirmed = false,
  destinationCapacityGb = null,
  now = new Date()
}) {
  const findings = [];
  const source = projects.find((row) => row.ref === sourceProjectRef) ?? null;
  const destination = destinationProjectRef
    ? projects.find((row) => row.ref === destinationProjectRef) ?? null
    : null;
  const completedBackups = [...(backupInventory?.backups ?? [])]
    .filter((row) => row.status === 'COMPLETED' && row.is_physical_backup === true)
    .sort((left, right) => Date.parse(right.inserted_at) - Date.parse(left.inserted_at));
  const sourceBackup = completedBackups[0] ?? null;
  const backupAgeHours = sourceBackup
    ? (now.getTime() - Date.parse(sourceBackup.inserted_at)) / 3_600_000
    : null;
  const sourceDatabaseBytes = Number(sourceSnapshot?.database_bytes);
  const minimumDestinationCapacityGb = Number.isFinite(sourceDatabaseBytes)
    ? Math.ceil((sourceDatabaseBytes / 1_000_000_000) * MINIMUM_RESTORE_HEADROOM_RATIO)
    : null;

  if (!source) findings.push(finding('critical', 'source_project_missing', 'The production source project was not returned by the management plane.'));
  else {
    if (source.organization_id !== organizationId) findings.push(finding('critical', 'source_organization_mismatch', 'The source project is not owned by the frozen organization.'));
    if (source.status !== 'ACTIVE_HEALTHY') findings.push(finding('high', 'source_project_not_healthy', `The source project status is ${source.status ?? 'unknown'}.`));
  }
  if (!sourceBackup) findings.push(finding('critical', 'completed_physical_backup_missing', 'No completed physical backup is available.'));
  else if (!Number.isFinite(backupAgeHours) || backupAgeHours > 36) findings.push(finding('high', 'source_backup_stale', 'The latest completed physical backup is older than 36 hours.', { backup_age_hours: backupAgeHours }));
  if (backupInventory?.walg_enabled !== true) findings.push(finding('high', 'walg_not_enabled', 'WAL-G backup support is not enabled.'));
  if (!sourceSnapshot?.schema_fingerprint_sha256) findings.push(finding('high', 'source_schema_fingerprint_missing', 'The read-only source schema fingerprint is missing.'));
  if (!sourceSnapshot?.migration_ledger_fingerprint_sha256) findings.push(finding('high', 'source_migration_fingerprint_missing', 'The source migration-ledger fingerprint is missing.'));

  if (!destinationProjectRef) {
    findings.push(finding('blocked', 'isolated_destination_not_supplied', 'No isolated nonproduction destination project has been supplied.'));
  } else if (destinationProjectRef === sourceProjectRef) {
    findings.push(finding('critical', 'production_selected_as_restore_destination', 'Production can never be used as the restore destination.'));
  } else if (!destination) {
    findings.push(finding('blocked', 'destination_project_not_found', 'The requested destination project was not returned by the management plane.'));
  } else {
    if (destination.organization_id !== organizationId) findings.push(finding('high', 'destination_organization_mismatch', 'The destination is not in the frozen organization.'));
    if (destination.status !== 'ACTIVE_HEALTHY') findings.push(finding('high', 'destination_project_not_healthy', `The destination project status is ${destination.status ?? 'unknown'}.`));
    if (!destinationIsolationConfirmed) findings.push(finding('blocked', 'destination_isolation_not_confirmed', 'No explicit proof confirms that clients, workers, DNS, and production secrets do not reference the destination.'));
  }
  if (!Number.isFinite(destinationCapacityGb)) {
    findings.push(finding('blocked', 'destination_capacity_unmeasured', 'Destination disk capacity has not been recorded.'));
  } else if (Number.isFinite(minimumDestinationCapacityGb) && destinationCapacityGb < minimumDestinationCapacityGb) {
    findings.push(finding('high', 'destination_capacity_insufficient', 'Destination disk capacity is below the source-size plus restore-headroom floor.', {
      destination_capacity_gb: destinationCapacityGb,
      minimum_destination_capacity_gb: minimumDestinationCapacityGb
    }));
  }

  const blockers = findings.filter((row) => ['critical', 'high', 'blocked'].includes(row.severity));
  return {
    status: blockers.length ? 'blocked' : 'ready_for_restore_authorization',
    restore_execution_allowed: false,
    findings,
    source_backup: sourceBackup,
    backup_age_hours: backupAgeHours,
    minimum_destination_capacity_gb: minimumDestinationCapacityGb,
    destination_project: destination
      ? { ref: destination.ref, name: destination.name, organization_id: destination.organization_id, region: destination.region, status: destination.status }
      : null
  };
}

async function readSourceSnapshot(url) {
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
    application_name: 'production_supabase_restore_preflight_v1'
  });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query("set local statement_timeout = '60s'");
    await client.query("set local lock_timeout = '5s'");
    const database = await client.query('select pg_database_size(current_database())::bigint as database_bytes');
    const migrations = await client.query(`select version, name from supabase_migrations.schema_migrations order by version, name`);
    const objects = await client.query(`
        select namespace.nspname as schema_name,
               relation.relname as object_name,
               relation.relkind as object_kind,
               relation.relrowsecurity as row_security
          from pg_class relation
          join pg_namespace namespace on namespace.oid = relation.relnamespace
         where namespace.nspname in ('public', 'auth', 'storage')
           and relation.relkind in ('r', 'p', 'v', 'm', 'S')
         order by 1, 2, 3`);
    const columns = await client.query(`
        select table_schema, table_name, ordinal_position, column_name,
               data_type, udt_schema, udt_name, is_nullable, column_default
         from information_schema.columns
         where table_schema in ('public', 'auth', 'storage')
         order by 1, 2, 3`);
    const policies = await client.query(`
        select schemaname, tablename, policyname, permissive, roles, cmd,
               coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
         from pg_policies
         where schemaname in ('public', 'auth', 'storage')
         order by 1, 2, 3`);
    const functions = await client.query(`
        select namespace.nspname as schema_name,
               procedure.proname as function_name,
               pg_get_function_identity_arguments(procedure.oid) as identity_arguments,
               procedure.prosecdef as security_definer,
               coalesce(array_to_string(procedure.proconfig, ','), '') as configuration,
               md5(pg_get_functiondef(procedure.oid)) as definition_md5
          from pg_proc procedure
          join pg_namespace namespace on namespace.oid = procedure.pronamespace
         where namespace.nspname in ('public', 'auth', 'storage')
           and procedure.prokind in ('f', 'p')
         order by 1, 2, 3`);
    await client.query('rollback');
    const migrationLedger = migrations.rows;
    const schemaInputs = {
      objects: objects.rows,
      columns: columns.rows,
      policies: policies.rows,
      functions: functions.rows
    };
    return {
      captured_at: new Date().toISOString(),
      database_bytes: Number(database.rows[0]?.database_bytes),
      migration_ledger_head: migrationLedger.at(-1)?.version ?? null,
      migration_ledger_rows: migrationLedger.length,
      migration_ledger_fingerprint_sha256: sha256(migrationLedger),
      schema_object_counts: Object.fromEntries(Object.entries(schemaInputs).map(([key, rows]) => [key, rows.length])),
      schema_fingerprint_sha256: sha256(schemaInputs)
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function markdown(report) {
  return [
    `# ${RESTORE_PREFLIGHT_VERSION}`,
    '',
    `- Observed: \`${report.observed_at}\``,
    `- Commit: \`${report.git.commit_sha}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Source project: \`${report.source_project_ref}\``,
    `- Latest backup: \`${report.source_backup?.inserted_at ?? 'missing'}\``,
    `- Source database: \`${report.source_snapshot.database_bytes}\` bytes`,
    `- Minimum isolated destination: \`${report.minimum_destination_capacity_gb ?? 'unmeasured'} GB\``,
    `- Restore execution allowed: \`${report.restore_execution_allowed}\``,
    '',
    '## Findings',
    '',
    ...report.findings.map((row) => `- **${row.severity.toUpperCase()} ${row.code}:** ${row.detail}`),
    '',
    '## Boundaries',
    '',
    '- Production database transaction: read only',
    '- Restore started: no',
    '- Project created: no',
    '- Database or Storage writes: none',
    '- Billing or capacity changes: none',
    '- Client, DNS, worker, or secret pointers changed: no',
    ''
  ].join('\n');
}

export async function runRestorePreflightV1({ argv = process.argv.slice(2), now = new Date() } = {}) {
  const args = parseArgs(argv, now);
  const url = connectionString();
  if (!url) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required');
  await fs.mkdir(args.outDir, { recursive: true });
  const [commitSha, branch, trackedChanges, projects, backupInventory, sourceSnapshot] = await Promise.all([
    command('git', ['rev-parse', 'HEAD']),
    command('git', ['branch', '--show-current']),
    command('git', ['status', '--short', '--untracked-files=no']),
    supabaseJson(['projects', 'list', '--output', 'json']),
    supabaseJson(['backups', 'list', '--project-ref', args.sourceProjectRef, '--output', 'json']),
    readSourceSnapshot(url)
  ]);
  const evaluation = evaluateRestorePreflightV1({
    projects,
    backupInventory,
    sourceSnapshot,
    sourceProjectRef: args.sourceProjectRef,
    organizationId: args.organizationId,
    destinationProjectRef: args.destinationProjectRef,
    destinationIsolationConfirmed: args.destinationIsolationConfirmed,
    destinationCapacityGb: args.destinationCapacityGb,
    now
  });
  const body = {
    schema_version: RESTORE_PREFLIGHT_VERSION,
    observed_at: now.toISOString(),
    git: { commit_sha: commitSha, branch, tracked_worktree_clean: trackedChanges.length === 0 },
    source_project_ref: args.sourceProjectRef,
    organization_id: args.organizationId,
    destination_project_ref: args.destinationProjectRef,
    destination_isolation_confirmed: args.destinationIsolationConfirmed,
    destination_capacity_gb: args.destinationCapacityGb,
    source_snapshot: sourceSnapshot,
    ...evaluation,
    boundaries: {
      management_reads_only: true,
      production_database_read_only: true,
      project_created: false,
      restore_started: false,
      database_writes: false,
      storage_writes: false,
      billing_changes: false,
      pointer_changes: false,
      production_mutations: false
    }
  };
  const report = { ...body, report_fingerprint_sha256: sha256(body) };
  const jsonContent = `${JSON.stringify(report, null, 2)}\n`;
  const jsonPath = path.join(args.outDir, 'restore_preflight.json');
  await Promise.all([
    fs.writeFile(jsonPath, jsonContent),
    fs.writeFile(`${jsonPath}.sha256`, `${sha256(jsonContent)}  ${path.basename(jsonPath)}\n`),
    fs.writeFile(path.join(args.outDir, 'RESTORE_PREFLIGHT.md'), markdown(report))
  ]);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    restore_execution_allowed: report.restore_execution_allowed,
    minimum_destination_capacity_gb: report.minimum_destination_capacity_gb,
    findings: report.findings,
    report_fingerprint_sha256: report.report_fingerprint_sha256,
    artifact_directory: args.outDir
  }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runRestorePreflightV1().catch((error) => {
    console.error(`[production-supabase-restore-preflight] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
