-- XY9_COMPLETE_VERIFICATION_V1
-- Read-only final verification for xy9.
-- Local schema note:
--   - canonical rows are keyed by public.card_prints.set_code = 'xy9'
--   - the single preserved unresolved row is still carried through
--     public.card_print_identity.set_code_identity = 'xy9'
--   - active identity state uses cpi.is_active rather than archived_at

begin;

-- CHECK 1A — unresolved null-gv surface
select count(*) as unresolved_null_gvid_rows
from public.card_print_identity cpi
join public.card_prints cp on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'xy9'
  and cpi.is_active = true
  and cp.gv_id is null;

-- CHECK 1B — unresolved rows other than blocked target
select count(*) as unresolved_rows_other_than_blocked_target
from public.card_print_identity cpi
join public.card_prints cp on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'xy9'
  and cpi.is_active = true
  and cp.gv_id is null
  and cp.id <> 'a6d34131-d056-49ae-a8b7-21d808e351f6';

-- CHECK 2 — blocked target integrity
select
  cp.id,
  cp.name,
  coalesce(cp.number_plain, nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '')) as number_plain,
  cp.gv_id,
  cpi.set_code_identity as set_code
from public.card_print_identity cpi
join public.card_prints cp on cp.id = cpi.card_print_id
where cp.id = 'a6d34131-d056-49ae-a8b7-21d808e351f6'
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'xy9'
  and cpi.is_active = true;

-- CHECK 3 — duplicate canonical parents
select number_plain, coalesce(variant_key, '') as variant_key, count(*)
from public.card_prints cp
where cp.set_code = 'xy9'
  and cp.gv_id is not null
group by number_plain, coalesce(variant_key, '')
having count(*) > 1;

-- CHECK 4 — active identity uniqueness
select cpi.card_print_id, count(*) as active_identity_count
from public.card_print_identity cpi
join public.card_prints cp on cp.id = cpi.card_print_id
where cp.set_code = 'xy9'
  and cpi.is_active = true
group by cpi.card_print_id
having count(*) > 1;

-- CHECK 5 — FK orphans
select count(*) as card_print_identity_orphans
from public.card_print_identity
where card_print_id not in (select id from public.card_prints);

select count(*) as card_print_traits_orphans
from public.card_print_traits
where card_print_id not in (select id from public.card_prints);

select count(*) as card_printings_orphans
from public.card_printings
where card_print_id not in (select id from public.card_prints);

select count(*) as external_mappings_orphans
from public.external_mappings
where card_print_id not in (select id from public.card_prints);

select count(*) as vault_items_orphans
from public.vault_items
where card_id not in (select id from public.card_prints);

-- CHECK 6 — normalization drift on canonical rows
select
  cp.id,
  cp.name,
  cp.number_plain,
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'xy9'
  and cp.gv_id is not null
  and (
    cp.name like '%’%'
    or cp.name like '% GX%'
    or cp.name like '% EX%'
    or cp.name like '%—%'
    or cp.name like '%–%'
  );

-- CHECK 7 — token consistency for canonical rows
select
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  count(*) as rows_per_identity
from public.card_prints cp
where cp.set_code = 'xy9'
  and cp.gv_id is not null
group by cp.number_plain, coalesce(cp.variant_key, '')
having count(*) != 1;

-- CHECK 8 — blocked row exclusion proof
select
  'a6d34131-d056-49ae-a8b7-21d808e351f6'::uuid as blocked_row_id,
  'Delinquent'::text as blocked_row_name,
  cp.id as candidate_target_id,
  cp.gv_id as candidate_target_gv_id,
  cp.number_plain as candidate_target_number_plain
from public.card_prints cp
where cp.set_code = 'xy9'
  and cp.gv_id is not null
  and cp.number_plain = '98'
  and lower(cp.name) = 'delinquent'
order by cp.number, cp.id;

-- CHECK 9 — canonical row count snapshot
select count(*) as canonical_count
from public.card_prints cp
where cp.set_code = 'xy9'
  and cp.gv_id is not null;

rollback;
