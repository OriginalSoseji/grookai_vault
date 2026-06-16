# Image Truth Source Hierarchy V1

Generated: 2026-06-14

Status: discovery only. No DB writes. No image promotion. No warehouse apply. No migrations.

Scope: English physical `card_printings` only.

## Source Priority

### Tier 0 - Existing Grookai Proof And Storage

Use these to decide whether a row can be written, not to discover external image truth.

| source | role | why |
| --- | --- | --- |
| Master Index verified printing facts | Identity authority | Determines whether the child printing should exist. |
| `card_printings` image columns | Canonical target | Only safe table for child-printing image truth. |
| Warehouse normalized assets | Write asset source | Best place to store exact images after review. |
| Warehouse `ENRICH_CARD_PRINTING_IMAGE` path | Execution path | Already targets child printings and avoids parent overwrites. |

Rule: Tier 0 does not create image truth by itself. It stores and executes proof from external/owned sources.

### Tier 1 - Exact Source Image Candidates

Use first when they can prove exact set + number + card name + finish and expose a stable image URL or captureable asset.

| source | recommended usage |
| --- | --- |
| PriceCharting product pages | Best first source for reverse, cosmos, cracked ice, stamped/product variants where product title and image alt match exactly. |
| TCGplayer/TCGCSV product pages | High-value next extractor because TCGplayer product IDs often distinguish finish/product subtype. |
| Warehouse/owned scans | Strongest exact proof after target matching and founder review. |
| Official product/gallery pages | Tier 1 only when page/product explicitly proves the exact printing/finish; otherwise representative. |

Promotion rule: Tier 1 rows still require normalized Grookai asset plus rollback-only dry-run proof before DB writes.

### Tier 2 - Exact Identity, Image Extraction Not Yet Safe

Use to find and preserve source URLs, then add source-specific image extraction later.

| source | recommended usage |
| --- | --- |
| TCGCollector | Excellent variant evidence; image scraping is blocked/variable, so preserve URL and use manual/browser capture workflow first. |
| BinderBuilder | Good checklist/variant corroboration; image extraction not proven globally. |
| Cardmarket / CardTrader | Potential exact marketplace/product images; requires terms and extractor work. |
| Bulbapedia product/card pages | Great release/product evidence; images are not generally exact finish authority. |
| PkmnCards | Useful page/image reference, but licensing and finish-specific certainty require caution. |

### Tier 3 - Representative Image Sources

Use for display coverage when exact child image is unavailable, but never mark `image_status=exact`.

| source | recommended usage |
| --- | --- |
| Pokemon TCG API | Strong base-card representative images. Docs expose `images.small` and `images.large`; prices may distinguish finish but images are one card image. |
| TCGdex | Strong base-card representative images and variant booleans; image field is card-level. |
| Official Pokemon card database/galleries | Official representative card images and modern gallery coverage. |
| Serebii Cardex | Useful representative/QA source. |
| Pokellector | Useful checklist/image source, but exact finish support must be proven per set. |

### Tier 4 - Candidate/Manual/Long-Tail Sources

Use only for manual adjudication or future paid/API evaluation.

| source | recommended usage |
| --- | --- |
| JustTCG | Promising because it tracks Pokemon variants at scale, but image fields and exact variant image authority need API testing. |
| PokeWallet | Promising because it exposes an authenticated image endpoint; exact variant mapping must be tested. |
| Pokemon-api.com | Commercial candidate; requires contract/API evaluation. |
| PokeBeach | Useful for new promos/reveals; licensing and article context make it manual-first. |
| eBay Browse | Good physical visual proof; not canonical art source. Use for manual confirmation or owned-copy proof. |
| Kaggle/community archives | QA/reference only unless licensing and provenance are verified. |

## Finish Family Priority

| finish family | hierarchy | reason |
| --- | --- | --- |
| missing-display reverse/cosmos | PriceCharting -> TCGplayer/TCGCSV -> TCGCollector -> manual | First packet proved all 18 missing-display rows can get source URLs, and 5 exact source images were found. |
| cracked_ice | PriceCharting -> TCGplayer/TCGCSV -> TCGCollector | Product names often include Cracked Ice Holo. Small set: 131 rows. |
| rocket_reverse | PriceCharting/TCGCollector/manual | Small set: 10 rows. Exact source acquisition likely tractable. |
| cosmos | PriceCharting -> product/promo pages -> TCGplayer/TCGCSV | Product pages can expose exact image, but some pages lack exact image alt. |
| pokeball/masterball | Official/TCGCollector/marketplace pages -> manual | Needs modern parallel-specific exact source. Product page support may be uneven. |
| standard reverse | PriceCharting/TCGplayer/TCGCSV at scale -> representative fallback | Very large: 12,866 rows. Source identity is easy; exact images at scale require source extraction automation. |
| stamped/product variants | TCGplayer/TCGCSV -> PriceCharting -> Bulbapedia/product pages -> eBay/manual | Exact identity is often product-specific; image acquisition must avoid generic base images. |

## Recommended Enforcement Rules

1. `exact` image confidence requires either:
   - source image URL on a page whose title/alt text proves set + card + number + finish, or
   - founder-reviewed normalized warehouse/owned scan tied to exact `card_printing_id`.
2. `representative` image confidence is allowed for display fallback only.
3. `guessed` is not a valid image confidence.
4. Exact child image writes may only target `card_printings`.
5. Parent images must never be overwritten to repair a child finish.
6. Digital/Pocket/non-physical rows stay blocked from English physical image repair.
7. DB writes require rollback-only dry-run proof.

## Shortest Path By Goal

### 100% Display Coverage

Current missing display inside English physical exact-required queue is 18 rows. The fastest safe route:

1. Use PriceCharting/TCGplayer/TCGCollector source URLs already preserved for 18/18.
2. Normalize the 5 exact PriceCharting image URLs first.
3. For the remaining 13, add extractors or manual capture.
4. Dry-run one-row, then bucket apply.

This reaches display coverage without solving all exact finish imagery.

### 80% Exact-Image Coverage

80% of 13,890 rows is about 11,112 exact child images.

Fastest plausible route:

1. Build PriceCharting + TCGplayer/TCGCSV source-image extractors.
2. Attack reverse holo first because it is 12,866 rows and has the largest source surface.
3. Use parent image fallback only for display while exact assets are queued.

This is feasible only if marketplace/product image extraction scales legally and technically.

### 95% Exact-Image Coverage

95% of 13,890 rows is about 13,196 exact child images.

Requirements:

1. Reverse holo pipeline must solve most of the 12,866 reverse rows.
2. Add cosmos, cracked ice, pokeball/masterball, and stamped/product-specific lanes.
3. Use manual/owned-scan capture for rows where public sources lack exact images.

This is not a one-source path. It requires Tier 1 + Tier 2 extractors plus manual long-tail handling.
