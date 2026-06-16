# Image Truth IMG-16B Exact Photo Source Evidence Pilot V1

Generated: 2026-06-15T04:39:05.238Z

This is audit-only. It fetches source pages and writes reports only. It does not upload images, update DB rows, create migrations, clean up, quarantine, or promote image confidence.

## Summary

- source_rows: 25
- exact_ready_rows: 0
- candidate_exact_asset_needs_visual_review_rows: 0
- blocked_rows: 25
- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- parent_overwrite_allowed: false
- fingerprint: c0af897c3402fb53e7374908db48e86896130811445e64c0da98609b648e653c

## Status Counts

| status | rows |
| --- | --- |
| blocked_variant_label_without_exact_asset | 25 |

## Reason Counts

| reason | rows |
| --- | --- |
| source_proves_variant_but_image_urls_are_card_level_or_unproven | 25 |

## Row Results

| set | number | card | finish | source | status | reason |
| --- | --- | --- | --- | --- | --- | --- |
| bwp | BW13 | Minccino | cosmos | cardtrader | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bwp | BW25 | Scraggy | cosmos | cardtrader | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bwp | BW34 | Luxio | cosmos | cardtrader | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 3 | Servine | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 5 | Serperior | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 17 | Pignite | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 19 | Emboar | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 29 | Dewott | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 31 | Samurott | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 54 | Scolipede | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 63 | Sandile | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 65 | Krookodile | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 71 | Zoroark | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 74 | Klink | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 75 | Klang | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw1 | 76 | Klinklang | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw10 | 13 | Volcarona | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw2 | 30 | Beartic | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw2 | 49 | Roggenrola | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw2 | 51 | Boldore | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw2 | 53 | Gigalith | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw2 | 62 | Krookodile | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw3 | 12 | Accelgor | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw3 | 80 | Escavalier | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |
| bw4 | 20 | Chandelure | cracked_ice | tcgcollector | blocked_variant_label_without_exact_asset | source_proves_variant_but_image_urls_are_card_level_or_unproven |

## Decision

No row from this pilot is ready for image apply. The source pages prove or support variant existence, but the discovered image assets are card-level or otherwise not proven to show the exact finish.

## Guardrail

A source can prove that a variant exists without proving that its displayed image is an exact variant asset. Those two facts remain separate.
