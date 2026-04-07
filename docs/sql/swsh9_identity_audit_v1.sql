-- SWSH9_IDENTITY_AUDIT_V1
-- Read-only proof queries for the remaining null-gv_id swsh9 identity surface.

-- 1. Target unresolved surface counts
with unresolved as (
  select cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
)
select
  count(*)::int as total_unresolved,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
  count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
from unresolved;

-- 2. Numeric-lane exact overlap against canonical swsh9
with unresolved as (
  select
    cp.id as card_print_id,
    cpi.printed_number,
    cpi.normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
    and cpi.printed_number ~ '^[0-9]+$'
),
canonical as (
  select
    cp.id as canonical_card_print_id,
    cp.number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9'
    and cp.gv_id is not null
),
exact_map as (
  select
    u.card_print_id,
    count(c.canonical_card_print_id)::int as canonical_match_count,
    count(c.canonical_card_print_id) filter (
      where c.normalized_name = u.normalized_printed_name
    )::int as same_name_same_number_count
  from unresolved u
  left join canonical c
    on c.number = u.printed_number
  group by u.card_print_id
)
select
  count(*) filter (where canonical_match_count > 0)::int as numeric_with_canonical_match_count,
  count(*) filter (where canonical_match_count = 0)::int as numeric_without_canonical_match_count,
  count(*) filter (where same_name_same_number_count > 0)::int as numeric_same_name_same_number_overlap_count
from exact_map;

-- 3. Supporting proof: normalized-digit numeric duplicate evidence against canonical swsh9
with unresolved as (
  select
    cp.id as card_print_id,
    cp.name as unresolved_name,
    cpi.printed_number,
    cpi.normalized_printed_name,
    coalesce(nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''), '0') as normalized_digits
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
    and cpi.printed_number ~ '^[0-9]+$'
),
canonical as (
  select
    cp.id as canonical_card_print_id,
    coalesce(nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''), '0') as normalized_digits,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9'
    and cp.gv_id is not null
)
select
  count(*) filter (where normalized_digit_match_count = 1 and normalized_digit_same_name_count = 1)::int as numeric_duplicate_collapse_ready_count,
  count(*) filter (where normalized_digit_match_count > 1)::int as numeric_normalized_digit_multiple_match_count
from (
  select
    u.card_print_id,
    count(c.canonical_card_print_id)::int as normalized_digit_match_count,
    count(c.canonical_card_print_id) filter (
      where c.normalized_name = u.normalized_printed_name
    )::int as normalized_digit_same_name_count
  from unresolved u
  left join canonical c
    on c.normalized_digits = u.normalized_digits
  group by u.card_print_id, u.normalized_printed_name
) mapped;

-- 4. Non-numeric / TG-lane exact overlap against canonical swsh9
with unresolved as (
  select
    cp.id as card_print_id,
    cpi.printed_number,
    cpi.normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
    and cpi.printed_number !~ '^[0-9]+$'
),
canonical as (
  select
    cp.id as canonical_card_print_id,
    cp.number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9'
    and cp.gv_id is not null
),
exact_map as (
  select
    u.card_print_id,
    count(c.canonical_card_print_id)::int as canonical_match_count,
    count(c.canonical_card_print_id) filter (
      where c.normalized_name = u.normalized_printed_name
    )::int as same_name_same_number_count
  from unresolved u
  left join canonical c
    on c.number = u.printed_number
  group by u.card_print_id
)
select
  count(*) filter (where canonical_match_count > 0)::int as tg_with_swsh9_canonical_match_count,
  count(*) filter (where canonical_match_count = 0)::int as tg_without_swsh9_canonical_match_count,
  count(*) filter (where same_name_same_number_count > 0)::int as tg_same_name_same_number_overlap_count
from exact_map;

-- 5. TG-family overlap against canonical swsh9tg
with tg_unresolved as (
  select
    cp.id as card_print_id,
    cpi.printed_number,
    cpi.normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
    and cpi.printed_number !~ '^[0-9]+$'
),
canonical_tg as (
  select
    cp.id as canonical_card_print_id,
    cp.number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9tg'
    and cp.gv_id is not null
)
select
  count(*) filter (where canonical_match_count > 0)::int as tg_with_swsh9tg_canonical_match_count,
  count(*) filter (where canonical_match_count = 0)::int as tg_without_swsh9tg_canonical_match_count,
  count(*) filter (where strict_same_name_same_number_count > 0)::int as tg_with_swsh9tg_strict_same_name_same_number_overlap_count,
  count(*) filter (where canonical_match_count > 1)::int as tg_with_swsh9tg_multiple_match_count
from (
  select
    u.card_print_id,
    count(c.canonical_card_print_id)::int as canonical_match_count,
    count(c.canonical_card_print_id) filter (
      where c.normalized_name = u.normalized_printed_name
    )::int as strict_same_name_same_number_count
  from tg_unresolved u
  left join canonical_tg c
    on c.number = u.printed_number
  group by u.card_print_id, u.normalized_printed_name
) mapped;

-- 6. Canonical snapshots
select
  count(*)::int as canonical_swsh9_total_rows,
  count(*) filter (where cp.number ~ '^[0-9]+$')::int as canonical_swsh9_numeric_rows,
  count(*) filter (where cp.number !~ '^[0-9]+$')::int as canonical_swsh9_non_numeric_rows
from public.card_prints cp
where cp.set_code = 'swsh9'
  and cp.gv_id is not null;

select
  count(*)::int as canonical_swsh9tg_total_rows
from public.card_prints cp
where cp.set_code = 'swsh9tg'
  and cp.gv_id is not null;

-- 7. Canonical sample rows
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'swsh9'
  and cp.gv_id is not null
  and cp.number ~ '^[0-9]+$'
order by
  coalesce(nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''), '0')::int,
  cp.number,
  cp.id
limit 25;

select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'swsh9'
  and cp.gv_id is not null
  and cp.number !~ '^[0-9]+$'
order by cp.number, cp.id
limit 25;

select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'swsh9tg'
  and cp.gv_id is not null
order by cp.number, cp.id
limit 25;

-- 8. Strict same-name audits
with unresolved as (
  select
    cp.id as card_print_id,
    cp.name as unresolved_name,
    cpi.printed_number,
    cpi.normalized_printed_name,
    case when cpi.printed_number ~ '^[0-9]+$' then 'numeric' else 'non_numeric' end as lane
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as canonical_card_print_id,
    cp.number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9'
    and cp.gv_id is not null
),
exact_map as (
  select
    u.lane,
    u.card_print_id,
    u.unresolved_name,
    u.printed_number,
    count(c.canonical_card_print_id)::int as canonical_match_count,
    count(c.canonical_card_print_id) filter (
      where c.normalized_name = u.normalized_printed_name
    )::int as strict_same_name_same_number_count,
    count(c.canonical_card_print_id) filter (
      where c.normalized_name <> u.normalized_printed_name
    )::int as canonical_match_different_name_count
  from unresolved u
  left join canonical c
    on c.number = u.printed_number
  group by u.lane, u.card_print_id, u.unresolved_name, u.printed_number, u.normalized_printed_name
)
select
  count(*) filter (where lane = 'numeric' and strict_same_name_same_number_count > 0)::int as strict_numeric_overlap_count,
  count(*) filter (where canonical_match_count > 1)::int as multiple_canonical_match_row_count,
  count(*) filter (where canonical_match_count = 0)::int as zero_canonical_match_row_count,
  count(*) filter (
    where canonical_match_count > 0
      and strict_same_name_same_number_count = 0
      and canonical_match_different_name_count > 0
  )::int as canonical_match_but_different_name_row_count
from exact_map;

with unresolved as (
  select
    cp.id as card_print_id,
    cp.name as unresolved_name,
    cpi.printed_number,
    cpi.normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
    and cpi.printed_number !~ '^[0-9]+$'
),
canonical_tg as (
  select
    cp.id as canonical_card_print_id,
    cp.number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9tg'
    and cp.gv_id is not null
),
family_map as (
  select
    u.card_print_id,
    u.unresolved_name,
    u.printed_number,
    count(c.canonical_card_print_id)::int as canonical_match_count,
    count(c.canonical_card_print_id) filter (
      where c.normalized_name = u.normalized_printed_name
    )::int as strict_same_name_same_number_count,
    count(c.canonical_card_print_id) filter (
      where c.normalized_name <> u.normalized_printed_name
    )::int as canonical_match_different_name_count
  from unresolved u
  left join canonical_tg c
    on c.number = u.printed_number
  group by u.card_print_id, u.unresolved_name, u.printed_number, u.normalized_printed_name
)
select
  count(*) filter (where strict_same_name_same_number_count > 0)::int as strict_tg_family_overlap_count,
  count(*) filter (where canonical_match_count > 1)::int as family_multiple_canonical_match_row_count,
  count(*) filter (where canonical_match_count = 0)::int as family_zero_canonical_match_row_count,
  count(*) filter (
    where canonical_match_count > 0
      and strict_same_name_same_number_count = 0
      and canonical_match_different_name_count > 0
  )::int as family_canonical_match_but_different_name_row_count
from family_map;
