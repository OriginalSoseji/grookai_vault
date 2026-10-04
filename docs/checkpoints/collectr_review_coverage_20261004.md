# Collectr review coverage — October 4

PR589 is live at `385037f3a42973a53d31123e1e31d58d74cdf7f5`.
The unchanged original export has 1,361 accounted copies and 692 retained review
rows. The private `collectr_name_fidelity_20261003/release-and-import-checkpoint.json`
and incremental readback supersede historical local-only status. Do not replay
its release or import intents. Native and Edge distribution remain separate.

Current work: `fix/collectr-review-coverage-20261004` in
`C:/gv_collectr_adventure_20261001`, based on that main commit. Production has
417 migrations. All catalog inspection in this batch is read-only. Private
evidence stays under `C:/grookai_vault_operator_artifacts/collectr_review_coverage_20261004`.

## Remaining source rows

Every held row is classified once. These are primary review tasks, not a claim
that each row has only one problem. Numberless rows are not automatically sealed.
The explicit-language group requires a JP/CN/KR source marker; the other catalog
group can also contain implicit language or set differences.

| Primary task | Live held rows |
| --- | ---: |
| Missing card number | 183 |
| Explicit language marker without an exact match | 138 |
| Other catalog/name/set mismatch | 129 |
| Multiple catalog identities | 119 |
| Graded source | 64 |
| Edition in the finish field | 46 |
| Edition in the set field | 11 |
| Unsupported game or watchlist | 2 |
| Total | 692 |

Fresh inspection of six legacy sets returned 596 parents and 600 governed
children. Most ordinary legacy parents do not expose a distinct edition in the
current import contract. A blank variant or ordinary holo child is not evidence
of Unlimited or First Edition. Keep these 57 edition rows held; do not remove the
edition gate or reuse pricing-only edition evidence as physical printing truth.

## Governed Surge Foil matching

The next bounded repair recognizes the terminal `(Surge Foil)` treatment only
when the existing MTG identity binds the exact English parent, source number,
set code and Scryfall print, with `promo_types` containing `surgefoil` and
`finishes` exactly `["foil"]`. The source must explicitly request Foil. Blank,
Normal, unsupported special finishes, missing/conflicting evidence, grades and
unknown/duplicate treatment suffixes remain held. Borderless and repeated-number
labels retain their independent checks. Transform front-face handling retains
the governed complete identity. Save rereads all evidence.

The publisher's [collecting guide](https://magic.wizards.com/en/news/feature/collecting-final-fantasy)
distinguishes Surge Foil borderless treatments. That terminology is context;
matching still requires the existing bound catalog evidence and active child.
No new catalog entries, printings, schema or ownership writes are introduced.

Fresh read-only FIN/FIC inspection covers 1,083 parents, 1,083 active identities
and 2,057 governed printing options. Full-export replay resolves 14 further rows
and copies: 1,194 ready rows, 1,375 ready copies, 678 review rows. Previously ready
selections, original fields and explicit review choices remain identical. This is
local qualification, not a deployed feature or a new real import.

Shared synthetic fixtures exercise 20 positive/negative treatment cases in
TypeScript, handler validation and Dart. Native preview tests cover conflicting
and omitted finishes and grades. The opt-in
`GV_COLLECTR_SURGE_HTTP_PROOF=1` extends the existing retained410 lab and previous
import journeys, with exact child save/readback, stale treatment/finish rejection,
original source retention and retries without duplicates. Do not reset the lab.
The first run found a stopped relay; the next identified a hidden synthetic set.
The fixture now explicitly publishes only its own new set inside the isolated
lab. Failed receipts remain preserved; game-wide visibility is unchanged.

## Next larger work packages

1. Separate genuine sealed products from other numberless rows, then design an
   exact released sealed-variant import path with source preservation and retries.
2. Measure Japanese/Chinese catalog coverage and identity-language evidence before
   implementing language-aware imports. Never substitute English printings.
3. Keep the 119 ambiguous rows available for explicit owner selection. Inspect
   duplicate catalog representations separately; never silently choose the first.
4. Add graded ownership only after the existing slab and valuation readers can
   distinguish owner-supplied grade assertions from verified certificates.
5. Resolve legacy edition identity in the governed catalog before enabling those
   source labels. Keep remaining stamped/promo/name gaps in the full inventory.

Release requires normal repository checks, latest-main reconciliation and hosted
web proof. Then rerun the original export through the signed-in website and
independently verify that the 1,361 existing mapped copies are unchanged. Never
count locally eligible copies as imported. The external final receipt records
the current implementation, test and distribution state.
