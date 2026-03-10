-- PROD_HARDENING_V1_STEP3_FIX_A1
-- Scope: public.ebay_accounts + public.user_card_images only.
-- Enable per-user RLS and tighten anon/auth grants.

-- ----------------------------
-- public.ebay_accounts
-- ----------------------------
ALTER TABLE public.ebay_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ebay_accounts FROM anon;
REVOKE ALL ON TABLE public.ebay_accounts FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ebay_accounts TO authenticated;

DROP POLICY IF EXISTS "user select own" ON public.ebay_accounts;
DROP POLICY IF EXISTS "user insert own" ON public.ebay_accounts;
DROP POLICY IF EXISTS "user update own" ON public.ebay_accounts;
DROP POLICY IF EXISTS "user delete own" ON public.ebay_accounts;

CREATE POLICY "user select own"
ON public.ebay_accounts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user insert own"
ON public.ebay_accounts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user update own"
ON public.ebay_accounts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user delete own"
ON public.ebay_accounts
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ----------------------------
-- public.user_card_images
-- ----------------------------
ALTER TABLE public.user_card_images ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_card_images FROM anon;
REVOKE ALL ON TABLE public.user_card_images FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_card_images TO authenticated;

DROP POLICY IF EXISTS "user select own" ON public.user_card_images;
DROP POLICY IF EXISTS "user insert own" ON public.user_card_images;
DROP POLICY IF EXISTS "user update own" ON public.user_card_images;
DROP POLICY IF EXISTS "user delete own" ON public.user_card_images;

CREATE POLICY "user select own"
ON public.user_card_images
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user insert own"
ON public.user_card_images
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user update own"
ON public.user_card_images
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user delete own"
ON public.user_card_images
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
