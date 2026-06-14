import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_town_store_stamped_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_town_store_stamped_child_insert_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_sv03_town_store_stamped_child_insert_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260612_sv03_town_store_stamped_child_insert_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'SV03-TOWN-STORE-STAMPED-CHILD-INSERT';

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

function renderMarkdown(report) {
  return `# SV03 Town Store Stamped Child Insert Real Apply Gate V1

This is a no-write real-apply gate. It records the exact approval boundary and does not perform durable writes.

| Field | Value |
| --- | --- |
| approval_gate_status | ${report.approval_gate_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| target_child_inserts | ${report.package_scope.target_child_inserts} |
| target_parent_writes | ${report.package_scope.target_parent_writes} |
| target_identity_writes | ${report.package_scope.target_identity_writes} |
| target_deletes | ${report.package_scope.target_deletes} |
| approval_recorded | ${report.approval_recorded} |
| apply_allowed | ${report.apply_allowed} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Required Approval

\`\`\`text
${report.required_operator_decision.exact_approval_phrase_required}
\`\`\`

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : 'None.'}

## Boundary

This gate only covers one child printing insert: Town Store #196 Play Pokemon stamped parent, finish cosmos. It does not authorize parent writes, identity writes, deletes, merges, cleanup, quarantine, migrations, or global apply.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-12 | [SV03 Town Store Stamped Child Insert Real Apply Gate Checkpoint V1](20260612_sv03_town_store_stamped_child_insert_real_apply_gate_checkpoint_v1.md) | Records no-write real-apply gate for one Town Store stamped cosmos child insert. No parent writes, identity writes, deletes, migrations, cleanup, or quarantine. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260612_sv03_town_store_stamped_child_insert_real_apply_gate_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260612_sv03_town_store_stamped_child_insert_real_apply_gate_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const beforeHash = dryRun.before_snapshot?.hash_sha256 ?? null;
const afterHash = dryRun.after_snapshot?.hash_sha256 ?? null;
const targets = dryRun.targets ?? [];
const findings = [];

if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
if (!dryRun.package_fingerprint_sha256) findings.push('dry_run_missing_package_fingerprint');
if (dryRun.dry_run_status !== 'sv03_town_store_stamped_child_insert_completed_rolled_back_no_durable_change') {
  findings.push('dry_run_not_passed');
}
if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_before_after_hash_mismatch');
if (beforeHash !== dryRun.dry_run_proof_hash || afterHash !== dryRun.dry_run_proof_hash) findings.push('dry_run_proof_hash_mismatch');
if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
if (dryRun.cleanup_performed !== false) findings.push('dry_run_reports_cleanup');
if (dryRun.quarantine_performed !== false) findings.push('dry_run_reports_quarantine');
if (dryRun.summary?.target_rows !== 1) findings.push('target_rows_not_1');
if (dryRun.summary?.child_inserts_simulated !== 1) findings.push('child_inserts_not_1');
if (dryRun.summary?.parent_writes_simulated !== 0) findings.push('parent_writes_not_0');
if (dryRun.summary?.identity_writes_simulated !== 0) findings.push('identity_writes_not_0');
if (dryRun.summary?.deletes_simulated !== 0) findings.push('deletes_not_0');
if (dryRun.summary?.merges_simulated !== 0) findings.push('merges_not_0');
if (targets.length !== 1) findings.push('target_count_not_1');
if (targets.some((row) => row.set_key !== 'sv03')) findings.push('non_sv03_target_present');
if (targets.some((row) => row.card_name !== 'Town Store' || row.card_number !== '196')) findings.push('non_town_store_target_present');
if (targets.some((row) => row.target_variant_key !== 'play_pokemon_stamp')) findings.push('non_play_pokemon_stamp_target_present');
if (targets.some((row) => row.target_finish_key !== 'cosmos')) findings.push('non_cosmos_target_present');
if (targets.some((row) => row.evidence_tier !== 'multi_lane')) findings.push('non_multi_lane_target_present');
if (dryRun.recommended_real_apply_approval_text?.includes('parent writes=0, identity writes=0, deletes=0, merges=0') !== true) {
  findings.push('approval_text_missing_no_parent_identity_delete_merge_boundary');
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_sv03_town_store_stamped_child_insert_real_apply_gate_v1',
  audit_only: true,
  approval_gate_only: true,
  real_apply_gate_only: true,
  db_reads_performed: false,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  approval_recorded: false,
  apply_allowed: false,
  write_ready_now: 0,
  approval_gate_status: findings.length === 0
    ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
    : 'blocked_before_real_apply_operator_decision',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    source_collision_audit_fingerprint: dryRun.source_collision_audit_fingerprint,
    target_child_inserts: dryRun.summary?.child_inserts_simulated ?? null,
    target_parent_writes: dryRun.summary?.parent_writes_simulated ?? null,
    target_identity_writes: dryRun.summary?.identity_writes_simulated ?? null,
    target_deletes: dryRun.summary?.deletes_simulated ?? null,
    target_merges: dryRun.summary?.merges_simulated ?? null,
    update_scope: 'existing_stamped_parent_child_printing_insert_only',
    parent_writes_allowed: false,
    identity_writes_allowed: false,
    deletes_allowed: false,
    merges_allowed: false,
    unsupported_cleanup_allowed: false,
    quarantine_allowed: false,
    global_apply_allowed: false,
  },
  dry_run_proof: {
    dry_run_status: dryRun.dry_run_status,
    before_hash_sha256: beforeHash,
    after_hash_sha256: afterHash,
    durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
    transient_after_snapshot_differs_from_before_snapshot: dryRun.transient_after_snapshot_differs_from_before_snapshot,
  },
  source_artifacts: {
    guarded_dry_run_execution: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    source_collision_audit: dryRun.source_artifact,
  },
  required_operator_decision: {
    decision_needed: true,
    exact_approval_phrase_required: dryRun.recommended_real_apply_approval_text,
  },
  stop_findings: findings,
  pass: findings.length === 0,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint_md: path.relative(ROOT, CHECKPOINT_MD),
  approval_gate_status: report.approval_gate_status,
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  target_child_inserts: report.package_scope.target_child_inserts,
  before_hash_sha256: beforeHash,
  after_hash_sha256: afterHash,
  stop_findings: report.stop_findings.length,
  required_approval: report.required_operator_decision.exact_approval_phrase_required,
}, null, 2));

if (!report.pass) process.exitCode = 1;
