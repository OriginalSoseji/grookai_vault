-- Cross-TCG Market V2: existing governed product/finish authority only.
-- Canonical identities, old qualification views and existing price facts are unchanged.
begin;

-- Conflict checks and condition readers address the canonical child directly.
-- The source/external-ID unique index cannot serve this lookup.
create index if not exists external_printing_mappings_active_child_source_v2_idx
  on public.external_printing_mappings(card_printing_id,source) where active;

alter table public.market_price_pipeline_candidates add column if not exists cross_tcg_source_mapping_id bigint references public.external_mappings(id) on delete restrict;
alter table public.market_price_pipeline_candidates add column if not exists cross_tcg_printing_mapping_id uuid references public.external_printing_mappings(id) on delete restrict;

alter table public.market_price_qualification_decisions add column if not exists cross_tcg_source_mapping_id bigint references public.external_mappings(id) on delete restrict;
alter table public.market_price_qualification_decisions add column if not exists cross_tcg_printing_mapping_id uuid references public.external_printing_mappings(id) on delete restrict;

alter table public.market_price_publication_snapshots add column if not exists cross_tcg_source_mapping_id bigint references public.external_mappings(id) on delete restrict;
alter table public.market_price_publication_snapshots add column if not exists cross_tcg_printing_mapping_id uuid references public.external_printing_mappings(id) on delete restrict;

alter table public.market_price_publication_snapshots drop constraint if exists market_price_snapshot_assignment_lane_v1;
alter table public.market_price_publication_snapshots add constraint market_price_snapshot_assignment_lane_v1 check (
  (cross_tcg_source_mapping_id is null and cross_tcg_printing_mapping_id is null and (
    (edition_assignment_id is null and gym_edition_assignment_id is null and mtg_printing_mapping_id is null and source_mapping_id is not null and variant_assignment_id is not null)
    or (edition_assignment_id is not null and gym_edition_assignment_id is null and mtg_printing_mapping_id is null and source_mapping_id is null and variant_assignment_id is null)
    or (edition_assignment_id is null and gym_edition_assignment_id is not null and mtg_printing_mapping_id is null and source_mapping_id is null and variant_assignment_id is null)
    or (edition_assignment_id is null and gym_edition_assignment_id is null and mtg_printing_mapping_id is not null and source_mapping_id is null and variant_assignment_id is null)))
  or (edition_assignment_id is null and gym_edition_assignment_id is null and mtg_printing_mapping_id is null and source_mapping_id is null and variant_assignment_id is null
    and ((cross_tcg_source_mapping_id is not null and cross_tcg_printing_mapping_id is null)
      or (cross_tcg_source_mapping_id is null and cross_tcg_printing_mapping_id is not null)))
);
alter table public.market_price_qualification_decisions drop constraint if exists market_price_qualification_decisions_language_check;
alter table public.market_price_qualification_decisions add constraint market_price_qualification_decisions_language_check check(language_result in ('english','japanese','non_english','ambiguous','missing'));

create or replace view public.v_cross_tcg_market_targets_v2 with(security_invoker=true) as
with targets as (
  select product.product_id, product.category_id, product.group_id,
    card.id card_print_id, card.gv_id, card.rarity card_rarity,
    identity.identity_domain, printing.id card_printing_id,
    printing.printing_gv_id, printing.finish_key,
    mapping.id cross_tcg_source_mapping_id, null::uuid cross_tcg_printing_mapping_id,
    mapping.meta source_mapping_meta
  from public.external_mappings mapping
  join public.card_prints card on card.id=mapping.card_print_id
  join public.card_print_identity identity on identity.card_print_id=card.id and identity.is_active and identity.identity_domain='one_piece_eng_print'
  join public.card_printings printing on printing.card_print_id=card.id
  join public.tcgcsv_source_products product on product.product_id::text=mapping.external_id and product.category_id=68
  join public.tcgcsv_source_groups source_group on source_group.group_id=product.group_id and source_group.category_id=68
  where mapping.source='tcgplayer' and mapping.active and mapping.external_id ~ '^[1-9][0-9]*$'
    and mapping.meta->>'mapping_authority'='exact_durable_source_product_with_official_number_name'
    and mapping.meta->>'promotion_plan_version'='ONE_PIECE_COMPLETE_ENGLISH_NUMBERED_PARENT_PROMOTION_PLAN_V1'
    and mapping.meta->>'durable_staging_row_id' ~* '^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$'
    and mapping.meta->>'source_group_id'=product.group_id::text
    and card.identity_domain='one_piece_eng_print'
    and card.variant_key='tcgplayer_product_'||product.product_id::text
    and card.external_ids->>'tcgplayer'=product.product_id::text
    and printing.is_provisional=false and printing.finish_key in ('normal','foil')
    and printing.provenance_source='ONE_PIECE_EXACT_PRODUCT_PRINTING_REPAIR_20260919'
    and printing.provenance_ref ~ '^raw_imports:-?[0-9]+[|]master-index:[a-f0-9]{64}$'
    and product.source_active and product.catalog_metadata_status='current'
    and source_group.source_active and source_group.catalog_metadata_status='current'
    and 1=(select count(*) from jsonb_array_elements(case when jsonb_typeof(product.extended_data)='array' then product.extended_data else '[]'::jsonb end) field where lower(field->>'name')='number')
    and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(product.extended_data)='array' then product.extended_data else '[]'::jsonb end) field where lower(field->>'name')='number' and upper(trim(field->>'value'))=upper(trim(card.number)) and length(trim(card.number))>0)
    and not exists(select 1 from public.external_mappings other where other.source='tcgplayer' and other.active and other.id<>mapping.id and (other.external_id=mapping.external_id or other.card_print_id=card.id))
    and not exists(select 1 from public.card_printings other where other.card_print_id=card.id and other.finish_key=printing.finish_key and other.is_provisional=false and other.id<>printing.id)
    and not exists(select 1 from public.external_printing_mappings other where other.active and other.card_printing_id=printing.id and ((other.source='tcgplayer' and (other.external_id<>mapping.external_id or (public.normalize_tcgplayer_market_subtype_v1(other.meta->>'source_subtype') is not null and public.normalize_tcgplayer_market_subtype_v1(other.meta->>'source_subtype')<>printing.finish_key))) or (other.source='tcgplayer_market' and other.external_id<>mapping.external_id||':'||printing.finish_key)))
    and not exists(select 1 from public.external_printing_mappings other where other.active and other.card_printing_id<>printing.id and ((other.source='tcgplayer_market' and other.external_id=product.product_id::text||':'||printing.finish_key) or (other.source='tcgplayer' and other.external_id=product.product_id::text and (public.normalize_tcgplayer_market_subtype_v1(other.meta->>'source_subtype') is null or public.normalize_tcgplayer_market_subtype_v1(other.meta->>'source_subtype')=printing.finish_key))))
  union all
  select product.product_id, product.category_id, product.group_id,
    card.id,card.gv_id,card.rarity,identity.identity_domain,
    printing.id,printing.printing_gv_id,printing.finish_key,
    null::bigint,mapping.id,mapping.meta
  from public.external_printing_mappings mapping
  join public.card_printings printing on printing.id=mapping.card_printing_id
  join public.card_prints card on card.id=printing.card_print_id
  join public.card_print_identity identity on identity.card_print_id=card.id and identity.is_active and identity.identity_domain='pokemon_jpn'
  join public.tcgcsv_source_products product on product.product_id::text=mapping.external_id and product.category_id=85
  join public.tcgcsv_source_groups source_group on source_group.group_id=product.group_id and source_group.category_id=85
  where mapping.source='tcgplayer' and mapping.active and mapping.external_id ~ '^[1-9][0-9]*$'
    and card.identity_domain='pokemon_jpn'
    and printing.is_provisional=false and printing.finish_key in ('normal','holo','reverse','foil')
    and public.normalize_tcgplayer_market_subtype_v1(mapping.meta->>'source_subtype')=printing.finish_key
    and product.source_active and product.catalog_metadata_status='current'
    and source_group.source_active and source_group.catalog_metadata_status='current'
    and not exists(select 1 from public.external_printing_mappings other where other.active and other.id<>mapping.id and other.card_printing_id=printing.id and ((other.source='tcgplayer' and other.external_id<>mapping.external_id) or (other.source='tcgplayer_market' and other.external_id<>mapping.external_id||':'||printing.finish_key)))
    and not exists(select 1 from public.external_printing_mappings other where other.active and other.id<>mapping.id and other.card_printing_id<>printing.id and ((other.source='tcgplayer_market' and other.external_id=mapping.external_id||':'||printing.finish_key) or (other.source='tcgplayer' and other.external_id=mapping.external_id and (public.normalize_tcgplayer_market_subtype_v1(other.meta->>'source_subtype') is null or public.normalize_tcgplayer_market_subtype_v1(other.meta->>'source_subtype')=printing.finish_key))))
    and not exists(select 1 from public.external_mappings other where other.source='tcgplayer' and other.active and (other.external_id=mapping.external_id and other.card_print_id<>card.id or other.card_print_id=card.id and other.external_id<>mapping.external_id))
)
select target.* from targets target
where 1=(select count(*) from public.card_print_identity identity where identity.card_print_id=target.card_print_id and identity.is_active)
and not exists(select 1 from public.card_printing_truth_reviews review where review.card_printing_id=target.card_printing_id and review.active and review.public_visibility in ('hidden_pending_review','hidden_unsupported'));

create or replace view public.v_cross_tcg_market_candidates_v2 with(security_invoker=true) as
with source_run as materialized (
  select * from public.tcgcsv_source_sync_runs where sync_mode='current_full_sync' and status='completed' and failed_count=0 and finished_at is not null order by finished_at desc,created_at desc,id desc limit 1
), observations as (
  select observation.*,source_run.sync_mode,source_run.status source_sync_status,
    source_run.finished_at source_sync_finished_at,source_run.failed_count source_sync_failed_count,
    source_run.artifact_hash source_run_artifact_hash,
    count(*) over(partition by observation.product_id,observation.subtype_name_normalized)::integer duplicate_product_row_count
  from public.tcgcsv_source_price_daily_observations observation join source_run on source_run.id=observation.last_seen_run_id and source_run.observed_on=observation.observed_on
  where observation.category_id in (68,85)
)
select
  (observation.id)::uuid as source_observation_id,
  (observation.last_seen_run_id)::uuid as source_sync_run_id,
  (observation.source_artifact_id)::uuid as source_artifact_id,
  (artifact.observed_on)::date as source_artifact_date,
  (artifact.sha256)::text as source_artifact_hash,
  (artifact.byte_size)::bigint as source_artifact_byte_size,
  (artifact.http_status)::integer as source_artifact_http_status,
  (observation.source_price_row_identity)::text as source_price_row_identity,
  (observation.payload_hash)::text as source_row_hash,
  (observation.product_id)::integer as source_product_id,
  (observation.category_id)::integer as category_id,
  (observation.group_id)::integer as group_id,
  (observation.subtype_name)::text as source_subtype_name,
  (observation.subtype_name_normalized)::text as subtype_name_normalized,
  (observation.observed_on)::date as source_observed_on,
  (observation.last_observed_at)::timestamp with time zone as source_last_observed_at,
  (observation.duplicate_product_row_count)::integer as duplicate_product_row_count,
  (observation.currency)::text as currency,
  (observation.low_price)::numeric as low_price,
  (observation.mid_price)::numeric as mid_price,
  (observation.high_price)::numeric as high_price,
  (observation.market_price)::numeric as market_price,
  (observation.direct_low_price)::numeric as direct_low_price,
  (product.name)::text as source_product_name,
  (product.source_active)::boolean as source_product_active,
  (product.catalog_metadata_status)::text as source_product_catalog_status,
  (product.extended_data)::jsonb as source_product_extended_data,
  (observation.sync_mode)::text as source_sync_mode,
  (observation.source_sync_status)::text as source_sync_status,
  (observation.source_sync_finished_at)::timestamp with time zone as source_sync_finished_at,
  (observation.source_sync_failed_count)::integer as source_sync_failed_count,
  (observation.source_run_artifact_hash)::text as source_run_artifact_hash,
  (public.normalize_tcgplayer_market_subtype_v1(observation.subtype_name))::text as normalized_finish_key,
  (binding.matches)::integer as source_mapping_count,
  (binding.matches)::integer as card_print_mapping_count,
  (binding.matches)::integer as card_printing_mapping_count,
  (binding.matches)::integer as identity_domain_count,
  (null::bigint)::bigint as source_mapping_id,
  (target.source_mapping_meta)::jsonb as source_mapping_meta,
  (target.card_print_id)::uuid as card_print_id,
  (target.gv_id)::text as gv_id,
  (target.card_rarity)::text as card_rarity,
  (target.identity_domain)::text as identity_domain,
  (target.card_printing_id)::uuid as card_printing_id,
  (target.printing_gv_id)::text as printing_gv_id,
  (target.finish_key)::text as finish_key,
  (null::uuid)::uuid as variant_assignment_id,
  (case when binding.matches=1 then 'exact_child_finish'::text end)::text as variant_assignment_status,
  (case when binding.matches=1 then 'CROSS_TCG_EXACT_FINISH_V2'::text end)::text as variant_assignment_version,
  (case when binding.matches=1 then 1::numeric end)::numeric as variant_assignment_confidence,
  (false)::boolean as has_printed_number_evidence,
  (case when binding.matches=1 then 'governed_cross_tcg_exact_finish_v2'::text end)::text as mapping_method,
  (case when binding.matches=1 then 1::numeric end)::numeric as mapping_confidence,
  (case when binding.matches=1 then 'exact_child_finish'::text end)::text as derived_variant_assignment_status,
  (false)::boolean as cosmos_finish_authority,
  (null::uuid)::uuid as edition_assignment_id,
  (null::uuid)::uuid as gym_edition_assignment_id,
  (null::uuid)::uuid as edition_binding_id,
  (null::text)::text as edition_assignment_sha256,
  (null::text)::text as edition_assignment_version,
  (null::jsonb)::jsonb as edition_assignment_payload,
  (false)::boolean as edition_assignment_required,
  (false)::boolean as edition_assignment_current,
  (null::text)::text as edition_source_sync_finished_at,
  (null::text)::text as printed_identity_modifier,
  (null::uuid)::uuid as mtg_printing_mapping_id,
  target.cross_tcg_source_mapping_id,target.cross_tcg_printing_mapping_id
from observations observation
left join public.tcgcsv_source_artifacts artifact on artifact.id=observation.source_artifact_id
left join public.tcgcsv_source_products product on product.product_id=observation.product_id
left join lateral (
  select count(*)::integer matches,
    case when count(*)=1 then jsonb_agg(to_jsonb(target))->0 end exact_target
  from public.v_cross_tcg_market_targets_v2 target
  where target.product_id=observation.product_id and target.category_id=observation.category_id and target.group_id=observation.group_id and target.finish_key=public.normalize_tcgplayer_market_subtype_v1(observation.subtype_name)
) binding on true
left join lateral jsonb_to_record(binding.exact_target) as target(
  product_id integer,category_id integer,group_id integer,
  card_print_id uuid,gv_id text,card_rarity text,identity_domain text,
  card_printing_id uuid,printing_gv_id text,finish_key text,
  cross_tcg_source_mapping_id bigint,cross_tcg_printing_mapping_id uuid,
  source_mapping_meta jsonb
) on true;

create or replace view public.v_tcgplayer_market_qualification_candidates_v8 with(security_invoker=true) as
select old.*,null::bigint cross_tcg_source_mapping_id,null::uuid cross_tcg_printing_mapping_id from public.v_tcgplayer_market_qualification_candidates_v7 old
union all select * from public.v_cross_tcg_market_candidates_v2;

create or replace function public.guard_cross_tcg_market_price_batch_v2()
returns trigger language plpgsql set search_path='' as $$
declare item jsonb; matched integer; candidate jsonb;
begin
  for item in select to_jsonb(incoming) from new_cross_tcg_price_rows incoming
    join public.tcgcsv_source_price_daily_observations source_row on source_row.id=incoming.source_observation_id
    where (source_row.category_id in (68,85) or incoming.cross_tcg_source_mapping_id is not null or incoming.cross_tcg_printing_mapping_id is not null)
      and (tg_table_name='market_price_publication_snapshots' or to_jsonb(incoming)->>'eligible'='true')
  loop
    if item->>'policy_version' is distinct from 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V2'
      or item->>'source_mapping_id' is not null or item->>'variant_assignment_id' is not null
      or item->>'edition_assignment_id' is not null or item->>'gym_edition_assignment_id' is not null
      or item->>'mtg_printing_mapping_id' is not null
      then raise exception 'cross_tcg_market_authority_invalid'; end if;
    select count(*) into matched from public.v_cross_tcg_market_candidates_v2 row
      where row.source_observation_id=(item->>'source_observation_id')::uuid
      and row.source_sync_run_id=(item->>'source_sync_run_id')::uuid
      and row.source_artifact_id=(item->>'source_artifact_id')::uuid
      and row.source_artifact_hash=item->>'source_artifact_hash'
      and row.source_row_hash=item->>'source_row_hash'
      and row.source_price_row_identity=item->>'source_price_row_identity'
      and row.source_product_id=(item->>'source_product_id')::integer
      and row.source_subtype_name=item->>'source_subtype_name'
      and row.cross_tcg_source_mapping_id is not distinct from (item->>'cross_tcg_source_mapping_id')::bigint
      and row.cross_tcg_printing_mapping_id is not distinct from (item->>'cross_tcg_printing_mapping_id')::uuid
      and row.card_print_id=(item->>'card_print_id')::uuid
      and row.card_printing_id=(item->>'card_printing_id')::uuid
      and row.gv_id=item->>'gv_id' and row.printing_gv_id=item->>'printing_gv_id'
      and row.finish_key=item->>'finish_key'
      and (tg_table_name<>'market_price_qualification_decisions' or
        (item->>'language_result'=case when row.category_id=85 then 'japanese' else 'english' end
          and item->>'mapping_method'='governed_cross_tcg_exact_finish_v2'
          and item->>'variant_assignment_status'='exact_child_finish'
          and item->>'variant_assignment_version'='CROSS_TCG_EXACT_FINISH_V2'))
      and row.currency='USD' and row.currency=item->>'currency'
      and row.market_price>0 and row.market_price=(item->>'market_price')::numeric
      and row.source_mapping_count=1 and row.card_printing_mapping_count=1
      and row.source_sync_finished_at<=now()+interval '6 minutes'
      and row.source_sync_finished_at>=now()-interval '36 hours';
    if matched<>1 then raise exception 'cross_tcg_market_source_changed'; end if;
    if tg_table_name='market_price_qualification_decisions' then
      select candidate_payload into candidate from public.market_price_pipeline_candidates row where row.id=(item->>'pipeline_candidate_id')::uuid and row.run_id=(item->>'run_id')::uuid and row.source_observation_id=(item->>'source_observation_id')::uuid;
      if candidate is null or candidate->>'card_printing_id' is distinct from item->>'card_printing_id'
        or candidate->>'cross_tcg_source_mapping_id' is distinct from item->>'cross_tcg_source_mapping_id'
        or candidate->>'cross_tcg_printing_mapping_id' is distinct from item->>'cross_tcg_printing_mapping_id'
        or candidate->>'source_row_hash' is distinct from item->>'source_row_hash'
        then raise exception 'cross_tcg_market_candidate_lineage_invalid'; end if;
    else
      select count(*) into matched from public.market_price_qualification_decisions row where row.id=(item->>'qualification_decision_id')::uuid and row.run_id=(item->>'run_id')::uuid and row.source_observation_id=(item->>'source_observation_id')::uuid and row.card_printing_id=(item->>'card_printing_id')::uuid
        and row.cross_tcg_source_mapping_id is not distinct from (item->>'cross_tcg_source_mapping_id')::bigint
        and row.cross_tcg_printing_mapping_id is not distinct from (item->>'cross_tcg_printing_mapping_id')::uuid
        and row.eligible and row.decision='publish' and row.publication_lane='current';
      if matched<>1 then raise exception 'cross_tcg_market_decision_lineage_invalid'; end if;
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists cross_tcg_market_price_guard_v2 on public.market_price_qualification_decisions;
create trigger cross_tcg_market_price_guard_v2 after insert on public.market_price_qualification_decisions
referencing new table as new_cross_tcg_price_rows for each statement execute function public.guard_cross_tcg_market_price_batch_v2();

drop trigger if exists cross_tcg_market_price_guard_v2 on public.market_price_publication_snapshots;
create trigger cross_tcg_market_price_guard_v2 after insert on public.market_price_publication_snapshots
referencing new table as new_cross_tcg_price_rows for each statement execute function public.guard_cross_tcg_market_price_batch_v2();
revoke all on public.v_cross_tcg_market_targets_v2 from public,anon,authenticated;
grant select on public.v_cross_tcg_market_targets_v2 to service_role;
revoke all on public.v_cross_tcg_market_candidates_v2 from public,anon,authenticated;
grant select on public.v_cross_tcg_market_candidates_v2 to service_role;
revoke all on public.v_tcgplayer_market_qualification_candidates_v8 from public,anon,authenticated;
grant select on public.v_tcgplayer_market_qualification_candidates_v8 to service_role;
revoke all on function public.guard_cross_tcg_market_price_batch_v2() from public,anon,authenticated;
commit;
