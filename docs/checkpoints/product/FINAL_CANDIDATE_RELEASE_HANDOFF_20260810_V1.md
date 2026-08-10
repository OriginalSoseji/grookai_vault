# Final Candidate Release Handoff Checkpoint V1

## Context

The synchronized release candidate is application source `a8ec3d2`, signed
Android build `23`, and TestFlight build `289`. Physical device execution has
already proven candidate installation and the highest-risk mutating journeys.
The remaining state-matrix work must not be blocked indefinitely by physical
device automation availability.

## Current Truths

- Release completion remains `IN_PROGRESS` at `10/14` proven gates with zero
  completion-manifest findings.
- Physical TestFlight build `289` installation, launch, read-only surfaces,
  signed-out continuation, locked-action behavior, Want Match, messaging, and
  opt-out behavior are proven.
- Signed Android build `23` matches the frozen APK hash and passed loading,
  empty, offline/error, recovery, private, signed-out, and 130% text-scale
  states.
- Production web and deterministic route-state coverage are proven supporting
  evidence.
- Physical iPhone XCUITest is currently blocked by Apple's automation service,
  not by an observed product failure. The device was restarted and requires a
  post-restart unlock before any further physical automation.
- Play Console still presents developer-account creation. No verified Google
  Play developer account or listing exists.
- The original 72-hour requirement remains an evidence requirement. Existing
  operational history may satisfy it only if candidate identity, observation
  duration, cadence, and health reconcile exactly; elapsed time alone cannot.

## Decision

Use emulators and simulators for remaining non-mutating state coverage. Preserve
the existing physical build `289` and signed build `23` evidence as proof that
the tested source and distributed artifacts are the synchronized candidate.
Do not make physical device availability a blocker for loading, empty,
offline/error, recovery, private, signed-out, or text-scale verification.

## Invariants

- Emulator or simulator evidence cannot replace immutable artifact identity or
  the already-required physical mutating-journey evidence.
- No release gate is promoted without internally consistent evidence.
- No 72-hour window is shortened, backdated, or inferred from unrelated builds.
- Existing dirty worktrees and user changes must remain untouched.
- MEE ingestion, mapping, qualification, publication, and readback must be
  reconciled independently; workflow success alone is insufficient.

## Remaining Release Gates

1. Complete any missing non-mutating iOS states on a simulator built from the
   frozen source.
2. Obtain genuine fresh-user ten-second comprehension evidence for Journey A.
3. Create or identify the intended Google Play developer account and verify the
   listing and assets.
4. Determine whether existing candidate-scoped operational evidence already
   provides a compliant 72-hour window. Otherwise start a new window only after
   all non-soak gates are proven.

## Parallel MEE Gate

Audit all current GitHub Actions and production run evidence for TCGPlayer,
eBay, mapping, qualification, publication, shared read-model exposure, and the
pricing canary. Manually run only stages that are missing or failed, preserve
all existing data, and reconcile every run from source warehouse through
rendered pricing.

## Evidence

- `docs/checkpoints/product/FINAL_CANDIDATE_ANDROID_23_STATE_MATRIX_20260810_V1.md`
- `docs/checkpoints/product/FINAL_CANDIDATE_IOS_289_JOURNEYS_AFC_20260810_V1.md`
- `docs/checkpoints/product/SYNCHRONIZED_FINAL_CANDIDATE_IOS_289_INSTALL_20260810_V1.md`
- `docs/audits/release_completion_v1/completion_manifest_v1.json`
- `docs/audits/release_completion_v1/RELEASE_COMPLETION_LEDGER_V1.md`

## Exact Next Gate

Audit and repair MEE operations from GitHub source workflows through TCGPlayer,
eBay, publication, readback, and canary evidence. In parallel, complete any
missing non-mutating iOS state coverage on the simulator.
