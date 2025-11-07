-- Drop legacy compatibility shims now that clients use wall_feed_view
DO $$
BEGIN
  BEGIN EXECUTE 'drop view if exists public.wall_feed_v'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'drop view if exists public.v_wall_feed'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

