import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import { marketEvidenceDbUrl } from '../lib/market_evidence_db_query_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERSION = 'OPERATIONS_NOTIFICATION_SEVERITY_V2_WRITER';
const MIGRATION_VERSION = '20260824043000';
const MIGRATION_NAME = 'operations_notification_severity_v2';
const EXPECTED_PREVIOUS_VERSION = '20260824033000';
const EXPECTED_MIGRATION_SHA256 = '792d6f65c866b26a5ab0905db93cf3e899c3e62da9e25a8b4a6b98b5f6a91841';
const MIGRATION_FILE = path.join(ROOT, 'supabase', 'migrations', `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`);
const ALLOWED_SEVERITIES = ['critical', 'high', 'warning', 'info'];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}

function parseArgs(argv) {
  const outDirArg = argv.find((arg) => arg.startsWith('--out-dir='));
  const mode = argv.includes('--apply') ? 'apply' : argv.includes('--dry-run') ? 'dry-run' : 'plan';
  const unsupported = argv.filter((arg) => !['--apply', '--dry-run'].includes(arg) && !arg.startsWith('--out-dir='));
  if (unsupported.length) throw new Error(`Unsupported arguments: ${unsupported.join(', ')}`);
  return {
    mode,
    outDir: path.resolve(outDirArg?.slice('--out-dir='.length) ?? path.join(ROOT, 'docs', 'audits', 'production_backend_launch_v1', 'operations_alert_severity_v2'))
  };
}

async function captureState(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'ledger_count', (select count(*)::integer from supabase_migrations.schema_migrations where version = $1),
      'ledger_name', (select name from supabase_migrations.schema_migrations where version = $1 limit 1),
      'latest_version', (select max(version) from supabase_migrations.schema_migrations),
      'later_version_count', (select count(*)::integer from supabase_migrations.schema_migrations where version > $1),
      'event_row_count', (select count(*)::bigint from public.operations_notification_events),
      'severity_counts', (
        select coalesce(jsonb_object_agg(severity, row_count), '{}'::jsonb)
        from (
          select severity, count(*)::bigint as row_count
          from public.operations_notification_events
          group by severity
        ) counts
      ),
      'constraint_definition', (
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.operations_notification_events'::regclass
          and conname = 'operations_notification_events_severity_chk'
      ),
      'enqueue_function_definition', pg_get_functiondef('public.enqueue_operations_notification_v1(jsonb)'::regprocedure),
      'rls_enabled', (select relrowsecurity from pg_class where oid = 'public.operations_notification_events'::regclass),
      'anon_select', has_table_privilege('anon', 'public.operations_notification_events', 'select'),
      'authenticated_select', has_table_privilege('authenticated', 'public.operations_notification_events', 'select'),
      'anon_function_execute', has_function_privilege('anon', 'public.enqueue_operations_notification_v1(jsonb)', 'execute'),
      'authenticated_function_execute', has_function_privilege('authenticated', 'public.enqueue_operations_notification_v1(jsonb)', 'execute'),
      'service_function_execute', has_function_privilege('service_role', 'public.enqueue_operations_notification_v1(jsonb)', 'execute')
    ) as value
  `, [MIGRATION_VERSION]);
  return result.rows[0].value;
}

function securityIsPrivate(state) {
  return state.rls_enabled === true
    && state.anon_select === false
    && state.authenticated_select === false
    && state.anon_function_execute === false
    && state.authenticated_function_execute === false
    && state.service_function_execute === true;
}

export function validatePreflightStateV2(state) {
  const findings = [];
  if (Number(state.ledger_count) !== 0) findings.push('migration_ledger_already_present');
  if (state.latest_version !== EXPECTED_PREVIOUS_VERSION) findings.push('unexpected_migration_head');
  if (Number(state.later_version_count) !== 0) findings.push('later_migration_present');
  if (!String(state.constraint_definition ?? '').includes("severity = 'critical'")) findings.push('critical_only_constraint_not_present');
  if (!String(state.enqueue_function_definition ?? '').includes("v_severity <> 'critical'")) findings.push('critical_only_function_not_present');
  if (!securityIsPrivate(state)) findings.push('operations_alert_authority_not_private');
  return findings;
}

export function validateAppliedStateV2(before, after) {
  const findings = [];
  if (Number(after.ledger_count) !== 1 || after.ledger_name !== MIGRATION_NAME) findings.push('migration_ledger_mismatch');
  if (after.latest_version !== MIGRATION_VERSION || Number(after.later_version_count) !== 0) findings.push('migration_order_mismatch');
  for (const severity of ALLOWED_SEVERITIES) {
    if (!String(after.constraint_definition ?? '').includes(`'${severity}'`)) findings.push(`constraint_missing_${severity}`);
    if (!String(after.enqueue_function_definition ?? '').includes(`'${severity}'`)) findings.push(`function_missing_${severity}`);
  }
  if (Number(after.event_row_count) !== Number(before.event_row_count)) findings.push('event_rows_changed');
  if (JSON.stringify(stable(after.severity_counts)) !== JSON.stringify(stable(before.severity_counts))) findings.push('event_severity_counts_changed');
  if (!securityIsPrivate(after)) findings.push('operations_alert_authority_widened');
  return findings;
}

function markdown(report) {
  return [
    `# ${VERSION}`,
    '',
    `- Mode: \`${report.mode}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Migration: \`${MIGRATION_VERSION}_${MIGRATION_NAME}\``,
    `- Migration SHA-256: \`${report.migration_sha256}\``,
    `- Database writes committed: \`${report.boundaries.database_writes_committed}\``,
    `- Existing event rows changed: \`${report.boundaries.existing_event_rows_changed}\``,
    `- Authority widened: \`${report.boundaries.authority_widened}\``,
    '',
    '## Findings',
    '',
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ['- none']),
    ''
  ].join('\n');
}

async function execute(mode, migrationSql) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: 'operations_notification_severity_v2_writer'
  });
  await client.connect();
  try {
    const before = await captureState(client);
    const preflightFindings = validatePreflightStateV2(before);
    if (preflightFindings.length) throw new Error(`Preflight failed: ${preflightFindings.join(', ')}`);
    await client.query('begin');
    try {
      await client.query("select pg_advisory_xact_lock(hashtext('operations_notification_severity_v2'))");
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '180s'");
      await client.query(migrationSql);
      await client.query(
        `insert into supabase_migrations.schema_migrations (version, statements, name)
         values ($1, $2::text[], $3)`,
        [MIGRATION_VERSION, [migrationSql], MIGRATION_NAME]
      );
      const transaction = await captureState(client);
      const transactionFindings = validateAppliedStateV2(before, transaction);
      if (transactionFindings.length) throw new Error(`Transaction readback failed: ${transactionFindings.join(', ')}`);
      await client.query(mode === 'apply' ? 'commit' : 'rollback');
      const durable = await captureState(client);
      const durableFindings = mode === 'apply'
        ? validateAppliedStateV2(before, durable)
        : validatePreflightStateV2(durable);
      if (durableFindings.length) throw new Error(`Durable readback failed: ${durableFindings.join(', ')}`);
      return { before, transaction, durable };
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

export async function runOperationsNotificationSeverityV2Writer(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const migrationSql = await fs.readFile(MIGRATION_FILE, 'utf8');
  const migrationSha = sha256(migrationSql);
  if (migrationSha !== EXPECTED_MIGRATION_SHA256) throw new Error(`Migration SHA mismatch: ${migrationSha}`);
  if (/\b(?:begin|commit|rollback)\s*;/i.test(migrationSql)) throw new Error('Migration must not control its own transaction');
  const execution = args.mode === 'plan' ? null : await execute(args.mode, migrationSql);
  const reportBody = {
    package_id: VERSION,
    observed_at: new Date().toISOString(),
    mode: args.mode,
    status: 'succeeded',
    migration_version: MIGRATION_VERSION,
    migration_name: MIGRATION_NAME,
    migration_sha256: migrationSha,
    findings: [],
    execution,
    boundaries: {
      database_writes_committed: args.mode === 'apply',
      migration_ledger_rows_committed: args.mode === 'apply' ? 1 : 0,
      existing_event_rows_changed: false,
      authority_widened: false,
      collector_notification_rows_created: 0,
      canonical_writes: 0,
      pricing_writes: 0,
      vault_writes: 0
    }
  };
  const report = { ...reportBody, report_fingerprint_sha256: sha256(reportBody) };
  await fs.mkdir(args.outDir, { recursive: true });
  const jsonContent = `${JSON.stringify(report, null, 2)}\n`;
  const jsonPath = path.join(args.outDir, 'operations_notification_severity_v2_writer.json');
  await Promise.all([
    fs.writeFile(jsonPath, jsonContent),
    fs.writeFile(`${jsonPath}.sha256`, `${sha256(jsonContent)}  ${path.basename(jsonPath)}\n`),
    fs.writeFile(path.join(args.outDir, 'OPERATIONS_NOTIFICATION_SEVERITY_V2_WRITER.md'), markdown(report))
  ]);
  process.stdout.write(`${JSON.stringify({ status: report.status, mode: report.mode, migration_sha256: report.migration_sha256, report_fingerprint_sha256: report.report_fingerprint_sha256, json_path: jsonPath }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runOperationsNotificationSeverityV2Writer().catch((error) => {
    console.error(`[operations-notification-severity-v2-writer] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
