# MTG Sealed Image Dimension Constraint Repair V1

## Purpose

Repair the already-applied MTG sealed image-evidence dimension constraint with
a forward-only migration. The original constraint can evaluate to `NULL` for a
partially populated dimension tuple, and PostgreSQL accepts a `NULL` check
result.

## Locked Decision

- Preserve migration `20260904130000` byte-for-byte as applied history.
- Use forward migration `20260905120000` to replace only
  `sealed_product_image_evidence_dimension_check`.
- Accept only an entirely absent dimension tuple or an entirely present,
  positive dimension tuple.
- Fail before changing the constraint if any existing row violates that rule.

## Mutation Boundary

The migration may:

- inspect `sealed_product_image_evidence` for invalid tuples;
- drop and recreate the named check constraint in one transaction; and
- add its own migration-ledger receipt through the governed migration process.

It may not insert, update, delete, or truncate application data; alter release
pointers or visibility; write Storage; change grants or RLS; or affect another
game or table.

## Apply Gate

The migration remains unapplied until strict linked-ledger preflight and local
replay pass from a clean producer commit and a separate exact-hash production
apply authority is recorded. A failed or timed-out preflight is not approval to
bypass the migration contract.
