# Image Truth Missing-Display Asset Manifest V1

Generated: 2026-06-23T04:10:25.425Z

Status: audit only. No DB writes. No migrations.

## Guardrails

- image_scope: english_physical only
- target_table: card_printings
- parent_overwrite_allowed: false
- source_url_required: true
- representative card-identity rows may only become representative assets, not exact assets
- normalized_asset_required_before_dry_run: true
- dry_run_required_before_db_write: true

## Summary

- source rows reviewed: 2
- source image URLs preserved: 0
- representative image URLs preserved: 0
- blocked asset rows: 2
- dry-run ready rows: 0

## Rows

| set | card | number | finish | source status | asset status | confidence | dry run ready | asset url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mep | Serperior | 064 | holo | source_url_preserved | asset_not_found_or_not_exact | representative | false | - |
| mep | Doublade | 067 | holo | source_url_preserved | asset_not_found_or_not_exact | representative | false | - |
