-- TCGPLAYER_MARKET_PUBLICATION_V1
-- Production V1 publishes the exact TCGPlayer marketPrice for qualified
-- English Pokemon printings. It never calculates a Grookai Value.

begin;

create or replace function public.normalize_tcgplayer_market_subtype_v1(raw_subtype text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(btrim(coalesce(raw_subtype, '')))
    when 'normal' then 'normal'
    when 'holofoil' then 'holo'
    when 'reverse holofoil' then 'reverse'
    else null
  end;
$$;

comment on function public.normalize_tcgplayer_market_subtype_v1(text) is
  'Maps only unambiguous ordinary TCGPlayer price subtypes to canonical finish keys. Edition and special-finish subtypes intentionally abstain.';

create table if not exists public.market_price_qualification_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_key text not null unique,
  run_key text not null,
  policy_version text not null,
  source_name text not null default 'tcgplayer',
  source_observation_id uuid not null
    references public.tcgcsv_source_price_daily_observations(id) on delete restrict,
  source_sync_run_id uuid
    references public.tcgcsv_source_sync_runs(id) on delete restrict,
  card_print_id uuid references public.card_prints(id) on delete restrict,
  card_printing_id uuid references public.card_printings(id) on delete restrict,
  gv_id text,
  printing_gv_id text,
  finish_key text,
  source_product_id integer not null,
  source_subtype_name text not null,
  source_observed_on date not null,
  source_sync_finished_at timestamptz,
  currency text,
  market_price numeric,
  decision text not null,
  eligible boolean not null,
  reason_codes text[] not null default '{}'::text[],
  evidence jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  constraint market_price_qualification_decisions_source_check
    check (source_name = 'tcgplayer'),
  constraint market_price_qualification_decisions_decision_check
    check (decision in ('publish', 'quarantine')),
  constraint market_price_qualification_decisions_eligibility_check
    check (
      (decision = 'publish' and eligible = true and cardinality(reason_codes) = 0)
      or
      (decision = 'quarantine' and eligible = false and cardinality(reason_codes) > 0)
    )
);

create index if not exists market_price_qualification_run_idx
  on public.market_price_qualification_decisions(run_key, decided_at desc);

create index if not exists market_price_qualification_printing_idx
  on public.market_price_qualification_decisions(card_printing_id, decided_at desc, id desc)
  where card_printing_id is not null;

create index if not exists market_price_qualification_source_idx
  on public.market_price_qualification_decisions(source_observation_id, policy_version);

create index if not exists market_price_qualification_reasons_idx
  on public.market_price_qualification_decisions using gin(reason_codes);

create table if not exists public.market_price_publication_snapshots (
  id uuid primary key default gen_random_uuid(),
  provenance_id uuid not null default gen_random_uuid() unique,
  qualification_decision_id uuid not null
    references public.market_price_qualification_decisions(id) on delete restrict,
  policy_version text not null,
  source_name text not null default 'tcgplayer',
  source_label text not null default 'TCGPlayer Market',
  source_observation_id uuid not null
    references public.tcgcsv_source_price_daily_observations(id) on delete restrict,
  source_sync_run_id uuid not null
    references public.tcgcsv_source_sync_runs(id) on delete restrict,
  source_artifact_id uuid
    references public.tcgcsv_source_artifacts(id) on delete restrict,
  source_payload_hash text not null,
  source_price_row_identity text not null,
  source_product_id integer not null,
  source_subtype_name text not null,
  source_observed_on date not null,
  source_sync_finished_at timestamptz not null,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  card_printing_id uuid not null references public.card_printings(id) on delete restrict,
  gv_id text not null,
  printing_gv_id text not null,
  finish_key text not null,
  currency text not null,
  market_price numeric not null,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  direct_low_price numeric,
  published_at timestamptz not null default now(),
  constraint market_price_publication_source_check
    check (source_name = 'tcgplayer' and source_label = 'TCGPlayer Market'),
  constraint market_price_publication_currency_check check (currency = 'USD'),
  constraint market_price_publication_market_price_check check (market_price > 0),
  constraint market_price_publication_supporting_prices_check check (
    (low_price is null or low_price >= 0)
    and (mid_price is null or mid_price >= 0)
    and (high_price is null or high_price >= 0)
    and (direct_low_price is null or direct_low_price >= 0)
  ),
  constraint market_price_publication_source_printing_policy_key unique (
    source_observation_id,
    card_printing_id,
    policy_version
  )
);

create index if not exists market_price_publication_printing_current_idx
  on public.market_price_publication_snapshots(card_printing_id, source_sync_finished_at desc, published_at desc);

create index if not exists market_price_publication_card_current_idx
  on public.market_price_publication_snapshots(card_print_id, source_sync_finished_at desc, published_at desc);

create index if not exists market_price_publication_history_idx
  on public.market_price_publication_snapshots(card_printing_id, source_observed_on desc, published_at desc);

create or replace function public.market_price_append_only_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists market_price_qualification_append_only_guard
  on public.market_price_qualification_decisions;
create trigger market_price_qualification_append_only_guard
  before update or delete on public.market_price_qualification_decisions
  for each row execute function public.market_price_append_only_guard_v1();

drop trigger if exists market_price_publication_append_only_guard
  on public.market_price_publication_snapshots;
create trigger market_price_publication_append_only_guard
  before update or delete on public.market_price_publication_snapshots
  for each row execute function public.market_price_append_only_guard_v1();

create or replace view public.v_tcgplayer_market_qualification_candidates_v1 as
with latest_observations as (
  select ranked.*
  from (
    select
      observation.*,
      row_number() over (
        partition by observation.source_price_row_identity
        order by observation.observed_on desc, observation.updated_at desc, observation.id desc
      ) as observation_rank
    from public.tcgcsv_source_price_daily_observations observation
    where observation.category_id = 3
  ) ranked
  where ranked.observation_rank = 1
),
canonical_source_mappings as (
  select distinct
    cp.id as card_print_id,
    cp.tcgplayer_id as source_product_id
  from public.card_prints cp
  where nullif(btrim(cp.tcgplayer_id), '') is not null

  union

  select distinct
    mapping.card_print_id,
    mapping.external_id as source_product_id
  from public.external_mappings mapping
  where mapping.source = 'tcgplayer'
    and mapping.active = true
    and nullif(btrim(mapping.external_id), '') is not null
),
mapped as (
  select
    observation.id as source_observation_id,
    observation.last_seen_run_id as source_sync_run_id,
    observation.source_artifact_id,
    observation.source_price_row_identity,
    observation.payload_hash as source_payload_hash,
    observation.product_id as source_product_id,
    observation.category_id,
    observation.group_id,
    observation.subtype_name as source_subtype_name,
    observation.subtype_name_normalized,
    observation.observed_on as source_observed_on,
    observation.currency,
    observation.low_price,
    observation.mid_price,
    observation.high_price,
    observation.market_price,
    observation.direct_low_price,
    product.name as source_product_name,
    product.source_active as source_product_active,
    product.catalog_metadata_status as source_product_catalog_status,
    product.extended_data as source_product_extended_data,
    sync_run.sync_mode as source_sync_mode,
    sync_run.status as source_sync_status,
    sync_run.finished_at as source_sync_finished_at,
    source_mapping.card_print_id,
    card.gv_id,
    card.rarity as card_rarity,
    identity.identity_domain,
    public.normalize_tcgplayer_market_subtype_v1(observation.subtype_name) as normalized_finish_key,
    printing.id as card_printing_id,
    printing.printing_gv_id,
    printing.finish_key
  from latest_observations observation
  left join public.tcgcsv_source_products product
    on product.product_id = observation.product_id
  left join public.tcgcsv_source_sync_runs sync_run
    on sync_run.id = observation.last_seen_run_id
  left join canonical_source_mappings source_mapping
    on source_mapping.source_product_id = observation.product_id::text
  left join public.card_prints card
    on card.id = source_mapping.card_print_id
  left join public.card_print_identity identity
    on identity.card_print_id = card.id
   and identity.is_active = true
  left join public.card_printings printing
    on printing.card_print_id = card.id
   and printing.finish_key = public.normalize_tcgplayer_market_subtype_v1(observation.subtype_name)
),
summarized as (
  select
    source_observation_id,
    source_sync_run_id,
    source_artifact_id,
    source_price_row_identity,
    source_payload_hash,
    source_product_id,
    category_id,
    group_id,
    source_subtype_name,
    subtype_name_normalized,
    source_observed_on,
    currency,
    low_price,
    mid_price,
    high_price,
    market_price,
    direct_low_price,
    source_product_name,
    source_product_active,
    source_product_catalog_status,
    source_product_extended_data,
    source_sync_mode,
    source_sync_status,
    source_sync_finished_at,
    normalized_finish_key,
    count(distinct card_print_id)::integer as card_print_mapping_count,
    count(distinct card_printing_id)::integer as card_printing_mapping_count,
    count(distinct identity_domain) filter (where identity_domain is not null)::integer as identity_domain_count,
    (array_agg(distinct card_print_id) filter (where card_print_id is not null))[1] as card_print_id,
    (array_agg(distinct gv_id) filter (where gv_id is not null))[1] as gv_id,
    (array_agg(distinct card_rarity) filter (where card_rarity is not null))[1] as card_rarity,
    (array_agg(distinct identity_domain) filter (where identity_domain is not null))[1] as identity_domain,
    (array_agg(distinct card_printing_id) filter (where card_printing_id is not null))[1] as card_printing_id,
    (array_agg(distinct printing_gv_id) filter (where printing_gv_id is not null))[1] as printing_gv_id,
    (array_agg(distinct finish_key) filter (where finish_key is not null))[1] as finish_key
  from mapped
  group by
    source_observation_id,
    source_sync_run_id,
    source_artifact_id,
    source_price_row_identity,
    source_payload_hash,
    source_product_id,
    category_id,
    group_id,
    source_subtype_name,
    subtype_name_normalized,
    source_observed_on,
    currency,
    low_price,
    mid_price,
    high_price,
    market_price,
    direct_low_price,
    source_product_name,
    source_product_active,
    source_product_catalog_status,
    source_product_extended_data,
    source_sync_mode,
    source_sync_status,
    source_sync_finished_at,
    normalized_finish_key
)
select
  summarized.*,
  exists (
    select 1
    from jsonb_array_elements(coalesce(summarized.source_product_extended_data, '[]'::jsonb)) field
    where lower(coalesce(field ->> 'name', '')) = 'number'
      and nullif(btrim(field ->> 'value'), '') is not null
  ) as has_printed_number_evidence
from summarized;

create or replace view public.v_market_price_current_v1 as
with latest_decisions as (
  select ranked.*
  from (
    select
      decision.*,
      row_number() over (
        partition by decision.card_printing_id
        order by decision.decided_at desc, decision.id desc
      ) as decision_rank
    from public.market_price_qualification_decisions decision
    where decision.card_printing_id is not null
  ) ranked
  where ranked.decision_rank = 1
),
current_snapshots as (
  select
    snapshot.*,
    row_number() over (
      partition by snapshot.card_printing_id
      order by snapshot.source_observed_on desc, snapshot.published_at desc, snapshot.id desc
    ) as snapshot_rank
  from public.market_price_publication_snapshots snapshot
  join latest_decisions decision
    on decision.source_observation_id = snapshot.source_observation_id
   and decision.card_printing_id = snapshot.card_printing_id
   and decision.policy_version = snapshot.policy_version
   and decision.eligible = true
   and decision.decision = 'publish'
  where snapshot.source_sync_finished_at >= now() - interval '36 hours'
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
  extract(epoch from (now() - snapshot.source_sync_finished_at))::bigint as age_seconds,
  snapshot.provenance_id,
  snapshot.policy_version
from current_snapshots snapshot
where snapshot.snapshot_rank = 1;

create or replace view public.v_market_price_history_v1 as
select distinct on (snapshot.card_printing_id, snapshot.source_observed_on)
  snapshot.card_print_id,
  snapshot.card_printing_id,
  snapshot.gv_id,
  snapshot.printing_gv_id,
  snapshot.finish_key,
  snapshot.source_observed_on as observed_on,
  snapshot.currency,
  snapshot.market_price,
  snapshot.low_price,
  snapshot.mid_price,
  snapshot.high_price,
  snapshot.direct_low_price,
  snapshot.source_name,
  snapshot.source_label,
  snapshot.provenance_id,
  snapshot.published_at
from public.market_price_publication_snapshots snapshot
order by
  snapshot.card_printing_id,
  snapshot.source_observed_on,
  snapshot.published_at desc,
  snapshot.id desc;

create or replace view public.v_market_listing_variant_active_ask_exact_v1 as
with exact_listings as (
  select
    assignment.card_print_id,
    assignment.card_printing_id,
    assignment.printing_gv_id,
    assignment.assigned_finish_key as finish_key,
    observation.seller_key,
    observation.total_ask_price::numeric as total_ask_price,
    observation.currency,
    observation.observed_at
  from public.market_listing_card_candidates candidate
  join public.market_evidence_variant_assignments assignment
    on assignment.source_family = 'market_listing'
   and assignment.source_table = 'market_listing_card_candidates'
   and assignment.source_row_id = candidate.id
   and assignment.variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
   and assignment.variant_assignment_status = 'exact_child_finish'
   and assignment.card_printing_id is not null
  join public.market_listing_observations observation
    on observation.id = candidate.observation_id
  where observation.currency = 'USD'
    and observation.total_ask_price is not null
    and observation.observed_at >= now() - interval '72 hours'
    and coalesce(candidate.condition_features -> 'slab_features' ->> 'is_slab', 'false') <> 'true'
)
select
  card_print_id,
  card_printing_id,
  printing_gv_id,
  finish_key,
  'USD'::text as currency,
  min(total_ask_price)::numeric as lowest_active_ask,
  round((percentile_cont(0.5) within group (order by total_ask_price))::numeric, 2) as median_active_ask,
  count(*)::integer as listing_count,
  count(distinct seller_key)::integer as seller_count,
  max(observed_at) as observed_at
from exact_listings
group by card_print_id, card_printing_id, printing_gv_id, finish_key;

create or replace view public.v_market_price_parent_summary_v1 as
select
  current_price.card_print_id,
  current_price.gv_id,
  current_price.currency,
  min(current_price.market_price)::numeric as market_close,
  count(*)::integer as eligible_printing_count,
  (count(*) > 1) as is_from_price,
  max(current_price.observed_at) as observed_at,
  'fresh'::text as freshness,
  case when count(*) = 1 then (array_agg(current_price.provenance_id))[1] else null end as provenance_id,
  min(active_ask.lowest_active_ask)::numeric as lowest_active_ask,
  sum(coalesce(active_ask.listing_count, 0))::integer as active_ask_listing_count,
  max(active_ask.observed_at) as active_ask_observed_at
from public.v_market_price_current_v1 current_price
left join public.v_market_listing_variant_active_ask_exact_v1 active_ask
  on active_ask.card_printing_id = current_price.card_printing_id
group by current_price.card_print_id, current_price.gv_id, current_price.currency;

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
  select
    'parent'::text,
    parent.card_print_id,
    null::uuid,
    parent.gv_id,
    null::text,
    null::text,
    'available'::text,
    null::text,
    parent.currency,
    parent.market_close,
    'tcgplayer'::text,
    case when parent.is_from_price then 'From TCGPlayer Market' else 'TCGPlayer Market' end,
    parent.observed_at,
    parent.freshness,
    null::numeric,
    null::numeric,
    null::numeric,
    null::numeric,
    parent.is_from_price,
    parent.eligible_printing_count,
    parent.lowest_active_ask,
    parent.active_ask_listing_count,
    parent.active_ask_observed_at,
    parent.provenance_id
  from public.v_market_price_parent_summary_v1 parent
  where p_card_print_ids is not null
    and parent.card_print_id = any(p_card_print_ids)

  union all

  select
    'card_printing'::text,
    exact.card_print_id,
    exact.card_printing_id,
    exact.gv_id,
    exact.printing_gv_id,
    exact.finish_key,
    'available'::text,
    null::text,
    exact.currency,
    exact.market_price,
    exact.source_name,
    exact.source_label,
    exact.observed_at,
    exact.freshness,
    exact.low_price,
    exact.mid_price,
    exact.high_price,
    exact.direct_low_price,
    false,
    1,
    active_ask.lowest_active_ask,
    active_ask.listing_count,
    active_ask.observed_at,
    exact.provenance_id
  from public.v_market_price_current_v1 exact
  left join public.v_market_listing_variant_active_ask_exact_v1 active_ask
    on active_ask.card_printing_id = exact.card_printing_id
  where (
      p_card_printing_ids is not null
      and exact.card_printing_id = any(p_card_printing_ids)
    )
    or (
      p_card_print_ids is not null
      and exact.card_print_id = any(p_card_print_ids)
    )
  order by 1, 2, 6 nulls first;
$$;

create or replace function public.get_market_price_history_v1(
  p_card_printing_id uuid,
  p_days integer default 365
)
returns table (
  card_printing_id uuid,
  printing_gv_id text,
  observed_on date,
  currency text,
  market_price numeric,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  direct_low_price numeric,
  source_label text,
  provenance_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    history.card_printing_id,
    history.printing_gv_id,
    history.observed_on,
    history.currency,
    history.market_price,
    history.low_price,
    history.mid_price,
    history.high_price,
    history.direct_low_price,
    history.source_label,
    history.provenance_id
  from public.v_market_price_history_v1 history
  where history.card_printing_id = p_card_printing_id
    and history.observed_on >= current_date - greatest(1, least(coalesce(p_days, 365), 3650))
  order by history.observed_on asc;
$$;

create or replace function public.get_top_market_pricing_v1(p_limit integer default 100)
returns table (
  card_print_id uuid,
  gv_id text,
  currency text,
  market_close numeric,
  source_name text,
  source_label text,
  observed_at timestamptz,
  freshness text,
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
  select
    parent.card_print_id,
    parent.gv_id,
    parent.currency,
    parent.market_close,
    'tcgplayer'::text,
    case when parent.is_from_price then 'From TCGPlayer Market' else 'TCGPlayer Market' end,
    parent.observed_at,
    parent.freshness,
    parent.is_from_price,
    parent.eligible_printing_count,
    parent.lowest_active_ask,
    parent.active_ask_listing_count,
    parent.active_ask_observed_at,
    parent.provenance_id
  from public.v_market_price_parent_summary_v1 parent
  order by parent.market_close desc, parent.card_print_id
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

create or replace function public.get_market_price_trace_v1(p_provenance_id uuid)
returns table (
  provenance_id uuid,
  source_observation_id uuid,
  source_sync_run_id uuid,
  source_artifact_id uuid,
  source_payload_hash text,
  source_price_row_identity text,
  source_product_id integer,
  source_subtype_name text,
  source_observed_on date,
  source_sync_finished_at timestamptz,
  card_print_id uuid,
  card_printing_id uuid,
  gv_id text,
  printing_gv_id text,
  finish_key text,
  market_price numeric,
  qualification_decision_id uuid,
  policy_version text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    snapshot.provenance_id,
    snapshot.source_observation_id,
    snapshot.source_sync_run_id,
    snapshot.source_artifact_id,
    snapshot.source_payload_hash,
    snapshot.source_price_row_identity,
    snapshot.source_product_id,
    snapshot.source_subtype_name,
    snapshot.source_observed_on,
    snapshot.source_sync_finished_at,
    snapshot.card_print_id,
    snapshot.card_printing_id,
    snapshot.gv_id,
    snapshot.printing_gv_id,
    snapshot.finish_key,
    snapshot.market_price,
    snapshot.qualification_decision_id,
    snapshot.policy_version,
    snapshot.published_at
  from public.market_price_publication_snapshots snapshot
  where snapshot.provenance_id = p_provenance_id;
$$;

alter table public.market_price_qualification_decisions enable row level security;
alter table public.market_price_publication_snapshots enable row level security;

drop policy if exists market_price_qualification_service_role_all
  on public.market_price_qualification_decisions;
create policy market_price_qualification_service_role_all
  on public.market_price_qualification_decisions
  for all to service_role using (true) with check (true);

drop policy if exists market_price_publication_service_role_all
  on public.market_price_publication_snapshots;
create policy market_price_publication_service_role_all
  on public.market_price_publication_snapshots
  for all to service_role using (true) with check (true);

revoke all on public.market_price_qualification_decisions from public, anon, authenticated;
revoke all on public.market_price_publication_snapshots from public, anon, authenticated;
revoke all on public.v_tcgplayer_market_qualification_candidates_v1 from public, anon, authenticated;
revoke all on public.v_market_price_current_v1 from public, anon, authenticated;
revoke all on public.v_market_price_history_v1 from public, anon, authenticated;
revoke all on public.v_market_listing_variant_active_ask_exact_v1 from public, anon, authenticated;
revoke all on public.v_market_price_parent_summary_v1 from public, anon, authenticated;

grant select, insert on public.market_price_qualification_decisions to service_role;
grant select, insert on public.market_price_publication_snapshots to service_role;
grant select on public.v_tcgplayer_market_qualification_candidates_v1 to service_role;
grant select on public.v_market_price_current_v1 to service_role;
grant select on public.v_market_price_history_v1 to service_role;
grant select on public.v_market_listing_variant_active_ask_exact_v1 to service_role;
grant select on public.v_market_price_parent_summary_v1 to service_role;

revoke all on function public.normalize_tcgplayer_market_subtype_v1(text)
  from public, anon, authenticated, service_role;
revoke all on function public.market_price_append_only_guard_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.get_market_pricing_read_model_v1(uuid[], uuid[])
  from public, anon, authenticated, service_role;
revoke all on function public.get_market_price_history_v1(uuid, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.get_top_market_pricing_v1(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.get_market_price_trace_v1(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.normalize_tcgplayer_market_subtype_v1(text) to service_role;
grant execute on function public.market_price_append_only_guard_v1() to service_role;
grant execute on function public.get_market_pricing_read_model_v1(uuid[], uuid[]) to authenticated, service_role;
grant execute on function public.get_market_price_history_v1(uuid, integer) to authenticated, service_role;
grant execute on function public.get_top_market_pricing_v1(integer) to authenticated, service_role;
grant execute on function public.get_market_price_trace_v1(uuid) to service_role;

comment on table public.market_price_qualification_decisions is
  'Append-only deterministic publication decisions for exact TCGPlayer Market observations.';

comment on table public.market_price_publication_snapshots is
  'Immutable TCGPlayer Market publication snapshots. market_price is the source close; supporting fields never alter it.';

comment on function public.get_market_pricing_read_model_v1(uuid[], uuid[]) is
  'Signed-in Production V1 pricing contract shared by every client surface.';

commit;
