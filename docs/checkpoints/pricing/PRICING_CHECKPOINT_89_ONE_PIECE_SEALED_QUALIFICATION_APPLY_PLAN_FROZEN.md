# Pricing Checkpoint 89: One Piece Sealed Qualification Apply Plan Frozen

## Context

Checkpoint 88 proved that all 374 observed One Piece sealed pricing decisions
match durable canonical mappings and real TCGPlayer source observations. Three
representative inserts were proven inside a rollback-only transaction with zero
residue. Production qualification and release state remained empty.

## Problem

A rollback canary does not define the full durable mutation. The system needed
an immutable apply plan and a fail-closed writer that authorize only the exact
374-row qualification payload, preserve all 16 missing-observation holds
outside the ledger, and cannot silently create release or visibility state.

## Decision

Freeze one insert-only mutation contract for
`sealed_product_pricing_lane_qualifications`. Add a guarded writer with four
explicit modes:

- `dry-run`: validates all frozen inputs with zero database connections.
- `preflight`: performs a repeatable-read, read-only production reconciliation.
- `apply`: requires an explicit execution flag, exact clean commit, exact plan
  and payload fingerprints, exact mutation hash, and an exact fresh preflight.
- `verify`: independently proves the committed payload in a read-only
  transaction.

This gate executed only `dry-run`.

## Producers And Fingerprints

- Durable-gate code producer commit:
  `2fe118efaaf3f9d1864df8e7db809fb4178c1419`
- Frozen apply-plan producer commit:
  `2fe118efaaf3f9d1864df8e7db809fb4178c1419`
- Writer dry-run producer commit:
  `67ce198157676658898245ddefc08405a758d2c6`
- Apply-plan fingerprint:
  `1861e6779f78cee8ab967ece05b1a0354beb8c329f074041f809e58cc9e01998`
- Source payload fingerprint:
  `be884db80e24e0dfd7963234e4187994456ed439cb2c0cfe149101e92c29287e`
- Mutation-contract hash:
  `9035abb51704978d47d37254a3d315280f33a98a78e46bba1edcac6dc4d9558d`
- Dry-run execution fingerprint:
  `a582214f41364bb08985cae09f4d7431047fbb0023d4b6e7783c950cc63c313f`

## Frozen Mutation Contract

- Target table: `sealed_product_pricing_lane_qualifications`
- Operation: one atomic insert-only transaction
- Planned inserts: 374
- `qualified_exact`: 332
- `blocked_stale`: 4
- `blocked_missing_price`: 38
- Missing-observation holds excluded: 16
- Updates/deletes/upserts: 0 / 0 / 0
- Release/member/pointer writes: 0 / 0 / 0
- Publication/card/Storage/Vault writes: 0 / 0 / 0 / 0
- App visibility changes: 0

## Writer Safety

The apply path requires all of the following before commit:

- exact clean branch commit
- explicit `--execute-durable-apply`
- exact apply-plan, payload, and mutation fingerprints
- a fresh preflight file whose proof hash is recomputed
- transaction-local 374/374 variant, mapping, and source-observation lineage
- zero ID and database-key collisions
- an empty qualification baseline
- One Piece release state still hidden
- exact 374-row payload readback and status counts
- exact one-table write attribution
- unchanged release, publication, card, Storage, Vault, and visibility state

Any failed condition rolls back the entire transaction. The writer has one
`insert into public...` target and no update, delete, or `on conflict` path.

## Dry-Run Result

- Status: `dry_run_passed_no_connection`
- Planned rows reconciled: 374
- Database connections: 0
- Database writes: 0
- Apply executed: false
- Artifact hash mismatches: 0

## Current Truths

- Production contains zero sealed qualification rows.
- Production contains zero sealed releases, members, and pointer rows.
- One Piece remains hidden.
- No price is published by this sealed lane.
- The exact durable payload and mutation contract are frozen.
- The writer has not been run in `preflight`, `apply`, or `verify` mode.
- The 16 missing-observation holds remain outside the database payload.

## Invariants

- Qualification is evidence state, not publication authority.
- `publication_authority` remains false on every planned row.
- Blocked rows can be recorded but can never enter a release.
- Missing observations never receive fabricated source row identities.
- A release, release members, pointer activation, publication, and visibility
  are separate future gates.
- Durable apply cannot proceed from a dirty or different commit.
- The fresh preflight proof is recomputed, not trusted by label.
- Transaction-local checks protect against races after preflight.

## Tests

- Combined lineage, qualification, rollback, apply-plan, and writer contracts:
  19 / 19 passed.
- Full repository shipcheck passed for the code producer commit.
- Full repository shipcheck passed for the frozen plan commit.
- Flutter tests: 614 / 614 passed in both hooks.

## Permanent Artifacts

- `docs/audits/pricing/one_piece_sealed_pricing_qualification_apply_plan_v1/frozen_apply_plan_v1/`
- `docs/audits/pricing/one_piece_sealed_pricing_qualification_apply_v1/dry_run_v1/`

## Exact Next Gate

From the next exact clean committed SHA, run the writer in `preflight` mode
only. Require 374/374 canonical, mapping, and source-observation lineage, zero
collisions, an empty qualification/release baseline, enforced service-only RLS,
and hidden One Piece release state. Freeze and hash that read-only artifact.

Do not execute `apply` or `verify` in that gate. Do not create releases,
publication, pointers, or app visibility.
