# One Piece Canonical Import Durable Staging Schema V1

## Status

Offline design complete. The migration candidate is not in
`supabase/migrations`, has not been applied, and authorizes no database
connection or write in this gate.

## Proven Predecessor

The production rollback-only canary passed and was independently verified:

- plan fingerprint:
  `174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90`;
- canary migration draft SHA-256:
  `7eece6ff093de56b5cbea6a0a1f03a5a9b469789f11de233ac9fab90b4e80591`;
- transaction-local rows: one batch and 21 source rows;
- durable schema objects and rows after rollback: zero;
- independent-verifier findings: zero.

The passed draft is immutable and remains under `supabase/migration_drafts`.
The durable design uses a new migration identity rather than changing that
evidence.

## Durable Schema Boundary

The candidate creates exactly:

- `public.one_piece_canonical_import_batches`;
- `public.one_piece_canonical_import_rows`;
- one internal update/delete rejection function;
- two immutable mutation-rejection triggers;
- four service-role SELECT/INSERT policies;
- two supporting indexes.

Both tables enable and force RLS. The migration first revokes all privileges
from `public`, `anon`, `authenticated`, and `service_role`, then grants only
SELECT and INSERT on the tables to `service_role`. The trigger function remains
non-executable by those roles. There is no client RPC or release pointer.

Every staged row preserves the complete source payload and its SHA-256 while
keeping exact singles, DON!! cards, sealed candidates, quarantine, language,
release state, and source price evidence distinct. Staging is evidence storage;
it is not canonical identity or publication authority.

## Apply Design

The proposed migration identity is:

`20260814120000_one_piece_canonical_import_durable_staging_v1`

A future apply may create only the schema objects and one exact migration-ledger
row. It must leave both tables empty. It may not stage source rows in the schema
apply transaction. An independent read-only connection must verify exact object
inventory, FORCE RLS, policies, direct grants, effective privileges, function
execution denial, zero table rows, migration history, and protected-domain
stability.

Global `supabase db push` is prohibited. The exact reviewed candidate must be
copied byte-for-byte into the proposed migration path only after the production
read-only preflight passes and a separate schema-apply plan is approved.

## Rollback Design

The rollback candidate is schema-only and fail-closed. It refuses to run if:

- either staging table contains any row;
- the exact migration-ledger row is absent or changed;
- any later migration has been recorded.

It drops only the two staging tables, the internal rejection function, and the
exact migration-ledger row. Once durable staging data exists, this rollback is
invalid; a separate evidence-preserving retirement plan would be required.

## Closed Boundaries

This gate authorizes no:

- production database connection or write;
- migration placement or apply;
- staging payload insert;
- canonical game, set, card, printing, or mapping write;
- sealed-catalog promotion;
- pricing qualification or publication;
- app or anonymous visibility;
- Storage or image work;
- Vault mutation;
- MTG mutation;
- deployment.

## Exact Next Gate

Run a production read-only preflight bound to the offline plan fingerprint. It
must verify migration-version and object-name availability, migration order,
lock safety, default and effective privileges, exact absence of One Piece
staging objects, protected-domain baselines, and attribution for concurrent MTG
growth. It must write nothing and stop before migration placement or apply.
