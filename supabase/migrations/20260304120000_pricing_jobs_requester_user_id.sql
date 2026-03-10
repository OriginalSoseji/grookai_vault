-- PROD_HARDENING_V1_STEP3_FIX_B0_5
-- Scope: schema-only prerequisite for Step B1 (pricing job requester ownership).

ALTER TABLE public.pricing_jobs
ADD COLUMN IF NOT EXISTS requester_user_id uuid;

CREATE INDEX IF NOT EXISTS pricing_jobs_requester_user_id_idx
ON public.pricing_jobs (requester_user_id);
