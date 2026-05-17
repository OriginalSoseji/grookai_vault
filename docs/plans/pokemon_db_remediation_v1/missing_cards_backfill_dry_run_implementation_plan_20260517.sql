-- MISSING CARDS BACKFILL DRY-RUN IMPLEMENTATION PLAN 2026-05-17
-- STATUS: PLAN ONLY. DO NOT EXECUTE WRITE SECTIONS AGAINST PRODUCTION.
--
-- This file is safe by default. The first section is read-only.
-- Future write statements are commented and require separate approval.

begin transaction read only;

-- Scope: current physical Pokemon DB inventory.
select
  count(distinct s.id)::int as physical_pokemon_sets,
  count(cp.id)::int as physical_pokemon_card_prints
from public.sets s
left join public.card_prints cp on cp.set_id = s.id
where s.game = 'pokemon'
  and coalesce(s.source->>'domain', '') <> 'tcg_pocket';

-- High-risk target set presence check for current planning lanes.
select
  s.code,
  s.name,
  s.printed_total,
  count(cp.id)::int as card_prints
from public.sets s
left join public.card_prints cp on cp.set_id = s.id
where s.code in (
  'sma',
  'ru1',
  'mep',
  'sm2',
  'sm3',
  'sm4',
  'sm5',
  'sm6',
  'sm7',
  'sm7.5',
  'sm75',
  'bw11',
  'ecard3',
  'pl4',
  'col1',
  'svp',
  'sve'
)
group by s.code, s.name, s.printed_total
order by s.code;

-- Candidate contract shape. This intentionally returns zero rows.
-- A future dry-run should replace this with an approved reviewed candidate file.
with audited_candidates as (
  select *
  from (
    values
      (
        null::text, -- master_set_name
        null::text, -- source_card_url
        null::text, -- source_name
        null::text, -- source_number
        null::text, -- normalized_number_key
        null::boolean, -- is_secret_range
        null::text, -- target_set_code
        null::text -- blocker_lane
      )
  ) as v(
    master_set_name,
    source_card_url,
    source_name,
    source_number,
    normalized_number_key,
    is_secret_range,
    target_set_code,
    blocker_lane
  )
  where false
),
candidate_targets as (
  select
    c.*,
    s.id as target_set_id,
    s.name as target_set_name,
    s.printed_total as target_printed_total
  from audited_candidates c
  left join public.sets s
    on s.code = c.target_set_code
   and s.game = 'pokemon'
),
existing_number_conflicts as (
  select
    c.master_set_name,
    c.source_card_url,
    c.target_set_code,
    c.source_number,
    cp.id as existing_card_print_id,
    cp.name as existing_name,
    cp.number as existing_number,
    cp.number_plain as existing_number_plain
  from candidate_targets c
  join public.card_prints cp
    on cp.set_id = c.target_set_id
   and (
     cp.number = c.source_number
     or cp.number_plain = c.normalized_number_key
   )
),
external_mapping_conflicts as (
  select
    c.master_set_name,
    c.source_card_url,
    c.target_set_code,
    em.source,
    em.external_id,
    em.card_print_id
  from candidate_targets c
  join public.external_mappings em
    on em.active = true
   and c.source_card_url is not null
   and em.external_id = c.source_card_url
),
secret_without_printed_total as (
  select *
  from candidate_targets
  where is_secret_range = true
    and target_printed_total is null
)
select
  (select count(*)::int from audited_candidates) as candidate_rows,
  (select count(*)::int from candidate_targets where target_set_id is null) as missing_target_rows,
  (select count(*)::int from existing_number_conflicts) as existing_number_conflicts,
  (select count(*)::int from external_mapping_conflicts) as external_mapping_conflicts,
  (select count(*)::int from secret_without_printed_total) as secret_without_printed_total;

rollback;

-- FUTURE WRITE SECTION - COMMENTED BY DESIGN.
-- Do not uncomment without a fresh evidence matrix, explicit approval, and a reviewed approved-candidate table.
--
-- begin;
--
-- create temporary table tmp_missing_cards_backfill_approved_v1 (
--   source_card_url text primary key,
--   target_set_code text not null,
--   target_set_id uuid not null,
--   source_name text not null,
--   source_number text not null,
--   normalized_number_key text not null,
--   source_authority text not null,
--   approval_note text not null
-- ) on commit drop;
--
-- -- Insert reviewed candidates here only after approval.
--
-- -- Guard: no missing targets.
-- select count(*) as missing_target_violation
-- from tmp_missing_cards_backfill_approved_v1 a
-- left join public.sets s on s.id = a.target_set_id and s.code = a.target_set_code
-- where s.id is null;
--
-- -- Guard: no duplicate direct or comparable number in target set.
-- select count(*) as duplicate_number_violation
-- from tmp_missing_cards_backfill_approved_v1 a
-- join public.card_prints cp
--   on cp.set_id = a.target_set_id
--  and (
--    cp.number = a.source_number
--    or cp.number_plain = a.normalized_number_key
--  );
--
-- -- Future insert shape only. External mappings, identity rows, images, variants,
-- -- finishes, prices, and raw_imports are intentionally out of scope.
-- insert into public.card_prints (
--   set_id,
--   set_code,
--   name,
--   number,
--   number_plain,
--   external_ids,
--   created_at,
--   updated_at
-- )
-- select
--   a.target_set_id,
--   a.target_set_code,
--   a.source_name,
--   a.source_number,
--   a.normalized_number_key,
--   jsonb_build_object('pkmncards_url', a.source_card_url, 'source_authority', a.source_authority),
--   now(),
--   now()
-- from tmp_missing_cards_backfill_approved_v1 a;
--
-- -- Post-write verification queries go here.
--
-- rollback;
