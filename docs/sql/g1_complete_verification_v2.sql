-- G1_COMPLETE_VERIFICATION_V2
-- Read-only closure audit for g1 after:
--   - base-variant collapse v1
--   - RC-prefix exact-token promotion v1
--   - post-normalization drift repair v2
-- Live schema notes:
--   - use public.card_prints.set_code directly
--   - active/inactive identity state is tracked by public.card_print_identity.is_active
--   - public.vault_items references card prints through card_id
-- Live result on 2026-04-12:
--   unresolved_count = 0
--   duplicate_parent_count = 0
--   active_identity_violations = 0
--   fk_orphan_counts = 0 across all checked tables
--   normalization_drift_count = 0
--   token_consistency_violations = 0
--   canonical_count = 116
--   rc_prefix_validation_count = 16
--   rc_prefix_validation_mismatches = 0
-- Verification status:
--   passed

begin;

-- CHECK 1 — unresolved rows
select
  count(*)::int as unresolved_count
from public.card_prints cp
where cp.set_code = 'g1'
  and cp.gv_id is null;

select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'g1'
  and cp.gv_id is null
order by cp.number_plain, cp.variant_key nulls first, cp.id;

-- CHECK 2 — duplicate canonical parents
select
  count(*)::int as duplicate_parent_count
from (
  select
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key
  from public.card_prints cp
  where cp.set_code = 'g1'
    and cp.gv_id is not null
  group by cp.number_plain, coalesce(cp.variant_key, '')
  having count(*) > 1
) violations;

select
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  count(*)::int as rows_per_identity
from public.card_prints cp
where cp.set_code = 'g1'
  and cp.gv_id is not null
group by cp.number_plain, coalesce(cp.variant_key, '')
having count(*) > 1
order by cp.number_plain, coalesce(cp.variant_key, '');

-- CHECK 3 — active identity uniqueness
select
  count(*)::int as active_identity_violations
from (
  select
    cpi.card_print_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.set_code = 'g1'
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
where cp.set_code = 'g1'
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

-- CHECK 5 — normalization drift
select
  count(*)::int as normalization_drift_count
from public.card_prints cp
where cp.set_code = 'g1'
  and cp.gv_id is not null
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
  cp.number,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id
from public.card_prints cp
where cp.set_code = 'g1'
  and cp.gv_id is not null
  and (
    cp.name like '%' || chr(8217) || '%'
    or cp.name like '% GX%'
    or cp.name like '% EX%'
    or cp.name like '%' || chr(8212) || '%'
    or cp.name like '%' || chr(8211) || '%'
  )
order by cp.number_plain, cp.variant_key nulls first, cp.id;

-- CHECK 6 — token consistency
select
  count(*)::int as token_consistency_violations
from (
  select
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key
  from public.card_prints cp
  where cp.set_code = 'g1'
    and cp.gv_id is not null
  group by cp.number_plain, coalesce(cp.variant_key, '')
  having count(*) != 1
) violations;

select
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  count(*)::int as rows_per_identity
from public.card_prints cp
where cp.set_code = 'g1'
  and cp.gv_id is not null
group by cp.number_plain, coalesce(cp.variant_key, '')
having count(*) != 1
order by cp.number_plain, coalesce(cp.variant_key, '');

-- CHECK 7 — RC-prefix promotion validation
drop table if exists tmp_g1_rc_prefix_validation_v2;

create temp table tmp_g1_rc_prefix_validation_v2 on commit drop as
select *
from (
  values
    ('GV-PK-GEN-RC2',  'RC2',  '2',  'rc'),
    ('GV-PK-GEN-RC3',  'RC3',  '3',  'rc'),
    ('GV-PK-GEN-RC5',  'RC5',  '5',  'rc'),
    ('GV-PK-GEN-RC7',  'RC7',  '7',  'rc'),
    ('GV-PK-GEN-RC8',  'RC8',  '8',  'rc'),
    ('GV-PK-GEN-RC12', 'RC12', '12', 'rc'),
    ('GV-PK-GEN-RC13', 'RC13', '13', 'rc'),
    ('GV-PK-GEN-RC14', 'RC14', '14', 'rc'),
    ('GV-PK-GEN-RC16', 'RC16', '16', 'rc'),
    ('GV-PK-GEN-RC17', 'RC17', '17', 'rc'),
    ('GV-PK-GEN-RC18', 'RC18', '18', 'rc'),
    ('GV-PK-GEN-RC19', 'RC19', '19', 'rc'),
    ('GV-PK-GEN-RC20', 'RC20', '20', 'rc'),
    ('GV-PK-GEN-RC23', 'RC23', '23', 'rc'),
    ('GV-PK-GEN-RC25', 'RC25', '25', 'rc'),
    ('GV-PK-GEN-RC30', 'RC30', '30', 'rc')
) expected(gv_id, expected_number, expected_number_plain, expected_variant_key);

select
  count(*)::int as rc_prefix_validation_count
from public.card_prints cp
join tmp_g1_rc_prefix_validation_v2 expected
  on expected.gv_id = cp.gv_id
where cp.set_code = 'g1';

select
  count(*)::int as rc_prefix_validation_mismatch_count
from public.card_prints cp
join tmp_g1_rc_prefix_validation_v2 expected
  on expected.gv_id = cp.gv_id
where cp.set_code = 'g1'
  and (
    cp.number <> expected.expected_number
    or cp.number_plain <> expected.expected_number_plain
    or coalesce(cp.variant_key, '') <> expected.expected_variant_key
    or cp.gv_id !~ '^GV-PK-GEN-RC[0-9]+$'
  );

select
  cp.gv_id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key
from public.card_prints cp
join tmp_g1_rc_prefix_validation_v2 expected
  on expected.gv_id = cp.gv_id
where cp.set_code = 'g1'
order by cp.gv_id;

-- CHECK 8 — canonical row count
select
  count(*)::int as canonical_count
from public.card_prints cp
where cp.set_code = 'g1'
  and cp.gv_id is not null;

rollback;
