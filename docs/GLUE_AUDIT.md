# UI Glue Audit — Wall / Search / Vault (Local Dev)

Branch: stabilize/ui-glue-audit
Scope: Minimal fixes for naming/contracts and dev ergonomics. No destructive DB ops.

## Summary

The app now aligns on the canonical wall feed view `public.wall_feed_view`, supports creating listings from Vault with title prefilled from the card name and optional Vault photo, and uses the `image_best` contract in search. Local migrations are guarded to work without catalog tables and an auto-refresh trigger keeps the Wall MV current on inserts/updates.

## Findings

### A1. Wall view name alignment — PASS
- Flutter: `lib/features/wall/wall_feed_page.dart` queries `wall_feed_view`.
- Edge: `supabase/functions/wall_feed/index.ts` queries `wall_feed_view`.
- DB: `supabase/migrations/20251104102500_wall_views.sql` creates `wall_feed_view`.

### A2. Create Listing from Vault (prefill) — PASS
- Route args supported: `vaultItemId`, `vaultImageUrl`, `cardName`.
- Prefill and toggle:
  - `lib/features/wall/create_listing_page.dart:didChangeDependencies` reads args and calls `_prefillFromVault()`.
  - `_prefillFromVault()` fetches Vault image (`vault_items.image_url`) and card name from `v_card_search` when needed.
- Insert sets `visibility='public'`, `status='active'` and triggers Edge refresh + `rpc_refresh_wall()` fallback.
- From Vault list: “Create Listing” icon navigates with `vaultItemId` and `cardName`.

### A3. Search page image contract — PASS
- DB: `v_card_search` exposes `image_best` via guarded migrations.
- Flutter: search list uses `image_best` with fallbacks.
- Helpers present under `lib/widgets/image_best.dart`.

### A4. image_picker + Android permissions — PASS (updated)
- `pubspec.yaml`: `image_picker` present.
- `AndroidManifest.xml`: added `READ_MEDIA_IMAGES` and `READ_EXTERNAL_STORAGE` (read-only).
- Composer supports multi-select and displays selected thumbnails.

### A5. Vault inserts vs schema — PASS (minimal)
- Composer inserts only existing listing columns; Vault-item alignment is via `vault_post_to_wall` or `vault_item_id` link. No new Vault columns required in this pass.

### B. Catalog dependency guard — PASS
- Guarded shims in migrations prevent failures when `public.card_prints` is absent locally (search views and helpers compile with empty views).

### C. VS Code tasks — PASS
- `.vscode/tasks.json` includes:
  - “Grookai: Dev (ALL)” (Supabase start → functions serve → Flutter run)
  - “Grookai: Stop (ALL)”

## Additional Fix
- Auto-refresh Wall MV on changes: `supabase/migrations/20251105130000_wall_mv_autorefresh.sql` adds triggers to refresh `public.wall_thumbs_3x4` after listing/image mutations.

## How To Test
1) Start stack: `supabase start`
2) Flutter: `flutter clean && flutter pub get && flutter run -d <device>`
3) Create Listing from Vault:
   - Navigate with args `{ vaultItemId, cardName, vaultImageUrl? }`.
   - Title prefilled = card name; toggle “Use photo from Vault”.
   - Optionally add gallery photos; submit.
   - Validate the Wall tab shows the new item (auto-refresh).
4) Search:
   - Search for any name; list should render without column errors and show images via `image_best`.

## Risks & Single Actions
- MV refresh cost: Trigger-based refresh is convenient for dev but heavier for prod — Action: keep triggers dev-only or switch to scheduled RPC in production.
- Storage permissions on older devices: READ_EXTERNAL_STORAGE is declared; Action: ensure runtime permission prompts where required by Android API level.

