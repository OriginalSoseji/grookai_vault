-- Guardrailed: do not apply automatically. Keep in _hold/ until approved.
-- Purpose: Expose wall feed view and ensure client-readable grants. Idempotent.

-- View: wall_feed_view
create or replace view public.wall_feed_view as
select
  l.id           as listing_id,
  l.card_id      as card_id,
  l.title        as title,
  l.price_cents  as price_cents,
  l.created_at   as created_at,
  t.thumb_url    as thumb_url
from public.listings l
left join public.wall_thumbs_3x4 t on t.listing_id = l.id
where l.status = 'active' and l.visibility = 'public';

-- Grants for view + MV (MV must already exist)
grant select on public.wall_feed_view to anon, authenticated;
grant select on public.wall_thumbs_3x4 to anon, authenticated;

-- Optional refresh helper (if not present) — document only
-- create or replace function public.refresh_wall_thumbs_3x4()
-- returns void language sql as $$
--   refresh materialized view concurrently public.wall_thumbs_3x4;
-- $$;

