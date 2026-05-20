# CAMEO_SEARCH_V1 Phase 8 Resolver Regression

Date: 2026-05-20

## Scope

Regression checks for the DB search RPC after the cameo search document integration migration is replayed or applied.

## Results

- `pikachu`: SKIPPED; top=none; label=none
- `pikachu cameo`: SKIPPED; top=none; label=none
- `aerodactyl cameo`: SKIPPED; top=none; label=none
- `acerola cameo`: SKIPPED; top=none; label=none
- `GV-PK-CRE-30`: SKIPPED; top=none; label=none

## Checks

- cameo_columns_present: true
- probe_checks_pass: true
- no_public_cameo_uuid_columns: true
- species_dex_snapshot_present_or_local_empty: true
- phase7_semantic_dry_run_passed: true

## Confirmations

- No DB writes.
- No UI changes.
- No Species Dex changes.
- No scanner changes.
- No pricing changes.
