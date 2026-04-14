-- PRINT_IDENTITY_KEY_LEGACY_SYMBOL_LOCAL_ID_BACKFILL_APPLY_V1
-- Dry-run for the final 26 blocked rows.
-- Live correction:
--   - rows are legacy exact-token localId cases in col1 / ecard3
--   - lawful derivation preserves tcgdex localId inside print_identity_key
--   - only print_identity_key is in scope for apply

begin;

create temp view pik_legacy_symbol_backfill_base_v1 as
select
  cp.id as card_print_id,
  cp.set_id,
  coalesce(cp.set_code, s.code) as effective_set_code,
  cp.name,
  coalesce(ri.payload->'card'->>'name', ri.payload->>'name', cp.name) as original_name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key,
  cp.gv_id,
  em.external_id as tcgdex_external_id,
  coalesce(
    nullif(ri.payload->'card'->>'localId', ''),
    nullif(split_part(lower(em.external_id), '-', 2), '')
  ) as tcgdex_local_id
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
left join public.external_mappings em
  on em.card_print_id = cp.id
 and em.source = 'tcgdex'
 and em.active is true
left join public.raw_imports ri
  on ri.source = 'tcgdex'
 and coalesce(
      ri.payload->>'_external_id',
      ri.payload->>'id',
      ri.payload->'card'->>'id',
      ri.payload->'card'->>'_id'
    ) = em.external_id
where cp.gv_id is not null
  and cp.print_identity_key is null
  and (
    cp.set_code is null
    or btrim(cp.set_code) = ''
    or cp.number_plain is null
    or btrim(cp.number_plain) = ''
    or cp.name is null
    or btrim(cp.name) = ''
    or (
      coalesce(cp.variant_key, '') <> ''
      and cp.variant_key !~ '^[A-Za-z0-9_]+$'
    )
    or (
      coalesce(cp.printed_identity_modifier, '') <> ''
      and cp.printed_identity_modifier !~ '^[a-z0-9_]+$'
    )
  );

create temp view pik_legacy_symbol_backfill_target_v1 as
select
  b.*,
  upper(regexp_replace(coalesce(b.tcgdex_local_id, ''), '\s+', '', 'g')) as normalized_local_id_token,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(b.name, ''), '’', '''', 'g'),
                    'δ',
                    ' delta ',
                    'gi'
                  ),
                  '[★*]',
                  ' star ',
                  'g'
                ),
                '\s+EX\b',
                '-ex',
                'gi'
              ),
              '\s+GX\b',
              '-gx',
              'gi'
            ),
            '[^a-zA-Z0-9]+',
            '-',
            'g'
          ),
          '-+',
          '-',
          'g'
        )
      ),
      '(^-|-$)',
      '',
      'g'
    )
  ) as normalized_name_token,
  upper(array_to_string((string_to_array(coalesce(b.gv_id, ''), '-'))[4:array_length(string_to_array(coalesce(b.gv_id, ''), '-'), 1)], '-')) as gv_id_identity_token,
  lower(
    concat_ws(
      ':',
      b.effective_set_code,
      upper(regexp_replace(coalesce(b.tcgdex_local_id, ''), '\s+', '', 'g')),
      lower(
        regexp_replace(
          trim(
            both '-' from regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(coalesce(b.name, ''), '’', '''', 'g'),
                        'δ',
                        ' delta ',
                        'gi'
                      ),
                      '[★*]',
                      ' star ',
                      'g'
                    ),
                    '\s+EX\b',
                    '-ex',
                    'gi'
                  ),
                  '\s+GX\b',
                  '-gx',
                  'gi'
                ),
                '[^a-zA-Z0-9]+',
                '-',
                'g'
              ),
              '-+',
              '-',
              'g'
            )
          ),
          '(^-|-$)',
          '',
          'g'
        )
      )
    )
  ) as computed_print_identity_key
from pik_legacy_symbol_backfill_base_v1 b
where b.effective_set_code in ('col1', 'ecard3')
  and b.number is null
  and b.number_plain is null
  and coalesce(b.variant_key, '') = ''
  and coalesce(b.printed_identity_modifier, '') = ''
  and b.tcgdex_local_id is not null;

create temp view pik_legacy_symbol_backfill_validated_v1 as
select
  t.*,
  case
    when t.normalized_local_id_token = '' then 'BLOCKED_MISSING_LOCAL_ID'
    when t.gv_id_identity_token is distinct from t.normalized_local_id_token then 'BLOCKED_GVID_LOCALID_MISMATCH'
    when t.computed_print_identity_key is null then 'BLOCKED_MISSING_COMPUTED_KEY'
    else 'SAFE_LEGACY_LOCALID_BACKFILL'
  end as validation_status
from pik_legacy_symbol_backfill_target_v1 t;

create temp view pik_legacy_symbol_backfill_internal_collisions_v1 as
select
  computed_print_identity_key,
  count(*)::int as rows_per_key
from pik_legacy_symbol_backfill_validated_v1
group by computed_print_identity_key
having count(*) > 1;

create temp view pik_legacy_symbol_backfill_external_collisions_v1 as
select distinct
  t.card_print_id,
  t.computed_print_identity_key,
  cp2.id as conflicting_card_print_id
from pik_legacy_symbol_backfill_validated_v1 t
join public.card_prints cp2
  on cp2.id <> t.card_print_id
 and cp2.print_identity_key = t.computed_print_identity_key;

-- Dry-run target surface.
select
  card_print_id,
  name,
  effective_set_code as set_code,
  number_plain,
  variant_key,
  original_name,
  normalized_name_token,
  normalized_local_id_token as effective_number_plain,
  computed_print_identity_key,
  validation_status
from pik_legacy_symbol_backfill_validated_v1
order by effective_set_code, normalized_local_id_token, normalized_name_token, card_print_id;

-- Summary proof.
select
  count(*)::int as target_row_count,
  (select count(*)::int from pik_legacy_symbol_backfill_internal_collisions_v1)
    + (select count(*)::int from pik_legacy_symbol_backfill_external_collisions_v1) as collision_count,
  count(*) filter (where validation_status <> 'SAFE_LEGACY_LOCALID_BACKFILL')::int as ambiguity_count
from pik_legacy_symbol_backfill_validated_v1;

rollback;
