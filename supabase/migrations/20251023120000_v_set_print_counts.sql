create or replace view public.v_set_print_counts as
select
  cp.set_code,
  count(*)::int as total_prints
from public.card_prints cp
where coalesce(cp.lang, 'en') = 'en'
group by cp.set_code;

grant select on public.v_set_print_counts to anon, authenticated;

