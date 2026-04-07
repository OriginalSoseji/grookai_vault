-- REMAINING_IDENTITY_SURFACE_GLOBAL_AUDIT_V2
-- Exact read-only query set used by backend/identity/remaining_identity_surface_global_audit_v2.mjs.
--
-- Repo/canon-aware name normalization, builder-derived promotion checks, exact-token
-- contract validation, companion-lane matching, and final classification are computed
-- in JavaScript after loading the rowsets below.

-- 1. Unresolved identity domains.
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

-- 2. Global unresolved counts by set_code_identity.
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

-- 3. Unresolved source rows used for:
--    - per-set counts
--    - token validation
--    - duplicate / alias / family readiness
--    - promotion readiness
--    - blocker detection
select
  cp.id as card_print_id,
  cp.name as unresolved_name,
  cp.number as parent_number,
  cp.number_plain as parent_number_plain,
  cp.variant_key,
  cp.set_code as parent_set_code,
  cpi.identity_domain,
  cpi.set_code_identity,
  cpi.printed_number,
  cpi.normalized_printed_name,
  cpi.identity_key_version,
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

-- 4. Canonical rows used for:
--    - canonical base-lane presence
--    - evidence-backed companion-lane presence
--    - duplicate / alias / family readiness
--    - live gv_id collision checks
--    - namespace migration detection
select
  cp.id as canonical_card_print_id,
  cp.name as canonical_name,
  cp.set_code,
  cp.number,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id,
  s.printed_set_abbrev,
  s.printed_total
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.gv_id is not null
order by cp.set_code, cp.number, cp.id;

-- 5. Canonical base-lane presence summary (diagnostic convenience query).
select
  cp.set_code,
  count(*)::int as canonical_base_count,
  count(*) filter (where cp.number ~ '^[0-9]+$')::int as canonical_base_numeric_count,
  count(*) filter (where cp.number !~ '^[0-9]+$')::int as canonical_base_non_numeric_count
from public.card_prints cp
where cp.gv_id is not null
group by cp.set_code
order by cp.set_code;

-- 6. Evidence-backed companion lane presence for known pairs only.
with known_pairs as (
  select * from (
    values
      ('swsh4.5', 'swsh45sv', 'family'),
      ('swsh9', 'swsh9tg', 'family'),
      ('swsh10', 'swsh10tg', 'family'),
      ('swsh11', 'swsh11tg', 'family'),
      ('swsh12', 'swsh12tg', 'family'),
      ('exu', 'ex10', 'alias'),
      ('hgssp', 'hsp', 'alias')
  ) as t(alias_code, canonical_code, lane_type)
)
select
  kp.alias_code as set_code_identity,
  kp.canonical_code as family_or_alias_lane_code,
  kp.lane_type,
  count(cp.id)::int as family_or_alias_lane_count
from known_pairs kp
left join public.card_prints cp
  on cp.set_code = kp.canonical_code
 and cp.gv_id is not null
group by kp.alias_code, kp.canonical_code, kp.lane_type
order by kp.alias_code;

-- 7. Raw exact-token overlaps against the same set (diagnostic only; JS applies
--    repo/canon-aware normalization and contract-aware token rules).
select
  cpi.set_code_identity,
  cpi.printed_number,
  cp.name as unresolved_name,
  canon.id as canonical_card_print_id,
  canon.name as canonical_name,
  canon.number as canonical_number,
  canon.gv_id as canonical_gv_id
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
left join public.card_prints canon
  on canon.set_code = cpi.set_code_identity
 and canon.gv_id is not null
 and canon.number = cpi.printed_number
where cpi.is_active = true
  and cp.gv_id is null
order by cpi.set_code_identity, cpi.printed_number, canon.id;

-- 8. Raw exact-token overlaps against evidence-backed companion lanes (diagnostic only).
with known_pairs as (
  select * from (
    values
      ('swsh4.5', 'swsh45sv'),
      ('swsh9', 'swsh9tg'),
      ('swsh10', 'swsh10tg'),
      ('swsh11', 'swsh11tg'),
      ('swsh12', 'swsh12tg'),
      ('exu', 'ex10'),
      ('hgssp', 'hsp')
  ) as t(alias_code, canonical_code)
)
select
  cpi.set_code_identity,
  kp.canonical_code as family_or_alias_lane_code,
  cpi.printed_number,
  cp.name as unresolved_name,
  canon.id as canonical_card_print_id,
  canon.name as canonical_name,
  canon.number as canonical_number,
  canon.gv_id as canonical_gv_id
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join known_pairs kp
  on kp.alias_code = cpi.set_code_identity
left join public.card_prints canon
  on canon.set_code = kp.canonical_code
 and canon.gv_id is not null
 and canon.number = cpi.printed_number
where cpi.is_active = true
  and cp.gv_id is null
order by cpi.set_code_identity, cpi.printed_number, canon.id;

-- 9. FK readiness snapshot source rows (the runner aggregates by unresolved parent id).
select
  cp.id as card_print_id,
  cpi.set_code_identity,
  cp.name,
  cpi.printed_number
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cp.gv_id is null
order by cpi.set_code_identity, cpi.printed_number, cp.id;
