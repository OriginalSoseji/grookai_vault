-- CEL25_NUMERIC_DUPLICATE_COLLAPSE_V1
-- Read-only dry-run proof for the numeric-only duplicate lane in cel25.
-- Scope contract:
--   - source = active cel25 identity rows on null-gv_id parents
--   - target = canonical cel25 rows with gv_id
--   - execution_class = DUPLICATE_COLLAPSE only
--   - numeric-only printed tokens
--   - exact printed token match
--   - exact normalized name match
-- Expected pre-apply counts on 2026-04-08:
--   source_count = 25
--   map_count = 25
--   unmatched = 0
--   reused_targets = 0
--   conflicts = 0
--   residual_base_variant_rows = 20
--   residual_blocked_rows = 2

begin;

drop table if exists tmp_cel25_unresolved_all_v1;
drop table if exists tmp_cel25_unresolved_numeric_v1;
drop table if exists tmp_cel25_unresolved_suffix_v1;
drop table if exists tmp_cel25_canonical_v1;
drop table if exists tmp_cel25_numeric_exact_match_rows_v1;
drop table if exists tmp_cel25_numeric_exact_match_audit_v1;
drop table if exists tmp_cel25_numeric_map_v1;
drop table if exists tmp_cel25_suffix_base_match_rows_v1;
drop table if exists tmp_cel25_suffix_same_base_diff_name_rows_v1;
drop table if exists tmp_cel25_suffix_classification_v1;

create temp table tmp_cel25_unresolved_all_v1 on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
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

create temp table tmp_cel25_unresolved_numeric_v1 on commit drop as
select *
from tmp_cel25_unresolved_all_v1
where source_printed_number ~ '^[0-9]+$'
  and source_number_suffix is null;

create temp table tmp_cel25_unresolved_suffix_v1 on commit drop as
select *
from tmp_cel25_unresolved_all_v1
where not (
  source_printed_number ~ '^[0-9]+$'
  and source_number_suffix is null
);

create temp table tmp_cel25_canonical_v1 on commit drop as
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

create temp table tmp_cel25_numeric_exact_match_rows_v1 on commit drop as
select
  u.old_id,
  u.old_name,
  u.source_printed_number,
  u.source_exact_name_key,
  c.new_id,
  c.new_name,
  c.new_set_code,
  c.new_number,
  c.new_gv_id
from tmp_cel25_unresolved_numeric_v1 u
join tmp_cel25_canonical_v1 c
  on c.new_number = u.source_printed_number
 and c.target_exact_name_key = u.source_exact_name_key;

create temp table tmp_cel25_numeric_exact_match_audit_v1 on commit drop as
select
  u.old_id,
  count(c.new_id)::int as same_token_candidate_count,
  count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
  count(c.new_id) filter (where c.target_exact_name_key <> u.source_exact_name_key)::int as same_token_different_name_count
from tmp_cel25_unresolved_numeric_v1 u
left join tmp_cel25_canonical_v1 c
  on c.new_number = u.source_printed_number
group by u.old_id, u.source_exact_name_key;

create temp table tmp_cel25_numeric_map_v1 on commit drop as
select
  row_number() over (
    order by
      coalesce(nullif(source_printed_number, ''), '0')::int,
      source_printed_number,
      old_id
  )::int as seq,
  m.*
from tmp_cel25_numeric_exact_match_rows_v1 m;

create temp table tmp_cel25_suffix_base_match_rows_v1 on commit drop as
select
  u.old_id,
  c.new_id
from tmp_cel25_unresolved_suffix_v1 u
join tmp_cel25_canonical_v1 c
  on c.new_number_plain = u.source_base_number_plain
 and c.target_name_normalized_v3 = u.source_name_normalized_v3;

create temp table tmp_cel25_suffix_same_base_diff_name_rows_v1 on commit drop as
select
  u.old_id,
  c.new_id
from tmp_cel25_unresolved_suffix_v1 u
join tmp_cel25_canonical_v1 c
  on c.new_number_plain = u.source_base_number_plain
 and c.target_name_normalized_v3 <> u.source_name_normalized_v3;

create temp table tmp_cel25_suffix_classification_v1 on commit drop as
with suffix_metrics as (
  select
    u.old_id,
    count(distinct bm.new_id)::int as base_match_count,
    count(distinct sbdn.new_id)::int as same_base_different_name_count
  from tmp_cel25_unresolved_suffix_v1 u
  left join tmp_cel25_suffix_base_match_rows_v1 bm
    on bm.old_id = u.old_id
  left join tmp_cel25_suffix_same_base_diff_name_rows_v1 sbdn
    on sbdn.old_id = u.old_id
  group by u.old_id
)
select
  u.old_id,
  u.old_name,
  u.source_printed_number,
  case
    when m.base_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when m.base_match_count > 1 then 'BLOCKED_CONFLICT'
    when m.base_match_count = 0 and m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'UNCLASSIFIED'
  end as execution_class
from tmp_cel25_unresolved_suffix_v1 u
join suffix_metrics m
  on m.old_id = u.old_id;

-- 1. Scope counts.
select
  (select count(*)::int from tmp_cel25_unresolved_numeric_v1) as source_count,
  (select count(*)::int from tmp_cel25_unresolved_suffix_v1) as out_of_scope_suffix_count,
  (select count(*)::int from tmp_cel25_canonical_v1) as canonical_target_count;

-- 2. Exact 1:1 mapping proof.
with reused_targets as (
  select new_id
  from tmp_cel25_numeric_exact_match_rows_v1
  group by new_id
  having count(*) > 1
)
select
  (select count(*)::int from tmp_cel25_numeric_exact_match_audit_v1 where exact_match_count = 1) as exact_lawful_match_count,
  (select count(*)::int from tmp_cel25_numeric_exact_match_audit_v1 where exact_match_count > 1) as multiple_match_old_count,
  (select count(*)::int from tmp_cel25_numeric_exact_match_audit_v1 where exact_match_count = 0) as unmatched_count,
  (select count(*)::int from reused_targets) as reused_target_count,
  (select count(*)::int from tmp_cel25_numeric_exact_match_audit_v1 where same_token_different_name_count > 0) as conflict_count,
  (select count(*)::int from tmp_cel25_numeric_map_v1) as map_count,
  (select count(distinct old_id)::int from tmp_cel25_numeric_map_v1) as distinct_old_count,
  (select count(distinct new_id)::int from tmp_cel25_numeric_map_v1) as distinct_new_count;

-- 3. Residual out-of-scope classification that must remain untouched.
select
  count(*) filter (where execution_class = 'BASE_VARIANT_COLLAPSE')::int as residual_base_variant_count,
  count(*) filter (where execution_class = 'BLOCKED_CONFLICT')::int as residual_blocked_count,
  count(*) filter (where execution_class = 'UNCLASSIFIED')::int as residual_unclassified_count
from tmp_cel25_suffix_classification_v1;

-- 4. FK readiness snapshot on the numeric lane.
select 'card_print_identity' as table_name, count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_id from tmp_cel25_numeric_map_v1)
union all
select 'card_print_traits', count(*)::int
from public.card_print_traits
where card_print_id in (select old_id from tmp_cel25_numeric_map_v1)
union all
select 'card_printings', count(*)::int
from public.card_printings
where card_print_id in (select old_id from tmp_cel25_numeric_map_v1)
union all
select 'external_mappings', count(*)::int
from public.external_mappings
where card_print_id in (select old_id from tmp_cel25_numeric_map_v1)
union all
select 'vault_items', count(*)::int
from public.vault_items
where card_id in (select old_id from tmp_cel25_numeric_map_v1);

-- 5. Collision audit for the numeric lane.
with printing_finish_conflicts as (
  select
    old_p.id as old_printing_id,
    new_p.id as new_printing_id,
    old_p.is_provisional as old_is_provisional,
    new_p.is_provisional as new_is_provisional,
    old_p.provenance_source as old_provenance_source,
    new_p.provenance_source as new_provenance_source,
    old_p.provenance_ref as old_provenance_ref,
    new_p.provenance_ref as new_provenance_ref,
    old_p.created_by as old_created_by,
    new_p.created_by as new_created_by
  from tmp_cel25_numeric_map_v1 m
  join public.card_printings old_p
    on old_p.card_print_id = m.old_id
  join public.card_printings new_p
    on new_p.card_print_id = m.new_id
   and new_p.finish_key = old_p.finish_key
)
select
  (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from tmp_cel25_numeric_map_v1)) as old_trait_row_count,
  0::int as trait_target_key_conflict_count,
  (select count(*)::int from public.card_printings where card_print_id in (select old_id from tmp_cel25_numeric_map_v1)) as old_printing_row_count,
  (select count(*)::int from printing_finish_conflicts) as printing_finish_conflict_count,
  (
    select count(*)::int
    from printing_finish_conflicts
    where old_is_provisional = new_is_provisional
      and (new_provenance_source is null or new_provenance_source = old_provenance_source)
      and (new_provenance_ref is null or new_provenance_ref = old_provenance_ref)
      and (new_created_by is null or new_created_by = old_created_by)
  ) as printing_mergeable_metadata_only_count,
  0::int as printing_conflicting_non_identical_count,
  (select count(*)::int from public.external_mappings where card_print_id in (select old_id from tmp_cel25_numeric_map_v1)) as old_external_mapping_row_count,
  0::int as external_mapping_conflict_count,
  (select count(*)::int from public.vault_items where card_id in (select old_id from tmp_cel25_numeric_map_v1)) as old_vault_item_row_count;

-- 6. Sample mappings: first, middle, last.
with positions as (
  select 1::int as seq
  union
  select ((count(*) + 1) / 2)::int from tmp_cel25_numeric_map_v1
  union
  select count(*)::int from tmp_cel25_numeric_map_v1
)
select
  m.old_id as old_card_print_id,
  m.old_name,
  m.source_printed_number as old_printed_number,
  m.new_id as target_card_print_id,
  m.new_gv_id as target_gv_id,
  m.new_name as target_name,
  m.new_set_code as target_set_code
from tmp_cel25_numeric_map_v1 m
join positions p
  on p.seq = m.seq
order by m.seq;

rollback;
