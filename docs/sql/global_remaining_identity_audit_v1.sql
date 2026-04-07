-- GLOBAL_REMAINING_IDENTITY_AUDIT_V1
-- Read-only query set for auditing all remaining active null-gv_id identity-backed surfaces.

-- 1. Unresolved identity-domain inventory
select
  cpi.identity_domain,
  count(*)::int as row_count
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cp.gv_id is null
group by cpi.identity_domain
order by count(*) desc, cpi.identity_domain;

-- 2. Global unresolved set inventory
select
  cpi.set_code_identity,
  count(*)::int as total_unresolved,
  count(*) filter (where cpi.printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
  count(*) filter (where cpi.printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cp.gv_id is null
group by cpi.set_code_identity
order by count(*) desc, cpi.set_code_identity;

-- 3. Unresolved surface rows with set metadata
select
  cp.id as card_print_id,
  cp.name as unresolved_name,
  cp.variant_key,
  cp.set_code as parent_set_code,
  cpi.identity_domain,
  cpi.set_code_identity,
  cpi.printed_number,
  cpi.normalized_printed_name,
  s.printed_set_abbrev,
  s.printed_total
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
left join public.sets s
  on s.id = cp.set_id
where cpi.is_active = true
  and cp.gv_id is null
order by cpi.set_code_identity, cpi.printed_number, cp.id;

-- 4. Canonical live surface used for overlap detection
select
  cp.id as canonical_card_print_id,
  cp.name as canonical_name,
  cp.set_code,
  cp.number,
  cp.gv_id
from public.card_prints cp
where cp.gv_id is not null
order by cp.set_code, cp.number, cp.id;
