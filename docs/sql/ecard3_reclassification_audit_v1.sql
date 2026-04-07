-- ECARD3_RECLASSIFICATION_AUDIT_V1
-- Exact read-only queries used by backend/identity/ecard3_reclassification_audit_v1.mjs.
-- Repo/canon-aware name normalization and builder-derived namespace checks are computed
-- in the runner with normalizeCardNameV1 and buildCardPrintGvIdV1 after loading
-- these row sets.

-- Phase 1: unresolved ecard3 surface counts and token validation.
with unresolved as (
  select
    cp.id,
    cp.name,
    cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'ecard3'
    and cp.gv_id is null
)
select
  count(*)::int as total_unresolved,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_token_count,
  count(*) filter (where printed_number ~ '^H[0-9]+$')::int as holo_token_count,
  count(*) filter (
    where printed_number !~ '^[0-9]+$'
      and printed_number !~ '^H[0-9]+$'
  )::int as invalid_token_count
from unresolved;

-- Phase 2: canonical ecard3 lane summary.
select
  count(*)::int as canonical_ecard3_total_rows,
  count(*) filter (where number ~ '^[0-9]+$')::int as canonical_numeric_count,
  count(*) filter (where number ~ '^H[0-9]+$')::int as canonical_holo_count
from public.card_prints
where set_code = 'ecard3'
  and gv_id is not null;

-- Phase 2: canonical ecard3 sample rows.
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'ecard3'
  and cp.gv_id is not null
order by
  case when cp.number ~ '^H[0-9]+$' then 1 else 0 end,
  nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), '')::int,
  cp.number,
  cp.id
limit 25;

-- Phase 3-7: unresolved ecard3 rows loaded for exact-token collapse audit,
-- format-drift diagnostics, promotion readiness, qualifier review, and namespace audit.
select
  cp.id as old_id,
  cp.name as old_name,
  cp.number as card_print_number,
  cp.number_plain,
  cp.set_code,
  cp.variant_key,
  cpi.printed_number,
  cpi.normalized_printed_name,
  cpi.identity_key_version,
  s.printed_set_abbrev
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
left join public.sets s
  on s.id = cp.set_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'ecard3'
  and cp.gv_id is null
order by
  case when cpi.printed_number ~ '^H[0-9]+$' then 1 else 0 end,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '')::int,
  cpi.printed_number,
  cp.id;

-- Phase 3-7: canonical ecard3 rows loaded for exact-token collapse audit,
-- format-drift diagnostics, and namespace audit.
select
  cp.id as new_id,
  cp.name as new_name,
  cp.number,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id,
  cp.set_code,
  s.printed_set_abbrev
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.set_code = 'ecard3'
  and cp.gv_id is not null
order by
  case when cp.number ~ '^H[0-9]+$' then 1 else 0 end,
  nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), '')::int,
  cp.number,
  cp.id;

-- Phase 3: exact-token same-token diagnostic using DB-side lightweight normalization only.
-- The runner performs the authoritative repo/canon-aware normalization after loading.
with unresolved_valid as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as db_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'ecard3'
    and cp.gv_id is null
    and (cpi.printed_number ~ '^[0-9]+$' or cpi.printed_number ~ '^H[0-9]+$')
),
canonical_valid as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number,
    cp.gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as db_normalized_name
  from public.card_prints cp
  where cp.set_code = 'ecard3'
    and cp.gv_id is not null
    and (cp.number ~ '^[0-9]+$' or cp.number ~ '^H[0-9]+$')
)
select
  u.old_id,
  u.old_name,
  u.printed_number,
  c.new_id,
  c.new_name,
  c.number,
  c.gv_id
from unresolved_valid u
join canonical_valid c
  on c.number = u.printed_number
 and c.db_normalized_name = u.db_normalized_name
order by u.printed_number, u.old_id, c.new_id;

-- Phase 4: token-format drift diagnostics only.
-- Preserve the lane (`H` vs numeric) and compare the numeric portion after integer normalization.
with unresolved_valid as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number,
    case
      when cpi.printed_number ~ '^H[0-9]+$'
        then 'H' || nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), '')
      when cpi.printed_number ~ '^[0-9]+$'
        then coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0')
      else null
    end as drift_token,
    case
      when cpi.printed_number ~ '^H[0-9]+$' then 'holo'
      when cpi.printed_number ~ '^[0-9]+$' then 'numeric'
      else 'invalid'
    end as lane_type,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as db_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'ecard3'
    and cp.gv_id is null
),
canonical_valid as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number,
    cp.gv_id,
    case
      when cp.number ~ '^H[0-9]+$'
        then 'H' || nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), '')
      when cp.number ~ '^[0-9]+$'
        then coalesce(nullif(ltrim(cp.number, '0'), ''), '0')
      else null
    end as drift_token,
    case
      when cp.number ~ '^H[0-9]+$' then 'holo'
      when cp.number ~ '^[0-9]+$' then 'numeric'
      else 'invalid'
    end as lane_type,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as db_normalized_name
  from public.card_prints cp
  where cp.set_code = 'ecard3'
    and cp.gv_id is not null
)
select
  u.old_id,
  u.old_name,
  u.printed_number as old_token,
  c.new_id,
  c.new_name,
  c.number as candidate_canonical_token,
  c.gv_id
from unresolved_valid u
join canonical_valid c
  on c.lane_type = u.lane_type
 and c.drift_token = u.drift_token
 and c.db_normalized_name = u.db_normalized_name
where c.number <> u.printed_number
order by u.old_token, u.old_id, c.new_id;

-- Phase 5 and Phase 7: live gv_id collision check for promotion candidates.
-- Runner passes the proposed gv_id list as $1::text[].
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.gv_id = any($1::text[])
order by cp.gv_id, cp.id;

-- Phase 8: FK readiness snapshot for an arbitrary audited subset.
-- Runner passes the audited old parent ids as $1::uuid[].
with selected_ids as (
  select unnest($1::uuid[]) as card_print_id
)
select *
from (
  select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
    count(*)::int as row_count
  from public.card_print_identity
  where card_print_id in (select card_print_id from selected_ids)
  union all
  select 'card_print_traits', 'card_print_id', count(*)::int
  from public.card_print_traits
  where card_print_id in (select card_print_id from selected_ids)
  union all
  select 'card_printings', 'card_print_id', count(*)::int
  from public.card_printings
  where card_print_id in (select card_print_id from selected_ids)
  union all
  select 'external_mappings', 'card_print_id', count(*)::int
  from public.external_mappings
  where card_print_id in (select card_print_id from selected_ids)
  union all
  select 'vault_items', 'card_id', count(*)::int
  from public.vault_items
  where card_id in (select card_print_id from selected_ids)
) readiness
order by table_name, column_name;
