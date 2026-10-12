# Pokémon TCGPlayer variant repair — batch 02

This package gives the six prices left by batch 01 two exact owners and a fixed
execution order. It is a reviewed plan only. It authorizes no database or price
publication write.

The four Gym Challenge observations require explicit First Edition and Unlimited
canonical identities for cards 75 and 76. Production currently contains only the
two generic parents and their normal children. A June package once created
first-edition rows, but those rows are no longer live; its receipt is retained as
lineage and is not treated as permission to recreate or reuse them.

The two Mega Evolution Promo observations require no new catalog printing.
TCGPlayer calls each price row `Normal`, while the frozen TCGdex and English Master
Index evidence classify Inteleon 002 and Lunatone 004 as holo-only. The plan binds
those two source rows to the existing holo children and explicitly forbids creating
invented Normal children.

Before any production mutation, the implementation must pass a Gym catalog
identity rollback rehearsal, a Gym runtime binding rollback rehearsal, a retained
schema rehearsal for the exact finish override, and a combined read-only pricing
evaluation. Price publication remains a later, separately approved operation.
