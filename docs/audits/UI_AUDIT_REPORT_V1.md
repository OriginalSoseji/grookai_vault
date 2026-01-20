## 0. Repo Audit Index
- Commit: `d94606a6a9c9cd47a7d2f7b2bb85fc302f0efcac` on branch `main` (`git rev-parse HEAD`, `git rev-parse --abbrev-ref HEAD`).
- App targets: Flutter (`lib/`), Next.js web (`apps/web/src/app`).
- UI folder map: `lib/main.dart`, `lib/card_detail_screen.dart`, `lib/models/`, `lib/services/scanner/`, `lib/screens/scanner/`, `lib/widgets/scanner/`, `apps/web/src/app/{layout.tsx,page.tsx,catalog/,vault/,login/}`, `apps/web/src/lib/`.

## 1. Screen Inventory (Complete)
### Flutter
| Screen | Widget/Class | File path | Route key | Entry points | Dependencies | Primary states | Key CTAs | Flags/guards |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | `LoginPage` | `lib/main.dart:822` | `home` (MaterialApp) | `MyApp` StreamBuilder decides session -> `LoginPage` when no session (`lib/main.dart:748-780`) | `Supabase.instance.client` | `_loading` spinner, snackbar errors | Sign in, Create account | None |
| App shell | `AppShell` | `lib/main.dart:759` | Root scaffold | Shown when session exists (`lib/main.dart:748-780`) | Supabase client, `HomePage`, `VaultPage` keys | `_index` tab, refresh via keys | Bottom nav switch Catalog/Vault, Refresh, Logout, FAB to add vault item (Vault only) | None |
| Catalog | `HomePage` | `lib/main.dart:936` | Pushed via `AppShell` tab index 0 | Tab 0 body in `IndexedStack` (`lib/main.dart:794-808`) | Supabase client, `CardPrintRepository` | `_loading`, `_results`, `_trending`, `_rarityFilter`, debounce | Search, rarity filter chips, tap card -> `CardDetailScreen`, pull-to-refresh | None |
| Card detail | `CardDetailScreen` | `lib/card_detail_screen.dart:6` | `MaterialPageRoute` | From Catalog tap (`lib/main.dart:1125-1145`) and Vault tap (`lib/main.dart:1392-1416`) | Supabase client | `_priceLoading`, `_priceData`, `_priceError`, `_requestingLivePrice` | Request live price, Refresh pricing, placeholder vault actions | None |
| Vault | `VaultPage` | `lib/main.dart:1293` | Tab index 1 | Tab 1 body in `IndexedStack` (`lib/main.dart:794-808`) | Supabase client (`v_vault_items` view) | `_loading`, `_items`, `_search`, `_sortBy` | Search, sort, inc/dec qty, delete, open detail, FAB add via catalog picker | None |
| Catalog picker (sheet) | `_CatalogPicker` | `lib/main.dart:1498` | Bottom sheet | `VaultPage.showAddOrEditDialog` -> `showModalBottomSheet` (`lib/main.dart:1341-1372`) | Supabase client, `CardPrintRepository` | `_loading`, `_rows`, debounce | Search, select card (returns to caller) | None |
| Condition capture camera | `ConditionCameraScreen` | `lib/screens/scanner/condition_camera_screen.dart:11` | `MaterialPageRoute` | From `ScanCaptureScreen._captureWithCamera` (`lib/screens/scanner/scan_capture_screen.dart:47-71`) | `camera`, `sensors_plus`, `NativeQuadDetector` | `_liveStatus`, `_overlayMode`, `_quadPoints`, `_shutterReady`, init errors | Capture/Retake, Close | None |
| Condition scan capture | `ScanCaptureScreen` | `lib/screens/scanner/scan_capture_screen.dart:15` | `MaterialPageRoute` | **No app entry point**; requires `vaultItemId` param and is only referenced internally | `ConditionScanService`, `image_picker` | `_status` (idle/uploading/saving/success), `_analysisState` (idle/analyzing/complete/failed/timeout), `_analysisRow`, `_history`, `_error` | Capture front/back, Upload & Save, retry analysis, open Adjust corners, select history item | None |
| Quad adjust | `QuadAdjustScreen` | `lib/screens/scanner/quad_adjust_screen.dart:10` | `MaterialPageRoute` | From `ScanCaptureScreen._openAdjustCorners` (`lib/screens/scanner/scan_capture_screen.dart:587-614`) | `ConditionScanService`, Supabase storage | `_loading`, `_error`, `_snapshot`, `_analysis`, `_quads`, face switch | Save & re-run centering, face toggle, back | None |
| Card ID scanner | `ScanIdentifyScreen` | `lib/screens/scanner/scan_identify_screen.dart:7` | `MaterialPageRoute` | **No app entry point**; only defined | Supabase functions (`card-identify`), `image_picker` | `_loading`, `_front`, `_candidates`, `_selectedIndex`, `_error` | Capture, Identify, tap candidate to add to vault | None |

### Web (Next.js app router)
| Screen | Component | File path | Route | Entry/redirect | Dependencies | Primary states | CTAs | Flags/guards |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Root redirect | `HomePage` | `apps/web/src/app/page.tsx:7` | `/` | Redirects to `/catalog` or `/login` based on session | Supabase JS | None | None | Session check |
| Layout | `RootLayout` | `apps/web/src/app/layout.tsx:8` | Wraps all routes | Always rendered | Supabase auth listener | `signedIn` | Nav links, Sign out button, Login link | None |
| Login | `LoginPage` | `apps/web/src/app/login/page.tsx:7` | `/login` | Direct navigation or redirects | Supabase auth | `mode` signin/signup, `loading`, `error` | Sign in/up submit, toggle mode | None |
| Catalog | `CatalogPage` | `apps/web/src/app/catalog/page.tsx:18` | `/catalog` | Redirects unauthenticated to `/login` | Supabase RPC `search_card_prints_v1` | `q`, `rows`, `loading`, `error` | Search, tap result link to detail | Auth check |
| Catalog detail | `CardDetailPage` | `apps/web/src/app/catalog/[id]/page.tsx:18` | `/catalog/[id]` | Link from catalog list | Supabase table fetch | `row`, `error` | None (read-only) | Auth check |
| Vault | `VaultPage` | `apps/web/src/app/vault/page.tsx:16` | `/vault` | Redirects unauthenticated to `/login` | Supabase view `v_vault_items_ext` | `rows`, `loading`, `error` | None (read-only list) | Auth check |

## 2. Navigation Map (Complete)
- Implementation: Flutter uses `MaterialApp` with `home` set to `StreamBuilder` auth gate (`lib/main.dart:740-780`); navigation via `Navigator.of(context).push(MaterialPageRoute(...))`. No GoRouter or named routes.
- Root flows:
  - Auth: `LoginPage` → on success returns to `AppShell`.
  - AppShell: bottom nav with `HomePage` (Catalog) and `VaultPage` (`lib/main.dart:772-809`). Backstack preserved via `IndexedStack`.
  - Catalog: taps push `CardDetailScreen` (`lib/main.dart:1125-1145`).
  - Vault: FAB opens `_CatalogPicker` bottom sheet to add; tapping vault item opens `CardDetailScreen` (`lib/main.dart:1392-1416`); delete/qty inline dialogs.
  - Scanner/condition/fingerprint: **no navigation hook** from AppShell or detail; `ScanCaptureScreen` and `ScanIdentifyScreen` are unreachable without manual routing parameters.
- Deep links: none observed.
- Dead/orphan screens: `ScanCaptureScreen`, `QuadAdjustScreen`, `ConditionCameraScreen`, `ScanIdentifyScreen` unused in current nav; no button to launch from Vault or Catalog.
- Web navigation: Next.js app router; `/` redirects; `/catalog` list links to `/catalog/[id]`; `/vault` read-only; `/login` auth form; no scanner or condition UI on web.

## 3. Scanner + Condition Assist + Fingerprint Cohesion Audit
- Entry availability: No in-app entry to scanner or fingerprint flows. `ScanCaptureScreen` requires a `vaultItemId` argument and is never invoked; `ScanIdentifyScreen` also unused. Any described scenario requires manual navigation/integration.
- Data objects: upload plan via `scan-upload-plan` Supabase function → `condition_snapshots_insert_v1` RPC to create `condition_snapshots` row → optional ingestion job `condition_analysis_v1` via `ingestion_jobs` (`lib/services/scanner/condition_scan_service.dart:30-120,247-277,304-371`). History reads from `condition_snapshot_analyses` (`lib/services/scanner/condition_scan_service.dart:126-234`).

### Scenario A: Scan card not in vault
- Unverified in UI. The scan flow mandates `vaultItemId` (`ScanCaptureScreen` ctor) and is not exposed from any screen; no path to create a vault item during scan. Evidence: no references to `ScanCaptureScreen` outside its own file (`rg "ScanCaptureScreen" lib` returned only definitions).

### Scenario B: Scan same card again
- Only possible after manually launching `ScanCaptureScreen(vaultItemId)`; user can capture front/back, upload, then history shows previous snapshots. History list displays status badges and failure reasons (`lib/screens/scanner/scan_capture_screen.dart:630-721`). No deduping or messaging about re-scan vs prior snapshot.

### Scenario C: Scan card already linked to `vault_items` → `card_print`
- Flow assumes valid `vaultItemId`; upload plan and snapshot insertion run regardless of existing scans. UI displays `Vault Item: {id}` text only (`lib/screens/scanner/scan_capture_screen.dart:268-284`). No validation of card_print match; copy does not confirm linkage.

### Scenario D: Failure e.g., `border_not_detected`
- Failures surface only if backend sets `scan_quality.failure_reason`; UI shows "Analysis failed" card and "Reason: {failureReason}" (`lib/screens/scanner/scan_capture_screen.dart:549-583`). No user-facing guidance beyond optional Adjust corners button; reasons are raw backend strings.

### Scenario E: Partial validity (front valid, back invalid)
- `overallValid` derived from `measurements.centering_v3.overall.is_valid`; if false, UI shows "Centering invalid" and may still mark `analysis_status` as `failed` (`lib/screens/scanner/scan_capture_screen.dart:493-544`). CTA is Adjust corners; no per-face messaging or distinction of which side failed.

### Cohesion/Truthfulness observations
- "Analysis complete" is shown only when `analysis_version == 'v2_centering'` and `scan_quality.ok == true`; other analysis versions are ignored, risking silent wait (`lib/screens/scanner/scan_capture_screen.dart:96-144`).
- Fingerprint/identify flow (`ScanIdentifyScreen`) calls `card-identify` without uploading captured image; body only sends `{'note': 'placeholder v1'}` (`apps` not involved). UI states "Capture the card front to identify the print" but system does not use the photo → misleading.

## 4. Truthfulness & Copy Audit (keywords: fingerprint/identify/match/recognized/found/confidence/success/failed)
| String | Path | Where | Notes |
| --- | --- | --- | --- |
| "I confirm I am scanning the card shown above." | `lib/screens/scanner/scan_capture_screen.dart:316` | Checkbox before upload | Trusts user confirmation; no system check. |
| "Analysis complete" / "Analysis failed" / "Still analyzing..." | `lib/screens/scanner/scan_capture_screen.dart:244-258` | Status label above CTA | Maps to `_analysisState`, not backend `analysis_status` for non-v2_centering. |
| "Failure: {failureReason}" | `lib/screens/scanner/scan_capture_screen.dart:499-512` | Analysis summary | Raw backend text; may expose internal codes (e.g., border_not_detected). |
| "Analysis failed" + "Reason: {failureReason}" | `lib/screens/scanner/scan_capture_screen.dart:549-572` | Failure card | Same raw exposure; no guidance. |
| "Confidence: {pct}%" | `lib/screens/scanner/scan_capture_screen.dart:514-517` and `:703-708` | Analysis summary & history list | Displays numeric confidence without context of model or criteria. |
| "Scan saved. Analysis will start shortly." | `lib/screens/scanner/scan_capture_screen.dart:79-105` | After finalize | Implies automatic processing; polling stops after 30 attempts even if job queued slowly. |
| "Identify" / "Identify failed: {e}" / "No matches yet. This feature is not fully implemented." | `lib/screens/scanner/scan_identify_screen.dart:141-177` | ID scanner CTA & error | Feature admits incompleteness; failure message generic. |
| "Capture the card front to identify the print. No condition scan or credits required." | `lib/screens/scanner/scan_identify_screen.dart:140-147` | ID scanner intro | Misleading because captured image is not sent to function. |
| "Added to vault." | `lib/screens/scanner/scan_identify_screen.dart:102-134` | On candidate tap | Adds without showing matching confidence to user first. |
| "Login failed: {e.message}" / "Sign up failed: {e.message}" | `lib/main.dart:843-858` | Auth snackbars | Direct error bubble. |
| "Grookai Value (Active Listings)" + "Confidence: {pct}%" | `lib/card_detail_screen.dart:340-422` | Pricing card | Presents confidence without source explanation. |
| Web: "Auth failed" | `apps/web/src/app/login/page.tsx:34` | Login error | Generic error copy. |

## 5. Failure States & Error Surfaces (Complete)
- Patterns:
  - Snackbars: Login failures (`lib/main.dart:843-858`), Scan upload failures (`lib/screens/scanner/scan_capture_screen.dart:118-131`), ID scanner errors (`lib/screens/scanner/scan_identify_screen.dart:166-177`), placeholder actions in card detail (`lib/card_detail_screen.dart:402-418`).
  - Inline errors: Pricing error text (`lib/card_detail_screen.dart:360-374`), ScanCapture `_error` text (`lib/screens/scanner/scan_capture_screen.dart:302-312`), QuadAdjust `_error` center text (`lib/screens/scanner/quad_adjust_screen.dart:70-108`), Web forms show inline error strings in login/catalog/vault pages.
  - Fullscreen/blocking: QuadAdjust loading/error; ConditionCamera shows "Camera not available" placeholder (`lib/screens/scanner/condition_camera_screen.dart:120-170`).
  - Retry flows: ScanCapture has Retry analysis/Refresh buttons (`lib/screens/scanner/scan_capture_screen.dart:334-355`); QuadAdjust Save & re-run (`lib/screens/scanner/quad_adjust_screen.dart:120-161`); pricing refresh buttons.
- Scanner failure_reason variants: not enumerated client-side; UI simply prints backend `scan_quality.failure_reason` wherever present (analysis summary, failure card, history list). If absent, user gets generic "Analysis failed" without remediation.
- Silent failures: `_pollForAnalysis` swallows fetch errors and continues (`lib/screens/scanner/scan_capture_screen.dart:107-139`); fetchSnapshots ignores exceptions (`lib/screens/scanner/scan_capture_screen.dart:215-236`); ConditionCamera suppresses capture errors (`lib/screens/scanner/condition_camera_screen.dart:92-115`).

## 6. Data Freshness & “What just happened?” UX
- Post-scan landing: User stays on `ScanCaptureScreen`; status label changes to "Analysis complete/failed". No navigation to vault or toast when polling times out (`_analysisState.timeout` shows only Refresh button).
- Polling: `_pollForAnalysis` polls up to 30 seconds, ignores non-`v2_centering` analyses; jobs still running after timeout appear as stale "Still analyzing..." with manual Refresh.
- Vault list freshness: `VaultPage.reload` only on init, manual refresh via app bar refresh or after actions; no real-time subscription to vault changes (`lib/main.dart:1310-1340`).
- Catalog freshness: No cache invalidation; trending loaded once per init; manual pull-to-refresh or refresh button in app bar.
- Web: Catalog/Vault pages fetch once on mount; no polling; stale sessions rely on redirect only at mount time.

## 7. Visual Consistency & Design System Alignment
- Flutter: Material 3 theme with seed color `0xFF4A90E2` (`lib/main.dart:9-64`); uses NavigationBar, FilledButton, Card. Some legacy chip styles in `_chip` (uses raw Colors).
- Shared components: `_CatalogCardTile`, `_CatalogSectionHeader`, `_CatalogSearchField` (all in `lib/main.dart`), `ConditionCaptureOverlay` (`lib/widgets/scanner/condition_capture_overlay.dart:5`).
- Inconsistencies:
  - Mixed padding: Catalog uses 12-16px, Vault list uses 8px spacing; scanner screens use 16px and cards without consistent margins.
  - Typography: Headline/title weights vary (catalog vs scanner vs vault). Scanner uses more default Text without theme variants.
  - Duplicate CTAs: Adjust corners button rendered twice when `_showAdjustCorners` true (`lib/screens/scanner/scan_capture_screen.dart:556-581`).
- Platform mix: Only Material widgets; no Cupertino.

## 8. Accessibility & UX Hygiene (Best-effort)
- Tap targets: Chips and icons mostly standard; History list tap area full tile; however, Adjust corners duplicate buttons may confuse screen readers.
- Semantics/labels: Images in catalog/vault have `errorBuilder` fallbacks but no semantics labels; Camera screen lacks accessibility hints for overlay status text beyond visual.
- Dynamic text: Layouts use fixed sizes; cards with constrained widths may clip at large text scales (e.g., Catalog trending tiles with fixed 150px height).
- Contrast: Status pills in history use low-opacity colors (10% opacity) potentially low contrast (`lib/screens/scanner/scan_capture_screen.dart:648-710`).

## 9. Web App Audit
- Routes: `/`, `/login`, `/catalog`, `/catalog/[id]`, `/vault` (read-only). No scanner or condition UI on web.
- Auth handling: Redirects on mount only; if session expires after mount, pages do not auto-redirect.
- UX: Catalog and Vault are read-only lists; no add/edit actions. Vault page warns about RLS errors (`apps/web/src/app/vault/page.tsx:24-45`).
- Drift vs Flutter: Web lacks scanner, condition, pricing actions, and live vault editing; styling via Tailwind, minimal theming.

## 10. Gaps, Bugs, and “Must Fix Before Shipping”
- P0
  - Scanner unreachable: No navigation to `ScanCaptureScreen` or `ScanIdentifyScreen`; condition assist cannot be used (`lib/screens/scanner/*`). Impact: Users cannot scan or adjust cards. Fix: add entry points (e.g., from Vault item detail) with required `vaultItemId`.
  - Identify flow ignores captured image: `card-identify` invoked without sending the photo (`lib/screens/scanner/scan_identify_screen.dart:40-71`). Impact: UI promise to identify from photo is false; always returns placeholder. Fix: pass image bytes or disable feature until wired.
- P1
  - Analysis polling ignores non-`v2_centering` results and times out silently (`lib/screens/scanner/scan_capture_screen.dart:107-144`). Impact: stuck "Still analyzing..." even if other analysis versions complete. Fix: surface latest analysis regardless of version and show status.
  - Failure messaging is raw/unhelpful: raw `failure_reason` printed without guidance (`lib/screens/scanner/scan_capture_screen.dart:499-512,549-572`). Impact: users see backend codes like `border_not_detected`. Fix: map codes to user-friendly steps and show per-face guidance.
  - Adjust corners CTA duplicated when `_showAdjustCorners` true (`lib/screens/scanner/scan_capture_screen.dart:556-581`). Impact: confusing UI; redundant actions. Fix: render single button with state.
  - Vault add flow lacks validation: qty text field accepts non-numeric leading to default 1 silently (`lib/main.dart:1345-1377`). Impact: user intent may be lost. Fix: validate and show error.
- P2
  - Visual inconsistencies across screens (padding/spacing, status pill contrast) as noted in section 7. Impact: polish and readability. Fix: align spacing tokens and use consistent badge styles.
  - Web auth redirects only on mount; stale sessions not handled mid-session (`apps/web/src/app/catalog/page.tsx:22-28`, `vault/page.tsx:18-24`). Impact: stale views until reload. Fix: subscribe to auth state changes.

## Commands Used
- `Get-ChildItem`
- `rg "GoRouter|RouterConfig|MaterialApp.router|GoRoute" lib apps -g"*.dart"`
- `git rev-parse HEAD`
- `git rev-parse --abbrev-ref HEAD`
- `rg "class .*Screen" lib`
- `rg -n "fingerprint|identify|match|recognized|found|confidence|success|failed" lib`
- `rg -n "fingerprint|identify|match|recognized|found|confidence|success|failed" apps/web/src`
- `Get-Content lib/screens/scanner/scan_capture_screen.dart -First 220` (and similar targeted reads)
- `Get-Content apps/web/src/app/catalog/page.tsx`
