# Image Truth Missing-Display Source Packet V1

Generated: 2026-06-23T04:10:12.701Z

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
- full English physical missing-display rows: 2
- target rows reviewed: 2
- exact-required target rows: 2
- display-only target rows: 0
- source URL preserved: 2
- representative source URL preserved: 0
- source URL still needed: 0
- source URL review needed: 0
- dry-run ready rows: 0

## Rows

| set | queue | card | number | finish | source status | image confidence | dry run ready | source url | printing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mep | exact_required_missing_display | Serperior | 064 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/serperior-holo-64 | GV-PK-MEP-064-STAFF-STAMP-HOLO |
| mep | exact_required_missing_display | Doublade | 067 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/doublade-holo-67 | GV-PK-MEP-067-STAFF-STAMP-HOLO |
