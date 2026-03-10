-- PROD_HARDENING_V1_STEP3_FIX_P2
-- Lock down public write surface on public.card_prices while preserving read access.

DROP POLICY IF EXISTS "write via function" ON public.card_prices;
DROP POLICY IF EXISTS "update via function" ON public.card_prices;

REVOKE INSERT, UPDATE, DELETE
ON public.card_prices
FROM anon, authenticated;

GRANT SELECT ON public.card_prices TO anon, authenticated;
