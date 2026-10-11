# Portfolio history V1

Status: implemented local capture, storage, recovery and web/native history candidate.
Browser and physical Samsung runtime proofs pass. Exact release qualification and
physical iOS remain open; production is unchanged.

The Vault already shows current reference value and coverage. History must answer
what changed between two actual observations of this owner's inventory. A change
in reference value is neither realized profit nor cash flow. Current catalog price
history cannot establish past ownership. Never backfill holdings from today's Vault.

## Existing authorities

Canonical ownership is `vault_item_instances`, filtered by authenticated owner and
`archived_at is null`, including raw, slab and sealed anchors. Bucket projections,
import staging, Binder contributors and public showcases are not ownership sources.
The current database constraint allows exactly one of card, slab or sealed anchor.
The owner foreign key cascades on hard account removal.

Raw references must reuse the current exact-printing pricing authority, including
current publication, reconciled run, eligible decision, reviewed-mapping quarantine,
Jungle edition checks, hidden-printing exclusions and freshness. The latest inspected
definition is `20261001203000_jungle_edition_price_reader_integration_v1.sql`.
Do not reconstruct eligibility from the older July publication migration. Require
exact parent/printing agreement, supported source/currency, positive finite amount,
timestamps and provenance. No parent "From" price or asking price substitution.

Sealed references reuse `vault_sealed_current_evidence_v1` and its frozen price/image
release and qualification checks. Only factory-sealed, undamaged owned copies can
inherit the qualified reference. Opened/damaged/unknown copies stay in ownership
coverage. The current authority admits USD only; do not introduce foreign evidence
because the comparison engine supports separate currency buckets. Slabs remain
explicitly unpriced until a separate governed slab authority exists.

The read-only authority receipt verifies these installed objects in exact436, all437
source migration hashes and account cascade. PostgreSQL unrestricted `numeric`
accepts NaN and Infinity, and both pass a simple `> 0` check. The capture boundary
must explicitly reject non-finite references; current web finite checks already
reject them. This finding does not establish bad values in production.

## Implemented comparison boundary

`backend/vault/portfolio_history_v1.mjs` is a pure server projection. It performs no
database access, authorization, capture, recovery, pricing qualification or writes.
Only a future trusted capture authority may provide its observations. Validation
of this shape alone is not proof that a snapshot was actually captured.

Each observation has version1, scope `all_active_owned_copies`, owner UUID,
snapshot UUID, positive bigint sequence encoded as a string, a canonical UTC
millisecond capture timestamp, `complete: true`, exact owned count and all copies.
Sequences order distinct observations even when timestamps share a millisecond.
Comparison requires the same owner, distinct snapshot IDs, increasing sequence
and nondecreasing timestamps. A recovered request returns its original snapshot;
it is not a second observation. Missing/failed reads are errors, not empty points.

Each copy has an immutable copy UUID, raw/slab/sealed kind, a SHA256 basis key,
qualified reference or null, and an explicit unpriced reason when null. The future
capture authority must hash a canonical, versioned basis containing object kind,
parent and exact printing/slab/variant identity, condition and grading/seal/package
facts that affect interpretation, and the valuation policy version. Exclude the
observation/publication/provenance ID and current amount from that basis key: a
new publication can change a price without changing what is being valued. Retain
the full basis alongside the digest in storage for review and later policy changes.

A reference contains exact positive decimal text, currency, provenance UUID,
observation date/time and publication timestamp. Raw observation and publication
times are required. A sealed source date stays a validated YYYY-MM-DD string;
it must not become an invented midnight source timestamp. Future dates/times and
publication preceding observation are rejected at the available source precision.
Sealed publication time may be null when its existing read authority provides
release/qualification identity and observation date without that timestamp; the
capture adapter must retain that distinction rather than invent a time. The model
does not qualify a capture adapter.

Amounts are never converted to binary floating point. Inputs are bounded to1024
decimal characters and100,000 copies. Values outside this computational envelope
must stop capture with an explicit supported-size error, not be rounded, truncated
or silently removed from coverage. Capacity/load qualification remains required
before setting any production capture limit. Decimal sums preserve all admitted
digits. Two-decimal reference displays round only after aggregation, with ties
away from zero to match PostgreSQL numeric. This is display precision, not an FX
conversion or a currency settlement minor-unit contract.

Every reference-currency subtotal change reconciles exactly into:

- Comparable held-copy market-reference movement.
- New copies at their new reference values.
- Removed copies at negative previous reference values.
- Newly priced copies on an otherwise unchanged basis.
- Lost price coverage on an otherwise unchanged basis.
- Identity, condition, kind, currency or valuation-policy basis changes.

Basis changes take precedence over coverage changes so opening a sealed copy does
not look like market loss. A cross-currency change contributes negative old value
and positive new value to separate currency buckets; no conversion or combined total.
Unpriced additions/removals still count as inventory changes. Exact component sums
must equal the exact subtotal difference. Display components include an explicit
rounding adjustment so they reconcile to displayed after minus displayed before.

Summaries distinguish empty ownership, all-unpriced, partially priced and fully
priced collections, with counts by kind, reason and currency. A first observation
has no previous zero, percent change or profit. Charts must show actual captured
dates, gaps, coverage and current-versus-recorded value clearly.

## Capture and recovery contract

Use a single server-consistent inventory and pricing observation, not separate
client pages or a sequence of volatile reads. A materialized single-statement
projection or a proven repeatable-read transaction must bind inventory, publication
pointers, price evidence and capture time. Missing, duplicate or malformed evidence
must have a defined failure/coverage boundary. Do not pass a failed web pricing read
that returned an empty array off as complete history.

Owner authentication comes from the session; clients must not choose another owner,
backdate a point, supply prices/holdings or override scope. Storage must retain exact
identity, basis and source evidence without depending on mutable current-copy rows.
Removing or editing a copy must not rewrite a prior observation. Historical copy IDs
must not have deletion semantics that erase history when an individual copy is removed.
Owner removal must cascade all private point/detail/request data through the existing
account deletion workflow. An append-only update guard must not obstruct that cascade.

Capture needs a default-off entry control, exact durable owner/request identity,
serial ordering, persisted terminal outcomes, duplicate and changed-retry handling,
bounded reads and recovery while entry is off. A lost successful response must return
the original dated point even if inventory/prices changed. Client recovery must survive
account changes and real process restart; a missing read is not proof of cancellation.

Capture occurs on the first authenticated Vault visit per UTC day. There is one
immutable point per owner/day, no scheduler and no backfill for missed days. Points
and terminal requests remain until account removal. Individual-copy removal cannot
rewrite observations. Export is owner-only and paginated against an immutable point.
The actual SQL capture limit is20,000 active copies and32MiB evidence; oversized
inventory fails without a partial point. No provider fetch or production activation
is authorized by this contract.

Web/native should consume the same qualified server comparison, reuse the existing
Vault and Binders, and preserve a usable current Vault when history fails. Native
must not implement a second valuation or reconciliation authority.

## Evidence and remaining release gates

Fresh baseline: live429/source437, normalized drift0,1170 security objects and the
complete retained parent chain unchanged. Installed-authority review: exact436,
read-only, owner cascade and all three identity anchors present, raw numeric precision
and signed rounding independently checked in PostgreSQL. Model tests cover mixed
changes,200 generated portfolios against an integer oracle, currency/basis/coverage,
first/empty/error states, precision and privacy identity boundaries.

Wider438 fresh replay, retained populated upgrade,215 exact SQL/Node comparisons
and215 summaries, actual Auth concurrency/cancellation,20,000-copy capacity,
sealed pricing, keyset pagination, account cascade, reapply and independent shadow
pass. Actual browser passes nine scenarios; physical Samsung build438 passes exact
SQLite recovery across two processes with one capture while new entry is disabled.
All15 browser/device images have been reviewed and source-bound.

Exact437 excludes deferred receipt delivery. Its fresh production read-only baseline
and full replay, upgrade/Auth/reapply/shadow pass. Exact shadow matches1256 security
objects with raw/normalized drift0. Ordinary release gates remain in progress. Physical iOS remains unverified because of the pending Mac-local
keychain and Dart startup permission actions. No deployment or production writes.

## Capture continuation decisions

The user renewed the complete overhaul instruction. Independent local schema and
client implementation now proceeds without altering the qualified parent iOS tree.
Use one immutable point on the first authenticated Vault visit per UTC day. No
scheduler or missing-day backfill. Preserve points and terminal requests until
account removal; no automatic pruning. Export uses private owner-only bounded
pages tied to the immutable point and a stable sequence watermark. Individual copy
removal must not erase old observations. Initial capture bounds are20,000 active
copies and32MiB evidence; exceeding either produces an explicit failed outcome,
never a partial point. These bounds require actual SQL capacity qualification.
PostgreSQL owns atomic capture and comparisons consumed by both clients; the
Node exact-decimal model supplies an independent arithmetic oracle. All437 prior
migration bytes and earlier populated labs stay unchanged.
