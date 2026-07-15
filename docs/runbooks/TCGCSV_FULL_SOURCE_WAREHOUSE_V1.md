# TCGCSV Full Source Warehouse V1 Runbook

## Boundary

This worker mirrors TCGCSV into private source warehouse tables only. It must not publish prices or mutate Grookai identity, vault, image, or app-facing pricing tables.

## Local Current Sync Smoke

```bash
node scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs \
  --mode=current \
  --dry-run \
  --limit-categories=1 \
  --limit-groups=1 \
  --out-dir=.tmp/tcgcsv_full_source_warehouse_smoke
```

Expected:

- `apply=false`
- no database writes
- summary artifact under `.tmp/`
- request count below the provided ceiling

## Full Current Sync

Dry-run first:

```bash
npm run tcgcsv:warehouse:current:dry-run -- --out-dir=.tmp/tcgcsv_full_source_warehouse_current
```

Apply only after dry-run review:

```bash
npm run tcgcsv:warehouse:current:apply -- --out-dir=docs/audits/market_evidence_engine_v1/tcgcsv_full_source_warehouse_v1
```

Use `--force` / `--ignore-last-updated` only when the prior run was incomplete, parser logic changed, or the operator intentionally wants to refresh despite an unchanged `last-updated.txt`.

## Historical Archive Backfill

TCGCSV historical archives start at `2024-02-08`. Run in bounded date windows.

Dry-run one day:

```bash
npm run tcgcsv:warehouse:historical:dry-run -- --date=2024-02-08 --out-dir=.tmp/tcgcsv_full_source_warehouse_history
```

Apply a bounded window:

```bash
npm run tcgcsv:warehouse:historical:apply -- --date-from=2024-02-08 --date-to=2024-02-14 --out-dir=docs/audits/market_evidence_engine_v1/tcgcsv_full_source_warehouse_v1
```

Requirements:

- 7zip installed as `7z`, `7za`, or `7zz`.
- request ceiling remains at or below `10,000`.
- failed dates produce `partial_success`, not `completed`.

## Deployment

Do not enable a systemd timer until:

1. migration applies cleanly;
2. local dry-run succeeds;
3. manual current apply succeeds;
4. at least one historical date-window apply succeeds;
5. latest status readback confirms no public pricing writes.

Timer should be installed disabled first. Enable only after explicit cutover approval.

## Rollback

Disable the timer and stop running the worker. The warehouse is isolated, service-role-only, and not consumed by public pricing.
