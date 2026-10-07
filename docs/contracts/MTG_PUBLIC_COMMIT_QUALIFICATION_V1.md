# MTG public commit qualification V1

This extends the rollback-only rehearsal with real sequence allocation and durable
commit proof in the separately created local database `mtg_public_commit_v2_20261007`.
The original retained database stays unchanged. The clone preserves all retained
public/auth/storage/schema-ledger rows and equivalent table grants, owners and
RLS policies, plus the exact production migration 429 and a public-MTG fixture.
Restore can reorder ACL entries or replace an explicit owner-only ACL with its
equivalent default; compare expanded grants, including grantors and grant options,
before accepting this representation difference. Within each qualification
transaction the original native ACL representation must still remain unchanged.
The clone excludes `pg_cron` and its scheduler objects because that extension is
restricted to the cluster's `postgres` database. The exact omissions are archived;
this qualifies catalog writes, not cron or background-job behavior.
The endpoint remains loopback 55000 on the attested internal subnet with workers off.
No production connection or production apply mode is accepted by this qualifier.

The new October 7 reviewed truth file binds refreshed bulk data and complete
released-card/finish payloads. Ten future cards remain held and seven parents
without exact source links stay unpriced. It grants no production authority.

Each transaction rejects wrong targets, hidden release state, prior stages and
canonical collisions before allocation. It stages and verifies immutable payloads,
uses the existing six-table insert function and normal mapping ID sequence, and
checks exact rows plus all existing public/auth/storage/schema data and security.
Only the expected mapping sequence may advance; exactly 555 unique positive IDs
must be allocated for this reviewed import. PostgreSQL sequence increments survive
rollback: the harness records this expected gap in the new clone and verifies all
other sequences and data remain unchanged. It never resets a consumed sequence.

Qualification requires rollback with independent readback, commit with a new
connection's exact readback, duplicate rejection without another allocation,
anonymous/authenticated visibility and complete original retained-database proof.
The committed clone is preserved as evidence. No existing lab is reset or deleted.

Production still requires a separately governed public additive release envelope,
current preservation and source evidence, immutable merged producer, actual
production rollback/commit recovery, and versioned supervisor coverage accounting
for explicit future-card holds. The frozen hidden-only V1 writer, historical
manifest, release controls, pricing activation and current worker runtimes stay
outside this qualification. Local commit proof is not production import success.
