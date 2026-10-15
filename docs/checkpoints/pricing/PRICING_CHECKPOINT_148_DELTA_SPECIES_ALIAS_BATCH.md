# Pricing Checkpoint 148: Delta-Species Alias Batch

Date: 2026-10-15

## Admitted scope

This batch admits exactly 12 TCGPlayer products covering 21 missing-price
observations across three English sets:

- EX Holon Phantoms: Delta Rainbow Energy 98, four Deoxys formes 3–6, and
  Gyarados Star 102.
- EX Dragon Frontiers: Delta Rainbow Energy 88 and Nidoran F/M 56–57.
- POP Series 4: Chimecho 1, Deoxys 2, and Treecko 15.

TCGPlayer spells out `Delta Species`, gender letters, formes, and `Star` in its
display names. The canonical Master Index uses the printed `δ`, `♀`, `♂`, and
`★` symbols. Every mapping is frozen by exact product ID, group, source title,
full printed coordinate, target parent UUID, GV-ID, and set UUID. No global name
normalization rule is added.

## Finish evidence

The 12 parents have 21 source-listed children: six Holo, seven Normal, and
eight Reverse. Every finish is present as an active, non-provisional child and
is independently `master_verified` in the checked-in English Master Index with
at least two evidence sources. The bounded truth-review executor inserts one
verified, visible review for each of those 21 children before mapping authority
can be built.

The initial production rollback rehearsal passed with zero durable writes under
maintenance run `21210b2f-f234-4181-98a4-30ddb4dda026` and authority fingerprint
`6e13c29cdb45c15ad4a60a7fb7c28063892aceb94ff4b7b9b81acb1dd590cff3`.

## Release boundary

Production requires the normal clean-commit release sequence: merge the exact
registry and executors, regenerate the 12-row plan from that merged commit,
dry-run and apply the 21 truth reviews, independently read them back, build the
three-set mapping authority, dry-run and apply the 12 mappings, and independently
read them back. Prices remain separate and require a fresh full-source shadow,
publication gate, and price readback.

Victory Cup products and any source products that collide on one canonical
parent remain held for their own physical-variant evidence.
