# Image Truth Missing-Display Source Packet V1

Generated: 2026-06-23T03:56:40.838Z

Status: audit only. No DB writes. No migrations.

## Guardrails

- image_scope: english_physical only
- target_table: card_printings
- parent_overwrite_allowed: false
- source_url_required: true
- image_confidence_allowed: exact, representative, or missing_variant_visual
- guessed_confidence_allowed: false
- dry_run_required_before_db_write: true

## Summary

- source fixture records loaded: 77028
- full English physical missing-display rows: 5
- target rows reviewed: 5
- exact-required target rows: 5
- display-only target rows: 0
- source URL preserved: 4
- representative source URL preserved: 1
- source URL still needed: 0
- source URL review needed: 0
- dry-run ready rows: 0

## Rows

| set | queue | card | number | finish | source status | image confidence | dry run ready | source url | printing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mep | exact_required_missing_display | Serperior | 064 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/serperior-holo-64 | GV-PK-MEP-064-STAFF-STAMP-HOLO |
| mep | exact_required_missing_display | Barbaracle | 065 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/barbaracle-holo-65 | GV-PK-MEP-065-STAFF-STAMP-HOLO |
| mep | exact_required_missing_display | Tyrantrum | 066 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/tyrantrum-holo-66 | GV-PK-MEP-066-STAFF-STAMP-HOLO |
| mep | exact_required_missing_display | Doublade | 067 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/doublade-holo-67 | GV-PK-MEP-067-STAFF-STAMP-HOLO |
| misc | exact_required_missing_display | Ancient Mew | 1 | cosmos | representative_source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/ancient-mew | GV-PK-MISC-001-COSMOS |
