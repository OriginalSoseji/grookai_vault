-- PROD_HARDENING_V1_STEP3_FIX_B0
-- Scope: schema-only prerequisite for Step B1 (ingestion job requester ownership).

ALTER TABLE public.ingestion_jobs
ADD COLUMN IF NOT EXISTS requester_user_id uuid;

CREATE INDEX IF NOT EXISTS ingestion_jobs_requester_user_id_idx
ON public.ingestion_jobs (requester_user_id);
