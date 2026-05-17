# MEP GV-ID Collision Manual Pack - 2026-05-17

Status: no-write manual evidence pack for the 10 `mep` rows blocked by duplicate public owners and padding-convention collisions. This document does not authorize Supabase writes, migrations, deletes, generated ID backfills, reference movement, card movement, or public route exposure.

## Summary

| Metric | Count |
| --- | --- |
| Blocked rows | 10 |
| Duplicate public owner rows | 10 |
| Padding convention collision rows | 10 |
| Recommended gv_id writes | 0 |

## Collision Rows

| Missing row | Number | Rejected generated ID | Existing public owner | Existing owner number |
| --- | --- | --- | --- | --- |
| Meganium | 1 | GV-PK-MEP-1 | GV-PK-MEP-001 | 001 |
| Inteleon | 2 | GV-PK-MEP-2 | GV-PK-MEP-002 | 002 |
| Alakazam | 3 | GV-PK-MEP-3 | GV-PK-MEP-003 | 003 |
| Lunatone | 4 | GV-PK-MEP-4 | GV-PK-MEP-004 | 004 |
| Drifloon | 5 | GV-PK-MEP-5 | GV-PK-MEP-005 | 005 |
| Drifblim | 6 | GV-PK-MEP-6 | GV-PK-MEP-006 | 006 |
| Psyduck | 7 | GV-PK-MEP-7 | GV-PK-MEP-007 | 007 |
| Golduck | 8 | GV-PK-MEP-8 | GV-PK-MEP-008 | 008 |
| Alakazam | 9 | GV-PK-MEP-9 | GV-PK-MEP-009 | 009 |
| Riolu | 10 | GV-PK-MEP-10 | GV-PK-MEP-010 | 010 |

## Manual Resolution Policy

- Do not assign `GV-PK-MEP-1` through `GV-PK-MEP-10`; existing public owners already use padded `GV-PK-MEP-001` through `GV-PK-MEP-010`.
- Treat these as duplicate-resolution candidates, not missing-GV-ID candidates.
- Select canonical survivors by existing public `gv_id`, mappings, references, images, and active identity evidence.
- No deletes until reference migration and rollback are separately proven.

## Required Future Design

- Select canonical survivor per printed card.
- Preserve existing public MEP gv_id owners unless proven wrong.
- Move or preserve mappings/references only after FK/reference audit.
- No deletes until duplicate reference migration is proven.
- Do not assign unpadded GV-PK-MEP-1 style IDs while padded GV-PK-MEP-001 public owners exist.

## Confirmation

- Supabase writes: none.
- Migrations: none.
- Data changes: none.
