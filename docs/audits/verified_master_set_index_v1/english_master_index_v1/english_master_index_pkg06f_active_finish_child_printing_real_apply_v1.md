# PKG-06F Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06F active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06f_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06F-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `795cb07aed903181a3f671c1ad76d55139ca31dcf73c84269a13494d71b25a5f` |
| inserted_rows | 355 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"ex14":88,"ex15":89,"ex5":90,"ex9":88}
- by_finish: {"reverse":355}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = '5468e86f-34c7-4ff3-80b9-e10869f82374'::uuid and card_print_id = '0361f2ec-2533-4f55-bcb5-5bd1bc4cdc34'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '46a099dc-0456-4249-9a23-e55c6133cfb5'::uuid and card_print_id = '634ae142-9357-4cb4-bf5a-246c976d3007'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '9bb66b36-5196-4ed1-8fb4-ea4a136c7601'::uuid and card_print_id = 'c2561232-f0d9-4331-9849-e634033858b4'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '5181374c-d3f1-4fa7-9248-1c7c0384a018'::uuid and card_print_id = '579bbeee-78b9-46e8-b56f-aaf52c6cd3ac'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '7d2ecae1-20b6-4893-b370-0ca87c1a6de4'::uuid and card_print_id = '70453d58-5852-430c-9479-6aeb6851db6e'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'bb229336-3228-40cc-b5da-3fb3e188cc3b'::uuid and card_print_id = '92c0ef50-325a-44d1-b9c2-c2e8bd0d6aba'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '384f48d5-5a13-404b-9ad3-802ef4ec0f61'::uuid and card_print_id = '9fdf0bd4-36c6-4a91-ae01-94882ac9a8ae'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'd62b1a73-d94d-4549-bcc0-cf6ad01d208c'::uuid and card_print_id = 'f42f89ba-a8c1-44bc-b809-1a1ddbfccd49'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'fc2c9b96-4442-4954-9ba5-481688412962'::uuid and card_print_id = 'd15b822e-e771-47f4-8853-23e94dcac0d5'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'a59c30bb-02c6-4a3e-b42e-55e704b73f35'::uuid and card_print_id = '9f0302d8-ec52-4db7-9c53-0b7ea12d714f'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '81c2ae37-058d-48e0-aa2e-3902f7da738b'::uuid and card_print_id = '1026aff8-e7f6-49e8-b219-40447febf8e6'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'c285d450-51a3-40b9-b2b5-ea78ec7ffb11'::uuid and card_print_id = '47328109-8708-4e44-acfd-b9b2b7c751c3'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'ed75797e-3dbe-4fdb-93c9-1fbda4ac5675'::uuid and card_print_id = '03e4f54b-c315-45cb-baa4-0b5ab559cdfb'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '09c32cb1-6135-446c-80a9-98c74765dba7'::uuid and card_print_id = '68f9a8d7-dcaa-4208-94b3-16af1544191b'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '796a3b52-f06f-40a2-a564-3d3b215c4934'::uuid and card_print_id = '994fa8e9-bd9f-4f87-b2ad-33a1946655aa'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '562dfa11-246c-45de-8595-4b44d6e718fb'::uuid and card_print_id = '620e454d-c379-4e74-815d-b8f6c3eaeabe'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '1136ee6a-9109-4d73-9452-ffac71e3fadc'::uuid and card_print_id = 'bca0f29c-cc1d-469d-9d51-45cd237e2ba8'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '68cdf6dc-d93e-402d-8e4f-697f65ef0cd8'::uuid and card_print_id = 'fded0d58-1c46-4001-861a-fa30788a615c'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '7bca42eb-434b-4f66-9f40-9adc6b73e450'::uuid and card_print_id = '2387342e-5573-4d67-9278-64346a40c0ee'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'bfde6897-3e09-4576-91c4-d798b5a0d9ad'::uuid and card_print_id = '5fa190cf-1f8b-4b4a-b3d2-640ac1c7907b'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '78c9f77a-df5f-47b8-adc4-be7aeebdec60'::uuid and card_print_id = 'b294c932-ea2b-48a5-a5f3-411c9cd94c43'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '093752e9-9c12-4b1f-8847-ed50d0e53df0'::uuid and card_print_id = 'e4b9fddb-64be-4419-988f-54e92ac837f7'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '551e58d0-1f00-4364-904f-ae36ac3cebe5'::uuid and card_print_id = 'c2983d4b-2c46-4898-aa3b-324911548c0b'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '0b6e59db-d1e5-4554-b703-57bb7a0621ff'::uuid and card_print_id = '5a7baf60-9197-4aaa-98c6-29aa5e040172'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '4e5ab4f6-ce75-4c18-991d-505f92d00716'::uuid and card_print_id = 'ae096283-7e30-4e76-a486-f199a4ccad7a'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '7db87f40-4608-4024-9aa8-6bd94d1be4c6'::uuid and card_print_id = '506a4a8f-05ed-462b-a7af-9288112d6938'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '546519d6-b0c2-44a0-8283-8deea4ae6bcd'::uuid and card_print_id = '34878d41-17f6-4b3f-957b-466138935ddc'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'aec7123a-f4f7-4e43-873c-22cb4ac10666'::uuid and card_print_id = '6a8226b1-b8f5-4820-bdc2-ef34327ebd36'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'eacbba7a-4802-43f8-ab7e-fa8697f8548b'::uuid and card_print_id = '62fa2cac-8f96-436d-91ee-1baec662504a'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '087b40aa-f837-4d96-b1b7-2ea51e6a8591'::uuid and card_print_id = '6b4c17bb-1dbf-480b-b692-85d6946748d8'::uuid and finish_key = 'reverse';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
