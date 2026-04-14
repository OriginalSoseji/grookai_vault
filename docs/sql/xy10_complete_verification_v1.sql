-- XY10_COMPLETE_VERIFICATION_V1
-- Read-only closure audit for xy10 after:
--   - mixed execution audit
--   - base-variant + fan-in collapse
-- Live schema notes:
--   - use public.card_prints.set_code directly
--   - active/inactive identity state is tracked by public.card_print_identity.is_active
--   - public.vault_items references card prints through card_id
-- Expected live results on 2026-04-09:
--   unresolved_count = 0
--   duplicate_parent_count = 0
--   active_identity_violations = 0
--   inactive_history_count = 3
--   fk_orphan_counts = 0 across all checked tables
--   normalization_drift_count = 0
--   token_consistency_violations = 0
--   canonical_count = 126

begin;

-- CHECK 1 — unresolved parents
select
  count(*)::int as unresolved_count
from public.card_prints cp
where cp.set_code = 'xy10'
  and cp.gv_id is null;

select
  cp.id,
  cp.name,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'xy10'
  and cp.gv_id is null
order by cp.number_plain, cp.variant_key nulls first, cp.id;

-- CHECK 2 — duplicate canonical parents under the live identity key
select
  count(*)::int as duplicate_parent_count
from (
  select
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key
  from public.card_prints cp
  where cp.set_code = 'xy10'
  group by cp.number_plain, coalesce(cp.variant_key, '')
  having count(*) > 1
) violations;

select
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  count(*)::int as rows_per_identity_key
from public.card_prints cp
where cp.set_code = 'xy10'
group by cp.number_plain, coalesce(cp.variant_key, '')
having count(*) > 1
order by cp.number_plain, coalesce(cp.variant_key, '');

-- CHECK 3 — active identity uniqueness within xy10
select
  count(*)::int as active_identity_violations
from (
  select cpi.card_print_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.set_code = 'xy10'
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
where cp.set_code = 'xy10'
  and cpi.is_active = true
group by cpi.card_print_id
having count(*) > 1
order by cpi.card_print_id;

-- CHECK 4 — expected inactive history surface
select
  count(*)::int as inactive_history_target_count,
  coalesce(sum(inactive_identities), 0)::int as inactive_history_count
from (
  select
    cp.gv_id,
    cp.name,
    cp.number_plain,
    count(*) filter (where cpi.is_active = true)::int as active_identities,
    count(*) filter (where cpi.is_active = false)::int as inactive_identities
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.set_code = 'xy10'
  group by cp.gv_id, cp.name, cp.number_plain
  having count(*) filter (where cpi.is_active = false) > 0
) history_rows;

select
  cp.gv_id,
  cp.name,
  cp.number_plain,
  count(*) filter (where cpi.is_active = true)::int as active_identities,
  count(*) filter (where cpi.is_active = false)::int as inactive_identities
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cp.set_code = 'xy10'
group by cp.gv_id, cp.name, cp.number_plain
having count(*) filter (where cpi.is_active = false) > 0
order by cp.number_plain, cp.gv_id;

-- CHECK 5 — FK orphans
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

-- CHECK 6 — residual normalization drift
select
  count(*)::int as normalization_drift_count
from public.card_prints cp
where cp.set_code = 'xy10'
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
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'xy10'
  and (
    cp.name like '%' || chr(8217) || '%'
    or cp.name like '% GX%'
    or cp.name like '% EX%'
    or cp.name like '%' || chr(8212) || '%'
    or cp.name like '%' || chr(8211) || '%'
  )
order by cp.number_plain, cp.variant_key nulls first, cp.id;

-- CHECK 7 — token consistency
select
  count(*)::int as token_consistency_violations
from (
  select
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key
  from public.card_prints cp
  where cp.set_code = 'xy10'
  group by cp.number_plain, coalesce(cp.variant_key, '')
  having count(*) != 1
) violations;

select
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  count(*)::int as rows_per_identity
from public.card_prints cp
where cp.set_code = 'xy10'
group by cp.number_plain, coalesce(cp.variant_key, '')
having count(*) != 1
order by cp.number_plain, coalesce(cp.variant_key, '');

-- CHECK 8 — canonical row count snapshot
select
  count(*)::int as canonical_count
from public.card_prints cp
where cp.set_code = 'xy10';

select
  cp.number_plain,
  cp.variant_key,
  cp.name,
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'xy10'
order by cp.number_plain, cp.variant_key nulls first, cp.name;

rollback;
