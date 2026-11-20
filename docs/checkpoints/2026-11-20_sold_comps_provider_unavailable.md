# eBay sold-comps provider availability — 2026-11-20

## Summary

Post-install QA found that the sold-comps loader added to card details had no
production provider. The app called `card-sold-comps-v1`, but that function is
not deployed in the production Supabase project. The legacy `ebay_sold_engine`
function is deployed, but its required `EBAY_OAUTH_TOKEN` secret is absent.

## What Changed

- Removed the live app's call to the unavailable `card-sold-comps-v1` function.
- Kept the exact-printing eBay completed-listings search, which opens eBay for
  the collector to review.
- Clarified that grookai does not import or average those external results.
- Removed a component-only fixture test that simulated an unavailable provider.

## What Is Now True

- Production functions were listed read-only with Supabase CLI on
  `ycdxbpibncqcchqiihfz`; `card-sold-comps-v1` was absent.
- The legacy `ebay_sold_engine` source was downloaded to a temporary inspection
  directory. Its code requires `EBAY_OAUTH_TOKEN`; production secrets listing
  confirmed that secret is absent.
- The live average feature is not available. No eBay-wide average is claimed.
- The user-facing eBay sold-search link remains available from card details and
  price history.
- Targeted Flutter analysis and all 8 market-history tests pass on the
  corrective branch. The regression test confirms that without a provider,
  the sheet offers eBay review and does not expose the in-app loader.
- Samsung currently has signed build 606 installed in place. The corrective
  change below must be merged and installed as a later build to remove the
  broken button from the device.

## Remaining Risks

- eBay's official completed-sale API access must be approved and implemented
  in a deployable backend before grookai can show an automatic average.
- Build 606 currently contains a button that reaches an undeployed function;
  install the corrective update before calling the flow verified.

## Next Likely Step

Merge this corrective change through CI, produce the next signed Android
update, install it in place, and verify the eBay completed-listings link on the
Samsung. Track provider approval as a separate prerequisite for automatic
averages.

## Related Artifacts

- `lib/card_detail_screen.dart`
- `lib/widgets/pricing/card_market_history_sheet.dart`
- `test/card_market_history_sheet_test.dart`
- `lib/services/pricing/card_sold_comps_service.dart`
- `docs/checkpoints/2026-11-20_sold_comps_card_detail_wiring.md`
