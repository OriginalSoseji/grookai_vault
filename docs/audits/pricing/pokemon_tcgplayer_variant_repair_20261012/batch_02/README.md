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
invented Normal children. Each assignment is pinned to its reviewed TCGCSV product
hash, candidate fingerprint, pricing observation, sync run, artifact, and source-row
hash. The plan fingerprint also covers the complete evidence manifest.

Before any production mutation, the implementation must pass a Gym catalog
identity rollback rehearsal, a Gym runtime binding rollback rehearsal, a retained
schema rehearsal for the exact finish override, and a combined read-only pricing
evaluation. Price publication remains a later, separately approved operation.

`rehearsal.json` is the deterministic, no-write expansion of this plan against
the hash-bound production read-only snapshot. It allocates four fresh Gym
Challenge edition parent, identity, and printing rows with four staged binding
templates, plus two append-only Mega Evolution Promo finish overrides. Its
combined evaluation keeps all six observations explicitly held by the current
runtime and records the result expected only after the next local schema
rehearsal. Production database writes, price publications, and customer-state
writes remain at zero. Run
`node scripts/pricing/build_pokemon_tcgplayer_variant_repair_rehearsal_v1.mjs`
to reproduce it while the retained snapshot is available locally.

`mep_schema_rollback_rehearsal.json` records the next completed gate. Migration
`20261012193000_pokemon_tcgplayer_reviewed_finish_override_v1.sql` adds a V3
candidate projection that accepts only the two fully reviewed MEP overrides,
keeps the raw TCGPlayer subtype `Normal`, and presents the governed canonical
finish as `holo`. A local PostgreSQL transaction proved both rows eligible,
rejected a changed source-row hash, and rejected an active hidden printing-truth
review. The V3 projection keeps source-run and product selectors directly
pushable for bounded worker paging. The transaction rolled back and verified
that the new view and validation function were absent afterward. No database or
price write was committed. Gym edition runtime binding was then handled by its
separate assignment ledger and rollback rehearsal.

`gym_edition_assignment_rollback_rehearsal.json` records that separate Gym gate.
Migration `20261013123000_pokemon_tcgplayer_gym_challenge_edition_assignment_v1.sql`
keeps the Jungle ledger unchanged and adds Gym-specific binding, assignment, and
pipeline foreign-key columns. The V4 candidate projection accepts only the four
reviewed product/subtype identities, resolves them to the four freshly allocated
edition parents and Normal children, and preserves the V3 MEP override behavior.
The local PostgreSQL transaction proved all four rows policy-eligible, rejected a
changed source-row hash, rejected an active hidden printing-truth review, accepted
the Gym FK while rejecting the same UUID as a Jungle FK, and rolled back every
schema and data write. The historical June identifiers were not reused. The
receipt is bound to migration SHA-256
`8166cd477de08e59e5c0103d4702d9e14faf2ad559b26e6fb0d0dec1705a1d9a`.
Production database, price-publication, and customer-state writes remain zero.

The production preflight on October 13 found that the reviewed source-product
SHA is artifact provenance and does not equal the warehouse ingestion hash.
Migration `20261014003500_pokemon_tcgplayer_gym_challenge_binding_identity_v2.sql`
therefore keeps that reviewed SHA immutable while validating the live TCGPlayer
product by exact category, group, product ID, product name, and printed number.
Daily observation IDs, row hashes, artifacts, and prices remain frozen in a new
assignment for each latest completed source run. The revised rollback rehearsal
passed across the reviewed October 12 run and the current October 13 run, including
the changed Unlimited price for product 85721, with zero committed writes.

The next gate is a retained full-schema rollback rehearsal followed by a combined
read-only evaluation of all six batch rows. Catalog identity creation, binding
activation, schema deployment, and price publication remain separately guarded.
