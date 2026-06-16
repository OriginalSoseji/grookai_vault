# Image Truth Missing-Display Asset Manifest V1

Generated: 2026-06-16T05:25:34.935Z

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
- representative image URLs preserved: 2
- blocked asset rows: 0
- dry-run ready rows: 0

## Rows

| set | card | number | finish | source status | asset status | confidence | dry run ready | asset url |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mfb | Potion | 33 | normal | representative_source_url_preserved | representative_image_url_preserved | representative | false | https://static.tcgcollector.com/content/images/93/94/9a/93949a37c6bce0729b8acadcd8ea2bd74b61c3a2bb1c530ab0bc4d1c1f18d366.jpg |
| mfb | Switch | 34 | normal | representative_source_url_preserved | representative_image_url_preserved | representative | false | https://static.tcgcollector.com/content/images/b5/85/2b/b5852b142843af94406599c6f6c81088785705fe6a2b95ad8bb9a813fdd265e1.jpg |
