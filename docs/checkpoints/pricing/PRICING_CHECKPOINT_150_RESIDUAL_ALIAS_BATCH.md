# Pricing Checkpoint 150: Residual Reviewed Alias Batch

Date: 2026-10-15

## Admitted scope

This batch freezes exactly 24 TCGPlayer products and 24 distinct canonical
parents across 11 English Pokémon sets. It covers 30 missing-price observations:
15 Holo, 9 Normal, and 6 Reverse printings. The product-specific registry
includes LEGEND top and bottom labels, Prism Star symbols, promo qualifiers,
gender and spelling aliases, abbreviated Energy names, Professor's Research
labels, and other display-only source differences.

Every tuple binds the exact product ID, source group, source title, full printed
coordinate, canonical parent UUID, GV-ID, set UUID, and all source-listed
finishes. No global normalization rule is added.

## Evidence and rehearsal

Production read-only scope verification passed against project
`ycdxbpibncqcchqiihfz`: 171,758 parents, 3,404 sets, and 32,903 traits satisfy
the canonical environment gates. The 24 products, 24 parents, and 30 active
non-provisional children have no active source or target mappings. Each parent
and child is independently `master_verified` in the checked-in English Master
Index with at least two evidence sources.

The development exact-mapping plan selected this batch plus the seven preceding
energy aliases: 31 products and 42 observations, with zero findings. The
residual authority builder filters that combined read-only plan to its exact
24-product registry. Canonical maintenance dry-run
`bd43e44f-e164-4857-8952-b36ff22aa197` planned all 30 truth reviews, proved
rollback, and made zero durable writes.

## Explicit holds

Nine rows are excluded from this batch: seven Victory Cup products collapse
onto three award parents; the Unbroken Bonds Fairy Charm row already exposes
multiple verified children; and Scarlet & Violet promo Pikachu 225 has no child
matching the source subtype. Two Professor Willow products and two WoTC Mew
products are also held because each pair competes for one canonical parent.
Five more rows lack a complete matching Master Index scope or exact card match.

## Release boundary

Merge the registry and executors, regenerate the combined plan from the exact
merged commit, apply and independently read back the 30 reviews, build the
11-set mapping authority, apply and independently read back the 24 mappings,
then run a later full-source shadow and guarded production publication. Mapping
does not publish prices.
