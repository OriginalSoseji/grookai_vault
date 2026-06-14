# PKG-08U TCGCollector Mapping Governance V1

No-write governance report for PKG-08S rows blocked only because their exact source carrier was not previously approved for parent insert provenance.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- package_id: PKG-08U-TCGCOLLECTOR-MAPPING-GOVERNANCE
- package_fingerprint_sha256: `e7e1324054f15e534914fb67596fc2b9a83ef685560f5c156f1d5ad6810066ee`
- source_rows: 2
- governed_mapping_carrier_ready_for_dry_run: 0
- blocked_reference_source_not_mapping_carrier: 2

| governance_status | rows | top_sets |
| --- | --- | --- |
| blocked_reference_source_not_mapping_carrier | 2 | mep:2 |

## Governance Decision

- `tcgcollector` numeric card page IDs are approved for a guarded dry-run package only when the row has exact TCGCollector card URL evidence and an independent ThePriceDex set/list source.
- `bulbapedia` remains reference evidence only in this lane because page titles are not stable Grookai external mapping IDs for the missing MEP promo parent rows.
- This report is not write authority. It only permits preparing a rollback-only dry-run package for governed rows.
