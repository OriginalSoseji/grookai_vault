# Signed-Out Authentication Root-Swap Repair 20260807 V1

## Context

Pull-request review found that a signed-out exact-card mutation could be lost when successful authentication replaced the application root. Review also found a native-only OAuth redirect on web and a pushed general login route that could remain visible after authentication.

## Decision

Preserve one explicit card action in an in-memory coordinator, bind it to exact card identity, promote it to canonical navigation only after valid authentication, and consume it only on the matching authenticated card. Use the configured web origin for web OAuth and remove stale public/login routes after root replacement.

## Proof

- Repair commit: `21add8fb8b62808124b57329a28ec922d84a0902`
- Branch: `release/final-journey-proof-v1`
- Physical device: Samsung Galaxy S22 Ultra
- Exact card: `GV-PK-MEW-025`, Pikachu, 151 #025, Normal
- Root replacement: passed
- Exact pending action resume: passed
- Disposable-copy reconciliation: `1 created / 1 removed / 0 net`
- Full repository shipcheck: passed
- Flutter tests: `577/577`

Permanent evidence:

`docs/audits/release_completion_v1/device_android/signed_out_card_exploration_root_swap_repair_v1/2026-08-07T09-21-12/`

## Invariants

- A pending mutation is in-memory, exact-card scoped, and single-consumption.
- Failed or canceled authentication cannot execute the mutation.
- Successful authentication cannot lose card or printing identity.
- A stale request cannot clear or execute a newer request.
- Web OAuth cannot redirect to the native custom scheme.
- The authenticated root cannot leave a stale sign-in screen above it.

## Current Truths

- The three pull-request review findings are repaired in source and verified locally.
- Android physical-device proof is complete for the root-swap defect.
- The release remains incomplete until final-candidate iPhone/TestFlight, distribution, operations, Android App Link authority, and 72-hour soak gates are proven.

## Explicit Next Gate

Merge the repaired release branch through normal policy, verify the exact deployed web SHA, cut immutable Android and iOS candidates, and execute the remaining release manifest against those exact builds.
