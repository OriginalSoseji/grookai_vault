-- XY6_POST_NORMALIZATION_DRIFT_REPAIR_V2
-- Read-only audit for canonical xy6 rows that violate full NAME_NORMALIZE_V3 display punctuation rules.
-- This audit is case-preserving for stored names while enforcing:
--   - unicode apostrophes -> ASCII apostrophe
--   - em/en dashes -> space
--   - terminal EX/GX suffix punctuation -> -EX / -GX
--   - whitespace collapse
--   - trim

begin;

with canonical_rows as (
  select
    cp.id,
    cp.name as current_name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    cp.gv_id
  from public.card_prints cp
  where cp.set_code = 'xy6'
    and cp.gv_id is not null
),
apostrophe_normalized as (
  select
    c.*,
    replace(
      replace(
        replace(
          replace(c.current_name, chr(8216), ''''),
          chr(8217),
          ''''
        ),
        chr(96),
        ''''
      ),
      chr(180),
      ''''
    ) as name_after_apostrophes
  from canonical_rows c
),
dash_normalized as (
  select
    a.*,
    replace(
      replace(a.name_after_apostrophes, chr(8212), ' '),
      chr(8211),
      ' '
    ) as name_after_dashes
  from apostrophe_normalized a
),
suffix_normalized as (
  select
    d.*,
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(d.name_after_dashes, '\s+', ' ', 'g'),
          '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+GX$',
          E'\\1-GX',
          'i'
        ),
        '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+EX$',
        E'\\1-EX',
        'i'
      )
    ) as normalized_name
  from dash_normalized d
),
comparison_keys as (
  select
    s.*,
    lower(
      btrim(
        regexp_replace(
          regexp_replace(
            regexp_replace(s.current_name, '[' || chr(8216) || chr(8217) || '`´]', '''', 'g'),
            '[' || chr(8212) || chr(8211) || ']',
            ' ',
            'g'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as current_v3_key,
    lower(
      btrim(
        regexp_replace(
          regexp_replace(
            regexp_replace(s.normalized_name, '-GX$', ' GX', 'i'),
            '-EX$',
            ' EX',
            'i'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as normalized_v3_key
  from suffix_normalized s
),
drift_rows as (
  select
    id,
    current_name,
    normalized_name,
    number,
    number_plain,
    variant_key,
    gv_id
  from comparison_keys
  where current_name is distinct from normalized_name
),
post_apply_surface as (
  select
    id,
    number_plain,
    variant_key,
    coalesce(
      (select d.normalized_name from drift_rows d where d.id = c.id),
      c.current_name
    ) as final_name
  from comparison_keys c
),
collisions as (
  select
    number_plain,
    variant_key,
    final_name,
    count(*)::int as rows_per_identity_name
  from post_apply_surface
  group by number_plain, variant_key, final_name
  having count(*) > 1
)
select
  (select count(*)::int from drift_rows) as drift_rows_detected,
  (select count(*)::int from collisions) as collision_count_if_applied,
  (select count(*)::int from comparison_keys where current_v3_key is distinct from normalized_v3_key) as semantic_key_drift_count;

select
  id,
  current_name,
  normalized_name
from drift_rows
order by number_plain, variant_key, id;

select
  number_plain,
  variant_key,
  final_name,
  rows_per_identity_name
from collisions
order by number_plain, variant_key, final_name;

rollback;
