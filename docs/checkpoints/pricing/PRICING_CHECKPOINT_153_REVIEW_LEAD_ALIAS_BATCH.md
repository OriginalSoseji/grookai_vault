# Pricing Checkpoint 153: Review-Lead Alias Batch

Date: 2026-10-16

## Admitted scope

This batch freezes six TCGPlayer products with six distinct canonical parents
and seven exact source-listed printings across EX Dragon Frontiers, SM Promos,
Unbroken Bonds, and Scarlet & Violet Promos:

- Charizard Star (Delta Species) 100/101 to `Charizard ★ δ` Holo.
- Bulbasaur SM198 In-Store Event Promo to the existing Holo child.
- Fairy Charm L 172/214 to `Fairy Charm Lightning` Normal and Reverse.
- Paradise Resort 045, 150, and 224 World Championship base products to their
  exact numbered Normal children.

Every tuple binds the exact product ID, group, source title, full printed
coordinate, parent UUID, GV-ID, child UUID, child GV-ID, finish, and current
source payload identity. No global Star, Delta Species, Energy-letter, promo,
or World Championship normalization is added.

## Evidence and current price effect

Verified-TLS production readback found all six active source products, six
unique active standard parents, and seven active non-provisional children with
no source or target mapping. The checked-in English Master Index verifies every
selected card and finish with at least two sources.

Fairy Charm's Normal and Reverse children already have active verified visible
truth reviews. The bounded maintenance task therefore requires those two exact
reviews and inserts only the five missing reviews. The latest reconciled shadow
contains positive source prices for Bulbasaur, both Fairy Charm finishes, and
Paradise Resort 150 and 224. Charizard and Paradise Resort 045 currently have
null source market prices; mapping makes their identities ready but cannot
invent a price.

The development full planner passed against source run
`71e7350b-8594-4d1d-885c-dbe46cb2f7fe` and cloud backlog run `38897095172`.
It admitted all six frozen rows and seven observations with no findings. Canon
maintenance dry-run `2bd41515-0d67-4e5f-aa72-1e7d75627e46` verified the live
products, parents, printings, exact existing review IDs, and zero mappings; it
proved rollback with zero durable writes. Its development authority fingerprint
is `66f8c8bf1976d7d7d12eb174fae581d4ac1af164df461f979c629b8345267cd1`.
Regenerate the plan and dry-run from the exact merged commit before production.

## Explicit holds

Pikachu 225 is excluded because TCGPlayer reports `Normal` while the current
canonical children are Reverse and stamped. Victory Cup award variants,
Champions Festival placement variants, WoTC Mew/Pikachu collisions, Professor
Willow duplicates, Jungle edition splits, and the remaining stamped promo rows
stay held for variant-specific authority.

## Release boundary

Regenerate the exact six-product plan from the merged commit. Dry-run and apply
the five missing truth reviews, independently read back all seven governed
printings, build the four-set mapping authority, dry-run and apply the six
mappings, and independently read them back. Then run a fresh full-source shadow
and the separate guarded price publication. Mapping never substitutes a price
for the two null source observations.
