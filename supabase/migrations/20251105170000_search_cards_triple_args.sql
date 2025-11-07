-- Grookai Vault — canonical search RPC (q, limit, offset)
-- Returns v_card_search; SECURITY DEFINER to avoid caller grants on views/tables.

DROP FUNCTION IF EXISTS public.search_cards(text, integer, integer);

CREATE OR REPLACE VIEW public.v_card_search AS
SELECT id, name, set_code, number,
       COALESCE(thumb_url, image_url) AS image_best,
       NULL::int              AS latest_price_cents,
       NULL::numeric          AS latest_price,
       NULL::double precision AS rank
FROM public.card_prints;

CREATE OR REPLACE FUNCTION public.search_cards(
  q        text,
  "limit"  integer DEFAULT 50,
  "offset" integer DEFAULT 0
)
RETURNS SETOF public.v_card_search
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT *
  FROM public.v_card_search
  WHERE (q IS NULL OR q = '' OR name ILIKE '%' || q || '%')
  ORDER BY name
  LIMIT  GREATEST(1, COALESCE("limit", 50))
  OFFSET GREATEST(0, COALESCE("offset", 0));
$func$;

GRANT EXECUTE ON FUNCTION public.search_cards(text, integer, integer) TO anon, authenticated;
