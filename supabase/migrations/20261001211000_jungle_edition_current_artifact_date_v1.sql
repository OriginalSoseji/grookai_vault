-- Current warehouse price artifacts intentionally omit observed_on. The exact
-- completed run and observation still carry the same required date; an explicit
-- conflicting artifact date must fail. Preserve all other identity/source gates.
begin;

create or replace view public.v_tcgplayer_jungle_edition_assignment_candidates_v1
with (security_invoker = true) as
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

notify pgrst, 'reload schema';
commit;
