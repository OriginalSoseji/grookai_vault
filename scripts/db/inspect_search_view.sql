-- Count totals
select
  (select count(*) from public.card_prints) as total_card_prints,
  (select count(*) from public.v_card_search) as visible_in_view;

-- Sample missing ones
select cp.id, cp.set_code, cp.number_raw, cp.name
from public.card_prints cp
left join public.v_card_search v on v.id = cp.id
where v.id is null
limit 50;

-- RLS policies
select polname, cmd, qual, with_check
from pg_policies
where tablename='card_prints';

-- Current view definition
select definition
from pg_views
where viewname='v_card_search';

