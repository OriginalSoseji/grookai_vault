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
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18d_prize_pack_finish_mapping_closure_v1.json');
const CSV_PATH = path.join(ROOT, 'tmp', 'pricecharting', 'pokemon_cards_pricecharting.csv');
const REPORT_DIR = path.join(SOURCE_DIR, 'pkg18k_pricecharting_prize_pack_finish_corroboration_v1');
const OUTPUT_JSON = path.join(REPORT_DIR, 'pkg18k_pricecharting_prize_pack_finish_corroboration_v1.json');
const OUTPUT_MD = path.join(REPORT_DIR, 'pkg18k_pricecharting_prize_pack_finish_corroboration_v1.md');
const FIXTURE_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'source_fixtures', 'generated_pkg18k_pricecharting_prize_pack_finish_corroboration_v1');

const PACKAGE_ID = 'PKG-18K-PRICECHARTING-PRIZE-PACK-FINISH-CORROBORATION';
const SOURCE_KEY = 'pricecharting_prize_pack_finish_corroboration';

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

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\bblack star promos?\b/g, 'promo')
    .replace(/\bpromos?\b/g, 'promo')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(value)
    .replace(/\bex\b/g, ' ex ')
    .replace(/\sgx\b/g, ' gx')
    .replace(/\svmax\b/g, ' vmax')
    .replace(/\svstar\b/g, ' vstar')
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
    .replace(/[''.:’]/g, '')
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

function pricechartingFinish(entry) {
  const text = comparable(`${entry.row['product-name']} ${entry.parsed.variant_text}`);
  if (!/\bprize\s+pack\b/.test(text)) return null;
  if (/\breverse\s+holo\b|\breverse\b/.test(text)) return 'reverse';
  if (/\bcosmos\b|\bcosmo\b|\bfoil\b|\bholo\b|\bholofoil\b/.test(text)) return 'cosmos';
  return 'normal';
}

function matchesRow(row, entry) {
  if (!entry.parsed) return false;
  if (compactNumber(row.card_number) !== compactNumber(entry.parsed.card_number)) return false;
  if (cardComparable(row.card_name) !== cardComparable(entry.parsed.card_name)) return false;
  const sourceSet = comparable(entry.row['console-name']);
  const targetSet = comparable(row.set_name);
  return sourceSet.includes(targetSet) || targetSet.includes(sourceSet);
}

function evidenceRecord(row, match, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: match.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    finish_key: match.finish_key,
    evidence_type: 'finish_presence',
    evidence_label: `PriceCharting exact Prize Pack product title: ${match.product_name}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `${SOURCE_KEY}:${match.product_id}:${row.set_key}:${normalizeNumber(row.card_number)}:${match.finish_key}`,
    notes: 'Exact PriceCharting CSV title match against current PKG-18D Prize Pack blocker row. No DB writes; this only corroborates active finish when another source already supports the same finish.',
  };
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

async function writeFixtures(readyRows, generatedAt) {
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  if (!readyRows.length) return [];
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const records = readyRows.flatMap((row) => row.evidence);
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/console/pokemon-cards',
    source_status: 'available_generated_current_queue',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:pkg18k_pricecharting_prize_pack_finish_corroboration:${generatedAt}`,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    records,
  };
  const file = path.join(FIXTURE_DIR, 'pricecharting_prize_pack_finish_corroboration_v1.json');
  await writeJson(file, fixture);
  return [file];
}

function classifyRow(row, entries, generatedAt) {
  const exactMatches = entries
    .filter((entry) => matchesRow(row, entry))
    .map((entry) => ({
      product_id: entry.row.id,
      product_name: entry.row['product-name'],
      console_name: entry.row['console-name'],
      source_url: sourceUrl(entry.row),
      finish_key: pricechartingFinish(entry),
    }))
    .filter((entry) => entry.finish_key);

  const finishKeys = [...new Set(exactMatches.map((match) => match.finish_key))].sort();
  let status = 'blocked_no_exact_pricecharting_prize_pack_match';
  let acceptedFinishKey = null;
  const usefulMatches = [];

  if (exactMatches.length > 0 && finishKeys.length > 1) {
    status = 'review_conflicting_pricecharting_finish_titles';
  } else if (exactMatches.length === 1) {
    acceptedFinishKey = exactMatches[0].finish_key;
    status = row.closure_status === 'blocked_second_independent_source_needed' && row.accepted_finish_key === acceptedFinishKey
      ? 'ready_second_source_pricecharting_corroborated'
      : 'review_pricecharting_single_source_only';
    usefulMatches.push(exactMatches[0]);
  } else if (exactMatches.length > 1 && finishKeys.length === 1) {
    acceptedFinishKey = finishKeys[0];
    status = row.closure_status === 'blocked_second_independent_source_needed' && row.accepted_finish_key === acceptedFinishKey
      ? 'ready_second_source_pricecharting_corroborated'
      : 'review_pricecharting_single_source_only';
    usefulMatches.push(...exactMatches);
  }

  return {
    ...row,
    pricecharting_status: status,
    pricecharting_finish_key: acceptedFinishKey,
    pricecharting_match_count: exactMatches.length,
    pricecharting_finish_counts: countBy(exactMatches, (match) => match.finish_key),
    pricecharting_matches: exactMatches.slice(0, 8),
    evidence: status === 'ready_second_source_pricecharting_corroborated'
      ? usefulMatches.map((match) => evidenceRecord(row, match, generatedAt))
      : [],
  };
}

function renderMarkdown(report) {
  const readyRows = report.rows
    .filter((row) => row.pricecharting_status === 'ready_second_source_pricecharting_corroborated')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.accepted_finish_key, row.pricecharting_matches.map((match) => match.product_name).join('; ')]);
  return `# PKG-18K PriceCharting Prize Pack Finish Corroboration V1

Audit-only PriceCharting CSV pass for current PKG-18D Prize Pack blockers.

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
    ['ready_second_source_pricecharting_corroborated', report.summary.ready_second_source_pricecharting_corroborated],
    ['review_pricecharting_single_source_only', report.summary.review_pricecharting_single_source_only],
    ['review_conflicting_pricecharting_finish_titles', report.summary.review_conflicting_pricecharting_finish_titles],
    ['blocked_no_exact_pricecharting_prize_pack_match', report.summary.blocked_no_exact_pricecharting_prize_pack_match],
    ['fixture_files_written', report.summary.fixture_files_written],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Ready Rows

${readyRows.length ? markdownTable(['set', 'number', 'card', 'finish', 'PriceCharting product'], readyRows) : 'No rows ready.'}
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [pkg18d, csvRows] = await Promise.all([
    readJson(INPUT_JSON),
    readCsv(CSV_PATH),
  ]);
  const entries = csvRows
    .filter((row) => /\bprize\s+pack\b/i.test(row['product-name']))
    .map((row) => ({ row, parsed: parseProductName(row['product-name']) }))
    .filter((entry) => entry.parsed);
  const rows = (pkg18d.rows ?? []).map((row) => classifyRow(row, entries, generatedAt));
  const readyRows = rows.filter((row) => row.pricecharting_status === 'ready_second_source_pricecharting_corroborated');
  const fixtureFiles = await writeFixtures(readyRows, generatedAt);
  const payload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    accepted_finish_key: row.accepted_finish_key,
    pricecharting_status: row.pricecharting_status,
    pricecharting_finish_key: row.pricecharting_finish_key,
    pricecharting_matches: row.pricecharting_matches.map((match) => match.product_id),
  }));
  const report = {
    generated_at: generatedAt,
    version: 'english_master_index_pkg18k_pricecharting_prize_pack_finish_corroboration_v1',
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
      prize_pack_finish_mapping_closure: rel(INPUT_JSON),
      pricecharting_csv: rel(CSV_PATH),
    },
    fixture_dir: rel(FIXTURE_DIR),
    fixture_files: fixtureFiles.map(rel),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: rows.length,
      pricecharting_prize_pack_products: entries.length,
      ready_second_source_pricecharting_corroborated: readyRows.length,
      review_pricecharting_single_source_only: rows.filter((row) => row.pricecharting_status === 'review_pricecharting_single_source_only').length,
      review_conflicting_pricecharting_finish_titles: rows.filter((row) => row.pricecharting_status === 'review_conflicting_pricecharting_finish_titles').length,
      blocked_no_exact_pricecharting_prize_pack_match: rows.filter((row) => row.pricecharting_status === 'blocked_no_exact_pricecharting_prize_pack_match').length,
      by_status: countBy(rows, (row) => row.pricecharting_status),
      by_ready_finish: countBy(readyRows, (row) => row.pricecharting_finish_key),
      by_ready_set: countBy(readyRows, (row) => row.set_key),
      fixture_files_written: fixtureFiles.length,
    },
    rows,
    next_recommended_step: readyRows.length
      ? 'Regenerate PKG-18D closure with PKG-18K as a source artifact, then prepare a guarded rollback-only dry-run for ready second-source Prize Pack rows only.'
      : 'No current Prize Pack row is second-source ready from PriceCharting CSV; continue with another exact source family.',
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    next_recommended_step: report.next_recommended_step,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
