-- 20251105130000_wall_mv_autorefresh.sql
-- Auto-refresh the Wall materialized view on listing/image changes (dev-friendly).

DO $$
BEGIN
  -- Only proceed if the matview exists
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='wall_thumbs_3x4'
  ) THEN
    -- Trigger function to refresh the MV; swallow errors to avoid breaking inserts
    CREATE OR REPLACE FUNCTION public._wall_refresh_mv()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      BEGIN
        REFRESH MATERIALIZED VIEW public.wall_thumbs_3x4;
      EXCEPTION WHEN OTHERS THEN
        -- best-effort in local/dev; ignore refresh failures
        NULL;
      END;
      RETURN NULL;
    END
    $fn$;

    -- listings: refresh on any change
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='listings'
    ) THEN
      DROP TRIGGER IF EXISTS trg_wall_refresh_listings ON public.listings;
      CREATE TRIGGER trg_wall_refresh_listings
      AFTER INSERT OR UPDATE OR DELETE ON public.listings
      FOR EACH STATEMENT EXECUTE FUNCTION public._wall_refresh_mv();
    END IF;

    -- listing_images: refresh on any change
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='listing_images'
    ) THEN
      DROP TRIGGER IF EXISTS trg_wall_refresh_listing_images ON public.listing_images;
      CREATE TRIGGER trg_wall_refresh_listing_images
      AFTER INSERT OR UPDATE OR DELETE ON public.listing_images
      FOR EACH STATEMENT EXECUTE FUNCTION public._wall_refresh_mv();
    END IF;
  END IF;
END $$;

