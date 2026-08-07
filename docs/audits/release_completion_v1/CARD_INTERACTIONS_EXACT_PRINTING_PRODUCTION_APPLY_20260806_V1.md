# Card Interactions Exact Printing Production Apply V1

## Source

- Source commit: `7b0bbf4fdc7e3afd18a0a931a23bbd7c287d60f7`
- Branch: `release/8-week-completion-closeout-v1`
- Migration: `20260806220000_card_interactions_exact_printing_v1.sql`
- Migration SHA-256: `856571653bae3f07cf84fecebad707a99ffc8ba26d3f0a07916fb063b11e1075`
- Applied at: `2026-08-07T00:49Z`

## Preflight

`supabase migration list --linked` showed local and remote history aligned through `20260806170000` and exactly one local-only migration:

```text
20260806220000 | [remote empty] | 2026-08-06 22:00:00
```

`supabase db push --linked --dry-run` reported:

```text
Would push these migrations:
 • 20260806220000_card_interactions_exact_printing_v1.sql
```

## Apply

Command metadata, with credentials excluded:

```text
supabase db push --linked --yes
```

Result:

```text
Applying migration 20260806220000_card_interactions_exact_printing_v1.sql...
Finished supabase db push.
```

The notice that the new parent-enforcement trigger did not previously exist was expected because the migration creates it after the conditional drop.

## Readback

Permanent machine-readable readback:

- `docs/audits/release_completion_v1/card_interactions_exact_printing_production_readback_v1.json`

Verified:

- migration history contains `20260806220000`;
- both interaction tables and the contact-target view expose nullable `card_printing_id`;
- both child references point to `card_printings(id)` with `ON DELETE SET NULL`;
- group identity uses `UNIQUE NULLS NOT DISTINCT` across user, parent, exact child, and counterpart;
- parent/child enforcement and group-state synchronization triggers are active;
- RLS remains enabled on both tables;
- authenticated grants remain bounded to the required read/write operations;
- the contact-target view is select-only for `anon` and `authenticated`;
- all 74 existing interactions and all 76 existing group states remained null-scoped;
- zero invalid parent/child links and zero duplicate group identity tuples exist.

## Rollback-Only Production Smoke

Permanent machine-readable proof:

- `docs/audits/release_completion_v1/card_interactions_exact_printing_production_rls_smoke_v1.json`

Verified inside one transaction:

- exact-printing interaction creation passed for an eligible sender;
- sender and receiver each received an exact-printing group-state row;
- both participants could read the interaction;
- an unrelated authenticated user saw zero interaction and state rows;
- a child printing from another parent was rejected with SQLSTATE `23514` and `card_interaction_printing_parent_mismatch`;
- the transaction rolled back;
- post-rollback counts exactly matched the baseline;
- no probe row remained.

## Boundaries

- No existing interaction was updated or backfilled.
- No legacy row received inferred printing identity.
- No canonical card identity changed.
- No Vault ownership row changed.
- No pricing row changed.
- No approval, public-content, or notification state persisted from the smoke test.

