# MEE Core Internal Classification Review Queue Audit V1

Generated: 2026-06-27T02:34:27.939Z

Mode: run only, read-only audit

## Summary

- Pending classification rows: `19`
- Classification-blocked rows: `19`
- Active-only rows: `19`
- No rollup eligible rows: `19`
- No raw/slab classification rows: `19`
- Exclusion-flagged rows: `6`
- Public flag rows: `0`

## Recommendations

- Inspect classification rules: `13` rows
- Inspect exclusion and classification rules: `6` rows

## Blocked GV IDs

- `GV-PK-DF-98`
- `GV-PK-DR-94`
- `GV-PK-HL-93`
- `GV-PK-LM-86`
- `GV-PK-MA-89`
- `GV-PK-MA-92`
- `GV-PK-MA-95`
- `GV-PK-MCD-2014-11`
- `GV-PK-MCD-2016-6`
- `GV-PK-MCD-2019-4`
- `GV-PK-MEP-053`
- `GV-PK-MEP-067`
- `GV-PK-PR-NP-5`
- `GV-PK-RG-107`
- `GV-PK-TK-tk-bw-e-13`
- `GV-PK-TK-tk-bw-z-4`
- `GV-PK-TRR-14`
- `GV-PK-WCD-2009-STALLGON-13-LEGENDS_AWAKENED-144-MEWTWO_LVX`
- `GV-PK-WCD-2016-NINJA_BLITZ-01-BREAKPOINT-41-GRENINJA_BREAK`

## Next

- Package: `MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1`
- Reason: Every classification_review row is blocked before rollup eligibility because the evidence has not been safely classified as raw_single or slab. Decide whether to fix classification rules or mark specific rows blocked.

## Findings

- None
