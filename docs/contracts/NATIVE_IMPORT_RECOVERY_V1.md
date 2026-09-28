# Native collection import recovery V1

The native import sends the complete matched batch to `vault-import-targets-v1`.
Rows contain canonical card UUID/GV-ID pairs and desired owned totals. The client
must not turn these totals into per-card additive commands or fall back to
`vault-add-card-instance-v1` when the new endpoint is unavailable.

The endpoint verifies the real session through the shared Auth helper. The
preview owner must equal that verified actor, including if the account changes
between the client check and request dispatch. Supplied actor overrides have no
authority. Validation bounds the request to 2 MiB, 5,000 distinct targets and
50,000 requested copies; quantities are positive integers, with valid condition,
date, nonnegative cost and notes of at most 4,000 characters.

The endpoint delegates exactly one call to the service-only
`admin_import_vault_receipted_v1`, which wraps `admin_import_vault_targets_v1`.
The underlying pending RPC validates canonical
identity, serializes deficit calculation and saves the entire batch in one
transaction. The bounded release package now carries the unchanged pending
`20260926230000_atomic_vault_import_v1.sql` from the older audit candidate.
Fresh 407-migration replay and retained-data 406-to-407 upgrade pass independently
of the six unrelated pending audit migrations.
The additive `20260928020000_vault_import_receipts_v1.sql` supplies the receipt
wrapper and private terminal receipt table; fresh408 replay and retained-data
407-to-408 upgrade also pass. Neither original migration is rewritten.
Do not release the new native importer before that dependency and endpoint are
qualified and available. Main's current 406-migration schema lacks the RPC.

Returned counts and target identities must be structurally valid. Before showing
success, the native client independently reads active ownership, including slab-only
copies, for all targets and checks the authenticated actor again. A mismatch or
failed read is an unconfirmed outcome, not proof of rollback. Condition, acquisition
cost, date and notes travel with the batch. Activity emission is best effort after
verified success and is omitted when a retry adds zero copies.

The screen retains its CSV preview after an interruption, offers Retry import and
prevents replacement during an active save. Canceling replacement retains the prior
preview. A closed/restarted app can reconcile by selecting the same CSV again; no
CSV contents or bearer tokens are persisted by this repair. Requests after a known
maintenance rejection are retried only by the collector, never automatically by
the product. Missing endpoints fail closed.

Preview rows and catalog matches use the same normalized identity key. Saved
quantities are subtracted only when the CSV identity resolves to one canonical
candidate. An ambiguous printing remains visible for selection even if one of
its candidates is already owned. Reopening a fully saved CSV produces no new
rows; this is covered by the real Android emulator acceptance test.

Each admitted database attempt records a server-generated UUID, contract version,
canonical payload SHA256, stage, start/completion times and a terminal success or
sanitized failure. A successful save and receipt share one transaction. A failed
write rolls back its entire subtransaction while retaining a failure receipt.
Failure to insert a receipt rolls back any successful copies as well. Receipts
contain no CSV, email, cost or notes. Clients cannot read/write receipts or invoke
the service wrapper. Service-role callers can read but cannot directly modify
receipts; account deletion cascades their removal.

The server returns the attempt UUID on every post-validation response, including
an unconfirmed transport outcome. Authentication/validation rejection happens
before admission. Database unavailability or transaction cancellation cannot
promise a persisted receipt: retain the unconfirmed response and reconcile on
retry. A missing receipt is not proof that an attempt succeeded or failed.

The service wrapper replays an existing receipt only for the same owner, attempt
UUID and payload hash; changed payload returns a conflict without overwriting it.
Every new HTTP retry gets a fresh server-owned UUID and reconciles current totals.
These per-attempt receipts do not turn CSV retries into permanent exactly-once jobs.
Independent sales, deletion, archival or other ownership changes between attempts
can change the deficit. A retry does not remove copies above the desired total.
Do not promise a durable historical import receipt or exactly-once activity events.

For the new route, one application write job is one database transaction. The
existing pending Vault fence can therefore reject or drain the whole mutation.
This does not retire installed older apps or old web server processes. Their
multi-request writers remain a separate operational cutover requirement. Never
claim global job admission/drain from this route's tests or reuse consumed pause
and migration intents. Latest evidence:
`docs/ops/AUDIT_NATIVE_IMPORT_RECEIPTS_20260927.md`; earlier qualification:
`docs/ops/AUDIT_NATIVE_IMPORT_QUALIFICATION_20260927.md`; implementation history:
`docs/ops/AUDIT_NATIVE_IMPORT_RECOVERY_20260927.md`.
