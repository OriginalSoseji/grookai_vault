/**
 * MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical identity outside runtime executor.
 * It is NOT part of the runtime authority system.
 *
 * RULES:
 * - must never be executed implicitly
 * - must never be called by workers
 * - must never be used in normal flows
 * - must require explicit operator intent
 */
import '../env.mjs';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

import { installIdentityMaintenanceBoundaryV1 } from './identity_maintenance_boundary_v1.mjs';

if (!process.env.ENABLE_IDENTITY_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled. Set ENABLE_IDENTITY_MAINTENANCE_MODE=true for explicit use.',
  );
}

if (process.env.IDENTITY_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'",
  );
}

if (process.env.IDENTITY_MAINTENANCE_ENTRYPOINT !== 'backend/identity/run_identity_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts must be launched from backend/identity/run_identity_maintenance_v1.mjs',
  );
}

const DRY_RUN = process.env.IDENTITY_MAINTENANCE_DRY_RUN !== 'false';
const { assertMaintenanceWriteAllowed } = installIdentityMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('IDENTITY MAINTENANCE: running in DRY RUN mode');
}

void assertMaintenanceWriteAllowed;
const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const BATCH_SIZE = 150;
const BASE_SET_CODE_IDENTITY = 'sv04.5';
const SHINY_SET_CODE = 'sv4pt5';
const EXPECTED_BASE_CANDIDATE_COUNT = 245;
const EXPECTED_SHINY_CANDIDATE_COUNT = 245;
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
    current_gv_id: row.gv_id,
    variant_key: row.variant_key,
    printed_set_abbrev: row.printed_set_abbrev,
    overlap_key: buildOverlapKey(row.printed_number, row.name),
  }));
}

function buildMaps(baseLane, shinyLane) {
  const overlapCount = (() => {
    const baseKeys = new Set(baseLane.map((row) => row.overlap_key));
    let count = 0;
    for (const row of shinyLane) {
      if (baseKeys.has(row.overlap_key)) {
        count += 1;
      }
    }
    return count;
  })();

  const baseDuplicatePrintedNumberRows = buildDuplicateRows(
    baseLane,
    (row) => row.printed_number,
    'printed_number',
  );
  const shinySuffixDuplicateRows = buildDuplicateRows(
    shinyLane.map((row) => ({
      proposed_gv_id: buildCardPrintGvIdV1({
        printedSetAbbrev: row.printed_set_abbrev,
        number: row.printed_number,
        variantKey: 'shiny',
      }),
    })),
    (row) => row.proposed_gv_id,
    'proposed_gv_id',
  );

  const basePromotionMap = baseLane.map((row) => ({
    card_print_id: row.card_print_id,
    name: row.name,
    printed_number: row.printed_number,
    expected_old_gv_id: null,
    proposed_gv_id: buildCardPrintGvIdV1({
      printedSetAbbrev: row.printed_set_abbrev,
      number: row.printed_number,
    }),
  }));

  const shinyReassignmentMap = shinyLane.map((row) => {
    const expectedUnsuffixedGvId = buildCardPrintGvIdV1({
      printedSetAbbrev: row.printed_set_abbrev,
      number: row.printed_number,
    });

    return {
      card_print_id: row.card_print_id,
      name: row.name,
      printed_number: row.printed_number,
      current_gv_id: row.current_gv_id,
      expected_old_gv_id: expectedUnsuffixedGvId,
      proposed_gv_id: buildCardPrintGvIdV1({
        printedSetAbbrev: row.printed_set_abbrev,
        number: row.printed_number,
        variantKey: 'shiny',
      }),
    };
  });

  const unexpectedShinyOldGvIdRows = shinyReassignmentMap
    .filter((row) => row.current_gv_id !== row.expected_old_gv_id)
    .map((row) => ({
      card_print_id: row.card_print_id,
      printed_number: row.printed_number,
      name: row.name,
      current_gv_id: row.current_gv_id,
      expected_old_gv_id: row.expected_old_gv_id,
    }));

  return {
    overlap_count: overlapCount,
    baseDuplicatePrintedNumberRows,
    shinySuffixDuplicateRows,
    basePromotionMap,
    shinyReassignmentMap,
    unexpectedShinyOldGvIdRows,
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

async function loadActiveIdentityTotal(client) {
  const { rows } = await client.query(`
    select count(*)::int as row_count
    from public.card_print_identity
    where is_active = true
  `);
  return Number(rows[0]?.row_count ?? 0);
}

function buildSummary(payload) {
  const {
    setRows,
    baseLane,
    shinyLane,
    overlapCount,
    baseDuplicatePrintedNumberRows,
    shinySuffixDuplicateRows,
    basePromotionMap,
    shinyReassignmentMap,
    unexpectedShinyOldGvIdRows,
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
  if (!baseSet || normalizeTextOrNull(baseSet.printed_set_abbrev) !== 'PAF') {
    stopReasons.push('BASE_PRINTED_SET_ABBREV_NOT_PROVEN_PAF');
  }
  if (!shinySet || normalizeTextOrNull(shinySet.printed_set_abbrev) !== 'PAF') {
    stopReasons.push('SHINY_PRINTED_SET_ABBREV_NOT_PROVEN_PAF');
  }
  if (baseDuplicatePrintedNumberRows.length > 0) {
    stopReasons.push(`BASE_DUPLICATE_PRINTED_NUMBER_GROUPS:${baseDuplicatePrintedNumberRows.length}`);
  }
  if (shinySuffixDuplicateRows.length > 0) {
    stopReasons.push(`PROPOSED_SHINY_SUFFIX_DUPLICATES:${shinySuffixDuplicateRows.length}`);
  }
  if (unexpectedShinyOldGvIdRows.length > 0) {
    stopReasons.push(`UNEXPECTED_SHINY_OLD_GVID:${unexpectedShinyOldGvIdRows.length}`);
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
    overlap_count_informational: overlapCount,
    base_duplicate_printed_number_group_count: baseDuplicatePrintedNumberRows.length,
    shiny_suffix_duplicate_group_count: shinySuffixDuplicateRows.length,
    unexpected_shiny_old_gvid_count: unexpectedShinyOldGvIdRows.length,
    proposed_shiny_suffix_collision_count: proposedShinySuffixCollisions.length,
    proposed_base_post_realign_collision_count: proposedBasePostRealignCollisions.length,
    out_of_scope_collision_count: outOfScopeCollisions.length,
    shiny_reassignment_map_count: shinyReassignmentMap.length,
    base_promotion_map_count: basePromotionMap.length,
    safe_to_apply: stopReasons.length === 0,
    stop_reasons: stopReasons,
    sample_shiny_reassignment_rows: shinyReassignmentMap.slice(0, 25),
    sample_base_promotion_rows: basePromotionMap.slice(0, 25),
    sample_unexpected_shiny_old_gvid_rows: unexpectedShinyOldGvIdRows.slice(0, 25),
  };
}

async function updateShinyBatch(client, batchRows) {
  const payload = JSON.stringify(batchRows);
  const sql = `
    update public.card_prints cp
    set gv_id = batch.proposed_gv_id
    from jsonb_to_recordset($1::jsonb) as batch(
      card_print_id uuid,
      name text,
      printed_number text,
      current_gv_id text,
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
      name text,
      printed_number text,
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

async function loadPostApplyState(client, activeIdentityBefore) {
  const sql = `
    with base_rows as (
      select cp.id, cp.gv_id, cpi.printed_number
      from public.card_print_identity cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.set_code_identity = $1
    ),
    shiny_rows as (
      select id, gv_id, number
      from public.card_prints
      where set_code = $2
    )
    select json_build_object(
      'base_promoted_count', (
        select count(*)::int
        from base_rows
        where gv_id is not null
      ),
      'shiny_reassigned_count', (
        select count(*)::int
        from shiny_rows
        where gv_id like 'GV-PK-PAF-%-S'
      ),
      'remaining_null_base_count', (
        select count(*)::int
        from base_rows
        where gv_id is null
      ),
      'remaining_unsuffixed_shiny_count', (
        select count(*)::int
        from shiny_rows
        where gv_id like 'GV-PK-PAF-%'
          and gv_id not like 'GV-PK-PAF-%-S'
      ),
      'live_gvid_collision_count', (
        select count(*)::int
        from (
          select gv_id
          from public.card_prints
          where gv_id like 'GV-PK-PAF-%'
          group by gv_id
          having count(*) > 1
        ) collision
      ),
      'active_identity_total_before', $3::int,
      'active_identity_total_after', (
        select count(*)::int
        from public.card_print_identity
        where is_active = true
      )
    ) as payload
  `;

  const { rows } = await client.query(sql, [
    BASE_SET_CODE_IDENTITY,
    SHINY_SET_CODE,
    activeIdentityBefore,
  ]);
  return rows[0]?.payload ?? null;
}

async function loadSampleRows(client) {
  const sql = `
    select
      cp.id as card_print_id,
      cp.set_code,
      cp.name,
      cp.number,
      cp.gv_id
    from public.card_prints cp
    where (cp.set_code = $1 and cp.gv_id like 'GV-PK-PAF-%-S')
       or (cp.id in (
          select cpi.card_print_id
          from public.card_print_identity cpi
          where cpi.is_active = true
            and cpi.set_code_identity = $2
       ) and cp.gv_id like 'GV-PK-PAF-%')
    order by cp.set_code, cp.number, cp.id
    limit 25
  `;

  const { rows } = await client.query(sql, [SHINY_SET_CODE, BASE_SET_CODE_IDENTITY]);
  return rows;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `paf_realignment_apply_v2:${MODE}`,
  });

  await client.connect();

  try {
    const [setRows, baseLane, shinyLane] = await Promise.all([
      loadSetRows(client),
      loadBaseLane(client),
      loadShinyLane(client),
    ]);

    const {
      overlap_count,
      baseDuplicatePrintedNumberRows,
      shinySuffixDuplicateRows,
      basePromotionMap,
      shinyReassignmentMap,
      unexpectedShinyOldGvIdRows,
    } = buildMaps(baseLane, shinyLane);

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
          ...shinyReassignmentMap.map((row) => row.proposed_gv_id),
          ...basePromotionMap.map((row) => row.proposed_gv_id),
        ]),
      ),
    )).filter(
      (row) =>
        row.set_code !== SHINY_SET_CODE &&
        row.set_code !== BASE_SET_CODE_IDENTITY,
    );

    const summary = buildSummary({
      setRows,
      baseLane,
      shinyLane,
      overlapCount: overlap_count,
      baseDuplicatePrintedNumberRows,
      shinySuffixDuplicateRows,
      basePromotionMap,
      shinyReassignmentMap,
      unexpectedShinyOldGvIdRows,
      proposedShinySuffixCollisions,
      proposedBasePostRealignCollisions,
      outOfScopeCollisions,
    });

    if (MODE !== 'apply') {
      console.log(JSON.stringify(summary, null, 2));
      if (!summary.safe_to_apply) {
        throw new Error(`PAF_REALIGNMENT_V2_STOP:${summary.stop_reasons.join(',')}`);
      }
      return;
    }

    console.log(JSON.stringify(summary, null, 2));
    if (!summary.safe_to_apply) {
      throw new Error(`PAF_REALIGNMENT_V2_STOP:${summary.stop_reasons.join(',')}`);
    }

    const activeIdentityBefore = await loadActiveIdentityTotal(client);

    await client.query('begin');
    try {
      for (const batchRows of chunk(shinyReassignmentMap, BATCH_SIZE)) {
        await updateShinyBatch(client, batchRows);
      }

      const namespaceStillOccupied = await loadLiveCollisions(
        client,
        basePromotionMap.map((row) => row.proposed_gv_id),
        shinyReassignmentMap.map((row) => row.card_print_id),
      );
      if (namespaceStillOccupied.length > 0) {
        throw new Error(`PAF_REALIGNMENT_V2_NAMESPACE_NOT_FREED:${namespaceStillOccupied.length}`);
      }

      for (const batchRows of chunk(basePromotionMap, BATCH_SIZE)) {
        await updateBaseBatch(client, batchRows);
      }

      const inTxPostState = await loadPostApplyState(client, activeIdentityBefore);
      if (Number(inTxPostState?.base_promoted_count ?? -1) !== EXPECTED_BASE_CANDIDATE_COUNT) {
        throw new Error(
          `PAF_REALIGNMENT_V2_BASE_PROMOTED_COUNT:${inTxPostState?.base_promoted_count ?? 'null'}`,
        );
      }
      if (Number(inTxPostState?.shiny_reassigned_count ?? -1) !== EXPECTED_SHINY_CANDIDATE_COUNT) {
        throw new Error(
          `PAF_REALIGNMENT_V2_SHINY_REASSIGNED_COUNT:${inTxPostState?.shiny_reassigned_count ?? 'null'}`,
        );
      }
      if (Number(inTxPostState?.remaining_null_base_count ?? -1) !== 0) {
        throw new Error(
          `PAF_REALIGNMENT_V2_REMAINING_NULL_BASE:${inTxPostState?.remaining_null_base_count ?? 'null'}`,
        );
      }
      if (Number(inTxPostState?.remaining_unsuffixed_shiny_count ?? -1) !== 0) {
        throw new Error(
          `PAF_REALIGNMENT_V2_REMAINING_UNSUFFIXED_SHINY:${inTxPostState?.remaining_unsuffixed_shiny_count ?? 'null'}`,
        );
      }
      if (Number(inTxPostState?.live_gvid_collision_count ?? -1) !== 0) {
        throw new Error(
          `PAF_REALIGNMENT_V2_GVID_COLLISIONS:${inTxPostState?.live_gvid_collision_count ?? 'null'}`,
        );
      }
      if (
        Number(inTxPostState?.active_identity_total_after ?? -1) !==
        Number(inTxPostState?.active_identity_total_before ?? -2)
      ) {
        throw new Error(
          `PAF_REALIGNMENT_V2_ACTIVE_IDENTITY_DRIFT:${inTxPostState?.active_identity_total_before ?? 'null'}:${inTxPostState?.active_identity_total_after ?? 'null'}`,
        );
      }

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }

    const postApplyState = await loadPostApplyState(client, activeIdentityBefore);
    const sampleRows = await loadSampleRows(client);
    console.log(
      JSON.stringify(
        {
          post_apply: postApplyState,
          sample_rows: sampleRows,
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
