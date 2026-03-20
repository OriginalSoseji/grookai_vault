begin;

create table if not exists public.pricing_observations (
  id uuid primary key default gen_random_uuid(),

  -- identity
  card_print_id uuid null references public.card_prints(id) on delete set null,

  -- source
  source text not null,
  external_id text not null,
  listing_url text,

  -- raw listing data
  title text,
  price numeric not null,
  shipping numeric default 0 not null,
  currency text default 'USD' not null,
  condition_raw text,
  listing_type text,

  -- parsing + mapping
  match_confidence numeric,
  mapping_status text not null
    check (mapping_status in ('mapped', 'unmapped', 'ambiguous')),
  classification text not null
    check (classification in ('accepted', 'rejected', 'staged')),
  condition_bucket text null
    check (condition_bucket in ('nm', 'lp', 'mp', 'hp', 'dmg')),
  exclusion_reason text,

  -- trace
  raw_payload jsonb,

  -- timestamps
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_pricing_observations_card_print
  on public.pricing_observations(card_print_id);

create index if not exists idx_pricing_observations_external
  on public.pricing_observations(source, external_id);

create index if not exists idx_pricing_observations_classification
  on public.pricing_observations(classification);

create index if not exists idx_pricing_observations_observed_at
  on public.pricing_observations(observed_at desc);

alter table public.pricing_observations enable row level security;

revoke all on table public.pricing_observations from public, anon, authenticated;

drop policy if exists pricing_observations_service_role_all on public.pricing_observations;
create policy pricing_observations_service_role_all
  on public.pricing_observations
  for all
  to service_role
  using (true)
  with check (true);

create or replace view public.v_pricing_observations_accepted
with (security_invoker = true) as
select
  po.*,
  (coalesce(po.price, 0) + coalesce(po.shipping, 0))::numeric as total_price
from public.pricing_observations po
where po.classification = 'accepted'
  and po.mapping_status = 'mapped';

create or replace view public.v_pricing_observation_audit
with (security_invoker = true) as
select
  po.card_print_id,
  po.classification,
  po.mapping_status,
  count(*) as listing_count,
  avg(po.match_confidence) as avg_confidence,
  min(po.price) as min_price,
  max(po.price) as max_price
from public.pricing_observations po
group by 1, 2, 3;

commit;
