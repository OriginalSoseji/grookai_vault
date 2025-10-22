Grookai Vault — UI Rehaul Notes

Information Architecture
- Tabs (5 surfaces, center Scan as action):
  - Home
  - Vault
  - Scan (center action; does not switch tab on iOS)
  - Search (Unified)
  - Wishlist
- Top-right: Profile only (Account, Alerts [flag], Subscription/Settings/Legal stubs, Sign out)

Key Files
- lib/ui/components/app_nav.dart — Platform nav scaffolds + center Scan
- lib/ui/components/profile_button.dart — Top-right profile sheet trigger
- lib/features/search/unified_search_page.dart — Search tab entry
- lib/features/search/unified_search_sheet.dart — Debounced results + actions sheet
- lib/ui/app/routes.dart — Route table (Search -> UnifiedSearchPage)

Screenshots/Diagrams
- Add current screenshots and a simple IA diagram (tabs + scan action + profile) here.

Modify Tabs
- Edit `_tabs` in `lib/ui/components/app_nav.dart`:
  - Add/remove/reorder items by changing the list of `_TabItem(label, icon, builder)`.

Extend Actions
- In `UnifiedSearchSheet`, trailing actions are: Add to Vault, Wishlist, Details.
- Add future actions behind flags inside the trailing row in `unified_search_sheet.dart` (search for the trailing Row with IconButtons).

Design Tokens
- Colors: `lib/ui/tokens/colors.dart`
- Spacing: `lib/ui/tokens/spacing.dart` (8/12/16/24 scale)
- Typography: `lib/ui/tokens/typography.dart`
- Theme host: `lib/ui/app/theme.dart`

Scanner Handoff
- Scanner now opens Unified Search Sheet with the best candidate context.
  - See `lib/features/scanner/scanner_page.dart` (`_showConfirmationSheet`).
