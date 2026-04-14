-- G1_RC_PREFIX_PROMOTION_LANE_AUDIT_V1
-- Read-only audit of the remaining RC-prefix unresolved g1 rows.
--
-- Live contract note:
--   Existing canonical Radiant Collection rows in g1 use:
--     number       = 'RC##'
--     number_plain = '<numeric part only>'
--     variant_key  = 'rc'
--     gv_id        = 'GV-PK-GEN-RC##'
--
-- This means the lawful promotion key for the remaining unresolved RC rows is:
--   proposed_number_plain = numeric part of RC token
--   proposed_variant_key  = 'rc'
--   proposed_gv_id        = GV-PK-GEN-RC##
--
-- Raw numeric overlap with base-set rows is expected and is not a collision.
-- The RC lane is separated by variant_key = 'rc' and the RC-prefixed printed token.

begin;

drop table if exists tmp_g1_rc_unresolved_v1;
drop table if exists tmp_g1_rc_existing_canonical_v1;
drop table if exists tmp_g1_rc_promotion_contract_v1;
drop table if exists tmp_g1_rc_identity_key_collisions_v1;
drop table if exists tmp_g1_rc_gvid_collisions_v1;
drop table if exists tmp_g1_rc_base_numeric_overlaps_v1;
drop table if exists tmp_g1_rc_classification_v1;

create temp table tmp_g1_rc_unresolved_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  coalesce(cpi.printed_number, cp.number) as printed_token,
  coalesce(cp.variant_key, '') as variant_key,
  btrim(
    regexp_replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                  chr(96),
                  ''''
                ),
                chr(180),
                ''''
              ),
              chr(8212),
              ' '
            ),
            chr(8211),
            ' '
          ),
          '-gx',
          ' gx'
        ),
        '-ex',
        ' ex'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as normalized_name,
  nullif(regexp_replace(coalesce(cpi.printed_number, cp.number), '[^0-9]', '', 'g'), '') as normalized_token,
  cp.set_id
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where s.code = 'g1'
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'g1'
  and cpi.is_active = true
  and cp.gv_id is null
  and coalesce(cpi.printed_number, cp.number) ~ '^RC[0-9]+$';

create temp table tmp_g1_rc_existing_canonical_v1 on commit drop as
select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  cp.gv_id,
  cp.set_id
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'g1'
  and cp.gv_id is not null
  and cp.number ~ '^RC[0-9]+$';

create temp table tmp_g1_rc_promotion_contract_v1 on commit drop as
select
  u.old_parent_id,
  u.old_name,
  u.printed_token,
  u.variant_key,
  u.normalized_name,
  u.normalized_token,
  u.normalized_token as proposed_number_plain,
  'rc'::text as proposed_variant_key,
  concat('GV-PK-GEN-', upper(u.printed_token)) as proposed_gv_id,
  u.set_id
from tmp_g1_rc_unresolved_v1 u;

create temp table tmp_g1_rc_identity_key_collisions_v1 on commit drop as
select
  p.old_parent_id,
  c.id as collision_target_id,
  c.name as collision_target_name,
  c.number as collision_target_number,
  c.number_plain as collision_target_number_plain,
  c.variant_key as collision_target_variant_key,
  c.gv_id as collision_target_gv_id
from tmp_g1_rc_promotion_contract_v1 p
join public.card_prints c
  on c.set_id = p.set_id
 and c.gv_id is not null
 and c.number_plain = p.proposed_number_plain
 and coalesce(c.variant_key, '') = p.proposed_variant_key;

create temp table tmp_g1_rc_gvid_collisions_v1 on commit drop as
select
  p.old_parent_id,
  c.id as collision_target_id,
  c.name as collision_target_name,
  c.number as collision_target_number,
  c.gv_id as collision_target_gv_id
from tmp_g1_rc_promotion_contract_v1 p
join public.card_prints c
  on c.gv_id = p.proposed_gv_id;

create temp table tmp_g1_rc_base_numeric_overlaps_v1 on commit drop as
select
  p.old_parent_id,
  count(c.id)::int as base_numeric_overlap_count
from tmp_g1_rc_promotion_contract_v1 p
join public.card_prints c
  on c.set_id = p.set_id
 and c.gv_id is not null
 and c.number_plain = p.proposed_number_plain
 and coalesce(c.variant_key, '') <> p.proposed_variant_key
group by p.old_parent_id;

create temp table tmp_g1_rc_classification_v1 on commit drop as
select
  p.old_parent_id,
  p.old_name,
  p.printed_token,
  p.proposed_number_plain,
  p.proposed_variant_key,
  p.proposed_gv_id,
  case
    when p.printed_token !~ '^RC[0-9]+$' then 'UNCLASSIFIED'
    when exists (
      select 1
      from tmp_g1_rc_identity_key_collisions_v1 ic
      where ic.old_parent_id = p.old_parent_id
    ) then 'UNCLASSIFIED'
    when exists (
      select 1
      from tmp_g1_rc_gvid_collisions_v1 gc
      where gc.old_parent_id = p.old_parent_id
    ) then 'UNCLASSIFIED'
    else 'PROMOTION_READY_COLLISION_FREE'
  end as execution_class,
  case
    when p.printed_token !~ '^RC[0-9]+$'
      then 'row does not satisfy RC-prefix printed-token contract'
    when exists (
      select 1
      from tmp_g1_rc_identity_key_collisions_v1 ic
      where ic.old_parent_id = p.old_parent_id
    )
      then 'identity-key collision on (set_id, number_plain, variant_key)'
    when exists (
      select 1
      from tmp_g1_rc_gvid_collisions_v1 gc
      where gc.old_parent_id = p.old_parent_id
    )
      then 'gv_id collision on proposed GV-PK-GEN-RC##'
    else 'RC-prefixed printed token maps lawfully into the existing g1 RC canonical contract with variant_key = rc and no identity/gv_id collision'
  end as proof_reason
from tmp_g1_rc_promotion_contract_v1 p;

-- PHASE 1 — target row audit
select
  old_parent_id,
  old_name,
  printed_token,
  variant_key,
  normalized_name,
  normalized_token
from tmp_g1_rc_unresolved_v1
order by printed_token, old_parent_id;

-- PHASE 2 — promotion key analysis
select
  old_parent_id,
  old_name,
  printed_token,
  proposed_number_plain,
  proposed_variant_key,
  proposed_gv_id
from tmp_g1_rc_promotion_contract_v1
order by printed_token, old_parent_id;

-- PHASE 3 — collision checks
select
  (select count(*)::int from tmp_g1_rc_promotion_contract_v1) as promotion_candidate_count,
  (select count(*)::int from tmp_g1_rc_identity_key_collisions_v1) as identity_collision_count,
  (select count(*)::int from tmp_g1_rc_gvid_collisions_v1) as gv_id_collision_count,
  (
    select count(*)::int
    from tmp_g1_rc_classification_v1
    where execution_class = 'UNCLASSIFIED'
  ) as unclassified_count,
  (
    select count(*)::int
    from tmp_g1_rc_base_numeric_overlaps_v1
  ) as base_numeric_overlap_row_count;

-- PHASE 4 — classification
select
  old_parent_id,
  old_name,
  printed_token,
  proposed_number_plain,
  proposed_variant_key,
  proposed_gv_id,
  execution_class,
  proof_reason
from tmp_g1_rc_classification_v1
order by printed_token, old_parent_id;

-- PHASE 5 — identity lane validation
select
  id as canonical_target_id,
  name as canonical_target_name,
  number as canonical_printed_token,
  number_plain as canonical_number_plain,
  variant_key as canonical_variant_key,
  gv_id as canonical_gv_id
from tmp_g1_rc_existing_canonical_v1
order by number, id;

-- PHASE 6 — summary / next unit
select
  (select count(*)::int from tmp_g1_rc_promotion_contract_v1) as promotion_candidate_count,
  (
    select count(*)::int
    from tmp_g1_rc_classification_v1
    where execution_class = 'PROMOTION_READY_COLLISION_FREE'
  ) as promotion_ready_count,
  (
    select count(*)::int
    from tmp_g1_rc_identity_key_collisions_v1
  ) + (
    select count(*)::int
    from tmp_g1_rc_gvid_collisions_v1
  ) as collision_count,
  (select count(*)::int from tmp_g1_rc_gvid_collisions_v1) as gv_id_collision_count,
  (select count(*)::int from tmp_g1_rc_identity_key_collisions_v1) as identity_collision_count,
  (
    select count(*)::int
    from tmp_g1_rc_classification_v1
    where execution_class = 'UNCLASSIFIED'
  ) as unclassified_count,
  'G1_RC_PREFIX_EXACT_TOKEN_PROMOTION_V1'::text as next_lawful_execution_unit,
  case
    when (select count(*) from tmp_g1_rc_identity_key_collisions_v1) = 0
      and (select count(*) from tmp_g1_rc_gvid_collisions_v1) = 0
      and (
        select count(*)
        from tmp_g1_rc_classification_v1
        where execution_class = 'UNCLASSIFIED'
      ) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

rollback;
