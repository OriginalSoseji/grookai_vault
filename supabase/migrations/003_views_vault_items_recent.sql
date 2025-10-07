drop view if exists public.v_vault_items cascade;

create view public.v_vault_items as
with base as (
  select
    vi.*,
    coalesce(img.name, c.name, '(unknown)') as card_name,
    img.set_code,
    img.number      as img_number,
    c.number        as c_number,
    c.variant, c.tcgplayer_id, c.game,
    img.image_url, img.image_best, img.image_alt_url
  from public.vault_items vi
  left join public.cards c            on c.id = vi.card_id
  left join public.v_card_images img  on img.id = vi.card_id
),
norm as (
  select
    *,
    nullif(
      ltrim(
        regexp_replace(
          regexp_replace(coalesce(img_number, c_number, ''), '/.*$', ''),
          '\D','','g'
        ),
      '0'),
    '') as card_digits,
    lower(regexp_replace(coalesce(img_number, c_number, ''), '[^0-9a-z]', '', 'g')) as card_num_norm
  from base
)
select
  n.id, n.user_id, n.card_id,
  coalesce(n.qty,1) as qty,
  coalesce(n.qty,1) as quantity,
  p.market_price                         as market_price_raw,
  nullif(p.market_price,0)               as market_price,
  nullif(p.market_price,0)               as price,
  (coalesce(n.qty,1) * p.market_price)   as line_total_raw,
  (coalesce(n.qty,1) * nullif(p.market_price,0)) as line_total,
  (coalesce(n.qty,1) * nullif(p.market_price,0)) as total,
  p.price_source, p.price_ts,
  n.created_at,
  n.card_name                            as name,
  coalesce(n.img_number, n.c_number)     as number,
  n.set_code, n.variant, n.tcgplayer_id, n.game,
  NULL::text                             as rarity,
  n.image_url, n.image_best, n.image_alt_url
from norm n
left join lateral (
  select pr.market_price, pr.source as price_source, pr.ts as price_ts
  from public.prices pr
  where lower(pr.set_code) = lower(n.set_code)
    and (
      nullif(ltrim(regexp_replace(pr.number, '\D','','g'),'0'), '') = n.card_digits
      or lower(regexp_replace(pr.number, '[^0-9a-z]', '', 'g')) = n.card_num_norm
    )
    and pr.currency = 'USD'
    and pr.market_price is not null
  order by pr.ts desc nulls last
  limit 1
) p on true;

drop view if exists public.v_recently_added;
create view public.v_recently_added as
select *
from public.v_vault_items
order by created_at desc
limit 100;
