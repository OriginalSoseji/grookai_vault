# Card Interactions Exact Instance Production Apply V2

## Source

- Source commit: `7aaa5c44eabb61435813b45a03b18450bb89c1ce`
- Branch: `release/8-week-completion-closeout-v1`
- Migration: `20260807023000_card_interactions_exact_instance_authorization_v2.sql`
- Migration SHA-256: `e30e705561b045227e9ddd66dfd0c1b14fac79dff6812942655490ef954ff863`
- Applied: `2026-08-07T02:28Z`

## Preflight

The tracked worktree was clean at the source commit. All PR checks passed. A linked dry run reported exactly one pending migration:

```text
Would push these migrations:
 - 20260807023000_card_interactions_exact_instance_authorization_v2.sql
```

A production rollback-compile proof had already executed the migration with the final `COMMIT` replaced in memory by `ROLLBACK`. It proved that the SQL compiled while neither the new column nor function persisted.

Before the permanent apply, the production baseline was recorded:

- 76 interaction rows;
- one row with exact child-printing identity;
- 80 conversation group-state rows;
- checksum `5f1738390666125158fad71ec692f5a2` over every pre-existing interaction value;
- checksum `ff72b6e5b5bff4fe7b1483384c3c360e` over every group-state row.

## Apply

Command metadata, with credentials excluded:

```text
npx supabase db push --linked
```

Result:

```text
Applying migration 20260807023000_card_interactions_exact_instance_authorization_v2.sql...
Finished supabase db push.
```

The notice that the new V2 trigger did not previously exist was expected because the migration conditionally drops it before creation.

## Schema And Security Readback

Permanent machine-readable evidence:

- `card_interactions_exact_instance_production_readback_v2.json`

Verified:

- migration history contains `20260807023000`;
- `card_interactions.vault_item_instance_id` is a nullable UUID foreign key to `vault_item_instances(id)` with `ON DELETE SET NULL`;
- the partial exact-instance/created-at index exists;
- the V2 identity trigger is enabled;
- authenticated insertion calls the five-argument V4 authorization function;
- authenticated and service-role execution are granted only on the V4 authorization function;
- authenticated and service-role execution were revoked from the superseded V2 authorization function;
- the enforcement trigger function is not directly executable by anonymous or authenticated roles;
- RLS remains enabled on interaction and group-state tables.

## Zero-Backfill Proof

After apply:

- interaction count remained 76;
- group-state count remained 80;
- both pre-existing checksums remained identical;
- all 76 historical interaction rows retained a null exact-instance field;
- zero invalid or mismatched instance links exist.

No canonical identity, Vault ownership, pricing, approval, or historical interaction value changed.

## Rollback-Only Authenticated Smoke

Permanent machine-readable evidence:

- `card_interactions_exact_instance_production_rls_smoke_v2.json`

Inside one transaction, using the authenticated database role and an eligible existing public owner instance:

- a correctly bound exact-instance interaction passed;
- a sibling child printing submitted against that instance was rejected with SQLSTATE `23514`;
- an old-client request that omitted the instance was deterministically resolved to the matching active owner instance;
- the transaction rolled back;
- post-rollback readback found zero probe rows.

## Release Decision

The database portion of the exact-instance repair is proven and backward-compatible with the currently distributed mobile client. This evidence does not complete the eight-week release contract. PR merge, exact-SHA deployment, final Android/iOS candidates, journey and state-matrix verification, operational gates, and the 72-hour soak remain required.
