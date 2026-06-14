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
const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const CSV_PATH = path.join(ROOT, 'tmp', 'pricecharting', 'pokemon_cards_pricecharting.csv');
const REPORT_DIR = path.join(SOURCE_DIR, 'pkg17l_pricecharting_league_active_finish_acquisition_v1');
const FIXTURE_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'source_fixtures', 'generated_pkg17l_pricecharting_league_active_finish_acquisition_v1');
const OUTPUT_JSON = path.join(REPORT_DIR, 'pkg17l_pricecharting_league_active_finish_acquisition_v1.json');
const OUTPUT_MD = path.join(REPORT_DIR, 'pkg17l_pricecharting_league_active_finish_acquisition_v1.md');
const FIXTURE_JSON = path.join(FIXTURE_DIR, 'pricecharting_league_active_finish_candidates_v1.json');

const PACKAGE_ID = 'PKG-17L-PRICECHARTING-LEAGUE-ACTIVE-FINISH-ACQUISITION';
const SOURCE_KEY = 'pricecharting_csv_league_active_finish';
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
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\bex\b/g, ' ex ')
    .replace(/\sgx\b/g, ' gx')
    .replace(/\svmax\b/g, ' vmax')
    .replace(/\svstar\b/g, ' vstar')
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/\benglish\b/g, ' ')
    .replace(/\bblack star promos?\b/g, 'promo')
    .replace(/\bpromos?\b/g, 'promo')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+/, '');
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

function targetRows(pkg17a) {
  return (pkg17a.rows ?? [])
    .filter((row) => row.queue_status === 'active_finish_required')
    .filter((row) => ['league_stamp', 'league_cup_staff_stamp'].includes(row.variant_key))
    .filter((row) => row.card_number && row.card_name && row.set_name)
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

function finishFromProduct(entry) {
  const text = comparable(`${entry.row['console-name']} ${entry.row['product-name']} ${entry.parsed.variant_text}`);
  if (/\breverse\s+holo\b|\breverse\s+foil\b/.test(text)) return 'reverse';
  if (/\bnon\s*holo\b|\bnonholo\b|\bnon\s*foil\b|\bnonfoil\b/.test(text)) return 'normal';
  if (/\bcosmos\b/.test(text)) return 'cosmos';
  if (/\bcracked\s+ice\b/.test(text)) return 'cracked_ice';
  if (/\bcrosshatch\s+holo\b|\bholo\b|\bholofoil\b|\bholographic\b|\bfoil\b/.test(text)) return 'holo';
  return null;
}

function variantMatches(target, entry) {
  const text = comparable(`${entry.row['console-name']} ${entry.row['product-name']} ${entry.parsed.variant_text}`);
  if (target.variant_key === 'league_cup_staff_stamp') return /\bleague\s+cup\b/.test(text) && /\bstaff\b/.test(text);
  return /\bleague\b|\bpokemon\s+league\b/.test(text)
    && !/\bprize\s+pack\b/.test(text)
    && !/\b1st\s+place\b|\b2nd\s+place\b|\b3rd\s+place\b|\b4th\s+place\b/.test(text)
    && !/\bstaff\b/.test(text);
}

function candidateMatchesTarget(target, entry) {
  if (compactNumber(target.card_number) !== compactNumber(entry.parsed.card_number)) return { ok: false, reason: 'number_mismatch' };
  if (comparable(target.card_name) !== comparable(entry.parsed.card_name)) return { ok: false, reason: 'name_mismatch' };
  const sourceSet = setComparable(entry.row['console-name']);
  const targetSet = setComparable(target.set_name);
  if (!sourceSet.includes(targetSet) && !targetSet.includes(sourceSet)) return { ok: false, reason: 'set_mismatch' };
  if (!variantMatches(target, entry)) return { ok: false, reason: 'league_variant_mismatch' };
  const finishKey = finishFromProduct(entry);
  if (!ACTIVE_FINISHES.has(finishKey)) return { ok: false, reason: 'missing_explicit_active_finish' };
  return { ok: true, finish_key: finishKey };
}

function evidenceRecord(target, candidate) {
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
    evidence_label: `PriceCharting CSV exact League product title: ${candidate.row['product-name']}`,
    evidence_text_or_label: candidate.row['product-name'],
    language: 'en',
    retrieved_at: new Date().toISOString(),
    raw_snapshot_ref: `pricecharting_league_active_finish:${target.set_key}:${target.card_number}:${target.variant_key}:${candidate.finish_key}`,
    notes: 'Accepted only because set, card number, card name, League stamp family, and explicit active finish text matched exactly.',
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const candidateRows = report.rows
    .filter((row) => row.status === 'candidate_pricecharting_exact_league_active_finish')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.finish_key, row.source_url]);
  const blockedRows = report.rows
    .filter((row) => row.status !== 'candidate_pricecharting_exact_league_active_finish')
    .slice(0, 60)
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.status, row.block_reason]);

  return `# PKG-17L PriceCharting League Active Finish Acquisition V1

Audit-only extraction of exact active finish evidence from local PriceCharting CSV product titles for League stamped rows.

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

## Status Counts

${markdownTable(['status', 'count'], statusRows)}

## Candidate Rows

${markdownTable(['set', 'number', 'card', 'variant', 'finish', 'source_url'], candidateRows)}

## Blocked Sample

${markdownTable(['set', 'number', 'card', 'variant', 'status', 'reason'], blockedRows)}
`;
}

async function main() {
  const [pkg17a, csvRows] = await Promise.all([readJson(PKG17A_JSON), readCsv(CSV_PATH)]);
  const targets = targetRows(pkg17a);
  const parsedProducts = csvRows
    .map((row) => ({ row, parsed: parseProductName(row['product-name']) }))
    .filter((entry) => entry.parsed)
    .filter((entry) => /\bleague\b/i.test(`${entry.row['console-name']} ${entry.row['product-name']} ${entry.parsed.variant_text}`));

  const rows = [];
  const fixtureRecords = [];
  for (const target of targets) {
    const matches = [];
    const nearMissReasons = {};
    for (const entry of parsedProducts) {
      const match = candidateMatchesTarget(target, entry);
      if (match.ok) matches.push({ ...entry, finish_key: match.finish_key });
      else nearMissReasons[match.reason] = (nearMissReasons[match.reason] ?? 0) + 1;
    }
    const uniqueFinishes = [...new Set(matches.map((match) => match.finish_key))].sort();
    if (matches.length === 1 || uniqueFinishes.length === 1) {
      const selected = matches[0];
      const record = evidenceRecord(target, selected);
      fixtureRecords.push(record);
      rows.push({
        ...target,
        status: 'candidate_pricecharting_exact_league_active_finish',
        finish_key: selected.finish_key,
        candidate_count: matches.length,
        source_url: record.source_url,
        evidence_label: record.evidence_label,
        product_name: selected.row['product-name'],
      });
    } else if (matches.length > 1) {
      rows.push({
        ...target,
        status: 'blocked_conflicting_pricecharting_league_active_finish_candidates',
        block_reason: 'multiple_explicit_finish_candidates',
        candidate_finishes: uniqueFinishes,
        candidate_count: matches.length,
      });
    } else {
      rows.push({
        ...target,
        status: 'blocked_no_pricecharting_exact_league_active_finish',
        block_reason: 'no_exact_product_with_explicit_active_finish',
        near_miss_reasons: nearMissReasons,
      });
    }
  }

  await writeJson(FIXTURE_JSON, fixtureRecords);
  const payload = {
    pkg17a_fingerprint: pkg17a.fingerprint_sha256,
    source_key: SOURCE_KEY,
    rows,
    fixtureRecords,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'pkg17l_pricecharting_league_active_finish_acquisition_v1',
    package_id: PACKAGE_ID,
    source_artifact: path.relative(ROOT, PKG17A_JSON).replaceAll('\\', '/'),
    csv_path: path.relative(ROOT, CSV_PATH).replaceAll('\\', '/'),
    fixture_path: path.relative(ROOT, FIXTURE_JSON).replaceAll('\\', '/'),
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: targets.length,
      csv_rows_reviewed: csvRows.length,
      candidate_rows: rows.filter((row) => row.status === 'candidate_pricecharting_exact_league_active_finish').length,
      blocked_rows: rows.filter((row) => row.status !== 'candidate_pricecharting_exact_league_active_finish').length,
      fixture_records_written: fixtureRecords.length,
      by_status: countBy(rows, (row) => row.status),
      by_finish: countBy(rows.filter((row) => row.finish_key), (row) => row.finish_key),
      by_set: countBy(rows, (row) => row.set_key),
      by_variant_key: countBy(rows, (row) => row.variant_key),
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    fixture_path: path.relative(ROOT, FIXTURE_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
