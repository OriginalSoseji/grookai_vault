# Public MTG additive release V1

The public MTG supervisor currently finds two absent eligible sets, `fra` and
`frc`. This release admits exactly the reviewed 555 released parents and 960
finish children. Ten October 23 cards remain held; seven parents with no exact
source product link stay unpriced. It neither publishes prices nor changes
release controls, existing identities, inventory, permissions or schema.

The master [rulebook](../GROOKAI_RULEBOOK.md) applies. This is a separate governed
public admission path through the existing immutable MTG staging tables and
six-table insert function. The old hidden-only writer and frozen August manifest
remain unchanged. The October 7 qualification plan remains historical evidence,
including its rollback-only boundary and original generator commit. A separate
release envelope binds that exact plan, source hashes, completed warehouse run,
schema versions, database structure and the merged immutable executor commit.
No qualification receipt or boolean flag invents user approval. The operator
continues the already requested repair and records that authorization accurately.

`prepareMtgProductionReleaseInTransactionV1` requires the canonical verified-TLS
session pooler, serializable writable transaction, a public MTG release and mature
canonical counts. Sources expire after 24 hours (Scryfall) and 36 hours (completed
warehouse sync); expired evidence needs a new reviewed release. The exact per-set
truth is rebuilt at entry and immediately before returning the commit-ready proof.
An advisory lock and eight narrowly scoped table locks serialize admission. A
three-second lock timeout is required in the caller. Collisions and prior staging
fail before sequence allocation. No upsert, deletion, update or automatic retry
is provided. PostgreSQL rollback consumes mapping IDs; record the gap, never reset
the sequence. Other sequence changes fail closed, including concurrent changes.

Preservation uses exact native row digests for all preexisting rows in the six
target tables, both staging tables, saved copies and release controls, plus the
complete migration ledger and database structure/security. Native connection-local
write counters are differenced across the protected operation inside one transaction:
only 3,572 canonical inserts and 3,572 staging rows plus two batches may occur.
Any update, delete, additional insert, schema write or counter reset fails. This
also catches trigger writes and insert-then-delete side effects, even in other
schemas. Deferred constraints run before the final checks. Counts pending from a
previous transaction are recorded and subtracted; they are not assumed to be zero.
PostgreSQL documents these local statistics in its
[monitoring reference](https://www.postgresql.org/docs/17/monitoring-stats.html).

This proof avoids rescanning unrelated production price-history tables while
holding catalog locks. It does not claim that every production table was fully
hashed or that unrelated users stopped editing. Qualification additionally compares
all 372 retained tables against the earlier full-row preservation method. The
operator must use a fresh bound client, persist create-only intent and exact source
hashes, set finite statement/lock deadlines, and perform no other writes in the
transaction. The module owns no connection, COMMIT, credential or retry mechanism.

Production execution requires a merged immutable package, matching envelope and
fresh source/read-only baseline; an actual rollback with independent absence and
preservation checks; then a fresh same-plan transaction, durable commit and
independent exact six-table/staging readback. Persist the precommit proof before
COMMIT. If the connection is lost during commit, record `commit_outcome_unknown`
and resolve exact durable state on a new read-only connection. Never redispatch
blindly or delete possibly committed rows. Existing pricing/application runtimes
remain pinned throughout.

## Released-card supervision

The versioned coverage manifest changes the expected counts of only the two
reviewed source-set UUIDs. Before applying it, the read-only supervisor hashes
the exact parent identities, child finishes, active source ownership and identity
rows from one repeatable-read snapshot. It rejects missing or substituted rows,
early held-card admission and invented links for the seven unpriced parents.
All other frozen set expectations, runner checks and no-dispatch boundaries stay
unchanged. Reports explicitly say `reviewed_released_cards_with_explicit_future_holds`;
they do not claim all future source cards are present. On October 23 this coverage
expires visibly and requires a new review. Deploy only after durable admission
passes; verify actual automatic worker execution and control-plane evidence.
