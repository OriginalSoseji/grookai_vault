# Pokemon warehouse discovery intake V1

The pricing warehouse can receive numbered Pokemon products that never enter
external discovery. This worker closes that ingress gap across the complete
preserved English and Japanese inventory, using bounded batches of up to 500.

It copies eligible warehouse payloads into shared `raw_imports` before creating
`external_discovery_candidates` with source `tcgcsv`. The original source payload,
warehouse metadata, upstream IDs, source hashes and frozen plan are retained.
`processed` means intake classification completed, not canonical promotion.

Eligibility requires the coverage classifier's `untracked_card_candidate`, an
active category 3/85 source, matching upstream product ID, one parseable Number,
HTTPS source/image references and a preserved source payload/hash. Missing or
ambiguous evidence remains an explicit hold. Existing relationships, identity
hints, discovery and warehouse candidates remain in their existing review paths.
The full inventory denominator (63,564 products on October 1) is never replaced
by an eligible-only count.

Intake asserts no canonical set, parent or finish. Every new row is
`AMBIGUOUS / PRINTED_IDENTITY_REVIEW`. A retailer in a provider title establishes
distribution context only; it does not establish a printed stamp. Japanese
language remains distinct. All seven outstanding GameStop relationships still
need canonical review; Ho-Oh can now enter discovery with intact provenance.

The CLI defaults to plan mode. Apply requires an exact fingerprint authorization,
the clean committed qualified producer, SERIALIZABLE transactions and a shared
advisory lock. Each batch rechecks preserved source content and concurrent
relationships, inserts raw and discovery atomically, then verifies exact payloads.
Deterministic candidate IDs support exact zero-write replay of successful intake;
conflicting/resolved rows or orphan ingress stop for reconciliation. There are no
automatic retries. An unknown commit requires independent readback. Immutable
pending, commit and verification receipts are stored outside the repository.

Only raw, discovery and operational `ingestion_jobs` tables are written. The job
ledger records run ID, exact plan, producer, authorization, atomic batch progress
and terminal success or failure with error code/detail. If the database becomes
unavailable, immutable local failure receipts remain and completion stays blocked
until the database receipt is reconciled. No canonical, warehouse-promotion,
mapping, pricing, schema or public search writes are present. Existing JustTCG
bridge loaders do not consume TCGCSV rows; a reviewed source-aware bridge and
physical identity/finish evidence are still required before promotion. This
worker is operator-invoked; the six-hour coverage audit remains read-only.

Validation includes pure contract tests and a fresh isolated PostgreSQL fixture
for rollback, commit, repeated intake, atomic failure, evidence drift and new
relationships. That fixture proves SQL behavior, not full production schema
replay. Production execution requires independent committed-state readback and
fresh full-inventory coverage. Queued discovery does not prove completeness.
