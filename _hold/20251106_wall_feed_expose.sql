-- Guarded expose for wall feed view (read-only)
-- NOTE: Apply in staging only after stage-gate PASS and approval.
begin;

-- Ensure view exists (replace with actual view name if different)
-- create or replace view public.v_wall_feed as
--   select card_id, thumb_url, image_url, posted_at, user_id
--   from public.wall_feed_view_source
--   where is_public = true;

-- Make the view security invoker (or leave default if acceptable)
alter view public.v_wall_feed set (security_invoker = on);

-- Grant read-only to anon & authenticated roles
grant usage on schema public to anon, authenticated;
grant select on public.v_wall_feed to anon, authenticated;

commit;

