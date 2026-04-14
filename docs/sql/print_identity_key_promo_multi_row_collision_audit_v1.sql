begin;

-- PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_COLLISION_CONTRACT_AUDIT_V1
-- Audit only. No mutation.

create temp table tmp_print_identity_key_promo_multi_collision_family on commit drop as
with source_rollup as (
  select
    cp.id as card_print_id,
    max(
      case
        when em.source = 'tcgdex' and em.active is true
          then coalesce(
            ri.payload->>'localId',
            ri.payload->'card'->>'localId',
            ri.payload->>'number',
            ri.payload->'card'->>'number'
          )
        else null
      end
    ) as tcgdex_local_id,
    max(
      case
        when em.source = 'justtcg' and em.active is true
          then coalesce(em.meta->>'justtcg_number', ri.payload->>'number')
        else null
      end
    ) as justtcg_number,
    array_remove(array_agg(distinct case when em.active is true then em.source else null end), null) as active_sources
  from public.card_prints cp
  left join public.external_mappings em
    on em.card_print_id = cp.id
  left join public.raw_imports ri
    on ri.source = em.source
   and coalesce(
        ri.payload->>'_external_id',
        ri.payload->>'id',
        ri.payload->'card'->>'id',
        ri.payload->'card'->>'_id'
      ) = em.external_id
  where cp.id in (
    '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid,
    '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid,
    'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4'::uuid
  )
  group by cp.id
),
identity_rollup as (
  select
    cpi.card_print_id,
    count(*) filter (where cpi.is_active is true)::int as active_identity_rows,
    max(cpi.set_code_identity) filter (where cpi.is_active is true) as set_code_identity,
    max(cpi.printed_number) filter (where cpi.is_active is true) as printed_number_identity,
    max(cpi.normalized_printed_name) filter (where cpi.is_active is true) as normalized_printed_name_identity
  from public.card_print_identity cpi
  where cpi.card_print_id in (
    '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid,
    '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid,
    'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4'::uuid
  )
  group by cpi.card_print_id
)
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.name,
  cp.set_code,
  s.code as joined_set_code,
  cp.number,
  cp.number_plain,
  cp.print_identity_key,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  coalesce(nullif(cp.set_code, ''), s.code) as effective_set_code,
  lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(coalesce(cp.name, ''), '[’''`´]', '''', 'g'),
              'δ',
              ' delta ',
              'g'
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
    )
  ) as normalized_name_token,
  sr.tcgdex_local_id,
  sr.justtcg_number,
  coalesce(
    nullif(sr.tcgdex_local_id, ''),
    nullif(sr.justtcg_number, ''),
    nullif(cp.number_plain, ''),
    nullif(cp.number, '')
  ) as observed_promo_number,
  regexp_replace(
    coalesce(
      nullif(sr.tcgdex_local_id, ''),
      nullif(sr.justtcg_number, ''),
      nullif(cp.number_plain, ''),
      nullif(cp.number, '')
    ),
    '^0+(?!$)',
    ''
  ) as normalized_promo_number,
  sr.active_sources,
  coalesce(ir.active_identity_rows, 0) as active_identity_rows,
  ir.set_code_identity,
  ir.printed_number_identity,
  ir.normalized_printed_name_identity,
  (select count(*)::int from public.card_printings cpp where cpp.card_print_id = cp.id) as printing_rows,
  (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id and em.active is true) as active_external_rows,
  (select count(*)::int from public.vault_items vi where vi.card_id = cp.id and vi.archived_at is null) as active_vault_rows
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
left join source_rollup sr
  on sr.card_print_id = cp.id
left join identity_rollup ir
  on ir.card_print_id = cp.id
where cp.id in (
  '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid,
  '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid,
  'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4'::uuid
);

-- PHASE 1 — full row audit
select
  card_print_id,
  gv_id,
  name,
  set_code,
  number,
  number_plain,
  print_identity_key
from tmp_print_identity_key_promo_multi_collision_family
order by card_print_id;

-- PHASE 2 — normalization alignment
select
  count(*)::int as conflict_group_size,
  count(distinct effective_set_code)::int as distinct_effective_set_code_count,
  count(distinct normalized_name_token)::int as distinct_normalized_name_count,
  count(distinct normalized_promo_number)::int as distinct_normalized_promo_number_count,
  count(distinct variant_key)::int as distinct_variant_count,
  count(distinct printed_identity_modifier)::int as distinct_modifier_count,
  bool_and(effective_set_code = 'svp') as same_effective_set_code,
  bool_and(normalized_name_token = 'pikachu-with-grey-felt-hat') as same_normalized_name,
  bool_and(normalized_promo_number = '85') as same_normalized_promo_number
from tmp_print_identity_key_promo_multi_collision_family;

-- PHASE 3/4/5/6 — canonical, shadow, malformed classification
with classified as (
  select
    f.*,
    case
      when f.active_identity_rows = 1
        and f.effective_set_code = 'svp'
        and f.normalized_promo_number = '85'
        and f.set_code_identity = 'svp'
        and f.printed_number_identity = '085'
        and f.gv_id like 'GV-PK-PR-SV-%'
        then 'TRUE_CANONICAL'
      when f.gv_id like 'GV-PK-SVP-%'
        or (f.print_identity_key is not null and f.active_identity_rows = 0)
        then 'MALFORMED_ROW'
      else 'SHADOW_ROW'
    end as row_classification
  from tmp_print_identity_key_promo_multi_collision_family f
)
select
  card_print_id,
  gv_id,
  effective_set_code,
  number,
  number_plain,
  observed_promo_number,
  normalized_promo_number,
  active_identity_rows,
  set_code_identity,
  printed_number_identity,
  print_identity_key,
  active_sources,
  row_classification
from classified
order by
  case row_classification
    when 'TRUE_CANONICAL' then 0
    when 'SHADOW_ROW' then 1
    else 2
  end,
  card_print_id;

-- Namespace proof: dominant svp lane is GV-PK-PR-SV-*, GV-PK-SVP-* is a one-row outlier
select
  count(*) filter (where gv_id like 'GV-PK-PR-SV-%')::int as dominant_pr_sv_namespace_count,
  count(*) filter (where gv_id like 'GV-PK-SVP-%')::int as legacy_svp_namespace_count,
  count(*) filter (where set_code is null or btrim(set_code) = '')::int as set_code_mirror_missing_count,
  count(*) filter (where print_identity_key is not null)::int as non_null_print_identity_key_count
from public.card_prints
where set_id = (
  select set_id
  from public.card_prints
  where id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid
);

-- PHASE 7/8/9 — final contract output
with classified as (
  select
    f.card_print_id,
    case
      when f.active_identity_rows = 1
        and f.effective_set_code = 'svp'
        and f.normalized_promo_number = '85'
        and f.set_code_identity = 'svp'
        and f.printed_number_identity = '085'
        and f.gv_id like 'GV-PK-PR-SV-%'
        then 'TRUE_CANONICAL'
      when f.gv_id like 'GV-PK-SVP-%'
        or (f.print_identity_key is not null and f.active_identity_rows = 0)
        then 'MALFORMED_ROW'
      else 'SHADOW_ROW'
    end as row_classification
  from tmp_print_identity_key_promo_multi_collision_family f
)
select
  count(*)::int as conflict_group_size,
  jsonb_build_object(
    'TRUE_CANONICAL', count(*) filter (where row_classification = 'TRUE_CANONICAL'),
    'SHADOW_ROW', count(*) filter (where row_classification = 'SHADOW_ROW'),
    'MALFORMED_ROW', count(*) filter (where row_classification = 'MALFORMED_ROW')
  ) as classification_counts,
  min(card_print_id::text) filter (where row_classification = 'TRUE_CANONICAL')::uuid as canonical_row_id,
  array_agg(card_print_id order by card_print_id) filter (where row_classification = 'SHADOW_ROW') as shadow_row_ids,
  array_agg(card_print_id order by card_print_id) filter (where row_classification = 'MALFORMED_ROW') as malformed_row_ids,
  'PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_REUSE_REALIGNMENT_V1' as next_execution_unit,
  'passed' as audit_status
from classified;

rollback;
