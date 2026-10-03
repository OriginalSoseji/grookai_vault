# Pokemon Classic outside dependency preservation V1

Status: read-only production observation and isolated SQL qualification. This
does not enable a production writer or replace full application/runtime replay.

The catalog reader enumerates every foreign key into the exact eleven transaction
write tables, across all source schemas, including NOT VALID constraints. Ordered
column arrays come from catalog attributes, not parsed display SQL. Unknown key
shapes fail explicitly. Dependencies inside the eleven tables remain covered by
the canonical/journal exact readback and transaction write-footprint assertion.

The observer binds the complete catalog fingerprint and whole102 plan. Fixed
new UUID references must be absent; generated raw/mapping/ledger IDs remain
explicitly pending until the actual transaction provides its V2 bindings. Those
bindings preserve bigint precision and are independently revalidated. All81
retained raw IDs are included. Outside dependency rows referencing retained raw
IDs are measured by count and sorted SHA256 row digests inside PostgreSQL. No
collector payloads leave the database. An unrestricted RLS reader is required;
permission failures stop rather than report a filtered zero.

Before/after comparison requires identical catalogs, fixed scopes and retained
row digests, zero unexpected links to new IDs, and no remaining generated-ID gap.
Unsupported keys, missing constraints, source drift or changed dependency rows
stop qualification. A transaction's existing exact footprint must also retain
862 inserts in11 tables with zero updates/deletes. The observer alone is not
proof that triggers or unrelated application behavior are preserved.

`scripts/workers/pokemon_classic_dependency_observation_v1.mjs` accepts only
`--state-dir`, `--observation-dir`, `--ca-file`, and a new `--out-dir`. It validates
the configured production target, maturity counts, frozen originals, current
schema and producer through the production observation verifier. Two independent
verified-TLS READ ONLY transactions compare the entire dependency baseline.
Failures and pending generated IDs remain explicit; no apply mode exists.

The V2 journal SQL proof creates a new clone and retains its existing21 checks.
Additional tests use a clearly synthetic outside dependency table, with actual
UUID/bigint foreign keys and one NOT VALID key. They prove orphan rejection,
retained payload preservation, generated-ID checks, schema drift rejection and
independent post-commit readback. Fixture DDL runs as the local lab administrator;
the repair and its dependency checks run as the translated production owner.
No shared privilege is changed. This synthetic surface does not claim the full
production outside-table schemas were replayed. Prior labs/receipts stay intact.

Full PostgreSQL17/Auth/application replay, normal source commit/push, governed
images and the new production executor/package remain separate requirements.
Before a future production apply, capture a fresh catalog and baseline under
the final qualified transaction's locks. A prior observation is not authority.

An empty ID set has the exact zero-row aggregate without a SQL scan. This is
required because the live source-mapping relation can scan even for ANY(empty).
Generated-ID checks stay explicitly pending until exact V2 IDs exist. Nonempty
checks are never skipped, and production latency remains a separate gate.
Plan bytes, catalog bytes and generated bindings must each match their hashes.
