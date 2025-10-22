-- Error log for pricing operations (persistent)
create table if not exists public.price_error_log (
  id bigserial primary key,
  set_code text not null,
  number   text not null,
  lang     text not null default 'en',
  error_text text not null,
  observed_at timestamptz not null default now()
);

grant select on table public.price_error_log to anon, authenticated;

-- Latest price view: one row per card_id with latest snapshot
do $$
begin
  if exists (select 1 from pg_views where schemaname='public' and viewname='latest_card_prices_v') then
    execute 'drop view public.latest_card_prices_v';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='card_prices') then
    execute $$
      create view public.latest_card_prices_v as
      select distinct on (cp.card_id)
        cp.card_id,
        cp.price_low,
        cp.price_mid,
        cp.price_high,
        cp.currency,
        cp.observed_at
      from public.card_prices cp
      order by cp.card_id, cp.observed_at desc
    $$;
  else
    execute $$
      create view public.latest_card_prices_v as
      select null::uuid as card_id, null::numeric as price_low, null::numeric as price_mid, null::numeric as price_high, null::text as currency, null::timestamptz as observed_at where false
    $$;
  end if;
end $$;

grant select on public.latest_card_prices_v to anon, authenticated;

-- Price alerts scaffold
create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.card_prints(id) on delete cascade,
  threshold numeric not null,
  direction text not null check (direction in ('above','below')),
  created_at timestamptz not null default now()
);

alter table public.price_alerts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='price_alerts' and policyname='alerts_owner_select'
  ) then
    create policy alerts_owner_select on public.price_alerts for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='price_alerts' and policyname='alerts_owner_insert'
  ) then
    create policy alerts_owner_insert on public.price_alerts for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='price_alerts' and policyname='alerts_owner_delete'
  ) then
    create policy alerts_owner_delete on public.price_alerts for delete using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, delete on table public.price_alerts to authenticated;

-- Vault valuation view (sum latest mid per user)
do $$
begin
  if exists (select 1 from pg_views where schemaname='public' and viewname='v_vault_valuation') then
    execute 'drop view public.v_vault_valuation';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='vault_items') then
    execute $$
      create view public.v_vault_valuation as
      select
        vi.user_id,
        sum(coalesce(lcp.price_mid, 0)) as total_value_mid,
        count(*) as item_count
      from public.vault_items vi
      join public.latest_card_prices_v lcp on lcp.card_id = vi.card_id
      group by vi.user_id
    $$;
  else
    execute $$
      create view public.v_vault_valuation as
      select null::uuid as user_id, null::numeric as total_value_mid, null::bigint as item_count where false
    $$;
  end if;
end $$;

grant select on public.v_vault_valuation to authenticated;

-- Public wall cards with price badge scaffold
do $$
begin
  if exists (select 1 from pg_views where schemaname='public' and viewname='v_public_wall_cards') then
    execute 'drop view public.v_public_wall_cards';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='card_prints') then
    execute $$
      create view public.v_public_wall_cards as
      select
        cp.id as card_id,
        cp.set_code,
        cp.number,
        cp.name,
        coalesce(cp.image_url, cp.image_alt_url) as image_url,
        lcp.price_mid,
        lcp.currency,
        lcp.observed_at
      from public.card_prints cp
      left join public.latest_card_prices_v lcp on lcp.card_id = cp.id
    $$;
  else
    execute $$
      create view public.v_public_wall_cards as
      select null::uuid as card_id, null::text as set_code, null::text as number, null::text as name, null::text as image_url, null::numeric as price_mid, null::text as currency, null::timestamptz as observed_at where false
    $$;
  end if;
end $$;

grant select on public.v_public_wall_cards to anon, authenticated;

