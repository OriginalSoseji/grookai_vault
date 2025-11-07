# Scanner UX Diff

Area | Current (ScanPage) | Legacy (scanner_page.dart) | Keep/Merge/Drop | Notes
--- | --- | --- | --- | ---
Camera flow | Uses `image_picker` to capture a single photo, then uploads to Supabase Function for intake | Live camera with `camera` package, continuous OCR + resolver and UI overlays | Keep ScanPage approach for production; extract overlays from legacy for reuse | ScanPage is simpler, fewer permissions edge cases; legacy pieces can augment UX without owning camera lifecycle
Permission handling | Delegated to system camera intent via ImagePicker | Explicit permission request via `permission_handler` before initializing camera | Keep ScanPage behavior | Simpler and more reliable across OEMs; add a friendly prompt only when needed
Result handling | Shows `AlertDialog` with name/set/price after intake | Shows candidate list sheet; optional “Add to Vault” actions | Merge: use a themed bottom sheet for results | Implemented as `ScanResultSheet` for reuse
Overlays/hints | None | On-screen hints (+ OCR preview text) | Merge: lightweight overlay + hint subtitle widgets | Implemented as `ScannerOverlay` and `ScanHintSubtitle`
Error states | SnackBar on error | SnackBars for timeouts/no match; inline empty state in results list | Keep: consistent SnackBars; add friendly copy | Unified to SnackBars and optional inline message in result sheet
Theming | Uses Material defaults | Mixed inline colors; some accents | Merge: use Thunder tokens, no inline hex | All new widgets use `Thunder` palette and `GVTheme`
Analytics/telemetry | Minimal print | Debug prints during scan stages | Drop in production; can re‑enable via dev overlay | Keep minimal prints in dev only

Summary: One production scanner (ScanPage) remains canonical. Useful legacy UI was extracted into reusable widgets and integrated where appropriate. The advanced (legacy) page is quarantined for dev use only.

