# Vendor sale flow verification V1

Scope: owner Review → Publish → Label presentation and the compact preset editor.
The existing owner writers, server pricing calculator, revision checks, permanent
QR and Square reconciliation retain authority. This change needs no migration.

Run the focused native checks:

```powershell
flutter test test/intake/vault_copy_sale_sheet_test.dart test/intake/vendor_pricing_rules_test.dart test/intake/vendor_pricing_settings_screen_test.dart test/intake/vault_add_review_sheet_test.dart
```

These cover explicit publication, keyboard Done without a write, cancelled public
edits, one write during repeated submit, uncertain-save lockout, authoritative
Square pending state, search route arguments, nested review/navigation handoff,
fixed-price protection, quote
refresh, external revision conflicts, asynchronous exact-finish display without
overwriting a typed price, server-only default examples, collapsed
adjustments/limits and 320px layout with 200% text.

The browser check uses an existing unlinked, isolated vendor-pricing runtime lab
with its synthetic owner and four copies, unchanged governed reader and current
fixture publication. Restore and attest that lab's existing relay; never reset a
populated lab or point this check at production. Start the candidate web source
on loopback port 61916 against the fixture API on loopback 62541. Enable only the
local collector/pricing test flags for this server. Keep secret keys in the
server environment and private fixture file. Then run:

```powershell
$env:VENDOR_SALE_LAB_DIR = '<unlinked vendor-pricing runtime lab>'
$env:VENDOR_SALE_ARTIFACTS_DIR = '<new evidence directory>'
node apps/web/node_modules/@playwright/test/cli.js test --config apps/web/playwright.vendor-sale.config.ts
```

The test signs in through the real local UI and writes only synthetic fixture
presets and copies. It verifies server calculations, retained limits while
collapsed, cancel/focus behavior, explicit automatic publication, a fixed-price
override, live quote refresh and an external manual-price conflict. It captures
320/375/1365px dark/light views and confirms the saved label stage. Label printing
is intercepted in the test browser; image decoding, print portal readiness,
price-free full set names and batch selection are checked without a printer job.
Source hashes must agree before and after the workflow.

Before shipping, stop the task's dev server, run the normal managed commit/push
hooks and hosted checks, and obtain independent review of that exact head. Read
back the production deployment SHA and existing flags/crons. Install only a
higher, qualified, same-signer Android build in place, retaining UID, login,
first-install time and Developer Options. On the Samsung, open an existing copy,
review its identity and price, cancel without publication, inspect default and
preset editing without saving, and preview its existing price-free label without
printing. Local confirmed-save checks do not imply a new live payment or print.
