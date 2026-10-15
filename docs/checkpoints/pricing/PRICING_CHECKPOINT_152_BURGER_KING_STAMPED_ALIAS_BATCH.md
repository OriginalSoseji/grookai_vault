# Pricing Checkpoint 152: Burger King Stamped Alias Batch

Date: 2026-10-15

## Admitted scope

This extension admits exactly ten TCGPlayer products from Burger King Promos
group `2175`. It adds ten distinct canonical stamped parents and ten missing
price observations to the master-evidence alias batch:

- Diamond & Pearl stamp: Grotle 49, Monferno 56, Prinplup 58, and Pachirisu 35.
- Platinum-stamped Burger King 2009: Chimchar 56, Eevee 62, Piplup 71, Meowth
  106, Pikachu 70, and Turtwig 77.

The selected child finishes are nine Reverse and one Holo. Combined with
checkpoint 151, the pending master-evidence batch now contains 17 products,
17 parents, and 20 price observations across seven canonical sets.

## Evidence boundary

Each selected source product is frozen by product id, group, exact title, and
printed coordinate. The checked-in English Master Index supplies the base card
and generic stamped-printing evidence. Existing governed catalog-adjudication
artifacts supply the exact `diamond_pearl_stamp` or
`platinum_stamped_burger_king_2009` parent and its actual Holo or Reverse child
finish. A checked-in replacement-child adjudication binds four historical
parent/finish artifacts to their sole current governed child, and the dedicated
Piplup apply artifact binds its replacement child directly. The authority
hashes those artifacts, requires the exact child UUID, and rejects drift.

The remaining 14 Burger King products stay blocked. They either lack an exact
governed stamped identity in the catalog, have a source coordinate mismatch, or
need new finish evidence. No group-wide Burger King, Diamond & Pearl, Platinum,
or stamped-card normalization rule is introduced.

## Live rehearsal

A verified-TLS repeatable-read production probe found all ten active source
products, ten unique active standard stamped parents, and ten active,
non-provisional matching children. None has an active source or target
TCGPlayer mapping, and none of the ten children has an active truth review.

The exact-child-bound working-tree planner passed with 48 candidates covering
62 missing price observations, 451 explicitly blocked products, and zero
findings. Canon maintenance dry-run
`7ecdc0ff-6f01-477f-8633-48a315925630` planned all 20 combined master-evidence
truth reviews, proved rollback, and made zero durable writes. Its working
authority fingerprint is
`c0a4c537fa368b359533be876c95ab6e9712f84760c998695ddfc1dedd1dd303`.
Regenerate both artifacts from the exact merged commit before production apply.

Repository validation passed the complete ship check: 7,000-plus Node contract
tests, web type generation, lint, strict production build, Flutter static
analysis, and all 1,421 Flutter tests.

## Release boundary

Merge the extended authority and executors, regenerate the planner and
truth-review rehearsal from the exact merge commit, insert and independently
read back all 20 truth reviews, build the seven-set mapping authority, insert
and independently read back all 17 mappings, then include the new mappings in a
later full-source shadow and guarded production publication. Mapping does not
publish prices.
