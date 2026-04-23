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
const BATCH_SIZE = 500;
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';

const REQUESTED_ALLOWLIST = [
  'sv04.5',
  'sv08.5',
  'lc',
  'A3a',
  'P-A',
  'sv08',
  'sv06.5',
  'sv06',
  'sv02',
  'sv09',
  'sv07',
  'sv10',
  'sv04',
  'swsh10.5',
  'me01',
  'sm7.5',
  'svp',
  'sm12',
  'sm10',
];

const EXPECTED_APPROVED_ALLOWLIST = [
  'me01',
  'sv02',
  'sv04',
  'sv06',
  'sv06.5',
  'sv07',
  'sv08',
  'sv09',
  'sv10',
  'svp',
  'swsh10.5',
];

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

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function arraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function groupCountsBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

async function fetchRequestedSurface(client) {
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
      s.name as set_name,
      s.printed_set_abbrev,
      exists (
        select 1
        from public.card_prints canon
        where canon.gv_id is not null
          and canon.set_code = cpi.set_code_identity
          and canon.number = cpi.printed_number
          and lower(regexp_replace(btrim(canon.name), '\\s+', ' ', 'g')) = cpi.normalized_printed_name
      ) as exact_canonical_overlap
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    left join public.sets s
      on s.id = cp.set_id
    where cpi.is_active = true
      and cpi.identity_domain = $1
      and cp.gv_id is null
      and cpi.set_code_identity = any($2::text[])
    order by cpi.set_code_identity, cpi.printed_number, cp.id
  `;

  const { rows } = await client.query(sql, [TARGET_IDENTITY_DOMAIN, REQUESTED_ALLOWLIST]);
  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    name: row.name,
    gv_id: row.gv_id,
    variant_key: row.variant_key,
    identity_domain: row.identity_domain,
    set_code_identity: row.set_code_identity,
    printed_number: row.printed_number,
    normalized_printed_name: row.normalized_printed_name,
    set_name: row.set_name,
    printed_set_abbrev: row.printed_set_abbrev,
    exact_canonical_overlap: Boolean(row.exact_canonical_overlap),
  }));
}

function buildInitialSetInventory(rows) {
  const inventory = new Map();

  for (const setCode of REQUESTED_ALLOWLIST) {
    inventory.set(setCode, {
      set_code_identity: setCode,
      set_name: null,
      total_rows: 0,
      numeric_only_rows: 0,
      non_numeric_rows: 0,
      missing_printed_set_abbrev_rows: 0,
      non_base_variant_rows: 0,
      exact_canonical_overlap_rows: 0,
      live_gvid_collision_rows: 0,
      live_gvid_collision_samples: [],
      sample_printed_set_abbrev: null,
    });
  }

  for (const row of rows) {
    const record = inventory.get(row.set_code_identity);
    if (!record) {
      continue;
    }

    record.set_name = record.set_name ?? row.set_name ?? null;
    record.sample_printed_set_abbrev =
      record.sample_printed_set_abbrev ?? row.printed_set_abbrev ?? null;
    record.total_rows += 1;

    if (/^[0-9]+$/.test(row.printed_number ?? '')) {
      record.numeric_only_rows += 1;
    } else {
      record.non_numeric_rows += 1;
    }

    if (!normalizeTextOrNull(row.printed_set_abbrev)) {
      record.missing_printed_set_abbrev_rows += 1;
    }

    if (normalizeTextOrNull(row.variant_key)) {
      record.non_base_variant_rows += 1;
    }

    if (row.exact_canonical_overlap) {
      record.exact_canonical_overlap_rows += 1;
    }
  }

  return inventory;
}

function buildRequestedPromotionRows(rows, inventory) {
  const promotionRows = [];

  for (const row of rows) {
    const isNumericOnly = /^[0-9]+$/.test(row.printed_number ?? '');
    const printedSetAbbrev = normalizeTextOrNull(row.printed_set_abbrev);
    const hasBaseVariant = !normalizeTextOrNull(row.variant_key);
    const baseEligibility =
      isNumericOnly &&
      Boolean(printedSetAbbrev) &&
      hasBaseVariant &&
      !row.exact_canonical_overlap;

    let proposedGvId = null;
    let derivationError = null;

    if (baseEligibility) {
      try {
        proposedGvId = buildCardPrintGvIdV1({
          setCode: row.set_code_identity,
          printedSetAbbrev,
          number: row.printed_number,
          variantKey: row.variant_key,
        });
      } catch (error) {
        derivationError = error instanceof Error ? error.message : String(error);
      }
    }

    promotionRows.push({
      ...row,
      is_numeric_only: isNumericOnly,
      printed_set_abbrev: printedSetAbbrev,
      has_base_variant: hasBaseVariant,
      proposed_gv_id: proposedGvId,
      derivation_error: derivationError,
    });

    if (derivationError) {
      const record = inventory.get(row.set_code_identity);
      if (record) {
        record.non_base_variant_rows += 0;
      }
    }
  }

  return promotionRows;
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

function annotateLiveCollisions(promotionRows, inventory, liveRows) {
  const liveByGvId = new Map(liveRows.map((row) => [row.gv_id, row]));

  for (const row of promotionRows) {
    if (!row.proposed_gv_id) {
      continue;
    }

    const liveMatch = liveByGvId.get(row.proposed_gv_id) ?? null;
    if (!liveMatch) {
      continue;
    }

    row.live_collision = {
      live_card_print_id: liveMatch.id,
      live_set_code: liveMatch.set_code,
      live_number: liveMatch.number,
      live_name: liveMatch.name,
      proposed_gv_id: row.proposed_gv_id,
    };

    const record = inventory.get(row.set_code_identity);
    if (!record) {
      continue;
    }

    record.live_gvid_collision_rows += 1;
    if (record.live_gvid_collision_samples.length < 5) {
      record.live_gvid_collision_samples.push({
        card_print_id: row.card_print_id,
        name: row.name,
        printed_number: row.printed_number,
        proposed_gv_id: row.proposed_gv_id,
        collides_with: row.live_collision,
      });
    }
  }
}

function deriveApprovedAllowlist(inventory) {
  return sortStrings(
    Array.from(inventory.values())
      .filter(
        (record) =>
          record.total_rows > 0 &&
          record.non_numeric_rows === 0 &&
          record.missing_printed_set_abbrev_rows === 0 &&
          record.non_base_variant_rows === 0 &&
          record.exact_canonical_overlap_rows === 0 &&
          record.live_gvid_collision_rows === 0,
      )
      .map((record) => record.set_code_identity),
  );
}

function buildFinalCandidates(promotionRows, approvedAllowlist) {
  return promotionRows.filter(
    (row) =>
      approvedAllowlist.includes(row.set_code_identity) &&
      row.is_numeric_only &&
      Boolean(row.printed_set_abbrev) &&
      row.has_base_variant &&
      !row.exact_canonical_overlap &&
      !row.derivation_error &&
      !row.live_collision &&
      row.proposed_gv_id,
  );
}

function buildSetCounts(rows) {
  return Object.fromEntries(
    Array.from(groupCountsBy(rows, (row) => row.set_code_identity).entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    ),
  );
}

function buildInternalCollisionRows(candidates) {
  return Array.from(groupCountsBy(candidates, (row) => row.proposed_gv_id).entries())
    .filter(([, count]) => count > 1)
    .map(([proposed_gv_id, row_count]) => ({
      proposed_gv_id,
      row_count,
      rows: candidates
        .filter((candidate) => candidate.proposed_gv_id === proposed_gv_id)
        .slice(0, 10)
        .map((row) => ({
          card_print_id: row.card_print_id,
          set_code_identity: row.set_code_identity,
          printed_number: row.printed_number,
          name: row.name,
        })),
    }));
}

async function loadActiveIdentityCount(client) {
  const { rows } = await client.query(`
    select count(*)::int as row_count
    from public.card_print_identity
    where is_active = true
  `);
  return Number(rows[0]?.row_count ?? 0);
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

    const updateResult = await client.query(updateSql, [payload]);
    if (updateResult.rows.length !== batchRows.length) {
      const stateResult = await client.query(
        `
          select
            cp.id as card_print_id,
            cp.gv_id
          from public.card_prints cp
          where cp.id = any($1::uuid[])
          order by cp.id
        `,
        [batchRows.map((row) => row.card_print_id)],
      );

      throw new Error(
        `BATCH_UPDATE_ROWCOUNT_MISMATCH:${updateResult.rows.length}:${batchRows.length}:${JSON.stringify(
          stateResult.rows,
        )}`,
      );
    }

    const updatedById = new Map(
      updateResult.rows.map((row) => [row.card_print_id, normalizeTextOrNull(row.gv_id)]),
    );

    for (const row of batchRows) {
      if (updatedById.get(row.card_print_id) !== row.proposed_gv_id) {
        throw new Error(
          `BATCH_UPDATE_GVID_MISMATCH:${row.card_print_id}:${updatedById.get(row.card_print_id) ?? 'null'}:${row.proposed_gv_id}`,
        );
      }
    }

    await client.query('commit');
    return updateResult.rows.length;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function loadPostApplySummary(client, approvedAllowlist, candidateRows, excludedRows, activeIdentityBefore) {
  const candidateIds = candidateRows.map((row) => row.card_print_id);
  const candidateGvIds = candidateRows.map((row) => row.proposed_gv_id);
  const excludedIds = excludedRows.map((row) => row.card_print_id);

  const summarySql = `
    with candidate_input as (
      select *
      from jsonb_to_recordset($1::jsonb) as candidate(
        card_print_id uuid,
        set_code_identity text,
        printed_number text,
        proposed_gv_id text
      )
    )
    select json_build_object(
      'promoted_total', (
        select count(*)::int
        from candidate_input c
        join public.card_prints cp on cp.id = c.card_print_id
        where cp.gv_id = c.proposed_gv_id
      ),
      'remaining_null_gvid_in_phase2a_scope', (
        select count(*)::int
        from candidate_input c
        join public.card_prints cp on cp.id = c.card_print_id
        where cp.gv_id is null
      ),
      'live_gvid_collision_count', (
        select count(*)::int
        from (
          select gv_id
          from public.card_prints
          where gv_id = any($2::text[])
          group by gv_id
          having count(*) > 1
        ) collision
      ),
      'active_identity_total_count', (
        select count(*)::int
        from public.card_print_identity
        where is_active = true
      ),
      'active_identity_total_before', $3::int,
      'active_identity_with_gvid_count', (
        select count(*)::int
        from public.card_print_identity cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cp.gv_id is not null
      ),
      'excluded_rows_promoted_count', (
        select count(*)::int
        from public.card_prints
        where id = any($4::uuid[])
          and gv_id is not null
      )
    ) as result
  `;

  const { rows } = await client.query(summarySql, [
    JSON.stringify(
      candidateRows.map((row) => ({
        card_print_id: row.card_print_id,
        set_code_identity: row.set_code_identity,
        printed_number: row.printed_number,
        proposed_gv_id: row.proposed_gv_id,
      })),
    ),
    candidateGvIds,
    activeIdentityBefore,
    excludedIds,
  ]);

  const promotedBySet = buildSetCounts(candidateRows);

  const sampleSql = `
    with candidate_input as (
      select *
      from jsonb_to_recordset($1::jsonb) as candidate(
        card_print_id uuid,
        set_code_identity text,
        printed_number text,
        name text,
        printed_set_abbrev text,
        proposed_gv_id text
      )
    )
    select
      c.card_print_id,
      c.set_code_identity,
      c.printed_set_abbrev,
      c.printed_number,
      c.name,
      cp.gv_id
    from candidate_input c
    join public.card_prints cp on cp.id = c.card_print_id
    where cp.gv_id = c.proposed_gv_id
    order by c.set_code_identity, c.printed_number, c.card_print_id
    limit 25
  `;

  const sampleResult = await client.query(sampleSql, [
    JSON.stringify(
      candidateRows.map((row) => ({
        card_print_id: row.card_print_id,
        set_code_identity: row.set_code_identity,
        printed_number: row.printed_number,
        name: row.name,
        printed_set_abbrev: row.printed_set_abbrev,
        proposed_gv_id: row.proposed_gv_id,
      })),
    ),
  ]);

  return {
    summary: rows[0]?.result ?? null,
    promoted_by_set: promotedBySet,
    sample_promoted_rows: sampleResult.rows,
  };
}

function logJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `phase2a_canonical_promotion_numeric_only_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    const requestedSurface = await fetchRequestedSurface(client);
    const setInventory = buildInitialSetInventory(requestedSurface);
    const promotionRows = buildRequestedPromotionRows(requestedSurface, setInventory);

    const liveRows = await loadLiveGvIdRows(
      client,
      promotionRows.map((row) => row.proposed_gv_id).filter(Boolean),
    );
    annotateLiveCollisions(promotionRows, setInventory, liveRows);

    const approvedAllowlist = deriveApprovedAllowlist(setInventory);
    const expectedApprovedAllowlist = sortStrings(EXPECTED_APPROVED_ALLOWLIST);
    if (!arraysEqual(approvedAllowlist, expectedApprovedAllowlist)) {
      throw new Error(
        `APPROVED_ALLOWLIST_DRIFT:${JSON.stringify({
          expected: expectedApprovedAllowlist,
          actual: approvedAllowlist,
        })}`,
      );
    }

    const removedSets = sortStrings(
      REQUESTED_ALLOWLIST.filter((setCode) => !approvedAllowlist.includes(setCode)),
    ).map((setCode) => {
      const record = setInventory.get(setCode);
      const reasons = [];

      if ((record?.missing_printed_set_abbrev_rows ?? 0) > 0) {
        reasons.push('missing_printed_set_abbrev');
      }
      if ((record?.non_numeric_rows ?? 0) > 0) {
        reasons.push('non_numeric_printed_number_present');
      }
      if ((record?.non_base_variant_rows ?? 0) > 0) {
        reasons.push('non_base_variant_present');
      }
      if ((record?.exact_canonical_overlap_rows ?? 0) > 0) {
        reasons.push('exact_canonical_overlap_present');
      }
      if ((record?.live_gvid_collision_rows ?? 0) > 0) {
        reasons.push('live_gvid_collision_present');
      }

      return {
        set_code_identity: setCode,
        reasons,
      };
    });

    const finalCandidates = buildFinalCandidates(promotionRows, approvedAllowlist);
    const internalCollisionRows = buildInternalCollisionRows(finalCandidates);
    const liveCollisionRows = finalCandidates.filter((row) => row.live_collision);
    const derivationErrorRows = promotionRows.filter((row) => row.derivation_error);
    const excludedRows = promotionRows.filter((row) => !approvedAllowlist.includes(row.set_code_identity));

    const summary = {
      mode: MODE,
      requested_allowlist: REQUESTED_ALLOWLIST,
      approved_allowlist: approvedAllowlist,
      removed_sets: removedSets,
      candidate_count: finalCandidates.length,
      distinct_card_print_id_count: new Set(finalCandidates.map((row) => row.card_print_id)).size,
      distinct_proposed_gvid_count: new Set(finalCandidates.map((row) => row.proposed_gv_id)).size,
      internal_collision_count: internalCollisionRows.length,
      live_collision_count: liveCollisionRows.length,
      derivation_error_count: derivationErrorRows.length,
      candidate_counts_by_set: buildSetCounts(finalCandidates),
      set_inventory: Array.from(setInventory.values()).sort((left, right) =>
        left.set_code_identity.localeCompare(right.set_code_identity),
      ),
      sample_candidates: finalCandidates.slice(0, 25).map((row) => ({
        card_print_id: row.card_print_id,
        set_code_identity: row.set_code_identity,
        set_name: row.set_name,
        printed_set_abbrev: row.printed_set_abbrev,
        printed_number: row.printed_number,
        name: row.name,
        proposed_gv_id: row.proposed_gv_id,
      })),
    };

    if (internalCollisionRows.length > 0) {
      throw new Error(`INTERNAL_GVID_COLLISIONS:${JSON.stringify(internalCollisionRows.slice(0, 10))}`);
    }
    if (liveCollisionRows.length > 0) {
      throw new Error(`LIVE_GVID_COLLISIONS:${liveCollisionRows.length}`);
    }
    if (derivationErrorRows.length > 0) {
      throw new Error(`DERIVATION_ERRORS:${JSON.stringify(derivationErrorRows.slice(0, 10))}`);
    }
    if (finalCandidates.some((row) => row.gv_id !== null)) {
      throw new Error('NON_NULL_GVID_ROW_ENTERED_CANDIDATE_SCOPE');
    }

    if (MODE !== 'apply') {
      logJson(summary);
      return;
    }

    const activeIdentityBefore = await loadActiveIdentityCount(client);
    const batches = [];

    for (let start = 0; start < finalCandidates.length; start += BATCH_SIZE) {
      const batchRows = finalCandidates.slice(start, start + BATCH_SIZE);
      const appliedCount = await applyBatch(client, batchRows);
      batches.push({
        batch_number: Math.floor(start / BATCH_SIZE) + 1,
        batch_size: batchRows.length,
        applied_count: appliedCount,
      });
    }

    const postValidation = await loadPostApplySummary(
      client,
      approvedAllowlist,
      finalCandidates,
      excludedRows,
      activeIdentityBefore,
    );

    if (Number(postValidation.summary?.promoted_total ?? -1) !== finalCandidates.length) {
      throw new Error(
        `POST_VALIDATION_PROMOTED_TOTAL_MISMATCH:${postValidation.summary?.promoted_total ?? 'null'}:${finalCandidates.length}`,
      );
    }
    if (Number(postValidation.summary?.remaining_null_gvid_in_phase2a_scope ?? -1) !== 0) {
      throw new Error(
        `POST_VALIDATION_REMAINING_NULL_GVID:${postValidation.summary?.remaining_null_gvid_in_phase2a_scope ?? 'null'}`,
      );
    }
    if (Number(postValidation.summary?.live_gvid_collision_count ?? -1) !== 0) {
      throw new Error(
        `POST_VALIDATION_LIVE_GVID_COLLISIONS:${postValidation.summary?.live_gvid_collision_count ?? 'null'}`,
      );
    }
    if (
      Number(postValidation.summary?.active_identity_total_count ?? -1) !== Number(activeIdentityBefore)
    ) {
      throw new Error(
        `POST_VALIDATION_ACTIVE_IDENTITY_DRIFT:${postValidation.summary?.active_identity_total_count ?? 'null'}:${activeIdentityBefore}`,
      );
    }
    if (Number(postValidation.summary?.excluded_rows_promoted_count ?? -1) !== 0) {
      throw new Error(
        `POST_VALIDATION_EXCLUDED_ROW_PROMOTION:${postValidation.summary?.excluded_rows_promoted_count ?? 'null'}`,
      );
    }

    logJson({
      ...summary,
      batches,
      post_validation: postValidation,
    });
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
