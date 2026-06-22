import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const FINAL_EXHAUSTION_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_final_evidence_exhaustion_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_post_exhaustion_execution_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_post_exhaustion_execution_plan_v1.md');
const BULK_GATE = path.join(ROOT, 'docs', 'checkpoints', 'master_index', '20260621_stamped_special_bulk_ready_real_apply_gate_checkpoint_v2.md');

const PACKAGE_SCOPE = {
  package_gate: 'STAMPED-SPECIAL-BULK-READY-PARENT-INSERTS',
  checkpoint: 'docs/checkpoints/master_index/20260621_stamped_special_bulk_ready_real_apply_gate_checkpoint_v2.md',
  parent_insert_scope: 78,
  active_identity_insert_scope: 78,
  child_printing_insert_scope: 79,
  finish_counts: {
    reverse: 65,
    normal: 6,
    holo: 7,
    cosmos: 1,
  },
  deletes: 0,
  merges: 0,
  migrations: 0,
};

const STATUS_GROUPS = {
  no_write_governance: new Set([
    'display_metadata_only_no_printing_write',
    'closed_stale_no_write',
    'generic_stamp_suppressed_no_write',
  ]),
  dependency_blocked: new Set([
    'base_parent_or_base_finish_blocked',
    'source_found_but_write_blocked',
  ]),
  evidence_blocked: new Set([
    'multi_source_variant_found_finish_unresolved',
    'variant_found_finish_unresolved',
    'source_exhausted_prize_pack_finish_mapping_blocked',
    'source_exhausted_league_exact_finish_needed',
    'source_exhausted_custom_stamp_exact_finish_needed',
    'source_exhausted_prerelease_exact_finish_needed',
    'source_exhausted_event_staff_exact_finish_needed',
    'source_exhausted_halloween_base_parent_or_finish_blocked',
    'source_exhausted_professor_program_exact_finish_needed',
    'source_exhausted_second_source_still_needed',
  ]),
  manual_adjudication: new Set([
    'manual_conflict_taxonomy_blocked',
  ]),
};

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function groupForStatus(status) {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if (statuses.has(status)) return group;
  }
  return 'manual_review';
}

function renderMarkdown(report) {
  const planRows = report.execution_plan.map((row) => [
    row.sequence,
    row.lane,
    row.row_count,
    row.write_allowed_now ? 'approval required' : 'no',
    row.next_action,
  ]);
  const statusRows = Object.entries(report.summary.by_final_status).map(([status, count]) => [status, count]);
  const groupRows = Object.entries(report.summary.by_execution_group).map(([group, count]) => [group, count]);

  return `# English Master Index Stamped/Special Post-Exhaustion Execution Plan V1

Generated: ${report.generated_at}

This is audit-only. It performs no DB writes, no migrations, no apply, no cleanup, and no quarantine.

## Summary

- final_exhaustion_fingerprint: \`${report.inputs.final_exhaustion_fingerprint_sha256}\`
- classified_residual_rows: ${report.summary.classified_residual_rows}
- immediate_write_package_available: ${report.summary.immediate_write_package_available}
- residual_rows_write_ready_now: ${report.summary.residual_rows_write_ready_now}
- migrations_created: ${report.safety.migrations_created}
- db_writes_performed: ${report.safety.db_writes_performed}

## Execution Plan

${markdownTable(['sequence', 'lane', 'rows', 'write now?', 'next action'], planRows)}

## Prepared Package Boundary

\`\`\`text
${report.prepared_package.checkpoint}
\`\`\`

- parent_insert_scope: ${report.prepared_package.parent_insert_scope}
- active_identity_insert_scope: ${report.prepared_package.active_identity_insert_scope}
- child_printing_insert_scope: ${report.prepared_package.child_printing_insert_scope}
- deletes: ${report.prepared_package.deletes}
- merges: ${report.prepared_package.merges}
- migrations: ${report.prepared_package.migrations}

## Residual Groups

${markdownTable(['group', 'count'], groupRows)}

## Residual Final Status Counts

${markdownTable(['final_status', 'count'], statusRows)}

## Operator Boundary

Do not apply the prepared package unless the exact approval phrase in the V2 gate checkpoint is provided.

Do not build new write packages for residual rows until their blockers are resolved with exact evidence.
`;
}

async function main() {
  const final = await readJson(FINAL_EXHAUSTION_JSON);
  const rows = final.rows ?? [];
  const classified = rows.map((row) => ({ ...row, execution_group: groupForStatus(row.final_status) }));
  const byGroup = countBy(classified, (row) => row.execution_group);

  const executionPlan = [
    {
      sequence: 1,
      lane: 'prepared_bulk_parent_identity_package',
      row_count: PACKAGE_SCOPE.child_printing_insert_scope,
      write_allowed_now: false,
      checkpoint: PACKAGE_SCOPE.checkpoint,
      next_action: 'Requires exact operator approval phrase from V2 gate before any DB write.',
    },
    {
      sequence: 2,
      lane: 'display_metadata_only',
      row_count: byGroup.no_write_governance ?? 0,
      write_allowed_now: false,
      next_action: 'Keep out of child printings; model later as product/display metadata if desired.',
    },
    {
      sequence: 3,
      lane: 'dependency_blocked_rows',
      row_count: byGroup.dependency_blocked ?? 0,
      write_allowed_now: false,
      next_action: 'Resolve base parent/base finish/existing-parent dependency before any write package.',
    },
    {
      sequence: 4,
      lane: 'evidence_blocked_rows',
      row_count: byGroup.evidence_blocked ?? 0,
      write_allowed_now: false,
      next_action: 'Needs new exact source family or physical proof binding variant/stamp to active finish.',
    },
    {
      sequence: 5,
      lane: 'manual_adjudication_rows',
      row_count: byGroup.manual_adjudication ?? 0,
      write_allowed_now: false,
      next_action: 'Human taxonomy/event-label adjudication required before dry-run.',
    },
  ];

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_post_exhaustion_execution_plan_v1',
    inputs: {
      final_exhaustion_report: rel(FINAL_EXHAUSTION_JSON),
      final_exhaustion_fingerprint_sha256: final.fingerprint_sha256,
      bulk_gate_checkpoint_v2: rel(BULK_GATE),
      bulk_gate_checkpoint_v2_exists: await exists(BULK_GATE),
    },
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
    },
    prepared_package: PACKAGE_SCOPE,
    execution_plan: executionPlan,
    summary: {
      classified_residual_rows: rows.length,
      immediate_write_package_available: true,
      residual_rows_write_ready_now: 0,
      by_execution_group: byGroup,
      by_final_status: final.summary?.by_final_status ?? countBy(classified, (row) => row.final_status),
      by_action_bucket: final.summary?.by_action_bucket ?? countBy(classified, (row) => row.action_bucket),
    },
    rows: classified.map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      action_bucket: row.action_bucket,
      final_status: row.final_status,
      execution_group: row.execution_group,
      next_action: row.next_action,
    })),
  };

  report.fingerprint_sha256 = sha256(stableJson({
    inputs: report.inputs,
    prepared_package: report.prepared_package,
    summary: report.summary,
    rows: report.rows,
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
