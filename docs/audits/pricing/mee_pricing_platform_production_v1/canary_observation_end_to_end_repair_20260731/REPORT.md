# TCGPlayer Market Canary Observation End-to-End Repair

## Result

The recurring canary observation incident was repaired end to end on July 31,
2026. The prior 72-hour window is invalid. A replacement V2 canary is active
and observing from `2026-07-31T10:34:15.670Z` through the earliest terminal
time `2026-08-03T10:34:15.670Z`.

## Failure Chain

1. GitHub Actions run `30619343064` incorrectly declared the 08:15 UTC slot
   missing at 09:17 UTC while source acquisition was still running.
2. The real scheduled pipeline later failed because TCGPlayer product `168245`
   no longer exposed the canary's `Normal` subtype in the current feed.
3. The scheduled runner retried the deterministic error three times because
   stack location `errors:538:14` matched a bare three-digit HTTP retry rule.

## Repair

- Observer policy V2 uses exact source and publication run keys.
- Source trigger tolerance is 90 minutes and publication completion grace is
  480 minutes.
- Canary V2 replaces only Alolan Ninetales `Normal` with its already
  shadow-verified current `Holofoil` printing.
- Timer activation now requires a read-only `100/100` current-source
  continuity preflight.
- Canary definition drift is non-retryable, and HTTP 5xx matching requires
  HTTP/status context.
- The GitHub wrapper allows the final slot to remain `observing` through the
  completion grace before requiring a terminal pass.

## Replacement Proof

- Production commit: `416c4691d1c1d6be8a1461c148deebe627e813f8`
- Run key: `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-31-REPAIR3`
- Publication run ID: `0c23045d-8141-4b9c-ba41-2f8c44522921`
- Publication set ID: `78bbabbb-3968-4ad1-81db-00d4417cfcc4`
- Selected / eligible / snapshotted / traced: `100 / 100 / 100 / 100`
- Required phases: `5/5`
- Health: `healthy`
- Reconciliation mismatches: `0`
- Broken traces: `0`
- Outer attempt count: `1`

Final wrapper proof is GitHub Actions run `30626600755`. It completed
successfully with observer status `observing`, policy V2, zero findings, 100
positive current exact prices, authenticated read count 100, anonymous access
denied, and zero artifact hash mismatches.

## Boundaries

No migration, canonical identity write, Vault write, modeled-value write,
anonymous publication, or post-canary rollout occurred during this repair.

## Next Gate

Allow the timer and observer to run without runtime or configuration changes.
The first observer that is required to pass runs only after the 72-hour window
and final-slot completion grace. Do not apply post-canary migrations until an
observer artifact reports `status: passed` with zero findings.
