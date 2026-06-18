# CAMEO_SEARCH_V1 RotomAmiti Refresh Delta

Date: 2026-06-18

## Scope

Refresh/delta audit for RotomAmiti cameo source data. This is additive enrichment evidence only; it is not card identity, finish truth, Species Dex ownership, pricing, scanner behavior, or vault truth.

## Source

- Source URL: https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/htmlview
- Source audit: `docs\audits\cameo_search_v1\cameo_search_v1_source_audit_20260618.json`
- Match dry run: `docs\audits\cameo_search_v1\cameo_search_v1_phase3_alias_replay_dry_run_20260618.json`
- Local TLS workaround used: false

## Summary

- Current source rows: 3991
- Current approved deterministic matches: 1383
- Existing active DB cameos: 1361
- Current approved source-hash overlap: 206
- New logical cameo candidates: 60
- Existing logical cameos not present in current sheet: 38
- Current source conflicts: 132

## Decision

Do not seed by `source_row_hash` alone. The public source workbook has row/hash volatility, so refresh promotion must be keyed by logical cameo identity: parent card, subject type, subject name, and subject identifier.

The 259 new logical candidates are additive review/apply candidates. The 237 existing cameos missing from the current logical source view are preservation-review candidates, not deletion candidates.

## New Candidates By Set

| Set | Rows |
| --- | ---: |
| SV Promos | 14 |
| Chaos Rising | 13 |
| MEP Promos | 13 |
| Unbroken Bonds | 3 |
| Burning Shadows | 2 |
| Gym Heroes | 2 |
| Hidden Fates | 2 |
| Team Rocket | 2 |
| Ancient Origins | 1 |
| BREAKthrough | 1 |
| Chilling Reign | 1 |
| Lost Origin | 1 |
| Lost Thunder | 1 |
| Neo Revelation | 1 |
| Perfect Order | 1 |
| Silver Tempest | 1 |
| SM Promos | 1 |

## New Candidates By Tab

| Tab | Rows |
| --- | ---: |
| Trainers | 17 |
| Gen 1 | 14 |
| Gen 6 | 9 |
| Gen 9 | 7 |
| Gen 4 | 5 |
| Gen 3 | 3 |
| Gen 2 | 2 |
| Gen 5 | 2 |
| Gen 7 | 1 |

## Promotion Rule

A future apply package may insert only logical-new `APPROVED_MATCH` rows that do not already exist by logical cameo identity. It must not deactivate or delete existing cameos solely because the current source workbook no longer exposes the same logical row.

## Confirmations

- No DB writes.
- No migrations.
- No card identity changes.
- No child printing changes.
- No Species Dex changes.
- No pricing changes.
- No image writes.
