-- SMP_ALIAS_COLLAPSE_TO_CANONICAL_SMP_V1
-- Read-only dry-run support queries.
--
-- Important:
-- The live runner proves the exact 84 -> 84 map by loading the source and target
-- rowsets below, then applying repo/canon-aware name normalization with
-- normalizeCardNameV1 in JavaScript. Raw SQL whitespace normalization is not
-- sufficient for this surface because the live canonical lane contains
-- formatting drift such as "Snorlax-GX" vs "Snorlax GX".

-- 1. Source unresolved count.
select
  count(*)::int as source_count,
  count(*) filter (where cpi.printed_number ~ '^SM[0-9]+$')::int as valid_promo_code_count
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'smp'
  and cp.gv_id is null;

-- 2. Canonical target count.
select
  count(*)::int as target_count
from public.card_prints cp
where cp.set_code = 'smp'
  and cp.gv_id is not null;

-- 3. Exact source row extraction used by the runner.
select
  cp.id as old_id,
  cp.name as old_name,
  cp.set_code as old_set_code,
  cp.variant_key,
  cpi.printed_number,
  cpi.normalized_printed_name,
  s.printed_set_abbrev
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
left join public.sets s
  on s.id = cp.set_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'smp'
  and cp.gv_id is null
order by nullif(regexp_replace(cpi.printed_number, '^[^0-9]+', ''), '')::int, cp.id;

-- 4. Exact canonical target row extraction used by the runner.
select
  cp.id as new_id,
  cp.name as new_name,
  cp.set_code as new_set_code,
  cp.number as new_number,
  cp.gv_id as new_gv_id,
  cp.variant_key,
  s.printed_set_abbrev
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.set_code = 'smp'
  and cp.gv_id is not null
order by nullif(regexp_replace(cp.number, '^[^0-9]+', ''), '')::int, cp.id;

-- 5. Canonical target occupancy check.
-- The runner requires zero existing card_print_identity rows on the mapped targets.
-- The exact target ids are established in the JS matcher from queries 3 and 4.
select
  count(*)::int as canonical_identity_row_count,
  count(*) filter (where cpi.is_active = true)::int as canonical_active_identity_row_count
from public.card_print_identity cpi
where cpi.card_print_id in (
  select cp.id
  from public.card_prints cp
  where cp.set_code = 'smp'
    and cp.gv_id is not null
    and cp.number in (
      select distinct cpi.printed_number
      from public.card_print_identity cpi
      join public.card_prints cp2
        on cp2.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = 'pokemon_eng_standard'
        and cpi.set_code_identity = 'smp'
        and cp2.gv_id is null
    )
);

-- 6. FK readiness counts for the unresolved source ids.
with old_ids as (
  select cp.id as old_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'smp'
    and cp.gv_id is null
)
select *
from (
  select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
    count(*)::int as row_count
  from public.card_print_identity
  where card_print_id in (select old_id from old_ids)
  union all
  select 'card_print_traits', 'card_print_id', count(*)::int
  from public.card_print_traits
  where card_print_id in (select old_id from old_ids)
  union all
  select 'card_printings', 'card_print_id', count(*)::int
  from public.card_printings
  where card_print_id in (select old_id from old_ids)
  union all
  select 'external_mappings', 'card_print_id', count(*)::int
  from public.external_mappings
  where card_print_id in (select old_id from old_ids)
  union all
  select 'vault_items', 'card_id', count(*)::int
  from public.vault_items
  where card_id in (select old_id from old_ids)
) readiness
order by table_name, column_name;

-- 7. Collision-audit primitives used by the runner.
-- Trait duplicate keys by target keyset.
with old_ids as (
  select cp.id as old_id, cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'smp'
    and cp.gv_id is null
),
candidate_targets as (
  select cp.id as new_id, cp.number
  from public.card_prints cp
  where cp.set_code = 'smp'
    and cp.gv_id is not null
    and cp.number in (select printed_number from old_ids)
)
select count(*)::int as trait_target_key_conflict_count
from old_ids o
join candidate_targets t
  on t.number = o.printed_number
join public.card_print_traits old_t
  on old_t.card_print_id = o.old_id
join public.card_print_traits new_t
  on new_t.card_print_id = t.new_id
 and new_t.trait_type = old_t.trait_type
 and new_t.trait_value = old_t.trait_value
 and new_t.source = old_t.source;

-- 8. Sample candidate mappings by exact promo code.
-- Final match acceptance still depends on repo/canon-aware normalized-name proof in JS.
select
  old_cp.id as old_id,
  old_cp.name as old_name,
  cpi.printed_number,
  new_cp.id as new_id,
  new_cp.gv_id,
  new_cp.name as new_name
from public.card_print_identity cpi
join public.card_prints old_cp
  on old_cp.id = cpi.card_print_id
join public.card_prints new_cp
  on new_cp.set_code = 'smp'
 and new_cp.gv_id is not null
 and new_cp.number = cpi.printed_number
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'smp'
  and old_cp.gv_id is null
order by nullif(regexp_replace(cpi.printed_number, '^[^0-9]+', ''), '')::int, old_cp.id;
