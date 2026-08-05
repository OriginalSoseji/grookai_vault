# Pricing Checkpoint 44: Waiting for Terminal Canary

## Status

Paused intentionally for elapsed operational evidence.

The Flutter pricing candidate, Samsung device proof, operator handoff, and
post-canary execution packet are complete. No further pricing release action
is authorized until the active replacement canary reaches its terminal
observer gate.

## Resume Time

| Milestone | UTC | America/Denver |
| --- | --- | --- |
| 72-hour window ends | `2026-08-08T07:51:54.064Z` | Aug 8, 1:51 AM MDT |
| 8-hour completion grace ends | `2026-08-08T15:51:54.064Z` | Aug 8, 9:51 AM MDT |
| First scheduled observer after grace | `2026-08-08T18:17:00Z` | Aug 8, 12:17 PM MDT |

Do not treat the nominal 72-hour timestamp as terminal. The workflow adds
`--require-pass` only after completion grace ends.

## Frozen References

| Reference | Value |
| --- | --- |
| Runtime commit under observation | `6b729441bf8944048885ade5d9905e23166d9d46` |
| Canary definition | `TCGPLAYER_MARKET_CANARY_100_V2` |
| Definition SHA-256 | `861b9dd97baaa0c93a6bcdd94c5f9ef903388bbc87a31923cfee3fbeb8cfc3d2` |
| Activation run ID | `3c1be9e1-de61-4459-9110-890fd7cc9210` |
| Activation key | `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-05-REPAIR1` |
| Expected identities | `100` |
| Current exact rows | `99` |
| Allowed source-missing | `5` |
| Flutter candidate PR | `https://github.com/OriginalSoseji/grookai_vault/pull/180` |
| Current candidate head | `0c43c550b3d569c3e31349a0580a91c01d80b16e` |
| Producing Flutter code commit | `725aa1fc1d320a4c2a4e3702c4c0a147249f2403` |

PR 180 is draft, clean, mergeable, and fully checked. Keep it unmerged until
the terminal observer passes.

## Current Evidence

- First unattended replacement cycle: success.
- Selected / eligible / current exact rows: `99 / 99 / 99`.
- Explicit source-missing rows: `1`, within the maximum of `5`.
- Missing provenance, stale prices, and broken traces: `0 / 0 / 0`.
- Authenticated governed reads: `99`.
- Anonymous execution: denied with PostgreSQL code `42501`.
- Rollback: available.
- Database migrations applied by Flutter readiness work: none.
- Production client deployments from PR 180: none.
- TestFlight uploads from PR 180: none.

## Resume Procedure

1. Open the `TCGPlayer Market Canary Observation` workflow.
2. Use the first scheduled run after `2026-08-08T15:51:54.064Z`, expected at
   `2026-08-08T18:17:00Z`, or manually dispatch once after grace ends.
3. Require workflow conclusion `success` and downloaded summary status
   `passed`, not merely `observing`.
4. Preserve the workflow URL, artifact, summary, evidence, run plan, and
   hashes under the permanent pricing audit tree.
5. Require all expected August 5, 6, and 7 daily pricing slots to be matched,
   with no missing, unhealthy, unmatched, or duplicate run keys.
6. Require no terminal alerts, stale rows, missing provenance, or broken
   traces; authenticated access must work, anonymous access must remain
   denied, and rollback must remain available.
7. If every condition passes, mark PR 180 ready and freeze the exact
   integration SHA from current `main`.
8. Follow the post-canary sequence in:
   `docs/audits/pricing/mee_pricing_platform_production_v1/flutter_device_readiness_20260805/IOS_TESTFLIGHT_EXECUTION_PACKET.md`.

## Post-Pass Order

1. Integrate PR 180 from a clean current-main candidate.
2. Record the exact integration SHA and clean worktree.
3. Run the strict linked migration preflight for only `20260728130000` and
   `20260728133000`.
4. Rerun all contracts, web checks, Flutter analysis/tests, surface contracts,
   and release secret packaging checks.
5. Apply exactly those two migrations without `--include-all`.
6. Verify migration ledger, empty linked drift, schema, functions, grants,
   RLS, signed-in reads, anonymous denial, exact Vault pricing, provenance,
   and rollback.
7. Rebuild Android and iOS from the exact integration SHA.
8. Prove actual governed prices and negative states across all registered web
   and Flutter surfaces.
9. Upload the exact-SHA iOS archive and dSYMs to a bounded signed-in TestFlight
   canary.
10. Keep anonymous pricing disabled and begin the seven unattended
    full-production cycles only after the bounded rollout passes.

## Stop Conditions

Stop without migration or deployment if:

- the terminal observer is `observing`, `failed`, or missing its artifact;
- an August 5, 6, or 7 scheduled slot is missing or unhealthy;
- selected/current rows fall outside the source-missing policy;
- provenance, freshness, trace, access, or rollback checks fail;
- the runtime commit, canary definition hash, or activation changes;
- PR 180 is no longer clean or contains unrelated work;
- migration hashes or expected local-only IDs change;
- anonymous pricing is readable.

## What Not to Do While Waiting

- Do not run the strict linked migration preflight early.
- Do not apply either pending migration.
- Do not merge PR 180.
- Do not deploy the Flutter candidate.
- Do not upload TestFlight.
- Do not manually rerun observers before grace ends merely to check status.
- Do not broaden pricing scope or enable anonymous pricing.

## Resume Prompt

Use this instruction when returning:

> Resume Pricing Checkpoint 44. Verify the first terminal TCGPlayer Market
> Canary Observation after `2026-08-08T15:51:54.064Z`. If and only if it
> passes every checkpoint condition, preserve its evidence and execute the
> frozen post-canary release sequence. Stop on any mismatch without applying
> migrations or deploying clients.
