-- CEL25_BASE_VARIANT_COLLAPSE_V1
-- Dry-run proof for the 20-row deterministic base-variant surface.

begin;

drop table if exists tmp_cel25_base_unresolved_v1;
drop table if exists tmp_cel25_base_canonical_v1;
drop table if exists tmp_cel25_base_exact_audit_v1;
drop table if exists tmp_cel25_base_match_rows_v1;
drop table if exists tmp_cel25_base_same_base_diff_name_rows_v1;
drop table if exists tmp_cel25_base_metrics_v1;
drop table if exists tmp_cel25_base_classification_v1;
drop table if exists tmp_cel25_base_collapse_map_v1;

create temp table tmp_cel25_base_unresolved_v1 on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
  cp.set_code as old_set_code,
  cp.number as old_parent_number,
  cp.number_plain as old_parent_number_plain,
  cpi.id as old_identity_id,
  cpi.printed_number as source_printed_number,
  lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\s+', ' ', 'g')) as source_exact_name_key,
  btrim(
    regexp_replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                  chr(96),
                  ''''
                ),
                chr(180),
                ''''
              ),
              chr(8212),
              ' '
            ),
            chr(8211),
            ' '
          ),
          '-gx',
          ' gx'
        ),
        '-ex',
        ' ex'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as source_name_normalized_v3,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as source_base_number_plain,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'cel25'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_cel25_base_canonical_v1 on commit drop as
select
  cp.id as new_id,
  cp.name as new_name,
  cp.set_code as new_set_code,
  cp.number as new_number,
  cp.number_plain as new_number_plain,
  cp.gv_id as new_gv_id,
  lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as target_exact_name_key,
  btrim(
    regexp_replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(lower(cp.name), chr(8217), ''''),
                  chr(96),
                  ''''
                ),
                chr(180),
                ''''
              ),
              chr(8212),
              ' '
            ),
            chr(8211),
            ' '
          ),
          '-gx',
          ' gx'
        ),
        '-ex',
        ' ex'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as target_name_normalized_v3
from public.card_prints cp
where cp.set_code = 'cel25'
  and cp.gv_id is not null;

create temp table tmp_cel25_base_exact_audit_v1 on commit drop as
select
  u.old_id,
  count(c.new_id)::int as same_token_candidate_count,
  count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
  count(c.new_id) filter (where c.target_exact_name_key <> u.source_exact_name_key)::int as same_token_different_name_count
from tmp_cel25_base_unresolved_v1 u
left join tmp_cel25_base_canonical_v1 c
  on c.new_number = u.source_printed_number
group by u.old_id, u.source_exact_name_key;

create temp table tmp_cel25_base_match_rows_v1 on commit drop as
select
  u.old_id,
  u.old_name,
  u.source_printed_number,
  u.source_name_normalized_v3,
  u.source_base_number_plain,
  u.source_number_suffix,
  c.new_id,
  c.new_name,
  c.new_set_code,
  c.new_number,
  c.new_number_plain,
  c.new_gv_id,
  'suffix_variant'::text as match_category
from tmp_cel25_base_unresolved_v1 u
join tmp_cel25_base_canonical_v1 c
  on c.new_number_plain = u.source_base_number_plain
 and c.target_name_normalized_v3 = u.source_name_normalized_v3
where u.source_number_suffix is not null;

create temp table tmp_cel25_base_same_base_diff_name_rows_v1 on commit drop as
select
  u.old_id,
  u.old_name,
  u.source_printed_number,
  u.source_name_normalized_v3,
  u.source_base_number_plain,
  c.new_id,
  c.new_name,
  c.new_set_code,
  c.new_number,
  c.new_number_plain,
  c.new_gv_id
from tmp_cel25_base_unresolved_v1 u
join tmp_cel25_base_canonical_v1 c
  on c.new_number_plain = u.source_base_number_plain
 and c.target_name_normalized_v3 <> u.source_name_normalized_v3
where u.source_number_suffix is not null;

create temp table tmp_cel25_base_metrics_v1 on commit drop as
select
  u.old_id,
  ea.exact_match_count,
  ea.same_token_different_name_count,
  count(distinct bm.new_id)::int as base_match_count,
  count(distinct sbdn.new_id)::int as same_base_different_name_count
from tmp_cel25_base_unresolved_v1 u
join tmp_cel25_base_exact_audit_v1 ea
  on ea.old_id = u.old_id
left join tmp_cel25_base_match_rows_v1 bm
  on bm.old_id = u.old_id
left join tmp_cel25_base_same_base_diff_name_rows_v1 sbdn
  on sbdn.old_id = u.old_id
group by u.old_id, ea.exact_match_count, ea.same_token_different_name_count;

create temp table tmp_cel25_base_classification_v1 on commit drop as
select
  u.old_id,
  u.old_name,
  u.source_printed_number,
  u.source_name_normalized_v3,
  u.source_base_number_plain,
  m.exact_match_count,
  m.same_token_different_name_count,
  m.base_match_count,
  m.same_base_different_name_count,
  case when m.base_match_count = 1 then bm.new_id else null end as new_id,
  case when m.base_match_count = 1 then bm.new_name else null end as new_name,
  case when m.base_match_count = 1 then bm.new_set_code else null end as new_set_code,
  case when m.base_match_count = 1 then bm.new_number else null end as new_number,
  case when m.base_match_count = 1 then bm.new_number_plain else null end as new_number_plain,
  case when m.base_match_count = 1 then bm.new_gv_id else null end as new_gv_id,
  case when m.base_match_count = 1 then bm.match_category else 'invalid' end as match_category,
  case
    when u.source_number_suffix is null then 'UNCLASSIFIED'
    when m.base_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when m.base_match_count > 1 then 'BLOCKED_CONFLICT'
    when m.base_match_count = 0 and m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'UNCLASSIFIED'
  end as execution_class,
  case
    when u.source_number_suffix is null
      then 'unexpected non-suffix unresolved row entered base-variant execution unit'
    when m.base_match_count = 1
      then 'suffix-marked source routes by base number plus normalized name to unique canonical cel25 parent'
    when m.base_match_count > 1
      then 'multiple normalized in-set canonical targets exist for suffix-marked source'
    when m.base_match_count = 0 and m.same_base_different_name_count > 0
      then 'same base number exists in cel25 but name semantics diverge outside deterministic normalization'
    else 'suffix source could not be classified under deterministic normalization'
  end as proof_reason
from tmp_cel25_base_unresolved_v1 u
join tmp_cel25_base_metrics_v1 m
  on m.old_id = u.old_id
left join lateral (
  select *
  from tmp_cel25_base_match_rows_v1 bm
  where bm.old_id = u.old_id
  order by bm.new_number, bm.new_id
  limit 1
) bm on true;

create temp table tmp_cel25_base_collapse_map_v1 on commit drop as
select
  row_number() over (
    order by
      coalesce(nullif(source_base_number_plain, ''), '0')::int,
      source_printed_number,
      old_id
  )::int as seq,
  old_id,
  old_name,
  source_printed_number as old_printed_token,
  source_name_normalized_v3 as normalized_name,
  source_base_number_plain as normalized_token,
  new_id,
  new_name,
  new_number as new_printed_token,
  new_gv_id,
  match_category,
  proof_reason
from tmp_cel25_base_classification_v1
where execution_class = 'BASE_VARIANT_COLLAPSE';

select
  (select count(*)::int from tmp_cel25_base_unresolved_v1) as total_unresolved_count,
  (select count(*)::int from tmp_cel25_base_classification_v1 where execution_class = 'BASE_VARIANT_COLLAPSE') as source_count,
  (select count(*)::int from tmp_cel25_base_classification_v1 where execution_class = 'BLOCKED_CONFLICT') as blocked_count,
  (select count(*)::int from tmp_cel25_base_classification_v1 where execution_class = 'UNCLASSIFIED') as unclassified_count,
  (select count(*)::int from tmp_cel25_base_canonical_v1) as canonical_target_count;

select
  (select count(*)::int from tmp_cel25_base_classification_v1 where execution_class = 'BASE_VARIANT_COLLAPSE' and exact_match_count = 1) as exact_lawful_matches,
  (select count(*)::int from tmp_cel25_base_classification_v1 where execution_class = 'BASE_VARIANT_COLLAPSE' and same_token_different_name_count > 0) as same_token_different_name_conflicts,
  (select count(*)::int from tmp_cel25_base_classification_v1 where execution_class = 'BASE_VARIANT_COLLAPSE' and exact_match_count = 0) as exact_unmatched_rows,
  (
    select count(*)::int
    from (
      select new_id
      from tmp_cel25_base_collapse_map_v1
      group by new_id
      having count(*) > 1
    ) reused
  ) as reused_targets;

select
  (select count(*)::int from tmp_cel25_base_collapse_map_v1) as normalized_mapping_count,
  (
    select count(*)::int
    from tmp_cel25_base_metrics_v1 m
    join tmp_cel25_base_classification_v1 c
      on c.old_id = m.old_id
    where c.execution_class = 'BASE_VARIANT_COLLAPSE'
      and m.base_match_count > 1
  ) as ambiguous_groups,
  (select count(*)::int from tmp_cel25_base_classification_v1 where execution_class = 'UNCLASSIFIED') as invalid_groups,
  (select count(*)::int from tmp_cel25_base_collapse_map_v1 where match_category = 'suffix_variant') as suffix_route_matches;

select count(*)::int as fan_in_group_count
from (
  select new_id
  from tmp_cel25_base_collapse_map_v1
  group by new_id
  having count(*) > 1
) fan_in;

select 'card_print_identity' as table_name, count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_id from tmp_cel25_base_collapse_map_v1)
union all
select 'card_print_traits', count(*)::int
from public.card_print_traits
where card_print_id in (select old_id from tmp_cel25_base_collapse_map_v1)
union all
select 'card_printings', count(*)::int
from public.card_printings
where card_print_id in (select old_id from tmp_cel25_base_collapse_map_v1)
union all
select 'external_mappings', count(*)::int
from public.external_mappings
where card_print_id in (select old_id from tmp_cel25_base_collapse_map_v1)
union all
select 'vault_items', count(*)::int
from public.vault_items
where card_id in (select old_id from tmp_cel25_base_collapse_map_v1)
order by table_name;

select
  old_id as blocked_old_id,
  old_name,
  source_printed_number as blocked_printed_token,
  proof_reason
from tmp_cel25_base_classification_v1
where execution_class = 'BLOCKED_CONFLICT'
order by source_printed_number, old_id;

select
  seq,
  old_id,
  old_name,
  old_printed_token,
  normalized_name,
  normalized_token,
  new_id,
  new_name,
  new_printed_token,
  new_gv_id
from tmp_cel25_base_collapse_map_v1
order by seq;

rollback;
