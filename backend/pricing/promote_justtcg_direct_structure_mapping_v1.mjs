import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  getJustTcgApiConfig,
  requestJustTcgJson,
  uniqueValues,
} from './justtcg_client.mjs';

const TARGET_SOURCE = 'justtcg';
const FETCH_PAGE_SIZE = 500;
const POKEMON_GAME_ID = 'pokemon';
const DB_RETRY_DELAYS_MS = [250, 750, 1500];
const DB_IN_FILTER_CHUNK_SIZE = 150;
const DEFAULT_CONSOLE_ROW_LOG_LIMIT = 60;

if (typeof fetch !== 'function') {
  console.error('❌ Global fetch unavailable; use Node 18+');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: true,
    apply: false,
    limit: null,
    verbose: false,
    setCode: null,
    gvId: null,
    cardPrintId: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--dry-run') {
      options.dryRun = true;
      options.apply = false;
    } else if (token === '--apply') {
      options.apply = true;
      options.dryRun = false;
    } else if (token === '--limit' && args[index + 1]) {
      const value = Number(args[index + 1]);
      if (!Number.isNaN(value) && value > 0) {
        options.limit = value;
      }
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const value = Number(token.split('=')[1]);
      if (!Number.isNaN(value) && value > 0) {
        options.limit = value;
      }
    } else if (token === '--set-code' && args[index + 1]) {
      options.setCode = normalize(args[index + 1]).toLowerCase() || null;
      index += 1;
    } else if (token.startsWith('--set-code=')) {
      options.setCode = normalize(token.split('=').slice(1).join('=')).toLowerCase() || null;
    } else if (token === '--gv-id' && args[index + 1]) {
      options.gvId = normalize(args[index + 1]).toUpperCase() || null;
      index += 1;
    } else if (token.startsWith('--gv-id=')) {
      options.gvId = normalize(token.split('=').slice(1).join('=')).toUpperCase() || null;
    } else if (token === '--card-print-id' && args[index + 1]) {
      options.cardPrintId = normalize(args[index + 1]).toLowerCase() || null;
      index += 1;
    } else if (token.startsWith('--card-print-id=')) {
      options.cardPrintId = normalize(token.split('=').slice(1).join('=')).toLowerCase() || null;
    } else if (token === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function chunkItems(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normText(value) {
  return normalize(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function canonicalizeSetName(value) {
  return normText(normalize(value).replace(/^[A-Z0-9.]{1,10}\s*(?::|-+)\s*/u, ''));
}

function normalizeNumberToken(value) {
  const trimmed = normalize(value).toUpperCase();
  if (!trimmed) {
    return null;
  }

  const letterOrSymbolSlash = trimmed.match(/^([A-Z]|!|\?)\s*\/\s*(\d+)$/);
  if (letterOrSymbolSlash) {
    const [, token] = letterOrSymbolSlash;
    return token;
  }

  const slash = trimmed.match(/^([A-Z]{0,6})(\d+)\s*\/\s*(\d+)$/);
  if (slash) {
    const [, prefix, number] = slash;
    return `${prefix}${String(Number.parseInt(number, 10))}`;
  }

  const plain = trimmed.match(/^([A-Z]{0,6})(\d+)$/);
  if (plain) {
    const [, prefix, number] = plain;
    return `${prefix}${String(Number.parseInt(number, 10))}`;
  }

  return trimmed.replace(/\s+/g, '');
}

function normalizeCardName(value) {
  return normText(
    normalize(value)
      .replace(/\s+-\s+[A-Z0-9]+\/[A-Z0-9]+$/i, '')
      .replace(/\s+-\s+[A-Z0-9]+$/i, '')
      .replace(/\s*\(([A-Z]|!|\?)\)$/i, ''),
  );
}

function hasDeltaSpeciesMarker(value) {
  const raw = normalize(value);
  if (!raw) {
    return false;
  }

  return /(?:δ|\(\s*delta species\s*\)|\bdelta species\b)/iu.test(raw);
}

function normalizeNameV2(name) {
  if (!name) {
    return '';
  }

  return normalize(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(delta species\)/g, '')
    .replace(/δ/g, '')
    .replace(/★/g, '')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\b/g, '')
    .replace(/\bdelta species\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRarity(value) {
  return Array.from(new Set(normText(value).split(' ').filter(Boolean))).sort().join(' ');
}

function buildNumberQueryVariants(value) {
  const variants = [];
  const seen = new Set();

  function addVariant(queryValue, label) {
    const normalizedValue = normalize(queryValue).toUpperCase();
    if (!normalizedValue || seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    variants.push({
      value: normalizedValue,
      label,
    });
  }

  const raw = normalize(value).toUpperCase();
  addVariant(raw, 'raw');

  if (/^[A-Z]$/.test(raw)) {
    addVariant(`${raw}/28`, 'letter_slash_28');
  }

  if (raw === '!') {
    addVariant('!/28', 'symbol_bang_slash_28');
  }

  if (raw === '?') {
    addVariant('?/28', 'symbol_qmark_slash_28');
  }

  const prefixedShortCode = raw.match(/^([A-Z]{1,8})(\d{1,2})$/);
  if (prefixedShortCode) {
    const [, prefix, digits] = prefixedShortCode;
    addVariant(`${prefix}${digits.padStart(3, '0')}`, 'prefix_padded_3');
  }

  return variants;
}

function unwrapData(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (data) {
    return [data];
  }

  return [];
}

async function withRetries(fn, label) {
  let lastError = null;

  for (let attempt = 0; attempt <= DB_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= DB_RETRY_DELAYS_MS.length) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAYS_MS[attempt]));
    }
  }

  throw new Error(
    `[justtcg-direct-structure] ${label} failed after retries: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

async function fetchCardPrintPage(supabase, offset, pageSize, options) {
  return withRetries(async () => {
    let query = supabase
      .from('card_prints')
      .select('id,gv_id,name,number,number_plain,set_id,set_code,variant_key,rarity,sets(name)')
      .order('set_code', { ascending: true, nullsFirst: false })
      .order('number_plain', { ascending: true, nullsFirst: false })
      .order('number', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true });

    if (options.setCode) {
      query = query.eq('set_code', options.setCode);
    }

    if (options.gvId) {
      query = query.eq('gv_id', options.gvId);
    }

    if (options.cardPrintId) {
      query = query.eq('id', options.cardPrintId);
    }

    const { data, error } = await query.range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }, 'card_print page query');
}

async function fetchAllActiveJustTcgMappedCardPrintIds(supabase) {
  const mapped = new Set();
  let offset = 0;

  while (true) {
    const rows = await withRetries(async () => {
      const { data, error } = await supabase
        .from('external_mappings')
        .select('card_print_id')
        .eq('source', TARGET_SOURCE)
        .eq('active', true)
        .order('card_print_id', { ascending: true })
        .range(offset, offset + FETCH_PAGE_SIZE - 1);

      if (error) {
        throw new Error(error.message);
      }

      return data ?? [];
    }, 'active justtcg mapping scan');

    for (const row of rows) {
      if (row.card_print_id) {
        mapped.add(row.card_print_id);
      }
    }

    if (rows.length < FETCH_PAGE_SIZE) {
      break;
    }

    offset += rows.length;
  }

  return mapped;
}

function rowMatchesScope(row, options) {
  if (options.setCode && normalize(row.set_code ?? '').toLowerCase() !== options.setCode) {
    return false;
  }

  if (options.gvId && normalize(row.gv_id ?? '').toUpperCase() !== options.gvId) {
    return false;
  }

  if (options.cardPrintId && normalize(row.id ?? '').toLowerCase() !== options.cardPrintId) {
    return false;
  }

  return true;
}

async function loadScopedCards(supabase, options) {
  const scoped = [];
  const activeJustTcgMappedIds = await fetchAllActiveJustTcgMappedCardPrintIds(supabase);
  let offset = 0;

  while (true) {
    const rows = await fetchCardPrintPage(supabase, offset, FETCH_PAGE_SIZE, options);
    if (rows.length === 0) {
      break;
    }

    offset += rows.length;

    for (const row of rows) {
      if (!row.id || activeJustTcgMappedIds.has(row.id) || !rowMatchesScope(row, options)) {
        continue;
      }

      scoped.push({
        cardPrintId: row.id,
        gvId: row.gv_id ?? null,
        name: row.name ?? '',
        number: row.number ?? null,
        numberPlain: row.number_plain ?? null,
        setId: row.set_id ?? null,
        setCode: row.set_code ?? null,
        setName: row.sets?.name ?? null,
        variantKey: row.variant_key ?? null,
        rarity: row.rarity ?? null,
      });
    }

    if (rows.length < FETCH_PAGE_SIZE) {
      break;
    }
  }

  return scoped;
}

function computeRowPriority(row, alignment, override) {
  if (override?.card_print_id) {
    return 0;
  }

  if (alignment?.justTcgSet?.id && alignment.fromManualHelper) {
    return 1;
  }

  if (alignment?.justTcgSet?.id) {
    return 2;
  }

  return 3;
}

function compareScopedRows(left, right) {
  return (
    normalize(left.setCode).localeCompare(normalize(right.setCode)) ||
    normalize(left.numberPlain).localeCompare(normalize(right.numberPlain)) ||
    normalize(left.number).localeCompare(normalize(right.number)) ||
    left.cardPrintId.localeCompare(right.cardPrintId)
  );
}

async function loadActiveSetMappings(supabase, setIds) {
  if (!Array.isArray(setIds) || setIds.length === 0) {
    return new Map();
  }

  const data = [];
  for (const setIdChunk of chunkItems(setIds, DB_IN_FILTER_CHUNK_SIZE)) {
    const rows = await withRetries(async () => {
      const { data: chunkRows, error } = await supabase
        .from('justtcg_set_mappings')
        .select('grookai_set_id,justtcg_set_id,justtcg_set_name,alignment_status,match_method,notes,active')
        .eq('active', true)
        .in('grookai_set_id', setIdChunk);

      if (error) {
        throw new Error(error.message);
      }

      return chunkRows ?? [];
    }, 'set mapping query');

    data.push(...rows);
  }

  return new Map(data.map((row) => [row.grookai_set_id, row]));
}

async function loadActiveIdentityOverrides(supabase, cardPrintIds) {
  if (!Array.isArray(cardPrintIds) || cardPrintIds.length === 0) {
    return new Map();
  }

  const data = [];
  for (const cardPrintIdChunk of chunkItems(cardPrintIds, DB_IN_FILTER_CHUNK_SIZE)) {
    const rows = await withRetries(async () => {
      const { data: chunkRows, error } = await supabase
        .from('justtcg_identity_overrides')
        .select('card_print_id,justtcg_set_id,justtcg_number,justtcg_name,justtcg_rarity,reason,notes,active')
        .eq('active', true)
        .in('card_print_id', cardPrintIdChunk);

      if (error) {
        throw new Error(error.message);
      }

      return chunkRows ?? [];
    }, 'identity override query');

    data.push(...rows);
  }

  return new Map(data.map((row) => [row.card_print_id, row]));
}

async function loadActiveJustTcgMappingsForCard(supabase, cardPrintId) {
  const data = await withRetries(async () => {
    const { data: rows, error } = await supabase
      .from('external_mappings')
      .select('card_print_id,external_id,active')
      .eq('source', TARGET_SOURCE)
      .eq('card_print_id', cardPrintId)
      .eq('active', true);

    if (error) {
      throw new Error(error.message);
    }

    return rows ?? [];
  }, 'active justtcg mapping query');

  return data;
}

async function loadAnyJustTcgMappingsByExternalId(supabase, externalId) {
  const data = await withRetries(async () => {
    const { data: rows, error } = await supabase
      .from('external_mappings')
      .select('card_print_id,external_id,active')
      .eq('source', TARGET_SOURCE)
      .eq('external_id', externalId);

    if (error) {
      throw new Error(error.message);
    }

    return rows ?? [];
  }, 'justtcg external id query');

  return data;
}

async function upsertJustTcgMapping(supabase, cardPrintId, externalId, meta) {
  await withRetries(async () => {
    const { error } = await supabase
      .from('external_mappings')
      .upsert(
        {
          card_print_id: cardPrintId,
          source: TARGET_SOURCE,
          external_id: externalId,
          active: true,
          synced_at: new Date().toISOString(),
          meta,
        },
        { onConflict: 'source,external_id' },
      );

    if (error) {
      throw new Error(error.message);
    }
  }, 'mapping upsert');
}

async function upsertAutoSetMapping(supabase, row, alignment) {
  await withRetries(async () => {
    const { error } = await supabase
      .from('justtcg_set_mappings')
      .upsert(
        {
          grookai_set_id: row.setId,
          justtcg_set_id: alignment.justTcgSet.id,
          justtcg_set_name: alignment.justTcgSet.name ?? null,
          alignment_status: 'exact_aligned',
          match_method: alignment.matchMethod,
          notes: {
            promoted_by: 'promote_justtcg_direct_structure_mapping_v1',
            auto_aligned: true,
            grookai_set_code: row.setCode,
            grookai_set_name: row.setName,
          },
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'grookai_set_id' },
      );

    if (error) {
      throw new Error(error.message);
    }
  }, 'auto set mapping upsert');
}

function logResult(row) {
  console.log('\nROW:');
  console.log(`card_print_id: ${row.cardPrintId}`);
  console.log(`gv_id: ${row.gvId ?? 'null'}`);
  console.log(`name: ${row.name}`);
  console.log(`set_code: ${row.setCode ?? 'null'}`);
  console.log(`set_name: ${row.setName ?? 'null'}`);
  console.log(`number: ${row.number ?? 'null'}`);
  console.log(`alignment_status: ${row.alignmentStatus ?? 'null'}`);
  console.log(`justtcg_set_id: ${row.justTcgSetId ?? 'null'}`);
  if (row.justTcgQueryNumber) {
    console.log(`justtcg_query_number: ${row.justTcgQueryNumber}`);
  }
  console.log(`returned justtcg card id: ${row.justTcgCardId ?? 'null'}`);
  console.log(`status: ${row.status}`);
  console.log(`reason: ${row.reason}`);
}

function printVerificationQueries() {
  console.log('\nVERIFICATION_SQL:');
  console.log("select count(*) as active_justtcg_rows from public.external_mappings where source = 'justtcg' and active = true;");
  console.log("select count(distinct card_print_id) as covered_card_prints from public.external_mappings where source = 'justtcg' and active = true;");
  console.log("select count(*) as conflicting_external_ids from (select external_id from public.external_mappings where source = 'justtcg' and active = true group by external_id having count(distinct card_print_id) > 1) s;");
  console.log("select count(*) as card_prints_with_multiple_active_justtcg_mappings from (select card_print_id from public.external_mappings where source = 'justtcg' and active = true group by card_print_id having count(*) > 1) s;");
  console.log("select count(*) as helper_set_rows from public.justtcg_set_mappings where active = true;");
  console.log("select count(*) as helper_identity_override_rows from public.justtcg_identity_overrides where active = true;");
}

async function fetchJustTcgPokemonSets() {
  const response = await requestJustTcgJson('GET', '/sets', {
    params: new URLSearchParams({ game: POKEMON_GAME_ID }),
  });

  if (!response.ok) {
    throw new Error(`JustTCG /sets failed: ${response.error}`);
  }

  return unwrapData(response.payload);
}

function findAutoExactSetAlignment(justTcgSets, grookaiSetName) {
  const raw = normText(grookaiSetName);
  const canonical = canonicalizeSetName(grookaiSetName);

  const exactRaw = justTcgSets.filter((set) => normText(set.name) === raw);
  if (exactRaw.length === 1) {
    return {
      status: 'exact_aligned',
      matchMethod: 'exact_raw_name',
      justTcgSet: exactRaw[0],
    };
  }

  const exactCanonical = justTcgSets.filter((set) => canonicalizeSetName(set.name) === canonical);
  if (exactCanonical.length === 1) {
    return {
      status: 'exact_aligned',
      matchMethod: 'canonical_name',
      justTcgSet: exactCanonical[0],
    };
  }

  return null;
}

function resolveSetAlignment(row, manualSetMappings, justTcgSets) {
  const manual = row.setId ? manualSetMappings.get(row.setId) ?? null : null;
  if (manual?.justtcg_set_id) {
    return {
      status: manual.alignment_status ?? 'manual_helper_override',
      matchMethod: manual.match_method ?? 'manual_helper_override',
      justTcgSet: {
        id: manual.justtcg_set_id,
        name: manual.justtcg_set_name ?? null,
      },
      fromManualHelper: true,
    };
  }

  if (!row.setName) {
    return null;
  }

  const auto = findAutoExactSetAlignment(justTcgSets, row.setName);
  if (!auto) {
    return null;
  }

  return {
    ...auto,
    fromManualHelper: false,
  };
}

async function fetchCardsBySetAndNumber(justTcgSetId, queryNumber) {
  const response = await requestJustTcgJson('GET', '/cards', {
    params: new URLSearchParams({
      game: POKEMON_GAME_ID,
      set: justTcgSetId,
      number: queryNumber,
      include_null_prices: 'true',
      include_price_history: 'false',
      include_statistics: '7d',
    }),
  });

  if (!response.ok) {
    throw new Error(`JustTCG /cards set+number lookup failed: ${response.error}`);
  }

  return {
    cards: unwrapData(response.payload),
    meta: response.payload?.meta ?? null,
  };
}

async function fetchCardsBySetAndExactNumberVariants(justTcgSetId, queryNumber) {
  const variants = buildNumberQueryVariants(queryNumber);
  let lastResult = {
    cards: [],
    meta: null,
    queryNumberUsed: normalize(queryNumber).toUpperCase(),
    queryVariantUsed: 'raw',
    queryVariantsTried: variants.map((variant) => variant.value),
  };

  for (const variant of variants) {
    const result = await fetchCardsBySetAndNumber(justTcgSetId, variant.value);
    lastResult = {
      ...result,
      queryNumberUsed: variant.value,
      queryVariantUsed: variant.label,
      queryVariantsTried: variants.map((entry) => entry.value),
    };

    if (result.cards.length > 0) {
      return lastResult;
    }
  }

  return lastResult;
}

function resolveCardCandidate(row, alignment, override, cards) {
  const targetName = normalizeCardName(override?.justtcg_name ?? row.name);
  const targetNumber = normalizeNumberToken(override?.justtcg_number ?? row.number ?? row.numberPlain);
  const targetRarity = normalizeRarity(override?.justtcg_rarity ?? row.rarity);

  if (!targetNumber) {
    return {
      status: 'ambiguous',
      card: null,
      matchType: null,
      reason: 'No usable printed number was available for deterministic JustTCG matching.',
    };
  }

  const sameNumber = cards.filter((card) => normalizeNumberToken(card.number) === targetNumber);
  if (sameNumber.length === 0) {
    return {
      status: 'no_candidate_rows',
      card: null,
      matchType: null,
      reason: 'JustTCG returned no candidate rows for the aligned set + printed number.',
    };
  }

  const exactName = sameNumber.filter((card) => normalizeCardName(card.name) === targetName);
  const deltaSpeciesAware =
    hasDeltaSpeciesMarker(override?.justtcg_name ?? row.name) ||
    sameNumber.some((card) => hasDeltaSpeciesMarker(card.name));
  const deltaSpeciesNameMatches =
    exactName.length === 0 && deltaSpeciesAware
      ? sameNumber.filter(
          (card) =>
            normalizeNameV2(card.name) === normalizeNameV2(override?.justtcg_name ?? row.name),
        )
      : [];
  let resolved = null;

  if (exactName.length === 1) {
    resolved = exactName[0];
  } else if (deltaSpeciesNameMatches.length === 1) {
    resolved = deltaSpeciesNameMatches[0];
  } else if (exactName.length > 1) {
    const rarityMatches = exactName.filter(
      (card) => targetRarity && normalizeRarity(card.rarity) === targetRarity,
    );
    if (rarityMatches.length === 1) {
      resolved = rarityMatches[0];
    }
  } else if (deltaSpeciesNameMatches.length > 1) {
    const rarityMatches = deltaSpeciesNameMatches.filter(
      (card) => targetRarity && normalizeRarity(card.rarity) === targetRarity,
    );
    if (rarityMatches.length === 1) {
      resolved = rarityMatches[0];
    }
  }

  if (!resolved) {
    return {
      status: 'ambiguous',
      card: null,
      matchType: null,
      reason: 'Aligned set + printed number did not yield a unique exact name match.',
    };
  }

  return {
    status: 'matched',
    card: resolved,
    matchType: override ? 'override_match' : 'exact_match',
    reason: override
      ? 'Matched deterministically using aligned set + override-assisted identity.'
      : 'Matched deterministically using aligned set + exact printed identity.',
  };
}

async function main() {
  const options = parseArgs();
  const { apiKey } = getJustTcgApiConfig();
  if (!apiKey) {
    console.error('❌ Missing JUSTTCG_API_KEY in env');
    process.exit(1);
  }

  const supabase = createBackendClient();
  const summary = {
    inspected: 0,
    aligned_set_ready: 0,
    no_set_alignment: 0,
    no_candidate_rows: 0,
    exact_match: 0,
    override_match: 0,
    ambiguous: 0,
    conflicting_existing: 0,
    already_correct: 0,
    would_upsert: 0,
    upserted: 0,
    errors: 0,
  };

  console.log('RUN_CONFIG:');
  console.log(`mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log('selection_mode: unmapped-justtcg-direct-structure');
  console.log('selection_priority: override -> manual_helper_set -> auto_exact_alignment -> unresolved');
  console.log('selection_order: set_code asc, number_plain asc, number asc, card_print_id asc');
  console.log(`scope_set_code: ${options.setCode ?? 'none'}`);
  console.log(`scope_gv_id: ${options.gvId ?? 'none'}`);
  console.log(`scope_card_print_id: ${options.cardPrintId ?? 'none'}`);
  console.log(`limit: ${options.limit ?? 'none'}`);
  console.log(`verbose: ${options.verbose ? 'true' : 'false'}`);

  const allUnmappedRows = await loadScopedCards(supabase, options);
  const [manualSetMappings, justTcgSets] = await Promise.all([
    loadActiveSetMappings(supabase, uniqueValues(allUnmappedRows.map((row) => row.setId))),
    fetchJustTcgPokemonSets(),
  ]);
  const identityOverrides = await loadActiveIdentityOverrides(
    supabase,
    uniqueValues(allUnmappedRows.map((row) => row.cardPrintId)),
  );

  const scopedRows = allUnmappedRows
    .map((row) => ({
      row,
      alignment: resolveSetAlignment(row, manualSetMappings, justTcgSets),
      override: identityOverrides.get(row.cardPrintId) ?? null,
    }))
    .sort((left, right) => {
      const priorityDelta =
        computeRowPriority(left.row, left.alignment, left.override) -
        computeRowPriority(right.row, right.alignment, right.override);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return compareScopedRows(left.row, right.row);
    })
    .map((entry) => entry.row);

  const limitedRows = options.limit == null ? scopedRows : scopedRows.slice(0, options.limit);

  const cardsBySetAndNumber = new Map();
  let consoleRowLogs = 0;
  let suppressedRowLogs = 0;

  function maybeLogRow(payload) {
    if (options.verbose || consoleRowLogs < DEFAULT_CONSOLE_ROW_LOG_LIMIT) {
      logResult(payload);
      consoleRowLogs += 1;
      return;
    }

    suppressedRowLogs += 1;
  }

  for (const row of limitedRows) {
    summary.inspected += 1;

    try {
      const override = identityOverrides.get(row.cardPrintId) ?? null;
      const alignment = resolveSetAlignment(row, manualSetMappings, justTcgSets);
      if (!alignment?.justTcgSet?.id) {
        summary.no_set_alignment += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: 'no_set_alignment',
          justTcgSetId: null,
          justTcgCardId: null,
          status: 'SKIP_NO_SET_ALIGNMENT',
          reason: 'No exact JustTCG set alignment or active helper set mapping exists for this Grookai set.',
        });
        continue;
      }

      summary.aligned_set_ready += 1;

      const queryNumber = normalize(override?.justtcg_number ?? row.number ?? row.numberPlain);
      if (!queryNumber) {
        summary.ambiguous += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: alignment.status,
          justTcgSetId: alignment.justTcgSet.id,
          justTcgCardId: null,
          status: 'SKIP_AMBIGUOUS',
          reason: 'No usable printed number was available for deterministic JustTCG matching.',
        });
        continue;
      }

      const queryVariants = buildNumberQueryVariants(queryNumber);
      const cacheKey = `${alignment.justTcgSet.id}|${queryVariants.map((variant) => variant.value).join('|')}`;
      let cached = cardsBySetAndNumber.get(cacheKey);
      if (!cached) {
        cached = await fetchCardsBySetAndExactNumberVariants(alignment.justTcgSet.id, queryNumber);
        cardsBySetAndNumber.set(cacheKey, cached);
      }

      const resolution = resolveCardCandidate(row, alignment, override, cached.cards);
      if (resolution.status === 'no_candidate_rows') {
        summary.no_candidate_rows += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: alignment.status,
          justTcgSetId: alignment.justTcgSet.id,
          justTcgQueryNumber: cached.queryNumberUsed,
          justTcgCardId: null,
          status: 'SKIP_NO_CANDIDATE_ROWS',
          reason: resolution.reason,
        });
        continue;
      }

      if (resolution.status !== 'matched' || !resolution.card) {
        summary.ambiguous += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: alignment.status,
          justTcgSetId: alignment.justTcgSet.id,
          justTcgQueryNumber: cached.queryNumberUsed,
          justTcgCardId: null,
          status: 'SKIP_AMBIGUOUS',
          reason: resolution.reason,
        });
        continue;
      }

      if (resolution.matchType === 'override_match') {
        summary.override_match += 1;
      } else {
        summary.exact_match += 1;
      }

      const justTcgCardId = normalize(resolution.card.id);
      if (!justTcgCardId) {
        summary.errors += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: alignment.status,
          justTcgSetId: alignment.justTcgSet.id,
          justTcgQueryNumber: cached.queryNumberUsed,
          justTcgCardId: null,
          status: 'SKIP_ERROR',
          reason: 'JustTCG returned a matched row without a usable card id.',
        });
        continue;
      }

      const activeJustTcgMappings = await loadActiveJustTcgMappingsForCard(supabase, row.cardPrintId);
      const activeJustTcgExternalIds = uniqueValues(activeJustTcgMappings.map((mapping) => mapping.external_id));
      if (activeJustTcgExternalIds.some((externalId) => externalId !== justTcgCardId)) {
        summary.conflicting_existing += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: alignment.status,
          justTcgSetId: alignment.justTcgSet.id,
          justTcgQueryNumber: cached.queryNumberUsed,
          justTcgCardId,
          status: 'SKIP_CONFLICTING_EXISTING_JUSTTCG_MAPPING',
          reason: `Active justtcg mapping already exists for this card_print_id with a different external_id (${activeJustTcgExternalIds.join(', ')}).`,
        });
        continue;
      }

      if (activeJustTcgExternalIds.length === 1 && activeJustTcgExternalIds[0] === justTcgCardId) {
        summary.already_correct += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: alignment.status,
          justTcgSetId: alignment.justTcgSet.id,
          justTcgQueryNumber: cached.queryNumberUsed,
          justTcgCardId,
          status: 'SKIP_ALREADY_CORRECT',
          reason: 'Active justtcg mapping already matches the resolved JustTCG card id.',
        });
        continue;
      }

      const existingRowsByExternalId = await loadAnyJustTcgMappingsByExternalId(supabase, justTcgCardId);
      const conflictingExternalRows = existingRowsByExternalId.filter(
        (mapping) => mapping.card_print_id && mapping.card_print_id !== row.cardPrintId,
      );
      if (conflictingExternalRows.length > 0) {
        summary.conflicting_existing += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: alignment.status,
          justTcgSetId: alignment.justTcgSet.id,
          justTcgQueryNumber: cached.queryNumberUsed,
          justTcgCardId,
          status: 'SKIP_CONFLICTING_EXISTING_JUSTTCG_EXTERNAL_ID',
          reason: `Validated justtcg external_id ${justTcgCardId} is already attached to a different card_print_id (${conflictingExternalRows.map((mapping) => mapping.card_print_id).join(', ')}).`,
        });
        continue;
      }

      const meta = {
        promoted_by: 'promote_justtcg_direct_structure_mapping_v1',
        resolved_via:
          resolution.matchType === 'override_match'
            ? 'justtcg_direct_structure_override'
            : 'justtcg_direct_structure_exact',
        justtcg_set_id: alignment.justTcgSet.id,
        justtcg_set_name: alignment.justTcgSet.name ?? null,
        justtcg_number: resolution.card.number ?? null,
        justtcg_name: resolution.card.name ?? null,
        justtcg_rarity: resolution.card.rarity ?? null,
        justtcg_query_number_used: cached.queryNumberUsed,
        justtcg_query_variant_used: cached.queryVariantUsed,
        justtcg_query_variants_tried: cached.queryVariantsTried,
        set_alignment_status: alignment.status,
        set_alignment_method: alignment.matchMethod,
        override_reason: override?.reason ?? null,
      };

      if (!options.apply) {
        summary.would_upsert += 1;
        maybeLogRow({
          ...row,
          alignmentStatus: alignment.status,
          justTcgSetId: alignment.justTcgSet.id,
          justTcgQueryNumber: cached.queryNumberUsed,
          justTcgCardId,
          status:
            resolution.matchType === 'override_match'
              ? 'WOULD_UPSERT_OVERRIDE_MATCH'
              : 'WOULD_UPSERT_EXACT_MATCH',
          reason: resolution.reason,
        });
        continue;
      }

      if (!alignment.fromManualHelper && row.setId) {
        await upsertAutoSetMapping(supabase, row, alignment);
      }

      await upsertJustTcgMapping(supabase, row.cardPrintId, justTcgCardId, meta);
      summary.upserted += 1;
      maybeLogRow({
        ...row,
        alignmentStatus: alignment.status,
        justTcgSetId: alignment.justTcgSet.id,
        justTcgQueryNumber: cached.queryNumberUsed,
        justTcgCardId,
        status:
          resolution.matchType === 'override_match'
            ? 'UPSERTED_OVERRIDE_MATCH'
            : 'UPSERTED_EXACT_MATCH',
        reason: resolution.reason,
      });
    } catch (error) {
      summary.errors += 1;
      maybeLogRow({
        ...row,
        alignmentStatus: 'error',
        justTcgSetId: null,
        justTcgCardId: null,
        status: 'SKIP_ERROR',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log('\nSUMMARY:');
  console.log(`inspected: ${summary.inspected}`);
  console.log(`aligned_set_ready: ${summary.aligned_set_ready}`);
  console.log(`no_set_alignment: ${summary.no_set_alignment}`);
  console.log(`no_candidate_rows: ${summary.no_candidate_rows}`);
  console.log(`exact_match: ${summary.exact_match}`);
  console.log(`override_match: ${summary.override_match}`);
  console.log(`ambiguous: ${summary.ambiguous}`);
  console.log(`conflicting_existing: ${summary.conflicting_existing}`);
  console.log(`already_correct: ${summary.already_correct}`);
  console.log(`would_upsert: ${summary.would_upsert}`);
  console.log(`upserted: ${summary.upserted}`);
  console.log(`errors: ${summary.errors}`);
  if (!options.verbose && suppressedRowLogs > 0) {
    console.log(`suppressed_console_row_logs: ${suppressedRowLogs}`);
    console.log('note: use --verbose to emit every row disposition to stdout.');
  }
  printVerificationQueries();
}

main().catch((error) => {
  console.error('❌ Unhandled direct JustTCG structure mapping failure:', error);
  process.exit(1);
});
