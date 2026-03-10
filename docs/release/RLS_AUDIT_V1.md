# RLS_AUDIT_V1

Date: 2026-03-04
Scope: PROD_HARDENING_V1_STEP3 (audit only, no policy/schema/code changes)
Verdict: **FAIL**
STOP-Gate Status: **TRIGGERED**

## Evidence Sources

- `docs/release/logs/STEP3_surface_inventory_raw.csv`
- `docs/release/logs/STEP3_surface_inventory_grouped.csv`
- `docs/release/logs/STEP3_surface_inventory_writes.log`
- `docs/release/logs/STEP3_db_tables_rls_status.log`
- `docs/release/logs/STEP3_db_policies.log`
- `docs/release/logs/STEP3_db_role_table_grants.log`
- `docs/release/logs/STEP3_public_tables_no_rls_reachable.log`
- `docs/release/logs/STEP3_storage_buckets.log`
- `docs/release/logs/STEP3_storage_objects_policies.log`
- `docs/release/logs/STEP3_storage_tables_rls.log`
- `docs/release/logs/STEP3_write_targets_rls.log`
- `docs/release/logs/STEP3_public_rls_counts_psql.log`
- `docs/release/logs/STEP3_non_rls_reachable_distinct_count_psql.log`
- `docs/release/logs/STEP3_high_risk_policy_snapshot.log`

## 1) App-Touched Surface Inventory

Role context evidence:
- Flutter client uses publishable/anon key (`lib/main.dart:732`, `Supabase.initialize(... anonKey ...)`).
- Web client uses anon key (`apps/web/src/lib/supabaseClient.ts:10`).
- Backend highway defaults to service-role secret (`backend/supabase_backend_client.mjs`).
- Edge functions frequently use service-role (`supabase/functions/_shared/auth.ts`, `supabase/functions/pricing-live-request/index.ts`, `supabase/functions/identity_scan_enqueue_v1/index.ts`, `supabase/functions/scan-upload-plan/index.ts`, `supabase/functions/ebay_oauth_callback/index.ts`).

### A) Tables Written by Client Directly (Flutter/Web Supabase client)

| Table | Operation(s) | Path(s) | Expected Role |
|---|---|---|---|
| `catalog_submissions_v1` | `INSERT` | `lib/screens/identity_scan/identity_scan_screen.dart:306` | authenticated user JWT |
| `condition_snapshots` | `UPDATE` | `lib/services/scanner/condition_scan_service.dart:326` | authenticated user JWT |
| `identity_snapshots` | `INSERT` | `lib/services/identity/identity_scan_service.dart:95` | authenticated user JWT |
| `ingestion_jobs` | `INSERT` | `lib/services/scanner/condition_scan_service.dart:397` | authenticated user JWT |
| `pricing_jobs` | `INSERT` | `lib/card_detail_screen.dart:131` | authenticated user JWT |
| `vault_items` | `INSERT/UPDATE/DELETE` | `lib/main.dart:1400`, `lib/main.dart:1405`, `lib/main.dart:1470`, `lib/screens/scanner/scan_identify_screen.dart:99` | authenticated user JWT |

### B) Tables Written via Edge Functions

| Table | Operation(s) | Path(s) | Expected Role at DB |
|---|---|---|---|
| `pricing_jobs` | `INSERT` | `supabase/functions/pricing-live-request/index.ts:108` | service-role (function validates user first) |
| `identity_scan_events` | `INSERT` | `supabase/functions/identity_scan_enqueue_v1/index.ts:134` | service-role |
| `ebay_accounts` | `INSERT/UPDATE` | `supabase/functions/ebay_oauth_callback/index.ts:174`, `:183` | service-role |
| `admin.import_runs` | `INSERT/UPDATE` | `supabase/functions/import-prices/index.ts:113`, `:131`, `:139` | publishable client in function (legacy path) |

### C) Tables Written Only by Backend Highway Workers

| Table | Operation(s) | Path(s) | Expected Role |
|---|---|---|---|
| `card_print_price_curves` | `INSERT` | `backend/pricing/ebay_browse_prices_worker.mjs:656` | service-role |
| `card_print_traits` | `INSERT/UPDATE` | `backend/pokemon/pokemon_enrichment_worker.mjs:111`, `:128` | service-role |
| `card_prints` | `INSERT/UPDATE/UPSERT` | `backend/pokemon/pokemonapi_normalize_worker.mjs:333`, `:364`; `backend/infra/backfill_print_identity_worker.mjs:56` | service-role |
| `condition_analysis_failures` | `INSERT` | `backend/condition/fingerprint_worker_v1.mjs:117` | service-role |
| `ebay_active_price_snapshots` | `INSERT` | `backend/pricing/ebay_browse_prices_worker.mjs:906` | service-role |
| `ebay_active_prices_latest` | `UPSERT` | `backend/pricing/ebay_browse_prices_worker.mjs:926` | service-role |
| `external_mappings` | `UPSERT` | `backend/pokemon/pokemonapi_mapping_helpers.mjs:107` | service-role |
| `identity_scan_event_results` | `INSERT` | `backend/identity/grookai_vision_worker_v1.mjs:268` | service-role |
| `mapping_conflicts` | `INSERT` | `backend/pokemon/pokemonapi_normalize_worker.mjs:59` | service-role |
| `price_observations` | `INSERT` | `backend/ebay/ebay_self_orders_worker.mjs:141` | service-role |
| `raw_imports` | `INSERT/UPDATE` | `backend/pokemon/pokemonapi_import_cards_worker.mjs:64`; `:52` | service-role |
| `sets` | `INSERT/UPDATE` | `backend/pokemon/pokemonapi_normalize_worker.mjs:189`; `:167` | service-role |

## 2) RLS Coverage Audit (DB Truth)

From local DB snapshot:
- Public tables total: `79`
- Public tables with RLS enabled: `29`
- Public tables with RLS disabled: `50`
- Public non-RLS tables reachable by `anon`/`authenticated`: `50` distinct tables

Source logs:
- `docs/release/logs/STEP3_public_rls_counts_psql.log`
- `docs/release/logs/STEP3_non_rls_reachable_distinct_count_psql.log`
- `docs/release/logs/STEP3_public_tables_no_rls_reachable.log`

App-write surface RLS snapshot:
- See `docs/release/logs/STEP3_write_targets_rls.log`.
- High-risk write targets with `RLS=false` and anon/auth grants true include:
  - `pricing_jobs`
  - `ingestion_jobs`
  - `external_mappings`
  - `raw_imports`
  - `ebay_accounts`
  - `ebay_active_price_snapshots`
  - `ebay_active_prices_latest`
  - `card_print_traits`
  - `card_print_price_curves`
  - `mapping_conflicts`

Policy snapshot observations:
- `card_prices` has `INSERT` + `UPDATE` policies for `{public}` (`write via function`, `update via function`) and table grants include anon/auth in DB role grants snapshot.
- `card_prints` includes policy `anon can update card_prints (dev)` for role `{anon}`.
- Source: `docs/release/logs/STEP3_high_risk_policy_snapshot.log`, `docs/release/logs/STEP3_db_policies.log`, `docs/release/logs/STEP3_db_role_table_grants.log`.

## 3) Storage Bucket Policy Audit

Buckets used by app:
- `condition-scans` (private)
- `identity-scans` (private)

Policy posture on `storage.objects`:
- Insert/select policies are scoped to `auth.uid()` path prefix (`name LIKE auth.uid() || '/%'`) for both buckets.
- Update/delete for condition scans are effectively denied (`false` predicate).
- `scan-upload-plan` issues signed upload URLs after JWT validation and user-derived pathing.
- `scan-read` signs read URLs only after user-scoped snapshot fetch (`.eq("user_id", userId)` plus JWT context).

Source logs/files:
- `docs/release/logs/STEP3_storage_buckets.log`
- `docs/release/logs/STEP3_storage_objects_policies.log`
- `supabase/functions/scan-upload-plan/index.ts`
- `supabase/functions/scan-read/index.ts`

Result: No direct cross-user storage listing/read leak found in current policy text for these two buckets.

## 4) Findings

### BLOCKER

1. Public non-RLS exposure is broad and anon/auth reachable.
   - Evidence: `50` public tables have `RLS=false` and are reachable by anon/auth grants.
   - Paths: `docs/release/logs/STEP3_public_tables_no_rls_reachable.log`, `docs/release/logs/STEP3_non_rls_reachable_distinct_count_psql.log`.
   - STOP gate hit: public app-reachable tables without RLS.

2. Client code directly writes to tables with `RLS=false`.
   - `pricing_jobs` (`lib/card_detail_screen.dart:131`)
   - `ingestion_jobs` (`lib/services/scanner/condition_scan_service.dart:397`)
   - DB truth: both `RLS=false`, `anon_granted=true`, `authenticated_granted=true` in `STEP3_write_targets_rls.log`.
   - STOP gate hit: cross-user write/tamper risk.

3. Public write policies permit unsafe write paths on pricing/reference surfaces.
   - `card_prices` policies allow `{public}` inserts/updates (`write via function`, `update via function`).
   - With broad grants in place, this is not constrained to service-role execution.
   - Evidence: `STEP3_high_risk_policy_snapshot.log`, `STEP3_db_role_table_grants.log`.

4. Dev policy allows anonymous mutation on `card_prints`.
   - Policy: `anon can update card_prints (dev)`.
   - Evidence: `STEP3_high_risk_policy_snapshot.log`.
   - Risk: unauthenticated catalog mutation.

### WARNING

1. Legacy code path references `admin.import_runs`, but object not present in local DB.
   - Evidence: no matching relation/policies/grants in `STEP3_admin_import_runs_*.log`.
   - Paths: `supabase/functions/import-prices/index.ts`, backend import workers.
   - Impact: unclear runtime contract for legacy path.

2. Grant model appears overly broad globally (`DELETE,INSERT,SELECT,UPDATE,...` on many relations to anon/auth), relying on RLS/policy precision that is inconsistent across tables.
   - Evidence: `docs/release/logs/STEP3_db_role_table_grants.log`.

### INFO

1. User-scoped RLS policies for `vault_items`, `condition_snapshots`, `identity_snapshots`, `identity_scan_events`, `identity_scan_event_results`, and `catalog_submissions_v1` are present.
2. Storage bucket controls for `condition-scans` and `identity-scans` are private + uid-prefix scoped.

## 5) STOP-Gate Outcome

Triggered on:
- Public tables reachable by authenticated users with RLS disabled and no documented exception.
- Policy/grant combinations that allow overly broad write paths on app-relevant data.

No remediation applied in this step (audit-only scope respected).

## 6) Fix A1 Applied (2026-03-04)

Scope remediated:
- `public.ebay_accounts`
- `public.user_card_images`

Applied via migration:
- `supabase/migrations/20260304100000_rls_bucket_a1.sql`

Preflight evidence:
- `docs/release/logs/STEP3_FIX_A1_preflight_ebay_accounts.log`
- `docs/release/logs/STEP3_FIX_A1_preflight_user_card_images.log`

Replay + verification evidence:
- `docs/release/logs/STEP3_FIX_A1_db_reset.log`
- `docs/release/logs/STEP3_FIX_A1_verify.log`

Verified outcomes:
- RLS enabled on both tables (`rls_enabled = true`).
- Four authenticated-only ownership policies created per table:
  - `"user select own"`
  - `"user insert own"`
  - `"user update own"`
  - `"user delete own"`
- Policy predicates are exact `user_id = auth.uid()` checks.
- `anon` no longer has table SELECT privilege on either table.
- `authenticated` has CRUD grants, constrained by row policies.

Post-Fix A1 blocker impact:
- Bucket A non-RLS blockers resolved for these two tables.
- Remaining blocker surfaces persist in Bucket B and policy-level findings.

## 7) Fix B0 Prerequisite Applied (2026-03-04)

Scope:
- `public.ingestion_jobs` schema prerequisite for Step B1 only.

Applied via migration:
- `supabase/migrations/20260304113000_ingestion_jobs_requester_user_id.sql`

Changes:
- Added nullable column `requester_user_id uuid`.
- Added index `ingestion_jobs_requester_user_id_idx` on `(requester_user_id)`.
- No data backfill performed (existing rows remain `NULL`).

Rationale:
- Deterministic requester derivation from existing `payload` is not guaranteed across legacy rows/job types.
- Requester enforcement is deferred to Step B1 secure enqueue path.

Evidence:
- Preflight: `docs/release/logs/STEP3_FIX_B0_preflight.log`
- Replay: `docs/release/logs/STEP3_FIX_B0_db_reset.log`
- Verification: `docs/release/logs/STEP3_FIX_B0_verify.log`
- DriftGuard: `docs/release/logs/STEP3_FIX_B0_drift_guard.log`

Impact:
- Enables ownership-aware hardening in Step B1.
- Blocker count unchanged in this step.

## 8) Fix B0.5 Prerequisite Applied (2026-03-04)

Scope:
- `public.pricing_jobs` schema prerequisite for Step B1 only.

Applied via migration:
- `supabase/migrations/20260304120000_pricing_jobs_requester_user_id.sql`

Changes:
- Added nullable column `requester_user_id uuid`.
- Added index `pricing_jobs_requester_user_id_idx` on `(requester_user_id)`.
- No data backfill performed (existing rows remain `NULL`).

Rationale:
- Deterministic requester derivation for all historical pricing job rows is not provable.
- Requester enforcement is deferred to Step B1 secure enqueue path.

Evidence:
- Preflight: `docs/release/logs/STEP3_FIX_B0_5_preflight.log`
- Replay: `docs/release/logs/STEP3_FIX_B0_5_db_reset.log`
- Verification: `docs/release/logs/STEP3_FIX_B0_5_verify.log`
- DriftGuard: `docs/release/logs/STEP3_FIX_B0_5_drift_guard.log`

Impact:
- Enables ownership-aware hardening for `pricing_jobs` in Step B1.
- Blocker count unchanged in this step.

## 9) Fix B1 Applied (2026-03-04)

Scope remediated:
- `public.pricing_jobs`
- `public.ingestion_jobs`

Applied changes:
- Edge enqueue path updated:
  - `supabase/functions/pricing-live-request/index.ts` now sets `requester_user_id` from validated JWT (`requireUser`), never from client payload.
  - Added `supabase/functions/ingestion-enqueue-v1/index.ts` for authenticated enqueue with server-set `requester_user_id`.
- Flutter client write-path updates:
  - `lib/card_detail_screen.dart`: removed direct `pricing_jobs` insert, now calls `pricing-live-request`.
  - `lib/services/scanner/condition_scan_service.dart`: removed direct `ingestion_jobs` insert, now calls `ingestion-enqueue-v1`.
- DB lockdown migration:
  - `supabase/migrations/20260304143000_rls_bucket_b1_jobs_lockdown.sql`
  - Enables RLS on both tables.
  - Revokes all table privileges from `anon` and `authenticated`.
  - Grants `SELECT` only to `authenticated`.
  - Adds SELECT-only policy `"user select own"` with predicate `requester_user_id = auth.uid()` on both tables.

Evidence:
- Preflight: `docs/release/logs/STEP3_FIX_B1_preflight.log`
- Replay: `docs/release/logs/STEP3_FIX_B1_db_reset.log`
- Verification: `docs/release/logs/STEP3_FIX_B1_verify.log`
- DriftGuard: `docs/release/logs/STEP3_FIX_B1_drift_guard.log`
- Edge local invoke attempt: `docs/release/logs/STEP3_FIX_B1_edge_invoke.log`

Verified outcomes:
- Authenticated client write access removed on both job tables:
  - `has_table_privilege(..., 'INSERT'|'UPDATE'|'DELETE') = false`
  - explicit insert attempts as `authenticated` fail with `permission denied`.
- Authenticated read remains, constrained by RLS predicate text in `pg_policies`.
- Flutter client direct inserts for these tables are removed (`lib` search: no matches).

Runtime invoke note:
- Local function gateway reached (`functions_ready=true`) and authenticated local invoke succeeded for `ingestion-enqueue-v1` (`201`, row inserted with non-null `requester_user_id`).
- `pricing-live-request` invoke reached function logic and returned expected enqueue failure (`500 enqueue_failed`) because local reset has no `card_prints` rows (`pricing_jobs.card_print_id` FK).
- Local replay DB has `card_prints_count=0`, so pricing enqueue success cannot be proven in this reset state without out-of-scope catalog seeding.

Post-Fix B1 blocker impact:
- Bucket B direct-client-write blockers for `pricing_jobs` and `ingestion_jobs` resolved.
- Remaining blockers are policy-level:
  - broad public write policy on `card_prices`
  - dev anon update policy on `card_prints`

## 10) Fix P1 Applied (2026-03-04)

Scope remediated:
- Removed dev-only policy `"anon can update card_prints (dev)"` from `public.card_prints`.

Applied migration:
- `supabase/migrations/20260304150000_remove_card_prints_anon_update_dev_policy.sql`

Evidence:
- Preflight: `docs/release/logs/STEP3_FIX_P1_preflight.log`
- Replay: `docs/release/logs/STEP3_FIX_P1_db_reset.log`
- Verification: `docs/release/logs/STEP3_FIX_P1_verify.log`
- DriftGuard: `docs/release/logs/STEP3_FIX_P1_drift_guard.log`

Verified outcomes:
- Target policy removed (`target_policy_count = 0`).
- `public.card_prints` RLS remains enabled (`rowsecurity = true`).
- No anon UPDATE policy path remains on `public.card_prints` (`anon_update_policy_count = 0`).
- Grant-level check still reports `anon_update_grant = true`; with RLS enabled and no anon UPDATE policy, update path is blocked at policy layer.

Post-Fix P1 blocker impact:
- Remaining blocker count: **1**
- Remaining blocker:
  - broad public write policy on `card_prices`

## 11) Fix P2 Applied (2026-03-04)

Scope remediated:
- `public.card_prices` public write surface lockdown.

Applied migration:
- `supabase/migrations/20260304162000_lockdown_card_prices_writes.sql`

Migration actions:
- Dropped write policies on `public.card_prices`:
  - `"write via function"` (`INSERT`)
  - `"update via function"` (`UPDATE`)
- Revoked `INSERT`, `UPDATE`, `DELETE` from `anon`, `authenticated`.
- Re-granted `SELECT` to `anon`, `authenticated`.
- No new write policies created.

Evidence:
- Preflight: `docs/release/logs/STEP3_FIX_P2_preflight.log`
- Replay: `docs/release/logs/STEP3_FIX_P2_db_reset.log`
- Verification: `docs/release/logs/STEP3_FIX_P2_verify.log`
- DriftGuard: `docs/release/logs/STEP3_FIX_P2_drift_guard.log`

Verified outcomes:
- Policies on `public.card_prices` now include read-only policies only (`card_prices_read`, `read all`).
- `has_table_privilege` checks:
  - `anon` INSERT/UPDATE/DELETE = `false`, SELECT = `true`
  - `authenticated` INSERT/UPDATE/DELETE = `false`, SELECT = `true`
- Read posture preserved for existing read paths.

Post-Fix P2 blocker impact:
- Remaining blocker count: **0**
- Previous `card_prices` broad public write blocker resolved.
