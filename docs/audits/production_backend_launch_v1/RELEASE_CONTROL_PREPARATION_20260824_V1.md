# Production Backend Release-Control Preparation V1

**Observed:** 2026-08-24

**Status:** implementation and offline verification passed; live gates remain
blocked

## Changes

- Added immutable source-commit and build-run provenance to governed Android
  GitHub Actions and iOS Xcode Cloud builds.
- Added Crashlytics build provenance keys without user data.
- Added a fail-closed same-candidate web, Android, and iOS journey evaluator.
- Added a fail-closed final-candidate prerequisite, migration, workload, and
  rollback evaluator.
- Added example manifests that deliberately remain blocked until live evidence
  replaces their placeholders.
- Added nonproduction restore, same-candidate client, final deployment and
  rollback, and 72-hour canary runbooks.
- Updated the production launch matrix and current checkpoint without claiming
  a candidate, restore, canary, or launch pass.

## Verification

- Focused release contracts: `27 / 27` passed.
- Same-candidate and final-candidate contracts: `10 / 10` passed.
- Full repository contracts: `2,410 / 2,410` passed.
- Full Flutter non-golden tests: `616 / 616` passed.
- Targeted Flutter analysis: passed.
- Node syntax checks: passed.
- Xcode Cloud shell syntax through Git Bash: passed.
- JSON parsing and permanent artifact hash verification: passed before final
  commit.
- `git diff --check`: passed.

The first full contract run preserved one expected contract failure after the
Xcode Cloud command gained provenance arguments. The existing bootstrap
contract was tightened to require those arguments; the complete rerun passed.

## Current Blockers

1. Managed database disk is 72.33 percent utilized and lacks 2x 90-day growth
   headroom.
2. Object Storage's current 31.84 percent utilization passes, but its
   burst-sensitive 90-day and 2x-headroom projections do not.
3. Current billing-cycle cached and uncached egress bytes are not captured.
4. No isolated nonproduction restore has been executed.
5. No new synchronized web, signed Android, and TestFlight iOS candidate has
   completed the client gate.
6. The final candidate has not been deployed or rollback-tested.
7. The 72-hour canary has not started.

## Boundaries

No database, Storage, canonical, pricing, Vault, Auth, RLS, grant, deployment,
worker schedule, paid-plan, PITR, or public-rollout change occurred.
