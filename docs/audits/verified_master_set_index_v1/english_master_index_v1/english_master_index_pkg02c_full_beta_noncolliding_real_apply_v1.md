# English Master Index PKG-02C Full Beta Non-Colliding Real Apply V1

This report records the real `PKG-02C-FULL-BETA-NONCOLLIDING` apply authorized by the operator.

## Status

| Field | Value |
| --- | --- |
| apply_status | pkg02c_full_beta_noncolliding_real_apply_committed_and_verified |
| package_id | PKG-02C-FULL-BETA-NONCOLLIDING |
| package_fingerprint_sha256 | `53ede43043c67f519a9d786cc91145647efb093d2c4af1cfaf924e81ac2b430d` |
| updated_rows | 343 |
| db_write_committed | true |
| durable_db_writes_performed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| collision_rows_excluded | 79 |
| stop_findings | 0 |

## Before And After

| Snapshot | Hash | card_print rows | child rows | vault refs |
| --- | --- | ---: | ---: | ---: |
| before | `744955f913d2d7f31c00b883ee3fbf9ba948f0dc93e5f2aa0c308326f91ccf51` | 343 | 542 | 4 |
| after | `6e117c0b42ebe07d358a16d36e21115b926a8c02fe87e836c13a151b130bae90` | 343 | 542 | 4 |

## Verification Summary

- before_hash_matches_dry_run_proof: true
- target_parent_fields_resolved: true
- child_printings_preserved: true
- vault_references_preserved: true
- collision_rows_unchanged: true
- master_index_comparison_status: pkg02c_parent_identity_fields_resolved_child_printings_preserved

## Rollback Preview

```sql
update public.card_prints set set_code = null, number = '1', name = 'Bulbasaur' where id = 'd34033e2-a8e8-4e72-b1e9-2033445e8f00'::uuid;
update public.card_prints set set_code = null, number = '2', name = 'Chikorita' where id = '987099f7-59e9-4c0a-9bbb-a0b8fa24a086'::uuid;
update public.card_prints set set_code = null, number = '3', name = 'Treecko' where id = 'ac2987ab-7972-4e0a-bd34-eecdc494b8b9'::uuid;
update public.card_prints set set_code = null, number = '4', name = 'Turtwig' where id = '53ab14f5-7e43-4098-8eb6-77beb4450c99'::uuid;
update public.card_prints set set_code = null, number = '5', name = 'Snivy' where id = '99449877-8fd5-4651-bd39-2321b2bffff5'::uuid;
update public.card_prints set set_code = null, number = '6', name = 'Chespin' where id = 'e95d8646-b98f-4c8c-a01d-2e499c02aa82'::uuid;
update public.card_prints set set_code = null, number = '7', name = 'Rowlet' where id = 'cb3e5ff6-ace4-44ca-99e0-91098dff5bba'::uuid;
update public.card_prints set set_code = null, number = '8', name = 'Grookey' where id = '6613c2ff-8bad-465b-b186-78c6ac7b9c26'::uuid;
update public.card_prints set set_code = null, number = '9', name = 'Charmander' where id = '9421cd5e-2640-44c5-8044-47aaa7a7954a'::uuid;
update public.card_prints set set_code = null, number = '10', name = 'Cyndaquil' where id = 'ac9e8297-6e39-419f-8fa0-f58e90c80c01'::uuid;
update public.card_prints set set_code = null, number = '11', name = 'Torchic' where id = 'c13e4ceb-5988-4215-8462-fc378bbe5e46'::uuid;
update public.card_prints set set_code = null, number = '12', name = 'Chimchar' where id = 'cefedf7b-f1c0-42f7-af7d-e6e9279358f3'::uuid;
```

The source JSON artifact contains rollback fields for all 343 updated parent rows.

## Stop Findings

- none

## Non-Authorizations

- No global apply was authorized or performed.
- The 79 collision rows remain excluded and unchanged.
- No migrations were authorized or created.
- No cleanup, quarantine, merge, deletion, insertion, hiding, or child-printing normalization was authorized.
- No child printing rows were changed.
- No pricing, scanner, marketplace, provenance, or ownership rows were changed.
