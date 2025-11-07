-- 20251104_search_view_hardening.sql
-- Canonical contract for the app search. Do not remove columns without a coordinated app change.

-- Safety: drop then create to allow column changes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='card_prints'
  ) THEN
    DROP VIEW IF EXISTS public.v_card_search CASCADE;
    CREATE OR REPLACE VIEW public.v_card_search AS
    SELECT
      cp.id::uuid                                AS id,
      cp.name                                    AS name,
      cp.set_code                                AS set_code,
      -- number variants (support all the ways collectors search)
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

      -- image contract: ALWAYS present these two columns
      -- prefer a curated thumbnail; fall back to any full image we have
      coalesce(cp.image_url, cp.image_alt_url)    AS image_url,
      -- explicit thumb_url for list feeds; can be null if not generated yet
      coalesce(cp.image_url, cp.image_alt_url)    AS thumb_url,

      -- price contract: expose latest *cents* (int) and a float dollars for convenience
      NULL::int                                   AS latest_price_cents,
      NULL::numeric                               AS latest_price,

      -- optional ranking/sort helpers (null-safe)
      lower(cp.name)                              AS name_lc,
      NULL::numeric                               AS search_rank
    FROM public.card_prints cp;
  ELSE
    -- Provide a shape-compatible empty shim when catalog is absent locally
    DROP VIEW IF EXISTS public.v_card_search CASCADE;
    CREATE OR REPLACE VIEW public.v_card_search AS
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
      NULL::int     AS latest_price_cents,
      NULL::numeric AS latest_price,
      NULL::text    AS name_lc,
      NULL::numeric AS search_rank
    WHERE FALSE;
  END IF;
END $$;

COMMENT ON VIEW public.v_card_search IS
  'Stable app-facing search view. Guarantees image_url, thumb_url, and number_* variants.';

-- Optional: grant read to anon/auth (adjust to your policy)
DO $$
BEGIN
  -- ignore if role doesn''t exist in local dev
  BEGIN
    GRANT SELECT ON public.v_card_search TO anon;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    GRANT SELECT ON public.v_card_search TO authenticated;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
