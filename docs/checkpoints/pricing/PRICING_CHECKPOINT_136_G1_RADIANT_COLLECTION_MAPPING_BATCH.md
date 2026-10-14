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
active finish keys, current non-hidden truth-review state, English Master Index
card/printing rows, and absence of source or target mapping collisions. Current
null child provenance values are preserved exactly where the governed
production row has null provenance; no provenance was invented.

- full candidate SHA-256:
  `a9890b9bd2fb728fe38def81957b3c586e68dd7b954fd6cb557abf7cf83a16a0`
- batch 1 selected SHA-256:
  `8bc2aee3491813b2f95a35487ff631421c82a39c32b7af964afe5d4b97db36e5`
- batch 1 authority SHA-256:
  `71bc9996a44af221edbc9655faf34635e62da1b3c21cfc3391c020347ddcdc5c`
- batch 1 authority fingerprint:
  `22cf487c830ad33589e438d961112e117c3cab44e4a2050aa90a75699bf7010f`
- batch 2 selected SHA-256:
  `99f2fb08f12058ecc93eeb79109dc99fd8a11f460e8741a264fea41d75974401`
- batch 2 authority SHA-256:
  `dc05e0ba09cf096ae197918700567c4a855597be49e903320c64897031520575`
- batch 2 authority fingerprint:
  `ab42d60f49bbd64c26398e06a7f773e386ee417f7fdbe83c88fe8130c249fd3c`
- database writes: `0`

Trial authority artifact:
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/g1-rc-authority-trial-v2`.

## Next Gate

Run repository validation and review, merge the code, regenerate the plan and
both packages from the exact clean merged commit, execute canonical rollback
dry runs, apply the two production batches, and independently read back all 32
mappings. Then run pricing shadow and exact publication before claiming prices
live.
