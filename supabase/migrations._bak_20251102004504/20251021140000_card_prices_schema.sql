-- Card prices history table storing low/mid/high snapshots per card
create extension if not exists pgcrypto;

create table if not exists public.card_prices (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.card_prints(id) on delete cascade,
  price_low numeric,
  price_mid numeric,
  price_high numeric,
  currency text not null default 'USD',
  observed_at timestamptz not null default now()
);

-- Uniqueness per snapshot timestamp per card
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uq_card_prices_card_observed'
  ) then
    create unique index uq_card_prices_card_observed on public.card_prices (card_id, observed_at);
  end if;
end $$;

-- Helpful index to fetch latest quickly
create index if not exists idx_card_prices_latest on public.card_prices (card_id, observed_at desc);

grant select on table public.card_prices to anon, authenticated;

