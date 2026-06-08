import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcollector_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgcollector_acquisition_v1';
const BASE_URL = 'https://www.tcgcollector.com';
const SOURCE_KEY = 'tcgcollector_card_variants';

const execFileAsync = promisify(execFile);

const MULTI_LINK_TITLE_PREFIXES = {
  mfb: ['My First Battle ('],
};

function parseArgs(argv) {
  const options = { sets: null, maxSets: null, dryRun: false, concurrency: 4 };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-sets') {
      options.maxSets = Number(next);
      index += 1;
    } else if (arg === '--concurrency') {
      options.concurrency = Number(next);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
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
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\bbasic\s+(.+?\s+energy)\b/g, '$1')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return normalizeText(value)
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpok[eé]mon\b/g, ' ')
    .replace(/\btrading card game\b/g, ' ')
    .replace(/\benglish\b/g, ' ')
    .replace(/\bexpansion\b/g, ' ')
    .replace(/\bcollection\b/g, ' ')
    .replace(/\bset\b/g, ' ')
    .replace(/\bpromos?\b/g, ' promo ')
    .replace(/\bblack star\b/g, ' black star ')
    .replace(/\s+/g, ' ')
    .trim();
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function finishFromVariantName(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized === 'normal') return 'normal';
  if (normalized === 'non holo' || normalized === 'non holofoil' || normalized === 'nonholo') return 'normal';
  if (normalized === 'normal holo' || normalized === 'holo' || normalized === 'holofoil') return 'holo';
  if (normalized === 'reverse holo' || normalized === 'reverse holofoil') return 'reverse';
  if (normalized === 'energy reverse holo' || normalized === 'energy reverse holofoil') return 'reverse';
  if (normalized === 'poke ball reverse holo' || normalized === 'poke ball reverse holofoil') return 'pokeball';
  if (normalized === 'master ball reverse holo' || normalized === 'master ball reverse holofoil') return 'masterball';
  if (normalized === 'rocket reverse holo' || normalized === 'team rocket reverse holo' || normalized === 'r reverse holo') return 'rocket_reverse';
  if (normalized.includes('cosmos holo')) return 'cosmos';
  if (normalized.includes('cracked ice')) return 'cracked_ice';
  if (normalized.includes('1st edition') && normalized.includes('holo')) return 'first_edition_holo';
  if (normalized.includes('1st edition')) return 'first_edition_normal';
  if (normalized.includes('stamp') || normalized.includes('stamped') || normalized.includes('prerelease')) return 'stamped';
  return null;
}

async function fetchText(url) {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '90',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    url,
  ], { timeout: 100000, maxBuffer: 80 * 1024 * 1024 });
  return stdout;
}

function extractAppState(html) {
  const marker = 'appState:';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) throw new Error('TCGCollector appState not found');
  const start = html.indexOf('{', markerIndex);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start, index + 1));
    }
  }
  throw new Error('TCGCollector appState JSON did not terminate');
}

async function fetchSetDirectory() {
  const html = await fetchText(`${BASE_URL}/sets/intl`);
  const links = [];
  const regex = /href="(\/sets\/\d+\/[^"?]+)\?setCardCountMode=anyCardVariant"[\s\S]{0,500}?title="([^"]+)"/g;
  for (const match of html.matchAll(regex)) {
    links.push({
      href: decodeHtml(match[1]),
      title: decodeHtml(match[2]),
      url: `${BASE_URL}${decodeHtml(match[1])}?setCardCountMode=anyCardVariant`,
    });
  }
  return [...new Map(links.map((link) => [link.href, link])).values()];
}

function chooseSetLink(set, links) {
  const target = setComparable(set.set_name);
  const direct = links.find((link) => setComparable(link.title) === target);
  if (direct) return direct;
  const aliases = Object.values(set.source_aliases ?? {}).filter(Boolean);
  for (const alias of aliases) {
    const aliasTarget = setComparable(alias);
    const match = links.find((link) => setComparable(link.title) === aliasTarget);
    if (match) return match;
  }
  return null;
}

function chooseSetLinks(set, links) {
  const direct = chooseSetLink(set, links);
  if (direct) return [direct];
  const prefixes = MULTI_LINK_TITLE_PREFIXES[set.key] ?? [];
  const matches = links.filter((link) => prefixes.some((prefix) => String(link.title).startsWith(prefix)));
  return [...new Map(matches.map((link) => [link.href, link])).values()];
}

function parseCardRows(html) {
  const rowsById = new Map();
  const regex = /<div[\s\S]{0,300}?data-card-id="(\d+)"[\s\S]{0,700}?href="([^"]+)"[\s\S]{0,250}?title="([^"]+)"/g;
  for (const match of html.matchAll(regex)) {
    const id = match[1];
    if (rowsById.has(id)) continue;
    const title = decodeHtml(match[3]);
    const titleMatch = title.match(/^(.+?)\s+\((.+?)\s+([^()\s]+?)\/[^()]+?\)$/)
      ?? title.match(/^(.+?)\s+\((.+?)\s+No\.\s*([^()]+?)\)$/);
    if (!titleMatch) continue;
    rowsById.set(id, {
      card_id: id,
      card_name: titleMatch[1].trim(),
      card_number: titleMatch[3].trim(),
      card_url: `${BASE_URL}${decodeHtml(match[2])}`,
      title,
    });
  }
  return rowsById;
}

function targetFacts(gaps, options) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function targetCardFacts(gaps, options) {
  return (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'card_identity_second_source_needed')
    .filter((row) => row.card_number && row.card_name)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function cardKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
  ].join('|');
}

function groupBySet(rows, setsByKey, options) {
  const grouped = new Map();
  for (const row of rows) {
    if (!setsByKey.has(row.set_key)) continue;
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  let entries = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (options.maxSets) entries = entries.slice(0, options.maxSets);
  return entries;
}

function buildRecords({ set, facts, cardFacts, html, sourceUrl, generatedAt }) {
  const appState = extractAppState(html);
  const cardsById = parseCardRows(html);
  const targets = new Set(facts.map(factKey));
  const cardTargets = new Set(cardFacts.map(cardKey));
  const records = [];
  const variantMap = appState.cardIdToCardVariantTypeIdsMap ?? {};
  const variantDtos = appState.idToCardVariantTypeDtoMap ?? {};

  for (const cardId of appState.cardIds ?? []) {
    const card = cardsById.get(String(cardId));
    if (!card) continue;
    const identityKey = cardKey({
      set_key: set.key,
      card_number: card.card_number,
      card_name: card.card_name,
    });
    if (cardTargets.has(identityKey)) {
      const fact = cardFacts.find((row) => cardKey(row) === identityKey);
      records.push({
        source_key: SOURCE_KEY,
        source_kind: 'collector_reference',
        source_url: card.card_url || sourceUrl,
        set_key: set.key,
        set_name: set.set_name,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: null,
        rarity: null,
        evidence_type: 'card_identity',
        evidence_label: `TCGCollector card row #${card.card_number} - ${card.card_name}`,
        language: 'en',
        retrieved_at: generatedAt,
        raw_snapshot_ref: `tcgcollector:${cardId}:identity`,
        notes: 'Exact card identity evidence from TCGCollector set card row. This record does not assert finish truth.',
      });
    }
    for (const variantId of variantMap[String(cardId)] ?? []) {
      const variantName = variantDtos[String(variantId)]?.name;
      const finishKey = finishFromVariantName(variantName);
      if (!finishKey) continue;
      const candidate = {
        set_key: set.key,
        card_number: card.card_number,
        card_name: card.card_name,
        finish_key: finishKey,
      };
      if (!targets.has(factKey(candidate))) continue;
      const fact = facts.find((row) => factKey(row) === factKey(candidate));
      records.push({
        source_key: SOURCE_KEY,
        source_kind: 'collector_reference',
        source_url: card.card_url || sourceUrl,
        set_key: set.key,
        set_name: set.set_name,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: normalizeFinishKey(fact.finish_key),
        rarity: null,
        evidence_type: 'finish_presence',
        evidence_label: `TCGCollector card variant ${variantName}`,
        language: 'en',
        retrieved_at: generatedAt,
        raw_snapshot_ref: `tcgcollector:${cardId}:${variantId}`,
        notes: 'Exact card-level finish evidence from TCGCollector card variant type map. Only explicit variant labels are emitted.',
      });
    }
  }

  return {
    records: [...new Map(records.map((record) => [
      record.evidence_type === 'card_identity' ? `${cardKey(record)}|card_identity` : factKey(record),
      record,
    ])).values()],
    source_card_count: appState.cardIds?.length ?? 0,
    source_total_card_count: appState.totalCardCount ?? null,
  };
}

async function writeFixture(set, records, sourceUrl, generatedAt, dryRun) {
  if (!records.length || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${set.key}.json`);
  let existingRecords = [];
  try {
    const existing = JSON.parse(await fs.readFile(file, 'utf8'));
    existingRecords = Array.isArray(existing.records) ? existing.records : [];
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const dedupedRecords = [...new Map([...existingRecords, ...records].map((record) => [
    record.evidence_type === 'card_identity' ? `${cardKey(record)}|card_identity` : factKey(record),
    { ...record, retrieved_at: record.retrieved_at ?? generatedAt },
  ])).values()];
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `tcgcollector_variants_${set.key}`,
    source_kind: 'collector_reference',
    source_url: sourceUrl,
    source_status: 'available_generated',
    set_key: set.key,
    set_name: set.set_name,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:tcgcollector:${set.key}:${generatedAt}`,
    generation_note: 'Generated from TCGCollector explicit card variant type IDs. No finish is inferred from set era, rarity, or card count.',
    records: dedupedRecords,
  };
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeReports({ generatedAt, results, fixtureFiles, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'english_master_index_tcgcollector_variant_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    source_url: 'https://www.tcgcollector.com/sets/intl',
    summary: {
      sets_attempted: results.length,
      records_generated: results.reduce((total, row) => total + row.records_generated, 0),
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(results.flatMap((row) => row.records ?? []), (row) => normalizeFinishKey(row.finish_key)),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'tcgcollector_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const md = [
    '# TCGCollector Variant Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    `- Records generated: ${payload.summary.records_generated}`,
    `- Fixture files written: ${payload.summary.fixture_files_written}`,
    `- Status counts: ${JSON.stringify(payload.summary.by_status)}`,
    `- Finish counts: ${JSON.stringify(payload.summary.by_finish)}`,
    '',
    markdownTable(
      ['set', 'status', 'target facts', 'source cards', 'records', 'url/error'],
      results.map((row) => [
        `${row.set_key} ${row.set_name}`,
        row.status,
        row.target_facts,
        row.source_card_count,
        row.records_generated,
        row.source_url ?? row.error ?? '',
      ]),
    ),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'tcgcollector_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(SETS_PATH),
  ]);
  const finishFacts = targetFacts(gaps, options);
  const identityFacts = targetCardFacts(gaps, options);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const groupedFacts = new Map();
  for (const fact of finishFacts) {
    if (!groupedFacts.has(fact.set_key)) groupedFacts.set(fact.set_key, { finishFacts: [], identityFacts: [] });
    groupedFacts.get(fact.set_key).finishFacts.push(fact);
  }
  for (const fact of identityFacts) {
    if (!groupedFacts.has(fact.set_key)) groupedFacts.set(fact.set_key, { finishFacts: [], identityFacts: [] });
    groupedFacts.get(fact.set_key).identityFacts.push(fact);
  }
  let grouped = [...groupedFacts.entries()]
    .filter(([setKey]) => setsByKey.has(setKey))
    .sort((a, b) => (b[1].finishFacts.length + b[1].identityFacts.length) - (a[1].finishFacts.length + a[1].identityFacts.length) || a[0].localeCompare(b[0]));
  if (options.maxSets) grouped = grouped.slice(0, options.maxSets);
  const links = await fetchSetDirectory();

  let nextIndex = 0;
  async function worker() {
    const out = [];
    while (nextIndex < grouped.length) {
      const [setKey, setGroups] = grouped[nextIndex];
      nextIndex += 1;
      const set = setsByKey.get(setKey);
      const setFacts = setGroups.finishFacts;
      const cardFacts = setGroups.identityFacts;
      const matchedLinks = chooseSetLinks(set, links);
      if (!matchedLinks.length) {
        out.push({
          set_key: set.key,
          set_name: set.set_name,
          status: 'source_unavailable',
          target_facts: setFacts.length + cardFacts.length,
          source_card_count: 0,
          records_generated: 0,
          error: 'No TCGCollector set link matched by set name or alias.',
          records: [],
        });
        continue;
      }
      try {
        const collectedRecords = [];
        let sourceCardCount = 0;
        let sourceTotalCardCount = 0;
        for (const link of matchedLinks) {
          const html = await fetchText(link.url);
          const built = buildRecords({
            set,
            facts: setFacts,
            cardFacts,
            html,
            sourceUrl: link.url,
            generatedAt,
          });
          collectedRecords.push(...built.records);
          sourceCardCount += built.source_card_count ?? 0;
          sourceTotalCardCount += built.source_total_card_count ?? 0;
        }
        const records = [...new Map(collectedRecords.map((record) => [
          record.evidence_type === 'card_identity' ? `${cardKey(record)}|card_identity` : factKey(record),
          record,
        ])).values()];
        out.push({
          set_key: set.key,
          set_name: set.set_name,
          status: records.length ? 'generated' : 'no_exact_matches',
          source_url: matchedLinks.map((link) => link.url).join(' ; '),
          target_facts: setFacts.length + cardFacts.length,
          source_card_count: sourceCardCount,
          source_total_card_count: sourceTotalCardCount,
          records_generated: records.length,
          records,
        });
        console.log(`[tcgcollector] ${set.key} ${set.set_name} records ${records.length}`);
      } catch (error) {
        out.push({
          set_key: set.key,
          set_name: set.set_name,
          status: 'source_unavailable_or_unparseable',
          source_url: matchedLinks.map((link) => link.url).join(' ; '),
          target_facts: setFacts.length + cardFacts.length,
          source_card_count: 0,
          records_generated: 0,
          error: String(error.message ?? error).slice(0, 800),
          records: [],
        });
        console.log(`[tcgcollector] ${set.key} ${set.set_name} failed`);
      }
    }
    return out;
  }

  const workerCount = Math.max(1, Math.min(options.concurrency || 1, grouped.length || 1));
  const results = (await Promise.all(Array.from({ length: workerCount }, worker))).flat();
  const fixtureFiles = [];
  for (const result of results) {
    if (result.records?.length) {
      const set = setsByKey.get(result.set_key);
      fixtureFiles.push(await writeFixture(set, result.records, result.source_url, generatedAt, options.dryRun));
    }
  }
  const report = await writeReports({ generatedAt, results, fixtureFiles, dryRun: options.dryRun });
  console.log(JSON.stringify({
    target_sets: grouped.length,
    records_generated: report.summary.records_generated,
    fixture_files_written: report.summary.fixture_files_written,
    by_status: report.summary.by_status,
    by_finish: report.summary.by_finish,
    dry_run: options.dryRun,
  }, null, 2));
}

main().catch((error) => {
  console.error('[tcgcollector] failed:', error);
  process.exitCode = 1;
});
