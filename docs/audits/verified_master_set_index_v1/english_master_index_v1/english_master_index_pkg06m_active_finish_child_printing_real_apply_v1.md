# PKG-06M Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06M active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06m_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06M-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `33c58f8b631f87aa6b798c054a3a9acdf0a149536e772de21376867129944b66` |
| inserted_rows | 30 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"bwp":3,"ecard2":3,"hgss2":3,"me02":3,"pl2":3,"pop2":3,"ru1":3,"sm10":3,"sm11":3,"sm7":3}
- by_finish: {"cosmos":16,"holo":9,"normal":5}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = 'a01ef970-838c-4a7a-b612-b6549d9e810f'::uuid and card_print_id = 'ed70b926-0713-46d7-bd0c-0a2cb00fde87'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '90fe28a3-8584-48a0-b4d3-fb12e6f3ec1a'::uuid and card_print_id = 'b4e7b7f6-1853-46b2-a2c1-314c972a9dab'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '1f9eca18-80ee-4853-b119-4ee16ca85dda'::uuid and card_print_id = '7d2a2ef3-947f-45e1-b131-f187756d25bd'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '6ef8d0bd-a586-48ec-9d36-e5cdce5ac278'::uuid and card_print_id = 'edf0bf05-f1c1-491c-bb1a-2a9a67f7e11f'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'ca8aaf7b-4564-41fc-8b61-52050229782c'::uuid and card_print_id = '10984a73-42e1-4d43-b849-2362ca0d3573'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'be6c16b5-93ae-4532-8350-93c203469d76'::uuid and card_print_id = '8ae44549-d90a-4fdc-b172-129a0aad89bd'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '06ee4e68-ff3f-4787-9cb4-183ffb22f2ab'::uuid and card_print_id = '90d02205-2ea4-4032-a1ef-a4ac2434aac2'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'd622ca54-3a47-4aba-b444-38682842bd17'::uuid and card_print_id = 'a7e40af1-416f-4e1e-9764-353276710382'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '7b87b736-803d-441b-81dd-c6d85d0480b2'::uuid and card_print_id = 'a30dd8d5-2b21-4092-8582-3da5477680f6'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'd75f2f12-d5eb-4f83-baca-8e2528878820'::uuid and card_print_id = '0856700a-d0d4-49fb-84e6-27730beee29e'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '24f42fbe-c38c-4451-917f-f03cd843c438'::uuid and card_print_id = '190e9217-eafb-4a79-96cc-283e21d6e691'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '84a257a9-411b-4c6e-8a4a-9b2d8d0c5fcb'::uuid and card_print_id = '2f3295d3-5c80-4baa-8485-42bc6094d280'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '2a7fbd49-e957-4452-823e-29b7ed3c9473'::uuid and card_print_id = 'da2e0954-6a8e-49cd-b958-bf8dc8e5a76a'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '71cf61ea-73a3-42ac-84d0-ef56b47f1e72'::uuid and card_print_id = '0fdb9d12-93e2-49c1-9808-b549b6140910'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '48cdd15d-31af-4d60-957e-56dc803b3698'::uuid and card_print_id = '11e2a93f-811f-48a9-a4c6-81a835711554'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '0f77b585-de65-4de5-a08a-518c5b43ae52'::uuid and card_print_id = '069c53c7-7485-434b-9bd8-9e3d9b53ca82'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '7fd55855-bc53-43fe-b731-63cc002c1713'::uuid and card_print_id = 'ba5dad59-94fb-4381-9b87-00eb500ccc22'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'f45c8d45-5ea5-4eee-a9e6-883332575b6c'::uuid and card_print_id = '65509b80-7282-406b-bc11-a1a25b526fcc'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'dda774de-1a9c-4ba5-b7a5-dc6dfa21ec00'::uuid and card_print_id = '2992e699-4147-44bc-a6f9-075578b45858'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '6493ad5b-3389-4003-9070-7e4f2535d03b'::uuid and card_print_id = '9713c94f-7091-440a-aa60-8892f3c87ac3'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '160058cd-dbfa-4c26-b127-cd0ec7397be0'::uuid and card_print_id = '1ec56d5e-a923-40a9-aa99-ce688f8a6394'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '5e4973e9-ac49-4aa0-be51-f9e4f4a3b742'::uuid and card_print_id = 'def2ed23-cc25-4287-bc26-efc76694fff1'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '6d1e9b8c-7c2e-464a-b7e2-0dc970d7336d'::uuid and card_print_id = '959ffbe4-673f-4349-9d95-423c262bb469'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '7b23635f-41f7-49eb-962f-106dcbba9eb9'::uuid and card_print_id = 'bffce463-454c-46be-b153-866141b06110'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'bd61c976-d691-49b5-96bb-165beda4d05e'::uuid and card_print_id = '80426d02-ca72-44d2-8eac-a95ed3d370dd'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '235ad83e-223c-4fcf-9d6d-1d780673bb49'::uuid and card_print_id = 'b52489d9-28a7-4dc1-8687-f1c458863db3'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'f5136477-fafd-434f-ae4a-4ebd8d99048a'::uuid and card_print_id = '6a88e7c6-80be-4036-989b-0d01a904e29c'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'db8087e5-a292-45f7-943f-58599dbc98a4'::uuid and card_print_id = '19881e11-b8f7-4a37-bc56-6e2f6608777f'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'b723d872-51fa-4865-877c-9f01e3ced1ce'::uuid and card_print_id = 'e4e4ebdb-ea21-4b59-aa71-ae9245697d14'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'e40c3590-630b-4e69-8423-a3379c71745d'::uuid and card_print_id = '74b1832b-a760-4f6f-95af-b8d8eb8e2775'::uuid and finish_key = 'cosmos';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
