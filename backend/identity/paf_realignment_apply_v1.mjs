import '../env.mjs';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const BATCH_SIZE = 150;
const BASE_SET_CODE_IDENTITY = 'sv04.5';
const SHINY_SET_CODE = 'sv4pt5';
const EXPECTED_BASE_CANDIDATE_COUNT = 245;
const EXPECTED_SHINY_CANDIDATE_COUNT = 245;
const EXPECTED_OVERLAP_COUNT = 146;
const EXPECTED_BASE_DUPLICATE_PRINTED_NUMBER_GROUPS = 0;
const EXPECTED_PROPOSED_SHINY_SUFFIX_COLLISION_COUNT = 0;
const EXPECTED_PROPOSED_BASE_POST_REALIGN_COLLISION_COUNT = 0;
const EXPECTED_OUT_OF_SCOPE_COLLISION_COUNT = 0;

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNameKey(value) {
  return normalizeTextOrNull(value)
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase() ?? null;
}

function buildOverlapKey(number, name) {
  return `${normalizeTextOrNull(number) ?? ''}||${normalizeNameKey(name) ?? ''}`;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildDuplicateRows(items, getKey, keyLabel) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, rowCount]) => rowCount > 1)
    .map(([key, rowCount]) => ({
      [keyLabel]: key,
      row_count: rowCount,
    }))
    .sort((left, right) => String(left[keyLabel]).localeCompare(String(right[keyLabel]), 'en'));
}

async function loadSetRows(client) {
  const sql = `
    select
      id,
      code,
      name,
      printed_set_abbrev,
      printed_total
    from public.sets
    where code = any($1::text[])
    order by code, id
  `;

  const { rows } = await client.query(sql, [[BASE_SET_CODE_IDENTITY, SHINY_SET_CODE]]);
  return rows;
}

async function loadBaseLane(client) {
  const sql = `
    select
      cp.id as card_print_id,
      cp.name,
      cp.gv_id,
      cp.variant_key,
      cpi.printed_number,
      cpi.identity_domain,
      s.printed_set_abbrev
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    join public.sets s
      on s.id = cp.set_id
    where cpi.is_active = true
      and cpi.set_code_identity = $1
      and cp.gv_id is null
    order by cpi.printed_number, cp.id
  `;

  const { rows } = await client.query(sql, [BASE_SET_CODE_IDENTITY]);
  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    name: row.name,
    gv_id: row.gv_id,
    variant_key: row.variant_key,
    printed_number: row.printed_number,
    identity_domain: row.identity_domain,
    printed_set_abbrev: row.printed_set_abbrev,
    overlap_key: buildOverlapKey(row.printed_number, row.name),
  }));
}

async function loadShinyLane(client) {
  const sql = `
    select
      cp.id as card_print_id,
      cp.name,
      cp.number as printed_number,
      cp.gv_id,
      cp.variant_key,
      s.printed_set_abbrev
    from public.card_prints cp
    join public.sets s
      on s.id = cp.set_id
    where cp.set_code = $1
      and cp.gv_id is not null
    order by cp.number, cp.id
  `;

  const { rows } = await client.query(sql, [SHINY_SET_CODE]);
  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    name: row.name,
    printed_number: row.printed_number,
    gv_id: row.gv_id,
    variant_key: row.variant_key,
    printed_set_abbrev: row.printed_set_abbrev,
    overlap_key: buildOverlapKey(row.printed_number, row.name),
  }));
}

function buildCandidateMaps(baseLane, shinyLane) {
  const baseDuplicatePrintedNumberRows = buildDuplicateRows(
    baseLane,
    (row) => row.printed_number,
    'printed_number',
  );

  const baseByOverlapKey = new Map(baseLane.map((row) => [row.overlap_key, row]));
  const shinyByOverlapKey = new Map(shinyLane.map((row) => [row.overlap_key, row]));

  const overlapRows = [];
  const nonOverlappingShinyRows = [];
  const nonOverlappingBaseRows = [];

  for (const shinyRow of shinyLane) {
    const baseRow = baseByOverlapKey.get(shinyRow.overlap_key) ?? null;
    if (baseRow) {
      overlapRows.push({
        overlap_key: shinyRow.overlap_key,
        printed_number: shinyRow.printed_number,
        name: shinyRow.name,
        base_card_print_id: baseRow.card_print_id,
        base_old_gv_id: baseRow.gv_id,
        shiny_card_print_id: shinyRow.card_print_id,
        shiny_old_gv_id: shinyRow.gv_id,
        base_target_gv_id: buildCardPrintGvIdV1({
          printedSetAbbrev: baseRow.printed_set_abbrev,
          number: baseRow.printed_number,
        }),
        shiny_target_gv_id: buildCardPrintGvIdV1({
          printedSetAbbrev: shinyRow.printed_set_abbrev,
          number: shinyRow.printed_number,
          variantKey: 'shiny',
        }),
      });
    } else {
      nonOverlappingShinyRows.push({
        card_print_id: shinyRow.card_print_id,
        printed_number: shinyRow.printed_number,
        name: shinyRow.name,
        old_gv_id: shinyRow.gv_id,
        proposed_shiny_gv_id: buildCardPrintGvIdV1({
          printedSetAbbrev: shinyRow.printed_set_abbrev,
          number: shinyRow.printed_number,
          variantKey: 'shiny',
        }),
      });
    }
  }

  for (const baseRow of baseLane) {
    if (!shinyByOverlapKey.has(baseRow.overlap_key)) {
      nonOverlappingBaseRows.push({
        card_print_id: baseRow.card_print_id,
        printed_number: baseRow.printed_number,
        name: baseRow.name,
        base_target_gv_id: buildCardPrintGvIdV1({
          printedSetAbbrev: baseRow.printed_set_abbrev,
          number: baseRow.printed_number,
        }),
      });
    }
  }

  const shinyReassignmentMap = shinyLane.map((row) => ({
    card_print_id: row.card_print_id,
    printed_number: row.printed_number,
    name: row.name,
    expected_old_gv_id: row.gv_id,
    proposed_gv_id: buildCardPrintGvIdV1({
      printedSetAbbrev: row.printed_set_abbrev,
      number: row.printed_number,
      variantKey: 'shiny',
    }),
  }));

  const basePromotionMap = baseLane.map((row) => ({
    card_print_id: row.card_print_id,
    printed_number: row.printed_number,
    name: row.name,
    expected_old_gv_id: null,
    proposed_gv_id: buildCardPrintGvIdV1({
      printedSetAbbrev: row.printed_set_abbrev,
      number: row.printed_number,
    }),
  }));

  return {
    baseDuplicatePrintedNumberRows,
    overlapRows,
    nonOverlappingShinyRows,
    nonOverlappingBaseRows,
    shinyReassignmentMap,
    basePromotionMap,
  };
}

async function loadLiveCollisions(client, gvIds, excludedCardPrintIds = []) {
  if (gvIds.length === 0) {
    return [];
  }

  const sql = `
    select
      id,
      set_code,
      name,
      number,
      gv_id
    from public.card_prints
    where gv_id = any($1::text[])
      and (
        coalesce(array_length($2::uuid[], 1), 0) = 0
        or id <> all($2::uuid[])
      )
    order by gv_id, id
  `;

  const { rows } = await client.query(sql, [gvIds, excludedCardPrintIds]);
  return rows;
}

function buildSummary(payload) {
  const {
    setRows,
    baseLane,
    shinyLane,
    baseDuplicatePrintedNumberRows,
    overlapRows,
    nonOverlappingShinyRows,
    nonOverlappingBaseRows,
    shinyReassignmentMap,
    basePromotionMap,
    proposedShinySuffixCollisions,
    proposedBasePostRealignCollisions,
    outOfScopeCollisions,
  } = payload;

  const baseSet = setRows.find((row) => row.code === BASE_SET_CODE_IDENTITY) ?? null;
  const shinySet = setRows.find((row) => row.code === SHINY_SET_CODE) ?? null;

  const stopReasons = [];

  if (baseLane.length !== EXPECTED_BASE_CANDIDATE_COUNT) {
    stopReasons.push(`BASE_CANDIDATE_COUNT:${baseLane.length}`);
  }
  if (shinyLane.length !== EXPECTED_SHINY_CANDIDATE_COUNT) {
    stopReasons.push(`SHINY_CANDIDATE_COUNT:${shinyLane.length}`);
  }
  if (overlapRows.length !== EXPECTED_OVERLAP_COUNT) {
    stopReasons.push(`OVERLAP_COUNT:${overlapRows.length}`);
  }
  if (baseDuplicatePrintedNumberRows.length !== EXPECTED_BASE_DUPLICATE_PRINTED_NUMBER_GROUPS) {
    stopReasons.push(`BASE_DUPLICATE_PRINTED_NUMBER_GROUPS:${baseDuplicatePrintedNumberRows.length}`);
  }
  if (proposedShinySuffixCollisions.length !== EXPECTED_PROPOSED_SHINY_SUFFIX_COLLISION_COUNT) {
    stopReasons.push(`PROPOSED_SHINY_SUFFIX_COLLISIONS:${proposedShinySuffixCollisions.length}`);
  }
  if (
    proposedBasePostRealignCollisions.length !==
    EXPECTED_PROPOSED_BASE_POST_REALIGN_COLLISION_COUNT
  ) {
    stopReasons.push(
      `PROPOSED_BASE_POST_REALIGN_COLLISIONS:${proposedBasePostRealignCollisions.length}`,
    );
  }
  if (outOfScopeCollisions.length !== EXPECTED_OUT_OF_SCOPE_COLLISION_COUNT) {
    stopReasons.push(`OUT_OF_SCOPE_COLLISIONS:${outOfScopeCollisions.length}`);
  }
  if (nonOverlappingShinyRows.length > 0) {
    stopReasons.push(`NON_OVERLAPPING_SHINY_ROWS:${nonOverlappingShinyRows.length}`);
  }
  if (!baseSet || normalizeTextOrNull(baseSet.printed_set_abbrev) !== 'PAF') {
    stopReasons.push('BASE_PRINTED_SET_ABBREV_NOT_PROVEN_PAF');
  }
  if (!shinySet || normalizeTextOrNull(shinySet.printed_set_abbrev) !== 'PAF') {
    stopReasons.push('SHINY_PRINTED_SET_ABBREV_NOT_PROVEN_PAF');
  }

  return {
    mode: MODE,
    base_set: baseSet
      ? {
          code: baseSet.code,
          name: baseSet.name,
          printed_set_abbrev: baseSet.printed_set_abbrev,
          printed_total: baseSet.printed_total,
        }
      : null,
    shiny_set: shinySet
      ? {
          code: shinySet.code,
          name: shinySet.name,
          printed_set_abbrev: shinySet.printed_set_abbrev,
          printed_total: shinySet.printed_total,
        }
      : null,
    base_candidate_count: baseLane.length,
    shiny_candidate_count: shinyLane.length,
    overlap_count: overlapRows.length,
    non_overlapping_shiny_count: nonOverlappingShinyRows.length,
    non_overlapping_base_count: nonOverlappingBaseRows.length,
    base_duplicate_printed_number_group_count: baseDuplicatePrintedNumberRows.length,
    proposed_shiny_suffix_collision_count: proposedShinySuffixCollisions.length,
    proposed_base_post_realign_collision_count: proposedBasePostRealignCollisions.length,
    out_of_scope_collision_count: outOfScopeCollisions.length,
    shiny_reassignment_map_count: shinyReassignmentMap.length,
    base_promotion_map_count: basePromotionMap.length,
    safe_to_apply: stopReasons.length === 0,
    stop_reasons: stopReasons,
    sample_overlap_rows: overlapRows.slice(0, 25),
    sample_non_overlapping_shiny_rows: nonOverlappingShinyRows.slice(0, 25),
    sample_base_promotion_rows: basePromotionMap.slice(0, 25),
  };
}

async function updateShinyBatch(client, batchRows) {
  const payload = JSON.stringify(batchRows);

  const sql = `
    update public.card_prints cp
    set gv_id = batch.proposed_gv_id
    from jsonb_to_recordset($1::jsonb) as batch(
      card_print_id uuid,
      printed_number text,
      name text,
      expected_old_gv_id text,
      proposed_gv_id text
    )
    where cp.id = batch.card_print_id
      and cp.gv_id = batch.expected_old_gv_id
    returning cp.id as card_print_id, cp.gv_id
  `;

  const { rows } = await client.query(sql, [payload]);
  if (rows.length !== batchRows.length) {
    throw new Error(`SHINY_BATCH_ROWCOUNT_MISMATCH:${rows.length}:${batchRows.length}`);
  }
}

async function updateBaseBatch(client, batchRows) {
  const payload = JSON.stringify(batchRows);

  const sql = `
    update public.card_prints cp
    set gv_id = batch.proposed_gv_id
    from jsonb_to_recordset($1::jsonb) as batch(
      card_print_id uuid,
      printed_number text,
      name text,
      expected_old_gv_id text,
      proposed_gv_id text
    )
    where cp.id = batch.card_print_id
      and cp.gv_id is null
    returning cp.id as card_print_id, cp.gv_id
  `;

  const { rows } = await client.query(sql, [payload]);
  if (rows.length !== batchRows.length) {
    throw new Error(`BASE_BATCH_ROWCOUNT_MISMATCH:${rows.length}:${batchRows.length}`);
  }
}

async function loadPostApplyCounts(client) {
  const sql = `
    select json_build_object(
      'base_promoted_count', (
        select count(*)::int
        from public.card_prints
        where set_code = $1
          and gv_id like 'GV-PK-PAF-%'
      ),
      'shiny_suffixed_count', (
        select count(*)::int
        from public.card_prints
        where set_code = $2
          and gv_id like 'GV-PK-PAF-%-S'
      ),
      'remaining_null_base_count', (
        select count(*)::int
        from public.card_prints cp
        join public.card_print_identity cpi on cpi.card_print_id = cp.id
        where cpi.is_active = true
          and cpi.set_code_identity = $1
          and cp.gv_id is null
      ),
      'remaining_unsuffixed_shiny_count', (
        select count(*)::int
        from public.card_prints
        where set_code = $2
          and gv_id like 'GV-PK-PAF-%'
          and gv_id not like 'GV-PK-PAF-%-S'
      ),
      'active_identity_total', (
        select count(*)::int
        from public.card_print_identity
        where is_active = true
      )
    ) as payload
  `;

  const { rows } = await client.query(sql, [BASE_SET_CODE_IDENTITY, SHINY_SET_CODE]);
  return rows[0]?.payload ?? null;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `paf_realignment_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    const [setRows, baseLane, shinyLane] = await Promise.all([
      loadSetRows(client),
      loadBaseLane(client),
      loadShinyLane(client),
    ]);

    const {
      baseDuplicatePrintedNumberRows,
      overlapRows,
      nonOverlappingShinyRows,
      nonOverlappingBaseRows,
      shinyReassignmentMap,
      basePromotionMap,
    } = buildCandidateMaps(baseLane, shinyLane);

    const proposedShinySuffixDuplicates = buildDuplicateRows(
      shinyReassignmentMap,
      (row) => row.proposed_gv_id,
      'proposed_gv_id',
    );
    const proposedShinySuffixCollisions = await loadLiveCollisions(
      client,
      shinyReassignmentMap.map((row) => row.proposed_gv_id),
      shinyReassignmentMap.map((row) => row.card_print_id),
    );

    const proposedBasePostRealignCollisions = await loadLiveCollisions(
      client,
      basePromotionMap.map((row) => row.proposed_gv_id),
      shinyReassignmentMap.map((row) => row.card_print_id),
    );
    const outOfScopeCollisions = (await loadLiveCollisions(
      client,
      Array.from(
        new Set([
          ...basePromotionMap.map((row) => row.proposed_gv_id),
          ...shinyReassignmentMap.map((row) => row.proposed_gv_id),
        ]),
      ),
    )).filter(
      (row) =>
        row.set_code !== BASE_SET_CODE_IDENTITY &&
        row.set_code !== SHINY_SET_CODE,
    );

    const summary = buildSummary({
      setRows,
      baseLane,
      shinyLane,
      baseDuplicatePrintedNumberRows,
      overlapRows,
      nonOverlappingShinyRows,
      nonOverlappingBaseRows,
      shinyReassignmentMap,
      basePromotionMap,
      proposedShinySuffixCollisions: [
        ...proposedShinySuffixDuplicates,
        ...proposedShinySuffixCollisions,
      ],
      proposedBasePostRealignCollisions,
      outOfScopeCollisions,
    });

    console.log(JSON.stringify(summary, null, 2));

    if (!summary.safe_to_apply) {
      throw new Error(`PAF_REALIGNMENT_STOP:${summary.stop_reasons.join(',')}`);
    }

    if (MODE !== 'apply') {
      return;
    }

    await client.query('begin');
    try {
      for (const batchRows of chunk(shinyReassignmentMap, BATCH_SIZE)) {
        await updateShinyBatch(client, batchRows);
      }

      const namespaceStillOccupied = await loadLiveCollisions(
        client,
        overlapRows.map((row) => row.base_target_gv_id),
        shinyReassignmentMap.map((row) => row.card_print_id),
      );
      if (namespaceStillOccupied.length > 0) {
        throw new Error(`PAF_NAMESPACE_NOT_FREED:${namespaceStillOccupied.length}`);
      }

      for (const batchRows of chunk(basePromotionMap, BATCH_SIZE)) {
        await updateBaseBatch(client, batchRows);
      }

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }

    const postApplyCounts = await loadPostApplyCounts(client);
    console.log(JSON.stringify({ post_apply: postApplyCounts }, null, 2));
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
