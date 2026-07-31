# Verification Results

## Run-Producing Commit

- branch: `pricing/mee-productization-v1`
- commit:
  `c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d`
- remote branch resolved to the same SHA before this evidence-only audit commit

## Local Verification

Executed from the clean implementation worktree on July 28, 2026:

```text
node --check backend/pricing/tcgplayer_market_health_policy_v1.mjs
node --check scripts/workers/tcgplayer_market_health_v1.mjs
node --check scripts/ops/grookai_operations_webhook_v1.mjs
```

Result: all syntax checks passed.

```text
node --test \
  tests/contracts/tcgplayer_market_publication_v1.test.mjs \
  tests/contracts/pricing_operations_webhook_v1.test.mjs
```

Result:

```text
tests 38
pass 38
fail 0
cancelled 0
skipped 0
todo 0
```

Additional integrity results:

- all JSON evidence parsed successfully
- all recorded SHA-256 artifact hashes recomputed successfully
- secret-shaped value scan found no credential material
- `git diff --check` passed

## GitHub Verification

The exact run-producing SHA passed both required GitHub workflows:

- Contracts Runtime Protection:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/30343172900`
- Contracts Drift Gate:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/30343172815`

The repository shipcheck associated with the run-producing commit also passed,
including contracts, web typecheck/lint/build, Flutter analyze, and Flutter
tests.

## Production Verification

- linked migration apply: passed
- production schema/security readback: passed
- Edge Function status/auth readback: passed
- unauthorized operations webhook request: HTTP `401`
- production smoke alert delivery: passed
- actual systemd failure alert delivery: passed
- guarded systemd installation verification:
  `TCGPLAYER_MARKET_OPS_READY`
- repaired scheduled run: completed in one attempt
- publication reconciliation mismatches: `0`
- exact current prices: `100`
- snapshots with complete trace: `100 / 100`
- signed-in shared read rows: `99`
- anonymous shared read: denied with code `42501`
