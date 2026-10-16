# Pricing Checkpoint 154: MEP Catalog Backfill

Date: 2026-10-16

## Purpose

The pricing completion backlog contains TCGPlayer products whose exact MEP
identities do not yet exist in `card_prints`. This first catalog-backed batch
adds only the four rows supported by two independent Master Index sources and
an exact TCGPlayer product coordinate:

| MEP number | Card | Finish | TCGPlayer product |
| --- | --- | --- | --- |
| 072 | Mega Clefable ex | Holo | 696607 |
| 073 | Mega Gengar ex | Holo | 696608 |
| 081 | Mega Greninja ex | Holo | 704879 |
| 088 | Zarude | Holo | 706193 |

Each target has a frozen parent UUID, active identity projection, Holo child
UUID, GV-ID, source product ID, accepted mapping method, and evidence URLs from
TCGPlayer, TCGdex, and ThePriceDex. Product 706199,
the separate Zarude 088 Pokemon Center Exclusive, is outside this batch.

## Rollback proof

`mep_pricing_gap_catalog_backfill_guarded_dry_run_v1.mjs` inserted four parent
rows, four active `card_print_identity` rows, four Holo child rows, and four
TCGPlayer mappings in one transaction, then rolled the transaction back. The
independent before and after snapshots
were both empty and shared SHA-256
`4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
The frozen package fingerprint is
`d11d0f2b4dc62f9806ccc2abb19ddb733889eac0b37a76109d217bb9d50018e3`.

The real-apply wrapper defaults to validation only. Its apply mode requires a
clean checkout whose full HEAD SHA is supplied explicitly, rechecks all parent,
identity, child, finish, and mapping collisions under an advisory lock, commits
one transaction, then verifies all 16 rows through a separate connection. A lost
commit response is classified by that independent readback.

## Release boundary

Merge the frozen package, create a clean worktree at the exact merge commit,
and wait for the active full-market publication to complete and pass its own
independent readback. Then run the catalog apply once and preserve its external
receipt. A later pricing-completion run must discover these four mappings and
qualify their current source prices; this catalog insertion does not itself
publish a customer price.

MEP rows 092 through 110 remain held because the current Master Index records
only one qualifying independent source for most of them. All promo-edition,
stamp, award, and duplicate-parent collisions remain held.
