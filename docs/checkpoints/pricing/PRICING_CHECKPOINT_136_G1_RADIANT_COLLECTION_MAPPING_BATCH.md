# Pricing Checkpoint 136: Generations Radiant Collection Mapping Batch

## Status

`32 EXACT MAPPINGS REHEARSED - CODE REVIEW AND CLEAN PACKAGE PENDING`

## Scope

This bounded batch covers all 32 products in TCGPlayer group `1729`,
`Generations: Radiant Collection`, against canonical set `g1`. Each product is
bound to one exact `rc` parent from `RC1` through `RC32` and its existing
governed child printing.

The checked-in registry freezes source product ID, raw name, group, printed
number, parent UUID, parent GV-ID, set UUID/code, canonical name and number,
variant key, child printing GV-ID, finish, and current provenance. This handles
source labels such as `(Full Art)`, accent differences, and `EX` punctuation
only through exact reviewed tuples. It does not relax global name or variant
matching.

## Policy Boundary

Plan policy V1.3 now consults both reviewed-product registries through one
fail-closed path. A reserved source product ID cannot fall through to general
matching if its raw source identity drifts. Planner and apply validation both
require the registry's exact target and authority version.

The canonical writer remains capped at 25 rows, so this package is split into
two immutable batches of 25 and 7. Mapping publication remains separate from
price shadow and price publication.

## Live Read-Only Rehearsal

Verified-TLS production planning against source sync
`6afde958-f5ca-4ab1-bc0d-47d8db954330` produced exactly:

- 734 source products reviewed;
- 32 candidates in `reviewed_product_identity_authority`;
- 702 blocked products retained;
- 32 projected missing-price observations; and
- zero database, publication, or customer-state writes.

Trial plan artifact:
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/g1-rc-plan-trial-v1/2026-10-14T16-10-37-979Z`.

The authority rehearsal independently revalidated all 32 live source products,
parents, unique active standard identities, governed non-provisional children,
English Master Index card/printing rows, and absence of source or target mapping
collisions. Current null child provenance values are preserved exactly where
the governed production row has null provenance; no provenance was invented.

- full candidate SHA-256:
  `a9890b9bd2fb728fe38def81957b3c586e68dd7b954fd6cb557abf7cf83a16a0`
- batch 1 selected SHA-256:
  `8bc2aee3491813b2f95a35487ff631421c82a39c32b7af964afe5d4b97db36e5`
- batch 1 authority SHA-256:
  `ce2d142fb4f65ce5df315fd5af0fc18b51e1e8330d89c38e58c0ae6374943bed`
- batch 1 authority fingerprint:
  `38aa4f700b93f5b4216cf86d2da195eddeea60ea120805ca87c143d31a69681c`
- batch 2 selected SHA-256:
  `99f2fb08f12058ecc93eeb79109dc99fd8a11f460e8741a264fea41d75974401`
- batch 2 authority SHA-256:
  `f39ed01789255c9cdd66cfba829595a6075c7c9aa151f9c72f9cf47d3a5881b8`
- batch 2 authority fingerprint:
  `cbddb6f93ecbeae069d3bf58b21d0c9f8ae4e030ee5095e317695f76d9b531e8`
- database writes: `0`

Trial authority artifact:
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/g1-rc-authority-trial-v1`.

## Next Gate

Run repository validation and review, merge the code, regenerate the plan and
both packages from the exact clean merged commit, execute canonical rollback
dry runs, apply the two production batches, and independently read back all 32
mappings. Then run pricing shadow and exact publication before claiming prices
live.
