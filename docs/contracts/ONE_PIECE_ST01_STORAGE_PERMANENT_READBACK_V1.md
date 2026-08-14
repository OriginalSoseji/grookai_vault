# One Piece ST-01 Permanent Storage Readback V1

## Purpose

Independently verify the 18 durable ST-01 card/DON objects after the permanent
Storage writer succeeds. The verifier does not reuse the writer's in-memory
readbacks as its proof.

## Evidence Binding

The verifier binds to the exact committed apply-result file SHA-256 and its
internal proof hash. It also loads the frozen permanent plan and checks that the
execution reports exactly 18 durable objects.

## Allowed Operations

- Write the local audit run plan before external access.
- List each exact target path.
- Download each exact target object.
- Reconcile SHA-256, byte size, dimensions, and format.
- Write local audit artifacts.

## Forbidden Operations

- Storage upload, overwrite, move, copy, or remove.
- Database connection or query.
- Image-pointer or canonical mutation.
- Sealed-product access.
- Pricing, publication, or Vault mutation.

The gate passes only when all 18 objects exist exactly once and every downloaded
byte stream matches the frozen plan.
