# Pricing Checkpoint 135: Scarlet & Violet Promo Reviewed Product Mapping Batch

## Status

`18 EXACT PRODUCT IDENTITIES REHEARSED - SOURCE REVIEW PENDING MERGE`

## Scope

The next bounded Pokémon identity batch covers TCGPlayer group `22872`,
`SV: Scarlet & Violet Promo Cards`, against canonical set `svp`.

It contains exactly 18 source products:

- 17 products whose names explicitly say `Pokemon Center Exclusive` or
  `Pokémon Center Exclusive`, each bound to one exact
  `pokemon_center_stamp` parent and its verified Holo child; and
- product `641610`, `Charizard ex -196`, bound to the exact base parent and
  verified Holo child.

Every registry row freezes the source product ID, raw source name, group,
printed number, parent UUID, parent GV-ID, set UUID/code, canonical name and
number, variant key, child printing GV-ID, finish, provenance source, and
provenance reference.

## Preserved Holds

This batch intentionally excludes unlabeled duplicate products that share the
same coordinates, prerelease/staff products, World Championship products, and
all other aliases. In particular, Paradise Resort 045/150/224 and Pikachu 225
remain outside this package. Their labels do not grant permission to select a
base or stamped parent.

## Policy Boundary

Exact mapping plan policy V1.3 adds one narrow reviewed-product lane. It does
not remove treatment labels, permit arbitrary variants, or broaden set
consensus. Planner and apply admission both require an exact match to the
checked-in 18-row registry. Any source, target, authority-version, active
identity, or mapping-state drift fails closed. Older plans must be regenerated.

## Live Read-Only Rehearsal

Verified-TLS production planning against source sync
`6afde958-f5ca-4ab1-bc0d-47d8db954330` produced exactly:

- 734 source products reviewed;
- 18 candidates in `reviewed_product_identity_authority`;
- 716 blocked products retained;
- 18 projected missing-price observations; and
- zero database, publication, or customer-state writes.

Trial plan artifact:
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/svp-plan-trial-v1/2026-10-14T15-21-14-096Z`.

The authority rehearsal then revalidated all 18 live parents, unique active
standard identities, verified Holo children, source products, source payloads,
and absence of active source/target mapping collisions. It bound the retained
special-variant coverage audit, the published English `svp` Master Index, and a
fresh selected-product TCGCSV snapshot.

- candidate SHA-256:
  `9dbce434a274b2803e1c95f643ec017c43c68b76e9b045fb9cdd833232932537`
- authority SHA-256:
  `93f26157cbe3b178de998959c42ea28e97314945b0e224f786c857532530be86`
- authority fingerprint:
  `1cc17cca5746558a56601b0df58f6541b77ca5394bf9fe10fff308221c306f6d`
- database writes: `0`

Trial authority artifact:
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/svp-authority-trial-v1`.

## Next Gate

Merge the reviewed registry, V1.3 planner/apply policy, authority builder, tests,
and this checkpoint. Regenerate the plan and authority from that exact clean
merged commit. Then run the canonical maintenance dry run, verify rollback, and
apply the single bounded 18-row batch under the founder's standing approval.
Follow with independent mapping readback and a later combined pricing shadow;
mapping alone does not make prices live.
