# External Mapping Alias Sidecar Schema Apply Gate V1

Approval gate for the future sidecar schema migration. This artifact does not create a migration and does not touch the database.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Sidecar created: false
- DDL executed: false

## Package

| metric | value |
| --- | --- |
| package_id | EXTMAP-ALIAS-01A-SIDECAR-SCHEMA-CREATE |
| migration_name | create_external_mapping_aliases_sidecar_v1 |
| table | public.external_mapping_aliases |
| sql_hash | f8181087b137446ba104e887ee742a6282a0b31681fd75b3e7448d047a22c94d |
| fingerprint | 3662aec407767ede5d8264627c21f99d58c9c6d9902299384c10eeb17fab0a64 |

## Authorized If Approved

- create one migration file for public.external_mapping_aliases schema only
- create table public.external_mapping_aliases
- create indexes and constraints listed in the readiness packet
- run migration through the standard Supabase migration path
- verify table/index existence after migration

## Not Authorized Even If Approved

- inserting alias rows
- deactivating external_mappings
- cleanup
- parent card_print writes
- child card_printing writes
- identity writes
- image writes
- global apply
- app/runtime exposure

## Stop Conditions

- draft SQL hash differs from readiness packet
- migration includes DML or alias inserts
- migration touches external_mappings rows
- migration touches card_prints/card_printings/card_print_identity
- migration changes image data
- migration includes broad permissions or public exposure
- preflight critical failures appear after migration

## Approval Phrase

```text
Approve EXTMAP-ALIAS-01A-SIDECAR-SCHEMA-CREATE schema migration creation and standard Supabase migration apply only. Fingerprint: 3662aec407767ede5d8264627c21f99d58c9c6d9902299384c10eeb17fab0a64. SQL hash: f8181087b137446ba104e887ee742a6282a0b31681fd75b3e7448d047a22c94d. Scope: create public.external_mapping_aliases sidecar table, constraints, and indexes only. No alias row inserts. No external_mappings deactivation. No cleanup. No parent writes. No child writes. No identity writes. No image writes. No global apply.
```

## Expected Next After Schema

| metric | value |
| --- | --- |
| package_id | EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION |
| dry_run_only_first | true |
| projected_alias_rows | 214 |
| source | justtcg |
| purpose | insert preserved alias rows into the sidecar before any external_mappings deactivation |
