# Final Candidate Distribution V1

## Result

Status: `DISTRIBUTED - PHYSICAL JOURNEYS AND SOAK PENDING`

The immutable application source is commit `c3a0aeadf903d4cfc83b004798a397dd718f4f58`.

Production web, the signed Android artifact, and TestFlight build `285` all originate from that source. No public App Store release was performed.

## Proven

- Production web deployment `5801417932` succeeded.
- Signed-out production web passed `22/22` routes and `2/2` personal-action protections.
- Signed-in production web passed `28/28` routes, `2/2` message-context cases, and `5/5` database assertions.
- Final-SHA GitHub workflows all succeeded, including CodeQL, runtime protection, legacy-key protection, signed APK, and the production edge probe.
- Android package `com.grookai.vault` version `1.0.0 (21)` is signed by the governed release certificate and installed on the Samsung without clearing app data.
- iOS archive and exported IPA are signed as `com.cesar.grookaivault` version `1.0.0 (285)`.
- App Store Connect reports build `285` as `VALID` and `APP_STORE_ELIGIBLE`.
- TestFlight reports build `285` as `IN_BETA_TESTING` for internal and external testing, with Beta App Review `APPROVED`.
- All three intended TestFlight groups contain build `285`.
- Required English App Store metadata is populated, and the configured iPhone and iPad screenshot assets both report delivery state `COMPLETE`.
- Firebase accepted all four arm64 dSYM bundles, including `Runner.app.dSYM`.
- The automated state matrix passed `76/76` scenarios.
- The disposable ordinary-account deletion exercise is already proven by the governed account-deletion audit.

## Boundaries

- No public App Store release occurred.
- No database schema or collector-data mutation was used to manufacture release evidence.
- The available signed-in Google session redirects Play Console to `/console/signup`; no existing Google Play developer account or listing is available for live metadata/assets verification.
- The Samsung physical visual journey is not claimed because the device is currently protected by its secure lock screen.
- The physical iPhone journey is not claimed because neither paired iPhone is currently available to the Mac.
- The 72-hour soak has not started.

## Exact Next Gate

1. Unlock the already-connected Samsung and execute the final physical Android journey/state matrix against the installed APK.
2. Bring a paired iPhone online, install/open TestFlight build `285`, and execute the corresponding iPhone journey/state matrix.
3. Establish or identify the intended Google Play developer account before claiming Play Store listing readiness.
4. Reconcile the device evidence into the completion manifest.
5. Start a fresh 72-hour no-source-change soak. Any blocker repair resets the soak clock.
6. After 72 continuous clean hours, issue the final production report and release decision.
