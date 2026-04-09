-- CEL25_DELTA_SPECIES_FINAL_RESOLUTION_V1
-- Dry-run proof for the final single-row cel25 delta-species resolution.

begin;

drop table if exists tmp_cel25_delta_unresolved_all_v1;
drop table if exists tmp_cel25_delta_scope_v1;
drop table if exists tmp_cel25_delta_canonical_v1;
drop table if exists tmp_cel25_delta_candidate_rows_v1;
drop table if exists tmp_cel25_delta_match_counts_v1;
drop table if exists tmp_cel25_delta_collapse_map_v1;

create temp table tmp_cel25_delta_unresolved_all_v1 on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
  cp.variant_key as old_variant_key,
  cpi.printed_number as source_printed_number,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token,
  btrim(
    regexp_replace(
      replace(
        replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
        'δ',
        ' δ '
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as normalized_name
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'cel25'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_cel25_delta_scope_v1 on commit drop as
select *
from tmp_cel25_delta_unresolved_all_v1
where old_id = 'f7c22698-daa3-4412-84ef-436fb1fe130f'
  and old_name = 'Gardevoir ex'
  and source_printed_number = '93A'
  and normalized_token = '93';

create temp table tmp_cel25_delta_canonical_v1 on commit drop as
select
  cp.id as new_id,
  cp.name as new_name,
  cp.number as new_number,
  cp.number_plain as new_number_plain,
  cp.variant_key as new_variant_key,
  cp.gv_id as new_gv_id,
  cp.printed_identity_modifier as new_printed_identity_modifier
from public.card_prints cp
where cp.set_code = 'cel25'
  and cp.gv_id is not null;

create temp table tmp_cel25_delta_candidate_rows_v1 on commit drop as
select
  s.old_id,
  s.old_name,
  s.source_printed_number,
  s.normalized_name,
  s.normalized_token,
  c.new_id,
  c.new_name,
  c.new_number,
  c.new_variant_key,
  c.new_gv_id,
  c.new_printed_identity_modifier
from tmp_cel25_delta_scope_v1 s
join tmp_cel25_delta_canonical_v1 c
  on c.new_number_plain = s.normalized_token
 and c.new_id = 'b4a42612-945d-419f-a4f4-c64ae5c26d6b'
 and c.new_name = 'Gardevoir ex δ'
 and c.new_variant_key = 'cc'
 and c.new_gv_id = 'GV-PK-CEL-93CC'
 and c.new_printed_identity_modifier = 'delta_species';

create temp table tmp_cel25_delta_match_counts_v1 on commit drop as
select
  s.old_id,
  count(distinct c.new_id)::int as candidate_count
from tmp_cel25_delta_scope_v1 s
left join tmp_cel25_delta_candidate_rows_v1 c
  on c.old_id = s.old_id
group by s.old_id;

create temp table tmp_cel25_delta_collapse_map_v1 on commit drop as
select
  row_number() over (order by old_id)::int as seq,
  old_id,
  old_name,
  source_printed_number,
  normalized_name,
  normalized_token,
  new_id,
  new_name,
  new_number,
  new_variant_key,
  new_gv_id,
  new_printed_identity_modifier
from tmp_cel25_delta_candidate_rows_v1;

select
  (select count(*)::int from tmp_cel25_delta_unresolved_all_v1) as total_unresolved_count,
  (select count(*)::int from tmp_cel25_delta_scope_v1) as source_count,
  (
    select count(*)::int
    from tmp_cel25_delta_canonical_v1
    where new_id = 'b4a42612-945d-419f-a4f4-c64ae5c26d6b'
      and new_name = 'Gardevoir ex δ'
      and new_number_plain = '93'
      and new_variant_key = 'cc'
      and new_gv_id = 'GV-PK-CEL-93CC'
      and new_printed_identity_modifier = 'delta_species'
  ) as target_count,
  (
    select count(*)::int
    from tmp_cel25_delta_canonical_v1 c
    join tmp_cel25_delta_scope_v1 s
      on c.new_number_plain = s.normalized_token
  ) as same_token_canonical_count,
  (select count(*)::int from tmp_cel25_delta_match_counts_v1 where candidate_count = 0) as unmatched_count,
  (select count(*)::int from tmp_cel25_delta_match_counts_v1 where candidate_count > 1) as ambiguous_target_count,
  (
    select count(*)::int
    from (
      select new_id
      from tmp_cel25_delta_collapse_map_v1
      group by new_id
      having count(*) > 1
    ) reused
  ) as reused_target_count;

select
  old_id,
  old_name,
  new_id,
  new_gv_id,
  new_printed_identity_modifier as printed_identity_modifier
from tmp_cel25_delta_collapse_map_v1
order by seq;

rollback;
