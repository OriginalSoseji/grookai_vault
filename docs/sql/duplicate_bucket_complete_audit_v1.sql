-- DUPLICATE_BUCKET_COMPLETE_AUDIT_V1
-- Read-only closure audit for the completed duplicate-resolution bucket.
-- Live schema notes:
--   - use public.card_prints.set_code directly
--   - active identity state is tracked by public.card_print_identity.is_active
--   - public.vault_items references card prints through card_id
-- Target set list:
--   sm12, sm10, sm2, sm3, sm8, sm7, sm5, sm6, sm4, sm11, xy8, xy2, dc1, pop2, pop5, pop8
-- Expected live results on 2026-04-08:
--   unresolved_count = 0
--   duplicate_parent_count = 0
--   active_identity_violations = 0
--   unexpected_fan_in_history_count = 0
--   fk_orphan_counts = 0 across all checked tables
--   normalization_drift_count = 0
--   token_consistency_violations = 0

begin;

-- Scope snapshot: canonical row count per completed duplicate-bucket set
select
  cp.set_code,
  count(*)::int as canonical_rows,
  count(*) filter (where cp.gv_id is null)::int as null_gvid_rows
from public.card_prints cp
where cp.set_code in (
  'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
  'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
)
group by cp.set_code
order by cp.set_code;

-- CHECK 1 — unresolved null-gv parents
select
  count(*)::int as unresolved_count
from (
  select cp.set_code
  from public.card_prints cp
  where cp.set_code in (
    'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
    'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
  )
    and cp.gv_id is null
  group by cp.set_code
  having count(*) > 0
) violations;

select
  cp.set_code,
  count(*)::int as unresolved_null_gvid
from public.card_prints cp
where cp.set_code in (
  'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
  'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
)
  and cp.gv_id is null
group by cp.set_code
having count(*) > 0
order by cp.set_code;

-- CHECK 2 — duplicate canonical parents by set_code + number_plain
select
  count(*)::int as duplicate_parent_count
from (
  select cp.set_code, cp.number_plain
  from public.card_prints cp
  where cp.set_code in (
    'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
    'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
  )
  group by cp.set_code, cp.number_plain
  having count(*) > 1
) violations;

select
  cp.set_code,
  cp.number_plain,
  count(*)::int as rows_per_number
from public.card_prints cp
where cp.set_code in (
  'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
  'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
)
group by cp.set_code, cp.number_plain
having count(*) > 1
order by cp.set_code, cp.number_plain;

-- CHECK 3 — multiple active identities per canonical parent
select
  count(*)::int as active_identity_violations
from (
  select cpi.card_print_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.set_code in (
    'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
    'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
  )
    and cpi.is_active = true
  group by cpi.card_print_id
  having count(*) > 1
) violations;

select
  cp.set_code,
  cpi.card_print_id,
  count(*)::int as active_identity_count
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cp.set_code in (
  'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
  'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
)
  and cpi.is_active = true
group by cp.set_code, cpi.card_print_id
having count(*) > 1
order by cp.set_code, cpi.card_print_id;

-- CHECK 4A — inactive history preserved where fan-in occurred
select
  cp.set_code,
  cp.gv_id,
  count(*) filter (where cpi.is_active = true)::int as active_identities,
  count(*) filter (where cpi.is_active = false)::int as inactive_identities
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cp.set_code in ('sm4','xy8','xy2')
group by cp.set_code, cp.gv_id
having count(*) filter (where cpi.is_active = false) > 0
order by cp.set_code, cp.gv_id;

-- CHECK 4B — unexpected inactive-history surface outside expected fan-in sets
select
  count(*)::int as unexpected_fan_in_history_count
from (
  select cp.set_code, cp.gv_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.set_code in (
    'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
    'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
  )
  group by cp.set_code, cp.gv_id
  having count(*) filter (where cpi.is_active = false) > 0
     and cp.set_code not in ('sm4','xy8','xy2')
) violations;

select
  cp.set_code,
  cp.gv_id,
  count(*) filter (where cpi.is_active = true)::int as active_identities,
  count(*) filter (where cpi.is_active = false)::int as inactive_identities
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cp.set_code in (
  'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
  'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
)
group by cp.set_code, cp.gv_id
having count(*) filter (where cpi.is_active = false) > 0
   and cp.set_code not in ('sm4','xy8','xy2')
order by cp.set_code, cp.gv_id;

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
where cp.set_code in (
  'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
  'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
)
  and (
    cp.name like '%' || chr(8217) || '%'
    or cp.name like '% GX%'
    or cp.name like '% EX%'
    or cp.name like '%' || chr(8212) || '%'
    or cp.name like '%' || chr(8211) || '%'
  );

select
  cp.set_code,
  cp.id,
  cp.name,
  cp.number_plain,
  cp.gv_id
from public.card_prints cp
where cp.set_code in (
  'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
  'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
)
  and (
    cp.name like '%' || chr(8217) || '%'
    or cp.name like '% GX%'
    or cp.name like '% EX%'
    or cp.name like '%' || chr(8212) || '%'
    or cp.name like '%' || chr(8211) || '%'
  )
order by cp.set_code, cp.number_plain, cp.id;

-- CHECK 7 — token consistency by set_code + number_plain
select
  count(*)::int as token_consistency_violations
from (
  select cp.set_code, cp.number_plain
  from public.card_prints cp
  where cp.set_code in (
    'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
    'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
  )
  group by cp.set_code, cp.number_plain
  having count(*) != 1
) violations;

select
  cp.set_code,
  cp.number_plain,
  count(*)::int as rows_per_number
from public.card_prints cp
where cp.set_code in (
  'sm12','sm10','sm2','sm3','sm8','sm7','sm5','sm6',
  'sm4','sm11','xy8','xy2','dc1','pop2','pop5','pop8'
)
group by cp.set_code, cp.number_plain
having count(*) != 1
order by cp.set_code, cp.number_plain;

rollback;
