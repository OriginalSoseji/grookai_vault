# JUSTTCG_CANONICAL_REMAP_AUDIT_V1

## Context

The identity layer is closed and canonical truth is now stable. This audit checks the current JustTCG bridge surface against that closed identity layer before any remap or backfill work is allowed.

This artifact is read-only:

- `card_prints` remains untouched
- `external_mappings` is read-only
- `raw_imports` is read-only

## Surface Summary

Live counts:

- `current_mapped_count = 19212`
- `current_raw_card_count = 15239`
- `current_unmapped_count = 6193`

The audit classifies two distinct surfaces:

1. active JustTCG bridge rows already present in `external_mappings`
2. current raw JustTCG card rows that still lack an active JustTCG bridge

## Classification Counts

Full audited surface result:

- `STILL_CORRECT = 19209`
- `STALE_TARGET_REQUIRES_REMAP = 3`
- `NEWLY_MATCHABLE_AFTER_IDENTITY_CLEANUP = 26`
- `REVIEW_REQUIRED = 4336`
- `NON_CANONICAL_UPSTREAM = 1831`

No row remained unexplained.

## Mapping Breakdown

### STILL_CORRECT (`19209`)

These active JustTCG mappings already point at canonical rows with non-null `gv_id`.

Evidence:

- `9043` current raw rows with active JustTCG bridges still agree with the deterministic stage match
- `10166` active bridges do not currently appear in the raw snapshot, but their targets remain canonical and therefore are not stale

### STALE_TARGET_REQUIRES_REMAP (`3`)

Three active JustTCG mappings still point to non-canonical targets (`gv_id is null`):

- `pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection`
- `pokemon-battle-academy-2022-yamper-074-202-58-pikachu-stamped-promo`
- `pokemon-battle-academy-2022-yamper-074-202-1-pikachu-stamped-promo`

Current stage result for all three:

- `stage_classification = NEEDS_REVIEW`
- `stage_classification_reason = mapping_target_noncanonical`

This means they are stale, but not batch-safe for automatic remap yet.

### NEWLY_MATCHABLE_AFTER_IDENTITY_CLEANUP (`26`)

These are currently unmapped raw JustTCG rows that already resolve deterministically to canonical targets.

All `26` share the same proof shape:

- `stage_classification = MATCHED`
- `stage_classification_reason = active_tcgplayer_bridge_mapping`
- `matched_via = tcgplayer_external_mapping`
- `candidate_card_print_id is not null`

Safety proof:

- `safe_batch_remap_count = 26`
- `distinct_target_count = 13`
- `null_target_count = 0`
- `non_tcgplayer_bridge_count = 0`

This is the safe batch surface.

### REVIEW_REQUIRED (`4336`)

These rows do not have an active JustTCG bridge and still need contract or rule work before automatic mapping is safe.

Dominant causes:

- `set_mapping_missing = 3582`
- `partial_same_set_candidate_surface = 468`
- `token_lane_unsupported = 249`
- `parenthetical_modifier = 15`
- `set_mapping_ambiguous = 10`
- residual `PROMOTION_CANDIDATE / no_same_set_canonical_match_on_clean_surface = 12`

For this audit, the residual `12` promotion-candidate rows are treated as review-required because they are not yet lawful automatic bridges.

### NON_CANONICAL_UPSTREAM (`1831`)

This lane is upstream noise, not a bridge gap.

Breakdown:

- `1812` rows were filtered before staging by the ingestion non-canonical gate
- `19` rows were explicitly reclassified in `CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1`

Typical examples are JustTCG code-card products with `number = N/A` and `rarity = Code Card`.

## Safety Analysis

Batch-safe write surface:

- only the `26` `NEWLY_MATCHABLE_AFTER_IDENTITY_CLEANUP` rows

Not batch-safe:

- the `3` stale mappings, because no deterministic replacement target is currently available in staging
- the `4336` review rows, because they still require mapping, namespace, or printed-identity contract work

## Stale Mapping Causes

The stale surface is not caused by broad bridge drift. It is a narrow non-canonical target problem:

- active JustTCG mapping survives
- target `card_print_id` survives
- target is no longer canonical (`gv_id is null`)
- current stage cannot yet produce a deterministic replacement

This should be handled separately from the safe batch backfill.

## New Match Opportunities

The audit isolated one deterministic bridgeable family:

- `26` unmapped JustTCG rows that already inherit canonical truth through active TCGplayer bridges

That family is safe because it does not require:

- canonical writes
- `gv_id` changes
- identity mutation
- heuristic review

It only requires adding missing JustTCG bridge rows to existing canonical targets.

## Next Step Recommendation

Next lawful execution unit:

- `JUSTTCG_TCGPLAYER_BRIDGE_BACKFILL_APPLY_V1`

Why this is the safest next move:

- it handles the full `26`-row deterministic batch
- it avoids the `3` stale rows that still need review
- it does not mutate canonical identity
- it reduces future remap noise by backfilling already-proven canonical bridges
