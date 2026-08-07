# Final-Candidate Exact-Printing Authentication And Android App Links V1

## Decision

Status: `ANDROID SOURCE AND PHYSICAL DEBUG PROVEN / SIGNED-CANDIDATE GATES OPEN`

Source commit `1a24a22070d72c5352abe7cb47684229fa8b40dc` repairs the fresh-install signed-out Add-to-Vault journey without weakening exact-printing identity. It also establishes Android HTTPS App Link authority from the release certificate produced by the governed signed-APK pipeline.

## Current Truths

- Parent cards with more than one child printing cannot enter authentication continuation until the collector chooses an exact printing.
- The selected child printing survives the authentication root replacement.
- The resumed action writes that exact child identity once and opens its private copy screen.
- A disposable Normal Pikachu copy was created and removed through the product UI; active-row readback returned `0`.
- Push registration does not interrupt a pending personal-card action.
- Android App Link source authority now exists for `grookaivault.com` and `com.grookai.vault`.
- Full repository shipcheck passes with `579/579` Flutter tests.
- The overall eight-week completion manifest remains `IN_PROGRESS`.

## Invariants

- Never infer or auto-select among multiple exact printings.
- Never drop exact-printing identity during authentication or navigation handoff.
- Never treat a snackbar-only failure as a completed personal action.
- Never register push notifications ahead of a pending action continuation.
- Never claim verified Android App Links until the deployed asset statement and signed installed package reconcile.
- Never count debug-build proof as TestFlight or final signed-candidate proof.
- Never backdate or shorten the 72-hour soak.

## Evidence

- `docs/audits/release_completion_v1/device_android/signed_out_exact_printing_auth_and_app_links_v1/2026-08-07T10-23-09/REPORT.md`
- `docs/audits/release_completion_v1/device_android/signed_out_exact_printing_auth_and_app_links_v1/2026-08-07T10-23-09/summary.json`
- Physical UI screenshots and semantic XML in the same audit directory.
- Database reconciliation and filtered runtime logs in the same audit directory.

## Remaining Gates

1. Merge the source commit through branch policy.
2. Verify production serves the exact `assetlinks.json` with JSON content type.
3. Build and install the signed APK from the merged SHA.
4. Prove Android domain verification and an HTTPS card-route launch.
5. Repeat supported release journeys on the physical iPhone/TestFlight candidate.
6. Complete the final-candidate journey, state, operations, privacy, and distribution matrices.
7. Begin a new, non-backdated 72-hour soak only after the immutable cross-platform candidate is established.

## Exact Next Gate

Push and merge the frozen source and audit commits, wait for the exact main SHA pipelines and deployment, then perform production asset-statement and signed-APK Android App Link readback before moving to the remaining external-device gates.
