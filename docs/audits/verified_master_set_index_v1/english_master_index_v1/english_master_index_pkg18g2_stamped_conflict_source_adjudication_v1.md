# PKG-18G2 Stamped Conflict Source Adjudication V1

Audit-only source-backed adjudication packet for the three remaining stamped/special finish conflicts.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| conflict_rows_reviewed | 3 |
| resolved_future_dry_run_candidates | 2 |
| still_blocked_rows | 1 |
| write_ready_now | 0 |
| fingerprint_sha256 | `c601cc7665df09daabe86b163c83a7f5093314c6647b86f7cccf16c108f424d8` |

## Adjudication Results

| set_key | card_number | card_name | variant_key | current_finish_key | adjudicated_finish_key | adjudication_status | recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse | blocked | still_blocked_taxonomy_and_event_label_ambiguity | Do not prepare a write package. Sources disagree or use broad Crosshatch/Holo wording, and some comparable sources are State/Province rather than exact Regional staff. |
| me02 | 026 | Suicune | gamestop_stamp | holo | cosmos | resolved_to_cosmos_future_dry_run_candidate | Prepare a future guarded dry-run package that treats the GameStop stamped Suicune as cosmos, not plain holo. Do not use the old holo candidate. |
| xy1 | 085 | Aegislash | regional_championships_stamp | reverse | reverse | resolved_to_reverse_future_dry_run_candidate | Prepare a future guarded dry-run package for Regional Championships Aegislash reverse. PriceCharting crosshatch wording is treated as non-blocking marketplace wording after exact reverse evidence from independent sources. |

## Guardrail

This packet does not authorize DB writes. Rows marked as future dry-run candidates still require a separate guarded package builder, rollback-only dry-run proof, fingerprint confirmation, and explicit approval before real apply.
