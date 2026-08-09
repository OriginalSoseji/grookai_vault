# Final Candidate Blocker Repair and Redistribution V1

## Decision

Candidate `82d5f8b26cb914f405cde4ea13fd395456134574` supersedes pre-repair candidate `c3a0aeadf903d4cfc83b004798a397dd718f4f58`.

The replacement candidate is built, signed, distributed, deployed to production web, and proven through automated production journeys. It is not release-complete because physical Samsung/iPhone journeys, fresh-user comprehension, Google Play listing authority, and the fresh 72-hour soak remain open.

## Repair

- Pulse no longer exposes provider exception text to collectors.
- Collector-facing failure copy is `Pulse is temporarily unavailable. Check your connection and try again.`
- The signed APK was tested with package-only network denial, not airplane mode.
- The friendly error appeared without raw `ClientException`, `SocketException`, Supabase host, or failed-host text.
- Restoring package networking and selecting Retry returned content in the same authenticated session.

## Android

- Workflow `31222690149` completed successfully for exact source SHA `82d5f8b...`.
- Artifact `9011141315` produced the signed release APK.
- APK SHA-256: `7444381f364809a9348fad4d5f5f5437c01f96153bdb92e71f08c59dbcca5289`.
- Package/version: `com.grookai.vault`, `1.0.0 (21)`.
- The signing certificate and APK v2 signature verify.
- The APK is installed on a disposable emulator and on Samsung `SM-S908U`.
- Samsung installation preserved existing app data.
- Samsung is secure-keyguard locked, so no physical journey is claimed.

## iOS and TestFlight

- Pinned archive and IPA were produced from source SHA `82d5f8b...` with automatic package resolution disabled.
- Resolved `GTMSessionFetcher` remained at frozen version `5.3.0`.
- Bundle/version/build: `com.cesar.grookaivault`, `1.0.0 (286)`.
- IPA SHA-256: `1d42d6948f5406919405c025f188341ee766fbd713356e830d283ff9f230d4b9`.
- App Store processing is `VALID`, beta review is `APPROVED`, and internal/external states are `IN_BETA_TESTING`.
- Build `286` is present in all three intended groups with automatic notification enabled.
- All four arm64 dSYMs were accepted by Crashlytics.
- Both paired iPhones are unavailable, so no physical iPhone journey is claimed.
- No public App Store release occurred.

## Production Web

- Vercel deployment `dpl_ADj4mujyQR5TQUt6FhpE6cR5Cy7J` is `READY` and targets production.
- `grookaivault.com` resolves to source SHA `82d5f8b...`.
- Signed-out production verification passed `22/22` routes and `2/2` personal-action continuations.
- Signed-in production verification passed `26/26` routes and `2/2` existing message contexts.
- All `5/5` scoped database assertions passed and before/after readback was equal.
- After authentication, the verifier blocked every non-read browser request.

## Signed-In Verifier Repair

The first replacement-candidate run failed because the verifier hardcoded archived GVVI `...000001`, while production correctly returned `404` and retained active exact copy `...000002` as private `hold` evidence. No data was recreated.

Verifier commit `042ed6e26572aa450de415d84a662105599bb165` now:

- selects active exact evidence in a read-only preflight;
- uses `/vault/gvvi/...` for owner-only exact-copy verification;
- verifies that private `hold` evidence is absent from public profiles;
- reconciles database state before and after;
- does not require a default `Hold` badge on the grouped Vault tile when the exact-copy page already proves the intent.

The repaired verifier passed all seven contracts. Its substantive repair also passed the full shipcheck, including runtime contracts, web type/lint/build, Flutter analysis, and all 580 Flutter tests.

## GitHub

- Flutter CI `31225135036`: success.
- CodeQL `31225134276`: success.
- Guard: No Legacy Keys `31225135027`: success.
- Exact-SHA signed APK `31222690149`: success.
- Push-triggered signed APK `31225135185`: intentionally cancelled as a duplicate after the exact-SHA artifact had already succeeded.

## Boundaries

- No database schema or collector-data writes were performed.
- No deleted test fixture was recreated.
- No approval, Want, message, vault, or follow mutation was performed by the web verifier.
- No public App Store or Google Play release was performed.
- `com.grookai.vault.lockedacceptance` was not modified.
- No physical journey is claimed from a locked or unavailable device.
- The 72-hour soak has not started and is not backdated.

## Remaining Gates

1. Unlock the Samsung and run final-candidate physical Android journeys.
2. Bring a paired iPhone online and run TestFlight build `286` journeys.
3. Capture fresh-user ten-second comprehension evidence.
4. Complete the clean-account Want -> active match -> opt-out transition with device and database readback.
5. Complete physical collector discovery, follow, activity, exact-card messaging, Journeys, and Memories evidence.
6. Establish or identify the intended Google Play developer account and verify listing/assets.
7. Reconcile physical results into the completion manifest.
8. Start a fresh immutable-candidate 72-hour soak only after prerequisite gates pass.
9. Issue the final production report after a clean soak.

## Completion

`IN_PROGRESS`. Replacement distribution and production web proof are complete; physical, store, comprehension, and soak gates remain mandatory.
