do $$
begin
  if to_regclass(''public.latest_card_prices_mv'') is null then
    execute $$
      create materialized view public.latest_card_prices_mv as
      select
        card_id,
        null::text as condition_label,
        price_low,
        price_mid,
        price_high,
        currency,
        observed_at,
        source,
        confidence,
        gi_algo_version
      from public.latest_card_prices_v
      with no data;
    $$;
  end if;

  execute $$
    create unique index if not exists uq_latest_card_prices_mv
    on public.latest_card_prices_mv (card_id, coalesce(condition_label, ''''));
  $$;

  execute ''grant select on public.latest_card_prices_mv to anon, authenticated, service_role'';

  begin
    execute ''refresh materialized view concurrently public.latest_card_prices_mv'';
  exception
    when feature_not_supported then
      execute ''refresh materialized view public.latest_card_prices_mv'';
  end;
end
$$;
