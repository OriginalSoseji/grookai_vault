# Web Vault Contract Reuse Audit v1

Date: 2026-03-12
Repo: `c:\grookai_vault`
Scope: original Flutter/mobile vault flows, current web auth/vault surface, Supabase schema/migrations for vault/account/card ownership

## 1. EXECUTIVE SUMMARY

### What already exists

- Proven core vault storage exists in `public.vault_items`, keyed by `(user_id, card_id)`, with `card_id` as a FK to `public.card_prints(id)`.
- Proven canonical read surfaces exist as `public.v_vault_items`, `public.v_vault_items_ext`, and `public.v_recently_added`.
- Proven conflict-safe vault write RPC exists as `public.vault_add_or_increment`, hardened by a later auth guard migration.
- Proven owner-scoped RLS exists on `public.vault_items`, and the vault views were later rebuilt with `security_invoker=true`, so reads inherit caller RLS.
- Proven public web/catalog identity now includes `card_prints.gv_id`, added in March 2026, but vault ownership itself still points at `card_prints.id`, not `gv_id`.

### What the original app actually uses

- Live Flutter vault reads use `v_vault_items` directly from `lib/main.dart`.
- Live Flutter quantity updates and deletes write directly to `vault_items`.
- Live Flutter currently has no wired add button on the visible `VaultPage`; the add-from-catalog helper exists in code but is not referenced.
- Live Flutter has one reachable add-to-vault path through `IdentityScanScreen`, but that path calls `vault_add_or_increment` with a payload that does not match the proven SQL contract.
- A likely legacy/incomplete `ScanIdentifyScreen` also inserts directly into `vault_items`, but it is not referenced anywhere and calls a non-existent `card-identify` edge function.

### Whether web can reuse existing write/read paths immediately

- Read path: yes, the schema already exposes a reusable owner-scoped read contract via `v_vault_items`.
- Write path: yes for direct `vault_items` insert/update/delete under existing RLS, but not by copying the live identity-scan RPC call as-is.
- Current web app does not yet use any vault table, view, or RPC. It only proves auth/session handling and public `gv_id` catalog reads.

### Whether any schema gap exists

- No schema gap is proven for basic web vault reuse.
- A minor web adapter is still required because current web routes and public card pages are keyed by `gv_id`, while vault ownership is keyed by `card_prints.id`.
- There are proven implementation mismatches in some existing mobile scan flows, but those are app-side contract mismatches, not missing schema.

## 2. REPOSITORY EVIDENCE

| Artifact | Status | What it does | Why it matters |
| --- | --- | --- | --- |
| `lib/main.dart:748-874` | Proven live | Flutter auth gate, app shell, scan entrypoints, vault tab | This is the live mobile app entrypoint and proves the active vault surface is in current `lib/main.dart`, not only in backups. |
| `lib/main.dart:1348-1480` | Proven live | `VaultPage` reads `v_vault_items`, updates/deletes `vault_items`, contains unwired catalog insert helper | This is the current mobile vault implementation. |
| `lib/models/card_print.dart:86-288` | Proven live | Card catalog search repository; prefers RPC `search_card_prints_v1`, falls back to direct `card_prints` queries | This is the only repository abstraction feeding the mobile catalog picker for potential vault adds. |
| `lib/screens/identity_scan/identity_scan_screen.dart:215-243` | Proven live | Reachable Add-to-Vault button from identity scan results; calls `vault_add_or_increment` | This is the only currently wired add-to-vault UI path in live Flutter. |
| `lib/screens/scanner/scan_capture_screen.dart:110-150` | Proven live | Condition scan flow anchored to `vaultItemId`; uploads scan images and finalizes a snapshot | Proves downstream scan/ownership flows depend on `vault_item_id`. |
| `lib/services/scanner/condition_scan_service.dart:146-154` | Proven live | Calls `condition_snapshots_insert_v1` RPC with only `p_vault_item_id` and `p_images` | Matters because this payload does not match the only proven migration signature. |
| `lib/screens/scanner/scan_identify_screen.dart:52-107` | Likely legacy/incomplete | Placeholder identify flow calls `card-identify`, then direct inserts into `vault_items` | It is not referenced by live navigation and the function is not found under `supabase/functions/`. |
| `lib/main.dart.bak.20250831-115309:205-269` | Likely legacy | Older vault page read/write path used direct `vault_items` table joins | Useful historical evidence of the original direct-table contract. |
| `lib/main.dart.bak.20250831-115309:400-426` | Likely legacy | Later backup switched reads to `v_vault_items` while keeping direct inserts | Shows the historical evolution toward the current read contract. |
| `apps/web/src/app/vault/page.tsx:4-18` | Proven live | Web `/vault` page only checks `supabase.auth.getUser()` and renders placeholder text | Confirms current web vault has auth only, no vault data access. |
| `apps/web/src/app/login/page.tsx:25-37` | Proven live | Web email/password sign-in and sign-up | Proves current web auth flow. |
| `apps/web/src/app/auth/callback/route.ts:20-42` | Proven live | OAuth callback exchanges code for session | Proves current web session establishment. |
| `apps/web/src/lib/supabase/server.ts:20-60` | Proven live | SSR/route Supabase clients built from cookies | Proves how web resolves current user/session server-side. |
| `apps/web/src/lib/getPublicCardByGvId.ts:81-125` | Proven live | Web card detail lookup by `gv_id`, directly from `card_prints` | Proves web catalog identity is `gv_id`, not `vault_items.card_id`. |
| `apps/web/src/app/card/[gv_id]/page.tsx:74-140` | Proven live | Web card route is `/card/[gv_id]` | Confirms minor adapter need between public card routing and vault ownership. |
| `supabase/migrations/20251213153626_baseline_functions.sql:616-689` | Proven schema | Defines `vault_add_item`, `vault_items`, `vault_add_or_increment`, `vault_inc_qty` | Core vault write contract and table shape. |
| `supabase/migrations/20251213153627_baseline_views.sql:509-613` | Proven schema | Defines `v_vault_items` | Core vault read contract. |
| `supabase/migrations/20251213153627_baseline_views.sql:730-802` | Proven schema | Defines `v_vault_items_ext` | Extended vault read surface with condition/grade pricing. |
| `supabase/migrations/20251213153630_baseline_constraints.sql:226-362` | Proven schema | Defines unique, PK, and FK constraints for `vault_items` and `user_card_images` | Proves canonical ownership key and auth/user linkage. |
| `supabase/migrations/20251213153631_baseline_indexes.sql:134-206` | Proven schema | Defines vault/user image indexes | Proves read/update performance surfaces already exist. |
| `supabase/migrations/20251213153633_baseline_policies.sql:36-112` | Proven schema | Defines owner-scoped `vault_items` policies | Proves owner-only CRUD under RLS. |
| `supabase/migrations/20260214____vault_add_or_increment_auth_guard.sql` | Proven schema | Replaces `vault_add_or_increment` to fail fast on null `auth.uid()` | Hardens the RPC without changing signature. |
| `supabase/migrations/20260304170000_views_security_invoker.sql:728-903` | Proven schema | Rebuilds `v_vault_items`, `v_vault_items_ext`, `v_recently_added` with `security_invoker=true` and newer pricing view | Proves current read contract obeys caller RLS. |
| `supabase/migrations/20260305093000_force_security_invoker_8_views.sql:125-174` | Proven schema | Adds `v_vault_items_web` as a projection of `v_vault_items_ext` | Proves a web-facing vault projection exists in schema, though not used by current web code. |
| `supabase/migrations/20260306172935_add_gv_id_to_card_prints.sql` | Proven schema | Adds nullable unique `gv_id` to `card_prints` | Proves public web identity field exists, but separately from vault ownership. |
| `supabase/functions/scan-upload-plan/index.ts:77-145` | Proven live | Signed upload helper for condition scan images under `{userId}/{vaultItemId}/...` | Proves vault-item-scoped downstream storage naming, but not vault CRUD. |

### Not found

- No web route, API route, backend endpoint, or edge function currently performs core vault CRUD for the web app.
- No dedicated Flutter vault provider/state-management layer was found.
- No dedicated Flutter vault model/entity class was found; vault items are handled as `List<Map<String, dynamic>>`.

## 3. ORIGINAL APP VAULT WRITE PATH

### Proven live reachable write path

1. UI/action
   - `AppShell` launches `IdentityScanScreen` from the Scan navigation destination and from the Vault FAB in `lib/main.dart:832-871`.
2. Screen
   - `IdentityScanScreen._addToVault()` is bound to the visible `FilledButton.icon(label: 'Add to Vault')` in `lib/screens/identity_scan/identity_scan_screen.dart:215-243` and `lib/screens/identity_scan/identity_scan_screen.dart:462-466`.
3. Supabase object
   - That screen calls RPC `vault_add_or_increment` with params `{ p_card_id, p_delta_qty, p_name, p_condition_label, p_notes }` in `lib/screens/identity_scan/identity_scan_screen.dart:234-242`.

### Proven contract mismatch on that reachable path

- The only proven SQL signature is `vault_add_or_increment(p_card_id uuid, p_delta_qty integer, p_condition_label text default 'NM', p_notes text default null)` in `supabase/migrations/20251213153626_baseline_functions.sql:664-676`, later replaced by `supabase/migrations/20260214____vault_add_or_increment_auth_guard.sql`.
- No proven migration adds a `p_name` parameter.
- The same proven table definition requires `vault_items.name text not null` in `supabase/migrations/20251213153626_baseline_functions.sql:632-657`, while `vault_add_or_increment` inserts only `(user_id, card_id, qty, condition_label, notes)` in `supabase/migrations/20251213153626_baseline_functions.sql:668-675`.
- Result: the live identity-scan Add-to-Vault UI is wired, but successful execution against the audited DB contract is not proven.

### Proven direct-table write path in current live code

- `VaultPage._showCatalogPickerAndInsert()` directly inserts into `vault_items` with:
  - `user_id`
  - `card_id`
  - `name`
  - `set_name`
  - `photo_url`
  - `qty`
  - `condition_label = 'NM'`
- Evidence: `lib/main.dart:1427-1480`.
- This payload matches the proven table shape better than the scan RPC because it includes required presentation fields like `name`.

### Proven live issue on the direct-table path

- `showAddOrEditDialog()` is defined in `lib/main.dart:1418-1425` but no call site was found in current live code.
- Result: this direct insert path is implemented but not currently reachable from the visible `VaultPage`.

### Likely legacy write paths

- `lib/main.dart.bak.20250831-115309:224-243` directly inserted `{ user_id, card_id, qty }` into `vault_items`.
- `lib/main.dart.bak.20250831-115309:417-426` shows the same direct insert pattern after a later read-path change.
- `lib/screens/scanner/scan_identify_screen.dart:84-107` directly inserts into `vault_items`, but the screen is unreferenced and its identify step depends on missing function `card-identify`.

### Quantity handling

- Current live direct insert helper parses quantity from dialog text and writes `qty` directly: `lib/main.dart:1468-1478`.
- Current live vault item increment/decrement updates `qty` directly on `vault_items`: `lib/main.dart:1396-1401`.
- The conflict-safe RPC increments with `on conflict (user_id, card_id) do update set qty = vault_items.qty + greatest(1, p_delta_qty)`: `supabase/migrations/20251213153626_baseline_functions.sql:664-676`, hardened in `supabase/migrations/20260214____vault_add_or_increment_auth_guard.sql`.

### Condition handling

- Current live direct insert helper hard-codes `condition_label = 'NM'`: `lib/main.dart:1476-1478`.
- Current live identity-scan add path also hard-codes `p_condition_label = 'NM'`: `lib/screens/identity_scan/identity_scan_screen.dart:237-241`.
- Condition edit helpers exist in schema:
  - `rpc_set_item_condition`: `supabase/migrations/20251213153626_baseline_functions.sql:520-545`
  - `set_vault_item_condition`: `supabase/migrations/20251213153626_baseline_functions.sql:1024-1034`
- No live app call site for those condition edit helpers was found.

### Canonical ownership key on writes

- Proven ownership identity is `vault_items.user_id + vault_items.card_id`.
- `vault_items.card_id` is a FK to `card_prints.id`, not `gv_id`: `supabase/migrations/20251213153630_baseline_constraints.sql:313-314`.
- Unique constraints and indexes enforce `(user_id, card_id)` uniqueness:
  - `uq_user_card`: `supabase/migrations/20251213153630_baseline_constraints.sql:226-227`
  - `uq_vault_user_card`: `supabase/migrations/20251213153630_baseline_constraints.sql:229-230`
  - `uq_vault_items_user_card`: `supabase/migrations/20251213153631_baseline_indexes.sql:192`

## 4. ORIGINAL APP VAULT READ PATH

### Proven live read path

1. Screen/state
   - `VaultPage.initState()` captures `supabase.auth.currentUser?.id` and calls `reload()` in `lib/main.dart:1363-1368`.
2. Screen query
   - `reload()` reads from `v_vault_items`, filters by `user_id`, and orders by chosen sort column in `lib/main.dart:1370-1393`.
3. Render
   - `VaultPage.build()` renders rows from `_items` and passes row fields directly to `_VaultItemTile` / `CardDetailScreen` in `lib/main.dart:1483-1578`.

### Proven read surface the app relies on

- `v_vault_items` exposes:
  - vault row ids
  - `user_id`
  - `card_id`
  - `qty` / `quantity`
  - pricing fields
  - `name`
  - `number`
  - `set_code`
  - `set_name`
  - image fields
- Evidence:
  - baseline definition: `supabase/migrations/20251213153627_baseline_views.sql:509-613`
  - current security-invoker definition: `supabase/migrations/20260304170000_views_security_invoker.sql:728-831`

### Proven joins/views used by the read contract

- `v_vault_items` joins:
  - `vault_items vi`
  - `cards c`
  - `v_card_images img`
  - `v_best_prices_all` in baseline, replaced by `v_best_prices_all_gv_v1` in current security-invoker rebuild
- Evidence:
  - baseline: `supabase/migrations/20251213153627_baseline_views.sql:542-613`
  - current: `supabase/migrations/20260304170000_views_security_invoker.sql:760-831`

### Extended helper read surfaces

- `v_vault_items_ext` adds:
  - `vault_item_id`
  - condition / grading fields
  - condition multiplier
  - base/condition/graded market values
  - `effective_price`, `effective_mode`, `effective_source`
- Evidence:
  - baseline: `supabase/migrations/20251213153627_baseline_views.sql:730-802`
  - current: `supabase/migrations/20260304170000_views_security_invoker.sql:832-903`

- `v_recently_added` is a limited projection of `v_vault_items` ordered by `created_at desc`.
  - baseline: `supabase/migrations/20251213153627_baseline_views.sql:616-651`
  - current: `supabase/migrations/20260304170000_views_security_invoker.sql:623-657`

- `v_vault_items_web` is a web projection of `v_vault_items_ext`.
  - evidence: `supabase/migrations/20260305093000_force_security_invoker_8_views.sql:125-174`
  - no current web usage found.

### Proven legacy read paths

- Backup app read directly from `vault_items` with embedded `card_prints(name, number)` relation:
  - `lib/main.dart.bak.20250831-115309:205-222`
- Backup app later switched to `v_vault_items`:
  - `lib/main.dart.bak.20250831-115309:400-415`

## 5. SCHEMA INVENTORY

### Tables

#### Proven core vault tables

- `public.vault_items`
  - Definition: `supabase/migrations/20251213153626_baseline_functions.sql:632-657`
  - Key columns:
    - `id uuid primary key`
    - `user_id uuid not null`
    - `card_id uuid not null`
    - `qty integer not null default 1`
    - `condition_label text`
    - `condition_score integer`
    - `is_graded boolean default false`
    - `grade_company text`
    - `grade_value text`
    - `grade_label text`
    - `notes text`
    - `name text not null`
    - `set_name text`
    - `photo_url text`
    - `image_source`, `image_url`, `image_back_source`, `image_back_url`

- `public.user_card_images`
  - Definition: `supabase/migrations/20251213153625_baseline_init.sql:2116-2127`
  - Purpose: per-user user-provided images linked to a `vault_item_id`
  - Current RLS hardening: `supabase/migrations/20260304100000_rls_bucket_a1.sql:45-81`

#### Proven dependent tables used by current vault-linked scan flows

- `public.condition_snapshots`
  - Definition: `supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql`
  - Holds immutable scan snapshots anchored by `vault_item_id` and `user_id`

### Views

- `public.v_vault_items`
  - baseline: `supabase/migrations/20251213153627_baseline_views.sql:509-613`
  - current security-invoker: `supabase/migrations/20260304170000_views_security_invoker.sql:728-831`

- `public.v_recently_added`
  - baseline: `supabase/migrations/20251213153627_baseline_views.sql:616-651`
  - current security-invoker: `supabase/migrations/20260304170000_views_security_invoker.sql:623-657`

- `public.v_vault_items_ext`
  - baseline: `supabase/migrations/20251213153627_baseline_views.sql:730-802`
  - current security-invoker: `supabase/migrations/20260304170000_views_security_invoker.sql:832-903`

- `public.v_vault_items_web`
  - current web projection: `supabase/migrations/20260305093000_force_security_invoker_8_views.sql:125-174`
  - usage in app/web: not found

- `public.v_card_prints_web_v1`
  - added as a web-facing card-print projection: `supabase/migrations/20260305093000_force_security_invoker_8_views.sql:268-280`
  - usage in current web app: not found

### RPCs / functions

#### Core vault write / mutation helpers

- `public.vault_add_item`
  - `supabase/migrations/20251213153626_baseline_functions.sql:616-625`
  - direct insert helper, not used by current app

- `public.vault_add_or_increment`
  - baseline: `supabase/migrations/20251213153626_baseline_functions.sql:664-676`
  - hardened auth-guard version: `supabase/migrations/20260214____vault_add_or_increment_auth_guard.sql`
  - conflict-safe upsert on `(user_id, card_id)`

- `public.vault_inc_qty`
  - `supabase/migrations/20251213153626_baseline_functions.sql:681-689`
  - direct qty increment helper, not used by current app

- `public.rpc_set_item_condition`
  - `supabase/migrations/20251213153626_baseline_functions.sql:520-545`
  - owner-checked condition mutation with feature flag

- `public.set_vault_item_condition`
  - `supabase/migrations/20251213153626_baseline_functions.sql:1024-1034`

- `public.set_vault_item_grade`
  - `supabase/migrations/20251213153626_baseline_functions.sql:1038-1046`

- `public.vault_item_set_user_photo`
  - `supabase/migrations/20251213153626_baseline_functions.sql:821-887`

- `public.vault_item_delete_user_photo`
  - `supabase/migrations/20251213153626_baseline_functions.sql:695-738`

- `public.vault_item_set_image_mode`
  - `supabase/migrations/20251213153626_baseline_functions.sql:743-816`

#### Vault-linked dependent RPCs

- `public.condition_snapshots_insert_v1`
  - `supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql`
  - scan snapshot insert helper keyed by `vault_item_id`

### Indexes

- `idx_user_card_images_user_id`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:134`

- `idx_user_card_images_vault_item_id`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:136`

- `idx_vault_items_user_created`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:138`

- `idx_vault_items_user_name`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:140`

- `uq_vault_items_user_card`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:192`

- `vault_items_card_id_idx`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:198`

- `vault_items_card_idx`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:200`

- `vault_items_created_idx`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:202`

- `vault_items_user_created_idx`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:204`

- `vault_items_user_idx`
  - `supabase/migrations/20251213153631_baseline_indexes.sql:206`

- `card_prints_gv_id_uq`
  - `supabase/migrations/20260306172935_add_gv_id_to_card_prints.sql:4-6`

### Constraints

- `uq_user_card`
  - `supabase/migrations/20251213153630_baseline_constraints.sql:226-227`

- `uq_vault_user_card`
  - `supabase/migrations/20251213153630_baseline_constraints.sql:229-230`

- `vault_items_pkey`
  - `supabase/migrations/20251213153630_baseline_constraints.sql:241-242`

- `fk_vault_items_card`
  - `supabase/migrations/20251213153630_baseline_constraints.sql:313-314`
  - proves `card_id -> card_prints.id`

- `vault_items_user_id_fkey`
  - `supabase/migrations/20251213153630_baseline_constraints.sql:361-362`
  - proves `user_id -> auth.users.id`

- `user_card_images_vault_item_side_key`
  - `supabase/migrations/20251213153630_baseline_constraints.sql:235-236`

- `user_card_images_user_id_fkey`
  - `supabase/migrations/20251213153630_baseline_constraints.sql:352-353`

- `user_card_images_vault_item_id_fkey`
  - `supabase/migrations/20251213153630_baseline_constraints.sql:355-356`

### RLS policies

#### `public.vault_items`

- `gv_vault_items_delete`
- `gv_vault_items_insert`
- `gv_vault_items_select`
- `gv_vault_items_update`
- `"owner delete vault_items"`
- `"owner insert"`
- `"owner insert vault_items"`
- `"owner read"`
- `"owner select vault_items"`
- `"owner update"`
- `"vault_items owner delete"`
- `"vault_items owner read"`
- `"vault_items owner update"`
- `"vault_items owner write"`

Evidence: `supabase/migrations/20251213153633_baseline_policies.sql:36-112`

Interpretation: the table is heavily duplicated with equivalent owner-only policies, but all visible policies scope operations to `auth.uid() = user_id`.

#### `public.user_card_images`

- `"user select own"`
- `"user insert own"`
- `"user update own"`
- `"user delete own"`

Evidence: `supabase/migrations/20260304100000_rls_bucket_a1.sql:53-81`

#### `public.condition_snapshots`

- `gv_condition_snapshots_select`
- `gv_condition_snapshots_insert`

Evidence: `supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql:36-50`

#### Storage `condition-scans`

- `gv_condition_scans_select`
- `gv_condition_scans_insert`
- `gv_condition_scans_update` (deny)
- `gv_condition_scans_delete` (deny)

Evidence: `supabase/migrations/20251229215511_condition_scans_bucket_and_policies.sql`

## 6. CANONICAL CONTRACT INFERENCE

### Authoritative write path

- Proven canonical storage target: `public.vault_items`
- Proven canonical row identity: `(user_id, card_id)`
- Proven canonical print identity inside vault: `card_id -> public.card_prints.id`
- Proven canonical conflict-safe write helper: `public.vault_add_or_increment`
- Proven current working-looking app write shape: direct `insert/update/delete` on `vault_items` with full row fields from Flutter `VaultPage`

### Authoritative read path

- Proven canonical read surface: `public.v_vault_items`
- Extended read surface: `public.v_vault_items_ext`
- Optional helper read surface: `public.v_recently_added`
- Web-only projection exists in schema as `public.v_vault_items_web`, but no current web usage was found

### Canonical identity field

- For vault ownership: `vault_items.card_id`, which points to `card_prints.id`
- Not `gv_id`
- `gv_id` is a later public/catalog identifier on `card_prints`, added in `supabase/migrations/20260306172935_add_gv_id_to_card_prints.sql`

### Auth / user scoping model

- Flutter:
  - session gate uses `supabase.auth.onAuthStateChange` plus `supabase.auth.currentSession`: `lib/main.dart:759-767`
  - current user id comes from `supabase.auth.currentUser?.id`: `lib/main.dart:1366`, `lib/screens/identity_scan/identity_scan_screen.dart:229`, `lib/screens/scanner/scan_identify_screen.dart:88`
- Web:
  - SSR user resolution uses `supabase.auth.getUser()` with cookie-backed client: `apps/web/src/app/vault/page.tsx:5-8`, `apps/web/src/lib/supabase/server.ts:20-60`
  - sign-in/sign-up uses Supabase Auth directly: `apps/web/src/app/login/page.tsx:25-37`
  - OAuth callback uses `exchangeCodeForSession`: `apps/web/src/app/auth/callback/route.ts:39-42`
- Database:
  - `vault_items.user_id` references `auth.users(id)`: `supabase/migrations/20251213153630_baseline_constraints.sql:361-362`
  - insert trigger backfills `user_id := auth.uid()` when omitted: `supabase/migrations/20251213153626_baseline_functions.sql:550-559`
  - table RLS scopes owner CRUD to `auth.uid() = user_id`: `supabase/migrations/20251213153633_baseline_policies.sql:36-112`
  - vault views are `security_invoker=true`, so reads follow underlying RLS: `supabase/migrations/20260304170000_views_security_invoker.sql:623-903`

## 7. WEB REUSE DECISION

## REUSE EXISTING CONTRACT WITH MINOR WEB ADAPTER

### Evidence

- Existing vault storage, owner scoping, indexes, constraints, and read views are already in place:
  - `vault_items`: `supabase/migrations/20251213153626_baseline_functions.sql:632-657`
  - `v_vault_items`: `supabase/migrations/20260304170000_views_security_invoker.sql:728-831`
  - `v_vault_items_ext`: `supabase/migrations/20260304170000_views_security_invoker.sql:832-903`
  - RLS: `supabase/migrations/20251213153633_baseline_policies.sql:36-112`

- Current web app already has working Supabase auth/session plumbing:
  - `apps/web/src/lib/supabase/server.ts:20-60`
  - `apps/web/src/app/login/page.tsx:25-37`
  - `apps/web/src/app/auth/callback/route.ts:20-42`

- Current web vault page does not yet consume any vault contract:
  - `apps/web/src/app/vault/page.tsx:4-18`

- Current web public card pages are keyed by `gv_id`, while vault ownership remains keyed by `card_prints.id`:
  - web public card lookup by `gv_id`: `apps/web/src/lib/getPublicCardByGvId.ts:81-125`
  - `gv_id` added to `card_prints`: `supabase/migrations/20260306172935_add_gv_id_to_card_prints.sql`
  - vault FK still points to `card_prints.id`: `supabase/migrations/20251213153630_baseline_constraints.sql:313-314`

### Why this is not "AS-IS"

- The web app needs an adapter from public `gv_id` routes/pages to the vault contract's required `card_prints.id`.
- The current live mobile identity-scan Add-to-Vault RPC call is not a safe reuse target because its payload does not match the audited SQL function signature.

### Why this is not "SCHEMA GAP EXISTS"

- No missing table, view, RPC, index, constraint, or RLS policy is required for basic owner-scoped vault CRUD and reads.
- The blockers found are implementation mismatches or missing web wiring, not missing schema.

## 8. GAP LIST

Only proven gaps are listed below.

1. Web vault UI is not yet connected to any vault data source.
   - Proof: `apps/web/src/app/vault/page.tsx:4-18`

2. The only currently wired mobile Add-to-Vault RPC path is not contract-aligned with the audited SQL.
   - App call includes `p_name`: `lib/screens/identity_scan/identity_scan_screen.dart:234-242`
   - Proven SQL signature has no `p_name`: `supabase/migrations/20251213153626_baseline_functions.sql:664-676`
   - Proven `vault_items` table requires `name text not null`: `supabase/migrations/20251213153626_baseline_functions.sql:645`

3. The direct insert helper in live `VaultPage` is implemented but not reachable from the visible UI.
   - Helper exists: `lib/main.dart:1418-1480`
   - No call site found for `showAddOrEditDialog()`

4. `ScanIdentifyScreen` is likely dead/incomplete.
   - Not referenced by live navigation
   - Calls missing edge function `card-identify`: `lib/screens/scanner/scan_identify_screen.dart:52-58`
   - No `supabase/functions/card-identify` was found

5. The live condition-scan finalize call is not proven to match the audited `condition_snapshots_insert_v1` RPC signature.
   - App call: `lib/services/scanner/condition_scan_service.dart:146-154`
   - Proven SQL signature requires additional non-default params including `p_id`, `p_scan_quality`, `p_measurements`, `p_defects`, `p_confidence`: `supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql`

## 9. SAFE NEXT STEP

Build the web vault against the proven direct contract `vault_items` + `v_vault_items`, with a thin adapter that resolves web `gv_id` to `card_prints.id`, and do not reuse the current mobile `vault_add_or_increment` call shape until its payload is reconciled with the audited SQL signature.

---

audited files count: 31
vault-related files count: 24
migration files inspected count: 13
final reuse decision: REUSE EXISTING CONTRACT WITH MINOR WEB ADAPTER
