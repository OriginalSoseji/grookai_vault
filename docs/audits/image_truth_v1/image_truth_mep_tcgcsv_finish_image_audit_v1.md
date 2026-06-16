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
- target_rows: 20
- representative_candidates: 17
- finish_label_conflict_cosmos_vs_holo: 1
- modifier_variant_excluded: 0
- no_tcgcsv_product_match: 0
- needs_manual_review: 0

## Representative Candidates

| set | number | card | finish | product | image exists | source |
| --- | --- | --- | --- | --- | --- | --- |
| mep | 022 | Charcadet | holo | Charcadet - 022 | true | https://www.tcgplayer.com/product/666538/pokemon-me-mega-evolution-promo-charcadet-022 |
| mep | 023 | Mega Charizard X ex | holo | Mega Charizard X ex - 023 | true | https://www.tcgplayer.com/product/659612/pokemon-me-mega-evolution-promo-mega-charizard-x-ex-023 |
| mep | 024 | Oricorio ex | holo | Oricorio ex - 024 | true | https://www.tcgplayer.com/product/664010/pokemon-me-mega-evolution-promo-oricorio-ex-024 |
| mep | 025 | Mega Kangaskhan ex | holo | Mega Kangaskhan ex - 025 | true | https://www.tcgplayer.com/product/668509/pokemon-me-mega-evolution-promo-mega-kangaskhan-ex-025 |
| mep | 026 | Meloetta | holo | Meloetta - 026 | true | https://www.tcgplayer.com/product/659231/pokemon-me-mega-evolution-promo-meloetta-026 |
| mep | 027 | Haunter | holo | Haunter  - 027 | true | https://www.tcgplayer.com/product/659232/pokemon-me-mega-evolution-promo-haunter-027 |
| mep | 029 | Mega Charizard X ex | holo | Mega Charizard X ex - 029 | true | https://www.tcgplayer.com/product/680639/pokemon-me-mega-evolution-promo-mega-charizard-x-ex-029 |
| mep | 030 | Mega Charizard Y ex | holo | Mega Charizard Y ex - 030 | true | https://www.tcgplayer.com/product/680640/pokemon-me-mega-evolution-promo-mega-charizard-y-ex-030 |
| mep | 032 | Mega Gardevoir ex | holo | Mega Gardevoir ex - 032 | true | https://www.tcgplayer.com/product/685510/pokemon-me-mega-evolution-promo-mega-gardevoir-ex-032 |
| mep | 033 | Mega Lucario ex | holo | Mega Lucario ex - 033 | true | https://www.tcgplayer.com/product/685511/pokemon-me-mega-evolution-promo-mega-lucario-ex-033 |
| mep | 034 | Mega Meganium ex | holo | Mega Meganium ex - 034 | true | https://www.tcgplayer.com/product/692120/pokemon-me-mega-evolution-promo-mega-meganium-ex-034 |
| mep | 035 | Mega Emboar ex | holo | Mega Emboar ex - 035 | true | https://www.tcgplayer.com/product/692119/pokemon-me-mega-evolution-promo-mega-emboar-ex-035 |
| mep | 036 | Mega Feraligatr ex | holo | Mega Feraligatr ex - 036 | true | https://www.tcgplayer.com/product/692118/pokemon-me-mega-evolution-promo-mega-feraligatr-ex-036 |
| mep | 065 | Barbaracle | holo | Barbaracle - 065 | true | https://www.tcgplayer.com/product/685495/pokemon-me-mega-evolution-promo-barbaracle-065 |
| mep | 066 | Tyrantrum | holo | Tyrantrum - 066 | true | https://www.tcgplayer.com/product/685496/pokemon-me-mega-evolution-promo-tyrantrum-066 |
| mep | 068 | Makuhita | holo | Makuhita - 068 | true | https://www.tcgplayer.com/product/686275/pokemon-me-mega-evolution-promo-makuhita-068 |
| mep | 070 | Tyrunt | holo | Tyrunt - 070 | true | https://www.tcgplayer.com/product/685562/pokemon-me-mega-evolution-promo-tyrunt-070 |

## Blocked Or Review

| status | number | card | finish | reason | matched products |
| --- | --- | --- | --- | --- | --- |
| finish_subtype_not_usable | 064 | Serperior | holo | Matched product did not provide an unmodified Holofoil image candidate. | Serperior - 064; Serperior - 064 [Staff] |
| finish_subtype_not_usable | 067 | Doublade | holo | Matched product did not provide an unmodified Holofoil image candidate. | Doublade - 067; Doublade - 067 [Staff] |
| finish_label_conflict_cosmos_vs_holo | 069 | Chikorita | holo | Live TCGCSV product title says Cosmos Holo while the current missing-display target is finish_key=holo. | Chikorita (Cosmos Holo) |

## Rule

Rows with product titles that say Cosmos Holo, Staff, or Pokemon Center Exclusive are not promoted into base holo image coverage. They require a finish/modifier governance decision first.
