# Recurring Pokemon warehouse discovery V1

The previously qualified raw/discovery intake must run without manual per-card
requests. A separate hourly service scans the full preserved category 3/85
warehouse and invokes the same plan, authorization, serializable batch and
independent readback path. This activates review ingress only. Canonical parents,
finishes, mappings, pricing, warehouse promotion and public search are excluded.

The standing policy binds the exact producer and release-manifest hash, permitted
categories/tables, batches of 500 and a maximum of 5,000 new products per cycle.
Unexpected larger scopes stop visibly for review. Every eligible product must
still meet the original source-preservation and comparison checks. Existing
relationships and unsupported evidence remain explicit holds. An empty eligible
plan is a successful no-op, not proof of complete canonical coverage.

The runtime is a root-owned immutable bundle: exact source files, lockfile,
installed dependency hashes and Node 20 qualification. Every cycle and apply
verify these bytes. A dedicated root-private environment reuses only the existing
canonical database URL and Supabase URL; TLS uses the verified CA. No credentials
are included in the bundle, policy, logs or receipts. The manual Git-based path
retains its clean committed producer requirement.

Systemd runs as grookai with a private state directory, protected filesystem,
resource limits, whole-control-group termination and no automatic process retry.
File and database locks prevent overlapping cycles. Before any write, a durable
inflight marker is created. Failure or termination retains it, blocking later
scheduled writes until the exact previous run has been independently reconciled.
Success removes only its own marker after terminal DB and filesystem receipts.
Never clear a marker just because a process is absent or an hour has passed.

The cycle and child intake persist operational ingestion_jobs run IDs, source
producer, plan, progress and terminal success/failure. Failed and interrupted
artifacts are retained. Successful full coverage reports are compressed only
after exact decompression/hash verification; the compression receipt is retained.
No source or failed-run evidence is pruned. Concurrent unrelated catalog count
changes are reported; source-linked conflicts remain hard batch blockers.

Activation requires normal source qualification, local SQL and runtime contract
proof, immutable bundle verification on the actual Node 20 host, a successful
manual invocation of the real service, independent DB readback, then observation
of an actual timer-triggered cycle and its next deadline. Configuration alone is
not activation proof. The existing read-only coverage workflow and pricing,
TCGCSV acquisition, MEE and scanner services remain separate.
