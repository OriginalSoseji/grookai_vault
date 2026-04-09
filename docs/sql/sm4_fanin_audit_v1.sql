-- SM4_ACTIVE_IDENTITY_FANIN_RESOLUTION_V1
-- Live proof for resolving the sm4 active-identity fan-in blocker.
-- Expected live counts on 2026-04-07:
--   unresolved_source_count = 25
--   canonical_target_count = 124
--   exact_match_count = 0
--   same_token_different_name_count = 24
--   exact_unmatched_count = 25
--   classification = BASE_VARIANT_COLLAPSE
--   lawful_base_variant_map_count = 25
--   lawful_reused_target_count = 1
--   name_normalize_v2_count = 24
--   suffix_variant_count = 1
--   fan_in_group_count = 1
--   archived_identity_count = 1

begin;

drop table if exists tmp_sm4_fanin_source_unresolved_v1;
drop table if exists tmp_sm4_fanin_canonical_targets_v1;
drop table if exists tmp_sm4_fanin_exact_match_audit_v1;
drop table if exists tmp_sm4_fanin_base_variant_map_v1;
drop table if exists tmp_sm4_fanin_active_identity_rows_v1;

create temp table tmp_sm4_fanin_source_unresolved_v1 on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
  cp.set_code as old_set_code,
  cp.number as old_parent_number,
  cp.number_plain as old_parent_number_plain,
  cpi.printed_number as source_printed_number,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as source_base_number_plain,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix,
  btrim(
    regexp_replace(
      regexp_replace(
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
        '\s*-\s*gx\b',
        ' gx',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as source_name_normalized_v2,
  lower(btrim(coalesce(cpi.normalized_printed_name, cp.name))) as source_exact_name_key
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'sm4'
  and cp.gv_id is null;

create temp table tmp_sm4_fanin_canonical_targets_v1 on commit drop as
select
  cp.id as new_id,
  cp.name as new_name,
  cp.set_code as new_set_code,
  cp.number as new_number,
  cp.number_plain as new_number_plain,
  cp.gv_id as new_gv_id,
  btrim(
    regexp_replace(
      regexp_replace(
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
        '\s*-\s*gx\b',
        ' gx',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as target_name_normalized_v2,
  lower(btrim(cp.name)) as target_exact_name_key
from public.card_prints cp
where cp.set_code = 'sm4'
  and cp.gv_id is not null;

create temp table tmp_sm4_fanin_exact_match_audit_v1 on commit drop as
with token_candidates as (
  select
    s.old_id,
    s.old_name,
    s.source_printed_number,
    s.source_exact_name_key,
    c.new_id,
    c.new_name,
    c.new_number,
    c.new_gv_id,
    c.target_exact_name_key
  from tmp_sm4_fanin_source_unresolved_v1 s
  left join tmp_sm4_fanin_canonical_targets_v1 c
    on c.new_number = s.source_printed_number
)
select
  s.old_id,
  count(c.new_id)::int as same_token_candidate_count,
  count(c.new_id) filter (where c.target_exact_name_key = s.source_exact_name_key)::int as exact_match_count,
  count(c.new_id) filter (where c.target_exact_name_key <> s.source_exact_name_key)::int as same_token_different_name_count
from tmp_sm4_fanin_source_unresolved_v1 s
left join token_candidates c
  on c.old_id = s.old_id
group by s.old_id, s.source_exact_name_key;

create temp table tmp_sm4_fanin_base_variant_map_v1 on commit drop as
select
  s.old_id,
  s.old_name,
  s.old_set_code,
  s.old_parent_number,
  s.old_parent_number_plain,
  s.source_printed_number,
  s.source_base_number_plain,
  s.source_number_suffix,
  s.source_name_normalized_v2,
  c.new_id,
  c.new_name,
  c.new_set_code,
  c.new_number,
  c.new_number_plain,
  c.new_gv_id,
  c.target_name_normalized_v2,
  case
    when s.source_printed_number <> c.new_number then 'suffix_variant'
    else 'name_normalize_v2'
  end as match_category
from tmp_sm4_fanin_source_unresolved_v1 s
join tmp_sm4_fanin_canonical_targets_v1 c
  on c.new_number_plain = s.source_base_number_plain
 and c.target_name_normalized_v2 = s.source_name_normalized_v2;

create temp table tmp_sm4_fanin_active_identity_rows_v1 on commit drop as
select
  cpi.id as identity_id,
  cpi.card_print_id as old_id,
  cpi.printed_number as identity_printed_number,
  cpi.normalized_printed_name,
  cpi.source_name_raw,
  cpi.is_active
from public.card_print_identity cpi
where cpi.card_print_id in (select old_id from tmp_sm4_fanin_base_variant_map_v1)
  and cpi.is_active = true;

-- 1. Unresolved source count
select count(*)::int as unresolved_source_count
from tmp_sm4_fanin_source_unresolved_v1;

-- 2. Canonical target count
select count(*)::int as canonical_target_count
from tmp_sm4_fanin_canonical_targets_v1;

-- 3. Exact-token audit used for class detection
select
  (select count(*)::int from tmp_sm4_fanin_exact_match_audit_v1 where exact_match_count = 1) as exact_match_count,
  (select count(*)::int from tmp_sm4_fanin_exact_match_audit_v1 where exact_match_count > 1) as exact_multiple_match_count,
  (select count(*)::int from tmp_sm4_fanin_exact_match_audit_v1 where same_token_different_name_count > 0) as same_token_different_name_count,
  (select count(*)::int from tmp_sm4_fanin_exact_match_audit_v1 where exact_match_count = 0) as exact_unmatched_count;

-- 4. Representative blocked pairs
select
  s.old_id,
  s.old_name,
  s.source_printed_number as old_printed_token,
  c.new_id as candidate_canonical_id,
  c.new_name as candidate_canonical_name,
  c.new_gv_id as candidate_canonical_gv_id
from tmp_sm4_fanin_source_unresolved_v1 s
join tmp_sm4_fanin_canonical_targets_v1 c
  on c.new_number = s.source_printed_number
where lower(btrim(c.new_name)) <> s.source_exact_name_key
order by
  coalesce(nullif(regexp_replace(s.source_printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
  s.source_printed_number,
  s.old_id
limit 12;

-- 5. Base-variant map proof
with old_counts as (
  select old_id, count(*)::int as match_count
  from tmp_sm4_fanin_base_variant_map_v1
  group by old_id
),
new_counts as (
  select new_id, count(*)::int as match_count
  from tmp_sm4_fanin_base_variant_map_v1
  group by new_id
)
select
  (select count(*)::int from tmp_sm4_fanin_base_variant_map_v1) as lawful_base_variant_map_count,
  (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
  (select count(*)::int from new_counts where match_count > 1) as reused_target_count,
  (
    select count(*)::int
    from tmp_sm4_fanin_source_unresolved_v1 s
    where not exists (
      select 1
      from tmp_sm4_fanin_base_variant_map_v1 m
      where m.old_id = s.old_id
    )
  ) as unmatched_count,
  (
    select count(*)::int
    from tmp_sm4_fanin_base_variant_map_v1
    where new_set_code <> 'sm4'
  ) as cross_set_target_count,
  (
    select count(distinct new_id)::int
    from tmp_sm4_fanin_base_variant_map_v1
  ) as distinct_target_count;

-- 6. Fan-in groups
select
  new_id as target_card_print_id,
  new_name as canonical_target_name,
  new_number as canonical_target_number,
  new_gv_id as canonical_target_gv_id,
  count(*)::int as incoming_sources,
  array_agg(old_id order by source_printed_number, old_id) as source_ids,
  array_agg(old_name order by source_printed_number, old_id) as source_names,
  array_agg(source_printed_number order by source_printed_number, old_id) as source_tokens,
  array_agg(match_category order by source_printed_number, old_id) as match_categories
from tmp_sm4_fanin_base_variant_map_v1
group by new_id, new_name, new_number, new_gv_id
having count(*) > 1
order by new_number::int, new_id;

-- 7. Fan-in selection proof using live active identity rows
with fan_in_rows as (
  select
    m.new_id as target_card_print_id,
    m.new_name as canonical_target_name,
    m.new_number as canonical_target_number,
    m.new_gv_id as canonical_target_gv_id,
    m.old_id as source_old_id,
    m.old_name as source_old_name,
    m.source_printed_number as source_printed_number,
    i.identity_id,
    i.identity_printed_number,
    i.normalized_printed_name,
    i.is_active,
    case
      when btrim(
        regexp_replace(
          regexp_replace(
            replace(
              replace(
                replace(
                  replace(lower(coalesce(i.source_name_raw, m.old_name)), chr(8217), ''''),
                  chr(96),
                  ''''
                ),
                chr(180),
                ''''
              ),
              chr(8212),
              ' '
            ),
            '\s*-\s*gx\b',
            ' gx',
            'g'
          ),
          '\s+',
          ' ',
          'g'
        )
      ) = m.target_name_normalized_v2 then 1
      else 0
    end as name_match_rank,
    case
      when i.identity_printed_number = m.new_number then 1
      else 0
    end as token_match_rank,
    i.identity_id::text as deterministic_tiebreak
  from tmp_sm4_fanin_base_variant_map_v1 m
  join tmp_sm4_fanin_active_identity_rows_v1 i
    on i.old_id = m.old_id
),
ranked as (
  select
    *,
    row_number() over (
      partition by target_card_print_id
      order by
        name_match_rank desc,
        token_match_rank desc,
        deterministic_tiebreak asc
    ) as resolution_rank
  from fan_in_rows
  where target_card_print_id in (
    select new_id
    from tmp_sm4_fanin_base_variant_map_v1
    group by new_id
    having count(*) > 1
  )
)
select
  target_card_print_id,
  canonical_target_name,
  canonical_target_number,
  canonical_target_gv_id,
  source_old_id,
  source_old_name,
  source_printed_number,
  identity_id,
  identity_printed_number,
  normalized_printed_name,
  case
    when resolution_rank = 1 then 'keep_active'
    else 'archive_history'
  end as resolution_action,
  name_match_rank,
  token_match_rank,
  resolution_rank
from ranked
order by canonical_target_number::int, resolution_rank, source_printed_number, source_old_id;

-- 8. Normalization path summary
select
  match_category,
  count(*)::int as row_count
from tmp_sm4_fanin_base_variant_map_v1
group by match_category
order by match_category;

-- 9. FK readiness snapshot
select 'card_print_identity' as table_name, count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_id from tmp_sm4_fanin_base_variant_map_v1)
union all
select 'card_print_traits' as table_name, count(*)::int as row_count
from public.card_print_traits
where card_print_id in (select old_id from tmp_sm4_fanin_base_variant_map_v1)
union all
select 'card_printings' as table_name, count(*)::int as row_count
from public.card_printings
where card_print_id in (select old_id from tmp_sm4_fanin_base_variant_map_v1)
union all
select 'external_mappings' as table_name, count(*)::int as row_count
from public.external_mappings
where card_print_id in (select old_id from tmp_sm4_fanin_base_variant_map_v1)
union all
select 'vault_items' as table_name, count(*)::int as row_count
from public.vault_items
where card_id in (select old_id from tmp_sm4_fanin_base_variant_map_v1);

-- 10. Sample planned mappings
select
  old_id,
  old_name,
  source_printed_number as old_printed_number,
  new_id,
  new_name,
  new_number as target_printed_number,
  new_gv_id,
  new_set_code,
  match_category
from tmp_sm4_fanin_base_variant_map_v1
where old_id in (
  '591dc740-d4dc-4e21-b257-55bc072441f1',
  '39339f6a-f300-449e-bb10-b136bb0288eb',
  '4ddc5165-eeed-4416-8e4d-13cd1ec00040'
)
order by source_base_number_plain::int, source_printed_number;

rollback;
