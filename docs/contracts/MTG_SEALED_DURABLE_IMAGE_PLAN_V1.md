# MTG Sealed Durable Image Plan V1

**Status:** Implementation contract; zero-write planning gate

**Date:** 2026-09-04

## Purpose

Freeze the complete, resumable Storage plan for exact MTG sealed package
images. This contract authorizes no network call, Storage operation, database
access, signer deployment, image evidence, pointer update, pricing mutation,
visibility change, Vault write, client change, or cross-game mutation.

## Corrected Source Accounting

The preserved coverage bundle contains `2,182` release members:

- `2,149` exact image-eligible variants;
- `33` explicit exclusions, including `3` placeholder images;
- `2,141` unique eligible content hashes after eight shared-byte
  deduplications.

The earlier `2,144` unique-image summary counted every valid image signature,
including the three excluded placeholders. Placeholder bytes are not eligible
for durable upload. The immutable source audit remains preserved; this plan
records the accounting correction rather than altering historical evidence.

## Frozen Durable Scope

- Storage bucket: `user-card-images`.
- Object paths:
  `sealed/mtg/sha256/<sha-prefix>/<content-sha256>.<extension>`.
- Exact unique objects: `2,141`.
- Exact supporting variants: `2,149`.
- Explicit exclusions: `33`.
- Object shards: maximum `100` objects each.
- Maximum concurrency for a future executor: `10`.
- Source transport retries: at most `2` per object.
- Total source request ceiling: `6,423` attempts.
- Maximum response bytes: `20,000,000` per object.
- TLS: Node bundled plus Windows system CA trust, with certificate
  verification required.
- Redirects and custom CA overrides are forbidden.

## Collision Policy

Every target path is read before source retrieval or upload.

- An absent object may be uploaded with `upsert=false`.
- A pre-existing object is reusable only after exact SHA-256, byte count,
  dimensions, format, and content-type readback.
- A mismatched existing object is a hard stop. It is never overwritten or
  deleted by this workflow.
- A newly uploaded object becomes durable only after exact readback.

## Resume And Recovery

The durable commit unit is one content-addressed object after exact readback.
Each object requires a write-ahead journal event and a terminal state.

- A restart must use the same source and durable-plan fingerprints.
- Already present exact objects are verified and reused.
- Verified objects remain after interruption and are not downloaded again
  merely to recreate progress.
- A current-attempt object that fails exact readback is removed and verified
  absent.
- Rollback ownership is limited to an unverified object proven absent before
  the current attempt and created by that attempt.
- Pre-existing objects and previously verified durable objects are never
  removed by failure recovery.
- No image evidence or pointer row may be planned until all `2,141` objects and
  `2,149` variant relationships reconcile with zero mismatches.

## Artifacts

The planning operator writes:

- `run_plan.json`;
- `objects.jsonl.gz`;
- `exclusions.jsonl`;
- `shards.json`;
- `summary.json`;
- `REPORT.md`;
- `artifact_hashes.json`.

Raw source URLs and exact variant relationships remain in the private audit
artifacts. The plan fingerprint is derived from logical content, independent
of timestamps.

## Invariants

- Only exact, non-placeholder images enter the object plan.
- Every eligible variant appears exactly once under one object.
- Every excluded variant appears exactly once in the exclusion artifact.
- Shared bytes deduplicate Storage only; they do not merge product identity.
- Existing objects cannot be overwritten.
- The plan is inert and grants no execution authority.
- Durable Storage execution requires a separately frozen executor commit,
  execution fingerprint, exact plan fingerprint, and explicit authority.
- Database image evidence remains a later transaction after complete Storage
  readback.

## Exact Next Gate

Implement and freeze the resumable durable Storage executor against this exact
plan. Run contract and offline recovery tests, compute an execution
fingerprint, and request separate bounded authority. Do not contact source
hosts or Storage while preparing the executor.
