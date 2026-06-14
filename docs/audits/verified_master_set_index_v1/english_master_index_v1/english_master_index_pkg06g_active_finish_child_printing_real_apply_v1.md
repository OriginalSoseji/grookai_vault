# PKG-06G Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06G active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06g_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06G-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `4218f824485c51703e3428dbd1e8e5dcacabe0490242500cc3d803efdfd7baad` |
| inserted_rows | 313 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"ex12":81,"hgss4":15,"pop3":14,"sv02":17,"sv04":20,"swsh1":20,"swsh2":17,"swsh4":14,"swsh7":56,"swshp":59}
- by_finish: {"cosmos":38,"holo":115,"normal":46,"reverse":114}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = 'ebe9d4e8-4b4b-4570-9d44-7de7f68e32ff'::uuid and card_print_id = '61fbb6c3-4b5e-43a7-a106-bd1f38fdc05f'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '4998cb13-ee1f-4900-8185-0410290afd52'::uuid and card_print_id = '8114479d-d07b-41b1-ba6f-dfa0d30124ed'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'b41fb588-0733-40e6-b376-919d5ae4f87e'::uuid and card_print_id = '267a49f0-f717-40b2-878e-2ffa9713b7a0'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '9429202a-b629-4281-b1a6-517016206335'::uuid and card_print_id = '00d9b073-9487-4e48-9995-1e78919ae7f4'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '9303e504-0501-4e2a-8743-ec3b954f0e74'::uuid and card_print_id = 'd919a551-b1e0-4a45-9d65-4fb885a1745a'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '930491f8-2b43-4e3b-8df2-5859d2d45e1c'::uuid and card_print_id = '18ec1dbc-073a-4dbe-9fe5-d96a9b4b9aaf'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '19dae128-989d-453c-8a2f-c6e311dc813a'::uuid and card_print_id = 'c569e240-e81d-43e3-be98-9092cdab5b45'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '3d71f744-3491-444c-ba21-71cacd0898cc'::uuid and card_print_id = 'ac601e43-ac76-4cfc-b22c-edb9fe214ad0'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'bc78a53d-4b40-4db5-a9f8-26a2ca0cb153'::uuid and card_print_id = '0c3e568b-b267-4665-b2fc-ff814f867737'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '9fd328e7-8415-49cc-9d0b-3dabb2a3a60f'::uuid and card_print_id = '95bfc36b-9510-4155-a882-0dca6300b1f8'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'aa6bb03a-f1e2-4d8c-89c7-218706829042'::uuid and card_print_id = 'b466265f-9c0d-43ed-bca5-3dcffd85c7f3'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '60128906-927a-4f2a-aa49-4fa7595c4c30'::uuid and card_print_id = 'ccb03a58-7b44-4cc7-86ba-60aeecb06fb0'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '1a4c7a09-4778-40e9-a913-faa63b59d587'::uuid and card_print_id = '8432394d-bf7b-4df9-87ed-052d7e944775'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'a1b19558-5354-4555-a8bf-a6f8f7ef892a'::uuid and card_print_id = 'fbb19eab-cc36-4211-acab-571eb5b1ac01'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '527332dd-a321-4ece-b352-ddd1cb351d7d'::uuid and card_print_id = '14f2cbc3-e802-438c-8594-da34e8bd2e8e'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '8042fab3-ad21-420a-b41c-f04175409690'::uuid and card_print_id = '59deaaad-78b7-4286-be0b-a0d26f0172a6'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'b32d1fd3-ac98-4bce-829a-448d3cebc203'::uuid and card_print_id = '62ecbd58-a8ae-40fa-bc0e-d0722ab6c81e'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'b50382ed-c5c1-4726-a04f-832519a827f3'::uuid and card_print_id = 'b10ccedb-cfb4-44ba-8297-7b0133906be4'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '197f24e4-89e7-4122-a2f1-b0d5d3c4d3ac'::uuid and card_print_id = '0fc53b68-ad65-41e8-a10b-af8509dca5e7'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '6fe3ed3f-a91a-4cd6-aeae-2622b6c605c6'::uuid and card_print_id = '2a833141-11f6-4cb0-8b72-add4223864b9'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '08d6b238-a7b0-47a1-a529-35fb4ec389c1'::uuid and card_print_id = '8f42c67e-beee-4bf0-b800-2d85e13048eb'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '0e7ed87d-06da-4b9e-8d6f-6c8e28701bf7'::uuid and card_print_id = '59f1082f-a580-4426-a17b-bddd4eec7a98'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '753eb663-bbf4-4bd9-8248-ee59299c38e8'::uuid and card_print_id = '8ef05297-43d5-4203-ac9c-234acb2a8a2e'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'fb2a1649-38c8-4e75-bd52-082a95ad7d20'::uuid and card_print_id = 'b4306568-b829-4bbf-9b31-41c139c6e9f3'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'e2aa26bd-c8af-428e-81fa-fcbd3f9f80b1'::uuid and card_print_id = 'd5fe75e7-fc60-42be-ab0c-187039cec15f'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'fa664f65-65da-474f-8359-cb6175baad2b'::uuid and card_print_id = 'd8b6a72d-06dd-4efe-a36f-5fe888daa7e7'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '60ed414a-ae8e-4bad-897a-638afaadb972'::uuid and card_print_id = '05d79e44-89a3-483d-b99a-3b4a76854c9e'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '005d2730-8a7b-4129-9e80-b7b5f9bce2e8'::uuid and card_print_id = 'bb06831c-564f-4e01-a891-d6d7bf4c4c36'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'e71a34b9-c34a-47dd-89b7-48aeb78ccd2e'::uuid and card_print_id = '62c603bb-0c1b-4108-bdb9-5b6e24c21e64'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'df15396e-cbc7-4153-98a2-0173b0e9dcbe'::uuid and card_print_id = '375b081a-2934-4a9b-a9bd-6cdc893278eb'::uuid and finish_key = 'reverse';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
