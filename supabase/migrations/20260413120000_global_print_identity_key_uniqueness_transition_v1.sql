begin;

-- GLOBAL_PRINT_IDENTITY_KEY_UNIQUENESS_TRANSITION_V1
--
-- Purpose:
--   Transition print_identity_key uniqueness enforcement away from the unsafe
--   standalone global unique index and onto the planned V3 composite identity
--   index, without backfilling or mutating any card_prints row data.
--
-- Pre-state captured from GLOBAL_PRINT_IDENTITY_KEY_MIGRATION_PREFLIGHT_AUDIT_V1:
--   - public.card_prints.print_identity_key exists (text, nullable)
--   - proposed_v3_duplicate_group_count = 0
--   - standalone unique index exists:
--       public.card_prints_print_identity_key_uq
--   - existing identity index remains in place:
--       public.uq_card_prints_identity_v2
--
-- Target V3 uniqueness surface:
--   unique (set_id, number_plain, print_identity_key, coalesce(variant_key, ''))
--   where set_id is not null
--     and number_plain is not null
--     and print_identity_key is not null
--
-- Replay-safety:
--   - create unique index if not exists
--   - drop retired standalone index if exists
--   - no data mutation in this migration

create unique index if not exists uq_card_prints_identity_v3_print_identity
on public.card_prints (
  set_id,
  number_plain,
  print_identity_key,
  coalesce(variant_key, '')
)
where set_id is not null
  and number_plain is not null
  and print_identity_key is not null;

drop index if exists public.card_prints_print_identity_key_uq;

-- Post-apply verification queries:
--
-- 1. V3 unique index exists
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'card_prints'
--   and indexname = 'uq_card_prints_identity_v3_print_identity';
--
-- 2. Standalone print_identity_key unique index retired
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'card_prints'
--   and indexdef ilike '%print_identity_key%'
--   and indexname <> 'uq_card_prints_identity_v3_print_identity';
--
-- 3. No duplicate groups under the planned V3 key
-- select
--   set_id,
--   number_plain,
--   print_identity_key,
--   coalesce(variant_key, '') as variant_key,
--   count(*) as rows_per_identity
-- from public.card_prints
-- where set_id is not null
--   and number_plain is not null
--   and print_identity_key is not null
-- group by
--   set_id,
--   number_plain,
--   print_identity_key,
--   coalesce(variant_key, '')
-- having count(*) > 1;
--
-- 4. Row counts / gv_id surface unchanged
-- select count(*) as card_prints_row_count from public.card_prints;
-- select count(*) as canonical_row_count from public.card_prints where gv_id is not null;
-- select count(*) as gvid_count from public.card_prints where gv_id is not null;

commit;
