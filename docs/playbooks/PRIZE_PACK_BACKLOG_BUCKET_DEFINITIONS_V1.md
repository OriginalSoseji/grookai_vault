# Prize Pack Backlog Bucket Definitions V1

This document defines the final Prize Pack backlog buckets used by `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json`.

## PROMOTED

Definition:

- A Prize Pack stamped `card_prints` row exists in canon.
- The row was closed through the warehouse flow.
- `variant_key = play_pokemon_stamp`.
- Mapping and representative image closure were completed for executed milestone batches.

Operational meaning:

- Closed. Do not re-promote.
- Future work may verify, but not duplicate.

Example rows:

- `Rillaboom | 014/072 | swsh1`
- `Inteleon | 058/202 | swsh1`
- `Wormadam | 010/172 | swsh9`

Allowed next actions:

- Audit mapping/image coverage if a defect is reported.
- Reference as closed source material.

Forbidden next actions:

- Recreate the same stamped identity.
- Change base rows to match source rows.
- Split by Prize Pack series.

## DO_NOT_CANON

Definition:

- Evidence proves the source row should not create a distinct canon `card_prints` row.
- Common reason: exact same printed identity appears across multiple Prize Pack series with no printed distinction.

Operational meaning:

- Closed as non-canon for this identity model.
- Do not place in a READY batch.

Example rows:

- `Inteleon | 043/198 | swsh6 | [1,2]`
- Energy-style and duplicate distribution rows closed in earlier evidence passes.

Allowed next actions:

- Keep as checkpoint evidence.
- Reopen only if a new printed identity signal is proven.

Forbidden next actions:

- Promote because it appears in a Prize Pack.
- Use distribution-series difference as identity.

## WAIT_ACQUISITION_BLOCKED

Definition:

- Row depends on official-source confirmation not currently available in the validated local source pack.

Operational meaning:

- It is unresolved for external-source reasons, not because the system is uncertain about rules.

Example rows:

- `Victini V | 025/202 | swsh1`
- `Cinderace | 034/202 | swsh1`
- `Drizzile | 056/202 | swsh1`

Allowed next actions:

- `SERIES_2_OR_OTHER_OFFICIAL_SOURCE_ACQUISITION`
- Import official or official-equivalent source artifacts.
- Rerun a bounded source upgrade only for affected rows.

Forbidden next actions:

- Use community lists as Tier 1.
- Guess missing checklist entries.
- Promote from missing official evidence.

## WAIT_NONBLOCKED_NEAR_HIT_ONLY

Definition:

- Accessible evidence has name-level or set-family signal, but no exact name plus printed-number match.
- The near hit may have the wrong number, wrong set token, or another non-exact identity mismatch.

Operational meaning:

- The row was searched and remains unresolved.
- Near-hit evidence is not promotable evidence.

Example rows:

- `Mystery Garden | 172/132 | me01` near hit: `Mystery Garden MEG 122`
- `Carmine | 103/131 | sv8pt5` near hit: `Carmine TWM 145`
- `Professor's Research | 060/072 | swsh4.5` near hits: SVI professor rows
- `Whimsicott V | 160/172 | swsh9` near hit: `Whimsicott V 064`

Allowed next actions:

- Reopen only if a new authoritative exact source appears.
- Keep in final-state checkpoint.

Forbidden next actions:

- Promote from near-hit evidence.
- Treat same-name evidence as printed-identity evidence.

## WAIT_NONBLOCKED_NO_HIT

Definition:

- Route is valid.
- Accessible Series 1-8 evidence was searched.
- No exact hit and no usable near-hit evidence was found.

Operational meaning:

- There is no current evidence path to READY or DO_NOT_CANON.

Example rows:

- `Cynthia's Gible | 102/182 | sv10`

Allowed next actions:

- Freeze.
- Reopen only under `NONBLOCKED_RESEARCH_REOPEN` with a new authoritative source.

Forbidden next actions:

- Keep slicing the same no-hit row with the same evidence set.
- Promote from source presence alone.

## ERROR_SOURCE_DUPLICATE

Definition:

- Source row is labelled as error or duplicate, or otherwise duplicates a same name-number-set source row.
- It should not be mistaken for an independent unresolved canon candidate.

Operational meaning:

- This is source-staging cleanup, not warehouse promotion.

Example rows:

- `Cynthia's Gible | 102/182 | sv10 | pokemon-prize-pack-series-cards-cynthia-s-gible-error-common`

Allowed next actions:

- `ERROR_SOURCE_CLEANUP_REVIEW`
- Source staging hygiene review.

Forbidden next actions:

- Create a canon row.
- Merge into a READY batch.

## WAIT_SPECIAL_FAMILY

Definition:

- Row had special-family collision history or special-case handling and still lacks exact Prize Pack series evidence.

Operational meaning:

- Structural route may be understood, but evidence is still insufficient.

Example rows:

- `Team Rocket's Mewtwo ex | 079/217`

Allowed next actions:

- Reopen if exact Prize Pack series evidence appears.
- Reference `prize_pack_special_identity_family_repair_v1.json`.

Forbidden next actions:

- Promote from same-name evidence for a different set or number.
- Create a new family-level rule just to move one unresolved row.

## WAIT_REMAINING_EXACT_ACCESSIBLE_HIT

Definition:

- Count of unresolved rows that still have exact currently accessible corroboration.

Final value:

- `0`

Operational meaning:

- The nonblocked exact-evidence lane is exhausted.

Allowed next actions:

- Freeze backlog.
- Acquire new official data.
- Reopen only with genuinely new authoritative evidence.

Forbidden next actions:

- Continue evidence slicing with the same source set expecting READY rows.
