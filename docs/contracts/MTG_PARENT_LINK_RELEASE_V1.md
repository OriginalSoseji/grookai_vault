# MTG parent-link pricing release

The admitted fra/frc catalog has 945 exact finish mappings but lacks 546
TCGPlayer parent links. This bounded release inserts only those reviewed links,
using the existing exact-printing-evidence bridge policy. It neither imports
cards nor publishes prices. The existing pricing runtime remains pinned.

The frozen mapping plan is `1b80df6ae83b09ebb05e6d16f4cd46d5e46b72d70916fda5375f36b923c89846`.
Both this plan and the completed admission payload must pass their original
hashes and exact canonical readback. Global per-product candidate evidence must
still resolve one active canonical parent with no preexisting parent link.
Partial prior execution, ownership drift, source inactivity or competing writes
fail closed. Fifteen unlinked finishes and ten future cards remain held.

The caller records existing user repair authorization, a merged immutable
executor, fresh source and schema fingerprints, and create-only execution intent.
Production uses the project-qualified session pooler with pinned, verified TLS,
serializable transactions and finite statement/lock deadlines. No transport
verification bypass, global backfill, upsert, deletion or automatic retry exists.
The module owns no connection, COMMIT or approval inference.

Qualification must prove actual rollback, durable commit and rejected side
effects in a new isolated retained-data clone. Production requires a fresh
rollback with independent absence/preservation proof before same-plan commit.
Native transaction counters permit exactly 546 inserts into external_mappings;
deferred triggers run before checking. Every existing canonical, staging, saved
copy and release-control row, the active publication, ledger and database
structure/security must remain exact. Other sequences cannot change. Normal
mapping sequence gaps from rollback are recorded and never reset.

Persist precommit proof before COMMIT. A lost commit response means unknown
outcome: resolve the exact durable mapping set on an independent read-only
connection, never dispatch again. Successful link insertion is separate from
actual assignment preparation, governed pricing publication and app readback.
