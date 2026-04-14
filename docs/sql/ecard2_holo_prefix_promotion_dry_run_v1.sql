-- ECARD2_HOLO_PREFIX_EXACT_TOKEN_PROMOTION_V1
-- Read-only dry-run proof for the remaining 10 holo-prefix unresolved rows in ecard2.
--
-- Scope:
--   - apply surface = exact 10 H-prefixed unresolved rows only
--   - no reuse of existing canonical rows
--   - no mutation

begin;

drop table if exists tmp_ecard2_holo_expected_rows_v1;
drop table if exists tmp_ecard2_holo_live_scope_v1;
drop table if exists tmp_ecard2_holo_missing_expected_v1;
drop table if exists tmp_ecard2_holo_unexpected_live_v1;
drop table if exists tmp_ecard2_holo_duplicate_tokens_v1;
drop table if exists tmp_ecard2_holo_duplicate_proposed_keys_v1;
drop table if exists tmp_ecard2_holo_exact_token_collisions_v1;
drop table if exists tmp_ecard2_holo_identity_key_collisions_v1;
drop table if exists tmp_ecard2_holo_gvid_collisions_v1;
drop table if exists tmp_ecard2_holo_validation_v1;

create temp table tmp_ecard2_holo_expected_rows_v1 on commit drop as
select *
from (
  values
    ('8272e758-ac91-41c3-87ad-9b3622155bf1'::uuid, 'Exeggutor', 'H10', 'GV-PK-AQ-H10'),
    ('c7fdcf93-bf83-41fa-a6e2-edd63bc391f0'::uuid, 'Kingdra', 'H14', 'GV-PK-AQ-H14'),
    ('62661fa2-40b4-48bf-96c1-8d225581a3d2'::uuid, 'Scizor', 'H21', 'GV-PK-AQ-H21'),
    ('eb8d04d0-07ae-4805-8861-b1a1a286f52a'::uuid, 'Slowking', 'H22', 'GV-PK-AQ-H22'),
    ('10c9d12e-77c9-4334-9fde-1542a79b1f5a'::uuid, 'Steelix', 'H23', 'GV-PK-AQ-H23'),
    ('7215c907-c6ae-4951-b552-a7a543bae195'::uuid, 'Sudowoodo', 'H24', 'GV-PK-AQ-H24'),
    ('6a14016b-edef-4f74-b360-20187e09e2bb'::uuid, 'Tentacruel', 'H26', 'GV-PK-AQ-H26'),
    ('aef2e04c-4713-4801-b815-5fa354d68659'::uuid, 'Togetic', 'H27', 'GV-PK-AQ-H27'),
    ('4fcf41bc-8e06-44fe-ad64-da6664f4d859'::uuid, 'Umbreon', 'H29', 'GV-PK-AQ-H29'),
    ('1081cdf5-5334-432f-85d9-4d0c769836f8'::uuid, 'Vileplume', 'H31', 'GV-PK-AQ-H31')
) as expected_rows(old_parent_id, expected_name, expected_printed_token, expected_gv_id);

create temp table tmp_ecard2_holo_live_scope_v1 on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
  upper(cpi.printed_number) as old_printed_token,
  upper(cpi.printed_number) as proposed_number_plain,
  coalesce(cp.variant_key, '') as proposed_variant_key,
  cp.set_id,
  s.code as set_code,
  s.printed_set_abbrev,
  'GV-PK-' || upper(regexp_replace(s.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
    upper(regexp_replace(cpi.printed_number, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2'
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'ecard2'
  and cpi.is_active = true
  and cp.gv_id is null
  and cpi.printed_number ~ '^H[0-9]+$';

create temp table tmp_ecard2_holo_missing_expected_v1 on commit drop as
select
  e.old_parent_id,
  e.expected_name,
  e.expected_printed_token
from tmp_ecard2_holo_expected_rows_v1 e
left join tmp_ecard2_holo_live_scope_v1 s
  on s.old_id = e.old_parent_id
where s.old_id is null;

create temp table tmp_ecard2_holo_unexpected_live_v1 on commit drop as
select
  s.old_id,
  s.old_name,
  s.old_printed_token
from tmp_ecard2_holo_live_scope_v1 s
left join tmp_ecard2_holo_expected_rows_v1 e
  on e.old_parent_id = s.old_id
where e.old_parent_id is null;

create temp table tmp_ecard2_holo_duplicate_tokens_v1 on commit drop as
select
  old_printed_token,
  count(*)::int as row_count
from tmp_ecard2_holo_live_scope_v1
group by old_printed_token
having count(*) > 1;

create temp table tmp_ecard2_holo_duplicate_proposed_keys_v1 on commit drop as
select
  set_id,
  proposed_number_plain,
  proposed_variant_key,
  count(*)::int as row_count
from tmp_ecard2_holo_live_scope_v1
group by set_id, proposed_number_plain, proposed_variant_key
having count(*) > 1;

create temp table tmp_ecard2_holo_exact_token_collisions_v1 on commit drop as
select
  s.old_id,
  cp.id as collision_target_id,
  cp.gv_id as collision_target_gv_id,
  cp.name as collision_target_name,
  cp.number as collision_target_number,
  cp.number_plain as collision_target_number_plain
from tmp_ecard2_holo_live_scope_v1 s
join public.card_prints cp
  on cp.set_id = s.set_id
 and cp.gv_id is not null
 and (cp.number = s.old_printed_token or cp.number_plain = s.proposed_number_plain)
 and cp.id <> s.old_id;

create temp table tmp_ecard2_holo_identity_key_collisions_v1 on commit drop as
select
  s.old_id,
  cp.id as collision_target_id,
  cp.gv_id as collision_target_gv_id,
  cp.name as collision_target_name,
  cp.number as collision_target_number
from tmp_ecard2_holo_live_scope_v1 s
join public.card_prints cp
  on cp.set_id = s.set_id
 and cp.number_plain = s.proposed_number_plain
 and coalesce(cp.variant_key, '') = s.proposed_variant_key
 and cp.id <> s.old_id;

create temp table tmp_ecard2_holo_gvid_collisions_v1 on commit drop as
select
  s.old_id,
  cp.id as collision_target_id,
  cp.gv_id as collision_target_gv_id,
  cp.name as collision_target_name
from tmp_ecard2_holo_live_scope_v1 s
join public.card_prints cp
  on cp.gv_id = s.proposed_gv_id
 and cp.id <> s.old_id;

create temp table tmp_ecard2_holo_validation_v1 on commit drop as
select
  s.old_id,
  s.old_name,
  s.old_printed_token as printed_token,
  s.proposed_gv_id,
  case
    when e.old_parent_id is null then 'STOP_UNEXPECTED_SCOPE'
    when s.old_name <> e.expected_name then 'STOP_NAME_MISMATCH'
    when s.old_printed_token <> e.expected_printed_token then 'STOP_TOKEN_MISMATCH'
    when s.proposed_gv_id <> e.expected_gv_id then 'STOP_GVID_MISMATCH'
    when exists (select 1 from tmp_ecard2_holo_exact_token_collisions_v1 c where c.old_id = s.old_id) then 'STOP_EXACT_TOKEN_COLLISION'
    when exists (select 1 from tmp_ecard2_holo_identity_key_collisions_v1 c where c.old_id = s.old_id) then 'STOP_IDENTITY_KEY_COLLISION'
    when exists (select 1 from tmp_ecard2_holo_gvid_collisions_v1 c where c.old_id = s.old_id) then 'STOP_GVID_COLLISION'
    else 'READY'
  end as validation_status
from tmp_ecard2_holo_live_scope_v1 s
left join tmp_ecard2_holo_expected_rows_v1 e
  on e.old_parent_id = s.old_id;

select
  (select count(*)::int from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is null) as total_unresolved_count,
  (select count(*)::int from tmp_ecard2_holo_live_scope_v1) as source_count,
  (select count(*)::int from tmp_ecard2_holo_live_scope_v1 where old_printed_token ~ '^H[0-9]+$') as h_token_match_count,
  (select count(*)::int from tmp_ecard2_holo_missing_expected_v1) as missing_expected_row_count,
  (select count(*)::int from tmp_ecard2_holo_unexpected_live_v1) as unexpected_live_row_count,
  (select count(*)::int from tmp_ecard2_holo_duplicate_tokens_v1) as duplicate_token_count,
  (select count(*)::int from tmp_ecard2_holo_duplicate_proposed_keys_v1) as duplicate_proposed_key_count,
  (select count(*)::int from tmp_ecard2_holo_exact_token_collisions_v1) as exact_token_collision_count,
  (select count(*)::int from tmp_ecard2_holo_identity_key_collisions_v1) as identity_key_collision_count,
  (select count(*)::int from tmp_ecard2_holo_gvid_collisions_v1) as gvid_collision_count,
  (select count(*)::int from public.card_prints cp join public.sets s on s.id = cp.set_id where s.code = 'ecard2' and cp.gv_id is not null) as canonical_count_before;

select
  old_id,
  old_name,
  printed_token,
  proposed_gv_id,
  validation_status
from tmp_ecard2_holo_validation_v1
order by printed_token, old_id;

select
  (select count(*)::int from public.card_print_identity where card_print_id in (select old_id from tmp_ecard2_holo_live_scope_v1)) as card_print_identity,
  (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from tmp_ecard2_holo_live_scope_v1)) as card_print_traits,
  (select count(*)::int from public.card_printings where card_print_id in (select old_id from tmp_ecard2_holo_live_scope_v1)) as card_printings,
  (select count(*)::int from public.external_mappings where card_print_id in (select old_id from tmp_ecard2_holo_live_scope_v1)) as external_mappings,
  (select count(*)::int from public.vault_items where card_id in (select old_id from tmp_ecard2_holo_live_scope_v1)) as vault_items;

rollback;
