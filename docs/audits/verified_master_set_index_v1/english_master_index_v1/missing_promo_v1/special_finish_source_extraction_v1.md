# Special Finish Source Extraction V1

Read-only extraction from already-preserved evidence labels and URLs. This pass does not fetch live pages, does not insert child printings, and does not write to the database.

## Safety

| check | value |
| --- | --- |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| real_apply_performed | false |

## Summary

| metric | value |
| --- | --- |
| rows_scanned | 734 |
| exact_finish_extracted_from_preserved_evidence | 0 |
| needs_live_page_capture_or_preserved_snapshot | 11 |
| evidence_url_without_finish_text | 130 |
| no_existing_evidence_url | 593 |
| conflicting_preserved_finish_terms | 0 |

## Extracted Exact Finish Rows

No exact finish rows were extracted from preserved evidence.

## Next Move

- Build a guarded dry-run only for the exact extracted rows if the operator accepts preserved text as sufficient evidence.
- Separately build a live/snapshot capture pass for rows marked `needs_live_page_capture_or_preserved_snapshot`.
- Do not promote rows where preserved evidence proves only stamp identity but not active finish.

