import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const execFileAsync = promisify(execFile);
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const OUT_DIR = path.join(ROOT, 'docs/audits/english_master_index_source_exhaustion_v1/pokumon_prerelease_professor_current_acquisition_v1');
const OUTPUT_JSON = path.join(OUT_DIR, 'pokumon_prerelease_professor_current_acquisition_v1.json');
const OUTPUT_MD = path.join(OUT_DIR, 'pokumon_prerelease_professor_current_acquisition_v1.md');

const TARGET_BUCKETS = new Set([
  'prerelease_exact_finish_source',
  'professor_program_exact_finish_source',
]);

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

function slugName(name) {
  return normalizeText(name)
    .replace(/'s\b/g, 's')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardNumberToken(number) {
  const raw = String(number ?? '').trim();
  const numeric = raw.match(/[a-z]*\d+[a-z]?/i)?.[0] ?? raw;
  return numeric.replace(/^0+(\d)/, '$1').toLowerCase();
}

function cardNumberMatches(label, number) {
  const token = cardNumberToken(number).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])0*${token}([^a-z0-9]|$|/)`, 'i').test(label);
}

function finishFromLabel(label) {
  const text = normalizeText(label);
  if (text.includes('non holo') || text.includes('non-holo')) return 'normal';
  if (text.includes('reverse holo') || text.includes('reverse')) return 'reverse';
  if (text.includes('cosmos')) return 'cosmos';
  if (text.includes('holofoil') || text.includes('holo') || text.includes('crosshatch')) return 'holo';
  return null;
}

function variantMatches(row, label) {
  const text = normalizeText(label);
  if (row.action_bucket === 'prerelease_exact_finish_source') return text.includes('prerelease');
  if (row.action_bucket === 'professor_program_exact_finish_source') return text.includes('professor');
  return false;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }
}

function parseCards(html) {
  const out = [];
  const re = /<h4[^>]*class="[^"]*cl-element-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>\s*<\/h4>/gis;
  for (const match of html.matchAll(re)) {
    out.push({ source_url: match[1], evidence_label: stripTags(match[2]) });
  }
  return out;
}

function parseNext(html) {
  const match = html.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

async function fetchCardNamePages(cardName) {
  const cards = [];
  let url = `https://pokumon.com/cardname/${slugName(cardName)}/`;
  const visited = new Set();
  for (let i = 0; i < 3 && url && !visited.has(url); i += 1) {
    visited.add(url);
    const html = await fetchText(url);
    cards.push(...parseCards(html));
    url = parseNext(html);
  }
  return { cards, pages_checked: visited.size };
}

function matchRow(row, candidate) {
  const label = normalizeText(candidate.evidence_label);
  const name = normalizeText(row.card_name);
  if (!label.includes(name)) return null;
  if (!cardNumberMatches(label, row.card_number)) return null;
  if (!variantMatches(row, candidate.evidence_label)) return null;
  const finish = finishFromLabel(candidate.evidence_label);
  return {
    source_key: 'pokumon_special_print',
    source_kind: 'collector_reference',
    source_url: candidate.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    action_bucket: row.action_bucket,
    finish_key: finish,
    evidence_type: finish ? 'candidate_finish_presence' : 'candidate_variant_presence',
    evidence_label: `Pokumon card-name result: ${candidate.evidence_label}`,
    status: finish ? 'candidate_exact_variant_with_finish_label' : 'candidate_exact_variant_finish_unresolved',
    notes: finish
      ? 'Candidate only. Exact finish label found, still requires source-agreement and live DB readiness before any write.'
      : 'Candidate only. Exact variant/card label found, but active finish remains unresolved.',
  };
}

function reviewRow(row, candidate) {
  const label = normalizeText(candidate.evidence_label);
  const name = normalizeText(row.card_name);
  if (!label.includes(name)) return null;
  if (!cardNumberMatches(label, row.card_number)) return null;
  if (variantMatches(row, candidate.evidence_label)) return null;
  return {
    source_key: 'pokumon_special_print',
    source_kind: 'collector_reference',
    source_url: candidate.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    action_bucket: row.action_bucket,
    evidence_type: 'near_miss_identity_variant_review',
    evidence_label: `Pokumon card-name near miss: ${candidate.evidence_label}`,
    status: 'target_variant_not_confirmed',
    notes: 'Card name and number match, but Pokumon label does not confirm the queued stamp/variant. Do not promote without taxonomy review.',
  };
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function renderMarkdown(report) {
  return `# Pokumon Prerelease/Professor Current Acquisition V1

Generated: ${report.generated_at}

Audit-only focused Pokumon pass for current prerelease and Professor Program stamped/special residual rows.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- write_ready_now: 0

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['card_name_pages_checked', report.summary.card_name_pages_checked],
    ['candidate_records', report.summary.candidate_records],
    ['review_records', report.summary.review_records],
    ['with_finish_label', report.summary.with_finish_label],
    ['finish_unresolved', report.summary.finish_unresolved],
    ['fetch_errors', report.summary.fetch_errors],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Candidates

${report.candidate_records.length
    ? markdownTable(['set', 'number', 'card', 'stamp', 'finish', 'status', 'source'], report.candidate_records.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.finish_key ?? 'unresolved',
      row.status,
      row.source_url,
    ]))
    : 'No candidate records found.'}

## Review Records

${report.review_records.length
    ? markdownTable(['set', 'number', 'card', 'target stamp', 'status', 'source'], report.review_records.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.status,
      row.source_url,
    ]))
    : 'No review records found.'}
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = (input.rows ?? []).filter((row) => TARGET_BUCKETS.has(row.action_bucket));
  const byName = new Map();
  for (const row of rows) {
    const key = normalizeText(row.card_name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(row);
  }

  const attempts = [];
  const candidateRecords = [];
  const reviewRecords = [];
  for (const [name, nameRows] of byName.entries()) {
    try {
      const fetched = await fetchCardNamePages(nameRows[0].card_name);
      let matches = 0;
      for (const row of nameRows) {
        for (const card of fetched.cards) {
          const record = matchRow(row, card);
          if (record) {
            candidateRecords.push(record);
            matches += 1;
            continue;
          }
          const reviewRecord = reviewRow(row, card);
          if (reviewRecord) {
            reviewRecords.push(reviewRecord);
          }
        }
      }
      attempts.push({ card_name: nameRows[0].card_name, pages_checked: fetched.pages_checked, source_rows: fetched.cards.length, matches });
    } catch (error) {
      attempts.push({ card_name: nameRows[0].card_name, error: error.message, matches: 0 });
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'pokumon_prerelease_professor_current_acquisition_v1',
    input_artifact: rel(INPUT_JSON),
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      write_ready_now: 0,
    },
    summary: {
      target_rows: rows.length,
      card_name_pages_checked: attempts.reduce((sum, row) => sum + (row.pages_checked ?? 0), 0),
      candidate_records: candidateRecords.length,
      review_records: reviewRecords.length,
      with_finish_label: candidateRecords.filter((row) => row.finish_key).length,
      finish_unresolved: candidateRecords.filter((row) => !row.finish_key).length,
      fetch_errors: attempts.filter((row) => row.error).length,
      by_action_bucket: countBy(rows, (row) => row.action_bucket),
      by_candidate_status: countBy(candidateRecords, (row) => row.status),
    },
    attempts,
    candidate_records: [...new Map(candidateRecords.map((row) => [stableJson({
      source_url: row.source_url,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
    }), row])).values()],
    review_records: [...new Map(reviewRecords.map((row) => [stableJson({
      source_url: row.source_url,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      status: row.status,
    }), row])).values()],
  };
  report.summary.candidate_records = report.candidate_records.length;
  report.summary.review_records = report.review_records.length;
  report.summary.with_finish_label = report.candidate_records.filter((row) => row.finish_key).length;
  report.summary.finish_unresolved = report.candidate_records.filter((row) => !row.finish_key).length;
  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    candidate_records: report.candidate_records.map((row) => ({
      source_url: row.source_url,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      status: row.status,
    })),
    review_records: report.review_records.map((row) => ({
      source_url: row.source_url,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      status: row.status,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
