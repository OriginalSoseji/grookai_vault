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
- PR #998 is merged at `c7c1e09f31491a56440ce19c91cd318890d8eca2`.
- Signed Android build 607 from that commit is installed in place on Samsung.
  Package is `com.grookai.vault`, version `1.0.0`, versionCode `607`, and its
  signer matches build 606. `firstInstallTime` remained unchanged.
- On-device price-history QA passed: TCGplayer daily history and the personal
  sales section render, the unavailable sold-comps action is absent, and the
  eBay completed-listings review link and its disclaimer are visible.
- Opening the eBay link from build 607 loads completed Charizard listings with
  sold dates and prices. This is external review, not imported app data.

## Remaining Risks

- eBay's official completed-sale API access must be approved and implemented
  in a deployable backend before grookai can show an automatic average.
- An automatic sold-price average still requires a production provider that
  returns completed-sale records. Build 607 does not claim to calculate one.

## Next Likely Step

Track eBay-approved completed-sale data access and deploy a production backend
provider before restoring automatic sold-price averages. The existing manual
completed-listings review path is verified on build 607.

## Release Verification — Build 607

- PR #998 checks passed, then the change was squash-merged to `main`.
- Android workflow 44773442018 passed analysis, the full Flutter test suite,
  signed APK identity verification, artifact upload, and Windows goldens.
- The downloaded artifact manifest recorded package `com.grookai.vault`,
  marketing version `1.0.0`, build number `607`, merge commit
  `c7c1e09f31491a56440ce19c91cd318890d8eca2`, and the approved release signer.
- Samsung update preflight confirmed the installed build 606 signer matched
  build 607. `adb install -r` succeeded and package metadata confirmed
  `versionCode=607` with the existing `firstInstallTime` preserved.
- On the device, Search → Charizard from 151 → card → View your copy → View
  card → View price history reached the corrected sheet. The sheet showed 23
  qualified daily TCGplayer observations, no sold-comps loader, the personal
  sales section, and the eBay completed-listings review link with its
  non-import disclaimer. The link opened eBay results showing sold dates and
  prices.

## Related Artifacts

- `lib/card_detail_screen.dart`
- `lib/widgets/pricing/card_market_history_sheet.dart`
- `test/card_market_history_sheet_test.dart`
- `lib/services/pricing/card_sold_comps_service.dart`
- `docs/checkpoints/2026-11-20_sold_comps_card_detail_wiring.md`
