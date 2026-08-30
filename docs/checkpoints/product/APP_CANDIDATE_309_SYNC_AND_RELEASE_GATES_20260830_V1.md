# App Candidate 309 Sync And Release Gates

## Current Truth

Grookai Vault `1.0.0 (309)` is the first current synchronized candidate across production web, signed Android, App Store Connect/TestFlight, and exact-source iOS simulator validation. Its source authority is commit `39f9911173d7c5053f49cbb04b22d9c1b3ff624f`, merged by PR `#331`.

The automated evidence is green:

- production signed-out web: `24/24`
- deterministic release state matrix: `76/76`
- Android package/readback: build `309`, zero candidate-process fatal events
- iOS archive and IPA: build `309`, codesign valid, TestFlight processing `VALID`
- iOS simulator launch and card deep link: passed
- repository tests and CI: passed

The permanent audit is `docs/audits/release_completion_v1/app_candidate_309_sync_v1/2026-08-30T18-20-39Z/REPORT.md`.

## Invariants

- Candidate identity must remain commit `39f9911173d7c5053f49cbb04b22d9c1b3ff624f`, Android APK SHA-256 `5c4182ea14980c835714622e68bef4e0a73dac710bda7f975c3aa1a73b0174cf`, and iOS IPA SHA-256 `88cbf1f9626c5088ad15456d44defe6ba13d2089393609e9c3cafd059495b674` for this gate.
- New source changes create a new candidate and invalidate any uncompleted candidate-scoped soak.
- Historical functional proof cannot be relabeled as candidate-309 proof.
- No human result, physical-device result, or Play Console state may be inferred from emulator or repository evidence.
- The soak cannot start until every non-soak manifest gate is proven.

## Remaining Work

1. Install TestFlight 309 on a physical iPhone.
2. Run physical iPhone signed-out continuation and required state checks.
3. Run the clean-account Want Match transition and read-only reconciliation on candidate 309.
4. Capture a genuine fresh-user ten-second comprehension result.
5. Verify Google Play account/listing/assets/track authority.
6. Reconcile the manifest and start the real 72-hour immutable-candidate soak.
7. Complete healthy soak observations and make the final release decision.

## Stop Condition

Do not claim public-launch readiness yet. The synchronized build and automated gates are proven; the six external release gates above remain open.
