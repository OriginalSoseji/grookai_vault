# MEE Nightly Droplet Worker V1 Runbook

## Install

```bash
cd /opt/grookai_vault_mee_nightly
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
The systemd unit sets `MEE_NIGHTLY_REQUIRE_DIRECT_DB=1`, so scheduled runs fail
fast if no direct database URL is available instead of falling back to
`supabase db query --linked`.

The systemd service must run as `grookai` from `/opt/grookai_vault_mee_nightly`
and must use `/usr/bin/flock -n /tmp/grookai-mee-nightly.lock`. Do not run this
worker from the stale `/opt/grookai_vault` checkout or as root.

JustTCG refresh units are retired. They must remain disabled/masked and are not
part of the nightly pricing path.

Root-only retirement/install step on the droplet:

```bash
cd /opt/grookai_vault_mee_nightly
sudo systemctl disable --now grookai-justtcg-refresh.timer grookai-justtcg-refresh.service \
  grookai-pricing-refresh.timer grookai-pricing-refresh.service grookai-mee-post-ingest.timer || true
for unit in grookai-justtcg-refresh.timer grookai-justtcg-refresh.service \
  grookai-pricing-refresh.timer grookai-pricing-refresh.service; do
  sudo rm -f "/etc/systemd/system/${unit}"
  sudo ln -s /dev/null "/etc/systemd/system/${unit}"
done
sudo bash deploy/scripts/install-mee-nightly-systemd.sh
sudo systemctl reset-failed grookai-justtcg-refresh.service grookai-mee-nightly.service || true
```

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
cd /opt/grookai_vault_mee_nightly
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

If a Supabase readback query is still running more than 30 minutes after the
worker has stopped, treat it as an orphaned process and kill it before rerunning
the timer. The nightly service, reference refresh service, and post-ingest
service must not overlap.
