# MIGRATION_20260402100006_TRIAGE_V1

## 1. Why this migration was isolated

`20260402100006__ba_set_registration_if_required.sql` was the only remaining pending migration in the pre-baseline range whose purpose had not yet been proven as either clearly obsolete or clearly required. It had to be isolated because the baseline path cannot proceed safely while a mixed-purpose migration remains in front of `20260403133000__add_identity_domain_columns.sql`.

## 2. What the migration actually does

The migration touches only `public.sets`.

It performs the following actions:

- checks for a set with `code = 'ba-2020'`
- validates the existing row if present
- otherwise inserts a `public.sets` row for `ba-2020`
- repeats the same pattern for `ba-2022`
- repeats the same pattern for `ba-2024`

The inserted rows are Battle Academy release containers with:

- `game = 'pokemon'`
- BA-specific `name`
- BA-specific metadata under `source.battle_academy`

It does not:

- modify `card_prints`
- modify `card_print_identity`
- create baseline-domain columns
- backfill any legacy non-BA surface

## 3. Whether remote BA state makes it necessary right now

No.

The locked remote audit in [12_ba_surface.json](C:/grookai_vault/docs/checkpoints/full_db_audit_v1/12_ba_surface.json) proves:

- remote BA sets present = `false`
- remote BA `card_prints` = `0`
- remote BA identity rows = `0`

That means `20260402100006` is not preserving an already-live remote BA surface. It is only preparing future BA data presence.

The active baseline contract in [IDENTITY_DOMAIN_BASELINE_V1.md](C:/grookai_vault/docs/contracts/IDENTITY_DOMAIN_BASELINE_V1.md) also narrows scope to existing rows only and excludes future explicitly governed domains from the blanket baseline declaration. BA is not part of the immediate baseline path.

## 4. Final classification

Final classification:

`OBSOLETE_OLD_IDENTITY_CHAIN`

Reason:

This migration is BA-only set seeding for the abandoned pre-baseline BA rollout path. It is not required before [20260403133000__add_identity_domain_columns.sql](C:/grookai_vault/supabase/migrations/20260403133000__add_identity_domain_columns.sql), not required for baseline domain materialization on the existing remote legacy surface, and not required to preserve any current remote BA state because remote BA is still absent.

## 5. Exact next command

```powershell
supabase migration repair --status applied 20260402100006
```

No repair was executed in this phase. This phase only classifies the migration and records the safe next command.
