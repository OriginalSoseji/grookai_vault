-- Grookai Vault — Add image_best alias to v_card_search
-- Keeps prior contract (with or without pricing view present)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='card_prints'
  ) THEN
    -- Catalog present; choose priced vs non-priced variant
    IF EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema='public' AND table_name='latest_card_prices_v'
    ) THEN
      -- With pricing view available
      DROP VIEW IF EXISTS public.v_card_search CASCADE;
      CREATE VIEW public.v_card_search AS
    SELECT
      cp.id::uuid                                AS id,
      cp.name                                    AS name,
      cp.set_code                                AS set_code,
      -- number variants
      cp.number                                  AS number_raw,
      regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g')          AS number_digits,
      CASE
        WHEN regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g') <> ''
          THEN lpad(regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g'), 3, '0')
        ELSE NULL
      END                                         AS number_padded,
      CASE
        WHEN cp.number ~ '\\d+\\s*/\\s*\\d+'
          THEN lpad(regexp_replace(cp.number, '^\\D*?(\\d+).*$', '\\1'), 3, '0') || '/' || regexp_replace(cp.number, '^.*?/(\\d+).*$', '\\1')
        ELSE NULL
      END                                         AS number_slashed,

      -- images
      coalesce(cp.image_url, cp.image_alt_url)    AS image_url,
      coalesce(cp.image_url, cp.image_alt_url)    AS thumb_url,
      coalesce(cp.image_url, cp.image_alt_url)    AS image_best,

      -- price contract (from latest_card_prices_v)
      pr.latest_price_cents                       AS latest_price_cents,
      CASE WHEN pr.latest_price_cents IS NOT NULL
           THEN pr.latest_price_cents / 100.0
           ELSE NULL
      END                                         AS latest_price,

      lower(cp.name)                              AS name_lc,
      NULL::numeric                               AS search_rank
    FROM public.card_prints cp
    LEFT JOIN LATERAL (
      SELECT ROUND(COALESCE(price_mid, price_high, price_low) * 100)::int AS latest_price_cents
      FROM public.latest_card_prices_v p
      WHERE p.card_id = cp.id
      ORDER BY
        CASE
          WHEN lower(coalesce(p.condition,'')) IN ('nm','near mint','lp','lightly played','raw') THEN 0
          ELSE 1
        END,
        observed_at DESC NULLS LAST
      LIMIT 1
    ) pr ON TRUE;

      COMMENT ON VIEW public.v_card_search IS
        'Stable app-facing search view. Guarantees image_url, thumb_url, image_best, number_* variants, and latest prices when available.';
    ELSE
      -- No pricing view
      DROP VIEW IF EXISTS public.v_card_search CASCADE;
      CREATE VIEW public.v_card_search AS
    SELECT
      cp.id::uuid                                AS id,
      cp.name                                    AS name,
      cp.set_code                                AS set_code,
      cp.number                                  AS number_raw,
      regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g')          AS number_digits,
      CASE
        WHEN regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g') <> ''
          THEN lpad(regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g'), 3, '0')
        ELSE NULL
      END                                         AS number_padded,
      CASE
        WHEN cp.number ~ '\\d+\\s*/\\s*\\d+'
          THEN lpad(regexp_replace(cp.number, '^\\D*?(\\d+).*$', '\\1'), 3, '0') || '/' || regexp_replace(cp.number, '^.*?/(\\d+).*$', '\\1')
        ELSE NULL
      END                                         AS number_slashed,
      coalesce(cp.image_url, cp.image_alt_url)    AS image_url,
      coalesce(cp.image_url, cp.image_alt_url)    AS thumb_url,
      coalesce(cp.image_url, cp.image_alt_url)    AS image_best,
      NULL::int                                   AS latest_price_cents,
      NULL::numeric                               AS latest_price,
      lower(cp.name)                              AS name_lc,
      NULL::numeric                               AS search_rank
    FROM public.card_prints cp;

      COMMENT ON VIEW public.v_card_search IS
        'Stable app-facing search view. Guarantees image_url, thumb_url, image_best, and number_* variants.';
    END IF;
  ELSE
    -- No catalog locally: provide a shim with stable contract
    DROP VIEW IF EXISTS public.v_card_search CASCADE;
    CREATE VIEW public.v_card_search AS
    SELECT
      NULL::uuid    AS id,
      NULL::text    AS name,
      NULL::text    AS set_code,
      NULL::text    AS number_raw,
      NULL::text    AS number_digits,
      NULL::text    AS number_padded,
      NULL::text    AS number_slashed,
      NULL::text    AS image_url,
      NULL::text    AS thumb_url,
      NULL::text    AS image_best,
      NULL::int     AS latest_price_cents,
      NULL::numeric AS latest_price,
      NULL::text    AS name_lc,
      NULL::numeric AS search_rank
    WHERE FALSE;
  END IF;

  -- Grants (best-effort)
  BEGIN
    GRANT SELECT ON public.v_card_search TO anon;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    GRANT SELECT ON public.v_card_search TO authenticated;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
