# Identity Scanner V1 Phase 1B — Worker Verification Notes

Environment note: Supabase CLI not available here; worker not executed end-to-end. Below are the intended local test steps when env permits:

1) Apply migrations (already applied via docker exec psql) so `identity_scan_event_results` exists with RLS/append-only guards.
2) Create/locate a `condition_snapshots` row with a real front image path.
3) Enqueue an identity scan via edge `identity_scan_enqueue_v1` (or direct insert into `identity_scan_events`).
4) Seed ingestion job if not auto-enqueued:
   - Run `node backend/identity/identity_scan_worker_v1.mjs --once` (worker enqueues missing jobs and processes pending).
5) Expected outcomes:
   - `ingestion_jobs` rows created with `job_type='identity_scan_v1'`.
   - `identity_scan_event_results` row inserted per event with `status='failed'` and `error='ocr_not_implemented'` (OCR not present), or `ai_border_failed/warp_failed` on earlier failures.
   - Append-only enforced: no updates to `identity_scan_events`; results inserted only.
6) Negative checks:
   - Re-run worker: no duplicate results; existing events skipped because results exist.
   - Errors logged for missing/front image or download failures.
