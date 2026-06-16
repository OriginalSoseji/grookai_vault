# ENRICH-13G Celebrations Subset Alias Governance V1

Read-only governance plan for Celebrations Classic Collection subset alias blockers.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- This report is not apply authority.

## Summary

- Target rows: 4
- Source set code: cel25
- Canonical subset set code: cel25c
- Source numbers: 15A1, 15A2, 15A3, 15A4
- Write-ready now: false
- Recommended strategy: `do_not_backfill_cel25_15A_aliases_as_host_physical_identity`

## Governance Decision

Decision: `classic_collection_rows_are_subset_governed`

Existing Master Index suppression governance treats Celebrations Classic Collection as subset cel25c. TCGdex-like cel25 15A# aliases should not be written as host-set parent identity until a subset relocation/suppression dry-run proves the right owner and dependency behavior.

Deterministic law:

- 15A# source aliases are source evidence, not direct public parent numbers
- canonical subset set_code is cel25c
- canonical subset number is derived from the numeric prefix before A
- host cel25 duplicate evidence must be suppressed from DB reconciliation or relocated to the subset owner

Forbidden:

- do not backfill card_prints.set_code=cel25 and number=15A# as final English physical identity
- do not create new host-set Classic Collection parents without subset proof
- do not merge distinct Classic Collection names just because they share canonical number 15
- do not delete source rows without dependency transfer proof

## Rows

| source_number | card_name | source_id | canonical_subset | canonical_number | children | active_mapping | live_matches |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 15A1 | Venusaur | cel25-15A1 | cel25c | 15 | 1 | 1 | 1 |
| 15A2 | Here Comes Team Rocket! | cel25-15A2 | cel25c | 15 | 1 | 1 | 1 |
| 15A3 | Rocket's Zapdos | cel25-15A3 | cel25c | 15 | 1 | 1 | 1 |
| 15A4 | Claydol | cel25-15A4 | cel25c | 15 | 1 | 1 | 1 |

## Future Package Shape

Package: `ENRICH-13G1-CELEBRATIONS-CLASSIC-COLLECTION-SUBSET-ALIAS-DRY-RUN`

Current status: `not_write_ready_dry_run_required`

Required before real apply:

- fresh dependency snapshot
- subset owner existence proof
- active identity uniqueness proof
- external mapping transfer or suppression proof
- rollback artifact

## Conclusion

These rows are not safe as direct cel25 15A# parent backfills. They need a subset-aware dry-run that resolves them against cel25c or suppresses the host aliases as source evidence.

Fingerprint: `aa7789b7dca3f97eb3bc1cba224bd4f9bc698737a9e62889d841b8d672f91f86`
