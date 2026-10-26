# Combined discovery census feed worker V1

This additive worker prepares review data for the new discovery queue. It never
opens the existing V1 source queue, runs SQL, accesses credentials or the network,
executes a repair, publishes a price, or closes an item. Its CLI requires
`--prepare-only`; there is no apply, watch, production, historical-clock or custom
module option. Runtime scheduling remains controller-owned.

## Feed admission

The fixed operator publisher emits a separate read-only feed with immutable
`generations/<sha256>/{master.json,warehouse.json,manifest.json}`, atomic
`latest.json`, and separately atomic `status.json`. Exact schemas match
`DISCOVERY_CENSUS_FEED_{GENERATION,LATEST,STATUS}_V1`. The generation ID is SHA-256
of sorted compact UTF-8 JSON plus LF for `{version,masterSha256,warehouseSha256}`.
Metadata must be exact canonical bytes; duplicate keys and noncanonical encodings
reject. No metadata path is used except the exact fixed/computed names above.

Controller configuration independently supplies Master collector, SQL and RPC
hashes, warehouse collector/SQL hashes, and the fixed project CA hash. Feed claims
cannot select these pins. Master uses the complete retained exact RPC definition;
warehouse V3 intake additionally requires its reviewed fixed collector/SQL pair.
Exported `PRICING_DISCOVERY_REVIEWED_PINS_V1` documents the reviewed production
configuration; tests can supply separately trusted synthetic Master evidence.

Admission verifies status success, exact generation identity, manifest/capture
byte hashes and sizes, both adapters' complete census validation, same
run/publication/source tuple and source-finished time, and each transaction/capture
clock. Capture, transaction and status freshness are at most 30 minutes; the
underlying source is at most 24 hours old. The declared relationship is always
`separate_repeatable_read_transactions`, never a shared transaction or whole-card
completion claim. Invalid counts, missing required rows, malformed evidence,
changed publisher status/latest, or pin drift block the entire combined input.

Each large capture is normalized in a separate scope. Only compact issue-bearing
entity observations and small summaries survive; there is no full normalized
cache. The worker strips adapter-only per-observation sourceLinks/semanticDigest;
generation provenance remains in the queue receipt. Queue observedAt is the earlier
transaction time. Both sources validate before any queue generation is ingested.
Status/latest are re-read immediately before ingestion and packet preparation.
Elapsed wall time is added to the injected library clock at each phase so long
normalization cannot silently bypass freshness. Production CLI always uses the
actual current time.

## State and outcomes

Feed, state and output roots must be explicit absolute disjoint directories with
no symlink/junction ancestors. The runtime must mount the root-owned feed read-only
and protect worker code/configuration; local hashes cannot authenticate a malicious
directory owner. Regular file bounds, hard-link rejection, O_NOFOLLOW where
available, and descriptor metadata checks protect input reads.

State root contains `queue/`, a monotonic `accepted-feed.json` high-water cursor,
and the exclusive `CYCLE.lock`. A regular `PAUSE` marker stops preparation before
feed admission. An abandoned cycle lock is never stolen; operator recovery must
first establish that no writer is alive. The queue has its own short transaction
lock. Accepted provenance cursor persistence precedes queue mutation; it is not a
preparation-success receipt. Replaying the same fully pinned generation is safe;
older capture/source clocks and rewritten generation IDs reject.

After one atomic combined ingestion, at most 500 eligible entities are leased.
The worker writes and fsyncs an immutable `packet-<content-sha256>.json` before
acknowledging those exact lease tokens as review-needed. Packet content contains
real identities, all issues, compact semantic evidence, exact current and per-item
capture references, first/last observation times and lifetime attempt count. It
contains no executable commands, approval authority, or fabricated prices.
No resolved state exists. If packet publication or acknowledgement fails, leases
remain unresolved and expire for retry. A crash after packet publication can leave
an unacknowledged immutable packet; it is retained evidence, not permission to apply.

`heartbeat.json` reports prepared, failed or paused. Failures receive immutable
`failure-<uuid>.json` records with sanitized codes and queueMutationStarted.
Output failures after queue ingestion cannot roll back an already committed
generation, but never close anything. Output packets/history are not pruned by
this worker; qualify retention/capacity before long unattended operation.

## API and qualification

`runPricingCompletionDiscoveryFeedCycleV1({feedDirectory,stateDirectory,
outputDirectory,expectedPins,now?,batchSize?,maxCaptureAgeMs?,leaseMs?})` is a
synchronous one-shot controller API. CLI flags name the three roots, six producer
hashes, optional batch size, and mandatory prepare-only. All dependencies are
built-in Node or reviewed pure local census/queue modules.

Qualification must cover both complete inputs before mutation, exact pins/tuple,
failed/stale/tampered/concurrently changed feed, no semantic churn, immutable
packet-before-ack behavior, abandoned locks, directory separation and CLI gates.
Run real retained capture replay in an isolated credential-free runtime using
`--jitless --max-old-space-size=768`, then qualify total RSS in the intended 1 GiB
Linux rootfs. Historical replay uses the library's explicit clock only and is
never fresh production qualification. Existing source queue bytes and reports
must be independently preserved throughout activation.
