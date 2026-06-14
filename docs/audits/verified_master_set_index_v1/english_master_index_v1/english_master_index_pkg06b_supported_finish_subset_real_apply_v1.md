# PKG-06B Supported Finish Subset Real Apply V1

This report records the approved real apply for the PKG-06B supported-finish child-only insert subset.

## Status

| Field | Value |
| --- | --- |
| apply_status | pkg06b_supported_finish_subset_real_apply_committed_and_verified |
| package_id | PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad` |
| inserted_rows | 120 |
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
| before | `98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7` | 120 | 0 | 0 |
| after | `3ebeea9f9ee9f9457ee902c3aaebecaf6bbf7e7284e8db75308600f044545c14` | 120 | 120 | 120 |

## Verification Summary

- before_hash_matches_dry_run_proof: true
- inserted_rows_found: 120
- normal_inserted: 65
- holo_inserted: 55
- provisional_rows_inserted: 0
- parent_rows_unchanged: true
- blocked_finish_taxonomy_rows_still_excluded: true
- master_index_comparison_status: pkg06b_supported_finish_subset_verified_after_apply

## Rollback Preview

```sql
delete from public.card_printings where id = '0c2e9788-f622-4021-9b46-76a214268349'::uuid and card_print_id = '735170eb-a3fa-4050-9ab4-740c54208aac'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '5a82ed34-972e-41b3-abeb-b47f630969b8'::uuid and card_print_id = '70c76b3a-6724-44f0-a3ba-244106bc3ed4'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'd1237271-7b8c-41f0-aa96-3fb08ed158c2'::uuid and card_print_id = '16e27329-3423-4fa1-9ac6-1e4d84142264'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'bdd01f45-da8a-44d7-a040-48abf0a2d762'::uuid and card_print_id = 'a99476e1-b149-4d87-b75f-3c39f2a18558'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'dfd7ae0c-fa54-42a8-904a-11e58421f670'::uuid and card_print_id = '31aff0bf-e38b-41f6-bec6-794e1d2b0f43'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '96f4c156-258f-4c80-bb6f-6239a43b6764'::uuid and card_print_id = '403af011-c793-4050-9abc-da2077c22af0'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '801ffdc2-076d-4f1c-bd7e-28465629d0fa'::uuid and card_print_id = '5852ad63-73ce-4140-a0ad-e1f9daea347d'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '9ab3b27a-5313-410d-bcc6-4928e9583f3a'::uuid and card_print_id = 'e4f29a8b-8832-4d03-b39e-a7defebaf2d6'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '56c461b8-8244-4b34-8843-3835e90500d1'::uuid and card_print_id = 'e291c6e0-7834-486d-b82c-2dd041850847'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'c42af11f-ae35-4a4e-be5f-6fe622172885'::uuid and card_print_id = '64d9697c-1efb-4036-8cf5-5108aaca599d'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'f6f2046b-fb24-4543-837b-f8bc6b5e4635'::uuid and card_print_id = 'da914045-2e6a-4ccc-97c0-74715fee1b49'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'd600db3b-1d71-4370-b8ad-b05881b37cb5'::uuid and card_print_id = '97589046-6255-4342-917b-e0c2b96233fc'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '2bed6d55-83d4-4b82-9e96-787b789bd7c6'::uuid and card_print_id = '8a88230f-533c-42d6-9037-d8c4c1e721e2'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'e8b132ba-cccd-4648-8d7e-cc853993b6aa'::uuid and card_print_id = '7b6f3d4c-8a7d-4a0c-a8a1-0d84e7f9cce8'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '84980895-e339-43c7-aec3-7971e6144e84'::uuid and card_print_id = 'e048de4b-36b9-4d43-acd8-4eca092da4e5'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '1e80ce61-38b5-4227-b462-5d9f6f1a7f59'::uuid and card_print_id = '6b3d6942-ad01-4d94-8ec3-13cb7a1605a6'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'b16b1d60-6567-48d0-a2e7-ba706b20ab7f'::uuid and card_print_id = '58335156-aa84-4652-bae8-b6abf00844eb'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '2ef6d078-ce20-4095-8922-9d1da7f806cd'::uuid and card_print_id = 'e8fcc30a-78a2-4829-a32b-1ed052b8d62a'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'c4c6a0a3-a727-41ff-ad21-dc82f30c038d'::uuid and card_print_id = 'd6183d15-d66d-4c2e-9cef-63d9182b0ecc'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'c9cd262a-9630-47f5-ad09-0eaa561e1340'::uuid and card_print_id = '62b61be4-a528-4b5a-92b6-6889e175c169'::uuid and finish_key = 'normal';
```

The JSON report contains all 120 inserted row IDs for exact rollback targeting.

## Stop Findings

- none

## Non-Authorizations

- No global apply was authorized or performed.
- No migrations were authorized or created.
- No deletes were authorized or performed.
- No merges were authorized or performed.
- No unsupported cleanup was authorized or performed.
- No parent writes were authorized or performed.
- The 268 blocked finish-taxonomy rows remain excluded.
