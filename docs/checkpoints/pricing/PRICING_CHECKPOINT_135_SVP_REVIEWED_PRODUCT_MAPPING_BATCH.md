# Pricing Checkpoint 135: Scarlet & Violet Promo Reviewed Product Mapping Batch

## Status

`18 EXACT MAPPINGS APPLIED AND INDEPENDENTLY VERIFIED - PRICING SHADOW PENDING`

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
identity, or mapping-state drift fails closed. Existing V1.2 evidence packages
remain verifiable, but the reviewed-product lane requires V1.3.

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

## Review Repair And Merge

PR `652` found and fixed one fail-closed issue before merge. A reserved reviewed
product ID whose source title drifted could otherwise fall through to the
general set-consensus lane. The final planner blocks any mismatch on a reserved
ID before general matching, and apply validation independently rejects a
fingerprint-valid forged candidate. The exact Koraidon-to-base fallback has a
contract regression test.

All repository checks passed and the PR merged at commit
`8be8ec9f98d27a80faf92a353b1a1dfbde6e5d7a`.

## Clean Package And Production Apply

The clean plan and authority were regenerated from the exact merged commit with
`tracked_worktree_clean: true`. They retained the same 18 candidates and exact
source-candidate SHA-256:
`9dbce434a274b2803e1c95f643ec017c43c68b76e9b045fb9cdd833232932537`.
The fresh authority SHA-256 is
`e15b9755cc2d7fafb85d582697c52d363c75b0906ad5d44973f037f02c8a4d9a`
and its fingerprint is
`1969ed0b3d9e1234ac31e050395f20bcc3ce150fc8cc8392bae480a67565859d`.

The canonical maintenance dry run `58971657-a7dc-49ea-b0ea-806c9bdf1dd0`
selected all 18 rows, found zero active-publication overlap, and proved rollback
with zero writes. Production maintenance run
`6122d6a6-6151-400c-a190-d086c606a4ab` then committed and read back exactly 18
insert-only mappings. It reported a certain commit, zero repairs, zero
publication writes, and zero customer-state writes.

A separate repeatable-read, read-only probe reloaded current source products,
active mappings, parents, and printings without consuming the writer's
readback. It verified all 18 exact source identities, all 18 active mappings to
their frozen parents, all 18 governed printings, and the maintenance run ID.

## Pricing Publication Gate

The mapping rows are live, but their prices are not yet claimed live. Pricing
must pass the queued combined shadow, production publication against that exact
verified shadow, and independent price readback. Evidence-blocked aliases and
unlabeled duplicate products remain held for later reviewed batches.
