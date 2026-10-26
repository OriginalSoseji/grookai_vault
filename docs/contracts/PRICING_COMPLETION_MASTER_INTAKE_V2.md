# Master pricing intake V2

V2 is a separate offline path. It does not change V1, the running eight-file source
worker, database state, queue records, or publication authority. Its pure builder
is `buildPricingCompletionMasterGapExportV2`; its pinned-byte adapter is
`normalizePricingCompletionMasterOperatorReadbackV2`.

The exact envelope is `FIXED_OPERATOR_POKEMON_MASTER_CENSUS_V2`, with the same
top-level fields and eight fixed records plus exact RPC batches as V1. Scope adds
`setFamilies: ['pokemon','pokemon_jpn']` under `games: ['pokemon']`, with USD,
TCGPLAYER_MARKET and NOT_CONDITION_SPECIFIC unchanged. Japanese family membership
does not imply English language or authorize an English product mapping.

The independent capture, SQL and complete RPC definition hashes are mandatory.
Every 500-ID batch must match the sorted exact printing census and its exact RPC
response IDs, run and publication set. Before/after pointers must agree within the
read-only repeatable-read transaction; the terminal must acknowledge rollback with
read-only default still on. Source publication must be no older than 24 hours at
capture. Missing/duplicate UUIDs, orphan printings, count disagreements, mismatched
RPC parent/printing/finish tuples or omitted/extra batches reject the envelope.
Integrity findings do not relax transport or exact-readback validation.

All parent and printing rows are retained. Missing or invalid display names,
GV-IDs, finish labels, set IDs/codes, unsupported/missing set families, and parents
without children enter an exact UUID-keyed catalog integrity ledger. Each entity
appears once with all its issue codes and retained fields. `invalidParentRoutes`
and the matching count must equal the parent union of missing/invalid set IDs,
unsupported/missing set families, or blank/untrimmed/missing set codes; valid
`pokemon_jpn` parents are not route failures. Parent game outside `pokemon` is a
scope failure. Missing-child parents never receive invented printing IDs.

The price census partitions every printing once into a usable exact market quote
or an exact-printing price gap. A price gap retains its printing UUID even if its
GV-ID is missing. Catalog defects are a separate, overlapping dimension. Summary
counts expose the intersection and union of price gaps and integrity-affected
printings, plus distinct no-child parents. Multiple defects on a no-child parent
count that parent once. `expectedUnresolved` describes price gaps plus no-child
parents; it is not an additive catalog-defect total. Any catalog issue makes
Master coverage partial. Completion and repair authority are always false, source
coverage remains unknown, and absence never resolves existing work.

Run `scripts/audits/pricing_completion_master_operator_readback_v2.mjs` only in
the isolated credential-free environment, with absolute `--input`, new disjoint
`--out-dir`, and independent `--expected-file-sha256`, `--expected-sql-sha256`,
`--expected-rpc-sha256` pins. It writes the full `master_inventory.json`, separate
`catalog_integrity_ledger.json`, pricing snapshot, coverage and receipt. File
hashes are recorded and the V2 acceptance manifest is written last. Its schema is
`PRICING_COMPLETION_MASTER_SNAPSHOT_FILES_V2`, binding snapshot, inventory, ledger,
receipt and `semantic_observations.json`. The existing V1 worker explicitly rejects
this manifest. Preserving
the separate ledger is mandatory; the snapshot alone does not represent all
catalog work. There is no apply, database or production-execution mode.

Semantic observations bind a per-printing hash of retained parent, printing, RPC
price row, catalog issues and price failures. Capture hashes/times remain in the
receipt and coverage rather than each row's semantic evidence. After strict V1
shape/coverage validation, V2 removes V1's injected global snapshot digest/clock
from its separate semantic projection and recomputes the observation digest.
Repeated captures with unchanged underlying rows therefore preserve queue
evidence; actual catalog/price changes still change it. Passing the retained raw
snapshot back through the V1 worker would reintroduce those global fields and is
not a supported V2 ingestion route. A future combined worker still requires
separate qualification before consuming the V2 manifest.

Historical V4 evidence remains rejected as an operator capture: its post-rollback
read-only default was off. Historical policy replay may use its immutable rows,
actual RPC hashes and exact batches at the original observation clock to test the
pure V2 census. Such a replay must say historical, retain the failed terminal,
and produce no accepted input manifest or live-freshness claim. It cannot be
relabeled as a successful fresh V2 collector run.
