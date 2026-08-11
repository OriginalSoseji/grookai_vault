# Final Candidate iOS Simulator State Matrix - 2026-08-10 V1

## Status

`IOS FUNCTIONAL STATE MATRIX PROVEN / RELEASE 11 OF 14`

## Context

Physical TestFlight build `289` already proved installation, frozen-candidate
identity, signed-out continuation, Want Match, messaging, opt-out, and the
high-risk Journeys A, C, and F. The August 10 handoff authorized an exact-source
iOS simulator for the remaining non-mutating product states so physical-device
availability would not block deterministic release evidence.

## Decision

Promote `cross_platform_state_matrix` from `partial` to `proven`.

Frozen source `a8ec3d27808fd100cbb8e544032ee479e9632f24` passed signed-out,
loading, empty, deterministic offline/error, recovery, private authenticated,
accessibility-medium text, and sign-out restoration assertions on an iPhone 17
Pro simulator running iOS 26.5.

This promotion combines the simulator's non-mutating functional evidence with
the already-proven physical TestFlight build 289 artifact and journey evidence.
It does not claim that the simulator binary is the App Store IPA.

## Current Truths

- Final state assertions: `8/8 PASS`.
- TestFlight candidate remains `1.0.0 (289)`.
- Simulator app source exactly matches candidate source `a8ec3d2`.
- The online Runner was restored after deterministic offline testing and its
  SHA-256 matched the preserved online build.
- The content-size category was restored to `default`.
- The disposable auth session was removed from both app-local and simulator
  preference domains.
- No Vault, pricing, messaging, publication, or other application data was
  written.
- The initial empty-state fixture was unsuitable; the empty assertion alone
  passed with a verified impossible query and no code change.

## Invariants

- Candidate identity remains frozen to `a8ec3d2`.
- Simulator evidence cannot replace store artifact provenance.
- Failed fixture evidence is classified, not erased or represented as a
  product defect.
- Authentication material and raw failed credential experiments remain out of
  source control.
- No release gate is promoted without exact evidence.

## Evidence

- `docs/audits/release_completion_v1/device_ios/candidate_289_simulator_state_matrix_v1/2026-08-10T23-15-21Z/REPORT.md`
- `docs/audits/release_completion_v1/device_ios/candidate_289_simulator_state_matrix_v1/2026-08-10T23-15-21Z/state_assertions.json`
- `docs/audits/release_completion_v1/device_ios/candidate_289_simulator_state_matrix_v1/2026-08-10T23-15-21Z/cleanup_readback.json`

## Remaining Release Gates

1. Genuine fresh-user ten-second comprehension.
2. Google Play developer-account and listing authority.
3. A new, non-backdated 72-hour application soak after both prerequisite gates
   pass, followed by the final production report.

## Exact Next Gate

Collect genuine fresh-user comprehension evidence and establish Google Play
account/listing readback. Do not start or backdate the final soak until both
are proven.
