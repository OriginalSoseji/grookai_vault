# English Master Index PKG-01B-FUT2020 Real Apply V1

This report records the real `PKG-01B-FUT2020` apply authorized by the operator.

## Status

| Field | Value |
| --- | --- |
| apply_status | pkg01b_fut2020_real_apply_committed_and_verified |
| package_id | PKG-01B-FUT2020 |
| package_fingerprint_sha256 | `c9539d98a7f883ce9b66ed12c57416ed68f0e9d1cad08b654f1470cb40baee63` |
| updated_rows | 4 |
| deleted_rows | 8 |
| db_write_committed | true |
| durable_db_writes_performed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| global_apply_included | false |
| stop_findings | 0 |

## Before And After

| Snapshot | Hash | parent rows | child rows | normal | holo | reverse | vault refs | child deps |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| before | `9129574db351ca002e3e5b0a0122ebd375d31d8725945bb419d61d120339db22` | 4 | 12 | 4 | 4 | 4 | 0 | 0 |
| after | `9e6dd84f16ec95d3e301722c011ca0626224c9b37d70bdcdf9492cdc0603b38e` | 4 | 4 | 4 | 0 | 0 | 0 | 0 |

## Verification Summary

- before_hash_sha256: 9129574db351ca002e3e5b0a0122ebd375d31d8725945bb419d61d120339db22
- after_hash_sha256: 9e6dd84f16ec95d3e301722c011ca0626224c9b37d70bdcdf9492cdc0603b38e
- parent_set_code_resolved: true
- child_printing_count_reduced_to_index: true
- normal_printings_remaining: true
- unsupported_holo_reverse_removed: true
- vault_items_still_zero: true
- child_dependency_refs_still_zero: true
- master_index_comparison_status: pkg01b_fut2020_verified_by_index_after_apply

## Rollback Proof

```sql
update public.card_prints set set_code = null where id = '2f2942c8-6019-4446-806c-593dd351af98'::uuid and set_code = 'fut2020';
update public.card_prints set set_code = null where id = '5029b53f-a1dd-4fe0-ae0c-b38021dd52c2'::uuid and set_code = 'fut2020';
update public.card_prints set set_code = null where id = '53919228-7560-480c-9bdb-da99ad67250a'::uuid and set_code = 'fut2020';
update public.card_prints set set_code = null where id = '82ebefc5-51bc-4dbd-ba14-a9a60186aa61'::uuid and set_code = 'fut2020';
-- reinsert card_printings snapshot id=f7011904-be70-4a4f-9704-6d0396359493 card_print_id=2f2942c8-6019-4446-806c-593dd351af98 finish_key=holo
-- reinsert card_printings snapshot id=3270eb0d-e4c8-43e8-9139-2b7d1f6440e7 card_print_id=2f2942c8-6019-4446-806c-593dd351af98 finish_key=reverse
-- reinsert card_printings snapshot id=3a7e1fc6-d717-4299-8f60-e14c8b15fd20 card_print_id=5029b53f-a1dd-4fe0-ae0c-b38021dd52c2 finish_key=holo
-- reinsert card_printings snapshot id=b3ed0e51-8a8b-4a12-8fbf-04b6c6bc21f6 card_print_id=5029b53f-a1dd-4fe0-ae0c-b38021dd52c2 finish_key=reverse
-- reinsert card_printings snapshot id=ad2cc347-5873-4af7-8022-ed619176e708 card_print_id=53919228-7560-480c-9bdb-da99ad67250a finish_key=holo
-- reinsert card_printings snapshot id=6b846e08-a26b-45fc-8f68-628a80ef0d02 card_print_id=53919228-7560-480c-9bdb-da99ad67250a finish_key=reverse
-- reinsert card_printings snapshot id=b4568669-93a5-412e-aa5f-704c75fe8518 card_print_id=82ebefc5-51bc-4dbd-ba14-a9a60186aa61 finish_key=holo
-- reinsert card_printings snapshot id=26d97bc4-f156-4a3d-8735-0120be57572f card_print_id=82ebefc5-51bc-4dbd-ba14-a9a60186aa61 finish_key=reverse
```

The source JSON artifact contains exact full child reinsert snapshots for all eight deleted child rows.

## Stop Findings

- none

## Non-Authorizations

- No global apply was authorized.
- No migrations were authorized or created.
- No cleanup or quarantine outside the eight approved child delete candidates was authorized.
- No vault, ownership, pricing, scanner, marketplace, or UI rows were changed.
