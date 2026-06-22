import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_PACKET_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_evidence_acquisition_packet_v1.json');
const COLLEXY_GOV_JSON = path.join(AUDIT_DIR, 'english_master_index_collexy_stamp_taxonomy_governance_v1.json');
const COLLEXY_DELTA_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'source_delta_audit_v1', 'collexy_governed_stamp_finish_source_delta_audit_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_post_collexy_source_packet_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_post_collexy_source_packet_v1.md');

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
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

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

function key(row) {
  return [row.set_key, row.card_number, row.card_name, row.variant_key].join('|');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const k = keyFn(row) || 'unknown';
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function lanePlan(actionBucket) {
  if (actionBucket === 'league_finish_exact_source') {
    return {
      next_source_family: 'league_marketplace_scan_sources',
      reason: 'PokeScope/ScryDex and Collexy mostly prove variant labels or taxonomy; remaining rows need listing/scan evidence binding exact stamp to active finish.',
    };
  }
  if (actionBucket === 'prize_pack_second_source') {
    return {
      next_source_family: 'official_prize_pack_or_product_pdf_recheck',
      reason: 'Prior official/PDF lanes found no promotable finish binding; rows need exact product/checklist evidence or remain blocked.',
    };
  }
  if (actionBucket === 'small_custom_stamp_exact_source') {
    return {
      next_source_family: 'individual_event_stamp_sources',
      reason: 'Rows are highly specific event stamps and need exact listing/scans or collector-reference pages.',
    };
  }
  if (actionBucket === 'event_staff_exact_source') {
    return {
      next_source_family: 'worlds_event_staff_sources',
      reason: 'Rows need exact event/staff stamp and active finish, not generic event identity.',
    };
  }
  return {
    next_source_family: 'targeted_exact_source_search',
    reason: 'Exact set + number + name + variant/stamp + active finish remains required.',
  };
}

function renderMarkdown(report) {
  const topRows = report.rows.slice(0, 50).map((row) => [
    row.action_bucket,
    row.set_key,
    row.card_number,
    row.card_name,
    row.variant_key,
    row.stamp_label ?? '',
    row.next_source_family,
  ]);

  return [
    '# Stamped/Special Post-Collexy Source Packet V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Audit-only. No DB writes, no migrations, no apply.',
    '',
    'This packet removes the rows classified by the Collexy governance/delta lane from the current source-acquisition packet, leaving the next clean acquisition target set.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['source_packet_rows', report.summary.source_packet_rows],
      ['collexy_classified_rows_removed', report.summary.collexy_classified_rows_removed],
      ['remaining_rows', report.summary.remaining_rows],
      ['write_ready_now', report.summary.write_ready_now],
      ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
    ]),
    '',
    '## Remaining By Bucket',
    '',
    markdownTable(['bucket', 'count'], Object.entries(report.summary.by_action_bucket)),
    '',
    '## Next Source Family By Bucket',
    '',
    markdownTable(['bucket', 'source family', 'reason'], report.lane_plan.map((row) => [
      row.action_bucket,
      row.next_source_family,
      row.reason,
    ])),
    '',
    '## First 50 Remaining Targets',
    '',
    markdownTable(['bucket', 'set', 'number', 'card', 'variant', 'stamp', 'next source'], topRows),
    '',
  ].join('\n');
}

async function main() {
  const sourcePacket = await readJson(SOURCE_PACKET_JSON);
  const collexyGovernance = await readJson(COLLEXY_GOV_JSON);
  const collexyDelta = await readJson(COLLEXY_DELTA_JSON);

  const collexyKeys = new Set((collexyGovernance.rows ?? []).map(key));
  const rows = (sourcePacket.rows ?? [])
    .filter((row) => !collexyKeys.has(key(row)))
    .map((row) => ({
      ...row,
      ...lanePlan(row.action_bucket),
      write_ready_now: false,
    }));

  const bucketEntries = Object.entries(countBy(rows, (row) => row.action_bucket));
  const laneRows = bucketEntries.map(([actionBucket]) => ({
    action_bucket: actionBucket,
    row_count: rows.filter((row) => row.action_bucket === actionBucket).length,
    ...lanePlan(actionBucket),
  }));

  const report = {
    package_id: 'STAMPED-SPECIAL-POST-COLLEXY-SOURCE-PACKET-V1',
    generated_at: new Date().toISOString(),
    inputs: {
      source_packet: rel(SOURCE_PACKET_JSON),
      source_packet_fingerprint_sha256: sourcePacket.fingerprint_sha256 ?? null,
      collexy_governance: rel(COLLEXY_GOV_JSON),
      collexy_governance_fingerprint_sha256: collexyGovernance.fingerprint_sha256 ?? null,
      collexy_delta: rel(COLLEXY_DELTA_JSON),
      collexy_delta_summary: collexyDelta.summary ?? {},
    },
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
    },
    summary: {
      source_packet_rows: sourcePacket.rows?.length ?? 0,
      collexy_classified_rows_removed: collexyKeys.size,
      remaining_rows: rows.length,
      write_ready_now: 0,
      by_action_bucket: countBy(rows, (row) => row.action_bucket),
      by_next_source_family: countBy(rows, (row) => row.next_source_family),
      by_set: countBy(rows, (row) => row.set_key),
    },
    lane_plan: laneRows,
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    package_id: report.package_id,
    inputs: report.inputs,
    summary: report.summary,
    rows: rows.map((row) => ({
      action_bucket: row.action_bucket,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      next_source_family: row.next_source_family,
    })),
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
