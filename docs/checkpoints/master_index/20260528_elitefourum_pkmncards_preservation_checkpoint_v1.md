# EliteFourum + PkmnCards Preservation Checkpoint V1

Generated: 2026-05-28

## Scope

Audit-only English Master Index source-gap reduction.

No database writes, migrations, cleanup, quarantine, or apply paths were used.

## Source Lane Added

Elite Fourum alternate English checklist:

- Source URL: https://www.elitefourum.com/t/updated-6-15-15-alternate-set-card-checklist-english/11788
- Parsed checklist entries: 597
- Exact evidence rows generated: 50
- Fixture files written: 21
- Exact finish promoted by this lane: stamped
- Non-promoted ambiguous identity matches: 50
- Exact misses: 912

Rule enforced:

Only exact set, card number, card name, and explicit finish label matches emit fixture evidence.

## Regression Guard Event

The first guarded rebuild after adding Elite Fourum failed and was not promoted:

- Master verified printings: 37,907
- Master verified cards: 21,542
- Conflicts: 0
- Failure: `master_verified_cards 21542 < 21556`

Root cause:

PkmnCards live set-page scraping omitted 14 previously verified alternate-number card identity rows, mostly `a` suffix cards. This was source volatility, not evidence disproof.

## Preservation Fix

Added a small PkmnCards preservation fixture:

```text
docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_preservation_v1/
```

Preserved rows:

- `smp`: 3 direct PkmnCards card-page rows
- `sm3`: 8 direct PkmnCards card-page rows
- `sm11`: 3 direct PkmnCards card-page rows

Invariant:

PkmnCards live evidence may add rows, but live set-page availability must not delete or hide prior direct card-page evidence that was already part of a promoted deterministic baseline.

The fixture uses `source_key: pkmncards`, so it preserves the same source and does not create fake independent agreement.

## Promoted Guarded Rebuild

Promoted guarded rebuild:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-05-28T03-23-45-520Z
```

Final promoted metrics:

- Sets: 202
- Evidence rows: 231,301
- Master verified cards: 21,556
- Master verified printings: 37,907
- Candidate printings: 116
- Human-source-verified printings: 846
- Conflicts: 0
- Suppressed structured-only finish candidates: 1,622

Change versus prior promoted baseline:

- Master verified cards: 21,556 -> 21,556
- Master verified printings: 37,857 -> 37,907
- Evidence rows: 231,247 -> 231,301
- Conflicts: 0 -> 0

## Safety Confirmation

```json
{
  "audit_only": true,
  "db_writes_performed": false,
  "migrations_created": false,
  "cleanup_performed": false,
  "quarantine_performed": false,
  "final_reports_promoted": true
}
```

## Next Source-Gap Priority

Continue audit-only source acquisition against the remaining gap queue:

1. `finish_second_source_needed`
2. `finish_human_checklist_evidence_needed`
3. exact variant/product/checklist evidence
4. suppressed structured claims only as manual review targets
