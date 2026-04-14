# JUSTTCG_BRIDGE_INSERT_ONLY_APPLY_V1

## Context

`JUSTTCG_TCGPLAYER_BRIDGE_BACKFILL_APPLY_V1` failed correctly because the stale remap surface was not deterministic:

- `insert-ready rows = 26`
- `stale remap rows = 3`
- stale remap target resolution = `0 / 3`

This split artifact isolates the safe insert lane and preserves the stale rows for a separate contract-first audit.

## Mapping Breakdown

### Unit A: Insert-only apply

The insert surface is bounded to the `26` rows that already satisfy all of the following:

- `classification = MATCHED`
- `matched_via = tcgplayer_external_mapping`
- `target_card_print_id is not null`
- `target_gv_id is not null`
- no existing JustTCG mapping exists for the same `external_id`

Expected safety proof:

- `insert_ready_count = 26`
- `ambiguity_count = 0`
- `collision_count = 0`

### Unit B: Stale remap contract

The following `3` rows stay blocked:

- `pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection`
- `pokemon-battle-academy-2022-yamper-074-202-58-pikachu-stamped-promo`
- `pokemon-battle-academy-2022-yamper-074-202-1-pikachu-stamped-promo`

These rows are not part of the apply surface.

## Insert Result

This artifact inserts only the deterministic bridge rows into `external_mappings`:

- `source = 'justtcg'`
- `external_id`
- `card_print_id`
- `active = true`

No canonical identity mutation is involved.

## Invariants Preserved

- `card_prints` remains unchanged
- `gv_id` values remain unchanged
- no review-required row is mutated
- no stale remap row is mutated
- no duplicate JustTCG mapping is created

## Risks

- accidentally including a row that already has a JustTCG mapping
- silently allowing an ambiguous stage target into the insert lane
- mutating the blocked stale surface inside the insert-only unit

The runner hard-stops on all three conditions.

## Next Execution Unit

Blocked stale surface follow-up:

- `JUSTTCG_STALE_REMAP_CONTRACT_AUDIT_V1`
