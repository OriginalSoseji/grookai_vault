# Cross-TCG Set Cover Gap Repair V1

## Purpose

Close only the cover gaps identified by `CROSS_TCG_SET_PUBLICATION_GATE_V1`
without changing canonical cards, pricing, Vault data, or release controls.

## Frozen Scope

- One Piece namespace repairs: `DON`, `EB02`, `EB03`, `EB04`, `OP15`, `P`.
- MTG exact package repairs: `DVD`, `EVG`, `GS1`, `GVL`, `H09`, `JVC`,
  `OE01`, `OHOP`, `OPC2`, `OPCA`, `PD2`, `PD3`.
- `OARC` remains a representative-card cover. Its scheme-card subset spans
  multiple Archenemy decks and no whole-subset package is present in the source
  warehouse. One deck image must not be labeled as exact package evidence.

## Evidence Rules

- A public card image outside `set-covers/{game}/{set}/` is legacy source media,
  not a governed set cover.
- MTG source-group overrides are permitted only for the versioned derived-set
  mappings in `MTG_DECK_SOURCE_GROUP_OVERRIDES_V1`.
- A TCGPlayer product must be selected from the authorized ranked candidate list.
- Image transport failure cannot erase a valid source candidate from the plan.
- Every uploaded object is hash-read back before a pointer can change.

## Apply Boundary

One Piece and MTG execute as separate independently atomic lanes. Apply mode
requires the exact merged producer SHA and that lane's plan fingerprint. Set
pointers use compare-and-swap against their frozen prior values. Failure rolls
back only pointers changed by that lane and only objects created by that lane,
then verifies removed objects are absent. A failure in one lane cannot leave a
different lane partially applied by the same workflow execution.

The workflow may write only:

- new objects under `external-card-images/set-covers/...`;
- `sets.hero_image_url` and `sets.hero_image_source` for the frozen set codes.

It may not write canonical cards, pricing, Vault data, release controls, or
unrelated set rows.

## Completion Proof

After apply, rerun the released-set publication gate. The gate must reconcile
all selected sets with zero blockers and zero mismatches. The remaining `OARC`
representative cover is an explicit evidence abstention, not a failed repair.
