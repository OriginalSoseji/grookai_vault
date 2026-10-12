# Collectr catalog conflicts and owner choices

## October 12 source-backed adjudication and release candidate

The follow-up authority audit covered 1,327 cards, 2,298 printings, 2,227
provider mappings and 1,327 printed identities. It adjudicated six duplicate
provider set families and 647 exact parent pairs. The PokemonTCG set coordinate
already used by Grookai release metadata is canonical; the corresponding
TCGdex coordinate remains available as reversible provider lineage:

- `2021swsh` -> `mcd21`
- `swsh10.5` -> `pgo`
- `sv04.5` -> `sv4pt5`
- `sv06.5` -> `sv6pt5`
- `sv08.5` -> `sv8pt5`
- `tk-ex-latio` -> `tk1b`

Provider and release metadata decide the family direction. Normalized name,
number, variant and modifier only bind exact card pairs inside an adjudicated
family; they are not authority by themselves. The audit inspected all 74 parent
foreign keys, 230,635 legacy-side references and 726,184 canonical-side
references. It found 969 uniqueness collisions, so the release keeps both
parents and moves or deletes no ownership, pricing, printing or history rows.

Production migration `20261012010000_card_print_identity_aliases_v1` installed
the additive alias table and bounded read RPC. Follow-up migration
`20261012013000_card_print_identity_alias_authority_v1` records the three source
authorities, evidence hashes and finish policy, and requires approved authority
before an active alias can be returned.

The full original Collectr export now resolves all 62 former catalog-conflict
rows / 76 copies: 56 rows / 68 copies are ready and 6 rows / 8 copies remain
owner choices. Zero remain catalog conflicts. All 1,340 saved groups and prior
receipts remain unchanged. Nothing was imported.

Private evidence is retained outside the repository. Its classification SHA-256
is `87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7`;
the collision-matrix SHA-256 is
`3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4`.

Local candidate on main 310ebcc5600bc122a3f0e3864506802926a8817f, branch
fix/collectr-catalog-review-20261009. No deployment or new import is included.
PR614's exact-cost release and its 20-copy save are complete; do not replay them.
The private collectr_catalog_review_20261009/CHECKPOINT.json owns actual state.

## Implemented

The website previously placed every ambiguous match under “Choose a match”.
Some candidates share the same name, normalized number and explicit variant,
but disagree on set coordinates. An owner cannot establish catalog equivalence
by picking an internal code or GV suffix.

The review workspace now separates these rows into “Catalog conflicts”. Within
an already ambiguous preview, competing records with the same name, number,
variant and modifier across different set codes cannot be selected. Original
fields, quantities, candidates and card links remain visible. A distinct stamped
or edition candidate remains selectable and can be undone. Existing saved groups
are not rewritten. The choice handler also checks older preview candidates.

This is a website review guard, not canonical equivalence, an API authorization
boundary or a catalog repair. It adds no catalog requests and does not change
automatic matching, finish resolution, the server writer, schema or public set
routes. Native import behavior remains outside this change.

## Qualified against the original export

- 62 held source rows / 76 copies receive catalog-conflict handling.
- 57 other ambiguous rows retain their owner-choice workflow.
- 1,640 accounted copies and 532 review rows remain unchanged.
- All 1,340 saved groups, their exact targets, the consumed receipt and 3,250
  owned copies are preserved by fresh read-only production checks.
- Fresh preview uses the same 297 public catalog requests. Every difference is
  restricted to reasons and selectable options on the 62 previously held rows.
- Importer contract tests, website TypeScript and changed-file lint pass.
- The strict production release build passes on the integrated current main.
  Normal release hooks also pass: 7,519 contract checks with 10 contract skips,
  web TypeScript/lint/build, Flutter analysis, and 1,373 native tests with two
  native skips. Browser visual validation is not completed. No deployment
  readiness claim is made.

## Original catalog-repair scope (completed by the October 12 adjudication)

| Competing coordinates | Source rows | Copies |
| --- | ---: | ---: |
| tk-ex-latio / tk1b | 2 | 2 |
| 2021swsh / mcd21 | 6 | 6 |
| sv04.5 / sv4pt5 | 12 | 18 |
| pgo / swsh10.5 | 12 | 12 |
| sv08.5 / sv8pt5 | 29 | 37 |
| sv06.5 / sv6pt5 | 1 | 1 |

The original guard correctly prohibited owner choice, rarity, GV suffixes and
normalized identity fields from acting as catalog authority. The October 12
source decision supplies that authority while preserving both parents and every
reference. Stamped and edition differences remain owner choices. This is not a
blanket public-route alias, physical merge or pricing rewrite.

Slab support is deferred by the user for a later day. The 64 graded rows / 69
copies remain held; the old pending-choice wording in earlier checkpoints is
superseded. Preserve original CSV, all consumed receipts, retained labs and
deferred receipt-delivery migration. Production qualification and preview
inspection remain read-only; only the reviewed additive alias migrations change
catalog schema and evidence.
