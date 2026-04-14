-- CEL25_COMPLETE_VERIFICATION_V1
-- Read-only closure audit for cel25 after:
--   - numeric duplicate collapse
--   - base-variant collapse
--   - bounded star-symbol equivalence
--   - delta-species printed identity model rollout
--   - final delta-species resolution
-- Live schema notes:
--   - use public.card_prints.set_code directly
--   - active identity state is tracked by public.card_print_identity.is_active
--   - public.vault_items references card prints through card_id
-- Expected live results on 2026-04-08:
--   unresolved_count = 0
--   duplicate_parent_count = 0
--   active_identity_violations = 0
--   fk_orphan_counts = 0 across all checked tables
--   normalization_drift_count = 0
--   delta_integrity_violations = 0
--   token_consistency_violations = 0
--   canonical_count = 47

begin;

-- CHECK 1 — unresolved parents
select
  count(*)::int as unresolved_count
from public.card_prints cp
where cp.set_code = 'cel25'
  and cp.gv_id is null;

select
  cp.id,
  cp.name,
  cp.number_plain,
  cp.variant_key,
  cp.printed_identity_modifier
from public.card_prints cp
where cp.set_code = 'cel25'
  and cp.gv_id is null
order by cp.number_plain, cp.variant_key nulls first, cp.id;

-- CHECK 2 — duplicate canonical parents under the live identity key
select
  count(*)::int as duplicate_parent_count
from (
  select
    cp.number_plain,
    cp.printed_identity_modifier,
    cp.variant_key
  from public.card_prints cp
  where cp.set_code = 'cel25'
  group by cp.number_plain, cp.printed_identity_modifier, cp.variant_key
  having count(*) > 1
) violations;

select
  cp.number_plain,
  cp.printed_identity_modifier,
  cp.variant_key,
  count(*)::int as rows_per_identity_key
from public.card_prints cp
where cp.set_code = 'cel25'
group by cp.number_plain, cp.printed_identity_modifier, cp.variant_key
having count(*) > 1
order by cp.number_plain, cp.printed_identity_modifier, cp.variant_key;

-- CHECK 3 — active identity uniqueness within cel25
select
  count(*)::int as active_identity_violations
from (
  select cpi.card_print_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.set_code = 'cel25'
    and cpi.is_active = true
  group by cpi.card_print_id
  having count(*) > 1
) violations;

select
  cpi.card_print_id,
  count(*)::int as active_identity_count
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cp.set_code = 'cel25'
  and cpi.is_active = true
group by cpi.card_print_id
having count(*) > 1
order by cpi.card_print_id;

-- CHECK 4 — FK orphans
select count(*)::int as card_print_identity_orphans
from public.card_print_identity
where card_print_id not in (select id from public.card_prints);

select count(*)::int as card_print_traits_orphans
from public.card_print_traits
where card_print_id not in (select id from public.card_prints);

select count(*)::int as card_printings_orphans
from public.card_printings
where card_print_id not in (select id from public.card_prints);

select count(*)::int as external_mappings_orphans
from public.external_mappings
where card_print_id not in (select id from public.card_prints);

select count(*)::int as vault_items_orphans
from public.vault_items
where card_id not in (select id from public.card_prints);

-- CHECK 5 — residual normalization drift
select
  count(*)::int as normalization_drift_count
from public.card_prints cp
where cp.set_code = 'cel25'
  and (
    cp.name like '%' || chr(8217) || '%'
    or cp.name like '% GX%'
    or cp.name like '% EX%'
    or cp.name like '%' || chr(8212) || '%'
    or cp.name like '%' || chr(8211) || '%'
  );

select
  cp.id,
  cp.name,
  cp.number_plain,
  cp.variant_key,
  cp.printed_identity_modifier,
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'cel25'
  and (
    cp.name like '%' || chr(8217) || '%'
    or cp.name like '% GX%'
    or cp.name like '% EX%'
    or cp.name like '%' || chr(8212) || '%'
    or cp.name like '%' || chr(8211) || '%'
  )
order by cp.number_plain, cp.variant_key nulls first, cp.id;

-- CHECK 6 — delta-species integrity
select
  count(*)::int as delta_integrity_violations
from public.card_prints cp
where cp.set_code = 'cel25'
  and cp.name like '%δ%'
  and cp.printed_identity_modifier is distinct from 'delta_species';

select
  cp.id,
  cp.name,
  cp.number_plain,
  cp.variant_key,
  cp.printed_identity_modifier,
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'cel25'
  and cp.name like '%δ%'
  and cp.printed_identity_modifier is distinct from 'delta_species'
order by cp.number_plain, cp.variant_key nulls first, cp.id;

-- CHECK 7 — token consistency across number + identity-shape combinations
select
  count(*)::int as token_consistency_violations
from (
  select cp.number_plain
  from public.card_prints cp
  where cp.set_code = 'cel25'
  group by cp.number_plain
  having count(*) != count(distinct (coalesce(cp.printed_identity_modifier, ''), coalesce(cp.variant_key, '')))
) violations;

select
  cp.number_plain,
  count(*)::int as row_count,
  count(distinct (coalesce(cp.printed_identity_modifier, ''), coalesce(cp.variant_key, '')))::int as distinct_identity_shapes
from public.card_prints cp
where cp.set_code = 'cel25'
group by cp.number_plain
having count(*) != count(distinct (coalesce(cp.printed_identity_modifier, ''), coalesce(cp.variant_key, '')))
order by cp.number_plain;

-- CHECK 8 — canonical row count snapshot
select
  count(*)::int as canonical_count
from public.card_prints cp
where cp.set_code = 'cel25';

select
  cp.number_plain,
  cp.printed_identity_modifier,
  cp.variant_key,
  cp.name,
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'cel25'
order by cp.number_plain, cp.printed_identity_modifier nulls first, cp.variant_key nulls first, cp.name;

rollback;
