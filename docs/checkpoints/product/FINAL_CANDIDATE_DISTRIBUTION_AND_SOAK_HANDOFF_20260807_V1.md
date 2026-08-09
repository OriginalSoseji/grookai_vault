# Final Candidate Distribution and Soak Handoff - 2026-08-07

## Context

The eight-week release plan is in release-management mode. Product implementation is frozen except for genuine release blockers.

## Frozen Candidate

- Source commit: `82d5f8b26cb914f405cde4ea13fd395456134574`
- Production Vercel deployment: `dpl_ADj4mujyQR5TQUt6FhpE6cR5Cy7J`
- Production verifier commit: `042ed6e26572aa450de415d84a662105599bb165`
- Android workflow/artifact: `31222690149` / `9011141315`
- Android package/version: `com.grookai.vault` / `1.0.0 (21)`
- Android APK SHA-256: `7444381f364809a9348fad4d5f5f5437c01f96153bdb92e71f08c59dbcca5289`
- iOS/TestFlight build: `1.0.0 (286)`
- iOS delivery/build ID: `fde361e1-dcfd-43b7-bc80-ff9cf647e426`
- iOS IPA SHA-256: `1d42d6948f5406919405c025f188341ee766fbd713356e830d283ff9f230d4b9`

## Current Truths

- Candidate `82d5f8b...` supersedes `c3a0aead...` after the collector-facing Pulse failure-copy repair.
- The signed Android candidate proves a friendly Pulse error and same-session Retry recovery without exposing raw provider exceptions.
- Production web is deployed from `82d5f8b...` and passed `24/24` signed-out cases plus `28/28` signed-in route/message cases.
- Signed-in database pre/post reconciliation is equal and all `5/5` read-only assertions pass.
- Flutter CI, CodeQL, and the legacy-key guard are green for the final source. The duplicate push-triggered APK run was intentionally cancelled after the exact-SHA APK run succeeded.
- The governed Android APK is signed, verified, and installed on the Samsung without clearing user data.
- TestFlight build `286` is valid, approved for external testing, and present in all intended tester groups.
- Required App Store metadata is populated, and the configured iPhone and iPad screenshot sets are delivered.
- All four iOS dSYM bundles were explicitly uploaded to Firebase Crashlytics.
- The automated route/state matrix is `76/76`.
- The disposable ordinary-account deletion path is proven.
- No public App Store release has occurred.
- The available signed-in Google session has no existing Play Console developer account; Play Console redirects to signup, so no live Play listing is claimed.

## Invariants

- Do not change application source during final physical verification or soak.
- Do not modify `com.grookai.vault.lockedacceptance`.
- Do not clear established collector data to simplify testing.
- Do not claim a physical journey from a locked or unavailable device.
- Do not backdate the soak.
- Any application-source repair creates a new final candidate and resets all build identifiers and the soak clock.
- Release-verifier-only repairs must use a separate committed verifier SHA and cannot change the deployed candidate.

## Remaining Work

1. Unlock the connected Samsung and run the required final-candidate physical Android journey/state matrix.
2. Bring a paired iPhone online and run the required journeys on TestFlight build `286`.
3. Capture fresh-user ten-second comprehension evidence.
4. Complete the exact Want -> active match -> opt-out transition with device and database readback.
5. Confirm collector discovery, follow, activity, exact-card context, and contextual messaging on physical mobile.
6. Confirm Journeys and Memories context return on physical mobile.
7. Establish or identify the intended Google Play developer account and verify the Play listing/assets contract.
8. Reconcile all physical results into `completion_manifest_v1.json`.
9. Start and monitor the fresh 72-hour immutable-candidate soak.
10. Issue the final production report and release decision after a clean soak.

## Authoritative Evidence

- `docs/audits/release_completion_v1/final_candidate_blocker_repair_v1/2026-08-07T23-26-39Z/REPORT.md`
- `docs/audits/release_completion_v1/signed_out_web_final_candidate_82d5f8b_v1/2026-08-07T23-04-42-176Z/REPORT.md`
- `docs/audits/release_completion_v1/signed_in_web_final_candidate_82d5f8b_v1/2026-08-07T23-22-49-126Z/REPORT.md`

## Completion Rule

The eight-week process remains `IN_PROGRESS`. Distribution is complete, but physical-device evidence and the 72-hour soak are mandatory and cannot be replaced by automation or documentation.
