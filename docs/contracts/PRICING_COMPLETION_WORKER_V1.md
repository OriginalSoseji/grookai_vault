# Pricing completion worker V1

## Responsibility and present authority

Track every supplied pricing gap durably, route bounded batches by owner/scope/reason,
and preserve failures until a separately authenticated publication and application
read prove the exact price. The current executable is a **preparation worker**.
It does not repair production mappings, publish prices, or claim pricing completion.
No database client, network client, model, executable plugin, shell command, Git
publisher, environment loader, or credential is available through this worker.

The controller must run candidate code in a qualified isolated environment. Data
packets are untrusted output, never commands to execute on the Windows account.
The historical Pokemon Relationship Repair scheduled task remains disabled.

## Inputs

The worker accepts one strict JSON file manifest. Relative data paths and SHA-256
digests bind the exact bytes, not the producer's authenticity. It accepts either:

```json
{"schema_version":"PRICING_COMPLETION_FILES_V1","report":{"path":"report.json","sha256":"<64 lowercase hex>"},"identity_gaps":{"path":"gaps.jsonl","sha256":"<64 lowercase hex>"}}
```

or a typed snapshot:

```json
{"schema_version":"PRICING_COMPLETION_SNAPSHOT_FILES_V1","snapshot":{"path":"snapshot.json","sha256":"<64 lowercase hex>"}}
```

See [input contract](PRICING_COMPLETION_INPUT_V1.md). Do not mix mutable latest
pointers from different runs. Input, state, and output directories must be
disjoint. Input files are read-only. State and output belong to the controller;
symlink/junction redirection is rejected. Use local storage with exclusive-create,
atomic rename, and hard-link support. Immutable packet publication fails closed
on filesystems lacking hard links. Checksums detect corruption, not malicious
rewriting by a principal with write access to the entire directory.

## Runtime

Run only inside the approved isolated runtime, with an installed trusted Node
binary and the tested candidate file hashes:

```text
node scripts/workers/pricing_completion_worker_v1.mjs --prepare-only --input=<absolute-manifest> --state-dir=<absolute-state> --out-dir=<absolute-output> --batch-size=500
```

Add `--watch --interval-seconds=300` for recurring preparation. Batch size is
1–500 and interval is 60–86400 seconds. Unknown flags and production flags are
rejected. `PAUSE` in the state directory prevents work; the heartbeat reports
paused. SIGINT/SIGTERM stop the loop. Three consecutive cycle failures stop it
with a nonzero exit status. No Windows service, task, or production deployment
is installed by this command.
Failures retain a separate UUID-named JSON record as well as the latest heartbeat.
Lease claim and acknowledgement times include elapsed cycle time; a long cycle
cannot extend its authority by acknowledging against the cycle-start timestamp.

The process ingests every supplied row, leases one batch, writes immutable
content-addressed review packets, then retains those rows as `review_needed`.
The next cycle works the next batch. Unchanged input does not requeue reviewed
rows; changed source evidence reopens them. Missing rows never close old work.
Claims prefer the fewest lifetime attempts before priority and age. A new source
run can require strict re-verification of every observation, but it cannot keep
reselecting the first batch ahead of previously untouched work. Packets separate
direction, provider, category, currency and condition as well as owner/scope/reason.
Historical or partial input remains explicitly historical/partial. This process
can prepare a backlog; it cannot discover new sources without a fresh exporter.

`latest.json` reports input coverage, freshness, durable queue counts, preparation
counts and zero production writes. `heartbeat.json` reports liveness separately.
A live heartbeat does not establish completeness or repair capability.

## Durability and recovery

State includes first/last seen times, source digests, generations, owners, next
actions, attempts, leases, retry delays and history. Snapshot replacement is
atomic with file flush. Portable directory fsync is unavailable on Windows;
power-loss durability still depends on the filesystem. An initialized-but-missing
or corrupted snapshot fails closed. A crash may leave `writer.lock`; recovery
requires proving no live writer exists and retaining the state before removing
that lock. Do not automatically steal it. Expired leases retry after backoff
when the writer lock is healthy.

The current snapshot-reader candidate consumes UTF-8 in 64 KiB chunks and parses
individual scalar tokens with native JSON semantics, avoiding a simultaneous
whole-file buffer and JSON string. It still constructs the complete queue object
graph and validates its original checksum and schema before any change. This is
not a constant-memory queue or an unlimited-history capacity claim. Installed
runtime qualification and recovery status belong to the current checkpoint;
unit-test success alone does not authorize replacing the live worker.

The preparation-session candidate holds one exclusive writer lock and loads the
validated snapshot once for ingest, claim, packet publication, defer and summary.
Each of the same three mutations still validates the full state and persists its
own checksum/fsync/atomic-rename checkpoint; no commits are combined. Claims are
durable before packet publication, and packets precede durable acknowledgement.
The session exposes only ingest/claim/deferBatch/summary with detached results.
Any operation error poisons the session, even when caught by its callback; later
operations cannot persist a partially changed in-memory batch. Async callbacks
and original-API reentry are rejected, capabilities are revoked on exit, and the
private state reference is released. Abrupt process exit still leaves a stale
lock requiring explicit evidenced recovery; no automatic lock stealing was added.

Fifty isolated queue/session/worker tests pass, including actual child-process
exit, failed rename, partial batch failure and packet-publication failure. This
is candidate correctness evidence, not full-size capacity or live deployment.
The current checkpoint owns full-size qualification and installation status.
Packets precede lease acknowledgement. A crash can therefore leave an already
prepared packet with a retryable lease. Retrying identical content is safe;
attempting to replace different packet content fails. Packet digests and all
review-needed rows are evidence of outstanding work, not successful repair.

## Production activation still required

The completion queue has no default verifier. Unknown identity dimensions cannot
close. A future trusted controller must acquire and authenticate publication and
application-read evidence independently, binding run, identity, exact printing,
source digest, generation, currency, condition, positive price and provenance.
For `NOT_CONDITION_SPECIFIC`, item, publication and app-read evidence must all
bind `priceBasis:TCGPLAYER_MARKET`; this proves only the declared market-quote scope.
Distinct principal labels alone do not authenticate a receipt. Never provide a
callback that simply repeats worker claims.

Before production activation, qualify fresh bidirectional enumeration, exact
repair adapters for each lane, bounded apply/rollback/idempotency, the existing
guarded pricing publisher, and the independent application read path. Register
an executor in the completion control plane only after those capabilities are
operational. Do not report this preparation worker as a registered repair agent.
