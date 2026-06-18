import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'special_variant_discovery_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'wb_kids_stamp_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'wb_kids_stamp_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'wb_kids_stamp_real_apply_gate_v1.md');

const PACKAGE_ID = 'SPECIAL-VAR-02-WB-KIDS-PROMO-STAMP-PARENT-INSERTS';
const EXPECTED_PACKAGE_FINGERPRINT = 'd6793a662528ecd9fc7a2bec19244da24da7a06df8a820b4c35c50c1d56102fc';
const EXPECTED_SQL_HASH = 'cf6539d044a889f51db702da396cbdb813a9b7c9251c44a06b378b52b725752c';
const EXPECTED_DRY_RUN_PROOF = '1ea619a0eed2b267ab92ad780d270cbab5eaf2d6811a99f2cf13a06db7f9f17e';
const EXPECTED_PRE_APPLY_HASH = '3334b32c58f50feb80baf86239009e387d56ee8634c52de235500ba17d3fe20c';
const EXPECTED_TARGET_COUNT = 9;

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function validateDryRun(dryRun) {
  const findings = [];
  const counts = dryRun.execution?.simulated_write_counts ?? {};
  const proof = dryRun.execution?.proof ?? {};

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (dryRun.sql_hash_sha256 !== EXPECTED_SQL_HASH) findings.push('sql_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'wb_kids_stamp_parent_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('stop_findings_present');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('before_snapshot_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('after_rollback_snapshot_hash_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_pass_not_true');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  if ((dryRun.scope?.targets ?? []).length !== EXPECTED_TARGET_COUNT) findings.push('target_count_mismatch');
  if (dryRun.scope?.by_set?.basep !== EXPECTED_TARGET_COUNT) findings.push('set_scope_mismatch');
  if (dryRun.scope?.by_finish?.normal !== EXPECTED_TARGET_COUNT) findings.push('finish_scope_mismatch');
  if (dryRun.scope?.by_variant?.wb_kids_stamp !== 4) findings.push('wb_kids_stamp_scope_mismatch');
  if (dryRun.scope?.by_variant?.inverted_wb_kids_stamp !== 4) findings.push('inverted_wb_kids_stamp_scope_mismatch');
  if (dryRun.scope?.by_variant?.missing_wb_kids_stamp !== 1) findings.push('missing_wb_kids_stamp_scope_mismatch');
  if (counts.parent_inserts !== EXPECTED_TARGET_COUNT) findings.push('parent_insert_count_mismatch');
  if (counts.identity_inserts !== EXPECTED_TARGET_COUNT) findings.push('identity_insert_count_mismatch');
  if (counts.child_inserts !== EXPECTED_TARGET_COUNT) findings.push('child_insert_count_mismatch');
  if (counts.deletes !== 0 || counts.merges !== 0) findings.push('delete_or_merge_scope_present');
  if (proof.target_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_target_count_mismatch');
  if (proof.inserted_parent_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_parent_count_mismatch');
  if (proof.inserted_identity_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_identity_count_mismatch');
  if (proof.inserted_child_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_child_count_mismatch');
  if (proof.forbidden_stamped_child_rows !== 0) findings.push('forbidden_stamped_child_present');

  for (const row of dryRun.scope?.targets ?? []) {
    if (row.set_key !== 'basep') findings.push(`target_set_mismatch:${row.card_number}`);
    if (!['wb_kids_stamp', 'inverted_wb_kids_stamp', 'missing_wb_kids_stamp'].includes(row.target_variant_key)) {
      findings.push(`target_variant_mismatch:${row.card_number}:${row.target_variant_key}`);
    }
    if (row.target_finish_key !== 'normal') findings.push(`target_finish_mismatch:${row.card_number}`);
    if (!row.target_parent_id || !row.target_child_id || !row.base_parent_id) findings.push(`target_missing_ids:${row.card_number}`);
  }

  return findings;
}

function approvalText(dryRun) {
  const dryRunProof = `${dryRun.execution.before_snapshot.hash_sha256} == ${dryRun.execution.after_rollback_snapshot.hash_sha256}`;
  return `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${EXPECTED_PACKAGE_FINGERPRINT}. SQL hash: ${EXPECTED_SQL_HASH}. Scope: 9 WB Kids promo special-case parent inserts, 9 active identity inserts, 9 normal child printing inserts; set basep/Wizards Black Star Promos; variants wb_kids_stamp=4, inverted_wb_kids_stamp=4, missing_wb_kids_stamp=1. Dry-run proof: ${dryRunProof}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`;
}

function renderMarkdown(report) {
  return `# WB Kids Promo Stamp Real Apply Gate V1

This is an apply gate only. It does not write to the database.

## Gate

- pass: ${report.pass}
- gate_fingerprint_sha256: \`${report.gate_fingerprint_sha256}\`
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- sql_hash_sha256: \`${report.sql_hash_sha256}\`
- dry_run_proof_sha256: \`${report.dry_run_proof_sha256}\`
- findings: ${report.findings.length}

## Scope

${markdownTable(['metric', 'value'], Object.entries(report.scope).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]))}

## Required Approval Text

\`\`\`text
${report.required_approval_text}
\`\`\`
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const findings = validateDryRun(dryRun);
  const requiredApprovalText = findings.length === 0 ? approvalText(dryRun) : 'No real apply approval recommended; dry-run gate did not pass.';
  const report = {
    generated_at: new Date().toISOString(),
    version: 'wb_kids_stamp_real_apply_gate_v1',
    mode: 'apply_gate_only_no_writes',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
    sql_hash_sha256: EXPECTED_SQL_HASH,
    dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
    source_artifact: rel(DRY_RUN_JSON),
    pass: findings.length === 0,
    findings,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    scope: {
      target_rows: dryRun.scope?.target_rows ?? 0,
      parent_inserts: dryRun.execution?.simulated_write_counts?.parent_inserts ?? 0,
      identity_inserts: dryRun.execution?.simulated_write_counts?.identity_inserts ?? 0,
      child_inserts: dryRun.execution?.simulated_write_counts?.child_inserts ?? 0,
      by_set: dryRun.scope?.by_set ?? {},
      by_finish: dryRun.scope?.by_finish ?? {},
      by_variant: dryRun.scope?.by_variant ?? {},
    },
    required_approval_text: requiredApprovalText,
  };
  report.gate_fingerprint_sha256 = sha256(stableJson({
    package_id: report.package_id,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    sql_hash_sha256: report.sql_hash_sha256,
    dry_run_proof_sha256: report.dry_run_proof_sha256,
    scope: report.scope,
    findings: report.findings,
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    pass: report.pass,
    gate_fingerprint_sha256: report.gate_fingerprint_sha256,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    sql_hash_sha256: report.sql_hash_sha256,
    findings: report.findings,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
