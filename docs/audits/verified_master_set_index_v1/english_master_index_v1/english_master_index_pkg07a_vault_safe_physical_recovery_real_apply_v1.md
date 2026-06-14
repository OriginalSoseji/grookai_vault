# PKG-07A Vault-Safe Physical Recovery Real Apply V1

This report records the approved real apply for PKG-07A vault-safe physical recovery parent updates.

| Field | Value |
| --- | --- |
| apply_status | pkg07a_vault_safe_physical_recovery_real_apply_committed_and_verified |
| package_id | PKG-07A-VAULT-SAFE-PHYSICAL-RECOVERY |
| package_fingerprint_sha256 | `d6c304be4f6c3a13b316fbeb8297a8f27d7165f28bd7c2dcbfe4412bfc7f726b` |
| updated_parent_rows | 164 |
| preserved_child_printings | 253 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| child_writes_performed | false |
| stop_findings | 0 |

## Rollback Preview

```sql
update public.card_prints set set_code = '2021swsh', number = '1', name = 'Bulbasaur' where id = 'd34033e2-a8e8-4e72-b1e9-2033445e8f00'::uuid;
update public.card_prints set set_code = '2021swsh', number = '10', name = 'Cyndaquil' where id = 'ac9e8297-6e39-419f-8fa0-f58e90c80c01'::uuid;
update public.card_prints set set_code = '2021swsh', number = '11', name = 'Torchic' where id = 'c13e4ceb-5988-4215-8462-fc378bbe5e46'::uuid;
update public.card_prints set set_code = '2021swsh', number = '12', name = 'Chimchar' where id = 'cefedf7b-f1c0-42f7-af7d-e6e9279358f3'::uuid;
update public.card_prints set set_code = '2021swsh', number = '13', name = 'Tepig' where id = '43d5432d-7152-40de-9660-dd2893847b8a'::uuid;
update public.card_prints set set_code = '2021swsh', number = '14', name = 'Fennekin' where id = '0980ca25-d2fb-43a3-a74f-789e6a0f8f51'::uuid;
update public.card_prints set set_code = '2021swsh', number = '15', name = 'Litten' where id = '229d3337-9150-428f-9259-36ee0a0636e2'::uuid;
update public.card_prints set set_code = '2021swsh', number = '16', name = 'Scorbunny' where id = 'd74fe432-2990-49c2-b908-9c0fcec9eefa'::uuid;
update public.card_prints set set_code = '2021swsh', number = '17', name = 'Squirtle' where id = '0bc143c0-b558-447e-864c-c71c02e3c2b2'::uuid;
update public.card_prints set set_code = '2021swsh', number = '18', name = 'Totodile' where id = '12a7e22b-6d1a-4833-a2fd-c2f020ef0007'::uuid;
update public.card_prints set set_code = '2021swsh', number = '19', name = 'Mudkip' where id = '29d1fb6e-f0be-4ce1-a0b2-458845d33cad'::uuid;
update public.card_prints set set_code = '2021swsh', number = '2', name = 'Chikorita' where id = '987099f7-59e9-4c0a-9bbb-a0b8fa24a086'::uuid;
update public.card_prints set set_code = '2021swsh', number = '20', name = 'Piplup' where id = 'f36b29e8-8e24-4e0b-810a-5945738a1df7'::uuid;
update public.card_prints set set_code = '2021swsh', number = '21', name = 'Oshawott' where id = 'c9dbc8fc-b83a-4edb-acbe-d50c05e8a4f1'::uuid;
update public.card_prints set set_code = '2021swsh', number = '22', name = 'Froakie' where id = '3f8c67ec-ac7c-4c02-b46d-a7ff9e9af0b2'::uuid;
update public.card_prints set set_code = '2021swsh', number = '23', name = 'Popplio' where id = 'dd92a89a-084a-424a-b073-d1564e113919'::uuid;
update public.card_prints set set_code = '2021swsh', number = '24', name = 'Sobble' where id = '63ce9abe-eb16-4e0b-8a24-caa5cf820a82'::uuid;
update public.card_prints set set_code = '2021swsh', number = '25', name = 'Pikachu' where id = 'be9b1912-c62b-46d9-9081-acaefe8cf0c2'::uuid;
update public.card_prints set set_code = '2021swsh', number = '3', name = 'Treecko' where id = 'ac2987ab-7972-4e0a-bd34-eecdc494b8b9'::uuid;
update public.card_prints set set_code = '2021swsh', number = '4', name = 'Turtwig' where id = '53ab14f5-7e43-4098-8eb6-77beb4450c99'::uuid;
update public.card_prints set set_code = '2021swsh', number = '5', name = 'Snivy' where id = '99449877-8fd5-4651-bd39-2321b2bffff5'::uuid;
update public.card_prints set set_code = '2021swsh', number = '6', name = 'Chespin' where id = 'e95d8646-b98f-4c8c-a01d-2e499c02aa82'::uuid;
update public.card_prints set set_code = '2021swsh', number = '7', name = 'Rowlet' where id = 'cb3e5ff6-ace4-44ca-99e0-91098dff5bba'::uuid;
update public.card_prints set set_code = '2021swsh', number = '8', name = 'Grookey' where id = '6613c2ff-8bad-465b-b186-78c6ac7b9c26'::uuid;
update public.card_prints set set_code = '2021swsh', number = '9', name = 'Charmander' where id = '9421cd5e-2640-44c5-8044-47aaa7a7954a'::uuid;
update public.card_prints set set_code = 'col1', number = '6', name = 'Groudon' where id = '2180d1db-0948-4cfc-9a98-da7629c2811a'::uuid;
update public.card_prints set set_code = 'col1', number = '8', name = 'Hitmontop' where id = '922f2b4f-eb6f-492c-89a7-8b4f313509e2'::uuid;
update public.card_prints set set_code = 'dp7', number = '100', name = 'Regigigas' where id = '687811f7-e3d2-41bb-b37d-1e73882551d2'::uuid;
update public.card_prints set set_code = 'dp7', number = '2', name = 'Empoleon' where id = '62f77935-5749-4d26-87e6-06bbca565b22'::uuid;
update public.card_prints set set_code = 'dp7', number = '3', name = 'Infernape' where id = '665ee2b0-4a22-43d5-bf8e-8ff22a990384'::uuid;
```

The JSON report contains all before-state rows for exact rollback targeting.
