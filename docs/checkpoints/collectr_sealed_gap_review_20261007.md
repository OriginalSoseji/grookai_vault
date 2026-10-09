# Collectr sealed gap review and product scopes

Baseline: main ea7368a3267d5555d6c8d444682388640ebc92b7 / PR609. Its import is
complete: 1,620 accounted copies, 541 review rows, 1,331 source groups and
3,227 owner copies. All earlier receipts are consumed. Do not replay them.

The batch covers every remaining sealed-identity/metadata row: 51 source rows
and 101 copies. The fresh read-only snapshot contains 5,828 variants and complete
frozen releases: Pokemon 1,651 members, MTG 2,046 and One Piece 332. Similarity
searches are investigation leads only; they never produce import selections.

The local candidate repairs three exact products:

- Blooming Waters Premium Collection: the complete label under Collectr's
  Miscellaneous Cards & Products group can use its reviewed 151 product mapping.
- Mew VMAX League Battle Deck: the complete label under Silver Tempest can use
  its reviewed Fusion Strike mapping. Other decks and expansion aliases stay held.
- Temporal Forces Elite Trainer Box [Iron Leaves]: accept the catalog's full
  Iron Leaves ex label only for the standard kit in Temporal Forces. Walking Wake,
  Pokemon Center exclusives, cases and unqualified ETBs are not interchangeable.

Identity references: [Blooming Waters provider product](https://www.tcgplayer.com/product/609597/pokemon-miscellaneous-cards-and-products-blooming-waters-premium-collection),
[official Mew deck](https://www.pokemon.com/us/pokemon-tcg/product-gallery/mew-vmax-league-battle-deck),
[standard Temporal Forces ETB](https://www.pokemon.com/us/pokemon-tcg/product-gallery/scarlet-violet-temporal-forces-elite-trainer-box),
and [separate Pokemon Center ETB](https://www.pokemon.com/us/pokemon-tcg/product-gallery/scarlet-violet-temporal-forces-pokemon-center-elite-trainer-box).
Source-group exceptions are our reviewed interpretation of those product facts,
the original export and the existing frozen mappings; not a provider claim about
Collectr's internal grouping policy. Product details are evidence; prices are not.

Fresh public whole-file preview uses 297 read-only requests. Four source rows /
four copies qualify, projecting 1,624 accounted copies and 537 review rows.
Three Mew rows retain their six copies for acquisition-cost review. Every other
preview row and all 1,331 saved source-group selections remain unchanged.
All 959 importer contracts and the TypeScript check pass. This is local proof,
not deployment or a new import. No schema, catalog or permission change occurred.

## Next batch dependency: exact acquisition-cost precision

Five rows / 16 copies (Mew decks and Zapdos collections) have valid recorded
average costs with nonzero fractional cents. The live instance column is
unconstrained numeric, but sealed_metadata.ts and admin_import_vault_collection_v3
currently require exact whole cents. Do not round the source values, distribute
costs among copies, edit source documents or bypass that writer validation.

Prepare an additive, independently gated writer migration and matching parser
change for exact supported decimal precision. First run the linked-schema audit,
inventory dependent read/write paths, and preserve deferred migrations. Prove
exact source/target/copy equality, totals, bounds, malformed-input rejection,
unchanged existing receipts, retry recovery and rollback in an isolated lab.
Check every cost display/edit path affected before a production release.
Existing retained labs may not be reset or deleted for this work.

Other held products need catalog admission/release, corrected catalog metadata,
language support, or owner package choices. A same-name case is not the individual
box. Surging Sparks retail and LGS bundles remain distinct. Morpeko's truncated
source label remains unverified. Pikachu V-UNION's four-card set is not a sealed
product merely because its source collector number is empty.

Private evidence, source rows and next-action ledger live outside the repository:
`C:/grookai_vault_operator_artifacts/collectr_sealed_gap_review_20261007/`.
Its CHECKPOINT.json owns actual release status. The separate graded-item
preference is pending; do not infer consent to certificate-free slab handling.
