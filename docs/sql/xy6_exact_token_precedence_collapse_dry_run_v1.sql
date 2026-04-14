-- XY6_EXACT_TOKEN_PRECEDENCE_COLLAPSE_V1
-- Dry-run proof for the single xy6 exact-token precedence collapse.

begin;

drop table if exists tmp_xy6_exact_source_v1;
drop table if exists tmp_xy6_exact_candidates_v1;
drop table if exists tmp_xy6_exact_metrics_v1;
drop table if exists tmp_xy6_exact_collapse_map_v1;

create temp table tmp_xy6_exact_source_v1 on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
  cp.variant_key as old_variant_key,
  cpi.set_code_identity as source_set_code_identity,
  coalesce(nullif(cp.set_code, ''), cpi.set_code_identity) as effective_source_set_code,
  cpi.printed_number as old_printed_token,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix,
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
  ) as normalized_name
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cp.id = 'dc8c3dce-bede-47d2-ac8a-095bb633a3ba'
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'xy6'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_xy6_exact_candidates_v1 on commit drop as
select
  s.old_id,
  s.old_name,
  s.old_printed_token,
  s.normalized_name,
  s.normalized_token,
  cp.id as new_id,
  cp.name as new_name,
  cp.number as new_number,
  cp.number_plain as new_number_plain,
  cp.variant_key as new_variant_key,
  cp.gv_id as new_gv_id,
  case
    when cp.number = s.old_printed_token then 'exact_token'
    when cp.number ~ ('^' || s.normalized_token || '[A-Za-z]+$') then 'suffix'
    else 'other'
  end as match_type
from tmp_xy6_exact_source_v1 s
join public.card_prints cp
  on cp.set_code = 'xy6'
 and cp.gv_id is not null
 and cp.number_plain = s.normalized_token
 and btrim(
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
    ) = s.normalized_name;

create temp table tmp_xy6_exact_metrics_v1 on commit drop as
select
  s.old_id,
  count(c.new_id)::int as candidate_count,
  count(*) filter (where c.match_type = 'exact_token')::int as exact_token_candidate_count,
  count(*) filter (where c.match_type = 'suffix')::int as suffix_candidate_count,
  count(*) filter (where c.match_type not in ('exact_token', 'suffix'))::int as additional_candidate_count
from tmp_xy6_exact_source_v1 s
left join tmp_xy6_exact_candidates_v1 c
  on c.old_id = s.old_id
group by s.old_id;

create temp table tmp_xy6_exact_collapse_map_v1 on commit drop as
select
  s.old_id,
  s.old_name,
  s.old_printed_token,
  c.new_id as chosen_target_id,
  c.new_gv_id as chosen_target_gv_id
from tmp_xy6_exact_source_v1 s
join tmp_xy6_exact_candidates_v1 c
  on c.old_id = s.old_id
 and c.match_type = 'exact_token';

with reused_targets as (
  select chosen_target_id
  from tmp_xy6_exact_collapse_map_v1
  group by chosen_target_id
  having count(*) > 1
)
select
  (select count(*)::int from tmp_xy6_exact_source_v1) as source_count,
  (select count(*)::int from tmp_xy6_exact_candidates_v1) as candidate_count,
  (select count(*)::int from tmp_xy6_exact_candidates_v1 where match_type = 'exact_token') as exact_token_candidate_count,
  (select count(*)::int from tmp_xy6_exact_candidates_v1 where match_type = 'suffix') as suffix_candidate_count,
  (select count(*)::int from tmp_xy6_exact_metrics_v1 where additional_candidate_count > 0) as additional_candidate_count,
  (select count(*)::int from tmp_xy6_exact_metrics_v1 where candidate_count = 0) as unmatched_count,
  (select count(*)::int from reused_targets) as reused_target_count,
  (select count(*)::int from tmp_xy6_exact_collapse_map_v1) as chosen_target_count;

select
  s.old_id,
  s.old_name,
  s.old_printed_token,
  max(c.new_id) filter (where c.match_type = 'exact_token') as exact_target_id,
  max(c.new_gv_id) filter (where c.match_type = 'exact_token') as exact_target_gv_id,
  max(c.new_id) filter (where c.match_type = 'suffix') as suffix_target_id,
  max(c.new_gv_id) filter (where c.match_type = 'suffix') as suffix_target_gv_id,
  max(m.chosen_target_id) as chosen_target_id,
  max(m.chosen_target_gv_id) as chosen_target_gv_id,
  'exact-token candidate preserves printed token 77 while suffix candidate requires escalation to 77a; exact-token precedence therefore resolves the row to GV-PK-ROS-77' as proof_reason
from tmp_xy6_exact_source_v1 s
left join tmp_xy6_exact_candidates_v1 c
  on c.old_id = s.old_id
left join tmp_xy6_exact_collapse_map_v1 m
  on m.old_id = s.old_id
group by s.old_id, s.old_name, s.old_printed_token;

rollback;
