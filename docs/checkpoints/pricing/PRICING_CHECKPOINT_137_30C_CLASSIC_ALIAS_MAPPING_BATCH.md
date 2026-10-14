# Pricing Checkpoint 137: 30th Celebration Classic Alias Mapping Batch

## Status

`2 EXACT ALIAS MAPPINGS APPLIED AND INDEPENDENTLY VERIFIED`

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

PR `#655` merged at `360f2c672fb08f5482467a855d31b1528e76a7c4` after all
required checks passed. Clean-commit regeneration preserved exactly two
candidates and produced authority fingerprint
`0a6901a7176636b547916dc7fbaa0890f578408fd3992cdc80672e4af3f67e26`.
The canonical dry run `a70a11d2-13e2-4bd8-9e00-b2e3cfb74121` proved rollback
with zero writes. Production maintenance run
`1c0bb37f-a618-4494-9a25-60e43126c7e0` then inserted and read back exactly two
active mappings, with zero publication or customer-state writes.

Independent repeatable-read verification confirmed both exact live source
products, active mappings, canonical parents, and governed public Holo
printings. The earlier combined shadow had entered candidate staging before the
mappings committed, so workflow run `38605006449` is queued at the exact merged
commit for a fresh combined shadow. Pricing production publication and
independent price readback remain separate gates.
