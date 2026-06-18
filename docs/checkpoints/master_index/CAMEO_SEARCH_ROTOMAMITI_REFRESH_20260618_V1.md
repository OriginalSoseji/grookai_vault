# CAMEO_SEARCH_ROTOMAMITI_REFRESH_20260618_V1

Date: 2026-06-18

## Purpose

Refresh Grookai's cameo/artwork enrichment lane from RotomAmiti's Cameo Pokemon Card Database.

This checkpoint records an additive enrichment update only. Cameo metadata is descriptive search/artwork intelligence. It is not card identity, finish truth, Species Dex completion, pricing truth, scanner truth, or vault ownership truth.

## Source

- Source: RotomAmiti's Cameo Pokemon Card Database
- URL: https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/htmlview
- Local source audit: `docs/audits/cameo_search_v1/cameo_search_v1_source_audit_20260618.md`
- Match dry run: `docs/audits/cameo_search_v1/cameo_search_v1_phase3_alias_replay_dry_run_20260618.md`
- Delta report: `docs/audits/cameo_search_v1/cameo_search_v1_rotomamiti_refresh_delta_20260618.md`
- Apply proof: `docs/audits/cameo_search_v1/cameo_search_v1_refresh_insert_apply_20260618.md`

## Result

- Existing active RotomAmiti cameo rows before apply: 1,361
- Additive cameo rows applied: 60
- Active RotomAmiti cameo rows after apply: 1,421
- Distinct card parents with RotomAmiti cameo metadata after apply: 896
- Existing preservation-review rows intentionally not deleted: 38

## Governance Rule

Do not seed future RotomAmiti refreshes by `source_row_hash` alone.

The public spreadsheet can move rows, rename rows, or otherwise change row-derived hashes. Future refreshes must compare by logical cameo identity:

- parent `card_print_id`
- cameo subject type
- normalized cameo subject name
- Pokemon national dex number for Pokemon subjects
- normalized trainer key for trainer subjects

Existing cameo rows that disappear from a later source snapshot are preservation-review rows, not automatic deletion candidates.

## Boundaries

Allowed in this package:

- Insert additive rows into `public.card_print_cameos`

Forbidden in this package:

- card identity writes
- child printing writes
- Species Dex writes
- pricing writes
- image writes
- migrations
- deletes

## Verification

- `node --check scripts/audits/cameo_search_v1_audit.mjs`
- `node --check scripts/audits/cameo_search_v1_match_dry_run.mjs`
- `node --check scripts/audits/cameo_search_v1_refresh_delta_v1.mjs`
- `node --check scripts/audits/cameo_search_v1_refresh_insert_guarded_dry_run_v1.mjs`
- `node --test tests/contracts/contract_scope_v1.test.mjs`
- `git diff --check`
- `npm run preflight`
- `git status --short -- supabase/migrations`

Final preflight status: `PASS_WITH_DEFERRED_DEBT`, critical failures `0`.
