# Sealed iOS 314 Physical Acceptance

Date: 2026-09-07. This supersedes the earlier locked-device limitation in
`SEALED_IOS314_RELEASE_20260907.md`, not its historical release evidence.

## Scope And Provenance

Actual signed-in iPhone testing through Xcode, without rebuilding the app.
CoreDevice readback confirms installed build 314, bundle
`com.cesar.grookaivault`. The frozen app source remains
`736f15c1fa866fad3616a4a55d9a46dc566ae0e5`, not this documentation commit.
The phone initially had 313 and later read back 314. The installation test's
Update precondition failed before tapping; do not attribute that installation
to the test harness. Existing authentication and user data were preserved.

Canonical read-only DB sanity at `2026-09-07T19:17:39.872Z`:
170,404 cards, 3,397 sets, 32,903 traits. Transaction rolled back, no writes.
No catalog, pricing, Storage, Vault, publication or visibility mutation;
no new archive, upload, audience expansion or public store submission.

## Verified Observations

- Fresh launch opens the signed-in app and navigates to Sets.
- Pokemon sealed opens with product images and market prices; next page reaches
  Page 2. Entering `151` and tapping the upper search arrow closes the keyboard
  and resets the page to 1. Subsequent screenshot inspection confirms matching
  151 products, visible image bytes and displayed market prices.
- The Bundles filter narrows `151` to three rows: Booster Bundle, Booster Bundle
  Display and the Sam's Club mini-tin/promo bundle. Adding Japanese gives the
  explicit `No sealed products found` state, with no English products leaked.
  This proves that specific query/filter state, not absence of Japanese stock
  everywhere or exhaustive multilingual coverage.
- A separate fresh-launch path through Sets, Magic: The Gathering, then Browse
  sealed reaches MTG Sealed Page 1. The final screenshot shows full product
  images and prices, including 10th Edition Booster Box and Booster Pack.
- Product text, package/language labels and prices are readable in the inspected
  screenshots. This is bounded display/navigation evidence, not a price audit
  of every product, exhaustive iPhone regression coverage or a latency SLO pass.

## Harness Findings Preserved

Do not summarize this session as an entirely green automated suite. Several
early stages failed route/selector preconditions or encountered changed device
state. A TestFlight release-notes overlay visually covered an accessibility
tree reporting the underlying app. The short `Search` identifier matched the
native keyboard button instead of the Flutter arrow; exact label and upper
screen bounds disambiguated it. A result assertion ran before images appeared;
later hierarchy and screenshot readback confirmed the products.

The first MTG attempt did not prove navigation: a subsequent snapshot was still
on Sets. A fresh-launch run then recorded the full successful path. One earlier
inspection waited roughly 70 seconds for XCTest idleness; do not present total
test duration as database request latency.

Raw failed logs remain intact. Some failing XCTest jobs hung during result
finalization and were stopped using exact owned-PID/command checks; incomplete
xcresult bundles are not claimed to be valid attachment archives. Missing exit
files remain explicitly unknown. All owned xcodebuild test processes were
verified absent after completion. Successful inspection-method exit codes are
not substitutes for reviewing their captured screens.

## Evidence

Private operator root:
`C:/grookai_vault_operator_artifacts/pokemon_sealed/20260907_ios314_acceptance/`.

Contains `sanity.json`, installed-app readback, stage source copies/hashes,
raw logs and available exit files, `acceptance_summary.json` and
`artifact_hashes.json`. Full result bundles remain on the Mac under
`~/grookai_ios314_acceptance_20260907`. Do not publish founder screenshots or
raw account/device metadata into GitHub.

Reviewed screenshot references (relative to the operator root):

- Pokemon results: `inspectresults_attachments/5EA3F761-BAD9-4CF9-B0F0-837793248F1F.png`.
- MTG final fresh launch: `freshmtg_attachments/7B527A59-D86E-406A-BFE5-EA810A37F47F.png`.
- Filter results: full accessibility evidence in `filtersmtg.log`; the combined
  test later failed its first MTG-navigation assertion. Do not call that whole
  stage a pass.

## Next Gate

The bounded physical browse/search smoke check is complete. No replacement
build is needed for the keyboard fix. Remaining work is explicit:

1. Reproduce search/page/filter scroll-offset retention in a controlled test.
   The 151 screenshot showed the first row partially above the viewport after
   search; the initial MTG screenshot was also scrolled. Concurrent device-state
   changes mean the cause must be isolated before changing code. Fresh-launch
   MTG rendering starts at the top correctly.
2. Profile actual data/image latency independently of Xcode idleness. General
   performance is not closed by this smoke test.
3. Preserve the documented missing-image and aging-price exclusions. Continue
   source maintenance without fake freshness, replacement identities or deletes.
4. Sealed ownership/Vault integration and public licensing remain separate
   product gates in `SEALED_CLIENT_CLOSEOUT_20260907.md`. White-background
   isolation stays deferred under its existing plan.
