# Cross-TCG Sealed Product Schema Apply/Readback V1

## Purpose

This contract governs one schema-only production apply for the private,
cross-TCG sealed-product domain. It does not authorize sealed-product data,
canonical identity writes, pricing publication, Storage, app access, or
deployment.

## Frozen Inputs

- Migration version: `20260814060000`
- Migration name: `cross_tcg_sealed_product_domain_v1`
- Migration SHA-256:
  `794ba84ce5fcd57568d7b94536ec06dbdb7d8b4d171a0f2895e6e0b808f895d4`
- Migration-plan fingerprint:
  `f95ee1e0787f14801ba3b24f313f40a391325d2169eda0798f0fe32dfe948643`
- Production preflight fingerprint:
  `791bfb677a432b8ec9f7d8d027830fc96b21f40ccfbd0c0a528f1833baca28f7`
- Protected-schema fingerprint:
  `1224bc0fa350de813e0055b22ed95080b381a0986ed040b1823b9cdb3349bccb`

The checked-in Supabase migration must remain byte-identical to the reviewed
candidate. Its migration-ledger statement array is deterministically derived
from the exact migration bytes and is bound into the frozen apply plan.

## Atomic Writer

The writer must:

1. Require the exact branch, clean tracked tree, producing commit, plan, hashes,
   and environment guard token.
2. Fail before `BEGIN` if the reserved migration version or any sealed table
   already exists.
3. Set local lock, statement, and idle-in-transaction timeouts.
4. Execute only the reviewed migration body and insert only its exact ledger
   row in the same transaction.
5. Read back all sealed tables, constraints, indexes, functions, triggers,
   RLS/FORCE RLS state, policies, grants, row counts, and ledger content before
   commit.
6. Use `pg_stat_xact_user_tables` to prove that this transaction performed no
   insert, update, hot update, or delete against protected canonical, card,
   Vault, pricing, or MTG tables.
7. Roll back on every pre-commit failure.
8. Close the writer connection, then use a fresh read-only connection for the
   durable readback.

There is no global `db push` path and no retry loop.

## Concurrent MTG Attribution

MTG ingestion may advance while this schema gate is prepared or executed.
Therefore, global row-count equality is not used as write attribution.

- Transaction-local table statistics are the authority for writes attributable
  to this migration.
- MTG counts are captured before and after and reported as external concurrent
  progress.
- MTG counts must not decrease and the MTG release must remain hidden.
- MTG deltas are never reported as sealed-migration writes.
- The protected schema fingerprint must remain exact.

## Required Durable State

- Exactly 10 sealed tables exist.
- Every sealed table has RLS enabled and forced.
- Every sealed table is empty.
- Exactly the frozen functions, constraints, indexes, triggers, and policies
  exist.
- `anon` and `authenticated` have no table privileges.
- Only the frozen service-role table and function privileges exist.
- Effective service-role table privileges are verified individually; inherited
  or default `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, or `TRIGGER`
  privileges fail the gate.
- Effective function execution is verified for `anon`, `authenticated`, and
  `service_role`; only the frozen release functions are service-callable.
- Exactly one migration-ledger row exists for version `20260814060000`, and its
  name and statement array match the frozen plan.
- No app-facing RPC, view, release pointer row, or publication is created.

## Independent Verification

The independent verifier is a separate process and separate database
connection. It begins a read-only transaction, reads the full durable contract,
rolls back, closes the connection, and only then writes artifacts. It refuses
to run from an execution summary that did not already prove a passing atomic
apply and zero attributable protected-table DML.

## Stop Condition

Stop before sealed data ingestion. After schema apply and independent readback
pass, the next gate is a separate no-publication data canary plan.
