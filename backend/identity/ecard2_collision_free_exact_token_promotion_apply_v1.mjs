import '../env.mjs';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V1';
const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const TARGET_SET_CODE = 'ecard2';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const EXPECTED_PROMOTION_SOURCE_COUNT = 24;
const EXPECTED_BLOCKED_COUNT = 10;

const CLASSIFICATION_SQL = `
with unresolved as (
  select
    cp.id as old_parent_id,
    cp.set_id,
    cp.name as old_name,
    coalesce(cp.variant_key, '') as variant_key,
    cpi.printed_number as old_printed_token,
    nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token,
    lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\\s+', ' ', 'g')) as exact_name_key,
    btrim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                    chr(96), ''''
                  ),
                  chr(180), ''''
                ),
                chr(8212), ' '
              ),
              chr(8211), ' '
            ),
            '-gx', ' gx'
          ),
          '-ex', ' ex'
        ),
        '\\s+', ' ', 'g'
      )
    ) as normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp on cp.id = cpi.card_print_id
  where cpi.identity_domain = $1
    and cpi.set_code_identity = $2
    and cpi.is_active = true
    and cp.gv_id is null
),
canonical_in_set as (
  select
    cp.id as candidate_target_id,
    cp.name as candidate_target_name,
    cp.number as candidate_target_number,
    cp.number_plain as candidate_target_number_plain,
    lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as exact_name_key,
    btrim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(lower(cp.name), chr(8217), ''''),
                    chr(96), ''''
                  ),
                  chr(180), ''''
                ),
                chr(8212), ' '
              ),
              chr(8211), ' '
            ),
            '-gx', ' gx'
          ),
          '-ex', ' ex'
        ),
        '\\s+', ' ', 'g'
      )
    ) as normalized_name
  from public.card_prints cp
  where cp.set_code = $3
    and cp.gv_id is not null
),
row_metrics as (
  select
    u.old_parent_id,
    count(distinct c.candidate_target_id) filter (
      where c.candidate_target_number = u.old_printed_token
        and c.exact_name_key = u.exact_name_key
    )::int as exact_match_count,
    count(distinct c.candidate_target_id) filter (
      where c.candidate_target_number_plain = u.normalized_token
        and c.normalized_name = u.normalized_name
    )::int as base_match_count,
    count(distinct c.candidate_target_id) filter (
      where c.candidate_target_number_plain = u.normalized_token
        and c.normalized_name <> u.normalized_name
    )::int as same_base_different_name_count
  from unresolved u
  left join canonical_in_set c
    on c.candidate_target_number = u.old_printed_token
    or c.candidate_target_number_plain = u.normalized_token
  group by u.old_parent_id
)
select
  u.old_parent_id,
  u.set_id,
  u.old_name,
  u.variant_key,
  u.old_printed_token,
  u.normalized_token,
  rm.exact_match_count,
  rm.base_match_count,
  rm.same_base_different_name_count,
  case
    when rm.exact_match_count > 0 then 'OUT_OF_SCOPE'
    when rm.base_match_count > 0 then 'OUT_OF_SCOPE'
    when rm.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'PROMOTION_REQUIRED'
  end as execution_class
from unresolved u
join row_metrics rm on rm.old_parent_id = u.old_parent_id
order by u.old_printed_token, u.old_name, u.old_parent_id
`;

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function isHoloToken(value) {
  return /^H[0-9]+$/i.test(String(value ?? '').trim());
}

function comparePrintedTokens(left, right) {
  const a = normalizeTextOrNull(left)?.toUpperCase() ?? '';
  const b = normalizeTextOrNull(right)?.toUpperCase() ?? '';
  const aHolo = isHoloToken(a);
  const bHolo = isHoloToken(b);
  if (aHolo !== bHolo) return aHolo ? 1 : -1;
  const aDigits = a.replace(/^[A-Z]+/, '');
  const bDigits = b.replace(/^[A-Z]+/, '');
  const aNumber = aDigits ? Number.parseInt(aDigits, 10) : Number.MAX_SAFE_INTEGER;
  const bNumber = bDigits ? Number.parseInt(bDigits, 10) : Number.MAX_SAFE_INTEGER;
  if (aNumber !== bNumber) return aNumber - bNumber;
  return a.localeCompare(b);
}

function sortByToken(left, right) {
  const tokenOrder = comparePrintedTokens(left.old_printed_token, right.old_printed_token);
  if (tokenOrder !== 0) return tokenOrder;
  return String(left.old_parent_id).localeCompare(String(right.old_parent_id));
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

async function loadSetMetadata(client) {
  const row = await queryOne(
    client,
    `
      select id, code, name, printed_set_abbrev
      from public.sets
      where code = $1
    `,
    [TARGET_SET_CODE],
  );

  if (!row) throw new Error(`TARGET_SET_NOT_FOUND:${TARGET_SET_CODE}`);
  if (!normalizeTextOrNull(row.printed_set_abbrev)) {
    throw new Error(`PRINTED_SET_ABBREV_MISSING:${TARGET_SET_CODE}`);
  }
  return row;
}

async function loadClassifiedRows(client) {
  return queryRows(client, CLASSIFICATION_SQL, [
    TARGET_IDENTITY_DOMAIN,
    TARGET_SET_CODE,
    TARGET_SET_CODE,
  ]);
}

function buildCandidateMap(rows, setMetadata) {
  return rows
    .map((row) => ({
      old_parent_id: row.old_parent_id,
      set_id: row.set_id,
      set_code: TARGET_SET_CODE,
      old_name: row.old_name,
      variant_key: normalizeTextOrNull(row.variant_key) ?? '',
      old_printed_token: row.old_printed_token,
      proposed_name: row.old_name,
      proposed_number: row.old_printed_token,
      proposed_number_plain: row.normalized_token,
      proposed_variant_key: normalizeTextOrNull(row.variant_key) ?? '',
      proposed_gv_id: buildCardPrintGvIdV1({
        setCode: TARGET_SET_CODE,
        printedSetAbbrev: setMetadata.printed_set_abbrev,
        number: row.old_printed_token,
        variantKey: row.variant_key,
      }),
    }))
    .sort(sortByToken);
}

function buildDuplicateGroups(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = JSON.stringify({
      set_id: row.set_id,
      number: row.proposed_number,
      number_plain: row.proposed_number_plain,
      variant_key: row.proposed_variant_key,
    });
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, row_count]) => ({ key, row_count }));
}

function buildBlockedOverlapRows(candidateMap, blockedRows) {
  const blockedKeys = new Set(
    blockedRows.map((row) =>
      JSON.stringify({
        set_id: row.set_id,
        number: row.old_printed_token,
        variant_key: normalizeTextOrNull(row.variant_key) ?? '',
      }),
    ),
  );

  return candidateMap.filter((row) =>
    blockedKeys.has(
      JSON.stringify({
        set_id: row.set_id,
        number: row.proposed_number,
        variant_key: row.proposed_variant_key,
      }),
    ),
  );
}

async function loadLiveCollisions(client, candidateMap) {
  if (candidateMap.length === 0) return [];
  const gvIds = candidateMap.map((row) => row.proposed_gv_id);
  const rows = await queryRows(
    client,
    `
      select
        cp.id as colliding_card_print_id,
        cp.set_id as colliding_set_id,
        cp.set_code as colliding_set_code,
        cp.name as colliding_name,
        cp.number as colliding_number,
        cp.gv_id as colliding_gv_id,
        coalesce(ai.active_identity_count, 0) as colliding_active_identity_count
      from public.card_prints cp
      left join (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active)::int as active_identity_count
        from public.card_print_identity cpi
        group by cpi.card_print_id
      ) ai on ai.card_print_id = cp.id
      where cp.gv_id = any($1::text[])
      order by cp.gv_id, cp.id
    `,
    [gvIds],
  );

  const byGvId = new Map(rows.map((row) => [row.colliding_gv_id, row]));
  return candidateMap
    .filter((row) => byGvId.has(row.proposed_gv_id))
    .map((row) => ({
      ...row,
      collision: byGvId.get(row.proposed_gv_id),
    }));
}

async function loadFkInventory(client, candidateIds) {
  if (candidateIds.length === 0) {
    return {
      card_print_identity: 0,
      card_print_traits: 0,
      card_printings: 0,
      external_mappings: 0,
      vault_items: 0,
    };
  }

  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id = any($1::uuid[])) as card_print_identity,
        (select count(*)::int from public.card_print_traits where card_print_id = any($1::uuid[])) as card_print_traits,
        (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as card_printings,
        (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as external_mappings,
        (select count(*)::int from public.vault_items where card_id = any($1::uuid[])) as vault_items
    `,
    [candidateIds],
  );

  return {
    card_print_identity: normalizeCount(row?.card_print_identity),
    card_print_traits: normalizeCount(row?.card_print_traits),
    card_printings: normalizeCount(row?.card_printings),
    external_mappings: normalizeCount(row?.external_mappings),
    vault_items: normalizeCount(row?.vault_items),
  };
}

async function loadCanonicalCount(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_prints
      where set_code = $1
        and gv_id is not null
    `,
    [TARGET_SET_CODE],
  );
  return normalizeCount(row?.row_count);
}

async function loadFkOrphans(client) {
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id not in (select id from public.card_prints)) as card_print_identity_orphans,
        (select count(*)::int from public.card_print_traits where card_print_id not in (select id from public.card_prints)) as card_print_traits_orphans,
        (select count(*)::int from public.card_printings where card_print_id not in (select id from public.card_prints)) as card_printings_orphans,
        (select count(*)::int from public.external_mappings where card_print_id not in (select id from public.card_prints)) as external_mappings_orphans,
        (select count(*)::int from public.vault_items where card_id not in (select id from public.card_prints)) as vault_items_orphans
    `,
  );

  return {
    card_print_identity_orphans: normalizeCount(row?.card_print_identity_orphans),
    card_print_traits_orphans: normalizeCount(row?.card_print_traits_orphans),
    card_printings_orphans: normalizeCount(row?.card_printings_orphans),
    external_mappings_orphans: normalizeCount(row?.external_mappings_orphans),
    vault_items_orphans: normalizeCount(row?.vault_items_orphans),
  };
}

function buildPreconditions(promotionRows, blockedRows, duplicateGroups, blockedOverlapRows, collisionRows) {
  const stopReasons = [];
  if (promotionRows.length !== EXPECTED_PROMOTION_SOURCE_COUNT) {
    stopReasons.push(`PROMOTION_SOURCE_COUNT:${promotionRows.length}`);
  }
  if (blockedRows.length !== EXPECTED_BLOCKED_COUNT) {
    stopReasons.push(`BLOCKED_CONFLICT_COUNT:${blockedRows.length}`);
  }
  if (duplicateGroups.length > 0) {
    stopReasons.push(`DUPLICATE_PROPOSED_KEYS:${duplicateGroups.length}`);
  }
  if (blockedOverlapRows.length > 0) {
    stopReasons.push(`BLOCKED_OVERLAP:${blockedOverlapRows.length}`);
  }
  if (collisionRows.length > 0) {
    stopReasons.push(`LIVE_GVID_COLLISIONS:${collisionRows.length}`);
  }
  return {
    promotion_source_count: promotionRows.length,
    blocked_conflict_scope_count: blockedRows.length,
    collision_count: collisionRows.length,
    duplicate_proposed_key_count: duplicateGroups.length,
    blocked_overlap_count: blockedOverlapRows.length,
    safe_to_apply: stopReasons.length === 0,
    stop_reasons: stopReasons,
  };
}

function assertPreconditions(preconditions) {
  if (!preconditions.safe_to_apply) {
    throw new Error(`HARD_GATE_FAILED:${preconditions.stop_reasons.join('|')}`);
  }
}

async function applyPromotionInPlace(client, candidateMap) {
  const payload = JSON.stringify(
    candidateMap.map((row) => ({
      old_parent_id: row.old_parent_id,
      proposed_name: row.proposed_name,
      proposed_number: row.proposed_number,
      proposed_number_plain: row.proposed_number_plain,
      proposed_gv_id: row.proposed_gv_id,
      set_code: row.set_code,
    })),
  );

  const { rowCount } = await client.query(
    `
      update public.card_prints cp
      set
        name = payload.proposed_name,
        set_code = payload.set_code,
        number = payload.proposed_number,
        number_plain = payload.proposed_number_plain,
        gv_id = payload.proposed_gv_id
      from jsonb_to_recordset($1::jsonb) as payload(
        old_parent_id uuid,
        proposed_name text,
        proposed_number text,
        proposed_number_plain text,
        proposed_gv_id text,
        set_code text
      )
      where cp.id = payload.old_parent_id
        and cp.gv_id is null
    `,
    [payload],
  );

  return normalizeCount(rowCount);
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL is required');

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    set_metadata: null,
    promotion_source_count: 0,
    blocked_conflict_scope_count: 0,
    promotion_ready_count: 0,
    promotion_namespace_collision_count: 0,
    collision_count: 0,
    duplicate_proposed_key_count: 0,
    blocked_overlap_count: 0,
    fk_inventory: null,
    fk_movement_summary: {
      card_print_identity: 0,
      card_print_traits: 0,
      card_printings: 0,
      external_mappings: 0,
      vault_items: 0,
      movement_mode: 'in_place_promotion',
    },
    sample_promoted_rows: [],
    preconditions: null,
    post_validation: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    application_name: `ecard2_collision_free_exact_token_promotion_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    const setMetadata = await loadSetMetadata(client);
    const classifiedRows = await loadClassifiedRows(client);
    const promotionRows = classifiedRows.filter((row) => row.execution_class === 'PROMOTION_REQUIRED');
    const blockedRows = classifiedRows.filter((row) => row.execution_class === 'BLOCKED_CONFLICT');
    const outOfScopeRows = classifiedRows.filter((row) => row.execution_class === 'OUT_OF_SCOPE');
    const candidateMap = buildCandidateMap(promotionRows, setMetadata);
    const duplicateGroups = buildDuplicateGroups(candidateMap);
    const blockedOverlapRows = buildBlockedOverlapRows(candidateMap, blockedRows);
    const collisionRows = await loadLiveCollisions(client, candidateMap);
    const fkInventory = await loadFkInventory(client, candidateMap.map((row) => row.old_parent_id));

    report.set_metadata = setMetadata;
    report.promotion_source_count = promotionRows.length;
    report.blocked_conflict_scope_count = blockedRows.length;
    report.promotion_ready_count = candidateMap.length - collisionRows.length;
    report.promotion_namespace_collision_count = collisionRows.length;
    report.collision_count = collisionRows.length;
    report.duplicate_proposed_key_count = duplicateGroups.length;
    report.blocked_overlap_count = blockedOverlapRows.length;
    report.fk_inventory = fkInventory;
    report.sample_promoted_rows = candidateMap.slice(0, 8).map((row) => ({
      old_parent_id: row.old_parent_id,
      old_name: row.old_name,
      old_printed_token: row.old_printed_token,
      proposed_gv_id: row.proposed_gv_id,
      promotion_lane: collisionRows.some((item) => item.old_parent_id === row.old_parent_id)
        ? 'PROMOTION_NAMESPACE_COLLISION'
        : 'PROMOTION_READY',
    }));
    report.preconditions = buildPreconditions(
      promotionRows,
      blockedRows,
      duplicateGroups,
      blockedOverlapRows,
      collisionRows,
    );
    report.preconditions.out_of_scope_count = outOfScopeRows.length;
    report.preconditions.collision_rows = collisionRows.map((row) => ({
      old_parent_id: row.old_parent_id,
      old_name: row.old_name,
      old_printed_token: row.old_printed_token,
      proposed_gv_id: row.proposed_gv_id,
      colliding_card_print_id: row.collision.colliding_card_print_id,
      colliding_set_code: row.collision.colliding_set_code,
      colliding_name: row.collision.colliding_name,
      colliding_number: row.collision.colliding_number,
      colliding_gv_id: row.collision.colliding_gv_id,
      colliding_active_identity_count: row.collision.colliding_active_identity_count,
    }));

    if (MODE !== 'apply') {
      report.status = report.preconditions.safe_to_apply ? 'dry_run_passed' : 'dry_run_blocked';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      if (!report.preconditions.safe_to_apply) assertPreconditions(report.preconditions);
      return;
    }

    assertPreconditions(report.preconditions);

    const canonicalCountBefore = await loadCanonicalCount(client);
    const updatedRowCount = await applyPromotionInPlace(client, candidateMap);
    const canonicalCountAfter = await loadCanonicalCount(client);
    const fkOrphans = await loadFkOrphans(client);
    const refreshed = await loadClassifiedRows(client);

    report.post_validation = {
      promotion_count: updatedRowCount,
      remaining_promotion_required_rows: refreshed.filter((row) => row.execution_class === 'PROMOTION_REQUIRED').length,
      remaining_blocked_conflict_rows: refreshed.filter((row) => row.execution_class === 'BLOCKED_CONFLICT').length,
      canonical_count_delta: canonicalCountAfter - canonicalCountBefore,
      all_new_promoted_rows_have_non_null_gvid: updatedRowCount === candidateMap.length,
      fk_orphan_counts: fkOrphans,
    };

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original failure.
    }

    report.status = report.status === 'running' ? 'failed' : report.status;
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    console.error(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
