-- Forensic fix: Wall feed view, RPC, grants, and helpful index
-- Safe to apply multiple times (uses drop-if-exists and idempotent index)

drop function if exists public.wall_feed_list(integer, integer);
drop view if exists public.wall_feed_v;

create view public.wall_feed_v as
select
  l.id,
  l.title,                  -- TODO: adjust if different column name
  l.price_cents,            -- TODO: adjust if different column name
  l.set_code,               -- TODO: adjust if different column name
  l.created_at,
  l.owner_id,               -- TODO: adjust if different column name
  lp.thumb_url
from public.listings l
left join lateral (
  select p.thumb_url
  from public.listing_photos p
  where p.listing_id = l.id
    and nullif(trim(p.thumb_url), '') is not null
  order by p.created_at desc nulls last, p.id
  limit 1
) lp on true
where coalesce(l.is_active, true) = true;  -- TODO: adjust if different active flag

create function public.wall_feed_list(_limit int default 50, _offset int default 0)
returns setof public.wall_feed_v
language sql stable as $$
  select * from public.wall_feed_v
  order by created_at desc
  limit greatest(_limit,0) offset greatest(_offset,0);
$$;

grant select on public.wall_feed_v to anon, authenticated, service_role;
grant execute on function public.wall_feed_list(int, int) to anon, authenticated, service_role;

create index if not exists idx_listings_created_at on public.listings (created_at desc);

