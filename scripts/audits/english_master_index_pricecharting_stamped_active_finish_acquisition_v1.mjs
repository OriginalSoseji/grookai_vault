import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const INPUT_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json';
const DEFAULT_CSV_PATH = 'tmp/pricecharting/pokemon_cards_pricecharting.csv';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pricecharting_stamped_active_finish_acquisition_v1';
const SOURCE_KEY = 'pricecharting_stamped_active_finish';

const ACTIVE_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);

function parseArgs(argv) {
  const options = { csvPath: DEFAULT_CSV_PATH };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--csv') {
      options.csvPath = next;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
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

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(value)
    .replace(/\bex\b/g, ' ex ')
    .replace(/\sgx\b/g, ' gx')
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

async function readCsv(file) {
  const raw = await fs.readFile(file, 'utf8');
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

function targetRows(report) {
  return (report.rows ?? [])
    .filter((row) => row.routing_status === 'blocked_missing_exact_finish_phrase')
    .filter((row) => row.proposed_variant_key && row.proposed_variant_key !== 'stamped')
    .filter((row) => row.card_number && row.card_name)
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

function finishFromProduct(entry) {
  const text = comparable(`${entry.row['console-name']} ${entry.row['product-name']} ${entry.parsed.variant_text}`);
  if (/\breverse\s+holo\b/.test(text)) return 'reverse';
  if (/\bnon\s*holo\b|\bnonholo\b|\bnon\s*foil\b|\bnonfoil\b/.test(text)) return 'normal';
  if (/\bcosmos\b/.test(text)) return 'cosmos';
  if (/\bcracked\s+ice\b/.test(text)) return 'cracked_ice';
  if (/\bholo\b|\bholofoil\b|\bholographic\b|\bfoil\b/.test(text)) return 'holo';
  return null;
}

function variantMatches(row, entry) {
  const text = comparable(`${entry.row['console-name']} ${entry.row['product-name']} ${entry.parsed.variant_text}`);
  const variant = normalizeText(row.proposed_variant_key);
  const stampLabel = comparable(row.stamp_label);

  if (variant === 'staff_stamp') return /\bstaff\b/.test(text);
  if (variant === 'prerelease_stamp') return /\bpre\s*release\b|\bprerelease\b/.test(text) && !/\bstaff\b/.test(text);
  if (variant === 'play_pokemon_stamp') return (/\bleague\b|\bplay\b|\bpokemon\s+league\b/.test(text)) && !/\bprize\s+pack\b/.test(text);
  if (variant === 'battle_academy_deck_mark') return /\bbattle\s+academy\b|\bcinderace\s+stamp\b|\bpikachu\s+stamp\b/.test(text);
  if (variant === 'pikachu_stamp') return /\bpikachu\s+stamp\b/.test(text);
  if (variant === 'alolan_raichu_half_deck_14_stamp') return /\balolan\s+raichu\b|\bhalf\s+deck\b|\bbattle\s+academy\b/.test(text);

  if (stampLabel) {
    const terms = stampLabel.split(/\s+/).filter((term) => term.length > 2 && !['stamp', 'stamped'].includes(term));
    if (terms.length >= 2 && terms.every((term) => text.includes(term))) return true;
  }
  return false;
}

function candidateMatchesTarget(target, entry) {
  if (compactNumber(target.card_number) !== compactNumber(entry.parsed.card_number)) return { ok: false, reason: 'number_mismatch' };
  if (cardComparable(target.card_name) !== cardComparable(entry.parsed.card_name)) return { ok: false, reason: 'name_mismatch' };
  if (!setComparable(entry.row['console-name']).includes(setComparable(target.set_name))
    && !setComparable(target.set_name).includes(setComparable(entry.row['console-name']))) {
    return { ok: false, reason: 'set_mismatch' };
  }
  if (!variantMatches(target, entry)) return { ok: false, reason: 'stamp_variant_mismatch' };
  const finishKey = finishFromProduct(entry);
  if (!ACTIVE_FINISHES.has(finishKey)) return { ok: false, reason: 'missing_explicit_active_finish' };
  if (!(target.base_parent_child_finishes ?? []).includes(finishKey)) return { ok: false, reason: 'claimed_finish_not_on_base_parent', finish_key: finishKey };
  return { ok: true, reason: 'exact_pricecharting_stamped_active_finish_match', finish_key: finishKey };
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const acceptedRows = report.results
    .filter((row) => row.status === 'accepted_exact_pricecharting_stamped_active_finish_match')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.proposed_variant_key, row.accepted_finish_key, row.accepted_product_name]);
  return `# PriceCharting Stamped Active Finish Acquisition V1

Audit-only extraction from the preserved PriceCharting CSV. Rows are accepted only when one product title matches set, card number, card name, stamped identity, and an explicit active finish label.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- target_rows: ${report.summary.target_rows}
- records_generated: ${report.summary.records_generated}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Accepted Rows

${markdownTable(['set', 'number', 'name', 'variant', 'finish', 'product'], acceptedRows)}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [routing, csvRows] = await Promise.all([readJson(INPUT_JSON), readCsv(options.csvPath)]);
  const targets = targetRows(routing);
  const entries = csvRows.map((row) => ({ row, parsed: parseProductName(row['product-name']) })).filter((entry) => entry.parsed);
  const results = [];

  for (const target of targets) {
    const reviewed = [];
    for (const entry of entries) {
      const validation = candidateMatchesTarget(target, entry);
      if (validation.ok || !['number_mismatch', 'name_mismatch', 'set_mismatch'].includes(validation.reason)) {
        reviewed.push({
          product_id: entry.row.id,
          console_name: entry.row['console-name'],
          product_name: entry.row['product-name'],
          source_url: sourceUrl(entry.row),
          validation,
        });
      }
    }
    const valid = reviewed.filter((row) => row.validation.ok);
    const finishKeys = [...new Set(valid.map((row) => row.validation.finish_key))].sort();
    if (valid.length === 1 && finishKeys.length === 1) {
      results.push({
        ...target,
        status: 'accepted_exact_pricecharting_stamped_active_finish_match',
        accepted_finish_key: finishKeys[0],
        accepted_product_id: valid[0].product_id,
        accepted_product_name: valid[0].product_name,
        accepted_source_url: valid[0].source_url,
        accepted_evidence_label: `PriceCharting exact stamped active finish: ${valid[0].product_name}`,
        reviewed_candidates: valid,
      });
    } else {
      results.push({
        ...target,
        status: valid.length > 1 ? 'blocked_multiple_exact_pricecharting_active_finish_matches' : 'no_exact_pricecharting_active_finish_match',
        candidate_count: valid.length,
        candidate_finish_keys: finishKeys,
        reviewed_candidates: reviewed.slice(0, 12),
      });
    }
  }

  const accepted = results.filter((row) => row.status === 'accepted_exact_pricecharting_stamped_active_finish_match');
  const fingerprintPayload = accepted.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    accepted_finish_key: row.accepted_finish_key,
    accepted_product_id: row.accepted_product_id,
  }));
  const report = {
    version: 'english_master_index_pricecharting_stamped_active_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/console/pokemon-cards',
    rule: 'Accept only one exact PriceCharting CSV product match with set, card number, card name, stamped identity, and explicit active finish label.',
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    summary: {
      target_rows: targets.length,
      records_generated: accepted.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(accepted, (row) => row.accepted_finish_key),
      by_variant: countBy(accepted, (row) => row.proposed_variant_key),
      by_set: countBy(accepted, (row) => row.set_key),
    },
    results,
  };
  const outputJson = path.join(REPORT_DIR, 'pricecharting_stamped_active_finish_acquisition_v1.json');
  const outputMd = path.join(REPORT_DIR, 'pricecharting_stamped_active_finish_acquisition_v1.md');
  await writeJson(outputJson, report);
  await writeText(outputMd, renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
