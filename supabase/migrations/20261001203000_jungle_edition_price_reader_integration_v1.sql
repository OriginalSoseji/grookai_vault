-- Preserve reviewed mapping-price quarantine alongside exact Jungle edition guards.
-- Narrow source spelling alias: Jungle #64 Poké Ball -> Poke Ball only.
-- No canonical, mapping, ownership, permission or publication writes.
begin;
CREATE OR REPLACE FUNCTION public.tcgplayer_jungle_binding_valid_v1(binding_id uuid, require_active boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.tcgplayer_jungle_edition_bindings_v1 binding
    join public.jungle_edition_identity_links_v1 link on link.id = binding.identity_link_id
    join public.card_prints card on card.id = link.card_print_id
    join public.tcgcsv_source_products product on product.product_id = binding.product_id
    where binding.id = binding_id and binding.state <> 'retired'
      and (not require_active or (binding.state = 'active' and link.state = 'active'))
      and public.jungle_edition_link_valid_v1(link.id, require_active)
      and binding.manifest_sha256 = link.manifest_sha256
      and binding.source_subtype = case link.edition when 'first_edition' then '1st Edition' else 'Unlimited' end
        || case link.finish_key when 'holo' then ' Holofoil' else '' end
      and product.category_id = 3 and product.group_id = 635 and product.source_active
      and product.catalog_metadata_status = 'current' and product.payload_hash = binding.source_product_payload_hash
      and product.name in (card.name,card.name || ' (' || card.number_plain || ')',
        case when card.number_plain = '57' and card.name = 'Nidoran ♀' then 'Nidoran F' when card.number_plain = '64' and card.name = 'Poké Ball' then 'Poke Ball' else card.name end)
      and (select count(*) from jsonb_array_elements(case when jsonb_typeof(product.extended_data) = 'array'
        then product.extended_data else '[]'::jsonb end) item where item->>'name' = 'Number') = 1
      and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(product.extended_data) = 'array'
        then product.extended_data else '[]'::jsonb end) item where item->>'name' = 'Number'
        and item->>'value' in (card.number_plain || '/64',lpad(card.number_plain,2,'0') || '/64'))
  );
$function$;

create or replace view public.v_market_price_current_v1 as
with current_snapshots as (
  select
    snapshot.*,
    row_number() over (
      partition by snapshot.card_printing_id
      order by snapshot.source_observed_on desc,
        snapshot.published_at desc,
        snapshot.id desc
    ) as snapshot_rank
  from public.market_price_publication_snapshots snapshot
  join public.market_price_current_publication current_state
    on current_state.publication_set_id = snapshot.publication_set_id
   and current_state.run_id = snapshot.run_id
  join public.market_price_publication_sets publication_set
    on publication_set.id = current_state.publication_set_id
   and publication_set.run_id = current_state.run_id
   and publication_set.publication_state = 'published'
  join public.market_price_pipeline_runs pipeline_run
    on pipeline_run.id = publication_set.run_id
   and pipeline_run.reconciliation_state = 'reconciled'
   and pipeline_run.state in ('published', 'verified')
  join public.market_price_qualification_decisions decision
    on decision.id = snapshot.qualification_decision_id
   and decision.run_id = snapshot.run_id
   and decision.eligible = true
   and decision.decision = 'publish'
   and decision.publication_lane = 'current'
  where not exists (
      select 1 from public.external_mappings rejected_mapping
      where rejected_mapping.id = snapshot.source_mapping_id
        and rejected_mapping.meta->'reviewed_invalidation'->>'reason_code'
          = 'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT'
    ) and snapshot.publication_set_id = publication_set.id
    and snapshot.run_id = pipeline_run.id
    and snapshot.publication_state = 'published'
    and snapshot.freshness_state = 'fresh'
    and (case when snapshot.edition_assignment_id is not null or exists (
        select 1 from public.jungle_edition_identity_links_v1 edition_link
        where edition_link.state in ('active','retired')
          and snapshot.card_print_id in (edition_link.legacy_card_print_id,edition_link.card_print_id)
      ) then public.jungle_edition_price_row_valid_v1(to_jsonb(snapshot)) else true end)
      and snapshot.source_sync_finished_at >= now() - interval '36 hours'
    and not exists (
      select 1
      from public.card_printing_truth_reviews truth_review
      where truth_review.card_printing_id = snapshot.card_printing_id
        and truth_review.active = true
        and truth_review.public_visibility in (
          'hidden_pending_review',
          'hidden_unsupported'
        )
    )
)
select
  snapshot.card_print_id,
  snapshot.card_printing_id,
  snapshot.gv_id,
  snapshot.printing_gv_id,
  snapshot.finish_key,
  snapshot.currency,
  snapshot.market_price,
  snapshot.low_price,
  snapshot.mid_price,
  snapshot.high_price,
  snapshot.direct_low_price,
  snapshot.source_name,
  snapshot.source_label,
  snapshot.source_observed_on,
  snapshot.source_sync_finished_at as observed_at,
  snapshot.published_at,
  'fresh'::text as freshness,
  extract(epoch from (now() - snapshot.source_sync_finished_at))::bigint
    as age_seconds,
  snapshot.provenance_id,
  snapshot.policy_version,
  snapshot.publication_set_id,
  snapshot.run_id
from current_snapshots snapshot
where snapshot.snapshot_rank = 1;

create or replace function public.get_market_pricing_read_model_v1(
  p_card_print_ids uuid[] default null,
  p_card_printing_ids uuid[] default null
)
returns table (
  pricing_scope text,
  card_print_id uuid,
  card_printing_id uuid,
  gv_id text,
  printing_gv_id text,
  finish_key text,
  status text,
  unavailable_reason text,
  currency text,
  market_close numeric,
  source_name text,
  source_label text,
  observed_at timestamptz,
  published_at timestamptz,
  freshness text,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  direct_low_price numeric,
  is_from_price boolean,
  eligible_printing_count integer,
  lowest_active_ask numeric,
  active_ask_listing_count integer,
  active_ask_observed_at timestamptz,
  provenance_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with requested_parents as materialized (
    select distinct requested.card_print_id
    from unnest(coalesce(p_card_print_ids, '{}'::uuid[]))
      as requested(card_print_id)
  ),
  requested_printings as materialized (
    select distinct requested.card_printing_id
    from unnest(coalesce(p_card_printing_ids, '{}'::uuid[]))
      as requested(card_printing_id)
  ),
  current_context as materialized (
    select
      current_state.publication_set_id,
      current_state.run_id
    from public.market_price_current_publication current_state
    join public.market_price_publication_sets publication_set
      on publication_set.id = current_state.publication_set_id
     and publication_set.run_id = current_state.run_id
     and publication_set.publication_state = 'published'
    join public.market_price_pipeline_runs pipeline_run
      on pipeline_run.id = publication_set.run_id
     and pipeline_run.reconciliation_state = 'reconciled'
     and pipeline_run.state in ('published', 'verified')
    where current_state.singleton
  ),
  requested_parent_prices as materialized (
    select distinct on (snapshot.card_printing_id)
      snapshot.card_print_id,
      snapshot.card_printing_id,
      snapshot.gv_id,
      snapshot.printing_gv_id,
      snapshot.finish_key,
      snapshot.currency,
      snapshot.market_price,
      snapshot.low_price,
      snapshot.mid_price,
      snapshot.high_price,
      snapshot.direct_low_price,
      snapshot.source_sync_finished_at as observed_at,
      snapshot.published_at,
      'fresh'::text as freshness,
      snapshot.provenance_id
    from requested_parents requested
    join current_context current_state on true
    join public.market_price_publication_snapshots snapshot
      on snapshot.publication_set_id = current_state.publication_set_id
     and snapshot.run_id = current_state.run_id
     and snapshot.card_print_id = requested.card_print_id
    join public.market_price_qualification_decisions decision
      on decision.id = snapshot.qualification_decision_id
     and decision.run_id = snapshot.run_id
     and decision.eligible = true
     and decision.decision = 'publish'
     and decision.publication_lane = 'current'
    where not exists (
      select 1 from public.external_mappings rejected_mapping
      where rejected_mapping.id = snapshot.source_mapping_id
        and rejected_mapping.meta->'reviewed_invalidation'->>'reason_code'
          = 'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT'
    ) and snapshot.publication_state = 'published'
      and snapshot.freshness_state = 'fresh'
      and (case when snapshot.edition_assignment_id is not null or exists (
        select 1 from public.jungle_edition_identity_links_v1 edition_link
        where edition_link.state in ('active','retired')
          and snapshot.card_print_id in (edition_link.legacy_card_print_id,edition_link.card_print_id)
      ) then public.jungle_edition_price_row_valid_v1(to_jsonb(snapshot)) else true end)
      and snapshot.source_sync_finished_at >= now() - interval '36 hours'
      and not exists (
        select 1
        from public.card_printing_truth_reviews truth_review
        where truth_review.card_printing_id = snapshot.card_printing_id
          and truth_review.active = true
          and truth_review.public_visibility in (
            'hidden_pending_review',
            'hidden_unsupported'
          )
      )
    order by
      snapshot.card_printing_id,
      snapshot.source_observed_on desc,
      snapshot.published_at desc,
      snapshot.id desc
  ),
  requested_printing_prices as materialized (
    select distinct on (snapshot.card_printing_id)
      snapshot.card_print_id,
      snapshot.card_printing_id,
      snapshot.gv_id,
      snapshot.printing_gv_id,
      snapshot.finish_key,
      snapshot.currency,
      snapshot.market_price,
      snapshot.low_price,
      snapshot.mid_price,
      snapshot.high_price,
      snapshot.direct_low_price,
      snapshot.source_sync_finished_at as observed_at,
      snapshot.published_at,
      'fresh'::text as freshness,
      snapshot.provenance_id
    from requested_printings requested
    join current_context current_state on true
    join public.market_price_publication_snapshots snapshot
      on snapshot.publication_set_id = current_state.publication_set_id
     and snapshot.run_id = current_state.run_id
     and snapshot.card_printing_id = requested.card_printing_id
    join public.market_price_qualification_decisions decision
      on decision.id = snapshot.qualification_decision_id
     and decision.run_id = snapshot.run_id
     and decision.eligible = true
     and decision.decision = 'publish'
     and decision.publication_lane = 'current'
    where not exists (
      select 1 from public.external_mappings rejected_mapping
      where rejected_mapping.id = snapshot.source_mapping_id
        and rejected_mapping.meta->'reviewed_invalidation'->>'reason_code'
          = 'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT'
    ) and snapshot.publication_state = 'published'
      and snapshot.freshness_state = 'fresh'
      and (case when snapshot.edition_assignment_id is not null or exists (
        select 1 from public.jungle_edition_identity_links_v1 edition_link
        where edition_link.state in ('active','retired')
          and snapshot.card_print_id in (edition_link.legacy_card_print_id,edition_link.card_print_id)
      ) then public.jungle_edition_price_row_valid_v1(to_jsonb(snapshot)) else true end)
      and snapshot.source_sync_finished_at >= now() - interval '36 hours'
      and not exists (
        select 1
        from public.card_printing_truth_reviews truth_review
        where truth_review.card_printing_id = snapshot.card_printing_id
          and truth_review.active = true
          and truth_review.public_visibility in (
            'hidden_pending_review',
            'hidden_unsupported'
          )
      )
    order by
      snapshot.card_printing_id,
      snapshot.source_observed_on desc,
      snapshot.published_at desc,
      snapshot.id desc
  ),
  ranked_parent_prices as materialized (
    select
      current_price.*,
      count(*) over (
        partition by current_price.card_print_id
      )::integer as eligible_printing_count,
      row_number() over (
        partition by current_price.card_print_id
        order by
          current_price.market_price asc,
          current_price.published_at desc,
          current_price.observed_at desc,
          current_price.card_printing_id asc
      ) as parent_price_rank
    from requested_parent_prices current_price
  ),
  parent_active_asks as materialized (
    select
      current_price.card_print_id,
      min(active_ask.lowest_active_ask)::numeric as lowest_active_ask,
      sum(coalesce(active_ask.listing_count, 0))::integer
        as active_ask_listing_count,
      max(active_ask.observed_at) as active_ask_observed_at
    from requested_parent_prices current_price
    left join public.mv_market_listing_active_ask_current_v1 active_ask
      on active_ask.card_printing_id = current_price.card_printing_id
    group by current_price.card_print_id
  ),
  parent_summaries as materialized (
    select
      selected.card_print_id,
      selected.card_printing_id,
      selected.gv_id,
      selected.printing_gv_id,
      selected.finish_key,
      selected.currency,
      selected.market_price::numeric as market_close,
      selected.eligible_printing_count,
      (selected.eligible_printing_count > 1) as is_from_price,
      selected.observed_at,
      selected.published_at,
      selected.freshness,
      selected.provenance_id,
      active_ask.lowest_active_ask,
      active_ask.active_ask_listing_count,
      active_ask.active_ask_observed_at
    from ranked_parent_prices selected
    left join parent_active_asks active_ask
      on active_ask.card_print_id = selected.card_print_id
    where selected.parent_price_rank = 1
  ),
  latest_parent_decisions as materialized (
    select
      requested.card_print_id,
      latest.reason_codes,
      latest.freshness_result,
      latest.publication_lane
    from requested_parents requested
    left join lateral (
      select
        decision.reason_codes,
        decision.freshness_result,
        decision.publication_lane
      from public.market_price_qualification_decisions decision
      join public.market_price_pipeline_runs pipeline_run
        on pipeline_run.id = decision.run_id
       and pipeline_run.run_mode in ('canary', 'production')
       and pipeline_run.state not in ('failed', 'rolled_back')
      where decision.card_print_id = requested.card_print_id
      order by decision.evaluated_at desc, decision.id desc
      limit 1
    ) latest on true
  ),
  latest_printing_decisions as materialized (
    select
      requested.card_printing_id,
      latest.reason_codes,
      latest.freshness_result,
      latest.publication_lane
    from requested_printings requested
    left join lateral (
      select
        decision.reason_codes,
        decision.freshness_result,
        decision.publication_lane
      from public.market_price_qualification_decisions decision
      join public.market_price_pipeline_runs pipeline_run
        on pipeline_run.id = decision.run_id
       and pipeline_run.run_mode in ('canary', 'production')
       and pipeline_run.state not in ('failed', 'rolled_back')
      where decision.card_printing_id = requested.card_printing_id
      order by decision.evaluated_at desc, decision.id desc
      limit 1
    ) latest on true
  )
  select
    'parent'::text,
    requested.card_print_id,
    parent.card_printing_id,
    card.gv_id,
    parent.printing_gv_id,
    parent.finish_key,
    case when parent.card_print_id is null then 'unavailable' else 'available' end,
    case
      when parent.card_print_id is not null then null::text
      when latest.freshness_result = 'delayed'
        then 'source_freshness_delayed'
      when latest.freshness_result = 'suppressed_stale'
        then 'suppressed_stale'
      when cardinality(latest.reason_codes) > 0 then latest.reason_codes[1]
      else 'no_current_qualified_market_price'
    end,
    parent.currency,
    parent.market_close,
    'tcgplayer'::text,
    case
      when parent.is_from_price then 'From TCGPlayer Market'
      else 'TCGPlayer Market'
    end,
    parent.observed_at,
    parent.published_at,
    coalesce(parent.freshness, latest.freshness_result, 'unavailable'),
    null::numeric,
    null::numeric,
    null::numeric,
    null::numeric,
    coalesce(parent.is_from_price, false),
    coalesce(parent.eligible_printing_count, 0),
    parent.lowest_active_ask,
    parent.active_ask_listing_count,
    parent.active_ask_observed_at,
    parent.provenance_id
  from requested_parents requested
  left join public.card_prints card
    on card.id = requested.card_print_id
  left join parent_summaries parent
    on parent.card_print_id = requested.card_print_id
  left join latest_parent_decisions latest
    on latest.card_print_id = requested.card_print_id

  union all

  select
    'card_printing'::text,
    printing.card_print_id,
    requested.card_printing_id,
    card.gv_id,
    printing.printing_gv_id,
    printing.finish_key,
    case when exact.card_printing_id is null then 'unavailable' else 'available' end,
    case
      when exact.card_printing_id is not null then null::text
      when latest.freshness_result = 'delayed'
        then 'source_freshness_delayed'
      when latest.freshness_result = 'suppressed_stale'
        then 'suppressed_stale'
      when cardinality(latest.reason_codes) > 0 then latest.reason_codes[1]
      else 'no_current_qualified_market_price'
    end,
    exact.currency,
    exact.market_price,
    'tcgplayer'::text,
    'TCGPlayer Market'::text,
    exact.observed_at,
    exact.published_at,
    coalesce(exact.freshness, latest.freshness_result, 'unavailable'),
    exact.low_price,
    exact.mid_price,
    exact.high_price,
    exact.direct_low_price,
    false,
    case when exact.card_printing_id is null then 0 else 1 end,
    active_ask.lowest_active_ask,
    active_ask.listing_count,
    active_ask.observed_at,
    exact.provenance_id
  from requested_printings requested
  left join public.card_printings printing
    on printing.id = requested.card_printing_id
  left join public.card_prints card
    on card.id = printing.card_print_id
  left join requested_printing_prices exact
    on exact.card_printing_id = requested.card_printing_id
  left join public.mv_market_listing_active_ask_current_v1 active_ask
    on active_ask.card_printing_id = requested.card_printing_id
  left join latest_printing_decisions latest
    on latest.card_printing_id = requested.card_printing_id
  order by 1, 2, 6 nulls first;
$$;

notify pgrst, 'reload schema';

commit;
