# Fingerprinting Binding Audit V1

Status: AUDIT ONLY (no schema or code changes in this doc)  
Scope: vault add flow, condition snapshot/analysis pipeline, existing tables, and what is missing for binding/provenance.

## 0) Vault add / scan flow (current behavior)
- Flutter scanner service: `lib/services/scanner/condition_scan_service.dart`
  - Upload plan via Edge Function `scan-upload-plan` (supabase/functions/scan-upload-plan/index.ts)
    - Reserves `snapshot_id`, returns bucket/path per slot, caller uploads JPEGs.
  - Finalize snapshot via RPC `condition_snapshots_insert_v1` with `p_vault_item_id` + `p_images`.
  - Enqueue analysis via insert into `ingestion_jobs` (`job_type='condition_analysis_v1'`); worker picks it up.
- Edge Function `scan-upload-plan`:
  - Uses Supabase service role + caller JWT; creates signed upload URLs under bucket `condition-scans` with object path `{user}/{vault_item_id}/{snapshot_id}/{slot}.jpg`.

## 1) Existing tables (relevant columns)
- `public.vault_items` (baseline in supabase/migrations/20251213153626_*, *_30, *_31, *_33)
  - `id` (pk), `user_id`, `card_id`, `qty`, `condition_label`, images metadata, etc.
  - RLS owner-only; unique constraint `uq_vault_items_user_card` (user_id, card_id).
- `public.condition_snapshots` (supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql)
  - `id` pk, `vault_item_id` NOT NULL, `user_id`, `created_at`
  - `images` jsonb, `scan_quality` jsonb, `measurements` jsonb, `defects` jsonb, `confidence` numeric
  - optional: `device_meta` jsonb, `fingerprint_id` uuid, `card_print_id` uuid
  - RLS owner-only; append-only (immutability trigger).
- `public.condition_snapshot_analyses` (supabase/migrations/20251230070000_condition_snapshot_analyses_tables_v1.sql)
  - `snapshot_id` fk, `user_id`, `analysis_version`, `analysis_key`, `scan_quality` jsonb, `measurements` jsonb, `defects` jsonb, `confidence` numeric, `created_at`
  - Unique `(snapshot_id, analysis_version, analysis_key)`; append-only (RLS/trigger).
- `public.condition_analysis_failures` (same migration) append-only failure log.
- `public.v_condition_snapshot_latest_analysis` view: latest per snapshot (ordered by created_at, id).
- No existing tables for fingerprint binding or provenance events.

## 2) Existing RPCs / workers
- Snapshot insert RPC: `public.condition_snapshots_insert_v1` (supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql)
  - Inputs: `p_id`, `p_vault_item_id`, `p_images`, `p_scan_quality`, `p_measurements`, `p_defects`, `p_confidence`, `p_device_meta`, optional `p_fingerprint_id`, `p_card_print_id`.
  - Sets `user_id` from `auth.uid()`, enforces append-only.
- Analysis insert RPC: `public.admin_condition_assist_insert_analysis_v1` (supabase/migrations/20251230080000_condition_assist_worker_rpc_v1.sql)
  - Idempotent on `(snapshot_id, analysis_version, analysis_key)`; backfills `user_id` from condition_snapshots.
- Failure insert RPC: `public.admin_condition_assist_insert_failure_v1` (same file).
- Worker: `backend/condition/fingerprint_worker_v1.mjs`
  - Analysis version default `v1_fingerprint`.
  - `analysis_key = sha256Hex(\`${snapshotId}::${analysisVersion}::fingerprint_v1\`)` (deterministic).
  - Outputs `scan_quality`, `measurements.fingerprint` (normalization, features {phash,dhash} per face, flags), `match` (same/different/uncertain) with confidence, artifacts base path (null in dry-run), no DB writes in dry-run.
  - Apply-mode inserts via `admin_condition_assist_insert_analysis_v1`.
  - Matching scope: same user only; candidates from `condition_snapshot_analyses` filtered by `analysis_version`.

## 3) Observations / gaps for binding & provenance
- No table to bind fingerprints to vault items (by user_id + stable fingerprint key).
- No provenance/events table for fingerprint lifecycle (created/matched/bound/rescan).
- `condition_snapshots` already links to `vault_item_id` (required).
- `condition_snapshot_analyses` already stores user_id, analysis_key, measurements.fingerprint.*; can be reused for deriving fingerprint_key.
- No existing UI surfacing “seen before” or binding; scanner currently only fetches latest analyses and shows status.

## 4) Recommended minimal schema additions (contract-ready)
- New table `fingerprint_bindings` (same-user only):
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid not null`
  - `fingerprint_key text not null` (deterministic; see key rule below)
  - `vault_item_id uuid not null references public.vault_items(id) on delete cascade`
  - `snapshot_id uuid not null references public.condition_snapshots(id) on delete cascade`
  - `analysis_key text not null`
  - `created_at timestamptz default now() not null`
  - `last_seen_at timestamptz default now() not null`
  - Unique index on `(user_id, fingerprint_key)`; index on `(vault_item_id, created_at desc)`.
- New table `fingerprint_provenance_events` (append-only):
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid not null`
  - `vault_item_id uuid null`
  - `snapshot_id uuid null`
  - `analysis_key text null`
  - `event_type text not null` (`fingerprint_created`, `fingerprint_matched`, `fingerprint_bound_to_vault_item`, `rescan`)
  - `metadata jsonb not null default '{}'::jsonb` (store score/decision/notes)
  - `created_at timestamptz default now() not null`
  - Indexes: `(user_id, created_at desc)`, `(vault_item_id, created_at desc)`.

## 5) Binding key (deterministic recommendation)
- Prefer hash-derived key over analysis_key so reruns on same snapshot are stable:
  - If both faces have hashes: `fingerprint_key = sha256Hex(front.phash + front.dhash + '::' + back.phash + back.dhash)`.
  - If only one face has hashes: use that face’s `phash + dhash`.
  - Same-user only; store alongside `analysis_key` for lineage.
  - Keep analysis_key for idempotency when writing provenance/bindings per run.

## 6) Reuse vs create
- Reuse: `condition_snapshots` (anchors snapshot→vault_item→user) and `condition_snapshot_analyses` (source of hashes/match/analysis_key).
- New: `fingerprint_bindings`, `fingerprint_provenance_events`, and lightweight service helpers/RPCs to upsert binding + insert events.

## 7) Next steps (per spec)
- Implement binding helper in backend to derive `fingerprint_key`, resolve existing binding by `fingerprint_key` (same user), and emit seen_before block in measurements.
- Add migrations for the two new tables with indexes.
- Optionally add RPCs if worker uses SQL functions pattern (admin_fingerprint_bind_v1, admin_fingerprint_provenance_insert_v1) mirroring existing admin_condition_assist_* style.
- UI: scanner/add-to-vault flow should consume `seen_before` from fingerprint analysis and show minimal banner with navigation to bound vault item.
