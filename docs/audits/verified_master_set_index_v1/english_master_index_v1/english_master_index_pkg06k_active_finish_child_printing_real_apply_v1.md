# PKG-06K Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06K active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06k_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06K-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `93a6199e422ce13f9f64142c05d9eb677d15522e95412c3578d4eff77893dbb1` |
| inserted_rows | 56 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"basep":4,"bw6":6,"dp2":6,"ex4":6,"mcd12":5,"me01":6,"si1":6,"sm8":6,"sv07":5,"sv09":6}
- by_finish: {"cosmos":27,"holo":25,"normal":4}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = 'f11e55fd-ab20-4f93-8564-460135e1fc63'::uuid and card_print_id = '5a88f7e3-847b-4d39-94e1-1891ca9dcafe'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'aee3d36a-a6fc-433b-b2d6-49c92555cf7d'::uuid and card_print_id = 'd807f57c-6904-4710-9ab9-de53d9bb1dc4'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '8abc3ac6-1fa7-43ad-9533-742711afc811'::uuid and card_print_id = '353b9924-4d4e-44b4-b55c-a28a5a377cb2'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'e8818427-7496-4c33-a0b1-705c8a16b8d4'::uuid and card_print_id = 'd3b5a22a-f7fe-4088-9756-845e95ab3011'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '83b37eec-6b28-4e19-8779-7cbb02a52bc1'::uuid and card_print_id = 'ba12910d-12b8-48ea-9623-d717bfb211d1'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '0eb48e5c-0ba1-48cb-ae01-8dfc2123a29c'::uuid and card_print_id = '079ae0a0-eba5-4620-9e72-801bd0a1714e'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'd533920d-72d3-4c74-ab71-28eebddb44ed'::uuid and card_print_id = '5af74dbf-2b3d-4d92-b17a-a5cc3fecf13a'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '38081e9e-73c4-4e36-bf85-876e82cc5fb8'::uuid and card_print_id = 'c9fc79b3-3130-4910-b4b7-1aad5d31d874'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '1e58e3a4-0ed7-4d16-acf6-e2ba4464cd3d'::uuid and card_print_id = 'f92b127d-17a6-4c93-b638-c29434a6c031'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '3e20f4e7-ace1-4caf-814f-b4c03d8639cf'::uuid and card_print_id = '54698766-cc91-4386-bd6d-dfc4f569f6fd'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '42e9904e-17e3-40c7-bff5-4c916dba54e1'::uuid and card_print_id = 'ec067898-aa72-4aaf-bb81-c7ee78527250'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '586f414c-a380-41ba-92fc-096f641e58fd'::uuid and card_print_id = '0be0dd94-49c6-4d58-9cef-b29a4db22142'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'b37bc1c3-c5c1-436e-9a0f-e4182686e537'::uuid and card_print_id = '98c489f9-e34c-4687-8130-afe70b3ec450'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '0f57d1d8-6ef9-4c7d-b045-bf07fca3cca3'::uuid and card_print_id = 'f623349e-0ea2-4a4d-a370-a8bab7152498'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'aa0d9fd3-9354-40d7-b209-3b7f530ad43d'::uuid and card_print_id = '3d3119f4-18bd-4dae-8611-455ebce1cf4a'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'aceabf6d-ddda-471d-a35b-5347fe16c729'::uuid and card_print_id = '99282997-fa3a-4764-bd55-9411860d9b10'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2172b0a9-b9c8-42ad-9f4b-650a9b168bb5'::uuid and card_print_id = '23ca8e6f-6772-42a9-96cd-78e4cf338a02'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '5e088fe5-e7e8-45bf-9ecf-825f3ab1ad15'::uuid and card_print_id = '5081ec1d-979c-419e-b838-8e58ea4da5d8'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '96c321fc-771c-42fe-8f60-d47fa69fc814'::uuid and card_print_id = '48d366e6-c3fd-4ec4-92f2-5032524aafd0'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'dbe46339-331f-4859-8a36-73ad911ead31'::uuid and card_print_id = 'e2f2b04d-c672-4051-9105-b712a8f2ca16'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'fe81dec0-27f5-434d-b4dd-4ea88a818de0'::uuid and card_print_id = 'f142196a-ad89-4138-9540-e27067505fb0'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'fa493bd3-c0f3-4699-a689-187c7f500aa4'::uuid and card_print_id = '4b0ca559-e74a-477d-8d33-d027fddbc58e'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'a5a63fc3-55c1-4579-b3fa-c1e6c38fa10a'::uuid and card_print_id = '948a7294-2833-4f53-81ca-a9ff677e215d'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'd8b2a25d-17fb-417c-8105-20bcdee42c6c'::uuid and card_print_id = '4c23f0ab-4d8a-451b-bcac-a47dc3b189c3'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '3ddce893-6fb9-4999-981a-335b624043bc'::uuid and card_print_id = '72047f9f-df62-4b25-b90a-fcde0da3ebf3'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '4fe604db-0023-4faf-863e-dacadade5c4a'::uuid and card_print_id = '63fc471f-1a60-45f8-91c9-3675d959dd84'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '82777d06-fb45-4761-9be9-5371ba02179e'::uuid and card_print_id = '16163c20-78d4-4c1f-9b8d-5ad033c55170'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'd3356c58-2e40-4dd9-9783-94197f78a287'::uuid and card_print_id = '0e9d8afb-099a-449e-8201-d05eaf4970c6'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '5161e4da-3781-4149-93ed-eb12773ffc42'::uuid and card_print_id = '87e718fc-f5df-46ba-8a40-32f1881ada53'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'a9b75f1c-229d-4b6d-a371-b19821653778'::uuid and card_print_id = 'dd8f0c4d-ac21-441d-a57f-34be3a02a6f8'::uuid and finish_key = 'cosmos';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
