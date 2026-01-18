-- Disable legacy fingerprint_v1 enqueue trigger/function; fingerprint runs inside condition_analysis_v1 pipeline.
drop trigger if exists trg_fingerprint_enqueue_v1 on public.condition_snapshots;
drop function if exists public.gv_enqueue_fingerprint_job_v1();
