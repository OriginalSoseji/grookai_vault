-- Ensure wall feed exposes a thumbnail; fallback to primary photo if no thumb exists.
-- Idempotent: recreate the view using current schema; adjust names if needed.

do $$
declare
  has_thumb boolean;
  has_thumb_alt boolean;
begin
  select exists(
    select 1 from information_schema.columns
     where table_schema='public' and table_name='listing_photos' and column_name='thumb_url'
  ) into has_thumb;
  select exists(
    select 1 from information_schema.columns
     where table_schema='public' and table_name='listing_photos' and column_name='thumbnail_url'
  ) into has_thumb_alt;

  if has_thumb or has_thumb_alt then
    execute $$
      create or replace view public.wall_feed_v as
      with primary_photo as (
        select listing_id,
               coalesce(thumb_url, thumbnail_url, url) as thumb_url,
               url as primary_photo_url,
               row_number() over (partition by listing_id order by position asc, created_at asc, id asc) as rn
        from public.listing_photos
      )
      select
        l.id                as listing_id,
        l.card_print_id     as card_print_id,
        l."condition"       as condition,
        l.price_cents       as price_cents,
        l.currency          as currency,
        l.quantity          as quantity,
        l.is_trade          as is_trade,
        l.created_at        as created_at,
        sp.display_name     as seller_display_name,
        sp.avatar_url       as seller_avatar_url,
        pp.thumb_url        as thumb_url,
        pp.primary_photo_url as primary_photo_url,
        cp.set_code         as set_code,
        cp.number           as card_number,
        cp.name             as card_name,
        cp.rarity           as rarity,
        mv.price_mid        as mv_price_mid,
        mv.observed_at      as mv_observed_at
      from public.listings l
      join public.seller_profiles sp on sp.id = l.seller_id
      join public.card_prints cp     on cp.id = l.card_print_id
      left join primary_photo pp     on pp.listing_id = l.id and pp.rn = 1
      left join public.latest_card_prices_mv mv
             on mv.card_id = l.card_print_id
            and (mv.condition_label = l."condition" or mv.condition_label is null)
      where l.status = 'active'
      order by l.created_at desc;
    $$;
  else
    -- Fallback: use url for both thumb and primary
    execute $$
      create or replace view public.wall_feed_v as
      with primary_photo as (
        select listing_id,
               url as thumb_url,
               url as primary_photo_url,
               row_number() over (partition by listing_id order by position asc, created_at asc, id asc) as rn
        from public.listing_photos
      )
      select
        l.id                as listing_id,
        l.card_print_id     as card_print_id,
        l."condition"       as condition,
        l.price_cents       as price_cents,
        l.currency          as currency,
        l.quantity          as quantity,
        l.is_trade          as is_trade,
        l.created_at        as created_at,
        sp.display_name     as seller_display_name,
        sp.avatar_url       as seller_avatar_url,
        pp.thumb_url        as thumb_url,
        pp.primary_photo_url as primary_photo_url,
        cp.set_code         as set_code,
        cp.number           as card_number,
        cp.name             as card_name,
        cp.rarity           as rarity,
        mv.price_mid        as mv_price_mid,
        mv.observed_at      as mv_observed_at
      from public.listings l
      join public.seller_profiles sp on sp.id = l.seller_id
      join public.card_prints cp     on cp.id = l.card_print_id
      left join primary_photo pp     on pp.listing_id = l.id and pp.rn = 1
      left join public.latest_card_prices_mv mv
             on mv.card_id = l.card_print_id
            and (mv.condition_label = l."condition" or mv.condition_label is null)
      where l.status = 'active'
      order by l.created_at desc;
    $$;
  end if;

  -- Minimal grants (read-only)
  execute 'grant select on public.wall_feed_v to anon, authenticated, service_role';
end $$;

