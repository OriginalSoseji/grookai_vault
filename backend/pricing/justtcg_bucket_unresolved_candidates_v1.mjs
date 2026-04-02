import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

const RAW_IMPORTS_TABLE = 'raw_imports';
const CARD_PRINTS_TABLE = 'card_prints';
const EXTERNAL_MAPPINGS_TABLE = 'external_mappings';
const SOURCE = 'justtcg';
const KIND = 'card';
const PAGE_SIZE = 1000;
const LOOKUP_CHUNK_SIZE = 50;

const SET_CODE_HINTS = {
  'sv-scarlet-violet-151-pokemon': 'sv03.5',
};

const ACTION_BUCKETS = [
  'CELC_VERIFY',
  'TK_KIT_TARGET',
  'BATTLE_ACADEMY_VERIFY',
  'DECK_EXCLUSIVE_VERIFY',
  'OTHER',
];

if (process.env.SUPABASE_URL_LOCAL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL_LOCAL;
}
if (process.env.SUPABASE_SECRET_KEY_LOCAL) {
  process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY_LOCAL;
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`[justtcg-bucket] ${label} must be a non-negative integer.`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    setId: null,
    limit: null,
    offset: 0,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--set-id' && argv[index + 1]) {
      options.setId = normalizeTextOrNull(argv[index + 1]);
      index += 1;
    } else if (token.startsWith('--set-id=')) {
      options.setId = normalizeTextOrNull(token.slice('--set-id='.length));
    } else if (token === '--limit' && argv[index + 1]) {
      const value = parsePositiveInteger(argv[index + 1], '--limit');
      options.limit = value > 0 ? value : null;
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const value = parsePositiveInteger(token.slice('--limit='.length), '--limit');
      options.limit = value > 0 ? value : null;
    } else if (token === '--offset' && argv[index + 1]) {
      options.offset = parsePositiveInteger(argv[index + 1], '--offset');
      index += 1;
    } else if (token.startsWith('--offset=')) {
      options.offset = parsePositiveInteger(token.slice('--offset='.length), '--offset');
    } else if (token === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

function chunkArray(values, chunkSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function addToIndex(index, key, cardPrint) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(cardPrint);
}

function addUniqueRows(target, rows) {
  const deduped = new Map(target.map((row) => [row.id, row]));
  for (const row of rows) {
    deduped.set(row.id, row);
  }
  return [...deduped.values()];
}

function buildStructuredKeys(cardPrint) {
  const keys = [];
  if (cardPrint.set_code && cardPrint.name && cardPrint.number_plain) {
    keys.push(`plain::${cardPrint.set_code}::${cardPrint.name}::${cardPrint.number_plain}`);
  }
  if (cardPrint.set_code && cardPrint.name && cardPrint.number) {
    keys.push(`left::${cardPrint.set_code}::${cardPrint.name}::${cardPrint.number}`);
  }
  return keys;
}

function parseJustTcgNumber(numberRaw) {
  const trimmed = normalizeTextOrNull(numberRaw);
  const slashMatch = trimmed?.match(
    /^([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\/\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)$/,
  );

  const hasSlashNumber = Boolean(slashMatch);
  const normalizedNumberLeft = hasSlashNumber
    ? normalizeTextOrNull(slashMatch[1])
    : trimmed && trimmed.toUpperCase() !== 'N/A'
      ? trimmed
      : null;
  const normalizedPrintedTotal = hasSlashNumber ? normalizeTextOrNull(slashMatch[2]) : null;
  const normalizedNumberPlain =
    normalizedNumberLeft && /^[0-9]+$/.test(normalizedNumberLeft) ? normalizedNumberLeft : null;
  const hasAlphaSuffixNumber = Boolean(
    normalizedNumberLeft &&
      /[0-9]/.test(normalizedNumberLeft) &&
      /[A-Za-z]/.test(normalizedNumberLeft),
  );

  return {
    normalizedNumberLeft,
    normalizedPrintedTotal,
    normalizedNumberPlain,
    hasSlashNumber,
    hasAlphaSuffixNumber,
  };
}

function parseJustTcgName(nameRaw, normalizedNumberLeft, normalizedPrintedTotal) {
  const trimmed = normalizeTextOrNull(nameRaw);
  if (!trimmed) {
    return {
      normalizedName: null,
      hasParentheticalModifier: false,
    };
  }

  const withModifierMatch = trimmed.match(
    /^\s*(.*?)\s*-\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\/\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\((.+)\)\s*$/,
  );
  if (
    withModifierMatch &&
    normalizeTextOrNull(withModifierMatch[2]) === normalizedNumberLeft &&
    normalizeTextOrNull(withModifierMatch[3]) === normalizedPrintedTotal
  ) {
    return {
      normalizedName: normalizeTextOrNull(withModifierMatch[1]),
      hasParentheticalModifier: true,
    };
  }

  const plainMatch = trimmed.match(
    /^\s*(.*?)\s*-\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\/\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*$/,
  );
  if (
    plainMatch &&
    normalizeTextOrNull(plainMatch[2]) === normalizedNumberLeft &&
    normalizeTextOrNull(plainMatch[3]) === normalizedPrintedTotal
  ) {
    return {
      normalizedName: normalizeTextOrNull(plainMatch[1]),
      hasParentheticalModifier: false,
    };
  }

  return {
    normalizedName: trimmed,
    hasParentheticalModifier: false,
  };
}

function normalizeRawRow(rawRow) {
  const payload = rawRow?.payload ?? {};
  const justtcgCardId = normalizeTextOrNull(payload?.id);
  const tcgplayerId = normalizeTextOrNull(payload?.tcgplayerId);
  const justtcgSetId = normalizeTextOrNull(payload?.set);
  const justtcgNameRaw = normalizeTextOrNull(payload?.name);
  const justtcgNumberRaw = normalizeTextOrNull(payload?.number);

  const numberShape = parseJustTcgNumber(justtcgNumberRaw);
  const nameShape = parseJustTcgName(
    justtcgNameRaw,
    numberShape.normalizedNumberLeft,
    numberShape.normalizedPrintedTotal,
  );

  return {
    raw_import_id: rawRow.id,
    justtcg_card_id: justtcgCardId,
    tcgplayer_id: tcgplayerId,
    justtcg_set_id: justtcgSetId,
    justtcg_name_raw: justtcgNameRaw,
    justtcg_number_raw: justtcgNumberRaw,
    normalized_name: nameShape.normalizedName,
    normalized_number_left: numberShape.normalizedNumberLeft,
    normalized_number_plain: numberShape.normalizedNumberPlain,
    normalized_printed_total: numberShape.normalizedPrintedTotal,
    has_slash_number: numberShape.hasSlashNumber,
    has_alpha_suffix_number: numberShape.hasAlphaSuffixNumber,
    has_parenthetical_modifier: nameShape.hasParentheticalModifier,
  };
}

function classifyActionBucket(row) {
  const setId = row.justtcg_set_id?.toLowerCase() ?? '';

  if (setId.includes('celebrations-classic-collection')) {
    return 'CELC_VERIFY';
  }

  if (
    setId.includes('trainer-kit') ||
    setId.startsWith('tk-') ||
    setId.includes('-tk-')
  ) {
    return 'TK_KIT_TARGET';
  }

  if (setId.includes('battle-academy')) {
    return 'BATTLE_ACADEMY_VERIFY';
  }

  if (setId === 'deck-exclusives-pokemon') {
    return 'DECK_EXCLUSIVE_VERIFY';
  }

  return 'OTHER';
}

function buildCandidateSetCodes(matches) {
  const setCodes = [...new Set(matches.map((row) => row.set_code).filter(Boolean))];
  return setCodes.length > 0 ? setCodes.join(',') : null;
}

function buildStructuredIndexes(cardPrints) {
  const structuredIndex = new Map();

  for (const cardPrint of cardPrints) {
    for (const key of buildStructuredKeys(cardPrint)) {
      addToIndex(structuredIndex, key, cardPrint);
    }
  }

  return structuredIndex;
}

function getStructuredMatches(row, structuredIndex) {
  const setCodeHint = SET_CODE_HINTS[row.justtcg_set_id] ?? null;
  let matches = [];

  if (!setCodeHint || !row.normalized_name || !row.normalized_number_left) {
    return { setCodeHint, matches };
  }

  if (row.normalized_number_plain) {
    matches = addUniqueRows(
      matches,
      structuredIndex.get(
        `plain::${setCodeHint}::${row.normalized_name}::${row.normalized_number_plain}`,
      ) ?? [],
    );
  }

  matches = addUniqueRows(
    matches,
    structuredIndex.get(
      `left::${setCodeHint}::${row.normalized_name}::${row.normalized_number_left}`,
    ) ?? [],
  );

  return { setCodeHint, matches };
}

function compareRow(row, matchedJusttcgIds, matchedTcgplayerIds, structuredIndex) {
  if (row.justtcg_card_id && matchedJusttcgIds.has(row.justtcg_card_id)) {
    return {
      ...row,
      comparison_status: 'MATCHED',
      comparison_candidate_count: 1,
      comparison_candidate_set_codes: null,
      action_bucket: null,
    };
  }

  if (row.tcgplayer_id && matchedTcgplayerIds.has(row.tcgplayer_id)) {
    return {
      ...row,
      comparison_status: 'MATCHED',
      comparison_candidate_count: 1,
      comparison_candidate_set_codes: null,
      action_bucket: null,
    };
  }

  const { matches } = getStructuredMatches(row, structuredIndex);

  if (matches.length === 1) {
    return {
      ...row,
      comparison_status: 'MATCHED',
      comparison_candidate_count: 1,
      comparison_candidate_set_codes: buildCandidateSetCodes(matches),
      action_bucket: null,
    };
  }

  if (matches.length > 1) {
    return {
      ...row,
      comparison_status: 'AMBIGUOUS',
      comparison_candidate_count: matches.length,
      comparison_candidate_set_codes: buildCandidateSetCodes(matches),
      action_bucket: classifyActionBucket(row),
    };
  }

  return {
    ...row,
    comparison_status: 'UNMATCHED',
    comparison_candidate_count: 0,
    comparison_candidate_set_codes: null,
    action_bucket: classifyActionBucket(row),
  };
}

async function fetchAllCardPrints(supabase) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(CARD_PRINTS_TABLE)
      .select('id,gv_id,name,number,number_plain,set_code')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []).map((row) => ({
      id: row.id,
      gv_id: normalizeTextOrNull(row.gv_id),
      name: normalizeTextOrNull(row.name),
      number: normalizeTextOrNull(row.number),
      number_plain: normalizeTextOrNull(row.number_plain),
      set_code: normalizeTextOrNull(row.set_code),
    }));

    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchRawRows(supabase, options) {
  const rows = [];
  let from = 0;

  while (options.limit == null || rows.length < options.limit) {
    let query = supabase
      .from(RAW_IMPORTS_TABLE)
      .select('id,payload')
      .eq('source', SOURCE)
      .eq('payload->>_kind', KIND)
      .order('id', { ascending: true });

    if (options.setId) {
      query = query.eq('payload->>set', options.setId);
    }

    const rangeStart = options.offset + from;
    const rangeEnd = rangeStart + PAGE_SIZE - 1;
    const { data, error } = await query.range(rangeStart, rangeEnd);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return options.limit == null ? rows : rows.slice(0, options.limit);
}

async function fetchActiveExternalIds(supabase, source, externalIds) {
  const matched = new Set();
  const uniqueIds = [...new Set(externalIds.map((value) => normalizeTextOrNull(value)).filter(Boolean))];

  for (const chunk of chunkArray(uniqueIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from(EXTERNAL_MAPPINGS_TABLE)
      .select('external_id')
      .eq('source', source)
      .eq('active', true)
      .in('external_id', chunk);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const externalId = normalizeTextOrNull(row.external_id);
      if (externalId) {
        matched.add(externalId);
      }
    }
  }

  return matched;
}

function printSummary(results, options) {
  const summary = {
    rowsScanned: results.length,
    matchedCount: 0,
    ambiguousCount: 0,
    unmatchedCount: 0,
  };

  const bucketCounts = {
    CELC_VERIFY: 0,
    TK_KIT_TARGET: 0,
    BATTLE_ACADEMY_VERIFY: 0,
    DECK_EXCLUSIVE_VERIFY: 0,
    OTHER: 0,
  };

  const bucketSamples = {
    CELC_VERIFY: [],
    TK_KIT_TARGET: [],
    BATTLE_ACADEMY_VERIFY: [],
    DECK_EXCLUSIVE_VERIFY: [],
    OTHER: [],
  };

  for (const row of results) {
    if (row.comparison_status === 'MATCHED') {
      summary.matchedCount += 1;
      continue;
    }

    if (row.comparison_status === 'AMBIGUOUS') {
      summary.ambiguousCount += 1;
    } else {
      summary.unmatchedCount += 1;
    }

    bucketCounts[row.action_bucket] += 1;

    if (options.verbose && bucketSamples[row.action_bucket].length < 20) {
      bucketSamples[row.action_bucket].push(row);
    }
  }

  console.log(`[justtcg-bucket] rows_scanned=${summary.rowsScanned}`);
  console.log(`[justtcg-bucket] matched_count=${summary.matchedCount}`);
  console.log(`[justtcg-bucket] ambiguous_count=${summary.ambiguousCount}`);
  console.log(`[justtcg-bucket] unmatched_count=${summary.unmatchedCount}`);
  console.log(`[justtcg-bucket] CELC_VERIFY=${bucketCounts.CELC_VERIFY}`);
  console.log(`[justtcg-bucket] TK_KIT_TARGET=${bucketCounts.TK_KIT_TARGET}`);
  console.log(`[justtcg-bucket] BATTLE_ACADEMY_VERIFY=${bucketCounts.BATTLE_ACADEMY_VERIFY}`);
  console.log(`[justtcg-bucket] DECK_EXCLUSIVE_VERIFY=${bucketCounts.DECK_EXCLUSIVE_VERIFY}`);
  console.log(`[justtcg-bucket] OTHER=${bucketCounts.OTHER}`);

  if (!options.verbose) {
    return;
  }

  for (const bucket of ACTION_BUCKETS) {
    console.log(`[justtcg-bucket][bucket=${bucket}] sample_count=${bucketSamples[bucket].length}`);
    for (const sample of bucketSamples[bucket]) {
      console.log(`[justtcg-bucket][sample] ${JSON.stringify(sample)}`);
    }
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  const [cardPrints, rawRows] = await Promise.all([
    fetchAllCardPrints(supabase),
    fetchRawRows(supabase, options),
  ]);

  const normalizedRows = rawRows.map((row) => normalizeRawRow(row));
  const [matchedJusttcgIds, matchedTcgplayerIds] = await Promise.all([
    fetchActiveExternalIds(
      supabase,
      'justtcg',
      normalizedRows.map((row) => row.justtcg_card_id),
    ),
    fetchActiveExternalIds(
      supabase,
      'tcgplayer',
      normalizedRows.map((row) => row.tcgplayer_id),
    ),
  ]);

  const structuredIndex = buildStructuredIndexes(cardPrints);
  const results = normalizedRows.map((row) =>
    compareRow(row, matchedJusttcgIds, matchedTcgplayerIds, structuredIndex),
  );

  printSummary(results, options);
}

run().catch((error) => {
  console.error('[justtcg-bucket] Fatal error:', error);
  process.exit(1);
});
