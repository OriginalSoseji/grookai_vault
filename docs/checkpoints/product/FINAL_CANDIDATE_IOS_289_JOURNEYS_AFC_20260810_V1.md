# Final Candidate iOS 289 Journeys A, C, and F Checkpoint V1

## Context

Build `289` was installed and launch-proven, but the release manifest still
required synchronized-candidate signed-out continuation, locked-feature, and
clean-account Want Match evidence. Build `288` remained historical only.

## Decision

Accept the captured product states for signed-out Journeys A/F despite the raw
harness's post-success terminal assertion. Accept Journey C only through the
dedicated read-only verifier, which passed every exact-card, owner/source,
message, opt-out, stale-match, Pulse, notification, and event-emission check.

## Current Truths

- Physical TestFlight build `289` explored and opened `GV-PK-CEC-214` while
  signed out.
- Want produced an action-specific sign-in explanation and preserved the exact
  card destination through authentication.
- The app created a disposable public profile and enabled local discovery.
- The scheduled engine created one exact Want Match.
- Pulse showed the exact card, Poke Javi, same-region/trade context, and set
  number.
- Exactly one card-centered message was sent.
- Want was disabled through product UI.
- Final current Want is false.
- The historical match is stale with `canonical_want_removed` and absent from
  Pulse.
- The authoritative Journey C verifier passed with zero findings.

## Risk And Resolution

The combined A/F raw XCUITest ended failed after product success because its
terminal assertion expected a global Account control while the restored exact
card surface was active. The required product states are independently retained
in screenshots, and the subsequent clean-account database chain proves the
authenticated continuation. Repeating the test would have duplicated a
production mutation, so it was not rerun.

## Invariants

- Build `288` remains historical evidence only.
- Raw credentials, personal identifiers, private logs, and message contents do
  not enter source control.
- The historical match and message are not deleted to manufacture net-zero
  evidence.
- The current Want must remain false.
- Journey A cannot become proven until genuine fresh-human comprehension is
  recorded.
- The soak cannot start while any other non-soak gate remains partial or open.

## Evidence

- `docs/audits/release_completion_v1/device_ios/candidate_289_journeys_afc_v1/2026-08-10T04-56-05Z/REPORT.md`
- `docs/audits/release_completion_v1/device_ios/candidate_289_journeys_afc_v1/2026-08-10T04-56-05Z/signed_out_af_summary.json`
- `docs/audits/release_completion_v1/device_ios/candidate_289_journeys_afc_v1/2026-08-10T04-56-05Z/WANT_MATCH_REPORT.md`
- `docs/audits/release_completion_v1/device_ios/candidate_289_journeys_afc_v1/2026-08-10T04-56-05Z/want_match_summary.json`
- `docs/audits/release_completion_v1/device_ios/candidate_289_journeys_afc_v1/2026-08-10T04-56-05Z/private_evidence_hashes.json`
- `docs/audits/release_completion_v1/device_ios/candidate_289_journeys_afc_v1/2026-08-10T04-56-05Z/artifact_hashes.json`

## Gate Effect

- Journey A: `partial` (device path proven; fresh-human comprehension open)
- Journey C: `proven`
- Journey F: `proven`
- Overall release: `IN_PROGRESS`

## Explicit Next Gate

Complete the synchronized-candidate cross-platform state matrix and Google Play
account/listing readiness in parallel, while collecting genuine fresh-user
ten-second comprehension evidence. Reconcile all non-soak gates before creating
a new, non-backdated 72-hour soak.
