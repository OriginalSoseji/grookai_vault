import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/cardtrader_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const BLUEPRINT_URL = 'https://www.cardtrader.com/en/manasearch/5/blueprints.json';

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = { sets: null, dryRun: false, refreshCache: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--refresh-cache') {
      options.refreshCache = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\bpoke\b/g, 'poke')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/\benglish\b/g, ' ')
    .replace(/\bexpansion\b/g, ' ')
    .replace(/\bball and rocket reverse holo\b/g, ' ')
    .replace(/\bball rocket reverse holo\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardTraderUrl(id) {
  return `https://www.cardtrader.com/en/cards/${encodeURIComponent(id)}`;
}

function parseBlueprintName(name) {
  const decoded = decodeHtml(name);
  const [nameAndVariant, numberPart] = decoded.split(/\s+\|\s+/);
  if (!nameAndVariant || !numberPart) return null;
  const [cardName, ...variantParts] = nameAndVariant.split(/\s+-\s+/);
  return {
    card_name: cardName?.trim() ?? '',
    variant_label: variantParts.join(' - ').trim(),
    card_number: numberPart.trim().replace(/^[A-Z]{2,}\s+/i, ''),
  };
}

function explicitFinishDescriptor(row) {
  const decoded = decodeHtml(row?.n);
  const [nameAndVariant = '', ...pipeParts] = decoded.split(/\s+\|\s+/);
  const [, ...variantParts] = nameAndVariant.split(/\s+-\s+/);
  return comparable([
    variantParts.join(' - '),
    ...pipeParts,
  ].join(' '));
}

export function finishFromBlueprint(row) {
  const parsed = parseBlueprintName(row.n);
  const label = comparable(`${parsed?.variant_label ?? ''} ${row.x ?? ''} ${row.id ?? ''}`);
  const finishDescriptor = explicitFinishDescriptor(row);
  if (label.includes('jumbo') || label.includes('oversized')) return null;
  if (label.includes('rocket reverse holo') || label.includes('rocket reverse')) return 'rocket_reverse';
  if (label.includes('master ball reverse holo') || label.includes('masterball reverse holo')) return 'masterball';
  if (label.includes('poke ball reverse holo') || label.includes('pokeball reverse holo')) return 'pokeball';
  if (/\b(player rewards|league promo|pokemon league|regional championships|staff)\b/.test(label)) return 'stamped';
  if (label.includes('stamped reverse holo') || label.includes('stamp')) return 'stamped';
  if (label.includes('cosmos holo')) return 'cosmos';
  if (label.includes('cracked ice holo')) return 'cracked_ice';
  if (label.includes('reverse holo')) return 'reverse';
  if (/\bnon holo\b/.test(finishDescriptor)) return 'normal';
  if (/\bnormal\b/.test(finishDescriptor) && !/\b(?:1st|first) edition normal\b/.test(finishDescriptor)) return 'normal';
  if (label.includes('holo rare') || label === 'holo' || /\bholo\b/.test(label)) return 'holo';
  return null;
}

function finishMatches(factFinish, blueprintFinish) {
  const fact = normalizeFinishKey(factFinish);
  const candidate = normalizeFinishKey(blueprintFinish);
  if (fact === 'master_ball_reverse') return candidate === 'masterball';
  if (fact === 'poke_ball_reverse') return candidate === 'pokeball';
  return fact === candidate;
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    comparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

export function blueprintKey(row) {
  const parsed = parseBlueprintName(row.n);
  const finish = finishFromBlueprint(row);
  if (!parsed || !finish || !row.cn) return null;
  return {
    card_number: normalizeNumber(row.cn ?? parsed.card_number),
    card_name: parsed.card_name,
    finish_key: finish,
    set_name: row.x,
    source_url: cardTraderUrl(row.id),
    raw: row,
  };
}

function setMatchesFact(candidateSetName, fact, candidate) {
  const candidateSet = setComparable(candidateSetName);
  const factSet = setComparable(fact.set_name);
  if (candidateSet === factSet || candidateSet.includes(factSet) || factSet.includes(candidateSet)) return true;
  if (candidateSet === `${factSet} promos`) return true;
  if (
    candidateSet === 'league promos'
    && normalizeFinishKey(fact.finish_key) === 'stamped'
    && normalizeFinishKey(candidate.finish_key) === 'stamped'
  ) {
    return true;
  }
  return false;
}

function targetFacts(gaps, options) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function priorCardTraderFacts(printings, options) {
  return (printings.printings ?? [])
    .filter((row) => (row.sources ?? []).includes('cardtrader_blueprint_index'))
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function mergeFacts(...groups) {
  const out = new Map();
  for (const group of groups) {
    for (const row of group) out.set(factKey(row), row);
  }
  return [...out.values()];
}

async function fetchBlueprints(options) {
  const cacheFile = path.join(CACHE_DIR, 'cardtrader_blueprints_pokemon.json');
  if (!options.refreshCache) {
    try {
      return JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '120',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    BLUEPRINT_URL,
  ], { timeout: 140000, maxBuffer: 80 * 1024 * 1024 });
  const rows = JSON.parse(stdout);
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, `${JSON.stringify(rows)}\n`);
  }
  return rows;
}

export function findMatches(facts, blueprints) {
  const bySet = new Map();
  for (const row of blueprints) {
    if (row.g !== 5 || !row.cn || !row.n || !row.x) continue;
    const parsed = blueprintKey(row);
    if (!parsed) continue;
    const setKey = setComparable(parsed.set_name);
    if (!bySet.has(setKey)) bySet.set(setKey, []);
    bySet.get(setKey).push(parsed);
  }

  const recordsBySet = new Map();
  const results = [];
  for (const fact of facts) {
    const candidateSets = [...bySet.entries()]
      .filter(([setName, rows]) => rows.some((row) => setMatchesFact(setName, fact, row)))
      .flatMap(([, rows]) => rows);
    const matches = candidateSets.filter((row) => (
      normalizeNumber(row.card_number) === normalizeNumber(fact.card_number)
      && comparable(row.card_name) === comparable(fact.card_name)
      && finishMatches(fact.finish_key, row.finish_key)
    ));
    if (matches.length === 0) {
      results.push({ ...fact, status: 'no_exact_match', records_generated: 0 });
      continue;
    }
    for (const match of matches.slice(0, 1)) {
      const record = {
        source_key: 'cardtrader_blueprint_index',
        source_kind: 'marketplace_checklist',
        source_url: match.source_url,
        set_key: fact.set_key,
        set_name: fact.set_name,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: normalizeFinishKey(fact.finish_key),
        rarity: null,
        evidence_type: 'finish_presence',
        evidence_label: `CardTrader blueprint row ${match.raw.n}`,
        language: 'en',
        retrieved_at: null,
        raw_snapshot_ref: `cardtrader_blueprint:${match.raw.id}`,
        notes: 'Generated only from an exact CardTrader Pokemon blueprint match on set, card number, card name, and finish label.',
      };
      if (!recordsBySet.has(fact.set_key)) recordsBySet.set(fact.set_key, []);
      recordsBySet.get(fact.set_key).push(record);
    }
    results.push({ ...fact, status: 'generated', records_generated: 1, source_url: matches[0].source_url });
  }
  return { recordsBySet, results };
}

async function writeFixtures(recordsBySet, generatedAt, dryRun) {
  const files = [];
  if (dryRun) return files;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  for (const [setKey, records] of recordsBySet.entries()) {
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    let existingRecords = [];
    try {
      const existing = JSON.parse(await fs.readFile(file, 'utf8'));
      existingRecords = Array.isArray(existing.records) ? existing.records : [];
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const deduped = [...new Map([...existingRecords, ...records].map((record) => [
      factKey(record),
      { ...record, retrieved_at: record.retrieved_at ?? generatedAt },
    ])).values()];
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `cardtrader_finish_${setKey}`,
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.cardtrader.com/en/manasearch/5/blueprints.json',
      source_status: 'available_generated',
      set_key: setKey,
      set_name: deduped[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:cardtrader:${setKey}:${generatedAt}`,
      generation_note: 'Generated from CardTrader Pokemon blueprint index. Exact card-number/name/finish matches only.',
      records: deduped,
    };
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
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeReports({ generatedAt, facts, blueprints, results, fixtureFiles, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const generated = results.filter((row) => row.status === 'generated');
  const payload = {
    version: 'english_master_index_cardtrader_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    source_url: BLUEPRINT_URL,
    rule: 'Only exact CardTrader Pokemon blueprint matches on set, card number, card name, and finish label emit fixture evidence.',
    summary: {
      target_facts: facts.length,
      blueprint_rows: blueprints.length,
      records_generated: generated.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(generated, (row) => normalizeFinishKey(row.finish_key)),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'cardtrader_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const rows = results.slice(0, 200).map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.status,
    row.source_url ?? '',
  ]);
  const md = [
    '# CardTrader Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['target_facts', payload.summary.target_facts],
      ['blueprint_rows', payload.summary.blueprint_rows],
      ['records_generated', payload.summary.records_generated],
      ['fixture_files_written', payload.summary.fixture_files_written],
    ]),
    '',
    '## Result Sample',
    '',
    rows.length ? markdownTable(['set', 'number', 'name', 'finish', 'status', 'source'], rows) : 'No target facts were attempted.',
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'cardtrader_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, printings] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(PRINTINGS_PATH),
  ]);
  const facts = mergeFacts(targetFacts(gaps, options), priorCardTraderFacts(printings, options));
  console.log(`[cardtrader] target facts ${facts.length}`);
  const blueprints = await fetchBlueprints(options);
  console.log(`[cardtrader] blueprint rows ${blueprints.length}`);
  const { recordsBySet, results } = findMatches(facts, blueprints);
  const fixtureFiles = await writeFixtures(recordsBySet, generatedAt, options.dryRun);
  const report = await writeReports({ generatedAt, facts, blueprints, results, fixtureFiles, dryRun: options.dryRun });
  console.log(`[cardtrader] records ${report.summary.records_generated}`);
  console.log(`[cardtrader] fixtures ${report.summary.fixture_files_written}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[cardtrader] failed:', error);
    process.exitCode = 1;
  });
}
