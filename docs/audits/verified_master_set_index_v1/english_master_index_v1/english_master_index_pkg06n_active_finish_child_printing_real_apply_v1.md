# PKG-06N Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06N active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06n_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06N-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `a21913de6bb88b867dfd8d081cc4e0c2a813feaa4f48fba62a129296bf713987` |
| inserted_rows | 21 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"bw2":2,"bw5":2,"bw9":2,"dp4":2,"dp7":2,"dv1":2,"hsp":2,"mcd11":2,"neo1":2,"xy9":3}
- by_finish: {"cosmos":15,"holo":4,"normal":1,"reverse":1}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = '106ce585-847b-4f7e-be5a-a44f325cedba'::uuid and card_print_id = 'ca560f24-c889-42e9-97b8-dcacb0375740'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '6e50b741-6221-4655-bdb8-05315965d93c'::uuid and card_print_id = '5e9fef92-65af-41f8-a2cd-fc3f6342fc8c'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '1ab41134-b302-4c04-953e-2a8c48de6eda'::uuid and card_print_id = 'fad43142-6bff-48ec-b2a0-a1a6b8e51251'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'b1c0cb88-be0c-428f-a4c7-5f6478efcbf2'::uuid and card_print_id = 'b29f5f7a-c9d5-416e-9938-eeb3acef7465'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '314fb566-fc5c-4e30-b945-67e4dd31e9b0'::uuid and card_print_id = '60ef1c8b-a004-41af-b008-40a722fc5c6b'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'ba00ec88-051e-4453-ae86-ea15c64bb417'::uuid and card_print_id = '8dcb6716-734c-4e0f-870a-a47a2ccaec5c'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '86601df6-63d7-4407-8a51-04c297d0da78'::uuid and card_print_id = 'c769b72b-4559-4eb1-a745-79d8514d4f6a'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'd0649209-e79b-4e40-bae0-214c69665003'::uuid and card_print_id = '5a2dab46-36be-42a4-81eb-5cc8388e75a0'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '3707be5a-0605-4371-b0d8-df9887c347fd'::uuid and card_print_id = '1d550f8e-b2be-45f0-a7c0-da1895f03fd8'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '4d946282-89a7-49fd-bb71-0e91f9078753'::uuid and card_print_id = 'b86a3c34-266c-42a1-8e8c-52456ce31bd3'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'eeb0a9ad-48ca-4176-ad6d-4c28e03ae2ed'::uuid and card_print_id = 'a8f079f8-c1f1-40bd-bc10-e735077c8106'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '0c8ade80-9565-4b33-800f-c371a5d05c33'::uuid and card_print_id = 'e8444009-0c47-48a6-af07-f5b450ac0082'::uuid and finish_key = 'reverse';
delete from public.card_printings where id = 'a9537b4b-1396-4113-94e6-abb61917b54e'::uuid and card_print_id = 'd978fa20-f6aa-44b8-a501-79f5b543c104'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '0d172198-629b-450b-bd67-a5794246e84c'::uuid and card_print_id = '31d877dd-a029-4a27-b1a1-c7ae1fa016ec'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'fa295f8f-e124-469a-94a6-3f54cdac54bc'::uuid and card_print_id = '009cbfaa-e544-48ff-892a-d9b944b52e9f'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'ff648756-1e5d-4be5-82b1-67cb618494d1'::uuid and card_print_id = '7563ffed-0a77-44e8-9c63-71a43939e4c5'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '985aa2c7-2039-47e5-acb1-b322cd66eac2'::uuid and card_print_id = '68aae708-14f7-4b85-9234-efae75b1796b'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '1028bee9-645e-405b-b6f0-f5df1f330e79'::uuid and card_print_id = '33697b43-8f8d-4560-b987-85f43c2e9557'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '79a36bb0-770b-47dd-b8aa-9ad24259de22'::uuid and card_print_id = '9622a3e4-ea20-4447-8f92-8dc4d3e28bb0'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = 'e635e891-3fb4-4d32-9498-94deaa8e7f68'::uuid and card_print_id = 'ad868cdd-6061-4415-bd7f-379f04856d4a'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '376af764-558a-405c-9ba8-41b5ca3326c7'::uuid and card_print_id = '203cba12-16e7-452e-a21a-2c265796dedf'::uuid and finish_key = 'cosmos';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
