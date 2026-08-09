# Physical iPhone Want Match Functional Proof Checkpoint V1

## Status

`FUNCTIONAL JOURNEY C PROOF / NOT FINAL-CANDIDATE-SCOPED / CURRENT WANT CLEAN`

## Functional Proof Build

- Branch: `release/final-candidate-proof-v1`
- Source and verifier SHA: `09300d858fd8de2b23e0d3540e8ee6940181a426`
- TestFlight version: `1.0.0 (288)`
- Physical device: iPhone 17 Pro
- Exact card: `GV-PK-CEC-214`
- Subject identity retained only as SHA-256 fingerprint.
- Release scope: this build is not the candidate declared in `completion_manifest_v1.json`; it cannot close the candidate-scoped Journey C gate.

## Proven

- The disposable clean account had one enabled Denver/CO/US local-discovery row and a public, shared Vault before the test.
- Want was enabled through Search and Card Detail at `2026-08-09T05:15:26.528Z`.
- The normal scheduled engine created one exact Want Match at `2026-08-09T05:20:00.114Z`; no job was manually invoked.
- Pulse visibly identified `Blastoise & Piplup-GX`, Poke Javi, same-region proximity, trade intent, and Cosmic Eclipse `#214`.
- The composer visibly preserved the exact owner and card context.
- Exactly one card-centered message was committed at `2026-08-09T05:29:05.396Z` and appeared in the normal Messages inbox.
- Want was disabled through Card Detail at `2026-08-09T05:33:50.785Z`.
- The match became stale with `canonical_want_removed`; active matches returned to zero.
- Current and older Pulse hid the stale match.
- Invalid deliverable notifications, post-opt-out deliveries, and event-emission failures were all zero.
- The governed readback completed with status `passed`, `completion_allowed=true`, and no findings.

## Current Truths

- Journey C behavior is proven on build `288`, but the release gate remains `partial` until the same journey is reconciled on the newly synchronized final candidate.
- The disposable account's final current Want for the target is false.
- The historical match and message remain as append-only product evidence; they were not deleted or rewritten.
- The release verifier and final database reconciliation were read-only.
- No personal founder credential was used or retained.

## Invariants

- A Want Match must originate from current canonical Want truth and an independently eligible owner copy.
- Exact card, source instance, owner context, and message tuple must reconcile.
- Opt-out must stale the durable match and remove it from Pulse without deleting history.
- Product state must be changed through the product UI, not seeded directly for release proof.
- Private message content must never enter permanent release artifacts.

## Evidence

- `docs/audits/release_completion_v1/device_ios/clean_account_want_match_journey_v1/2026-08-09T05-42-34Z/REPORT.md`
- `docs/audits/release_completion_v1/device_ios/clean_account_want_match_journey_v1/2026-08-09T05-42-34Z/DEVICE_PROOF.md`
- `docs/audits/release_completion_v1/device_ios/clean_account_want_match_journey_v1/2026-08-09T05-42-34Z/summary.json`
- `docs/audits/release_completion_v1/device_ios/clean_account_want_match_journey_v1/2026-08-09T05-42-34Z/run_plan.json`
- `docs/audits/release_completion_v1/device_ios/clean_account_want_match_journey_v1/2026-08-09T05-42-34Z/permanent_artifact_hashes.json`

## Exact Next Gate

Preserve this proof unchanged, merge the release-candidate repair, and cut web, Android, and iOS artifacts from one source commit. Repeat Journey C once on that synchronized candidate, then complete the remaining iPhone state/Journey F, store, Crashlytics, and soak prerequisites.
