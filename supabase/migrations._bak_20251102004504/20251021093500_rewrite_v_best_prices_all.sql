-- Rewrite v_best_prices_all to derive from latest_prices (price_observations)
-- Provides compatibility columns used by downstream views (base_/cond_/grad_*)

do $$
begin
  if exists (select 1 from pg_views where schemaname='public' and viewname='v_best_prices_all') then
    execute 'drop view public.v_best_prices_all';
  end if;

  if exists (select 1 from pg_class c where c.relnamespace='public'::regnamespace and c.relname='latest_prices') then
    execute $$
      create view public.v_best_prices_all as
      with
      base as (
        select distinct on (lp.print_id)
          lp.print_id               as card_id,
          lp.price_usd::numeric(10,2) as base_market,
          lp.source                 as base_source,
          lp.observed_at            as base_ts
        from public.latest_prices lp
        where lp.condition is null and lp.grade_agency is null
        order by lp.print_id, lp.observed_at desc nulls last
      ),
      cond as (
        select distinct on (lp.print_id, lp.condition)
          lp.print_id               as card_id,
          lp.condition              as condition_label,
          lp.price_usd::numeric(10,2) as cond_market,
          lp.source                 as cond_source,
          lp.observed_at            as cond_ts
        from public.latest_prices lp
        where lp.condition is not null
        order by lp.print_id, lp.condition, lp.observed_at desc nulls last
      ),
      grad as (
        select distinct on (lp.print_id, lp.grade_agency, lp.grade_value)
          lp.print_id               as card_id,
          lp.grade_agency           as grade_company,
          lp.grade_value            as grade_value,
          lp.grade_value            as grade_label,
          lp.price_usd::numeric(10,2) as grad_market,
          lp.source                 as grad_source,
          lp.observed_at            as grad_ts
        from public.latest_prices lp
        where lp.grade_agency is not null and lp.grade_value is not null
        order by lp.print_id, lp.grade_agency, lp.grade_value, lp.observed_at desc nulls last
      )
      select
        coalesce(grad.card_id, cond.card_id, base.card_id) as card_id,
        base.base_market, base.base_source, base.base_ts,
        cond.condition_label, cond.cond_market, cond.cond_source, cond.cond_ts,
        grad.grade_company, grad.grade_value, grad.grade_label, grad.grad_market, grad.grad_source, grad.grad_ts
      from base
      full join cond on cond.card_id = base.card_id
      full join grad on grad.card_id = coalesce(base.card_id, cond.card_id)
    $$;
  else
    execute $$
      create view public.v_best_prices_all as
      select
        null::uuid      as card_id,
        null::numeric   as base_market,
        null::text      as base_source,
        null::timestamptz as base_ts,
        null::text      as condition_label,
        null::numeric   as cond_market,
        null::text      as cond_source,
        null::timestamptz as cond_ts,
        null::text      as grade_company,
        null::text      as grade_value,
        null::text      as grade_label,
        null::numeric   as grad_market,
        null::text      as grad_source,
        null::timestamptz as grad_ts
      where false
    $$;
  end if;
end
$$;

grant select on public.v_best_prices_all to anon, authenticated;

