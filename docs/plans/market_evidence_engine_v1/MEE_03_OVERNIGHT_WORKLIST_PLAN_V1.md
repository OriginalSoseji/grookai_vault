# MEE_03_OVERNIGHT_WORKLIST_PLAN_V1

## Status

Implemented as a read-only worklist builder.

No migration was created. No database writes, provider calls, scraper jobs, or pricing rollups are performed by this overnight step.

## Purpose

Create an overnight-safe Market Evidence Engine report that ranks the next cards to acquire market evidence for.

This is intentionally not the acquisition job. It prepares the batch list and proof report so the first real eBay acquisition can be small, bounded, and approved.

## Command

```powershell
npm run mee:overnight:worklist -- --limit=1000 --stale-days=30
```

Outputs are written under:

```text
docs/audits/market_evidence_engine_v1/
```

Each run writes:

- `mee_overnight_worklist_<timestamp>.json`
- `mee_overnight_worklist_<timestamp>.md`

## Boundary

The runner may read:

- `card_prints`
- `ebay_active_prices_latest`
- `v_pricing_observations_accepted`
- `justtcg_variant_prices_latest`

The runner must not:

- call eBay
- call PriceCharting
- call TCGplayer
- call JustTCG
- insert rows
- update rows
- upsert rows
- delete rows
- call RPCs
- apply migrations
- write pricing rollups

## Scoring

Targets are ranked higher when:

- they have no accepted mapped eBay observations
- they have no eBay latest rollup
- their eBay rollup is stale
- they have reference-lane data available for cross-checking
- their rarity suggests higher collector interest

## How To Leave It Running

Use this command from `C:\grookai_vault`:

```powershell
npm run mee:overnight:worklist -- --limit=5000 --stale-days=30 *> docs/audits/market_evidence_engine_v1/mee_overnight_worklist_run.log
```

This should finish quickly on normal data volumes, but the redirected log makes it safe to leave open.

## Morning Readout

Review the newest Markdown report:

```powershell
Get-ChildItem docs/audits/market_evidence_engine_v1/mee_overnight_worklist_*.md | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

Then use the JSON target list to choose the first bounded acquisition batch after `MEE-02A` schema draft review.

## Next Step

After the worklist exists, proceed with `MEE-02A`: draft the schema-only warehouse migration and contract tests. Do not apply the migration without explicit approval.
