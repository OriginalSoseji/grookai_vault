# Fingerprinting L2 Audit Report (Verify-First, No-Change)

## Environment Freeze
- Repo: `main` @ `4e6f55c9f0491d6b8c8e00d5c53614e341cb6ea8` (`checkpoint-ai-identity-warp-v1`); git status shows many untracked audit images/files (no staged commits).
- `schema_local.sql` **missing** (search error); schema evidence taken from Supabase migrations.

## Call Graph Map
- Flutter client (`lib/services/scanner/condition_scan_service.dart:38-169`) → Edge Function `scan-upload-plan` (`supabase/functions/scan-upload-plan/index.ts:35-151`) to mint signed upload URLs → client uploads `front/back` JPEGs to `condition-scans` → client finalizes snapshot via RPC `condition_snapshots_insert_v1` (`lib/services/scanner/condition_scan_service.dart:145-169`) → backend enqueues/reads `condition_analysis_v1` jobs (queue defined in `ingestion_jobs`, processed by `backend/condition/condition_analysis_job_runner_v1.mjs:190-210`) → worker `backend/condition/fingerprint_worker_v1.mjs` loads snapshot via `admin_condition_snapshots_read_v1` (DB) → writes analysis via `admin_condition_assist_insert_analysis_v1` → binds fingerprint + provenance via `admin_fingerprint_bind_v1` and `admin_fingerprint_event_insert_v1` → UI reads `condition_snapshot_analyses` (same Dart service fetchLatestAnalysis:171-220).

## Mandatory Findings
- **Hash computation**: `backend/condition/fingerprint_worker_v1.mjs:406-424` hashes normalized faces with `computePHash64`/`computeDHash64` (algorithms in `backend/condition/fingerprint_hashes_v1.mjs:26-115` – 9x8 dHash, 32x32 pHash+DCT, 64-bit hex).
- **Fingerprint key derivation**: `backend/condition/fingerprint_key_v1.mjs:5-29` → `fpv1:f:<phash>.<dhash>` or `fpv1:b:...` or `fpv1:fb:f=...;b=...`; returns `null` if no full hash pair.
- **Match computation**: `backend/condition/fingerprint_worker_v1.mjs:505-632` selects same-user prior analyses, hamming compares per face, ranks shortlist, scores via `scoreMatch` (`backend/condition/fingerprint_match_v1.mjs:14-35`), thresholds `>=0.85 => same`, `<=0.50 => different`, else uncertain (`decisionFromScore` lines 37-40).
- **Binding decision**: If `fingerprint_key` exists, worker always upserts binding (even if match uncertain/different) via `admin_fingerprint_bind_v1` after emitting `fingerprint_created` when no prior binding (`backend/condition/fingerprint_worker_v1.mjs:751-770`).
- **Binding write path (authoritative)**: `supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:4-38` `admin_fingerprint_bind_v1` (SECURITY DEFINER, service_role only) inserts/updates `public.fingerprint_bindings` (unique `(user_id,fingerprint_key)`, refreshes `last_seen_at`).
- **Provenance append-only path**: `backend/condition/fingerprint_worker_v1.mjs:751-812` calls `admin_fingerprint_event_insert_v1` for lifecycle events (`fingerprint_created`, `fingerprint_bound_to_vault_item`, `fingerprint_matched`, `fingerprint_rescan`, `fingerprint_match_unbound`); DB function is append-only idempotent on `(user_id, analysis_key, event_type)` (`supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:45-78`).
- **card_print_id resolution**: Only accepted as optional client-supplied field in `condition_snapshots_insert_v1` (`supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql:8-64`; Dart caller never passes it). No downstream resolver found → **UNVERIFIED** automated resolution; current pipeline treats card_print_id as client input only.

## Schema Truth
- **Tables**
  - `fingerprint_bindings` (`supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:4-34`): PK `id`, unique `(user_id,fingerprint_key)`, FK to `vault_items`, `condition_snapshots`; columns include `analysis_key`, `last_seen_at`, `created_at`; RLS owner-only select/insert/update; no delete policy.
  - `fingerprint_provenance_events` (same file lines 51-88): PK `id`; FK `snapshot_id` (required), `vault_item_id` (nullable), `user_id`; unique `(user_id, analysis_key, event_type)`; indexes on user/vault/fingerprint_key/event_type; RLS select/insert only; no update/delete.
  - `condition_snapshots` (`supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql:7-55`): immutable; stores `images`, `scan_quality`, `measurements`, `defects`, optional `fingerprint_id`, `card_print_id`; triggers set `user_id`, block update/delete.
  - `condition_snapshot_analyses` (`supabase/migrations/20251230070000_condition_snapshot_analyses_tables_v1.sql:5-25`): append-only analyses with unique `(snapshot_id, analysis_version, analysis_key)`; RLS owner select/insert; immutability triggers in `20251230070001_condition_snapshot_analyses_rls_v1.sql`.
- **Functions/RPCs**
  - `condition_snapshots_insert_v1` (security definer, authenticated) inserts snapshot with client-supplied `images`, `vault_item_id`, optional `card_print_id` (`supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql:8-66`).
  - `admin_condition_assist_insert_analysis_v1` inserts or no-ops on conflict into `condition_snapshot_analyses` with user_id derived from snapshot (`supabase/migrations/20251230080000_condition_assist_worker_rpc_v1.sql:5-44`).
  - `admin_fingerprint_bind_v1` / `admin_fingerprint_event_insert_v1` (security definer, service_role only) write bindings/provenance (`supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql`).
- **Triggers**
  - `condition_snapshots` immutability triggers (`supabase/migrations/20251230060000_condition_snapshots_immutability_lock.sql:6-23`).
  - `condition_snapshot_analyses` immutability/auth triggers (`supabase/migrations/20251230070001_condition_snapshot_analyses_rls_v1.sql:20-74`).

## DB Reality (Supabase: ycdxbpibncqcchqiihfz)
- `fingerprint_bindings` exists; row count 1; latest row: `fingerprint_key fpv1:fb:...` bound to `vault_item_id 7f042632-efc6-44a1-ba42-3046d10602c4`, `snapshot_id bfd50b7e-459e-47bd-b717-aef4f766d705`, `analysis_key 010a...e1ae` (`docs/audits/FINGERPRINTING_L2_AUDIT_EVIDENCE.md`, Phase 3).
- `fingerprint_provenance_events` exists; row count 2; events: `fingerprint_created` and `fingerprint_bound_to_vault_item` for same snapshot/key; `event_metadata.score=0` (same evidence).
- No FK references point to bindings/provenance beyond defined PKs (query returned empty).
- Functions present: `admin_fingerprint_bind_v1`, `admin_fingerprint_event_insert_v1`; no views referencing fingerprint/provenance.

## Pipeline Spec (Deterministic)
1) **Inputs**: Snapshot images fetched from storage paths recorded in `condition_snapshots.images` (`fingerprint_worker_v1.mjs:374-394`), signed URLs generated client-side via `scan-upload-plan`.
2) **Pre-processing**: AI border detection + warp to 1024x1428 via `detectOuterBorderAI` and `warpCardQuadAI` (`fingerprint_worker_v1.mjs:218-313`); quad validation (`validateQuad` lines 128-200); failures flagged.
3) **Hash computation**: For each face with normalized image, compute 64-bit pHash + dHash (`fingerprint_worker_v1.mjs:406-424` using `fingerprint_hashes_v1.mjs:26-115`).
4) **Match logic**: Same-user candidate fetch from `condition_snapshot_analyses` excluding current snapshot (`fingerprint_worker_v1.mjs:525-539`); shortlist by smallest hamming distance (`570-580`); score via weighted phash/dhash average (`fingerprint_match_v1.mjs:14-35`); decision thresholds (`37-40`); best candidate recorded (`fingerprint_worker_v1.mjs:585-631`).
5) **Fingerprint key**: Derived from available hashes (`fingerprint_key_v1.mjs:5-29`) and logged (`fingerprint_worker_v1.mjs:636-639`).
6) **Binding decision**: Binding lookup on `(user_id,fingerprint_key)` (`fingerprint_worker_v1.mjs:641-654`); seen_before logic set from match + existing binding (`656-686`). Regardless of match outcome, if `fingerprint_key` exists, upsert binding via `admin_fingerprint_bind_v1` (`751-770`).
7) **Writes**
   - Analysis record: `admin_condition_assist_insert_analysis_v1` (`fingerprint_worker_v1.mjs:719-746`) writes to `condition_snapshot_analyses`.
   - Binding (authoritative): `admin_fingerprint_bind_v1` (service role) → `fingerprint_bindings` (unique constraint, last_seen_at updated).
   - Provenance (evidence-only): multiple `admin_fingerprint_event_insert_v1` calls (`751-812`) → `fingerprint_provenance_events`; append-only idempotent by `(user_id,analysis_key,event_type)`.
8) **Reads/Views**: Flutter fetchLatestAnalysis reads `condition_snapshot_analyses` and exposes fingerprint measurements/match (`lib/services/scanner/condition_scan_service.dart:171-220`). No UI path found that reads bindings/provenance directly.

## Trust Boundary
- **Authoritative writes**: `fingerprint_bindings` via `admin_fingerprint_bind_v1` (service_role, security definer, unique same-user binding). Binding decision originates in worker, not client.
- **Evidence-only**: `fingerprint_provenance_events` via `admin_fingerprint_event_insert_v1` (append-only, idempotent on analysis_key+event_type). Measurements + match stored in `condition_snapshot_analyses` are append-only observations.
- **Derived/reads**: UI reads `condition_snapshot_analyses`; no direct client RLS path to bindings/provenance; RLS on both tables restricts to authenticated user.

## Gaps / UNVERIFIED
- `schema_local.sql` absent; relied on migrations for schema truth.
- No automated resolver for `card_print_id`; only optional client parameter in `condition_snapshots_insert_v1`. No code found that sets or validates it beyond insert → identity resolution path is **UNVERIFIED**.
- Enqueue path for `condition_analysis_v1` jobs not located in this audit (job runner consumes queue; source of job creation not in inspected files).

## Proposed Single Integration Point (evidence-only AI identity-from-warp)
- **Location**: `backend/condition/fingerprint_worker_v1.mjs` immediately after match/key computation but before binding/events (`after line ~639, before line ~719`).
- **Mechanism**: Call existing `admin_fingerprint_event_insert_v1` with a new event_type `fingerprint_ai_hint` using service_role backend context. Payload (`event_metadata`) limited to `{ run_id, warp_sha256, model_version, ai_card_print_id, ai_score, analysis_key }`. Do **not** alter binding logic or decision thresholds.
- **Storage**: Append to `public.fingerprint_provenance_events` (already evidence-only, append-only, idempotent). No changes to `fingerprint_bindings`.
- **Security**: Service role only; RLS already restricts select/insert to authenticated user_id. Event uniqueness on `(user_id,analysis_key,event_type)` prevents duplicates; no client write path added.
- **Verification plan**: (1) Confirm binding flow unchanged by diff review (no mutations to binding call sites). (2) Re-run DB queries to ensure bindings unaffected, provenance shows new `fingerprint_ai_hint` rows only. (3) UI verification that only provenance reads expose hint as “AI hint” (no binding/UI trust change). (4) Ensure warp hash + model_version logged for audit replay; no secrets exposed client-side.
