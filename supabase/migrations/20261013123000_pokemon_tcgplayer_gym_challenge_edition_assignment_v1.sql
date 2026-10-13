-- Exact Gym Challenge edition bindings for the four reviewed batch-02 rows.
-- This migration creates schema only. It inserts no catalog, binding,
-- assignment, qualification, snapshot, publication, or customer rows.
begin;

create table if not exists public.tcgplayer_gym_challenge_edition_bindings_v1 (
  id uuid primary key,
  contract_version text not null default 'TCGPLAYER_EXACT_EDITION_BINDING_TEMPLATE_V1'
    check (contract_version = 'TCGPLAYER_EXACT_EDITION_BINDING_TEMPLATE_V1'),
  source text not null default 'tcgplayer' check (source = 'tcgplayer'),
  category_id integer not null default 3 check (category_id = 3),
  group_id integer not null default 1440 check (group_id = 1440),
  product_id integer not null references public.tcgcsv_source_products(product_id) on delete restrict,
  source_subtype text not null check (source_subtype in ('1st Edition','Unlimited')),
  source_products_payload_sha256 text not null
    check (source_products_payload_sha256 ~ '^[a-f0-9]{64}$'),
  source_product_sha256 text not null check (source_product_sha256 ~ '^[a-f0-9]{64}$'),
  source_observation_id uuid not null
    references public.tcgcsv_source_price_daily_observations(id) on delete restrict,
  source_price_row_hash text not null check (source_price_row_hash ~ '^[a-f0-9]{64}$'),
  source_sync_run_id uuid not null references public.tcgcsv_source_sync_runs(id) on delete restrict,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  card_printing_id uuid not null references public.card_printings(id) on delete restrict,
  assigned_edition text not null check (assigned_edition in ('first_edition','unlimited')),
  assigned_finish_key text not null default 'normal' check (assigned_finish_key = 'normal'),
  authority_plan_fingerprint text not null
    check (authority_plan_fingerprint ~ '^[a-f0-9]{64}$'),
  state text not null default 'staged' check (state in ('staged','active','retired')),
  publishable boolean not null default false check (publishable = false),
  app_visible boolean not null default false check (app_visible = false),
  market_truth boolean not null default false check (market_truth = false),
  created_at timestamptz not null default now(),
  unique (source_observation_id),
  unique (product_id, source_subtype),
  unique (card_print_id),
  unique (card_printing_id)
);

create or replace function public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(
  binding_id uuid,
  require_active boolean default true
) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1
    from public.tcgplayer_gym_challenge_edition_bindings_v1 binding
    join public.tcgcsv_source_products product on product.product_id = binding.product_id
    join public.tcgcsv_source_price_daily_observations observation
      on observation.id = binding.source_observation_id
    join public.tcgcsv_source_sync_runs source_run on source_run.id = binding.source_sync_run_id
    join public.external_mappings mapping
      on mapping.source = 'tcgplayer' and mapping.external_id = binding.product_id::text
     and mapping.active
    join public.card_prints legacy on legacy.id = mapping.card_print_id
    join public.card_prints card on card.id = binding.card_print_id
    join public.sets card_set on card_set.id = card.set_id
    join public.card_print_identity identity
      on identity.card_print_id = card.id and identity.is_active
     and identity.identity_domain = 'pokemon_eng_standard'
    join public.card_printings printing
      on printing.id = binding.card_printing_id and printing.card_print_id = card.id
    where binding.id = pokemon_tcgplayer_gym_challenge_binding_valid_v1.binding_id
      and binding.state <> 'retired'
      and (not require_active or binding.state = 'active')
      and binding.source_products_payload_sha256 =
        'f2a97bb05a14091116a78d469b9282abbc58aa024a537d47391983312e3cdc59'
      and binding.authority_plan_fingerprint =
        'ced09a10c3194b404452b360a932e79b32e8e11c3c69d18989ca5f1f6d93e495'
      and product.category_id = 3 and product.group_id = 1440
      and product.source_active and product.catalog_metadata_status = 'current'
      and product.payload_hash = binding.source_product_sha256
      and observation.product_id = binding.product_id
      and observation.category_id = 3 and observation.group_id = 1440
      and observation.subtype_name = binding.source_subtype
      and observation.subtype_name_normalized = lower(binding.source_subtype)
      and observation.last_seen_run_id = binding.source_sync_run_id
      and observation.payload_hash = binding.source_price_row_hash
      and observation.currency = 'USD' and observation.market_price > 0
      and source_run.status = 'completed' and source_run.sync_mode = 'current_full_sync'
      and source_run.failed_count = 0 and source_run.finished_at is not null
      and legacy.set_code = 'gym2' and legacy.number = card.number
      and legacy.name = card.name and legacy.printed_identity_modifier is null
      and card_set.code = 'gym2' and card_set.game = 'pokemon'
      and card.set_code = 'gym2' and card.identity_domain = 'pokemon_eng_standard'
      and card.set_identity_model = 'standard' and coalesce(card.variant_key,'') = ''
      and card.printed_identity_modifier = 'edition:' || binding.assigned_edition
      and identity.set_code_identity = 'gym2'
      and identity.printed_number = card.number
      and identity.identity_key_version = 'pokemon_eng_standard:v1'
      and identity.identity_payload->>'variant_key_current' = 'edition:' || binding.assigned_edition
      and identity.identity_payload->>'printed_set_abbrev' = 'G2'
      and identity.identity_payload->>'printed_total' = '132'
      and printing.finish_key = 'normal' and printing.is_provisional = false
      and printing.printing_gv_id = card.gv_id || '-NORMAL'
      and printing.provenance_source = 'POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1'
      and printing.provenance_ref =
        'plan:ced09a10c3194b404452b360a932e79b32e8e11c3c69d18989ca5f1f6d93e495'
      and not exists (
        select 1 from public.card_printing_truth_reviews truth_review
        where truth_review.card_printing_id = printing.id and truth_review.active
          and truth_review.public_visibility in ('hidden_pending_review','hidden_unsupported')
      )
      and card.id <> all(array[
        '03208d73-8206-4780-aa45-c3735677cf99'::uuid,
        '47425cf5-146f-41e0-a770-e37c761ce1ef'::uuid,
        '895970ba-ed4c-4d00-91ce-db650563e126'::uuid,
        'a8c17fda-b5a7-46ab-a7c9-32284dfec54f'::uuid
      ])
      and (
        (binding.product_id = 85720 and binding.source_subtype = '1st Edition'
          and binding.source_observation_id = 'd24b4d1e-a73f-4a44-984d-cc94e1f05f28'::uuid
          and binding.source_sync_run_id = 'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
          and binding.source_product_sha256 = 'f9a6fefadabb32a1ba9cb5b357fa73603f58ce2444fb074d6878fa63df2f8589'
          and binding.source_price_row_hash = '54428d2fa2aeb3f0140d3297bd2a6ad1f2347b9b81e305c96c26f117a2b5fa71'
          and binding.assigned_edition = 'first_edition'
          and card.id = 'c75ade4f-0abf-5380-822a-5b3d3014bb96'::uuid
          and card.gv_id = 'GV-PK-G2-75-FIRST-EDITION'
          and printing.id = '9b1358e1-5ad1-56de-a224-8fcd2131bf87'::uuid)
        or (binding.product_id = 85720 and binding.source_subtype = 'Unlimited'
          and binding.source_observation_id = 'b208701e-5378-4a72-915f-403db492e011'::uuid
          and binding.source_sync_run_id = 'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
          and binding.source_product_sha256 = 'f9a6fefadabb32a1ba9cb5b357fa73603f58ce2444fb074d6878fa63df2f8589'
          and binding.source_price_row_hash = '39c210469441c8222090c823b30749d0ac79574788b79fe477e8c46e33d1defe'
          and binding.assigned_edition = 'unlimited'
          and card.id = '8c1fe8e6-b3a6-5727-971b-fa1629d5d635'::uuid
          and card.gv_id = 'GV-PK-G2-75-UNLIMITED'
          and printing.id = '28040606-5e98-50dd-969f-3273a6345b9f'::uuid)
        or (binding.product_id = 85721 and binding.source_subtype = '1st Edition'
          and binding.source_observation_id = 'ce7b33ab-299d-4ee3-914b-161100ab1aa6'::uuid
          and binding.source_sync_run_id = 'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
          and binding.source_product_sha256 = 'f4ce84f6a2a327a11c1bcd223601e5681770d154aa2e51574ec47c67cfdf7511'
          and binding.source_price_row_hash = 'b0831080d3cb31ea7a271f731edd102b2236f2eb8848b638e45144e7a59a6598'
          and binding.assigned_edition = 'first_edition'
          and card.id = 'bd623537-374a-5526-bb24-fcc14022c6e9'::uuid
          and card.gv_id = 'GV-PK-G2-76-FIRST-EDITION'
          and printing.id = '47e6ad7c-a0b5-579e-86d6-fd16245e46c1'::uuid)
        or (binding.product_id = 85721 and binding.source_subtype = 'Unlimited'
          and binding.source_observation_id = '6febacee-1bcd-4592-aedf-f478a7a94d97'::uuid
          and binding.source_sync_run_id = 'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
          and binding.source_product_sha256 = 'f4ce84f6a2a327a11c1bcd223601e5681770d154aa2e51574ec47c67cfdf7511'
          and binding.source_price_row_hash = 'f62a49c7d5a69efd1bb4c634438779ecaa92a0a82e6c95b689f56fe33361f80a'
          and binding.assigned_edition = 'unlimited'
          and card.id = 'a5923fb0-b9b1-50d7-9494-3c229e20f7a4'::uuid
          and card.gv_id = 'GV-PK-G2-76-UNLIMITED'
          and printing.id = '3d71caeb-2742-52f2-8e28-406ddb2a8a26'::uuid)
      )
  );
$$;

create or replace function public.guard_pokemon_tcgplayer_gym_challenge_binding_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'gym_challenge_edition_binding_is_append_only'; end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'state') is distinct from (to_jsonb(old) - 'state') then
      raise exception 'gym_challenge_edition_binding_is_immutable';
    end if;
    if old.state = 'retired' and new.state <> 'retired' then
      raise exception 'retired_gym_challenge_binding_cannot_reactivate';
    end if;
    if old.state = 'active' and new.state = 'staged' then
      raise exception 'active_gym_challenge_binding_requires_retirement';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_pokemon_tcgplayer_gym_challenge_binding_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.state <> 'retired' and
     not public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(new.id,new.state='active') then
    raise exception 'invalid_gym_challenge_edition_binding';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_pokemon_tcgplayer_gym_challenge_binding_v1
  on public.tcgplayer_gym_challenge_edition_bindings_v1;
create trigger guard_pokemon_tcgplayer_gym_challenge_binding_v1
  before update or delete on public.tcgplayer_gym_challenge_edition_bindings_v1
  for each row execute function public.guard_pokemon_tcgplayer_gym_challenge_binding_v1();
drop trigger if exists validate_pokemon_tcgplayer_gym_challenge_binding_v1
  on public.tcgplayer_gym_challenge_edition_bindings_v1;
create trigger validate_pokemon_tcgplayer_gym_challenge_binding_v1
  after insert or update on public.tcgplayer_gym_challenge_edition_bindings_v1
  for each row execute function public.validate_pokemon_tcgplayer_gym_challenge_binding_v1();

create table if not exists public.tcgplayer_gym_challenge_edition_assignments_v1 (
  id uuid primary key default gen_random_uuid(),
  source_observation_id uuid not null
    references public.tcgcsv_source_price_daily_observations(id) on delete restrict,
  source_sync_run_id uuid not null references public.tcgcsv_source_sync_runs(id) on delete restrict,
  binding_id uuid not null
    references public.tcgplayer_gym_challenge_edition_bindings_v1(id) on delete restrict,
  assignment_version text not null default 'TCGPLAYER_GYM_CHALLENGE_EDITION_ASSIGNMENT_V1'
    check (assignment_version = 'TCGPLAYER_GYM_CHALLENGE_EDITION_ASSIGNMENT_V1'),
  assignment_payload jsonb not null,
  assignment_sha256 text not null unique
    check (assignment_sha256 = encode(extensions.digest(assignment_payload::text,'sha256'),'hex')),
  created_at timestamptz not null default now()
);

create or replace view public.v_tcgplayer_gym_challenge_edition_assignment_candidates_v1
with (security_invoker = true) as
with source_run as materialized (
  select run.* from public.tcgcsv_source_sync_runs run
  where run.sync_mode='current_full_sync' and run.status='completed'
    and run.failed_count=0 and run.finished_at is not null
  order by run.finished_at desc,run.created_at desc,run.id desc limit 1
), observations as (
  select observation.*,
    count(*) over (partition by observation.product_id,
      lower(btrim(regexp_replace(observation.subtype_name,'[[:space:]]+',' ','g'))))
      as duplicate_count
  from public.tcgcsv_source_price_daily_observations observation
  join source_run run on run.id=observation.last_seen_run_id
    and run.observed_on=observation.observed_on
)
select observation.id as source_observation_id,
  source_run.id as source_sync_run_id,
  binding.id as binding_id,
  jsonb_build_object(
    'version','TCGPLAYER_GYM_CHALLENGE_EDITION_ASSIGNMENT_V1',
    'source',jsonb_build_object(
      'observation_id',observation.id,'sync_run_id',source_run.id,
      'run_artifact_hash',source_run.artifact_hash,
      'sync_finished_at_epoch',extract(epoch from source_run.finished_at),
      'observed_on',observation.observed_on,
      'last_observed_at_epoch',extract(epoch from observation.last_observed_at),
      'price_row_identity',observation.source_price_row_identity,
      'row_hash',observation.payload_hash,'raw_payload',observation.raw_payload,
      'artifact_id',artifact.id,'artifact_hash',artifact.sha256,
      'artifact_byte_size',artifact.byte_size,'artifact_observed_on',artifact.observed_on,
      'product_id',observation.product_id,'product_hash',product.payload_hash,
      'category_id',observation.category_id,'group_id',observation.group_id,
      'subtype',observation.subtype_name,'currency',observation.currency,
      'market_price',observation.market_price,'low_price',observation.low_price,
      'mid_price',observation.mid_price,'high_price',observation.high_price,
      'direct_low_price',observation.direct_low_price),
    'binding',jsonb_build_object(
      'id',binding.id,'authority_plan_fingerprint',binding.authority_plan_fingerprint,
      'source_products_payload_sha256',binding.source_products_payload_sha256),
    'canonical',jsonb_build_object(
      'legacy_card_print_id',legacy.id,'card_print_id',card.id,'gv_id',card.gv_id,
      'card_printing_id',printing.id,'printing_gv_id',printing.printing_gv_id,
      'edition',binding.assigned_edition,'finish_key',binding.assigned_finish_key,
      'printed_identity_modifier',card.printed_identity_modifier)
  ) as assignment_payload
from public.tcgplayer_gym_challenge_edition_bindings_v1 binding
join observations observation on observation.product_id=binding.product_id
  and observation.subtype_name=binding.source_subtype
join source_run on source_run.id=observation.last_seen_run_id
join public.tcgcsv_source_products product on product.product_id = binding.product_id
join public.tcgcsv_source_artifacts artifact on artifact.id = observation.source_artifact_id
join public.external_mappings mapping
  on mapping.source='tcgplayer' and mapping.external_id=binding.product_id::text and mapping.active
join public.card_prints legacy on legacy.id = mapping.card_print_id
join public.card_prints card on card.id = binding.card_print_id
join public.card_printings printing on printing.id = binding.card_printing_id
where binding.state = 'active'
  and public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(binding.id,true)
  and observation.duplicate_count=1
  and observation.category_id=3 and observation.group_id=1440
  and observation.subtype_name_normalized=lower(binding.source_subtype)
  and observation.currency='USD' and observation.market_price>0
  and observation.market_price::text not in ('NaN','Infinity','-Infinity')
  and length(btrim(observation.source_price_row_identity))>0
  and observation.payload_hash ~ '^[a-f0-9]{64}$'
  and source_run.artifact_hash ~ '^[a-f0-9]{64}$'
  and source_run.finished_at>=now()-interval '36 hours'
  and source_run.finished_at<=now()+interval '6 minutes'
  and artifact.sync_run_id=source_run.id and artifact.run_key=source_run.run_key
  and artifact.artifact_kind='prices'
  and (artifact.observed_on is null or artifact.observed_on=observation.observed_on)
  and artifact.category_id=3 and artifact.group_id=1440
  and artifact.http_status=200 and artifact.byte_size>0
  and artifact.sha256 ~ '^[a-f0-9]{64}$';

create or replace view public.v_tcgplayer_gym_challenge_edition_assignment_candidates_hashed_v1
with (security_invoker = true) as
select candidate.*,
  encode(extensions.digest(candidate.assignment_payload::text,'sha256'),'hex') as assignment_sha256
from public.v_tcgplayer_gym_challenge_edition_assignment_candidates_v1 candidate;

create or replace function public.guard_tcgplayer_gym_challenge_edition_assignment_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then raise exception 'gym_challenge_edition_assignment_is_immutable'; end if;
  if not exists (
    select 1 from public.v_tcgplayer_gym_challenge_edition_assignment_candidates_hashed_v1 candidate
    where candidate.source_observation_id=new.source_observation_id
      and candidate.source_sync_run_id=new.source_sync_run_id
      and candidate.binding_id=new.binding_id
      and candidate.assignment_payload=new.assignment_payload
      and candidate.assignment_sha256=new.assignment_sha256
  ) then raise exception 'gym_challenge_edition_assignment_evidence_changed'; end if;
  return new;
end;
$$;

drop trigger if exists guard_tcgplayer_gym_challenge_edition_assignment_v1
  on public.tcgplayer_gym_challenge_edition_assignments_v1;
create trigger guard_tcgplayer_gym_challenge_edition_assignment_v1
  before insert or update or delete on public.tcgplayer_gym_challenge_edition_assignments_v1
  for each row execute function public.guard_tcgplayer_gym_challenge_edition_assignment_v1();

create or replace function public.prepare_tcgplayer_gym_challenge_edition_assignments_v1(
  p_source_sync_run_id uuid
) returns integer language plpgsql set search_path = '' as $$
declare inserted_count integer;
begin
  if p_source_sync_run_id is null then
    raise exception 'gym_challenge_edition_assignment_source_run_required';
  end if;
  if p_source_sync_run_id is distinct from (
    select run.id from public.tcgcsv_source_sync_runs run
    where run.sync_mode='current_full_sync' and run.status='completed'
      and run.failed_count=0 and run.finished_at is not null
    order by run.finished_at desc,run.created_at desc,run.id desc limit 1
  ) then raise exception 'gym_challenge_edition_assignment_source_run_changed'; end if;
  insert into public.tcgplayer_gym_challenge_edition_assignments_v1
    (source_observation_id,source_sync_run_id,binding_id,assignment_payload,assignment_sha256)
  select candidate.source_observation_id,candidate.source_sync_run_id,candidate.binding_id,
    candidate.assignment_payload,candidate.assignment_sha256
  from public.v_tcgplayer_gym_challenge_edition_assignment_candidates_hashed_v1 candidate
  where candidate.source_sync_run_id=p_source_sync_run_id
  on conflict (assignment_sha256) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace view public.v_tcgplayer_gym_challenge_edition_current_assignments_v1
with (security_invoker = true) as
select assignment.*,false as publishable
from public.tcgplayer_gym_challenge_edition_assignments_v1 assignment
join public.v_tcgplayer_gym_challenge_edition_assignment_candidates_hashed_v1 candidate
  on candidate.source_observation_id=assignment.source_observation_id
 and candidate.source_sync_run_id=assignment.source_sync_run_id
 and candidate.binding_id=assignment.binding_id
 and candidate.assignment_sha256=assignment.assignment_sha256
 and candidate.assignment_payload=assignment.assignment_payload;

alter table public.market_price_pipeline_candidates add column if not exists
  gym_edition_assignment_id uuid references
  public.tcgplayer_gym_challenge_edition_assignments_v1(id) on delete restrict;
alter table public.market_price_qualification_decisions add column if not exists
  gym_edition_assignment_id uuid references
  public.tcgplayer_gym_challenge_edition_assignments_v1(id) on delete restrict;
alter table public.market_price_publication_snapshots add column if not exists
  gym_edition_assignment_id uuid references
  public.tcgplayer_gym_challenge_edition_assignments_v1(id) on delete restrict;

alter table public.market_price_publication_snapshots
  drop constraint if exists market_price_snapshot_assignment_lane_v1;
alter table public.market_price_publication_snapshots
  add constraint market_price_snapshot_assignment_lane_v1 check (
    (edition_assignment_id is null and gym_edition_assignment_id is null
      and source_mapping_id is not null and variant_assignment_id is not null)
    or (edition_assignment_id is not null and gym_edition_assignment_id is null
      and source_mapping_id is null and variant_assignment_id is null)
    or (edition_assignment_id is null and gym_edition_assignment_id is not null
      and source_mapping_id is null and variant_assignment_id is null)
  );

create or replace view public.v_tcgplayer_market_qualification_candidates_v4
with (security_invoker = true) as
select candidate.source_observation_id,candidate.source_sync_run_id,
  candidate.source_artifact_id,candidate.source_artifact_date,candidate.source_artifact_hash,
  candidate.source_artifact_byte_size,candidate.source_artifact_http_status,
  candidate.source_price_row_identity,candidate.source_row_hash,candidate.source_product_id,
  candidate.category_id,candidate.group_id,candidate.source_subtype_name,
  candidate.subtype_name_normalized,candidate.source_observed_on,
  candidate.source_last_observed_at,candidate.duplicate_product_row_count,candidate.currency,
  candidate.low_price,candidate.mid_price,candidate.high_price,candidate.market_price,
  candidate.direct_low_price,candidate.source_product_name,candidate.source_product_active,
  candidate.source_product_catalog_status,candidate.source_product_extended_data,
  candidate.source_sync_mode,candidate.source_sync_status,candidate.source_sync_finished_at,
  candidate.source_sync_failed_count,candidate.source_run_artifact_hash,
  case when gym.id is not null then gym.assignment_payload#>>'{canonical,finish_key}'
    else candidate.normalized_finish_key end as normalized_finish_key,
  case when gym.id is not null then 1 else candidate.source_mapping_count end as source_mapping_count,
  case when gym.id is not null then 1 else candidate.card_print_mapping_count end as card_print_mapping_count,
  case when gym.id is not null then 1 else candidate.card_printing_mapping_count end as card_printing_mapping_count,
  case when gym.id is not null then 1 else candidate.identity_domain_count end as identity_domain_count,
  case when gym.id is not null then null else candidate.source_mapping_id end as source_mapping_id,
  case when gym.id is not null then null else candidate.source_mapping_meta end as source_mapping_meta,
  case when gym.id is not null then (gym.assignment_payload#>>'{canonical,card_print_id}')::uuid
    else candidate.card_print_id end as card_print_id,
  case when gym.id is not null then gym.assignment_payload#>>'{canonical,gv_id}'
    else candidate.gv_id end as gv_id,
  candidate.card_rarity,
  case when gym.id is not null then 'pokemon_eng_standard' else candidate.identity_domain end as identity_domain,
  case when gym.id is not null then (gym.assignment_payload#>>'{canonical,card_printing_id}')::uuid
    else candidate.card_printing_id end as card_printing_id,
  case when gym.id is not null then gym.assignment_payload#>>'{canonical,printing_gv_id}'
    else candidate.printing_gv_id end as printing_gv_id,
  case when gym.id is not null then gym.assignment_payload#>>'{canonical,finish_key}'
    else candidate.finish_key end as finish_key,
  case when gym.id is not null then null else candidate.variant_assignment_id end as variant_assignment_id,
  case when gym.id is not null then 'exact_child_finish' else candidate.variant_assignment_status end as variant_assignment_status,
  case when gym.id is not null then gym.assignment_version else candidate.variant_assignment_version end as variant_assignment_version,
  case when gym.id is not null then 1::numeric else candidate.variant_assignment_confidence end as variant_assignment_confidence,
  candidate.has_printed_number_evidence,
  case when gym.id is not null then 'gym_challenge_edition_binding_v1' else candidate.mapping_method end as mapping_method,
  case when gym.id is not null then 1::numeric else candidate.mapping_confidence end as mapping_confidence,
  case when gym.id is not null then 'exact_child_finish' else candidate.derived_variant_assignment_status end as derived_variant_assignment_status,
  case when gym.id is not null then false else candidate.cosmos_finish_authority end as cosmos_finish_authority,
  candidate.edition_assignment_id,
  gym.id as gym_edition_assignment_id,
  case when gym.id is not null then gym.binding_id else candidate.edition_binding_id end as edition_binding_id,
  case when gym.id is not null then gym.assignment_sha256 else candidate.edition_assignment_sha256 end as edition_assignment_sha256,
  case when gym.id is not null then gym.assignment_version else candidate.edition_assignment_version end as edition_assignment_version,
  case when gym.id is not null then gym.assignment_payload else candidate.edition_assignment_payload end as edition_assignment_payload,
  candidate.edition_assignment_required,
  case when gym.id is not null then true else candidate.edition_assignment_current end as edition_assignment_current,
  case when gym.id is not null then candidate.source_sync_finished_at::text
    else candidate.edition_source_sync_finished_at end as edition_source_sync_finished_at,
  case when gym.id is not null then gym.assignment_payload#>>'{canonical,printed_identity_modifier}'
    else candidate.printed_identity_modifier end as printed_identity_modifier
from public.v_tcgplayer_market_qualification_candidates_v3 candidate
left join public.v_tcgplayer_gym_challenge_edition_current_assignments_v1 gym
  on gym.source_observation_id=candidate.source_observation_id
 and gym.source_sync_run_id=candidate.source_sync_run_id;

create or replace function public.pokemon_tcgplayer_gym_challenge_price_row_valid_v1(
  row_data jsonb
) returns boolean language plpgsql stable set search_path = '' as $$
declare frozen jsonb; expected record; field_name text;
begin
  if row_data->>'gym_edition_assignment_id' is null
     or row_data->>'edition_assignment_id' is not null then return false; end if;
  select assignment.assignment_payload into frozen
  from public.v_tcgplayer_gym_challenge_edition_current_assignments_v1 assignment
  where assignment.id=(row_data->>'gym_edition_assignment_id')::uuid;
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

-- Preserve the installed Jungle validator under a restricted name, then keep
-- its public compatibility entry point as a dispatcher for both FK lanes.
create or replace function public.jungle_edition_price_row_restricted_valid_v1(row_data jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare frozen jsonb; expected record; field_name text;
begin
  if row_data->>'edition_assignment_id' is null
     or row_data->>'gym_edition_assignment_id' is not null then return false; end if;
  select assignment.assignment_payload into frozen
  from public.v_tcgplayer_jungle_edition_current_assignments_v1 assignment
  where assignment.id=(row_data->>'edition_assignment_id')::uuid;
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

create or replace function public.jungle_edition_price_row_valid_v1(row_data jsonb)
returns boolean language sql stable set search_path = '' as $$
  select case
    when row_data->>'gym_edition_assignment_id' is not null
      then public.pokemon_tcgplayer_gym_challenge_price_row_valid_v1(row_data)
    else public.jungle_edition_price_row_restricted_valid_v1(row_data)
  end;
$$;

-- Reinstall every current-price reader so a Gym snapshot is revalidated after
-- its exact binding or assignment stops being current.
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
    and (case when snapshot.gym_edition_assignment_id is not null
      or snapshot.edition_assignment_id is not null or exists (
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
      and (case when snapshot.gym_edition_assignment_id is not null
      or snapshot.edition_assignment_id is not null or exists (
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
      and (case when snapshot.gym_edition_assignment_id is not null
      or snapshot.edition_assignment_id is not null or exists (
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

create or replace function public.guard_jungle_edition_price_batch_v1()
returns trigger language plpgsql set search_path = '' as $$
declare row_data jsonb; matched boolean;
begin
  for row_data in
    select to_jsonb(incoming)
    from new_edition_price_rows incoming
    join public.tcgcsv_source_price_daily_observations observation
      on observation.id=incoming.source_observation_id
    left join public.card_prints card on card.id=incoming.card_print_id
    where (tg_table_name='market_price_publication_snapshots'
      or to_jsonb(incoming)->>'eligible'='true')
      and (incoming.edition_assignment_id is not null
        or incoming.gym_edition_assignment_id is not null
        or (observation.category_id=3 and observation.subtype_name ~* '\m(edition|unlimited)\M')
        or coalesce(card.printed_identity_modifier,'') like 'edition:%'
        or exists(select 1 from public.jungle_edition_identity_links_v1 link
          where link.state in ('active','retired')
            and incoming.card_print_id in (link.legacy_card_print_id,link.card_print_id)))
  loop
    if row_data->>'policy_version'<>'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3'
      or not public.jungle_edition_price_row_valid_v1(row_data) then
      raise exception 'edition_price_assignment_invalid';
    end if;
    if tg_table_name='market_price_qualification_decisions' then
      select exists(select 1 from public.market_price_pipeline_candidates candidate
        where candidate.id=(row_data->>'pipeline_candidate_id')::uuid
          and candidate.run_id=(row_data->>'run_id')::uuid
          and candidate.edition_assignment_id is not distinct from
            (row_data->>'edition_assignment_id')::uuid
          and candidate.gym_edition_assignment_id is not distinct from
            (row_data->>'gym_edition_assignment_id')::uuid
          and candidate.source_observation_id=(row_data->>'source_observation_id')::uuid
          and public.jungle_edition_price_row_valid_v1(candidate.candidate_payload)) into matched;
    else
      select exists(select 1 from public.market_price_qualification_decisions qualified
        where qualified.id=(row_data->>'qualification_decision_id')::uuid
          and qualified.run_id=(row_data->>'run_id')::uuid
          and qualified.edition_assignment_id is not distinct from
            (row_data->>'edition_assignment_id')::uuid
          and qualified.gym_edition_assignment_id is not distinct from
            (row_data->>'gym_edition_assignment_id')::uuid
          and qualified.eligible and qualified.decision='publish'
          and qualified.publication_lane='current'
          and public.jungle_edition_price_row_valid_v1(to_jsonb(qualified))) into matched;
    end if;
    if not matched then raise exception 'edition_price_lineage_invalid'; end if;
  end loop;
  return null;
end;
$$;

alter table public.tcgplayer_gym_challenge_edition_bindings_v1 enable row level security;
alter table public.tcgplayer_gym_challenge_edition_assignments_v1 enable row level security;
revoke all on public.tcgplayer_gym_challenge_edition_bindings_v1,
  public.tcgplayer_gym_challenge_edition_assignments_v1,
  public.v_tcgplayer_gym_challenge_edition_assignment_candidates_v1,
  public.v_tcgplayer_gym_challenge_edition_assignment_candidates_hashed_v1,
  public.v_tcgplayer_gym_challenge_edition_current_assignments_v1,
  public.v_tcgplayer_market_qualification_candidates_v4
  from public,anon,authenticated,service_role;
grant select,insert on public.tcgplayer_gym_challenge_edition_bindings_v1,
  public.tcgplayer_gym_challenge_edition_assignments_v1 to service_role;
grant update(state) on public.tcgplayer_gym_challenge_edition_bindings_v1 to service_role;
grant select on public.v_tcgplayer_gym_challenge_edition_assignment_candidates_v1,
  public.v_tcgplayer_gym_challenge_edition_assignment_candidates_hashed_v1,
  public.v_tcgplayer_gym_challenge_edition_current_assignments_v1,
  public.v_tcgplayer_market_qualification_candidates_v4 to service_role;
revoke all on function public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(uuid,boolean),
  public.pokemon_tcgplayer_gym_challenge_price_row_valid_v1(jsonb),
  public.jungle_edition_price_row_restricted_valid_v1(jsonb),
  public.guard_pokemon_tcgplayer_gym_challenge_binding_v1(),
  public.validate_pokemon_tcgplayer_gym_challenge_binding_v1(),
  public.guard_tcgplayer_gym_challenge_edition_assignment_v1(),
  public.prepare_tcgplayer_gym_challenge_edition_assignments_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(uuid,boolean),
  public.pokemon_tcgplayer_gym_challenge_price_row_valid_v1(jsonb),
  public.jungle_edition_price_row_restricted_valid_v1(jsonb),
  public.guard_pokemon_tcgplayer_gym_challenge_binding_v1(),
  public.validate_pokemon_tcgplayer_gym_challenge_binding_v1(),
  public.guard_tcgplayer_gym_challenge_edition_assignment_v1(),
  public.prepare_tcgplayer_gym_challenge_edition_assignments_v1(uuid)
  to service_role;

comment on view public.v_tcgplayer_market_qualification_candidates_v4 is
  'V3 plus the four exact evidence-bound Gym Challenge First Edition/Unlimited assignments; Jungle remains in its original restricted ledger.';

notify pgrst, 'reload schema';
commit;
