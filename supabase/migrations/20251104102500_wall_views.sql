-- Grookai Vault — Wall (DERIVED OBJECTS)
-- Views and materialized views built atop the base tables.
-- Order matters: create materialized views first, then dependent views.

-- MATERIALIZED VIEW: wall_thumbs_3x4
-- Generates a de-duplicated 3:4 thumbnail feed surface (one row per listing).
-- Safe pattern: create if missing. Later migrations can REFRESH or RECREATE as needed.
do $$
begin
  if not exists (
    select 1 from pg_matviews where schemaname='public' and matviewname='wall_thumbs_3x4'
  ) then
    create materialized view public.wall_thumbs_3x4 as
    with primary_img as (
      select
        li.id as listing_id,
        coalesce(li.primary_image_url, max(case when li2.sort_order = 0 then li2.thumb_3x4_url end)) as thumb_url
      from public.listings li
      left join public.listing_images li2 on li2.listing_id = li.id
      group by li.id, li.primary_image_url
    )
    select
      l.id,
      l.owner_id,
      l.title,
      l.price_cents,
      l.currency,
      l.condition,
      l.status,
      l.created_at,
      pi.thumb_url
    from public.listings l
    left join primary_img pi on pi.listing_id = l.id
    where l.visibility = 'public' and l.status = 'active';
  end if;
end $$;

-- VIEW: wall_feed_view
-- Drop+recreate pattern so it always matches latest shape.
drop view if exists public.wall_feed_view cascade;
create view public.wall_feed_view as
select
  w.id as listing_id,
  w.owner_id,
  w.title,
  w.price_cents,
  w.currency,
  w.condition,
  w.status,
  w.created_at,
  w.thumb_url
from public.wall_thumbs_3x4 w
order by w.created_at desc;

-- Helpful indexes if the MV is large; guard with IF EXISTS check.
-- (Note: CREATE INDEX on matview requires it to exist; safe to try with IF NOT EXISTS.)
create index if not exists idx_wall_thumbs_created_at on public.wall_thumbs_3x4(created_at);

