create or replace view public.v_price_movers as
with latest as (
  select card_id, max(observed_at) as latest_ts
  from public.card_prices
  group by 1
),
curr as (
  select p.card_id, p.price_mid as mid, p.observed_at
  from public.card_prices p
  join latest l on l.card_id = p.card_id and l.latest_ts = p.observed_at
),
prev as (
  select p.card_id, p.price_mid as mid, p.observed_at
  from public.card_prices p
  join latest l on l.card_id = p.card_id
  where p.observed_at < l.latest_ts - interval '24 hours'
    and p.observed_at >= l.latest_ts - interval '72 hours'
  qualify row_number() over (partition by p.card_id order by p.observed_at desc) = 1
)
select
  c.card_id,
  cp.name,
  cp.set_code,
  curr.mid as current_mid,
  prev.mid as prev_mid,
  case when coalesce(prev.mid,0) = 0 then null
       else round(((curr.mid - prev.mid) / prev.mid) * 100.0, 2)
  end as delta_pct
from curr c
left join prev p on p.card_id = c.card_id
join public.card_prints cp on cp.id = c.card_id
where c.mid is not null and c.mid > 0;

grant select on public.v_price_movers to anon, authenticated;

