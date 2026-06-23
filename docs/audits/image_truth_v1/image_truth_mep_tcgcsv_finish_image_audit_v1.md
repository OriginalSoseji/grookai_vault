# Image Truth V1 MEP TCGCSV Finish/Image Audit

This is a read-only source discovery report. It does not upload images, update card_printings, update parent card_prints, create migrations, or promote image truth.

## Safety

- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- parent_overwrite_allowed: false
- target_table: card_printings

## Summary

- source: TCGCSV live TCGplayer catalog
- source_url: https://tcgcsv.com/tcgplayer/3/24451/products
- target_rows: 4
- representative_candidates: 2
- finish_label_conflict_cosmos_vs_holo: 0
- modifier_variant_excluded: 0
- no_tcgcsv_product_match: 0
- needs_manual_review: 0

## Representative Candidates

| set | number | card | finish | product | image exists | source |
| --- | --- | --- | --- | --- | --- | --- |
| mep | 065 | Barbaracle | holo | Barbaracle - 065 | true | https://www.tcgplayer.com/product/685495/pokemon-me-mega-evolution-promo-barbaracle-065 |
| mep | 066 | Tyrantrum | holo | Tyrantrum - 066 | true | https://www.tcgplayer.com/product/685496/pokemon-me-mega-evolution-promo-tyrantrum-066 |

## Blocked Or Review

| status | number | card | finish | reason | matched products |
| --- | --- | --- | --- | --- | --- |
| finish_subtype_not_usable | 064 | Serperior | holo | Matched product did not provide an unmodified Holofoil image candidate. | Serperior - 064; Serperior - 064 [Staff] |
| finish_subtype_not_usable | 067 | Doublade | holo | Matched product did not provide an unmodified Holofoil image candidate. | Doublade - 067; Doublade - 067 [Staff] |

## Rule

Rows with product titles that say Cosmos Holo, Staff, or Pokemon Center Exclusive are not promoted into base holo image coverage. They require a finish/modifier governance decision first.
