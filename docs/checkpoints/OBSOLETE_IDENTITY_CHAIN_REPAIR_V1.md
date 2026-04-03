# OBSOLETE_IDENTITY_CHAIN_REPAIR_V1

## Why this repair audit was needed

Remote migration history had already been partially repaired out of the original Phase 8 identity rollout after `20260402100004` was marked applied to bypass the abandoned backfill path. The next pending migration, `20260402100005`, still assumed that the old backfill had completed successfully and immediately blocked the new baseline path. This audit was required to separate clearly obsolete old-chain migrations from migrations that still matter for the baseline path.

## Which migration chain became obsolete

The obsolete chain is the old post-backfill identity-enforcement path that assumed existing canon rows had already been populated into `card_print_identity` before later constraints were enabled. In the audited range, that obsolete assumption applied clearly to:

- `20260402100005__card_print_identity_post_backfill_constraints.sql`

That migration enforced invariants requiring active identity rows to already exist for the legacy canon surface, which is no longer the active rollout path.

## Which pending migrations were repaired as applied

The following migration was repaired as applied during this phase:

- `20260402100005__card_print_identity_post_backfill_constraints.sql`

Reason:
It is a clear `OBSOLETE_OLD_IDENTITY_CHAIN` migration. It depends on the abandoned old backfill order and is not required for the declared baseline domain path.

## Which pending migrations remain required

The following pending migrations remain required for the baseline-compatible path:

- `20260402100007__card_prints_drop_legacy_identity_constraint.sql`
- `20260402100008__games_seed_pokemon_for_card_print_fk.sql`

Both are structural migrations that do not depend on the old identity backfill chain.

## Which pending migration remains uncertain

The following pending migration could not be safely retired or safely advanced in this phase:

- `20260402100006__ba_set_registration_if_required.sql`

Reason:
It does not depend on the old backfill path, but it also is not clearly required for the declared baseline path. It seeds BA set state and source metadata that may interact with later governed domain handling. Because its purpose is mixed rather than clearly obsolete or clearly required, this phase stops hard on uncertainty.

## Whether baseline migration path is now unblocked

No. The baseline path is not yet unblocked.

Current stop reason:

- `20260402100006__ba_set_registration_if_required.sql` remains pending and classified `UNCERTAIN_STOP`

Remaining pending versions after this phase:

- `20260402100006`
- `20260402100007`
- `20260402100008`
- `20260403133000`

## Explicit note on writes

No schema edits were made in this phase.
No migration files were edited.
No data workers were run.
No baseline backfill was attempted.

The only remote mutation performed in this phase was migration-state repair metadata:

- `supabase migration repair --status applied 20260402100005`
