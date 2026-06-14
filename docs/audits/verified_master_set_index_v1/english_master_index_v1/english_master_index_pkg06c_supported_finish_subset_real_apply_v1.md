# PKG-06C Supported Finish Subset Real Apply V1

This report records the approved real apply for the PKG-06C supported-finish child-only insert subset.

## Status

| Field | Value |
| --- | --- |
| apply_status | pkg06c_supported_finish_subset_real_apply_committed_and_verified |
| package_id | PKG-06C-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `839a42b870b455a16055c88c5b4e39c4a83da421e4cd36df581eee4358000684` |
| inserted_rows | 8 |
| db_write_committed | true |
| durable_db_writes_performed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Before And After

| Snapshot | Hash | target parents | existing target child rows | planned id collisions |
| --- | --- | ---: | ---: | ---: |
| before | `7365fd1b32fd3c3072b3f3ddae25c17dd171938ca552d7cb3cb9db5fa4357358` | 8 | 0 | 0 |
| after | `6950dd4b30f623f4f3c7e7d2cc0e4521d40a4a45a0719a7432061c24d5082e05` | 8 | 8 | 8 |

## Verification Summary

- before_hash_matches_dry_run_proof: true
- inserted_rows_found: 8
- holo_inserted: 8
- provisional_rows_inserted: 0
- parent_rows_unchanged: true
- blocked_finish_taxonomy_rows_still_excluded: true
- master_index_comparison_status: pkg06c_supported_finish_subset_verified_after_apply

## Rollback Preview

```sql
delete from public.card_printings where id = '9bfbba3b-7aa5-4e9d-89d3-6e37359cb4ee'::uuid and card_print_id = '3adadb08-a9ef-4879-af78-ef8f6f9decf6'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'cfb1e942-b355-4ddb-ac0b-42b0109919f2'::uuid and card_print_id = '144e42f1-b803-42ac-aabe-a3db97c16fa6'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '1816d38e-36a0-4e65-a40c-a84cda2e4220'::uuid and card_print_id = '01c5a20c-0d8c-4274-a55d-614b38b64fec'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '6a123f5e-2371-4f2b-9d75-95abab7db6ac'::uuid and card_print_id = '762b7cfc-3b44-4d9b-aa10-2b9539cf86e6'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '77a7fd2a-48aa-458e-ad5a-db0f890461ed'::uuid and card_print_id = 'afde284e-1cd1-422d-b6fa-a649c6f3e49d'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '0b34f47b-860b-41f3-88f5-d71e9b543b15'::uuid and card_print_id = '3f5bba1d-3d0c-4188-8abf-1945d315decd'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '4a360cee-f686-4c13-9e61-6ef3452bc185'::uuid and card_print_id = '4b1a138c-ff9d-44de-91b4-eee95aadf558'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'f68d1685-b298-4ab3-b42a-14d17eb20364'::uuid and card_print_id = 'de40da7c-1283-4fe3-ab1b-a84948e88df8'::uuid and finish_key = 'holo';
```

The JSON report contains all 8 inserted row IDs for exact rollback targeting.

## Stop Findings

- none

## Non-Authorizations

- No global apply was authorized or performed.
- No migrations were authorized or created.
- No deletes were authorized or performed.
- No merges were authorized or performed.
- No unsupported cleanup was authorized or performed.
- No parent writes were authorized or performed.
- The 380 blocked finish-taxonomy rows remain excluded.
