# PKG-06I Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06I active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06i_active_finish_child_printing_real_apply_failed_or_blocked |
| package_id | PKG-06I-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `99587da59b29b726112cd2806663442f4b5ab02d906bc7dd112931ded15b142c` |
| inserted_rows | 84 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 1 |

## Inserted Counts

- by_set: {"bw4":8,"mcd19":8,"pop8":9,"sv10":8,"sve":9,"svp":9,"swsh8":8,"xy3":9,"xy7":8,"xy8":8}
- by_finish: {"cosmos":57,"holo":9,"normal":9,"reverse":9}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = 'e9b87c1c-df1b-49dd-8674-d4f61ed66e42'::uuid and card_print_id = '97d1f0f0-a38b-483f-ac9e-93cc1b322b01'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '64da1f11-49bd-46dd-8b74-81b47a3be3aa'::uuid and card_print_id = '8abb6a59-0aa5-4e0d-bdfc-53cf11ae584f'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '53b3eef3-1b82-45d0-96af-146bb6997413'::uuid and card_print_id = '632e9c58-483b-4e24-9efd-8962a72b5156'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'e414578a-cdad-4e58-9942-b4abb5c715bf'::uuid and card_print_id = 'ad4bc637-addb-4dfa-bb70-5052b1ec0141'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '9e7907be-2fbe-4218-aa6b-196e8912ae70'::uuid and card_print_id = 'c50b650b-9c3f-44ea-bac7-fb6a3769ff11'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '01657e91-a993-4d29-802f-4fb646e6a779'::uuid and card_print_id = 'f83f391c-0083-454c-a301-acbd06c09a8a'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'a8195c0d-44ae-4e16-8334-279e816046f2'::uuid and card_print_id = 'd629dcad-ed05-4495-bbf3-f0810a5d4ffc'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '2ce222be-e3ff-4fdd-b2a6-af78e01c25b6'::uuid and card_print_id = '96bf2d63-4e0a-44a9-a3fc-a0b8b7eeabf4'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '9113379e-2d75-4745-b7d2-9e62ed9bf70e'::uuid and card_print_id = 'c5c33084-6864-49b6-afba-b2f2d3859228'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '1f790d6d-8dda-4995-acb6-9e6496775c9e'::uuid and card_print_id = 'a37ba3dc-1e08-48b6-9315-f5230bf356e0'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'bd83649e-f984-48f1-a679-d65b2fd8c414'::uuid and card_print_id = 'da9ba45e-67da-45d7-8bad-accde5b78120'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '7ad42dff-6bc3-450a-9e84-7a3fd8059e4c'::uuid and card_print_id = '8497d1b0-a635-4a0b-a682-9591ff32b8a0'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '7152a1f8-b7e1-4505-a62b-d954e5fa0fa8'::uuid and card_print_id = '0a06037d-8ae0-4f51-ad49-876e4155a216'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'd0ed618e-4182-48f9-b024-3cb36fa842ad'::uuid and card_print_id = 'bd4bc44c-92b3-4f59-b282-a393685bbc7e'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '8e1aab0e-ceab-4b91-9fe7-0bb1c2dbb4d4'::uuid and card_print_id = 'cdcf72c4-d4c0-4f6b-a5a7-4111d937d106'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'a213a19b-6780-4327-9c7a-d1cf31b921c8'::uuid and card_print_id = 'a16a4c39-c18a-4ea0-8e04-5324e324fec9'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '97a6673b-7b17-4019-8542-3240813f8900'::uuid and card_print_id = '0730e779-b9b3-471b-b680-0e4e0966f155'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '4a93b91e-e130-41eb-a8a9-2843baa60d92'::uuid and card_print_id = '08fe7d65-d0d6-4e96-8a20-416ad4085728'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '2c5a7c56-ca44-4219-9c05-ffcf1a1f2c33'::uuid and card_print_id = '4b816afd-4f4f-488d-be21-e237a1176373'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '68ab31ab-9d4f-4166-83ac-9aec559fe832'::uuid and card_print_id = '4b816afd-4f4f-488d-be21-e237a1176373'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'd8946b00-7b3f-49d2-a834-9ed5c1951ed6'::uuid and card_print_id = '54c2f783-f42d-4ec1-bd0c-b0a37185b64d'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '8fc2208a-f883-43f4-a461-b70b5fc2f5ee'::uuid and card_print_id = 'b12fb97d-7f8a-42f9-a574-1efcf8d995da'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '1ec92fd8-f306-425a-9dc7-1dce6cccaf3b'::uuid and card_print_id = '55fc291a-fc74-4e85-af01-3f6e5024827b'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '0c779e54-0a64-4d01-b6cb-23cfe29e9fa8'::uuid and card_print_id = '745a27b3-78d3-4422-b991-409212210788'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'a1091b7d-fc96-4b01-8c62-57995c1b50fd'::uuid and card_print_id = '0c94f0e6-2d3d-442a-8d6f-934256e2e3cc'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '14acb9c7-4d30-434a-a4f0-795ab6d338cb'::uuid and card_print_id = '0a6954f3-9a1c-4f5f-93d5-56b1744c1618'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '0c5a0d3c-f60a-47df-96b4-e45bac7f2ce6'::uuid and card_print_id = 'b2c60343-de28-46f7-95a1-4b460253d436'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '9f6d2ee1-b7fc-4818-af54-a3241729efc4'::uuid and card_print_id = '7c248920-500a-4f3a-ae3f-976563f983e0'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '31cef076-20cf-4b62-8fe2-1d6d4edd9c04'::uuid and card_print_id = '09cdff39-a3f8-4b9d-ab2e-0b337e8b5eb1'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '48abed30-cb11-4dd6-b6f8-4e134586d6b3'::uuid and card_print_id = '2f69c5c1-6fca-43a1-9b68-bc4b139f676c'::uuid and finish_key = 'cosmos';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
