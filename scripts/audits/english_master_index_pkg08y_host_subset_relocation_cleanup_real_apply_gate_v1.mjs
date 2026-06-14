import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_real_apply_gate_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_real_apply_gate_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08y_host_subset_relocation_cleanup_real_apply_gate_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08Y-HOST-SUBSET-RELOCATION-CLEANUP';

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

function renderMarkdown(report) {
  const gateRows = Object.entries(report.gates).map(([gate, value]) => [gate, value]);
  return `# PKG-08Y Host/Subset Relocation Cleanup Real Apply Gate V1

No-write gate for the PKG-08Y real apply boundary.

## Status

- approval_gate_status: ${report.approval_gate_status}
- real_apply_authorized: ${report.real_apply_authorized}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}

## Gates

${markdownTable(['gate', 'value'], gateRows)}

## Approval Text

\`\`\`text
${report.recommended_real_apply_approval_text ?? 'BLOCKED'}
\`\`\`
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08Y Host/Subset Relocation Cleanup Real Apply Gate Checkpoint V1](20260610_pkg08y_host_subset_relocation_cleanup_real_apply_gate_checkpoint_v1.md) | No-write real-apply gate for swsh45sv -> swsh4.5 relocation cleanup. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08y_host_subset_relocation_cleanup_real_apply_gate_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08y_host_subset_relocation_cleanup_real_apply_gate_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const gates = {
  dry_run_passed: source.pass === true,
  stop_findings_zero: (source.stop_findings ?? []).length === 0,
  rollback_hash_matched: source.durable_after_snapshot_matches_before_snapshot === true,
  parent_relocations_25: source.scope?.parent_relocations === 25,
  normal_children_preserved_25: source.scope?.normal_children_preserved === 25,
  extra_child_delete_simulation_50: source.scope?.extra_child_delete_simulation === 50,
  durable_db_writes_performed_false: source.durable_db_writes_performed === false,
  migrations_created_false: source.migrations_created === false,
};
const gatePass = Object.values(gates).every(Boolean);
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08y_host_subset_relocation_cleanup_real_apply_gate_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: source.package_fingerprint_sha256 ?? null,
  source_dry_run_status: source.dry_run_status ?? null,
  approval_gate_status: gatePass
    ? 'ready_for_real_apply_operator_decision_apply_blocked_no_write'
    : 'blocked_gate_failed_no_write',
  real_apply_authorized: false,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  gates,
  recommended_real_apply_approval_text: gatePass ? source.recommended_real_apply_approval_text : null,
  source_summary: {
    parent_relocations: source.scope?.parent_relocations ?? 0,
    normal_children_preserved: source.scope?.normal_children_preserved ?? 0,
    extra_child_delete_simulation: source.scope?.extra_child_delete_simulation ?? 0,
    extra_child_deletes_by_finish: source.scope?.extra_child_deletes_by_finish ?? {},
    before_hash: source.before_snapshot?.hash_sha256 ?? null,
    after_hash: source.after_snapshot?.hash_sha256 ?? null,
  },
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
  output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
  checkpoint_md: path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  approval_gate_status: report.approval_gate_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));

if (!gatePass) process.exitCode = 1;
