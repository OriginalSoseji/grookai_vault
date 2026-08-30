# Synchronized App Candidate 309

## Result

Candidate `1.0.0 (309)` is synchronized from source commit `39f9911173d7c5053f49cbb04b22d9c1b3ff624f` across production web, the signed Android release artifact, the App Store Connect/TestFlight upload, and the iOS simulator proof. The automated gates executed in this audit passed. Overall production release completion remains prohibited because the physical-device, fresh-user, Google Play, clean-account transition, and 72-hour soak gates are not complete.

## Proven

- PR `#331` merged candidate 309 to `main` at the frozen source commit.
- Production Vercel deployment `5aJnbAAAtCsyVdn6bQK9dV45UEMA` completed for that commit.
- The signed-out production web matrix passed `22/22` routes and `2/2` personal-action continuation cases at narrow and desktop viewports.
- The deterministic release state matrix passed `76/76`, with zero skipped, unexpected, or flaky cases.
- GitHub Actions run `33326883149` built the signed Android APK from the frozen commit.
- Android package `com.grookai.vault` read back as `1.0.0 (309)` on `emulator-5556`; the candidate process remained live with zero fatal process events.
- The Android APK SHA-256 is `5c4182ea14980c835714622e68bef4e0a73dac710bda7f975c3aa1a73b0174cf`.
- The iOS archive read back as `1.0.0 (309)`, passed `codesign --verify --deep --strict`, and contains the required location purpose string.
- App Store Connect reported build `309` as `VALID`; Apple emailed that build 309 was available to test at `2026-08-30T18:15:36Z`.
- No build-309 missing-purpose-string warning email was observed. Builds 307 and 308 had emitted that warning before the candidate repair.
- A locally exported IPA from the uploaded archive has SHA-256 `88cbf1f9626c5088ad15456d44defe6ba13d2089393609e9c3cafd059495b674`.
- The exact candidate launched on iOS Simulator as build 309, remained alive without error/fault log entries, and opened `https://grookaivault.com/card/GV-PK-AR-71` to the correct Pikachu card family and image.

## Limitations

- The Android emulator had no default network route. Its package, launch, rendering, and process evidence are valid; production-network timing and data behavior are not claimed from that emulator.
- The two connected physical iPhones still had builds 293 and 308 during readback. TestFlight 309 is available but was not installed automatically.
- The temporary signed-in release-journey credential file is absent, so the candidate-scoped signed-in web runner was not rerun. Historical functional proof remains valid, but it does not replace the clean-account candidate gate.
- Browser-control tooling could not attach to the active Play Console session. No current Google Play developer-account, listing, track, or asset claim is made from this audit.
- A genuine fresh-user ten-second comprehension result cannot be manufactured by automation.

## Boundaries

- No production database or application-data writes occurred.
- No public App Store or Google Play release occurred.
- TestFlight build 309 was uploaded and processed.
- Production web was deployed by the merged candidate workflow.
- The raw Playwright reporter output remains outside Git because it serializes the process environment. Only its non-sensitive aggregate is committed.
- The 72-hour soak was not started or backdated.

## Exact Next Gate

1. Install TestFlight build 309 on a physical iPhone and execute the signed-out continuation and required physical state checks.
2. Execute one clean-account Want-to-match-to-message-to-opt-out journey on candidate 309 and reconcile it through read-only database evidence.
3. Record a genuine fresh-user ten-second comprehension result.
4. Verify the intended Google Play developer account, listing, assets, and release track.
5. Mark only evidence-backed gates proven, then start the immutable 72-hour soak from its real start time.
