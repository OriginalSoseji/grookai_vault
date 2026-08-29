# Cross-TCG Set Cover Gap Repair V1

## Context

The released One Piece and Magic catalogs passed the Cross-TCG Set Publication
Gate, but 19 eligible sets still carried media coverage warnings:

- six One Piece sets used public self-hosted card images outside the governed
  `set-covers/{game}/{set}/` namespace;
- thirteen Magic deck-derived sets used representative card art even where an
  exact sealed package image could be proved.

This work repaired those gaps without changing game identity, set identity,
cards, pricing, publication state, or Vault data.

## Problem

Valid representative art prevented blank set tiles, but it did not fully meet
the product contract for game-aware browsing:

- One Piece legacy paths were not durable set-cover evidence;
- Magic deck products should show exact package art when one exact package can
  be deterministically mapped;
- a broad name match could incorrectly promote a related deck or one member of
  a multi-product subset as the cover for the whole derived set.

## Risk

The material risks were assigning the wrong product package, copying an image
without exact provenance, leaving a broken public pointer, or partially
applying one game lane after another lane failed.

## Decision

Implement independently atomic One Piece and Magic repair lanes.

- One Piece copies the existing proved public image into the governed set-cover
  namespace and updates only that set's image pointer.
- Magic permits exact code/name matches and a small governed set-to-group
  override table, then requires an exact group product or exact `Group Name
  Deck` product.
- Every plan freezes set IDs, source URLs, object paths, hashes, and the producer
  SHA before apply.
- Every apply uses compare-and-swap pointer updates, exact object readback, and
  rollback limited to objects created by that execution.
- Each game lane is dispatched separately so a failure cannot create a
  cross-game partial transaction.

## Alternatives Rejected

- Keeping all 19 warnings permanently: safe but leaves known package evidence
  unused and legacy namespaces unresolved.
- Using generic product-name similarity: too broad for deck and anthology
  identities.
- Promoting one individual Archenemy deck for `OARC`: the set spans four
  products, so one package would misrepresent the entire subset.
- Combining One Piece and Magic into one apply: obscures rollback ownership and
  permits cross-lane partial success.
- Reusing external CDN URLs in application pointers: violates the self-hosted
  media contract.

## Implementation

PR [#316](https://github.com/OriginalSoseji/grookai_vault/pull/316) merged as
`e74d2252b65dfc124d045ee1239b3937153f0e94`.

The implementation added:

- `CROSS_TCG_SET_COVER_GAP_REPAIR_V1` contract and workflow;
- independently selectable `one_piece` and `mtg` lanes;
- governed Magic group overrides for twelve deck-derived sets;
- exact plan fingerprints and frozen producer-SHA enforcement;
- compare-and-swap database pointer writes;
- self-hosted Storage collision checks, hash readback, and bounded rollback;
- post-apply execution of the Cross-TCG Set Publication Gate.

No schema migration was required.

## Applied Evidence

### One Piece

- Plan run: [33236756995](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33236756995)
- Apply run: [33236854186](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33236854186)
- Plan fingerprint:
  `51105b4204256c6fb660d0195ed0691c396a6400148223507f7c40a5519c7979`
- Applied sets: `don`, `eb02`, `eb03`, `eb04`, `op15`, `p`
- Pointer updates: 6
- Created self-hosted objects: 6
- Exact readbacks: 6
- Reconciliation mismatches: 0

These remain representative-card covers, but now live under the governed public
set-cover namespace.

### Magic

- Plan run: [33236762154](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33236762154)
- Apply run: [33236937674](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33236937674)
- Plan fingerprint:
  `4eda6e6418926336dd4a57eca6f69fe1af511a4c927aa751d67c00ffaa7582ea`
- Applied sets: `dvd`, `evg`, `gs1`, `gvl`, `h09`, `jvc`, `oe01`, `ohop`,
  `opc2`, `opca`, `pd2`, `pd3`
- Pointer updates: 12
- Created self-hosted objects: 12
- Exact readbacks: 12
- Reconciliation mismatches: 0

All twelve moved from representative card art to exact package evidence.

## Final Unattended Proof

The normal six-hour shadow reconciliation path was dispatched manually after
both applies and passed from the same producer SHA:

- Run: [33237039632](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33237039632)
- Mode: `shadow-only`
- Selected released sets: 1,007
- Eligible sets: 1,006
- Blocked sets: 0
- Coverage gaps: 1
- Exact package covers: 137
- Representative card covers: 870
- One Piece: 61 selected, 0 blocked, 0 coverage gaps
- Magic: 946 selected, 0 blocked, 1 coverage gap
- Result reconciliation mismatches: 0
- Artifact hash mismatches: 0

The remaining gap is Magic `OARC`. It intentionally retains representative art
because no authoritative whole-subset package was proved. This is an honest
abstention, not a failed repair.

TCGdex English Pokemon remained unavailable during discovery. The workflow
correctly completed in degraded-source mode, excluded that lane from gap
decisions, and preserved the existing source-availability issue. This did not
affect the One Piece or Magic set-cover proof.

## Current Truths

- Every released One Piece set has a working public self-hosted set cover.
- Every targeted Magic deck set with exact package evidence now uses a public
  self-hosted package cover.
- `OARC` is the only eligible released-set coverage warning.
- All 1,007 released sets remain available through the publication gate.
- The scheduled discovery and shadow reconciliation path consumes the repaired
  state successfully.
- The apply changed only 18 set image pointers and created 18 governed Storage
  objects.
- No card, set identity, pricing, publication, Vault, or release-control rows
  were created, deleted, or otherwise changed.

## Invariants

- Set-cover evidence must remain self-hosted and publicly readable.
- Exact package, exact set art, representative card art, and unresolved media
  must remain distinct evidence classes.
- A representative cover may keep a released set usable but may not be labeled
  exact package evidence.
- Package promotion requires deterministic set/group/product evidence.
- Plans must freeze exact row scope and producer SHA before apply.
- Pointer writes must use compare-and-swap semantics.
- Rollback may remove only objects created by the failing execution.
- One game lane must not partially authorize another game lane.
- Coverage gaps must remain visible; they must never be erased by invented
  evidence.

## Verification

- 27 targeted contract tests passed.
- Node syntax checks passed.
- `git diff --check` passed.
- PR #316 CodeQL, runtime, drift, legacy-reference, and Vercel checks passed.
- Both apply runs completed exact Storage and pointer readback with zero
  reconciliation mismatches.
- The final unattended workflow passed and all three artifact manifests matched
  their downloaded files.

## Exact Next Gate

No further repair is required for launch. Keep `OARC` as a documented
representative-cover abstention unless an authoritative image representing the
entire four-product subset is found. Future TCG activation must add explicit
game browse vocabulary, set-cover evidence policy, and publication-gate support
before any set is released.
