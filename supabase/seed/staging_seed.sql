-- Staging seed: insert one public/active listing to verify feed path.
-- Idempotent and minimal; safe to re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listings'
  ) THEN
    INSERT INTO public.listings (owner_id, title, visibility, status, created_at)
    SELECT gen_random_uuid(), 'Staging Seed ' || to_char(now(), 'YYYY-MM-DD HH24:MI'), 'public', 'active', now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.listings WHERE title LIKE 'Staging Seed %'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listing_images'
  ) THEN
    INSERT INTO public.listing_images(listing_id, image_url, thumb_3x4_url)
    SELECT l.id, 'https://picsum.photos/720/960', NULL
    FROM public.listings l
    WHERE l.title LIKE 'Staging Seed %'
      AND NOT EXISTS (
        SELECT 1 FROM public.listing_images i WHERE i.listing_id = l.id
      )
    LIMIT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='wall_thumbs_3x4'
  ) THEN
    REFRESH MATERIALIZED VIEW public.wall_thumbs_3x4;
  END IF;
END $$;

