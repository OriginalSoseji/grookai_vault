# External Mapping Alias Sidecar Schema Real Apply V1

## Package

`EXTMAP-ALIAS-01A-SIDECAR-SCHEMA-CREATE`

## Applied Migration

`20260616161500_create_external_mapping_aliases_sidecar_v1.sql`

## Scope

- Schema created: true
- Alias rows inserted: 0
- External mappings deactivated: 0
- Cleanup performed: false
- Parent writes: 0
- Child writes: 0
- Identity writes: 0
- Image writes: 0
- Global apply: false

## Proof

The migration SQL hash matched the apply gate:

```text
f8181087b137446ba104e887ee742a6282a0b31681fd75b3e7448d047a22c94d
```

The scoped Supabase dry run would push only:

```text
20260616161500_create_external_mapping_aliases_sidecar_v1.sql
```

The previously pending migration remains intentionally unresolved:

```text
20260523183000_printing_truth_review_sidecar_v1.sql
```

## Remote Readback

- `public.external_mapping_aliases` exists
- Row count: 0
- Indexes present:
  - `external_mapping_aliases_active_source_alias_uidx`
  - `external_mapping_aliases_card_print_idx`
  - `external_mapping_aliases_kind_idx`
  - `external_mapping_aliases_mapping_idx`
  - `external_mapping_aliases_pkey`

## Verification

- `npm run preflight`: `PASS_WITH_DEFERRED_DEBT`, critical failures `0`
- `node --test tests/contracts/contract_scope_v1.test.mjs`: passed
- `git diff --check -- supabase/migrations/20260616161500_create_external_mapping_aliases_sidecar_v1.sql`: passed

## Next

Prepare `EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION` as a dry-run-first data package for the projected `214` JustTCG alias rows.
