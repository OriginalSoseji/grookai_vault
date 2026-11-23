# One Piece numbered singles incorrectly held as packaged products

The exact November 22 missing-price census identified 357 existing One Piece
printings with positive TCGplayer Market quotes excluded only as
`unsupported_product_kind`. Their individual card titles mention a Premium Card
Collection or Pre-Release Tournament. The unchanged V2 candidate view already
binds each product to its unique, governed canonical parent and exact finish,
including official-number equality, but deliberately exposes the legacy
`has_printed_number_evidence = false` flag. The packaged-product title filter
therefore rejects these otherwise qualified singles.

Additive product-scope V2.1 admits this specific existing authority lane only
when all unique mapping/identity/finish assertions still hold and the source
contains exactly one valid One Piece printed Number and exactly one recognized
single-card CardType (Leader, Character, Event, or Stage). The exact promotion
authority, original staging UUID and source group must agree. Missing, duplicate,
untyped, ungoverned, ambiguous or conflicting rows keep the previous result.
The legacy source flag is not rewritten. A new evidence field records the
product, group, original authority, printed number and type behind the decision.

Five frozen source examples reproduce the defect and pass the new behavior:
Luffy 515361, Blast Breath 546671, Gum-Gum Giant Gavel 587229, Edward.Newgate
649709 and Zoro 694877. A read-only replay of all 357 previously held actual
candidates changed exactly those 357 exclusions to publication decisions, each
with a positive source quote and no other hold. No production data was written.
These counts describe this reconciled cohort, not every missing-price record.

V1.1–V1.6 and V2 product classifiers remain available unchanged. English Pokémon,
Magic, Japanese Pokémon, ordinary One Piece singles, the Cosmo treatment holds,
sealed products and all non-scope qualification/freshness checks retain their
behavior. Worker V1_27 requires a new complete same-runtime shadow before
guarded activation. It must not reuse the V1_26 publication shadow or assume
that a positive quote alone authorizes a printing.

No schema, canonical parent/child, mapping, source quote, owner, image, percentage
estimation or valuation formula changes are included. Release requires both
complete normal hooks, actual merged-source hosted checks, exact live schema
compatibility, a fresh complete source generation, a full same-source shadow
with no publication limit, guarded activation and independent current-reader,
condition, privacy and continuity acceptance. Preserve other active releases;
finish the V1_26 backend acceptance before starting a second publication writer.

Private read-only impact evidence is under
`C:/grookai_vault_operator_artifacts/numbered_singles_price_guard_20261122/positive-hold-impact-v1/`.
