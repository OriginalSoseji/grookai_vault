# PKG-06O Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06O active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06o_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06O-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `1010018fb1c6e78cde69680d5ca6548b1c18a87889aa015e7306db45a8a99449` |
| inserted_rows | 40 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"base2":1,"base3":1,"base5":1,"bw8":1,"dp6":1,"dpp":1,"ex2":1,"ex3":1,"fut20":1,"hgss3":1,"mcd18":1,"neo3":2,"pl1":1,"pop7":2,"sm2":2,"sm3":2,"sm3.5":1,"sm6":1,"sm9":1,"smp":2,"sv06":1,"sv08":2,"sv8pt5":1,"swsh11":2,"xy10":2,"xy11":2,"xy2":1,"xy5":2,"xy6":2}
- by_finish: {"cosmos":24,"holo":9,"normal":7}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = '6094d858-bdb7-43c5-a46e-fb44bd4f8b55'::uuid and card_print_id = '34fcf0c5-d399-40f0-9991-0f79d5ec9d7e'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '4fba1a8f-89a5-4d1c-927a-385a39fced36'::uuid and card_print_id = '7bf4c9f2-4713-40df-a462-7f36164c6391'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '9022747c-f7c2-4fc9-8962-26f030f1889c'::uuid and card_print_id = 'ce6ac2d3-7342-43bc-bdb3-272ab3d5a287'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '4d39f5dd-5c4e-4fee-b3eb-a6f45f0c2d0e'::uuid and card_print_id = '87270efb-0586-4b45-a5b7-2290025157dc'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '5323201d-ece7-4afd-b175-fa32cb455019'::uuid and card_print_id = '982ec0e7-dba7-45da-9a34-9110b970a08e'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '90173e60-3c12-4126-b869-bac2b9faa0b5'::uuid and card_print_id = '38b1c885-c206-4b33-bcff-518df070c964'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '007c1f97-c3c9-4ea3-af52-fe60a95e8095'::uuid and card_print_id = '6611c72d-5fcb-4253-813f-766b25f2184d'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'c0c5cbf6-6232-44e4-8f45-3df93c9f680e'::uuid and card_print_id = '1e22707b-3069-4cec-b490-cea01912b714'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'abb3e339-3380-466b-830e-1ca20583e1d1'::uuid and card_print_id = 'f5fb70c6-b256-4097-bb0d-b01e8e77f3a1'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '1cc2d45d-801a-4047-bed8-7a83c2a8e548'::uuid and card_print_id = '0ffc8970-37ec-4b39-8eb1-30afd7559af7'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '21cb8a6f-1442-48a4-9962-7cd44d174be2'::uuid and card_print_id = '9e0ec5b0-53fb-46a8-a8df-84bc784f01ee'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '3f2188d8-f994-42ac-a497-b7d3f616eba8'::uuid and card_print_id = 'c84c5fb6-c82b-42ba-83ff-4a95792fd36d'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'c6232f46-6eaa-4a05-afba-41de983c4943'::uuid and card_print_id = 'fcef490a-df66-4609-8dae-9ee1c64c1be5'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'd41330b3-63ac-4fd0-a620-a0d3ab6cd468'::uuid and card_print_id = '660a040c-c8cb-4e40-900b-6ad9fd36e9da'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'e1fc00b3-af6b-4990-a277-4d3f54dcb7b8'::uuid and card_print_id = '9cb42a75-9231-4295-b329-92916dad4878'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '7c1c306a-ca2c-476f-99c5-9eb8ca0a3ce3'::uuid and card_print_id = 'c3879354-edb7-4ceb-8f09-78e1cdc03485'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '31bdad87-3f69-46cc-9176-6e157cededb7'::uuid and card_print_id = 'afb538d5-4c8b-4438-ab03-59530a95df0c'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2b97b725-efc2-4c01-bfd9-5694c55dc02b'::uuid and card_print_id = '633d664a-46b7-4b45-9155-e2e9fa1e2069'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'fba65140-91f9-4595-995b-6b55c3e40d0f'::uuid and card_print_id = 'f569f9de-4830-4406-91ce-e97f159d3872'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '9867f9a4-cabd-4fa6-a392-dafc368b3086'::uuid and card_print_id = '44b92f31-c2a9-4cb5-bdbf-7f29eacfd06c'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '9ace33aa-4ab6-4644-af77-41b6b1d3b953'::uuid and card_print_id = 'ddf3c537-bbbe-478c-acb5-2634022c6db7'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'dff0c5ad-9c1a-410a-a25d-0c02d3e25948'::uuid and card_print_id = '0e43c24f-9c92-45ed-9ddf-08c357071371'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '33ddb6ee-4725-4031-a1be-312ffae2d00f'::uuid and card_print_id = '39392f73-5a93-4e9c-a1cd-ab2ba5218d35'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '9f851756-3f7a-4e1b-9f62-edbd1abf087f'::uuid and card_print_id = 'd3fb5d46-ab92-46f5-b16a-d9bcf91883ef'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '4b5aaca5-a6ff-44a6-9317-9b0f54a9d9cd'::uuid and card_print_id = 'c10ca532-50bd-48c0-bb75-0b0c73c03072'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '35bb0f3c-117e-484d-9358-097506207920'::uuid and card_print_id = '0a323582-0da9-4525-87e8-98363a040e54'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'b5636aa2-ecdc-4a37-aaad-acb1b2f2b934'::uuid and card_print_id = '7324c779-c306-4922-b449-744475ca97b0'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '51653be0-92c0-456a-b7bc-c7f6fc5224dd'::uuid and card_print_id = 'debaa368-c72f-4d4f-8a7c-26421a46ccb3'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '5f57906b-7259-464f-b856-db149b26bece'::uuid and card_print_id = '44d6adc4-b377-4b2f-a58e-7bec0de9686a'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'a0db6f43-2a17-46ab-9588-e2ce0e7c3d36'::uuid and card_print_id = 'f114b4a3-5225-4d59-9565-3302d9866a96'::uuid and finish_key = 'normal';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
