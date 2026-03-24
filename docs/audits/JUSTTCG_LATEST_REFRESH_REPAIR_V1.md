# JUSTTCG_LATEST_REFRESH_REPAIR_V1

Scope: `public.justtcg_variant_prices_latest` full-refresh repair and builder replacement only.

## Failure Summary

- Current builder path: [backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs](/c:/grookai_vault/backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs)
- Failing statement: ordered Supabase REST page scan over `public.justtcg_variant_price_snapshots`
- Failure mode proved in audit:
  - offset `0..999` succeeded
  - offset `100000..100999` failed with `canceling statement due to statement timeout`
- Root cause:
  - offset replay gets slower as offset grows
  - query is only partially index-supported
  - separate REST page statements are not stable under concurrent snapshot inserts
- Locked replacement:
  - derive latest DB-side
  - use direct Postgres over `SUPABASE_DB_URL`
  - preserve tie-break:
    - `variant_id asc, fetched_at desc, created_at desc, id desc`

## Chosen Strategy

- Add source-order index:
  - `idx_justtcg_variant_price_snapshots_latest_order`
- Replace replay builder with one direct-DB refresh transaction:
  - `REPEATABLE READ`
  - `DISTINCT ON (variant_id)` winner selection
  - join `public.justtcg_variants`
  - abort on `card_print_id` mismatch
  - stage result in temp table
  - upsert into `public.justtcg_variant_prices_latest` on conflict `(variant_id)`
  - delete orphan latest rows not present in stage
  - verify invariants before commit

## Index Rollout Note

- Repo migration style is mixed:
  - many newer migrations explicitly use `begin; ... commit;`
  - other migrations are plain SQL with no wrapper
- No repo-local non-transaction migration marker was found.
- `CREATE INDEX CONCURRENTLY` is illegal inside a transaction block.
- Safe repo-consistent handling:
  - keep the index migration in its own standalone file
  - do not add `begin;` / `commit;`
  - if the migration runner wraps files in a transaction, apply this one statement outside that wrapper before running the repair

## Dry-Run SQL

```sql
with latest_source as (
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
),
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
)
select
  (select count(*)::bigint from public.justtcg_variants) as variants_count,
  (select count(distinct variant_id)::bigint from public.justtcg_variants) as variants_distinct,
  (select count(*)::bigint from public.justtcg_variant_price_snapshots) as snapshots_count,
  (select count(distinct variant_id)::bigint from public.justtcg_variant_price_snapshots) as snapshots_distinct,
  (select count(*)::bigint from public.justtcg_variant_prices_latest) as latest_count,
  (select count(distinct variant_id)::bigint from public.justtcg_variant_prices_latest) as latest_distinct,
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
   ) missing_sets) as set_level_missing_latest_groups;
```

## Apply SQL

```sql
begin isolation level repeatable read;

set local statement_timeout = '0';

do $$
begin
  if exists (
    with latest_source as (
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
    )
    select 1
    from public.justtcg_variants v
    join latest_source ls
      on ls.variant_id = v.variant_id
    where v.card_print_id <> ls.card_print_id
  ) then
    raise exception 'justtcg latest refresh aborted: card_print_id mismatch between variants and latest snapshot winner';
  end if;
end $$;

create temporary table tmp_justtcg_variant_prices_latest_stage
on commit drop
as
with latest_source as (
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
),
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
from derived;

create unique index tmp_justtcg_variant_prices_latest_stage_pkey
  on tmp_justtcg_variant_prices_latest_stage (variant_id);

insert into public.justtcg_variant_prices_latest (
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
from tmp_justtcg_variant_prices_latest_stage
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
  updated_at = excluded.updated_at;

delete from public.justtcg_variant_prices_latest l
where not exists (
  select 1
  from tmp_justtcg_variant_prices_latest_stage s
  where s.variant_id = l.variant_id
);

commit;
```

## Verification SQL

```sql
select 'variants' as table_name, count(*) as row_count from public.justtcg_variants
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

with latest_source as (
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
),
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
)
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

with latest_source as (
  select distinct on (s.variant_id)
    s.variant_id,
    s.card_print_id
  from public.justtcg_variant_price_snapshots s
  order by s.variant_id asc, s.fetched_at desc, s.created_at desc, s.id desc
)
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
order by s.variant_id asc, s.fetched_at desc, s.created_at desc, s.id desc;
```

## Rollback Notes

- The refresh transaction is fail-closed:
  - any invariant failure rolls back the transaction
  - `public.justtcg_variant_prices_latest` stays unchanged on rollback
- The index migration is forward-only.
- If a post-commit rollback is needed:
  - take a table backup before running `--apply`
  - restore `public.justtcg_variant_prices_latest` from that backup with an operator-reviewed script
- Do not use the legacy REST replay builder as rollback.
