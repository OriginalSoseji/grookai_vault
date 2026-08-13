# MTG Service-Only Staging Schema Writer

- Status: **SCHEMA_APPLIED_AND_READ_BACK**
- Mode: `apply`
- Migration: `20260813185000_mtg_canonical_import_staging_v1`
- Migration SHA-256: `20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8`
- Ledger fingerprint: `2179eeba053bdd9eb57d78063d8c4c6d096089f8e8adf23bea624224c2f246c7`
- Durable database writes: `true`

## Approval Boundary

```text
I approve only MTG service-only staging migration 20260813185000 with SQL SHA-256 20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8 and ledger fingerprint 2179eeba053bdd9eb57d78063d8c4c6d096089f8e8adf23bea624224c2f246c7. I approve no canonical game, set, card, printing, mapping, image, Storage, pricing, publication, app-visibility, Pokemon, payload-row, update, delete, truncate, cleanup, promotion, global db push, or other migration writes.
```

This writer applies only the service-only MTG staging schema and its exact
migration-history row. It never runs global db push or applies the later MTG
canonical foundation migration.
