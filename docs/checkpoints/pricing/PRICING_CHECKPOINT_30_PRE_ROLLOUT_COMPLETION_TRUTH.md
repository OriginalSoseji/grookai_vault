# Pricing Checkpoint 30: Pre-Rollout Completion Truth

## Context

The authenticated 100-printing canary is frozen at commit
`c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d` through
`2026-07-31T08:40:15.793Z`.

While that production observation continues, the implementation branch added
exact-printing Vault pricing and the private owner-filtered pricing-target
boundary. Those changes are committed, tested, and pushed, but intentionally
not deployed because replacing the producing commit would invalidate the
72-hour canary.

## Problem

The Production V1 completion state still marked both of these requirements as
passed:

- production schema and migration parity
- all supported surfaces consuming the shared interface

Those claims were true for the earlier deployed pricing scope, but no longer
described the complete repository state after the exact-Vault migration and
client changes were added.

A completion matrix that treats committed code as deployed production evidence
can allow a technically correct implementation to hide an unfinished rollout
boundary.

## Risk

- A local migration could be mistaken for a production-applied migration.
- Repository-complete clients could be mistaken for verified rendered
  production surfaces.
- The final completion count could advance without schema, ACL, authenticated
  read, anonymous denial, or source-to-render proof.
- A future maintainer could deploy during the frozen canary to make the report
  look complete, destroying the existing time-gate evidence.

## Decision

Completion evidence distinguishes repository readiness from production
verification.

Until the post-canary rollout is deployed and read back:

- `production_schema_migration_parity` is `pending`.
- `all_supported_surfaces_shared_interface` is `pending`.
- the exact-Vault implementation remains repository-ready, not
  production-verified.

Contract coverage now locks this state so the completion report cannot silently
return those rows to `passed` without an explicit evidence update.

## Alternatives Rejected

### Keep the prior `23/30` count

Rejected because it overclaimed deployment state after a new production
migration and client integration were committed.

### Deploy exact-Vault changes immediately

Rejected because changing the production commit before the frozen 72-hour
window completes would invalidate the canary.

### Treat local smoke output as production parity

Rejected because local migration, ACL, RLS, and application proof cannot
replace production schema and runtime readback.

## Current Read-Only Evidence

### Coverage

Command:

```text
npm run pricing:market:coverage
```

Artifact:

```text
artifacts/market_pricing_product_v1/coverage/2026-07-28T14-02-28-395Z/summary.json
```

SHA-256:

```text
d29be42532f320bbeb53bf8baea31857111379fa7a4f23c80079e367142abe0f
```

Results:

- policy: `TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2`
- denominator rows: `32,676`
- numerator rows: `31,123`
- coverage: `95.247%`
- gap rows: `1,553`
- unclassified gap rows: `0`
- coverage threshold status: `passed`
- current publication scope status: `failed`

The overall audit remains failed only because the frozen canary publication
still contains the earlier scope. It does not authorize full-scope activation.

### Read Performance

Command:

```text
npm run pricing:market:performance
```

Artifact:

```text
artifacts/market_pricing_product_v1/read_performance/2026-07-28T14-02-44-892Z/summary.json
```

SHA-256:

```text
d62f4d852e020cb1547399bc091eed9c005d9cb3b4c51d4c4b1ed9232d32fc8e
```

Results:

- status: `passed`
- cases: `6`
- measurements: `180`
- request errors: `0`
- row-count mismatches: `0`
- required p95: `<= 500 ms`
- highest measured p95: `242.734 ms`

### Completion Matrix

Command:

```text
npm run pricing:market:completion
```

Artifact:

```text
artifacts/market_pricing_product_v1/production_completion/2026-07-28T14-05-58-706Z/summary.json
```

SHA-256:

```text
367ecb77afcbb34cc7163cadb076bcccca413feba26ddf0a45657e2ad122fcfb
```

Results:

- represented requirements: `30/30`
- passed: `21`
- pending: `8`
- external blockers: `1`
- findings: `0`
- completion allowed: `false`

## Current Truths

- The implementation branch is `pricing/mee-productization-v1`.
- Exact-printing Vault code, migration, tests, and local smoke proof exist.
- Migration `20260728133000_vault_exact_market_pricing_targets_v1.sql` is not
  deployed.
- Production remains frozen on the verified 100-printing canary.
- Candidate V1.2 mapping coverage is above the required threshold.
- Every current denominator gap has a deterministic top-level reason.
- Read-model performance is within the Production V1 target.
- Anonymous pricing access remains denied.
- Public licensing, attribution, and display authority remain unconfirmed.

## Invariants

1. Committed code is not production proof.
2. A locally replayed migration is not production schema parity.
3. A client integration is not complete until the deployed surface is
   source-to-render verified.
4. The frozen canary producing commit cannot change before its time gate ends.
5. Coverage success does not override a current-publication scope mismatch.
6. Anonymous reads remain denied until technical rollout and external
   licensing gates pass.

## Exact Next Gate

Continue read-only observation of the frozen canary.

At or after `2026-07-31T08:40:15.793Z`:

1. require the 72-hour observer to pass
2. deploy the exact clean rollout commit
3. apply and read back the exact-Vault migration and ACL/RLS boundary
4. run a fresh full V1.2 shadow
5. require coverage and deterministic-gap reconciliation
6. activate the complete eligible signed-in publication
7. verify web and Flutter exact-Vault source-to-render behavior
8. observe seven unattended full-scope daily cycles

Do not enable anonymous pricing reads at this gate.
