Grookai Vault — P1 UI Refactor (Tokens + Widgets)

Run (Windows)
- cd C:\grookai_vault
- flutter clean
- flutter pub get
- flutter run -d R5CY71V9ETR

What to verify
- App boots through existing routes; GVTheme wraps via MaterialApp.builder
- [LAZY] logs: appear from search controller (debounce/distinct/latest-wins)
- [UI] logs: appear once when Search and Vault lists build
- Search typing feels smooth (no flicker, no stale results rendered)
- Search list and Vault list use new tokens (spacing, radius, typography)
- Thumbnails/badges show without layout jump; error states show a stable placeholder

Where to look in code
- Tokens: lib/ui/tokens/*.dart
- Theme bridge: lib/ui/app/theme.dart
- Widgets: lib/ui/widgets/*.dart
- Search UI: lib/features/search/search_page.dart
- Vault list: lib/features/vault/vault_items_ext_list.dart

Visual checklist
- Spacing matches 4/8/12/16/20/24/32/40 scale
- Corners match 8/12/16/24 radii
- Typography: Large titles on iOS contexts, titles bold, body readable
- Contrast: textPrimary/textSecondary from palette; no raw magic hex in pages
- Tap targets >= 44x44 (icon buttons, cells)

