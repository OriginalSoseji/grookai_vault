-- NUMBER NORMALIZATION DRY-RUN IMPLEMENTATION PLAN 2026-05-17
-- STATUS: PLAN ONLY. DO NOT EXECUTE WRITE SECTIONS AGAINST PRODUCTION.
--
-- This file is safe by default. The first section is read-only.
-- Future write statements are commented and require separate approval.

begin transaction read only;

-- Scope summary.
select
  count(*)::int as physical_pokemon_card_prints,
  count(*) filter (where cp.number is null or btrim(cp.number) = '')::int as missing_number_rows,
  count(*) filter (where cp.number_plain is null or btrim(cp.number_plain) = '')::int as missing_number_plain_rows
from public.card_prints cp
join public.sets s on s.id = cp.set_id
where s.game = 'pokemon'
  and coalesce(s.source->>'domain', '') <> 'tcg_pocket';

-- Candidate derivation from source IDs. This is read-only.
with hard_stop_codes(set_code) as (
  values
    ('sv04.5'),
    ('sv4pt5'),
    ('pgo'),
    ('swsh10.5'),
    ('sv08.5'),
    ('sv8pt5'),
    ('sv06.5'),
    ('sv6pt5')
),
source_candidates as (
  select
    cp.id as card_print_id,
    s.code as set_code,
    s.name as set_name,
    cp.name as card_name,
    'external_ids.tcgdex'::text as source_carrier,
    cp.external_ids->>'tcgdex' as source_external_id
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  where cp.external_ids ? 'tcgdex'

  union all

  select
    cp.id as card_print_id,
    s.code as set_code,
    s.name as set_name,
    cp.name as card_name,
    'external_mappings.tcgdex'::text as source_carrier,
    em.external_id as source_external_id
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  join public.external_mappings em
    on em.card_print_id = cp.id
   and em.active = true
   and em.source = 'tcgdex'
),
normalized_candidates as (
  select
    card_print_id,
    set_code,
    set_name,
    card_name,
    source_carrier,
    source_external_id,
    regexp_replace(source_external_id, '^.*-', '') as source_tail_raw,
    case
      when regexp_replace(source_external_id, '^.*-', '') ~ '^[0-9]+$'
        then (regexp_replace(source_external_id, '^.*-', '')::int)::text
      when regexp_replace(source_external_id, '^.*-', '') ~ '^[A-Za-z]+0*[0-9]+[A-Za-z]*$'
        then upper(regexp_replace(regexp_replace(source_external_id, '^.*-', ''), '^([A-Za-z]+)0*([0-9]+)([A-Za-z]*)$', '\1\2\3'))
      else upper(regexp_replace(source_external_id, '^.*-', ''))
    end as candidate_number
  from source_candidates
  where source_external_id like '%-%'
),
candidate_rollup as (
  select
    cp.id as card_print_id,
    s.code as set_code,
    s.name as set_name,
    cp.name as card_name,
    count(distinct nc.candidate_number)::int as distinct_candidate_numbers,
    array_agg(distinct nc.candidate_number order by nc.candidate_number) as candidate_numbers,
    array_agg(distinct nc.source_carrier order by nc.source_carrier) as source_carriers,
    bool_or(hs.set_code is not null) as in_hard_stop_set
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  left join normalized_candidates nc on nc.card_print_id = cp.id
  left join hard_stop_codes hs on hs.set_code = s.code
  where s.game = 'pokemon'
    and coalesce(s.source->>'domain', '') <> 'tcg_pocket'
    and (cp.number is null or btrim(cp.number) = '')
    and (cp.number_plain is null or btrim(cp.number_plain) = '')
  group by cp.id, s.code, s.name, cp.name
),
lane_a_numeric_candidates as (
  select
    card_print_id,
    set_code,
    set_name,
    card_name,
    candidate_numbers[1] as proposed_number,
    candidate_numbers[1] as proposed_number_plain,
    source_carriers
  from candidate_rollup
  where distinct_candidate_numbers = 1
    and in_hard_stop_set = false
    and candidate_numbers[1] ~ '^[0-9]+$'
),
collision_check as (
  select
    c.card_print_id,
    c.set_code,
    c.set_name,
    c.card_name,
    c.proposed_number,
    existing.id as existing_card_print_id,
    existing.name as existing_card_name,
    existing.number as existing_number
  from lane_a_numeric_candidates c
  join public.card_prints existing
    on existing.set_code = c.set_code
   and existing.id <> c.card_print_id
   and (
     existing.number = c.proposed_number
     or existing.number_plain = c.proposed_number_plain
   )
),
identity_conflict_check as (
  select
    c.card_print_id,
    c.set_code,
    c.card_name,
    c.proposed_number,
    cpi.printed_number
  from lane_a_numeric_candidates c
  join public.card_print_identity cpi
    on cpi.card_print_id = c.card_print_id
   and cpi.is_active = true
   and cpi.printed_number is not null
   and cpi.printed_number is distinct from c.proposed_number
)
select
  (select count(*)::int from lane_a_numeric_candidates) as lane_a_numeric_candidates,
  (select count(*)::int from collision_check) as collision_rows,
  (select count(*)::int from identity_conflict_check) as active_identity_conflict_rows;

-- Review candidate rows before any future write plan.
-- Keep this limited in interactive sessions.
with hard_stop_codes(set_code) as (
  values ('sv04.5'), ('sv4pt5'), ('pgo'), ('swsh10.5'), ('sv08.5'), ('sv8pt5'), ('sv06.5'), ('sv6pt5')
),
source_candidates as (
  select cp.id as card_print_id, s.code as set_code, s.name as set_name, cp.name as card_name, cp.external_ids->>'tcgdex' as source_external_id
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  where cp.external_ids ? 'tcgdex'
),
normalized_candidates as (
  select
    card_print_id,
    set_code,
    set_name,
    card_name,
    case
      when regexp_replace(source_external_id, '^.*-', '') ~ '^[0-9]+$'
        then (regexp_replace(source_external_id, '^.*-', '')::int)::text
      when regexp_replace(source_external_id, '^.*-', '') ~ '^[A-Za-z]+0*[0-9]+[A-Za-z]*$'
        then upper(regexp_replace(regexp_replace(source_external_id, '^.*-', ''), '^([A-Za-z]+)0*([0-9]+)([A-Za-z]*)$', '\1\2\3'))
      else upper(regexp_replace(source_external_id, '^.*-', ''))
    end as candidate_number
  from source_candidates
  where source_external_id like '%-%'
)
select
  nc.set_code,
  nc.set_name,
  nc.card_name,
  nc.candidate_number
from normalized_candidates nc
join public.card_prints cp on cp.id = nc.card_print_id
left join hard_stop_codes hs on hs.set_code = nc.set_code
where (cp.number is null or btrim(cp.number) = '')
  and (cp.number_plain is null or btrim(cp.number_plain) = '')
  and hs.set_code is null
  and nc.candidate_number ~ '^[0-9]+$'
order by nc.set_code, nc.candidate_number::int, nc.card_name
limit 100;

rollback;

-- FUTURE WRITE SECTION - COMMENTED BY DESIGN.
-- Do not uncomment without a fresh evidence matrix, explicit approval, and a reviewed approved-candidate table.
--
-- begin;
--
-- create temporary table tmp_number_normalization_approved_v1 (
--   card_print_id uuid primary key,
--   approved_number text not null,
--   approved_number_plain text not null,
--   approval_note text not null
-- ) on commit drop;
--
-- insert into tmp_number_normalization_approved_v1(card_print_id, approved_number, approved_number_plain, approval_note)
-- values
--   -- ('00000000-0000-0000-0000-000000000000', '91', '91', 'approved evidence row id here')
-- ;
--
-- -- Guard: no hard-stop set rows.
-- select count(*) as hard_stop_scope_violation
-- from tmp_number_normalization_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- join public.sets s on s.id = cp.set_id
-- where s.code in ('sv04.5','sv4pt5','pgo','swsh10.5','sv08.5','sv8pt5','sv06.5','sv6pt5');
--
-- -- Guard: target rows still have both number fields missing.
-- select count(*) as stale_candidate_violation
-- from tmp_number_normalization_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- where cp.number is not null
--    or cp.number_plain is not null;
--
-- -- Guard: no duplicate number ownership in the same set.
-- select count(*) as duplicate_candidate_violation
-- from tmp_number_normalization_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- join public.card_prints existing
--   on existing.set_code = cp.set_code
--  and existing.id <> cp.id
--  and (
--    existing.number = a.approved_number
--    or existing.number_plain = a.approved_number_plain
--  );
--
-- -- Future write shape. Replace rollback with commit only after explicit approval.
-- update public.card_prints cp
-- set
--   number = a.approved_number,
--   number_plain = a.approved_number_plain,
--   updated_at = now()
-- from tmp_number_normalization_approved_v1 a
-- where cp.id = a.card_print_id
--   and cp.number is null
--   and cp.number_plain is null;
--
-- -- Post-write verification queries go here.
--
-- rollback;
