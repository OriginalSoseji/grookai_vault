# Pricing Checkpoint 114: MTG Sealed Durable Image Plan Frozen

## Context

Checkpoint 113 proved the complete transient source retrieval and Storage path
for 17 exact MTG sealed images. The next gate was planning only: reconcile the
entire preserved image-coverage corpus into a collision-safe, resumable durable
Storage plan without contacting source hosts, Storage, or the database.

## Problem

The preserved coverage summary reported 2,144 unique valid image byte hashes
and the earlier roadmap treated all 2,144 as eligible durable objects. A fresh
object-level partition proved that this count included three image signatures
classified as excluded placeholders.

The exact corpus is:

- 2,182 release members;
- 2,149 image-eligible variants;
- 33 explicit exclusions, including three placeholders;
- eight shared-byte deduplications among eligible variants;
- 2,141 unique eligible durable objects.

## Risk

Using the earlier 2,144 count as an upload quota would have made three known
placeholder images durable and mislabeled them as exact product evidence. A
whole-run rollback model would also make a recoverable transport interruption
discard up to 2,141 already verified objects and force unnecessary refetching.

## Decision

Freeze a 2,141-object, 2,149-variant durable plan with 33 preserved exclusions.
The immutable source audit is not rewritten. Its accounting discrepancy is
recorded explicitly in the new plan and corrected in future coverage code.

Durable execution will use per-object commit semantics:

- content-addressed, game-scoped paths;
- exact collision readback before upload;
- exact existing objects are reused;
- mismatched existing objects hard-stop and are never overwritten or removed;
- absent objects use `upsert=false`;
- a new object becomes durable only after exact readback;
- verified objects remain across interruption and support exact-plan resume;
- only an unverified current-attempt object may be removed during recovery;
- database evidence and pointers remain blocked until whole-plan
  reconciliation succeeds.

## Alternatives Rejected

- Uploading all 2,144 valid signatures, because three are excluded
  placeholders.
- Treating 2,149 variants as 2,149 Storage objects, because shared exact bytes
  should deduplicate without merging product identity.
- Overwriting a mismatched content-addressed path, because that would destroy
  collision evidence.
- Deleting every newly created object after any interruption, because verified
  content-addressed objects are safe durable progress.
- Writing image evidence before Storage completion, because database truth
  must follow exact byte readback.

## Frozen Plan

- Producer commit: `f87cd704a153cc523e21be0f6dabdd61cdf73d05`
- Source release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Source coverage fingerprint:
  `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`
- Durable plan fingerprint:
  `92c9189e0c42adba6f274ad283a3f0a5af5e0324ff1ce4b506368f8d0f3010bc`
- Exact eligible objects: `2,141`
- Exact supporting variants: `2,149`
- Explicit exclusions: `33`
- Expected durable bytes: `157,335,339`
- Shards: `22`, maximum `100` objects each
- Maximum concurrency: `10`
- Source retries: `2` per object
- Maximum source request attempts: `6,423`
- Maximum source bytes: `20,000,000` per object
- Upload behavior: `upsert=false`, no overwrite

## Verification

- Targeted durable-plan and coverage contracts: passed.
- Preserved production coverage replay: 2,141/2,149/33 exact reconciliation.
- Full repository contract suite: 2,904/2,904 passed.
- Repository pre-commit shipcheck: passed, including runtime preflight,
  contracts, web typecheck/lint/build, Flutter analyze, and Flutter tests.
- Release secret packaging guard: passed.
- Plan validation findings: zero.
- Source artifact validation findings: zero.
- Network/provider calls: zero.
- Database connections, reads, and writes: zero.
- Storage reads, writes, and deletes: zero.

## Permanent Evidence

`docs/audits/pricing/mtg_sealed_durable_image_plan_v1/2026-09-04T22-07-02Z_offline/`

Important artifact SHA-256 values:

- `run_plan.json`:
  `83cf57edfc363de8ad388590d0d9f82303430d81013ad8235c96e94afefdeff9`
- `objects.jsonl.gz`:
  `8a429cc11e3d284371ed17f3ffedf4dfa627f5672500d0912caaac2cae44c367`
- `exclusions.jsonl`:
  `fc32954ab64798359be18c19b109b69455007cb2e391a49819c81537787018ba`
- `shards.json`:
  `5538981c2cd3fa65be3346490a4e42b6dd95d805759399a68a4377cb4858374d`

## Current Truths

- The transient image path is proven.
- The complete durable object plan is now exact and zero-write validated.
- No durable MTG sealed image was created by this gate.
- The six production image tables remain empty from the preceding readback.
- The trusted signer remains undeployed.
- MTG sealed visibility remains hidden.
- The 33 source gaps remain excluded rather than receiving representative or
  placeholder art.

## Invariants

- Placeholder bytes can never count as eligible durable objects.
- Every eligible variant must map to exactly one exact content object.
- Shared bytes deduplicate Storage only, never canonical product identity.
- Resume requires the exact frozen source and durable-plan fingerprints.
- Existing mismatched objects cannot be overwritten or removed.
- Recovery cannot delete pre-existing or previously verified durable objects.
- Database image evidence cannot precede complete Storage reconciliation.
- Signer, pricing, release-pointer, visibility, Vault, client, and cross-game
  writes remain unauthorized.

## What Must Never Be Broken

Do not turn object count into an upload quota independent of eligibility. Do
not make Storage presence alone authoritative image evidence. Do not let a
retry, resume, or cleanup path widen deletion ownership beyond an unverified
object created by that exact attempt.

## Exact Next Gate

Implement and freeze the resumable durable Storage executor against plan
fingerprint
`92c9189e0c42adba6f274ad283a3f0a5af5e0324ff1ce4b506368f8d0f3010bc`.
Run contract tests and offline interruption/recovery simulations, compute the
exact execution commit and execution fingerprint, and then request separate
bounded authority. Do not contact source hosts or Storage during executor
preparation.
