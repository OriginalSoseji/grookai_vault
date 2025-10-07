-- === PRICING OBSERVATIONS (history) + LATEST (materialized) ===
-- Idempotent where possible.

-- 1) TABLE: price_observations (history)
create table if not exists public.price_observations (
  id              bigserial primary key,
  print_id        uuid not null references public.card_prints(id) on delete cascade,

  condition       text check (condition in ('NM','LP','MP','HP','DMG')),
  grade_agency    text check (grade_agency in ('PSA','BGS','CGC','ACE','AGS')),
  grade_value     text,
  grade_qualifier text,

  source          text not null,                             -- 'tcgplayer','ebay',...
  listing_type    text check (listing_type in ('sold','list','auction')),
  currency        text not null default 'USD',
  price_usd       numeric(12,2) not null check (price_usd >= 0),
  quantity        int,
  observed_at     timestamptz not null,
  imported_at     timestamptz not null default now(),

  constraint uq_price_observations
    unique (print_id, condition, grade_agency, grade_value, source, observed_at),

  constraint chk_condition_or_grade check (
    (condition is not null) or (grade_agency is not null and grade_value is not null)
  )
);

create index if not exists idx_price_obs_print_observed
  on public.price_observations (print_id, observed_at desc);

create index if not exists idx_price_obs_dim
  on public.price_observations (condition, grade_agency, grade_value);

-- 2) QUARANTINE TABLE: rows we couldnâ€™t map to a print_id
create table if not exists public.unmatched_price_rows (
  id           bigserial primary key,
  raw_payload  jsonb not null,
  reason       text   not null,
  seen_at      timestamptz not null default now()
);

-- 3) LATEST MATERIALIZED VIEW (indexable)
-- Drop any prior form then recreate as MATERIALIZED
drop materialized view if exists public.latest_prices;
drop view             if exists public.latest_prices;

create materialized view public.latest_prices as
select distinct on (
  po.print_id,
  coalesce(po.condition, '_'),
  coalesce(po.grade_agency, '_'),
  coalesce(po.grade_value, '_'),
  po.source
)
  po.print_id,
  po.condition,
  po.grade_agency,
  po.grade_value,
  po.source,
  po.price_usd,
  po.observed_at
from public.price_observations po
order by
  po.print_id,
  coalesce(po.condition, '_'),
  coalesce(po.grade_agency, '_'),
  coalesce(po.grade_value, '_'),
  po.source,
  po.observed_at desc;

-- Indexes allowed on MVs
create index if not exists idx_latest_prices_print
  on public.latest_prices (print_id);

-- 4) RLS & PRIVILEGES
alter table public.price_observations enable row level security;
alter table public.unmatched_price_rows enable row level security;

do $rls$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='price_observations'
      and policyname='price_obs_read_any'
  ) then
    create policy price_obs_read_any
      on public.price_observations
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='price_observations'
      and policyname='price_obs_write_service_only'
  ) then
    create policy price_obs_write_service_only
      on public.price_observations
      for all using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='unmatched_price_rows'
      and policyname='unmatched_read_auth'
  ) then
    create policy unmatched_read_auth
      on public.unmatched_price_rows
      for select using (auth.role() in ('authenticated','service_role'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='unmatched_price_rows'
      and policyname='unmatched_write_service_only'
  ) then
    create policy unmatched_write_service_only
      on public.unmatched_price_rows
      for all using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end
$rls$;

grant select on public.price_observations to anon, authenticated;
-- do not touch latest_prices here; handled in MV file
