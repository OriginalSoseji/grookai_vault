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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'post_reconcile_pkg01_ready_duplicate_parent_cleanup_guarded_dry_run_v1.json');
const DRY_RUN_SQL = path.join(ROOT, 'docs', 'sql', 'post_reconcile_pkg01_ready_duplicate_parent_cleanup_guarded_dry_run_v1.sql');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'post_reconcile_pkg01_ready_duplicate_parent_cleanup_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'post_reconcile_pkg01_ready_duplicate_parent_cleanup_real_apply_v1.md');

const PACKAGE_ID = 'POST-REC-01-READY-DUPLICATE-PARENT-CLEANUP';
const APPROVED_FINGERPRINT = '6f86ad96ba603cd08db7b418b2f9dca98b8d373c1dcdde6967557df6c0755494';
const APPROVED_DRY_RUN_PROOF = '869c8bd3b5fec8b751a22c7c1302acbd9a2f6052284d2ed92dc4365f1be85f6b';

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
  if (dryRun.package_fingerprint_sha256 !== APPROVED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.scope?.target_groups !== 23) findings.push('target_group_count_mismatch');
  if (dryRun.scope?.duplicate_child_rows_from_readiness !== 26) findings.push('duplicate_child_scope_mismatch');
  if (dryRun.execution?.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_not_completed');
  }
  if (dryRun.execution?.rollback_proof_hash_match !== true) findings.push('rollback_proof_not_matched');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== APPROVED_DRY_RUN_PROOF) findings.push('before_proof_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== APPROVED_DRY_RUN_PROOF) {
    findings.push('after_rollback_proof_hash_mismatch');
  }
  if (sha256(dryRunSql) !== dryRun.sql_artifact?.sha256) findings.push('dry_run_sql_hash_mismatch');
  if (dryRun.safety?.real_apply_performed !== false) findings.push('dry_run_report_claims_real_apply');
  if (dryRun.safety?.migrations_created !== false) findings.push('dry_run_report_claims_migration');
  return findings;
}

async function capturePostApply(client, targetRows) {
  const canonicalIds = targetRows.map((row) => row.canonical_parent_id);
  const duplicateIds = targetRows.map((row) => row.duplicate_parent_id);
  const allIds = [...canonicalIds, ...duplicateIds];
  const counts = await client.query(
    `
      select
        (select count(*)::int from public.card_prints where id = any($1::uuid[])) as canonical_parent_rows,
        (select count(*)::int from public.card_prints where id = any($2::uuid[])) as duplicate_parent_rows,
        (select count(*)::int from public.card_print_identity where card_print_id = any($2::uuid[])) as duplicate_identity_rows,
        (select count(*)::int from public.card_printings where card_print_id = any($2::uuid[])) as duplicate_child_rows,
        (select count(*)::int from public.external_mappings where card_print_id = any($2::uuid[])) as duplicate_mapping_rows,
        (select count(*)::int from public.card_print_traits where card_print_id = any($2::uuid[])) as duplicate_trait_rows,
        (select count(*)::int from public.card_print_species where card_print_id = any($2::uuid[])) as duplicate_species_rows,
        (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as canonical_child_rows,
        (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as canonical_mapping_rows,
        (select count(*)::int from public.card_print_traits where card_print_id = any($1::uuid[])) as canonical_trait_rows,
        (select count(*)::int from public.card_print_species where card_print_id = any($1::uuid[])) as canonical_species_rows
    `,
    [canonicalIds, duplicateIds],
  );
  const remaining = await client.query(
    `
      select id, gv_id, set_code, number, name
      from public.card_prints
      where id = any($1::uuid[])
      order by set_code, number, name
    `,
    [allIds],
  );
  return {
    captured_at: new Date().toISOString(),
    counts: counts.rows[0],
    remaining_parent_rows: remaining.rows,
    hash_sha256: sha256(stableJson({ counts: counts.rows[0], remaining_parent_rows: remaining.rows })),
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
  return `# POST-REC-01 Ready Duplicate Parent Cleanup Real Apply V1

Approved real apply for the first ready duplicate-parent cleanup package.

## Scope

- package_id: ${report.package_id}
- target_groups: ${report.scope.target_groups}
- target_sets: ${report.scope.target_sets.join(', ')}
- duplicate_child_rows_handled_from_dry_run_scope: ${report.scope.duplicate_child_rows_from_readiness}
- package_fingerprint: \`${report.package_fingerprint_sha256}\`

## Result

- execution_status: ${report.execution.execution_status}
- duplicate_parent_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_parent_rows ?? 'n/a'}
- duplicate_child_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_child_rows ?? 'n/a'}
- duplicate_identity_rows_after: ${report.execution.post_apply_snapshot?.counts?.duplicate_identity_rows ?? 'n/a'}
- migrations_created: ${report.safety.migrations_created}
- global_apply_performed: ${report.safety.global_apply_performed}

## Safety

- parent_overwrites_performed: false
- image_writes_performed: false
- unsupported_cleanup_performed: false
- quarantine_performed: false

## Verification Needed

Rerun post-reconcile integrity and readiness audits after this apply. Expected duplicate group count should decrease by 23 if no new live drift appears.
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
  const realApplySqlHash = sha256(realApplySql);
  const targetRows = dryRun.scope.target_rows;
  const execution = await runApply(realApplySql, targetRows);
  const postCounts = execution.post_apply_snapshot?.counts ?? {};
  const postApplyFindings = [];
  if (execution.execution_status !== 'real_apply_completed') postApplyFindings.push('real_apply_not_completed');
  if (Number(postCounts.duplicate_parent_rows ?? -1) !== 0) postApplyFindings.push('duplicate_parent_rows_remain');
  if (Number(postCounts.duplicate_child_rows ?? -1) !== 0) postApplyFindings.push('duplicate_child_rows_remain');
  if (Number(postCounts.duplicate_identity_rows ?? -1) !== 0) postApplyFindings.push('duplicate_identity_rows_remain');
  if (Number(postCounts.duplicate_mapping_rows ?? -1) !== 0) postApplyFindings.push('duplicate_mapping_rows_remain');
  if (Number(postCounts.duplicate_trait_rows ?? -1) !== 0) postApplyFindings.push('duplicate_trait_rows_remain');
  if (Number(postCounts.duplicate_species_rows ?? -1) !== 0) postApplyFindings.push('duplicate_species_rows_remain');

  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    source_dry_run: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    dry_run_sql_hash_sha256: dryRun.sql_artifact.sha256,
    real_apply_sql_hash_sha256: realApplySqlHash,
    safety: {
      db_writes_performed: execution.execution_status === 'real_apply_completed',
      migrations_created: false,
      global_apply_performed: false,
      parent_overwrites_performed: false,
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
    post_apply_counts: postCounts,
  }, null, 2));
  if (postApplyFindings.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
