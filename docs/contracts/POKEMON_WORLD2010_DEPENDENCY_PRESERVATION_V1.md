# Pokemon World2010 dependency preservation V1

This read-only policy binds every foreign key into the six World2010 write
tables, including other schemas and NOT VALID constraints. Internal dependencies
remain covered by the atomic executor and exact transaction footprint. Unknown
key shapes and an RLS-filtered reader fail closed.

Outside checks preserve all 77 group raw receipts and 13 historical raw receipts.
Historical signed bigint identities are retained losslessly. New generated IDs
are positive decimal strings. Postwrite verification binds the exact 83 raw IDs,
92 mapping IDs and both journal IDs to independent full relationship readback;
caller-supplied IDs alone are insufficient. UUID scopes bind all fixed rows.
Only counts and sorted SHA256 digests leave SQL; no private dependency payloads
are exported. Every nonempty ID scope queries the database. Empty sets remain
explicitly pending until actual generated IDs exist.

The new read-only worker accepts only `--plan-dir`, `--ca-file` and a NEW
`--out-dir`. It verifies target and maturity counts, replays original evidence,
checks all 92 active Master facts, requires absent canonical/journal scope, and
compares two independent READ ONLY/TLS observations. It binds the full source
producer before and after observation and captures current schema, including
catalog type modifiers so numeric precision and varchar limits survive replay. No apply,
historical approval, finish assertion or human signature is introduced.

The relationship SQL proof accepts an optional dependency input directory and
captured schema file. A new loopback clone gains the exact missing dependency
closure before baseline. Tables, constraints, indexes, trigger functions, policies
and translated owners are independently compared to the captured definitions.
Live-column order is retained; dropped physical attribute slots are omitted in
re-created relations. PostgreSQL16 lacks production17's MAINTAIN privilege.
Auth remains empty and no real Auth/HTTP or production load proof is implied.

The expanded proof seeds retained references in actual outside tables, compares
all rows through rollback and commit, checks generated raw/mapping references,
changed retained payloads, forged generated IDs, added constraints and restricted
readers. Its atomic footprint remains 536 inserts in six tables and zero updates
or deletes. Lost-response and zero-write-repeat proof remain required.

Local nonempty queries against a small clone do not qualify production mapping
lookup performance. The captured market_price_pipeline_candidates lacks a
leading source_mapping_id index. A governed lookup/index solution, production
locking/runtime, frozen committed producer, new production CLI and independently
verified apply/public readback remain separate gates. No production writer is
enabled and no completed World/ME05/Classic integration may be replayed.
