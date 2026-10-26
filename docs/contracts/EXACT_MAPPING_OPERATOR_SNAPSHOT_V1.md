# Reviewed operator-snapshot mapping admission V1

This separate mode is `reviewed_operator_snapshot_v1`. It is not enabled in any
production runtime. It neither makes the preparation worker a writer nor upgrades
an `offline_reviewed_export` receipt. Those packages and their apply rejection
remain unchanged. A snapshot admission is not a live executor dry-run receipt,
review approval, or production execution authority.

## Required source and trust boundary

`assertMappingOperatorSnapshotV1` and `buildMappingOperatorSnapshotPlanV1` in
`backend/pricing/exact_mapping_operator_snapshot_v1.mjs` are pure. They receive
original capture, complete reviewed population, selected JSONL and Master authority
bytes, independently supplied trust pins, and an actual producer checkout
observation. The builder preserves all four input byte strings exactly. It creates
new `run_plan.json` and `summary.json`; it never rewrites a historical package or
issues a source/printing review.

The producer must be a real clean committed checkout. Its commit/branch/time
observation must describe the actual process producing this new snapshot plan,
not the old offline planner or a synthetic fixture. Normal source review and
release checks remain required. A pure function accepting an observation cannot
independently authenticate Git history. The executor checks actual clean checkout,
expected current and producer commits, matching explicitly configured branch,
and producer ancestry before connecting. Existing apply confirmation and explicit
maintenance-launcher gates remain mandatory.

Trust pins are operator configuration, never populated from plan JSON. Required
`trusted` keys are `captureSha256`, `populationSha256`, `selectedSha256`,
`authoritySha256`, `collectorSha256`, `sqlSha256`, `caSha256`, `runId`,
`publicationSetId`, and `sourceSyncRunId`. An envelope self-hash does not authenticate
an operator. Its externally reviewed capture hash, collector hash and literal SQL
hash must originate from the separate root-controlled collector/readback. No
worker-controlled configuration, SQL, filename selection or code may enter that
credentialed collector. The pure validator allows an explicit scope for synthetic
tests; executor wiring fixes the 120-product ME05 scope in source.

## Fixed capture V2

External proposed script:
`C:/grookai_vault_agents/pricing_completion_validation_20261013/operator-readback/export_me05_mapping_preflight_v2.py`.
It accepts no arguments and uses only installed Python/psql, fixed reviewed SQL,
the exact production session endpoint, verified TLS and protected existing
`/etc/grookai-pricing-completion/source-export.env`. It reads no repository or
worker code. Every file ancestor must be root-owned and non-writable by others.
Its transport bounds stdout at 16 MiB, the envelope at 20 MiB, and psql at 180s;
SQL uses a 120s statement timeout and 3s lock timeout. No upload or production
execution is authorized by this document.

Version `FIXED_OPERATOR_ME05_MAPPING_PREFLIGHT_INPUTS_V2` retains the seven V1
record kinds and adds `collectorSha256` to the envelope. `live_input_context.data`
adds independently counted `decisions` and `foreign_embedded_targets` arrays.
Decisions contain `decision_id`, `run_id`, source product/observation/subtype,
decision/reason/scope, sync-run, price-row identity, currency, source-row hash and
source-artifact hash. All decisions for the fixed products/current publication
run are captured, including held or published siblings. All observations for the
source date are captured without filtering away source-run drift. Foreign matches
include every parent outside the exact ME05 set carrying a scoped embedded ID,
including same-game or missing-game/set parents. Counts fail on truncation.

Admission requires all 120 exact products and parents, unique embedded identities,
one active standard identity each, no existing TCGPlayer product mapping (active
or inactive), no active target mapping, no publication overlap and no outside-set
embedded match. Every observation and decision must form a complete bijection;
every sibling must be reviewed, in-scope, USD and quarantined only for a missing
active mapping. Candidate observations/subtypes/counts must cover that entire
product. Raw product and price payload hashes and projections are checked. Each
selected product must additionally match the raw product JSON artifact bound by
its already-reviewed external mapping assertion; a newly self-consistent payload
with unchanged name/number does not replace reviewed source evidence. Other
proof methods, omitted siblings, source drift or unsupported siblings fail closed.
Complete population duplicate checks happen before selecting at most 25 rows.
Master authority binds only the selected batch and its exact frozen live parents.

V1 preflight lacks this evidence and is rejected. Combining older captures to
exercise tests does not create genuine V2 provenance. The collector preserves
conflicts for validator rejection; an accepted capture is not a repair decision.

## Executor integration

New mode additionally requires `TCGPLAYER_EXACT_MAPPING_OPERATOR_SNAPSHOT_ENABLED=true`
and `TCGPLAYER_EXACT_MAPPING_EXPECTED_BRANCH`. Both are unset by default. Existing
candidate/authority SHA and expected execution/producer commit variables remain.
Additional trusted environment names use prefix `TCGPLAYER_EXACT_MAPPING_OPERATOR_`:
`CAPTURE_SHA256`, `POPULATION_SHA256`, `COLLECTOR_SHA256`, `SQL_SHA256`, `CA_SHA256`,
`RUN_ID`, `PUBLICATION_SET_ID`, and `SOURCE_SYNC_RUN_ID`.

Inputs are adjacent immutable `operator_capture.json` and
`reviewed_population.jsonl` in the new repository-contained batch directory.
The loader regenerates and exactly compares metadata bytes before constructing a
client. Capture, population, candidate and metadata hashes are rechecked before
writes and before commit; existing Master authority checks remain unchanged.

Inside the existing transaction, fixed bound queries recheck the exact current
run/publication/source pointer and full pointer row, source age (at most 24 hours),
complete selected-product siblings, exact frozen raw products/observations/decisions
and outside-target embedded matches. They run before writes and again before
COMMIT. The initial apply query also takes `FOR SHARE OF c` on the singleton
publication pointer until transaction completion; repeating a SELECT inside
SERIALIZABLE alone would only reread the original snapshot and cannot establish
that the pointer stayed current. Read-only dry-run takes no row lock. Existing
serializable apply, mapping advisory lock, all source/target
preconditions, Master identity checks, precommit evidence, exact mapping readback,
and uncertain-commit reconciliation behavior remain. This adds no automatic retry.

Source, product, observation, decision and target rereads remain comparisons
against the transaction snapshot. They do not prove that a concurrent unrelated
writer left those rows unchanged through COMMIT. No new source-row exclusion or
global catalog lock is claimed. Wall-clock source/capture age is rechecked even
though the database snapshot is stable. Production activation still requires the
full executor fixture and a reviewed source/runtime concurrency policy; a focused
pointer-lock fixture proves only the pointer lock's PostgreSQL behavior.

The proposed source mode does not solve credentialed writer runtime qualification.
It must execute in a separately reviewed immutable operator runtime; preparation
continues without database credentials. Five batches remain independently bounded
25/25/25/25/20. A committed batch must be independently read back and never blindly
replayed. Mapping success does not prove 194 published prices or close queue items.

## Retained qualification

Sandbox regression evidence `output/tests-mapping-operator-snapshot-v4.tap`
records 37 passing tests, including original offline-export rejection, missing
external pins, altered metadata, stale/future capture, complete population and
sibling checks, reviewed raw-payload drift, pointer locking branch, and existing
producer/maintenance gates. Tests are additive admission proof, not a full live
executor rehearsal.

The fresh genuine V2 capture at `2026-10-14T02:39:56.506Z` has SHA-256
`456220af52720b8615344fae3601199d9c026bca79d50833306abb1dfab319f8`.
Pure isolated admission at `02:45:38.882Z` passed all five unchanged reviewed
batches (120 mappings, 194 supporting observations). Receipt
`output/me05-genuine-operator-admission-v1.json` has SHA-256
`179d680133c49e20aee41f0525a06dd832606a65fa84f86e4c155db00576bce9`.
It explicitly records no qualified clean producer, no packaged source plan,
no executor invocation or live dry-run, and no production execution authority.
The earlier synthetic historical compatibility receipts remain distinct.

The isolated PostgreSQL 17 fixture proved UPDATE lock timeout `55P03` while a
second session held the pointer's shared lock, successful update after COMMIT,
serialization failure `40001` for a pointer changed before lock acquisition, and
read-only row-lock rejection `25006`. Its new database and dump are preserved;
the retained cluster was stopped afterward. `output/mapping-pointer-lock-v1`
preserves the original launcher wait failure and independent continuation receipt;
the probe ran once. This is pointer behavior proof, not full executor/schema parity.
