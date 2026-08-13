\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

begin transaction read only;
set local statement_timeout = '180s';

with
mtg_category as materialized (
  select *
  from public.tcgcsv_source_categories
  where category_id = 1
),
mtg_groups as materialized (
  select *
  from public.tcgcsv_source_groups
  where category_id = 1
),
mtg_products as materialized (
  select
    product.*,
    exists (
      select 1
      from jsonb_array_elements(coalesce(product.extended_data, '[]'::jsonb)) entry
      where lower(entry ->> 'name') = 'number'
        and nullif(btrim(entry ->> 'value'), '') is not null
    ) as has_number,
    exists (
      select 1
      from jsonb_array_elements(coalesce(product.extended_data, '[]'::jsonb)) entry
      where lower(entry ->> 'name') = 'rarity'
        and nullif(btrim(entry ->> 'value'), '') is not null
    ) as has_rarity,
    exists (
      select 1
      from jsonb_array_elements(coalesce(product.extended_data, '[]'::jsonb)) entry
      where lower(entry ->> 'name') = 'subtype'
        and nullif(btrim(entry ->> 'value'), '') is not null
    ) as has_subtype
  from public.tcgcsv_source_products product
  where product.category_id = 1
),
latest_day as materialized (
  select observed_on
  from public.tcgcsv_source_price_daily_observations
  where category_id = 1
  order by observed_on desc
  limit 1
),
latest_prices as materialized (
  select observation.*
  from public.tcgcsv_source_price_daily_observations observation
  join latest_day on latest_day.observed_on = observation.observed_on
  where observation.category_id = 1
),
source_summary as (
  select jsonb_build_object(
    'category_id', category.category_id,
    'category_name', category.name,
    'category_display_name', category.display_name,
    'source_active', category.source_active,
    'category_last_seen_at', category.last_seen_at,
    'group_count', (select count(*) from mtg_groups),
    'active_group_count', (select count(*) from mtg_groups where source_active),
    'product_count', (select count(*) from mtg_products),
    'active_product_count', (select count(*) from mtg_products where source_active),
    'product_image_count', (select count(*) from mtg_products where nullif(btrim(image_url), '') is not null),
    'product_with_number_count', (select count(*) from mtg_products where has_number),
    'product_with_rarity_count', (select count(*) from mtg_products where has_rarity),
    'raw_single_candidate_count', (
      select count(*) from mtg_products
      where has_number and (has_rarity or has_subtype)
    ),
    'latest_observed_on', (select observed_on from latest_day),
    'latest_price_row_count', (select count(*) from latest_prices),
    'latest_priced_product_count', (select count(distinct product_id) from latest_prices),
    'latest_positive_market_price_count', (
      select count(*) from latest_prices where market_price > 0
    )
  ) as value
  from mtg_category category
),
subtype_distribution as (
  select coalesce(jsonb_agg(row_to_json(distribution) order by distribution.subtype_name_normalized), '[]'::jsonb) as value
  from (
    select
      subtype_name_normalized,
      min(subtype_name) as source_label,
      count(*) as price_row_count,
      count(*) filter (where market_price > 0) as positive_market_price_count,
      count(distinct product_id) as product_count
    from latest_prices
    group by subtype_name_normalized
  ) distribution
),
signal_distribution as (
  select jsonb_build_object(
    'packaged_product_name_signals', jsonb_build_object(
      'booster_box', count(*) filter (where name ilike '%booster box%'),
      'booster_pack', count(*) filter (where name ilike '%booster pack%'),
      'bundle', count(*) filter (where name ilike '%bundle%'),
      'commander_deck', count(*) filter (where name ilike '%commander deck%'),
      'prerelease_pack', count(*) filter (where name ilike '%prerelease pack%'),
      'starter_kit', count(*) filter (where name ilike '%starter kit%')
    ),
    'language_name_signals', jsonb_build_object(
      'chinese', count(*) filter (where name ilike '%chinese%'),
      'french', count(*) filter (where name ilike '%french%'),
      'german', count(*) filter (where name ilike '%german%'),
      'italian', count(*) filter (where name ilike '%italian%'),
      'japanese', count(*) filter (where name ilike '%japanese%'),
      'korean', count(*) filter (where name ilike '%korean%'),
      'portuguese', count(*) filter (where name ilike '%portuguese%'),
      'russian', count(*) filter (where name ilike '%russian%'),
      'spanish', count(*) filter (where name ilike '%spanish%')
    ),
    'treatment_name_signals', jsonb_build_object(
      'borderless', count(*) filter (where name ilike '%borderless%'),
      'etched', count(*) filter (where name ilike '%etched%'),
      'extended_art', count(*) filter (where name ilike '%extended art%'),
      'galaxy_foil', count(*) filter (where name ilike '%galaxy foil%'),
      'halo_foil', count(*) filter (where name ilike '%halo foil%'),
      'retro_frame', count(*) filter (where name ilike '%retro frame%'),
      'serialized', count(*) filter (where name ilike '%serialized%'),
      'showcase', count(*) filter (where name ilike '%showcase%'),
      'surge_foil', count(*) filter (where name ilike '%surge foil%')
    )
  ) as value
  from mtg_products
),
canonical_summary as (
  select jsonb_build_object(
    'game_count', (
      select count(*) from public.games
      where lower(code) in ('magic', 'mtg')
         or lower(name) in ('magic', 'magic: the gathering')
         or lower(coalesce(slug, '')) in ('magic', 'mtg')
    ),
    'set_count', (
      select count(*) from public.sets
      where lower(game) in ('magic', 'mtg', 'magic: the gathering')
    ),
    'card_print_count', (
      select count(*)
      from public.card_prints card
      join public.games game on game.id = card.game_id
      where lower(game.code) in ('magic', 'mtg')
         or lower(game.name) in ('magic', 'magic: the gathering')
         or lower(coalesce(game.slug, '')) in ('magic', 'mtg')
    ),
    'card_printing_count', (
      select count(*)
      from public.card_printings printing
      join public.card_prints card on card.id = printing.card_print_id
      join public.games game on game.id = card.game_id
      where lower(game.code) in ('magic', 'mtg')
         or lower(game.name) in ('magic', 'magic: the gathering')
         or lower(coalesce(game.slug, '')) in ('magic', 'mtg')
    ),
    'finish_keys', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', key,
        'label', label,
        'is_active', is_active
      ) order by sort_order, key), '[]'::jsonb)
      from public.finish_keys
    ),
    'set_game_distribution', (
      select coalesce(jsonb_agg(row_to_json(game_rows) order by game_rows.set_count desc), '[]'::jsonb)
      from (
        select game, count(*) as set_count
        from public.sets
        group by game
      ) game_rows
    )
  ) as value
),
mapping_summary as (
  select jsonb_build_object(
    'exact_mapping_count', (
      select count(*)
      from public.market_evidence_variant_assignments assignment
      join public.tcgcsv_source_price_daily_observations observation
        on observation.id = assignment.source_row_id
      where assignment.source_table = 'tcgcsv_source_price_daily_observations'
        and observation.category_id = 1
        and assignment.variant_assignment_status = 'exact_child_finish'
        and assignment.publishable
    ),
    'published_snapshot_count', (
      select count(*)
      from public.market_price_publication_snapshots snapshot
      join public.tcgcsv_source_price_daily_observations observation
        on observation.id = snapshot.source_observation_id
      where observation.category_id = 1
    )
  ) as value
),
recent_groups as (
  select coalesce(jsonb_agg(row_to_json(group_row) order by group_row.group_id desc), '[]'::jsonb) as value
  from (
    select group_id, name, abbreviation, published_on, is_supplemental, source_active
    from mtg_groups
    order by group_id desc
    limit 25
  ) group_row
),
representative_products as (
  select coalesce(jsonb_agg(row_to_json(product_row) order by product_row.product_id desc), '[]'::jsonb) as value
  from (
    select
      product_id,
      group_id,
      name,
      clean_name,
      has_number,
      has_rarity,
      has_subtype,
      (nullif(btrim(image_url), '') is not null) as has_image
    from mtg_products
    order by product_id desc
    limit 25
  ) product_row
)
select jsonb_pretty(jsonb_build_object(
  'snapshot_version', 'MTG_PRICING_READINESS_PRODUCTION_SNAPSHOT_V1',
  'recorded_at', now(),
  'read_only_proof', jsonb_build_object(
    'transaction_read_only', current_setting('transaction_read_only')::boolean,
    'database_user', current_user
  ),
  'source', (select value from source_summary),
  'source_subtypes', (select value from subtype_distribution),
  'source_signals', (select value from signal_distribution),
  'canonical', (select value from canonical_summary),
  'mappings', (select value from mapping_summary),
  'recent_source_groups', (select value from recent_groups),
  'representative_source_products', (select value from representative_products)
));

commit;

