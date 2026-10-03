-- Filter by product before duplicate counting. Product belongs to the duplicate
-- partition, so every subtype competitor for that product is retained. The exact
-- assignment comparison and all identity/source checks remain authoritative.
begin;

create or replace function public.tcgplayer_jungle_assignment_candidates_for_products_v1(p_product_ids integer[])
returns table(source_observation_id uuid,source_sync_run_id uuid,binding_id uuid,assignment_payload jsonb,assignment_sha256 text)
language sql stable set search_path = '' as $$
with source_run as materialized (
  select run.* from public.tcgcsv_source_sync_runs run
  where run.sync_mode = 'current_full_sync' and run.status = 'completed'
    and run.failed_count = 0 and run.finished_at is not null
  order by run.finished_at desc,run.created_at desc,run.id desc limit 1
), observations as (
  select observation.*,
    count(*) over (partition by observation.product_id,
      lower(btrim(regexp_replace(observation.subtype_name,'[[:space:]]+',' ','g')))) as duplicate_count
  from public.tcgcsv_source_price_daily_observations observation
  join source_run run on run.id = observation.last_seen_run_id and run.observed_on = observation.observed_on
  where observation.product_id = any(p_product_ids)
), resolved as (
  select observation.id as source_observation_id,run.id as source_sync_run_id,binding.id as binding_id,
    jsonb_build_object(
      'version','TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1',
      'source',jsonb_build_object(
        'observation_id',observation.id,'sync_run_id',run.id,
        'run_artifact_hash',run.artifact_hash,'sync_finished_at_epoch',extract(epoch from run.finished_at),
        'observed_on',observation.observed_on,'last_observed_at_epoch',extract(epoch from observation.last_observed_at),
        'price_row_identity',observation.source_price_row_identity,'row_hash',observation.payload_hash,
        'raw_payload',observation.raw_payload,
        'artifact_id',artifact.id,'artifact_hash',artifact.sha256,'artifact_byte_size',artifact.byte_size,
        'artifact_observed_on',artifact.observed_on,
        'product_id',observation.product_id,'product_hash',product.payload_hash,
        'category_id',observation.category_id,'group_id',observation.group_id,
        'subtype',observation.subtype_name,'currency',observation.currency,
        'market_price',observation.market_price,'low_price',observation.low_price,
        'mid_price',observation.mid_price,'high_price',observation.high_price,'direct_low_price',observation.direct_low_price),
      'binding',jsonb_build_object('id',binding.id,'identity_link_id',identity.identity_link_id,
        'manifest_sha256',binding.manifest_sha256,'review_ref',binding.review_ref,'link_review_ref',link.review_ref),
      'canonical',jsonb_build_object('legacy_card_print_id',identity.legacy_card_print_id,
        'card_print_id',card.id,'gv_id',card.gv_id,'card_printing_id',child.id,'printing_gv_id',child.printing_gv_id,
        'edition',identity.edition,'finish_key',identity.finish_key,
        'printed_identity_modifier',card.printed_identity_modifier,
        'provenance_source',child.provenance_source,'provenance_ref',child.provenance_ref),
      'reviews',(select jsonb_agg((to_jsonb(review) - 'reviewed_at' - 'created_at' - 'updated_at') ||
        jsonb_build_object('reviewed_at_epoch',extract(epoch from review.reviewed_at),
          'created_at_epoch',extract(epoch from review.created_at),'updated_at_epoch',extract(epoch from review.updated_at)) order by review.id)
        from public.card_printing_truth_reviews review where review.card_printing_id = child.id and review.active)
    ) as assignment_payload
  from observations observation
  join source_run run on run.id = observation.last_seen_run_id
  join public.tcgcsv_source_products product on product.product_id = observation.product_id
  join public.tcgcsv_source_artifacts artifact on artifact.id = observation.source_artifact_id
  cross join lateral public.resolve_tcgplayer_jungle_edition_v1(
    observation.product_id,observation.subtype_name,product.payload_hash) identity
  join public.tcgplayer_jungle_edition_bindings_v1 binding on binding.id = identity.binding_id
  join public.jungle_edition_identity_links_v1 link on link.id = identity.identity_link_id
  join public.card_prints card on card.id = identity.card_print_id
  join public.card_printings child on child.id = identity.card_printing_id
  where observation.duplicate_count = 1 and observation.category_id = 3 and observation.group_id = 635
    and observation.subtype_name in ('Unlimited','Unlimited Holofoil','1st Edition','1st Edition Holofoil')
    and observation.subtype_name_normalized = lower(observation.subtype_name)
    and observation.currency = 'USD' and observation.market_price > 0
    and observation.market_price::text not in ('NaN','Infinity','-Infinity')
    and length(btrim(observation.source_price_row_identity)) > 0
    and observation.payload_hash ~ '^[a-f0-9]{64}$' and run.artifact_hash ~ '^[a-f0-9]{64}$'
    and run.finished_at >= now() - interval '36 hours' and run.finished_at <= now() + interval '6 minutes'
    and artifact.sync_run_id = run.id and artifact.run_key = run.run_key
    and artifact.artifact_kind = 'prices'
    and (artifact.observed_on is null or artifact.observed_on = observation.observed_on)
    and artifact.category_id = observation.category_id and artifact.group_id = observation.group_id
    and artifact.http_status = 200 and artifact.byte_size > 0 and artifact.sha256 ~ '^[a-f0-9]{64}$'
    and public.get_jungle_edition_resolution_v1(card.id)->>'status' = 'ready'
)
select resolved.*,encode(extensions.digest(assignment_payload::text,'sha256'),'hex') as assignment_sha256
from resolved;
$$;

revoke all on function public.tcgplayer_jungle_assignment_candidates_for_products_v1(integer[]) from public,anon,authenticated,service_role;
grant execute on function public.tcgplayer_jungle_assignment_candidates_for_products_v1(integer[]) to service_role;

create or replace function public.jungle_edition_price_row_valid_v1(row_data jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare frozen jsonb; expected record; field_name text;
begin
  if row_data->>'edition_assignment_id' is null then return false; end if;
  select assignment.assignment_payload into frozen
  from public.tcgplayer_jungle_edition_assignments_v1 assignment
  cross join lateral public.tcgplayer_jungle_assignment_candidates_for_products_v1(
    array[(assignment.assignment_payload#>>'{source,product_id}')::integer]) candidate
  where assignment.id = (row_data->>'edition_assignment_id')::uuid
    and candidate.source_observation_id = assignment.source_observation_id
    and candidate.source_sync_run_id = assignment.source_sync_run_id
    and candidate.binding_id = assignment.binding_id
    and candidate.assignment_sha256 = assignment.assignment_sha256
    and candidate.assignment_payload = assignment.assignment_payload;
  if not found then return false; end if;
  if row_data->>'source_mapping_id' is not null or row_data->>'variant_assignment_id' is not null then return false; end if;
  if row_data ? 'edition_assignment_payload' and row_data->'edition_assignment_payload' is distinct from frozen then return false; end if;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'variant_assignment_version','TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1',
    'variant_assignment_status','exact_child_finish','mapping_method','jungle_edition_binding_v1',
    'language_result','english','finish_result','exact_child_finish','source_integrity_result','passed',
    'duplicate_product_result','unique','freshness_result','fresh'
  )) loop
    if row_data ? expected.key and row_data->>expected.key is distinct from expected.value then return false; end if;
  end loop;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'source_observation_id',frozen#>'{source,observation_id}','source_sync_run_id',frozen#>'{source,sync_run_id}',
    'source_artifact_id',frozen#>'{source,artifact_id}','source_artifact_hash',frozen#>'{source,artifact_hash}',
    'source_product_id',frozen#>'{source,product_id}','source_subtype_name',frozen#>'{source,subtype}',
    'source_row_hash',frozen#>'{source,row_hash}','source_price_row_identity',frozen#>'{source,price_row_identity}',
    'currency',frozen#>'{source,currency}','card_print_id',frozen#>'{canonical,card_print_id}',
    'card_printing_id',frozen#>'{canonical,card_printing_id}','gv_id',frozen#>'{canonical,gv_id}',
    'printing_gv_id',frozen#>'{canonical,printing_gv_id}','finish_key',frozen#>'{canonical,finish_key}'
  )) loop
    if row_data->>expected.key is distinct from expected.value then return false; end if;
  end loop;
  if (row_data->>'source_artifact_date')::date is distinct from (frozen#>>'{source,artifact_observed_on}')::date
    or (row_data->>'source_observed_on')::date is distinct from (frozen#>>'{source,observed_on}')::date
    or (row_data->>'market_price')::numeric is distinct from (frozen#>>'{source,market_price}')::numeric
    or extract(epoch from (row_data->>'source_sync_finished_at')::timestamptz)
      is distinct from (frozen#>>'{source,sync_finished_at_epoch}')::numeric then return false; end if;
  foreach field_name in array array['low_price','mid_price','high_price','direct_low_price'] loop
    if row_data ? field_name and (row_data->>field_name)::numeric
      is distinct from (frozen->'source'->>field_name)::numeric then return false; end if;
  end loop;
  return true;
exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return false;
end;
$$;

notify pgrst, 'reload schema';
commit;
