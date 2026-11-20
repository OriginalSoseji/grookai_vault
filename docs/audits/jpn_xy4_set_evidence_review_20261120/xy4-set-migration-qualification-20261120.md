# XY4 set migration qualification

This is a read-only qualification outline, not an approved mutation plan or a claim that every ambiguity has been resolved. It complements `xy4-three-subject-and-coordinate-review-20261120.md` and the exact source, storage, identity and dependency artifacts cited there.

## Verified scope

Of 95 snapshotted Japanese XY4 parents, 92 have official-page and authenticated stored-image byte matches. Eighty-five of those have stored numbers different from the official printed number; seven secret rares match their printed numbers. Every corrected numeric coordinate is occupied in the snapshot. The numeric graph contains five closed eleven-parent cycles, three eleven-parent components that include the unverified entries, and seven fixed components. Three English-named, unpadded parents with third-party images remain unresolved; their image similarity is not exact-print or duplicate proof.

For 62 parents, fresh readback also confirmed that the active primary species conflicts with the Pokédex number on the exact official image. Their promotion-enabled family reviews were superseded and disabled in seven guarded production batches; parent records, identities, source evidence, species links and coordinates remain unchanged. Exact execution archives and receipts are in `../jpn_xy4_family_containment_20261120/`.

## Binding and dependency constraints

- `GV_ID_ASSIGNMENT_V1` is frozen: existing non-null public IDs are preserved during backfill, and collisions fail closed. `CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1` states that public URLs depend on the parent `gv_id` and requires explicit migration/backfill contract review for a future change. A cyclic reassignment cannot be assumed safe for existing routes.
- Live partial unique indexes protect public IDs, active identity hashes and standard-set coordinate/variant keys. A direct row-by-row permutation can collide before completion. A rehearsal must prove the exact transaction strategy against the actual constraints, triggers and concurrency behavior; no temporary sentinel values or schema changes are approved by this document.
- Seventy-eight single-column foreign-key constraints were counted in bounded, separate read-only snapshots; counts include identity, evidence, species, traits, printings and market-listing references. Those snapshots do not cover logical references, concurrent changes, caches or every external consumer. Parent UUIDs, user ownership, listing and pricing links, source evidence and public-route behavior require explicit preservation and post-write verification.
- Old active source-evidence rows must not be rewritten to claim that an original source asserted a different identity. Japanese card pages support printed Japanese names, coordinates, dex numbers where printed and exact artwork. Species-name and English checklist references have narrower roles; they cannot be counted as independent proof of a particular Japanese printing.

## Qualification before any write

1. Adjudicate the three unverified parents against exact printing and authoritative bilingual evidence; determine whether they are distinct identities or duplicates without relying on resized-image similarity. Freeze their full dependency and public-route preimages.
2. Integrate and test the inactive-evidence safeguards and all affected artist/adjudication consumers. Define source-specific current assertions, retained historical claims, hashes and raw-source links; prove that historical claims cannot be admitted as live support.
3. Review the public-ID/coordinate contract and prepare one explicit collision-safe set migration that preserves approved existing routes and parent identity. Account for 85 source-verified coordinate mismatches, seven fixed secret rares, the three held parents, and all active identities, printings, aliases and unique indexes. Do not silently redirect a public token to a different card.
4. Reacquire current official pages and storage bytes, refreeze all affected parents and dependencies, and rehearse the precise writer against an isolated database with production-equivalent constraints and concurrency. Verify collision handling and rollback; do not use a partial rehearsal as an apply proof.
5. Before any bounded production mutation, use current code and exact-source preimages, raw-first provenance, a same-writer rollback proof, protected-state checks and independent per-batch and complete readbacks. Stop on drift or any unresolved ownership or commit outcome.

The current artifacts support preparation; they do not establish a deployable migration or launch readiness.
