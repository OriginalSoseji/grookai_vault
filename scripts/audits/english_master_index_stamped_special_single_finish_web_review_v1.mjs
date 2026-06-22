import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'stamped_special_web_variant_discovery_v1');
const WEB_JSON = path.join(SOURCE_DIR, 'stamped_special_web_variant_discovery_v1.json');
const OUTPUT_JSON = path.join(SOURCE_DIR, 'single_finish_web_review_candidates_v1.json');
const OUTPUT_MD = path.join(SOURCE_DIR, 'single_finish_web_review_candidates_v1.md');

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function classify(row) {
  const finishTerms = unique(row.detected_finish_labels ?? []);
  if (!['variant_found_finish_unresolved', 'multi_source_variant_found_finish_unresolved'].includes(row.status)) {
    return 'not_variant_supported';
  }
  if (finishTerms.length !== 1) return 'multi_finish_terms_not_safe';
  if ((row.variant_source_count ?? 0) < 2) return 'single_finish_single_variant_source_review';
  return 'single_finish_multi_variant_source_review';
}

function renderMarkdown(report) {
  const candidateRows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label ?? row.variant_key,
    row.single_finish_term,
    row.variant_source_count,
    row.review_status,
    row.source_urls.join(' ; '),
  ]);

  return [
    '# Single-Finish Web Review Candidates V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Audit-only. No DB writes, no migrations, no apply.',
    '',
    'This report isolates current stamped/special rows where web discovery found an exact variant/stamp label and only one active finish term on the reviewed source pages.',
    '',
    'These rows are not automatically promotable. A page can list one finish term without proving that the stamp/variant itself is bound to that finish. They are manual review candidates only.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['source_rows_checked', report.summary.source_rows_checked],
      ['variant_supported_rows', report.summary.variant_supported_rows],
      ['single_finish_review_candidates', report.summary.single_finish_review_candidates],
      ['single_finish_multi_variant_source_review', report.summary.by_review_status.single_finish_multi_variant_source_review ?? 0],
      ['single_finish_single_variant_source_review', report.summary.by_review_status.single_finish_single_variant_source_review ?? 0],
      ['multi_finish_terms_not_safe', report.summary.by_review_status.multi_finish_terms_not_safe ?? 0],
      ['promotable_rows', report.summary.promotable_rows],
      ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
    ]),
    '',
    '## Candidates',
    '',
    candidateRows.length
      ? markdownTable(['set', 'number', 'card', 'stamp/variant', 'single finish term', 'variant sources', 'review status', 'sources'], candidateRows)
      : 'No current single-finish web review candidates.',
    '',
    '## Guardrail',
    '',
    'Do not promote these rows unless a source proves exact set + card number + card name + stamp/variant + active finish. Page-level finish vocabulary alone is not sufficient.',
    '',
  ].join('\n');
}

async function main() {
  const web = await readJson(WEB_JSON);
  const variantRows = (web.rows ?? []).filter((row) => (
    ['variant_found_finish_unresolved', 'multi_source_variant_found_finish_unresolved'].includes(row.status)
  ));
  const reviewed = variantRows.map((row) => {
    const finishTerms = unique(row.detected_finish_labels ?? []);
    return {
      source_key: 'stamped_special_web_variant_discovery',
      source_kind: 'collector_reference',
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      single_finish_term: finishTerms.length === 1 ? finishTerms[0] : null,
      detected_finish_labels: finishTerms,
      variant_source_count: row.variant_source_count ?? 0,
      source_urls: row.source_urls ?? [],
      review_status: classify(row),
      promotable: false,
      reason_not_promotable: 'Web page finish terms are review signals only; they do not independently prove exact stamp/variant-to-active-finish binding.',
    };
  });
  const rows = reviewed.filter((row) => row.single_finish_term);

  const report = {
    package_id: 'STAMPED-SPECIAL-SINGLE-FINISH-WEB-REVIEW-V1',
    generated_at: new Date().toISOString(),
    input_artifact: rel(WEB_JSON),
    input_fingerprint_sha256: web.fingerprint_sha256 ?? null,
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      promotable_records_written: 0,
    },
    summary: {
      source_rows_checked: web.summary?.source_rows_checked ?? (web.rows ?? []).length,
      variant_supported_rows: variantRows.length,
      single_finish_review_candidates: rows.length,
      promotable_rows: 0,
      by_review_status: countBy(reviewed, (row) => row.review_status),
      by_single_finish_term: countBy(rows, (row) => row.single_finish_term),
      by_variant_key: countBy(rows, (row) => row.variant_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    package_id: report.package_id,
    input_fingerprint_sha256: report.input_fingerprint_sha256,
    summary: report.summary,
    rows: report.rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      single_finish_term: row.single_finish_term,
      variant_source_count: row.variant_source_count,
      review_status: row.review_status,
      source_urls: row.source_urls,
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
