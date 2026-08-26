# Pricing Checkpoint 95: Production Full Cycle And Performance

## Status

The complete governed TCGPlayer production cycle, coverage gate, provenance
readback, exact-Vault readback, and pricing read-performance gate passed.

## Decision

Treat `TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-2026-08-26-publication` as the
current production proof. Keep the publication cursor repair undeployed until
the consolidated candidate release, because the existing immutable runtime
completed and reconciled the cycle successfully.

## Production Result

- Run ID: `70ab50a3-1603-47d3-96ab-30c42515e7fa`
- Source rows: `546,717`
- Selected: `206,304`
- Mapped: `175,496`
- Qualified: `206,304`
- Eligible and active snapshots: `164,135`
- State: `verified`
- Reconciliation: `reconciled`
- Broken provenance traces: `0`
- Production Pokemon coverage: `95.308%`
- Out-of-scope published rows: `0`

## Performance

The GV-ID trigram migration `20260826070000` is applied and ledgered. Its index
is valid, ready, and used by the planner. It changed no canonical or pricing
row counts.

The post-index governed pricing read test completed `180/180` calls with zero
errors and zero row-count mismatches. All six p95 measurements passed the
`500 ms` gate; the worst p95 was `172.061 ms` for a 200-printing batch.

## Invariants

- TCGPlayer `marketPrice` remains the Production V1 market close.
- Publication remains exact-printing and evidence-traceable.
- Coverage exclusions remain explicit and reproducible.
- No failed audit command is rewritten or discarded; corrected reruns are
  preserved beside the original evidence.
- No pricing result authorizes anonymous access.

## Evidence

- `C:\secure-ops\production-backend-launch\pricing-verification\20260826T074500Z_production_cycle_controls`
- `C:\secure-ops\production-backend-launch\pricing-verification\20260826T074500Z_production_coverage_final\2026-08-26T08-21-48-300Z`
- `C:\secure-ops\production-backend-launch\database-performance\20260826T082300Z_gv_id_trgm_apply`

## Exact Next Gate

Deploy the frozen publication cursor repair with the consolidated client
candidate, then prove one unattended next cycle plus same-candidate client
pricing reads before starting the final 72-hour soak.
