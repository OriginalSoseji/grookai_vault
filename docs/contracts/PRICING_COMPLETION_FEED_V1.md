# Pricing completion source feed V1

The credential-free consumer reads only a controller-mounted read-only feed. It
does not connect to a network/database, load executable plugins or issue worker
commands. Expected collector and SQL SHA-256 pins are independent CLI inputs.
The runtime must serialize invocations for a given cache/state pair; do not run
the optional watcher alongside a scheduled one-shot consumer.

`status.json` has exactly version `PRICING_SOURCE_FEED_STATUS_V1`, state,
attemptedAt, generationId and errorCode. A failed/in-progress publisher status
makes even a previously fresh latest capture ineligible. Published status must
bind latest's generation and have a null error code. Missing, malformed, future
or stale status fails closed.

`latest.json` has exactly version `PRICING_SOURCE_FEED_LATEST_V1`, generationId,
generationPath (`generations/<captureSha256>`), captureSha256, manifestSha256 and
publishedAt. The selected immutable generation contains `capture.json` and
`manifest.json`. The generation manifest has exactly version
`PRICING_SOURCE_FEED_GENERATION_V1`, generationId, captureFile (`capture.json`),
captureSha256, captureBytes, collectorSha256, sqlSha256, projectRef, sourceRunId,
publicationSetId, sourceSyncRunId, capturedAt, publishedAt and sourceFinishedAt.
All hashes are lowercase SHA-256; manifest clocks are canonical UTC milliseconds.
No arbitrary manifest path is followed. Symlinked/redirected directories/files,
unknown fields, partial generations and mismatched hashes are rejected.

The consumer requires the exact V2 operator envelope, verified source/run/set
bindings and rollback terminal, using the existing offline normalizer. The
capture/status age defaults to 30 minutes for a 15-minute publisher timer and is
configurable up to 24 hours; source freshness never exceeds 24 hours. It checks
latest and status bytes again after validation. Master coverage remains unknown.

A complete normalized generation is atomically published under a disjoint local
cache directory. An accepted-feed cursor records monotonic capture/publication/
source clocks before queue mutations. It means validated input was accepted, not
that preparation succeeded. A failed preparation can retry the same generation;
older evidence remains rejected after a crash. Incomplete staging directories
are preserved and ignored. Existing accepted generation files cannot be changed.
On Linux, new-directory entries, the staged generation, its publication rename,
and the accepted cursor rename are directory-fsynced before queue mutation.
Windows qualification tolerates only known unsupported directory-fsync errors.
After a successful preparation cycle, cache retention keeps the accepted current
generation and the newest other generation. Before deleting an older cache, it
validates a SHA-named direct child, the exact three regular files, typed input
manifest, snapshot digest and source metadata. Cleanup unlinks only those three
files then removes the empty directory; there is no recursive deletion. Unexpected
files/redirects or cleanup errors fail closed. Up to two interrupted staging
directories are preserved; more prevents new cache writes pending inspection.
Repeated preparation failures may retain a third completed generation; a fourth
new generation is rejected until a retained generation succeeds and is pruned.
Queue records, review packets, history and operator feed generations are never
deleted by this consumer.

The unchanged preparation worker ingests into the selected existing queue state.
The feed validation/cache scope returns only the bound input path and small
provenance. Raw capture and normalized feed objects are no longer live when the
queue phase starts. Worker intake similarly releases raw input text/snapshot
before queue loading and its observations after ingestion. Output and queue
policies remain unchanged; resource qualification still uses the runtime limit.
Queue checksum hashing and snapshot writes emit bounded JSON chunks, preserving
legacy canonical digest bytes and ordinary snapshot serialization. They do not
allocate a second complete queue tree or complete serialized queue string. The
queue still loads and validates its full durable state; this is not a streaming
database or a claim that arbitrary queue size fits the resource limit.
Absence from a new source snapshot does not close an unresolved record. Packets
remain review requests; there is no executor, publication authority or claim that
cards now have prices. Rejected feeds do not open or mutate the queue and produce
durable failure records plus heartbeat. Errors after preparation starts are marked
`queueCycleInvoked:true`; retry leases retain the existing worker's semantics.

CLI: `scripts/workers/pricing_completion_feed_worker_v1.mjs` requires
`--prepare-only`, absolute disjoint `--feed-dir`, `--cache-dir`, `--state-dir`,
`--out-dir`, and independent `--expected-collector-sha256` and
`--expected-sql-sha256` pins. Optional `--watch` polls every 60 seconds, persists
failures and retries until signaled. Default one-shot exits nonzero for a rejected
feed. `state-dir/PAUSE` pauses preparation. Queue migration, read-only mounts,
credential removal, service confinement and scheduling remain operator gates;
this code does not deploy or alter the existing Windows worker.
