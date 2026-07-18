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

### Targeted Current Retry

If a full current sync finishes as `partial_success` because a small number of category/group fetches failed, retry only those source groups:

```bash
node scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs \
  --mode=current \
  --apply \
  --force \
  --category-ids=3 \
  --group-ids=1543,1663 \
  --out-dir=docs/audits/market_evidence_engine_v1/tcgcsv_full_source_warehouse_v1
```

Targeted retries skip source-missing marking so unrelated catalog rows cannot be marked inactive by a partial fetch.

## Historical Archive Backfill

TCGCSV historical archives start at `2024-02-08`. Run in bounded date windows.
TCGCSV's published usage guidance requires a clear custom User-Agent, a short sleep in request loops, and fewer than `10,000` requests per 24 hours. Historical archive backfill keeps this boundary by fetching one compressed archive per date and speeding up only local extraction/database apply work.

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

## Historical Backfill Agent

After bounded manual proof, install the resumable historical backfill agent:

```bash
sudo bash deploy/scripts/install-tcgcsv-historical-backfill-systemd.sh
```

The agent:

- processes one archive date per worker invocation;
- resumes from `/var/lib/grookai/tcgcsv-historical-backfill.next-date`;
- stops cleanly when `/var/lib/grookai/tcgcsv-historical-backfill.stop` exists;
- pauses during the normal pricing window (`00:50-10:30 UTC`) so it does not compete with reference refresh, eBay/MEE, or current TCGCSV sync;
- uses conservative larger database batches for historical rows so retries treat already-identical rows as no-ops instead of rewriting them;
- removes derived extracted archive folders after each successful day while preserving compressed source archives, summaries, DB row provenance, hashes, and byte-size metadata.

Monitor:

```bash
systemctl status grookai-tcgcsv-historical-backfill.service --no-pager
journalctl -u grookai-tcgcsv-historical-backfill.service -f
cat /var/lib/grookai/tcgcsv-historical-backfill.next-date
```

Pause:

```bash
sudo touch /var/lib/grookai/tcgcsv-historical-backfill.stop
```

Resume:

```bash
sudo rm -f /var/lib/grookai/tcgcsv-historical-backfill.stop
sudo systemctl restart grookai-tcgcsv-historical-backfill.service
```

## Deployment

Do not enable a systemd timer until:

1. migration applies cleanly;
2. local dry-run succeeds;
3. manual current apply succeeds;
4. at least one historical date-window apply succeeds;
5. latest status readback confirms no public pricing writes.

Install the current-sync timer after manual proof:

```bash
sudo bash deploy/scripts/install-tcgcsv-warehouse-systemd.sh
```

The timer runs `grookai-tcgcsv-warehouse.service` daily at `08:15 UTC` with a randomized delay. It is intentionally scheduled after the eBay/MEE window to avoid memory and network contention.

Historical archive backfills remain manual bounded jobs; do not wire historical archive backfill to systemd.

## Rollback

Disable the timer and stop running the worker. The warehouse is isolated, service-role-only, and not consumed by public pricing.
