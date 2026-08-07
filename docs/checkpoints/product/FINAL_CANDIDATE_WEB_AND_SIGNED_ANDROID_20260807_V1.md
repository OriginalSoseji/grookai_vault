# Final Candidate Web and Signed Android Checkpoint V1

## Decision

Status: `WEB_AND_ANDROID_PROVEN / IOS_AND_RELEASE_GATES_OPEN`

The production web deployment and signed Android package are now proven from the same merged final-candidate source commit. Journey B is complete on signed Android with product-UI mutation, database readback, and net-zero cleanup. This checkpoint does not claim TestFlight, the remaining release journeys, the complete cross-platform state matrix, store readiness, the 72-hour soak, or overall release completion.

## Immutable Candidate

- Main source SHA: `80d30d0ef5f373e8208e01926f276faa705092c9`
- Merged PR: `#192`
- Production Vercel deployment: `5798722633`
- Production origin: `https://grookaivault.com`
- Signed APK workflow: `31200311976`
- Signed APK artifact: `9002772994`
- Android package: `com.grookai.vault`
- Android version: `1.0.0 (21)`
- APK SHA-256: `1ebeba31394e0182b90ec9194e2e62b7ed2ddd8db28edca312da26aaad2eaea4`
- Android release certificate SHA-256: `51e518ef647b2bd5c1c91d3d00d08e1fe3192af633b2af6741a67fdce872e033`
- iOS/TestFlight identifier: `OPEN`
- Soak status: `NOT_STARTED`

## Proven Truths

- Main Flutter CI, signed APK, CodeQL, and legacy-key workflows passed.
- Vercel Production serves the exact final-candidate SHA.
- The cookie-free web harness passed `22/22` signed-out routes and `2/2` action-continuation cases across narrow and desktop viewports.
- The signed-in production web harness passed `28/28` routes and `2/2` existing exact-card message-context cases across narrow and desktop viewports with zero broken images and `5/5` unchanged database assertions.
- Production `assetlinks.json` matches the signed Android package and certificate.
- The physical Samsung reports `grookaivault.com` as verified.
- An HTTPS canonical-card URL cold-opened the signed release package to the correct card.
- Normal, Reverse Holo, and Cosmos Holo rendered as separate exact printings.
- The selected Normal printing survived authentication and the pending action executed once.
- Push registration resumed after the ownership action and did not preempt it.
- The private-copy screen rendered `Printing: Normal` and `GVVI-FA55C026-000006`.
- The test copy was removed through the product UI and production readback confirmed zero active test rows.
- The locked personal Samsung package was not modified.
- No credentials, access tokens, or account identifiers are preserved in the evidence package.
- Production security metadata readback passes for all five governed views with zero security-definer target views and zero unsafe function search-path findings.
- Runtime preflight has zero critical failures, runtime health has zero failed checks, and unresolved quarantine count is zero.
- Production analytics, public privacy/support/terms/deletion pages, and privacy-safe mobile diagnostics contracts pass their current read-only gates.

## Residual Observation

One Pulse mark-seen request attempted to move a cursor backwards. The monotonic database guard rejected it. It did not affect authentication, exact-printing selection, ownership, private-copy rendering, or cleanup. It remains an operations/state-matrix observation until final review determines whether the rejection is expected stale-client behavior or a user-visible defect.

## Evidence

- `docs/audits/release_completion_v1/signed_out_web_final_candidate_v1/2026-08-07T17-31-51-763Z/REPORT.md`
- `docs/audits/release_completion_v1/signed_in_web_final_candidate_v1/2026-08-07T18-37-25-300Z/REPORT.md`
- `docs/audits/release_completion_v1/device_android/signed_main_exact_printing_app_link_v1/2026-08-07T17-35-18Z/REPORT.md`
- `docs/audits/release_completion_v1/final_candidate_security_and_operations_v1/2026-08-07T17-53-47Z/REPORT.md`
- `docs/audits/release_completion_v1/completion_manifest_v1.json`
- `docs/audits/release_completion_v1/RELEASE_COMPLETION_LEDGER_V1.md`

## What Remains

1. Produce or identify an iOS/TestFlight build from SHA `80d30d0e` and assign it to the intended tester groups.
2. Complete Journey A fresh-user comprehension and physical-iPhone signed-out continuation.
3. Complete Journey C's fresh state transition, Journey D's physical-device confirmation, Journey E's mobile Journeys/Memories return, and Journey F's physical-iPhone proof. Production web coverage for Journey D and the supported portions of C/E is proven.
4. Finish the desktop, narrow-web, Android, and iPhone state matrix.
5. Finish final-candidate privacy, RLS, account deletion, analytics, Crashlytics, support, terms, monitoring, and store review.
6. Freeze all platform identifiers and begin a new 72-hour soak. The soak cannot be backdated.
7. Publish the final production report only after every manifest gate is proven and no unresolved P0 defect remains.

## Next Gate

Tie TestFlight to the final-candidate source SHA while completing every non-iOS automated release proof that can run in parallel. Do not start the soak until the iOS build and all prerequisite gates are frozen.
