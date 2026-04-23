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
import pg from 'pg';
import {
  assertCanonMaintenanceWriteAllowed,
  getCanonMaintenanceDryRun,
  installCanonMaintenanceBoundaryV1,
} from '../maintenance/canon_maintenance_boundary_v1.mjs';

const { Pool } = pg;

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
const { assertCanonMaintenanceWriteAllowed: assertCanonMaintenanceWriteAllowedFromBoundary } =
  installCanonMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('CANON MAINTENANCE: DRY RUN');
}

export const REQUIRED_INDEX_NAME = 'idx_justtcg_variant_price_snapshots_latest_order';
export const REQUIRED_INDEX_SQL = `create index concurrently if not exists ${REQUIRED_INDEX_NAME}
  on public.justtcg_variant_price_snapshots (
    variant_id asc,
    fetched_at desc,
    created_at desc,
    id desc
  );`;

const STAGE_TABLE_NAME = 'tmp_justtcg_variant_prices_latest_stage';

const LATEST_SOURCE_CTE_SQL = `with latest_source as (
  select distinct on (s.variant_id)
    s.variant_id,
    s.card_print_id,
    s.price,
    s.avg_price,
    s.price_change_24h,
    s.price_change_7d,
    s.fetched_at,
    s.created_at,
    s.id
  from public.justtcg_variant_price_snapshots s
  order by s.variant_id asc, s.fetched_at desc, s.created_at desc, s.id desc
)`;

const DERIVED_CTE_SQL = `${LATEST_SOURCE_CTE_SQL},
derived as (
  select
    v.variant_id,
    v.card_print_id,
    v.condition,
    v.printing,
    v.language,
    ls.price,
    ls.avg_price,
    ls.price_change_24h,
    ls.price_change_7d,
    ls.fetched_at as updated_at
  from public.justtcg_variants v
  join latest_source ls
    on ls.variant_id = v.variant_id
   and ls.card_print_id = v.card_print_id
)`;

const STAGE_CREATE_SQL = `create temporary table ${STAGE_TABLE_NAME}
on commit drop
as
${DERIVED_CTE_SQL}
select
  variant_id,
  card_print_id,
  condition,
  printing,
  language,
  price,
  avg_price,
  price_change_24h,
  price_change_7d,
  updated_at
from derived;`;

const STAGE_INDEX_SQL = `create unique index ${STAGE_TABLE_NAME}_pkey
  on ${STAGE_TABLE_NAME} (variant_id);`;

const STAGE_COUNT_SQL = `select count(*)::bigint as stage_count
from ${STAGE_TABLE_NAME};`;

const CARD_PRINT_MISMATCH_COUNT_SQL = `${LATEST_SOURCE_CTE_SQL}
select count(*)::bigint as card_print_id_mismatch_count
from public.justtcg_variants v
join latest_source ls
  on ls.variant_id = v.variant_id
where v.card_print_id <> ls.card_print_id;`;

const CARD_PRINT_MISMATCH_SAMPLE_SQL = `${LATEST_SOURCE_CTE_SQL}
select
  v.variant_id,
  v.card_print_id as variant_card_print_id,
  ls.card_print_id as snapshot_card_print_id
from public.justtcg_variants v
join latest_source ls
  on ls.variant_id = v.variant_id
where v.card_print_id <> ls.card_print_id
order by v.variant_id asc
limit 5;`;

const COUNTS_SQL = `select
  (select count(*)::bigint from public.justtcg_variants) as variants_count,
  (select count(distinct variant_id)::bigint from public.justtcg_variants) as variants_distinct,
  (select count(*)::bigint from public.justtcg_variant_price_snapshots) as snapshots_count,
  (select count(distinct variant_id)::bigint from public.justtcg_variant_price_snapshots) as snapshots_distinct,
  (select count(*)::bigint from public.justtcg_variant_prices_latest) as latest_count,
  (select count(distinct variant_id)::bigint from public.justtcg_variant_prices_latest) as latest_distinct;`;

export const DRY_RUN_SQL = `${DERIVED_CTE_SQL}
select
  (select count(*)::bigint from derived) as derived_rows,
  (select count(*)::bigint
   from derived d
   left join public.justtcg_variant_prices_latest l
     on l.variant_id = d.variant_id
   where l.variant_id is null) as missing_in_latest,
  (select count(*)::bigint
   from public.justtcg_variant_prices_latest l
   left join derived d
     on d.variant_id = l.variant_id
   where d.variant_id is null) as extra_in_latest,
  (select count(*)::bigint
   from derived d
   join public.justtcg_variant_prices_latest l
     on l.variant_id = d.variant_id
   where
     l.card_print_id is distinct from d.card_print_id or
     l.condition is distinct from d.condition or
     l.printing is distinct from d.printing or
     l.language is distinct from d.language or
     l.price is distinct from d.price or
     l.avg_price is distinct from d.avg_price or
     l.price_change_24h is distinct from d.price_change_24h or
     l.price_change_7d is distinct from d.price_change_7d or
     l.updated_at is distinct from d.updated_at) as mismatched_existing_rows,
  (select count(*)::bigint
   from public.justtcg_variant_prices_latest l
   left join public.justtcg_variant_price_snapshots s
     on s.variant_id = l.variant_id
   where s.variant_id is null) as latest_without_snapshot,
  (select count(*)::bigint
   from public.justtcg_variants v
   left join public.justtcg_variant_prices_latest l
     on l.variant_id = v.variant_id
   where l.variant_id is null) as missing_latest_variants,
  (select count(*)::bigint
   from (
     select variant_id
     from public.justtcg_variant_prices_latest
     group by variant_id
     having count(*) > 1
   ) duplicates) as duplicate_latest_variant_ids,
  (select count(*)::bigint
   from public.justtcg_variants v
   join latest_source ls
     on ls.variant_id = v.variant_id
   where v.card_print_id <> ls.card_print_id) as card_print_id_mismatch_count,
  (select count(*)::bigint
   from (
     select cp.set_code
     from public.card_prints cp
     join public.justtcg_variants jv
       on jv.card_print_id = cp.id
     left join public.justtcg_variant_prices_latest jl
       on jl.variant_id = jv.variant_id
     group by cp.set_code
     having count(distinct jv.card_print_id) - count(distinct jl.card_print_id) > 0
   ) missing_sets) as set_level_missing_latest_groups;`;

const UPSERT_SQL = `insert into public.justtcg_variant_prices_latest (
  variant_id,
  card_print_id,
  condition,
  printing,
  language,
  price,
  avg_price,
  price_change_24h,
  price_change_7d,
  updated_at
)
select
  variant_id,
  card_print_id,
  condition,
  printing,
  language,
  price,
  avg_price,
  price_change_24h,
  price_change_7d,
  updated_at
from ${STAGE_TABLE_NAME}
on conflict (variant_id) do update
set
  card_print_id = excluded.card_print_id,
  condition = excluded.condition,
  printing = excluded.printing,
  language = excluded.language,
  price = excluded.price,
  avg_price = excluded.avg_price,
  price_change_24h = excluded.price_change_24h,
  price_change_7d = excluded.price_change_7d,
  updated_at = excluded.updated_at;`;

const DELETE_ORPHANS_SQL = `delete from public.justtcg_variant_prices_latest l
where not exists (
  select 1
  from ${STAGE_TABLE_NAME} s
  where s.variant_id = l.variant_id
);`;

export const APPLY_SQL = `begin isolation level repeatable read;

set local statement_timeout = '0';

do $$
begin
  if exists (
    ${LATEST_SOURCE_CTE_SQL}
    select 1
    from public.justtcg_variants v
    join latest_source ls
      on ls.variant_id = v.variant_id
    where v.card_print_id <> ls.card_print_id
  ) then
    raise exception 'justtcg latest refresh aborted: card_print_id mismatch between variants and latest snapshot winner';
  end if;
end $$;

${STAGE_CREATE_SQL}

${STAGE_INDEX_SQL}

${UPSERT_SQL}

${DELETE_ORPHANS_SQL}

commit;`;

const APPLY_VERIFY_SQL = `select
  (select count(*)::bigint from ${STAGE_TABLE_NAME}) as stage_count,
  (select count(*)::bigint from public.justtcg_variant_prices_latest) as latest_count,
  (select count(*)::bigint
   from public.justtcg_variants v
   left join public.justtcg_variant_prices_latest l
     on l.variant_id = v.variant_id
   where l.variant_id is null) as missing_latest_variants,
  (select count(*)::bigint
   from public.justtcg_variant_prices_latest l
   left join public.justtcg_variant_price_snapshots s
     on s.variant_id = l.variant_id
   where s.variant_id is null) as latest_without_snapshot,
  (select count(*)::bigint
   from (
     select variant_id
     from public.justtcg_variant_prices_latest
     group by variant_id
     having count(*) > 1
   ) duplicates) as duplicate_latest_variant_ids,
  (select count(*)::bigint
   from public.justtcg_variants v
   join ${STAGE_TABLE_NAME} s
     on s.variant_id = v.variant_id
   where v.card_print_id <> s.card_print_id) as card_print_id_mismatch_count,
  (select count(*)::bigint
   from ${STAGE_TABLE_NAME} s
   left join public.justtcg_variant_prices_latest l
     on l.variant_id = s.variant_id
   where l.variant_id is null) as stage_missing_in_latest,
  (select count(*)::bigint
   from public.justtcg_variant_prices_latest l
   left join ${STAGE_TABLE_NAME} s
     on s.variant_id = l.variant_id
   where s.variant_id is null) as latest_extra_vs_stage,
  (select count(*)::bigint
   from public.justtcg_variant_prices_latest l
   join ${STAGE_TABLE_NAME} s
     on s.variant_id = l.variant_id
   where
     l.card_print_id is distinct from s.card_print_id or
     l.condition is distinct from s.condition or
     l.printing is distinct from s.printing or
     l.language is distinct from s.language or
     l.price is distinct from s.price or
     l.avg_price is distinct from s.avg_price or
     l.price_change_24h is distinct from s.price_change_24h or
     l.price_change_7d is distinct from s.price_change_7d or
     l.updated_at is distinct from s.updated_at) as value_mismatch_vs_stage,
  (select count(*)::bigint
   from (
     select cp.set_code
     from public.card_prints cp
     join public.justtcg_variants jv
       on jv.card_print_id = cp.id
     left join public.justtcg_variant_prices_latest jl
       on jl.variant_id = jv.variant_id
     group by cp.set_code
     having count(distinct jv.card_print_id) - count(distinct jl.card_print_id) > 0
   ) missing_sets) as set_level_missing_latest_groups;`;

export const VERIFICATION_SQL = `select 'variants' as table_name, count(*) as row_count from public.justtcg_variants
union all
select 'snapshots', count(*) from public.justtcg_variant_price_snapshots
union all
select 'latest', count(*) from public.justtcg_variant_prices_latest;

select
  (select count(distinct variant_id) from public.justtcg_variants) as variants_distinct,
  (select count(distinct variant_id) from public.justtcg_variant_price_snapshots) as snapshots_distinct,
  (select count(distinct variant_id) from public.justtcg_variant_prices_latest) as latest_distinct;

select
  count(*) as snapshot_rows_missing_latest,
  count(distinct s.variant_id) as snapshot_variants_missing_latest
from public.justtcg_variant_price_snapshots s
left join public.justtcg_variant_prices_latest l
  on l.variant_id = s.variant_id
where l.variant_id is null;

select
  count(*) as latest_rows_without_source_snapshot
from public.justtcg_variant_prices_latest l
left join public.justtcg_variant_price_snapshots s
  on s.variant_id = l.variant_id
where s.variant_id is null;

select
  count(*) as missing_latest_variants
from public.justtcg_variants v
left join public.justtcg_variant_prices_latest l
  on l.variant_id = v.variant_id
where l.variant_id is null;

select variant_id, count(*) as row_count
from public.justtcg_variant_prices_latest
group by variant_id
having count(*) > 1
order by row_count desc, variant_id asc;

${DERIVED_CTE_SQL}
select
  count(*) filter (where d.variant_id is not null) as derived_rows,
  count(*) filter (where l.variant_id is not null) as latest_rows,
  count(*) filter (where d.variant_id is not null and l.variant_id is null) as missing_in_latest,
  count(*) filter (where d.variant_id is null and l.variant_id is not null) as extra_in_latest,
  count(*) filter (
    where d.variant_id is not null and l.variant_id is not null and (
      l.card_print_id is distinct from d.card_print_id or
      l.condition is distinct from d.condition or
      l.printing is distinct from d.printing or
      l.language is distinct from d.language or
      l.price is distinct from d.price or
      l.avg_price is distinct from d.avg_price or
      l.price_change_24h is distinct from d.price_change_24h or
      l.price_change_7d is distinct from d.price_change_7d or
      l.updated_at is distinct from d.updated_at
    )
  ) as mismatched_rows
from derived d
full join public.justtcg_variant_prices_latest l
  on l.variant_id = d.variant_id;

select
  cp.set_code,
  count(distinct jv.card_print_id) as cards_with_variants,
  count(distinct jl.card_print_id) as cards_with_latest,
  count(distinct jv.card_print_id) - count(distinct jl.card_print_id) as missing_latest
from public.card_prints cp
join public.justtcg_variants jv
  on jv.card_print_id = cp.id
left join public.justtcg_variant_prices_latest jl
  on jl.variant_id = jv.variant_id
group by cp.set_code
having count(distinct jv.card_print_id) - count(distinct jl.card_print_id) > 0
order by missing_latest desc, cp.set_code asc;

${LATEST_SOURCE_CTE_SQL}
select count(*) as card_print_id_mismatch_count
from public.justtcg_variants v
join latest_source ls
  on ls.variant_id = v.variant_id
where v.card_print_id <> ls.card_print_id;

select
  s.variant_id,
  s.id,
  s.fetched_at,
  s.created_at,
  row_number() over (
    partition by s.variant_id
    order by s.fetched_at desc, s.created_at desc, s.id desc
  ) as expected_rank,
  l.updated_at as current_latest_updated_at
from public.justtcg_variant_price_snapshots s
left join public.justtcg_variant_prices_latest l
  on l.variant_id = s.variant_id
where s.variant_id in (
  'pokemon-aquapolis-spinarak-62-uncommon_damaged',
  'pokemon-aquapolis-spinarak-62-uncommon_damaged_reverse-holofoil'
)
order by s.variant_id asc, s.fetched_at desc, s.created_at desc, s.id desc;`;

function toInt(value) {
  return Number.parseInt(String(value ?? 0), 10);
}

function shouldUseSsl(connectionString) {
  if (!connectionString) {
    return false;
  }

  const normalized = connectionString.toLowerCase();
  if (normalized.includes('sslmode=disable')) {
    return false;
  }

  try {
    const url = new URL(connectionString);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return false;
    }
  } catch {
    return true;
  }

  return true;
}

export function createRefreshPool(applicationName) {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('[justtcg-latest-refresh] SUPABASE_DB_URL is not set.');
  }

  return new Pool({
    connectionString,
    application_name: applicationName,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
  });
}

export function parseModeArgs(argv, options = {}) {
  const allowDryRun = options.allowDryRun !== false;
  const parsed = {
    apply: false,
    dryRun: false,
  };

  for (const token of argv) {
    if (token === '--apply') {
      parsed.apply = true;
    }
    if (allowDryRun && token === '--dry-run') {
      parsed.dryRun = true;
    }
  }

  if (parsed.apply && parsed.dryRun) {
    throw new Error('[justtcg-latest-refresh] choose exactly one of --dry-run or --apply.');
  }

  return parsed;
}

function emitLog(logger, event, payload = {}) {
  logger(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...payload,
    }),
  );
}

async function querySingleRow(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? {};
}

async function fetchCounts(client) {
  const row = await querySingleRow(client, COUNTS_SQL);
  return {
    variantsCount: toInt(row.variants_count),
    variantsDistinct: toInt(row.variants_distinct),
    snapshotsCount: toInt(row.snapshots_count),
    snapshotsDistinct: toInt(row.snapshots_distinct),
    latestCount: toInt(row.latest_count),
    latestDistinct: toInt(row.latest_distinct),
  };
}

async function fetchRequiredIndexStatus(client) {
  const row = await querySingleRow(
    client,
    `select count(*)::bigint as index_count
     from pg_indexes
     where schemaname = 'public'
       and tablename = 'justtcg_variant_price_snapshots'
       and indexname = $1;`,
    [REQUIRED_INDEX_NAME],
  );

  return toInt(row.index_count) === 1;
}

async function fetchDryRunSummary(client) {
  const row = await querySingleRow(client, DRY_RUN_SQL);
  return {
    derivedRows: toInt(row.derived_rows),
    missingInLatest: toInt(row.missing_in_latest),
    extraInLatest: toInt(row.extra_in_latest),
    mismatchedExistingRows: toInt(row.mismatched_existing_rows),
    latestWithoutSnapshot: toInt(row.latest_without_snapshot),
    missingLatestVariants: toInt(row.missing_latest_variants),
    duplicateLatestVariantIds: toInt(row.duplicate_latest_variant_ids),
    cardPrintIdMismatchCount: toInt(row.card_print_id_mismatch_count),
    setLevelMissingLatestGroups: toInt(row.set_level_missing_latest_groups),
  };
}

async function fetchCardPrintMismatchSample(client) {
  const { rows } = await client.query(CARD_PRINT_MISMATCH_SAMPLE_SQL);
  return rows;
}

function buildDryRunSummary(indexPresent, counts, diff) {
  return {
    required_index_present: indexPresent,
    variants_count: counts.variantsCount,
    variants_distinct: counts.variantsDistinct,
    snapshots_count: counts.snapshotsCount,
    snapshots_distinct: counts.snapshotsDistinct,
    latest_count: counts.latestCount,
    latest_distinct: counts.latestDistinct,
    derived_rows: diff.derivedRows,
    missing_in_latest: diff.missingInLatest,
    extra_in_latest: diff.extraInLatest,
    mismatched_existing_rows: diff.mismatchedExistingRows,
    latest_without_snapshot: diff.latestWithoutSnapshot,
    missing_latest_variants: diff.missingLatestVariants,
    duplicate_latest_variant_ids: diff.duplicateLatestVariantIds,
    card_print_id_mismatch_count: diff.cardPrintIdMismatchCount,
    set_level_missing_latest_groups: diff.setLevelMissingLatestGroups,
  };
}

export async function runLatestRefreshDryRun(pool, options = {}) {
  const logger = options.logger ?? console.log;
  const logPrefix = options.logPrefix ?? 'justtcg-latest-refresh';
  const client = await pool.connect();

  try {
    await client.query('begin isolation level repeatable read read only');
    await client.query("set local statement_timeout = '0'");

    const indexPresent = await fetchRequiredIndexStatus(client);
    const counts = await fetchCounts(client);
    const diff = await fetchDryRunSummary(client);
    const summary = buildDryRunSummary(indexPresent, counts, diff);

    emitLog(logger, `${logPrefix}.dry_run_summary`, summary);

    if (diff.cardPrintIdMismatchCount > 0) {
      const sample = await fetchCardPrintMismatchSample(client);
      emitLog(logger, `${logPrefix}.dry_run_card_print_mismatch_sample`, {
        sample,
      });
    }

    await client.query('rollback');
    return summary;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback error
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function runLatestRefreshApply(pool, options = {}) {
  const logger = options.logger ?? console.log;
  const logPrefix = options.logPrefix ?? 'justtcg-latest-refresh';

  if (DRY_RUN) {
    emitLog(logger, `${logPrefix}.apply_blocked_dry_run`, {
      reason: 'CANON_MAINTENANCE_DRY_RUN defaults to true unless explicitly disabled.',
    });
    return runLatestRefreshDryRun(pool, options);
  }

  assertCanonMaintenanceWriteAllowed();
  assertCanonMaintenanceWriteAllowedFromBoundary();
  const client = await pool.connect();

  try {
    await client.query('begin isolation level repeatable read');
    await client.query("set local statement_timeout = '0'");

    const indexPresent = await fetchRequiredIndexStatus(client);
    if (!indexPresent) {
      throw new Error(
        `[${logPrefix}] required index ${REQUIRED_INDEX_NAME} is missing. Apply the index migration before refresh.`,
      );
    }

    const beforeCounts = await fetchCounts(client);
    emitLog(logger, `${logPrefix}.before_counts`, {
      variants_count: beforeCounts.variantsCount,
      snapshots_count: beforeCounts.snapshotsCount,
      latest_count: beforeCounts.latestCount,
    });

    const mismatchRow = await querySingleRow(client, CARD_PRINT_MISMATCH_COUNT_SQL);
    const cardPrintIdMismatchCount = toInt(mismatchRow.card_print_id_mismatch_count);
    if (cardPrintIdMismatchCount > 0) {
      const sample = await fetchCardPrintMismatchSample(client);
      throw new Error(
        `[${logPrefix}] card_print_id mismatch count=${cardPrintIdMismatchCount}. Sample=${JSON.stringify(sample)}`,
      );
    }

    await client.query(STAGE_CREATE_SQL);
    await client.query(STAGE_INDEX_SQL);

    const stageRow = await querySingleRow(client, STAGE_COUNT_SQL);
    const stageCount = toInt(stageRow.stage_count);
    emitLog(logger, `${logPrefix}.stage_ready`, {
      stage_count: stageCount,
    });

    const upsertResult = await client.query(UPSERT_SQL);
    const deleteResult = await client.query(DELETE_ORPHANS_SQL);
    const verifyRow = await querySingleRow(client, APPLY_VERIFY_SQL);

    const verification = {
      stageCount: toInt(verifyRow.stage_count),
      latestCount: toInt(verifyRow.latest_count),
      missingLatestVariants: toInt(verifyRow.missing_latest_variants),
      latestWithoutSnapshot: toInt(verifyRow.latest_without_snapshot),
      duplicateLatestVariantIds: toInt(verifyRow.duplicate_latest_variant_ids),
      cardPrintIdMismatchCount: toInt(verifyRow.card_print_id_mismatch_count),
      stageMissingInLatest: toInt(verifyRow.stage_missing_in_latest),
      latestExtraVsStage: toInt(verifyRow.latest_extra_vs_stage),
      valueMismatchVsStage: toInt(verifyRow.value_mismatch_vs_stage),
      setLevelMissingLatestGroups: toInt(verifyRow.set_level_missing_latest_groups),
    };

    const failedInvariant = Object.entries(verification).find(([key, value]) => {
      if (key === 'stageCount' || key === 'latestCount') {
        return false;
      }
      return value !== 0;
    });

    if (failedInvariant) {
      throw new Error(
        `[${logPrefix}] verification failed: ${failedInvariant[0]}=${failedInvariant[1]}. Full=${JSON.stringify(verification)}`,
      );
    }

    const afterCounts = await fetchCounts(client);
    await client.query('commit');

    const summary = {
      required_index_present: true,
      variants_count_before: beforeCounts.variantsCount,
      snapshots_count_before: beforeCounts.snapshotsCount,
      latest_count_before: beforeCounts.latestCount,
      stage_count: stageCount,
      rows_upserted: upsertResult.rowCount ?? 0,
      rows_deleted: deleteResult.rowCount ?? 0,
      latest_count_after: afterCounts.latestCount,
      latest_distinct_after: afterCounts.latestDistinct,
      snapshots_distinct_after: afterCounts.snapshotsDistinct,
      verification,
    };

    emitLog(logger, `${logPrefix}.apply_summary`, summary);
    return summary;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback error
    }
    throw error;
  } finally {
    client.release();
  }
}
