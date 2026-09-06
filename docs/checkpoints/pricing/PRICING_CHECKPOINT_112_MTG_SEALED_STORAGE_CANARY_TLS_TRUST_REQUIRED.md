# Pricing Checkpoint 112: MTG Sealed Storage Canary Requires System CA Trust

## Context

Checkpoint 111 preserved the first generic source transport failure and the
bounded retry repair. A new exact authority executed that repair against the
same 17 frozen images and paths.

## Result

All three permitted attempts for the first source image failed with
`unable_to_verify_leaf_signature`. The executor performed no upload and again
proved every transient path absent.

- Source attempts: `3`
- Completed source images: `0`
- Uploads/readbacks/removals: `0/0/0`
- Ownership activation: `false`
- Final absent paths: `17/17`
- Durable objects after run: `0`
- Database and signer operations: `0`

## Decision

Do not disable certificate verification, add an unpinned custom certificate,
change source URLs, or reuse the consumed authority.

Require the supported Node `--use-system-ca` runtime so source HTTPS validation
uses both the bundled trust set and the Windows system trust set. Fail closed if
certificate verification is disabled, if custom CA environment inputs exist,
or if either trust set is unavailable. Bind this policy into the next execution
plan and authority.

## Permanent Evidence

`docs/audits/pricing/mtg_sealed_image_storage_canary_v1/2026-09-04T21-17-23Z_failed_tls_trust/`

## Current Truths

- Both failed canary executions stopped before upload.
- All 17 transient paths remain absent.
- The image schema remains empty and the signer remains undeployed.
- MTG sealed visibility remains hidden.
- The second execution authority is consumed.
- Secure system-CA enablement requires a new commit, fingerprint, and exact
  authority.

## Exact Next Gate

Test and freeze the bundled-plus-system-CA operator, generate a new 17-object
plan from its clean execution commit, and obtain one new fingerprint-bound
transient Storage authority. Do not perform an ungoverned source probe or reuse
either prior authority.
