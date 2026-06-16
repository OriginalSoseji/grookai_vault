# Image Truth Coverage Projection V1

Generated: 2026-06-14

Status: discovery only. No DB writes. No image promotion. No warehouse apply. No migrations.

Scope: English physical `card_printings` only.

## Current Baseline

| metric | rows |
| --- | ---: |
| English physical child printings | 36,227 |
| Exact-image-required rows | 13,890 |
| Exact child images currently present | 0 |
| Exact child images currently missing | 13,890 |

Current display state among exact-image-required rows:

| display state | rows |
| --- | ---: |
| using parent exact image | 13,724 |
| using parent representative image | 148 |
| no display image | 18 |

Interpretation:

Grookai can display most rows today, but it cannot honestly claim exact image truth for visually distinct child printings. Parent fallback is display coverage, not exact child-image truth.

## Critical Questions

### 1. How many of the 13,890 English physical image-truth rows could theoretically be solved?

Projection:

| category | projected solvable rows | confidence |
| --- | ---: | --- |
| Exact source identity exists in current/preserved source universe | 13,000+ | Medium-high |
| Exact source image likely available from marketplace/product/checklist pages | 8,000-12,000 | Medium |
| Exact image likely needs manual/owned-scan capture | 1,500-5,000 | Medium |
| Permanently difficult without new source/license/access | 500-2,000 | Medium-low |

Reasoning:

The Master Index source universe already contains 214,699 evidence records and large reverse-holo/checklist lanes. The problem has shifted from proving printings exist to extracting/storing exact image assets safely.

### 2. Which sources provide exact child-printing imagery?

Confirmed or high-potential exact image sources:

| source | exact image capability |
| --- | --- |
| PriceCharting | Confirmed on first packet: 5 exact source image URLs found where product image alt/title matched exact card/finish. |
| Warehouse/owned scans | Exact if submitted image is tied to exact `card_printing_id` and founder-reviewed. |
| TCGplayer/TCGCSV | High potential; exact product pages and product IDs exist, but image extractor needs hardening. |
| TCGCollector | Exact variant identity; image extraction not yet automation-safe. |
| Cardmarket/CardTrader | Potential exact product/listing image; terms/extractor review needed. |
| Official product pages | Exact only when page/product is specifically the variant/finish. |

### 3. Which sources only provide representative imagery?

Representative-first sources:

| source | why representative |
| --- | --- |
| Pokemon TCG API | Card object has `images.small`/`images.large`, while finish-specific pricing keys are separate from image URLs. |
| TCGdex | Card object has card-level `image` and variant booleans, not separate finish images. |
| Official Pokemon galleries/card database | Usually card-level gallery image, not parallel/finish image. |
| Serebii | Cardex images are useful card-level representation. |
| Bulbapedia | Strong evidence source, but page images are not usually exact finish image authority. |

### 4. Which finish families are easiest?

| finish family | rows | ease | reason |
| --- | ---: | --- | --- |
| missing-display reverse/cosmos subset | 18 | Easy | First packet has 18/18 source URLs; 5 exact source images already found. |
| cracked_ice | 131 | Easy-medium | Product titles usually include Cracked Ice Holo. |
| rocket_reverse | 10 | Easy-medium | Small count; likely manual/source-specific. |
| cosmos | 348 | Medium | Product pages often exist, but exact image URL may not always be exposed. |
| normal modifier/stamped rows | 85 | Medium | Requires identity modifier correctness and product page image. |

### 5. Which finish families remain difficult?

| finish family | rows | difficulty | blocker |
| --- | ---: | --- | --- |
| reverse | 12,866 | Scale-hard | Source identity is common, but exact reverse image extraction at scale is heavy. |
| pokeball | 230 | Source-hard | Needs parallel-specific exact source images. |
| masterball | 67 | Source-hard | Same as pokeball, smaller count but higher trust sensitivity. |
| stamped/product variants | mixed | Evidence-hard | Many labels/products; image must not collapse to base card. |

### 6. Shortest path to coverage goals

#### 100% display coverage

Target: 18 missing-display English physical exact-required rows.

Path:

1. Normalize the 5 exact source image URLs from the first asset manifest.
2. Add TCGplayer/TCGCSV and/or manual browser capture for the remaining 13.
3. Dry-run one row.
4. Apply only after proof, then batch the rest.

Expected effort: low.

#### 80% exact-image coverage

Target: about 11,112 exact child images.

Path:

1. Build PriceCharting and TCGplayer/TCGCSV image extractors.
2. Generate exact-source image candidates for reverse holo rows first.
3. Store only normalized assets with exact source URL/alt/title proof.
4. Dry-run buckets by source + finish + set family.

Expected effort: medium-high. Main cost is extractor robustness and asset normalization.

#### 95% exact-image coverage

Target: about 13,196 exact child images.

Path:

1. Complete 80% path.
2. Add pokeball/masterball/cosmos/cracked_ice/stamped special lanes.
3. Add manual or owned-scan workflow for rows missing public exact images.
4. Use representative fallback only where exact image remains unproven.

Expected effort: high. This is a multi-source program, not a single script.

## Recommended Image Truth Roadmap

### Phase 1 - Quick Wins

Scope:

- 18 missing-display English physical rows.
- Start with the 5 rows that already have exact source image URLs.

Outputs:

- normalized Grookai storage assets
- rollback-only dry-run proof
- one-row apply proof
- no parent overwrites

### Phase 2 - High Confidence Exact Images

Scope:

- PriceCharting exact product image extractor
- TCGplayer/TCGCSV product image extractor
- cracked_ice, cosmos, small reverse subsets

Outputs:

- source-image manifests by source
- normalized storage packets
- child-only dry-run packages

### Phase 3 - Difficult Finish Families

Scope:

- reverse holo at scale
- pokeball/masterball
- stamped/product-exclusive rows

Outputs:

- source-specific exactness contracts
- conflict queue
- manual review queue

### Phase 4 - Long-Tail Variants

Scope:

- rows lacking public exact images
- odd promos/stamps
- old league/prize variants
- rows requiring owned-copy scan or eBay/manual proof

Outputs:

- manual/owned-scan workflow
- representative-only fallback policy
- source exhaustion report

## Final Recommendation

Do not begin global image writes yet.

The next safe engineering task is:

```text
IMG-01B: Normalize the 5 exact source image URLs from the missing-display asset manifest into a non-production staging asset packet, then generate a rollback-only dry-run proving only target card_printings image fields would change.
```

That proves the same loop as the Master Index reconciliation, but for images:

```text
source evidence -> exact image asset -> child target -> dry-run proof -> apply approval -> post-apply verification
```
