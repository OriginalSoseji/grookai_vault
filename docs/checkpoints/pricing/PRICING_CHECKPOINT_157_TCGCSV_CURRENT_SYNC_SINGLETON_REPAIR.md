# Pricing Checkpoint 157: TCGCSV Current-Sync Singleton Repair

## Status

`SOURCE REPAIR VERIFIED - LOCKED FULL SYNC AND NONZERO SHADOW REQUIRED`

## Incident

The assignment-lane repair shadow began its TCGCSV current sync at
`2026-10-17T06:57:21Z`. The normal scheduled production sync began at
`2026-10-17T08:15:02Z`, before the shadow warehouse phase finished at
`2026-10-17T08:47:02Z`.

Both workers updated the shared category, group, product, and observation
`last_seen_run_id` fields without a common current-sync lock. The shadow then
treated rows already stamped by the scheduled run as missing. Its summary
recorded all 86 categories, 1,939 groups, and 215,132 products as missing. The
shadow publication selected zero rows and therefore supplied no valid pricing
evidence.

The scheduled source sync later completed with all 86 categories, 4,684 groups,
512,717 products, and 557,443 price rows stamped to its run ID. Its earlier
dimension upserts could not reverse the inactive flags written later by the
overlapping shadow, leaving all 86 current categories inactive. The production
publication guard compared zero candidates with the active baseline of 166,055
eligible prices and stopped activation. No empty publication became live.

## Repair

Applying current TCGCSV syncs now acquire
`grookai:tcgcsv:current:v1` with `pg_try_advisory_lock` before source
acquisition. The same PostgreSQL session holds that lock and performs all
warehouse writes, so losing the session also loses the writer. A competing
current sync emits `skipped_worker_locked`, exits nonzero, and stops its parent
pipeline.

Before a complete full sync may mark absent rows inactive, it must prove that
its run ID still owns exactly the fetched category, group, and product counts.
Any mismatch raises `CURRENT_SYNC_OWNERSHIP_LOST` before missing-row
finalization and records the in-progress source run as terminally failed before
the lock is released. Targeted retries continue to skip global missing-row
marking.

## Verification

- Direct production diagnosis tied the two overlapping run intervals to the
  displaced dimension stamps.
- The production guard rejected the zero-row candidate set before activation.
- Focused warehouse, historical-lock, and load-safety contracts pass.
- Full repository contract suite: 7,955 passed, 0 failed, 10 skipped.

## Next Gate

Merge the exact repair commit, run one forced full current sync under the new
lock to restore active dimension state, and verify exact nonzero dimension and
observation counts. Then run a fresh exact-commit full shadow. It must select
the complete MTG and Pokemon candidate inventory and reconcile nonzero eligible
prices before the already-authorized guarded production release may resume.
