-- COMPAT VIEW: app expects public.latest_card_prices_v; server currently exposes public.latest_prices
create or replace view public.latest_card_prices_v as
select * from public.latest_prices;

grant select on public.latest_card_prices_v to anon, authenticated, service_role;

