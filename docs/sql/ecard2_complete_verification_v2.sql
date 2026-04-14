-- ECARD2_COMPLETE_VERIFICATION_V2
-- Final read-only verification of ecard2 after:
--   - collision-free promotion (11)
--   - namespace canonical reuse (13)
--   - holo-prefix exact-token promotion (10)
--
-- Schema notes:
--   - set membership is public.sets.code = 'ecard2'
--   - active identity uses public.card_print_identity.is_active = true
--   - vault_items references public.card_prints via vault_items.card_id
--   - holo validation is anchored to the exact audited 10-row H-prefix promotion
--     surface, not a broad GV-PK-AQ-H% prefix scan

begin;

drop table if exists tmp_ecard2_expected_holo_rows_v2;

create temp table tmp_ecard2_expected_holo_rows_v2 on commit drop as
select *
from (
  values
    ('Exeggutor', 'H10', 'GV-PK-AQ-H10'),
    ('Kingdra', 'H14', 'GV-PK-AQ-H14'),
    ('Scizor', 'H21', 'GV-PK-AQ-H21'),
    ('Slowking', 'H22', 'GV-PK-AQ-H22'),
    ('Steelix', 'H23', 'GV-PK-AQ-H23'),
    ('Sudowoodo', 'H24', 'GV-PK-AQ-H24'),
    ('Tentacruel', 'H26', 'GV-PK-AQ-H26'),
    ('Togetic', 'H27', 'GV-PK-AQ-H27'),
    ('Umbreon', 'H29', 'GV-PK-AQ-H29'),
    ('Vileplume', 'H31', 'GV-PK-AQ-H31')
) as expected_rows(expected_name, expected_number, expected_gv_id);

-- Check 1: unresolved rows.
select count(*) as unresolved_rows
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cp.gv_id is null;

-- Check 2: duplicate canonical parents.
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

-- Check 3: active identity uniqueness.
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

-- Check 4: FK orphans.
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

-- Check 5: normalization drift.
select
  cp.id,
  cp.name,
  cp.number,
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

-- Check 6: token consistency.
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

-- Check 7a: exact holo-prefix promotion surface detail.
select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  cp.gv_id
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cp.gv_id in (select expected_gv_id from tmp_ecard2_expected_holo_rows_v2)
order by cp.number, cp.gv_id;

-- Check 7b: exact holo-prefix promotion surface summary.
select
  (select count(*)::int from tmp_ecard2_expected_holo_rows_v2) as expected_holo_count,
  (
    select count(*)::int
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    where s.code = 'ecard2'
      and cp.gv_id in (select expected_gv_id from tmp_ecard2_expected_holo_rows_v2)
  ) as matched_holo_count,
  (
    select count(*)::int
    from tmp_ecard2_expected_holo_rows_v2 e
    left join public.card_prints cp
      on cp.gv_id = e.expected_gv_id
    left join public.sets s
      on s.id = cp.set_id
    where cp.id is null
       or s.code <> 'ecard2'
       or cp.name <> e.expected_name
       or cp.number <> e.expected_number
       or cp.number_plain <> e.expected_number
  ) as holo_mismatch_count,
  (
    select count(*)::int
    from (
      select cp.gv_id
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where s.code = 'ecard2'
        and cp.gv_id in (select expected_gv_id from tmp_ecard2_expected_holo_rows_v2)
      group by cp.gv_id
      having count(*) > 1
    ) dup
  ) as holo_duplicate_count;

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
  (
    select count(*)::int
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    where s.code = 'ecard2'
      and cp.gv_id in (select expected_gv_id from tmp_ecard2_expected_holo_rows_v2)
  ) as holo_promoted_count,
  (
    select count(*)::int
    from tmp_ecard2_expected_holo_rows_v2 e
    left join public.card_prints cp
      on cp.gv_id = e.expected_gv_id
    left join public.sets s
      on s.id = cp.set_id
    where cp.id is null
       or s.code <> 'ecard2'
       or cp.name <> e.expected_name
       or cp.number <> e.expected_number
       or cp.number_plain <> e.expected_number
  ) as holo_mismatch_count,
  case
    when (select count(*) from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is null) = 0
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
     and (
       select count(*)
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
     ) = 0
     and (
       select count(*)
       from (
         select cp.number_plain, coalesce(cp.variant_key, '') as variant_key
         from public.card_prints cp
         join public.sets s on s.id = cp.set_id
         where s.code = 'ecard2' and cp.gv_id is not null
         group by cp.number_plain, coalesce(cp.variant_key, '')
         having count(*) != 1
       ) q
     ) = 0
     and (
       select count(*)
       from tmp_ecard2_expected_holo_rows_v2 e
       left join public.card_prints cp
         on cp.gv_id = e.expected_gv_id
       left join public.sets s
         on s.id = cp.set_id
       where cp.id is null
          or s.code <> 'ecard2'
          or cp.name <> e.expected_name
          or cp.number <> e.expected_number
          or cp.number_plain <> e.expected_number
     ) = 0
     and (select count(*) from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id in (select expected_gv_id from tmp_ecard2_expected_holo_rows_v2)) = 10
     and (select count(*) from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is not null) = 194
    then 'passed'
    else 'failed'
  end as verification_status;

rollback;
