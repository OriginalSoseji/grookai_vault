# PKG-06L Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06L active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06l_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06L-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `e33919f310fb71194f2bc5852345cd2f81d3a8b854b95885a832e703e170e6c1` |
| inserted_rows | 35 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"bw1":3,"bw10":3,"bw11":3,"bw3":3,"ecard3":4,"mcd15":3,"pop9":4,"sm4":4,"swsh12":4,"swsh4.5":4}
- by_finish: {"cosmos":18,"holo":10,"normal":7}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = 'e240774f-6f00-4da9-82b0-4356a2c6f9f9'::uuid and card_print_id = 'd6c5b531-550e-463c-be43-e2a6b9b86b7a'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '74738012-a6ad-495d-9137-3d77e5678c58'::uuid and card_print_id = 'eed99fce-c433-4583-a21f-e207b1f23b2b'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '8d877337-e31a-45da-8e44-a3e39a9423d5'::uuid and card_print_id = '65906508-6468-4220-8939-d3dde51b0d0c'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'd38cb492-e911-408c-afb7-3929f71e0c6a'::uuid and card_print_id = 'cb354025-1f27-484a-8175-df4ba23b9f2b'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '193c02fc-5448-4300-9041-faabd81390fd'::uuid and card_print_id = '2504c339-def5-471c-96bc-0120752883ec'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'c3a13e58-f08e-4f4b-b606-6bc32b7f3bcd'::uuid and card_print_id = 'cfce0cf8-6a23-420f-a5ff-4abfd4c11216'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2ce901e6-7187-4004-aa1b-e8be15bc712e'::uuid and card_print_id = '33fa423d-19cc-46a4-a3ff-09bac0c836ee'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '7fe994e0-afb7-4181-88aa-301fe3302254'::uuid and card_print_id = '7bcff2e5-19f4-4e2d-b29e-a2ba362aec75'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '22b9fe95-6264-47f0-b388-471b59a648a8'::uuid and card_print_id = 'd21b2705-53f4-4b53-a4a9-e955b0c532da'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2f9680af-b15c-49fc-9cab-ef911bf290d7'::uuid and card_print_id = 'dfd3361e-95fe-47c1-b586-352ad9086be5'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '622bf617-f144-44f8-a6e3-4815161470f5'::uuid and card_print_id = '812b1aad-04d7-4099-935e-f94da25d7806'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'd94b7622-9ec8-4734-b524-332e1240ae23'::uuid and card_print_id = '59e62682-48db-40c3-863f-c181860b877d'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '1ca31bb3-c9ca-4073-b263-0f6507292765'::uuid and card_print_id = 'b28f03db-9c58-4c5a-832a-3652d6c17301'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'f23f1253-c74d-45a4-b52e-ea365549d398'::uuid and card_print_id = '1180d399-e03e-4f51-a644-563dfe6d4c0e'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'aae00522-e3dc-4d92-bae8-0a5b61ebbe1d'::uuid and card_print_id = '50f05b2e-a89f-4bd6-8725-c2a3454e0dee'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'f62eedaa-10ad-4985-91a8-4d24b525a82b'::uuid and card_print_id = '38ff42f5-8f30-49d4-bd31-311fb5678bf9'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '0f4b05ae-f36a-4031-9931-e05a56e1b71d'::uuid and card_print_id = 'bbb1d304-fc24-42ed-945a-fc97a255934c'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'cfa65a6d-58fb-49a5-b180-946a5202e7a6'::uuid and card_print_id = '923a57d7-eadf-4cb4-822a-7c24d78161fa'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '670cc238-b1e3-4ce6-a5b8-7d4e87c89c25'::uuid and card_print_id = '1dcb43b5-4c95-4bb3-a62f-9256224cf633'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '3b110a23-d006-48d8-adda-ed806792b57e'::uuid and card_print_id = '3d85e8d6-b531-4f34-afde-98fd037e77d2'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'bfdf6c79-2f2d-4ea9-a5e0-64c8e8834496'::uuid and card_print_id = '6c354617-6788-40bf-a7ef-c012a62ddcfc'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '8f3c5069-66a2-4a51-96b9-6e81b954dc4d'::uuid and card_print_id = '58688767-db43-4138-b56f-86b8cebf1e0d'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '84b92a77-9a00-4e31-a5cf-7bdbf1ac4712'::uuid and card_print_id = '0f494f50-abf2-47ca-a25e-40fc9b33a071'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'fc5ce9c0-3418-4853-a13b-26e31d36a03e'::uuid and card_print_id = 'ab49e04e-7462-4cb2-8a08-c4048c056369'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '78670648-3afe-4362-8d1a-3858b0dc4d32'::uuid and card_print_id = '31fa9627-206c-43d4-bb35-74e876b99440'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '8e4a1b25-da72-4154-ac28-bd483a0acd12'::uuid and card_print_id = 'b96a39d5-347c-4658-a784-d9f9030ea903'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2cd0596c-89cd-4738-a56d-c88fdbe75eac'::uuid and card_print_id = '9ac066fb-adeb-4b8c-a0d8-1b1583b78206'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'cfd6d2cf-53b1-46c8-948b-a2fe16caf9ca'::uuid and card_print_id = 'ebf1b771-cc7d-430b-8adf-1f4a55d9b54d'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '1d26ac2e-0aee-4739-9231-dc2aaeae962f'::uuid and card_print_id = 'c2c8ea3c-282e-4a8f-98b8-d559332497a1'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '4453986d-81ef-4e96-ace3-3082b62293f1'::uuid and card_print_id = '61eba8fb-abff-4dd5-9e51-bb8d3f1a9910'::uuid and finish_key = 'normal';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
