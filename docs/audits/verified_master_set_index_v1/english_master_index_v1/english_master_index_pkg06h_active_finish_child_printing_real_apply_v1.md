# PKG-06H Active Finish Child Printing Real Apply V1

This report records the approved real apply for PKG-06H active-finish child-only inserts.

| Field | Value |
| --- | --- |
| apply_status | pkg06h_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06H-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `489d80ab40043f16badef31a9553b3cba2031aabaefd90b7ebe328a946173c36` |
| inserted_rows | 110 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Inserted Counts

- by_set: {"ex1":11,"pop4":10,"pop6":10,"sm1":13,"sv01":10,"sv03.5":12,"sv05":10,"swsh10":10,"swsh6":14,"xy1":10}
- by_finish: {"cosmos":51,"holo":14,"normal":34,"reverse":11}
- parent_rows_unchanged: true

## Rollback Preview

```sql
delete from public.card_printings where id = 'e4c636a9-f056-46e2-ba01-c13460703e39'::uuid and card_print_id = 'da31f66a-e117-4193-956d-6d8e4842b37c'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'ccda7040-6308-40bc-8095-9718f9ea30e6'::uuid and card_print_id = '0445db40-90d6-4452-8def-df8a6563cb01'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'e1910e3f-ba88-4053-9fed-ab46699d32f7'::uuid and card_print_id = 'b0ae3b0a-ca78-4e05-8e1b-0ecd892455ae'::uuid and finish_key = 'cosmos';
delete from public.card_printings where id = '2d006acc-af91-4a86-b19d-1a14dc9496df'::uuid and card_print_id = '3defd22c-d3f0-44d8-89ad-85ff2e5b7742'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'c794f3e8-e445-4fef-9395-314343bd22f1'::uuid and card_print_id = '3e384211-8fd9-4e1e-b20f-aa688887bdef'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'd65c86a3-0b2d-4a50-b227-eea737c7b4c2'::uuid and card_print_id = '2ff2a2ac-8a3f-4b72-83e0-064759f85576'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '89294f2d-e22a-4aed-9f49-0318c5ef6daa'::uuid and card_print_id = '973ee7a2-fca3-4ebb-a4f3-b7de7a28793c'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '3961d011-7631-405a-8f07-e2597615b809'::uuid and card_print_id = '093eed10-f8ca-4ea4-95a1-8b5db8298460'::uuid and finish_key = 'holo';
delete from public.card_printings where id = 'c1c8662a-e129-4a41-b5e2-c76f520e784b'::uuid and card_print_id = 'f957da76-aeda-4460-b2e7-adbff61fbcd1'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '5f860264-6761-444e-9d43-b6ff40f33f4a'::uuid and card_print_id = 'd42f9858-bced-4c94-aafa-0f713fd35658'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '853babc8-4bf6-43ed-a992-4d0b8c3a59dc'::uuid and card_print_id = '22e14575-6c84-46a9-b2e9-98e66b5f4444'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '7e8d73f1-c498-401f-96d2-7a36e199086d'::uuid and card_print_id = 'b47aaf34-77a4-455c-bc38-ba8bc5c7cd46'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '8e51c778-cb8f-45da-ad1c-3381b26df2e7'::uuid and card_print_id = 'db946519-a997-4e7c-b3a0-31428ece7aaf'::uuid and finish_key = 'holo';
delete from public.card_printings where id = '765fbab8-3282-4c47-a445-f36470443f41'::uuid and card_print_id = 'db946519-a997-4e7c-b3a0-31428ece7aaf'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'cb642ca8-0ae5-4530-b46c-926960b5456e'::uuid and card_print_id = 'b681bda3-e601-4f05-a6ae-216f35d2760f'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'e992e724-1b78-4758-8dc4-efb3524b895f'::uuid and card_print_id = '1fc74b05-e77a-4ef9-8a84-d01367955afb'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'd359ac31-ea2c-4717-9dae-9e3259f4ed03'::uuid and card_print_id = '7dbc75a6-3b61-4322-8220-b5b1d4634e90'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'a5e3d373-b63c-43c3-b20f-bf6b425c136d'::uuid and card_print_id = 'f65cb048-2d64-4d74-ba45-f6f7d2593098'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'f6dd2f45-57ae-4c0f-a5f4-c16b2391799d'::uuid and card_print_id = '576aa929-3041-4a06-9fa3-228c63385217'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '8180216b-e7c7-47cd-abec-89ec2f9fe800'::uuid and card_print_id = '4548ef14-6bfb-475f-8ef6-ddead8c8e785'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '4fd0df4e-3b37-4154-95b1-6691ffedce12'::uuid and card_print_id = '792e6bbf-f862-46a0-80d0-94fc99a7e733'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '22726694-0d69-4f73-a71d-a5ce9ca9a260'::uuid and card_print_id = '99a700f9-a93f-46ab-aca0-d8d38a7112e6'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '3fdef5b2-9c44-4668-b652-705242413828'::uuid and card_print_id = '99bbb853-e286-49cb-9284-3fa60a4286d0'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'f230e076-37c6-4948-a019-22990c84c562'::uuid and card_print_id = '57ecf19f-0279-4492-a781-584610e8bb28'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'baf4abbc-886d-4701-b682-6519611a1065'::uuid and card_print_id = '01933037-9667-41b1-a739-5ee5d0e7b94c'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'd99e9cfd-8b55-47e4-9186-3b65cab803b1'::uuid and card_print_id = '3aff4d3e-78b3-40ea-962a-e46728922859'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '7eab1fc1-c1a4-4491-acbd-ab7edf116fef'::uuid and card_print_id = '3015d794-dad3-47fb-afbe-de5207223a7a'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '3349737a-a1a0-4e4c-a29b-bbda25be3b16'::uuid and card_print_id = 'f6201ecd-e583-4c22-a7a3-7fe3a3447261'::uuid and finish_key = 'normal';
delete from public.card_printings where id = 'bf5eb507-fe50-4d74-aed8-57c05e703bba'::uuid and card_print_id = 'cd796ddc-ae9e-4a0c-b5d5-88dea3e66eb9'::uuid and finish_key = 'normal';
delete from public.card_printings where id = '54e6a69d-4df6-4515-bc29-05bf89edca9d'::uuid and card_print_id = 'fbf4baa6-b0cc-4816-8f44-3507a476316f'::uuid and finish_key = 'normal';
```

The JSON report contains all inserted row IDs for exact rollback targeting.
