import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg10a_cracked_ice_finish_taxonomy_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION';
const PACKAGE_FINGERPRINT = '883bd24d352b7029e8e9fed6241ca058f1ec1ed12cb82ec37e247a188d4bf1e5';
const ROLLBACK_SQL_HASH = '246fa3965d7dc87fbd3f8104d4d5b3bdaf004062c7fbe7c3c6183ee6feb1fbc8';
const SOURCE_READINESS_FINGERPRINT = '382e2fab7154d290b90f4f0bda40941b4b353e8844459c4d03a7225b158d026b';
const DRY_RUN_PROOF_HASH = '27dba3a506f6bc71246fe55bcc83fa4a7e83b5a92bf8b5d9ec6d541beda8dc61';
const APPROVAL_TEXT = 'Approve real PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION apply only. Fingerprint: 883bd24d352b7029e8e9fed6241ca058f1ec1ed12cb82ec37e247a188d4bf1e5. SQL hash: 246fa3965d7dc87fbd3f8104d4d5b3bdaf004062c7fbe7c3c6183ee6feb1fbc8. Scope: finish_keys activation only for cracked_ice / Cracked Ice Holo, sort_order=36; 131 cracked_ice Master Index printings across 53 sets remain for a separate child-insert package after activation. Dry-run proof: 27dba3a506f6bc71246fe55bcc83fa4a7e83b5a92bf8b5d9ec6d541beda8dc61 == 27dba3a506f6bc71246fe55bcc83fa4a7e83b5a92bf8b5d9ec6d541beda8dc61. No child inserts. No parent writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No quarantine.';

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function flattenQueryResults(result) {
  if (Array.isArray(result)) return result.flatMap((item) => item.rows ?? []);
  return result?.rows ?? [];
}

async function captureFinishSnapshot(client) {
  const result = await client.query(
    `select key, label, sort_order, is_active, meta
     from public.finish_keys
     order by sort_order, key`,
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    cracked_ice_row: result.rows.find((row) => row.key === 'cracked_ice') ?? null,
    counts: {
      total_finish_keys: result.rows.length,
      active_finish_keys: result.rows.filter((row) => row.is_active).length,
      cracked_ice_rows: result.rows.filter((row) => row.key === 'cracked_ice').length,
      cracked_ice_active_rows: result.rows.filter((row) => row.key === 'cracked_ice' && row.is_active).length,
    },
  };
}

function buildRealApplySql(rollbackSql) {
  const stripped = rollbackSql.trimEnd();
  if (!/(^|\n)\s*rollback\s*;\s*$/i.test(stripped)) {
    throw new Error('Rollback SQL artifact does not end with rollback.');
  }
  return `${stripped.replace(/(^|\n)\s*rollback\s*;\s*$/i, '\ncommit;')}\n`;
}

function validateSql({ rollbackSql, realSql }) {
  const findings = [];
  const rollbackClean = rollbackSql.replace(/--.*$/gm, '');
  const realClean = realSql.replace(/--.*$/gm, '');
  if (sha256(rollbackSql) !== ROLLBACK_SQL_HASH) findings.push('rollback_sql_hash_mismatch');
  if (!/(^|\n)\s*rollback\s*;/i.test(rollbackClean)) findings.push('rollback_sql_missing_rollback');
  if (/(^|\n)\s*commit\s*;/i.test(rollbackClean)) findings.push('rollback_sql_contains_commit');
  if (!/(^|\n)\s*commit\s*;/i.test(realClean)) findings.push('real_sql_missing_commit');
  if (/(^|\n)\s*rollback\s*;/i.test(realClean)) findings.push('real_sql_contains_rollback');
  if (!/\binsert\s+into\s+public\.finish_keys\b/i.test(realClean)) findings.push('real_sql_missing_finish_key_insert');
  if (!/\bon\s+conflict\s*\(\s*key\s*\)\s+do\s+update\b/i.test(realClean)) findings.push('real_sql_missing_finish_key_upsert');
  if (/\binsert\s+into\s+public\.card_printings\b/i.test(realClean)) findings.push('real_sql_contains_child_printing_insert');
  if (/\binsert\s+into\s+public\.card_prints\b/i.test(realClean)) findings.push('real_sql_contains_parent_insert');
  if (/\binsert\s+into\s+public\.sets\b/i.test(realClean)) findings.push('real_sql_contains_set_insert');
  if (/\binsert\s+into\s+public\.external/i.test(realClean)) findings.push('real_sql_contains_external_mapping_insert');
  if (/\bdelete\s+from\b/i.test(realClean)) findings.push('real_sql_contains_delete');
  return findings;
}

function validatePrerequisites({ gate, dryRun, rollbackSql, realSql }) {
  const findings = validateSql({ rollbackSql, realSql });
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') {
    findings.push('real_apply_gate_not_ready');
  }
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) {
    findings.push('approval_text_mismatch');
  }
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('gate_package_id_mismatch');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('gate_fingerprint_mismatch');
  if (gate.package_scope?.sql_hash_sha256 !== ROLLBACK_SQL_HASH) findings.push('gate_sql_hash_mismatch');
  if (gate.package_scope?.finish_key !== 'cracked_ice') findings.push('gate_finish_key_mismatch');
  if (gate.package_scope?.candidate_printings_unlocked_later !== 131) findings.push('gate_candidate_rows_not_131');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('gate_stop_findings_present');
  if (gate.apply_allowed !== false) findings.push('gate_unexpected_apply_allowed');
  if (gate.write_ready_now !== 0) findings.push('gate_write_ready_nonzero');

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== ROLLBACK_SQL_HASH) findings.push('dry_run_sql_hash_mismatch');
  if (dryRun.source_readiness_fingerprint_sha256 !== SOURCE_READINESS_FINGERPRINT) {
    findings.push('dry_run_source_readiness_fingerprint_mismatch');
  }
  if (dryRun.dry_run_execution_status !== 'pkg10a_cracked_ice_finish_taxonomy_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.before_snapshot?.counts?.cracked_ice_active_rows !== 0) findings.push('dry_run_before_cracked_ice_not_absent');
  if (dryRun.after_snapshot?.counts?.cracked_ice_active_rows !== 0) findings.push('dry_run_after_cracked_ice_not_absent');
  if (dryRun.candidate_scope?.cracked_ice_candidate_rows !== 131) findings.push('dry_run_candidate_rows_not_131');
  if (dryRun.candidate_scope?.affected_sets !== 53) findings.push('dry_run_affected_sets_not_53');
  return findings;
}

function evaluateResult({ preApplyFindings, beforeSnapshot, afterSnapshot, proofRows }) {
  const findings = [...preApplyFindings];
  const proof = proofRows[0] ?? null;
  if (beforeSnapshot.counts.cracked_ice_rows !== 0) findings.push('before_snapshot_cracked_ice_already_exists');
  if (afterSnapshot.counts.cracked_ice_rows !== 1) findings.push('after_snapshot_cracked_ice_row_not_one');
  if (afterSnapshot.counts.cracked_ice_active_rows !== 1) findings.push('after_snapshot_cracked_ice_active_not_one');
  if (afterSnapshot.cracked_ice_row?.label !== 'Cracked Ice Holo') findings.push('after_snapshot_label_mismatch');
  if (afterSnapshot.cracked_ice_row?.sort_order !== 36) findings.push('after_snapshot_sort_order_mismatch');
  if (!proof) findings.push('commit_proof_row_missing');
  if (proof) {
    if (proof.package_id !== PACKAGE_ID) findings.push('commit_proof_package_id_mismatch');
    if (proof.source_readiness_fingerprint !== SOURCE_READINESS_FINGERPRINT) {
      findings.push('commit_proof_source_readiness_fingerprint_mismatch');
    }
    if (proof.package_fingerprint !== PACKAGE_FINGERPRINT) findings.push('commit_proof_fingerprint_mismatch');
    if (proof.finish_key !== 'cracked_ice') findings.push('commit_proof_finish_key_mismatch');
    if (proof.finish_label !== 'Cracked Ice Holo') findings.push('commit_proof_finish_label_mismatch');
    if (Number(proof.finish_sort_order) !== 36) findings.push('commit_proof_sort_order_mismatch');
    if (Number(proof.activated_finish_rows) !== 1) findings.push('commit_proof_activated_rows_not_one');
    if (Number(proof.cracked_ice_candidate_rows) !== 131) findings.push('commit_proof_candidate_rows_not_131');
  }
  return findings;
}

function renderMarkdown(report) {
  return `# PKG-10A Cracked Ice Finish Taxonomy Real Apply V1

Approved durable activation of \`cracked_ice\` in \`public.finish_keys\`.

## Result

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| rollback_sql_hash_sha256 | \`${report.rollback_sql_hash_sha256}\` |
| real_sql_hash_sha256 | \`${report.real_sql_hash_sha256}\` |
| before_cracked_ice_rows | ${report.before_snapshot.counts.cracked_ice_rows} |
| after_cracked_ice_rows | ${report.after_snapshot.counts.cracked_ice_rows} |
| after_cracked_ice_active_rows | ${report.after_snapshot.counts.cracked_ice_active_rows} |
| child_printing_inserts | ${report.child_printing_inserts} |
| parent_writes | ${report.parent_writes} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Commit Proof

\`\`\`json
${JSON.stringify(report.commit_proof_rows, null, 2)}
\`\`\`

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : 'None.'}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-10A Cracked Ice Finish Taxonomy Real Apply Checkpoint V1](20260610_pkg10a_cracked_ice_finish_taxonomy_real_apply_checkpoint_v1.md) | Records approved durable activation of cracked_ice finish key only; no child inserts, parent writes, migrations, or cleanup. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg10a_cracked_ice_finish_taxonomy_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg10a_cracked_ice_finish_taxonomy_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const rollbackSql = fs.readFileSync(dryRun.sql_artifact, 'utf8');
const realSql = buildRealApplySql(rollbackSql);
const preApplyFindings = validatePrerequisites({ gate, dryRun, rollbackSql, realSql });
if (preApplyFindings.length) {
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_real_apply_v1',
    package_id: PACKAGE_ID,
    apply_status: 'blocked_before_real_apply',
    pre_apply_findings: preApplyFindings,
    db_writes_performed: false,
    migrations_created: false,
  };
  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown({
    ...report,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    rollback_sql_hash_sha256: sha256(rollbackSql),
    real_sql_hash_sha256: sha256(realSql),
    before_snapshot: { counts: { cracked_ice_rows: 0 } },
    after_snapshot: { counts: { cracked_ice_rows: 0, cracked_ice_active_rows: 0 } },
    child_printing_inserts: false,
    parent_writes: false,
    stop_findings: preApplyFindings,
    commit_proof_rows: [],
  }));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeSnapshot;
  let afterSnapshot;
  let commitProofRows = [];
  let applyStatus = 'pkg10a_cracked_ice_finish_taxonomy_committed';
  let applyError = null;
  try {
    beforeSnapshot = await captureFinishSnapshot(client);
    const result = await client.query(realSql);
    commitProofRows = flattenQueryResults(result).filter((row) => row.package_id === PACKAGE_ID);
    afterSnapshot = await captureFinishSnapshot(client);
  } catch (error) {
    applyStatus = 'pkg10a_cracked_ice_finish_taxonomy_failed';
    applyError = error.message;
    await client.query('rollback').catch(() => {});
    afterSnapshot = await captureFinishSnapshot(client).catch(() => null);
  } finally {
    await client.end().catch(() => {});
  }

  const stopFindings = applyError
    ? ['real_apply_error_message_present']
    : evaluateResult({ preApplyFindings, beforeSnapshot, afterSnapshot, proofRows: commitProofRows });
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_real_apply_v1',
    package_id: PACKAGE_ID,
    apply_status: applyStatus,
    apply_error: applyError,
    approval_text_matched: true,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    source_readiness_fingerprint_sha256: SOURCE_READINESS_FINGERPRINT,
    rollback_sql_hash_sha256: sha256(rollbackSql),
    real_sql_hash_sha256: sha256(realSql),
    target_finish_key: {
      key: 'cracked_ice',
      label: 'Cracked Ice Holo',
      sort_order: 36,
      is_active: true,
    },
    candidate_printings_unlocked_later: 131,
    affected_sets: 53,
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    commit_proof_rows: commitProofRows,
    db_writes_performed: applyStatus === 'pkg10a_cracked_ice_finish_taxonomy_committed',
    durable_db_writes_performed: applyStatus === 'pkg10a_cracked_ice_finish_taxonomy_committed',
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    child_printing_inserts: false,
    parent_writes: false,
    deletes_or_merges: false,
    unsupported_cleanup_performed: false,
    global_apply_performed: false,
    stop_findings: stopFindings,
    pass: stopFindings.length === 0 && applyStatus === 'pkg10a_cracked_ice_finish_taxonomy_committed',
  };
  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeText(CHECKPOINT_MD, renderMarkdown(report));
  updateCheckpointIndex();
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    checkpoint_md: CHECKPOINT_MD,
    apply_status: report.apply_status,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    rollback_sql_hash_sha256: report.rollback_sql_hash_sha256,
    real_sql_hash_sha256: report.real_sql_hash_sha256,
    before_cracked_ice_rows: report.before_snapshot.counts.cracked_ice_rows,
    after_cracked_ice_rows: report.after_snapshot.counts.cracked_ice_rows,
    after_cracked_ice_active_rows: report.after_snapshot.counts.cracked_ice_active_rows,
    commit_proof_rows: report.commit_proof_rows,
    stop_findings: report.stop_findings,
    migrations_created: false,
    child_printing_inserts: false,
    parent_writes: false,
  }, null, 2));
  if (!report.pass) process.exitCode = 1;
}
