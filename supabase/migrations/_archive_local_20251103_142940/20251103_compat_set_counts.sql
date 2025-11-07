-- Compat set counts view and optional shim for legacy card_catalog

create or replace view public.v_set_print_counts as
select set_code, count(*)::int as total_prints
from public.card_prints
where lang = 'en'
group by set_code;

grant select on public.v_set_print_counts to anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'card_catalog'
  ) then
    create view public.card_catalog as
    select set_code, card_number
    from public.card_prints
    where lang = 'en';
    grant select on public.card_catalog to anon, authenticated, service_role;
  end if;
end$$;

