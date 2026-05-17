-- ME01 DUPLICATE RESOLUTION DESIGN 2026-05-17
-- STATUS: PLAN ONLY. DO NOT EXECUTE WRITE SECTIONS AGAINST PRODUCTION.
--
-- This file is safe by default. The first section is read-only.
-- Future write statements are commented and require separate approval.

begin transaction read only;

-- Scope check: current me01 shape.
select
  s.code as set_code,
  s.name as set_name,
  s.printed_total,
  count(cp.id)::int as total_card_prints,
  count(*) filter (where cp.number is null or btrim(cp.number) = '')::int as missing_number_rows,
  count(distinct nullif(cp.number, ''))::int as distinct_direct_numbers
from public.sets s
join public.card_prints cp on cp.set_id = s.id
where s.game = 'pokemon'
  and s.code = 'me01'
group by s.code, s.name, s.printed_total;

-- Candidate/incumbent duplicate-pair read-only derivation.
with candidate as (
  select
    cp.id as candidate_card_print_id,
    cp.name as candidate_name,
    regexp_replace(cp.external_ids->>'tcgdex', '^.*-', '') as proposed_number
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  join public.external_mappings em
    on em.card_print_id = cp.id
   and em.source = 'tcgdex'
   and em.active = true
  where s.game = 'pokemon'
    and s.code = 'me01'
    and (cp.number is null or btrim(cp.number) = '')
    and (cp.number_plain is null or btrim(cp.number_plain) = '')
    and cp.external_ids ? 'tcgdex'
),
incumbent as (
  select
    cp.id as incumbent_card_print_id,
    cp.name as incumbent_name,
    cp.number,
    cp.number_plain
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  where s.game = 'pokemon'
    and s.code = 'me01'
    and cp.number is not null
    and cp.number_plain is not null
),
pairs as (
  select
    c.candidate_card_print_id,
    i.incumbent_card_print_id,
    c.candidate_name,
    i.incumbent_name,
    c.proposed_number,
    i.number,
    i.number_plain
  from candidate c
  join incumbent i
    on lower(regexp_replace(c.candidate_name, '[^a-zA-Z0-9]+', ' ', 'g')) =
       lower(regexp_replace(i.incumbent_name, '[^a-zA-Z0-9]+', ' ', 'g'))
   and c.proposed_number::int::text = i.number::int::text
)
select
  count(*)::int as duplicate_pairs,
  count(distinct candidate_card_print_id)::int as candidate_rows,
  count(distinct incumbent_card_print_id)::int as incumbent_rows
from pairs;

-- Hard-stop referenced candidate rows.
with candidate_ids as (
  select cp.id
  from public.card_prints cp
  join public.sets s on s.id = cp.set_id
  join public.external_mappings em
    on em.card_print_id = cp.id
   and em.source = 'tcgdex'
   and em.active = true
  where s.game = 'pokemon'
    and s.code = 'me01'
    and (cp.number is null or btrim(cp.number) = '')
    and (cp.number_plain is null or btrim(cp.number_plain) = '')
)
select
  cp.id as candidate_card_print_id,
  cp.name,
  count(pw.card_print_id)::int as pricing_watch_refs,
  count(vii.card_print_id)::int as vault_item_instance_refs,
  count(vi.card_id)::int as vault_item_refs
from candidate_ids c
join public.card_prints cp on cp.id = c.id
left join public.pricing_watch pw on pw.card_print_id = cp.id
left join public.vault_item_instances vii on vii.card_print_id = cp.id
left join public.vault_items vi on vi.card_id = cp.id
group by cp.id, cp.name
having count(pw.card_print_id) > 0
    or count(vii.card_print_id) > 0
    or count(vi.card_id) > 0
order by cp.name;

rollback;

-- FUTURE WRITE SECTION - COMMENTED BY DESIGN.
-- Do not uncomment without fresh evidence, explicit approval, rollback snapshots,
-- and separate handling for the two referenced candidate rows.
--
-- begin;
--
-- -- Future preflight tables should be temporary and populated from a reviewed matrix.
-- -- create temporary table tmp_me01_duplicate_resolution_approved_v1 (
-- --   candidate_card_print_id uuid primary key,
-- --   incumbent_card_print_id uuid not null,
-- --   tcgdex_external_id text not null,
-- --   resolution_lane text not null check (resolution_lane in (
-- --     'unreferenced_candidate',
-- --     'referenced_candidate_manual'
-- --   ))
-- -- ) on commit drop;
--
-- -- Guard: referenced candidates must not enter the unreferenced lane.
-- -- select count(*) as referenced_candidate_in_bulk_lane
-- -- from tmp_me01_duplicate_resolution_approved_v1 a
-- -- join public.pricing_watch pw on pw.card_print_id = a.candidate_card_print_id
-- -- where a.resolution_lane = 'unreferenced_candidate'
-- -- union all
-- -- select count(*)
-- -- from tmp_me01_duplicate_resolution_approved_v1 a
-- -- join public.vault_item_instances vii on vii.card_print_id = a.candidate_card_print_id
-- -- where a.resolution_lane = 'unreferenced_candidate'
-- -- union all
-- -- select count(*)
-- -- from tmp_me01_duplicate_resolution_approved_v1 a
-- -- join public.vault_items vi on vi.card_id = a.candidate_card_print_id
-- -- where a.resolution_lane = 'unreferenced_candidate';
--
-- -- Guard: no active duplicate source/external ownership after planned mapping move.
-- -- select em.source, em.external_id, count(distinct em.card_print_id) as active_owner_count
-- -- from public.external_mappings em
-- -- join tmp_me01_duplicate_resolution_approved_v1 a
-- --   on em.external_id = a.tcgdex_external_id
-- -- where em.source = 'tcgdex'
-- --   and em.active = true
-- -- group by em.source, em.external_id
-- -- having count(distinct em.card_print_id) <> 1;
--
-- -- Future mapping movement shape only.
-- -- update public.external_mappings em
-- -- set card_print_id = a.incumbent_card_print_id
-- -- from tmp_me01_duplicate_resolution_approved_v1 a
-- -- where em.card_print_id = a.candidate_card_print_id
-- --   and em.source = 'tcgdex'
-- --   and em.active = true
-- --   and a.resolution_lane = 'unreferenced_candidate';
--
-- -- Candidate row retirement must use a supported non-destructive mechanism only.
-- -- No delete statement belongs in this plan.
--
-- rollback;
