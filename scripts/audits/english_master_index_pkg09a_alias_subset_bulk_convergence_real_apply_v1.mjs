import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1.json');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09_alias_subset_bulk_readiness_v1.json');
const DRY_RUN_SQL = path.join(SQL_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_transaction_v1.sql');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg09a_alias_subset_bulk_convergence_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE';
const PACKAGE_FINGERPRINT = 'd66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a';
const DRY_RUN_PROOF_HASH = 'a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f';
const APPROVAL_TEXT = 'Approve real PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE apply only. Fingerprint: d66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a. Scope: 155 candidate rows, 105 parent set_id/set_code updates, 48 parent inserts, 53 child printing inserts, 48 external mapping inserts, 36 blocked rows excluded. Dry-run proof: a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f == a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No quarantine.';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function validatePrerequisites({ gate, dryRun, readiness, sql }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('gate_not_ready');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('gate_stop_findings_present');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('gate_fingerprint_mismatch');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run?.proof_hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.dry_run?.status !== 'pkg09a_alias_subset_bulk_convergence_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (readiness.summary?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('readiness_fingerprint_mismatch');
  if (readiness.summary?.scope?.candidate_rows !== 155) findings.push('readiness_candidate_count_not_155');
  if (readiness.summary?.scope?.blocked_rows !== 36) findings.push('readiness_blocked_count_not_36');
  if (!sql.includes(`-- ${PACKAGE_ID} guarded dry-run transaction`)) findings.push('sql_wrong_package_comment');
  if (!sql.includes(`-- package_fingerprint_sha256: ${PACKAGE_FINGERPRINT}`)) findings.push('sql_fingerprint_missing');
  if (!/rollback;\s*$/i.test(sql)) findings.push('sql_does_not_end_in_rollback');
  if (/commit;\s*$/i.test(sql)) findings.push('sql_already_commits');
  if (/delete\s+from\s+public\./i.test(sql)) findings.push('sql_contains_delete');
  if (/drop\s+table\s+public\./i.test(sql)) findings.push('sql_contains_public_drop');
  if (/truncate\s+public\./i.test(sql)) findings.push('sql_contains_truncate');
  return findings;
}

function buildApplySql(sql) {
  return sql.replace(/rollback;\s*$/i, 'commit;\n');
}

async function executeApply(applySql) {
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const result = await client.query(applySql);
    const proofResult = [...result].reverse().find((item) => item.rows?.[0]?.package_id === PACKAGE_ID);
    return {
      apply_status: 'pkg09a_alias_subset_bulk_convergence_real_apply_committed',
      proof_row: proofResult?.rows?.[0] ?? null,
      proof_hash_sha256: sha256(stableJson(proofResult?.rows?.[0] ?? {})),
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function postApplyVerification() {
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const [parents, children, mappings, migrations] = await Promise.all([
      client.query(`
        select set_code, count(*)::int as rows
        from public.card_prints
        where set_code = any($1::text[])
        group by set_code
        order by set_code
      `, [['cel25c', 'mep', 'swsh12pt5gg', 'xya']]),
      client.query(`
        select cp.set_code, cpr.finish_key, count(*)::int as rows
        from public.card_printings cpr
        join public.card_prints cp on cp.id = cpr.card_print_id
        where cpr.created_by = $1
        group by cp.set_code, cpr.finish_key
        order by cp.set_code, cpr.finish_key
      `, ['pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1']),
      client.query(`
        select source, count(*)::int as rows
        from public.external_mappings
        where meta->>'package_id' = $1
        group by source
        order by source
      `, [PACKAGE_ID]),
      client.query(`
        select count(*)::int as migration_like_rows
        from pg_catalog.pg_tables
        where schemaname = 'public'
          and tablename ilike '%pkg09a%'
      `),
    ]);
    await client.query('rollback');
    return {
      parent_counts_by_set: parents.rows,
      inserted_child_counts: children.rows,
      inserted_mapping_counts: mappings.rows,
      temp_or_public_pkg09a_tables_remaining: migrations.rows[0]?.migration_like_rows ?? null,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  return `# PKG-09A Alias / Subset Bulk Convergence Real Apply V1

Real apply for the approved PKG-09A bulk alias/subset package.

## Result

- apply_status: ${report.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_hash_sha256: \`${report.dry_run_proof_hash_sha256}\`
- real_apply_proof_hash_sha256: \`${report.real_apply_proof_hash_sha256}\`
- candidate_rows: ${report.scope.candidate_rows}
- parent_set_code_update_rows: ${report.scope.parent_set_code_update_rows}
- parent_insert_rows: ${report.scope.parent_insert_rows}
- child_insert_rows: ${report.scope.child_insert_rows}
- external_mapping_insert_rows: ${report.scope.external_mapping_insert_rows}
- blocked_rows_excluded: ${report.scope.blocked_rows_excluded}

## Safety

- db_write_committed: ${report.db_write_committed}
- migrations_created: ${report.migrations_created}
- deletes_performed: ${report.deletes_performed}
- merges_performed: ${report.merges_performed}
- unsupported_cleanup_performed: ${report.unsupported_cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- global_apply_performed: ${report.global_apply_performed}
- stop_findings: ${report.stop_findings.length}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-09A Alias / Subset Bulk Convergence Real Apply Checkpoint V1](20260610_pkg09a_alias_subset_bulk_convergence_real_apply_checkpoint_v1.md) | Real-applies approved 155-row alias/subset bulk convergence package; no migrations, deletes, merges, unsupported cleanup, or quarantine. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (!current.includes('20260610_pkg09a_alias_subset_bulk_convergence_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const gate = readJson(GATE_JSON);
  const dryRun = readJson(DRY_RUN_JSON);
  const readiness = readJson(READINESS_JSON);
  const dryRunSql = fs.readFileSync(DRY_RUN_SQL, 'utf8');
  const findings = validatePrerequisites({ gate, dryRun, readiness, sql: dryRunSql });
  if (findings.length !== 0) {
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg09a_alias_subset_bulk_convergence_real_apply_v1',
      apply_status: 'blocked_before_real_apply',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      db_write_committed: false,
      migrations_created: false,
      stop_findings: findings,
    };
    writeJson(OUTPUT_JSON, report);
    writeText(OUTPUT_MD, renderMarkdown({ ...report, dry_run_proof_hash_sha256: DRY_RUN_PROOF_HASH, real_apply_proof_hash_sha256: null, scope: dryRun.scope ?? {}, deletes_performed: false, merges_performed: false, unsupported_cleanup_performed: false, quarantine_performed: false, global_apply_performed: false }));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  const applySql = buildApplySql(dryRunSql);
  const execution = await executeApply(applySql);
  const verification = await postApplyVerification();
  const proofMatches = execution.proof_row?.package_fingerprint === PACKAGE_FINGERPRINT
    && Number(execution.proof_row?.parent_updates) === 105
    && Number(execution.proof_row?.parent_inserts) === 48
    && Number(execution.proof_row?.child_inserts) === 53
    && Number(execution.proof_row?.mapping_inserts) === 48
    && Number(execution.proof_row?.verified_parent_updates) === 105;
  const stopFindings = [];
  if (!proofMatches) stopFindings.push('real_apply_proof_row_mismatch');
  if (verification.temp_or_public_pkg09a_tables_remaining !== 0) stopFindings.push('pkg09a_public_temp_table_leak');

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg09a_alias_subset_bulk_convergence_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approval_text: APPROVAL_TEXT,
    dry_run_proof_hash_sha256: DRY_RUN_PROOF_HASH,
    real_apply_proof_hash_sha256: execution.proof_hash_sha256,
    apply_status: execution.apply_status,
    db_write_committed: true,
    migrations_created: false,
    deletes_performed: false,
    merges_performed: false,
    unsupported_cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    scope: {
      candidate_rows: 155,
      parent_set_code_update_rows: 105,
      parent_insert_rows: 48,
      child_insert_rows: 53,
      external_mapping_insert_rows: 48,
      blocked_rows_excluded: 36,
    },
    proof_row: execution.proof_row,
    post_apply_verification: verification,
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };
  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeText(CHECKPOINT_MD, renderMarkdown(report));
  updateCheckpointIndex();
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    checkpoint_md: path.relative(ROOT, CHECKPOINT_MD),
    apply_status: report.apply_status,
    proof_row: report.proof_row,
    real_apply_proof_hash_sha256: report.real_apply_proof_hash_sha256,
    stop_findings: report.stop_findings,
    db_write_committed: report.db_write_committed,
    migrations_created: report.migrations_created,
  }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
