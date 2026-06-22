import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const execFileAsync = promisify(execFile);
const INPUT_JSON = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'english_master_index_stamped_special_live_residual_queue_v1.json');
const OUT_DIR = path.join(ROOT, 'docs/audits/english_master_index_source_exhaustion_v1/pokumon_stamped_special_candidate_acquisition_v1');
const OUTPUT_JSON = path.join(OUT_DIR, 'pokumon_stamped_special_candidate_acquisition_v1.json');
const OUTPUT_MD = path.join(OUT_DIR, 'pokumon_stamped_special_candidate_acquisition_v1.md');
const FIXTURE_JSON = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures/generated_pokumon_stamped_special_candidate_acquisition_v1/pokumon_stamped_special_candidates_v1.json');

const TARGET_FAMILIES = new Set([
  'league',
  'championship_or_staff',
  'professor_program',
  'prerelease',
  'player_rewards_crosshatch',
  'small_custom_stamp',
]);

const FAMILY_TOKENS = {
  league: ['league'],
  championship_or_staff: ['championship', 'championships', 'staff', 'finalist', 'quarter finalist', 'world'],
  professor_program: ['professor program', 'professor'],
  prerelease: ['prerelease', 'staff'],
  player_rewards_crosshatch: ['player rewards', 'crosshatch'],
  small_custom_stamp: [],
};

const GENERIC_VARIANT_TOKENS = new Set(['stamp', 'stamped', 'special', 'print', 'pokemon', 'pok', 'mon']);

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
  return value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function cardNumberToken(number) {
  const raw = String(number ?? '').trim();
  const numeric = raw.match(/\d+[a-z]?/i)?.[0] ?? raw;
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

function rowTokens(row) {
  const keyTokens = new Set();
  for (const part of String(row.variant_key ?? '').split(/[_\s-]+/)) {
    const normalized = part.toLowerCase();
    if (normalized && normalized.length > 2 && !GENERIC_VARIANT_TOKENS.has(normalized)) keyTokens.add(normalized);
  }
  if (keyTokens.size) return [...keyTokens].filter(Boolean);
  return [...new Set(FAMILY_TOKENS[row.variant_family] ?? [])].filter(Boolean);
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
  for (let i = 0; i < 5 && url && !visited.has(url); i += 1) {
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
  const tokens = rowTokens(row);
  const matchedTokens = tokens.filter((token) => label.includes(token));
  if (tokens.length && matchedTokens.length !== tokens.length) return null;
  const finish = finishFromLabel(candidate.evidence_label);
  return {
    source_key: 'pokumon_special_print',
    source_kind: 'collector_reference',
    source_url: candidate.source_url,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    variant_family: row.variant_family,
    finish_key: row.finish_key ?? finish,
    evidence_type: finish ? 'candidate_finish_presence' : 'candidate_variant_presence',
    evidence_label: `Pokumon card-name result: ${candidate.evidence_label}`,
    matched_tokens: matchedTokens,
    candidate_finish_from_label: finish,
    status: finish ? 'candidate_exact_variant_with_finish_label' : 'candidate_exact_variant_finish_unresolved',
    notes: 'Candidate only. Pokumon card-name pages support card/name/number/special-print wording, but this artifact does not promote rows or infer set truth by itself.',
  };
}

function renderMarkdown(report) {
  return `# Pokumon Stamped/Special Candidate Acquisition V1

Generated: ${report.generated_at}

Audit-only. No DB writes, no migrations, no apply.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['card_name_pages_checked', report.summary.card_name_pages_checked],
    ['candidate_records', report.summary.candidate_records],
    ['with_finish_label', report.summary.with_finish_label],
    ['finish_unresolved', report.summary.finish_unresolved],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Candidate Records

${report.candidate_records.length
    ? markdownTable(['set', 'number', 'card', 'variant', 'finish', 'status', 'source'], report.candidate_records.slice(0, 80).map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.candidate_finish_from_label ?? row.finish_key ?? '',
      row.status,
      row.source_url,
    ]))
    : 'No candidate records found.'}
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = (input.open_rows ?? [])
    .filter((row) => TARGET_FAMILIES.has(row.variant_family))
    .filter((row) => row.execution_bucket !== 'bucket_02_no_printing_write_battle_academy_display_metadata');

  const byName = new Map();
  for (const row of rows) {
    const key = normalizeText(row.card_name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(row);
  }

  const candidateRecords = [];
  const attempts = [];
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
          }
        }
      }
      attempts.push({ card_name: nameRows[0].card_name, pages_checked: fetched.pages_checked, source_rows: fetched.cards.length, matches });
    } catch (error) {
      attempts.push({ card_name: nameRows[0].card_name, error: error.message, matches: 0 });
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  const fingerprint = sha256(stableJson(candidateRecords.map((row) => ({
    source_url: row.source_url,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: normalizeText(row.card_name),
    variant_key: row.variant_key,
    status: row.status,
  }))));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'pokumon_stamped_special_candidate_acquisition_v1',
    source_artifact: rel(INPUT_JSON),
    output_fixture: rel(FIXTURE_JSON),
    fingerprint_sha256: fingerprint,
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
    },
    summary: {
      target_rows: rows.length,
      unique_card_names: byName.size,
      card_name_pages_checked: attempts.reduce((sum, row) => sum + (row.pages_checked ?? 0), 0),
      candidate_records: candidateRecords.length,
      with_finish_label: candidateRecords.filter((row) => row.candidate_finish_from_label).length,
      finish_unresolved: candidateRecords.filter((row) => !row.candidate_finish_from_label).length,
    },
    attempts,
    candidate_records: candidateRecords,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeJson(FIXTURE_JSON, {
    generated_at: report.generated_at,
    source_key: 'pokumon_special_print',
    records: candidateRecords,
  });

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fixture_json: rel(FIXTURE_JSON),
    fingerprint_sha256: fingerprint,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
