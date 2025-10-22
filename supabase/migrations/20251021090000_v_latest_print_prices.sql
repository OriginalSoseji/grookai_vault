-- Create a view to expose latest prices by set_code/number for client use.
-- Joins materialized view latest_prices (by print_id) to card_prints to surface set/number.
-- Idempotent and safe to re-run.

do $$
begin
  -- Drop existing view to avoid column/type conflicts
  if exists (
    select 1 from pg_views where schemaname='public' and viewname='v_latest_print_prices'
  ) then
    execute 'drop view public.v_latest_print_prices';
  end if;

  -- Ensure dependencies exist; otherwise create an empty-compatible view
  if exists (select 1 from pg_class c where c.relnamespace='public'::regnamespace and c.relname='latest_prices')
     and exists (select 1 from pg_class c where c.relnamespace='public'::regnamespace and c.relname='card_prints') then
    execute $$
      create view public.v_latest_print_prices as
      select
        cp.set_code,
        cp.number,
        lp.print_id,
        lp.condition,
        lp.grade_agency,
        lp.grade_value,
        lp.source,
        lp.price_usd,
        lp.observed_at
      from public.latest_prices lp
      join public.card_prints cp
        on cp.id = lp.print_id
    $$;
  else
    -- Fallback: create an empty-typed view so shadow DBs compile
    execute $$
      create view public.v_latest_print_prices as
      select
        null::text      as set_code,
        null::text      as number,
        null::uuid      as print_id,
        null::text      as condition,
        null::text      as grade_agency,
        null::text      as grade_value,
        null::text      as source,
        null::numeric   as price_usd,
        null::timestamptz as observed_at
      where false
    $$;
  end if;
end
$$;

grant select on public.v_latest_print_prices to anon, authenticated;

