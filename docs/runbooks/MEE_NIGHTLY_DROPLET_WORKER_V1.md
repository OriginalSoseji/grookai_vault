# MEE Nightly Droplet Worker V1 Runbook

## Install

```bash
cd /opt/grookai_vault
npm ci
supabase --version
node --version
```

Create `/etc/grookai/mee-nightly.env` from:

```bash
deploy/env/mee-nightly.env.example
```

Fill `SUPABASE_SECRET_KEY` and `SUPABASE_DB_URL`.

Fill either:

- `EBAY_BROWSE_ACCESS_TOKEN`, or
- `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET`

Leave `MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=0` when you are out of provider calls.
Use `MEE_NIGHTLY_NORMALIZATION_ONLY=1` or `--normalization-only` to reprocess existing warehouse rows without acquisition.

Optional:

- `MEE_NIGHTLY_REFERENCE_LIMIT`, default `5000`, caps the nightly TCGCSV reference target batch.

The nightly worker refreshes TCGCSV alongside the eBay listing ingest when provider calls are enabled. TCGCSV rows are written only through the guarded reference evidence path; they do not publish prices, update app-visible pricing, or write `pricing_observations`.

Preferred installer:

```bash
sudo bash deploy/scripts/install-mee-nightly-systemd.sh
```

The worker uses `SUPABASE_DB_URL` for internal readback/apply guards.
The Supabase CLI is not required for the droplet runtime.

## Dry Run

```bash
node scripts/workers/mee_nightly_droplet_worker_v1.mjs --dry-run
```

Dry run may create local audit artifacts. It does not request provider acquisition or apply remote writes.

## Manual Run

```bash
MEE_NIGHTLY_ALLOW_RUN=1 node scripts/workers/mee_nightly_droplet_worker_v1.mjs --run --call-ceiling=4000
```

Provider acquisition run:

```bash
MEE_NIGHTLY_ALLOW_RUN=1 MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1 node scripts/workers/mee_nightly_droplet_worker_v1.mjs --run --call-ceiling=4000
```

Provider acquisition with an explicit TCGCSV reference cap:

```bash
MEE_NIGHTLY_ALLOW_RUN=1 MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1 node scripts/workers/mee_nightly_droplet_worker_v1.mjs --run --call-ceiling=4000 --reference-limit=5000
```

No-call normalization-only run:

```bash
MEE_NIGHTLY_ALLOW_RUN=1 node scripts/workers/mee_nightly_droplet_worker_v1.mjs --run --normalization-only --call-ceiling=1
```

## Schedule

Preferred:

```bash
sudo bash deploy/scripts/install-mee-nightly-systemd.sh
```

Fallback cron:

```bash
crontab deploy/cron/grookai-mee-nightly.cron
```

## Morning Check

Preferred:

```bash
cd /opt/grookai_vault
bash deploy/scripts/verify-mee-nightly-systemd.sh
```

Inspect the newest artifacts:

```bash
ls -lt docs/audits/market_evidence_engine_v1/mee_nightly_droplet_worker_v1_*.md | head
```

The final report must show:

- no public pricing writes
- no app-visible pricing
- no `pricing_observations` writes
- no `ebay_active_prices_latest` writes
- TCGCSV evidence, if refreshed, stayed in the reference warehouse path
- no failed phase

## Stop

```bash
sudo systemctl stop grookai-mee-nightly.timer
sudo systemctl stop grookai-mee-nightly.service
```

## Recovery

If a phase fails, do not rerun blindly. Read the JSON audit artifact, identify the failed phase, then run dry-run mode before a manual `--run`.
