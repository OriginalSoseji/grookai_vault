-- ECARD2_NAMESPACE_CANONICAL_REUSE_REALIGNMENT_V1
-- Read-only dry-run proof for reusing the 13 existing ecard2 AQ canonical rows.
--
-- Scope:
--   - source rows: unresolved ecard2 parents whose exact AQ canonical target
--     already exists and owns the proposed GV-ID
--   - excluded: the 11 already promoted rows, the 10 blocked rows, all other sets
--   - no mutation

begin;

drop table if exists tmp_ecard2_namespace_reuse_unresolved_v1;
drop table if exists tmp_ecard2_namespace_reuse_candidates_v1;
drop table if exists tmp_ecard2_namespace_reuse_candidate_counts_v1;
drop table if exists tmp_ecard2_namespace_reuse_map_v1;

create temp table tmp_ecard2_namespace_reuse_unresolved_v1 on commit drop as
select
  cp.id as old_id,
  cp.set_id,
  cp.name as old_name,
  coalesce(cp.variant_key, '') as proposed_variant_key,
  cpi.printed_number as old_printed_token,
  case
    when cpi.printed_number is null then null
    when cpi.printed_number ~ '^[A-Za-z][0-9]+$' then upper(cpi.printed_number)
    when cpi.printed_number ~ '[0-9]' then regexp_replace(regexp_replace(cpi.printed_number, '/.*$', ''), '[^A-Za-z0-9]', '', 'g')
    else cpi.printed_number
  end as proposed_number_plain,
  'GV-PK-' || upper(regexp_replace(s.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
    upper(regexp_replace(cpi.printed_number, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'ecard2'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_ecard2_namespace_reuse_candidates_v1 on commit drop as
select
  u.old_id,
  u.old_name,
  u.old_printed_token,
  u.proposed_number_plain,
  u.proposed_variant_key,
  u.proposed_gv_id,
  cp.id as target_id,
  cp.name as target_name,
  cp.number as target_number,
  cp.number_plain as target_number_plain,
  coalesce(cp.variant_key, '') as target_variant_key,
  cp.gv_id as target_gv_id
from tmp_ecard2_namespace_reuse_unresolved_v1 u
join public.card_prints cp
  on cp.gv_id = u.proposed_gv_id
 and cp.set_id = u.set_id
 and lower(trim(cp.name)) = lower(trim(u.old_name))
 and coalesce(cp.number_plain, '') = coalesce(u.proposed_number_plain, '')
 and coalesce(cp.variant_key, '') = coalesce(u.proposed_variant_key, '');

create temp table tmp_ecard2_namespace_reuse_candidate_counts_v1 on commit drop as
select
  u.old_id,
  count(c.target_id)::int as candidate_count
from tmp_ecard2_namespace_reuse_unresolved_v1 u
left join tmp_ecard2_namespace_reuse_candidates_v1 c
  on c.old_id = u.old_id
group by u.old_id;

create temp table tmp_ecard2_namespace_reuse_map_v1 on commit drop as
select
  row_number() over (order by c.old_printed_token, c.old_id)::int as seq,
  c.old_id,
  c.old_name,
  c.old_printed_token,
  c.target_id,
  c.target_gv_id,
  true as identity_equivalence_confirmed
from tmp_ecard2_namespace_reuse_candidates_v1 c
join tmp_ecard2_namespace_reuse_candidate_counts_v1 cc
  on cc.old_id = c.old_id
 and cc.candidate_count = 1;

create unique index tmp_ecard2_namespace_reuse_map_v1_old_uidx
  on tmp_ecard2_namespace_reuse_map_v1 (old_id);

create unique index tmp_ecard2_namespace_reuse_map_v1_target_uidx
  on tmp_ecard2_namespace_reuse_map_v1 (target_id);

select
  count(*) filter (where cp.gv_id is null) as unresolved_parent_count,
  count(*) filter (where cp.gv_id is not null) as canonical_parent_count
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2';

select
  old_id as old_parent_id,
  old_name,
  old_printed_token,
  target_id,
  target_gv_id,
  identity_equivalence_confirmed
from tmp_ecard2_namespace_reuse_map_v1
order by seq;

select
  (select count(*)::int from tmp_ecard2_namespace_reuse_map_v1) as source_count,
  (select count(*)::int from tmp_ecard2_namespace_reuse_candidate_counts_v1 where candidate_count > 1) as ambiguous_mapping_count,
  (select count(*)::int from tmp_ecard2_namespace_reuse_candidate_counts_v1 where candidate_count = 0) as unresolved_rows_outside_reuse_scope,
  (
    select count(*)::int
    from (
      select target_id
      from tmp_ecard2_namespace_reuse_map_v1
      group by target_id
      having count(*) > 1
    ) reused
  ) as reused_target_count;

select
  (select count(*)::int from public.card_print_identity where card_print_id in (select old_id from tmp_ecard2_namespace_reuse_map_v1)) as card_print_identity,
  (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from tmp_ecard2_namespace_reuse_map_v1)) as card_print_traits,
  (select count(*)::int from public.card_printings where card_print_id in (select old_id from tmp_ecard2_namespace_reuse_map_v1)) as card_printings,
  (select count(*)::int from public.external_mappings where card_print_id in (select old_id from tmp_ecard2_namespace_reuse_map_v1)) as external_mappings,
  (select count(*)::int from public.vault_items where card_id in (select old_id from tmp_ecard2_namespace_reuse_map_v1)) as vault_items;

with printing_conflicts as (
  select
    (
      (new_p.provenance_source is null and old_p.provenance_source is not null)
      or (new_p.provenance_ref is null and old_p.provenance_ref is not null)
      or (new_p.created_by is null and old_p.created_by is not null)
    ) as mergeable_metadata_only,
    (
      (new_p.provenance_source is not null and old_p.provenance_source is not null and new_p.provenance_source is distinct from old_p.provenance_source)
      or (new_p.provenance_ref is not null and old_p.provenance_ref is not null and new_p.provenance_ref is distinct from old_p.provenance_ref)
      or (new_p.created_by is not null and old_p.created_by is not null and new_p.created_by is distinct from old_p.created_by)
    ) as conflicting_non_identical
  from public.card_printings old_p
  join tmp_ecard2_namespace_reuse_map_v1 m
    on m.old_id = old_p.card_print_id
  join public.card_printings new_p
    on new_p.card_print_id = m.target_id
   and new_p.finish_key = old_p.finish_key
),
external_conflicts as (
  select count(*)::int as row_count
  from public.external_mappings old_em
  join tmp_ecard2_namespace_reuse_map_v1 m
    on m.old_id = old_em.card_print_id
  join public.external_mappings new_em
    on new_em.card_print_id = m.target_id
   and new_em.source = old_em.source
   and new_em.external_id = old_em.external_id
)
select
  (select count(*)::int from printing_conflicts) as printing_overlap_count,
  (select count(*)::int from printing_conflicts where mergeable_metadata_only) as printing_mergeable_metadata_only_count,
  (select count(*)::int from printing_conflicts where conflicting_non_identical) as printing_conflicting_non_identical_count,
  (select row_count from external_conflicts) as external_overlap_count;

rollback;
