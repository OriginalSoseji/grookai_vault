import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'special_variant_discovery_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'jungle_no_symbol_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'jungle_no_symbol_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'jungle_no_symbol_real_apply_gate_v1.md');

const PACKAGE_ID = 'SPECIAL-VAR-01-JUNGLE-NO-SYMBOL-PARENT-INSERTS';
const EXPECTED_PACKAGE_FINGERPRINT = 'd5a01e1ae21d3ef6f007dae9efe4485a8a6b57c88e9d57da6fd99ae0b70993f6';
const EXPECTED_SQL_HASH = '0d7bed6961ea56fa760bbda32133ebf0bdfc232820143bf586db24d2d2ce306a';
const EXPECTED_DRY_RUN_PROOF = '59ff65e4ef4f45afe1ef7425b2880b8e41f7e4ec9bf4053761854e46123965cc';
const EXPECTED_PRE_APPLY_HASH = '7f67f088b80af2058324230a7d0b1987fbdf3819e42ff658fdb56cb3852c9970';
const EXPECTED_TARGET_COUNT = 16;

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
  if (dryRun.execution?.dry_run_status !== 'jungle_no_symbol_parent_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('stop_findings_present');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('before_snapshot_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('after_rollback_snapshot_hash_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_pass_not_true');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  if ((dryRun.scope?.targets ?? []).length !== EXPECTED_TARGET_COUNT) findings.push('target_count_mismatch');
  if (dryRun.scope?.by_set?.base2 !== EXPECTED_TARGET_COUNT) findings.push('set_scope_mismatch');
  if (dryRun.scope?.by_finish?.holo !== EXPECTED_TARGET_COUNT) findings.push('finish_scope_mismatch');
  if (dryRun.scope?.by_variant?.no_symbol_error !== EXPECTED_TARGET_COUNT) findings.push('variant_scope_mismatch');
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
    if (row.set_key !== 'base2') findings.push(`target_set_mismatch:${row.card_number}`);
    if (row.target_variant_key !== 'no_symbol_error') findings.push(`target_variant_mismatch:${row.card_number}`);
    if (row.target_printed_identity_modifier !== 'recognized_error:no_jungle_symbol') findings.push(`target_modifier_mismatch:${row.card_number}`);
    if (row.target_finish_key !== 'holo') findings.push(`target_finish_mismatch:${row.card_number}`);
    if (!row.target_parent_id || !row.target_child_id || !row.base_parent_id) findings.push(`target_missing_ids:${row.card_number}`);
  }

  return findings;
}

function approvalText(dryRun) {
  const dryRunProof = `${dryRun.execution.before_snapshot.hash_sha256} == ${dryRun.execution.after_rollback_snapshot.hash_sha256}`;
  return `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${EXPECTED_PACKAGE_FINGERPRINT}. SQL hash: ${EXPECTED_SQL_HASH}. Scope: 16 Jungle No Symbol recognized-error parent inserts, 16 active identity inserts, 16 holo child printing inserts; set base2/Jungle; variant_key=no_symbol_error; printed_identity_modifier=recognized_error:no_jungle_symbol. Dry-run proof: ${dryRunProof}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`;
}

function renderMarkdown(report) {
  return `# Jungle No Symbol Real Apply Gate V1

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
    version: 'jungle_no_symbol_real_apply_gate_v1',
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
