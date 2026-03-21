# JUSTTCG_MAPPING_LANE_V1

## Status

`ACTIVE / PARTIALLY COMPLETE / VERIFIED`

## Date

`2026-03-21`

## Scope

This checkpoint covers the current verified state of the implemented JustTCG mapping lane:

- documented `POST /cards` batch lookup
- deterministic match-back by `tcgplayerId`
- per-ID anomaly isolation in batch resolution
- candidate ordering repair to prioritize unmapped rows first
- optional `--unmapped-only` execution mode
- current mapping execution state and verified DB coverage

This checkpoint does not cover pricing ingestion.

## Problem

The mapping lane needed a stable operational contract because the earlier state had four concrete issues:

- unsafe GET pseudo-batch behavior did not provide an acceptable batch contract
- no canonical batch lookup contract had been locked for the worker
- one bad upstream `tcgplayerId` could poison an entire batch
- already-correct rows were being front-loaded, wasting limited runs and hiding remaining unmapped work

## What Changed

The lane was repaired to the current verified form:

- canonical JustTCG batch lookup now uses documented `POST /cards`
- deterministic match-back is enforced by returned `tcgplayerId`
- duplicate or anomalous upstream rows are isolated per requested ID instead of poisoning unrelated IDs
- candidate selection now runs `unmapped-first`
- optional `--unmapped-only` mode exists for focused backlog execution
- stable working execution was proven with `--batch-size=50`
- startup and batch observability were added so execution mode, batch size, selection mode, and batch result counts are visible during runs

## Verified Outcome

The JustTCG mapping lane implementation is complete and operational.

Grookai has successfully produced **14,064 active JustTCG mappings** while preserving deterministic attachment and existing integrity rules.

This checkpoint does **not** mean full-database JustTCG mapping is complete.

## Current Coverage State

Verified current state:

- covered JustTCG rows: `14,064`
- total `card_prints`: `22,239`
- DB-wide JustTCG coverage: `63.24%`
- remaining without JustTCG: `8,175`

Operational interpretation:

- Grookai can proceed now using the mapped **14,064** rows for testing and next-phase pricing work
- full DB-wide JustTCG coverage is deferred
- the remaining **8,175** rows are not solved by this checkpoint

## Deferred Work

The remaining **8,175** rows require a future alternate attachment strategy to JustTCG.

That work is intentionally parked here:

- it is not solved in this checkpoint
- it is not to be described as completed or fully classified
- it is not blocking the immediate next phase

This checkpoint exists so the deferred mapping backlog can be resumed later without confusion about what is already verified.

## What This Unlocks Now

The current verified mapping population is enough to move forward with the next layer of work:

- JustTCG-backed testing can proceed on the mapped **14,064** rows
- pricing ingestion can be built and tested against this mapped population
- Grookai can validate the pricing lane before solving total DB coverage

## Next Phase

`JUSTTCG_PRICING_INGESTION_V1`

Clarification:

- mapping alone does **not** populate price numbers
- pricing requires a separate ingestion lane

## Commands Used

Worker commands:

```powershell
cd C:\grookai_vault

node backend\pricing\promote_tcgplayer_to_justtcg_mapping_v1.mjs --dry-run --batch-size=50 --limit=50 --unmapped-only
node backend\pricing\promote_tcgplayer_to_justtcg_mapping_v1.mjs --apply --batch-size=50 --limit=500 --unmapped-only
```

Coverage verification SQL:

```sql
select count(*) as covered_justtcg
from public.external_mappings
where source = 'justtcg'
  and active = true;

select count(*) as total_card_prints
from public.card_prints;

select
  covered.covered_justtcg,
  totals.total_card_prints,
  round(100.0 * covered.covered_justtcg / nullif(totals.total_card_prints, 0), 2) as coverage_pct,
  totals.total_card_prints - covered.covered_justtcg as remaining_without_justtcg
from (
  select count(*)::numeric as covered_justtcg
  from public.external_mappings
  where source = 'justtcg'
    and active = true
) covered
cross join (
  select count(*)::numeric as total_card_prints
  from public.card_prints
) totals;
```

## Decision

Proceed with pricing and testing using the mapped **14,064** rows.

Defer the remaining **8,175** rows for a future alternate attachment strategy.

Keep this checkpoint as the resumption anchor for the JustTCG mapping backlog.
