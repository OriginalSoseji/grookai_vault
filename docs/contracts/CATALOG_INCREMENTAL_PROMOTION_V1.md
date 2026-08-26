# Catalog Incremental Promotion V1

## Purpose

Keep supported TCG catalogs current without turning source discovery into permission to mutate canonical identity. The supervisor consumes a frozen discovery artifact and invokes only an exact source-specific writer for a governed gap shape.

## Schedule

- Discovery and bounded promotion run every six hours and on demand.
- The checked-out default-branch commit SHA is frozen before source collection.
- At most five targets may run per cycle.
- A failed target stops the cycle; it is never silently substituted or retried with changed inputs.
- Artifacts and source hashes are retained for 90 days and failures open one deduplicated GitHub issue.

## Write Envelope

Every writer is insert-only and must perform collision preflight, transactional readback, and rollback proof before unattended use. Apply requires the exact clean commit SHA. The supervisor never writes child printings, Storage objects, external image pointers, pricing, publication, or Vault rows.

Supported automatic lanes:

- MTG: a fully missing, released Scryfall English paper set.
- One Piece: a fully missing, released Bandai set where numbered products bind exactly to official card number and name authority. DON!!, sealed, ambiguous, and mismatched products are excluded.
- Japanese Pokemon: an incomplete existing set only when the frozen discovery row contains TCGdex full-set authority, TCGdex and an independent checklist agree on coverage, and every Pokemon species resolves exactly. Product shapes without that endpoint remain report-only.

English Pokemon is detected continuously but remains report-only until a dedicated English writer is governed and rollback-proven.

## Release Rules

- Future releases produce zero writes.
- Existing exact sets produce zero writes.
- Partial MTG and One Piece sets are held because an insert-only writer cannot safely repair unknown omissions.
- Ambiguous source identities and source disagreements are held.
- Images remain missing until the separate self-hosted image pipeline promotes an exact asset.
- Search aliases are code changes or immutable governed data; source text never directly changes canonical identity.

## Required Proof

Each execution records source URLs and hashes, the frozen SHA, selected targets, payload fingerprint, collision counts, inserted counts, durable readback or rollback absence, and boundary counts. Any mismatch fails the run and leaves the transaction unapplied.
