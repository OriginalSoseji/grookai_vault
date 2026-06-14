# PKG-06D Active Finish Child Printing Real Apply V1

This report records the approved real apply for the PKG-06D active-finish child-only insert subset.

## Status

| Field | Value |
| --- | --- |
| apply_status | pkg06d_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06D-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `c67558f261d8d70faf6beac7f63faafa5b627cf0cf7dfeb09989da5e617055b1` |
| inserted_rows | 319 |
| db_write_committed | true |
| durable_db_writes_performed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Verification Summary

- before_hash_matches_dry_run_proof: true
- inserted_rows_found: 319
- inserted_by_set: {"ex11":107,"ex16":107,"ex6":105}
- inserted_by_finish: {"cosmos":1,"holo":16,"normal":1,"reverse":301}
- provisional_rows_inserted: 0
- parent_rows_unchanged: true
- master_index_comparison_status: "pkg06d_active_finish_child_printing_verified_after_apply"

## Rollback Preview

```sql
delete from public.card_printings where id = '0298907f-9c08-4b77-a82f-8294027be277'::uuid and card_print_id = 'dcf161be-3d30-41eb-ab8f-178e5cf2302b'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '85d8219b-ea69-4817-9bd6-9870be74136e'::uuid and card_print_id = 'bc9786a4-0dcc-49f1-b833-8d22a99de1c2'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '533e77d8-9fa7-4e75-92fb-eccdc8925ac1'::uuid and card_print_id = '798a2798-68f8-43cf-90ef-0942bc663d6c'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '24ca14aa-44f3-434c-8cf4-9386b8681c21'::uuid and card_print_id = '61d893fa-3016-4550-ac90-623af15b45d3'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'bcee6de7-3be4-4585-a7db-cada01de382c'::uuid and card_print_id = 'c21fa9f9-7157-4c80-8361-81f0ce88f4e1'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '8fda9b3a-d43f-4ddc-af0d-218718dbbf0b'::uuid and card_print_id = '8cab0494-3b44-4b11-b734-ba45828d3069'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'cea7c37f-e17b-4095-8d39-cbf6d33ad863'::uuid and card_print_id = '202a6193-bfbf-4543-a60e-61c57bf052f0'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '3cd188ba-4a33-42b6-b0a5-050bfbc29c37'::uuid and card_print_id = '42902562-922c-4644-be06-8958ce9d9b0e'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '3dbcc3e3-6e41-4ef4-b0e8-249625afeff2'::uuid and card_print_id = '7e09ce84-1bd6-44cf-aa70-18ca81255655'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '295563bc-03d5-48e0-9c4b-7328d630dff8'::uuid and card_print_id = '18d2f8bc-0835-4281-b33d-62b34e8e9797'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '257f6554-770f-4896-a73f-bf555aad1574'::uuid and card_print_id = '3c1820b4-e5df-468d-a4f9-6fb723258ee6'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'a3e37069-0b77-41c8-9e37-ef5648cf4171'::uuid and card_print_id = '54f2233d-99c3-4154-a081-86fe9674b63d'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '9a9794f2-ee8b-445d-ac68-7bc9af602161'::uuid and card_print_id = '01878f9f-f4bf-4478-a130-6b989b397087'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'd6a3c089-d122-41df-81d5-33f58f59eaf4'::uuid and card_print_id = '2fa602c6-65ae-4b25-b53a-9c4b094b65ed'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'd3ef4de1-d8b2-4913-8b8c-6220698aed96'::uuid and card_print_id = 'ba5e5f9b-5809-4ac8-9771-010ded421f08'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '553c1d0e-56e7-4d6c-9187-e8af6fef3ab6'::uuid and card_print_id = '2443f63a-0757-45fb-af50-efcd6fdfac87'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '21d8842b-a658-4e71-b352-f3d9d6c288fe'::uuid and card_print_id = 'bf28eb3d-54fe-44a8-8c9d-edfe5d67d3c8'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '023e8a77-3032-47db-a444-61c64a42185a'::uuid and card_print_id = '6757068f-76bd-439b-9433-711630cb1c6b'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '5f460e71-b08c-4ae4-a3b4-1eb92802c082'::uuid and card_print_id = '0158b3c8-b6e0-4c60-894e-93e12c999a00'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '7bb2223f-1305-495e-b495-1dabb05a546b'::uuid and card_print_id = '31248d14-76c5-4cb5-9fe5-c48f0dec4034'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '76a37770-ffcf-40a8-b016-0e4477772af6'::uuid and card_print_id = 'c8c124a5-3341-422a-9c38-2ee9382a9907'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '3043bf09-5899-41f2-b27e-43e505e6caf4'::uuid and card_print_id = 'c2be9061-d942-48d3-bc94-488d5943c861'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '9f266cfe-e919-4748-871f-5bbd62e20799'::uuid and card_print_id = '7a14cdd9-3e11-48f0-8874-4c257cc204ff'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '01699247-fad8-476a-89f3-019aded30735'::uuid and card_print_id = '4ec4e692-58e4-43a2-bd7d-09fc658e3ba1'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '187b41e3-1d38-4ab5-baeb-4f83ba031f91'::uuid and card_print_id = 'ff128dc0-7e51-4647-a4bb-48b1d67618b4'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '937bf178-7232-4807-82bf-31c019447818'::uuid and card_print_id = 'e3275d79-5b89-4ed8-ad6a-53b76eaa57f4'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'f3652534-f302-4aec-9642-b7cdea127e78'::uuid and card_print_id = '51a07159-3958-4fc3-9079-1ffb4c76065d'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '99b04b76-b26e-457f-bf7c-8536650015ed'::uuid and card_print_id = '91f83c3f-be83-4404-ab64-ad42e40ca697'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '5f088146-2ec9-42d8-bd95-7baf7563f5d4'::uuid and card_print_id = '2df5121a-6dc6-4c4d-8974-725d44b19608'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '678f861a-1b61-4766-b182-5d04c7817531'::uuid and card_print_id = '662c32b8-4e9b-47df-bf3f-876a58c88faf'::uuid and finish_key = 'reverse';
```

The JSON report contains all inserted row IDs for exact rollback targeting.

## Stop Findings

- none
