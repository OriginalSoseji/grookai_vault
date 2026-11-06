# Pokemon 30th Classic source-alias reconciliation V1

Date: 2026-10-29
Status: read-only owner repair candidate

## Finding

Universal discovery reported TCGdex English set `30th-c` as a missing 30-card
set. Production inspection proved that the same collection already exists as
canonical set `30c-classic` (`30th Celebration Classic Collection`) with exactly
30 parent rows.

This was an owner-alias gap, not a catalog-content gap. TCGdex exposes the
collection as `30th-c` and numbers its gallery entries `001` through `030`.
Grookai correctly models the collection as a `reprint_anthology` and preserves
the historic printed identity on every parent, such as Charizard `4/102`, Misty
`18/132`, and Arceus VSTAR `123/172`.

## Decision

Register `30th-c` as a source alias owned by `30c-classic`. Discovery must
reconcile the 30-source-card shell to the existing 30-card canonical owner and
emit `no_write_existing_canonical_owner`.

No set, card, identity, printing, mapping, pricing, image, publication, Vault,
update, or delete write is authorized by this repair.

## Production evidence

- project: `ycdxbpibncqcchqiihfz`;
- environment gate: `172,414` card prints, `3,410` sets, `32,903` traits;
- canonical owner: `30c-classic`;
- canonical identity model: `reprint_anthology`;
- canonical parent count: `30`;
- TCGdex source set: `30th-c`;
- observed TCGdex identity count: `30`;
- source release date: `2026-09-16`;
- production writes during diagnosis: `0`.

## Required proof

- contract tests prove the alias resolves to `30c-classic`;
- reconciliation reports `exact_complete` at `30/30`;
- Master Index routing reports `alias_or_subset_owner_resolved`;
- promotion routing emits no canonical write candidate;
- a fresh discovery run after merge no longer reports `30th-c` as actionable.
