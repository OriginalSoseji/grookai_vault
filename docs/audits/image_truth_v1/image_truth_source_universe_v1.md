# Image Truth Source Universe V1

Generated: 2026-06-14

Status: discovery only. No DB writes. No image promotion. No warehouse apply. No migrations.

Scope: English physical cards only. Pocket, digital, experimental, unresolved set rows, and unknown identity rows are excluded from image-repair authority.

## Current English Physical Image Shape

Read-only audit of current reconciled DB:

| metric | rows |
| --- | ---: |
| English physical child printings | 36,227 |
| Exact child image required | 13,890 |
| Exact child image missing | 13,890 |
| Already exact child image | 0 |

Coverage state for the 13,890 exact-required rows:

| current display state | rows | meaning |
| --- | ---: | --- |
| using_parent_exact_image | 13,724 | Display is covered, but finish/variant image truth is not exact. |
| using_parent_representative_image | 148 | Display is covered by representative fallback only. |
| missing_display_image | 18 | No useful display image is currently available. |

Exact-image-required rows by finish:

| finish family | rows | source difficulty |
| --- | ---: | --- |
| reverse | 12,866 | Very high volume; easiest source identity, hardest exact image scale. |
| cosmos | 348 | Product/promo pages often useful; exact image uneven. |
| pokeball | 230 | Needs modern parallel-specific source images. |
| holo review/modifier rows | 153 | Mixed; some are identity modifier/stamp driven. |
| cracked_ice | 131 | Good marketplace/product-page prospects. |
| normal modifier rows | 85 | Usually stamped/alternate-product identity. |
| masterball | 67 | Modern parallel-specific source required. |
| rocket_reverse | 10 | Small, source-specific, likely tractable. |

Repo source inventory:

| inventory | count |
| --- | ---: |
| source fixture JSON files scanned | 1,041 |
| source evidence records scanned | 214,699 |
| first missing-display packet source URL coverage | 18 / 18 |
| first missing-display packet exact source image URLs | 5 / 18 |

## Source Universe

| source | current Grookai presence | coverage estimate | image availability | exact child image support | representative image support | finish support | stamp/variant support | confidence | recommended usage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grookai child image storage | Live columns on `card_printings` | 0 exact rows today | Supports `image_path`, `image_url`, `image_alt_url`, `image_status`, `image_note` | Yes, once populated | N/A | Any finish if externally proven | Any modifier if externally proven | High as storage, empty as source | Final canonical child-image target only. |
| Grookai parent images | Live on `card_prints` | Covers most display fallback | Existing parent/base images | No for child-specific finishes | Yes | Base card only | No | Medium | Display fallback only; never overwrite for finish repair. |
| Warehouse submissions / normalized assets | Existing `ENRICH_CARD_PRINTING_IMAGE` path | Candidate-based | Can freeze normalized front asset | Yes when submission is exact target | Yes if only representative | Depends on submitted card | Strong for scans/submissions | High after review | Best write path after source proof and dry-run. |
| TCGdex | Existing source and fixtures | Broad set/card coverage | Card object has `image`; example image URL is card-level | Usually no; one image per card/localId | Yes | `variants.normal/reverse/holo/firstEdition` booleans | Limited; variants improving but not image-specific | High for base identity, medium for variant existence | Base image fallback and variant existence, not exact finish image authority. See TCGdex card object docs: https://tcgdex.dev/reference/card |
| Pokemon TCG API / PokemonTCG.io / Scrydex | Existing source and snapshots | Broad English card coverage | Card object exposes `images.small` and `images.large` URLs | Usually no; one card image, not finish-specific | Yes | Prices include normal/holofoil/reverseHolofoil keys | Limited | High for base representative image | Good representative source and set/card identity, not exact child finish image. Docs: https://docs.pokemontcg.io/api-reference/cards/card-object/ |
| Official Pokemon galleries / card database | Existing fixture lane, manually supported | Modern/current sets strongest | Official card art/card database pages | Usually base/card-level, not all variants | Yes | Set/card identity; finish detail varies | Limited for promos/products | High for official identity, medium for exact image | Tier 1 for official representative images and modern set identity; exact finish only when page/product proves it. https://tcg.pokemon.com/en-us/all-galleries/ and https://www.pokemon.com/us/pokemon-tcg/pokemon-cards |
| PriceCharting | Existing preservation, live verifier added for packet | Strong product-page long tail | Product pages often expose product image URLs with alt text | Yes when separate product page title + image alt prove set/card/finish | Yes | Strong for reverse, cosmos, cracked ice, stamps, promos | Strong for product/stamp pages | High after exact title+alt verification | Best early exact-image source for product-specific rows. Must preserve source URL and image alt/title. |
| TCGCSV / TCGplayer catalog | Existing fixtures | Strong product/catalog coverage | Product pages/TCGplayer assets likely available; extractor incomplete | Potentially yes where product ID is finish-specific | Yes | Strong product subtype labels | Strong for TCGplayer product variants | Medium until image extraction is hardened | Use for source URLs and product identity now; add image extractor next. Docs: https://tcgcsv.com/docs |
| TCGCollector | Existing generated fixtures | Broad collector checklist coverage | Pages may include images but Cloudflare/browser behavior can block automation | Variant identity yes; image extraction not yet reliable | Yes via visible page | Strong explicit variant labels | Good for stamps/variants | High for source identity, medium for image acquisition | Use as exact source URL/evidence; do not rely on unattended image scrape yet. |
| BinderBuilder | Existing generated fixtures | Useful set/variant checklist coverage | Image availability not proven globally | Variant identity yes; image extraction not proven | Yes/unknown | Good visible variant labels | Some stamp/product labels | Medium | Use as corroborating exact variant evidence; image extraction later. |
| JustTCG | Existing pricing/mapping source | Large API: Pokemon listed as 30K+ cards and 200K+ variants | Unknown image fields for Grookai use; API key required | Potentially strong if variant/image fields exist | Likely | Strong variant/pricing model | Potentially strong | Medium-low until image schema tested | Evaluate with API key for variant-specific image fields. Docs: https://justtcg.com/docs/quickstart and support claims: https://justtcg.com/supported-games |
| Existing Master Index fixtures | Existing preservation source universe | Very broad | Mostly source URLs/evidence, not images | Exact identity often; images vary by source | Yes | Strong for finishes | Strong for stamped/odd products | High for evidence, variable for images | Primary evidence map for deciding where to fetch images. |
| Existing warehouse image sources | Existing promotion candidates | Submission-dependent | Normalized front assets | Yes if matched to exact `card_printing_id` | Yes | Any finish if matched | Any variant if matched | High after founder review | Use for user/submission-backed exact image capture. |
| PkmnCards | Existing fixture presence | Broad searchable card pages | Website has card images and explicit card pages | Usually card-level; may include modern custom sets from current fixture history | Yes | Finish support varies | Some promo/stamp support through pages | Medium; licensing caution | Useful manual/reference source, not automatic bulk image authority without terms review. Copyright notice present: https://pkmncards.com/ |
| Bulbapedia | Existing fixture lane | Excellent checklist/detail coverage | Page images exist but often illustrative/file-level | Rarely exact finish image | Yes/identity | Strong release/product detail | Strong for promos/products | High for evidence, low for image acquisition | Evidence and adjudication, not primary image source. |
| Serebii Cardex | Discovered | Broad card database | Cardex pages include pictures | Usually card-level representative | Yes | Set/card detail | Some special variants | Medium | Good candidate for representative fallback and manual spot checks. https://www.serebii.net/card/dex |
| PokeBeach | Discovered | News/promos/new cards | High-quality revealed scans in articles | Strong for recent promos/reveals when article is exact | Yes | Good for new/revealed cards | Strong for promos/pre-release news | Medium with licensing caution | Manual source for recent unreleased/promotional gaps. Copyright caution from site. |
| Pokellector | Existing fixture name present in Master Index | Broad checklist/images likely | Images likely per card | Usually representative | Yes | Set checklist variants vary | Some promos | Medium | Candidate extractor later; not first exact source. |
| Cardmarket | Existing fixture evidence | European marketplace | Product/listing images may exist | Potentially exact when product/expansion/number/foil match | Yes | Foil/nonfoil support | Some variants | Medium | Use as second-source and manual image candidate; licensing/API terms review required. |
| CardTrader | Existing fixture evidence | Marketplace catalog | Product images likely | Potentially exact | Yes | Variant/product detail | Some stamps | Medium | Later marketplace image candidate; do not bulk scrape without terms review. |
| eBay Browse | Mentioned wired externally | Marketplace/listings | Listing images | Exact physical item images, not canonical | No canonical by default | Yes for owned/listing proof | Strong for stamped/odd variants | Low-to-medium | Use for manual visual proof or owned-copy validation, not canonical source image without policy. |
| PokeWallet | Discovered API | Claims 50K+ cards; images endpoint | Authenticated `/images/:id` endpoint returns binary image low/high sizes | Unknown until API tested; likely card-level | Yes | Unknown | Unknown | Medium-low | Candidate paid/API source. Must test exact variant mapping before use. Docs: https://www.pokewallet.io/api-docs |
| Pokemon-api.com | Discovered commercial API | Claims 50K+ cards/products and high-res images | CDN images advertised | Unknown | Likely | Unknown | Unknown | Low until tested | Candidate commercial source; evaluate contract and variant model. |
| Kaggle/community image datasets | Discovered | Potentially broad static archives | Bulk images | Usually representative; provenance varies | Yes | Weak finish proof unless labeled | Weak | Low | Do not use as authority; possible QA/reference only after license review. |
| Reddit/forums/PokeGym/community scans | Discovered | Spotty long-tail | User-uploaded scans/photos | Possible exact physical evidence | No bulk | Strong only case-by-case | Useful for odd variants | Low-to-medium manual only | Manual adjudication only, not automated canonical ingestion. |

## Core Finding

Image truth is not a single-source problem. The reliable path is a layered model:

1. Source evidence proves the printing/finish identity.
2. Source image or submitted image proves the visual.
3. Normalized Grookai asset preserves the image.
4. Dry-run proves only `card_printings` image fields change.
5. Real apply only after exact target proof.

No source may update parent `card_prints` for a child-printing image repair.
