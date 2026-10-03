# Pokemon Classic selected dependency replay V1

Status: isolated SQL qualification only. No production executor or release.

The proof CLI accepts the private state directory, a new database name matching
`grookai_classic_canonical_proof_deps_*` (at most63bytes), and a new output directory.
`DISCOVERY_INTAKE_PROOF_URL` must identify the loopback administrative database.
Validation rejects production hosts before filesystem or database access. It
creates a new lab and unique NOLOGIN role translations; existing labs and shared
roles remain unchanged.

Inputs are the hash-bound selected dependency package, captured Auth schema, and
sequence/extension metadata. The selected28public relations include the actual
warehouse/sealed guards, replacing the earlier empty stubs. The captured Auth
schema has27tables and one sequence. Only prior isolated fixture data is copied;
no production or Auth user rows are read/copied. Actual constraints, generated
columns, indexes, triggers, functions, policies, owners and access grants replay.
A new connection compares694columns,285constraints,17triggers and33function
bodies to captured definitions before writing the terminal replay receipt.

Role names are translated to new uniquely named principals. Actual INHERIT and
BYPASSRLS attributes are retained; cluster administration and login are excluded.
Owners of SECURITY DEFINER functions are translated too. The nativePostgreSQL16
lab cannot represent production17's MAINTAIN privilege. Sequence allocation
values are local. These explicit differences are never reported as exact full
Supabase runtime qualification. The115inbound foreign keys outside this selected
surface remain a separate preservation-analysis gate.

The journal proof accepts this replay directory as an optional fifth argument.
It creates another new clone, executes as the translated non-superuser PostgreSQL
owner, and snapshots all selected public tables. Actual transaction statistics
must show only the exact expected new rows in11tables, with zero updates/deletes.
Rollback, late failure, locking, independent lost-response reconciliation,
zero-write repeat and corruption rejection remain mandatory. No old writer guard
is removed and no production connection is accepted by the local writer.

Restricted SQL roles and request claims are not actual Auth login, JWT verification,
PostgREST, HTTP, a website release or public proof. Complete runtime qualification,
normal source commit/push, governed image admission, and the new production CLI
remain open. Preserve each failed attempt and its unique database/output path.
