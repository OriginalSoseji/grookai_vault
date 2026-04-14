-- ECARD2_COMPLETE_VERIFICATION_V1
-- Read-only verification of ecard2 after collision-free promotion and
-- namespace canonical reuse. This verifies that only the audited blocked
-- conflict surface remains unresolved.
--
-- Schema notes:
--   - set membership is anchored by public.sets.code = 'ecard2'
--   - active identity uses public.card_print_identity.is_active = true
--   - vault_items references public.card_prints via vault_items.card_id

begin;

drop table if exists tmp_ecard2_blocked_rows_v1;

create temp table tmp_ecard2_blocked_rows_v1 on commit drop as
select *
from (
  values
    ('8272e758-ac91-41c3-87ad-9b3622155bf1'::uuid, 'Exeggutor', 'H10'),
    ('c7fdcf93-bf83-41fa-a6e2-edd63bc391f0'::uuid, 'Kingdra', 'H14'),
    ('62661fa2-40b4-48bf-96c1-8d225581a3d2'::uuid, 'Scizor', 'H21'),
    ('eb8d04d0-07ae-4805-8861-b1a1a286f52a'::uuid, 'Slowking', 'H22'),
    ('10c9d12e-77c9-4334-9fde-1542a79b1f5a'::uuid, 'Steelix', 'H23'),
    ('7215c907-c6ae-4951-b552-a7a543bae195'::uuid, 'Sudowoodo', 'H24'),
    ('6a14016b-edef-4f74-b360-20187e09e2bb'::uuid, 'Tentacruel', 'H26'),
    ('aef2e04c-4713-4801-b815-5fa354d68659'::uuid, 'Togetic', 'H27'),
    ('4fcf41bc-8e06-44fe-ad64-da6664f4d859'::uuid, 'Umbreon', 'H29'),
    ('1081cdf5-5334-432f-85d9-4d0c769836f8'::uuid, 'Vileplume', 'H31')
) as blocked_rows(id, name, printed_token);

-- Check 1: remaining unresolved rows.
select count(*) as unresolved_rows
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cp.gv_id is null;

-- Check 2: unresolved rows outside the locked blocked surface.
select count(*) as non_blocked_unresolved
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cp.gv_id is null
  and cp.id not in (select id from tmp_ecard2_blocked_rows_v1);

-- Check 2b: blocked surface detail proof.
select
  cp.id,
  cp.name,
  cpi.printed_number as printed_token,
  cp.gv_id
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
join public.card_print_identity cpi
  on cpi.card_print_id = cp.id
 and cpi.is_active = true
 and cpi.set_code_identity = 'ecard2'
where s.code = 'ecard2'
  and cp.gv_id is null
  and cp.id in (select id from tmp_ecard2_blocked_rows_v1)
order by cpi.printed_number, cp.id;

-- Check 3: duplicate canonical parents.
select
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  count(*) as row_count
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cp.gv_id is not null
group by cp.number_plain, coalesce(cp.variant_key, '')
having count(*) > 1;

-- Check 4: active identity uniqueness on ecard2 canon rows.
select
  cpi.card_print_id,
  count(*) as active_identity_count
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cpi.is_active = true
group by cpi.card_print_id
having count(*) > 1;

-- Check 5: FK orphans.
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

-- Check 6: normalization drift on canonical rows.
select
  cp.id,
  cp.name,
  cp.number_plain,
  cp.gv_id
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cp.gv_id is not null
  and (
    cp.name like '%’%'
    or cp.name like '% GX%'
    or cp.name like '% EX%'
    or cp.name like '%—%'
    or cp.name like '%–%'
  );

-- Check 7: token consistency on canonical rows.
select
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  count(*) as row_count
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cp.gv_id is not null
group by cp.number_plain, coalesce(cp.variant_key, '')
having count(*) != 1;

-- Check 8: canonical row count snapshot.
select count(*) as canonical_count
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cp.gv_id is not null;

-- Final summary.
select
  (select count(*)::int from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is null) as unresolved_count,
  (select count(*)::int from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is null and cp.id not in (select id from tmp_ecard2_blocked_rows_v1)) as non_blocked_unresolved_count,
  (
    select count(*)::int
    from (
      select cp.number_plain, coalesce(cp.variant_key, '') as variant_key
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where s.code = 'ecard2' and cp.gv_id is not null
      group by cp.number_plain, coalesce(cp.variant_key, '')
      having count(*) > 1
    ) dup
  ) as duplicate_parent_count,
  (
    select count(*)::int
    from (
      select cpi.card_print_id
      from public.card_print_identity cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      join public.sets s on s.id = cp.set_id
      where s.code = 'ecard2' and cpi.is_active = true
      group by cpi.card_print_id
      having count(*) > 1
    ) v
  ) as active_identity_violations,
  json_build_object(
    'card_print_identity', (select count(*)::int from public.card_print_identity where card_print_id not in (select id from public.card_prints)),
    'card_print_traits', (select count(*)::int from public.card_print_traits where card_print_id not in (select id from public.card_prints)),
    'card_printings', (select count(*)::int from public.card_printings where card_print_id not in (select id from public.card_prints)),
    'external_mappings', (select count(*)::int from public.external_mappings where card_print_id not in (select id from public.card_prints)),
    'vault_items', (select count(*)::int from public.vault_items where card_id not in (select id from public.card_prints))
  ) as fk_orphan_counts,
  (
    select count(*)::int
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    where s.code = 'ecard2'
      and cp.gv_id is not null
      and (
        cp.name like '%’%'
        or cp.name like '% GX%'
        or cp.name like '% EX%'
        or cp.name like '%—%'
        or cp.name like '%–%'
      )
  ) as normalization_drift_count,
  (
    select count(*)::int
    from (
      select cp.number_plain, coalesce(cp.variant_key, '') as variant_key
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where s.code = 'ecard2' and cp.gv_id is not null
      group by cp.number_plain, coalesce(cp.variant_key, '')
      having count(*) != 1
    ) q
  ) as token_consistency_violations,
  (select count(*)::int from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is not null) as canonical_count,
  (select count(*)::int from tmp_ecard2_blocked_rows_v1) as remaining_blocked_conflict_count,
  case
    when (select count(*) from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is null) = 10
     and (select count(*) from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is null and cp.id not in (select id from tmp_ecard2_blocked_rows_v1)) = 0
     and (
       select count(*)
       from (
         select cp.number_plain, coalesce(cp.variant_key, '') as variant_key
         from public.card_prints cp
         join public.sets s on s.id = cp.set_id
         where s.code = 'ecard2' and cp.gv_id is not null
         group by cp.number_plain, coalesce(cp.variant_key, '')
         having count(*) > 1
       ) dup
     ) = 0
     and (
       select count(*)
       from (
         select cpi.card_print_id
         from public.card_print_identity cpi
         join public.card_prints cp on cp.id = cpi.card_print_id
         join public.sets s on s.id = cp.set_id
         where s.code = 'ecard2' and cpi.is_active = true
         group by cpi.card_print_id
         having count(*) > 1
       ) v
     ) = 0
    then 'passed'
    else 'failed'
  end as verification_status;

rollback;
