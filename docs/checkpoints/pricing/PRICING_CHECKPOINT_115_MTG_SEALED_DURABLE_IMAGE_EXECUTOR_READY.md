# Pricing Checkpoint 115: MTG Sealed Durable Image Executor Ready

## Context

Checkpoint 114 froze the corrected durable image plan for 2,141 exact MTG
sealed image objects supporting 2,149 variants while preserving 33 explicit
exclusions. The next gate was implementation and offline proof of the durable
Storage executor. It was not authority to contact source hosts or Storage.

## Problem

The transient 17-object canary proved the transport and Storage path, but it
did not provide safe semantics for a 2,141-object run that may be interrupted.
A durable execution must preserve verified progress, reject collisions, bound
retries across resumes, and prevent cleanup from deleting pre-existing or
previously verified objects.

## Risk

An ordinary batch uploader could overwrite an existing content-addressed path,
repeat source requests without a cumulative ceiling, lose completed work after
an interruption, or delete an object it did not create. Any of those behaviors
would weaken the exact-image evidence boundary or make the operation unsafe to
resume.

## Decision

Implement a separately authorized, resumable executor with per-object durable
commit semantics and a write-ahead journal.

The executor:

- binds every run to the exact clean execution commit, source coverage
  fingerprint, durable-plan fingerprint, and execution fingerprint;
- processes 22 frozen shards sequentially with no more than 10 active object
  workers inside a shard;
- checks Storage before source retrieval and again immediately before upload;
- reuses an existing object only after exact readback verification;
- hard-stops on a mismatched existing object without overwrite or deletion;
- uploads absent objects with `upsert=false`;
- treats an object as durable only after exact readback;
- preserves verified objects across interruptions and resumes;
- enforces at most two transport retries per object and 6,423 cumulative source
  requests across all attempts;
- removes only an unverified object proven created by the current attempt;
- requires whole-plan reconciliation before any later database image evidence
  or pointer gate.

## Alternatives Rejected

- A whole-run rollback, because it would discard verified content-addressed
  progress and force unnecessary source refetching.
- Blindly treating Storage presence as success, because the bytes and image
  properties must match the frozen object.
- Uploading with overwrite enabled, because a collision is evidence that must
  stop execution rather than be destroyed.
- Resetting retry counts on resume, because that would make the approved source
  request ceiling ineffective.
- Writing database evidence during upload, because Storage completion and
  database publication remain separate gates.

## Frozen Executor

- Execution commit:
  `406e78816c19ae9974b62ad2df596edc65ec3669`
- Source release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Source coverage fingerprint:
  `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`
- Durable plan fingerprint:
  `92c9189e0c42adba6f274ad283a3f0a5af5e0324ff1ce4b506368f8d0f3010bc`
- Execution fingerprint:
  `ce99331a559a62d78a2ef2fffa389d30498df16928f4de9d7e1d58cec8ff426e`
- Exact eligible objects: `2,141`
- Exact supporting variants: `2,149`
- Explicit exclusions: `33`
- Expected durable bytes: `157,335,339`
- Shards: `22`, maximum `100` objects each
- Maximum concurrency: `10`
- Source retries: `2` per object
- Maximum cumulative source requests: `6,423`
- Target bucket: `user-card-images`
- Upload behavior: `upsert=false`, no overwrite

## Verification

- Core and guarded operator syntax checks: passed.
- Executor contract suite: 14/14 passed.
- Real preserved corpus replay: 2,141 objects / 2,149 variants / 33
  exclusions reconciled exactly.
- Interruption and exact-existing-object resume simulations: passed.
- Existing collision and current-attempt cleanup ownership tests: passed.
- Cumulative retry ceiling across resumes: passed.
- Ambiguous upload adoption only after exact readback: passed.
- Repository pre-commit shipcheck for the implementation commit: passed.
- `git diff --check`: passed.
- Frozen audit artifact hashes independently verified: 3/3 matched.
- Source HTTP requests: zero.
- Storage reads, writes, and deletes: zero.
- Database connections, reads, and writes: zero.

## Permanent Evidence

`docs/audits/pricing/mtg_sealed_durable_image_storage_v1/2026-09-04T22-40-45Z_ready_not_executed/`

Artifact SHA-256 values:

- `execution_plan.json`:
  `11481f5044f2cc43d1342b3c40244f17fe9ff9de0eea44e32a2ad5b670361aad`
- `summary.json`:
  `5aa00b1d91c4860a1fb814a114fd61daf8f7ee41ef478bd3edf1d24b1de9d190`
- `REPORT.md`:
  `4064f7368b8341ab9f780c68bb786bf42050fc202acc4963210201198dcecabf`

## Current Truths

- The complete resumable executor is implemented and offline-proven.
- The exact live execution scope and authority text are frozen.
- No durable MTG sealed image was created by this gate.
- The 33 exclusions remain excluded.
- No image evidence or pointer has been written to the database.
- The trusted signer remains undeployed.
- MTG sealed visibility remains hidden.

## Invariants

- A resume must use the exact frozen execution fingerprint and journal chain.
- An existing mismatched object can never be overwritten or removed.
- A verified object remains durable progress through interruption.
- Retry counts are cumulative across resumes.
- Cleanup ownership never extends beyond an unverified object created by the
  current attempt.
- Storage success does not authorize database image evidence or pointers.
- All 2,141 objects and 2,149 variants must reconcile before the next gate.

## What Must Never Be Broken

Do not widen live authority from Storage objects into database, pointer,
pricing, visibility, Vault, signer, client, or cross-game writes. Do not use a
different commit, source corpus, durable plan, or execution fingerprint under
this authority. Do not convert interruption recovery into broad cleanup.

## Exact Next Gate

Obtain the exact separately bounded approval recorded in
`execution_plan.json`, then run the resumable durable Storage executor from
commit `406e78816c19ae9974b62ad2df596edc65ec3669`. Require complete exact
readback and reconciliation for 2,141 objects supporting 2,149 variants. Stop
without database writes. Database image evidence and pointer publication remain
a later, separately planned and authorized gate.
