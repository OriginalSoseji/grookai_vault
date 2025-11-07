-- Compat/latest view with confidence exposure and graceful fallback
-- Prefer card_prices with confidence if present; otherwise map from latest_prices MV

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='card_prices'
  ) THEN
    EXECUTE $$
      create or replace view public.latest_card_prices_v as
      with ranked as (
        select cp.*,
               row_number() over (partition by card_id, condition order by observed_at desc) rn
        from public.card_prices cp
      )
      select card_id,
             price_low, price_mid, price_high,
             currency,
             observed_at,
             source,
             confidence,
             gi_algo_version
      from ranked
      where rn = 1
    $$;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='latest_prices'
  ) THEN
    EXECUTE $$
      create or replace view public.latest_card_prices_v as
      select print_id as card_id,
             null::numeric as price_low,
             price_usd   as price_mid,
             null::numeric as price_high,
             'USD'::text as currency,
             observed_at,
             source,
             null::numeric as confidence,
             null::text    as gi_algo_version
      from public.latest_prices
    $$;
  END IF;
  EXECUTE 'grant select on public.latest_card_prices_v to anon, authenticated, service_role';
END$$;
