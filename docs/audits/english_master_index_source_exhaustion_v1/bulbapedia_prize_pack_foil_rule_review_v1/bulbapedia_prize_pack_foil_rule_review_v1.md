# Bulbapedia Prize Pack Foil Rule Review V1

Audit-only review of Prize Pack stamped foil rows. This report does not create fixtures and does not write to the database.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- fixture_records_generated: 0

## Rule

Only exact `Standard Set Foil` card-list matches are reviewed. Series-level foil-pattern text is used only when the page explicitly states the foil pattern and exceptions.

## Summary

- target_rows: 63
- source_entries_parsed: 1007
- candidate_rows: 0
- blocked_rows: 63
- fingerprint_sha256: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`

| status | rows |
| --- | --- |
| blocked_no_standard_set_foil_match | 28 |
| blocked_missing_page_foil_rule | 15 |
| blocked_multiple_standard_set_foil_matches | 15 |
| blocked_no_exact_bulbapedia_prize_pack_match | 5 |

| candidate_finish_key | rows |
| --- | --- |

## Candidate Sample

_No candidate rows._
