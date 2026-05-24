import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  mapWithConcurrency,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
  sortByCardNumber,
  uniqueSorted,
} from './verified_master_set_index_v1/shared.mjs';
import { classifyEvidence } from './verified_master_set_index_v1/agreement_engine/classifier.mjs';
import { collectHumanFixtureEvidence } from './verified_master_set_index_v1/source_adapters/human_fixtures.mjs';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');

const ROOT = process.cwd();
for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

const DEFAULT_MASTER_OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const STRUCTURED_SOURCE_KINDS = new Set(['tcgdex', 'pokemontcg_api']);
const HUMAN_REQUIRED_NOTE = 'Structured API finish evidence is not final printing truth without a human-readable, official, or checklist-style source.';

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson(url, headers = {}, attempts = 6) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url} :: ${text.slice(0, 250)}`);
      }
      return text ? JSON.parse(text) : {};
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(1000 * attempt);
    }
  }
  throw lastError;
}

function parseArgs(argv) {
  const options = {
    outputDir: DEFAULT_MASTER_OUTPUT_DIR,
    sources: ['tcgdex', 'pokemontcg_api'],
    setFilter: null,
    maxSets: null,
    maxCardsPerSet: null,
    concurrency: 4,
    skipDbAudit: false,
    skipHumanFixtures: false,
    dryRun: false,
    fixtureDir: path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures'),
    tcgdexBaseUrl: 'https://api.tcgdex.net/v2/en',
    pokemontcgBaseUrl: 'https://api.pokemontcg.io/v2',
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--output-dir') {
      options.outputDir = next;
      index += 1;
    } else if (arg === '--sources') {
      options.sources = next.split(',').map((value) => value.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--sets') {
      options.setFilter = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-sets') {
      options.maxSets = Number(next);
      index += 1;
    } else if (arg === '--max-cards-per-set') {
      options.maxCardsPerSet = Number(next);
      index += 1;
    } else if (arg === '--concurrency') {
      options.concurrency = Math.max(1, Number(next));
      index += 1;
    } else if (arg === '--skip-db-audit') {
      options.skipDbAudit = true;
    } else if (arg === '--skip-human-fixtures') {
      options.skipHumanFixtures = true;
    } else if (arg === '--fixture-dir') {
      options.fixtureDir = next;
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  for (const source of options.sources) {
    if (!STRUCTURED_SOURCE_KINDS.has(source)) {
      throw new Error(`Unsupported source: ${source}`);
    }
  }

  return options;
}

function sslForConnectionString(connectionString) {
  if (/sslmode=(disable|allow|prefer)/i.test(connectionString)) return false;
  if (/localhost|127\.0\.0\.1|host\.docker\.internal/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function transportNote() {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    return 'Local run used NODE_TLS_REJECT_UNAUTHORIZED=0 because this Windows environment could not validate upstream API certificates. This is a command-level workaround only and is not encoded in the pipeline.';
  }
  return 'Default Node TLS verification.';
}

function normalizeSetLookup(value) {
  return normalizeText(value).replace(/\b(set|expansion)\b/g, '').replace(/\s+/g, ' ').trim();
}

function chooseSetName(pokemonSet, tcgdexSet) {
  return pokemonSet?.name ?? tcgdexSet?.name ?? pokemonSet?.id ?? tcgdexSet?.id ?? 'Unknown Set';
}

function canonicalSetKey(pokemonSet, tcgdexSet) {
  const setName = chooseSetName(pokemonSet, tcgdexSet);
  if (normalizeText(setName) === 'ascended heroes') return 'ascended_heroes';
  return pokemonSet?.id ?? tcgdexSet?.id;
}

function knownManualAliases(setName) {
  if (normalizeText(setName) === 'ascended heroes') {
    return ['ascended_heroes', 'me02.5', 'me2pt5'];
  }
  return [];
}

function isPhysicalEnglishTcgSet(set) {
  const id = String(set?.id ?? '');
  const mediaRefs = [set?.logo, set?.symbol].filter(Boolean).join(' ');
  if (/\/tcgp\//i.test(mediaRefs)) return false;
  if (/^([A-Z]\d|PROMO-A|P-A)/.test(id)) return false;
  return true;
}

async function fetchPokemonTcgSets(options) {
  if (!options.sources.includes('pokemontcg_api')) return [];
  const headers = {};
  if (process.env.POKEMONAPI_API_KEY) headers['X-Api-Key'] = process.env.POKEMONAPI_API_KEY;
  const sets = [];
  let page = 1;
  const pageSize = 250;
  while (true) {
    const url = new URL(`${options.pokemontcgBaseUrl}/sets`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('orderBy', 'releaseDate');
    const body = await fetchJson(url.toString(), headers);
    const rows = Array.isArray(body.data) ? body.data : [];
    sets.push(...rows);
    const total = Number(body.totalCount ?? body.total ?? sets.length);
    if (sets.length >= total || rows.length === 0) break;
    page += 1;
  }
  return sets.filter(isPhysicalEnglishTcgSet);
}

async function fetchTcgdexSets(options) {
  if (!options.sources.includes('tcgdex')) return [];
  const rows = await fetchJson(`${options.tcgdexBaseUrl}/sets`);
  return Array.isArray(rows) ? rows.filter(isPhysicalEnglishTcgSet) : [];
}

function buildSetConfigs({ pokemonSets, tcgdexSets, options }) {
  const tcgdexById = new Map(tcgdexSets.map((set) => [normalizeText(set.id), set]));
  const tcgdexByName = new Map();
  for (const set of tcgdexSets) {
    const key = normalizeSetLookup(set.name);
    if (!tcgdexByName.has(key)) tcgdexByName.set(key, []);
    tcgdexByName.get(key).push(set);
  }

  const usedTcgdex = new Set();
  const configs = [];

  for (const pokemonSet of pokemonSets) {
    const pokemonId = normalizeText(pokemonSet.id);
    let tcgdexSet = tcgdexById.get(pokemonId) ?? null;
    if (!tcgdexSet) {
      const nameMatches = tcgdexByName.get(normalizeSetLookup(pokemonSet.name)) ?? [];
      if (nameMatches.length === 1) tcgdexSet = nameMatches[0];
    }
    if (tcgdexSet) usedTcgdex.add(normalizeText(tcgdexSet.id));

    const setName = chooseSetName(pokemonSet, tcgdexSet);
    const key = canonicalSetKey(pokemonSet, tcgdexSet);
    configs.push({
      key,
      set_name: setName,
      pokemontcg: pokemonSet.id ?? null,
      tcgdex: tcgdexSet?.id ?? null,
      manual_aliases: knownManualAliases(setName),
      release_date: pokemonSet.releaseDate ?? tcgdexSet?.releaseDate ?? null,
      source_aliases: {
        pokemontcg_api: pokemonSet.id ?? null,
        tcgdex: tcgdexSet?.id ?? null,
      },
      source_status: {
        pokemontcg_api: pokemonSet ? 'available' : 'unavailable',
        tcgdex: tcgdexSet ? 'available' : 'unavailable',
      },
      source_totals: {
        pokemontcg_api: {
          printed_total: pokemonSet.printedTotal ?? null,
          total: pokemonSet.total ?? null,
        },
        tcgdex: {
          official: tcgdexSet?.cardCount?.official ?? null,
          total: tcgdexSet?.cardCount?.total ?? null,
        },
      },
    });
  }

  for (const tcgdexSet of tcgdexSets) {
    if (usedTcgdex.has(normalizeText(tcgdexSet.id))) continue;
    const setName = chooseSetName(null, tcgdexSet);
    const key = canonicalSetKey(null, tcgdexSet);
    configs.push({
      key,
      set_name: setName,
      pokemontcg: null,
      tcgdex: tcgdexSet.id,
      manual_aliases: knownManualAliases(setName),
      release_date: tcgdexSet.releaseDate ?? null,
      source_aliases: {
        pokemontcg_api: null,
        tcgdex: tcgdexSet.id,
      },
      source_status: {
        pokemontcg_api: 'unavailable',
        tcgdex: 'available',
      },
      source_totals: {
        pokemontcg_api: {
          printed_total: null,
          total: null,
        },
        tcgdex: {
          official: tcgdexSet?.cardCount?.official ?? null,
          total: tcgdexSet?.cardCount?.total ?? null,
        },
      },
    });
  }

  const filtered = configs
    .filter((set) => {
      if (!options.setFilter) return true;
      const aliases = [
        set.key,
        set.set_name,
        ...(set.manual_aliases ?? []),
        set.source_aliases.pokemontcg_api,
        set.source_aliases.tcgdex,
      ].map(normalizeText);
      return aliases.some((alias) => options.setFilter.has(alias));
    })
    .sort((a, b) => String(a.release_date ?? '').localeCompare(String(b.release_date ?? '')) || a.set_name.localeCompare(b.set_name));

  return Number.isFinite(options.maxSets) && options.maxSets > 0 ? filtered.slice(0, options.maxSets) : filtered;
}

function finishCandidatesFromPokemonTcg(card) {
  const prices = card?.tcgplayer?.prices && typeof card.tcgplayer.prices === 'object'
    ? card.tcgplayer.prices
    : {};
  const finishes = [];
  if (prices.normal) finishes.push('normal');
  if (prices.holofoil) finishes.push('holo');
  if (prices.reverseHolofoil) finishes.push('reverse');
  if (prices['1stEditionNormal']) finishes.push('first_edition_normal');
  if (prices['1stEditionHolofoil']) finishes.push('first_edition_holo');
  return uniqueSorted(finishes.map(normalizeFinishKey));
}

function finishCandidatesFromTcgdex(card) {
  const variants = card?.variants && typeof card.variants === 'object' ? card.variants : {};
  const finishes = [];
  if (variants.normal === true) finishes.push('normal');
  if (variants.holo === true || variants.holofoil === true) finishes.push('holo');
  if (variants.reverse === true || variants.reverseHolo === true || variants.reverseHolofoil === true) finishes.push('reverse');
  if (variants.firstEdition === true || variants.firstEditionNormal === true) finishes.push('first_edition_normal');
  if (variants.firstEditionHolo === true) finishes.push('first_edition_holo');
  return uniqueSorted(finishes.map(normalizeFinishKey));
}

function evidenceBase({ sourceKey, sourceUrl, setConfig, card, cardNumber, cardName, rarity, retrievedAt, rawSnapshotRef }) {
  return {
    source_key: sourceKey,
    source_kind: 'structured_api',
    source_url: sourceUrl,
    set_key: setConfig.key,
    set_name: setConfig.set_name,
    card_number: cardNumber,
    card_name: cardName,
    rarity: rarity ?? null,
    language: 'en',
    retrieved_at: retrievedAt,
    raw_snapshot_ref: rawSnapshotRef,
    source_card_name: card?.name ?? cardName,
    source_set_name: card?.set?.name ?? null,
  };
}

function pokemonCardEvidence(card, setConfig, retrievedAt) {
  const base = evidenceBase({
    sourceKey: 'pokemontcg_api',
    sourceUrl: `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(card.id)}`,
    setConfig,
    card,
    cardNumber: card.number ?? '',
    cardName: card.name ?? '',
    rarity: card.rarity,
    retrievedAt,
    rawSnapshotRef: `pokemontcg_api:${card.id}`,
  });

  return [
    {
      ...base,
      finish_key: null,
      evidence_type: 'card_identity',
      evidence_label: `PokemonTCG.io card ${card.id}`,
      notes: 'Structured API card identity evidence.',
    },
    ...finishCandidatesFromPokemonTcg(card).map((finishKey) => ({
      ...base,
      finish_key: finishKey,
      evidence_type: 'finish_presence',
      evidence_label: `PokemonTCG.io tcgplayer.prices ${finishKey}`,
      notes: HUMAN_REQUIRED_NOTE,
    })),
  ];
}

function tcgdexCardEvidence(card, setConfig, retrievedAt) {
  const base = evidenceBase({
    sourceKey: 'tcgdex',
    sourceUrl: `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(card.id)}`,
    setConfig,
    card,
    cardNumber: card.localId ?? card.number ?? '',
    cardName: card.name ?? '',
    rarity: card.rarity,
    retrievedAt,
    rawSnapshotRef: `tcgdex:${card.id}`,
  });

  return [
    {
      ...base,
      finish_key: null,
      evidence_type: 'card_identity',
      evidence_label: `TCGdex card ${card.id}`,
      notes: 'Structured API card identity evidence.',
    },
    ...finishCandidatesFromTcgdex(card).map((finishKey) => ({
      ...base,
      finish_key: finishKey,
      evidence_type: 'finish_presence',
      evidence_label: `TCGdex variants ${finishKey}`,
      notes: HUMAN_REQUIRED_NOTE,
    })),
  ];
}

async function collectPokemonCardsForSet(setConfig, options, retrievedAt) {
  const setId = setConfig.source_aliases.pokemontcg_api;
  if (!setId || !options.sources.includes('pokemontcg_api')) return [];
  const headers = {};
  if (process.env.POKEMONAPI_API_KEY) headers['X-Api-Key'] = process.env.POKEMONAPI_API_KEY;
  const cards = [];
  let page = 1;
  const pageSize = 250;
  while (true) {
    const url = new URL(`${options.pokemontcgBaseUrl}/cards`);
    url.searchParams.set('q', `set.id:${setId}`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('orderBy', 'number');
    const body = await fetchJson(url.toString(), headers);
    const rows = Array.isArray(body.data) ? body.data : [];
    cards.push(...rows);
    const total = Number(body.totalCount ?? body.total ?? cards.length);
    if (cards.length >= total || rows.length === 0) break;
    page += 1;
  }
  const selected = options.maxCardsPerSet ? sortByCardNumber(cards).slice(0, options.maxCardsPerSet) : sortByCardNumber(cards);
  return selected.flatMap((card) => pokemonCardEvidence(card, setConfig, retrievedAt));
}

async function collectTcgdexCardsForSet(setConfig, options, retrievedAt) {
  const setId = setConfig.source_aliases.tcgdex;
  if (!setId || !options.sources.includes('tcgdex')) return [];
  const setBody = await fetchJson(`${options.tcgdexBaseUrl}/sets/${encodeURIComponent(setId)}`);
  const stubs = Array.isArray(setBody.cards) ? sortByCardNumber(setBody.cards) : [];
  const selected = options.maxCardsPerSet ? stubs.slice(0, options.maxCardsPerSet) : stubs;
  const details = await mapWithConcurrency(selected, options.concurrency, async (stub) => {
    if (!stub?.id) return null;
    return fetchJson(`${options.tcgdexBaseUrl}/cards/${encodeURIComponent(stub.id)}`);
  });
  return details.filter(Boolean).flatMap((card) => tcgdexCardEvidence(card, setConfig, retrievedAt));
}

function sourceAvailabilityFromSet(setConfig, sourceKey, rows, error = null) {
  const sourceRecords = rows.filter((row) => row.source_key === sourceKey);
  return {
    set_key: setConfig.key,
    set_name: setConfig.set_name,
    source_key: sourceKey,
    source_alias: setConfig.source_aliases[sourceKey] ?? null,
    configured_status: setConfig.source_status[sourceKey] ?? 'unavailable',
    runtime_status: error ? 'error' : (sourceRecords.length > 0 ? 'collected' : 'unavailable'),
    evidence_rows: sourceRecords.length,
    error: error ? String(error.message ?? error) : null,
  };
}

async function collectEvidenceForSet(setConfig, options, retrievedAt) {
  const rows = [];
  const availability = [];

  if (options.sources.includes('pokemontcg_api')) {
    try {
      const sourceRows = await collectPokemonCardsForSet(setConfig, options, retrievedAt);
      rows.push(...sourceRows);
      availability.push(sourceAvailabilityFromSet(setConfig, 'pokemontcg_api', sourceRows));
    } catch (error) {
      availability.push(sourceAvailabilityFromSet(setConfig, 'pokemontcg_api', [], error));
    }
  }

  if (options.sources.includes('tcgdex')) {
    try {
      const sourceRows = await collectTcgdexCardsForSet(setConfig, options, retrievedAt);
      rows.push(...sourceRows);
      availability.push(sourceAvailabilityFromSet(setConfig, 'tcgdex', sourceRows));
    } catch (error) {
      availability.push(sourceAvailabilityFromSet(setConfig, 'tcgdex', [], error));
    }
  }

  return { rows, availability };
}

function makeAliasMap(setConfigs) {
  const map = new Map();
  for (const set of setConfigs) {
    for (const alias of [
      set.key,
      set.set_name,
      ...(set.manual_aliases ?? []),
      set.source_aliases.pokemontcg_api,
      set.source_aliases.tcgdex,
    ]) {
      const normalized = normalizeText(alias);
      if (normalized) map.set(normalized, set.key);
    }
  }
  return map;
}

function indexPrintingKeys(classified, setConfigs) {
  const aliasesBySetKey = new Map(setConfigs.map((set) => [
    set.key,
    uniqueSorted([
      set.key,
      set.set_name,
      set.source_aliases.pokemontcg_api,
      set.source_aliases.tcgdex,
    ].map(normalizeText)),
  ]));
  const byExact = new Map();
  const bySetNumberFinish = new Map();
  for (const row of classified.printings) {
    const aliases = aliasesBySetKey.get(row.set_key) ?? [normalizeText(row.set_key)];
    for (const alias of aliases) {
      const exactKey = [
        alias,
        normalizeNumber(row.card_number),
        normalizeText(row.card_name),
        row.finish_key,
      ].join('|');
      byExact.set(exactKey, row);
      const looseKey = [
        alias,
        normalizeNumber(row.card_number),
        row.finish_key,
      ].join('|');
      if (!bySetNumberFinish.has(looseKey)) bySetNumberFinish.set(looseKey, []);
      bySetNumberFinish.get(looseKey).push(row);
    }
  }
  return { byExact, bySetNumberFinish };
}

function dbPrintingKey({ setKey, number, name, finishKey }) {
  return [
    normalizeText(setKey),
    normalizeNumber(number),
    normalizeText(name),
    finishKey,
  ].join('|');
}

function dbSetNumberFinishKey({ setKey, number, finishKey }) {
  return [
    normalizeText(setKey),
    normalizeNumber(number),
    finishKey,
  ].join('|');
}

function mapIndexStatusToGrookaiStatus(status) {
  if (status === 'master_verified') return 'master_verified_by_index';
  if (status === 'api_agreed') return 'api_agreed_by_index';
  if (status === 'human_source_verified') return 'human_source_verified_by_index';
  if (status === 'candidate_unconfirmed') return 'candidate_unconfirmed_by_index';
  return 'needs_manual_review';
}

function assertReadOnlySql(sql) {
  const normalized = sql.trim().toLowerCase();
  if (!normalized.startsWith('select') && !normalized.startsWith('with')) {
    throw new Error(`READ_ONLY_GUARD: SQL must be SELECT/CTE only: ${sql.slice(0, 80)}`);
  }
  if (/\b(insert|update|delete|merge|alter|drop|truncate|create|grant|revoke|copy)\b/i.test(sql)) {
    throw new Error('READ_ONLY_GUARD: write-capable SQL keyword detected.');
  }
}

async function queryReadOnly(client, sql, params = []) {
  assertReadOnlySql(sql);
  const result = await client.query(sql, params);
  return result.rows;
}

async function loadGrookaiPrintingsReadOnly() {
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    return {
      executed: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is not configured.',
      rows: [],
    };
  }

  const client = new pg.Client({
    connectionString,
    ssl: sslForConnectionString(connectionString),
  });
  await client.connect();
  try {
    const rows = await queryReadOnly(
      client,
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name as card_name,
         cp.gv_id as card_gv_id,
         p.id::text as card_printing_id,
         p.finish_key,
         p.printing_gv_id
       from public.card_printings p
       join public.card_prints cp
         on cp.id = p.card_print_id`,
    );
    return { executed: true, reason: null, rows };
  } finally {
    await client.end();
  }
}

function compareGrookaiToIndex({ classified, setConfigs, dbRows }) {
  const aliasToSetKey = makeAliasMap(setConfigs);
  const { byExact, bySetNumberFinish } = indexPrintingKeys(classified, setConfigs);
  const grookaiFacts = new Set();
  const comparisonRows = [];
  const indexRows = classified.printings;

  for (const row of dbRows) {
    const rawSetCode = normalizeText(row.set_code);
    const setKey = aliasToSetKey.get(rawSetCode);
    const number = row.number_plain ?? row.number;
    const finishKey = normalizeFinishKey(row.finish_key);

    if (!setKey) {
      comparisonRows.push({
        status: 'set_unmapped',
        set_code: row.set_code,
        card_number: number,
        grookai_card_name: row.card_name,
        finish_key: finishKey,
        grookai_card_print_id: row.card_print_id,
        grookai_printing_id: row.card_printing_id,
        note: 'Grookai set_code was not present in the current English Master Index source set map.',
      });
      continue;
    }

    const exactKey = dbPrintingKey({
      setKey,
      number,
      name: row.card_name,
      finishKey,
    });
    grookaiFacts.add(exactKey);
    const indexRow = byExact.get(exactKey);
    if (indexRow) {
      comparisonRows.push({
        status: mapIndexStatusToGrookaiStatus(indexRow.status),
        set_key: setKey,
        set_code: row.set_code,
        card_number: number,
        grookai_card_name: row.card_name,
        index_card_name: indexRow.card_name,
        finish_key: finishKey,
        index_status: indexRow.status,
        index_sources: indexRow.sources,
        grookai_card_print_id: row.card_print_id,
        grookai_printing_id: row.card_printing_id,
        note: 'Exact set, number, name, and finish matched the current index.',
      });
      continue;
    }

    const looseKey = dbSetNumberFinishKey({ setKey, number, finishKey });
    const looseMatches = bySetNumberFinish.get(looseKey) ?? [];
    if (looseMatches.length > 0) {
      comparisonRows.push({
        status: 'name_mismatch_needs_review',
        set_key: setKey,
        set_code: row.set_code,
        card_number: number,
        grookai_card_name: row.card_name,
        index_card_name: uniqueSorted(looseMatches.map((item) => item.card_name)).join('; '),
        finish_key: finishKey,
        index_status: uniqueSorted(looseMatches.map((item) => item.status)).join('; '),
        index_sources: uniqueSorted(looseMatches.flatMap((item) => item.sources)),
        grookai_card_print_id: row.card_print_id,
        grookai_printing_id: row.card_printing_id,
        note: 'Set, number, and finish matched the index, but card name did not match exactly.',
      });
      continue;
    }

    comparisonRows.push({
      status: 'unsupported_by_current_index',
      set_key: setKey,
      set_code: row.set_code,
      card_number: number,
      grookai_card_name: row.card_name,
      finish_key: finishKey,
      grookai_card_print_id: row.card_print_id,
      grookai_printing_id: row.card_printing_id,
      note: 'No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority.',
    });
  }

  for (const indexRow of indexRows) {
    const exactKey = dbPrintingKey({
      setKey: indexRow.set_key,
      number: indexRow.card_number,
      name: indexRow.card_name,
      finishKey: indexRow.finish_key,
    });
    if (grookaiFacts.has(exactKey)) continue;
    comparisonRows.push({
      status: 'missing_from_grookai',
      set_key: indexRow.set_key,
      set_name: indexRow.set_name,
      card_number: indexRow.card_number,
      index_card_name: indexRow.card_name,
      finish_key: indexRow.finish_key,
      index_status: indexRow.status,
      index_sources: indexRow.sources,
      index_evidence_urls: indexRow.evidence.map((item) => item.source_url).filter(Boolean),
      note: 'Index has this printing fact, but no exact Grookai printing row matched set, number, name, and finish.',
    });
  }

  const byStatus = countBy(comparisonRows, (row) => row.status);
  const byStatusAndFinish = countBy(comparisonRows, (row) => `${row.status}|${row.finish_key ?? ''}`);
  const bySetStatus = countBy(comparisonRows, (row) => `${row.set_code ?? row.set_key ?? row.set_name ?? 'unknown'}|${row.status}`);

  return {
    version: 'ENGLISH_MASTER_INDEX_GROOKAI_AUDIT_V1',
    audit_only: true,
    db_writes: false,
    summary: {
      executed: true,
      grookai_printing_rows: dbRows.length,
      index_printing_rows: indexRows.length,
      by_status: byStatus,
      by_status_and_finish: byStatusAndFinish,
      by_set_status: bySetStatus,
    },
    rows: comparisonRows,
  };
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function sourceOverlap(records) {
  return Object.entries(countBy(records, (row) => row.source_key))
    .map(([source_key, evidence_rows]) => ({ source_key, evidence_rows }));
}

function setInventoryPayload({ setConfigs, records, classified, sourceAvailability, generatedAt }) {
  const recordsBySet = countBy(records, (row) => row.set_key);
  const cardsBySet = countBy(classified.cards, (row) => `${row.set_key}|${row.status}`);
  const printingsBySet = countBy(classified.printings, (row) => `${row.set_key}|${row.status}`);
  return {
    version: 'ENGLISH_MASTER_INDEX_SET_AUDIT_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    sets: setConfigs.map((set) => ({
      ...set,
      evidence_rows: recordsBySet[set.key] ?? 0,
      card_status_counts: Object.fromEntries(
        Object.entries(cardsBySet)
          .filter(([key]) => key.startsWith(`${set.key}|`))
          .map(([key, count]) => [key.split('|')[1], count]),
      ),
      printing_status_counts: Object.fromEntries(
        Object.entries(printingsBySet)
          .filter(([key]) => key.startsWith(`${set.key}|`))
          .map(([key, count]) => [key.split('|')[1], count]),
      ),
      source_availability: sourceAvailability.filter((row) => row.set_key === set.key),
    })),
  };
}

function indexPayload({ records, classified, setConfigs, sourceAvailability, generatedAt }) {
  return {
    version: 'ENGLISH_VERIFIED_MASTER_SET_INDEX_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    language: 'en',
    source_standard: {
      api_agreed_is_not_master_truth: true,
      finish_truth_requires_human_or_checklist_source_for_master_verified: true,
      fail_closed_unknown_printings: true,
      no_db_writes: true,
    },
    transport: {
      note: transportNote(),
    },
    summary: {
      sets: setConfigs.length,
      evidence_rows: records.length,
      source_overlap: sourceOverlap(records),
      cards_by_status: countBy(classified.cards, (row) => row.status),
      printings_by_status: countBy(classified.printings, (row) => row.status),
      conflicts: classified.conflicts.length,
      manual_review: classified.manual_review.length,
      source_availability_by_status: countBy(sourceAvailability, (row) => `${row.source_key}|${row.runtime_status}`),
    },
    sets: setConfigs,
    source_availability: sourceAvailability,
    cards: classified.cards,
    printings: classified.printings,
    finish_absences: classified.finish_absences,
    conflicts: classified.conflicts,
    manual_review: classified.manual_review,
  };
}

function agreementPayload({ records, classified, generatedAt }) {
  const apiAgreedPrintings = classified.printings.filter((row) => row.status === 'api_agreed');
  const masterVerifiedPrintings = classified.printings.filter((row) => row.status === 'master_verified');
  const candidatePrintings = classified.printings.filter((row) => row.status === 'candidate_unconfirmed');
  return {
    version: 'ENGLISH_MASTER_INDEX_SOURCE_AGREEMENT_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    source_overlap: sourceOverlap(records),
    cards_by_status: countBy(classified.cards, (row) => row.status),
    printings_by_status: countBy(classified.printings, (row) => row.status),
    finish_disagreement: classified.conflicts.filter((row) => row.fact_type === 'printing_finish'),
    reverse_holo_disagreement: classified.conflicts.filter((row) => row.finish_key === 'reverse'),
    row_counts: {
      api_agreed_printings: apiAgreedPrintings.length,
      master_verified_printings: masterVerifiedPrintings.length,
      candidate_printings: candidatePrintings.length,
      manual_review: classified.manual_review.length,
    },
    samples: {
      api_agreed_printings: apiAgreedPrintings.slice(0, 200),
      master_verified_printings: masterVerifiedPrintings.slice(0, 200),
      candidate_printings: candidatePrintings.slice(0, 200),
      manual_review: classified.manual_review.slice(0, 200),
    },
    artifact_refs: {
      printings: 'english_master_index_printings_v1.json',
      manual_review: 'english_master_index_manual_review_v1.json',
    },
  };
}

function buildIndexMarkdown(payload) {
  const rows = [
    ['sets', payload.summary.sets],
    ['evidence rows', payload.summary.evidence_rows],
    ['conflicts', payload.summary.conflicts],
    ['manual review', payload.summary.manual_review],
  ];
  const cardRows = Object.entries(payload.summary.cards_by_status);
  const printingRows = Object.entries(payload.summary.printings_by_status);
  const sourceRows = payload.summary.source_overlap.map((row) => [row.source_key, row.evidence_rows]);
  const availabilityRows = Object.entries(payload.summary.source_availability_by_status).map(([key, count]) => {
    const [source, status] = key.split('|');
    return [source, status, count];
  });
  return [
    '# English Verified Master Set Index V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    'This is the English Master Index build. API-agreed printings are useful reference facts, but they are not final master truth for finish cleanup without human-readable, official, or checklist-style evidence.',
    '',
    `Transport: ${payload.transport.note}`,
    '',
    '## Totals',
    '',
    markdownTable(['metric', 'count'], rows),
    '',
    '## Cards By Status',
    '',
    markdownTable(['status', 'count'], cardRows),
    '',
    '## Printings By Status',
    '',
    markdownTable(['status', 'count'], printingRows),
    '',
    '## Source Evidence Rows',
    '',
    markdownTable(['source', 'evidence rows'], sourceRows),
    '',
    '## Source Availability',
    '',
    markdownTable(['source', 'runtime status', 'count'], availabilityRows),
    '',
  ].join('\n');
}

function buildSetAuditMarkdown(payload) {
  const rows = payload.sets.map((set) => [
    set.key,
    set.set_name,
    set.source_aliases.pokemontcg_api ?? '',
    set.source_aliases.tcgdex ?? '',
    set.evidence_rows,
    JSON.stringify(set.card_status_counts),
    JSON.stringify(set.printing_status_counts),
  ]);
  return [
    '# English Master Index Set Audit V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. This inventory documents source availability and status counts per set.',
    '',
    markdownTable(['set_key', 'set_name', 'PokemonTCG.io', 'TCGdex', 'evidence rows', 'card statuses', 'printing statuses'], rows),
    '',
  ].join('\n');
}

function buildAgreementMarkdown(payload) {
  const sourceRows = payload.source_overlap.map((row) => [row.source_key, row.evidence_rows]);
  const printingRows = Object.entries(payload.printings_by_status);
  const reverseRows = payload.reverse_holo_disagreement.slice(0, 200).map((row) => [
    row.set_name,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.sources.join(', '),
  ]);
  return [
    '# English Master Index Source Agreement V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'API agreement is separated from master truth. Unknown or conflicting finish truth fails closed.',
    '',
    '## Source Overlap',
    '',
    markdownTable(['source', 'evidence rows'], sourceRows),
    '',
    '## Printings By Status',
    '',
    markdownTable(['status', 'count'], printingRows),
    '',
    '## Reverse Holo Disagreement Sample',
    '',
    reverseRows.length ? markdownTable(['set', 'number', 'name', 'finish', 'sources'], reverseRows) : 'No reverse holo conflicts produced by the current classifier.',
    '',
  ].join('\n');
}

function buildConflictsMarkdown(conflictsPayload) {
  const rows = conflictsPayload.conflicts.slice(0, 500).map((row) => [
    row.set_name,
    row.card_number,
    row.card_name,
    row.finish_key ?? '',
    row.sources.join(', '),
    row.evidence.map((item) => item.source_url).filter(Boolean).join('; '),
  ]);
  return [
    '# English Master Index Conflicts V1',
    '',
    `Generated: ${conflictsPayload.generated_at}`,
    '',
    'Conflicts are not promoted into the index.',
    '',
    rows.length ? markdownTable(['set', 'number', 'name', 'finish', 'sources', 'evidence URLs'], rows) : 'No conflicts produced by the current classifier.',
    '',
  ].join('\n');
}

function buildGrookaiAuditMarkdown(payload) {
  if (!payload.summary.executed) {
    return [
      '# English Master Index Grookai Audit V1',
      '',
      'Audit not executed.',
      '',
      payload.summary.reason,
      '',
    ].join('\n');
  }
  const statusRows = Object.entries(payload.summary.by_status);
  const finishRows = Object.entries(payload.summary.by_status_and_finish).map(([key, count]) => {
    const [status, finish] = key.split('|');
    return [status, finish, count];
  });
  const issueRows = payload.rows
    .filter((row) => !['master_verified_by_index', 'api_agreed_by_index', 'human_source_verified_by_index'].includes(row.status))
    .slice(0, 500)
    .map((row) => [
      row.set_code ?? row.set_key ?? '',
      row.card_number ?? '',
      row.grookai_card_name ?? row.index_card_name ?? '',
      row.finish_key ?? '',
      row.status,
      row.note ?? '',
    ]);
  return [
    '# English Master Index Grookai Audit V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Grookai printing rows read: ${payload.summary.grookai_printing_rows}`,
    `Index printing facts: ${payload.summary.index_printing_rows}`,
    '',
    '## Status Summary',
    '',
    markdownTable(['status', 'count'], statusRows),
    '',
    '## Status By Finish',
    '',
    markdownTable(['status', 'finish', 'count'], finishRows),
    '',
    '## Issue Sample',
    '',
    issueRows.length ? markdownTable(['set', 'number', 'name', 'finish', 'status', 'note'], issueRows) : 'No issue rows in the sampled statuses.',
    '',
    'Important: `unsupported_by_current_index` is not deletion authority. It means the current index did not support the row in this audit pass.',
    '',
  ].join('\n');
}

function setUnmappedCategory(row) {
  const setCode = String(row.set_code ?? '').trim();
  if (!setCode) return 'missing_set_code';
  if (setCode === 'legacy_orphan') return 'legacy_orphan';
  if (/^([A-Z]\d[A-Za-z]?|PROMO-A|P-A)$/.test(setCode)) return 'out_of_scope_pocket';
  return 'real_alias_gap';
}

function buildSetUnmappedTriage(grookaiAudit, generatedAt) {
  const rows = grookaiAudit?.rows?.filter((row) => row.status === 'set_unmapped') ?? [];
  const categorizedRows = rows.map((row) => ({
    category: setUnmappedCategory(row),
    ...row,
  }));
  const rowsByCategory = Object.fromEntries(
    Object.entries(countBy(categorizedRows, (row) => row.category)).map(([category, count]) => [
      category,
      {
        count,
        by_set_code: countBy(
          categorizedRows.filter((row) => row.category === category),
          (row) => row.set_code ?? 'unknown',
        ),
        by_finish: countBy(
          categorizedRows.filter((row) => row.category === category),
          (row) => row.finish_key ?? 'unknown',
        ),
        sample_rows: categorizedRows.filter((row) => row.category === category).slice(0, 100),
      },
    ]),
  );
  return {
    version: 'ENGLISH_MASTER_INDEX_SET_UNMAPPED_TRIAGE_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    source_report: 'english_master_index_grookai_audit_v1.json',
    rule: 'Set-unmapped rows are set identity/audit-scope issues first. Do not judge printing truth until the set category is resolved.',
    summary: {
      total_set_unmapped: rows.length,
      by_category: countBy(categorizedRows, (row) => row.category),
    },
    categories: rowsByCategory,
  };
}

function buildSetUnmappedTriageMarkdown(payload) {
  const categoryRows = Object.entries(payload.summary.by_category).map(([category, count]) => ({ category, count }));
  const sectionRows = (category) => Object.entries(payload.categories[category]?.by_set_code ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .map(([set_code, count]) => ({ set_code, count }));
  return [
    '# English Master Index Set Unmapped Triage V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    payload.rule,
    '',
    '## Summary',
    '',
    markdownTable(['category', 'count'], categoryRows.map((row) => [row.category, row.count])),
    '',
    '## Missing Set Code',
    '',
    'Rows whose Grookai parent card has no usable `set_code`. These need source identity recovery before comparison.',
    '',
    markdownTable(['set_code', 'count'], sectionRows('missing_set_code').map((row) => [row.set_code, row.count])),
    '',
    '## Out Of Scope Pocket',
    '',
    'Rows whose set code matches Pokemon TCG Pocket-style source IDs. They are intentionally excluded from the English physical TCG Master Index.',
    '',
    markdownTable(['set_code', 'count'], sectionRows('out_of_scope_pocket').map((row) => [row.set_code, row.count])),
    '',
    '## Legacy Orphan',
    '',
    'Rows already labeled as legacy orphans. They need a separate legacy identity recovery pass.',
    '',
    markdownTable(['set_code', 'count'], sectionRows('legacy_orphan').map((row) => [row.set_code, row.count])),
    '',
    '## Real Alias Gap',
    '',
    'Rows that appear in-scope but do not currently map to a Master Index set alias.',
    '',
    markdownTable(['set_code', 'count'], sectionRows('real_alias_gap').map((row) => [row.set_code, row.count])),
    '',
  ].join('\n');
}

function foldNameForTriage(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[★☆]/g, ' star ')
    .replace(/\b(ex)\b/gi, ' ex ')
    .replace(/\b(lv)\s*[.]?\s*x\b/gi, ' lvx ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function looseNameForTriage(value) {
  return foldNameForTriage(value)
    .replace(/\b(pokemon|poke)\b/g, 'pokemon')
    .replace(/\bex\b/g, 'ex')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseNameWithoutQualifier(value) {
  return looseNameForTriage(String(value ?? '').replace(/\([^)]*\)/g, ' '))
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(lvx|ex|star)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function subsetCollisionCategoryForSet(setCode) {
  const categories = {
    bw11: 'subset_number_collision_legendary_treasures_radiant_collection',
    cel25: 'subset_number_collision_celebrations_classic_collection',
    col1: 'subset_number_collision_call_of_legends_shiny',
    dp7: 'subset_number_collision_dp_secret_shiny',
    g1: 'subset_number_collision_generations_radiant_collection',
    pl1: 'subset_number_collision_platinum_secret_shiny',
    pl2: 'subset_number_collision_rising_rivals_rotom',
    pl3: 'subset_number_collision_supreme_victors_secret_shiny',
    pl4: 'subset_number_collision_arceus_ar_subset',
    'swsh12.5': 'subset_number_collision_crown_zenith_galarian_gallery',
  };
  return categories[setCode] ?? null;
}

function nameMismatchCategory(row) {
  const grookai = row.grookai_card_name ?? '';
  const index = row.index_card_name ?? '';
  const setCode = String(row.set_code ?? row.set_key ?? '').trim();
  const foldedGrookai = foldNameForTriage(grookai);
  const foldedIndex = foldNameForTriage(index);
  const looseGrookai = looseNameForTriage(grookai);
  const looseIndex = looseNameForTriage(index);
  const baseGrookai = baseNameWithoutQualifier(grookai);
  const baseIndex = baseNameWithoutQualifier(index);

  if (foldedGrookai === foldedIndex) return 'diacritic_punctuation_only';
  if (looseGrookai === looseIndex) return 'harmless_style_only';
  if (baseGrookai && baseGrookai === baseIndex) {
    if (/\blv[.]?\s*x\b/i.test(grookai) || /\blv[.]?\s*x\b/i.test(index)) return 'lvx_suffix_style';
    if (/[★☆]|\bstar\b/i.test(grookai) || /[★☆]|\bstar\b/i.test(index)) return 'star_symbol_style';
    if (/\([^)]*\)/.test(grookai) || /\([^)]*\)/.test(index)) return 'parenthetical_qualifier';
    if (/\bex\b/i.test(grookai) || /\bex\b/i.test(index)) return 'ex_hyphen_style';
    return 'same_base_name_qualifier';
  }
  if (setCode === 'sve' && baseGrookai.replace(/^basic /, '') === baseIndex) {
    return 'basic_energy_prefix_style';
  }
  const subsetCategory = subsetCollisionCategoryForSet(setCode);
  if (subsetCategory) return subsetCategory;
  return 'possible_identity_conflict';
}

function buildNameMismatchTriage(grookaiAudit, generatedAt) {
  const rows = grookaiAudit?.rows?.filter((row) => row.status === 'name_mismatch_needs_review') ?? [];
  const categorizedRows = rows.map((row) => ({
    category: nameMismatchCategory(row),
    ...row,
  }));
  const rowsByCategory = Object.fromEntries(
    Object.entries(countBy(categorizedRows, (row) => row.category)).map(([category, count]) => [
      category,
      {
        count,
        by_set_code: countBy(
          categorizedRows.filter((row) => row.category === category),
          (row) => row.set_code ?? row.set_key ?? 'unknown',
        ),
        by_finish: countBy(
          categorizedRows.filter((row) => row.category === category),
          (row) => row.finish_key ?? 'unknown',
        ),
        rows: categorizedRows.filter((row) => row.category === category),
      },
    ]),
  );
  return {
    version: 'ENGLISH_MASTER_INDEX_NAME_MISMATCH_TRIAGE_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    source_report: 'english_master_index_grookai_audit_v1.json',
    rule: 'Name mismatches are review classifications only. Do not rewrite identity or printings from this report.',
    summary: {
      total_name_mismatch: rows.length,
      by_category: countBy(categorizedRows, (row) => row.category),
      by_set_code: countBy(categorizedRows, (row) => row.set_code ?? row.set_key ?? 'unknown'),
      by_finish: countBy(categorizedRows, (row) => row.finish_key ?? 'unknown'),
    },
    categories: rowsByCategory,
  };
}

function buildNameMismatchTriageMarkdown(payload) {
  const categoryRows = Object.entries(payload.summary.by_category).map(([category, count]) => [category, count]);
  const setRows = Object.entries(payload.summary.by_set_code).map(([setCode, count]) => [setCode, count]);
  const finishRows = Object.entries(payload.summary.by_finish).map(([finish, count]) => [finish, count]);
  const rowLines = Object.entries(payload.categories).flatMap(([category, entry]) => (
    entry.rows.slice(0, 80).map((row) => [
      category,
      row.set_code ?? row.set_key ?? '',
      row.card_number ?? '',
      row.finish_key ?? '',
      row.grookai_card_name ?? '',
      row.index_card_name ?? '',
    ])
  ));
  return [
    '# English Master Index Name Mismatch Triage V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    payload.rule,
    '',
    '## Summary By Category',
    '',
    markdownTable(['category', 'count'], categoryRows),
    '',
    '## Summary By Set',
    '',
    markdownTable(['set_code', 'count'], setRows),
    '',
    '## Summary By Finish',
    '',
    markdownTable(['finish', 'count'], finishRows),
    '',
    '## Review Rows',
    '',
    markdownTable(['category', 'set', 'number', 'finish', 'Grookai name', 'Index name'], rowLines),
    '',
  ].join('\n');
}

async function writeJson(outputDir, fileName, data) {
  await fs.writeFile(path.join(outputDir, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

function indexSummaryArtifact(index) {
  return {
    version: index.version,
    generated_at: index.generated_at,
    audit_only: index.audit_only,
    db_writes: index.db_writes,
    language: index.language,
    source_standard: index.source_standard,
    transport: index.transport,
    summary: index.summary,
    artifact_manifest: {
      sets: 'english_master_index_sets_v1.json',
      source_availability: 'english_master_index_source_availability_v1.json',
      cards: 'english_master_index_cards_v1.json',
      printings: 'english_master_index_printings_v1.json',
      manual_review: 'english_master_index_manual_review_v1.json',
      conflicts: 'english_master_index_conflicts_v1.json',
      grookai_audit: 'english_master_index_grookai_audit_v1.json',
    },
  };
}

async function writeReports({ outputDir, index, agreement, setAudit, grookaiAudit, generatedAt }) {
  await fs.mkdir(outputDir, { recursive: true });
  const setUnmappedTriage = buildSetUnmappedTriage(grookaiAudit, generatedAt);
  const nameMismatchTriage = buildNameMismatchTriage(grookaiAudit, generatedAt);
  const conflicts = {
    version: 'ENGLISH_MASTER_INDEX_CONFLICTS_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    conflicts: index.conflicts,
  };

  await writeJson(outputDir, 'english_master_index_v1.json', indexSummaryArtifact(index));
  await writeJson(outputDir, 'english_master_index_sets_v1.json', {
    version: 'ENGLISH_MASTER_INDEX_SETS_V1',
    generated_at: index.generated_at,
    audit_only: true,
    db_writes: false,
    sets: index.sets,
  });
  await writeJson(outputDir, 'english_master_index_source_availability_v1.json', {
    version: 'ENGLISH_MASTER_INDEX_SOURCE_AVAILABILITY_V1',
    generated_at: index.generated_at,
    audit_only: true,
    db_writes: false,
    source_availability: index.source_availability,
  });
  await writeJson(outputDir, 'english_master_index_cards_v1.json', {
    version: 'ENGLISH_MASTER_INDEX_CARDS_V1',
    generated_at: index.generated_at,
    audit_only: true,
    db_writes: false,
    cards: index.cards,
  });
  await writeJson(outputDir, 'english_master_index_printings_v1.json', {
    version: 'ENGLISH_MASTER_INDEX_PRINTINGS_V1',
    generated_at: index.generated_at,
    audit_only: true,
    db_writes: false,
    printings: index.printings,
    finish_absences: index.finish_absences,
  });
  await writeJson(outputDir, 'english_master_index_manual_review_v1.json', {
    version: 'ENGLISH_MASTER_INDEX_MANUAL_REVIEW_V1',
    generated_at: index.generated_at,
    audit_only: true,
    db_writes: false,
    manual_review: index.manual_review,
  });
  await fs.writeFile(path.join(outputDir, 'english_master_index_v1.md'), buildIndexMarkdown(index));
  await writeJson(outputDir, 'english_master_index_source_agreement_v1.json', agreement);
  await fs.writeFile(path.join(outputDir, 'english_master_index_source_agreement_v1.md'), buildAgreementMarkdown(agreement));
  await writeJson(outputDir, 'english_master_index_set_audit_v1.json', setAudit);
  await fs.writeFile(path.join(outputDir, 'english_master_index_set_audit_v1.md'), buildSetAuditMarkdown(setAudit));
  await writeJson(outputDir, 'english_master_index_conflicts_v1.json', conflicts);
  await fs.writeFile(path.join(outputDir, 'english_master_index_conflicts_v1.md'), buildConflictsMarkdown(conflicts));
  await writeJson(outputDir, 'english_master_index_grookai_audit_v1.json', grookaiAudit);
  await fs.writeFile(path.join(outputDir, 'english_master_index_grookai_audit_v1.md'), buildGrookaiAuditMarkdown(grookaiAudit));
  await writeJson(outputDir, 'english_master_index_set_unmapped_triage_v1.json', setUnmappedTriage);
  await fs.writeFile(path.join(outputDir, 'english_master_index_set_unmapped_triage_v1.md'), buildSetUnmappedTriageMarkdown(setUnmappedTriage));
  await writeJson(outputDir, 'english_master_index_name_mismatch_triage_v1.json', nameMismatchTriage);
  await fs.writeFile(path.join(outputDir, 'english_master_index_name_mismatch_triage_v1.md'), buildNameMismatchTriageMarkdown(nameMismatchTriage));
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();

  console.log(`[master-index] fetching set inventories from ${options.sources.join(', ')}`);
  const [pokemonSets, tcgdexSets] = await Promise.all([
    fetchPokemonTcgSets(options),
    fetchTcgdexSets(options),
  ]);
  const setConfigs = buildSetConfigs({ pokemonSets, tcgdexSets, options });
  console.log(`[master-index] selected ${setConfigs.length} English sets`);

  if (options.dryRun) {
    await fs.mkdir(options.outputDir, { recursive: true });
    await writeJson(options.outputDir, 'english_master_index_dry_run_set_plan_v1.json', {
      version: 'ENGLISH_MASTER_INDEX_DRY_RUN_SET_PLAN_V1',
      generated_at: generatedAt,
      audit_only: true,
      db_writes: false,
      selected_sets: setConfigs,
    });
    console.log(`[master-index] dry-run wrote set plan to ${options.outputDir}`);
    return;
  }

  const collected = await mapWithConcurrency(setConfigs, options.concurrency, async (setConfig, index) => {
    console.log(`[master-index] ${index + 1}/${setConfigs.length} collecting ${setConfig.key} ${setConfig.set_name}`);
    return collectEvidenceForSet(setConfig, options, generatedAt);
  });
  const records = collected.flatMap((entry) => entry.rows);
  const sourceAvailability = collected.flatMap((entry) => entry.availability);
  if (!options.skipHumanFixtures) {
    const fixtureRows = await collectHumanFixtureEvidence(setConfigs, {
      fixtureDir: options.fixtureDir,
      retrievedAt: generatedAt,
    });
    records.push(...fixtureRows);
    sourceAvailability.push({
      set_key: 'human_fixtures',
      set_name: 'Human-readable fixture lane',
      source_key: 'human_fixtures',
      source_alias: options.fixtureDir,
      configured_status: 'available',
      runtime_status: 'collected',
      evidence_rows: fixtureRows.length,
      error: null,
    });
    console.log(`[master-index] loaded ${fixtureRows.length} human/checklist fixture evidence rows`);
  }
  console.log(`[master-index] collected ${records.length} evidence rows`);

  const classified = classifyEvidence(records);
  const index = indexPayload({ records, classified, setConfigs, sourceAvailability, generatedAt });
  const agreement = agreementPayload({ records, classified, generatedAt });
  const setAudit = setInventoryPayload({ setConfigs, records, classified, sourceAvailability, generatedAt });

  let grookaiAudit;
  if (options.skipDbAudit) {
    grookaiAudit = {
      version: 'ENGLISH_MASTER_INDEX_GROOKAI_AUDIT_V1',
      generated_at: generatedAt,
      audit_only: true,
      db_writes: false,
      summary: {
        executed: false,
        reason: '--skip-db-audit was provided.',
      },
      rows: [],
    };
  } else {
    const dbResult = await loadGrookaiPrintingsReadOnly();
    if (dbResult.executed) {
      grookaiAudit = {
        generated_at: generatedAt,
        ...compareGrookaiToIndex({ classified, setConfigs, dbRows: dbResult.rows }),
      };
    } else {
      grookaiAudit = {
        version: 'ENGLISH_MASTER_INDEX_GROOKAI_AUDIT_V1',
        generated_at: generatedAt,
        audit_only: true,
        db_writes: false,
        summary: {
          executed: false,
          reason: dbResult.reason,
        },
        rows: [],
      };
    }
  }

  await writeReports({
    outputDir: options.outputDir,
    index,
    agreement,
    setAudit,
    grookaiAudit,
    generatedAt,
  });

  console.log(`[master-index] wrote reports to ${options.outputDir}`);
  console.log(`[master-index] cards by status ${JSON.stringify(index.summary.cards_by_status)}`);
  console.log(`[master-index] printings by status ${JSON.stringify(index.summary.printings_by_status)}`);
  if (grookaiAudit.summary.executed) {
    console.log(`[master-index] Grookai audit by status ${JSON.stringify(grookaiAudit.summary.by_status)}`);
  } else {
    console.log(`[master-index] Grookai audit skipped: ${grookaiAudit.summary.reason}`);
  }
}

main().catch((error) => {
  console.error(`[master-index] failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
