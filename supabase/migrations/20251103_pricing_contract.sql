-- Pricing & Comps contract (idempotent, guarded)

-- latest_card_prices_v: expose current index prices per card/condition
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='card_prices') then
    create or replace view public.latest_card_prices_v as
    select distinct on (card_id, condition)
      card_id,
      condition,
      price_low,
      price_mid,
      price_high,
      observed_at,
      source
    from public.card_prices
    where source = 'grookai_index'
    order by card_id, condition, observed_at desc;
  else
    create or replace view public.latest_card_prices_v as
    select
      null::uuid as card_id,
      null::text as condition,
      null::numeric as price_low,
      null::numeric as price_mid,
      null::numeric as price_high,
      null::timestamptz as observed_at,
      null::text as source
    where false;
  end if;
end $$;

-- sold_comps_v: recent eBay sales per card
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name in ('sold_comps','ebay_sold')) then
    create or replace view public.sold_comps_v as
    select
      coalesce(sc.card_id, es.card_id) as card_id,
      coalesce(sc.title, es.title) as title,
      coalesce(sc.sold_price, es.sold_price) as sold_price,
      coalesce(sc.sold_at, es.sold_at) as sold_at,
      coalesce(sc.source, 'ebay') as source,
      coalesce(sc.url, es.url) as url
    from public.sold_comps sc
    full outer join public.ebay_sold es on es.card_id = sc.card_id
    order by sold_at desc;
  else
    create or replace view public.sold_comps_v as
    select
      null::uuid as card_id,
      null::text as title,
      null::numeric as sold_price,
      null::timestamptz as sold_at,
      'ebay'::text as source,
      null::text as url
    where false;
  end if;
end $$;

-- Optional: index history accessor (guarded for local dev without card_prices)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='card_prices') then
    execute $sql$
      create or replace function public.card_index_history(_card_id uuid, _condition text, _limit int)
      returns table (observed_at timestamptz, price_mid numeric)
      language sql stable as $f$
        select observed_at, price_mid
        from public.card_prices
        where card_id = _card_id and condition = _condition and source = 'grookai_index'
        order by observed_at desc
        limit greatest(0, coalesce(_limit, 14));
      $f$;
    $sql$;
  else
    execute $sql$
      create or replace function public.card_index_history(_card_id uuid, _condition text, _limit int)
      returns table (observed_at timestamptz, price_mid numeric)
      language sql stable as $f$
        select null::timestamptz as observed_at, null::numeric as price_mid
        where false;
      $f$;
    $sql$;
  end if;
end $$;

grant select on public.latest_card_prices_v to anon, authenticated, service_role;
grant select on public.sold_comps_v to anon, authenticated, service_role;
grant execute on function public.card_index_history(uuid,text,int) to anon, authenticated, service_role;
