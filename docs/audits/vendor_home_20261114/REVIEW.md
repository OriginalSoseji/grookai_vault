# Vendor workspace: visible selling navigation

This implements the first step of the November 13 vendor experience blueprint:
one visible route to inventory, pricing, labels, and Square on native and web.
The existing exact-copy sale editor, pricing calculator, label renderer, OAuth
consent, stock allocation, payment handling, and archive writers remain the
authorities. This change has no migrations, provider writes, or automatic prints.

## Result

- Native Menu → Vendor Mode keeps its inventory and filters in place. Add card
  opens the existing Search route and returns to the same workspace. Pricing,
  Labels, and Square are visible shortcuts. Store, sales desk, inventory economics,
  and refresh remain in Vendor tools.
- Returning from a child workflow refreshes the inventory even when the search
  field still has focus, while the existing guards protect pending price edits,
  saves, and errors. The existing timed refresh retains its focus/lifecycle guards.
- At enlarged text sizes, narrow native rows stack condition, market, and asking
  price fields. Read-only amounts and price inputs grow with their text instead
  of clipping into a fixed 44px height.
- Website Account → Vendor Mode opens `/account/vendor`. The same navigation is
  available in eligible owners’ Vault, pricing, label selection, and Square pages.
  Existing deep links and authentication destinations remain valid.
- The website home reads the actual owner pricing workspace. Its separate Square
  summary uses the existing authenticated API with no cached response. A sandbox
  connection, disabled feature, or incomplete saved setup never claims live
  readiness. Pending cards and review warnings remain distinct from enabled
  automatic settings. Failed reads offer a bounded read-only retry.
- Navigation is excluded from label print output. The existing renderer still
  owns exact paper dimensions, full canonical set names, price-free content,
  permanent QR identity, and physical transport guards.

## Verification

Use the normal managed commit/push hooks and hosted checks. Focused commands:

```powershell
flutter test test/vendor_mode_workspace_test.dart --no-pub
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
```

For browser verification, use a schema-current isolated local Supabase instance
and the repository’s existing staging mode for that exact local target. Create
a local-only `vendor-home-…@fixture.invalid` authenticated vendor account, then:

```powershell
$env:VENDOR_WORKSPACE_USER_FILE = '<private local fixture JSON: email, password>'
$env:VENDOR_WORKSPACE_ARTIFACTS_DIR = '<task-owned browser evidence directory>'
# Optional VENDOR_WORKSPACE_BASE_URL; only 127.0.0.1 is accepted.
cd apps/web
npx --no-install playwright test --config playwright.vendor-workspace.config.ts
```

Browser checks use real local Auth and owner entitlement, and simulated read-only
Square responses. They verify 320px/375px/desktop navigation, print suppression,
selected destinations, sandbox/paused state, pending cards, review warnings, and
failed-read recovery. They create no inventory, payments, or print jobs.
The native regression verifies the normal Search route and refreshed exact-copy
inventory on return, preserved search, and no pricing or removal writes.

Production release and Samsung acceptance are recorded separately in
`C:/grookai_vault_operator_artifacts/vendor_home_20261114/` after normal gates.
No completed deployment or device verification is implied by this source note.

## Remaining blueprint steps

The contextual Review → Publish → Label presentation and the compact preset
editor remain separate implementation steps. This navigation change preserves
their existing functional workflows; it does not claim the entire preview has
been implemented.
