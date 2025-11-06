-- Guarded PROD apply: search_cards RPC + supporting view (schema-compatible)
DROP FUNCTION IF EXISTS public.search_cards(text, integer, integer);
DROP FUNCTION IF EXISTS public.search_cards(text, integer);
DROP FUNCTION IF EXISTS public.search_cards(text);

CREATE OR REPLACE VIEW public.v_card_search AS
SELECT
  id,
  name,
  set_code,
  COALESCE(number, number_raw) AS number,
  COALESCE(image_url, image_alt_url) AS image_best,
  image_url,
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
