# MTG Sealed Durable Image Storage Executor V1

**Status:** Implementation contract; execution not yet authorized

**Date:** 2026-09-04

## Purpose

Define the only operator permitted to turn the frozen 2,141-object MTG sealed
image plan into durable self-hosted Storage objects. The operator is resumable,
content-addressed, collision-safe, and forbidden from accessing the database.

This contract and its implementation grant no live authority. Plan mode must
load only committed repository artifacts and create local audit files.

## Exact Source

- Durable plan fingerprint:
  `92c9189e0c42adba6f274ad283a3f0a5af5e0324ff1ce4b506368f8d0f3010bc`
- Exact objects: `2,141`
- Supporting variants: `2,149`
- Preserved exclusions: `33`
- Expected durable bytes: `157,335,339`
- Object shards: `22`, maximum `100` objects each

The executor must verify the SHA-256 and byte count of every durable-plan
artifact before constructing an execution fingerprint.

## Execution Authority

Live apply and resume require all of the following:

- an exact clean execution commit supplied by
  `--expected-head-sha=<40-character SHA>`;
- an exact execution fingerprint supplied by
  `--expected-execution-fingerprint=<SHA-256>`;
- the exact full approval message in
  `MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL`;
- the preserved durable-plan fingerprint and artifact hashes;
- canonical production Supabase project credentials;
- Node started with `--use-system-ca`;
- certificate verification enabled and no custom CA overrides.

Plan mode loads no credentials and performs no source, Storage, or database
operation.

## Per-Object State Machine

1. Record object processing start.
2. Check the content-addressed path.
3. If present, download and verify exact bytes and image properties.
4. Reuse only an exact existing object; hard-stop on any mismatch.
5. If absent, retrieve only the frozen primary source URL with at most two
   transport retries across all resumes.
6. Verify source SHA-256, byte count, dimensions, format, content type, and
   non-placeholder status.
7. Check the Storage path again immediately before upload.
8. Record write-ahead upload intent.
9. Upload with `upsert=false` and no overwrite.
10. Download and verify the new object exactly.
11. Record one terminal object result and retain the verified object.

If an upload response is ambiguous, the object may be adopted only after an
exact readback. If a confirmed new upload fails readback, remove only that
current-attempt object and prove it absent. Existing, concurrent, and
previously verified objects are never removed.

## Resume And Interruption

- The run plan and every journal row carry the exact execution fingerprint.
- Journal sequence must be continuous.
- Journal object paths must belong to the frozen 2,141-object plan.
- Source request attempts are counted per object and globally across resumes.
- An object with three recorded source starts cannot be fetched again under
  the same authority.
- Resume reprocesses the frozen plan and exact-readback reuses verified
  objects. No journal claim substitutes for current Storage evidence.
- Completed objects remain durable through interruption.
- A failure stops later shards and stops new work as soon as the failure is
  known; already in-flight work may finish safely.

## Bounds

- Maximum concurrency: `10`.
- Maximum shard size: `100`.
- Source attempts per object: `3` total, including first request.
- Global source request ceiling: `6,423` across resumes.
- Maximum source body: `20,000,000` bytes.
- Uploads: at most `2,141`, always `upsert=false`.
- Source redirects: forbidden.
- Custom CA overrides: forbidden.

## Required Evidence

The live operator must preserve:

- exact run plan;
- append-only execution journal;
- one terminal result file per attempted object;
- compressed ordered object-result export;
- counters and reconciliation summary;
- TLS runtime evidence;
- report and SHA-256 artifact manifest.

A successful run requires all 2,141 objects and all 2,149 variant
relationships to reconcile in the current execution or resume pass with zero
mismatches.

## Forbidden Boundaries

The executor cannot perform database connections, database reads or writes,
image-evidence writes, image-release writes, pointer updates, pricing writes,
release-pointer changes, visibility changes, Vault writes, signer deployment,
client activation, or cross-game mutation.

## Exact Next Gate

Run syntax, targeted contract, complete repository contract, web, Flutter, and
secret-packaging checks. Freeze the clean execution commit and execution
fingerprint in a zero-call audit. Stop before live source or Storage access and
request separate exact authority.
