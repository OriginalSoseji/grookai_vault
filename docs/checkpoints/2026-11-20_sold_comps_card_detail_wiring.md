# Sold comps card-detail wiring — 2026-11-20

## Summary

Device QA of Android build 605 found that card price history showed TCGplayer
history and the manual eBay sold-search link, but did not show the sold-comps
loader or returned-sample mean. The sold-comps widget existed, but its card
detail caller did not provide a loader.

## What Changed

- Wired `CardSoldCompsService` into the signed-in card price-history sheet.
- Passed the card name, resolved set and collector number, and the selected
  printing finish so the service can request comps for that exact context.
- Return early when no printing is selected, preserving the exact-print guard.
- Added focused widget coverage for loading comps, separate averages by
  currency, total-price handling, and the sample-mean disclaimer.

## What Is Now True

- The current-main change passes focused Flutter analysis.
- `flutter test --no-pub test/card_market_history_sheet_test.dart` passes all
  8 tests, including the new returned-sample average test.
- This change is on `fix/wire-sold-comps-card-detail-20261120` in the isolated
  worktree and has not yet been merged or installed.
- Samsung build 605 remains installed; it does not include this wiring fix.

## Remaining Risks

- Live production response from `card-sold-comps-v1` is not yet verified from
  the newly wired screen. The UI must continue to describe its mean as a sample
  of returned matches, never as an eBay-wide average.
- The sold-comps provider can return limited or no matches; the UI must retain
  its retry and empty-result states.

## Next Likely Step

Run repository checks, open the focused PR, wait for required CI, merge, produce
the signed Android update from current main, install it in place on the
Samsung, and verify the live sold-comps response and mean.

## Related Artifacts

- `lib/card_detail_screen.dart`
- `lib/widgets/pricing/card_market_history_sheet.dart`
- `lib/services/pricing/card_sold_comps_service.dart`
- `test/card_market_history_sheet_test.dart`
