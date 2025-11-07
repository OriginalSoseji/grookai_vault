-- 20251105120500_wall_feed_compat_views.sql
-- Compatibility aliases to standardize on public.wall_feed_view while keeping legacy names working.

-- Create legacy-compatible views that simply select from the canonical wall_feed_view.
DO $$
BEGIN
  -- Ensure canonical view exists; if not, skip creating aliases.
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema='public' AND table_name='wall_feed_view'
  ) THEN
    -- v_wall_feed compatibility
    DROP VIEW IF EXISTS public.v_wall_feed CASCADE;
    CREATE VIEW public.v_wall_feed AS
      SELECT * FROM public.wall_feed_view;
    COMMENT ON VIEW public.v_wall_feed IS 'Compat alias of wall_feed_view. Prefer public.wall_feed_view in all callers.';

    -- wall_feed_v compatibility
    DROP VIEW IF EXISTS public.wall_feed_v CASCADE;
    CREATE VIEW public.wall_feed_v AS
      SELECT * FROM public.wall_feed_view;
    COMMENT ON VIEW public.wall_feed_v IS 'Compat alias of wall_feed_view. Prefer public.wall_feed_view in all callers.';

    -- Grants (best-effort)
    BEGIN
      GRANT SELECT ON public.v_wall_feed TO anon;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      GRANT SELECT ON public.v_wall_feed TO authenticated;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      GRANT SELECT ON public.wall_feed_v TO anon;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      GRANT SELECT ON public.wall_feed_v TO authenticated;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
