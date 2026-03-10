# APP_FACING_DB_CONTRACT_V1

## Purpose + Non-Goals

### Purpose
- Define stable, app-facing DB contract surfaces consumed by Flutter and core app workflows.
- Freeze the current V1 expectations for target objects, access mode, and consumer locations.

### Non-Goals
- No schema edits.
- No worker changes.
- No pricing logic changes.

## Contract Tiering

### Tier 0 (UI-critical and core workflow surfaces)
- `v_vault_items`
- `vault_items`
- `card_print_active_prices`
- `search_card_prints_v1`
- `card_prints`
- `pricing_jobs`
- `condition_snapshots_insert_v1`
- `condition_snapshot_analyses`
- `identity_scan_events`
- `identity_scan_event_results`
- `vault_add_or_increment`

### Tier 1 (important but non-blocking)
- `sets`
- `ingestion_jobs`
- `condition_snapshots`
- `identity_snapshots`
- `ebay_accounts`
- `admin.import_prices_do`
- `admin.import_runs`
- `v_condition_snapshot_analyses_match_card_v1`
- `admin_condition_assist_insert_analysis_v1`

### Tier 2 (auxiliary/optional)
- `admin_fingerprint_event_insert_v1`
- `catalog_submissions_v1`

## Edge Entry Contracts (V1)

- `scan-upload-plan`
  - Flutter caller: `lib/services/scanner/condition_scan_service.dart:40`
  - Evidence: invoked by `ConditionScanService.getUploadPlan` to request signed upload URLs and snapshot ID.
- `identity_scan_enqueue_v1`
  - Flutter caller: `lib/services/identity/identity_scan_service.dart:109`
  - Evidence: invoked by `IdentityScanService.startScan` to enqueue identity analysis and obtain `identity_scan_event_id`.
- `identity_scan_get_v1`
  - Flutter caller: `lib/services/identity/identity_scan_service.dart:130`
  - Evidence: invoked by `IdentityScanService.pollOnce` with query key `event_id` for event status polling.
- `card-identify`
  - Flutter caller: `lib/screens/scanner/scan_identify_screen.dart:53`
  - Status: unresolved; edge function source is missing from `supabase/functions` in the audited repository snapshot.

## Contract Surface Index

| surface_name | surface_type (table/view/rpc) | read_write (read / write / read+write) | ui_criticality (yes / medium / low) | consumers (file paths + line numbers) | defined_in (migration file if known; otherwise "unknown") | versioning_rule (freeze / version-bump / flexible) |
|---|---|---|---|---|---|---|
| `v_vault_items` | view | read | yes | `lib/main.dart:1385` | `supabase/migrations/20251213153627_baseline_views.sql:509`; `supabase/migrations/20260218100000_unify_pricing_surfaces_raw_only_v1.sql:29` | version-bump |
| `vault_items` | table | write | yes | `lib/main.dart:1400`; `lib/main.dart:1405`; `lib/main.dart:1470`; `lib/screens/scanner/scan_identify_screen.dart:99` | unknown | version-bump |
| `card_print_active_prices` | view | read | yes | `lib/card_detail_screen.dart:60` | `supabase/migrations/20251213153627_baseline_views.sql:87` | version-bump |
| `pricing_jobs` | table | read+write | yes | `edge:pricing-live-request(supabase/functions/pricing-live-request/index.ts:40)`; `flutter:lib/card_detail_screen.dart:131` | `supabase/migrations/20251213153625_baseline_init.sql:1824`; `supabase/migrations/20251213153630_baseline_constraints.sql:175`; `supabase/migrations/20251213153630_baseline_constraints.sql:343`; `supabase/migrations/20251213153631_baseline_indexes.sql:122` | version-bump |
| `search_card_prints_v1` | rpc | read | yes | `lib/models/card_print.dart:273`; `backend/identity/identity_scan_worker_v1.mjs:503` | `supabase/migrations/20260121153000_search_contract_v1_rpc.sql:2`; `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:2` | version-bump |
| `card_prints` | table | read | yes | `lib/models/card_print.dart:105`; `lib/models/card_print.dart:254`; `lib/models/card_print.dart:439`; `lib/models/card_print.dart:452`; `lib/models/card_print.dart:464`; `lib/models/card_print.dart:478`; `lib/models/card_print.dart:492`; `lib/models/card_print.dart:505`; `lib/models/card_print.dart:559` | unknown | version-bump |
| `sets` | table | read | medium | `lib/models/card_print.dart:392` | unknown | flexible |
| `condition_snapshots_insert_v1` | rpc | write | yes | `lib/services/scanner/condition_scan_service.dart:150` | unknown | version-bump |
| `condition_snapshot_analyses` | table | read | yes | `lib/services/scanner/condition_scan_service.dart:176`; `lib/services/scanner/condition_scan_service.dart:197` | unknown | version-bump |
| `condition_snapshots` | table | read+write | medium | `edge:scan-read(supabase/functions/scan-read/index.ts:39)`; `edge:identity_scan_enqueue_v1(supabase/functions/identity_scan_enqueue_v1/index.ts:89)` | unknown | flexible |
| `v_condition_snapshot_analyses_match_card_v1` | view | read | medium | `lib/services/scanner/condition_scan_service.dart:281` | unknown | flexible |
| `admin_condition_assist_insert_analysis_v1` | rpc | write | medium | `lib/services/scanner/condition_scan_service.dart:371` | unknown | flexible |
| `ingestion_jobs` | table | read+write | medium | `lib/services/scanner/condition_scan_service.dart:397`; `lib/services/scanner/condition_scan_service.dart:416` | unknown | flexible |
| `ebay_accounts` | table | read+write | medium | `edge:ebay_oauth_callback(supabase/functions/ebay_oauth_callback/index.ts:149)`; `edge:ebay_oauth_callback(supabase/functions/ebay_oauth_callback/index.ts:174)`; `edge:ebay_oauth_callback(supabase/functions/ebay_oauth_callback/index.ts:183)` | unknown | flexible |
| `admin.import_prices_do` | rpc | write | medium | `edge:import-prices(supabase/functions/import-prices/index.ts:129)`; `edge:import-prices(supabase/functions/import-prices/index.ts:151)`; `edge:import-prices-bridge(supabase/functions/import-prices-bridge/index.ts:115)`; `edge:import-prices-v3(supabase/functions/import-prices-v3/index.ts:118)` | unknown | flexible |
| `admin.import_runs` | table | read+write | medium | `edge:import-prices(supabase/functions/import-prices/index.ts:113)`; `edge:import-prices(supabase/functions/import-prices/index.ts:131)`; `edge:import-prices(supabase/functions/import-prices/index.ts:139)` | unknown | flexible |
| `admin_fingerprint_event_insert_v1` | rpc | write | low | `lib/screens/scanner/scan_capture_screen.dart:898` | unknown | flexible |
| `identity_snapshots` | table | read+write | medium | `edge:identity_scan_enqueue_v1(supabase/functions/identity_scan_enqueue_v1/index.ts:76)`; `flutter:lib/services/identity/identity_scan_service.dart:109` | unknown | flexible |
| `identity_scan_events` | table | read+write | yes | `edge:identity_scan_enqueue_v1(supabase/functions/identity_scan_enqueue_v1/index.ts:134)`; `edge:identity_scan_get_v1(supabase/functions/identity_scan_get_v1/index.ts:42)`; `edge:identity_scan_get_v1(supabase/functions/identity_scan_get_v1/index.ts:54)`; `flutter:lib/services/identity/identity_scan_service.dart:109`; `flutter:lib/services/identity/identity_scan_service.dart:130` | unknown | version-bump |
| `identity_scan_event_results` | table | read | yes | `lib/services/identity/identity_scan_service.dart:148` | unknown | version-bump |
| `vault_add_or_increment` | rpc | write | yes | `lib/screens/identity_scan/identity_scan_screen.dart:235` | unknown | version-bump |
| `catalog_submissions_v1` | table | write | low | `lib/screens/identity_scan/identity_scan_screen.dart:306` | unknown | flexible |

## Invariants (V1)

- `card_print_active_prices` is the Card Detail pricing read surface; the returned row is used for pricing display and TTL refresh gating before enqueueing a live price request (`lib/card_detail_screen.dart:60`, `lib/card_detail_screen.dart:131`).
- `v_vault_items` is the primary vault list read surface used by the Vault page (`lib/main.dart:1385`).
- `vault_items` is the direct mutation surface used by Vault page and Scan Identify add flow (`lib/main.dart:1400`, `lib/main.dart:1405`, `lib/main.dart:1470`, `lib/screens/scanner/scan_identify_screen.dart:99`).
- `pricing_jobs` insert is the app action path for "Request live price" (`lib/card_detail_screen.dart:131`), and the same surface is consumed by pricing workers and edge queue endpoint (consumers listed in index).
- Identity scan workflow writes `identity_snapshots` and reads latest `identity_scan_event_results` for status/candidates/signals (`lib/services/identity/identity_scan_service.dart:95`, `lib/services/identity/identity_scan_service.dart:148`).
- Scanner workflow uses `condition_snapshots_insert_v1` for snapshot finalize, then uses `condition_snapshots` and `condition_snapshot_analyses` for polling/rendering analysis (`lib/services/scanner/condition_scan_service.dart:150`, `lib/services/scanner/condition_scan_service.dart:226`, `lib/services/scanner/condition_scan_service.dart:267`, `lib/services/scanner/condition_scan_service.dart:176`, `lib/services/scanner/condition_scan_service.dart:197`).
- Catalog search uses `search_card_prints_v1` as primary contract path with direct `card_prints` queries present in repository fallback/search builders (`lib/models/card_print.dart:273`, `lib/models/card_print.dart:105`).

## Change Policy

- Tier 0 Views/RPCs:
  - breaking changes require a new `*_v2` contract name.
  - no in-place breaking changes.
- Tier 0 Tables:
  - additive-only changes are allowed.
  - destructive changes require coordinated migration plus consumer updates.
  - do not version-bump table names.
- Tier 0 verification rule: any change touching a Tier 0 surface must include the full V1 verification checklist below before and after the change.
- Tier 1 rule: changes are allowed only with strict verification and explicit consumer checks.
- Tier 2 rule: flexible evolution is allowed with consumer smoke validation.

## Edge Privilege Boundary Rules (V1)

- `pricing-live-request` boundary rule:
  - authenticated user is required via shared `requireUser` gate.
  - unauthenticated or invalid JWT requests return `401` with `error=auth_required`.
  - service-role write to `pricing_jobs` executes only after auth and payload validation pass.
  - evidence: `supabase/functions/pricing-live-request/index.ts:2`, `supabase/functions/pricing-live-request/index.ts:27`, `supabase/functions/pricing-live-request/index.ts:49`, `supabase/functions/pricing-live-request/index.ts:108`.
- `import-prices*` functions use bridge-token gate pattern:
  - `import-prices`, `import-prices-bridge`, `import-prices-v3` gate by `x-bridge-token`/`BRIDGE_IMPORT_TOKEN`.
  - these functions execute `admin.import_prices_do`; `import-prices` also touches `admin.import_runs`.
  - evidence: `supabase/functions/import-prices/index.ts:129`, `supabase/functions/import-prices/index.ts:151`, `supabase/functions/import-prices/index.ts:113`; `supabase/functions/import-prices-bridge/index.ts:115`; `supabase/functions/import-prices-v3/index.ts:118`.
- Auth pattern differences are part of boundary contract:
  - shared `requireUser` path: `identity_scan_enqueue_v1`, `identity_scan_get_v1`.
  - manual bearer + `auth.getUser` path: `scan-upload-plan`, `scan-read`.
  - evidence: `supabase/functions/identity_scan_enqueue_v1/index.ts:45`, `supabase/functions/identity_scan_get_v1/index.ts:22`, `supabase/functions/scan-upload-plan/index.ts:92`, `supabase/functions/scan-read/index.ts:29`.
- Env key naming drift is a contract boundary risk:
  - `_shared/key_resolver.ts` uses `SUPABASE_SECRET_KEY`.
  - other edge functions commonly use `SUPABASE_SERVICE_ROLE_KEY`.
  - evidence: `supabase/functions/_shared/key_resolver.ts:2`; `supabase/functions/scan-upload-plan/index.ts:42`; `supabase/functions/identity_scan_enqueue_v1/index.ts:55`; `supabase/functions/ebay_oauth_callback/index.ts:141`.

## Verification Checklist (V1)

### 1) SQL smoke tests for Tier 0 surfaces
- `select 1 from public.v_vault_items limit 1;`
- `select 1 from public.vault_items limit 1;`
- `select 1 from public.card_print_active_prices limit 1;`
- `select 1 from public.card_prints limit 1;`
- `select 1 from public.pricing_jobs limit 1;`
- `select * from public.search_card_prints_v1(q => 'pikachu', set_code_in => null, number_in => null, limit_in => 1, offset_in => 0) limit 1;`
- `select 1 from public.identity_scan_events limit 1;`
- `select 1 from public.condition_snapshot_analyses limit 1;`
- `select 1 from public.identity_scan_event_results limit 1;`
- Transactional write-RPC smoke (fixture-backed): run in `BEGIN ... ROLLBACK` using valid fixture IDs for:
  - `public.condition_snapshots_insert_v1(...)`
  - `public.vault_add_or_increment(...)`

### 2) Column-shape snapshot steps
- Capture table/view column shapes:
  - `information_schema.columns` for each Tier 0 table/view (`table_schema='public'`, ordered by `ordinal_position`).
- Capture RPC argument and return signatures:
  - `pg_get_function_identity_arguments(p.oid)` and `pg_get_function_result(p.oid)` from `pg_proc` for Tier 0 RPCs.
- Compare pre-change vs post-change snapshots and confirm no breaking delta for Tier 0 unless version-bumped.

### 3) Flutter compile/run smoke intent
- Compile and run Flutter app.
- Validate Tier 0 user flows:
  - Catalog search and results render.
  - Vault list loads and vault mutations work.
  - Card Detail pricing loads and "Request live price" enqueue path works.
  - Condition scan finalize/poll paths work.
  - Identity scan start/poll/add-to-vault path works.

### 4) Edge boundary smoke tests
- `pricing-live-request`
  - Unauthenticated call must return `401` with body containing `{"error":"auth_required"}`.
  - Authenticated call with invalid payload must return `400` with body containing `{"error":"invalid_request","fields":{...}}`.
  - Authenticated call with valid payload must return `201` with `status=queued`.
  - Current implementation outcome for duplicate requests: always enqueues (schema does not support requester-bound deterministic dedupe).
- `scan-upload-plan`
  - Smoke check requirement: request without bearer must fail; request with valid bearer must succeed.
  - Evidence path: manual bearer extraction + `auth.getUser` in `supabase/functions/scan-upload-plan/index.ts:92`.
- `identity_scan_enqueue_v1` and `identity_scan_get_v1`
  - Smoke check requirement: verify `requireUser` path rejects missing/invalid bearer and accepts valid bearer.
  - Evidence path: `supabase/functions/identity_scan_enqueue_v1/index.ts:45`; `supabase/functions/identity_scan_get_v1/index.ts:22`.

## Schema Gap Report

- Surface: `public.pricing_jobs`
- Audited definition:
  - `supabase/migrations/20251213153625_baseline_init.sql:1824`
  - columns: `id`, `card_print_id`, `priority`, `reason`, `status`, `attempts`, `error`, `requested_at`, `started_at`, `completed_at`.
  - constraints/indexes:
    - PK: `supabase/migrations/20251213153630_baseline_constraints.sql:175`
    - FK `card_print_id`: `supabase/migrations/20251213153630_baseline_constraints.sql:343`
    - index `(status, priority, requested_at)`: `supabase/migrations/20251213153631_baseline_indexes.sql:122`
- Blocking gaps for full hardening:
  - no requester identity column (`user_id`/`requester_user_id`) to persist authenticated caller on enqueue.
  - no deterministic idempotency key column or uniqueness constraint for requester+card in-flight dedupe.
- Minimal safe schema additions required for full hardening (not applied in this task):
  - `requester_user_id uuid` (FK to `auth.users.id`) on `pricing_jobs`.
  - `idempotency_key text` (or equivalent deterministic key field) plus uniqueness rule for active jobs.

## Open Questions (Must Audit)

- Migration definitions are unknown from the provided artifacts for these surfaces: `vault_items`, `card_prints`, `sets`, `condition_snapshots_insert_v1`, `condition_snapshot_analyses`, `condition_snapshots`, `v_condition_snapshot_analyses_match_card_v1`, `admin_condition_assist_insert_analysis_v1`, `ingestion_jobs`, `admin_fingerprint_event_insert_v1`, `identity_snapshots`, `identity_scan_event_results`, `vault_add_or_increment`, `catalog_submissions_v1`.
- Flutter calls edge functions (`scan-upload-plan`, `identity_scan_enqueue_v1`, `identity_scan_get_v1`, `card-identify`) whose internal DB dependencies are not included in the provided DB-contract artifacts.
- `card-identify` source is missing under `supabase/functions`; DB/RPC touchpoints and auth model cannot be determined statically from repository code.
- RLS/policy/grant assumptions for these app-facing surfaces are not proven by the provided artifacts.
- Full worker and edge-function dependency coverage is only proven in the provided artifacts for `v_vault_items`, `card_print_active_prices`, `search_card_prints_v1`, and `pricing_jobs`.
