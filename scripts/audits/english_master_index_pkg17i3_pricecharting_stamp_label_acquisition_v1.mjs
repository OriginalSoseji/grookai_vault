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
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const DEFAULT_CSV_PATH = path.join(ROOT, 'tmp', 'pricecharting', 'pokemon_cards_pricecharting.csv');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pkg17i3_pricecharting_stamp_label_acquisition_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'pkg17i3_pricecharting_stamp_label_acquisition_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'pkg17i3_pricecharting_stamp_label_acquisition_v1.md');
const FIXTURE_DIR = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures', 'generated_pricecharting_stamp_label_v1');
const FIXTURE_JSON = path.join(FIXTURE_DIR, 'pricecharting_stamp_label_candidates_v1.json');

const PACKAGE_ID = 'PKG-17I3-PRICECHARTING-STAMP-LABEL-ACQUISITION';
const PROMO_SET_KEYS = new Set(['basep', 'bwp', 'dpp', 'hgssp', 'mep', 'np', 'smp', 'svp', 'swshp', 'xyp']);

function cliValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) return process.argv[index + 1];
  return fallback;
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
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
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
    .replace(/\bblack star promos?\b/g, ' promo ')
    .replace(/\bpromos?\b/g, ' promo ')
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
  if (match?.groups) {
    return {
      card_name: match.groups.name.trim(),
      card_number: normalizeNumber(match.groups.number),
      variant_text: [...match.groups.variants.matchAll(/\[([^\]]+)\]/g)].map((entry) => entry[1].trim()).join(' '),
    };
  }

  const loose = raw.match(/^(?<name>.+?)\s+#?(?<number>[A-Z]{1,4}\d+[A-Za-z]?|\d+[A-Za-z]?)(?:\b|$)/i);
  if (!loose?.groups) return null;
  return {
    card_name: loose.groups.name.trim(),
    card_number: normalizeNumber(loose.groups.number),
    variant_text: '',
  };
}

function pricechartingEntries(rows) {
  return rows.map((row) => ({ row, parsed: parseProductName(row['product-name']) })).filter((entry) => entry.parsed);
}

function targetRows(queue) {
  return (queue.rows ?? [])
    .filter((row) => row.queue_status === 'stamp_identity_label_needed')
    .filter((row) => row.card_number && row.card_name)
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

function setMatches(target, entry) {
  const consoleName = setComparable(entry.row['console-name']);
  const targetSet = setComparable(target.set_name);
  if (consoleName.includes(targetSet) || targetSet.includes(consoleName)) return true;
  if (PROMO_SET_KEYS.has(target.set_key) && /\bpromo\b/.test(consoleName)) return true;
  if (target.set_key === 'bog' && /best\s+of\s+game/.test(consoleName)) return true;
  return false;
}

function extractStampLabel(entry) {
  const rawText = `${entry.row['console-name']} ${entry.row['product-name']} ${entry.parsed.variant_text}`;
  const text = comparable(rawText);
  const rules = [
    [/staff\s+pre\s*release|staff\s+prerelease/, 'Staff Prerelease Stamp', 'staff_prerelease_stamp'],
    [/pre\s*release|prerelease/, 'Prerelease Stamp', 'prerelease_stamp'],
    [/build\s+a\s+bear/, 'Build-A-Bear Workshop Stamp', 'build_a_bear_workshop_stamp'],
    [/toys\s+r\s+us|toysrus/, 'Toys R Us Stamp', 'toys_r_us_stamp'],
    [/gamestop/, 'GameStop Stamp', 'gamestop_stamp'],
    [/\beb\s+games\b/, 'EB Games Stamp', 'eb_games_stamp'],
    [/pokemon\s+center/, 'Pokemon Center Stamp', 'pokemon_center_stamp'],
    [/crosshatch\s+league|league\s+crosshatch/, 'Player Rewards Crosshatch Stamp', 'player_rewards_crosshatch_stamp'],
    [/\bleague\s+promo\b|\bleague\s+play\b|\bleague\b/, 'League Stamp', 'league_stamp'],
    [/prize\s+pack/, 'Prize Pack Stamp', 'prize_pack_stamp'],
    [/professor\s+program/, 'Professor Program Stamp', 'professor_program_stamp'],
    [/city\s+championships?/, 'City Championships Stamp', 'city_championships_stamp'],
    [/state\s+championships?|states\s+championships?/, 'State Championships Stamp', 'state_championships_stamp'],
    [/regional\s+championships?\s+staff/, 'Regional Championships Staff Stamp', 'regional_championships_staff_stamp'],
    [/regional\s+championships?/, 'Regional Championships Stamp', 'regional_championships_stamp'],
    [/national\s+championships?\s+staff/, 'National Championships Staff Stamp', 'national_championships_staff_stamp'],
    [/national\s+championships?/, 'National Championships Stamp', 'national_championships_stamp'],
    [/world\s+championships?\s+winner/, 'World Championships Winner Stamp', 'world_championships_winner_stamp'],
    [/world\s+championships?/, 'World Championships Stamp', 'world_championships_stamp'],
    [/battle\s+academy/, 'Battle Academy Deck Mark', 'battle_academy_deck_mark'],
    [/dragon\s+vault/, 'Dragon Vault Stamp', 'dragon_vault_stamp'],
    [/mcdonalds|mcdonald s/, "McDonald's Stamp", 'mcdonalds_stamp'],
    [/pikachu\s+jack\s+o\s+lantern/, 'Pikachu Jack-o-Lantern Stamp', 'pikachu_jack_o_lantern_stamp'],
    [/pikachu\s+pumpkin/, 'Pikachu Pumpkin Stamp', 'pikachu_pumpkin_stamp'],
    [/winner/, 'Winner Stamp', 'winner_stamp'],
    [/\bstaff\b/, 'Staff Stamp', 'staff_stamp'],
  ];
  const matches = rules
    .filter(([regex]) => regex.test(text))
    .map(([, stamp_label, variant_key]) => ({ stamp_label, variant_key }));
  const unique = new Map(matches.map((match) => [match.variant_key, match]));
  return [...unique.values()];
}

function matchTarget(target, entry) {
  if (compactNumber(target.card_number) !== compactNumber(entry.parsed.card_number)) return { ok: false, reason: 'number_mismatch' };
  if (cardComparable(target.card_name) !== cardComparable(entry.parsed.card_name)) return { ok: false, reason: 'name_mismatch' };
  if (!setMatches(target, entry)) return { ok: false, reason: 'set_mismatch' };
  const labels = extractStampLabel(entry);
  if (labels.length === 0) return { ok: false, reason: 'no_stamp_label_in_product_title' };
  if (labels.length > 1) return { ok: false, reason: 'multiple_stamp_labels_in_product_title', labels };
  return { ok: true, reason: 'exact_pricecharting_stamp_label_candidate', ...labels[0] };
}

function isJumboEntry(entry) {
  return /\bjumbo\b/i.test(`${entry.row['console-name']} ${entry.row['product-name']} ${entry.parsed.variant_text}`);
}

function preferredMatchingEntry(matchingEntries) {
  return matchingEntries.find(({ entry }) => !isJumboEntry(entry)) ?? matchingEntries[0];
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const acceptedRows = report.results
    .filter((row) => row.status === 'candidate_pricecharting_exact_stamp_label')
    .slice(0, 100)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.finish_key ?? '',
      row.accepted_stamp_label,
      row.accepted_product_name,
    ]);
  const blockedRows = Object.entries(report.summary.by_block_reason).map(([reason, count]) => [reason, count]);

  return `# PKG-17I3 PriceCharting Stamp Label Acquisition V1

Audit-only extraction from the local PriceCharting Pokemon Cards CSV. Rows are candidate-only and are not write authority.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- target_rows: ${report.summary.target_rows}
- candidate_rows: ${report.summary.candidate_rows}
- blocked_rows: ${report.summary.blocked_rows}
- csv_rows_reviewed: ${report.summary.csv_rows_reviewed}
- fixture_records_written: ${report.summary.fixture_records_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Block Reasons

${markdownTable(['reason', 'rows'], blockedRows)}

## Candidate Rows

${acceptedRows.length ? markdownTable(['set', 'number', 'card', 'finish', 'candidate stamp label', 'PriceCharting product'], acceptedRows) : 'No candidate rows were found.'}

## Rule

Candidate rows require a separate readiness package before any DB write. This report does not authorize parent inserts, child inserts, deletes, cleanup, or migrations.
`;
}

async function writeFixture(report, generatedAt) {
  const records = report.results
    .filter((row) => row.status === 'candidate_pricecharting_exact_stamp_label')
    .map((row) => ({
      source_key: 'pricecharting_csv_product_stamp_label',
      source_kind: 'marketplace_checklist',
      source_url: row.source_url,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key ?? null,
      variant_key: row.accepted_variant_key,
      stamp_label: row.accepted_stamp_label,
      rarity: null,
      evidence_type: 'stamp_identity_label',
      evidence_label: row.evidence_label,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `pricecharting_stamp_label:${row.set_key}:${row.card_number}:${row.accepted_variant_key}`,
      notes: 'Candidate-only exact stamp identity label from local PriceCharting CSV product title. Not DB write authority and not finish truth by itself.',
    }));

  await writeJson(FIXTURE_JSON, {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_STAMP_IDENTITY_LABEL_CANDIDATES',
    source_key: 'pricecharting_csv_product_stamp_label',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/',
    source_status: 'available_local_csv_snapshot',
    retrieved_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    promotion_status: 'candidate_only_requires_guarded_readiness',
    records,
  });
  return records.length;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const csvPath = cliValue('csv', DEFAULT_CSV_PATH);
  const [queue, csvRows] = await Promise.all([readJson(INPUT_JSON), readCsv(csvPath)]);
  const targets = targetRows(queue);
  const entries = pricechartingEntries(csvRows);
  const results = [];

  for (const target of targets) {
    const matchingEntries = [];
    const reasons = {};
    for (const entry of entries) {
      const match = matchTarget(target, entry);
      if (match.ok) matchingEntries.push({ entry, match });
      else reasons[match.reason] = (reasons[match.reason] ?? 0) + 1;
    }

    const matchingLabelKeys = [...new Set(matchingEntries.map(({ match }) => match.variant_key))];
    if (matchingEntries.length > 0 && matchingLabelKeys.length === 1) {
      const { entry, match } = preferredMatchingEntry(matchingEntries);
      results.push({
        status: 'candidate_pricecharting_exact_stamp_label',
        set_key: target.set_key,
        set_name: target.set_name,
        card_number: target.card_number,
        card_name: target.card_name,
        finish_key: target.finish_key,
        accepted_stamp_label: match.stamp_label,
        accepted_variant_key: match.variant_key,
        accepted_product_name: entry.row['product-name'],
        matched_product_count: matchingEntries.length,
        matched_products: matchingEntries.slice(0, 8).map(({ entry: matchedEntry }) => ({
          product_name: matchedEntry.row['product-name'],
          source_url: sourceUrl(matchedEntry.row),
        })),
        source_key: 'pricecharting_csv_product',
        source_kind: 'marketplace_checklist',
        source_url: sourceUrl(entry.row),
        evidence_label: `PriceCharting CSV exact product title candidate: ${entry.row['product-name']}`,
        notes: 'Candidate-only stamp label extracted from exact set/name/number PriceCharting product title. Requires separate readiness review before any write.',
        write_ready_now: 0,
      });
    } else {
      results.push({
        status: matchingEntries.length > 1 ? 'blocked_conflicting_pricecharting_stamp_label_candidates' : 'blocked_no_pricecharting_stamp_label_candidate',
        set_key: target.set_key,
        set_name: target.set_name,
        card_number: target.card_number,
        card_name: target.card_name,
        finish_key: target.finish_key,
        match_count: matchingEntries.length,
        candidate_products: matchingEntries.slice(0, 8).map(({ entry, match }) => ({
          product_name: entry.row['product-name'],
          stamp_label: match.stamp_label,
          variant_key: match.variant_key,
          source_url: sourceUrl(entry.row),
        })),
        block_reason: matchingEntries.length > 1 ? 'conflicting_stamp_labels' : 'no_exact_product_with_stamp_label',
        sampled_reject_reasons: reasons,
        write_ready_now: 0,
      });
    }
  }

  const payload = {
    input_fingerprint: queue.fingerprint_sha256,
    csv_path: rel(csvPath),
    results,
  };
  const report = {
    generated_at: generatedAt,
    version: 'pkg17i3_pricecharting_stamp_label_acquisition_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifact: rel(INPUT_JSON),
    csv_path: rel(csvPath),
    fixture_file: rel(FIXTURE_JSON),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: targets.length,
      csv_rows_reviewed: entries.length,
      candidate_rows: results.filter((row) => row.status === 'candidate_pricecharting_exact_stamp_label').length,
      blocked_rows: results.filter((row) => row.status !== 'candidate_pricecharting_exact_stamp_label').length,
      fixture_records_written: 0,
      by_status: countBy(results, (row) => row.status),
      by_candidate_stamp_label: countBy(results.filter((row) => row.status === 'candidate_pricecharting_exact_stamp_label'), (row) => row.accepted_stamp_label),
      by_set: countBy(results, (row) => row.set_key),
      by_block_reason: countBy(results.filter((row) => row.status !== 'candidate_pricecharting_exact_stamp_label'), (row) => row.block_reason),
    },
    results,
  };

  report.summary.fixture_records_written = await writeFixture(report, generatedAt);
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
