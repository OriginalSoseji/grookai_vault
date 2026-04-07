-- COL1_EXACT_TOKEN_PROMOTION_V1
-- Exact read-only proof used by backend/identity/col1_exact_token_promotion_apply_v1.mjs.
-- Under COL1_IDENTITY_CONTRACT_V1, builder derivation is exactly:
--   GV-PK-COL-<PRINTED_NUMBER>
-- for valid numeric and SL# tokens with base variant_key.

-- Phase 1: candidate surface counts and token validation.
with candidates as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.gv_id,
    cp.variant_key,
    cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'col1'
    and cp.gv_id is null
)
select
  count(*)::int as candidate_count,
  count(*) filter (where printed_number ~ '^(?:[0-9]+|SL[0-9]+)$')::int as valid_token_count,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_token_count,
  count(*) filter (where printed_number ~ '^SL[0-9]+$')::int as sl_token_count,
  count(*) filter (where printed_number !~ '^(?:[0-9]+|SL[0-9]+)$')::int as invalid_token_count
from candidates;

-- Phase 1: token uniqueness proof.
with candidates as (
  select cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'col1'
    and cp.gv_id is null
)
select
  printed_number,
  count(*)::int as row_count
from candidates
group by printed_number
having count(*) > 1
order by printed_number;

-- Phase 1 and Phase 2: same-token canonical overlap and conflict audit.
with candidates as (
  select
    cp.id as card_print_id,
    cp.name,
    cpi.printed_number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as db_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'col1'
    and cp.gv_id is null
    and cpi.printed_number ~ '^(?:[0-9]+|SL[0-9]+)$'
),
canonical as (
  select
    cp.id as canonical_card_print_id,
    cp.name as canonical_name,
    cp.number as canonical_number,
    cp.gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as db_normalized_name
  from public.card_prints cp
  where cp.set_code = 'col1'
    and cp.gv_id is not null
)
select
  c.card_print_id,
  c.name,
  c.printed_number,
  canon.canonical_card_print_id,
  canon.canonical_name,
  canon.canonical_number,
  canon.gv_id,
  case
    when canon.db_normalized_name = c.db_normalized_name then 'same_token_same_name'
    else 'same_token_different_name'
  end as collision_type
from candidates c
join canonical canon
  on canon.canonical_number = c.printed_number
order by c.printed_number, c.card_print_id, canon.canonical_card_print_id;

-- Phase 1 and Phase 2: proposed gv_id derivation with internal and live collision proof.
with candidates as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.variant_key,
    cpi.printed_number,
    'GV-PK-COL-' || cpi.printed_number as proposed_gv_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'col1'
    and cp.gv_id is null
    and cpi.printed_number ~ '^(?:[0-9]+|SL[0-9]+)$'
),
internal_collisions as (
  select proposed_gv_id, count(*)::int as row_count
  from candidates
  group by proposed_gv_id
  having count(*) > 1
),
live_collisions as (
  select cp.id, cp.gv_id, cp.name, cp.number, cp.set_code
  from public.card_prints cp
  join candidates c
    on c.proposed_gv_id = cp.gv_id
)
select
  (select count(*)::int from candidates) as candidate_count,
  (select count(*)::int from internal_collisions) as internal_collision_count,
  (select count(*)::int from live_collisions) as live_collision_count;

-- Phase 1 and Phase 2: candidate sample rows with proposed gv_ids.
with candidates as (
  select
    cp.id as card_print_id,
    cp.name,
    cpi.printed_number,
    'GV-PK-COL-' || cpi.printed_number as proposed_gv_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'col1'
    and cp.gv_id is null
    and cpi.printed_number ~ '^(?:[0-9]+|SL[0-9]+)$'
)
select
  card_print_id,
  name,
  printed_number,
  proposed_gv_id
from candidates
order by
  case when printed_number ~ '^SL[0-9]+$' then 1 else 0 end,
  nullif(regexp_replace(printed_number, '[^0-9]', '', 'g'), '')::int,
  printed_number,
  card_print_id;
