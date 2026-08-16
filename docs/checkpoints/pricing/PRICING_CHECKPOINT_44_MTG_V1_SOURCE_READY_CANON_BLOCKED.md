# Pricing Checkpoint 44: MTG V1 Source Ready, Canon Blocked

## Status

MTG source readiness is proven. MTG canonical import and price publication are blocked.

The frozen production audit was generated from commit
`a7910ba60f43929874c5d1da9a43e44a71876176` on
`agent/mtg-pricing-readiness-v1`. Its database transaction was read-only and
performed zero writes.

## Context

MTG was selected as the next TCG because TCGPlayer category `1` is already
present in the full TCGCSV source warehouse. The readiness question was
whether that source catalog could flow through the existing Pokémon market
publication system or whether canonical work was still required.

## Problem

Source catalog coverage and canonical Grookai identity are different states.
The source warehouse contains Magic groups, products, images, and price rows,
but the Grookai database has no MTG game, sets, card prints, printings, or exact
source mappings. The active publication policy also hard-codes Pokémon
category `3` and Pokémon finishes.

Publishing source rows directly or matching them by card name would create
untraceable prices and variant collisions.

## Risk

MTG has identity dimensions that cannot be flattened into the current
Pokémon model:

- Normal versus Foil market lanes;
- borderless, showcase, retro-frame, extended-art, serialized, etched, surge,
  and other treatment labels;
- supplemental and promotional groups;
- nonnumeric collector numbers;
- language variants encoded partly in product names;
- sealed products mixed into the same source category.

Treating all of these as a generic variant or finish would misprice cards.

## Decision

- Preserve TCGCSV as source evidence, not canonical identity.
- Define English raw singles as MTG Production V1.
- Require exact game, set, collector number, treatment, language, finish,
  source product, and source subtype evidence before publication.
- Reuse MEE qualification, provenance, immutable publication, rollback, and
  shared read-model infrastructure only after it becomes game-aware.
- Keep every MTG row out of the current Pokémon publication lane.
- Do not write canonical MTG rows until a separately reviewed import contract
  and dry-run payload exist.

## Production Readback

| Metric | Value |
|---|---:|
| TCGPlayer category | `1` / Magic: The Gathering |
| Active source groups | 453 |
| Active source products | 117,267 |
| Products with source images | 117,267 |
| Source raw-single candidates | 103,714 |
| Latest observed date | 2026-08-13 |
| Latest price rows | 160,858 |
| Positive `marketPrice` rows | 158,310 |
| Normal rows | 96,577 |
| Foil rows | 64,281 |
| Canonical MTG games | 0 |
| Canonical MTG sets | 0 |
| Canonical MTG card prints | 0 |
| Canonical MTG printings | 0 |
| Exact MTG source mappings | 0 |
| Published MTG snapshots | 0 |

The source inventory also contains explicit treatment and language signals,
including 4,175 extended-art names, 2,983 borderless names, 2,564 surge-foil
names, 2,243 showcase names, 1,416 retro-frame names, and 1,211 etched names.
These are discovery signals only and do not establish canonical identity.

## Verification

- Policy and audit syntax checks: passed.
- Targeted MTG readiness contracts: `7 / 7` passed.
- Production transaction read-only proof: passed.
- Source, canonical, mapping, and publication reconciliation: passed.
- `git diff --check`: passed before the frozen commit.
- Repository production preflight: `PASS_WITH_DEFERRED_DEBT`, zero critical
  failures.
- The broad shipcheck reached web lint after contracts and web typecheck. Web
  lint could not load `eslint/config` from a dependency junction belonging to
  another checkout; Flutter stages did not run. This is an isolated-worktree
  dependency-state limitation, not an MTG contract failure.

## Permanent Evidence

`docs/audits/pricing/mtg_pricing_readiness_v1/2026-08-13T17-52-09-387Z/`

The directory contains:

- `production_snapshot.json`
- `run_plan.json`
- `summary.json`
- `REPORT.md`
- `artifact_hashes.json`

## Invariants

- TCGPlayer `marketPrice` remains source market-close authority.
- Source presence never creates canonical identity.
- Name-only or collector-number-only matching never publishes a price.
- Treatment and finish remain separate dimensions.
- Sealed, slab, non-English, ambiguous, and unsupported treatment rows remain
  preserved but unpublished.
- The Pokémon canary and publication policy remain unchanged.
- No MTG database write is authorized by this checkpoint.

## Exact Next Gate

Build `MTG_CANONICAL_CATALOG_IMPORT_CONTRACT_V1` and a zero-write production
inventory that chooses and reconciles an authoritative canonical MTG catalog.
It must define stable game, set, card, treatment, language, and finish keys;
image authority; duplicate/collision policy; licensing provenance; and exact
TCGPlayer product reconciliation.

The first executable output must be a deterministic dry-run payload and gap
report. It must not apply a migration or write canonical rows without a new,
explicitly bounded apply gate.

