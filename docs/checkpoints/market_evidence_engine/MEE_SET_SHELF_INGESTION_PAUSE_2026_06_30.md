# MEE Set-Shelf Ingestion Pause Checkpoint - 2026-06-30

## Why This Checkpoint Exists

We paused Market Evidence Engine work after completing the first broadened set-shelf eBay acquisition pass and scaling the ingestion pipeline enough to process it safely.

The goal was not to publish prices. The goal was to broaden acquisition, warehouse broadly, classify continuously, and keep public pricing gated.

## Current Branch And Commit

- Branch: `codex/reference-anchored-pricing-compat-view`
- Latest pushed commit: `bbf98fa9 fix: scale market listing nightly ingestion`
- Previous related commits:
  - `6f2511bf fix: allow nightly planner to use supabase db url`
  - `2bd8067c feat: prioritize set shelf market acquisition`
  - `535acbdf fix: retarget active listing evidence from exact titles`
  - `e4f774df fix pricing bridge review gate leak`

## What Completed

The scheduled morning run failed before useful provider calls or warehouse writes, so a manual broad ingestion pass was run.

Manual run result:

- eBay Browse API calls consumed: `4,000`
- Projected listing observations fetched: `374,530`
- Unique warehouse observations stored: `353,461`
- Price events stored: `353,461`
- Raw-single evidence signals: `302,153`
- Slab evidence signals: `25,767`
- Excluded or ambiguous evidence signals: `25,541`
- Review-only card candidates inserted: `257,939`
- Internal rollups inserted from candidate pass: `15,632`
- Strict-filtered candidate rows evaluated: `480,820`
- Strict-title-passing candidates: `351,470`
- Strict-title-excluded candidates: `129,350`
- Strict-filtered internal rollups inserted: `17,399`
- Strict-filtered review-ready rollups: `11,059`
- Strict-filtered needs-more-evidence rollups: `6,340`

Final readback passed with no findings.

Final readback artifact on droplet:

- `docs/audits/market_evidence_engine_v1/mee_12c_market_listing_nightly_ingest_readback_2026-06-30T02-31-48-746Z.json`
- `docs/audits/market_evidence_engine_v1/mee_12c_market_listing_nightly_ingest_readback_2026-06-30T02-31-48-746Z.md`

## Code And Schema Changes Made

The ingestion pipeline was patched for real 4,000-call / large-row operation:

- Linux token fetch uses `curl` instead of Windows-only `curl.exe`.
- eBay OAuth errors redact secrets.
- Supabase CLI read paths were bypassed with direct `SUPABASE_DB_URL` reads where needed.
- Large warehouse backfill supports dynamic dedupe and skips exact duplicate raw payloads.
- Large candidate and strict-filter reads use keyset pagination instead of offset pagination.
- Nightly readback uses direct DB reads when available.
- Added local migration:
  - `supabase/migrations/20260629190000_market_listing_price_events_observation_idx.sql`
  - Creates `market_listing_price_events_observation_idx` on `market_listing_price_events(observation_id)`.

Operational note: the index SQL was applied directly to the linked Supabase project during the manual rescue run so the current matching/readback could complete. The migration file exists locally and is now committed for repository parity.

## Public Boundary State

No public pricing was published from this run.

The run kept the intended boundaries:

- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing view replacement.
- No app-visible price rollups.
- No identity table writes.
- No vault writes.
- No image/storage writes.

All generated listing candidates and rollups remain internal/review-only.

## Automation State At Pause

At pause time:

- `grookai-mee-nightly.timer` was intentionally stopped so the system does not spend another 4,000 eBay calls immediately after the manual run.
- A one-shot resume timer was created:
  - `grookai-mee-nightly-timer-resume.timer`
  - Scheduled for `2026-07-01 03:00:00 UTC`
  - Action: start `grookai-mee-nightly.timer`
- `grookai-mee-reference-refresh.timer` remained active.
- `grookai-mee-post-ingest.timer` remained active and was scheduled to run after the manual ingestion.

Verify on restart:

```bash
systemctl list-timers --all 'grookai-mee*' 'grookai-mee-nightly-timer-resume*' --no-pager
systemctl status grookai-mee-reference-refresh.service --no-pager || true
systemctl status grookai-mee-post-ingest.service --no-pager || true
systemctl status grookai-mee-nightly.timer --no-pager || true
```

## What To Check First On 2026-07-01

1. Confirm post-ingest ran after the manual ingestion:

```bash
systemctl status grookai-mee-post-ingest.service --no-pager || true
journalctl -u grookai-mee-post-ingest.service --since '2026-06-30 03:30 UTC' --no-pager | tail -160
```

2. Confirm reference refresh ran:

```bash
systemctl status grookai-mee-reference-refresh.service --no-pager || true
journalctl -u grookai-mee-reference-refresh.service --since '2026-06-30 02:40 UTC' --no-pager | tail -160
```

3. Confirm the nightly timer resumed:

```bash
systemctl list-timers --all 'grookai-mee*' 'grookai-mee-nightly-timer-resume*' --no-pager
systemctl status grookai-mee-nightly.timer --no-pager || true
```

4. If the one-shot resume did not run, manually re-enable the nightly timer:

```bash
sudo systemctl start grookai-mee-nightly.timer
```

## July 1 Restart Plan

Start with verification, not another acquisition.

1. Read the latest post-ingest artifact and confirm `findings: []`.
2. Run the live internal readbacks for:
   - variant assignment
   - publication-gate candidates
   - pricing bridge candidate rows
   - strict-filtered active ask coverage
3. Re-check the known product regressions:
   - Arceus Charizard `1/99` variants must resolve independently.
   - Pikachu ex `GV-PK-ASC-276` must not show stale/wrong active ask state if fresh active evidence exists.
   - Mightyena ex `GV-PK-HP-101` must keep Grookai Value separate from active ask evidence.
4. If post-ingest failed at scale, patch it using the same pattern:
   - direct DB reads via `SUPABASE_DB_URL`
   - keyset pagination
   - missing indexes
   - idempotent dynamic apply paths
5. Once post-ingest is clean, run one dry-run/limited live proof that the full automated nightly pipeline can now perform:
   - acquisition
   - warehouse backfill
   - candidate assignment
   - strict-filtered rollups
   - readback
   - post-ingest

## Do Not Do Next

- Do not publish eBay active ask as Grookai Value.
- Do not write `pricing_observations` from this batch.
- Do not write `ebay_active_prices_latest` from this batch.
- Do not replace public pricing views from this batch.
- Do not spend another 4,000 eBay calls until timer state and post-ingest state are verified.

## Product Direction Preserved

The current direction remains:

> Acquire intentionally. Warehouse broadly. Classify continuously. Publish selectively.

Broad intake is allowed to keep sealed, language, slab, raw, and ambiguous signals. Publication must remain selective and gated.

