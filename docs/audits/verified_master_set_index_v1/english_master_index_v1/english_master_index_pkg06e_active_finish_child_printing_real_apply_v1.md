# PKG-06E Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06E active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06e_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06E-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `87af87fa1a17297509296b6a06d421ec8840a8323d6f348bff01817962408aa6` |
| inserted_rows | 391 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"ex10":102,"ex13":99,"ex7":95,"ex8":95}
- by_finish: {"cosmos":2,"holo":2,"normal":1,"reverse":386}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = 'b252ca9b-922a-4173-9987-a64749a56c45'::uuid and card_print_id = '8ee10c61-bbe4-4a20-aadb-4b994928c9de'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'abbac365-b99f-410f-a64f-80c91d412b79'::uuid and card_print_id = '37feef99-b49d-4bc6-b8a7-f6f00a6c20a0'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'fafaba7c-411b-4a24-8b9c-06464b7fbb2c'::uuid and card_print_id = '739e5895-dda4-4b78-be0f-666a46adf683'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'd6f90938-4d29-4f35-b5f5-fdec9c9339de'::uuid and card_print_id = 'd9ee5c52-f20c-4297-bae1-158b8c917295'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'ffcb1909-56b6-467d-825e-fbb1d10911f8'::uuid and card_print_id = '9c0354e9-2d78-40f6-8b7c-d00338a7c01a'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'fb76a0c2-8d2b-4d33-b1f6-c38b8e73fae5'::uuid and card_print_id = '7a33520a-4c5e-484b-949f-40a55d516e0b'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '5f77c98f-fb20-4445-a9fc-68fde9f5412c'::uuid and card_print_id = '6d696256-a3bd-406e-9da2-c7f89e23a2e4'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'b083f034-7902-4d93-a472-ad0745df599d'::uuid and card_print_id = '725baf43-dc1c-4c2e-ad73-dc519a883df7'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '617e7c63-b033-4549-9f07-635472085282'::uuid and card_print_id = '27756107-ddad-4566-b7be-d55f4c068c49'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'd4777d54-fda3-4ddc-957b-c5418d75abc2'::uuid and card_print_id = '1fe8a5a7-f9a1-4994-b57e-d7cab44a6897'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '124cbd23-3fd2-4532-a12b-dc493c24ff3f'::uuid and card_print_id = 'afe56a84-c217-408b-9264-1c3419521d84'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '822e4860-51c4-4068-8ae3-bd228bb607bb'::uuid and card_print_id = '51e8ea72-de87-4d13-9028-721821d43634'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'bcadcc24-c649-4393-b8d5-8819cacabdba'::uuid and card_print_id = '1e2313f0-14da-4fa0-b93c-63cbe1a54781'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '08593458-4230-437e-94a8-09668e076194'::uuid and card_print_id = '242bbaf8-2953-42c5-9ff1-9863c146d128'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '885e7e69-f9d4-47a4-90b3-ce2ca6b838ba'::uuid and card_print_id = 'e1ca45fe-c438-44f6-8653-f95734d464f2'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '81a7d15b-29e6-40ec-9dd8-70f3a30faa5e'::uuid and card_print_id = 'ee4a8349-1e19-456d-8c4a-96ad0aa98e36'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '9924d4d5-406c-4707-8a76-5f8e71f8e56f'::uuid and card_print_id = '16106d78-8e54-429d-a964-cfeaadd48f8b'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'fbfaf7f4-3da5-428f-9fde-4dedb4435f63'::uuid and card_print_id = '68db629a-11cd-4dbc-af11-4514ee5f7f4e'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '0be0c604-85eb-4dc0-8ee4-26ad1dc03e4d'::uuid and card_print_id = '18e64ab6-a2b5-49c5-843c-f6c8ef92cac7'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'f5351287-7cf2-4fae-8423-747c43773b0f'::uuid and card_print_id = '5348127a-ed70-45af-9de5-78c7c26661dc'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '473ce994-f891-4cf3-9dab-534c800526c8'::uuid and card_print_id = 'fa95f3c5-6c19-4c53-87f6-4e89e34fce7f'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'a34c5204-4f62-48e5-96c4-d75626492f8e'::uuid and card_print_id = '749ca92e-7096-4297-b8b4-e27f1b09888d'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'efcb5f2d-c3bf-4fc6-b469-d6de9af29d52'::uuid and card_print_id = 'fc8f6b7e-0ca2-4760-860c-95e21957a12a'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'fe3ed399-5b7e-476b-878a-cece2abf378a'::uuid and card_print_id = 'f4594453-e909-40fa-8ea6-f4578bcc2a87'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '0d3750d5-795e-46c9-aa3c-5e87b3d626f1'::uuid and card_print_id = '37af8f65-6c0a-4f54-89e8-69eeebd9d3c8'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '2545f7a9-2eb0-4226-a95f-a606a669223d'::uuid and card_print_id = '4f2267a9-e9bb-4ad2-bc99-d39020338933'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'e9f09d5d-d3c9-4934-9458-326642a15045'::uuid and card_print_id = '21e7fd5d-4979-4269-b008-3561d63a5936'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '25ad5447-fa0b-456d-93f1-12c3c3f59f12'::uuid and card_print_id = 'b7ce5779-f8b1-444c-a8c2-27da91f38d70'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'd376d8ce-0e93-41cc-bdf0-0c50c47c6772'::uuid and card_print_id = 'b7ce5779-f8b1-444c-a8c2-27da91f38d70'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = '1458dfd8-4a86-4052-8fbf-9f6d56763b9b'::uuid and card_print_id = '377563d8-d4e9-4e3a-939f-d68e002f934c'::uuid and finish_key = 'reverse';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
