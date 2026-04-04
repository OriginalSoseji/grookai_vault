import '../env.mjs';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const TARGET_SET_CODE_IDENTITY = 'sv04.5';
const EXCLUDED_SHINY_SET_CODE = 'sv4pt5';
const EXPECTED_CANDIDATE_COUNT = 245;
const EXPECTED_DUPLICATE_PRINTED_NUMBER_GROUPS = 0;
const EXPECTED_EXACT_CANONICAL_OVERLAP_EXCLUDING_SV4PT5 = 0;
const EXPECTED_INTERNAL_COLLISION_COUNT = 0;
const BATCH_SIZE = 250;

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function sortRowsByPrintedNumber(left, right) {
  const leftNumber = normalizeTextOrNull(left.printed_number) ?? '';
  const rightNumber = normalizeTextOrNull(right.printed_number) ?? '';
  const numberOrder = leftNumber.localeCompare(rightNumber, 'en', { numeric: true });
  if (numberOrder !== 0) {
    return numberOrder;
  }
  return String(left.card_print_id).localeCompare(String(right.card_print_id));
}

function groupDuplicateCounts(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, row_count]) => ({ key, row_count }));
}

async function loadSetRows(client) {
  const sql = `
    select
      id,
      code,
      name,
      game,
      printed_set_abbrev,
      printed_total,
      source,
      set_role
    from public.sets
    where code = any($1::text[])
    order by code, id
  `;

  const { rows } = await client.query(sql, [[TARGET_SET_CODE_IDENTITY, EXCLUDED_SHINY_SET_CODE]]);
  return rows;
}

async function loadSourceRows(client) {
  const sql = `
    select
      cp.id as card_print_id,
      cp.name,
      cp.gv_id,
      cp.variant_key,
      cpi.identity_domain,
      cpi.set_code_identity,
      cpi.printed_number,
      cpi.normalized_printed_name,
      s.printed_set_abbrev
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    join public.sets s
      on s.id = cp.set_id
    where cpi.is_active = true
      and cpi.identity_domain = 'pokemon_eng_standard'
      and cpi.set_code_identity = $1
      and cp.gv_id is null
    order by cpi.printed_number, cp.id
  `;

  const { rows } = await client.query(sql, [TARGET_SET_CODE_IDENTITY]);
  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    name: row.name,
    gv_id: row.gv_id,
    variant_key: row.variant_key,
    identity_domain: row.identity_domain,
    set_code_identity: row.set_code_identity,
    printed_number: row.printed_number,
    normalized_printed_name: row.normalized_printed_name,
    printed_set_abbrev: row.printed_set_abbrev,
  }));
}

async function loadExactCanonicalOverlapExcludingSv4pt5(client) {
  const sql = `
    select
      source.card_print_id,
      source.name,
      source.printed_number,
      canon.id as canonical_card_print_id,
      canon.set_code as canonical_set_code,
      canon.number as canonical_number,
      canon.name as canonical_name,
      canon.gv_id
    from (
      select
        cp.id as card_print_id,
        cp.name,
        cpi.printed_number,
        cpi.normalized_printed_name
      from public.card_print_identity cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = 'pokemon_eng_standard'
        and cpi.set_code_identity = $1
        and cp.gv_id is null
    ) source
    join public.card_prints canon
      on canon.gv_id is not null
     and canon.set_code = $1
     and canon.number = source.printed_number
     and lower(regexp_replace(btrim(canon.name), '\\s+', ' ', 'g')) = source.normalized_printed_name
    order by source.printed_number, source.card_print_id
  `;

  const { rows } = await client.query(sql, [TARGET_SET_CODE_IDENTITY]);
  return rows;
}

async function loadSv4pt5SameNumberSameNameRows(client) {
  const sql = `
    with source as (
      select
        cp.id as card_print_id,
        cp.name,
        cpi.printed_number,
        cpi.normalized_printed_name
      from public.card_print_identity cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = 'pokemon_eng_standard'
        and cpi.set_code_identity = $1
        and cp.gv_id is null
    )
    select
      source.card_print_id,
      source.name,
      source.printed_number,
      shiny.id as shiny_card_print_id,
      shiny.number as shiny_number,
      shiny.name as shiny_name,
      shiny.gv_id
    from source
    join public.card_prints shiny
      on shiny.gv_id is not null
     and shiny.set_code = $2
     and shiny.number = source.printed_number
     and lower(regexp_replace(btrim(shiny.name), '\\s+', ' ', 'g')) = source.normalized_printed_name
    order by source.printed_number, source.card_print_id
  `;

  const { rows } = await client.query(sql, [TARGET_SET_CODE_IDENTITY, EXCLUDED_SHINY_SET_CODE]);
  return rows;
}

async function loadLiveGvIdRows(client, gvIds) {
  if (gvIds.length === 0) {
    return [];
  }

  const sql = `
    select
      id,
      gv_id,
      set_code,
      number,
      name
    from public.card_prints
    where gv_id = any($1::text[])
    order by gv_id, id
  `;

  const { rows } = await client.query(sql, [gvIds]);
  return rows;
}

function buildCandidateMap(sourceRows) {
  return sourceRows
    .filter((row) => /^[0-9]+$/.test(normalizeTextOrNull(row.printed_number) ?? ''))
    .map((row) => {
      const proposed_gv_id = buildCardPrintGvIdV1({
        setCode: row.set_code_identity,
        printedSetAbbrev: row.printed_set_abbrev,
        number: row.printed_number,
        variantKey: row.variant_key,
      });

      return {
        card_print_id: row.card_print_id,
        name: row.name,
        printed_number: row.printed_number,
        proposed_gv_id,
        printed_set_abbrev: row.printed_set_abbrev,
      };
    })
    .sort(sortRowsByPrintedNumber);
}

function buildSummary({ setRows, sourceRows, exactCanonicalOverlapRows, sv4pt5SameNumberSameNameRows, candidateMap, internalCollisionRows, liveCollisionRows }) {
  const targetSet = setRows.find((row) => row.code === TARGET_SET_CODE_IDENTITY) ?? null;
  const excludedSet = setRows.find((row) => row.code === EXCLUDED_SHINY_SET_CODE) ?? null;
  const printedNumberDuplicateRows = groupDuplicateCounts(sourceRows, (row) => row.printed_number)
    .map((row) => ({ printed_number: row.key, row_count: row.row_count }));
  const nonNullParentGvIdCount = sourceRows.filter((row) => normalizeTextOrNull(row.gv_id)).length;
  const candidateDistinctIds = new Set(candidateMap.map((row) => row.card_print_id)).size;
  const candidateDistinctGvIds = new Set(candidateMap.map((row) => row.proposed_gv_id)).size;
  const collisionBreakdown = Array.from(
    liveCollisionRows.reduce((acc, row) => {
      acc.set(row.live_set_code, (acc.get(row.live_set_code) ?? 0) + 1);
      return acc;
    }, new Map()),
  )
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([live_set_code, row_count]) => ({ live_set_code, row_count }));

  const failures = [];

  if (sourceRows.length !== EXPECTED_CANDIDATE_COUNT) {
    failures.push(`CANDIDATE_COUNT:${sourceRows.length}`);
  }
  if (nonNullParentGvIdCount !== 0) {
    failures.push(`NON_NULL_PARENT_GVID_ROWS:${nonNullParentGvIdCount}`);
  }
  if (printedNumberDuplicateRows.length !== EXPECTED_DUPLICATE_PRINTED_NUMBER_GROUPS) {
    failures.push(`PRINTED_NUMBER_DUPLICATE_GROUPS:${printedNumberDuplicateRows.length}`);
  }
  if (exactCanonicalOverlapRows.length !== EXPECTED_EXACT_CANONICAL_OVERLAP_EXCLUDING_SV4PT5) {
    failures.push(`EXACT_CANONICAL_OVERLAP_EXCLUDING_SV4PT5:${exactCanonicalOverlapRows.length}`);
  }
  if (!targetSet || !normalizeTextOrNull(targetSet.printed_set_abbrev)) {
    failures.push('PRINTED_SET_ABBREV_MISSING_OR_UNSTABLE');
  }
  if (internalCollisionRows.length !== EXPECTED_INTERNAL_COLLISION_COUNT) {
    failures.push(`INTERNAL_GVID_COLLISIONS:${internalCollisionRows.length}`);
  }
  if (liveCollisionRows.length > 0) {
    failures.push(`LIVE_GVID_COLLISIONS:${liveCollisionRows.length}`);
  }
  if (candidateMap.length !== candidateDistinctIds) {
    failures.push(`DUPLICATE_CARD_PRINT_ID_IN_CANDIDATE_MAP:${candidateMap.length - candidateDistinctIds}`);
  }
  if (candidateMap.length !== candidateDistinctGvIds) {
    failures.push(`DUPLICATE_PROPOSED_GVID_IN_CANDIDATE_MAP:${candidateMap.length - candidateDistinctGvIds}`);
  }

  return {
    mode: MODE,
    source_set: targetSet
      ? {
          code: targetSet.code,
          name: targetSet.name,
          printed_set_abbrev: targetSet.printed_set_abbrev,
          printed_total: targetSet.printed_total,
        }
      : null,
    excluded_shiny_set: excludedSet
      ? {
          code: excludedSet.code,
          name: excludedSet.name,
          printed_set_abbrev: excludedSet.printed_set_abbrev,
          printed_total: excludedSet.printed_total,
        }
      : null,
    candidate_count: sourceRows.length,
    candidate_map_count: candidateMap.length,
    all_candidates_parent_gvid_null: nonNullParentGvIdCount === 0,
    distinct_printed_number_count: new Set(sourceRows.map((row) => row.printed_number)).size,
    duplicate_printed_number_group_count: printedNumberDuplicateRows.length,
    exact_canonical_overlap_excluding_sv4pt5_count: exactCanonicalOverlapRows.length,
    sv4pt5_same_number_same_name_count: sv4pt5SameNumberSameNameRows.length,
    distinct_card_print_id_count: candidateDistinctIds,
    distinct_proposed_gvid_count: candidateDistinctGvIds,
    internal_collision_count: internalCollisionRows.length,
    live_collision_count: liveCollisionRows.length,
    live_collision_breakdown_by_set: collisionBreakdown,
    stop_reasons: failures,
    safe_to_apply: failures.length === 0,
    sample_candidates: candidateMap.slice(0, 25),
    sample_live_collisions: liveCollisionRows.slice(0, 25),
  };
}

async function applyBatch(client, batchRows) {
  const payload = JSON.stringify(
    batchRows.map((row) => ({
      card_print_id: row.card_print_id,
      proposed_gv_id: row.proposed_gv_id,
    })),
  );

  await client.query('begin');

  try {
    const updateSql = `
      update public.card_prints cp
      set gv_id = batch.proposed_gv_id
      from jsonb_to_recordset($1::jsonb) as batch(
        card_print_id uuid,
        proposed_gv_id text
      )
      where cp.id = batch.card_print_id
        and cp.gv_id is null
      returning cp.id as card_print_id, cp.gv_id
    `;

    const result = await client.query(updateSql, [payload]);
    if (result.rows.length !== batchRows.length) {
      throw new Error(`BATCH_UPDATE_ROWCOUNT_MISMATCH:${result.rows.length}:${batchRows.length}`);
    }

    await client.query('commit');
    return result.rows.length;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `sv04pt5_canonical_promotion_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    const [setRows, sourceRows, exactCanonicalOverlapRows, sv4pt5SameNumberSameNameRows] =
      await Promise.all([
        loadSetRows(client),
        loadSourceRows(client),
        loadExactCanonicalOverlapExcludingSv4pt5(client),
        loadSv4pt5SameNumberSameNameRows(client),
      ]);

    const candidateMap = buildCandidateMap(sourceRows);
    const internalCollisionRows = groupDuplicateCounts(candidateMap, (row) => row.proposed_gv_id).map(
      (row) => ({
        proposed_gv_id: row.key,
        row_count: row.row_count,
      }),
    );

    const liveRows = await loadLiveGvIdRows(
      client,
      candidateMap.map((row) => row.proposed_gv_id),
    );
    const liveByGvId = new Map(liveRows.map((row) => [row.gv_id, row]));
    const liveCollisionRows = candidateMap
      .filter((row) => liveByGvId.has(row.proposed_gv_id))
      .map((row) => {
        const live = liveByGvId.get(row.proposed_gv_id);
        return {
          card_print_id: row.card_print_id,
          name: row.name,
          printed_number: row.printed_number,
          printed_set_abbrev: row.printed_set_abbrev,
          proposed_gv_id: row.proposed_gv_id,
          live_card_print_id: live.id,
          live_set_code: live.set_code,
          live_number: live.number,
          live_name: live.name,
        };
      });

    const summary = buildSummary({
      setRows,
      sourceRows,
      exactCanonicalOverlapRows,
      sv4pt5SameNumberSameNameRows,
      candidateMap,
      internalCollisionRows,
      liveCollisionRows,
    });

    if (MODE !== 'apply') {
      console.log(JSON.stringify(summary, null, 2));
      if (!summary.safe_to_apply) {
        throw new Error(`SV04PT5_PHASE_STOP:${summary.stop_reasons.join(',')}`);
      }
      return;
    }

    if (!summary.safe_to_apply) {
      console.log(JSON.stringify(summary, null, 2));
      throw new Error(`SV04PT5_PHASE_STOP:${summary.stop_reasons.join(',')}`);
    }

    const batches = [];
    for (let start = 0; start < candidateMap.length; start += BATCH_SIZE) {
      const batchRows = candidateMap.slice(start, start + BATCH_SIZE);
      const appliedCount = await applyBatch(client, batchRows);
      batches.push({
        batch_number: Math.floor(start / BATCH_SIZE) + 1,
        batch_size: batchRows.length,
        applied_count: appliedCount,
      });
    }

    console.log(
      JSON.stringify(
        {
          ...summary,
          batches,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
