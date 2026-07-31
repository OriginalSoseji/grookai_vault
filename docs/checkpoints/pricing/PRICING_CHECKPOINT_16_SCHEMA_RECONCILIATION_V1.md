# Pricing Checkpoint 16: Schema Reconciliation V1

## Context

The TCGPlayer Market V1 implementation was locally complete, but linked schema
diffs proved that production contained historical objects and metadata that
were not reproducible from repository migrations.

## Problem

Applying the pricing migration on top of an unreconciled ledger would have made
future zero-state rebuilds and production upgrades ambiguous. The first
generated `db pull` was also not replay-safe and omitted important ACL and view
metadata.

## Risk

- clean environments could differ from production
- broad default privileges could expose internal review or evidence surfaces
- an out-of-order pending pricing migration could require prohibited
  `--include-all`
- generated-column and view-return-type ordering could break replay
- future operators could mistake CLI diff churn for real schema changes

## Decision

Preserve the synthetic remote ledger identifier
`20260728002603`, make its repository baseline replay-safe and semantically
equivalent to production, and renumber only the unapplied pricing migration to
`20260728010000`.

Do not repair the ledger, use `--include-all`, edit an executed production
migration, or destructively rebuild tables to reproduce physical column order.

## Alternatives Rejected

- ignore the historical linked diff
- apply the older pending migration with `--include-all`
- remove or rewrite the synthetic remote ledger row
- accept generated broad ACL defaults
- reconstruct large production tables solely to match `attnum`

## Current Truths

- historical-only zero-state replay passes
- active replay passes in final ledger order
- 5,489 schema objects compare with zero semantic differences
- relation and function privileges compare with zero differences
- 22 physical column positions differ for documented historical-order reasons
- strict pre-push passes with exactly one pending migration:
  `20260728010000`
- the pricing migration has not been applied to production
- no production pricing rows have been written

## Invariants

- no applied production SQL is silently rewritten
- migration order must advance normally without `--include-all`
- zero-state replay must remain executable
- production privileges must not become broader during reconstruction
- generated expressions and callable function signatures must match production
- physical column order is not a product contract

## Why This Mattered

Pricing publication is only trustworthy when the database can be rebuilt and
advanced deterministically. This repair converts production-only historical
state into reviewable repository authority before the new pricing model is
installed.

## Explicit Next Gate

Dry-run and apply `20260728010000_tcgplayer_market_publication_v1.sql` through
the normal migration path. Then verify schema, grants, RLS, functions, views,
and zero publication rows before starting the first production shadow cycle.
