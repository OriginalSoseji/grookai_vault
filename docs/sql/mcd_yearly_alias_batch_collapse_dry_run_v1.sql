-- MCD_YEARLY_ALIAS_BATCH_COLLAPSE_V1
-- Read-only proof queries for the remaining yearly McDonald's alias lanes:
-- 2014xy -> mcd14
-- 2015xy -> mcd15
-- 2016xy -> mcd16
-- 2017sm -> mcd17
-- 2018sm -> mcd18
-- 2019sm -> mcd19

-- 1. Per-year structural audit, readiness counts, namespace proof, and apply_safe classification.
with year_pairs(alias_code, canonical_code, year_label) as (
  values
    ('2014xy', 'mcd14', '2014'),
    ('2015xy', 'mcd15', '2015'),
    ('2016xy', 'mcd16', '2016'),
    ('2017sm', 'mcd17', '2017'),
    ('2018sm', 'mcd18', '2018'),
    ('2019sm', 'mcd19', '2019')
),
unresolved as (
  select
    yp.alias_code,
    yp.canonical_code,
    yp.year_label,
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number,
    coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_printed_name
  from year_pairs yp
  join public.card_print_identity cpi
    on cpi.set_code_identity = yp.alias_code
   and cpi.is_active = true
   and cpi.identity_domain = 'pokemon_eng_standard'
  join public.card_prints cp
    on cp.id = cpi.card_print_id
   and cp.gv_id is null
),
canonical as (
  select
    yp.alias_code,
    yp.canonical_code,
    yp.year_label,
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_number,
    coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from year_pairs yp
  join public.card_prints cp
    on cp.set_code = yp.canonical_code
   and cp.gv_id is not null
),
candidates as (
  select u.alias_code, u.canonical_code, u.year_label, u.old_id, c.new_id
  from unresolved u
  join canonical c
    on c.alias_code = u.alias_code
   and c.new_number_normalized = u.old_number_normalized
   and c.normalized_name = u.normalized_printed_name
),
old_counts as (
  select alias_code, old_id, count(*)::int as match_count
  from candidates
  group by alias_code, old_id
),
new_counts as (
  select alias_code, new_id, count(*)::int as match_count
  from candidates
  group by alias_code, new_id
),
collapse_map as (
  select u.alias_code, u.canonical_code, u.year_label, u.old_id, c.new_id
  from unresolved u
  join candidates cand
    on cand.alias_code = u.alias_code
   and cand.old_id = u.old_id
  join canonical c
    on c.alias_code = cand.alias_code
   and c.new_id = cand.new_id
  join old_counts oc
    on oc.alias_code = cand.alias_code
   and oc.old_id = cand.old_id
  join new_counts nc
    on nc.alias_code = cand.alias_code
   and nc.new_id = cand.new_id
  where oc.match_count = 1
    and nc.match_count = 1
),
target_identity as (
  select
    yp.alias_code,
    count(cpi.id)::int as any_identity_rows,
    count(*) filter (where cpi.is_active = true)::int as active_identity_rows
  from year_pairs yp
  left join collapse_map m
    on m.alias_code = yp.alias_code
  left join public.card_print_identity cpi
    on cpi.card_print_id = m.new_id
  group by yp.alias_code
),
base as (
  select
    yp.alias_code,
    yp.canonical_code,
    yp.year_label,
    coalesce((select count(*) from unresolved u where u.alias_code = yp.alias_code), 0)::int as source_count,
    coalesce((select count(*) from unresolved u where u.alias_code = yp.alias_code and u.old_number ~ '^[0-9]+$'), 0)::int as numeric_count,
    coalesce((select count(*) from unresolved u where u.alias_code = yp.alias_code and u.old_number !~ '^[0-9]+$'), 0)::int as non_numeric_count,
    coalesce((select count(*) from canonical c where c.alias_code = yp.alias_code), 0)::int as target_count,
    coalesce((select count(*) from candidates c where c.alias_code = yp.alias_code), 0)::int as mapping_candidate_count,
    coalesce((select count(*) from collapse_map m where m.alias_code = yp.alias_code), 0)::int as map_count,
    coalesce((select count(distinct old_id) from collapse_map m where m.alias_code = yp.alias_code), 0)::int as distinct_old_count,
    coalesce((select count(distinct new_id) from collapse_map m where m.alias_code = yp.alias_code), 0)::int as distinct_new_count,
    coalesce((select count(*) from old_counts oc where oc.alias_code = yp.alias_code and oc.match_count > 1), 0)::int as multiple_match_old_count,
    coalesce((select count(*) from new_counts nc where nc.alias_code = yp.alias_code and nc.match_count > 1), 0)::int as reused_new_count,
    coalesce((select count(*) from unresolved u where u.alias_code = yp.alias_code and not exists (select 1 from collapse_map m where m.alias_code = u.alias_code and m.old_id = u.old_id)), 0)::int as unmatched_count,
    coalesce((select count(*) from unresolved u where u.alias_code = yp.alias_code and exists (select 1 from canonical c where c.alias_code = u.alias_code and c.new_number_normalized = u.old_number_normalized and c.normalized_name = u.normalized_printed_name)), 0)::int as same_number_same_name_count,
    coalesce((select count(*) from unresolved u where u.alias_code = yp.alias_code and exists (select 1 from canonical c where c.alias_code = u.alias_code and c.new_number_normalized = u.old_number_normalized and c.normalized_name <> u.normalized_printed_name)), 0)::int as same_number_different_name_count,
    coalesce((select count(*) from canonical c where c.alias_code = yp.alias_code and c.new_gv_id like 'GV-PK-MCD-' || yp.year_label || '-%'), 0)::int as canonical_namespace_match_count,
    coalesce((select count(*) from canonical c where c.alias_code = yp.alias_code and c.new_gv_id is not null and c.new_gv_id not like 'GV-PK-MCD-' || yp.year_label || '-%'), 0)::int as namespace_conflict_count,
    coalesce((select any_identity_rows from target_identity ti where ti.alias_code = yp.alias_code), 0)::int as target_any_identity_rows,
    coalesce((select active_identity_rows from target_identity ti where ti.alias_code = yp.alias_code), 0)::int as target_active_identity_rows,
    coalesce((select count(*) from public.card_print_identity cpi join unresolved u on u.old_id = cpi.card_print_id where u.alias_code = yp.alias_code), 0)::int as fk_card_print_identity,
    coalesce((select count(*) from public.card_print_traits t join unresolved u on u.old_id = t.card_print_id where u.alias_code = yp.alias_code), 0)::int as fk_card_print_traits,
    coalesce((select count(*) from public.card_printings p join unresolved u on u.old_id = p.card_print_id where u.alias_code = yp.alias_code), 0)::int as fk_card_printings,
    coalesce((select count(*) from public.external_mappings em join unresolved u on u.old_id = em.card_print_id where u.alias_code = yp.alias_code), 0)::int as fk_external_mappings,
    coalesce((select count(*) from public.vault_items vi join unresolved u on u.old_id = vi.card_id where u.alias_code = yp.alias_code), 0)::int as fk_vault_items
  from year_pairs yp
)
select
  *,
  (
    source_count > 0
    and numeric_count = source_count
    and non_numeric_count = 0
    and source_count = target_count
    and mapping_candidate_count = source_count
    and map_count = source_count
    and distinct_old_count = source_count
    and distinct_new_count = source_count
    and multiple_match_old_count = 0
    and reused_new_count = 0
    and unmatched_count = 0
    and same_number_same_name_count = source_count
    and same_number_different_name_count = 0
    and canonical_namespace_match_count = target_count
    and namespace_conflict_count = 0
    and target_any_identity_rows = 0
    and target_active_identity_rows = 0
  ) as apply_safe
from base
order by year_label::int;

-- 2. Human-readable sample mappings for all six year pairs.
with year_pairs(alias_code, canonical_code) as (
  values
    ('2014xy', 'mcd14'),
    ('2015xy', 'mcd15'),
    ('2016xy', 'mcd16'),
    ('2017sm', 'mcd17'),
    ('2018sm', 'mcd18'),
    ('2019sm', 'mcd19')
),
unresolved as (
  select
    yp.alias_code,
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number,
    coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_printed_name
  from year_pairs yp
  join public.card_print_identity cpi
    on cpi.set_code_identity = yp.alias_code
   and cpi.is_active = true
   and cpi.identity_domain = 'pokemon_eng_standard'
  join public.card_prints cp
    on cp.id = cpi.card_print_id
   and cp.gv_id is null
),
canonical as (
  select
    yp.alias_code,
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from year_pairs yp
  join public.card_prints cp
    on cp.set_code = yp.canonical_code
   and cp.gv_id is not null
)
select
  u.alias_code,
  u.old_id as old_card_print_id,
  u.old_name,
  u.old_number as old_printed_number,
  c.new_id as target_card_print_id,
  c.new_name as target_name,
  c.new_number as target_number,
  c.new_gv_id as target_gv_id
from unresolved u
join canonical c
  on c.alias_code = u.alias_code
 and c.new_number_normalized = u.old_number_normalized
 and c.normalized_name = u.normalized_printed_name
order by u.alias_code, u.old_number_normalized::int, u.old_id;

-- 3. FK inventory to public.card_prints.
select distinct
  rel.relname as table_name,
  att.attname as column_name
from pg_constraint c
join pg_class rel on rel.oid = c.conrelid
join pg_namespace n on n.oid = rel.relnamespace
join pg_class frel on frel.oid = c.confrelid
join pg_namespace fn on fn.oid = frel.relnamespace
join unnest(c.conkey) with ordinality as k(attnum, ord) on true
join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
where c.contype = 'f'
  and n.nspname = 'public'
  and fn.nspname = 'public'
  and frel.relname = 'card_prints'
order by rel.relname, att.attname;

-- 4. Per-year collision audit for traits, printings, and external mappings.
with year_pairs(alias_code, canonical_code) as (
  values
    ('2014xy', 'mcd14'),
    ('2015xy', 'mcd15'),
    ('2016xy', 'mcd16'),
    ('2017sm', 'mcd17'),
    ('2018sm', 'mcd18'),
    ('2019sm', 'mcd19')
),
unresolved as (
  select
    yp.alias_code,
    cp.id as old_id,
    coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_printed_name
  from year_pairs yp
  join public.card_print_identity cpi
    on cpi.set_code_identity = yp.alias_code
   and cpi.is_active = true
   and cpi.identity_domain = 'pokemon_eng_standard'
  join public.card_prints cp
    on cp.id = cpi.card_print_id
   and cp.gv_id is null
),
canonical as (
  select
    yp.alias_code,
    cp.id as new_id,
    coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from year_pairs yp
  join public.card_prints cp
    on cp.set_code = yp.canonical_code
   and cp.gv_id is not null
),
collapse_map as (
  select u.alias_code, u.old_id, c.new_id
  from unresolved u
  join canonical c
    on c.alias_code = u.alias_code
   and c.new_number_normalized = u.old_number_normalized
   and c.normalized_name = u.normalized_printed_name
),
trait_key_conflicts as (
  select
    m.alias_code,
    old_t.id as old_trait_id,
    new_t.id as new_trait_id,
    old_t.confidence as old_confidence,
    new_t.confidence as new_confidence,
    old_t.hp as old_hp,
    new_t.hp as new_hp,
    old_t.national_dex as old_national_dex,
    new_t.national_dex as new_national_dex,
    old_t.types as old_types,
    new_t.types as new_types,
    old_t.rarity as old_rarity,
    new_t.rarity as new_rarity,
    old_t.supertype as old_supertype,
    new_t.supertype as new_supertype,
    old_t.card_category as old_card_category,
    new_t.card_category as new_card_category,
    old_t.legacy_rarity as old_legacy_rarity,
    new_t.legacy_rarity as new_legacy_rarity
  from collapse_map m
  join public.card_print_traits old_t
    on old_t.card_print_id = m.old_id
  join public.card_print_traits new_t
    on new_t.card_print_id = m.new_id
   and new_t.trait_type = old_t.trait_type
   and new_t.trait_value = old_t.trait_value
   and new_t.source = old_t.source
),
printing_finish_conflicts as (
  select
    m.alias_code,
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
  from collapse_map m
  join public.card_printings old_p
    on old_p.card_print_id = m.old_id
  join public.card_printings new_p
    on new_p.card_print_id = m.new_id
   and new_p.finish_key = old_p.finish_key
),
external_conflicts as (
  select m.alias_code, count(*)::int as row_count
  from collapse_map m
  join public.external_mappings old_em
    on old_em.card_print_id = m.old_id
  join public.external_mappings new_em
    on new_em.card_print_id = m.new_id
   and new_em.source = old_em.source
   and new_em.external_id = old_em.external_id
  group by m.alias_code
)
select
  yp.alias_code,
  coalesce((select count(*) from trait_key_conflicts tk where tk.alias_code = yp.alias_code), 0)::int as trait_target_key_conflict_count,
  coalesce((select count(*) from trait_key_conflicts tk where tk.alias_code = yp.alias_code and (tk.old_confidence is distinct from tk.new_confidence or tk.old_hp is distinct from tk.new_hp or tk.old_national_dex is distinct from tk.new_national_dex or tk.old_types is distinct from tk.new_types or tk.old_rarity is distinct from tk.new_rarity or tk.old_supertype is distinct from tk.new_supertype or tk.old_card_category is distinct from tk.new_card_category or tk.old_legacy_rarity is distinct from tk.new_legacy_rarity)), 0)::int as trait_conflicting_non_identical_count,
  coalesce((select count(*) from printing_finish_conflicts pf where pf.alias_code = yp.alias_code), 0)::int as printing_finish_conflict_count,
  coalesce((select count(*) from printing_finish_conflicts pf where pf.alias_code = yp.alias_code and pf.old_is_provisional = pf.new_is_provisional and (pf.new_provenance_source is null or pf.new_provenance_source = pf.old_provenance_source) and (pf.new_provenance_ref is null or pf.new_provenance_ref = pf.old_provenance_ref) and (pf.new_created_by is null or pf.new_created_by = pf.old_created_by)), 0)::int as printing_mergeable_metadata_only_count,
  coalesce((select count(*) from printing_finish_conflicts pf where pf.alias_code = yp.alias_code and (pf.old_is_provisional is distinct from pf.new_is_provisional or (pf.old_provenance_source is not null and pf.new_provenance_source is not null and pf.old_provenance_source <> pf.new_provenance_source) or (pf.old_provenance_ref is not null and pf.new_provenance_ref is not null and pf.old_provenance_ref <> pf.new_provenance_ref) or (pf.old_created_by is not null and pf.new_created_by is not null and pf.old_created_by <> pf.new_created_by))), 0)::int as printing_conflicting_non_identical_count,
  coalesce((select row_count from external_conflicts ec where ec.alias_code = yp.alias_code), 0)::int as external_mapping_conflict_count
from year_pairs yp
order by yp.alias_code;

-- 5. Combined totals for apply-safe years.
with audit as (
  with year_pairs(alias_code, canonical_code, year_label) as (
    values
      ('2014xy', 'mcd14', '2014'),
      ('2015xy', 'mcd15', '2015'),
      ('2016xy', 'mcd16', '2016'),
      ('2017sm', 'mcd17', '2017'),
      ('2018sm', 'mcd18', '2018'),
      ('2019sm', 'mcd19', '2019')
  ),
  unresolved as (
    select
      yp.alias_code,
      yp.canonical_code,
      yp.year_label,
      cp.id as old_id,
      cpi.printed_number as old_number,
      coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
      coalesce(cpi.normalized_printed_name, lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))) as normalized_printed_name
    from year_pairs yp
    join public.card_print_identity cpi
      on cpi.set_code_identity = yp.alias_code
     and cpi.is_active = true
     and cpi.identity_domain = 'pokemon_eng_standard'
    join public.card_prints cp
      on cp.id = cpi.card_print_id
     and cp.gv_id is null
  ),
  canonical as (
    select
      yp.alias_code,
      yp.canonical_code,
      yp.year_label,
      cp.id as new_id,
      coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
      cp.gv_id as new_gv_id,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
    from year_pairs yp
    join public.card_prints cp
      on cp.set_code = yp.canonical_code
     and cp.gv_id is not null
  ),
  candidates as (
    select u.alias_code, u.old_id, c.new_id
    from unresolved u
    join canonical c
      on c.alias_code = u.alias_code
     and c.new_number_normalized = u.old_number_normalized
     and c.normalized_name = u.normalized_printed_name
  ),
  old_counts as (
    select alias_code, old_id, count(*)::int as match_count
    from candidates
    group by alias_code, old_id
  ),
  new_counts as (
    select alias_code, new_id, count(*)::int as match_count
    from candidates
    group by alias_code, new_id
  )
  select
    yp.alias_code,
    coalesce((select count(*) from unresolved u where u.alias_code = yp.alias_code), 0)::int as source_count,
    coalesce((select count(*) from canonical c where c.alias_code = yp.alias_code), 0)::int as target_count,
    coalesce((select count(*) from candidates c where c.alias_code = yp.alias_code), 0)::int as map_count,
    coalesce((select count(*) from old_counts oc where oc.alias_code = yp.alias_code and oc.match_count > 1), 0)::int as multiple_match_old_count,
    coalesce((select count(*) from new_counts nc where nc.alias_code = yp.alias_code and nc.match_count > 1), 0)::int as reused_new_count
  from year_pairs yp
)
select
  count(*) filter (
    where source_count > 0
      and source_count = target_count
      and map_count = source_count
      and multiple_match_old_count = 0
      and reused_new_count = 0
  )::int as apply_safe_year_count,
  sum(source_count) filter (
    where source_count > 0
      and source_count = target_count
      and map_count = source_count
      and multiple_match_old_count = 0
      and reused_new_count = 0
  )::int as combined_apply_safe_source_count
from audit;
