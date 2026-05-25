import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  mapWithConcurrency,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
  printingFactKey,
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
const SUPPORTED_SOURCES = new Set(['tcgdex', 'pokemontcg_api', 'official_checklist_pdf', 'thepricedex', 'pkmncards', 'bulbapedia']);
const HUMAN_REQUIRED_NOTE = 'Structured API finish evidence is not final printing truth without a human-readable, official, or checklist-style source.';
const EXACT_CHECKLIST_SOURCE_KINDS = new Set([
  'official_gallery',
  'human_readable_checklist',
  'marketplace_checklist',
  'collector_reference',
]);

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

async function fetchBuffer(url, headers = {}, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/pdf,*/*', ...headers } });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) {
        throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
      }
      return bytes;
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
    sources: ['tcgdex', 'pokemontcg_api', 'thepricedex', 'pkmncards'],
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
    if (!SUPPORTED_SOURCES.has(source)) {
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

function slugifyForPkmnCards(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[''.:’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pkmnCardsSlugForSet(key, setName) {
  const normalizedKey = normalizeText(key);
  const normalizedName = normalizeText(setName);
  const overrides = {
    basep: 'wizards-black-star-promos',
    bwp: 'black-white-promos',
    dpp: 'diamond-pearl-promos',
    hsp: 'heartgold-soulsilver-promos',
    np: 'nintendo-promos',
    smp: 'sun-moon-promos',
    swshp: 'sword-shield-promos',
    svp: 'scarlet-violet-promos',
    xyp: 'xy-promos',
    ascended_heroes: 'ascended-heroes',
  };
  if (overrides[normalizedKey]) return overrides[normalizedKey];
  if (normalizedName === 'wizards black star promos') return 'wizards-black-star-promos';
  if (normalizedName === 'nintendo black star promos') return 'nintendo-promos';
  if (normalizedName === 'dp black star promos') return 'diamond-pearl-promos';
  if (normalizedName === 'hgss black star promos') return 'heartgold-soulsilver-promos';
  if (normalizedName === 'bw black star promos') return 'black-white-promos';
  if (normalizedName === 'xy black star promos') return 'xy-promos';
  if (normalizedName === 'sm black star promos') return 'sun-moon-promos';
  if (normalizedName === 'swsh black star promos') return 'sword-shield-promos';
  if (normalizedName === 'sv black star promos') return 'scarlet-violet-promos';
  return slugifyForPkmnCards(setName);
}

function bulbapediaTitleForSet(key, setName) {
  const normalizedKey = normalizeText(key);
  const normalizedName = normalizeText(setName);
  const overrides = {
    basep: 'Wizards_Black_Star_Promos_(TCG)',
    bwp: 'BW_Black_Star_Promos_(TCG)',
    dpp: 'DP_Black_Star_Promos_(TCG)',
    hsp: 'HGSS_Black_Star_Promos_(TCG)',
    np: 'Nintendo_Black_Star_Promos_(TCG)',
    smp: 'SM_Black_Star_Promos_(TCG)',
    swshp: 'SWSH_Black_Star_Promos_(TCG)',
    svp: 'SV_Black_Star_Promos_(TCG)',
    xyp: 'XY_Black_Star_Promos_(TCG)',
    ascended_heroes: 'Ascended_Heroes_(TCG)',
  };
  if (overrides[normalizedKey]) return overrides[normalizedKey];
  if (normalizedName === 'wizards black star promos') return 'Wizards_Black_Star_Promos_(TCG)';
  if (normalizedName === 'nintendo black star promos') return 'Nintendo_Black_Star_Promos_(TCG)';
  if (normalizedName === 'dp black star promos') return 'DP_Black_Star_Promos_(TCG)';
  if (normalizedName === 'hgss black star promos') return 'HGSS_Black_Star_Promos_(TCG)';
  if (normalizedName === 'bw black star promos') return 'BW_Black_Star_Promos_(TCG)';
  if (normalizedName === 'xy black star promos') return 'XY_Black_Star_Promos_(TCG)';
  if (normalizedName === 'sm black star promos') return 'SM_Black_Star_Promos_(TCG)';
  if (normalizedName === 'swsh black star promos') return 'SWSH_Black_Star_Promos_(TCG)';
  if (normalizedName === 'sv black star promos') return 'SV_Black_Star_Promos_(TCG)';
  return `${String(setName ?? '').trim().replace(/&/g, '&').replace(/\s+/g, '_')}_(TCG)`;
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
    const pkmnCardsSlug = pkmnCardsSlugForSet(key, setName);
    const bulbapediaTitle = bulbapediaTitleForSet(key, setName);
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
        official_checklist_pdf: pokemonSet.id ?? null,
        official_pokemon_checklist: pokemonSet.id ?? null,
        thepricedex: pokemonSet.id ?? null,
        thepricedex_price_list: pokemonSet.id ?? null,
        pkmncards: pkmnCardsSlug,
        bulbapedia: bulbapediaTitle,
        bulbapedia_set_list: bulbapediaTitle,
      },
      source_status: {
        pokemontcg_api: pokemonSet ? 'available' : 'unavailable',
        tcgdex: tcgdexSet ? 'available' : 'unavailable',
        official_checklist_pdf: pokemonSet ? 'candidate_url' : 'unavailable',
        official_pokemon_checklist: pokemonSet ? 'candidate_url' : 'unavailable',
        thepricedex: pokemonSet ? 'candidate_url' : 'unavailable',
        thepricedex_price_list: pokemonSet ? 'candidate_url' : 'unavailable',
        pkmncards: pkmnCardsSlug ? 'candidate_url' : 'unavailable',
        bulbapedia: bulbapediaTitle ? 'candidate_url' : 'unavailable',
        bulbapedia_set_list: bulbapediaTitle ? 'candidate_url' : 'unavailable',
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
    const pkmnCardsSlug = pkmnCardsSlugForSet(key, setName);
    const bulbapediaTitle = bulbapediaTitleForSet(key, setName);
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
        official_checklist_pdf: null,
        official_pokemon_checklist: null,
        thepricedex: tcgdexSet.id,
        thepricedex_price_list: tcgdexSet.id,
        pkmncards: pkmnCardsSlug,
        bulbapedia: bulbapediaTitle,
        bulbapedia_set_list: bulbapediaTitle,
      },
      source_status: {
        pokemontcg_api: 'unavailable',
        tcgdex: 'available',
        official_checklist_pdf: 'unavailable',
        official_pokemon_checklist: 'unavailable',
        thepricedex: 'candidate_url',
        thepricedex_price_list: 'candidate_url',
        pkmncards: pkmnCardsSlug ? 'candidate_url' : 'unavailable',
        bulbapedia: bulbapediaTitle ? 'candidate_url' : 'unavailable',
        bulbapedia_set_list: bulbapediaTitle ? 'candidate_url' : 'unavailable',
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
        set.source_aliases.official_checklist_pdf,
        set.source_aliases.official_pokemon_checklist,
        set.source_aliases.thepricedex,
        set.source_aliases.thepricedex_price_list,
        set.source_aliases.pkmncards,
        set.source_aliases.bulbapedia,
        set.source_aliases.bulbapedia_set_list,
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

function isBlackStarPromoSet(setConfig) {
  return /\bblack star promos?\b/i.test(setConfig?.set_name ?? '')
    || ['basep', 'np', 'dpp', 'hsp', 'bwp', 'xyp', 'smp', 'swshp', 'svp', 'mep'].includes(setConfig?.key);
}

function finishCandidatesFromTcgdex(card, setConfig) {
  const variants = card?.variants && typeof card.variants === 'object' ? card.variants : {};
  const finishes = [];
  const hasNormal = variants.normal === true;
  const hasHolo = variants.holo === true || variants.holofoil === true;
  if (hasNormal && !isBlackStarPromoSet(setConfig)) finishes.push('normal');
  if (hasHolo) finishes.push('holo');
  if (variants.reverse === true || variants.reverseHolo === true || variants.reverseHolofoil === true) finishes.push('reverse');
  if (variants.firstEdition === true) {
    if (hasNormal) finishes.push('first_edition_normal');
    if (hasHolo) finishes.push('first_edition_holo');
  }
  if (variants.firstEditionNormal === true) finishes.push('first_edition_normal');
  if (variants.firstEditionHolo === true) finishes.push('first_edition_holo');
  return uniqueSorted(finishes.map(normalizeFinishKey));
}

function finishKeyFromThePriceDexVariant(value) {
  const normalized = String(value ?? '').trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  const aliases = {
    normal: 'normal',
    holofoil: 'holo',
    holo_foil: 'holo',
    holo: 'holo',
    reverse_holofoil: 'reverse',
    reverse_holo: 'reverse',
    reverse: 'reverse',
    first_edition_normal: 'first_edition_normal',
    first_edition: 'first_edition_normal',
    first_edition_holofoil: 'first_edition_holo',
    first_edition_holo: 'first_edition_holo',
    first_edition_shadowless: 'first_edition_normal',
    first_edition_shadowless_holofoil: 'first_edition_holo',
    first_edition_shadowless_red_cheeks: 'first_edition_normal',
    first_edition_unlimited_holofoil: 'first_edition_holo',
    unlimited: 'normal',
    unlimited_holofoil: 'holo',
    pokeball: 'pokeball',
    poke_ball: 'pokeball',
    masterball: 'masterball',
    master_ball: 'masterball',
    cosmos_holofoil: 'cosmos',
    cosmos_holo: 'cosmos',
    cracked_ice_holofoil: 'cracked_ice',
    cracked_ice_holo: 'cracked_ice',
  };
  if (aliases[normalized]) return normalizeFinishKey(aliases[normalized]);
  if (normalized.includes('stamp')) return 'stamped';
  if (normalized.includes('cosmos')) return 'cosmos';
  if (normalized.includes('cracked_ice')) return 'cracked_ice';
  return null;
}

function slugifyForThePriceDex(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
      marketplace_source_url: card?.tcgplayer?.url ?? null,
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
    ...finishCandidatesFromTcgdex(card, setConfig).map((finishKey) => ({
      ...base,
      finish_key: finishKey,
      evidence_type: 'finish_presence',
      evidence_label: `TCGdex variants ${finishKey}`,
      notes: HUMAN_REQUIRED_NOTE,
    })),
  ];
}

function decodePdfLiteral(text) {
  let decoded = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\') {
      index += 1;
      const escaped = text[index];
      if (escaped === 'n') decoded += '\n';
      else if (escaped === 'r') decoded += '\r';
      else if (escaped === 't') decoded += '\t';
      else if (escaped === 'b') decoded += '\b';
      else if (escaped === 'f') decoded += '\f';
      else if (escaped === '(' || escaped === ')' || escaped === '\\') decoded += escaped;
      else if (/[0-7]/.test(escaped ?? '')) {
        let octal = escaped;
        for (let extra = 0; extra < 2 && /[0-7]/.test(text[index + 1] ?? ''); extra += 1) {
          index += 1;
          octal += text[index];
        }
        decoded += String.fromCharCode(parseInt(octal, 8));
      } else if (escaped) {
        decoded += escaped;
      }
    } else {
      decoded += char;
    }
  }
  return decoded;
}

function decodePdfHex(hex) {
  const clean = hex.replace(/\s+/g, '');
  const bytes = [];
  for (let index = 0; index < clean.length; index += 2) {
    const value = parseInt(clean.slice(index, index + 2).padEnd(2, '0'), 16);
    if (Number.isFinite(value) && value >= 32 && value <= 126) bytes.push(value);
  }
  return Buffer.from(bytes).toString('latin1');
}

function decodePdfTextToken(token) {
  if (token.startsWith('(') && token.endsWith(')')) return decodePdfLiteral(token.slice(1, -1));
  if (token.startsWith('<') && token.endsWith('>')) return decodePdfHex(token.slice(1, -1));
  return '';
}

function decodePdfTextArray(arrayBody) {
  const pieces = [];
  const tokenPattern = /\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]+)>/g;
  for (const match of arrayBody.matchAll(tokenPattern)) {
    pieces.push(decodePdfTextToken(match[0]));
  }
  return pieces.join('');
}

function inflatePdfStreams(buffer) {
  const source = buffer.toString('latin1');
  const streams = [];
  const pattern = /<<(?:.|\n|\r)*?>>\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/g;
  for (const match of source.matchAll(pattern)) {
    const headerStart = Math.max(0, match.index - 2000);
    const header = source.slice(headerStart, match.index);
    if (!/\/FlateDecode\b/.test(header)) continue;
    const raw = Buffer.from(match[1], 'latin1');
    try {
      streams.push(zlib.inflateSync(raw).toString('latin1'));
    } catch {
      try {
        streams.push(zlib.inflateRawSync(raw).toString('latin1'));
      } catch {
        // Ignore image or unsupported streams. This parser only needs checklist text streams.
      }
    }
  }
  return streams;
}

function extractPdfTextChunks(buffer) {
  const chunks = [];
  for (const stream of inflatePdfStreams(buffer)) {
    let x = 0;
    let y = 0;
    let font = '';
    let size = 0;
    const tokenPattern = /\/([A-Za-z0-9_+-]+)\s+([0-9.]+)\s+Tf|(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+Tm|(-?[0-9.]+)\s+(-?[0-9.]+)\s+Td|(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]+>)\s*Tj|\[((?:.|\n|\r)*?)\]\s*TJ/g;
    for (const match of stream.matchAll(tokenPattern)) {
      if (match[1]) {
        font = match[1];
        size = Number(match[2]);
      } else if (match[3]) {
        x = Number(match[7]);
        y = Number(match[8]);
      } else if (match[9]) {
        x += Number(match[9]);
        y += Number(match[10]);
      } else if (match[11]) {
        const text = decodePdfTextToken(match[11]).trim();
        if (text) chunks.push({ x, y, font, size, text });
      } else if (match[12]) {
        const text = decodePdfTextArray(match[12]).trim();
        if (text) chunks.push({ x, y, font, size, text });
      }
    }
  }
  return chunks;
}

function officialChecklistUrl(setConfig) {
  const setId = setConfig.source_aliases.official_checklist_pdf;
  if (!setId) return null;
  return `https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/${encodeURIComponent(setId)}_web_cardlist_en.pdf`;
}

function standardOfficialFinish({ cardName, rarityText }) {
  const rarity = String(rarityText ?? '');
  const name = String(cardName ?? '');
  if (/[+H]/.test(rarity)) return 'holo';
  if (/\b(?:V|VMAX|VSTAR|ex)\b/i.test(name)) return 'holo';
  return 'normal';
}

function chooseOfficialCardName(rowChunks, numberChunk) {
  const candidates = rowChunks
    .filter((chunk) => chunk.x > numberChunk.x + 24 && chunk.x < numberChunk.x + 110)
    .map((chunk) => chunk.text.trim())
    .filter((text) => /[A-Za-z]/.test(text))
    .filter((text) => !/^(?:H|O|X|\+)$/.test(text));
  return candidates.sort((a, b) => b.length - a.length)[0] ?? '';
}

function parseOfficialChecklistRows(buffer) {
  const chunks = extractPdfTextChunks(buffer);
  const numberChunks = chunks.filter((chunk) => /^\d{3}[A-Za-z]?$/.test(chunk.text));
  const rows = [];
  const seen = new Set();

  for (const numberChunk of numberChunks) {
    const rowChunks = chunks.filter((chunk) => (
      Math.abs(chunk.y - numberChunk.y) < 0.8
      && chunk.x >= numberChunk.x - 2
      && chunk.x <= numberChunk.x + 135
    ));
    const boxes = rowChunks.filter((chunk) => chunk.text === 'Q' && chunk.x > numberChunk.x + 8 && chunk.x < numberChunk.x + 28);
    if (boxes.length === 0) continue;
    const cardName = chooseOfficialCardName(rowChunks, numberChunk);
    if (!cardName) continue;
    const rarityText = rowChunks
      .filter((chunk) => chunk.x > numberChunk.x + 96 && chunk.x < numberChunk.x + 128)
      .map((chunk) => chunk.text)
      .filter((text) => !/^\d{3}[A-Za-z]?$/.test(text) && text !== 'Q')
      .join(' ')
      .trim();
    const key = `${numberChunk.text}|${cardName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const finishes = [standardOfficialFinish({ cardName, rarityText })];
    if (boxes.length >= 2) finishes.push('reverse');
    for (const finishKey of uniqueSorted(finishes.map(normalizeFinishKey))) {
      rows.push({
        card_number: numberChunk.text,
        card_name: cardName,
        rarity_text: rarityText || null,
        finish_key: finishKey,
        checklist_box_count: boxes.length,
      });
    }
  }

  return rows.sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true }));
}

async function collectOfficialChecklistEvidenceForSet(setConfig, options, retrievedAt) {
  if (!options.sources.includes('official_checklist_pdf')) return [];
  const url = officialChecklistUrl(setConfig);
  if (!url) return [];
  const buffer = await fetchBuffer(url);
  const parsedRows = parseOfficialChecklistRows(buffer);
  if (parsedRows.length === 0) {
    throw new Error('Official checklist PDF fetched, but no extractable checklist rows were found.');
  }
  return parsedRows.map((row) => ({
    source_key: 'official_pokemon_checklist',
    source_kind: 'official_gallery',
    source_url: url,
    set_key: setConfig.key,
    set_name: setConfig.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    rarity: row.rarity_text,
    language: 'en',
    evidence_type: 'finish_presence',
    evidence_label: `Official Pokemon checklist ${setConfig.source_aliases.official_checklist_pdf} ${row.card_number} ${row.card_name} ${row.finish_key}`,
    retrieved_at: retrievedAt,
    raw_snapshot_ref: `official_pokemon_checklist:${setConfig.source_aliases.official_checklist_pdf}:${row.card_number}:${row.finish_key}`,
    source_card_name: row.card_name,
    source_set_name: setConfig.set_name,
    notes: 'Parsed from the official Pokemon PDF checklist row. The standard checklist box is mapped to normal or holo by rarity/name, and a second checklist box is mapped to reverse holo presence.',
  }));
}

function thePriceDexUrl(setConfig) {
  const setId = setConfig.source_aliases.thepricedex;
  if (!setId) return null;
  return `https://www.thepricedex.com/set/${encodeURIComponent(setId)}/${slugifyForThePriceDex(setConfig.set_name)}/price-list`;
}

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&eacute;/g, 'e')
    .replace(/&Eacute;/g, 'E')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractNextDataJson(html, url) {
  const match = String(html).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`ThePriceDex page did not expose __NEXT_DATA__: ${url}`);
  return JSON.parse(match[1]);
}

async function collectThePriceDexEvidenceForSet(setConfig, options, retrievedAt) {
  if (!options.sources.includes('thepricedex')) return [];
  const url = thePriceDexUrl(setConfig);
  if (!url) return [];
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Grookai Master Index Audit/1.0',
    },
  });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }
  const data = extractNextDataJson(html, url);
  const cards = data?.props?.pageProps?.initialCards;
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error(`ThePriceDex page contained no card rows: ${url}`);
  }

  const rows = [];
  for (const card of sortByCardNumber(cards)) {
    const cardNumber = card.number ?? card.printedNumber ?? '';
    const cardName = card.name ?? '';
    if (!cardNumber || !cardName) continue;
    const base = {
      source_key: 'thepricedex_price_list',
      source_kind: 'marketplace_checklist',
      source_url: url,
      set_key: setConfig.key,
      set_name: setConfig.set_name,
      card_number: cardNumber,
      card_name: cardName,
      rarity: card.rarity ?? null,
      language: 'en',
      retrieved_at: retrievedAt,
      raw_snapshot_ref: `thepricedex:${setConfig.source_aliases.thepricedex}:${card.id ?? cardNumber}`,
      source_card_name: cardName,
      source_set_name: card?.expansion?.name ?? setConfig.set_name,
    };
    rows.push({
      ...base,
      finish_key: null,
      evidence_type: 'card_identity',
      evidence_label: `ThePriceDex price-list card ${card.id ?? `${setConfig.key}-${cardNumber}`}`,
      notes: 'Human-readable marketplace/checklist card identity evidence from ThePriceDex embedded set price-list data.',
    });
    const variants = Array.isArray(card.variants) ? card.variants : [];
    for (const variant of variants) {
      const finishKey = finishKeyFromThePriceDexVariant(variant?.name);
      if (!finishKey) continue;
      rows.push({
        ...base,
        finish_key: finishKey,
        evidence_type: 'finish_presence',
        evidence_label: `ThePriceDex price-list variant ${variant.name}`,
        raw_snapshot_ref: `thepricedex:${setConfig.source_aliases.thepricedex}:${card.id ?? cardNumber}:${variant.name}`,
        notes: 'Exact card-level finish evidence from ThePriceDex price-list variant data. This source does not create finish rows unless the variant is listed for the specific card.',
      });
    }
  }
  return rows;
}

function pkmnCardsUrl(setConfig) {
  const slug = setConfig.source_aliases.pkmncards;
  if (!slug) return null;
  return `https://pkmncards.com/set/${encodeURIComponent(slug)}/`;
}

function parsePkmnCardsSetPage(html) {
  const rows = [];
  const seen = new Set();
  const pattern = /<a\b(?=[^>]*\bcard-image-link\b)[^>]*\bhref="([^"]+)"[^>]*\btitle="([^"]+)"[^>]*>/g;
  for (const match of String(html).matchAll(pattern)) {
    const sourceUrl = decodeHtmlEntities(match[1]);
    const title = decodeHtmlEntities(match[2]).trim();
    const titleMatch = title.match(/^(.*?)\s+·\s+(.*?)\s+\(([^)]+)\)\s+#(.+)$/);
    if (!titleMatch) continue;
    const cardName = titleMatch[1].trim();
    const cardNumber = titleMatch[4].trim();
    if (!cardName || !cardNumber) continue;
    const key = `${cardNumber}|${cardName}|${sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      card_number: cardNumber,
      card_name: cardName,
      source_url: sourceUrl,
      evidence_label: `PkmnCards set page ${title}`,
      raw_code: titleMatch[3].trim(),
    });
  }
  return sortByCardNumber(rows);
}

async function collectPkmnCardsEvidenceForSet(setConfig, options, retrievedAt) {
  if (!options.sources.includes('pkmncards')) return [];
  const url = pkmnCardsUrl(setConfig);
  if (!url) return [];
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Grookai Master Index Audit/1.0',
    },
  });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }
  const parsedRows = parsePkmnCardsSetPage(html);
  if (parsedRows.length === 0) {
    throw new Error(`PkmnCards page contained no card rows: ${url}`);
  }
  return parsedRows.map((row) => ({
    source_key: 'pkmncards',
    source_kind: 'collector_reference',
    source_url: row.source_url,
    set_key: setConfig.key,
    set_name: setConfig.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: null,
    rarity: null,
    language: 'en',
    evidence_type: 'card_identity',
    evidence_label: row.evidence_label,
    retrieved_at: retrievedAt,
    raw_snapshot_ref: `pkmncards:${setConfig.source_aliases.pkmncards}:${row.raw_code}:${row.card_number}`,
    source_card_name: row.card_name,
    source_set_name: setConfig.set_name,
    notes: 'Human-readable collector-reference card identity evidence from the PkmnCards English set page. This adapter does not emit finish truth or create printings.',
  }));
}

function bulbapediaUrl(setConfig) {
  const title = setConfig.source_aliases.bulbapedia;
  if (!title) return null;
  return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(title)}`;
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBulbapediaCardName(cardCell) {
  const links = [...String(cardCell ?? '').matchAll(/<a\b[^>]*\btitle="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  for (const link of links) {
    const title = decodeHtmlEntities(link[1]).trim();
    if (!title || /\b(?:TCG|Energy|Rarity|format|File|Special Energy)\b/i.test(title)) continue;
    const titleName = title.replace(/\s+\([^)]+\)\s*$/, '').trim();
    if (titleName) return titleName;
    const textName = stripHtml(link[2]);
    if (textName) return textName;
  }
  return stripHtml(cardCell);
}

function parseBulbapediaRarity(rarityCell) {
  const alt = String(rarityCell ?? '').match(/\balt="([^"]+)"/);
  if (alt?.[1]) return decodeHtmlEntities(alt[1]).trim();
  const title = String(rarityCell ?? '').match(/\btitle="([^"]+)"/);
  if (title?.[1]) return decodeHtmlEntities(title[1]).trim();
  return stripHtml(rarityCell) || null;
}

function parseBulbapediaSetPage(html, expectedSetName) {
  const source = String(html ?? '');
  const start = source.indexOf('id="Set_lists"');
  if (start === -1) return [];
  const nextHeading = source.indexOf('<h2', start + 1);
  const section = source.slice(start, nextHeading === -1 ? source.length : nextHeading);
  const expected = normalizeSetLookup(expectedSetName);
  const headings = [...section.matchAll(/<big><b>([\s\S]*?)<\/b><\/big>/g)];
  const heading = headings.find((entry) => normalizeSetLookup(stripHtml(entry[1])) === expected) ?? headings[0];
  const scopedSection = heading
    ? section.slice(heading.index, headings.find((entry) => entry.index > heading.index)?.index ?? section.length)
    : section;
  const rows = [];
  const seen = new Set();
  for (const match of scopedSection.matchAll(/<tr\b[\s\S]*?<\/tr>/g)) {
    const rowHtml = match[0];
    const cells = [...rowHtml.matchAll(/<(?:td|th)\b[\s\S]*?<\/(?:td|th)>/g)].map((cell) => cell[0]);
    if (cells.length < 4) continue;
    const numberText = stripHtml(cells[0]);
    if (!/^[A-Z]*\d+[A-Za-z]*(?:\/\d+)?$|^[A-Z]{1,4}\d+$/i.test(numberText)) continue;
    const cardNumber = numberText.split('/')[0].trim();
    const cardName = parseBulbapediaCardName(cells[2]);
    if (!cardName || !/[A-Za-z0-9]/.test(cardName)) continue;
    const rarity = parseBulbapediaRarity(cells[4] ?? cells[cells.length - 1]);
    const key = `${cardNumber}|${cardName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ card_number: cardNumber, card_name: cardName, rarity });
  }
  return sortByCardNumber(rows);
}

async function collectBulbapediaEvidenceForSet(setConfig, options, retrievedAt) {
  if (!options.sources.includes('bulbapedia')) return [];
  const url = bulbapediaUrl(setConfig);
  if (!url) return [];
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Grookai Master Index Audit/1.0',
    },
  });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }
  const parsedRows = parseBulbapediaSetPage(html, setConfig.set_name);
  if (parsedRows.length === 0) {
    throw new Error(`Bulbapedia page contained no extractable set-list rows: ${url}`);
  }
  return parsedRows.map((row) => ({
    source_key: 'bulbapedia_set_list',
    source_kind: 'human_readable_checklist',
    source_url: `${url}#Set_lists`,
    set_key: setConfig.key,
    set_name: setConfig.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: null,
    rarity: row.rarity,
    language: 'en',
    evidence_type: 'card_identity',
    evidence_label: `Bulbapedia set-list row ${row.card_number} ${row.card_name}`,
    retrieved_at: retrievedAt,
    raw_snapshot_ref: `bulbapedia:${setConfig.source_aliases.bulbapedia}:${row.card_number}`,
    source_card_name: row.card_name,
    source_set_name: setConfig.set_name,
    notes: 'Human-readable checklist card identity evidence from the Bulbapedia English set-list table. This adapter records rarity as evidence context but does not emit finish truth.',
  }));
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

function identitySupportKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

function filterSupportiveIdentityRows(candidateRows, existingRows) {
  const existingIdentityKeys = new Set(
    existingRows
      .filter((row) => row.language === 'en' && row.card_number && row.card_name)
      .map(identitySupportKey),
  );
  return candidateRows.filter((row) => existingIdentityKeys.has(identitySupportKey(row)));
}

function buildTcgplayerMarketplaceBridgeEvidence(rows, retrievedAt) {
  const structuredByFact = new Map();
  for (const row of rows) {
    if (row.source_kind !== 'structured_api') continue;
    if (row.evidence_type !== 'finish_presence') continue;
    if (!row.finish_key || !row.card_number || !row.card_name) continue;
    const key = printingFactKey(row);
    if (!structuredByFact.has(key)) structuredByFact.set(key, []);
    structuredByFact.get(key).push(row);
  }

  const bridgeRows = [];
  for (const [key, factRows] of structuredByFact.entries()) {
    const sources = uniqueSorted(factRows.map((row) => row.source_key));
    if (!sources.includes('pokemontcg_api') || sources.length < 2) continue;
    const pokemonRow = factRows.find((row) => row.source_key === 'pokemontcg_api');
    if (!pokemonRow?.marketplace_source_url) continue;
    bridgeRows.push({
      ...pokemonRow,
      source_key: 'tcgplayer_price_guide',
      source_kind: 'marketplace_checklist',
      source_url: pokemonRow.marketplace_source_url,
      evidence_type: 'finish_presence',
      evidence_label: `TCGplayer price-guide variant for ${pokemonRow.finish_key}`,
      retrieved_at: retrievedAt,
      raw_snapshot_ref: `tcgplayer_price_guide:${key}`,
      notes: 'Marketplace bridge evidence is emitted only when the exact finish already has at least two structured source records, including PokemonTCG.io TCGplayer price metadata. It does not create new printings.',
      source_card_name: pokemonRow.source_card_name ?? pokemonRow.card_name,
      source_set_name: pokemonRow.source_set_name ?? pokemonRow.set_name,
      marketplace_source_url: undefined,
    });
  }
  return bridgeRows;
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

  if (options.sources.includes('official_checklist_pdf')) {
    try {
      const sourceRows = await collectOfficialChecklistEvidenceForSet(setConfig, options, retrievedAt);
      rows.push(...sourceRows);
      availability.push(sourceAvailabilityFromSet(setConfig, 'official_pokemon_checklist', sourceRows));
    } catch (error) {
      availability.push(sourceAvailabilityFromSet(setConfig, 'official_pokemon_checklist', [], error));
    }
  }

  if (options.sources.includes('thepricedex')) {
    try {
      const sourceRows = await collectThePriceDexEvidenceForSet(setConfig, options, retrievedAt);
      rows.push(...sourceRows);
      availability.push(sourceAvailabilityFromSet(setConfig, 'thepricedex_price_list', sourceRows));
    } catch (error) {
      availability.push(sourceAvailabilityFromSet(setConfig, 'thepricedex_price_list', [], error));
    }
  }

  if (options.sources.includes('pkmncards')) {
    try {
      const sourceRows = await collectPkmnCardsEvidenceForSet(setConfig, options, retrievedAt);
      const supportiveRows = filterSupportiveIdentityRows(sourceRows, rows);
      rows.push(...supportiveRows);
      availability.push(sourceAvailabilityFromSet(setConfig, 'pkmncards', supportiveRows));
    } catch (error) {
      availability.push(sourceAvailabilityFromSet(setConfig, 'pkmncards', [], error));
    }
  }

  if (options.sources.includes('bulbapedia')) {
    try {
      const sourceRows = await collectBulbapediaEvidenceForSet(setConfig, options, retrievedAt);
      const supportiveRows = filterSupportiveIdentityRows(sourceRows, rows);
      rows.push(...supportiveRows);
      availability.push(sourceAvailabilityFromSet(setConfig, 'bulbapedia_set_list', supportiveRows));
    } catch (error) {
      availability.push(sourceAvailabilityFromSet(setConfig, 'bulbapedia_set_list', [], error));
    }
  }

  const tcgplayerBridgeRows = buildTcgplayerMarketplaceBridgeEvidence(rows, retrievedAt);
  if (tcgplayerBridgeRows.length > 0) {
    rows.push(...tcgplayerBridgeRows);
    availability.push(sourceAvailabilityFromSet(setConfig, 'tcgplayer_price_guide', tcgplayerBridgeRows));
  } else {
    availability.push(sourceAvailabilityFromSet(setConfig, 'tcgplayer_price_guide', []));
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
      set.source_aliases.official_checklist_pdf,
      set.source_aliases.official_pokemon_checklist,
      set.source_aliases.thepricedex,
      set.source_aliases.thepricedex_price_list,
      set.source_aliases.pkmncards,
      set.source_aliases.bulbapedia,
      set.source_aliases.bulbapedia_set_list,
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
      set.source_aliases.official_checklist_pdf,
      set.source_aliases.official_pokemon_checklist,
      set.source_aliases.thepricedex,
      set.source_aliases.thepricedex_price_list,
      set.source_aliases.pkmncards,
      set.source_aliases.bulbapedia,
      set.source_aliases.bulbapedia_set_list,
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

function cardLevelKey(row) {
  return [
    normalizeText(row.set_name),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

function suppressStructuredOnlyFinishCandidates(records, generatedAt) {
  const humanFinishesByCard = new Map();
  const rowsByPrinting = new Map();

  for (const row of records) {
    if (row.language !== 'en' || row.evidence_type !== 'finish_presence' || !row.finish_key || !row.card_number || !row.card_name) continue;
    const printingKey = printingFactKey(row);
    if (!rowsByPrinting.has(printingKey)) rowsByPrinting.set(printingKey, []);
    rowsByPrinting.get(printingKey).push(row);

    if (EXACT_CHECKLIST_SOURCE_KINDS.has(row.source_kind)) {
      const cardKey = cardLevelKey(row);
      if (!humanFinishesByCard.has(cardKey)) humanFinishesByCard.set(cardKey, new Set());
      humanFinishesByCard.get(cardKey).add(row.finish_key);
    }
  }

  const kept = [];
  const suppressed = [];
  for (const row of records) {
    const cardKey = cardLevelKey(row);
    const humanFinishes = humanFinishesByCard.get(cardKey);
    const isSuppressibleStructuredFinish = row.language === 'en'
      && row.source_kind === 'structured_api'
      && row.evidence_type === 'finish_presence'
      && row.finish_key
      && row.card_number
      && row.card_name
      && humanFinishes
      && !humanFinishes.has(row.finish_key);

    if (!isSuppressibleStructuredFinish) {
      kept.push(row);
      continue;
    }

    const sameFactRows = rowsByPrinting.get(printingFactKey(row)) ?? [];
    const sourceKeys = uniqueSorted(sameFactRows.map((candidate) => candidate.source_key));
    const hasChecklistSameFinish = sameFactRows.some((candidate) => EXACT_CHECKLIST_SOURCE_KINDS.has(candidate.source_kind));
    if (sourceKeys.length === 1 && !hasChecklistSameFinish) {
      suppressed.push({
        ...row,
        suppressed_at: generatedAt,
        suppression_status: 'structured_only_unsupported_by_exact_checklist',
        supported_checklist_finishes_for_card: uniqueSorted([...humanFinishes]),
        suppression_reason: 'The card has exact human/checklist variant evidence, but this single structured-source finish is not listed by that checklist lane. It is excluded from working Master Index truth and retained in this audit report.',
      });
    } else {
      kept.push(row);
    }
  }

  return { records: kept, suppressed };
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

function indexPayload({ records, classified, setConfigs, sourceAvailability, generatedAt, structuredSuppression }) {
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
      suppressed_structured_finish_candidates: structuredSuppression?.suppressed?.length ?? 0,
      source_availability_by_status: countBy(sourceAvailability, (row) => `${row.source_key}|${row.runtime_status}`),
    },
    sets: setConfigs,
    source_availability: sourceAvailability,
    cards: classified.cards,
    printings: classified.printings,
    finish_absences: classified.finish_absences,
    conflicts: classified.conflicts,
    manual_review: classified.manual_review,
    structured_suppression: structuredSuppression ?? { suppressed: [] },
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
    set.source_aliases.official_checklist_pdf ?? '',
    set.source_aliases.thepricedex ?? '',
    set.source_aliases.pkmncards ?? '',
    set.source_aliases.bulbapedia ?? '',
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
    markdownTable(['set_key', 'set_name', 'PokemonTCG.io', 'TCGdex', 'Official checklist', 'ThePriceDex', 'PkmnCards', 'Bulbapedia', 'evidence rows', 'card statuses', 'printing statuses'], rows),
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

function unsupportedCardKey(row) {
  return [
    row.set_code ?? row.set_key ?? '',
    normalizeNumber(row.card_number ?? ''),
    foldNameForTriage(row.grookai_card_name ?? row.index_card_name ?? ''),
  ].join('|');
}

function buildIndexFactsByCard(grookaiAudit) {
  const facts = new Map();
  const supportedStatuses = new Set([
    'master_verified_by_index',
    'human_source_verified_by_index',
    'api_agreed_by_index',
    'candidate_unconfirmed_by_index',
    'missing_from_grookai',
  ]);
  for (const row of grookaiAudit?.rows ?? []) {
    if (!supportedStatuses.has(row.status)) continue;
    const key = unsupportedCardKey(row);
    const entry = facts.get(key) ?? {
      finishes: new Set(),
      statuses: new Set(),
      sources: new Set(),
    };
    if (row.finish_key) entry.finishes.add(row.finish_key);
    if (row.index_status) entry.statuses.add(row.index_status);
    for (const source of row.index_sources ?? []) entry.sources.add(source);
    facts.set(key, entry);
  }
  return facts;
}

function unsupportedSetFamily(setCode) {
  const code = String(setCode ?? '').trim();
  if (/^tk-/i.test(code)) return 'deck_kit';
  if (/^mcd/i.test(code)) return 'mcdonalds';
  if (/^pop/i.test(code)) return 'pop_series';
  if (['bp', 'np'].includes(code)) return 'early_promo_or_product';
  if (['basep', 'bwp', 'xyp', 'sma', 'smp', 'swshp', 'svp'].includes(code)) return 'promo_family';
  if (/tg$/i.test(code)) return 'trainer_gallery_subset';
  if (['cel25c', 'swsh45sv'].includes(code)) return 'subset_alias';
  if (['g1', 'bw11', 'cel25', 'col1', 'dp7', 'pl1', 'pl2', 'pl3', 'pl4', 'swsh12.5'].includes(code)) return 'subset_number_collision_family';
  if (/^sv10\.5[wb]$/i.test(code) || ['sv8pt5'].includes(code)) return 'modern_parallel_family';
  return 'standard_set';
}

function unsupportedCategory(row, indexFactsByCard) {
  const setCode = String(row.set_code ?? row.set_key ?? '').trim();
  const finish = String(row.finish_key ?? '').trim();
  const family = unsupportedSetFamily(setCode);
  const fact = indexFactsByCard.get(unsupportedCardKey(row));
  const knownFinishes = fact ? [...fact.finishes].sort() : [];

  if (row.card_number === '?' || !String(row.card_number ?? '').trim()) {
    return {
      category: 'invalid_or_unknown_card_number_review',
      reason: 'Grookai card number is missing or unknown, so exact external matching is not possible.',
      known_index_finishes: knownFinishes,
    };
  }
  if (finish === 'masterball' || finish === 'pokeball') {
    return {
      category: 'modern_parallel_exact_finish_needs_source',
      reason: 'Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish.',
      known_index_finishes: knownFinishes,
    };
  }
  if (family === 'promo_family') {
    return {
      category: 'promo_family_source_coverage_gap',
      reason: 'Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support.',
      known_index_finishes: knownFinishes,
    };
  }
  if (['deck_kit', 'mcdonalds', 'pop_series', 'early_promo_or_product'].includes(family)) {
    return {
      category: 'product_or_deck_set_source_coverage_gap',
      reason: 'Product, deck, POP, McDonald\'s, or early promo rows need dedicated checklist/source coverage before judging support.',
      known_index_finishes: knownFinishes,
    };
  }
  if (['trainer_gallery_subset', 'subset_alias', 'subset_number_collision_family'].includes(family)) {
    return {
      category: 'subset_or_numbering_alias_review',
      reason: 'Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support.',
      known_index_finishes: knownFinishes,
    };
  }
  if (family === 'modern_parallel_family') {
    return {
      category: 'modern_parallel_set_review',
      reason: 'Modern parallel-heavy set needs exact card-level parallel evidence before judging support.',
      known_index_finishes: knownFinishes,
    };
  }
  if (fact && finish === 'reverse') {
    return {
      category: 'reverse_holo_overgeneration_candidate',
      reason: 'The index knows this exact card identity but does not support Grookai\'s reverse finish in this audit pass.',
      known_index_finishes: knownFinishes,
    };
  }
  if (fact && finish === 'holo') {
    return {
      category: 'holo_overgeneration_candidate',
      reason: 'The index knows this exact card identity but does not support Grookai\'s holo finish in this audit pass.',
      known_index_finishes: knownFinishes,
    };
  }
  if (fact && finish === 'normal') {
    return {
      category: 'normal_variant_not_in_index_review',
      reason: 'The index knows this exact card identity but does not support Grookai\'s normal finish in this audit pass.',
      known_index_finishes: knownFinishes,
    };
  }
  if (fact) {
    return {
      category: 'known_card_unsupported_finish_review',
      reason: 'The index knows this exact card identity but not this Grookai finish.',
      known_index_finishes: knownFinishes,
    };
  }
  return {
    category: 'source_coverage_or_alias_gap',
    reason: 'No exact card identity fact was found in the current index for this Grookai row.',
    known_index_finishes: knownFinishes,
  };
}

function buildUnsupportedTriage(grookaiAudit, generatedAt) {
  const rows = grookaiAudit?.rows?.filter((row) => row.status === 'unsupported_by_current_index') ?? [];
  const indexFactsByCard = buildIndexFactsByCard(grookaiAudit);
  const categorizedRows = rows.map((row) => {
    const category = unsupportedCategory(row, indexFactsByCard);
    return {
      category: category.category,
      reason: category.reason,
      known_index_finishes: category.known_index_finishes,
      ...row,
    };
  });
  const rowsByCategory = Object.fromEntries(
    Object.entries(countBy(categorizedRows, (row) => row.category)).map(([category, count]) => {
      const categoryRows = categorizedRows.filter((row) => row.category === category);
      return [
        category,
        {
          count,
          by_set_code: countBy(categoryRows, (row) => row.set_code ?? row.set_key ?? 'unknown'),
          by_finish: countBy(categoryRows, (row) => row.finish_key ?? 'unknown'),
          rows: categoryRows,
        },
      ];
    }),
  );
  return {
    version: 'ENGLISH_MASTER_INDEX_UNSUPPORTED_TRIAGE_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    source_report: 'english_master_index_grookai_audit_v1.json',
    rule: 'Unsupported-by-current-index rows are not deletion authority. They must be split into source coverage gaps, alias/subset issues, and finish overgeneration candidates before any controlled set repair.',
    summary: {
      total_unsupported_by_current_index: rows.length,
      by_category: countBy(categorizedRows, (row) => row.category),
      by_set_code: countBy(categorizedRows, (row) => row.set_code ?? row.set_key ?? 'unknown'),
      by_finish: countBy(categorizedRows, (row) => row.finish_key ?? 'unknown'),
    },
    categories: rowsByCategory,
  };
}

function buildUnsupportedTriageMarkdown(payload) {
  const categoryRows = Object.entries(payload.summary.by_category).map(([category, count]) => [category, count]);
  const setRows = Object.entries(payload.summary.by_set_code).map(([setCode, count]) => [setCode, count]);
  const finishRows = Object.entries(payload.summary.by_finish).map(([finish, count]) => [finish, count]);
  const categorySections = Object.entries(payload.categories).flatMap(([category, entry]) => {
    const topSets = Object.entries(entry.by_set_code)
      .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
      .slice(0, 20)
      .map(([setCode, count]) => [setCode, count]);
    const samples = entry.rows.slice(0, 50).map((row) => [
      row.set_code ?? row.set_key ?? '',
      row.card_number ?? '',
      row.grookai_card_name ?? '',
      row.finish_key ?? '',
      (row.known_index_finishes ?? []).join(', '),
      row.reason ?? '',
    ]);
    return [
      `## ${category}`,
      '',
      `Rows: ${entry.count}`,
      '',
      '### Top Sets',
      '',
      markdownTable(['set_code', 'count'], topSets),
      '',
      '### Sample Rows',
      '',
      markdownTable(['set', 'number', 'Grookai name', 'finish', 'known index finishes', 'reason'], samples),
      '',
    ];
  });
  return [
    '# English Master Index Unsupported Triage V1',
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
    ...categorySections,
  ].join('\n');
}

function missingCategory(row) {
  const setKey = String(row.set_key ?? row.set_code ?? '').trim();
  const finish = String(row.finish_key ?? '').trim();
  const indexStatus = String(row.index_status ?? '').trim();
  const family = unsupportedSetFamily(setKey);
  const sourceCount = (row.index_sources ?? []).length;

  if (indexStatus === 'master_verified') {
    return {
      category: 'master_verified_missing',
      reason: 'The index has a master-verified printing fact that Grookai does not exactly match.',
      source_count: sourceCount,
    };
  }
  if (indexStatus === 'human_source_verified') {
    return {
      category: 'human_source_verified_missing',
      reason: 'The index has human-readable/checklist evidence, but not full master verification, and Grookai does not exactly match it.',
      source_count: sourceCount,
    };
  }
  if (finish.startsWith('first_edition')) {
    return {
      category: 'first_edition_policy_gap',
      reason: 'First edition printings require a separate legacy policy pass before any insertion or cleanup decision.',
      source_count: sourceCount,
    };
  }
  if (indexStatus === 'api_agreed') {
    return {
      category: 'api_agreed_missing_needs_human_source',
      reason: 'Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence.',
      source_count: sourceCount,
    };
  }
  if (family === 'promo_family') {
    return {
      category: 'promo_family_source_only_candidate',
      reason: 'Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path.',
      source_count: sourceCount,
    };
  }
  if (['deck_kit', 'mcdonalds', 'pop_series', 'early_promo_or_product'].includes(family)) {
    return {
      category: 'product_or_deck_set_source_only_candidate',
      reason: 'Product, deck, POP, McDonald\'s, or early promo missing row is source-only and needs dedicated checklist evidence.',
      source_count: sourceCount,
    };
  }
  if (['trainer_gallery_subset', 'subset_alias', 'subset_number_collision_family'].includes(family)) {
    return {
      category: 'subset_alias_or_numbering_gap',
      reason: 'Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path.',
      source_count: sourceCount,
    };
  }
  return {
    category: 'source_only_candidate_missing',
    reason: 'Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority.',
    source_count: sourceCount,
  };
}

function buildMissingFromGrookaiTriage(grookaiAudit, generatedAt) {
  const rows = grookaiAudit?.rows?.filter((row) => row.status === 'missing_from_grookai') ?? [];
  const categorizedRows = rows.map((row) => {
    const category = missingCategory(row);
    return {
      category: category.category,
      reason: category.reason,
      source_count: category.source_count,
      ...row,
    };
  });
  const rowsByCategory = Object.fromEntries(
    Object.entries(countBy(categorizedRows, (row) => row.category)).map(([category, count]) => {
      const categoryRows = categorizedRows.filter((row) => row.category === category);
      return [
        category,
        {
          count,
          by_set_key: countBy(categoryRows, (row) => row.set_key ?? row.set_code ?? 'unknown'),
          by_finish: countBy(categoryRows, (row) => row.finish_key ?? 'unknown'),
          by_index_status: countBy(categoryRows, (row) => row.index_status ?? 'unknown'),
          rows: categoryRows,
        },
      ];
    }),
  );
  return {
    version: 'ENGLISH_MASTER_INDEX_MISSING_FROM_GROOKAI_TRIAGE_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    source_report: 'english_master_index_grookai_audit_v1.json',
    rule: 'Missing-from-Grookai rows are not insertion authority. Only controlled per-set proof loops may create repair candidates.',
    summary: {
      total_missing_from_grookai: rows.length,
      by_category: countBy(categorizedRows, (row) => row.category),
      by_set_key: countBy(categorizedRows, (row) => row.set_key ?? row.set_code ?? 'unknown'),
      by_finish: countBy(categorizedRows, (row) => row.finish_key ?? 'unknown'),
      by_index_status: countBy(categorizedRows, (row) => row.index_status ?? 'unknown'),
      by_source_count: countBy(categorizedRows, (row) => String(row.source_count ?? 0)),
    },
    categories: rowsByCategory,
  };
}

function buildMissingFromGrookaiTriageMarkdown(payload) {
  const categoryRows = Object.entries(payload.summary.by_category).map(([category, count]) => [category, count]);
  const setRows = Object.entries(payload.summary.by_set_key).map(([setKey, count]) => [setKey, count]);
  const finishRows = Object.entries(payload.summary.by_finish).map(([finish, count]) => [finish, count]);
  const statusRows = Object.entries(payload.summary.by_index_status).map(([status, count]) => [status, count]);
  const sourceCountRows = Object.entries(payload.summary.by_source_count).map(([sourceCount, count]) => [sourceCount, count]);
  const categorySections = Object.entries(payload.categories).flatMap(([category, entry]) => {
    const topSets = Object.entries(entry.by_set_key)
      .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
      .slice(0, 20)
      .map(([setKey, count]) => [setKey, count]);
    const samples = entry.rows.slice(0, 50).map((row) => [
      row.set_key ?? row.set_code ?? '',
      row.card_number ?? '',
      row.index_card_name ?? '',
      row.finish_key ?? '',
      row.index_status ?? '',
      (row.index_sources ?? []).join(', '),
      row.reason ?? '',
    ]);
    return [
      `## ${category}`,
      '',
      `Rows: ${entry.count}`,
      '',
      '### Top Sets',
      '',
      markdownTable(['set_key', 'count'], topSets),
      '',
      '### Sample Rows',
      '',
      markdownTable(['set', 'number', 'Index name', 'finish', 'index status', 'sources', 'reason'], samples),
      '',
    ];
  });
  return [
    '# English Master Index Missing From Grookai Triage V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. No DB writes, migrations, inserts, cleanup, quarantine, or public hiding were performed.',
    '',
    payload.rule,
    '',
    '## Summary By Category',
    '',
    markdownTable(['category', 'count'], categoryRows),
    '',
    '## Summary By Index Status',
    '',
    markdownTable(['index_status', 'count'], statusRows),
    '',
    '## Summary By Source Count',
    '',
    markdownTable(['source_count', 'count'], sourceCountRows),
    '',
    '## Summary By Set',
    '',
    markdownTable(['set_key', 'count'], setRows),
    '',
    '## Summary By Finish',
    '',
    markdownTable(['finish', 'count'], finishRows),
    '',
    ...categorySections,
  ].join('\n');
}

function legacySetFamilyForCandidate(setCode) {
  const code = String(setCode ?? '').trim();
  return /^(base|gym|neo|ecard|ex|dp|pl|hgss|col)/.test(code);
}

function candidateUnconfirmedCategory(row) {
  const setCode = String(row.set_code ?? row.set_key ?? '').trim();
  const finish = String(row.finish_key ?? '').trim();
  const sourceCount = (row.index_sources ?? []).length;
  const family = unsupportedSetFamily(setCode);

  if (sourceCount !== 1) {
    return {
      category: 'needs_manual_review',
      reason: 'Candidate row did not have exactly one source even though it was classified as candidate_unconfirmed.',
      source_key: (row.index_sources ?? []).join(',') || 'none',
    };
  }
  if (family === 'promo_family') {
    return {
      category: 'promo_family_single_source',
      reason: 'Promo-family row matches the index from one source only and needs product/checklist evidence.',
      source_key: row.index_sources[0],
    };
  }
  if (['deck_kit', 'mcdonalds', 'pop_series', 'early_promo_or_product'].includes(family)) {
    return {
      category: 'product_or_deck_set_single_source',
      reason: 'Product, deck, POP, McDonald\'s, or early promo row matches from one source only and needs checklist evidence.',
      source_key: row.index_sources[0],
    };
  }
  if (['trainer_gallery_subset', 'subset_alias', 'subset_number_collision_family'].includes(family)) {
    return {
      category: 'subset_alias_single_source',
      reason: 'Subset, gallery, or number-collision row matches from one source only and needs set/subset verification.',
      source_key: row.index_sources[0],
    };
  }
  if (legacySetFamilyForCandidate(setCode)) {
    return {
      category: 'legacy_or_old_era_single_source',
      reason: 'Legacy or older-era row matches from one source only and needs checklist/source confirmation before governing truth.',
      source_key: row.index_sources[0],
    };
  }
  if (finish === 'reverse') {
    return {
      category: 'reverse_holo_single_source',
      reason: 'Reverse holo row matches from one source only and needs independent finish verification.',
      source_key: row.index_sources[0],
    };
  }
  if (finish === 'holo') {
    return {
      category: 'holo_single_source',
      reason: 'Holo row matches from one source only and needs independent finish verification.',
      source_key: row.index_sources[0],
    };
  }
  if (finish === 'normal') {
    return {
      category: 'normal_single_source',
      reason: 'Normal row matches from one source only and needs independent verification before promotion.',
      source_key: row.index_sources[0],
    };
  }
  return {
    category: 'needs_manual_review',
    reason: 'Single-source candidate has an unrecognized finish or set pattern.',
    source_key: row.index_sources[0],
  };
}

function buildCandidateUnconfirmedTriage(grookaiAudit, generatedAt) {
  const rows = grookaiAudit?.rows?.filter((row) => row.status === 'candidate_unconfirmed_by_index') ?? [];
  const categorizedRows = rows.map((row) => {
    const category = candidateUnconfirmedCategory(row);
    return {
      category: category.category,
      reason: category.reason,
      source_key: category.source_key,
      ...row,
    };
  });
  const rowsByCategory = Object.fromEntries(
    Object.entries(countBy(categorizedRows, (row) => row.category)).map(([category, count]) => {
      const categoryRows = categorizedRows.filter((row) => row.category === category);
      return [
        category,
        {
          count,
          by_source_key: countBy(categoryRows, (row) => row.source_key ?? 'unknown'),
          by_set_code: countBy(categoryRows, (row) => row.set_code ?? row.set_key ?? 'unknown'),
          by_finish: countBy(categoryRows, (row) => row.finish_key ?? 'unknown'),
          rows: categoryRows,
        },
      ];
    }),
  );
  return {
    version: 'ENGLISH_MASTER_INDEX_CANDIDATE_UNCONFIRMED_TRIAGE_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    source_report: 'english_master_index_grookai_audit_v1.json',
    rule: 'Candidate-unconfirmed rows match the current index from one source only. They are not cleanup authority, insertion authority, or master truth.',
    summary: {
      total_candidate_unconfirmed_by_index: rows.length,
      by_category: countBy(categorizedRows, (row) => row.category),
      by_source_key: countBy(categorizedRows, (row) => row.source_key ?? 'unknown'),
      by_source_and_finish: countBy(categorizedRows, (row) => `${row.source_key ?? 'unknown'}|${row.finish_key ?? 'unknown'}`),
      by_set_code: countBy(categorizedRows, (row) => row.set_code ?? row.set_key ?? 'unknown'),
      by_finish: countBy(categorizedRows, (row) => row.finish_key ?? 'unknown'),
    },
    categories: rowsByCategory,
  };
}

function buildCandidateUnconfirmedTriageMarkdown(payload) {
  const categoryRows = Object.entries(payload.summary.by_category).map(([category, count]) => [category, count]);
  const sourceRows = Object.entries(payload.summary.by_source_key).map(([source, count]) => [source, count]);
  const sourceFinishRows = Object.entries(payload.summary.by_source_and_finish).map(([key, count]) => {
    const [source, finish] = key.split('|');
    return [source, finish, count];
  });
  const setRows = Object.entries(payload.summary.by_set_code).map(([setCode, count]) => [setCode, count]);
  const finishRows = Object.entries(payload.summary.by_finish).map(([finish, count]) => [finish, count]);
  const categorySections = Object.entries(payload.categories).flatMap(([category, entry]) => {
    const topSets = Object.entries(entry.by_set_code)
      .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
      .slice(0, 20)
      .map(([setCode, count]) => [setCode, count]);
    const samples = entry.rows.slice(0, 50).map((row) => [
      row.source_key ?? '',
      row.set_code ?? row.set_key ?? '',
      row.card_number ?? '',
      row.grookai_card_name ?? row.index_card_name ?? '',
      row.finish_key ?? '',
      row.reason ?? '',
    ]);
    return [
      `## ${category}`,
      '',
      `Rows: ${entry.count}`,
      '',
      '### By Source',
      '',
      markdownTable(['source', 'count'], Object.entries(entry.by_source_key).map(([source, count]) => [source, count])),
      '',
      '### Top Sets',
      '',
      markdownTable(['set_code', 'count'], topSets),
      '',
      '### Sample Rows',
      '',
      markdownTable(['source', 'set', 'number', 'name', 'finish', 'reason'], samples),
      '',
    ];
  });
  return [
    '# English Master Index Candidate Unconfirmed Triage V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. No DB writes, migrations, inserts, cleanup, quarantine, or public hiding were performed.',
    '',
    payload.rule,
    '',
    '## Summary By Category',
    '',
    markdownTable(['category', 'count'], categoryRows),
    '',
    '## Summary By Source',
    '',
    markdownTable(['source', 'count'], sourceRows),
    '',
    '## Summary By Source And Finish',
    '',
    markdownTable(['source', 'finish', 'count'], sourceFinishRows),
    '',
    '## Summary By Set',
    '',
    markdownTable(['set_code', 'count'], setRows),
    '',
    '## Summary By Finish',
    '',
    markdownTable(['finish', 'count'], finishRows),
    '',
    ...categorySections,
  ].join('\n');
}

function apiAgreedCategory(row) {
  const setCode = String(row.set_code ?? row.set_key ?? '').trim();
  const finish = String(row.finish_key ?? '').trim();
  const sourceCount = (row.index_sources ?? []).length;
  const family = unsupportedSetFamily(setCode);

  if (sourceCount < 2) {
    return {
      category: 'needs_manual_review',
      reason: 'API-agreed row has fewer than two sources in the audit payload.',
      source_count: sourceCount,
    };
  }
  if (family === 'promo_family') {
    return {
      category: 'api_agreed_promo_family_needs_human_source',
      reason: 'Two APIs agree, but promo-family rows still need product/checklist evidence before master verification.',
      source_count: sourceCount,
    };
  }
  if (['deck_kit', 'mcdonalds', 'pop_series', 'early_promo_or_product'].includes(family)) {
    return {
      category: 'api_agreed_product_or_deck_needs_human_source',
      reason: 'Two APIs agree, but product, deck, POP, McDonald\'s, or early promo rows still need checklist evidence.',
      source_count: sourceCount,
    };
  }
  if (['trainer_gallery_subset', 'subset_alias', 'subset_number_collision_family'].includes(family)) {
    return {
      category: 'api_agreed_subset_alias_needs_human_source',
      reason: 'Two APIs agree, but subset/gallery/numbering facts still need set/subset verification.',
      source_count: sourceCount,
    };
  }
  if (legacySetFamilyForCandidate(setCode)) {
    return {
      category: 'api_agreed_legacy_or_old_era_needs_human_source',
      reason: 'Two APIs agree, but legacy/older-era rows need checklist evidence before governing printing truth.',
      source_count: sourceCount,
    };
  }
  if (finish === 'reverse') {
    return {
      category: 'api_agreed_reverse_holo_needs_human_source',
      reason: 'Two APIs agree on reverse holo, but finish truth still needs human-readable/checklist evidence.',
      source_count: sourceCount,
    };
  }
  if (finish === 'holo') {
    return {
      category: 'api_agreed_holo_needs_human_source',
      reason: 'Two APIs agree on holo, but finish truth still needs human-readable/checklist evidence.',
      source_count: sourceCount,
    };
  }
  if (finish === 'normal') {
    return {
      category: 'api_agreed_normal_needs_human_source',
      reason: 'Two APIs agree on normal finish, but this remains below master verification without human-readable/checklist evidence.',
      source_count: sourceCount,
    };
  }
  return {
    category: 'needs_manual_review',
    reason: 'API-agreed row has an unrecognized finish or set pattern.',
    source_count: sourceCount,
  };
}

function buildApiAgreedTriage(grookaiAudit, generatedAt) {
  const rows = grookaiAudit?.rows?.filter((row) => row.status === 'api_agreed_by_index') ?? [];
  const categorizedRows = rows.map((row) => {
    const category = apiAgreedCategory(row);
    return {
      category: category.category,
      reason: category.reason,
      source_count: category.source_count,
      ...row,
    };
  });
  const rowsByCategory = Object.fromEntries(
    Object.entries(countBy(categorizedRows, (row) => row.category)).map(([category, count]) => {
      const categoryRows = categorizedRows.filter((row) => row.category === category);
      return [
        category,
        {
          count,
          by_set_code: countBy(categoryRows, (row) => row.set_code ?? row.set_key ?? 'unknown'),
          by_finish: countBy(categoryRows, (row) => row.finish_key ?? 'unknown'),
          by_sources: countBy(categoryRows, (row) => (row.index_sources ?? []).join(',') || 'unknown'),
          rows: categoryRows,
        },
      ];
    }),
  );
  return {
    version: 'ENGLISH_MASTER_INDEX_API_AGREED_TRIAGE_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    source_report: 'english_master_index_grookai_audit_v1.json',
    rule: 'API-agreed rows have structured-source agreement only. They are not master truth, cleanup authority, insertion authority, or deletion authority without human-readable/checklist evidence.',
    summary: {
      total_api_agreed_by_index: rows.length,
      by_category: countBy(categorizedRows, (row) => row.category),
      by_set_code: countBy(categorizedRows, (row) => row.set_code ?? row.set_key ?? 'unknown'),
      by_finish: countBy(categorizedRows, (row) => row.finish_key ?? 'unknown'),
      by_sources: countBy(categorizedRows, (row) => (row.index_sources ?? []).join(',') || 'unknown'),
    },
    categories: rowsByCategory,
  };
}

function buildApiAgreedTriageMarkdown(payload) {
  const categoryRows = Object.entries(payload.summary.by_category).map(([category, count]) => [category, count]);
  const sourceRows = Object.entries(payload.summary.by_sources).map(([sources, count]) => [sources, count]);
  const setRows = Object.entries(payload.summary.by_set_code).map(([setCode, count]) => [setCode, count]);
  const finishRows = Object.entries(payload.summary.by_finish).map(([finish, count]) => [finish, count]);
  const categorySections = Object.entries(payload.categories).flatMap(([category, entry]) => {
    const topSets = Object.entries(entry.by_set_code)
      .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
      .slice(0, 20)
      .map(([setCode, count]) => [setCode, count]);
    const samples = entry.rows.slice(0, 50).map((row) => [
      row.set_code ?? row.set_key ?? '',
      row.card_number ?? '',
      row.grookai_card_name ?? row.index_card_name ?? '',
      row.finish_key ?? '',
      (row.index_sources ?? []).join(', '),
      row.reason ?? '',
    ]);
    return [
      `## ${category}`,
      '',
      `Rows: ${entry.count}`,
      '',
      '### Top Sets',
      '',
      markdownTable(['set_code', 'count'], topSets),
      '',
      '### Sample Rows',
      '',
      markdownTable(['set', 'number', 'name', 'finish', 'sources', 'reason'], samples),
      '',
    ];
  });
  return [
    '# English Master Index API Agreed Triage V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. No DB writes, migrations, inserts, cleanup, quarantine, or public hiding were performed.',
    '',
    payload.rule,
    '',
    '## Summary By Category',
    '',
    markdownTable(['category', 'count'], categoryRows),
    '',
    '## Summary By Sources',
    '',
    markdownTable(['sources', 'count'], sourceRows),
    '',
    '## Summary By Set',
    '',
    markdownTable(['set_code', 'count'], setRows),
    '',
    '## Summary By Finish',
    '',
    markdownTable(['finish', 'count'], finishRows),
    '',
    ...categorySections,
  ].join('\n');
}

async function writeJson(outputDir, fileName, data) {
  await fs.writeFile(path.join(outputDir, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

function evidenceUrlsForFact(row) {
  return uniqueSorted((row.evidence ?? []).map((evidence) => evidence.source_url));
}

function compactPrintingFact(row) {
  const { evidence, ...rest } = row;
  return {
    ...rest,
    evidence_count: Array.isArray(evidence) ? evidence.length : 0,
    evidence_urls: evidenceUrlsForFact(row),
  };
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
      suppressed_structured_finish_candidates: 'english_master_index_suppressed_structured_finish_candidates_v1.json',
    },
  };
}

function buildSuppressedStructuredFinishCandidatesMarkdown(payload) {
  const rows = payload.suppressed.slice(0, 500).map((row) => [
    row.set_key,
    row.set_name,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.source_key,
    row.supported_checklist_finishes_for_card.join(', '),
  ]);
  const bySet = Object.entries(countBy(payload.suppressed, (row) => row.set_key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);
  return [
    '# Suppressed Structured Finish Candidates V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    'These rows are single structured-source finish claims excluded from the working Master Index because exact human/checklist variant evidence exists for the same card and does not list that finish.',
    '',
    'This is not deletion authority for Grookai. It is a source-quality control report for Master Index construction.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'count'], [
      ['suppressed rows', payload.suppressed.length],
    ]),
    '',
    '## By Set',
    '',
    markdownTable(['set_key', 'count'], bySet),
    '',
    '## Sample Rows',
    '',
    markdownTable(['set_key', 'set_name', 'card_number', 'card_name', 'suppressed_finish', 'source', 'checklist_finishes'], rows),
    '',
  ].join('\n');
}

async function writeReports({ outputDir, index, agreement, setAudit, grookaiAudit, generatedAt }) {
  await fs.mkdir(outputDir, { recursive: true });
  const setUnmappedTriage = buildSetUnmappedTriage(grookaiAudit, generatedAt);
  const nameMismatchTriage = buildNameMismatchTriage(grookaiAudit, generatedAt);
  const unsupportedTriage = buildUnsupportedTriage(grookaiAudit, generatedAt);
  const missingFromGrookaiTriage = buildMissingFromGrookaiTriage(grookaiAudit, generatedAt);
  const candidateUnconfirmedTriage = buildCandidateUnconfirmedTriage(grookaiAudit, generatedAt);
  const apiAgreedTriage = buildApiAgreedTriage(grookaiAudit, generatedAt);
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
    evidence_storage: 'compact_evidence_urls_only',
    printings: index.printings.map(compactPrintingFact),
    finish_absences: index.finish_absences.map(compactPrintingFact),
  });
  await writeJson(outputDir, 'english_master_index_manual_review_v1.json', {
    version: 'ENGLISH_MASTER_INDEX_MANUAL_REVIEW_V1',
    generated_at: index.generated_at,
    audit_only: true,
    db_writes: false,
    manual_review: index.manual_review,
  });
  const suppressedStructuredFinishCandidates = {
    version: 'ENGLISH_MASTER_INDEX_SUPPRESSED_STRUCTURED_FINISH_CANDIDATES_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    rule: 'Single structured-source finish claims are excluded when exact human/checklist variant evidence exists for the same card and does not list that finish.',
    suppressed: index.structured_suppression?.suppressed ?? [],
  };
  await writeJson(outputDir, 'english_master_index_suppressed_structured_finish_candidates_v1.json', suppressedStructuredFinishCandidates);
  await fs.writeFile(
    path.join(outputDir, 'english_master_index_suppressed_structured_finish_candidates_v1.md'),
    buildSuppressedStructuredFinishCandidatesMarkdown(suppressedStructuredFinishCandidates),
  );
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
  await writeJson(outputDir, 'english_master_index_unsupported_triage_v1.json', unsupportedTriage);
  await fs.writeFile(path.join(outputDir, 'english_master_index_unsupported_triage_v1.md'), buildUnsupportedTriageMarkdown(unsupportedTriage));
  await writeJson(outputDir, 'english_master_index_missing_from_grookai_triage_v1.json', missingFromGrookaiTriage);
  await fs.writeFile(path.join(outputDir, 'english_master_index_missing_from_grookai_triage_v1.md'), buildMissingFromGrookaiTriageMarkdown(missingFromGrookaiTriage));
  await writeJson(outputDir, 'english_master_index_candidate_unconfirmed_triage_v1.json', candidateUnconfirmedTriage);
  await fs.writeFile(path.join(outputDir, 'english_master_index_candidate_unconfirmed_triage_v1.md'), buildCandidateUnconfirmedTriageMarkdown(candidateUnconfirmedTriage));
  await writeJson(outputDir, 'english_master_index_api_agreed_triage_v1.json', apiAgreedTriage);
  await fs.writeFile(path.join(outputDir, 'english_master_index_api_agreed_triage_v1.md'), buildApiAgreedTriageMarkdown(apiAgreedTriage));
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
  let records = collected.flatMap((entry) => entry.rows);
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
  const preSuppressionCount = records.length;
  const structuredSuppression = suppressStructuredOnlyFinishCandidates(records, generatedAt);
  records = structuredSuppression.records;
  console.log(`[master-index] collected ${preSuppressionCount} evidence rows`);
  console.log(`[master-index] suppressed ${structuredSuppression.suppressed.length} structured-only finish candidates unsupported by exact checklist variants`);

  const classified = classifyEvidence(records);
  const index = indexPayload({ records, classified, setConfigs, sourceAvailability, generatedAt, structuredSuppression });
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
