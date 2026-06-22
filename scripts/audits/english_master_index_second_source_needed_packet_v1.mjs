import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'second_source_needed_packet_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const CLOSURE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'second_source_needed_packet_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'second_source_needed_packet_v1.md');

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function searchPhrases(row) {
  const set = row.set_name || row.set_key;
  const number = row.card_number;
  const name = row.card_name;
  const stamp = row.stamp_label || row.variant_key;
  return [
    `"${name}" "${number}" "${set}" "${stamp}"`,
    `"${name}" "${number}" "${stamp}" "Pokemon"`,
    `"${name}" "${stamp}" "Staff" "Championships"`,
  ];
}

function sourceTargets(row) {
  const variant = String(row.variant_key ?? '');
  const targets = ['PSA auction/page', 'PriceCharting product title', 'TCGplayer product title', 'PokeScope/Scrydex exact card page'];
  if (variant.includes('championship')) targets.unshift('event/championship checklist or staff distribution page');
  if (variant.includes('eb_games') || variant.includes('gamestop')) targets.unshift('retailer promo checklist or product page');
  if (variant.includes('prerelease')) targets.unshift('Build & Battle or prerelease product page');
  return [...new Set(targets)];
}

function buildRows(input, closure) {
  const closureRowsByKey = new Map(
    (closure.rows ?? []).map((row) => [`${row.set_key}|${row.card_number}|${row.card_name}|${row.variant_key}`, row]),
  );
  return (input.rows ?? [])
    .filter((row) => row.execution_bucket === 'bucket_06_second_source_acquisition_bulk')
    .map((row) => {
      const closureRow = closureRowsByKey.get(`${row.set_key}|${row.card_number}|${row.card_name}|${row.variant_key}`);
      return {
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        variant_key: row.variant_key,
        stamp_label: row.stamp_label,
        action_bucket: row.action_bucket,
        execution_bucket: row.execution_bucket,
        closure_status: closureRow?.closure_status ?? 'blocked_second_independent_source_needed',
        required_next_evidence: closureRow?.required_next_evidence ?? 'One additional independent source for the exact existing single-source fact.',
        search_phrases: searchPhrases(row),
        recommended_source_targets: sourceTargets(row),
        write_ready_now: 0,
      };
    });
}

function renderMarkdown(report) {
  const rows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label,
    row.closure_status,
    row.search_phrases[0],
  ]);
  return `# Second Source Needed Packet V1

Generated: ${report.generated_at}

This is audit-only. It extracts the remaining stamped/special rows that specifically need one additional independent exact source before any guarded write package can be considered.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Summary

${markdownTable(['metric', 'value'], [
    ['rows', report.summary.rows],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Rows

${markdownTable(['set', 'number', 'card', 'stamp', 'status', 'first search phrase'], rows)}

## Rule

Do not promote any row from this packet unless the source proves:

\`\`\`text
set + card number + card name + exact stamp/variant + finish when applicable + source URL
\`\`\`
`;
}

async function main() {
  const [input, closure] = await Promise.all([readJson(INPUT_JSON), readJson(CLOSURE_JSON)]);
  const rows = buildRows(input, closure);
  const report = {
    package_id: 'SECOND-SOURCE-NEEDED-PACKET-V1',
    generated_at: new Date().toISOString(),
    input_artifacts: {
      next_action_queue: rel(INPUT_JSON),
      closure_report: rel(CLOSURE_JSON),
    },
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      write_ready_now: 0,
    },
    summary: {
      rows: rows.length,
      write_ready_now: 0,
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({ rows }));
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
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
