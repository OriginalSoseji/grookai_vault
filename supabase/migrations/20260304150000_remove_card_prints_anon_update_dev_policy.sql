-- PROD_HARDENING_V1_STEP3_FIX_P1
-- Remove dev-only anon UPDATE policy on card_prints.

DROP POLICY IF EXISTS "anon can update card_prints (dev)" ON public.card_prints;
