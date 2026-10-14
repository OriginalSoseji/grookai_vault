# Pricing Checkpoint 140: Prism Star Alias Mapping Batch

## Status

`14 EXACT MAPPINGS APPLIED AND INDEPENDENTLY VERIFIED`

## Scope

This batch freezes 14 TCGPlayer Holofoil products whose source title spells out
`Prism Star` while the canonical English Master Index uses the `◇` glyph:

- six products from `SM - Ultra Prism` mapped to canonical set `sm5`;
- five products from `SM - Forbidden Light` mapped to canonical set `sm6`; and
- three products from `SM - Celestial Storm` mapped to canonical set `sm7`.

Every row is bound by exact source product ID, group ID and name, source title,
full printed coordinate, target UUID and GV-ID, set, canonical glyph name,
variant key, Holo child GV-ID, and provenance. This is a product registry, not a
global rule that rewrites `Prism Star` to `◇`.

## Retained Holds

The first probe found 20 structurally exact Prism Star aliases. Live printing
review readback then showed that four Team Up and two Dragon Majesty Holo
children are active, public, and non-provisional but have no active verified
truth-review record. Those six products remain evidence-blocked and are not in
the registry or execution package.

The batch also excludes Unit Energy abbreviation aliases and unrelated display
name differences. They require their own exact reviewed-product evidence.

## Evidence and Rehearsal

The verified-TLS planner produced exactly 14 candidates from the refreshed
completion-agent backlog and retained 720 blocked products. The three-scope
authority rehearsal independently checked the current TCGCSV products, unique
active `pokemon_eng_standard` parents, active verified visible Holo children,
and checked-in English Master Index card and printing evidence.

- candidates: `14`
- projected missing-price observations: `14`
- bounded packages: `1` (`14` mappings)
- candidates SHA-256:
  `3d0962b8662bf851f74553dd6bfbd6f1a4e5d66e2fd01d172db6ee00f69661ec`
- trial authority fingerprint:
  `ffc196700b7b5477413a1760fc1dd53c81c128ea1fcb170309c433a0e73d0add`
- database writes: `0`

Trial evidence is retained under
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/prism-star-alias-14-plan-trial-v1`
and `prism-star-alias-14-authority-trial-v1`. The broader 20-row probe and its
failed strict authority rehearsal are also retained as exclusion evidence.

## Production Release

PR 662 passed the repository's security, drift, runtime, contract, and preview
checks and was squash-merged at
`ebe54053cecd9ca22f04fac361695febd3bb0864`. The clean authority regenerated
from that exact commit accepted all 14 candidates across three scopes and froze
one writer-bounded package.

- clean authority fingerprint:
  `f80b1fd54d78d06317619556421864710f28b7bcb1952e84a8a688173ebeb160`
- clean authority file SHA-256:
  `b256ab03aa99df618859d3450188c23066ef490795ff3dadb7854bfc74e878a8`
- dry-run maintenance run: `599bcef4-e98b-4063-8aed-c7e967c65a5a`
- production maintenance run: `afbd4a0d-e305-434b-b24a-465ca1d4d389`
- inserted mappings: `14`
- production readback rows: `14`
- publication/customer-state writes: `0`

The dry run proved rollback before the production transaction. A separate
repeatable-read, read-only query then verified all 14 live source products,
active mappings, exact canonical parents, and governed public Holo printings.
The immutable operator evidence is retained under
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/prism-star-alias-14-production-release-v1`.

## Next Gate

Full-scope pricing shadow run `38619200134` is queued at the exact merge commit.
Use its successful output for the later guarded price publication and
independent price readback. Continue mapping work with the next exact reviewed
batch; the six truth-review-blocked Prism Star products remain held.
