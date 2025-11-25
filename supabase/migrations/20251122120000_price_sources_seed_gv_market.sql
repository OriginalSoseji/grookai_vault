-- Seeds the gv_market price source if it is missing.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'price_sources'
  ) THEN
    INSERT INTO public.price_sources (id, display_name, is_active)
    SELECT 'gv_market', 'Grookai Marketplace', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.price_sources WHERE id = 'gv_market'
    );
  END IF;
END;
$$;
