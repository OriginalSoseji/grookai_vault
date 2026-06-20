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
const QUEUE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const CSV_PATH = path.join(ROOT, 'tmp', 'pricecharting', 'pokemon_cards_pricecharting.csv');
const REPORT_DIR = path.join(SOURCE_DIR, 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1');
const FIXTURE_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'source_fixtures', 'generated_pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1');
const OUTPUT_JSON = path.join(REPORT_DIR, 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1.json');
const OUTPUT_MD = path.join(REPORT_DIR, 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1.md');
const FIXTURE_JSON = path.join(FIXTURE_DIR, 'pricecharting_current_stamped_active_finish_candidates_v1.json');

const PACKAGE_ID = 'PKG-18N-PRICECHARTING-CURRENT-STAMPED-ACTIVE-FINISH-ACQUISITION';
const SOURCE_KEY = 'pricecharting_current_stamped_active_finish';
const ACTIVE_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
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

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpok[eé]mon\b/g, ' ')
    .replace(/\bblack star promos?\b/g, 'promo')
    .replace(/\bpromos?\b/g, 'promo')
    .replace(/\blv\s*\.?\s*x\b/g, ' lvx ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+(?=\d)/, '');
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[.:’']/g, '')
    .replace(/#/g, ' ')
    .replace(/[\[\]]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceUrl(row) {
  return `https://www.pricecharting.com/game/${slug(row['console-name'])}/${slug(row['product-name'])}`;
}

function parseCsv(raw) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const rows = parseCsv(raw);
  const headers = rows.shift() ?? [];
  return rows
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
    .filter((row) => row.genre === 'Pokemon Card');
}

function parseProductName(productName) {
  const raw = String(productName ?? '').trim();
  const match = raw.match(/^(?<name>.+?)\s*(?<variants>(?:\[[^\]]+\]\s*)*)#(?<number>[A-Za-z0-9.-]+)(?:\b|$)/);
  if (!match?.groups) return null;
  const variantLabels = [...match.groups.variants.matchAll(/\[([^\]]+)\]/g)].map((entry) => entry[1].trim());
  return {
    card_name: match.groups.name.trim(),
    card_number: normalizeNumber(match.groups.number),
    variant_labels: variantLabels,
    variant_text: variantLabels.join(' '),
  };
}

function finishFromText(text) {
  if (/\breverse\s+holo\b|\breverse\s+foil\b|\breverse\b/.test(text)) return 'reverse';
  if (/\bnon\s*holo\b|\bnonholo\b|\bnon\s*foil\b|\bnonfoil\b/.test(text)) return 'normal';
  if (/\bcosmos\b|\bcosmo\b/.test(text)) return 'cosmos';
  if (/\bcracked\s+ice\b/.test(text)) return 'cracked_ice';
  if (/\bcrosshatch\s+holo\b|\bholofoil\b|\bholographic\b|\bholo\b|\bfoil\b/.test(text)) return 'holo';
  return null;
}

function stampFamilyMatches(target, text, stampText) {
  const variant = comparable(target.variant_key);
  const label = comparable(target.stamp_label);
  if (variant.includes('prize pack')) return /\bprize pack\b/.test(stampText);
  if (variant.includes('league cup staff')) return /\bleague cup\b/.test(stampText) && /\bstaff\b/.test(stampText);
  if (variant === 'league stamp') return /\bleague\b/.test(stampText) && !/\bstaff\b|\bprize pack\b/.test(stampText);
  if (variant.includes('prerelease')) return /\bpre release\b|\bprerelease\b/.test(stampText);
  if (variant.includes('professor')) return /\bprofessor program\b|\bprofessor stamp\b|\bprofessor\s+program\s+stamp\b/.test(stampText);
  if (variant.includes('staff')) return /\bstaff\b/.test(stampText) && label.split(' ').filter((part) => part.length > 3).some((part) => stampText.includes(part));
  if (variant.includes('battle academy')) return /\bbattle academy\b/.test(stampText);
  if (variant.includes('halloween') || variant.includes('jack o lantern') || variant.includes('pumpkin')) return /\btrick or trade\b|\bhalloween\b|\bpumpkin\b|\bjack o lantern\b/.test(stampText);
  if (variant.includes('play pokemon') || variant.includes('thank you')) return /\bplay\b/.test(stampText) && /\bthank you\b|\bpokemon\b/.test(stampText);
  if (variant.includes('championship') || variant.includes('finalist')) return /\bchampionship\b|\bchampionships\b|\bfinalist\b|\bregional\b|\bnational\b|\bworld\b/.test(stampText);
  if (variant.includes('mcdonalds')) return /\bmcdonalds\b|\bmcdonald s\b/.test(stampText);
  if (variant.includes('eb games')) return /\beb games\b/.test(stampText);
  return label.split(' ').filter((part) => part.length > 3).every((part) => stampText.includes(part));
}

function targetRows(queue) {
  return (queue.rows ?? [])
    .filter((row) => row.queue_status === 'active_finish_required')
    .filter((row) => row.variant_key && row.variant_key !== 'unknown')
    .filter((row) => row.card_number && row.card_name && row.set_name)
    .sort((left, right) => String(left.variant_key).localeCompare(String(right.variant_key))
      || String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

function sourceProducts(csvRows) {
  return csvRows
    .map((row) => ({ row, parsed: parseProductName(row['product-name']) }))
    .filter((entry) => entry.parsed);
}

function candidateMatchesTarget(target, entry) {
  if (compactNumber(target.card_number) !== compactNumber(entry.parsed.card_number)) return { ok: false, reason: 'number_mismatch' };
  if (comparable(target.card_name) !== comparable(entry.parsed.card_name)) return { ok: false, reason: 'name_mismatch' };
  const text = comparable(`${entry.row['console-name']} ${entry.row['product-name']} ${entry.parsed.variant_text}`);
  const sourceSet = comparable(entry.row['console-name']);
  const targetSet = comparable(target.set_name);
  if (!sourceSet.includes(targetSet) && !text.includes(targetSet)) return { ok: false, reason: 'set_mismatch' };
  const cardNameText = comparable(entry.parsed.card_name);
  const stampText = text.replace(cardNameText, ' ');
  if (!stampFamilyMatches(target, text, stampText)) return { ok: false, reason: 'stamp_family_mismatch' };
  const finishKey = finishFromText(text);
  if (!ACTIVE_FINISHES.has(finishKey)) return { ok: false, reason: 'missing_explicit_active_finish' };
  return { ok: true, finish_key: finishKey };
}

function evidenceRecord(target, candidate, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: sourceUrl(candidate.row),
    set_key: target.set_key,
    set_name: target.set_name,
    card_number: target.card_number,
    card_name: target.card_name,
    finish_key: candidate.finish_key,
    variant_key: target.variant_key,
    stamp_label: target.stamp_label,
    evidence_type: 'finish_presence',
    evidence_label: `PriceCharting exact stamped product title: ${candidate.row['product-name']}`,
    evidence_text_or_label: `${candidate.row['console-name']} / ${candidate.row['product-name']}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `${SOURCE_KEY}:${candidate.row.id}:${target.set_key}:${target.card_number}:${target.variant_key}:${candidate.finish_key}`,
    notes: 'Accepted only because set, card number, card name, stamp family, and explicit active finish text matched exactly.',
  };
}

function renderMarkdown(report) {
  const candidateRows = report.rows
    .filter((row) => row.status === 'candidate_pricecharting_exact_stamped_active_finish')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.finish_key, row.source_url]);
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  return `# PKG-18N PriceCharting Current Stamped Active Finish Acquisition V1

Audit-only current-queue PriceCharting CSV acquisition for stamped active child finish evidence.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['csv_rows_reviewed', report.summary.csv_rows_reviewed],
    ['candidate_rows', report.summary.candidate_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['fixture_records_written', report.summary.fixture_records_written],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Status

${markdownTable(['status', 'rows'], statusRows)}

## Candidate Rows

${candidateRows.length ? markdownTable(['set', 'number', 'card', 'variant', 'finish', 'url'], candidateRows) : 'No candidates found.'}

## Guardrails

- This report creates evidence fixtures only.
- No DB writes, migrations, cleanup, or quarantine.
- Candidates are not apply authority without a separate readiness package and rollback-only dry-run.
`;
}

async function writeFixture(records, generatedAt) {
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  if (!records.length) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/console/pokemon-cards',
    source_status: 'available_generated_current_queue',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:pkg18n_pricecharting_current_stamped_active_finish:${generatedAt}`,
    records,
  };
  await writeJson(FIXTURE_JSON, fixture);
  return rel(FIXTURE_JSON);
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [queue, csvRows] = await Promise.all([
    readJson(QUEUE_JSON),
    readCsv(CSV_PATH),
  ]);
  const targets = targetRows(queue);
  const products = sourceProducts(csvRows);
  const rows = targets.map((target) => {
    const matches = products
      .map((entry) => ({ entry, match: candidateMatchesTarget(target, entry) }))
      .filter(({ match }) => match.ok)
      .map(({ entry, match }) => ({
        row: entry.row,
        parsed: entry.parsed,
        finish_key: match.finish_key,
        source_url: sourceUrl(entry.row),
      }));
    const finishes = [...new Set(matches.map((match) => match.finish_key))];
    if (matches.length === 1 && finishes.length === 1) {
      return {
        set_key: target.set_key,
        set_name: target.set_name,
        card_number: target.card_number,
        card_name: target.card_name,
        variant_key: target.variant_key,
        stamp_label: target.stamp_label,
        finish_key: finishes[0],
        status: 'candidate_pricecharting_exact_stamped_active_finish',
        source_url: matches[0].source_url,
        product_name: matches[0].row['product-name'],
        console_name: matches[0].row['console-name'],
        evidence: [evidenceRecord(target, matches[0], generatedAt)],
      };
    }
    return {
      set_key: target.set_key,
      set_name: target.set_name,
      card_number: target.card_number,
      card_name: target.card_name,
      variant_key: target.variant_key,
      stamp_label: target.stamp_label,
      finish_key: null,
      status: matches.length > 1 ? 'blocked_multiple_pricecharting_matches' : 'blocked_no_pricecharting_exact_stamped_active_finish',
      match_count: matches.length,
      candidate_finishes: finishes,
      evidence: [],
    };
  });
  const records = rows.flatMap((row) => row.evidence ?? []);
  const fixturePath = await writeFixture(records, generatedAt);
  const payload = {
    queue_fingerprint_sha256: queue.fingerprint_sha256,
    rows,
  };
  const report = {
    generated_at: generatedAt,
    version: 'english_master_index_pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_remaining_action_queue: rel(QUEUE_JSON),
      pricecharting_csv: rel(CSV_PATH),
      generated_fixture: fixturePath,
    },
    source_fingerprints: {
      stamped_remaining_action_queue: queue.fingerprint_sha256,
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: targets.length,
      csv_rows_reviewed: csvRows.length,
      candidate_rows: rows.filter((row) => row.status === 'candidate_pricecharting_exact_stamped_active_finish').length,
      blocked_rows: rows.filter((row) => row.status !== 'candidate_pricecharting_exact_stamped_active_finish').length,
      fixture_records_written: records.length,
      by_status: countBy(rows, (row) => row.status),
      by_finish: countBy(rows.filter((row) => row.finish_key), (row) => row.finish_key),
      by_variant_key: countBy(rows, (row) => row.variant_key),
      candidate_by_variant_key: countBy(rows.filter((row) => row.status === 'candidate_pricecharting_exact_stamped_active_finish'), (row) => row.variant_key),
      candidate_by_set: countBy(rows.filter((row) => row.status === 'candidate_pricecharting_exact_stamped_active_finish'), (row) => row.set_key),
    },
    rows,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fixture_path: fixturePath,
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
