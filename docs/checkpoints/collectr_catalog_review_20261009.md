# Collectr catalog conflicts and owner choices

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

## Catalog repair remains open

| Competing coordinates | Source rows | Copies |
| --- | ---: | ---: |
| tk-ex-latio / tk1b | 2 | 2 |
| 2021swsh / mcd21 | 6 | 6 |
| sv04.5 / sv4pt5 | 12 | 18 |
| pgo / swsh10.5 | 12 | 12 |
| sv08.5 / sv8pt5 | 29 | 37 |
| sv06.5 / sv6pt5 | 1 | 1 |

The prior private catalog review counted 152 ownership references to candidate
parents. Preserve them. Neither set_code_classification nor provider codes alone
can decide the destination. The historical PAF_REALIGNMENT_V2 checkpoint treats
all sv4pt5 parents as shiny, yet current matching records expose normal and
reverse finishes and the preserved source fixture maps sv4pt5 to the same
sv04.5 checklist URL. This is conflicting evidence, not permission to collapse
the families or reinterpret the -S suffix. Public route aliases also explicitly
exclude several of these pairs. A source-adjudicated, reference-preserving
identity plan is required before changing catalog truth or importing these rows.

Keep all six families and the mixed stamp cases in that plan. Do not apply a
blanket alias, choose a candidate from rarity/price or revive historical runners.
The review guard does not claim that any of the 76 copies is now importable.

Slab support is deferred by the user for a later day. The 64 graded rows / 69
copies remain held; the old pending-choice wording in earlier checkpoints is
superseded. Preserve original CSV, all consumed receipts, retained labs and
deferred receipt-delivery migration. Production inspection remains read-only.
