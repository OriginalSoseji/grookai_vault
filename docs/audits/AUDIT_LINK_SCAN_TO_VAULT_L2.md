# AUDIT LINK SCAN TO VAULT L2 (Evidence Only)

Date: 2026-02-14  
Scope lock: read-only audit, no schema/behavior changes.

## Verdict
- Primary true scenario: **(1) AI gives hints only (no active resolver output carrying `card_print_id`)**.
- Secondary (latent) issue: **(2) partially true**; UI has Add-to-Vault code but state flow can keep it hidden in `hintReady`.
- Scenario (3): **false**; vault write path exists and is called by identity UI when a candidate has `card_print_id`.

## A) Database Evidence
### Existing tables/views and columns
- `condition_snapshots` exists with PK `id` and nullable `card_print_id`: `supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql:7`, `supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql:8`, `supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql:29`.
- `identity_scan_events` exists with PK `id`, FK `snapshot_id -> condition_snapshots(id)`, plus `signals`/`candidates` JSONB: `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:7`, `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:8`, `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:10`, `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:11`, `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:12`.
- `identity_scan_event_results` exists with PK `id`, FK to `identity_scan_events`, and `signals`/`candidates` JSONB: `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:4`, `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:5`, `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:7`, `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:9`, `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:10`.
- `identity_scan_selections` exists and does carry `selected_card_print_id` FK to `card_prints`: `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:80`, `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:84`.
- Dual-envelope identity event support exists (`source_table`, `identity_snapshot_id`, envelope check): `supabase/migrations/20260206143219_identity_scan_events_source_table.sql:4`, `supabase/migrations/20260206143219_identity_scan_events_source_table.sql:11`, `supabase/migrations/20260206144232_identity_scan_events_dual_fk.sql:5`, `supabase/migrations/20260206144232_identity_scan_events_dual_fk.sql:13`, `supabase/migrations/20260206144232_identity_scan_events_dual_fk.sql:20`, `supabase/migrations/20260206155742_identity_scan_events_snapshot_nullable.sql:4`.
- Identity-scan-related `v_*` view: none found for identity events/results. The relevant scanner view present is fingerprint lane match-surface view `v_condition_snapshot_analyses_match_card_v1`: `supabase/migrations/20260205222100_match_card_surface_v1.sql:5`.

### `card_print_id` / hint storage / FK findings
- `identity_scan_events` and `identity_scan_event_results` do **not** define first-class `card_print_id` columns; they store hints/candidates JSON (`signals`, `candidates`): `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:11`, `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:12`, `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:9`, `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:10`.
- `condition_snapshots_insert_identity_v1` explicitly inserts `card_print_id = null` (identity envelope only): `supabase/migrations/20260205232559_condition_snapshots_insert_identity_v1.sql:45`, `supabase/migrations/20260205232559_condition_snapshots_insert_identity_v1.sql:59`, `supabase/migrations/20260205232559_condition_snapshots_insert_identity_v1.sql:68`.

### Resolver/vault RPC evidence
- Resolver RPC exists: `search_card_prints_v1` returns `setof public.v_card_search`: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:2`, `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:8`.
- Vault write SQL paths exist:
  - `vault_add_item` inserts one row and returns id: `supabase/migrations/20251213153626_baseline_functions.sql:616`, `supabase/migrations/20251213153626_baseline_functions.sql:621`, `supabase/migrations/20251213153626_baseline_functions.sql:624`.
  - `vault_add_or_increment` upserts and increments qty on `(user_id, card_id)`: `supabase/migrations/20251213153626_baseline_functions.sql:664`, `supabase/migrations/20251213153626_baseline_functions.sql:668`, `supabase/migrations/20251213153626_baseline_functions.sql:670`, `supabase/migrations/20251213153626_baseline_functions.sql:672`.
  - Unique index supports that upsert shape: `supabase/migrations/20251213153631_baseline_indexes.sql:192`.
- Edge functions in `supabase/functions` for identity (`identity_scan_enqueue_v1`, `identity_scan_get_v1`) do not write `vault_items`; they enqueue/read identity events: `supabase/functions/identity_scan_enqueue_v1/index.ts:134`, `supabase/functions/identity_scan_get_v1/index.ts:42`.

## B) UI Evidence
### Where identity result data exists
- Identity screen holds event/snapshot/candidates/signals + AI hint fields: `lib/screens/identity_scan/identity_scan_screen.dart:33`, `lib/screens/identity_scan/identity_scan_screen.dart:34`, `lib/screens/identity_scan/identity_scan_screen.dart:35`, `lib/screens/identity_scan/identity_scan_screen.dart:37`, `lib/screens/identity_scan/identity_scan_screen.dart:38`, `lib/screens/identity_scan/identity_scan_screen.dart:40`.
- Poll marks `hintReady` on `ai_hint_ready` and copies `res.candidates`: `lib/screens/identity_scan/identity_scan_screen.dart:162`, `lib/screens/identity_scan/identity_scan_screen.dart:171`, `lib/screens/identity_scan/identity_scan_screen.dart:172`.
- Service polling reads latest `identity_scan_event_results` row (`status,error,candidates,signals`): `lib/services/identity/identity_scan_service.dart:148`, `lib/services/identity/identity_scan_service.dart:149`.

### Whether UI ever has `card_print_id`
- Add path expects selected candidate `card_print_id`: `lib/screens/identity_scan/identity_scan_screen.dart:218`.
- If missing, UI blocks insert with explicit message: `lib/screens/identity_scan/identity_scan_screen.dart:220`.

### Add-to-vault button and method
- Identity screen has Add button wired to `_addToVault`: `lib/screens/identity_scan/identity_scan_screen.dart:395`.
- `_addToVault` writes directly to `vault_items`: `lib/screens/identity_scan/identity_scan_screen.dart:229`.
- Main manual catalog flow also writes to `vault_items`: `lib/main.dart:1427`, `lib/main.dart:1470`.
- `card_detail_screen` currently has no live vault action; button is “coming soon”: `lib/card_detail_screen.dart:540`.

### Scanner capture flow linkage
- Scanner condition flow reads match card view data and navigates to details; no vault insert at this point: `lib/services/scanner/condition_scan_service.dart:281`, `lib/services/scanner/condition_scan_service.dart:283`, `lib/screens/scanner/scan_capture_screen.dart:743`, `lib/screens/scanner/scan_capture_screen.dart:817`.

## C) Deterministic Data-Flow Map
1. Identity capture uploads image and creates `identity_snapshots`: `lib/services/identity/identity_scan_service.dart:95`.
2. UI enqueues `identity_scan_events` via edge function: `lib/services/identity/identity_scan_service.dart:109`, `supabase/functions/identity_scan_enqueue_v1/index.ts:134`.
3. Worker writes append-only `identity_scan_event_results`: `backend/identity/identity_scan_worker_v1.mjs:289`, `backend/identity/identity_scan_worker_v1.mjs:291`.
4. Current worker success path writes `status='ai_hint_ready'` with `candidates: []`: `backend/identity/identity_scan_worker_v1.mjs:499`.
5. GrookAI vision worker also writes `ai_hint_ready` with `candidates: []`: `backend/identity/grookai_vision_worker_v1.mjs:346`, `backend/identity/grookai_vision_worker_v1.mjs:348`.
6. UI polls results and lands in `hintReady`; `_buildResults` returns banner early in that state: `lib/screens/identity_scan/identity_scan_screen.dart:171`, `lib/screens/identity_scan/identity_scan_screen.dart:321`.
7. Add-to-vault is only usable if a selected candidate has `card_print_id`: `lib/screens/identity_scan/identity_scan_screen.dart:218`, `lib/screens/identity_scan/identity_scan_screen.dart:229`.

## Existing
- Resolver RPC exists (`search_card_prints_v1`) but not evidenced as executed in current worker path: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:2`, `backend/identity/identity_scan_worker_v1.mjs:310`.
- Vault write paths exist in SQL RPCs and direct UI insert path: `supabase/migrations/20251213153626_baseline_functions.sql:616`, `supabase/migrations/20251213153626_baseline_functions.sql:664`, `lib/screens/identity_scan/identity_scan_screen.dart:229`.

## Partial
- UI already defines candidates selection + Add-to-vault pipeline, but state machine prioritizes `hintReady` banner: `lib/screens/identity_scan/identity_scan_screen.dart:171`, `lib/screens/identity_scan/identity_scan_screen.dart:321`, `lib/screens/identity_scan/identity_scan_screen.dart:395`.
- `identity_scan_selections.selected_card_print_id` table exists but has no usage evidence in app/backend code paths (only migration definitions): `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:80`, `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:84`.

## Missing (Exact Link)
- Missing operational resolver step that turns AI hints into non-empty candidate rows carrying `card_print_id` in `identity_scan_event_results.candidates`.
  - Evidence: success writes `ai_hint_ready` with `[]` candidates in both workers: `backend/identity/identity_scan_worker_v1.mjs:499`, `backend/identity/grookai_vision_worker_v1.mjs:348`.
  - Net effect: identity Add-to-vault cannot consistently activate because `card_print_id` is absent at candidate source.

## Risks
- Duplicate vault rows if direct inserts are used instead of increment path (constraint collision risk against unique `(user_id, card_id)`): `supabase/migrations/20251213153631_baseline_indexes.sql:192`, `lib/screens/identity_scan/identity_scan_screen.dart:229`.
- Wrong-set match risk if resolver matching is introduced without deterministic set/number constraints (resolver contract exists but currently unused in worker success path): `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:32`, `backend/identity/identity_scan_worker_v1.mjs:310`.
- Auth/RLS risk for writes if `user_id` mismatches caller (RLS enforces owner): `supabase/migrations/20251213153633_baseline_policies.sql:38`, `supabase/migrations/20251213153633_baseline_policies.sql:40`.

## Deterministic Fix Plan (Not Implemented)
1. In identity worker success path, call `search_card_prints_v1` using AI hints (name/set/collector_number), build ranked candidates including `card_print_id`, and write them into `identity_scan_event_results.candidates`.
2. In identity UI, transition from `hintReady` to candidate-results state when candidates are non-empty so Add button is visible.
3. Keep current vault insert call (or switch to `vault_add_or_increment`) once candidate `card_print_id` is present.

## Audit Continuation — Resolver & Vault RPC Verification (Evidence Only)
### DB Surface Verification
- `identity_scan_events` columns/types (base + later migrations):
  - base table has `id uuid`, `user_id uuid`, `snapshot_id uuid`, `signals jsonb`, `candidates jsonb`, `analysis_version text`, `status text`, `error text`, `created_at timestamptz`: `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:7`.
  - later adds `source_table text` with check constraint: `supabase/migrations/20260206143219_identity_scan_events_source_table.sql:4`, `supabase/migrations/20260206143219_identity_scan_events_source_table.sql:11`.
  - later adds `identity_snapshot_id uuid` FK and envelope exclusivity check: `supabase/migrations/20260206144232_identity_scan_events_dual_fk.sql:5`, `supabase/migrations/20260206144232_identity_scan_events_dual_fk.sql:13`, `supabase/migrations/20260206144232_identity_scan_events_dual_fk.sql:20`.
  - later makes `snapshot_id` nullable: `supabase/migrations/20260206155742_identity_scan_events_snapshot_nullable.sql:4`.
- `identity_scan_event_results` columns/types:
  - `id uuid`, `user_id uuid`, `identity_scan_event_id uuid`, `status text`, `signals jsonb`, `candidates jsonb`, `error text`, `analysis_version text`, `created_at timestamptz`: `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:4`.
- `candidates` shape documentation:
  - Not explicitly schema-constrained beyond JSONB default `[]` in both events/results tables: `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql:12`, `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql:10`.
  - De facto consumer shape from UI requires keys `card_print_id`, `name`, `set_code`, `number`, `image_url`: `lib/screens/identity_scan/identity_scan_screen.dart:218`, `lib/screens/identity_scan/identity_scan_screen.dart:232`, `lib/screens/identity_scan/identity_scan_screen.dart:233`, `lib/screens/identity_scan/identity_scan_screen.dart:245`, `lib/screens/identity_scan/identity_scan_screen.dart:246`.
- Identity UI `v_*` view usage:
  - Searched identity flow files for `.from('v_...')`; none found (`NO_VIEWS_FOUND_IN_IDENTITY_FLOW`).
  - nearest related read surface is direct table `identity_scan_event_results`: `lib/services/identity/identity_scan_service.dart:148`.

### Verified Vault Write Function (Canonical Increment Path)
- Function name/signature:
  - `public.vault_add_or_increment(p_card_id uuid, p_delta_qty integer, p_condition_label text default 'NM', p_notes text default null)`: `supabase/migrations/20251213153626_baseline_functions.sql:664`.
- Behavior:
  - inserts into `public.vault_items` and `on conflict (user_id, card_id)` increments qty: `supabase/migrations/20251213153626_baseline_functions.sql:668`, `supabase/migrations/20251213153626_baseline_functions.sql:670`, `supabase/migrations/20251213153626_baseline_functions.sql:672`.
  - unique index enforcing conflict key exists: `supabase/migrations/20251213153631_baseline_indexes.sql:192`.
- Return type:
  - `RETURNS SETOF public.vault_items`: `supabase/migrations/20251213153626_baseline_functions.sql:664`.
  - returned row contains `id` (vault item id), `user_id`, `card_id`, `qty`, etc. via table definition: `supabase/migrations/20251213153626_baseline_functions.sql:632`, `supabase/migrations/20251213153626_baseline_functions.sql:633`, `supabase/migrations/20251213153626_baseline_functions.sql:635`, `supabase/migrations/20251213153626_baseline_functions.sql:636`.
- Security notes:
  - `LANGUAGE sql SECURITY DEFINER`: `supabase/migrations/20251213153626_baseline_functions.sql:665`.
  - `vault_items` RLS owner policies exist (`insert/select/update/delete`): `supabase/migrations/20251213153633_baseline_policies.sql:38`, `supabase/migrations/20251213153633_baseline_policies.sql:40`, `supabase/migrations/20251213153633_baseline_policies.sql:42`, `supabase/migrations/20251213153633_baseline_policies.sql:36`.

### Verified Resolver Function
- Function name/signature:
  - `public.search_card_prints_v1(q text default null, set_code_in text default null, number_in text default null, limit_in int default 50, offset_in int default 0)`: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:2`.
- Return type:
  - `RETURNS SETOF public.v_card_search`: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:8`.
- Returned columns relevant to wiring:
  - `v_card_search` includes `id` (card print id), `name`, `set_code`, `number`, `image_url`, `thumb_url`, `image_best`: `supabase/migrations/20251213153627_baseline_views.sql:35`, `supabase/migrations/20251213153627_baseline_views.sql:36`, `supabase/migrations/20251213153627_baseline_views.sql:37`, `supabase/migrations/20251213153627_baseline_views.sql:38`, `supabase/migrations/20251213153627_baseline_views.sql:39`, `supabase/migrations/20251213153627_baseline_views.sql:51`, `supabase/migrations/20251213153627_baseline_views.sql:53`.
- Expected resolver inputs from function contract:
  - `q` (name-like text), `set_code_in` (normalized set code), `number_in` (collector number text parsed to digits): `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:3`, `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:4`, `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:5`.

### Status Values and UI Interpretation
- Event enqueue initializes status `pending`: `supabase/functions/identity_scan_enqueue_v1/index.ts:118`, `supabase/functions/identity_scan_enqueue_v1/index.ts:128`.
- Worker result writes use `ai_hint_ready` and `failed`: `backend/identity/identity_scan_worker_v1.mjs:499`, `backend/identity/identity_scan_worker_v1.mjs:504`, `backend/identity/grookai_vision_worker_v1.mjs:346`.
- UI interpretation:
  - handles `ai_hint_ready` by setting `_step = hintReady` and loading `_candidates`: `lib/screens/identity_scan/identity_scan_screen.dart:162`, `lib/screens/identity_scan/identity_scan_screen.dart:171`, `lib/screens/identity_scan/identity_scan_screen.dart:172`.
  - handles `failed` by setting error step: `lib/screens/identity_scan/identity_scan_screen.dart:184`, `lib/screens/identity_scan/identity_scan_screen.dart:186`.
  - does not transition to `_IdentityScanStep.results` in poll path; `hintReady` banner short-circuits candidate list rendering: `lib/screens/identity_scan/identity_scan_screen.dart:321`.

### Worker Surface Verification
- `identity_scan_event_results` insert sites:
  - `identity_scan_worker_v1` uses `insertResult(... status, signals, candidates, error)`: `backend/identity/identity_scan_worker_v1.mjs:289`.
  - success currently inserts `status='ai_hint_ready'` with `candidates: []`: `backend/identity/identity_scan_worker_v1.mjs:499`.
  - `grookai_vision_worker_v1` inserts `status='ai_hint_ready'` with `candidates: []`: `backend/identity/grookai_vision_worker_v1.mjs:343`, `backend/identity/grookai_vision_worker_v1.mjs:346`, `backend/identity/grookai_vision_worker_v1.mjs:348`.
- Available hint fields in workers (variable names):
  - `identity_scan_worker_v1`: `name`, `identifyCollectorNumber`, `identifyPrintedTotal`, `readCollectorNumber`, `readPrintedTotal`, `hp`, `confidence`; stored into `signals.ai` (`collector_number`, `printed_total`, `identify_debug`): `backend/identity/identity_scan_worker_v1.mjs:421`, `backend/identity/identity_scan_worker_v1.mjs:427`, `backend/identity/identity_scan_worker_v1.mjs:431`, `backend/identity/identity_scan_worker_v1.mjs:445`, `backend/identity/identity_scan_worker_v1.mjs:446`, `backend/identity/identity_scan_worker_v1.mjs:437`, `backend/identity/identity_scan_worker_v1.mjs:438`, `backend/identity/identity_scan_worker_v1.mjs:474`, `backend/identity/identity_scan_worker_v1.mjs:486`, `backend/identity/identity_scan_worker_v1.mjs:487`.
  - `grookai_vision_worker_v1`: `gvEvidence.name`, `gvEvidence.number_raw`, `gvEvidence.printed_total`, `gvEvidence.hp`, `gvEvidence.confidence_0_1`: `backend/identity/grookai_vision_worker_v1.mjs:301`, `backend/identity/grookai_vision_worker_v1.mjs:308`, `backend/identity/grookai_vision_worker_v1.mjs:318`, `backend/identity/grookai_vision_worker_v1.mjs:327`, `backend/identity/grookai_vision_worker_v1.mjs:331`.
- Sample JSON object from worker logs (code-defined payload shape):
  - workers log as JSON `{ ts, event, ...payload }`: `backend/identity/identity_scan_worker_v1.mjs:19`, `backend/identity/identity_scan_worker_v1.mjs:20`.
  - example logged payload call: `log('ai_identify_ok', { eventId, run_id: aiPayload.run_id || null })`: `backend/identity/identity_scan_worker_v1.mjs:498`.

### UI Surface Verification
- `_candidates` population path:
  - poll reads `identity_scan_event_results.status,error,candidates,signals`: `lib/services/identity/identity_scan_service.dart:148`, `lib/services/identity/identity_scan_service.dart:149`.
  - UI sets `_candidates = res.candidates` when `resultStatus == 'ai_hint_ready'`: `lib/screens/identity_scan/identity_scan_screen.dart:162`, `lib/screens/identity_scan/identity_scan_screen.dart:172`.
- candidate UI hidden condition:
  - `_buildResults` immediately returns `_buildAiHintBanner` when `_step == hintReady`, preventing candidate list/render path: `lib/screens/identity_scan/identity_scan_screen.dart:321`, `lib/screens/identity_scan/identity_scan_screen.dart:322`.
- Add-to-vault requirements and path:
  - requires selected `cand['card_print_id']`: `lib/screens/identity_scan/identity_scan_screen.dart:218`.
  - current implementation directly inserts into `vault_items` with `card_id`, `qty`, `condition_label`: `lib/screens/identity_scan/identity_scan_screen.dart:229`, `lib/screens/identity_scan/identity_scan_screen.dart:231`, `lib/screens/identity_scan/identity_scan_screen.dart:235`, `lib/screens/identity_scan/identity_scan_screen.dart:236`.

### Minimal Wiring Plan (Not Implemented)
1. Worker call target:
   - file: `backend/identity/identity_scan_worker_v1.mjs`
   - call resolver: `public.search_card_prints_v1(q, set_code_in, number_in, limit_in, offset_in)` using:
     - `q = name`
     - `set_code_in = null` (no set code currently available in `signals.ai`)
     - `number_in = readCollectorNumber ?? identifyCollectorNumber`
     - `limit_in = 10`, `offset_in = 0`
2. Worker write shape to `identity_scan_event_results.candidates`:
   - map each resolver row from `v_card_search` as:
     - `card_print_id: row.id`
     - `name: row.name`
     - `set_code: row.set_code`
     - `number: row.number`
     - `image_url: row.image_best ?? row.image_url`
   - keep status `ai_hint_ready`; replace `[]` with mapped candidates.
3. UI surfacing condition:
   - file: `lib/screens/identity_scan/identity_scan_screen.dart`
   - when in `hintReady`, if `_candidates.isNotEmpty`, render candidate list path instead of returning hint banner.
4. Vault write RPC selection:
   - use `public.vault_add_or_increment(p_card_id uuid, p_delta_qty integer, p_condition_label text, p_notes text)` as canonical insert/increment path: `supabase/migrations/20251213153626_baseline_functions.sql:664`.
   - args for Add action: `p_card_id = selectedCandidate.card_print_id`, `p_delta_qty = 1`, `p_condition_label = 'NM'`, `p_notes = null`.

### Stop-Rule Note (Missing Artifact)
- Formal documented JSON schema for `identity_scan_event_results.candidates` was not found in migrations/functions/UI docs.
- Searched:
  - identity schema migrations: `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql`, `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql`
  - identity edge functions: `supabase/functions/identity_scan_get_v1/index.ts`, `supabase/functions/identity_scan_enqueue_v1/index.ts`
  - identity UI consumer: `lib/screens/identity_scan/identity_scan_screen.dart`
- Nearest deterministic fallback used for planning:
  - resolver output columns from `public.v_card_search`: `supabase/migrations/20251213153627_baseline_views.sql:36`
  - de facto UI-required candidate keys: `lib/screens/identity_scan/identity_scan_screen.dart:218`, `lib/screens/identity_scan/identity_scan_screen.dart:232`.

## Resolver Verification (Evidence Only)
### Task 1 — Existing Resolver/Search RPCs (and usage)
- Search scope executed:
  - Terms: `search_card_prints`, `resolve`, `identity_resolve`, `card_search`, `v_card_search`, `search_card_prints_v1`
  - Paths: `supabase/migrations/**`, `supabase/**.sql`, `backend/**`, `lib/**` (excluding `node_modules`)
- Confirmed function: `public.search_card_prints_v1`
  - Definitions found in migrations:
    - `supabase/migrations/20260121153000_search_contract_v1_rpc.sql:2`
    - `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:2`
  - Signature (both files): `search_card_prints_v1(q text default null, set_code_in text default null, number_in text default null, limit_in int default 50, offset_in int default 0)`:
    - `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:2`
  - Return type: `returns setof public.v_card_search`:
    - `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:8`
  - Return columns include card print id via `v_card_search.id` (`cp.id`):
    - `supabase/migrations/20251213153627_baseline_views.sql:35`
    - `supabase/migrations/20251213153627_baseline_views.sql:36`
  - Usage sites:
    - Dart app RPC call: `lib/models/card_print.dart:273`
    - Web app RPC call: `apps/web/src/app/catalog/page.tsx:34`
    - Identity backend worker has comment reference only (no RPC invocation found): `backend/identity/identity_scan_worker_v1.mjs:310`

- Legacy/adjacent primitive found outside active migration flow:
  - `public.search_cards(q text, limit int, offset int) returns setof public.v_card_search` appears in schema dump snapshots:
    - `supabase/000_baseline_prod.sql:845`
    - `supabase/_migration_quarantine/20251127041609_remote_schema.sql:1057`
  - In active migrations, only a metadata/comment marker appears (no executable function body):
    - `supabase/migrations/20251213153625_baseline_init.sql:310`

- Zero-hit terms for resolver-specific naming:
  - Searched terms: `identity_resolve`, `create ... function ... resolve`
  - Paths searched: `supabase/migrations/**`, `supabase/**/*.sql`, `backend/**`, `lib/**` (excluding `node_modules`)
  - Result: no resolver function definitions with `identity_resolve` naming were found.

### Task 2 — Canonical Tables/Columns + Search-Supporting Indexes
- `card_prints` schema (canonical search surface)
  - table create: `supabase/migrations/20251213153625_baseline_init.sql:207`
  - key resolver columns present:
    - `id`: `supabase/migrations/20251213153625_baseline_init.sql:208`
    - `name`: `supabase/migrations/20251213153625_baseline_init.sql:211`
    - `set_code`: `supabase/migrations/20251213153625_baseline_init.sql:219`
    - `number`: `supabase/migrations/20251213153625_baseline_init.sql:212`
    - `number_plain` (generated): `supabase/migrations/20251213153625_baseline_init.sql:220`
    - `printed_set_abbrev`: `supabase/migrations/20251213153625_baseline_init.sql:235`
    - `printed_total`: `supabase/migrations/20251213153625_baseline_init.sql:236`

- `sets` schema
  - table create: `supabase/migrations/20251213153625_baseline_init.sql:1980`
  - columns include `code` and `name`:
    - `code`: `supabase/migrations/20251213153625_baseline_init.sql:1983`
    - `name`: `supabase/migrations/20251213153625_baseline_init.sql:1984`
  - explicit evidence of absence in `public.sets`: no `set_code`, no `printed_set_abbrev`, no `printed_total` in this table definition snippet:
    - `supabase/migrations/20251213153625_baseline_init.sql:1980`
  - nearest related table with `printed_total` is staging `tcgdex_sets` (`printed_total jsonb`), marked not user-facing:
    - `supabase/migrations/20251213153625_baseline_init.sql:2062`
    - `supabase/migrations/20251213153625_baseline_init.sql:2068`
    - `supabase/migrations/20251213153625_baseline_init.sql:2081`

- Search-supporting indexes (existing)
  - name search:
    - `card_prints_name_gin`: `supabase/migrations/20251213153631_baseline_indexes.sql:32`
    - `card_prints_name_trgm_idx`: `supabase/migrations/20251213153631_baseline_indexes.sql:34`
    - `card_prints_name_ci`: `supabase/migrations/20251213153631_baseline_indexes.sql:30`
  - set/number search:
    - `card_prints_set_code_number_plain_idx`: `supabase/migrations/20251213153631_baseline_indexes.sql:40`
    - `cp_setnum_idx` (`set_code, number`): `supabase/migrations/20251213153631_baseline_indexes.sql:52`
    - `idx_card_prints_setnumplain`: `supabase/migrations/20251213153631_baseline_indexes.sql:78`
  - sets code lookup:
    - `idx_sets_code`: `supabase/migrations/20251213153631_baseline_indexes.sql:126`

### Task 3 — AI Hint Fields Available for Resolver Input
- From `identity_scan_worker_v1` (written under `signals.ai`)
  - `name`: `backend/identity/identity_scan_worker_v1.mjs:421`
  - `collector_number` (via `gvEvidence.collector_number`): `backend/identity/identity_scan_worker_v1.mjs:486`
  - `printed_total` (via `gvEvidence.printed_total`): `backend/identity/identity_scan_worker_v1.mjs:487`
  - no set-code field is extracted into `signals.ai` in this path (fields shown are name/number/total/hp/confidence): `backend/identity/identity_scan_worker_v1.mjs:474`

- From `grookai_vision_worker_v1` (written under `signals.grookai_vision`)
  - `name`: `backend/identity/grookai_vision_worker_v1.mjs:301`
  - `number_raw`: `backend/identity/grookai_vision_worker_v1.mjs:308`
  - `printed_total`: `backend/identity/grookai_vision_worker_v1.mjs:318`
  - no set-code field extracted in this object either: `backend/identity/grookai_vision_worker_v1.mjs:301`

### Candidate Resolver Requirements (Deterministic Rules)
- Existing SQL already defines deterministic matching/ranking rules in `search_card_prints_v1`:
  - normalize inputs: trim/lower set, digit-extract number: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:14`
  - optional exact set filter: `lower(v.set_code) = p.set_code_norm` when provided: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:32`
  - number matching priority: exact digits, padded digits, slashed prefix: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:34`
  - name filter: `v.name ilike '%' || p.q_norm || '%'`: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:40`
  - deterministic ordering: number match rank, set rank, then `v.name`, then `v.id`: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql:42`

- Minimal deterministic input mapping from current hints:
  - `q` <- `name`
  - `set_code_in` <- `null` (no reliable set hint field currently extracted)
  - `number_in` <- `collector_number` (or `number_raw` if using grookai evidence)
  - `limit_in`, `offset_in` as fixed bounds for candidate list.
