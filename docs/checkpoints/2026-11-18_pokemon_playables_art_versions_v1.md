# Pokémon playable artwork versions — November 18, 2026

The owner requested applicable full-art and SIR versions alongside ordinary
playable cards. The live starting snapshot had 147 qualified printings within
292 retained metadata members, with only one qualified Ultra Rare printing.

An exact-name candidate audit found 200 additional artwork candidates, including
48 SIR candidates. Names and rarities select candidates only. Classification
still requires existing unique active canonical ownership, verified identity,
exact coordinates and matching structured mechanics.

The audit exposed an artwork field incorrectly splitting gameplay identities:
TCGdex documents `cameoDexIds` as additional Pokémon depicted in the artwork.
See the [official schema](https://github.com/tcgdex/cards-database/blob/master/interfaces.d.ts).
Current usage mechanics V2 excludes that field and records its version in each
snapshot. The legacy source-profile comparison remains unchanged, preserving
existing hashes and retained-original validation. Unknown fields, attacks,
abilities, costs, effects, HP and types still distinguish profiles.

All 153 mapped candidates were checked against fresh TCGdex originals. The
preliminary expanded pool adds 120 exact gameplay matches, including 32 SIRs,
for 412 metadata members. Twenty-two of those matches were previously split
only by artwork cameos. Original metadata is stored privately before parsing.
Same-name cards with different mechanics, ambiguous ownership or coordinate
conflicts are held; 47 candidates without an active TCGdex mapping are not
promoted or assigned fabricated mappings.

The focused engine suite passes 20 tests, including an end-to-end artwork-cameo
case that shares support without double counting. The test also preserves
source integrity, legacy profile distinction and unknown-mechanic exclusion.
Normal managed hooks, hosted review and publication readback remain required
before this candidate is called live. No schema, canonical identity, mapping,
pricing or ownership writer is part of this change.

Metadata audit, original seed backup, fresh captures and preview evidence are
retained locally in `.tmp/pokemon_playables_art_versions_20261118`. Source is
isolated in `.tmp/pokemon_playables_art_versions_checkout_20261118`, branch
`feat/pokemon-playables-art-versions-20261118`, based on
`0a873488ed81554fcc1e40cb7b229e850f397dd2`. Preserve unrelated root work.
