-- PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_SHADOW_ROW_REUSE_REALIGNMENT_V1
-- Read-only dry-run proof for collapsing the 693 numberless modern main-set
-- shadow rows into their lawful numbered canonical counterparts.
--
-- Scope:
--   - shadow rows only
--   - no mutation
--   - proves exact one-to-one reuse mapping and FK readiness

begin;

create temp table tmp_pik_shadow_family_v1 on commit drop as
select
  cp.id as shadow_card_print_id,
  cp.gv_id as shadow_gv_id,
  cp.set_id,
  s.code as shadow_set_code,
  cp.name as shadow_name,
  coalesce(cp.variant_key, '') as shadow_variant_key,
  em.external_id as tcgdex_external_id,
  ri.payload->'card'->>'localId' as tcgdex_number,
  regexp_replace(ri.payload->'card'->>'localId', '^0+(?!$)', '') as recovered_number_plain,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(cp.name, ''), '’', '''', 'g'),
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
  ) as shadow_normalized_name
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
join public.external_mappings em
  on em.card_print_id = cp.id
 and em.source = 'tcgdex'
 and em.active is true
join public.raw_imports ri
  on ri.source = 'tcgdex'
 and coalesce(
      ri.payload->>'_external_id',
      ri.payload->>'id',
      ri.payload->'card'->>'id',
      ri.payload->'card'->>'_id'
    ) = em.external_id
where cp.gv_id is not null
  and cp.print_identity_key is null
  and (cp.set_code is null or btrim(cp.set_code) = '')
  and (cp.number is null or btrim(cp.number) = '')
  and (cp.number_plain is null or btrim(cp.number_plain) = '')
  and s.code in (
    'sv02',
    'sv04',
    'sv04.5',
    'sv06',
    'sv06.5',
    'sv07',
    'sv08',
    'sv09',
    'sv10',
    'swsh10.5'
  );

create temp table tmp_pik_shadow_candidates_v1 on commit drop as
select
  sf.shadow_card_print_id,
  sf.shadow_gv_id,
  sf.shadow_set_code,
  sf.shadow_name,
  sf.shadow_variant_key,
  sf.tcgdex_external_id,
  sf.tcgdex_number,
  sf.recovered_number_plain,
  cp2.id as canonical_target_id,
  cp2.gv_id as canonical_gv_id,
  cp2.name as canonical_name,
  cp2.number as canonical_number,
  cp2.number_plain as canonical_number_plain,
  coalesce(cp2.variant_key, '') as canonical_variant_key,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(cp2.name, ''), '’', '''', 'g'),
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
  ) as canonical_normalized_name
from tmp_pik_shadow_family_v1 sf
join public.card_prints cp2
  on cp2.set_id = sf.set_id
 and cp2.gv_id is not null
 and cp2.number_plain = sf.recovered_number_plain
 and coalesce(cp2.variant_key, '') = sf.shadow_variant_key
where lower(
  regexp_replace(
    trim(
      both '-' from regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(coalesce(cp2.name, ''), '’', '''', 'g'),
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
) = sf.shadow_normalized_name;

create temp table tmp_pik_shadow_per_target_v1 on commit drop as
select
  sf.shadow_card_print_id,
  sf.shadow_gv_id,
  sf.shadow_set_code,
  sf.shadow_name,
  sf.shadow_variant_key,
  sf.tcgdex_external_id,
  sf.tcgdex_number,
  sf.recovered_number_plain,
  count(c.canonical_target_id)::int as canonical_candidate_count,
  min(c.canonical_target_id::text)::uuid as canonical_target_id,
  min(c.canonical_gv_id) as canonical_gv_id
from tmp_pik_shadow_family_v1 sf
left join tmp_pik_shadow_candidates_v1 c
  on c.shadow_card_print_id = sf.shadow_card_print_id
group by
  sf.shadow_card_print_id,
  sf.shadow_gv_id,
  sf.shadow_set_code,
  sf.shadow_name,
  sf.shadow_variant_key,
  sf.tcgdex_external_id,
  sf.tcgdex_number,
  sf.recovered_number_plain;

create temp table tmp_pik_shadow_map_v1 on commit drop as
select
  shadow_card_print_id,
  shadow_gv_id,
  shadow_set_code,
  shadow_name,
  shadow_variant_key,
  tcgdex_external_id,
  tcgdex_number,
  recovered_number_plain,
  canonical_target_id,
  canonical_gv_id,
  'SAFE_REUSE'::text as mapping_status
from tmp_pik_shadow_per_target_v1
where canonical_candidate_count = 1;

-- Phase 1: per-row reuse map.
select
  shadow_card_print_id,
  shadow_name,
  shadow_set_code,
  canonical_target_id,
  canonical_gv_id,
  mapping_status
from tmp_pik_shadow_map_v1
order by
  shadow_set_code,
  nullif(regexp_replace(recovered_number_plain, '[^0-9]+', '', 'g'), '')::int nulls last,
  shadow_name,
  shadow_card_print_id;

-- Phase 1 summary proof.
select
  (select count(*)::int from tmp_pik_shadow_map_v1) as shadow_row_count,
  (
    select count(*)::int
    from tmp_pik_shadow_per_target_v1
    where canonical_candidate_count > 1
  ) as ambiguity_count,
  (
    select count(*)::int
    from tmp_pik_shadow_map_v1
    where canonical_target_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1)
  ) as collision_count,
  (select count(distinct shadow_card_print_id)::int from tmp_pik_shadow_map_v1) as distinct_shadow_count,
  (select count(distinct canonical_target_id)::int from tmp_pik_shadow_map_v1) as distinct_canonical_count,
  (
    select count(*)::int
    from tmp_pik_shadow_family_v1
  ) - (select count(*)::int from tmp_pik_shadow_map_v1) as excluded_non_shadow_modern_rows;

-- Phase 3: FK inventory for the shadow surface.
select
  (select count(*)::int from public.card_print_identity where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1)) as shadow_identity_rows,
  (select count(*)::int from public.card_print_traits where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1)) as shadow_trait_rows,
  (select count(*)::int from public.card_printings where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1)) as shadow_printing_rows,
  (select count(*)::int from public.external_mappings where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1)) as shadow_external_rows,
  (select count(*)::int from public.vault_items where card_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1)) as shadow_vault_rows,
  (
    select count(*)::int
    from public.card_print_traits old_t
    join tmp_pik_shadow_map_v1 m
      on m.shadow_card_print_id = old_t.card_print_id
    join public.card_print_traits new_t
      on new_t.card_print_id = m.canonical_target_id
     and new_t.trait_type = old_t.trait_type
     and new_t.trait_value = old_t.trait_value
     and new_t.source = old_t.source
  ) as trait_overlap_rows,
  (
    select count(*)::int
    from public.card_printings old_p
    join tmp_pik_shadow_map_v1 m
      on m.shadow_card_print_id = old_p.card_print_id
    join public.card_printings new_p
      on new_p.card_print_id = m.canonical_target_id
     and new_p.finish_key = old_p.finish_key
  ) as printing_overlap_rows,
  (
    select count(*)::int
    from public.external_mappings old_em
    join tmp_pik_shadow_map_v1 m
      on m.shadow_card_print_id = old_em.card_print_id
    join public.external_mappings new_em
      on new_em.card_print_id = m.canonical_target_id
     and new_em.source = old_em.source
     and new_em.external_id = old_em.external_id
  ) as external_overlap_rows;

-- Phase 3 safety: unsupported FK references in apply scope must be zero.
select *
from (
  select 'ai_decision_logs.card_print_id'::text as table_ref, (select count(*)::int from public.ai_decision_logs where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1)) as row_count
  union all
  select 'canon_warehouse_candidates.promoted_card_print_id', (select count(*)::int from public.canon_warehouse_candidates where promoted_card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_embeddings.card_print_id', (select count(*)::int from public.card_embeddings where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_interaction_outcomes.card_print_id', (select count(*)::int from public.card_interaction_outcomes where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_interactions.card_print_id', (select count(*)::int from public.card_interactions where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_price_observations.card_print_id', (select count(*)::int from public.card_price_observations where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_price_rollups.card_print_id', (select count(*)::int from public.card_price_rollups where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_price_ticks.card_print_id', (select count(*)::int from public.card_price_ticks where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_prices.card_print_id', (select count(*)::int from public.card_prices where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_print_file_paths.card_print_id', (select count(*)::int from public.card_print_file_paths where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_print_price_curves.card_print_id', (select count(*)::int from public.card_print_price_curves where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'card_signals.card_print_id', (select count(*)::int from public.card_signals where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'ebay_active_price_snapshots.card_print_id', (select count(*)::int from public.ebay_active_price_snapshots where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'ebay_active_prices_latest.card_print_id', (select count(*)::int from public.ebay_active_prices_latest where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'external_discovery_candidates.card_print_id', (select count(*)::int from public.external_discovery_candidates where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'identity_scan_selections.selected_card_print_id', (select count(*)::int from public.identity_scan_selections where selected_card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'justtcg_identity_overrides.card_print_id', (select count(*)::int from public.justtcg_identity_overrides where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'justtcg_variant_price_snapshots.card_print_id', (select count(*)::int from public.justtcg_variant_price_snapshots where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'justtcg_variant_prices_latest.card_print_id', (select count(*)::int from public.justtcg_variant_prices_latest where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'justtcg_variants.card_print_id', (select count(*)::int from public.justtcg_variants where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'listings.card_print_id', (select count(*)::int from public.listings where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'market_prices.card_id', (select count(*)::int from public.market_prices where card_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'price_observations.print_id', (select count(*)::int from public.price_observations where print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'prices.card_id', (select count(*)::int from public.prices where card_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'pricing_jobs.card_print_id', (select count(*)::int from public.pricing_jobs where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'pricing_observations.card_print_id', (select count(*)::int from public.pricing_observations where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'pricing_watch.card_print_id', (select count(*)::int from public.pricing_watch where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'shared_cards.card_id', (select count(*)::int from public.shared_cards where card_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'slab_certs.card_print_id', (select count(*)::int from public.slab_certs where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'slab_provenance_events.card_print_id', (select count(*)::int from public.slab_provenance_events where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'user_card_photos.card_print_id', (select count(*)::int from public.user_card_photos where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'vault_item_instances.card_print_id', (select count(*)::int from public.vault_item_instances where card_print_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
  union all
  select 'wishlist_items.card_id', (select count(*)::int from public.wishlist_items where card_id in (select shadow_card_print_id from tmp_pik_shadow_map_v1))
) unsupported_refs
where row_count > 0
order by table_ref;

rollback;
