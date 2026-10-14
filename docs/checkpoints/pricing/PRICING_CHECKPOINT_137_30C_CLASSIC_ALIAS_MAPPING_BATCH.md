# Pricing Checkpoint 137: 30th Celebration Classic Alias Mapping Batch

## Status

`2 EXACT ALIAS MAPPINGS REHEARSED - CODE REVIEW AND CLEAN PACKAGE PENDING`

## Scope

This batch closes the two explicitly held products from TCGPlayer group `24837`,
`ME: 30th Celebration Classic Collection`:

- `716158`, `Genesect EX (Team Plasma)`, coordinate `11/101`, maps only to the
  canonical `30c-classic` parent `Genesect EX`, `11/101`;
- `716198`, `Gengar (Prime)`, coordinate `94/102`, maps only to the canonical
  `30c-classic` parent `Gengar`, `94/102`.

The parenthetical text is a TCGPlayer explanatory label for the historical card
mechanic. It is admitted only through two exact product tuples. Global name
normalization remains unchanged and cannot discard `(Team Plasma)` or `(Prime)`.

## Live Read-Only Rehearsal

Verified-TLS production planning against source sync
`6afde958-f5ca-4ab1-bc0d-47d8db954330` found exactly two candidates and retained
732 blocked products. Both candidates use the reviewed-product lane and project
one missing-price observation each.

The authority rehearsal independently revalidated both live source products,
unique active standard parents, one active public non-provisional Holo child per
parent, exact printing GV-IDs, retained provenance, two raw-import evidence rows,
and absence of source or target mapping collisions.

- plan candidates SHA-256:
  `1ed14d239acabfe109f3e04071c738eca6b578ad5f4990d426d16fcb1bb85e56`
- trial authority SHA-256:
  `6f0d5bb80d3491aceb4d6b97c67a1a0e70dca33c9490aab2db5d308663f3711e`
- trial authority fingerprint:
  `8fa8c58c19e86e403e867cb860ad69561bf63d630030a6f7b6d42b1c46bc102a`
- database writes: `0`

Trial artifacts are retained under
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/30c-classic-alias-plan-trial-v1`
and `30c-classic-alias-authority-trial-v1`.

## Next Gate

Run repository validation and review, merge the code, regenerate the plan and
authority from the exact clean merged commit, execute the canonical rollback dry
run, apply the two production mappings, and independently read them back. The
queued combined pricing shadow may count these products only if it starts after
the mapping commit. Pricing publication and independent price readback remain
separate gates.
