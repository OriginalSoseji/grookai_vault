# PKG-06A Supported Finish Subset Real Apply V1

This report records the approved real apply for the PKG-06A supported-finish child-only insert subset.

## Status

| Field | Value |
| --- | --- |
| apply_status | pkg06a_supported_finish_subset_real_apply_committed_and_verified |
| package_id | PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `4018ba8039a8b3835ec2a76d11af3af8ea0099ce21bbf5466c525df8772ab6d9` |
| inserted_rows | 115 |
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
| before | `3f045c7dd1742d32a742cdfd891e6709bf3306e42073cb148c3d9b67e8fe5b2d` | 115 | 0 | 0 |
| after | `915d88b4c8504a982f132b68edbce186a063a49e01e85749c367010c154720ac` | 115 | 115 | 115 |

## Verification Summary

- before_hash_matches_dry_run_proof: true
- inserted_rows_found: 115
- normal_inserted: 113
- cosmos_inserted: 2
- provisional_rows_inserted: 0
- parent_rows_unchanged: true
- blocked_finish_taxonomy_rows_still_excluded: true
- master_index_comparison_status: pkg06a_supported_finish_subset_verified_after_apply

## Rollback Preview

```sql
delete from public.card_printings where id = 'c6dbe40a-4f66-459f-80bc-f8b4403c87d3'::uuid and card_print_id = 'ebba151c-68b9-4dba-82a5-b08ae2fe41e2'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'cc0ba3af-18d9-4306-a501-1e4a901d74a9'::uuid and card_print_id = '8cf66125-56f7-4e27-a1fd-08025fae50f0'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'e58aca70-b81c-45c8-8e06-c7b078bd5664'::uuid and card_print_id = '5fe6c6c7-be09-4d88-af91-ce0158248a72'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'ef1a84f9-e19f-4761-a326-682f4aabc348'::uuid and card_print_id = '6017a435-4e91-44be-8035-6efcbe832ee6'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '97b9a1db-8abb-4f0c-8226-ea98a8215e45'::uuid and card_print_id = '009b0d24-d48e-4946-a392-1bae3406e208'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'c74fd417-13a6-4693-a506-d2f8793c4a14'::uuid and card_print_id = '4d9fc663-8fef-4da5-a6b8-f510e5699ed4'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'c995007a-91bc-4594-ba0c-a0302dcde846'::uuid and card_print_id = 'b77b0f9a-67a2-47ba-b4b6-4c7a545c7998'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'f88ea8d9-28f9-4e2d-810c-53da1bac5ded'::uuid and card_print_id = 'd9dd2533-779b-4112-bf2c-7a319af9f6bb'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'e529e4ce-c3e3-465c-bd8b-276bd9c7bd23'::uuid and card_print_id = '7126b46e-2d9d-4906-bee1-13f59f5d50c8'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '5ed509e8-a7b1-430c-a648-04e79f7f8758'::uuid and card_print_id = '6b418419-525d-4ed3-a2ae-39b214a4fd4c'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'cee2361d-50ef-4213-bf75-ae4234fa091e'::uuid and card_print_id = 'fd676d83-4f81-4bc8-854f-f8fe6dcd288a'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'd969b3d4-e399-46e0-80d8-ccd71e9935d5'::uuid and card_print_id = '1bd0cf49-3b22-420f-bb12-adcc5f72a7ed'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'dd6a08b8-8d47-47e2-b5e3-1c8dff51cbc7'::uuid and card_print_id = 'f98c32dc-ede3-45bb-b03b-c370937cb2dc'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'cfe09a2a-4cf3-4a20-a813-d6eba49613b7'::uuid and card_print_id = '8fd39753-8e91-4445-b71c-3d8c8e2600cc'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'f6e9c1e1-a11c-4999-b68b-87200f4fe184'::uuid and card_print_id = '0240b3e6-a42a-4b2a-bdf0-58662fb6f281'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '7dcb776d-1992-4fe9-861d-78574fa66210'::uuid and card_print_id = '7b3cf251-7d11-406a-abf6-c9b980b6316b'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'eb53dc12-71ad-4c5b-a676-b3b34db8c0f6'::uuid and card_print_id = '70464bf7-cfd2-451f-aba5-914884fd11dd'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '6d8834c8-f8b0-4124-afa6-e66f909ba7c0'::uuid and card_print_id = 'ff7ec680-ae02-41bc-b071-a6981fc7b52d'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '0490d3ac-dfe0-4d67-8197-7fb89d7a8518'::uuid and card_print_id = '07430ced-256a-405f-83db-e0277e6b5dd2'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'fc8fb544-ff12-48db-98c7-cb570bf9ef25'::uuid and card_print_id = '771d23a1-0073-442d-b44b-f5be74353fa2'::uuid and finish_key = 'normal';
```

The JSON report contains all 115 inserted row IDs for exact rollback targeting.

## Stop Findings

- none

## Non-Authorizations

- No global apply was authorized or performed.
- No migrations were authorized or created.
- No deletes were authorized or performed.
- No merges were authorized or performed.
- No unsupported cleanup was authorized or performed.
- No parent writes were authorized or performed.
- The 282 blocked finish-taxonomy rows remain excluded.
