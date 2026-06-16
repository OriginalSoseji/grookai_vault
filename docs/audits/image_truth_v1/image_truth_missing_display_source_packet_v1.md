# Image Truth Missing-Display Source Packet V1

Generated: 2026-06-16T05:24:06.629Z

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
- exact-required target rows: 0
- display-only target rows: 2
- source URL preserved: 0
- source URL still needed: 2
- dry-run ready rows: 0

## Rows

| set | queue | card | number | finish | source status | image confidence | dry run ready | source url | printing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mfb | display_only_missing_display | Potion | 33 | normal | representative_source_url_preserved | representative | false | https://www.tcgcollector.com/cards/42807/potion-my-first-battle-squirtle-no-010 | GV-PK-MFB-33-STD |
| mfb | display_only_missing_display | Switch | 34 | normal | representative_source_url_preserved | representative | false | https://www.tcgcollector.com/cards/42808/switch-my-first-battle-squirtle-no-011 | GV-PK-MFB-34-STD |
