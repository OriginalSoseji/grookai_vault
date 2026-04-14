-- G1_RC_PREFIX_EXACT_TOKEN_PROMOTION_V1
-- Read-only dry-run proof for the 16 RC-prefix promotion rows in g1.

begin;

drop table if exists tmp_g1_rc_prefix_promotion_source_v1;
drop table if exists tmp_g1_rc_prefix_promotion_contract_v1;
drop table if exists tmp_g1_rc_prefix_identity_key_collisions_v1;
drop table if exists tmp_g1_rc_prefix_gvid_collisions_v1;
drop table if exists tmp_g1_rc_prefix_exact_token_collisions_v1;
drop table if exists tmp_g1_rc_prefix_duplicate_keys_v1;
drop table if exists tmp_g1_rc_prefix_duplicate_gvids_v1;
drop table if exists tmp_g1_rc_prefix_resolved_overlap_v1;

create temp table tmp_g1_rc_prefix_promotion_source_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  upper(coalesce(cpi.printed_number, cp.number)) as old_printed_token,
  cp.set_id,
  coalesce(cp.variant_key, '') as source_variant_key
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where s.code = 'g1'
  and cp.gv_id is null
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'g1'
  and cpi.is_active = true
  and upper(coalesce(cpi.printed_number, cp.number)) ~ '^RC[0-9]+$';

create temp table tmp_g1_rc_prefix_promotion_contract_v1 on commit drop as
select
  src.old_parent_id,
  src.old_name,
  src.old_printed_token,
  src.set_id,
  src.old_printed_token as proposed_number,
  nullif(regexp_replace(src.old_printed_token, '[^0-9]', '', 'g'), '') as proposed_number_plain,
  'rc'::text as proposed_variant_key,
  concat('GV-PK-GEN-', src.old_printed_token) as proposed_gv_id
from tmp_g1_rc_prefix_promotion_source_v1 src;

create temp table tmp_g1_rc_prefix_identity_key_collisions_v1 on commit drop as
select
  p.old_parent_id,
  cp.id as collision_target_id,
  cp.gv_id as collision_target_gv_id,
  cp.name as collision_target_name,
  cp.number as collision_target_number,
  cp.number_plain as collision_target_number_plain,
  coalesce(cp.variant_key, '') as collision_target_variant_key
from tmp_g1_rc_prefix_promotion_contract_v1 p
join public.card_prints cp
  on cp.set_id = p.set_id
 and cp.gv_id is not null
 and cp.number_plain = p.proposed_number_plain
 and coalesce(cp.variant_key, '') = p.proposed_variant_key;

create temp table tmp_g1_rc_prefix_gvid_collisions_v1 on commit drop as
select
  p.old_parent_id,
  cp.id as collision_target_id,
  cp.gv_id as collision_target_gv_id,
  cp.name as collision_target_name,
  cp.set_code as collision_target_set_code
from tmp_g1_rc_prefix_promotion_contract_v1 p
join public.card_prints cp
  on cp.gv_id = p.proposed_gv_id;

create temp table tmp_g1_rc_prefix_exact_token_collisions_v1 on commit drop as
select
  p.old_parent_id,
  cp.id as collision_target_id,
  cp.gv_id as collision_target_gv_id,
  cp.name as collision_target_name,
  cp.number as collision_target_number
from tmp_g1_rc_prefix_promotion_contract_v1 p
join public.card_prints cp
  on cp.set_id = p.set_id
 and cp.gv_id is not null
 and cp.number = p.proposed_number;

create temp table tmp_g1_rc_prefix_duplicate_keys_v1 on commit drop as
select
  proposed_number_plain,
  proposed_variant_key,
  count(*)::int as row_count
from tmp_g1_rc_prefix_promotion_contract_v1
group by proposed_number_plain, proposed_variant_key
having count(*) > 1;

create temp table tmp_g1_rc_prefix_duplicate_gvids_v1 on commit drop as
select
  proposed_gv_id,
  count(*)::int as row_count
from tmp_g1_rc_prefix_promotion_contract_v1
group by proposed_gv_id
having count(*) > 1;

create temp table tmp_g1_rc_prefix_resolved_overlap_v1 on commit drop as
select old_id
from (
  values
    ('50339ab4-4d1c-48b9-8628-73bf7db7466e'::uuid),
    ('95619b17-efd1-4024-b7e7-0cbec99563de'::uuid),
    ('6dc60443-defe-4215-8eed-d527e4ed92a6'::uuid),
    ('c96abf3a-259e-4d9e-a512-0309a56e3a8c'::uuid),
    ('3892fb4e-0a8a-4383-a92a-59382a7346e5'::uuid),
    ('c2bacdbe-d06f-4a03-97d0-3e130b09fa51'::uuid),
    ('2f64204c-ca45-48ee-8e0f-b3bba0220450'::uuid),
    ('c79b0839-1eef-4845-b00c-f9b72dd08cf1'::uuid),
    ('43b1fb28-fb36-45c5-8476-4fe038f517f7'::uuid),
    ('76f8bf1d-0e92-4bf6-b84b-61ee8ef6df96'::uuid),
    ('a65be2db-b9f3-4f8d-9df5-593bd2a4ba07'::uuid),
    ('4ec0a100-19b9-4cf0-9887-4cc5f70bce15'::uuid),
    ('6c85fab5-fee4-4509-beeb-66030d85466b'::uuid)
) resolved(old_id);

select
  (select count(*)::int from tmp_g1_rc_prefix_promotion_source_v1) as promotion_source_count,
  (select count(*)::int from tmp_g1_rc_prefix_identity_key_collisions_v1) as identity_key_collision_count,
  (select count(*)::int from tmp_g1_rc_prefix_gvid_collisions_v1) as gvid_collision_count,
  (select count(*)::int from tmp_g1_rc_prefix_exact_token_collisions_v1) as exact_token_collision_count,
  (select count(*)::int from tmp_g1_rc_prefix_duplicate_keys_v1) as duplicate_proposed_key_count,
  (select count(*)::int from tmp_g1_rc_prefix_duplicate_gvids_v1) as duplicate_proposed_gvid_count,
  (
    select count(*)::int
    from tmp_g1_rc_prefix_promotion_source_v1 src
    join tmp_g1_rc_prefix_resolved_overlap_v1 resolved
      on resolved.old_id = src.old_parent_id
  ) as overlap_with_resolved_rows_count;

select
  old_parent_id,
  old_name,
  old_printed_token,
  proposed_number,
  proposed_number_plain,
  proposed_variant_key,
  proposed_gv_id,
  case
    when exists (
      select 1
      from tmp_g1_rc_prefix_identity_key_collisions_v1 c
      where c.old_parent_id = p.old_parent_id
    ) then 'BLOCKED_IDENTITY_KEY_COLLISION'
    when exists (
      select 1
      from tmp_g1_rc_prefix_gvid_collisions_v1 c
      where c.old_parent_id = p.old_parent_id
    ) then 'BLOCKED_GVID_COLLISION'
    when exists (
      select 1
      from tmp_g1_rc_prefix_exact_token_collisions_v1 c
      where c.old_parent_id = p.old_parent_id
    ) then 'BLOCKED_EXACT_TOKEN_COLLISION'
    else 'PROMOTION_READY_COLLISION_FREE'
  end as validation_status
from tmp_g1_rc_prefix_promotion_contract_v1 p
order by cast(proposed_number_plain as integer), old_parent_id;

select
  'card_print_identity' as fk_table,
  count(*)::int as fk_row_count
from public.card_print_identity
where card_print_id in (select old_parent_id from tmp_g1_rc_prefix_promotion_source_v1)
union all
select
  'card_print_traits' as fk_table,
  count(*)::int as fk_row_count
from public.card_print_traits
where card_print_id in (select old_parent_id from tmp_g1_rc_prefix_promotion_source_v1)
union all
select
  'card_printings' as fk_table,
  count(*)::int as fk_row_count
from public.card_printings
where card_print_id in (select old_parent_id from tmp_g1_rc_prefix_promotion_source_v1)
union all
select
  'external_mappings' as fk_table,
  count(*)::int as fk_row_count
from public.external_mappings
where card_print_id in (select old_parent_id from tmp_g1_rc_prefix_promotion_source_v1)
union all
select
  'vault_items' as fk_table,
  count(*)::int as fk_row_count
from public.vault_items
where card_id in (select old_parent_id from tmp_g1_rc_prefix_promotion_source_v1);

rollback;
