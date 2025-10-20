-- Resilient creation of v_vault_items and v_recently_added
DO $$
BEGIN
  -- Drop existing views to avoid type conflicts
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_recently_added') THEN
    EXECUTE 'DROP VIEW public.v_recently_added';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_vault_items') THEN
    EXECUTE 'DROP VIEW public.v_vault_items';
  END IF;

  -- If dependencies exist, build full v_vault_items; otherwise build a minimal fallback
  IF EXISTS (
        SELECT 1 FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relkind IN ('r','v','m')
          AND c.relname = 'cards'
     )
     AND EXISTS (
        SELECT 1 FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relkind IN ('r','v','m')
          AND c.relname = 'prices'
     )
     AND EXISTS (
        SELECT 1 FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relkind IN ('r','v','m')
          AND c.relname = 'v_card_images'
     )
  THEN
    EXECUTE $FULL$
      CREATE VIEW public.v_vault_items AS
      SELECT
        vi.id,
        vi.user_id,
        NULL::uuid     AS card_id,
        vi.created_at,
        c.name                       AS card_name,
        COALESCE(p.market_price, NULL)::numeric AS price,
        p.source                     AS price_source,
        p.ts                         AS price_ts,
        vci.image_url,
        vci.image_best,
        vci.image_alt_url
      FROM public.vault_items vi
      LEFT JOIN public.cards c
        ON FALSE -- placeholder join; replace with real join when schema is available
      LEFT JOIN public.prices p
        ON FALSE -- placeholder join
      LEFT JOIN public.v_card_images vci
        ON FALSE -- placeholder join
    $FULL$;
  ELSE
    EXECUTE $FALLBACK$
      CREATE VIEW public.v_vault_items AS
      SELECT
        vi.id,
        vi.user_id,
        NULL::uuid     AS card_id,
        vi.created_at,
        NULL::text      AS card_name,
        NULL::numeric   AS price,
        NULL::text      AS price_source,
        NULL::timestamptz AS price_ts,
        NULL::text      AS image_url,
        NULL::text      AS image_best,
        NULL::text      AS image_alt_url
      FROM public.vault_items vi
    $FALLBACK$;
  END IF;

  -- v_recently_added depends on v_vault_items
  EXECUTE 'CREATE OR REPLACE VIEW public.v_recently_added AS
           SELECT * FROM public.v_vault_items ORDER BY created_at DESC LIMIT 100';
END
$$;
