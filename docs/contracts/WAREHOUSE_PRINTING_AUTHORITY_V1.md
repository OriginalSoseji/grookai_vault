# Warehouse Printing Authority V1

Date: 2026-09-17
Status: Local runtime candidate; isolated lifecycle verified, release verification pending.

## Purpose

Warehouse staging and execution must use the same reviewed Master Index
projection. A founder-approved candidate, resolved finish, or existing child UUID
alone does not prove a physical printing. This package transports the actual
reviewed evidence through JSON without turning hashes into independent authority.

`backend/warehouse/printing_authority_v1.mjs` freezes and validates:

- One exact candidate UUID, parent UUID, finish and printing GV-ID.
- The existing `MASTER_INDEX_PRINTING_AUTHORITY_V1` manifest.
- Canonical base64 bytes for its Master Index, sources and projection-bound review.
- A deterministic fingerprint of the whole package.
- All reviewed parent fields plus game, language and set code against a supplied
  live parent projection. Absent values are not silently normalized to null.

The package does not infer a finish, mint a new identity convention, authorize
execution, prove the database is current, or replace production write approval.
It does not fetch a URL supplied by evidence. Missing, changed, duplicate or
unbound artifact bytes fail validation. The existing Master Index validator
remains responsible for reviewed scope, protected facts and suppressed finishes.

## Runtime Candidate

Staging accepts `--printing-authority=<json-file>` only with the package's exact
`--candidate-id`. It freezes the authority and a hash of the live preflight in
the existing write plan. Changed authority/preflight changes payload comparability.
The current warehouse remains English Pokemon only; this does not expand it to
other games. Language is derived only from explicit canonical identity domains;
the legacy generic `pokemon` domain requires adjudication rather than an English
default. Canonical parent, set and game must agree.

Execution rechecks the frozen preflight, then uses a serializable transaction
and parent/child row locks. A new printing inserts raw source bytes first, then
the exact child/GV-ID and its bound verified review. It does not update existing
printings, images, reviews or provenance. Such repairs use a separate bounded
repair plan. Unreviewed or conflicting existing children cannot become a no-op.

Before commit and on independent post-commit readback, exact receipts, public
options, existing rows and five scoped dependency digests are verified. Readback
compares against the frozen preflight, including when a stage already says
SUCCEEDED. An uncertain commit or rollback stops the batch for reconciliation;
it does not mark the stage retryable. A matching repeat writes no printing data.
Both worker APIs now require explicit boolean `apply: true` for writes.
Job claim, staging and execution uncertainties stop processing for reconciliation.
An unavailable failure ledger also stops processing. The CLI returns nonzero for
blocked/failed work or reconciliation-required results so supervisors cannot
mistake a logged failure for a successful process.

The package and ordinary candidate approval do not replace the production
release/apply contract. No production execution is authorized by this document.

## Required Release Completion

The workers now call the validator, but this remains uncommitted local code.
Do not mark the production warehouse bypass closed before release evidence.

1. Isolated PostgreSQL now proves staging, job claim, event recording, new child
   admission, retained-child no-op, two competing workers on one stage, and
   independent readback after lost staging/execution commit responses.
2. Alias and all six image mutation paths pass serializable rollback regression
   checks. The change fixes undefined `payload_snapshot` variables in staging
   and execution, plus a stage proof that captured its ID before insertion.
3. Review current callers and queue compatibility. Legacy queues without authority
   fail closed; do not fabricate a review to grandfather them.
4. Finish the normal shipcheck, peer/code review, frozen commit and deployment.
5. Check live read-only behavior before any separately authorized production apply.

The PostgreSQL rehearsals use synthetic evidence in an isolated local database.
They do not prove production privileges or all production queue combinations.
A single admitted printing never proves complete set coverage or collector
readiness. Full-catalog reconciliation and Vault/client smoke remain independent
requirements.

No schema change or production write is authorized by this contract.
