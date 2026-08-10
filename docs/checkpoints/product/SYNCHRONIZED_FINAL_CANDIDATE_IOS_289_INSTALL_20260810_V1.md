# Synchronized Final Candidate iOS 289 Install Checkpoint V1

## Context

TestFlight build `289` was distributed and approved but had not previously been
installed or executed on a physical iPhone. Earlier functional Journey C proof
came from build `288` and could not close the synchronized-candidate gate.

## Decision

Record physical installation and read-only route proof separately from the
remaining signed-out and mutating journeys. Do not reinterpret read-only launch
evidence as proof of Journey A, C, F, the state matrix, or the soak.

## Current Truths

- iPhone 17 Pro readback reports Grookai Vault `1.0.0 (289)`.
- TestFlight preflight passed `1/1`.
- Candidate app launch passed `1/1`.
- Candidate read-only route probes passed `8/8`.
- Pulse, Search, exact card detail, full card page, Account, and Messages
  rendered on the physical candidate.
- Non-sensitive card images rendered in the retained screenshots.
- The full card page showed `No pricing data available`; that observation is a
  separate pricing-truth follow-up, not silently classified as expected.
- PII-bearing screenshots and logs remain outside source control with hashes
  recorded in the audit.
- No mutating journey, public release, or soak start occurred.

## Invariants

- Build `288` remains historical functional evidence only.
- Read-only build `289` evidence does not prove Want creation, message delivery,
  opt-out cleanup, signed-out continuation, or error/offline recovery.
- No production mutation may be inferred from UI screenshots.
- The 72-hour soak remains blocked until every non-soak gate is proven.

## Evidence

- `docs/audits/release_completion_v1/device_ios/candidate_289_install_and_launch_v1/2026-08-10T02-27-05Z/REPORT.md`
- `docs/audits/release_completion_v1/device_ios/candidate_289_install_and_launch_v1/2026-08-10T02-27-05Z/summary.json`
- `docs/audits/release_completion_v1/device_ios/candidate_289_install_and_launch_v1/2026-08-10T02-27-05Z/device_apps.json`
- `docs/audits/release_completion_v1/device_ios/candidate_289_install_and_launch_v1/2026-08-10T02-27-05Z/testflight_preflight_summary.json`
- `docs/audits/release_completion_v1/device_ios/candidate_289_install_and_launch_v1/2026-08-10T02-27-05Z/candidate_app_launch_summary.json`
- `docs/audits/release_completion_v1/device_ios/candidate_289_install_and_launch_v1/2026-08-10T02-27-05Z/candidate_read_only_routes_summary.json`

## Remaining Work

1. Prove signed-out Journey A on build `289` while preserving the destination
   across authentication.
2. Prove signed-out locked-feature Journey F on build `289`.
3. Execute clean-account Journey C with governed before/after readback and
   net-zero cleanup.
4. Complete the remaining physical iPhone and Samsung state matrix.
5. Obtain genuine fresh-user comprehension evidence.
6. Establish Google Play account and listing readiness.
7. Reconcile all non-soak gates, then start a new 72-hour soak.

## Explicit Next Gate

Signed-out Journeys A and F on physical TestFlight build `289`, followed by the
governed clean-account Journey C. The soak remains blocked.
