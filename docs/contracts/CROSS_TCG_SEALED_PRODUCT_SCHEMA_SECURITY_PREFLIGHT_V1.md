# Cross-TCG Sealed Product Schema/Security Preflight V1

## Purpose

This gate determines whether production is safe for a later schema-only apply
of the Cross-TCG sealed-product migration candidate. It does not authorize or
execute DDL, migration-history writes, canonical rows, pricing rows, Storage,
publication, deployment, or app visibility.

Frozen inputs:

- starting repository SHA:
  `6ddc84135521c7fc2531668d1614b751354b82fb`;
- migration SHA-256:
  `794ba84ce5fcd57568d7b94536ec06dbdb7d8b4d171a0f2895e6e0b808f895d4`;
- rollback SHA-256:
  `5a87967acb8c3f610807daa023eb94920aa393c6a64d123c46e113f225af9a7e`;
- migration-plan fingerprint:
  `f95ee1e0787f14801ba3b24f313f40a391325d2169eda0798f0fe32dfe948643`.

## Migration History Reservation

The future applied migration is reserved as:

- version: `20260814060000`;
- name: `cross_tcg_sealed_product_domain_v1`.

The preflight blocks if this version or any sealed-domain migration already
exists, if duplicate migration versions exist, or if local or production
history has reached or passed the reserved version. The candidate remains only
under `docs/sql` during this gate.

## Read-Only Boundary

The production reader must:

1. load connection credentials without copying or reporting them;
2. set the session default to read-only;
3. open exactly one explicit `BEGIN READ ONLY` transaction;
4. prove both session and transaction read-only state;
5. execute only `SELECT`, `WITH`, or `SHOW` statements;
6. close the transaction and connection before writing artifacts.

Failures still produce no database mutation. Artifacts are local files written
only after the transaction is closed.

## Collision Inventory

The gate checks exact absence of:

- ten proposed tables;
- five proposed function signatures and any same-name overload;
- ten proposed policies;
- eight proposed indexes;
- ten proposed triggers.

Any collision blocks apply. Partial prior application is not repaired by this
gate.

## Requirements And Security

The gate verifies:

- roles `anon`, `authenticated`, `authenticator`, and `service_role`;
- extensions `plpgsql` and `pgcrypto`;
- availability of `gen_random_uuid()`;
- migration-history schema/table/columns;
- production apply identity can create in `public`;
- `anon` and `authenticated` cannot create in `public` or `extensions`;
- no grant already targets a proposed sealed object;
- existing default ACL and protected-relation grants/RLS are captured.

## Protected Baselines

The preflight records row and schema fingerprints for:

- `card_prints` and `card_printings`;
- Vault owners and item instances;
- governed market-price pipeline, qualification, publication, and pointer
  relations;
- catalog game release controls;
- MTG canonical and service-only staging relations.

MTG must remain hidden and its three foundation migrations must remain present.
The baseline is evidence for post-apply no-change reconciliation; it grants no
authority to modify any protected domain.

## Lock Risk

The preflight blocks on ungranted locks, access-exclusive locks on protected
relations, transactions older than fifteen minutes, prepared transactions, or
connection utilization at or above 80 percent. A passing snapshot does not
replace a same-session lock check immediately before a future apply.

## Result

`pass` means the frozen candidate may proceed only to a separately approved
schema-only apply plan. `blocked` means stop, preserve artifacts, and repair the
reported condition without applying the migration.

## Exact Next Gate

If this preflight passes, create the reserved Supabase migration from the exact
candidate bytes, produce a schema-only apply plan bound to this preflight, and
request explicit approval for one atomic schema apply plus schema/RLS/grant
readback. Do not run the no-publication data canary in that gate.
