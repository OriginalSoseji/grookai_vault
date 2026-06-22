import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_current_unresolved_work_plan_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_evidence_acquisition_packet_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_evidence_acquisition_packet_v1.md',
);

const PRIORITY_ORDER = [
  'league_finish_exact_source',
  'small_custom_stamp_exact_source',
  'prize_pack_second_source',
  'event_staff_exact_source',
  'second_source_needed',
  'prerelease_exact_finish_source',
  'professor_program_exact_finish_source',
  'halloween_base_parent_or_finish_resolution',
  'base_parent_blocked_no_write',
  'manual_conflict_still_blocked',
  'generic_stamped_suppressed_no_write',
  'display_metadata_no_write',
  'closed_stale_no_write',
];

const PRIORITY_REASON = {
  league_finish_exact_source: 'Largest evidence-blocked bucket; many rows already have variant evidence but lack exact finish binding.',
  small_custom_stamp_exact_source: 'Good candidate for exact collector-reference pages or scans; lower row count but likely high collector value.',
  prize_pack_second_source: 'High-value modern stamp lane; requires second-source confirmation instead of broad Prize Pack assumptions.',
  event_staff_exact_source: 'High collector-significance event/staff lane; needs exact event and finish proof.',
  second_source_needed: 'Closest to promotion after a second independent exact source is found.',
  prerelease_exact_finish_source: 'Known stamp family, but exact finish evidence is still required.',
  professor_program_exact_finish_source: 'Specific program stamp lane; exact finish proof required.',
  halloween_base_parent_or_finish_resolution: 'Needs lane governance before evidence can become a printing package.',
  base_parent_blocked_no_write: 'Dependency work first; source acquisition alone is not enough.',
  manual_conflict_still_blocked: 'Human taxonomy/event-label decision required before evidence acquisition can unlock writes.',
  generic_stamped_suppressed_no_write: 'Suppressed until generic stamp labels become specific, deterministic variants.',
  display_metadata_no_write: 'Not a canonical printing lane now; keep as future product/display metadata.',
  closed_stale_no_write: 'No active work recommended.',
};

const SOURCE_FAMILIES_BY_BUCKET = {
  league_finish_exact_source: ['Pokumon', 'PokeScope', 'league product pages', 'clear front/back collector scans'],
  small_custom_stamp_exact_source: ['Pokumon', 'Elite Fourum', 'PkmnCards where exact', 'collector scans', 'event archive pages'],
  prize_pack_second_source: ['official Prize Pack checklists', 'Pokumon', 'TCGplayer exact product pages', 'PriceCharting exact product pages'],
  event_staff_exact_source: ['Pokumon', 'event archive pages', 'tournament staff references', 'graded cert images with visible stamp'],
  second_source_needed: ['official/checklist source', 'independent collector reference', 'stable marketplace product page with exact title and image'],
  prerelease_exact_finish_source: ['Pokumon', 'PokeScope', 'prerelease kit/source pages', 'collector scans'],
  professor_program_exact_finish_source: ['Professor Program references', 'Pokumon', 'collector checklists', 'verified scans'],
};

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function normalizeTerms(value) {
  return String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function quoted(value) {
  const text = normalizeTerms(value);
  return text ? `"${text}"` : '';
}

function buildSearchQueries(row) {
  const terms = [
    quoted(row.card_name),
    quoted(row.card_number),
    quoted(row.set_name || row.set_key),
    quoted(row.stamp_label || row.variant_key),
  ].filter(Boolean);
  const base = terms.join(' ');

  return [
    `${base} Pokemon card finish`,
    `${base} reverse holo holo normal`,
    `${base} site:pokumon.com`,
    `${base} site:pokescope.app`,
    `${base} site:pricecharting.com`,
    `${base} site:tcgplayer.com`,
  ];
}

function evidenceRequirement(row) {
  if (row.action_bucket === 'display_metadata_no_write') {
    return 'Do not seek card_printing proof unless the source proves a distinct physical printing lane.';
  }
  if (row.action_bucket === 'generic_stamped_suppressed_no_write') {
    return 'Specific stamp label plus exact finish; generic stamped is not enough.';
  }
  if (row.action_bucket === 'base_parent_blocked_no_write') {
    return 'Resolve base parent/base finish dependency first, then reassess variant evidence.';
  }
  if (row.action_bucket === 'manual_conflict_still_blocked') {
    return 'Human taxonomy adjudication before source acquisition.';
  }
  return 'Exact set + card number + card name + stamp/variant + finish + source URL.';
}

function priorityRank(bucket) {
  const index = PRIORITY_ORDER.indexOf(bucket);
  return index === -1 ? PRIORITY_ORDER.length + 1 : index + 1;
}

function buildAcquisitionRows(rows) {
  return rows
    .map((row) => ({
      ...row,
      priority_rank: priorityRank(row.action_bucket),
      priority_reason: PRIORITY_REASON[row.action_bucket] ?? 'Review source packet.',
      evidence_requirement: evidenceRequirement(row),
      suggested_source_families: SOURCE_FAMILIES_BY_BUCKET[row.action_bucket] ?? [],
      search_queries: buildSearchQueries(row),
      write_ready_now: false,
    }))
    .sort((left, right) => (
      left.priority_rank - right.priority_rank
      || String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
    ));
}

function groupPriorities(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.action_bucket)) groups.set(row.action_bucket, []);
    groups.get(row.action_bucket).push(row);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => priorityRank(left) - priorityRank(right))
    .map(([bucket, bucketRows]) => ({
      action_bucket: bucket,
      priority_rank: priorityRank(bucket),
      row_count: bucketRows.length,
      priority_reason: PRIORITY_REASON[bucket] ?? 'Review source packet.',
      evidence_requirement: evidenceRequirement(bucketRows[0]),
      suggested_source_families: SOURCE_FAMILIES_BY_BUCKET[bucket] ?? [],
      by_set: countBy(bucketRows, (row) => row.set_key),
      examples: bucketRows.slice(0, 10),
    }));
}

function topEntries(counts, limit = 10) {
  return Object.entries(counts)
    .sort(([, left], [, right]) => right - left)
    .slice(0, limit);
}

function buildMarkdown(report) {
  return `# Stamped/Special Evidence Acquisition Packet V1

Audit-only acquisition packet for the remaining stamped/special blocker rows.

## Summary

${markdownTable(['metric', 'value'], [
    ['rows_in_packet', report.summary.rows_in_packet],
    ['write_ready_now', report.summary.write_ready_now],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Priority Order

${markdownTable(
    ['rank', 'bucket', 'rows', 'why this is next', 'evidence required'],
    report.priority_groups.map((group) => [
      group.priority_rank,
      group.action_bucket,
      group.row_count,
      group.priority_reason,
      group.evidence_requirement,
    ]),
  )}

## Top Sets To Search

${markdownTable(['set', 'rows'], topEntries(report.summary.by_set))}

## Top Variants To Search

${markdownTable(['variant', 'rows'], topEntries(report.summary.by_variant_key))}

## First 40 Search Targets

${markdownTable(
    ['rank', 'bucket', 'set', 'number', 'card', 'stamp', 'query'],
    report.rows.slice(0, 40).map((row) => [
      row.priority_rank,
      row.action_bucket,
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.search_queries[0],
    ]),
  )}

## Guardrails

- No DB writes.
- No migrations.
- No parent inserts.
- No child inserts.
- No generic stamped promotion.
- No single-source promotion where second-source evidence is required.
- No finish inference from broad stamp family or era assumptions.
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const sourceRows = (input.unresolved_rows ?? input.rows ?? [])
    .filter((row) => {
      const lane = input.lane_plan?.find((entry) => entry.action_bucket === row.action_bucket);
      return lane?.execution_group === 'source_acquisition';
    });
  const acquisitionRows = buildAcquisitionRows(sourceRows);
  const priorityGroups = groupPriorities(acquisitionRows);

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_evidence_acquisition_packet_v1',
    input_report: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
    input_fingerprint_sha256: input.fingerprint_sha256,
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
    },
    summary: {
      rows_in_packet: acquisitionRows.length,
      write_ready_now: 0,
      by_action_bucket: countBy(acquisitionRows, (row) => row.action_bucket),
      by_set: countBy(acquisitionRows, (row) => row.set_key),
      by_variant_key: countBy(acquisitionRows, (row) => row.variant_key),
    },
    priority_groups: priorityGroups,
    rows: acquisitionRows,
  };

  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    priority_groups: report.priority_groups.map((group) => ({
      action_bucket: group.action_bucket,
      priority_rank: group.priority_rank,
      row_count: group.row_count,
      by_set: group.by_set,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    rows_in_packet: report.summary.rows_in_packet,
    write_ready_now: report.summary.write_ready_now,
    top_priority: report.priority_groups[0],
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
