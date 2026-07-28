# Product Surface Wiring Correction Report

## Result

`passed`

The source audit found and corrected three render-path gaps before production
deployment:

| Surface | Before | Corrected state |
| --- | --- | --- |
| Web Set grid | No pricing read/render path | Signed-in exact child-printing enrichment and selected-printing render |
| Flutter Compare | Governed row reduced to three scalar fields and plain text | Full `CardSurfacePricingData` retained and rendered through `CardSurfacePriceText` |
| Flutter Network | Price flattened into supporting text | Full pricing object rendered through `CardSurfacePriceText` |

## Boundary

- Repository work only.
- No production migration.
- No production publication change.
- No deployment.
- No database write.
- No anonymous pricing-access change.
- The active 72-hour canary remains frozen.

## Evidence

### Pricing proof contract

```text
node --test tests/contracts/tcgplayer_market_product_surface_proof_v1.test.mjs
11 tests passed, 0 failed

npm run contracts:test
868 tests passed, 0 failed
```

### Web

```text
npm --prefix apps/web run typecheck
passed

npm --prefix apps/web run lint
passed with no warnings or errors

npm run web:build:strict
strict Next.js production build passed
```

### Flutter

```text
flutter analyze
passed with no issues

flutter test test/card_surface_price_proof_test.dart
3 tests passed, 0 failed

flutter test
310 tests passed, 0 failed
```

### Repository integrity

```text
git diff --check
passed
```

## Source Invariants Proven

- Web Set pricing uses `cardPrintingIds`, not parent card-print IDs.
- Initial and paginated Set paths enrich only for an authenticated user.
- The selected printing supplies the rendered price and evidence identity.
- Flutter Compare retains the governed pricing object through its model.
- Flutter Compare and Network use the shared proof-bearing price widget.
- Network no longer formats the market amount as untraceable support text.

## Remaining Gate

This is implementation evidence, not production source-to-render proof. Final
completion still requires same-commit authenticated production captures for
all 17 required surfaces after the frozen canary and post-canary rollout gates
pass.
