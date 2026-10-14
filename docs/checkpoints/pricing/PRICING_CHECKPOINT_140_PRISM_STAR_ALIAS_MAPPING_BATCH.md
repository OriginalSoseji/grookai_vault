# Pricing Checkpoint 140: Prism Star Alias Mapping Batch

## Status

`14 EXACT MAPPINGS PREPARED; PRODUCTION APPLY PENDING CLEAN MERGE`

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

## Next Gate

Merge the exact registry, planner/apply support, read-only authority builder,
and contracts. Regenerate the plan and authority package from that exact clean
commit, prove rollback through the canonical maintenance launcher, apply the
same frozen package under the production gate, and independently verify all 14
mappings. Mapping and customer price publication remain separate guarded steps.
