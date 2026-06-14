# PKG-08E Existing-Parent Child Printing Real Apply V1

This report records the approved real apply for PKG-08E child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg08e_existing_parent_child_printing_real_apply_committed |
| package_id | PKG-08E-EXISTING-PARENT-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `7bed0d85cfc7f875d902bb1b7453107a00be0a4b69329b171ef4583c7e6e2ef8` |
| inserted_rows | 16 |
| target_parents | 15 |
| excluded_resolution_rows | 0 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_live_set: {"sv03":16}
- by_finish: {"cosmos":15,"normal":1}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = '856463b3-bf34-4dfa-bc36-14614de996db'::uuid and card_print_id = 'f4edf4cf-001f-49e7-9103-601d4b8e7292'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2d431ccf-56ff-489a-bd38-668bf3182fcc'::uuid and card_print_id = 'f1474ae1-7dd2-47a4-b87b-96fc64c2b7d2'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '3e881cd9-6ce3-45fa-a24b-c62a4023b10b'::uuid and card_print_id = '19367674-b09e-494f-b0c3-4c76eb69b25a'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '6ee1d643-7a4f-47e0-a9ab-905ef2ed5bee'::uuid and card_print_id = '13309a0b-743f-43df-b6dc-d14bcc7c751c'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '8a47819e-0c54-45d0-ad86-d39b0e0521bc'::uuid and card_print_id = 'f7b208f5-9be8-4b91-be1b-b6f323d64b16'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '615260f4-94cd-4d5f-b092-bc1fa3ab9555'::uuid and card_print_id = 'c25b8f46-aaa7-4568-90e7-9b961f11d533'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'fd1f17c4-66b2-4479-807b-98a3289aaff8'::uuid and card_print_id = 'd967570a-fa10-4e32-a2e4-f3cc39a312f4'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '7246207a-8955-4e8c-9988-c12fa228a2ed'::uuid and card_print_id = '16c07846-2fd1-40c7-b336-4af005efa35c'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '12a6979e-4159-4af3-ac10-96d8bd8c3d9b'::uuid and card_print_id = '16c07846-2fd1-40c7-b336-4af005efa35c'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '9f3df071-7acd-4736-817d-756c45996fe4'::uuid and card_print_id = '52228f2f-5bc7-4b75-8eaa-bc6738d9e776'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '1b6607f0-2107-4573-9145-ac4add9ce06a'::uuid and card_print_id = 'f359a0b3-b234-489a-948f-47e44562af87'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '882b1f34-8e58-4d63-a349-f93e9d57da1b'::uuid and card_print_id = 'af132509-8f4e-4557-8397-c67472a31ce9'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '10f0512b-d49f-4777-afe2-eccd1e259b03'::uuid and card_print_id = '26268bd0-483d-4567-8181-8a8a6402e14c'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '4c0b426c-0ca7-4dd7-a315-a23652f406d2'::uuid and card_print_id = '0afdebcf-5c5b-460e-9964-da4e4d2c714a'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '357dd61e-7261-4f03-b495-b30ec6485fb7'::uuid and card_print_id = 'bc7985a8-866b-4b71-ae4d-f78117a04258'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '25b38687-84be-4e93-8943-94e3a3aab8f3'::uuid and card_print_id = '857409a9-91c2-44a1-a539-c2caa68e98e1'::uuid and finish_key = 'cosmos';
```
