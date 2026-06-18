# Jungle No Symbol Real Apply V1

Real apply for the approved Jungle No Symbol recognized-error parent lane package.

## Safety

- package_id: SPECIAL-VAR-01-JUNGLE-NO-SYMBOL-PARENT-INSERTS
- package_fingerprint_sha256: `d5a01e1ae21d3ef6f007dae9efe4485a8a6b57c88e9d57da6fd99ae0b70993f6`
- sql_hash_sha256: `0d7bed6961ea56fa760bbda32133ebf0bdfc232820143bf586db24d2d2ce306a`
- dry_run_proof_sha256: `59ff65e4ef4f45afe1ef7425b2880b8e41f7e4ec9bf4053761854e46123965cc`
- migrations_created: false
- global_apply_performed: false
- deletes_performed: 0
- merges_performed: 0
- post_apply_verified: true

## Scope

- parent_inserts: 16
- identity_inserts: 16
- child_inserts: 16

## Targets

| set | number | name | variant | modifier | finish |
| --- | --- | --- | --- | --- | --- |
| base2 | 1 | Clefable | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 2 | Electrode | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 3 | Flareon | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 4 | Jolteon | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 5 | Kangaskhan | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 6 | Mr. Mime | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 7 | Nidoqueen | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 8 | Pidgeot | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 9 | Pinsir | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 10 | Scyther | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 11 | Snorlax | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 12 | Vaporeon | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 13 | Venomoth | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 14 | Victreebel | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 15 | Vileplume | no_symbol_error | recognized_error:no_jungle_symbol | holo |
| base2 | 16 | Wigglytuff | no_symbol_error | recognized_error:no_jungle_symbol | holo |

## Rollback Preview

```sql
delete from public.card_printings where id in ('96c33d5c-7341-482b-b1cf-464d4eb4f47f', '150ef769-8012-48c4-95bd-408c6fbfb589', '9108f0de-e2df-4614-9015-26cd2fd5acee', 'f53201a7-824a-41f7-aa9d-c12107f2dd60', '274405fd-a1c4-4030-9262-f0dc5199eecc', '4f8ee9c0-e905-4e89-86e1-dfae714556ec', '16085226-b3dd-4e43-b0e3-55abad2eecf1', 'a49ed5c6-3672-4dec-84b9-e749c862539f', '689bfe5c-9240-4f37-b229-f835e636e480', '3f679c8e-4359-49cc-864b-e20abd92f0cf', '7be7b6b8-5a1c-40c9-b7d6-bf9140ce326f', 'f2621ff6-4653-47a1-a1ff-889a4e58177a', 'fb5e1765-06d4-486d-a8a0-b55bec2138df', 'd1ae59a4-0bf9-4b43-acf3-932ad841470b', '910b82f4-f6da-478c-8771-902dc8e7f663', '251993ea-4663-44a7-b9be-9acfca1e4b72');
delete from public.card_print_identity where card_print_id in ('28a7a1a5-30c3-42ef-9b18-3efd340e2c5a', '83189125-b5f6-4169-b788-52a873359eb4', '58197a15-6846-4234-b153-565e26038a51', 'bfd2238e-fc2d-452c-bc22-c4ea9dd84743', '84b0cad0-b224-44f7-98bc-1be6d582b513', '1cfc7d99-93b3-4da7-a9d0-9321e4b1eaa2', 'ffceadb7-dfad-4a35-b332-0ff0856fbecb', 'e563e20e-a43b-48f0-b07f-31a986fd827e', '66cdd415-f700-4199-bd04-dd47edeefd5e', 'bafc2195-d765-4f65-9db2-5a7ae54e3198', '20fa5289-8e45-41cf-9f96-1dfd4cb189fa', 'ca4004fb-c4af-4631-b624-ec5a872ffa35', 'b4dec454-afa9-429d-b44d-12ac70a226c0', '2cfe8e2f-c552-4ef3-b69f-9ca29f69c3b9', '3ab13536-8f6a-4686-be31-14424a87788f', 'b8b0e710-4454-439a-a0eb-f3eb75878998');
delete from public.card_prints where id in ('28a7a1a5-30c3-42ef-9b18-3efd340e2c5a', '83189125-b5f6-4169-b788-52a873359eb4', '58197a15-6846-4234-b153-565e26038a51', 'bfd2238e-fc2d-452c-bc22-c4ea9dd84743', '84b0cad0-b224-44f7-98bc-1be6d582b513', '1cfc7d99-93b3-4da7-a9d0-9321e4b1eaa2', 'ffceadb7-dfad-4a35-b332-0ff0856fbecb', 'e563e20e-a43b-48f0-b07f-31a986fd827e', '66cdd415-f700-4199-bd04-dd47edeefd5e', 'bafc2195-d765-4f65-9db2-5a7ae54e3198', '20fa5289-8e45-41cf-9f96-1dfd4cb189fa', 'ca4004fb-c4af-4631-b624-ec5a872ffa35', 'b4dec454-afa9-429d-b44d-12ac70a226c0', '2cfe8e2f-c552-4ef3-b69f-9ca29f69c3b9', '3ab13536-8f6a-4686-be31-14424a87788f', 'b8b0e710-4454-439a-a0eb-f3eb75878998');
```
