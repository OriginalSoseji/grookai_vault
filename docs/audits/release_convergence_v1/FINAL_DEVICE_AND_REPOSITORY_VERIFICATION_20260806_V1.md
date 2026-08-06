# Final Device and Repository Verification 20260806 V1

## Scope

This report records the final bounded verification of the release-convergence implementation on `release/8-week-convergence-v1`. It covers repository contracts, web parity, Flutter checks, a signed-in Samsung smoke test, and an isolated iOS simulator build. It does not authorize a production deployment or database mutation.

## Provenance

- Mobile implementation commit: `4f686f69d3f7169c436c61d2f9a62a4da67e580a`
- Contract-lock commit: `375c866c7`
- Branch: `release/8-week-convergence-v1`
- The contract-lock commit changes only a Node source assertion. Application sources are identical to the mobile implementation commit.
- Android APK SHA-256: `6CD69463C92048627B0057F57054D00DE406AEFF3108A79C5FA33B3E69A412F3`
- iOS simulator executable SHA-256: `C702B14332450031978D94B8D62EEA6BE81EB2B1C478A14376EB4DD654E225BD`

## Samsung Proof

- Device: Samsung SM-S908U
- Device ID: `R5CT3291F6E`
- Android: API 36
- Final cold launch: 3,147 ms
- Final warm launch: 1,559 ms
- Authentication and local application data were preserved across the in-place debug install.

Read-only navigation proved these live surfaces:

- Pulse and caught-up state
- Wall with rendered self-hosted card images
- Vault with rendered images and visible printing/finish context
- Search and a 32-result Pikachu query
- Exact-printing action sheet with Normal, Reverse Holo, and Cosmos Holo choices
- Scan camera surface
- Messages with card, collector, set, number, and explicit legacy printing state
- Binders and binder progress
- Sets and release-era filters
- Dex and vault-aware progress
- Compare empty state
- Account/profile state

One physical-device defect was found and repaired. The search result action sheet overflowed by 89 pixels on the Samsung viewport. It now uses a bounded scroll container, retains every exact-printing and card action, and scrolls without RenderFlex errors. A regression test locks that behavior.

Legacy message threads do not persist a child `card_printing_id`. They now say `Exact printing unavailable for this legacy thread` instead of implying that the printing could be known. No finish is fabricated.

Final Android log scans found no fatal exception, ANR, unhandled Flutter exception, RenderFlex failure, or overflow after the repair.

## iOS Proof

The Mac global Flutter SDK was 3.41.6 and could not compile APIs already used by the application. The global SDK was not changed. Flutter 3.44.8 at revision `058e0af2c2b57e369d905a03ac9748b0ebf543c6` was installed under `/tmp` and used to build the exact mobile implementation commit in an isolated Git worktree.

- Target: iPhone 17 Pro Simulator, iOS 26.5
- Bundle: `com.cesar.grookaivault`
- Supabase initialization: 121 ms
- Login route: 246 ms
- Root first post-frame: 468 ms
- Warmup complete: 853 ms
- No fatal startup or missing-configuration event in the configured build
- Login screen rendered completely without overflow
- Screenshot SHA-256: `0EBEA5DF6701EDFF29F0A4CABEB44A8F944B5307F9368113173131B315EC7C2B`

Both paired physical iPhones remained offline to Xcode throughout the final polling window. A physical-iPhone claim is therefore intentionally withheld.

## Repository Verification

- Node contracts: `1506/1506` passed
- Flutter tests: `566/566` passed
- Flutter analysis: no issues
- Targeted mobile printing/action tests: passed
- Web lint: passed
- Strict Next production build: passed; 26 static pages generated
- Release-convergence Playwright: `76/76` passed
- Full web parity Playwright: `99/99` passed
- Release secret guard: passed
- Runtime health contracts: `2/2` passed
- Existing deferred report: seven known contained gaps, none introduced by this work
- `git diff --check`: passed

`npm run preflight` and `npm run contracts:quarantine-report` could not be executed locally because `SUPABASE_DB_URL` is not present in this environment. No database substitute or weaker credential was used.

## Privacy and Mutation Boundary

- No database writes
- No ownership, intent, Binder, profile, message, or account mutation during device smoke tests
- No production deployment
- No Xcode Cloud run
- No TestFlight upload
- No service-role credential packaged into either client
- Screenshots and UI XML containing personal account or message content are stored outside Git at `C:\grookai_private_device_audits\release_convergence_v1\20260805_final_device_smoke`

## Result

The implemented release-convergence surfaces are code-complete for this bounded branch and verified on web, Flutter tests, Samsung hardware, and an iPhone simulator. The remaining gates are external release gates rather than unfinished branch implementation:

1. Connect and unlock a paired physical iPhone so Xcode reports it online, then run the same candidate read-only.
2. Run database-backed preflight and quarantine reports in the governed environment that has `SUPABASE_DB_URL`.
3. Review and merge the release branch.
4. Run one deployed web candidate and the normal release-candidate observation window before production rollout.
