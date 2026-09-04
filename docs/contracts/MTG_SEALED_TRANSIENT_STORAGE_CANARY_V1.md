# MTG Sealed Transient Storage Canary V1

**Status:** Secure system-CA repair implemented; two attempts failed safely with zero uploads

**Date:** 2026-09-04

## Purpose

Prove that Grookai can retrieve, self-host, read back, and remove a small,
representative MTG sealed image set without creating durable image state or
crossing into database, signing, pricing, visibility, Vault, or client work.

This is the first Storage operation after the sealed image schema was applied.
It is deliberately transient and separately authorized.

## Frozen Input

- Source price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Source coverage fingerprint:
  `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`
- Source canary-plan fingerprint:
  `37054e8a5e66e7f7aeb5d04e3b4d476deb0809a6019297c19e1cb9cc7c9e8a7d`
- Selected variants: `17`
- Unique selected image objects: `17`
- Storage bucket: `user-card-images`
- Prefix: `sealed/mtg/canary/`

The source plan covers booster boxes, bundles, cases, collections, decks, deck
displays, displays, kits, packs, promo packs, sleeved packs, and tins. Every
source URL is the frozen high-resolution TCGPlayer CDN URL recorded by the
offline coverage audit.

## Execution Contract

The operator must:

1. run from the exact clean commit named by the authority;
2. rebuild and validate the same 17-row execution plan;
3. match the exact execution fingerprint and approval text;
4. verify all 17 transient paths are absent;
5. retrieve and byte-verify all 17 source images without redirects, allowing no
   more than two transport retries per URL and 51 total request attempts;
6. repeat the complete collision check immediately before upload;
7. write the ownership activation event before the first upload;
8. upload with `upsert=false`;
9. download and byte-verify every uploaded object;
10. remove only execution-owned transient paths; and
11. verify all 17 paths are absent at completion.

The run fails closed on source drift, byte drift, path collision, upload or
readback error, cleanup error, project mismatch, repository drift, or authority
mismatch.

## First Execution Result

The first authorized execution from commit `c7c12e457fdc4a4791112c392c93026a53e7bcf9`
stopped on the first source request with a generic transport failure. It
performed `17` initial collision checks, fetched `0` complete images, uploaded
`0` objects, activated no ownership scope, and performed `17` final absence
checks. All paths were absent and no recovery was required.

That execution authority is consumed and must not be reused. Its exact artifacts
are preserved under
`docs/audits/pricing/mtg_sealed_image_storage_canary_v1/2026-09-04T21-06-46Z_failed_source_transport/`.

The repair adds bounded transport retries and records a stable error code,
attempt number, object path, and retryability decision for every failed source
request. It does not widen any Storage or data boundary.

## Second Execution Result

The bounded-retry execution from commit
`a184eabe02b1924ebd759407113a5dda427dc2a0` made all three permitted attempts
for the first frozen source image. Each failed with
`unable_to_verify_leaf_signature`. It completed `0` source images, uploaded `0`
objects, activated no ownership scope, and again verified all `17` paths absent.

Its authority is also consumed. The exact evidence is preserved under
`docs/audits/pricing/mtg_sealed_image_storage_canary_v1/2026-09-04T21-17-23Z_failed_tls_trust/`.

Node `v22.19.0` supports the secure `--use-system-ca` option. The next repair
requires both the Node bundled and Windows system CA stores while continuing to
require certificate verification. Disabled verification and unfrozen custom CA
inputs fail closed. The trust policy is part of the execution fingerprint.

## Interruption Recovery

The operator provides a recovery-only mode for hard process or machine
interruptions. Recovery is permitted only when the frozen `run_plan.json` and
write-ahead journal prove:

- the same execution commit and fingerprint;
- all 17 paths were absent in both collision sweeps;
- all 17 source images passed byte verification; and
- the exact ownership scope was activated before any upload.

Recovery can inspect and remove only the 17 frozen transient paths, then prove
their absence. It cannot fetch source images, upload objects, access the
database, deploy the signer, or mutate any other resource. It is idempotent.

## Forbidden Boundaries

This contract authorizes zero:

- database connections, reads, or writes;
- durable Storage objects;
- durable image evidence, assertions, releases, members, or pointers;
- pricing or price-release writes;
- catalog or sealed visibility changes;
- Vault or canonical catalog writes;
- signer deployments or signing calls;
- client activation; or
- cross-game writes.

The bucket configuration and all non-canary objects must remain unchanged.

## Required Artifacts

Plan mode writes:

- `run_plan.json`
- `REPORT.md`
- `artifact_hashes.json`

An authorized execution additionally writes:

- `execution_journal.jsonl`
- `summary.json`
- final `REPORT.md`
- final `artifact_hashes.json`

Recovery, if needed, adds `recovery_summary.json` and `RECOVERY_REPORT.md`.
Secrets must never appear in artifacts.

## Acceptance Criteria

- exactly `17` source images fetched and byte-verified;
- no more than `51` source request attempts;
- exactly `17` transient objects uploaded with `upsert=false`;
- exactly `17` objects downloaded and matched to expected bytes;
- exactly `17` execution-owned paths removed;
- all `17` paths independently verified absent;
- zero durable objects remain;
- zero forbidden-boundary operations occur; and
- artifact hashes reconcile.

## Exact Next Gate

Generate the execution plan from an exact clean commit, record its fingerprint,
and obtain the exact separately bound Storage authority. Then execute once and
stop after cleanup/readback evidence. Durable image upload remains a later,
separately planned and authorized gate.
