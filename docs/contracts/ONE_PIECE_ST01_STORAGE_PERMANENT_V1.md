# One Piece ST-01 Permanent Storage V1

## Purpose

Define the separately guarded permanent upload boundary for the exact 18 One
Piece ST-01 card/DON images proven ready by checkpoints 63 and 64.

## Frozen Scope

- Exactly 18 card/DON objects from the checkpoint 64 collision preflight.
- Target project: `ycdxbpibncqcchqiihfz`.
- Target bucket: `user-card-images`.
- Exact source hashes, sizes, formats, dimensions, and target paths are frozen.
- Three sealed products are excluded.

## Plan Boundary

The plan generator is offline. It verifies committed preflight artifacts,
revalidates all local source bytes, hashes the complete writer code bundle, and
produces an approval fingerprint plus Storage plan hash. It cannot access
Supabase Storage or the database.

## Apply Boundary

The apply runner is inert unless all three inputs are present:

1. `--apply`
2. the exact approval fingerprint
3. the exact Storage plan hash

Before the first Storage request, all 18 local source objects must pass exact
hash, byte-size, dimension, and format verification. The runner then performs a
fresh collision check across all 18 targets and stops before uploading if any
target exists.

Every upload uses `upsert: false`. Each object is immediately downloaded and
reconciled against the frozen evidence. A successful execution retains all 18
objects.

## Failure Atomicity

Any upload or readback failure triggers removal of only the objects created by
that execution. Every removed path must then be verified absent. Existing
objects are never overwritten or removed.

## Closed Boundaries

This contract does not authorize:

- database connections or writes;
- image-pointer updates;
- canonical identity mutations;
- sealed-product uploads;
- pricing or publication writes;
- Vault writes;
- cleanup, deletion, or replacement of pre-existing objects.

Permanent upload execution remains a distinct durable mutation gate after the
offline plan has been frozen and reviewed.
