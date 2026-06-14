import crypto from 'node:crypto';
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
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const SAME_FINISH_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15i_stamped_same_finish_ambiguous_adjudication_v1.json');
const MANUAL_WEB_JSON = path.join(SOURCE_DIR, 'manual_web_stamped_finish_review_v1', 'manual_web_stamped_finish_review_v1.json');
const MANUAL_SPLIT_JSON = path.join(SOURCE_DIR, 'manual_web_same_finish_split_review_v1', 'manual_web_same_finish_split_review_v1.json');
const POST_APPLY_JSON_FILES = [
  path.join(AUDIT_DIR, 'english_master_index_pkg15o_post_apply_reconciliation_v1.json'),
  path.join(AUDIT_DIR, 'english_master_index_pkg15p_post_apply_reconciliation_v1.json'),
  path.join(AUDIT_DIR, 'english_master_index_pkg16f_post_apply_reconciliation_v1.json'),
];
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg16b_same_finish_stamped_split_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg16b_same_finish_stamped_split_readiness_v1.md');

const PACKAGE_ID = 'PKG-16B-SAME-FINISH-STAMPED-SPLIT-READINESS';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
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
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function keyFor({ set_key, card_number, card_name, variant_key, finish_key }) {
  return [
    normalizeText(set_key),
    normalizeNumber(card_number),
    normalizeText(card_name),
    normalizeText(variant_key),
    normalizeText(finish_key),
  ].join('|');
}

function variantFromLabel(label) {
  const lower = normalizeText(label);
  if (/battle academy/.test(lower)) return { variant_key: 'battle_academy_deck_mark', stamp_label: 'Battle Academy Deck Mark', strategy: 'display_metadata' };
  if (/staff/.test(lower) && /regional championships/.test(lower)) return { variant_key: 'regional_championships_staff_stamp', stamp_label: 'Regional Championships Staff Stamp', strategy: 'canonical_parent' };
  if (/regional championships/.test(lower)) return { variant_key: 'regional_championships_stamp', stamp_label: 'Regional Championships Stamp', strategy: 'canonical_parent' };
  if (/staff/.test(lower) && /states championships/.test(lower)) return { variant_key: 'states_championships_staff_stamp', stamp_label: 'States Championships Staff Stamp', strategy: 'canonical_parent' };
  if (/states championships/.test(lower)) return { variant_key: 'states_championships_stamp', stamp_label: 'States Championships Stamp', strategy: 'canonical_parent' };
  if (/staff/.test(lower) && /city championships/.test(lower)) return { variant_key: 'city_championships_staff_stamp', stamp_label: 'City Championships Staff Stamp', strategy: 'canonical_parent' };
  if (/city championships/.test(lower)) return { variant_key: 'city_championships_stamp', stamp_label: 'City Championships Stamp', strategy: 'canonical_parent' };
  if (/staff/.test(lower) && /national championships/.test(lower)) return { variant_key: 'national_championships_staff_stamp', stamp_label: 'National Championships Staff Stamp', strategy: 'canonical_parent' };
  if (/national championships/.test(lower)) return { variant_key: 'national_championships_stamp', stamp_label: 'National Championships Stamp', strategy: 'canonical_parent' };
  if (/staff/.test(lower) && /europe championships/.test(lower)) return { variant_key: 'europe_championships_staff_stamp', stamp_label: 'Europe Championships Staff Stamp', strategy: 'canonical_parent' };
  if (/staff/.test(lower) && /oceania championships/.test(lower)) return { variant_key: 'oceania_championships_staff_stamp', stamp_label: 'Oceania Championships Staff Stamp', strategy: 'canonical_parent' };
  if (/staff/.test(lower) && /league/.test(lower)) return { variant_key: 'league_staff_stamp', stamp_label: 'League Staff Stamp', strategy: 'canonical_parent' };
  if (/league/.test(lower)) return { variant_key: 'league_stamp', stamp_label: 'League Stamp', strategy: 'canonical_parent' };
  if (/staff/.test(lower) && /prerelease/.test(lower)) return { variant_key: 'staff_prerelease_stamp', stamp_label: 'Staff Prerelease Stamp', strategy: 'canonical_parent' };
  if (/gamestop/.test(lower)) return { variant_key: 'gamestop_stamp', stamp_label: 'GameStop Stamp', strategy: 'canonical_parent' };
  if (/eb games/.test(lower)) return { variant_key: 'eb_games_stamp', stamp_label: 'EB Games Stamp', strategy: 'canonical_parent' };
  return { variant_key: null, stamp_label: null, strategy: 'unmapped_label' };
}

function sourceRowsFromAmbiguous(row) {
  const labels = row.source_variant_labels ?? [];
  const urls = row.source_urls ?? [];
  const titles = row.source_titles ?? labels;
  return labels.map((label, index) => {
    const mapped = variantFromLabel(label);
    return {
      source_key: 'pokecardvalues_same_finish_ambiguous',
      source_kind: 'collector_reference',
      source_url: urls[index] ?? null,
      source_title: titles[index] ?? label,
      source_variant_label: label,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.target_finish_key,
      ...mapped,
    };
  });
}

function manualSupportFor(candidate, manualRows) {
  return manualRows.filter((row) => keyFor({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.expanded_variant_key ?? row.variant_key,
    finish_key: row.finish_key,
  }) === keyFor(candidate));
}

function conflictFor(candidate, conflictRows) {
  return conflictRows.filter((row) => (
    normalizeText(row.set_key) === normalizeText(candidate.set_key)
    && normalizeNumber(row.card_number) === normalizeNumber(candidate.card_number)
    && normalizeText(row.card_name) === normalizeText(candidate.card_name)
    && normalizeText(row.expanded_variant_key ?? row.variant_key) === normalizeText(candidate.variant_key)
    && normalizeText(row.current_pkg15k_finish_key ?? row.current_pkg16b_finish_key) === normalizeText(candidate.finish_key)
  ));
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const remainingRows = report.rows
    .filter((row) => row.status !== 'already_applied_verified')
    .slice(0, 80)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key ?? '',
      row.finish_key,
      row.source_count,
      row.status,
    ]);

  return `# PKG-16B Same-Finish Stamped Split Readiness V1

Audit-only split-readiness report for stamped rows where one card has multiple exact source labels sharing the same active finish.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- ambiguous_source_rows: ${report.summary.ambiguous_source_rows}
- split_candidate_rows: ${report.summary.split_candidate_rows}
- already_applied_verified: ${report.summary.already_applied_verified}
- second_source_needed: ${report.summary.second_source_needed}
- conflict_blocked: ${report.summary.conflict_blocked}
- metadata_strategy_blocked: ${report.summary.metadata_strategy_blocked}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Remaining Split Candidates

${remainingRows.length ? markdownTable(['set', 'number', 'name', 'variant', 'finish', 'sources', 'status'], remainingRows) : 'No remaining unapplied split candidates.'}
`;
}

async function main() {
  const [sameFinish, manualWeb, manualSplit, postApplyReports] = await Promise.all([
    readJson(SAME_FINISH_JSON),
    readJsonIfExists(MANUAL_WEB_JSON, { rows: [], conflict_review_rows: [] }),
    readJsonIfExists(MANUAL_SPLIT_JSON, { rows: [], conflict_review_rows: [] }),
    Promise.all(POST_APPLY_JSON_FILES.map((filePath) => readJsonIfExists(filePath, { rows: [] }))),
  ]);
  const manualRows = [
    ...(manualWeb.rows ?? []),
    ...(manualSplit.rows ?? []).filter((row) => row.match_status === 'exact_pkg16b_match'),
  ];
  const manualConflictRows = [
    ...(manualWeb.conflict_review_rows ?? []),
    ...(manualSplit.conflict_review_rows ?? []),
  ];
  const appliedKeys = new Set(postApplyReports.flatMap((report) => report.rows ?? [])
    .filter((row) => row.reconciliation_status === 'verified_after_apply')
    .map((row) => keyFor({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.target_variant_key,
      finish_key: row.target_finish_key,
    })));
  const candidates = (sameFinish.rows ?? []).flatMap(sourceRowsFromAmbiguous);
  const rows = candidates.map((candidate) => {
    const supportingManualRows = manualSupportFor(candidate, manualRows);
    const conflictRows = conflictFor(candidate, manualConflictRows);
    const sourceRows = [
      {
        source_key: candidate.source_key,
        source_kind: candidate.source_kind,
        source_url: candidate.source_url,
        evidence_label: candidate.source_title,
      },
      ...supportingManualRows.map((row) => ({
        source_key: row.source_key,
        source_kind: row.source_kind,
        source_url: row.source_url,
        evidence_label: row.evidence_label,
      })),
    ];
    const rowKey = keyFor(candidate);
    let status = 'blocked_second_independent_source_needed';
    if (appliedKeys.has(rowKey)) status = 'already_applied_verified';
    else if (candidate.strategy === 'display_metadata') status = 'blocked_battle_academy_display_metadata_strategy';
    else if (!candidate.variant_key) status = 'blocked_unmapped_source_label';
    else if (conflictRows.length > 0) status = 'blocked_conflicting_finish_observation';
    else if (sourceRows.length >= 2) status = 'ready_for_future_guarded_split_insert';

    return {
      set_key: candidate.set_key,
      set_name: candidate.set_name,
      card_number: candidate.card_number,
      card_name: candidate.card_name,
      variant_key: candidate.variant_key,
      stamp_label: candidate.stamp_label,
      finish_key: candidate.finish_key,
      source_variant_label: candidate.source_variant_label,
      status,
      source_count: sourceRows.length,
      source_rows: sourceRows,
      conflict_rows: conflictRows,
      write_ready_now: 0,
    };
  });
  const payload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    finish_key: row.finish_key,
    source_count: row.source_count,
    status: row.status,
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg16b_same_finish_stamped_split_readiness_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      same_finish_ambiguous_adjudication: path.relative(ROOT, SAME_FINISH_JSON).replaceAll('\\', '/'),
      manual_web_stamped_finish_review: path.relative(ROOT, MANUAL_WEB_JSON).replaceAll('\\', '/'),
      manual_web_same_finish_split_review: path.relative(ROOT, MANUAL_SPLIT_JSON).replaceAll('\\', '/'),
      post_apply_reconciliations: POST_APPLY_JSON_FILES.map((filePath) => path.relative(ROOT, filePath).replaceAll('\\', '/')),
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      ambiguous_source_rows: sameFinish.summary?.reviewed_rows ?? 0,
      split_candidate_rows: rows.length,
      already_applied_verified: rows.filter((row) => row.status === 'already_applied_verified').length,
      second_source_needed: rows.filter((row) => row.status === 'blocked_second_independent_source_needed').length,
      conflict_blocked: rows.filter((row) => row.status === 'blocked_conflicting_finish_observation').length,
      metadata_strategy_blocked: rows.filter((row) => row.status === 'blocked_battle_academy_display_metadata_strategy').length,
      ready_for_future_guarded_split_insert: rows.filter((row) => row.status === 'ready_for_future_guarded_split_insert').length,
      by_status: countBy(rows, (row) => row.status),
      by_finish_key: countBy(rows, (row) => row.finish_key),
      by_variant_key: countBy(rows, (row) => row.variant_key ?? 'unmapped'),
    },
    governance: {
      rule: 'Do not collapse multiple source variant labels into one generic stamped parent. Each exact label must either map to its own deterministic variant key or remain blocked.',
      apply_boundary: 'Rows marked ready_for_future_guarded_split_insert still require a separate DB-readiness and rollback-only dry-run package before any real apply.',
      forbidden: [
        'finish_key=stamped',
        'generic stamped child printing',
        'collapsing staff and non-staff variants without explicit governance',
        'using one source as final truth',
      ],
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    write_ready_now: report.write_ready_now,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
