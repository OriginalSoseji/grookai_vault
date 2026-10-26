# Pricing completion discovery queue V1

This is a separate, credential-free preparation ledger. It does not open, migrate,
reset, resolve, or rewrite the existing source completion queue or its history.
There is no database client, network, subprocess, receipt-path execution,
production executor, or completion API. Every stored entity remains unresolved.

## Identity and semantic evidence

One item represents one real entity and all of its reported issues:

- `master_printing`: `printingId` UUID, explicit three-letter currency other than
  `XXX`, and `condition: NOT_CONDITION_SPECIFIC`. This version has fixed price
  basis `TCGPLAYER_MARKET`; it makes no physical-condition claim.
- `catalog_parent`: `parentId` UUID. No printing is invented for a childless parent.
- `warehouse_product`: provider token, positive decimal category and product ID
  strings. A warehouse product is not necessarily a card.

Observations have exact fields `identity`, `issues`, `evidence`, `owner`,
`nextAction`, and optional priority 0–100. Issues are unique sorted tokens;
evidence is a JSON object bounded to 4 KiB. The canonical semantic digest includes
these fields only. Capture hashes, clocks, run IDs and membership provenance belong
in generation `sourceLinks`, not semantic evidence. The controller must remove
adapter-only `semanticDigest` and per-row `sourceLinks` before queue admission.
The queue validates structure, not collector authenticity or canonical identity.
The separately reviewed intake/controller must establish those facts first.

## Whole-generation admission

`openPricingCompletionDiscoveryQueueV1({directory,maxItems?,maxBytes?,maxFiles?})`
requires an explicit absolute, controller-owned directory. Defaults: 300,000
entities, 1 GiB retained bytes, 100,000 files. Inputs are bounded JSON values;
the caller already owns the input observation array. The implementation retains
compact row indexes/digests and loads one item shard at a time, not a full queue.

`ingestGeneration({generationId,observedAt,sourceLinks,observations},{now})`
accepts one fully admitted **combined** source generation. `generationId` is an
external SHA-256 identity, `observedAt`/`now` are epoch milliseconds, and sourceLinks
is a compact JSON object up to 16 KiB. Validate all namespaces and their immutable
receipts before invoking it. A bad row or duplicate identity rejects the entire
generation before any queue byte is staged. Subsequent storage failures cannot
publish a partial generation. New generations must have increasing observedAt;
the same ID is replayable only with identical canonical generation contents.

Exact replay makes no change. A fresh generation with unchanged semantics preserves
every item-shard byte and item state/history/attempt counter. Changed semantics
reopen the item as pending, revoke its old lease, reset attempts-since-change, and
preserve firstSeen, lifetime attempts and transition history. Missing input never
closes an item or renews its lastSeen. Empty membership is valid evidence of no
observed issue entries, not a completion signal.

## Durable layout and recovery

`objects/<sha256>.json` stores immutable item shards (256 key prefixes), membership
shards, generation receipts and manifests. Each bounded object is exclusively
written, fsynced and renamed inside the same directory. A manifest references all
active item shards and the latest generation receipt. `CURRENT.json` is fsynced
and atomically replaced last; it is the only visibility/commit point.

Unchanged membership shards are reused by content hash. Each generation receipt
links to the previous receipt and its exact member keys. `get()` and claim views
derive lastSeen/lastGeneration/sourceLinks from the newest receipt actually
containing the entity. Absent entities therefore retain their previous observation
time without rewriting all item shards. Read lookup can traverse older receipts;
it is bounded to 100,000 receipts and fails rather than guessing if inconsistent.

An exclusive `WRITER.lock` covers every writer transaction. No PID-age assumption,
automatic lock stealing, or automatic reset exists. Ordinary thrown errors release
the writer's own lock; process death leaves it for operator investigation. Readers
use one atomic CURRENT and immutable referenced objects. Corrupt/missing referenced
objects fail closed. A populated object directory with no CURRENT is not treated
as an empty queue.

After a process crash, the operator must prove the old writer is stopped, preserve
the lock and staging evidence, inspect CURRENT and every referenced object, and
only then explicitly remove the abandoned lock. Unreferenced staged objects are
invisible and retained. A first-ever interrupted initialization with no CURRENT
requires explicit recovery in a new isolated directory or a separately reviewed
empty-state recovery; this library will not erase the partial store. If CURRENT
was already replaced, a retry of the same generation is idempotent.

Prior manifests, generation receipts and obsolete shards are retained. There is
no unqualified garbage collection. Hard retained byte/file budgets fail closed
before additional object writes exceed the limit, preserving the prior CURRENT.
An interrupted oversized generation may leave unreachable objects consuming that
budget; operator qualification/retention work is then needed, not a silent reset.
Item history is bounded to 1,024 events/128 KiB; reaching it also fails closed.
All these are explicit capacity limits, not claims of unlimited unattended life.

Atomic same-directory rename and exclusive creation are required filesystem
semantics. Windows lacks portable directory fsync through Node; file fsync and
process-crash consistency still apply, while power-loss guarantees depend on the
filesystem/platform. Symlinks/junctions, nonregular files, hard-linked files,
unexpected store filenames and traversed symlink ancestors are rejected. A trusted
directory owner can rewrite hashes and state; hashes do not authenticate that owner.

## Bounded preparation and retries

`claimBatch({now,limit,leaseMs,workerId})` claims at most 500 eligible items with
1 second–1 hour leases. Eligible states are pending, due retry, or expired lease.
Selection uses fewest lifetime attempts before priority/firstSeen/key so semantic
refresh cannot repeatedly starve untouched entities. Claims increment lifetime
and since-change attempts and append immutable transition history.

`deferBatch({now,claims:[{key,token}],reason,owner,nextAction,retryAfterMs})`
validates every claim/token/unexpired lease before writing any replacement shard.
Omitting retryAfterMs (or null) moves to `review_needed`; an explicit 1 minute–24
hour delay moves to retry. Reason/owner/nextAction are recorded as preparation
outcomes, not rewrites of source-semantic evidence. Stale tokens reject. A crashed
preparer's expired lease can be claimed again. Defer does not count completion.

`summary()` streams shards to verify totals and returns unresolved=total,
completed=0, state/kind counts and lifetime attempts. `get(identity)` returns one
item plus derived provenance. `inspect()` provides current manifest/shard hashes
for controller audit and qualification; it exposes no mutation or completion path.

Focused contracts cover replay/resume, unchanged-recapture shard reuse, absence,
semantic changes, real identities, batch atomicity, lock contention, stale lease
acknowledgments, retries/fairness, corruption, interrupted staging, capacity failure
and symlink boundaries. Execute only in the existing isolated qualification runtime.
