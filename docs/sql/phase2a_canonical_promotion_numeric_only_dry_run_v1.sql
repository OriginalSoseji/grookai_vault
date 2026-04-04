-- PHASE2A_CANONICAL_PROMOTION_NUMERIC_ONLY_V1
-- Read-only dry run for the frozen numeric-only promotion scope.
--
-- This artifact does NOT derive the allowlist dynamically.
-- The allowlist is already frozen by proof:
--   me01
--   sv02
--   sv04
--   sv06
--   sv06.5
--   sv07
--   sv08
--   sv09
--   sv10
--   svp
--   swsh10.5
--
-- Removed from the requested allowlist during proof:
-- - A3a, P-A, sv08.5       => missing printed_set_abbrev
-- - lc, sm7.5, sm10, sm12 => live GV-ID collisions under current public convention
--
-- Current Phase 2A proof assumes all approved candidates are base-variant rows
-- with numeric-only printed_number and non-null printed_set_abbrev.

drop table if exists tmp_phase2a_requested_allowlist;
drop table if exists tmp_phase2a_approved_allowlist;
drop table if exists tmp_phase2a_source_rows;
drop table if exists tmp_phase2a_candidate_map;
drop table if exists tmp_phase2a_internal_gvid_collisions;
drop table if exists tmp_phase2a_live_gvid_collisions;

create temp table tmp_phase2a_requested_allowlist (
  set_code_identity text primary key
);

insert into tmp_phase2a_requested_allowlist (set_code_identity)
values
  ('sv04.5'),
  ('sv08.5'),
  ('lc'),
  ('A3a'),
  ('P-A'),
  ('sv08'),
  ('sv06.5'),
  ('sv06'),
  ('sv02'),
  ('sv09'),
  ('sv07'),
  ('sv10'),
  ('sv04'),
  ('swsh10.5'),
  ('me01'),
  ('sm7.5'),
  ('svp'),
  ('sm12'),
  ('sm10');

create temp table tmp_phase2a_approved_allowlist (
  set_code_identity text primary key
);

insert into tmp_phase2a_approved_allowlist (set_code_identity)
values
  ('me01'),
  ('sv02'),
  ('sv04'),
  ('sv06'),
  ('sv06.5'),
  ('sv07'),
  ('sv08'),
  ('sv09'),
  ('sv10'),
  ('svp'),
  ('swsh10.5');

create temp table tmp_phase2a_source_rows as
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
  (
    select exists (
      select 1
      from public.card_prints canon
      where canon.gv_id is not null
        and canon.set_code = cpi.set_code_identity
        and canon.number = cpi.printed_number
        and lower(regexp_replace(btrim(canon.name), '\s+', ' ', 'g')) = cpi.normalized_printed_name
    )
  ) as exact_canonical_overlap
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
left join public.sets s
  on s.id = cp.set_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cp.gv_id is null
  and exists (
    select 1
    from tmp_phase2a_requested_allowlist requested
    where requested.set_code_identity = cpi.set_code_identity
  );

create index tmp_phase2a_source_rows_set_idx
  on tmp_phase2a_source_rows (set_code_identity);

create temp table tmp_phase2a_candidate_map as
select
  source.card_print_id,
  source.set_code_identity,
  source.set_name,
  source.printed_number,
  source.name,
  source.identity_domain,
  source.printed_set_abbrev,
  'GV-PK-' ||
    upper(
      regexp_replace(
        regexp_replace(
          regexp_replace(btrim(source.printed_set_abbrev), '[^A-Za-z0-9]+', '-', 'g'),
          '-+',
          '-',
          'g'
        ),
        '(^-+|-+$)',
        '',
        'g'
      )
    ) ||
    '-' ||
    upper(regexp_replace(btrim(source.printed_number), '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
from tmp_phase2a_source_rows source
where exists (
    select 1
    from tmp_phase2a_approved_allowlist approved
    where approved.set_code_identity = source.set_code_identity
  )
  and source.printed_number ~ '^[0-9]+$'
  and source.printed_set_abbrev is not null
  and btrim(source.printed_set_abbrev) <> ''
  and coalesce(nullif(source.variant_key, ''), '') = ''
  and source.exact_canonical_overlap = false;

create unique index tmp_phase2a_candidate_map_card_uidx
  on tmp_phase2a_candidate_map (card_print_id);

create index tmp_phase2a_candidate_map_gvid_idx
  on tmp_phase2a_candidate_map (proposed_gv_id);

create temp table tmp_phase2a_internal_gvid_collisions as
select
  proposed_gv_id,
  count(*)::int as row_count
from tmp_phase2a_candidate_map
group by proposed_gv_id
having count(*) > 1;

create temp table tmp_phase2a_live_gvid_collisions as
select
  candidate.card_print_id,
  candidate.set_code_identity,
  candidate.printed_number,
  candidate.name,
  candidate.proposed_gv_id,
  live.id as live_card_print_id,
  live.set_code as live_set_code,
  live.number as live_number,
  live.name as live_name
from tmp_phase2a_candidate_map candidate
join public.card_prints live
  on live.gv_id = candidate.proposed_gv_id;

-- A. Requested-set proof summary
select jsonb_pretty(
  jsonb_build_object(
    'requested_set_count', (
      select count(*)::int from tmp_phase2a_requested_allowlist
    ),
    'approved_set_count', (
      select count(*)::int from tmp_phase2a_approved_allowlist
    ),
    'candidate_count', (
      select count(*)::int from tmp_phase2a_candidate_map
    ),
    'distinct_card_print_id_count', (
      select count(distinct card_print_id)::int from tmp_phase2a_candidate_map
    ),
    'distinct_proposed_gvid_count', (
      select count(distinct proposed_gv_id)::int from tmp_phase2a_candidate_map
    ),
    'internal_collision_count', (
      select count(*)::int from tmp_phase2a_internal_gvid_collisions
    ),
    'live_collision_count', (
      select count(*)::int from tmp_phase2a_live_gvid_collisions
    )
  )
) as phase2a_summary;

-- B. Candidate counts by approved set
select
  set_code_identity,
  set_name,
  printed_set_abbrev,
  count(*)::int as candidate_count
from tmp_phase2a_candidate_map
group by set_code_identity, set_name, printed_set_abbrev
order by set_code_identity;

-- C. Internal GV-ID collisions (must be empty)
select
  proposed_gv_id,
  row_count
from tmp_phase2a_internal_gvid_collisions
order by proposed_gv_id;

-- D. Live GV-ID collisions (must be empty)
select
  card_print_id,
  set_code_identity,
  printed_number,
  name,
  proposed_gv_id,
  live_card_print_id,
  live_set_code,
  live_number,
  live_name
from tmp_phase2a_live_gvid_collisions
order by set_code_identity, printed_number, card_print_id;

-- E. Candidate preview
select
  card_print_id,
  set_code_identity,
  set_name,
  printed_set_abbrev,
  printed_number,
  name,
  proposed_gv_id
from tmp_phase2a_candidate_map
order by set_code_identity, printed_number, card_print_id
limit 250;
