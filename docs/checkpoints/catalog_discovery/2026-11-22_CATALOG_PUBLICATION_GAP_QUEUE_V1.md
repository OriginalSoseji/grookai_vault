# Catalog Publication Gap Queue V1

Date: 2026-11-22
Status: locally prepared read-only observability repair; no production writes

## Failure evidence

Natural Catalog Shadow Reconciliation run `44998409508` completed discovery,
candidate freezing, and set reconciliation with zero mismatches. Its released-set
publication gate correctly stayed blocked: 1,430 of 2,408 released sets had at
least one publication defect. The artifact reported aggregate printing counts,
but did not identify the exact canonical parents behind those counts. That left
continuous agents unable to assemble safe bulk review tranches.

## Repair boundary

The publication gate now emits `printing_gap_queue.json` alongside its existing
required artifacts. Each row binds one exact canonical parent to its game, set,
GV-ID, coordinate, identity domain, existing child-printing state, and explicit
defect codes. The queue is deterministic, commit-pinned, hashed with the other
artifacts, and generated inside the existing read-only transaction.

The queue records `canonical_authority: false` and
`execution_authority: false`. It does not infer missing finishes, create a
printing manifest, approve evidence, dispatch a writer, or authorize catalog,
Storage, pricing, publication, or Vault writes. Reviewed game-specific source
evidence and the existing bounded release path remain mandatory.

Aggregate gate counts reconcile exactly against the detailed queue by defect
occurrence. A missing or duplicated detail row changes the queue status to
`blocked_reconciliation_mismatch`; incomplete detail evidence cannot silently
become a bulk repair input.

## Intended operation

The next natural shadow cycle can group exact defect parents into large reviewed
batches instead of repeating one-card investigations. `single_parent_gap_set_count`
identifies a high-leverage first tranche, while the full queue preserves every
larger family for subsequent review. A red publication gate remains correct
until the underlying released-state defects are actually repaired.
