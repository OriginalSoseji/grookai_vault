/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical data outside runtime executor.
 *
 * RULES:
 * - not part of runtime authority
 * - must not be imported into application code
 * - requires explicit maintenance mode
 * - defaults to DRY RUN
 */
import '../env.mjs';

import { pathToFileURL } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  assertCanonMaintenanceWriteAllowed,
  getCanonMaintenanceDryRun,
} from '../maintenance/canon_maintenance_boundary_v1.mjs';

// BATTLE_ACADEMY_CANON_CONTRACT_V1 invariants enforced by this worker:
// - Battle Academy is a first-class canonical domain, not a TK-style mapping lane.
// - Promotion reads only staged external_discovery_candidates rows for this pass.
// - Identity is Battle Academy set code plus Battle Academy printed number.
// - BA V1 uses deterministic printed numbers from number_raw with empty variant_key.
// - No heuristics, no upstream-trust identity, no fuzzy matching, no partial-canon drift.
// - Product/context rows never promote.
// - If ambiguity or preflight drift is detected, apply stops with no writes.

const STAGING_TABLE = 'external_discovery_candidates';
const SETS_TABLE = 'sets';
const CARD_PRINTS_TABLE = 'card_prints';
const CARD_PRINT_TRAITS_TABLE = 'card_print_traits';
const GAMES_TABLE = 'games';

const SOURCE = 'justtcg';
const TARGET_BUCKET = 'CLEAN_CANON_CANDIDATE';
const TARGET_MATCH_STATUS = 'UNMATCHED';
const PAGE_SIZE = 500;
const BA_SET_CONFIG = {
  'battle-academy-pokemon': {
    upstreamSetId: 'battle-academy-pokemon',
    setCode: 'ba-2020',
    setName: 'Battle Academy 2020',
  },
  'battle-academy-2022-pokemon': {
    upstreamSetId: 'battle-academy-2022-pokemon',
    setCode: 'ba-2022',
    setName: 'Battle Academy 2022',
  },
  'battle-academy-2024-pokemon': {
    upstreamSetId: 'battle-academy-2024-pokemon',
    setCode: 'ba-2024',
    setName: 'Battle Academy 2024',
  },
};

const BA_SET_IDS = Object.keys(BA_SET_CONFIG);
const BA_SET_CODES = Object.values(BA_SET_CONFIG).map((entry) => entry.setCode);

const CONTRACT_INVARIANTS = [
  'BA identity derives from Battle Academy printed data, not upstream source-set identity.',
  'BA V1 promotes deterministic printed numbers from number_raw; slash totals are allowed when numeric and plain numeric rows may promote when deterministic.',
  'BA V1 keeps variant_key empty and never uses TK slot routing.',
  'Only playable Pokemon, Trainer, and Energy cards may promote.',
  'Packaging, code cards, product context, and metadata-only rows never promote.',
  'No fuzzy matching, no heuristic identity guessing, no upstream-authority trust, and no partial-canon drift.',
  'If conflicts, mixed numbering spaces, or existing BA canon drift appear, apply stops.',
];

if (!process.env.ENABLE_CANON_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.',
  );
}

if (process.env.CANON_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
  );
}

if (process.env.CANON_MAINTENANCE_ENTRYPOINT !== 'backend/maintenance/run_canon_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from backend/maintenance/run_canon_maintenance_v1.mjs.',
  );
}

const DRY_RUN = getCanonMaintenanceDryRun();

if (DRY_RUN) {
  console.log('CANON MAINTENANCE: DRY RUN');
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseArgs(argv) {
  const options = {
    apply: false,
    verbose: false,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--apply') {
      options.apply = true;
    } else if (token === '--verbose') {
      options.verbose = true;
    } else if (token === '--limit' && argv[index + 1]) {
      const parsed = Number.parseInt(String(argv[index + 1]), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const parsed = Number.parseInt(token.slice('--limit='.length), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
    }
  }

  return options;
}

function logContractInvariants() {
  console.log('[ba-promote-v1] contract=BATTLE_ACADEMY_CANON_CONTRACT_V1');
  for (const invariant of CONTRACT_INVARIANTS) {
    console.log(`[ba-promote-v1][invariant] ${invariant}`);
  }
}

async function fetchExactCount(supabase, table, column = 'id') {
  const { count, error } = await supabase.from(table).select(column, { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function fetchStagedRows(supabase, options) {
  const rows = [];
  let from = 0;

  while (options.limit == null || rows.length < options.limit) {
    const { data, error } = await supabase
      .from(STAGING_TABLE)
      .select(
        [
          'id',
          'source',
          'raw_import_id',
          'upstream_id',
          'set_id',
          'name_raw',
          'number_raw',
          'normalized_name',
          'normalized_number_left',
          'normalized_number_plain',
          'normalized_printed_total',
          'candidate_bucket',
          'match_status',
          'resolved_set_code',
          'card_print_id',
        ].join(','),
      )
      .eq('source', SOURCE)
      .in('set_id', BA_SET_IDS)
      .eq('candidate_bucket', TARGET_BUCKET)
      .eq('match_status', TARGET_MATCH_STATUS)
      .order('set_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    rows.push(
      ...batch.map((row) => ({
        id: row.id,
        source: normalizeTextOrNull(row.source),
        raw_import_id: row.raw_import_id,
        upstream_id: normalizeTextOrNull(row.upstream_id),
        set_id: normalizeTextOrNull(row.set_id),
        name_raw: normalizeTextOrNull(row.name_raw),
        number_raw: normalizeTextOrNull(row.number_raw),
        normalized_name: normalizeTextOrNull(row.normalized_name),
        normalized_number_left: normalizeTextOrNull(row.normalized_number_left),
        normalized_number_plain: normalizeTextOrNull(row.normalized_number_plain),
        normalized_printed_total: normalizeTextOrNull(row.normalized_printed_total),
        candidate_bucket: normalizeTextOrNull(row.candidate_bucket),
        match_status: normalizeTextOrNull(row.match_status),
        resolved_set_code: normalizeTextOrNull(row.resolved_set_code),
        card_print_id: normalizeTextOrNull(row.card_print_id),
      })),
    );

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return options.limit == null ? rows : rows.slice(0, options.limit);
}

async function fetchExistingBaSets(supabase) {
  const { data, error } = await supabase
    .from(SETS_TABLE)
    .select('id,game,code,name,release_date,source')
    .in('code', BA_SET_CODES)
    .order('code', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    game: normalizeTextOrNull(row.game),
    code: normalizeLowerOrNull(row.code),
    name: normalizeTextOrNull(row.name),
    release_date: row.release_date ?? null,
    source: row.source ?? {},
  }));
}

async function fetchExistingBaCardPrints(supabase) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(CARD_PRINTS_TABLE)
      .select('id,set_id,game_id,set_code,name,number,number_plain,printed_total,variant_key')
      .in('set_code', BA_SET_CODES)
      .order('set_code', { ascending: true })
      .order('number', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = data ?? [];
    if (batch.length === 0) break;

    rows.push(
      ...batch.map((row) => ({
        id: row.id,
        set_id: row.set_id,
        game_id: row.game_id,
        set_code: normalizeLowerOrNull(row.set_code),
        name: normalizeTextOrNull(row.name),
        number: normalizeTextOrNull(row.number),
        number_plain: normalizeTextOrNull(row.number_plain),
        printed_total: row.printed_total ?? null,
        variant_key: normalizeTextOrNull(row.variant_key),
      })),
    );

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchPokemonGame(supabase) {
  const { data, error } = await supabase
    .from(GAMES_TABLE)
    .select('id,slug,name')
    .eq('slug', 'pokemon')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error('[ba-promote-v1] STOP: pokemon game row not found.');
  }

  return {
    id: data.id,
    slug: normalizeTextOrNull(data.slug),
    name: normalizeTextOrNull(data.name),
  };
}

function isBasicEnergyName(name) {
  const normalized = normalizeTextOrNull(name);
  if (!normalized) return false;
  return /^basic\s+(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy$/i.test(
    normalized,
  );
}

function detectImmediateNameNoiseReason(text) {
  const normalized = normalizeTextOrNull(text);
  if (!normalized) return null;

  if (/\bcode card\b/i.test(normalized)) {
    return 'CODE_CARD';
  }

  if (/\b(packaging|bundle|metadata|rulebook|game board)\b/i.test(normalized)) {
    return 'PACKAGING_ROW';
  }

  if (/^\s*battle academy(?:\s|$)/i.test(normalized) || /\bproduct label\b/i.test(normalized)) {
    return 'PRODUCT_CONTEXT_NAME';
  }

  return null;
}

const BA_NAME_NORMALIZATION_PATTERNS = [
  /^\s*(.*?)\s*-\s*\d+\s*\/\s*\d+\s*\((?:#?\d+\s+)?[A-Za-z][A-Za-z' .-]*\s+Stamped\)\s*$/i,
  /^\s*(.*?)\s*-\s*\d+\s*\/\s*\d+\s*$/i,
  /^\s*(.*?)\s*-\s*[A-Za-z][A-Za-z' .-]*\s+Deck\s*$/i,
  /^\s*(.*?)\s*-\s*[A-Za-z][A-Za-z' .-]*\s+\d+\s*$/i,
  /^\s*(.*?)\s*\((?:[A-Za-z][A-Za-z' .-]*|[A-Za-z][A-Za-z' .-]*\s+\d+)\)\s*$/i,
];

function buildBaNameVariants(text) {
  const normalized = normalizeTextOrNull(text);
  if (!normalized) {
    return {
      variants: [],
      reason: null,
    };
  }

  const immediateReason = detectImmediateNameNoiseReason(normalized);
  if (immediateReason) {
    return {
      variants: [],
      reason: immediateReason,
    };
  }

  const variants = [];
  const seen = new Set();
  let current = normalized;

  while (current) {
    if (!seen.has(current)) {
      seen.add(current);
      variants.push(current);
    }

    let next = current;
    for (const pattern of BA_NAME_NORMALIZATION_PATTERNS) {
      const match = next.match(pattern);
      if (!match) continue;

      const stripped = normalizeTextOrNull(match[1]);
      if (!stripped || stripped === next) continue;

      next = stripped;
      break;
    }

    if (next === current) {
      break;
    }

    const nextReason = detectImmediateNameNoiseReason(next);
    if (nextReason) {
      return {
        variants,
        reason: nextReason,
      };
    }

    current = next;
  }

  return {
    variants,
    reason: null,
  };
}

function pickPreferredReason(reasons) {
  const priority = ['CODE_CARD', 'PACKAGING_ROW', 'PRODUCT_CONTEXT_NAME'];
  for (const reason of priority) {
    if (reasons.has(reason)) {
      return reason;
    }
  }
  return null;
}

function parseBattleAcademyNumber(numberRaw) {
  const normalized = normalizeTextOrNull(numberRaw);
  if (!normalized || /^n\/a$/i.test(normalized)) {
    return {
      ok: false,
      reason: 'NUMBER_NOT_DETERMINISTIC',
    };
  }

  if (/^[0-9]+$/.test(normalized)) {
    return {
      ok: true,
      reason: null,
      number: normalized,
      number_plain: normalized,
      printed_total: null,
    };
  }

  const slashMatch = normalized.match(/^([0-9]+)\s*\/\s*([0-9]+)$/);
  if (!slashMatch) {
    return {
      ok: false,
      reason: /[0-9]/.test(normalized) ? 'NUMBER_NOT_NUMERIC' : 'NUMBER_NOT_DETERMINISTIC',
    };
  }

  const numberLeft = normalizeTextOrNull(slashMatch[1]);
  const totalRight = normalizeTextOrNull(slashMatch[2]);
  const totalInt = Number.parseInt(String(totalRight), 10);

  if (!Number.isInteger(totalInt)) {
    return {
      ok: false,
      reason: 'NUMBER_NOT_NUMERIC',
    };
  }

  return {
    ok: true,
    reason: null,
    number: numberLeft,
    number_plain: numberLeft,
    printed_total: totalInt,
  };
}

function normalizeCanonType(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;

  const lower = normalized
    .replace(/pokémon/gi, 'pokemon')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (lower === 'pokemon') return 'POKEMON';
  if (lower === 'trainer') return 'TRAINER';
  if (lower === 'energy') return 'ENERGY';
  return null;
}

async function buildNameTypeMap(supabase, names) {
  const uniqueNames = [...new Set(names.map((value) => normalizeTextOrNull(value)).filter(Boolean))];
  const nameToCardPrintIds = new Map();
  const cardPrintIdToName = new Map();
  const nameQueryChunkSize = 5;
  const traitQueryChunkSize = 50;

  for (let index = 0; index < uniqueNames.length; index += nameQueryChunkSize) {
    const chunk = uniqueNames.slice(index, index + nameQueryChunkSize);
    const { data, error } = await supabase
      .from(CARD_PRINTS_TABLE)
      .select('id,name')
      .in('name', chunk);

    if (error) throw error;

    for (const row of data ?? []) {
      const id = normalizeTextOrNull(row.id);
      const name = normalizeTextOrNull(row.name);
      if (!id || !name) continue;

      cardPrintIdToName.set(id, name);
      if (!nameToCardPrintIds.has(name)) {
        nameToCardPrintIds.set(name, []);
      }
      nameToCardPrintIds.get(name).push(id);
    }
  }

  const allIds = [...cardPrintIdToName.keys()];
  const typeByName = new Map();

  for (let index = 0; index < allIds.length; index += traitQueryChunkSize) {
    const chunk = allIds.slice(index, index + traitQueryChunkSize);
    const { data, error } = await supabase
      .from(CARD_PRINT_TRAITS_TABLE)
      .select('card_print_id,supertype')
      .in('card_print_id', chunk)
      .not('supertype', 'is', null);

    if (error) throw error;

    for (const row of data ?? []) {
      const cardPrintId = normalizeTextOrNull(row.card_print_id);
      const canonType = normalizeCanonType(row.supertype);
      const name = cardPrintId ? cardPrintIdToName.get(cardPrintId) ?? null : null;
      if (!name || !canonType) continue;

      if (!typeByName.has(name)) {
        typeByName.set(name, new Set());
      }
      typeByName.get(name).add(canonType);
    }
  }

  const resolved = new Map();
  for (const [name, typeSet] of typeByName.entries()) {
    if (typeSet.size === 1) {
      resolved.set(name, [...typeSet][0]);
    }
  }

  return resolved;
}

function prepareRowForAnalysis(row) {
  const setConfig = BA_SET_CONFIG[row.set_id];
  if (!setConfig) {
    return {
      ...row,
      set_code: null,
      content_class: 'REJECT',
      status: 'conflict',
      reason: 'UNKNOWN_BA_SET_ID',
    };
  }

  const parsedNumber = parseBattleAcademyNumber(row.number_raw);
  if (!parsedNumber.ok) {
    return {
      ...row,
      set_code: setConfig.setCode,
      set_name: setConfig.setName,
      content_class: 'REJECT',
      status: 'excluded',
      reason: parsedNumber.reason,
    };
  }

  const reasonSet = new Set();
  const nameCandidates = new Set();

  for (const sourceName of [row.normalized_name, row.name_raw]) {
    const derived = buildBaNameVariants(sourceName);
    if (derived.reason) {
      reasonSet.add(derived.reason);
    }
    for (const variant of derived.variants) {
      nameCandidates.add(variant);
    }
  }

  const preferredReason = pickPreferredReason(reasonSet);
  if (preferredReason) {
    return {
      ...row,
      set_code: setConfig.setCode,
      set_name: setConfig.setName,
      content_class: preferredReason === 'CODE_CARD' ? 'REJECT' : 'PRODUCT_CONTEXT',
      status: 'excluded',
      reason: preferredReason,
    };
  }

  if (nameCandidates.size === 0) {
    return {
      ...row,
      set_code: setConfig.setCode,
      set_name: setConfig.setName,
      content_class: 'REJECT',
      status: 'excluded',
      reason: 'CARD_NAME_NOT_DETERMINISTIC',
    };
  }

  return {
    ...row,
    set_code: setConfig.setCode,
    set_name: setConfig.setName,
    number: parsedNumber.number,
    number_plain: parsedNumber.number_plain,
    printed_total: parsedNumber.printed_total,
    name_candidates: [...nameCandidates],
    status: 'prepared',
    reason: null,
  };
}

function analyzePreparedRow(row, nameTypeMap) {
  if (row.status !== 'prepared') {
    return row;
  }

  const resolvedByName = new Map();
  for (const candidateName of row.name_candidates ?? []) {
    const contentClass = isBasicEnergyName(candidateName)
      ? 'ENERGY'
      : nameTypeMap.get(candidateName) ?? null;

    if (!contentClass) {
      continue;
    }

    if (resolvedByName.has(candidateName) && resolvedByName.get(candidateName) !== contentClass) {
      return {
        ...row,
        content_class: 'REJECT',
        status: 'excluded',
        reason: 'CARD_TYPE_NOT_DETERMINISTIC',
      };
    }

    resolvedByName.set(candidateName, contentClass);
  }

  if (resolvedByName.size === 0) {
    return {
      ...row,
      content_class: 'REJECT',
      status: 'excluded',
      reason: 'CARD_TYPE_NOT_DETERMINISTIC',
    };
  }

  if (resolvedByName.size > 1) {
    return {
      ...row,
      content_class: 'REJECT',
      status: 'excluded',
      reason: 'CARD_NAME_NOT_DETERMINISTIC',
    };
  }

  const [validatedName, contentClass] = [...resolvedByName.entries()][0];

  return {
    ...row,
    content_class: contentClass,
    validated_name: validatedName,
    status: 'candidate',
    reason: null,
  };
}

function markConflict(row, reason) {
  return {
    ...row,
    status: 'conflict',
    reason,
  };
}

function summarizeReasons(rows) {
  const counts = {};
  for (const row of rows) {
    const key = row.reason ?? 'UNKNOWN';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function buildIdentityPlans(analyzedRows) {
  const candidates = analyzedRows.filter((row) => row.status === 'candidate');
  const conflicts = analyzedRows.filter((row) => row.status === 'conflict');
  const excluded = analyzedRows.filter((row) => row.status === 'excluded');

  const byIdentity = new Map();
  for (const row of candidates) {
    const key = `${row.set_code}::${row.number}`;
    if (!byIdentity.has(key)) {
      byIdentity.set(key, []);
    }
    byIdentity.get(key).push(row);
  }

  const promotableRows = [];
  const conflictRows = [...conflicts];
  const promotionPlans = [];

  for (const [identityKey, group] of byIdentity.entries()) {
    const nameSet = [...new Set(group.map((row) => row.validated_name))];
    const totalSet = [
      ...new Set(group.map((row) => row.printed_total).filter((value) => value !== null && value !== undefined)),
    ];
    const typeSet = [...new Set(group.map((row) => row.content_class))];

    if (nameSet.length > 1) {
      conflictRows.push(...group.map((row) => markConflict(row, 'IDENTITY_NAME_CONFLICT')));
      continue;
    }

    if (totalSet.length > 1) {
      conflictRows.push(...group.map((row) => markConflict(row, 'IDENTITY_PRINTED_TOTAL_CONFLICT')));
      continue;
    }

    if (typeSet.length > 1) {
      conflictRows.push(...group.map((row) => markConflict(row, 'IDENTITY_CONTENT_CLASS_CONFLICT')));
      continue;
    }

    const representative = group[0];
    const resolvedPrintedTotal = totalSet[0] ?? null;
    promotableRows.push(...group);
    promotionPlans.push({
      identity_key: identityKey,
      set_code: representative.set_code,
      set_name: representative.set_name,
      name: representative.validated_name,
      number: representative.number,
      number_plain: representative.number_plain,
      printed_total: resolvedPrintedTotal,
      content_class: representative.content_class,
      stage_row_ids: group.map((row) => row.id),
    });
  }

  return {
    promotableRows,
    excludedRows: excluded,
    conflictingRows: conflictRows,
    promotionPlans,
  };
}

function buildSetInsertPayload(setConfig) {
  return {
    game: 'pokemon',
    code: setConfig.setCode,
    name: setConfig.setName,
    release_date: null,
    source: {
      battle_academy: {
        contract: 'BATTLE_ACADEMY_CANON_CONTRACT_V1',
        upstream_set_id: setConfig.upstreamSetId,
        canonical_set_code: setConfig.setCode,
      },
    },
  };
}

function setMatchesExpected(existingRow, expectedPayload) {
  return (
    normalizeLowerOrNull(existingRow.game) === normalizeLowerOrNull(expectedPayload.game) &&
    normalizeLowerOrNull(existingRow.code) === normalizeLowerOrNull(expectedPayload.code) &&
    normalizeTextOrNull(existingRow.name) === normalizeTextOrNull(expectedPayload.name)
  );
}

function cardPrintMatchesPlan(existingRow, plan) {
  return (
    normalizeLowerOrNull(existingRow.set_code) === normalizeLowerOrNull(plan.set_code) &&
    normalizeTextOrNull(existingRow.name) === normalizeTextOrNull(plan.name) &&
    normalizeTextOrNull(existingRow.number) === normalizeTextOrNull(plan.number) &&
    normalizeTextOrNull(existingRow.number_plain) === normalizeTextOrNull(plan.number_plain) &&
    (existingRow.printed_total ?? null) === (plan.printed_total ?? null) &&
    normalizeTextOrNull(existingRow.variant_key) === null
  );
}

function buildExistingBaState(existingSets, existingCardPrints, promotionPlans) {
  const blockers = [];
  const setsAlreadyPresent = [];
  const cardPrintsAlreadyPresent = [];
  const cardPrintsByIdentity = new Map(
    existingCardPrints.map((row) => [`${row.set_code}::${row.number}`, row]),
  );
  const plannedByIdentity = new Map(
    promotionPlans.map((plan) => [`${plan.set_code}::${plan.number}`, plan]),
  );

  for (const setCode of BA_SET_CODES) {
    const expected = buildSetInsertPayload(
      Object.values(BA_SET_CONFIG).find((entry) => entry.setCode === setCode),
    );
    const current = existingSets.find((row) => row.code === setCode) ?? null;
    if (!current) continue;

    if (!setMatchesExpected(current, expected)) {
      blockers.push({
        kind: 'EXISTING_BA_SET_MISMATCH',
        set_code: setCode,
        existing: current,
        expected,
      });
    } else {
      setsAlreadyPresent.push(current);
    }
  }

  for (const existingRow of existingCardPrints) {
    const identityKey = `${existingRow.set_code}::${existingRow.number}`;
    const plan = plannedByIdentity.get(identityKey) ?? null;

    if (!plan) {
      blockers.push({
        kind: 'EXISTING_BA_CARD_PRINT_OUTSIDE_PLAN',
        identity_key: identityKey,
        existing: existingRow,
      });
      continue;
    }

    if (!cardPrintMatchesPlan(existingRow, plan)) {
      blockers.push({
        kind: 'EXISTING_BA_CARD_PRINT_IDENTITY_MISMATCH',
        identity_key: identityKey,
        existing: existingRow,
        planned: plan,
      });
      continue;
    }

    cardPrintsAlreadyPresent.push(existingRow);
  }

  for (const plan of promotionPlans) {
    const existing = cardPrintsByIdentity.get(`${plan.set_code}::${plan.number}`) ?? null;
    if (!existing) continue;

    if (!cardPrintMatchesPlan(existing, plan)) {
      blockers.push({
        kind: 'PLANNED_IDENTITY_MISMATCHES_EXISTING_BA_CARD_PRINT',
        identity_key: `${plan.set_code}::${plan.number}`,
        existing,
        planned: plan,
      });
    }
  }

  return {
    blockers,
    setsAlreadyPresent,
    cardPrintsAlreadyPresent,
  };
}

function buildSummary({
  stagedRows,
  promotableRows,
  excludedRows,
  conflictingRows,
  promotionPlans,
  existingState,
  existingSets,
}) {
  const missingSetCodes = BA_SET_CODES.filter(
    (setCode) => !existingSets.some((row) => row.code === setCode),
  );
  const alreadyPresentCardPrintIds = new Set(existingState.cardPrintsAlreadyPresent.map((row) => row.id));
  const cardPrintsToCreate = promotionPlans.filter((plan) => {
    return !existingState.cardPrintsAlreadyPresent.some(
      (row) => row.set_code === plan.set_code && row.number === plan.number,
    );
  });

  return {
    total_staged_rows: stagedRows.length,
    promotable_rows: promotableRows.length,
    excluded_rows: excludedRows.length,
    conflicting_rows: conflictingRows.length,
    sets_to_create: missingSetCodes.length,
    sets_already_present: existingState.setsAlreadyPresent.length,
    card_prints_to_create: cardPrintsToCreate.length,
    card_prints_already_present: existingState.cardPrintsAlreadyPresent.length,
    staging_rows_to_update: promotableRows.length,
    excluded_by_reason: summarizeReasons(excludedRows),
    conflicts_by_reason: summarizeReasons(conflictingRows),
    blocking_conditions: existingState.blockers.map((item) => item.kind),
    already_present_card_print_ids: [...alreadyPresentCardPrintIds],
  };
}

function printSummary(summary) {
  for (const [key, value] of Object.entries(summary)) {
    console.log(`[ba-promote-v1][summary] ${key}=${JSON.stringify(value)}`);
  }
}

function printSamples(label, rows, options) {
  if (!options.verbose || rows.length === 0) return;

  console.log(`[ba-promote-v1][${label}] sample_count=${Math.min(rows.length, 25)}`);
  for (const row of rows.slice(0, 25)) {
    console.log(`[ba-promote-v1][${label}] ${JSON.stringify(row)}`);
  }
}

async function ensureBaSets(supabase) {
  assertCanonMaintenanceWriteAllowed();
  const created = [];
  const resolved = new Map();

  for (const setConfig of Object.values(BA_SET_CONFIG)) {
    const expectedPayload = buildSetInsertPayload(setConfig);
    const { data: existing, error: existingError } = await supabase
      .from(SETS_TABLE)
      .select('id,game,code,name,release_date,source')
      .eq('code', setConfig.setCode)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      if (!setMatchesExpected(
        {
          id: existing.id,
          game: existing.game,
          code: existing.code,
          name: existing.name,
          release_date: existing.release_date,
          source: existing.source,
        },
        expectedPayload,
      )) {
        throw new Error(`[ba-promote-v1] STOP: existing set mismatch for ${setConfig.setCode}.`);
      }

      resolved.set(setConfig.setCode, existing.id);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from(SETS_TABLE)
      .insert(expectedPayload)
      .select('id,code')
      .single();

    if (insertError) throw insertError;

    created.push(inserted.code);
    resolved.set(setConfig.setCode, inserted.id);
  }

  return {
    created,
    resolved,
  };
}

async function upsertBaCardPrints({
  supabase,
  pokemonGame,
  setIdsByCode,
  promotionPlans,
}) {
  assertCanonMaintenanceWriteAllowed();
  const created = [];
  const resolved = new Map();

  for (const plan of promotionPlans) {
    const setId = setIdsByCode.get(plan.set_code) ?? null;
    if (!setId) {
      throw new Error(`[ba-promote-v1] STOP: missing set_id for ${plan.set_code}.`);
    }

    const { data: existing, error: existingError } = await supabase
      .from(CARD_PRINTS_TABLE)
      .select('id,set_code,name,number,number_plain,printed_total,variant_key')
      .eq('set_code', plan.set_code)
      .eq('number', plan.number)
      .limit(2);

    if (existingError) throw existingError;

    if ((existing ?? []).length > 1) {
      throw new Error(`[ba-promote-v1] STOP: multiple existing BA card_prints for ${plan.set_code}:${plan.number}.`);
    }

    if ((existing ?? []).length === 1) {
      const row = existing[0];
      if (!cardPrintMatchesPlan(
        {
          id: row.id,
          set_code: row.set_code,
          name: row.name,
          number: row.number,
          number_plain: row.number_plain,
          printed_total: row.printed_total,
          variant_key: row.variant_key,
        },
        plan,
      )) {
        throw new Error(`[ba-promote-v1] STOP: existing BA card_print mismatch for ${plan.set_code}:${plan.number}.`);
      }

      resolved.set(plan.identity_key, row.id);
      continue;
    }

    const insertPayload = {
      game_id: pokemonGame.id,
      set_id: setId,
      set_code: plan.set_code,
      name: plan.name,
      number: plan.number,
      number_plain: plan.number_plain,
      printed_total: plan.printed_total,
      variant_key: null,
      external_ids: {},
    };

    const { data: inserted, error: insertError } = await supabase
      .from(CARD_PRINTS_TABLE)
      .insert(insertPayload)
      .select('id,set_code,number')
      .single();

    if (insertError) throw insertError;

    created.push(`${inserted.set_code}:${inserted.number}`);
    resolved.set(plan.identity_key, inserted.id);
  }

  return {
    created,
    resolved,
  };
}

async function resolveStageRows(supabase, promotionPlans, cardPrintIdsByIdentity) {
  assertCanonMaintenanceWriteAllowed();
  let updatedRowCount = 0;

  for (const plan of promotionPlans) {
    const cardPrintId = cardPrintIdsByIdentity.get(plan.identity_key) ?? null;
    if (!cardPrintId) {
      throw new Error(`[ba-promote-v1] STOP: missing card_print_id for ${plan.identity_key}.`);
    }

    const { error } = await supabase
      .from(STAGING_TABLE)
      .update({
        resolved_set_code: plan.set_code,
        card_print_id: cardPrintId,
        match_status: 'RESOLVED',
      })
      .in('id', plan.stage_row_ids);

    if (error) throw error;
    updatedRowCount += plan.stage_row_ids.length;
  }

  return updatedRowCount;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  if (DRY_RUN) {
    options.apply = false;
  }

  logContractInvariants();
  console.log(`[ba-promote-v1] mode=${options.apply ? 'apply' : 'dry-run'}`);

  const url = process.env.SUPABASE_URL ?? '';
  const projectRefMatch = url.match(/^https:\/\/([^.]+)\.supabase\.co/i);
  console.log(
    `[ba-promote-v1][preflight] project_ref=${projectRefMatch?.[1] ?? 'unknown'} source=${SOURCE} target_bucket=${TARGET_BUCKET} target_match_status=${TARGET_MATCH_STATUS}`,
  );

  const [counts, stagedRows, existingSets, existingCardPrints] = await Promise.all([
    (async () => ({
      card_prints: await fetchExactCount(supabase, CARD_PRINTS_TABLE),
      sets: await fetchExactCount(supabase, SETS_TABLE),
      card_print_traits: await fetchExactCount(supabase, CARD_PRINT_TRAITS_TABLE),
    }))(),
    fetchStagedRows(supabase, options),
    fetchExistingBaSets(supabase),
    fetchExistingBaCardPrints(supabase),
  ]);

  console.log(
    `[ba-promote-v1][preflight] canonical_counts=${JSON.stringify(counts)} staged_rows=${stagedRows.length} existing_ba_sets=${existingSets.length} existing_ba_card_prints=${existingCardPrints.length}`,
  );

  if (stagedRows.length === 0) {
    console.log('[ba-promote-v1] No staged Battle Academy rows found. Nothing to do.');
    return;
  }

  const preparedRows = stagedRows.map((row) => prepareRowForAnalysis(row));
  const pureNames = preparedRows
    .filter((row) => row.status === 'prepared')
    .flatMap((row) => row.name_candidates ?? []);
  const nameTypeMap = await buildNameTypeMap(supabase, pureNames);
  const analyzedRows = preparedRows.map((row) => analyzePreparedRow(row, nameTypeMap));
  const planning = buildIdentityPlans(analyzedRows);
  const existingState = buildExistingBaState(existingSets, existingCardPrints, planning.promotionPlans);
  const summary = buildSummary({
    stagedRows,
    promotableRows: planning.promotableRows,
    excludedRows: planning.excludedRows,
    conflictingRows: planning.conflictingRows,
    promotionPlans: planning.promotionPlans,
    existingState,
    existingSets,
  });

  printSummary(summary);
  printSamples('excluded', planning.excludedRows, options);
  printSamples('conflict', planning.conflictingRows, options);
  printSamples('plan', planning.promotionPlans, options);
  printSamples('existing_ba_blocker', existingState.blockers, options);

  if (!options.apply) {
    console.log('[ba-promote-v1] Dry run complete. Use --apply to execute writes.');
    return;
  }

  const applyBlockers = [];

  if (existingState.blockers.length > 0) {
    applyBlockers.push(`existing BA canon mismatch detected: blocker_count=${existingState.blockers.length}`);
  }

  if (planning.conflictingRows.length > 0) {
    applyBlockers.push(`conflicting BA staging rows detected: conflicting_rows=${planning.conflictingRows.length}`);
  }

  if (planning.promotionPlans.length === 0) {
    applyBlockers.push('no lawful Battle Academy promotion candidates remain after contract filtering');
  }

  if (applyBlockers.length > 0) {
    throw new Error(`[ba-promote-v1] STOP: ${applyBlockers.join(' | ')}.`);
  }

  const pokemonGame = await fetchPokemonGame(supabase);
  const setResult = await ensureBaSets(supabase);
  const cardPrintResult = await upsertBaCardPrints({
    supabase,
    pokemonGame,
    setIdsByCode: setResult.resolved,
    promotionPlans: planning.promotionPlans,
  });
  const updatedStageRows = await resolveStageRows(supabase, planning.promotionPlans, cardPrintResult.resolved);

  console.log(`[ba-promote-v1][apply] sets_created=${JSON.stringify(setResult.created)}`);
  console.log(`[ba-promote-v1][apply] card_prints_created=${JSON.stringify(cardPrintResult.created)}`);
  console.log(`[ba-promote-v1][apply] staging_rows_updated=${updatedStageRows}`);
}

export {
  BA_SET_CODES,
  BA_SET_CONFIG,
  SOURCE,
  TARGET_BUCKET,
  TARGET_MATCH_STATUS,
  buildNameTypeMap,
  fetchStagedRows,
  analyzePreparedRow,
  prepareRowForAnalysis,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-promote-v1] Fatal error:', error);
    process.exit(1);
  });
}
