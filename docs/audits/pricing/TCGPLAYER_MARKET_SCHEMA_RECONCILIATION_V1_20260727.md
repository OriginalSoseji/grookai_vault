# TCGPlayer Market Schema Reconciliation V1

Date: 2026-07-27 MDT / 2026-07-28 UTC

## Scope

This audit reconciles historical linked-schema drift before applying the
TCGPlayer Market Production V1 migration. It does not publish prices, modify
canonical identity, or write product data.

## Starting State

- implementation worktree: `C:\grookai_vault_mee_productization_v1`
- branch: `pricing/mee-productization-v1`
- pre-reconciliation HEAD:
  `f0637218fde32ec91860791652c6d9f14c09ae84`
- production project: `ycdxbpibncqcchqiihfz`
- pending pricing migration before reconciliation:
  `20260727120000_tcgplayer_market_publication_v1.sql`
- baseline linked schema diff without pricing: 242,902 bytes
- active linked schema diff with pricing: 262,096 bytes

The historical diff contained production objects that were absent from the
repository migration chain: nine tables, five columns, two removed
constraints, dependent views and functions, grants, RLS metadata, and comments.

## Synthetic Pull Event

`supabase db pull` generated:

`20260728002603_remote_schema.sql`

Supabase CLI v2.90.0 also registered that identifier in the remote migration
ledger. The command did not execute the generated SQL against production and
did not change production schema or data. It changed migration-ledger metadata
only.

The original generated file hash was:

`E0A607ECFACBDB1EB1CEB4BE2034B6AD98697684DB6E1758EEC1132823EA682A`

The generated file was not replay-safe as emitted. It attempted to set a
default on a generated column, created RPCs before their view return types, did
not restore one live overload, and omitted security metadata that is narrower
in production than the repository defaults.

Because this was a synthetic baseline entry whose SQL was never executed
remotely, the repository file was made replay-safe while preserving the live
semantic state. This is not a rewrite of SQL previously executed in production.

## Reconciliation Repairs

The final migration:

- orders dependent view-returning functions after their views
- restores the five-argument `search_card_prints_v1` overload
- uses PostgreSQL 17 `SET EXPRESSION` for the generated
  `card_prints.number_plain` column
- preserves 45 `security_invoker` view settings
- preserves narrowed table, view, and function privileges
- preserves PostgreSQL 17 `MAINTAIN` privilege differences
- restores table, view, column, and function comments
- recreates historical remote-only tables, indexes, policies, triggers, and
  constraints

Final reconciliation migration:

`20260728002603_remote_schema.sql`

Final SHA-256:

`28FB99C215E84192AE8ECE59A514818E60B7299794409BDEF4823C3C79FFE553`

Safety scan:

- `DROP EXTENSION`: 0
- `DROP TABLE`: 0
- `TRUNCATE TABLE`: 0
- `DROP COLUMN`: 0
- dependent view drops are paired with exact view reconstruction

## Direct Semantic Parity

A historical-only zero-state database was replayed from the exact pre-pricing
commit plus the reconciliation migration, then compared read-only with the
linked production catalog.

| Object class | Compared | Semantic differences |
| --- | ---: | ---: |
| relations | 230 | 0 |
| columns | 2,593 | 0 |
| constraints | 1,023 | 0 |
| indexes | 687 | 0 |
| triggers | 129 | 0 |
| policies | 358 | 0 |
| views | 102 | 0 |
| functions | 367 | 0 |
| relation privileges | all public relations | 0 |
| function privileges | all public functions | 0 |

Total schema objects compared: 5,489.

The comparison includes definitions, types, generated/default expressions,
nullability, validation state, RLS state, view options, ownership, comments,
and effective privileges. ACL array ordering was normalized before comparison.

## Physical Column Position Exception

Twenty-two existing columns have different physical `attnum` positions in a
zero-state replay because production received historical manual alterations in
a different chronological order. Their names, types, nullability, generated or
default expressions, comments, constraints, indexes, views, and functions
match.

Reproducing physical positions would require destructive table reconstruction
or editing already-applied historical migrations. Both are rejected. Product
and worker code must address these columns by name and must not rely on raw
table tuple position.

## Clean Migration Order

The pricing migration had not been applied remotely, so it was safely
renumbered after the synthetic reconciliation entry:

`20260728010000_tcgplayer_market_publication_v1.sql`

SHA-256:

`91B7517D14EFF808CE4B1A63D50257F715D79BC91E5426A00FD46FCCC7E4ECE9`

Historical baseline audit artifacts retain the old identifier because that was
the truthful identifier at capture time.

Final linked ledger:

- `20260728002603`: local and remote
- `20260728010000`: local only
- no remote-only identifiers
- no out-of-order pending migration
- no use of `--include-all`
- no migration repair

## Verification

- historical-only zero-state replay: passed
- active zero-state replay in final order: passed
- strict pre-push gate with expected local-only ID
  `20260728010000`: passed
- pending-object duplicate scan: passed
- production schema/data writes from pricing migration: none

Supporting transient command logs are under:

`artifacts/market_pricing_product_v1/linked_drift_reconciliation/`

## Decision

Historical migration drift is reconciled sufficiently for a normal ordered
production apply of `20260728010000`. The next gate is migration dry-run,
production apply, schema/security readback, and shadow publication only.
