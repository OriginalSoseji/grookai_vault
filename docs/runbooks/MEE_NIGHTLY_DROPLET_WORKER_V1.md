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

Fill `SUPABASE_SECRET_KEY` and `SUPABASE_ACCESS_TOKEN`.

Fill either:

- `EBAY_BROWSE_ACCESS_TOKEN`, or
- `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET`

Preferred installer:

```bash
sudo bash deploy/scripts/install-mee-nightly-systemd.sh
```

The worker uses the Supabase CLI for internal readback/apply guards. A global `supabase`
binary is allowed but not required; the worker falls back to `npx --yes supabase`.

## Dry Run

```bash
node scripts/workers/mee_nightly_droplet_worker_v1.mjs --dry-run
```

Dry run may create local audit artifacts. It does not request provider acquisition or apply remote writes.

## Manual Run

```bash
MEE_NIGHTLY_ALLOW_RUN=1 node scripts/workers/mee_nightly_droplet_worker_v1.mjs --run --call-ceiling=4000
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
- no failed phase

## Stop

```bash
sudo systemctl stop grookai-mee-nightly.timer
sudo systemctl stop grookai-mee-nightly.service
```

## Recovery

If a phase fails, do not rerun blindly. Read the JSON audit artifact, identify the failed phase, then run dry-run mode before a manual `--run`.
