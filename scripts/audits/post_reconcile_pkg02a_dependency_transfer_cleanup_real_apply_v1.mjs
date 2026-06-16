import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'post_reconcile_integrity_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const LABEL = getArgValue('--label');
const EXPECTED_FINGERPRINT = getArgValue('--fingerprint');
const EXPECTED_SQL_HASH = getArgValue('--sql-hash');

if (!LABEL || !EXPECTED_FINGERPRINT || !EXPECTED_SQL_HASH) {
  throw new Error('Usage: node scripts/audits/post_reconcile_pkg02a_dependency_transfer_cleanup_real_apply_v1.mjs --label <label> --fingerprint <sha256> --sql-hash <sha256>');
}

const PACKAGE_ID = 'POST-REC-02A-DEPENDENCY-TRANSFER-DUPLICATE-PARENT-CLEANUP';
const DRY_RUN_JSON = path.join(AUDIT_DIR, `post_reconcile_pkg02a_dependency_transfer_cleanup_guarded_dry_run_${LABEL}_v1.json`);
const DRY_RUN_SQL = path.join(SQL_DIR, `post_reconcile_pkg02a_dependency_transfer_cleanup_guarded_dry_run_${LABEL}_v1.sql`);
const OUTPUT_JSON = path.join(AUDIT_DIR, `post_reconcile_pkg02a_dependency_transfer_cleanup_real_apply_${LABEL}_v1.json`);
const OUTPUT_MD = path.join(AUDIT_DIR, `post_reconcile_pkg02a_dependency_transfer_cleanup_real_apply_${LABEL}_v1.md`);

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function buildRealApplySql(dryRunSql) {
  const stripped = dryRunSql.replace(/--.*$/gm, '');
  if (/(^|\n)\s*commit\s*;/i.test(stripped)) {
    throw new Error('Dry-run SQL unexpectedly already contains COMMIT.');
  }
  if (!/(^|\n)\s*rollback\s*;\s*$/i.test(stripped)) {
    throw new Error('Dry-run SQL does not end with ROLLBACK.');
  }
  return dryRunSql.replace(/(^|\n)\s*rollback\s*;\s*$/i, '\ncommit;\n');
}

function validateDryRun(dryRun, dryRunSql) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.sql_artifact?.sha256 !== EXPECTED_SQL_HASH) findings.push('sql_hash_mismatch');
  if (sha256(dryRunSql) !== EXPECTED_SQL_HASH) findings.push('sql_file_hash_mismatch');
  if (dryRun.execution?.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_not_completed');
  }
  if (dryRun.execution?.rollback_proof_hash_match !== true) findings.push('rollback_proof_not_matched');
  if (dryRun.safety?.real_apply_performed !== false) findings.push('dry_run_claims_real_apply');
  if (dryRun.safety?.migrations_created !== false) findings.push('dry_run_claims_migration');
  if (dryRun.sql_artifact?.contains_commit_statement !== false) findings.push('dry_run_sql_has_commit');
  if (dryRun.sql_artifact?.contains_rollback_statement !== true) findings.push('dry_run_sql_missing_rollback');
  return findings;
}

async function capturePostApply(client, targetRows) {
  const duplicateIds = targetRows.map((row) => row.duplicate_parent_id);
  const canonicalIds = targetRows.map((row) => row.canonical_parent_id);
  const counts = await client.query(
    `
      select
        (select count(*)::int from public.card_prints where id = any($1::uuid[])) as duplicate_parent_rows,
        (select count(*)::int from public.card_prints where id = any($2::uuid[])) as canonical_parent_rows,
        (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as duplicate_child_rows,
        (select count(*)::int from public.card_print_identity where card_print_id = any($1::uuid[])) as duplicate_identity_rows,
        (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as duplicate_external_mapping_rows,
        (select count(*)::int from public.justtcg_variant_price_snapshots where card_print_id = any($1::uuid[])) as duplicate_justtcg_snapshot_rows,
        (select count(*)::int from public.card_feed_events where card_print_id = any($1::uuid[])) as duplicate_feed_rows,
        (select count(*)::int from public.vault_item_instances where card_print_id = any($1::uuid[])) as duplicate_vault_instance_rows,
        (select count(*)::int from public.vault_items where card_id = any($1::uuid[])) as duplicate_vault_item_rows
    `,
    [duplicateIds, canonicalIds],
  );
  return {
    captured_at: new Date().toISOString(),
    counts: counts.rows[0],
    hash_sha256: sha256(stableJson(counts.rows[0])),
  };
}

async function runApply(sql, targetRows) {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const execution = {
      execution_status: 'not_started',
      error_message: null,
      post_apply_snapshot: null,
    };
    try {
      await client.query(sql);
      execution.execution_status = 'real_apply_completed';
    } catch (error) {
      execution.execution_status = 'real_apply_failed';
      execution.error_message = error.message;
      await client.query('rollback').catch(() => {});
    }
    execution.post_apply_snapshot = await capturePostApply(client, targetRows);
    return execution;
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMarkdown(report) {
  return `# POST-REC-02A Dependency Transfer Duplicate Parent Cleanup Real Apply ${LABEL}

Approved real apply for a set-scoped dependency-transfer duplicate parent cleanup package.

## Scope

- package_id: ${report.package_id}
- label: ${report.label}
- target_groups: ${report.scope.target_groups}
- target_sets: ${report.scope.target_sets.join(', ')}
- duplicate_child_rows_from_strategy: ${report.scope.duplicate_child_rows_from_strategy}
- package_fingerprint: \`${report.package_fingerprint_sha256}\`
- sql_hash: \`${report.dry_run_sql_hash_sha256}\`

## Result

- execution_status: ${report.execution.execution_status}
- duplicate_parent_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_parent_rows ?? 'n/a'}
- duplicate_child_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_child_rows ?? 'n/a'}
- duplicate_identity_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_identity_rows ?? 'n/a'}
- duplicate_feed_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_feed_rows ?? 'n/a'}
- duplicate_vault_instance_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_vault_instance_rows ?? 'n/a'}
- duplicate_vault_item_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_vault_item_rows ?? 'n/a'}

## Safety

- migrations_created: false
- global_apply_performed: false
- image_writes_performed: false
- unsupported_cleanup_performed: false
- quarantine_performed: false
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const dryRunSql = await fs.readFile(DRY_RUN_SQL, 'utf8');
  const validationFindings = validateDryRun(dryRun, dryRunSql);
  if (validationFindings.length > 0) {
    throw new Error(`Dry-run validation failed: ${validationFindings.join(', ')}`);
  }

  const realApplySql = buildRealApplySql(dryRunSql);
  const execution = await runApply(realApplySql, dryRun.scope.target_rows);
  const counts = execution.post_apply_snapshot?.counts ?? {};
  const postApplyFindings = [];
  if (execution.execution_status !== 'real_apply_completed') postApplyFindings.push('real_apply_not_completed');
  for (const [key, value] of Object.entries(counts)) {
    if (key.startsWith('duplicate_') && Number(value) !== 0) postApplyFindings.push(`${key}_remain`);
  }

  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    label: LABEL,
    source_dry_run: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    dry_run_sql_hash_sha256: dryRun.sql_artifact.sha256,
    real_apply_sql_hash_sha256: sha256(realApplySql),
    safety: {
      db_writes_performed: execution.execution_status === 'real_apply_completed',
      migrations_created: false,
      global_apply_performed: false,
      image_writes_performed: false,
      unsupported_cleanup_performed: false,
      quarantine_performed: false,
    },
    scope: dryRun.scope,
    execution,
    post_apply_findings: postApplyFindings,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    execution_status: execution.execution_status,
    post_apply_findings: postApplyFindings,
    post_apply_counts: counts,
  }, null, 2));
  if (postApplyFindings.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
