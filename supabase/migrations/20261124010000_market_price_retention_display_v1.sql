-- Retain accepted exact prices across age and missing later quotes.
-- Read-only product surfaces change; qualification, snapshots, publication,
-- operational health, activation coverage and ownership are untouched.
begin;
set local lock_timeout='5s';
create or replace function public.market_retained_gym_price_row_valid_v1(
  row_data jsonb
) returns boolean language plpgsql stable set search_path = '' as $$
declare frozen jsonb; expected record; field_name text;
begin
  if row_data->>'gym_edition_assignment_id' is null
     or row_data->>'edition_assignment_id' is not null then return false; end if;
  select assignment.assignment_payload into frozen
  from public.tcgplayer_gym_challenge_edition_assignments_v1 assignment
  where assignment.id=(row_data->>'gym_edition_assignment_id')::uuid
    and public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(assignment.binding_id,true);
  if not found then return false; end if;
  if row_data->>'source_mapping_id' is not null
     or row_data->>'variant_assignment_id' is not null then return false; end if;
  if row_data ? 'edition_assignment_payload'
     and row_data->'edition_assignment_payload' is distinct from frozen then return false; end if;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'variant_assignment_version','TCGPLAYER_GYM_CHALLENGE_EDITION_ASSIGNMENT_V1',
    'variant_assignment_status','exact_child_finish',
    'mapping_method','gym_challenge_edition_binding_v1',
    'language_result','english','finish_result','exact_child_finish',
    'source_integrity_result','passed','duplicate_product_result','unique',
    'freshness_result','fresh'
  )) loop
    if row_data ? expected.key and row_data->>expected.key is distinct from expected.value
      then return false; end if;
  end loop;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'source_observation_id',frozen#>'{source,observation_id}',
    'source_sync_run_id',frozen#>'{source,sync_run_id}',
    'source_artifact_id',frozen#>'{source,artifact_id}',
    'source_artifact_hash',frozen#>'{source,artifact_hash}',
    'source_product_id',frozen#>'{source,product_id}',
    'source_subtype_name',frozen#>'{source,subtype}',
    'source_row_hash',frozen#>'{source,row_hash}',
    'source_price_row_identity',frozen#>'{source,price_row_identity}',
    'currency',frozen#>'{source,currency}',
    'card_print_id',frozen#>'{canonical,card_print_id}',
    'card_printing_id',frozen#>'{canonical,card_printing_id}',
    'gv_id',frozen#>'{canonical,gv_id}',
    'printing_gv_id',frozen#>'{canonical,printing_gv_id}',
    'finish_key',frozen#>'{canonical,finish_key}'
  )) loop
    if row_data->>expected.key is distinct from expected.value then return false; end if;
  end loop;
  if (row_data->>'source_artifact_date')::date
       is distinct from (frozen#>>'{source,artifact_observed_on}')::date
    or (row_data->>'source_observed_on')::date
       is distinct from (frozen#>>'{source,observed_on}')::date
    or (row_data->>'market_price')::numeric
       is distinct from (frozen#>>'{source,market_price}')::numeric
    or extract(epoch from (row_data->>'source_sync_finished_at')::timestamptz)
       is distinct from (frozen#>>'{source,sync_finished_at_epoch}')::numeric
    then return false; end if;
  foreach field_name in array array['low_price','mid_price','high_price','direct_low_price'] loop
    if row_data ? field_name and (row_data->>field_name)::numeric
      is distinct from (frozen->'source'->>field_name)::numeric then return false; end if;
  end loop;
  return true;
exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return false;
end;
$$;

create or replace function public.market_retained_jungle_price_row_valid_v1(row_data jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare frozen jsonb; expected record; field_name text;
begin
  if row_data->>'edition_assignment_id' is null
     or row_data->>'gym_edition_assignment_id' is not null then return false; end if;
  select assignment.assignment_payload into frozen
  from public.tcgplayer_jungle_edition_assignments_v1 assignment
  where assignment.id=(row_data->>'edition_assignment_id')::uuid
    and exists(select 1 from public.resolve_tcgplayer_jungle_edition_v1(
      (row_data->>'source_product_id')::integer,row_data->>'source_subtype_name',
      assignment.assignment_payload#>>'{source,product_hash}') resolved
      where resolved.binding_id=assignment.binding_id
        and resolved.card_print_id=(row_data->>'card_print_id')::uuid
        and resolved.card_printing_id=(row_data->>'card_printing_id')::uuid
        and resolved.finish_key=row_data->>'finish_key');
  if not found then return false; end if;
  if row_data->>'source_mapping_id' is not null
     or row_data->>'variant_assignment_id' is not null then return false; end if;
  if row_data ? 'edition_assignment_payload'
     and row_data->'edition_assignment_payload' is distinct from frozen then return false; end if;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'variant_assignment_version','TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1',
    'variant_assignment_status','exact_child_finish','mapping_method','jungle_edition_binding_v1',
    'language_result','english','finish_result','exact_child_finish','source_integrity_result','passed',
    'duplicate_product_result','unique','freshness_result','fresh'
  )) loop
    if row_data ? expected.key and row_data->>expected.key is distinct from expected.value
      then return false; end if;
  end loop;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'source_observation_id',frozen#>'{source,observation_id}',
    'source_sync_run_id',frozen#>'{source,sync_run_id}',
    'source_artifact_id',frozen#>'{source,artifact_id}',
    'source_artifact_hash',frozen#>'{source,artifact_hash}',
    'source_product_id',frozen#>'{source,product_id}',
    'source_subtype_name',frozen#>'{source,subtype}',
    'source_row_hash',frozen#>'{source,row_hash}',
    'source_price_row_identity',frozen#>'{source,price_row_identity}',
    'currency',frozen#>'{source,currency}',
    'card_print_id',frozen#>'{canonical,card_print_id}',
    'card_printing_id',frozen#>'{canonical,card_printing_id}',
    'gv_id',frozen#>'{canonical,gv_id}',
    'printing_gv_id',frozen#>'{canonical,printing_gv_id}',
    'finish_key',frozen#>'{canonical,finish_key}'
  )) loop
    if row_data->>expected.key is distinct from expected.value then return false; end if;
  end loop;
  if (row_data->>'source_artifact_date')::date
       is distinct from (frozen#>>'{source,artifact_observed_on}')::date
    or (row_data->>'source_observed_on')::date
       is distinct from (frozen#>>'{source,observed_on}')::date
    or (row_data->>'market_price')::numeric
       is distinct from (frozen#>>'{source,market_price}')::numeric
    or extract(epoch from (row_data->>'source_sync_finished_at')::timestamptz)
       is distinct from (frozen#>>'{source,sync_finished_at_epoch}')::numeric
    then return false; end if;
  foreach field_name in array array['low_price','mid_price','high_price','direct_low_price'] loop
    if row_data ? field_name and (row_data->>field_name)::numeric
      is distinct from (frozen->'source'->>field_name)::numeric then return false; end if;
  end loop;
  return true;
exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return false;
end;
$$;


create or replace function public.market_retained_price_identity_valid_v1(row_data jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare valid_target boolean;
begin
  select exists(select 1 from public.card_printings printing
    join public.card_prints card on card.id=printing.card_print_id
    where printing.id=(row_data->>'card_printing_id')::uuid
      and card.id=(row_data->>'card_print_id')::uuid
      and card.gv_id=row_data->>'gv_id'
      and printing.printing_gv_id=row_data->>'printing_gv_id'
      and printing.finish_key=row_data->>'finish_key'
      and not exists(select 1 from public.card_printing_truth_reviews review
        where review.card_printing_id=printing.id and review.active
          and review.public_visibility in ('hidden_pending_review','hidden_unsupported')))
  into valid_target;
  if not valid_target then return false; end if;
  if row_data->>'gym_edition_assignment_id' is not null then
    return public.market_retained_gym_price_row_valid_v1(row_data);
  elsif row_data->>'edition_assignment_id' is not null then
    return public.market_retained_jungle_price_row_valid_v1(row_data);
  elsif row_data->>'source_mapping_id' is not null or row_data->>'cross_tcg_source_mapping_id' is not null then
    return exists(select 1 from public.external_mappings mapping
      where mapping.id=coalesce(row_data->>'source_mapping_id',row_data->>'cross_tcg_source_mapping_id')::bigint
        and mapping.active and mapping.source='tcgplayer'
        and mapping.external_id=row_data->>'source_product_id'
        and mapping.card_print_id=(row_data->>'card_print_id')::uuid
        and mapping.meta->'reviewed_invalidation'->>'reason_code' is distinct from 'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT');
  elsif row_data->>'mtg_printing_mapping_id' is not null or row_data->>'cross_tcg_printing_mapping_id' is not null then
    return exists(select 1 from public.external_printing_mappings mapping
      where mapping.id=coalesce(row_data->>'mtg_printing_mapping_id',row_data->>'cross_tcg_printing_mapping_id')::uuid
        and mapping.active and mapping.source in ('tcgplayer','tcgplayer_market')
        and mapping.card_printing_id=(row_data->>'card_printing_id')::uuid
        and mapping.external_id in (row_data->>'source_product_id',
          (row_data->>'source_product_id')||':'||(row_data->>'finish_key')));
  end if;
  return false;
exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return false;
end;
$$;

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
  with recursive requested_parents as materialized (
    select distinct requested.card_print_id
    from unnest(coalesce(p_card_print_ids, '{}'::uuid[]))
      as requested(card_print_id)
  ),
  requested_printings as materialized (
    select distinct requested.card_printing_id
    from unnest(coalesce(p_card_printing_ids, '{}'::uuid[]))
      as requested(card_printing_id)
  ),
  current_context(publication_set_id,run_id,previous_publication_set_id,visited) as (
    select publication.id,publication.run_id,publication.previous_publication_set_id,array[publication.id]
    from public.market_price_current_publication pointer
    join public.market_price_publication_sets publication on publication.id=pointer.publication_set_id
      and publication.run_id=pointer.run_id and publication.publication_state='published'
    join public.market_price_pipeline_runs run on run.id=publication.run_id
      and run.reconciliation_state='reconciled' and run.state in ('published','verified')
      and run.run_mode in ('production','canary')
    where pointer.singleton
    union all
    select publication.id,publication.run_id,publication.previous_publication_set_id,
      accepted.visited||publication.id
    from current_context accepted
    join public.market_price_publication_sets publication on publication.id=accepted.previous_publication_set_id
      and publication.publication_state='superseded' and publication.published_at is not null
    join public.market_price_pipeline_runs run on run.id=publication.run_id
      and run.reconciliation_state='reconciled' and run.state in ('published','verified')
      and run.run_mode in ('production','canary')
    where not publication.id=any(accepted.visited)
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
      case when snapshot.source_sync_finished_at >= now()-interval '36 hours'
        then 'fresh'::text else 'stale'::text end as freshness,
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
      and (not exists(select 1 from public.jungle_edition_identity_links_v1 link
        where link.state in ('active','retired')
          and snapshot.card_print_id in (link.legacy_card_print_id,link.card_print_id))
        or snapshot.edition_assignment_id is not null or snapshot.gym_edition_assignment_id is not null)
      and snapshot.source_sync_finished_at <= now()+interval '6 minutes'
      and public.market_retained_price_identity_valid_v1(to_jsonb(snapshot))
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
      snapshot.source_sync_finished_at desc,
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
      case when snapshot.source_sync_finished_at >= now()-interval '36 hours'
        then 'fresh'::text else 'stale'::text end as freshness,
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
      and (not exists(select 1 from public.jungle_edition_identity_links_v1 link
        where link.state in ('active','retired')
          and snapshot.card_print_id in (link.legacy_card_print_id,link.card_print_id))
        or snapshot.edition_assignment_id is not null or snapshot.gym_edition_assignment_id is not null)
      and snapshot.source_sync_finished_at <= now()+interval '6 minutes'
      and public.market_retained_price_identity_valid_v1(to_jsonb(snapshot))
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
      snapshot.source_sync_finished_at desc,
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

revoke all on function public.market_retained_gym_price_row_valid_v1(jsonb),
  public.market_retained_jungle_price_row_valid_v1(jsonb),
  public.market_retained_price_identity_valid_v1(jsonb) from public,anon,authenticated;
grant execute on function public.market_retained_gym_price_row_valid_v1(jsonb),
  public.market_retained_jungle_price_row_valid_v1(jsonb),
  public.market_retained_price_identity_valid_v1(jsonb) to service_role;
comment on function public.get_market_pricing_read_model_v1(uuid[],uuid[]) is
  'Last accepted qualified exact prices, retained without an age cutoff; original source timestamps and dynamic fresh/stale labels. Failed/staged/rolled-back publications excluded. Source qualification and activation guards unchanged.';
notify pgrst,'reload schema';
commit;
