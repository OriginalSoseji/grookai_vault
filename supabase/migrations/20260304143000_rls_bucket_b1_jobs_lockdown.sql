-- PROD_HARDENING_V1_STEP3_FIX_B1
-- Lock down client writes for pricing_jobs and ingestion_jobs.

ALTER TABLE public.pricing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pricing_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.ingestion_jobs FROM anon, authenticated;

GRANT SELECT ON TABLE public.pricing_jobs TO authenticated;
GRANT SELECT ON TABLE public.ingestion_jobs TO authenticated;

DROP POLICY IF EXISTS "user select own" ON public.pricing_jobs;
CREATE POLICY "user select own"
ON public.pricing_jobs
FOR SELECT
TO authenticated
USING (requester_user_id = auth.uid());

DROP POLICY IF EXISTS "user select own" ON public.ingestion_jobs;
CREATE POLICY "user select own"
ON public.ingestion_jobs
FOR SELECT
TO authenticated
USING (requester_user_id = auth.uid());
