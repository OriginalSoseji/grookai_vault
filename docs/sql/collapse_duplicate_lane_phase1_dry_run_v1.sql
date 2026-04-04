-- COLLAPSE_DUPLICATE_LANE_V1 / Phase 1
-- Read-only dry run against the live duplicate parent lane.
-- Persistent writes are forbidden. TEMP TABLE creation only.
--
-- Proven-safe scope in this file:
-- - old row = active identity-backed parent with card_prints.gv_id is null
-- - new row = canonical parent with card_prints.gv_id is not null
-- - strict 1:1 exact match on:
--     * set_code_identity
--     * printed_number
--     * normalized_printed_name
-- - cel25 is excluded from this phase
--
-- Run in a dedicated session. TEMP TABLES disappear automatically when the
-- session ends.

drop table if exists tmp_collapse_phase1_excluded_sets;
drop table if exists tmp_collapse_phase1_old_lane;
drop table if exists tmp_collapse_phase1_canonical_lane;
drop table if exists tmp_collapse_phase1_candidate_matches;
drop table if exists tmp_collapse_phase1_old_match_counts;
drop table if exists tmp_collapse_phase1_new_match_counts;
drop table if exists tmp_collapse_phase1_ready_map;
drop table if exists tmp_collapse_phase1_ambiguous_old;
drop table if exists tmp_collapse_phase1_reused_new;
drop table if exists tmp_collapse_phase1_digits_name_only;
drop table if exists tmp_collapse_phase1_unmatched_old;

create temp table tmp_collapse_phase1_excluded_sets (
  set_code_identity text primary key
);

insert into tmp_collapse_phase1_excluded_sets (set_code_identity)
values ('cel25');

create temp table tmp_collapse_phase1_old_lane as
select
  cp.id as old_card_print_id,
  cpi.identity_domain,
  cpi.set_code_identity,
  cpi.printed_number,
  cpi.normalized_printed_name,
  cp.name as old_name_raw,
  cp.gv_id as old_gv_id
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cp.gv_id is null
  and cpi.set_code_identity is not null
  and cpi.printed_number is not null
  and cpi.normalized_printed_name is not null
  and not exists (
    select 1
    from tmp_collapse_phase1_excluded_sets excluded
    where excluded.set_code_identity = cpi.set_code_identity
  );

create index tmp_collapse_phase1_old_lane_identity_idx
  on tmp_collapse_phase1_old_lane (set_code_identity, printed_number, normalized_printed_name);

create temp table tmp_collapse_phase1_canonical_lane as
select
  cp.id as new_card_print_id,
  cp.gv_id,
  cp.set_code as set_code_identity,
  cp.number as printed_number,
  cp.number_plain,
  lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_printed_name,
  cp.name as new_name_raw
from public.card_prints cp
where cp.gv_id is not null
  and cp.set_code is not null
  and cp.number is not null
  and cp.name is not null
  and not exists (
    select 1
    from tmp_collapse_phase1_excluded_sets excluded
    where excluded.set_code_identity = cp.set_code
  );

create index tmp_collapse_phase1_canonical_lane_identity_idx
  on tmp_collapse_phase1_canonical_lane (set_code_identity, printed_number, normalized_printed_name);

create index tmp_collapse_phase1_canonical_lane_number_plain_idx
  on tmp_collapse_phase1_canonical_lane (set_code_identity, number_plain, normalized_printed_name);

create temp table tmp_collapse_phase1_candidate_matches as
select
  old_lane.old_card_print_id,
  canonical_lane.new_card_print_id,
  old_lane.identity_domain,
  old_lane.set_code_identity,
  old_lane.printed_number,
  old_lane.normalized_printed_name,
  old_lane.old_name_raw,
  canonical_lane.new_name_raw,
  canonical_lane.gv_id
from tmp_collapse_phase1_old_lane old_lane
join tmp_collapse_phase1_canonical_lane canonical_lane
  on canonical_lane.set_code_identity = old_lane.set_code_identity
 and canonical_lane.printed_number = old_lane.printed_number
 and canonical_lane.normalized_printed_name = old_lane.normalized_printed_name;

create temp table tmp_collapse_phase1_old_match_counts as
select
  old_card_print_id,
  count(*)::int as match_count
from tmp_collapse_phase1_candidate_matches
group by old_card_print_id;

create temp table tmp_collapse_phase1_new_match_counts as
select
  new_card_print_id,
  count(*)::int as match_count
from tmp_collapse_phase1_candidate_matches
group by new_card_print_id;

create temp table tmp_collapse_phase1_ready_map as
select
  candidate.old_card_print_id,
  candidate.new_card_print_id,
  candidate.identity_domain,
  candidate.set_code_identity,
  candidate.printed_number,
  candidate.normalized_printed_name,
  candidate.old_name_raw,
  candidate.new_name_raw,
  candidate.gv_id
from tmp_collapse_phase1_candidate_matches candidate
join tmp_collapse_phase1_old_match_counts old_counts
  on old_counts.old_card_print_id = candidate.old_card_print_id
join tmp_collapse_phase1_new_match_counts new_counts
  on new_counts.new_card_print_id = candidate.new_card_print_id
where old_counts.match_count = 1
  and new_counts.match_count = 1;

create unique index tmp_collapse_phase1_ready_map_old_uidx
  on tmp_collapse_phase1_ready_map (old_card_print_id);

create unique index tmp_collapse_phase1_ready_map_new_uidx
  on tmp_collapse_phase1_ready_map (new_card_print_id);

create temp table tmp_collapse_phase1_ambiguous_old as
select
  candidate.old_card_print_id,
  candidate.identity_domain,
  candidate.set_code_identity,
  candidate.printed_number,
  candidate.normalized_printed_name,
  count(*)::int as candidate_count
from tmp_collapse_phase1_candidate_matches candidate
group by
  candidate.old_card_print_id,
  candidate.identity_domain,
  candidate.set_code_identity,
  candidate.printed_number,
  candidate.normalized_printed_name
having count(*) > 1;

create temp table tmp_collapse_phase1_reused_new as
select
  candidate.new_card_print_id,
  candidate.gv_id,
  candidate.set_code_identity,
  candidate.printed_number,
  candidate.normalized_printed_name,
  count(*)::int as candidate_count
from tmp_collapse_phase1_candidate_matches candidate
group by
  candidate.new_card_print_id,
  candidate.gv_id,
  candidate.set_code_identity,
  candidate.printed_number,
  candidate.normalized_printed_name
having count(*) > 1;

create temp table tmp_collapse_phase1_digits_name_only as
select distinct
  old_lane.old_card_print_id,
  canonical_lane.new_card_print_id,
  old_lane.set_code_identity,
  old_lane.printed_number as old_printed_number,
  canonical_lane.printed_number as canonical_printed_number,
  canonical_lane.number_plain as canonical_number_plain,
  old_lane.normalized_printed_name,
  canonical_lane.gv_id
from tmp_collapse_phase1_old_lane old_lane
join tmp_collapse_phase1_canonical_lane canonical_lane
  on canonical_lane.set_code_identity = old_lane.set_code_identity
 and canonical_lane.number_plain = nullif(regexp_replace(old_lane.printed_number, '[^0-9]', '', 'g'), '')
 and canonical_lane.normalized_printed_name = old_lane.normalized_printed_name
where not exists (
  select 1
  from tmp_collapse_phase1_ready_map ready
  where ready.old_card_print_id = old_lane.old_card_print_id
);

create temp table tmp_collapse_phase1_unmatched_old as
select
  old_lane.old_card_print_id,
  old_lane.identity_domain,
  old_lane.set_code_identity,
  old_lane.printed_number,
  old_lane.normalized_printed_name,
  old_lane.old_name_raw
from tmp_collapse_phase1_old_lane old_lane
where not exists (
  select 1
  from tmp_collapse_phase1_ready_map ready
  where ready.old_card_print_id = old_lane.old_card_print_id
);

-- A. Phase 1 summary
select jsonb_pretty(
  jsonb_build_object(
    'excluded_set_codes', (
      select coalesce(jsonb_agg(set_code_identity order by set_code_identity), '[]'::jsonb)
      from tmp_collapse_phase1_excluded_sets
    ),
    'strict_old_lane_count', (
      select count(*)::int from tmp_collapse_phase1_old_lane
    ),
    'strict_candidate_match_rows', (
      select count(*)::int from tmp_collapse_phase1_candidate_matches
    ),
    'strict_ready_collapse_map_count', (
      select count(*)::int from tmp_collapse_phase1_ready_map
    ),
    'strict_ambiguous_old_count', (
      select count(*)::int from tmp_collapse_phase1_ambiguous_old
    ),
    'strict_reused_new_count', (
      select count(*)::int from tmp_collapse_phase1_reused_new
    ),
    'digits_name_only_count', (
      select count(*)::int from tmp_collapse_phase1_digits_name_only
    ),
    'still_unmatched_old_count', (
      select count(*)::int
      from tmp_collapse_phase1_unmatched_old unmatched
      where not exists (
        select 1
        from tmp_collapse_phase1_digits_name_only relaxed
        where relaxed.old_card_print_id = unmatched.old_card_print_id
      )
    ),
    'old_lane_unique_ok', (
      select count(*)::int = count(distinct old_card_print_id)::int
      from tmp_collapse_phase1_old_lane
    ),
    'ready_old_unique_ok', (
      select count(*)::int = count(distinct old_card_print_id)::int
      from tmp_collapse_phase1_ready_map
    ),
    'ready_new_unique_ok', (
      select count(*)::int = count(distinct new_card_print_id)::int
      from tmp_collapse_phase1_ready_map
    ),
    'phase1_contract', jsonb_build_object(
      'match_rule', 'set_code_identity + printed_number + normalized_printed_name exact',
      'safe_scope', 'only tmp_collapse_phase1_ready_map is eligible for collapse',
      'blocked_scope', 'digits-only matches, ambiguous matches, and unmatched rows remain deferred'
    )
  )
) as phase1_summary;

-- B. Insert-safe collapse map preview
select
  old_card_print_id,
  new_card_print_id,
  identity_domain,
  set_code_identity,
  printed_number,
  normalized_printed_name,
  gv_id
from tmp_collapse_phase1_ready_map
order by set_code_identity, printed_number, normalized_printed_name, old_card_print_id
limit 250;

-- C. Ambiguous old-side matches that must block collapse
select
  old_card_print_id,
  identity_domain,
  set_code_identity,
  printed_number,
  normalized_printed_name,
  candidate_count
from tmp_collapse_phase1_ambiguous_old
order by set_code_identity, printed_number, normalized_printed_name, old_card_print_id
limit 250;

-- D. Canonical targets reused by more than one old row
select
  new_card_print_id,
  gv_id,
  set_code_identity,
  printed_number,
  normalized_printed_name,
  candidate_count
from tmp_collapse_phase1_reused_new
order by set_code_identity, printed_number, normalized_printed_name, new_card_print_id
limit 250;

-- E. Digits-only near matches intentionally excluded from Phase 1
select
  old_card_print_id,
  new_card_print_id,
  set_code_identity,
  old_printed_number,
  canonical_printed_number,
  canonical_number_plain,
  normalized_printed_name,
  gv_id
from tmp_collapse_phase1_digits_name_only
order by set_code_identity, old_printed_number, normalized_printed_name, old_card_print_id
limit 250;

-- F. Still-unmatched rows after strict Phase 1
select
  old_card_print_id,
  identity_domain,
  set_code_identity,
  printed_number,
  normalized_printed_name,
  old_name_raw
from tmp_collapse_phase1_unmatched_old
where not exists (
  select 1
  from tmp_collapse_phase1_digits_name_only relaxed
  where relaxed.old_card_print_id = tmp_collapse_phase1_unmatched_old.old_card_print_id
)
order by set_code_identity, printed_number, normalized_printed_name, old_card_print_id
limit 250;
