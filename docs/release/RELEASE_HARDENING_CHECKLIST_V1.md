# RELEASE_HARDENING_CHECKLIST_V1

## Repo
- [x] Captured inventory baseline (`git branch --show-current`, `git status`, `git log -n 20 --oneline`).
- [x] Recorded resolved secret blocker from prior step (`2d477c6`).
- [x] Scanned committed build directories (`node_modules`, `.dart_tool`, `build`, `.next`, `dist`, `coverage`) and found no committed matches.
- [x] Scanned large tracked files for LFS risk and recorded findings.
- [x] Audited migration hazard footprint (`_migration_quarantine`, `*_remote_schema.sql`, `*_legacy_stub.sql`).
- [x] Scanned `TODO remove` / `TEMP` / `WIP` markers and recorded results.
- [x] Completed root `.env` ambiguity audit (content + usage paths + decision).
- [x] Verified CI/consistency baseline (README clarity, formatting baseline, lint script presence, migration/drift docs discoverability).
- [ ] Temp/proof artifact cleanup policy approved and executed.
- [ ] `.editorconfig` policy approved and implemented.
- [ ] Migration quarantine/legacy stub reduction plan approved and executed.

## Database Determinism
- Step 2 baseline: **FAIL** (missing `public.card_printings` after replay).
- Step 2.1 classification: **CASE 3 (Ambiguous)** pending authoritative capture.
- Step 2 FIX1 migration: `20260304070000_printing_layer_v1.sql` (forward-only, remote-derived).
- Replay (`supabase db reset --local`): **SUCCESS**
- Remote parity check (`supabase db push`): **SUCCESS** (migration applied; all target relations already existed remotely, `CREATE TABLE IF NOT EXISTS` no-op notices).
- DriftGuard (`scripts/drift_guard.ps1`): **SUCCESS** (exit code `0`)
- [x] Remote-only table drift resolved (`admin_change_checkpoints` captured in migrations; legacy `ingestion_queue` + `backup_*` remote-only tables scheduled for drop via migration `20260305090000_capture_admin_change_checkpoints.sql`).
- [x] Remaining SECURITY DEFINER views cleared (8 target public views set to `security_invoker=true` via migration `20260305093000_force_security_invoker_8_views.sql`).
- Core invariant existence checks:
  - `public.v_best_prices_all`: present
  - `public.v_grookai_value_v1`: present
  - `public.v_vault_items`: present
  - `public.condition_snapshots`: present
  - `public.external_mappings`: present
  - `public.card_printings`: present
- Anomalies:
  - Audit precondition warning: working tree was not clean at start of Step 2.
- Evidence logs:
  - `docs/release/logs/DB_REPLAY_STEP2_reset.log`
  - `docs/release/logs/DB_REPLAY_STEP2_push.log`
  - `docs/release/logs/DB_REPLAY_STEP2_drift_guard.log`
  - `docs/release/logs/DB_REPLAY_STEP2_invariants.log`
  - `docs/release/logs/DB_REPLAY_STEP2_card_printings_lookup.log`
  - `docs/release/logs/DB_REPLAY_STEP2_FIX1_dump.log`
  - `docs/release/logs/DB_REPLAY_STEP2_FIX1_reset.log`
  - `docs/release/logs/DB_REPLAY_STEP2_FIX1_tables_exist.log`
  - `docs/release/logs/DB_REPLAY_STEP2_FIX1_invariants.log`
  - `docs/release/logs/DB_REPLAY_STEP2_FIX1_push.log`
  - `docs/release/logs/DB_REPLAY_STEP2_FIX1_drift_guard_after_push.log`
- Final verdict: **PASS**

## RLS & Access Control
- [x] Enumerated app-touched DB/storage surface from Flutter, Edge Functions, and Backend workers (`STEP3_surface_inventory_raw.csv`, `STEP3_surface_inventory_grouped.csv`).
- [x] Captured DB-truth RLS status, policies, and grants (`STEP3_db_tables_rls_status.log`, `STEP3_db_policies.log`, `STEP3_db_role_table_grants.log`).
- [x] Captured app-write-target RLS matrix (`STEP3_write_targets_rls.log`).
- [x] Captured storage bucket + `storage.objects` policy posture (`STEP3_storage_buckets.log`, `STEP3_storage_objects_policies.log`).
- [x] Evaluated STOP gates against DB truth and app paths.
- [ ] Public app-reachable non-RLS tables remediated.
- [ ] Over-broad public write policy/grant combinations remediated.
- [ ] Legacy `admin.import_runs` contract reconciled (referenced in code, missing in local DB).
- [x] Fix A1 applied for Bucket A user-owned tables (`public.ebay_accounts`, `public.user_card_images`) with replay verification.
- [x] Fix B0 prerequisite applied: added `public.ingestion_jobs.requester_user_id` (+ index) for secure B1 enqueue path.
- [x] Fix B0.5 prerequisite applied: added `public.pricing_jobs.requester_user_id` (+ index) for secure B1 enqueue path.
- [x] Fix B1 applied: removed Flutter direct inserts to `pricing_jobs`/`ingestion_jobs`, added Edge enqueue path for ingestion, and locked both tables to authenticated `SELECT` + owner RLS policy.
- [x] Fix P1 applied: removed policy `"anon can update card_prints (dev)"` from `public.card_prints` via forward-only migration.
- [x] Fix P2 applied: removed public `INSERT/UPDATE` policies and revoked `INSERT/UPDATE/DELETE` grants for `anon`/`authenticated` on `public.card_prices`, while preserving `SELECT`.
- [x] Supabase linter: RLS Enabled No Policy resolved via explicit deny-all policies for remaining RLS-enabled/no-policy tables.
- Audit report: `docs/release/RLS_AUDIT_V1.md`
- RLS Triage Classification:
- [x] Non-RLS tables classified into A/B/C/D (`docs/release/RLS_TRIAGE_CLASSIFICATION_V1.md`).
- Blocker count (updated): **0** (`A` non-RLS user-owned tables resolved by Fix A1; `B` control-plane direct client writes resolved by Fix B1; `card_prints` anon update dev policy resolved by Fix P1; `card_prices` broad public write policy resolved by Fix P2).
- Final verdict: **PASS** (no BLOCKERS remain; residual warnings may still require follow-up)
