# Pricing Checkpoint 113: MTG Sealed Storage Canary Passed

## Context

Two earlier executions stopped safely before upload while isolating source
transport and TLS trust requirements. Checkpoint 112 required Node's bundled
and Windows system CA stores with certificate verification enabled. A third
exact authority was issued for that frozen operator and the same 17 images.

## Decision

Execute the transient canary once from commit
`5f8ba57a8c502d1bd73b52fd6af2a254eb024aba`, using execution fingerprint
`9983c18b0b9dbe69684eb4ac67450b6fc1ec4f0bf692586d6a740eb6d84ecf21`.
The authority allowed only the exact source retrieval, transient upload,
readback, removal, and final-absence proof.

## Result

The complete transient path passed with zero reconciliation mismatches.

- Selected variants/objects: `17/17`
- Source request attempts/completed images: `17/17`
- Initial/immediate collision checks: `17/17`
- Uploads/downloads/verified readbacks: `17/17/17`
- Unique object paths/content hashes: `17/17`
- Total verified bytes: `1,185,749`
- Cleanup discovery/removal/final absence: `17/17/17`
- Durable objects after completion: `0`
- Errors: `0`

The TLS runtime used 150 Node bundled certificates plus 182 Windows system
certificates. Certificate verification remained required.

## Protected Boundaries

The run performed zero database reads or writes, durable image writes, image
evidence or release writes, pricing writes, pointer writes, visibility changes,
Vault writes, signer deployments, client activations, or cross-game writes.

## Permanent Evidence

`docs/audits/pricing/mtg_sealed_image_storage_canary_v1/2026-09-04T21-43-14Z_passed/`

## Current Truths

- Production can securely retrieve exact TCGPlayer MTG sealed images.
- Production can upload with collision safety and `upsert=false`.
- Storage readback preserves exact image bytes and metadata.
- Execution-owned objects can be removed and proved absent.
- No transient canary object remains.
- The durable image tables remain empty.
- The trusted signer remains undeployed.
- MTG sealed visibility remains hidden.

## Invariants

- Transient proof does not authorize durable image ingestion.
- A durable object may be created only from the same exact audited source and
  content-addressed path contract.
- Existing objects must never be overwritten.
- Partial durable execution must remove only objects newly created by that
  execution unless durable resume semantics are separately frozen.
- Database image evidence must follow exact Storage readback, not precede it.
- Signer, pricing, visibility, and clients remain later serial gates.

## Exact Next Gate

Prepare a zero-write durable Storage plan for all exact eligible image objects
covering 2,149 eligible variants and preserving 33 explicit exclusions. The
durable reconciliation must separate valid-but-excluded placeholder bytes from
eligible objects; its corrected count supersedes the earlier 2,144 estimate.
The plan must define exact collision behavior, source-request ceilings,
content-addressed paths, resumability, interruption recovery, rollback scope,
readback reconciliation, and a separate execution authority. Do not upload
durable objects or write image evidence during plan preparation.
