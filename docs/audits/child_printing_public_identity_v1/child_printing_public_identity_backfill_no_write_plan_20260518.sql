-- CHILD_PRINTING_PUBLIC_IDENTITY_V1 approved backfill no-write apply plan
-- Generated: 2026-05-19T03:42:40.280Z
-- Status: NO-WRITE PLAN ONLY. Do not execute as an apply script.
-- Approved candidates: 44698
-- Source: docs\audits\child_printing_public_identity_v1\child_printing_public_identity_candidates_20260518.json

-- This file intentionally contains read-only checks and commented future apply SQL.
-- The future apply operator must load the approved candidate matrix into a temp table.

-- 1) Remote schema precheck. Read-only.
begin read only;

select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'card_printings'
  and column_name = 'printing_gv_id';

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'card_printings'
  and indexname = 'card_printings_printing_gv_id_key';

select
  count(*)::int as total_card_printings,
  count(printing_gv_id)::int as populated_printing_gv_id
from public.card_printings;

select count(*)::int as existing_printing_gv_id_collision_groups
from (
  select printing_gv_id
  from public.card_printings
  where printing_gv_id is not null
  group by printing_gv_id
  having count(*) > 1
) collisions;

commit;

-- 2) Future dry-run/apply transaction template. Keep commented until separately approved.
-- begin;
-- set local lock_timeout = '5s';
-- set local statement_timeout = '120s';
--
-- create temp table tmp_child_printing_public_identity_backfill_v1 (
--   card_printing_id uuid primary key,
--   card_print_id uuid not null,
--   parent_gv_id text not null,
--   proposed_printing_gv_id text not null,
--   finish_key text not null,
--   risk_classification text not null
-- ) on commit drop;
--
-- Load exactly 44698 APPROVED_CANDIDATE rows from docs\audits\child_printing_public_identity_v1\child_printing_public_identity_candidates_20260518.json.
-- Recommended load path: generate a local CSV from the committed JSON matrix, then use psql \copy into the temp table.
--
-- Dry-run assertions before update:
-- select count(*) = 44698 as approved_candidate_count_ok from tmp_child_printing_public_identity_backfill_v1;
-- select proposed_printing_gv_id, count(*) from tmp_child_printing_public_identity_backfill_v1 group by 1 having count(*) > 1;
-- select candidate.* from tmp_child_printing_public_identity_backfill_v1 candidate where candidate.risk_classification <> 'APPROVED_CANDIDATE';
-- select candidate.* from tmp_child_printing_public_identity_backfill_v1 candidate join public.card_printings cpng on cpng.printing_gv_id = candidate.proposed_printing_gv_id and cpng.id <> candidate.card_printing_id;
-- select candidate.* from tmp_child_printing_public_identity_backfill_v1 candidate join public.card_prints cp on cp.gv_id = candidate.proposed_printing_gv_id;
-- select candidate.* from tmp_child_printing_public_identity_backfill_v1 candidate join public.card_printings cpng on cpng.id = candidate.card_printing_id where cpng.card_print_id <> candidate.card_print_id;
-- select candidate.* from tmp_child_printing_public_identity_backfill_v1 candidate join public.card_printings cpng on cpng.id = candidate.card_printing_id join public.card_prints cp on cp.id = cpng.card_print_id where cp.gv_id <> candidate.parent_gv_id;
--
-- Future apply, only after all assertions return clean:
-- with updated as (
--   update public.card_printings cpng
--   set printing_gv_id = candidate.proposed_printing_gv_id
--   from tmp_child_printing_public_identity_backfill_v1 candidate
--   join public.card_prints cp
--     on cp.id = cpng.card_print_id
--   where cpng.id = candidate.card_printing_id
--     and cpng.card_print_id = candidate.card_print_id
--     and candidate.risk_classification = 'APPROVED_CANDIDATE'
--     and candidate.proposed_printing_gv_id is not null
--     and cp.gv_id = candidate.parent_gv_id
--     and cpng.printing_gv_id is null
--   returning cpng.id, cpng.card_print_id, cpng.printing_gv_id
-- )
-- select count(*) as updated_rows from updated;
--
-- Expected updated_rows: 44698
-- commit;
