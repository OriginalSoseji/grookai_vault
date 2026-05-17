-- LANE A 248-ROW NUMBER NORMALIZATION WRITE PLAN 2026-05-17
-- STATUS: PLAN ONLY. DO NOT EXECUTE WRITE SECTIONS AGAINST PRODUCTION.
--
-- This file is safe by default. The active section is read-only.
-- Future write statements are commented and require separate approval.

begin transaction read only;

-- Expected live scope check.
with hard_stop_codes(set_code) as (
  values
    ('pgo'),
    ('swsh10.5'),
    ('sv04.5'),
    ('sv4pt5'),
    ('sv06.5'),
    ('sv6pt5'),
    ('sv08.5'),
    ('sv8pt5')
),
review_stop_codes(set_code) as (
  values
    ('bog'),
    ('bp'),
    ('tk-ex-latia'),
    ('tk-ex-latio'),
    ('tk-ex-m'),
    ('tk-ex-p'),
    ('tk1a'),
    ('tk1b'),
    ('tk2a'),
    ('tk2b')
),
source_candidates as (
  select
    cp.id as card_print_id,
    cp.set_id,
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
    cp.set_id,
    s.code as set_code,
    s.name as set_name,
    cp.name as card_name,
    'external_mappings.tcgdex'::text as source_carrier,
    em.external_id as source_external_id
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  join public.external_mappings em
    on em.card_print_id = cp.id
   and em.source = 'tcgdex'
   and em.active = true
),
normalized_candidates as (
  select
    card_print_id,
    set_id,
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
    cp.set_id,
    s.code as set_code,
    s.name as set_name,
    cp.name as card_name,
    count(distinct nc.candidate_number)::int as distinct_candidate_numbers,
    array_agg(distinct nc.candidate_number order by nc.candidate_number) as candidate_numbers,
    array_agg(distinct nc.source_carrier order by nc.source_carrier) as source_carriers,
    array_agg(distinct nc.source_external_id order by nc.source_external_id) as source_external_ids,
    bool_or(hs.set_code is not null) as in_hard_stop_set,
    bool_or(rs.set_code is not null) as in_review_stop_set
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  left join normalized_candidates nc on nc.card_print_id = cp.id
  left join hard_stop_codes hs on hs.set_code = s.code
  left join review_stop_codes rs on rs.set_code = s.code
  where s.game = 'pokemon'
    and coalesce(s.source->>'domain', '') <> 'tcg_pocket'
    and (cp.number is null or btrim(cp.number) = '')
    and (cp.number_plain is null or btrim(cp.number_plain) = '')
  group by cp.id, cp.set_id, s.code, s.name, cp.name
),
lane_a_numeric_candidates as (
  select
    card_print_id,
    set_id,
    set_code,
    set_name,
    card_name,
    candidate_numbers[1] as proposed_number,
    candidate_numbers[1] as proposed_number_plain,
    source_carriers,
    source_external_ids
  from candidate_rollup
  where distinct_candidate_numbers = 1
    and in_hard_stop_set = false
    and in_review_stop_set = false
    and candidate_numbers[1] ~ '^[0-9]+$'
    and source_carriers @> array['external_ids.tcgdex','external_mappings.tcgdex']::text[]
),
collision_candidate_ids as (
  select distinct c.card_print_id
  from lane_a_numeric_candidates c
  join public.card_prints existing
    on existing.set_id = c.set_id
   and existing.id <> c.card_print_id
   and (
     existing.number = c.proposed_number
     or existing.number_plain = c.proposed_number_plain
   )
),
duplicate_candidate_ids as (
  select card_print_id
  from (
    select
      c.card_print_id,
      count(*) over (partition by c.set_id, c.proposed_number_plain) as candidate_same_number_count
    from lane_a_numeric_candidates c
  ) scoped
  where candidate_same_number_count > 1
),
identity_conflict_ids as (
  select distinct c.card_print_id
  from lane_a_numeric_candidates c
  join public.card_print_identity cpi
    on cpi.card_print_id = c.card_print_id
   and cpi.is_active = true
   and cpi.printed_number is not null
   and cpi.printed_number is distinct from c.proposed_number
),
clean_candidates as (
  select c.*
  from lane_a_numeric_candidates c
  left join collision_candidate_ids collisions on collisions.card_print_id = c.card_print_id
  left join duplicate_candidate_ids duplicates on duplicates.card_print_id = c.card_print_id
  left join identity_conflict_ids identities on identities.card_print_id = c.card_print_id
  where collisions.card_print_id is null
    and duplicates.card_print_id is null
    and identities.card_print_id is null
)
select
  (select count(*)::int from lane_a_numeric_candidates) as lane_a_numeric_non_hard_stop_candidates,
  (select count(*)::int from collision_candidate_ids) as collision_blocked_candidates,
  (select count(*)::int from duplicate_candidate_ids) as duplicate_candidate_rows,
  (select count(*)::int from identity_conflict_ids) as active_identity_conflict_rows,
  (select count(*)::int from clean_candidates) as clean_lane_a_candidates;

-- Expected clean set breakdown.
with hard_stop_codes(set_code) as (
  values ('pgo'), ('swsh10.5'), ('sv04.5'), ('sv4pt5'), ('sv06.5'), ('sv6pt5'), ('sv08.5'), ('sv8pt5')
),
review_stop_codes(set_code) as (
  values ('bog'), ('bp'), ('tk-ex-latia'), ('tk-ex-latio'), ('tk-ex-m'), ('tk-ex-p'), ('tk1a'), ('tk1b'), ('tk2a'), ('tk2b')
),
source_candidates as (
  select cp.id as card_print_id, cp.set_id, s.code as set_code, s.name as set_name, cp.name as card_name, 'external_ids.tcgdex'::text as source_carrier, cp.external_ids->>'tcgdex' as source_external_id
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  where cp.external_ids ? 'tcgdex'
  union all
  select cp.id as card_print_id, cp.set_id, s.code as set_code, s.name as set_name, cp.name as card_name, 'external_mappings.tcgdex'::text as source_carrier, em.external_id as source_external_id
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  join public.external_mappings em on em.card_print_id = cp.id and em.source = 'tcgdex' and em.active = true
),
normalized_candidates as (
  select *, case when regexp_replace(source_external_id, '^.*-', '') ~ '^[0-9]+$' then (regexp_replace(source_external_id, '^.*-', '')::int)::text else upper(regexp_replace(source_external_id, '^.*-', '')) end as candidate_number
  from source_candidates
  where source_external_id like '%-%'
),
candidate_rollup as (
  select cp.id as card_print_id, cp.set_id, s.code as set_code, s.name as set_name, cp.name as card_name, count(distinct nc.candidate_number)::int as distinct_candidate_numbers, array_agg(distinct nc.candidate_number order by nc.candidate_number) as candidate_numbers, array_agg(distinct nc.source_carrier order by nc.source_carrier) as source_carriers
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  left join normalized_candidates nc on nc.card_print_id = cp.id
  left join hard_stop_codes hs on hs.set_code = s.code
  left join review_stop_codes rs on rs.set_code = s.code
  where s.game = 'pokemon'
    and coalesce(s.source->>'domain', '') <> 'tcg_pocket'
    and hs.set_code is null
    and rs.set_code is null
    and (cp.number is null or btrim(cp.number) = '')
    and (cp.number_plain is null or btrim(cp.number_plain) = '')
  group by cp.id, cp.set_id, s.code, s.name, cp.name
),
lane_a as (
  select card_print_id, set_id, set_code, set_name, card_name, candidate_numbers[1] as proposed_number, candidate_numbers[1] as proposed_number_plain
  from candidate_rollup
  where distinct_candidate_numbers = 1
    and candidate_numbers[1] ~ '^[0-9]+$'
    and source_carriers @> array['external_ids.tcgdex','external_mappings.tcgdex']::text[]
),
blocked as (
  select distinct c.card_print_id
  from lane_a c
  join public.card_prints existing on existing.set_id = c.set_id and existing.id <> c.card_print_id and (existing.number = c.proposed_number or existing.number_plain = c.proposed_number_plain)
),
clean as (
  select c.*
  from lane_a c
  left join blocked b on b.card_print_id = c.card_print_id
  where b.card_print_id is null
)
select
  set_code,
  set_name,
  count(*)::int as clean_rows,
  min(proposed_number::int)::int as min_approved_number,
  max(proposed_number::int)::int as max_approved_number
from clean
group by set_code, set_name
order by set_code;

rollback;

-- FUTURE WRITE SECTION - COMMENTED BY DESIGN.
-- Do not uncomment without fresh evidence, explicit approval, and operator review.
--
-- begin;
--
-- -- Candidate table must be populated only from:
-- -- docs/plans/pokemon_db_remediation_v1/number_normalization_lane_a_248_write_plan_matrix_20260517.json
-- -- Expected exact row count: 248.
-- create temporary table tmp_number_normalization_lane_a_248_approved_v1 (
--   card_print_id uuid primary key,
--   expected_set_code text not null,
--   approved_number text not null,
--   approved_number_plain text not null,
--   expected_source_external_id text not null,
--   approval_note text not null
-- ) on commit drop;
--
-- -- Populate tmp_number_normalization_lane_a_248_approved_v1 from the reviewed matrix.
-- -- Do not hand-add rows outside the matrix.
--
-- -- Snapshot before-values for rollback.
-- create temporary table tmp_number_normalization_lane_a_248_snapshot_v1 as
-- select
--   cp.id,
--   cp.number,
--   cp.number_plain,
--   cp.print_identity_key,
--   cp.gv_id,
--   cp.updated_at
-- from public.card_prints cp
-- join tmp_number_normalization_lane_a_248_approved_v1 a on a.card_print_id = cp.id;
--
-- -- Guard: exact row count.
-- select count(*) as approved_row_count
-- from tmp_number_normalization_lane_a_248_approved_v1;
--
-- -- Guard: no hard-stop, review-stop, or me01 rows.
-- select count(*) as excluded_set_scope_violation
-- from tmp_number_normalization_lane_a_248_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- join public.sets s on s.id = cp.set_id
-- where s.code in (
--   'pgo','swsh10.5','sv04.5','sv4pt5','sv06.5','sv6pt5','sv08.5','sv8pt5',
--   'bog','bp','tk-ex-latia','tk-ex-latio','tk-ex-m','tk-ex-p','tk1a','tk1b','tk2a','tk2b',
--   'me01'
-- );
--
-- -- Guard: target rows still have both number fields missing.
-- select count(*) as stale_candidate_violation
-- from tmp_number_normalization_lane_a_248_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- where cp.number is not null
--    or cp.number_plain is not null;
--
-- -- Guard: approved values are numeric only.
-- select count(*) as non_numeric_approved_value_violation
-- from tmp_number_normalization_lane_a_248_approved_v1 a
-- where a.approved_number !~ '^[0-9]+$'
--    or a.approved_number_plain !~ '^[0-9]+$';
--
-- -- Guard: no same-set direct number or number_plain collision.
-- select count(*) as same_set_number_collision_violation
-- from tmp_number_normalization_lane_a_248_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- join public.card_prints existing
--   on existing.set_id = cp.set_id
--  and existing.id <> cp.id
--  and (
--    existing.number = a.approved_number
--    or existing.number_plain = a.approved_number_plain
--  );
--
-- -- Guard: no duplicate approved number inside the batch.
-- select expected_set_code, approved_number_plain, count(*) as duplicate_approved_rows
-- from tmp_number_normalization_lane_a_248_approved_v1
-- group by expected_set_code, approved_number_plain
-- having count(*) > 1;
--
-- -- Guard: no active identity printed-number conflict.
-- select count(*) as active_identity_conflict_violation
-- from tmp_number_normalization_lane_a_248_approved_v1 a
-- join public.card_print_identity cpi
--   on cpi.card_print_id = a.card_print_id
--  and cpi.is_active = true
--  and cpi.printed_number is not null
--  and cpi.printed_number is distinct from a.approved_number;
--
-- -- Guard: no user/market references appeared on this formerly clean lane without review.
-- select count(*) as user_market_reference_violation
-- from tmp_number_normalization_lane_a_248_approved_v1 a
-- left join public.pricing_watch pw on pw.card_print_id = a.card_print_id
-- left join public.shared_cards sc on sc.card_id = a.card_print_id
-- left join public.slab_certs slab on slab.card_print_id = a.card_print_id
-- left join public.vault_item_instances vii on vii.card_print_id = a.card_print_id
-- left join public.vault_items vi on vi.card_id = a.card_print_id
-- where pw.card_print_id is not null
--    or sc.card_id is not null
--    or slab.card_print_id is not null
--    or vii.card_print_id is not null
--    or vi.card_id is not null;
--
-- -- Future write shape only. Replace rollback with commit only after explicit approval.
-- update public.card_prints cp
-- set
--   number = a.approved_number,
--   number_plain = a.approved_number_plain,
--   updated_at = now()
-- from tmp_number_normalization_lane_a_248_approved_v1 a
-- where cp.id = a.card_print_id
--   and (cp.number is null or btrim(cp.number) = '')
--   and (cp.number_plain is null or btrim(cp.number_plain) = '');
--
-- -- Post-write verification must prove exactly 248 approved rows now match the matrix.
-- select count(*) as rows_matching_approved_numbers
-- from tmp_number_normalization_lane_a_248_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- where cp.number = a.approved_number
--   and cp.number_plain = a.approved_number_plain;
--
-- rollback;
