# Super Games League Title Review Checkpoint V1

Date: 2026-06-22

## Purpose

Capture the audit-only Super Games League & Championship Cards source pass for the remaining League Stamp exact-finish queue.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- fixtures_created: false
- write_ready_created: 0

## Source

- Source: Super Games Inc.
- Source URL: `https://www.supergamesinc.com/catalog/pokemon_singles-pokemon_league__championship_cards/5846`
- Source kind: marketplace_checklist

## Results

- target current queue rows: 56
- products loaded: 220
- review rows with explicit active finish and missing explicit set name: 0
- crosshatch/title review rows: 9
- explicit-finish rows not in current queue: 16

## Decision

This source is useful for review, but not enough for automatic promotion.

Reason:

- Super Games product titles often prove card name, number, stamp family, and marketplace finish label.
- The page/category does not consistently prove exact set binding in the title.
- “Crosshatch Holo” is a pattern/source label and must not be blindly promoted to Grookai active finish truth.

## Generated Artifacts

- `docs/audits/english_master_index_source_exhaustion_v1/supergames_league_title_review_v1/supergames_league_title_review_v1.json`
- `docs/audits/english_master_index_source_exhaustion_v1/supergames_league_title_review_v1/supergames_league_title_review_v1.md`

## Next Pickup

Use Super Games as supporting review evidence only.

Do not create write packages from this source unless another independent source or an exact product page proves:

- set
- card number
- card name
- exact stamp/variant
- active finish

Continue with source acquisition on League Stamp exact finish and Prize Pack second-source lanes.
