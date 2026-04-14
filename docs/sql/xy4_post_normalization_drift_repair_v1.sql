-- XY4_POST_NORMALIZATION_DRIFT_REPAIR_V1
-- Read-only audit for the single residual canonical normalization drift row in xy4.
-- Live target row:
--   f0a82330-0795-40cf-9994-0b77c9494ba8 / M Manectric EX / 24a / GV-PK-PHF-24A
-- Live identity key:
--   number_plain = 24
--   variant_key = a

begin;

with target_row as (
  select
    cp.id,
    cp.name as current_name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    cp.gv_id,
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            replace(
              replace(
                replace(
                  replace(cp.name, chr(8216), ''''),
                  chr(8217),
                  ''''
                ),
                chr(96),
                ''''
              ),
              chr(180),
              ''''
            ),
            '[' || chr(8212) || chr(8211) || ']',
            ' ',
            'g'
          ),
          '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+GX$',
          E'\\1-GX',
          'i'
        ),
        '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+EX$',
        E'\\1-EX',
        'i'
      )
    ) as normalized_name
  from public.card_prints cp
  where cp.id = 'f0a82330-0795-40cf-9994-0b77c9494ba8'
    and cp.set_code = 'xy4'
    and cp.gv_id = 'GV-PK-PHF-24A'
),
drift_surface as (
  select
    cp.id,
    cp.name,
    cp.gv_id
  from public.card_prints cp
  where cp.set_code = 'xy4'
    and cp.gv_id is not null
    and (
      cp.name like '%' || chr(8217) || '%'
      or cp.name like '% GX%'
      or cp.name like '% EX%'
      or cp.name like '%' || chr(8212) || '%'
      or cp.name like '%' || chr(8211) || '%'
    )
),
identity_key_conflicts as (
  select
    cp.id,
    cp.name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    cp.gv_id
  from public.card_prints cp
  join target_row t
    on cp.set_code = 'xy4'
   and cp.gv_id is not null
   and cp.number_plain = t.number_plain
   and coalesce(cp.variant_key, '') = t.variant_key
   and cp.name = t.normalized_name
   and cp.id <> t.id
)
select
  (select count(*)::int from drift_surface) as drift_row_count,
  (select count(*)::int from target_row) as target_row_count,
  (select count(*)::int from identity_key_conflicts) as identity_key_conflict_count;

select
  t.id,
  t.current_name,
  t.normalized_name,
  t.number,
  t.number_plain,
  t.variant_key,
  t.gv_id,
  0::int as conflicting_rows_on_identity_key,
  t.gv_id as gv_id_after_repair
from target_row t;

rollback;
