import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08h_external_mapping_collision_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08w_host_subset_collision_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08w_host_subset_collision_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08w_host_subset_collision_readiness_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08W-HOST-SUBSET-COLLISION-READINESS';

function readJsonSync(filePath) {
  return JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function printedNumber(value) {
  return normalizeNumber(value).toLowerCase();
}

function compactSetKey(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function classify(row) {
  const mapped = row.mapped_parent ?? {};
  const mappedSet = compactSetKey(mapped.set_code);
  const targetSet = compactSetKey(row.set_key);
  const mappedSetLabel = normalizeText(mapped.set_code);
  const targetSetLabel = normalizeText(row.set_key);
  const mappedPrintedNumber = printedNumber(mapped.number ?? mapped.card_number);
  const targetPrintedNumber = printedNumber(row.card_number);
  const mappedName = normalizeText(mapped.name);
  const targetName = normalizeText(row.card_name);
  const childFinishes = row.mapped_dependency_counts?.child_finishes ?? [];
  const uniqueChildFinishes = [...new Set(childFinishes.map((finish) => String(finish)))].sort();
  const targetFinishPresent = uniqueChildFinishes.includes(row.finish_key);
  const extraChildFinishes = uniqueChildFinishes.filter((finish) => finish !== row.finish_key);
  const samePrintedIdentity = Boolean(
    mappedName &&
    mappedName === targetName &&
    mappedPrintedNumber &&
    mappedPrintedNumber === targetPrintedNumber,
  );
  const hostSubsetAliasShape = (
    targetSet === 'swsh45' &&
    mappedSet === 'swsh45sv' &&
    samePrintedIdentity
  );

  let readiness_status = 'blocked_not_host_subset_alias_shape';
  let recommended_next_action = 'Do not write. This collision does not match the governed host/subset alias pattern.';
  let allowed_future_write_shape = 'none';

  if (hostSubsetAliasShape && targetFinishPresent && extraChildFinishes.length > 0) {
    readiness_status = 'blocked_host_subset_alias_candidate_with_extra_child_finishes';
    recommended_next_action = 'Prepare a separate non-write finish impact plan before any parent relocation; extra child finishes would move with the parent.';
    allowed_future_write_shape = 'read-only impact plan first, then guarded dry-run only if finish impact is resolved';
  } else if (hostSubsetAliasShape && targetFinishPresent) {
    readiness_status = 'host_subset_alias_relocation_candidate_clean';
    recommended_next_action = 'Eligible for a guarded parent set-code relocation dry-run after fresh collision and dependency checks.';
    allowed_future_write_shape = 'parent set_code/set_id update only, no child insert, no delete';
  } else if (hostSubsetAliasShape) {
    readiness_status = 'host_subset_alias_relocation_candidate_needs_child_finish_insert';
    recommended_next_action = 'Eligible only for guarded parent relocation plus child-finish insert dry-run after fresh dependency checks.';
    allowed_future_write_shape = 'parent set_code/set_id update plus one child insert, no delete';
  }

  return {
    readiness_status,
    recommended_next_action,
    allowed_future_write_shape,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    tcgdex_external_id: row.tcgdex_external_id,
    mapped_parent: mapped,
    mapped_child_finishes: uniqueChildFinishes,
    target_finish_present_on_mapped_parent: targetFinishPresent,
    extra_child_finishes_on_mapped_parent: extraChildFinishes,
    host_subset_alias_shape: hostSubsetAliasShape,
    same_printed_identity: samePrintedIdentity,
    comparison: {
      target_set: targetSetLabel || null,
      mapped_set: mappedSetLabel || null,
      target_set_compact: targetSet || null,
      mapped_set_compact: mappedSet || null,
      target_printed_number: targetPrintedNumber || null,
      mapped_printed_number: mappedPrintedNumber || null,
      target_name: row.card_name,
      mapped_name: mapped.name ?? null,
    },
    dependency_counts: row.mapped_dependency_counts ?? null,
    sources: row.sources ?? [],
    evidence_urls: row.evidence_urls ?? [],
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_readiness_status).map(([status, count]) => [
    status,
    count,
    report.summary.top_sets_by_readiness_status[status]?.map((row) => `${row.key}:${row.count}`).join(', ') ?? '',
  ]);
  const finishRows = Object.entries(report.summary.by_extra_child_finish_signature).map(([signature, count]) => [
    signature,
    count,
  ]);

  return `# PKG-08W Host/Subset Collision Readiness V1

Read-only readiness report for the current Shining Fates host/subset collision lane.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- classified_rows: ${report.summary.classified_rows}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- source_pkg08h_fingerprint_sha256: \`${report.source_pkg08h_fingerprint_sha256}\`

${markdownTable(['readiness_status', 'rows', 'top_sets'], statusRows)}

## Extra Child Finish Impact

${markdownTable(['extra_child_finish_signature', 'rows'], finishRows)}

## Decision

These rows are not insert candidates. They are host/subset alias collision candidates where the TCGdex mapping already points at a live parent in \`swsh45sv\`.

Automatic relocation is blocked because every candidate currently has extra child finishes on the mapped parent. Moving the parent without a finish-impact plan would also move those extra finishes into the target set.

## Guardrails

- This report is not write authority.
- No parent relocation is approved here.
- No child deletion, cleanup, quarantine, or unsupported-finish removal is approved here.
- Any future write requires a fresh rollback-only dry-run and exact operator approval.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08W Host/Subset Collision Readiness Checkpoint V1](20260610_pkg08w_host_subset_collision_readiness_checkpoint_v1.md) | Read-only classification of current swsh4.5 host/subset mapping collisions. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08w_host_subset_collision_readiness_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08w_host_subset_collision_readiness_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = readJsonSync(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.set_key === 'swsh4.5');
const rows = sourceRows.map(classify);
const byStatus = countBy(rows, (row) => row.readiness_status);
const topSetsByStatus = {};
for (const status of Object.keys(byStatus)) {
  topSetsByStatus[status] = Object.entries(countBy(rows.filter((row) => row.readiness_status === status), (row) => row.set_key))
    .map(([key, count]) => ({ key, count }));
}
const byExtraChildFinishSignature = countBy(rows, (row) => (
  row.extra_child_finishes_on_mapped_parent.length > 0
    ? row.extra_child_finishes_on_mapped_parent.join('+')
    : 'none'
));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08w_host_subset_collision_readiness_v1',
  package_id: PACKAGE_ID,
  source_pkg08h_fingerprint_sha256: source.source_strategy_fingerprint_sha256 ?? null,
  package_fingerprint_sha256: stableHash(rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    mapped_card_print_id: row.mapped_parent.card_print_id,
    readiness_status: row.readiness_status,
    mapped_child_finishes: row.mapped_child_finishes,
  }))),
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  summary: {
    source_rows: sourceRows.length,
    classified_rows: rows.length,
    by_readiness_status: byStatus,
    top_sets_by_readiness_status: topSetsByStatus,
    by_extra_child_finish_signature: byExtraChildFinishSignature,
    rows_with_extra_child_finishes: rows.filter((row) => row.extra_child_finishes_on_mapped_parent.length > 0).length,
    clean_relocation_candidates: byStatus.host_subset_alias_relocation_candidate_clean ?? 0,
  },
  recommended_next_package: {
    package_id: 'PKG-08X',
    scope: 'host_subset_alias_finish_impact_plan',
    candidate_rows: byStatus.blocked_host_subset_alias_candidate_with_extra_child_finishes ?? 0,
    status: (byStatus.blocked_host_subset_alias_candidate_with_extra_child_finishes ?? 0) > 0
      ? 'read_only_finish_impact_plan_required'
      : 'blocked_no_candidates',
    allowed_write_shape: 'none in this package',
  },
  rows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  summary: report.summary,
  recommended_next_package: report.recommended_next_package,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
