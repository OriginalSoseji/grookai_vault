import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const execFileAsync = promisify(execFile);
const INPUT_JSON = path.join(ROOT, 'docs/audits/english_master_index_source_exhaustion_v1/pokumon_stamped_special_candidate_acquisition_v1/pokumon_stamped_special_candidate_acquisition_v1.json');
const OUT_DIR = path.join(ROOT, 'docs/audits/english_master_index_source_exhaustion_v1/pokumon_detail_finish_review_v1');
const OUTPUT_JSON = path.join(OUT_DIR, 'pokumon_detail_finish_review_v1.json');
const OUTPUT_MD = path.join(OUT_DIR, 'pokumon_detail_finish_review_v1.md');

const CONTRADICTION_TOKENS = {
  city_championships_stamp: ['staff'],
  national_championships_stamp: ['staff'],
  prerelease_stamp: ['staff'],
  regional_championships_stamp: ['staff'],
  finalist_stamp: ['quarter finalist', 'semi finalist', 'staff'],
  quarter_finalist_stamp: ['semi finalist', 'staff'],
  staff_stamp: ['non staff'],
  league_stamp: ['battle academy', 'prize pack'],
  play_pok_mon_thank_you_stamp: ['prize pack'],
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

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiVaultAudit/1.0 (+https://grookaivault.com)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    const command = [
      '$Headers = @{ "User-Agent" = "GrookaiVaultAudit/1.0 (+https://grookaivault.com)"; "Accept" = "text/html,application/xhtml+xml" };',
      `$Response = Invoke-WebRequest -Uri ${JSON.stringify(url)} -UseBasicParsing -Headers $Headers -TimeoutSec 30;`,
      '$Response.Content',
    ].join(' ');
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 45_000,
    });
    if (!stdout) throw error;
    return stdout;
  }
}

function pageClasses(html) {
  const classes = new Set();
  for (const match of html.matchAll(/class="([^"]*(?:holofoil-|additional_attributes-|release_event-|tag-)[^"]*)"/gi)) {
    for (const token of match[1].split(/\s+/)) {
      if (/^(holofoil|additional_attributes|release_event|tag)-/i.test(token)) classes.add(token.toLowerCase());
    }
  }
  return [...classes].sort();
}

function finishFromClasses(classes) {
  const joined = classes.join(' ');
  if (joined.includes('holofoil-cosmos') || joined.includes('tag-cosmos')) return { finish_key: 'cosmos', confidence: 'canonical_candidate' };
  if (joined.includes('holofoil-reverse') || joined.includes('tag-reverse-holo')) return { finish_key: 'reverse', confidence: 'canonical_candidate' };
  if (joined.includes('holofoil-non-holo') || joined.includes('tag-non-holo')) return { finish_key: 'normal', confidence: 'canonical_candidate' };
  if (joined.includes('crosshatch')) return { finish_key: 'holo', confidence: 'taxonomy_review_crosshatch' };
  if (joined.includes('holofoil-holo') || joined.includes('tag-holo')) return { finish_key: 'holo', confidence: 'canonical_candidate' };
  return { finish_key: null, confidence: 'no_finish_class_found' };
}

function contradictory(record) {
  const label = normalizeText(record.evidence_label ?? '');
  const url = normalizeText(record.source_url ?? '');
  const haystack = `${label} ${url}`;
  const tokens = CONTRADICTION_TOKENS[record.variant_key] ?? [];
  return tokens.filter((token) => haystack.includes(token));
}

function renderMarkdown(report) {
  return `# Pokumon Detail Finish Review V1

Generated: ${report.generated_at}

Audit-only. No DB writes, no migrations, no apply. This report parses Pokumon detail-page body classes and does not promote evidence automatically.

## Summary

${markdownTable(['metric', 'value'], [
    ['candidate_records_reviewed', report.summary.candidate_records_reviewed],
    ['unique_pages_fetched', report.summary.unique_pages_fetched],
    ['canonical_finish_candidates', report.summary.canonical_finish_candidates],
    ['taxonomy_review_rows', report.summary.taxonomy_review_rows],
    ['blocked_contradictory_variant_rows', report.summary.blocked_contradictory_variant_rows],
    ['no_finish_class_rows', report.summary.no_finish_class_rows],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Canonical Finish Candidates

${report.canonical_finish_candidates.length
    ? markdownTable(['set', 'number', 'card', 'variant', 'finish', 'source'], report.canonical_finish_candidates.slice(0, 80).map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.parsed_finish_key,
      row.source_url,
    ]))
    : 'None.'}

## Blocked / Review

${report.review_rows.length
    ? markdownTable(['set', 'number', 'card', 'variant', 'status', 'reason'], report.review_rows.slice(0, 80).map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.review_status,
      row.review_reason,
    ]))
    : 'None.'}
`;
}

async function main() {
  const source = await readJson(INPUT_JSON);
  const records = source.candidate_records ?? [];
  const byUrl = new Map();
  for (const record of records) {
    if (!byUrl.has(record.source_url)) byUrl.set(record.source_url, []);
    byUrl.get(record.source_url).push(record);
  }

  const pageCache = new Map();
  const reviewed = [];
  for (const [url, urlRecords] of byUrl.entries()) {
    let classes = [];
    let fetchError = null;
    try {
      const html = await fetchText(url);
      classes = pageClasses(html);
    } catch (error) {
      fetchError = error.message;
    }
    pageCache.set(url, { classes, fetchError });
    const parsed = finishFromClasses(classes);
    for (const record of urlRecords) {
      const contradictions = contradictory(record);
      let reviewStatus = parsed.confidence;
      let reviewReason = parsed.confidence;
      if (fetchError) {
        reviewStatus = 'blocked_fetch_failed';
        reviewReason = fetchError;
      } else if (contradictions.length) {
        reviewStatus = 'blocked_contradictory_variant_label';
        reviewReason = `contradictory tokens: ${contradictions.join(', ')}`;
      } else if (parsed.confidence === 'canonical_candidate') {
        reviewStatus = 'canonical_finish_candidate_not_promoted';
        reviewReason = 'Parsed exact finish class from Pokumon detail page; requires a dedicated readiness pass before any write package.';
      }
      reviewed.push({
        ...record,
        parsed_finish_key: parsed.finish_key,
        parsed_finish_confidence: parsed.confidence,
        page_classes: classes,
        review_status: reviewStatus,
        review_reason: reviewReason,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const canonical = reviewed.filter((row) => row.review_status === 'canonical_finish_candidate_not_promoted');
  const reviewRows = reviewed.filter((row) => row.review_status !== 'canonical_finish_candidate_not_promoted');
  const fingerprint = sha256(stableJson(reviewed.map((row) => ({
    source_url: row.source_url,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: normalizeText(row.card_name),
    variant_key: row.variant_key,
    parsed_finish_key: row.parsed_finish_key,
    review_status: row.review_status,
  }))));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'pokumon_detail_finish_review_v1',
    source_artifact: rel(INPUT_JSON),
    fingerprint_sha256: fingerprint,
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
    },
    summary: {
      candidate_records_reviewed: records.length,
      unique_pages_fetched: byUrl.size,
      canonical_finish_candidates: canonical.length,
      taxonomy_review_rows: reviewed.filter((row) => row.parsed_finish_confidence === 'taxonomy_review_crosshatch').length,
      blocked_contradictory_variant_rows: reviewed.filter((row) => row.review_status === 'blocked_contradictory_variant_label').length,
      no_finish_class_rows: reviewed.filter((row) => row.parsed_finish_confidence === 'no_finish_class_found').length,
      fetch_failed_rows: reviewed.filter((row) => row.review_status === 'blocked_fetch_failed').length,
    },
    canonical_finish_candidates: canonical,
    review_rows: reviewRows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: fingerprint,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
