# Worker cloud backups V1

The founder selected private `worker-recovery-archives` in production project
`ycdxbpibncqcchqiihfz` on September 29, 2026 after reviewing quota impact.
Use the existing worker system credential; never copy it to a desktop, source
tree, log or archive. No schema, catalog/pricing writes, grants or RLS changes.

Seed all 14 verified recovery archives (2,835,276,805 archive bytes), including
their plan/restoration evidence. Preserve desktop and worker copies. Keys use
deterministic provenance identifiers. Every upload is create-only; retries verify
existing bytes. Chunks are at most 6 MiB, the private bucket limit is 8 MiB, and
only binary/JSON MIME types are admitted. Download each chunk and verify its hash
and the reconstructed file hash before publishing the completion manifest last.
A separately preserved receipt binds the manifest hash.

The scheduled worker verifies seed manifests, backs up finalized MEE retention
archives from `/var/lib/grookai/mee/archive/runtime` with metadata/file hashes,
and backs up/restores a narrow daily operational health snapshot. Pending source
removals are not final archives. Environments, credentials and arbitrary paths
are excluded. These are worker-evidence backups, not database/PITR backups or a
claim that every production file is covered.

Per-run budget: 512 MiB new file payload, 20 packages; deferred archives remain
explicitly listed. Tracked payload budget: 10 GB including seed. Exceeding it
fails visibly for operator review. Metadata and interrupted uploads also consume
quota. No automatic cloud lifecycle or local deletion is enabled. Existing
retention is separately governed and is never invoked by this worker.

Run daily at 04:15 UTC after retention, serialized with a dedicated flock and the
MEE retention lock. Bound transport to 90 seconds/request, service to two hours,
and writable paths to receipts only. Pause below 15 GB worker free space or with
stale/unhealthy critical health. Persist attempts and terminal receipts, atomically
update latest, retain failures and use the existing operations failure webhook.

Release from merged immutable source; preserve pricing/MEE/control-plane pointers.
Before recurrence, prove seed uploads, a downloaded real-archive restore and a
manual run. Then verify an actual timer trigger, terminal receipt and health
restore. Rollback stops the new timer and preserves all objects/receipts.

Verification: `node --test tests/contracts/worker_backup_*.test.mjs`. Fixtures cover
idempotency, corruption, interruption, source mutation, bounded restoration,
private destination enforcement, budgets and failure persistence. Actual live
receipts remain in the external September 29 recovery directory.
