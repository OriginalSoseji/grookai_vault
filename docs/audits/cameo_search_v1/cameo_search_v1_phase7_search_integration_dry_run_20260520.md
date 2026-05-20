# CAMEO_SEARCH_V1 Phase 7 Search Integration Dry Run

Date: 2026-05-20

## Scope

Read-only proof that approved cameo metadata can extend print identity search documents without becoming identity and without wiring UI/search resolver changes.

## Summary

- Active cameo rows: 1360
- Distinct cameo parent cards: 845
- Current search documents: 67123
- Proposed cameo-enriched parent documents: 845
- Public cameo view raw UUID columns: 0

## Probe Results

### pikachu

- Top result: Pikachu (GV-PK-AR-71)
- Top source: identity
- Cameo results: 42
- Checks passed: true

### pikachu cameo

- Top result: Arcade Game (GV-PK-N1-83)
- Top source: cameo
- Cameo results: 42
- Checks passed: true

### aerodactyl cameo

- Top result: Old Amber Aerodactyl (GV-PK-DEX-97)
- Top source: cameo
- Cameo results: 7
- Checks passed: true

### acerola cameo

- Top result: Mimikyu (GV-PK-CEC-245)
- Top source: cameo
- Cameo results: 1
- Checks passed: true

### GV-PK-CRE-30

- Top result: Sneasel (GV-PK-CRE-30)
- Top source: identity
- Cameo results: 0
- Checks passed: true

## Decision

Dry run passed. A later migration may safely add cameo tokens and cameo result labels to print identity search, with ranking kept below primary identity matches.

## Confirmations

- No DB writes.
- No migration created or applied.
- No resolver/app/search UI changes.
- No Species Dex changes.
- No scanner changes.
- No pricing changes.
- No raw UUIDs exposed in dry-run result payloads.
