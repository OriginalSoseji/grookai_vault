import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAP_FACTS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const DEFAULT_CSV_PATH = 'tmp/pricecharting/pokemon_cards_pricecharting.csv';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_csv_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pricecharting_csv_acquisition_v1';

const SUPPORTED_FINISH_SEARCH = new Map([
  ['reverse', ['reverse holo', 'reverse holofoil']],
  ['holo', ['holo', 'holofoil']],
  ['first_edition_holo', ['1st edition holo', 'first edition holo']],
  ['first_edition_normal', ['1st edition', 'first edition']],
  ['pokeball', ['poke ball reverse', 'pokeball reverse', 'poke ball']],
  ['masterball', ['master ball reverse', 'masterball reverse', 'master ball']],
  ['stamped', ['stamped', 'stamp']],
  ['cosmos', ['cosmos holo', 'cosmos']],
  ['cracked_ice', ['cracked ice holo', 'cracked ice']],
  ['rocket_reverse', ['rocket reverse', 'team rocket reverse']],
]);

const STAMP_LABEL_PATTERN = /\b(stamp|stamped|staff|prerelease|pre release|build battle|snowflake|league|championship|championships|regional|national|worlds|winner|prize pack|pokemon center|pokemon center ny|crosshatch|cross holo|professor program|program 2005|city championships|state championships|san diego comic con|toys r us|club promo|holiday calendar|pokemon day|day 2025|international championships|top 8|top sixteen|top thirty two|quarter finalist|quarterfinalist|semi finalist|semifinalist|finalist|champion|1st place|2nd place|3rd place|build a bear|7 11|eb games|gamestop|play)\b/;
const STAMP_LABEL_EXCLUSION_PATTERN = /\b(jumbo|no\s+[a-z0-9 ]*\s*stamp)\b/;

function parseArgs(argv) {
  const options = {
    csvPath: DEFAULT_CSV_PATH,
    sets: null,
    maxFacts: null,
    dryRun: false,
    includeContext: true,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--csv') {
      options.csvPath = next;
      index += 1;
    } else if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-facts') {
      options.maxFacts = Number(next);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-context') {
      options.includeContext = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\bfemale\b/g, 'f')
    .replace(/\bmale\b/g, 'm')
    .replace(/\bnidoran f\b/g, 'nidoran')
    .replace(/\bnidoran m\b/g, 'nidoran')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/^(sv|swsh|sm|xy|bw|dp|ex|me)\d+(?:pt\d+)?\s+/g, ' ')
    .replace(/^sve\s+/g, ' ')
    .replace(/^mep\s+/g, ' ')
    .replace(/\benergies\b/g, 'energy')
    .replace(/\bfire red\b/g, 'firered')
    .replace(/\bleaf green\b/g, 'leafgreen')
    .replace(/\bblack and white\b/g, 'black white')
    .replace(/\bblack star promos\b/g, 'black star promos')
    .replace(/\s+/g, ' ')
    .trim();
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

function finishSearchLabels(finishKey) {
  return SUPPORTED_FINISH_SEARCH.get(normalizeFinishKey(finishKey)) ?? [];
}

function factSortKey(fact) {
  return [
    normalizeText(fact.set_key),
    normalizeNumber(fact.card_number),
    comparable(fact.card_name),
    normalizeFinishKey(fact.finish_key),
  ].join('|');
}

async function loadTargetFacts(options) {
  const artifact = await readJson(GAP_FACTS_PATH);
  const facts = (artifact.facts ?? [])
    .filter((fact) => fact.fact_type === 'printing_finish')
    .filter((fact) => ['candidate_unconfirmed', 'human_source_verified'].includes(fact.status))
    .filter((fact) => fact.card_number && fact.card_name && fact.finish_key)
    .filter((fact) => finishSearchLabels(fact.finish_key).length > 0)
    .filter((fact) => {
      if (!options.sets) return true;
      return options.sets.has(normalizeText(fact.set_key)) || options.sets.has(normalizeText(fact.set_name));
    })
    .sort((a, b) => factSortKey(a).localeCompare(factSortKey(b), undefined, { numeric: true }));
  return Number.isFinite(options.maxFacts) && options.maxFacts > 0 ? facts.slice(0, options.maxFacts) : facts;
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
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
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
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function readPriceChartingCsv(csvPath) {
  const raw = await fs.readFile(csvPath, 'utf8');
  const rows = parseCsv(raw);
  const headers = rows.shift() ?? [];
  return rows
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function parseProductName(productName) {
  const raw = String(productName ?? '').trim();
  const match = raw.match(/^(?<name>.+?)\s*(?<variants>(?:\[[^\]]+\]\s*)*)#(?<number>[A-Za-z0-9.-]+)(?:\b|$)/);
  if (!match?.groups) return null;
  const variantLabels = [...match.groups.variants.matchAll(/\[([^\]]+)\]/g)].map((entry) => entry[1].trim());
  return {
    raw,
    card_name: match.groups.name.trim(),
    card_number: normalizeNumber(match.groups.number),
    variant_labels: variantLabels,
    variant_text: variantLabels.join(' '),
  };
}

function rowSetName(row) {
  return String(row['console-name'] ?? '').replace(/^Pokemon\s+/i, '').trim();
}

function setMatches(fact, row) {
  const factSet = setComparable(fact.set_name);
  const csvSet = setComparable(rowSetName(row));
  if (factSet === csvSet || factSet.endsWith(csvSet) || csvSet.endsWith(factSet)) return true;

  const factSetKey = normalizeText(fact.set_key);
  const factNumber = normalizeNumber(fact.card_number).toUpperCase();
  const csvConsole = setComparable(rowSetName(row));
  const promoPrefixBySet = new Map([
    ['dpp', 'DP'],
    ['bwp', 'BW'],
    ['xyp', 'XY'],
    ['smp', 'SM'],
    ['swshp', 'SWSH'],
  ]);
  const expectedPrefix = promoPrefixBySet.get(factSetKey);
  return csvConsole === 'promo' && expectedPrefix && factNumber.startsWith(expectedPrefix);
}

function finishMatches(fact, parsed) {
  const finishKey = normalizeFinishKey(fact.finish_key);
  const variantComparable = comparable(parsed.variant_text);
  if (!variantComparable) return { ok: false, reason: 'product_title_has_no_variant_label' };

  if (finishKey === 'stamped') {
    if (STAMP_LABEL_EXCLUSION_PATTERN.test(variantComparable)) {
      return { ok: false, reason: 'stamped_label_excluded_nonstandard_size_or_absence' };
    }
    if (STAMP_LABEL_PATTERN.test(variantComparable)) {
      return { ok: true, reason: 'stamped_variant_label_matched' };
    }
  }

  if (finishKey === 'holo') {
    if (variantComparable === 'holo' || variantComparable === 'holofoil') {
      return { ok: true, reason: 'exact_holo_variant_label_matched' };
    }
    return { ok: false, reason: 'generic_holo_not_promoted_from_specialized_variant_label' };
  }

  if (finishKey === 'first_edition_normal') {
    if (/\b(1st edition|first edition)\b/.test(variantComparable) && !/\bholo|holofoil|reverse|cosmos|cracked\b/.test(variantComparable)) {
      return { ok: true, reason: 'first_edition_normal_variant_label_matched' };
    }
    return { ok: false, reason: 'first_edition_normal_label_not_exact' };
  }

  const labels = finishSearchLabels(finishKey);
  for (const label of labels) {
    if (variantComparable.includes(comparable(label))) {
      return { ok: true, reason: `finish_label_matched:${label}` };
    }
  }
  return { ok: false, reason: `finish_label_not_found:${finishKey}` };
}

function exactFactMatch(fact, candidate) {
  if (!setMatches(fact, candidate.row)) return { ok: false, reason: 'set_mismatch' };
  if (normalizeNumber(fact.card_number) !== candidate.parsed.card_number) return { ok: false, reason: 'number_mismatch' };
  if (comparable(fact.card_name) !== comparable(candidate.parsed.card_name)) return { ok: false, reason: 'name_mismatch' };
  const finish = finishMatches(fact, candidate.parsed);
  if (!finish.ok) return finish;
  return { ok: true, reason: finish.reason };
}

function rowKey(row) {
  return [
    normalizeNumber(row.parsed?.card_number),
    comparable(row.parsed?.card_name),
  ].join('|');
}

function buildCandidateIndex(rows) {
  const index = new Map();
  const parsedRows = [];
  for (const row of rows) {
    if (row.genre !== 'Pokemon Card') continue;
    const parsed = parseProductName(row['product-name']);
    if (!parsed) continue;
    const candidate = {
      row,
      parsed,
      source_url: sourceUrl(row),
      title: row['product-name'],
    };
    parsedRows.push(candidate);
    const key = rowKey({ ...row, parsed });
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(candidate);
  }
  return { index, parsedRows };
}

function findCandidates(fact, index) {
  const key = [
    normalizeNumber(fact.card_number),
    comparable(fact.card_name),
  ].join('|');
  return index.get(key) ?? [];
}

function classifyFact(fact, candidates) {
  const reviewed = [];
  for (const candidate of candidates) {
    const validation = exactFactMatch(fact, candidate);
    reviewed.push({
      source_url: candidate.source_url,
      product_id: candidate.row.id,
      console_name: candidate.row['console-name'],
      product_name: candidate.row['product-name'],
      variant_labels: candidate.parsed.variant_labels,
      validation,
    });
    if (validation.ok) {
      return {
        status: 'validated',
        fact,
        source_url: candidate.source_url,
        product_id: candidate.row.id,
        console_name: candidate.row['console-name'],
        title: candidate.row['product-name'],
        variant_labels: candidate.parsed.variant_labels,
        validation,
        reviewed_candidates: reviewed,
      };
    }
  }
  if (candidates.length > 0) {
    return {
      status: 'near_match_context',
      fact,
      source_url: candidates[0].source_url,
      title: candidates[0].row['product-name'],
      reviewed_candidates: reviewed,
      validation: { ok: false, reason: 'card_found_but_finish_not_exactly_validated' },
    };
  }
  return {
    status: 'no_exact_match',
    fact,
    source_url: null,
    title: null,
    reviewed_candidates: [],
    validation: { ok: false, reason: 'no_matching_set_card_name_number_row' },
  };
}

function groupBySet(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.fact.set_key;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function fixtureRecord(row) {
  return {
    source_key: 'pricecharting_csv_product',
    source_kind: 'marketplace_checklist',
    source_url: row.source_url,
    set_name: row.fact.set_name,
    card_number: row.fact.card_number,
    card_name: row.fact.card_name,
    finish_key: normalizeFinishKey(row.fact.finish_key),
    evidence_type: 'finish_presence',
    evidence_label: `PriceCharting CSV product ${row.product_id}: ${row.title}`,
    notes: 'Exact finish evidence accepted only because the PriceCharting CSV product row matched set, card number, card name, and finish label.',
  };
}

async function writeFixtures(validatedRows, generatedAt, dryRun) {
  if (dryRun) return [];
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const files = [];
  for (const [setKey, rows] of groupBySet(validatedRows).entries()) {
    const first = rows[0].fact;
    const fixture = {
      source_key: `pricecharting_csv_${setKey}`,
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/',
      set_key: first.set_key,
      set_name: first.set_name,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `pricecharting_csv:${setKey}:${generatedAt}`,
      records: rows.map(fixtureRecord),
    };
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
    files.push(file);
  }
  return files;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

function compactResult(row) {
  return {
    status: row.status,
    fact: row.fact,
    source_url: row.source_url,
    product_id: row.product_id ?? null,
    console_name: row.console_name ?? null,
    title: row.title,
    variant_labels: row.variant_labels ?? [],
    validation: row.validation,
    reviewed_candidates: (row.reviewed_candidates ?? []).slice(0, 10),
  };
}

async function writeReports({ results, fixtureFiles, generatedAt, options, csvRows, parsedRows }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const reportResults = options.includeContext ? results : results.filter((row) => row.status === 'validated');
  const payload = {
    version: 'english_master_index_pricecharting_csv_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    rule: 'PriceCharting CSV evidence is accepted only when a product row exactly validates set, card number, card name, and finish label.',
    context_rule: 'Rows that match card identity but not exact finish remain context only and do not become finish_presence fixtures.',
    raw_csv_cached_path: options.csvPath,
    raw_csv_tracked: false,
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    summary: {
      csv_rows_read: csvRows.length,
      pokemon_card_rows_parsed: parsedRows.length,
      attempted_facts: results.length,
      by_status: countBy(results, (row) => row.status),
      validated_by_set: countBy(results.filter((row) => row.status === 'validated'), (row) => `${row.fact.set_key}|${row.fact.set_name}`),
      near_match_context_by_set: countBy(results.filter((row) => row.status === 'near_match_context'), (row) => `${row.fact.set_key}|${row.fact.set_name}`),
      fixture_files_written: fixtureFiles.length,
    },
    results: reportResults.map(compactResult),
  };
  await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_csv_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);

  const statusRows = Object.entries(payload.summary.by_status).map(([status, count]) => [status, count]);
  const validatedRows = Object.entries(payload.summary.validated_by_set).map(([key, count]) => {
    const [setKey, setName] = key.split('|');
    return [setKey, setName, count];
  });
  const contextRows = Object.entries(payload.summary.near_match_context_by_set).map(([key, count]) => {
    const [setKey, setName] = key.split('|');
    return [setKey, setName, count];
  });
  const sampleRows = results.slice(0, 200).map((row) => [
    row.status,
    row.fact.set_key,
    row.fact.card_number,
    row.fact.card_name,
    row.fact.finish_key,
    row.source_url ?? '',
    row.validation?.reason ?? '',
  ]);
  const markdown = [
    '# PriceCharting CSV Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    `CSV rows read: ${payload.summary.csv_rows_read}`,
    `Pokemon card rows parsed: ${payload.summary.pokemon_card_rows_parsed}`,
    `Attempted facts: ${payload.summary.attempted_facts}`,
    `Raw CSV cached path: ${payload.raw_csv_cached_path}`,
    `Raw CSV tracked in git: ${payload.raw_csv_tracked}`,
    '',
    markdownTable(['status', 'count'], statusRows),
    '',
    '## Validated By Set',
    '',
    markdownTable(['set_key', 'set_name', 'validated finish facts'], validatedRows),
    '',
    '## Near Match Context By Set',
    '',
    'These rows matched card identity but did not exactly prove the requested finish. They do not promote finish truth.',
    '',
    markdownTable(['set_key', 'set_name', 'context facts'], contextRows),
    '',
    '## Sample Results',
    '',
    markdownTable(['status', 'set', 'number', 'name', 'finish', 'source_url', 'reason'], sampleRows),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_csv_acquisition_v1.md'), markdown);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const facts = await loadTargetFacts(options);
  console.log(`[pricecharting-csv] target facts ${facts.length}`);
  const csvRows = await readPriceChartingCsv(options.csvPath);
  const { index, parsedRows } = buildCandidateIndex(csvRows);
  console.log(`[pricecharting-csv] pokemon card rows parsed ${parsedRows.length}`);
  const results = facts.map((fact, indexNumber) => {
    if ((indexNumber + 1) % 100 === 0 || indexNumber === 0) {
      console.log(`[pricecharting-csv] ${indexNumber + 1}/${facts.length} ${fact.set_key} ${fact.card_number} ${fact.card_name} ${fact.finish_key}`);
    }
    return classifyFact(fact, findCandidates(fact, index));
  });
  const validated = results.filter((row) => row.status === 'validated');
  const fixtureFiles = await writeFixtures(validated, generatedAt, options.dryRun);
  const report = await writeReports({ results, fixtureFiles, generatedAt, options, csvRows, parsedRows });
  console.log(`[pricecharting-csv] validated ${validated.length}`);
  console.log(`[pricecharting-csv] wrote report to ${REPORT_DIR}`);
  console.log(`[pricecharting-csv] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
