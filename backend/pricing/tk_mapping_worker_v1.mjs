import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

const RAW_IMPORTS_TABLE = 'raw_imports';
const CARD_PRINTS_TABLE = 'card_prints';
const EXTERNAL_MAPPINGS_TABLE = 'external_mappings';
const SOURCE = 'justtcg';
const KIND = 'card';
const PAGE_SIZE = 1000;
const LOOKUP_CHUNK_SIZE = 50;

const TK_SET_MAP = {
  'bw-trainer-kit-excadrill-zoroark-pokemon': ['tk-bw-e', 'tk-bw-z'],
  'dp-trainer-kit-manaphy-lucario-pokemon': ['tk-dp-l', 'tk-dp-m'],
  'hgss-trainer-kit-gyarados-raichu-pokemon': ['tk-hs-g', 'tk-hs-r'],
  'ex-trainer-kit-1-latias-latios-pokemon': ['tk-ex-latia', 'tk-ex-latio'],
  'ex-trainer-kit-2-plusle-minun-pokemon': ['tk-ex-m', 'tk-ex-p'],
  'sm-trainer-kit-alolan-sandslash-alolan-ninetales-pokemon': ['tk-sm-l', 'tk-sm-r'],
  'sm-trainer-kit-lycanroc-alolan-raichu-pokemon': ['tk-sm-l', 'tk-sm-r'],
};

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
    throw new Error(`[tk-mapping] ${label} must be a non-negative integer.`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    apply: false,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--apply') {
      options.apply = true;
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

async function fetchTkRawRows(supabase) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(RAW_IMPORTS_TABLE)
      .select('id,payload')
      .eq('source', SOURCE)
      .eq('payload->>_kind', KIND)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []).filter((row) =>
      (row?.payload?.set ?? '').toLowerCase().includes('trainer-kit'),
    );

    rows.push(...batch);

    if ((data ?? []).length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAlreadyMappedExternalIds(supabase, externalIds) {
  const mapped = new Set();
  const uniqueIds = [...new Set(externalIds.map((value) => normalizeTextOrNull(value)).filter(Boolean))];

  for (const chunk of chunkArray(uniqueIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from(EXTERNAL_MAPPINGS_TABLE)
      .select('external_id')
      .eq('source', SOURCE)
      .eq('active', true)
      .in('external_id', chunk);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const externalId = normalizeTextOrNull(row.external_id);
      if (externalId) {
        mapped.add(externalId);
      }
    }
  }

  return mapped;
}

async function fetchCardPrintsBySetCodes(supabase, setCodes) {
  const rows = [];

  for (const chunk of chunkArray([...new Set(setCodes)].filter(Boolean), LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from(CARD_PRINTS_TABLE)
      .select('id,gv_id,set_code,number,name')
      .in('set_code', chunk)
      .order('set_code', { ascending: true })
      .order('number', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    rows.push(
      ...(data ?? []).map((row) => ({
        id: row.id,
        gv_id: normalizeTextOrNull(row.gv_id),
        set_code: normalizeTextOrNull(row.set_code),
        number: normalizeTextOrNull(row.number),
        name: normalizeTextOrNull(row.name),
      })),
    );
  }

  return rows;
}

function buildIndex(cardPrints) {
  const index = new Map();
  for (const row of cardPrints) {
    const key = `${row.set_code}::${row.number}`;
    if (!index.has(key)) {
      index.set(key, []);
    }
    index.get(key).push(row);
  }
  return index;
}

function extractSlot(numberRaw) {
  const raw = normalizeTextOrNull(numberRaw);
  if (!raw) {
    return { slot: null, reason: 'INVALID_SLOT' };
  }

  const [left] = raw.split('/');
  const parsed = Number.parseInt(left, 10);
  if (!Number.isInteger(parsed) || Number.isNaN(parsed)) {
    return { slot: null, reason: 'INVALID_SLOT' };
  }

  return { slot: String(parsed), reason: null };
}

function classifyRow(rawRow, cardPrintIndex) {
  const payload = rawRow?.payload ?? {};
  const justtcgCardId = normalizeTextOrNull(payload.id);
  const justtcgSetId = normalizeTextOrNull(payload.set);
  const justtcgNameRaw = normalizeTextOrNull(payload.name);
  const justtcgNumberRaw = normalizeTextOrNull(payload.number);

  if (!justtcgCardId || !justtcgSetId) {
    return {
      raw_import_id: rawRow.id,
      justtcg_card_id: justtcgCardId,
      justtcg_set_id: justtcgSetId,
      justtcg_name_raw: justtcgNameRaw,
      justtcg_number_raw: justtcgNumberRaw,
      slot: null,
      matched_count: 0,
      status: 'NO_MATCH',
      reason: 'MISSING_IDENTITY',
      matches: [],
    };
  }

  const routedSets = TK_SET_MAP[justtcgSetId] ?? null;
  if (!routedSets) {
    return {
      raw_import_id: rawRow.id,
      justtcg_card_id: justtcgCardId,
      justtcg_set_id: justtcgSetId,
      justtcg_name_raw: justtcgNameRaw,
      justtcg_number_raw: justtcgNumberRaw,
      slot: null,
      matched_count: 0,
      status: 'NO_MATCH',
      reason: 'UNMAPPED_SET',
      matches: [],
    };
  }

  const { slot, reason } = extractSlot(justtcgNumberRaw);
  if (!slot) {
    return {
      raw_import_id: rawRow.id,
      justtcg_card_id: justtcgCardId,
      justtcg_set_id: justtcgSetId,
      justtcg_name_raw: justtcgNameRaw,
      justtcg_number_raw: justtcgNumberRaw,
      slot: null,
      matched_count: 0,
      status: 'NO_MATCH',
      reason,
      matches: [],
    };
  }

  const matches = [];
  for (const setCode of routedSets) {
    const key = `${setCode}::${slot}`;
    matches.push(...(cardPrintIndex.get(key) ?? []));
  }

  if (matches.length === 1) {
    return {
      raw_import_id: rawRow.id,
      justtcg_card_id: justtcgCardId,
      justtcg_set_id: justtcgSetId,
      justtcg_name_raw: justtcgNameRaw,
      justtcg_number_raw: justtcgNumberRaw,
      slot,
      matched_count: 1,
      status: 'MATCHED',
      reason: 'SLOT_MATCH',
      matches,
    };
  }

  if (matches.length > 1) {
    return {
      raw_import_id: rawRow.id,
      justtcg_card_id: justtcgCardId,
      justtcg_set_id: justtcgSetId,
      justtcg_name_raw: justtcgNameRaw,
      justtcg_number_raw: justtcgNumberRaw,
      slot,
      matched_count: matches.length,
      status: 'AMBIGUOUS',
      reason: 'MULTIPLE_SLOT_MATCHES',
      matches,
    };
  }

  return {
    raw_import_id: rawRow.id,
    justtcg_card_id: justtcgCardId,
    justtcg_set_id: justtcgSetId,
    justtcg_name_raw: justtcgNameRaw,
    justtcg_number_raw: justtcgNumberRaw,
    slot,
    matched_count: 0,
    status: 'NO_MATCH',
    reason: 'NO_SLOT_MATCH',
    matches: [],
  };
}

function printSummary(results, options) {
  const summary = {
    scanned: results.length,
    matched: 0,
    ambiguous: 0,
    noMatch: 0,
  };

  const samples = {
    MATCHED: [],
    AMBIGUOUS: [],
    NO_MATCH: [],
  };

  for (const row of results) {
    if (row.status === 'MATCHED') {
      summary.matched += 1;
    } else if (row.status === 'AMBIGUOUS') {
      summary.ambiguous += 1;
    } else {
      summary.noMatch += 1;
    }

    if (options.verbose && samples[row.status].length < 20) {
      samples[row.status].push({
        justtcg_card_id: row.justtcg_card_id,
        justtcg_set_id: row.justtcg_set_id,
        justtcg_name_raw: row.justtcg_name_raw,
        justtcg_number_raw: row.justtcg_number_raw,
        slot: row.slot,
        matched_count: row.matched_count,
        reason: row.reason,
        matches: row.matches.map((match) => ({
          card_print_id: match.id,
          gv_id: match.gv_id,
          set_code: match.set_code,
          number: match.number,
          name: match.name,
        })),
      });
    }
  }

  console.log(`[tk-mapping] rows_scanned=${summary.scanned}`);
  console.log(`[tk-mapping] matched_count=${summary.matched}`);
  console.log(`[tk-mapping] ambiguous_count=${summary.ambiguous}`);
  console.log(`[tk-mapping] no_match_count=${summary.noMatch}`);

  if (!options.verbose) {
    return;
  }

  for (const status of ['MATCHED', 'AMBIGUOUS', 'NO_MATCH']) {
    console.log(`[tk-mapping][status=${status}] sample_count=${samples[status].length}`);
    for (const sample of samples[status]) {
      console.log(`[tk-mapping][sample] ${JSON.stringify(sample)}`);
    }
  }
}

async function applyMappings(supabase, matchedRows) {
  for (const row of matchedRows) {
    const match = row.matches[0];
    const { error } = await supabase
      .from(EXTERNAL_MAPPINGS_TABLE)
      .upsert(
        {
          card_print_id: match.id,
          source: SOURCE,
          external_id: row.justtcg_card_id,
          active: true,
          meta: {
            source: 'tk_mapping_worker_v1',
            justtcg_set: row.justtcg_set_id,
            slot: row.slot,
          },
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'source,external_id' },
      );

    if (error) {
      throw error;
    }
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  if (!options.apply) {
    console.log('[tk-mapping] Dry run. Use --apply to execute.');
  }

  const rawRows = await fetchTkRawRows(supabase);
  const externalIds = rawRows.map((row) => row?.payload?.id);
  const alreadyMapped = await fetchAlreadyMappedExternalIds(supabase, externalIds);
  const scopedRows = rawRows.filter((row) => {
    const externalId = normalizeTextOrNull(row?.payload?.id);
    return externalId && !alreadyMapped.has(externalId);
  });

  const routedSetCodes = [...new Set(Object.values(TK_SET_MAP).flat())];
  const cardPrints = await fetchCardPrintsBySetCodes(supabase, routedSetCodes);
  const cardPrintIndex = buildIndex(cardPrints);
  const results = scopedRows.map((row) => classifyRow(row, cardPrintIndex));

  printSummary(results, options);

  const blockers = results.filter((row) => row.status !== 'MATCHED');
  if (blockers.length > 0) {
    const first = blockers[0];
    throw new Error(
      `[tk-mapping] STOP: ${first.status} for ${first.justtcg_card_id ?? 'unknown'} (${first.reason}).`,
    );
  }

  if (!options.apply) {
    return;
  }

  await applyMappings(
    supabase,
    results.filter((row) => row.status === 'MATCHED'),
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
