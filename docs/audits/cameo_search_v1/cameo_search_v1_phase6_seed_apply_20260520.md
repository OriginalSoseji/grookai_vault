# CAMEO_SEARCH_V1 Phase 6 Seed Apply

Date: 2026-05-20

## Scope

Guarded seed apply for `card_print_cameos`. Only Phase 3 `APPROVED_MATCH` rows were eligible.

## Inputs

- Phase 3 evidence: `docs\audits\cameo_search_v1\cameo_search_v1_phase3_alias_replay_dry_run_20260520.json`
- Phase 3 evidence hash: `7a1e4fb220fba0a192a9351caa6359f96d7649358b2647b1cabd8d23613e4001`
- Approved candidates loaded: 1360

## Database Precheck

- card_print_cameos exists: true
- Target card_print rows found: 845
- Target rows missing parent GV-ID: 0
- Existing source hash collisions: 0

## Seed Payload

- Candidate payload rows: 1360
- Duplicate source hashes in payload: 0
- Excluded non-approved Phase 3 rows: 1033
- Japanese/language-scope blocked rows in payload: 0

## Future Write Boundary

Future apply may insert only into `public.card_print_cameos` after the migration is applied and a fresh dry run passes.

Disallowed writes remain:

- public.card_prints
- public.card_printings
- public.pokemon_species
- public.card_print_species
- pricing tables
- scanner tables
- warehouse tables

## Decision

Seed transaction committed after all guards and post-apply checks passed.

## Confirmations

- DB writes limited to `public.card_print_cameos` inserts.
- No migrations were applied by this worker.
- No search resolver changes.
- No app changes.
- No Species Dex changes.
- No scanner changes.
- No pricing changes.
