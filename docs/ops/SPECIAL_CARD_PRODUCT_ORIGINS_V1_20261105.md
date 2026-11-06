# Eevee and Snorlax ETB product descriptions

Status: implemented and verified in an isolated checkout; the user approved the
exact 12-file local commit allowlist. These descriptions are not deployed.

The existing card-origin section on web and mobile resolves these four parents
through the same generated data. This batch replaces their generic Scarlet &
Violet promo-family explanation with product-specific copy. All 3,326 other
row references and all 54 existing family definitions remain unchanged. No
database or Storage update is needed for this content change.

## Reviewed descriptions

| Card | Description shown under “Why it exists” |
| --- | --- |
| Eevee SVP 173, unstamped | Eevee SVP 173 is the full-art foil promo included in the Scarlet & Violet—Prismatic Evolutions Elite Trainer Box. The Pokémon Center edition also includes this unstamped promo alongside a separately stamped copy. |
| Eevee SVP 173, Pokémon Center logo | The Pokémon Center logo version of Eevee SVP 173 was included in the Scarlet & Violet—Prismatic Evolutions Pokémon Center Elite Trainer Box. The box also contains an unstamped copy of the promo. |
| Snorlax SVP 051, unstamped | Snorlax SVP 051 is the full-art foil promo included in the Scarlet & Violet—151 Elite Trainer Box. The Pokémon Center edition also includes this unstamped promo alongside a separately stamped copy. |
| Snorlax SVP 051, Pokémon Center logo | The Pokémon Center logo version of Snorlax SVP 051 was included in the Scarlet & Violet—151 Pokémon Center Elite Trainer Box. The box also contains an unstamped copy of the promo. |

The [official Prismatic Evolutions announcement](https://press.pokemon.com/en/New-Pokemon-Trading-Card-Game-Scarlet-VioletPrismatic-Evolutions-Expan)
and [standard ETB contents](https://www.pokemon.com/uk/pokemon-tcg/product-gallery/scarlet-violet-prismatic-evolutions-elite-trainer-box)
support the Eevee associations. The official [standard 151 ETB](https://www.pokemon.com/uk/pokemon-tcg/product-gallery/scarlet-violet-151-elite-trainer-box)
and [Pokémon Center 151 ETB](https://www.pokemon.com/us/pokemon-tcg/product-gallery/scarlet-violet-151-pokemon-center-elite-trainer-box/)
contents support the Snorlax associations. Sources were rechecked on November 5,
2026 through their indexed product/press contents; direct gallery opens returned
an iframe shell. Source-access methods and bounded supporting facts are recorded
in the packet rather than claiming direct full-page retrieval.

Each entry also explains the logo distinction, identifies the printed promo
number and artwork, and links its official sources. This is documented product
distribution, without an assertion about any individual owned copy's origin,
scarcity, market value or sole lifetime distribution.

## Current images and live evidence

The fresh production audit verified project `ycdxbpibncqcchqiihfz`, TLS and
172,418 parents, 3,411 sets, 32,903 traits and 317 vault-view rows. SQL used a
read-only connection and transaction. The four current private warehouse image
objects were downloaded through the existing shared backend client and inspected
directly. Names, English printed numbers, artwork and logo presence/absence all
match. The two Pokémon Center image hashes also match the preserved October 28
references. No image replacement is proposed.

All six existing child rows remain unchanged. The unstamped parents have no
direct child-image fields; the two stamped Holo children already point to the
same stored images as their parents. This parent review does not newly certify
every child finish or resolve the extra Normal/Reverse child claims. Product
contents alone are not authority to alter child truth.

Source receipts and the four actual downloaded images remain outside Git at
`C:/grookai_vault_operator_artifacts/special_card_product_origins_20261105`.
The checked-in packet contains the exact public parent UUID/GV-ID bindings,
source URLs, bounded distribution associations and current image hashes.

## Regeneration and verification

The offline exporter is a final overlay after the existing family/exact promo
origin exports. Regenerate web copy first, then mobile:

```powershell
node scripts/audits/export_special_card_etb_origins_v1.mjs
node scripts/audits/export_variant_origin_mobile_data_v1.mjs
```

It requires the exact four UUID/GV-ID bindings, both lookup indexes, the frozen
baseline payload fingerprint, distinct card-specific family keys and official
source documents. Out-of-scope drift, weak sources, logo mismatch, expansion of
the cohort or write proposals reject. Repetition is byte-stable. A changed
upstream origin dataset requires a fresh preservation review and packet; do not
edit the frozen hash to force acceptance.

Verification passed: 10 Node contracts, including the actual web resolver and
card-explanation builder; 8 Flutter tests using the actual mobile lookup; complete
mobile/web payload parity; web typechecking; focused Flutter analysis; and
`git diff --check`. All unrelated row references and family text remain intact.
The full managed release hook has not run for this candidate yet.

The source-owner V2 production repair is already complete at producer
`feb5c0ec72ddc4d3a7f74bf63a9a320deeec57ff`. Preserve its active Gengar price
suppression and do not replay the correction worker. This content batch changes
neither that pricing scope nor the missing ordinary Fennekin mapping.

## Release boundary

Checkout: `C:/gv_special_card_product_origins_20261105`.
Branch: `codex/special-card-product-origins-20261105`.
Stage only the explicitly approved 12-file
`docs/audits/special_card_product_origins_v1_20261105/release_allowlist.txt`.
Run the normal managed release hook when committing. Deployment and native
distribution require their own concrete release checks and authorization; this
local content preparation has published neither.

This first batch covers the user's Eevee/Snorlax examples. The broader promo,
retailer, STAFF and error inventories remain review work; unresolved identity
and visual conflicts from the earlier packets remain held.
