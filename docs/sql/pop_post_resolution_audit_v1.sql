-- POP_COMPLETE_VERIFICATION_V1
-- Read-only post-resolution verification for POP sets: pop2, pop5, pop8.
-- Live schema notes:
--   - active identity state is tracked by card_print_identity.is_active
--   - vault_items references card_prints via vault_items.card_id
-- Expected live results on 2026-04-07:
--   unresolved_count = 0
--   duplicate_parent_count = 0
--   active_identity_violations = 0
--   fk_orphan_counts = 0 across all checked tables
--   normalization_drift_count = 0
--   token_consistency_violations = 0

begin;

-- Scope snapshot: canonical rows per POP set
select
  cp.set_code,
  count(*)::int as canonical_count
from public.card_prints cp
where cp.set_code in ('pop2', 'pop5', 'pop8')
group by cp.set_code
order by cp.set_code;

-- CHECK 1 — unresolved parents
select
  count(*)::int as unresolved_count
from public.card_prints cp
where cp.set_code in ('pop2', 'pop5', 'pop8')
  and cp.gv_id is null;

-- CHECK 2 — duplicate canonical parents by set_code + number_plain
select
  count(*)::int as duplicate_parent_count
from (
  select cp.set_code, cp.number_plain
  from public.card_prints cp
  where cp.set_code in ('pop2', 'pop5', 'pop8')
  group by cp.set_code, cp.number_plain
  having count(*) > 1
) violations;

select
  cp.set_code,
  cp.number_plain,
  count(*)::int as row_count
from public.card_prints cp
where cp.set_code in ('pop2', 'pop5', 'pop8')
group by cp.set_code, cp.number_plain
having count(*) > 1
order by cp.set_code, cp.number_plain;

-- CHECK 3 — multiple active identities on the same canonical parent
select
  count(*)::int as active_identity_violations
from (
  select cpi.card_print_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.set_code in ('pop2', 'pop5', 'pop8')
    and cpi.is_active = true
  group by cpi.card_print_id
  having count(*) > 1
) violations;

select
  cp.set_code,
  cpi.card_print_id,
  count(*)::int as active_identities
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cp.set_code in ('pop2', 'pop5', 'pop8')
  and cpi.is_active = true
group by cp.set_code, cpi.card_print_id
having count(*) > 1
order by cp.set_code, cpi.card_print_id;

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

-- CHECK 5 — normalization drift inside POP scope
select
  count(*)::int as normalization_drift_count
from public.card_prints cp
where cp.set_code in ('pop2', 'pop5', 'pop8')
  and (
    cp.name like '%GX %'
    or cp.name like '%EX %'
    or cp.name like '%' || chr(8217) || '%'
  );

select
  cp.id,
  cp.set_code,
  cp.name,
  cp.number,
  cp.gv_id
from public.card_prints cp
where cp.set_code in ('pop2', 'pop5', 'pop8')
  and (
    cp.name like '%GX %'
    or cp.name like '%EX %'
    or cp.name like '%' || chr(8217) || '%'
  )
order by cp.set_code, cp.number, cp.id;

-- CHECK 6 — token consistency by set_code + number_plain
select
  count(*)::int as token_consistency_violations
from (
  select cp.set_code, cp.number_plain
  from public.card_prints cp
  where cp.set_code in ('pop2', 'pop5', 'pop8')
  group by cp.set_code, cp.number_plain
  having count(*) != 1
) violations;

select
  cp.set_code,
  cp.number_plain,
  count(*)::int as row_count
from public.card_prints cp
where cp.set_code in ('pop2', 'pop5', 'pop8')
group by cp.set_code, cp.number_plain
having count(*) != 1
order by cp.set_code, cp.number_plain;

-- Representative canonical rows confirming post-resolution state
select
  cp.id,
  cp.set_code,
  cp.name,
  cp.number,
  cp.number_plain,
  cp.gv_id
from public.card_prints cp
where cp.set_code in ('pop2', 'pop5', 'pop8')
  and cp.number in ('8', '6', '11')
order by cp.set_code, cp.number;

rollback;
