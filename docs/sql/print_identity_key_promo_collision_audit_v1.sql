begin;

-- PRINT_IDENTITY_KEY_PROMO_COLLISION_CONTRACT_AUDIT_V1
-- Audit only. No mutation.
--
-- Blocking computed key:
--   svp:085:pikachu-with-grey-felt-hat
--
-- This audit reconstructs the full same-identity cluster behind the collision.

with target_cluster as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.set_code,
    s.name as set_name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
    cp.gv_id,
    cp.print_identity_key,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(trim(cp.name), '[’''"]', '', 'g'),
            '[^a-zA-Z0-9]+',
            '-',
            'g'
          ),
          '-+',
          '-',
          'g'
        ),
        '(^-|-$)',
        '',
        'g'
      )
    ) as normalized_name_token
  from public.card_prints cp
  left join public.sets s on s.id = cp.set_id
  where cp.set_code = 'svp'
    and lower(cp.name) = lower('Pikachu with Grey Felt Hat')
),
mapping_rollup as (
  select
    tc.card_print_id,
    jsonb_agg(
      jsonb_build_object(
        'source', em.source,
        'external_id', em.external_id,
        'active', em.active,
        'justtcg_number', em.meta->>'justtcg_number',
        'set_alignment_status', em.meta->>'set_alignment_status',
        'resolved_via', em.meta->>'resolved_via'
      )
      order by em.source, em.external_id
    ) filter (where em.id is not null) as external_mappings,
    max(
      case
        when em.source = 'tcgdex' and em.active = true then coalesce(nullif(ri.payload->>'localId', ''), nullif(ri.payload->>'number', ''))
        else null
      end
    ) as tcgdex_promo_number,
    max(
      case
        when em.source = 'justtcg' and em.active = true then coalesce(em.meta->>'justtcg_number', ri.payload->>'number')
        else null
      end
    ) as justtcg_promo_number
  from target_cluster tc
  left join public.external_mappings em
    on em.card_print_id = tc.card_print_id
  left join public.raw_imports ri
    on ri.source = em.source
   and ri.payload->>'_external_id' = em.external_id
  group by tc.card_print_id
),
promo_surface as (
  select
    tc.*,
    mr.external_mappings,
    mr.tcgdex_promo_number,
    mr.justtcg_promo_number,
    coalesce(
      nullif(mr.tcgdex_promo_number, ''),
      nullif(mr.justtcg_promo_number, ''),
      nullif(tc.number, ''),
      nullif(tc.number_plain, '')
    ) as observed_promo_number,
    nullif(
      regexp_replace(
        coalesce(
          nullif(mr.tcgdex_promo_number, ''),
          nullif(mr.justtcg_promo_number, ''),
          nullif(tc.number, ''),
          nullif(tc.number_plain, '')
        ),
        '\D',
        '',
        'g'
      ),
      ''
    ) as promo_number_digits
  from target_cluster tc
  left join mapping_rollup mr
    on mr.card_print_id = tc.card_print_id
),
fk_inventory as (
  select
    ps.card_print_id,
    (select count(*) from public.card_print_identity cpi where cpi.card_print_id = ps.card_print_id and cpi.is_active = true) as active_identity_count,
    (select count(*) from public.card_print_traits cpt where cpt.card_print_id = ps.card_print_id) as trait_count,
    (select count(*) from public.card_printings cpp where cpp.card_print_id = ps.card_print_id) as printing_count,
    (select count(*) from public.external_mappings em where em.card_print_id = ps.card_print_id and em.active = true) as active_external_mapping_count,
    (select count(*) from public.vault_items vi where vi.card_id = ps.card_print_id) as vault_item_count
  from promo_surface ps
),
equivalence_test as (
  select
    count(*) as cluster_row_count,
    count(distinct set_code) as distinct_set_code_count,
    count(distinct normalized_name_token) as distinct_name_token_count,
    count(distinct coalesce(variant_key, '')) as distinct_variant_count,
    count(distinct coalesce(printed_identity_modifier, '')) as distinct_modifier_count,
    count(distinct ltrim(coalesce(promo_number_digits, ''), '0')) as distinct_promo_number_count,
    bool_and(coalesce(variant_key, '') = '') as all_variant_keys_blank,
    bool_and(coalesce(printed_identity_modifier, '') = '') as all_modifiers_blank
  from promo_surface
)

select
  ps.card_print_id,
  ps.name,
  ps.set_code,
  ps.set_name,
  ps.number,
  ps.number_plain,
  ps.variant_key,
  ps.printed_identity_modifier,
  ps.gv_id,
  ps.print_identity_key,
  ps.normalized_name_token,
  ps.tcgdex_promo_number,
  ps.justtcg_promo_number,
  ps.observed_promo_number,
  ps.promo_number_digits,
  ltrim(coalesce(ps.promo_number_digits, ''), '0') as normalized_promo_number_equivalence,
  fi.active_identity_count,
  fi.trait_count,
  fi.printing_count,
  fi.active_external_mapping_count,
  fi.vault_item_count,
  ps.external_mappings
from promo_surface ps
join fk_inventory fi
  on fi.card_print_id = ps.card_print_id
order by
  case when ps.print_identity_key is not null then 0 else 1 end,
  ps.card_print_id;

with target_cluster as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.set_code,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(trim(cp.name), '[’''"]', '', 'g'),
            '[^a-zA-Z0-9]+',
            '-',
            'g'
          ),
          '-+',
          '-',
          'g'
        ),
        '(^-|-$)',
        '',
        'g'
      )
    ) as normalized_name_token
  from public.card_prints cp
  where cp.set_code = 'svp'
    and lower(cp.name) = lower('Pikachu with Grey Felt Hat')
),
mapping_rollup as (
  select
    tc.card_print_id,
    max(
      case
        when em.source = 'tcgdex' and em.active = true then coalesce(nullif(ri.payload->>'localId', ''), nullif(ri.payload->>'number', ''))
        else null
      end
    ) as tcgdex_promo_number,
    max(
      case
        when em.source = 'justtcg' and em.active = true then coalesce(em.meta->>'justtcg_number', ri.payload->>'number')
        else null
      end
    ) as justtcg_promo_number
  from target_cluster tc
  left join public.external_mappings em
    on em.card_print_id = tc.card_print_id
  left join public.raw_imports ri
    on ri.source = em.source
   and ri.payload->>'_external_id' = em.external_id
  group by tc.card_print_id
),
promo_surface as (
  select
    tc.*,
    mr.tcgdex_promo_number,
    mr.justtcg_promo_number,
    nullif(
      regexp_replace(
        coalesce(
          nullif(mr.tcgdex_promo_number, ''),
          nullif(mr.justtcg_promo_number, ''),
          nullif(tc.number, ''),
          nullif(tc.number_plain, '')
        ),
        '\D',
        '',
        'g'
      ),
      ''
    ) as promo_number_digits
  from target_cluster tc
  left join mapping_rollup mr
    on mr.card_print_id = tc.card_print_id
),
equivalence_test as (
  select
    count(*) as cluster_row_count,
    count(distinct set_code) as distinct_set_code_count,
    count(distinct normalized_name_token) as distinct_name_token_count,
    count(distinct coalesce(variant_key, '')) as distinct_variant_count,
    count(distinct coalesce(printed_identity_modifier, '')) as distinct_modifier_count,
    count(distinct ltrim(coalesce(promo_number_digits, ''), '0')) as distinct_promo_number_count,
    bool_and(coalesce(variant_key, '') = '') as all_variant_keys_blank,
    bool_and(coalesce(printed_identity_modifier, '') = '') as all_modifiers_blank
  from promo_surface
)
select
  et.cluster_row_count,
  et.distinct_set_code_count,
  et.distinct_name_token_count,
  et.distinct_variant_count,
  et.distinct_modifier_count,
  et.distinct_promo_number_count,
  et.all_variant_keys_blank,
  et.all_modifiers_blank,
  case
    when et.cluster_row_count = 3
      and et.distinct_set_code_count = 1
      and et.distinct_name_token_count = 1
      and et.distinct_variant_count = 1
      and et.distinct_modifier_count = 1
      and et.distinct_promo_number_count = 1
    then 'SAME_PRINTED_CARD'
    else 'NOT_DETERMINISTIC'
  end as identity_equivalence_result,
  case
    when et.cluster_row_count = 3
      and et.distinct_set_code_count = 1
      and et.distinct_name_token_count = 1
      and et.distinct_variant_count = 1
      and et.distinct_modifier_count = 1
      and et.distinct_promo_number_count = 1
    then 'PROMO_IDENTITY_DUPLICATE'
    else 'OTHER'
  end as classification,
  case
    when et.cluster_row_count = 3
      and et.distinct_set_code_count = 1
      and et.distinct_name_token_count = 1
      and et.distinct_variant_count = 1
      and et.distinct_modifier_count = 1
      and et.distinct_promo_number_count = 1
    then 'REUSE_CANONICAL'
    else 'UNRESOLVED'
  end as safe_resolution_type,
  'no' as can_proceed_with_backfill,
  'PRINT_IDENTITY_KEY_PROMO_COLLISION_REUSE_REALIGNMENT_V1' as next_execution_unit,
  'passed' as audit_status
from equivalence_test et;

rollback;
