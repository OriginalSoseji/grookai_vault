# EDGE_FUNCTION_BOUNDARY_AUDIT_2026-02-23

## A) Flutter -> Edge Call Map

| flutter_file:line | invoked_function_name | calling_screen_or_service (nearest class/function) | purpose | payload shape (keys only) |
|---|---|---|---|---|
| `lib/services/scanner/condition_scan_service.dart:40` | `scan-upload-plan` | `ConditionScanService.getUploadPlan` (`lib/services/scanner/condition_scan_service.dart:38`) | Requests signed upload URLs and a server-issued snapshot ID for front/back scan uploads. | `vault_item_id`, `slots` |
| `lib/services/identity/identity_scan_service.dart:109` | `identity_scan_enqueue_v1` | `IdentityScanService.startScan` (`lib/services/identity/identity_scan_service.dart:48`) | Enqueues identity analysis for a created identity snapshot and reads returned `identity_scan_event_id`. | `snapshot_id` |
| `lib/services/identity/identity_scan_service.dart:130` | `identity_scan_get_v1?event_id=$eventId` | `IdentityScanService.pollOnce` (`lib/services/identity/identity_scan_service.dart:129`) | Polls identity scan event status via edge endpoint and merges event data with latest result row in app flow. | body keys: none; query key: `event_id` |
| `lib/screens/scanner/scan_identify_screen.dart:53` | `card-identify` | `_ScanIdentifyScreenState._identify` (`lib/screens/scanner/scan_identify_screen.dart:40`) | Calls identify endpoint and expects candidate list in response for scan-identify UI. | `note` |

## B) Edge Function Inventory

Notes:
- Inventory source: folders under `supabase/functions/*` with `index.ts`.
- `_shared` is support code, not an edge entrypoint.

| function_name | entry file path | auth model (based on code) | tables/views referenced (from('...')) | rpc names (rpc('...')) | direct SQL | service role usage |
|---|---|---|---|---|---|---|
| `diag-echo` | `supabase/functions/diag-echo/index.ts` | `anon` (no auth checks) | none | none | none | none |
| `ebay_oauth_callback` | `supabase/functions/ebay_oauth_callback/index.ts` | `user + service-role` (requires `Authorization` and `auth.getUser`, then service client write) | `ebay_accounts` (`supabase/functions/ebay_oauth_callback/index.ts:149`, `supabase/functions/ebay_oauth_callback/index.ts:174`, `supabase/functions/ebay_oauth_callback/index.ts:183`) | none | none | Uses `SUPABASE_SERVICE_ROLE_KEY` fallback to anon key (`supabase/functions/ebay_oauth_callback/index.ts:141`) |
| `identity_scan_enqueue_v1` | `supabase/functions/identity_scan_enqueue_v1/index.ts` | `user + service-role` (`requireUser`, then service-role client) | `identity_snapshots` (`supabase/functions/identity_scan_enqueue_v1/index.ts:76`), `condition_snapshots` (`supabase/functions/identity_scan_enqueue_v1/index.ts:89`), `identity_scan_events` (`supabase/functions/identity_scan_enqueue_v1/index.ts:134`) | none | none | Creates service-role client with `SUPABASE_SERVICE_ROLE_KEY` (`supabase/functions/identity_scan_enqueue_v1/index.ts:55`, `supabase/functions/identity_scan_enqueue_v1/index.ts:59`) |
| `identity_scan_get_v1` | `supabase/functions/identity_scan_get_v1/index.ts` | `user` via shared `requireUser` | `identity_scan_events` (`supabase/functions/identity_scan_get_v1/index.ts:42`, `supabase/functions/identity_scan_get_v1/index.ts:54`) | none | none | Uses `requireUser` from `_shared/auth.ts` (service-role-backed client configured with user token) |
| `import-prices` | `supabase/functions/import-prices/index.ts` | `anon + bridge token gate` (health branch bypasses token gate) | `admin.import_runs` (`supabase/functions/import-prices/index.ts:113`, `supabase/functions/import-prices/index.ts:131`, `supabase/functions/import-prices/index.ts:139`) | `set_config` (`supabase/functions/import-prices/index.ts:128`, `supabase/functions/import-prices/index.ts:150`), `admin.import_prices_do` (`supabase/functions/import-prices/index.ts:129`, `supabase/functions/import-prices/index.ts:151`) | none | No service-role key usage; uses publishable key client (`supabase/functions/import-prices/index.ts:70`) |
| `import-prices-bridge` | `supabase/functions/import-prices-bridge/index.ts` | `anon + bridge token gate` | none | `admin.import_prices_do` (`supabase/functions/import-prices-bridge/index.ts:115`) | none | No service-role key usage; uses publishable key client (`supabase/functions/import-prices-bridge/index.ts:112`) |
| `import-prices-v3` | `supabase/functions/import-prices-v3/index.ts` | `anon + bridge token gate` | none | `admin.import_prices_do` (`supabase/functions/import-prices-v3/index.ts:118`) | none | No service-role key usage; uses publishable key client (`supabase/functions/import-prices-v3/index.ts:102`) |
| `pricing-live-request` | `supabase/functions/pricing-live-request/index.ts` | `service-role` (no user auth checks) | `pricing_jobs` (`supabase/functions/pricing-live-request/index.ts:40`) | none | none | Uses service-role key from `_shared/key_resolver.ts` or `SUPABASE_SERVICE_ROLE_KEY` (`supabase/functions/pricing-live-request/index.ts:12`) |
| `scan-read` | `supabase/functions/scan-read/index.ts` | `user` (bearer required, user validated with anon client) | `condition_snapshots` (`supabase/functions/scan-read/index.ts:39`) | none | none | No service-role key usage; anon key with user bearer header (`supabase/functions/scan-read/index.ts:21`, `supabase/functions/scan-read/index.ts:27`) |
| `scan-upload-plan` | `supabase/functions/scan-upload-plan/index.ts` | `user + service-role` (bearer required, user validated, service-role client used) | none (no DB table/view `from(...)`) | none | none | Uses `SUPABASE_SERVICE_ROLE_KEY` and service-role client (`supabase/functions/scan-upload-plan/index.ts:42`, `supabase/functions/scan-upload-plan/index.ts:88`) |

### Support Modules (not edge entrypoints)
- `supabase/functions/_shared/auth.ts`
  - Defines `requireUser(req)` using service-role key + bearer token validation (`supabase/functions/_shared/auth.ts:53`, `supabase/functions/_shared/auth.ts:73`, `supabase/functions/_shared/auth.ts:79`).
- `supabase/functions/_shared/key_resolver.ts`
  - Resolves service key from `SUPABASE_SECRET_KEY` (`supabase/functions/_shared/key_resolver.ts:2`).

## C) Privilege Boundary Findings

### Admin-style writes (proven by code)
- `pricing-live-request`
  - Service-role insert into `pricing_jobs` with no bearer/user validation in function code (`supabase/functions/pricing-live-request/index.ts:12`, `supabase/functions/pricing-live-request/index.ts:40`).
- `ebay_oauth_callback`
  - Service-role writes to `ebay_accounts` after user auth resolution (`supabase/functions/ebay_oauth_callback/index.ts:142`, `supabase/functions/ebay_oauth_callback/index.ts:174`, `supabase/functions/ebay_oauth_callback/index.ts:183`).
- `identity_scan_enqueue_v1`
  - Service-role insert into `identity_scan_events` (`supabase/functions/identity_scan_enqueue_v1/index.ts:59`, `supabase/functions/identity_scan_enqueue_v1/index.ts:134`).
- `import-prices`
  - Writes to `admin.import_runs` and executes admin RPC `admin.import_prices_do` (`supabase/functions/import-prices/index.ts:113`, `supabase/functions/import-prices/index.ts:129`).
- `import-prices-bridge`
  - Executes admin RPC `admin.import_prices_do` (`supabase/functions/import-prices-bridge/index.ts:115`).
- `import-prices-v3`
  - Executes admin RPC `admin.import_prices_do` (`supabase/functions/import-prices-v3/index.ts:118`).

### Missing auth checks / inconsistent patterns (proven by code)
- No bearer/user auth check in `pricing-live-request`; it accepts JSON body and writes with service role.
- Auth patterns differ across functions:
  - Shared `requireUser` pattern: `identity_scan_enqueue_v1`, `identity_scan_get_v1`.
  - Manual bearer+`auth.getUser` with service role: `scan-upload-plan`.
  - Manual bearer+`auth.getUser` with anon key: `scan-read`.
  - Bridge-token gating (non-user auth): `import-prices`, `import-prices-bridge`, `import-prices-v3`.
- Service role key name usage is inconsistent:
  - `_shared/key_resolver.ts` uses `SUPABASE_SECRET_KEY`.
  - other functions reference `SUPABASE_SERVICE_ROLE_KEY`.

## D) Summary

### Top 5 highest-risk edge functions (with reason)
1. `pricing-live-request`
   - Reason: service-role write to `pricing_jobs` without bearer/user auth check (`supabase/functions/pricing-live-request/index.ts:12`, `supabase/functions/pricing-live-request/index.ts:40`).
2. `import-prices`
   - Reason: admin RPC execution plus writes to `admin.import_runs`; bridge-token gate only (`supabase/functions/import-prices/index.ts:113`, `supabase/functions/import-prices/index.ts:129`).
3. `import-prices-v3`
   - Reason: admin RPC `admin.import_prices_do`; bridge-token gate only (`supabase/functions/import-prices-v3/index.ts:118`).
4. `import-prices-bridge`
   - Reason: admin RPC `admin.import_prices_do`; bridge-token gate only (`supabase/functions/import-prices-bridge/index.ts:115`).
5. `ebay_oauth_callback`
   - Reason: service-role writes token-bearing account data to `ebay_accounts` (`supabase/functions/ebay_oauth_callback/index.ts:142`, `supabase/functions/ebay_oauth_callback/index.ts:174`, `supabase/functions/ebay_oauth_callback/index.ts:183`).

### Recommended edge-facing contract surfaces for APP_FACING_DB_CONTRACT_V1 (with evidence)

Tier 0 candidates:
- `identity_scan_events` (table)
  - Evidence: direct edge enqueue/read backbone in `identity_scan_enqueue_v1` and `identity_scan_get_v1` (`supabase/functions/identity_scan_enqueue_v1/index.ts:134`, `supabase/functions/identity_scan_get_v1/index.ts:42`).
- `pricing_jobs` (table)
  - Evidence: direct write by `pricing-live-request` (`supabase/functions/pricing-live-request/index.ts:40`), and Flutter live-price request flow uses same surface.

Tier 1 candidates:
- `condition_snapshots` (table)
  - Evidence: direct read by `scan-read` for signed URL response (`supabase/functions/scan-read/index.ts:39`).
- `identity_snapshots` (table)
  - Evidence: direct read during enqueue resolution (`supabase/functions/identity_scan_enqueue_v1/index.ts:76`).
- `ebay_accounts` (table)
  - Evidence: OAuth callback reads/writes this surface (`supabase/functions/ebay_oauth_callback/index.ts:149`, `supabase/functions/ebay_oauth_callback/index.ts:174`, `supabase/functions/ebay_oauth_callback/index.ts:183`).
- `admin.import_prices_do` (rpc) and `admin.import_runs` (table)
  - Evidence: legacy edge pricing functions directly execute/track imports (`supabase/functions/import-prices/index.ts:113`, `supabase/functions/import-prices/index.ts:129`; `supabase/functions/import-prices-bridge/index.ts:115`; `supabase/functions/import-prices-v3/index.ts:118`).

## Unresolved (Needs Manual Audit)

- Flutter invokes `card-identify` at `lib/screens/scanner/scan_identify_screen.dart:53`, but no `supabase/functions/card-identify/` entrypoint exists in this repository snapshot.
- Because the function source is absent, its auth model and DB/RPC targets cannot be determined statically from repository code.
