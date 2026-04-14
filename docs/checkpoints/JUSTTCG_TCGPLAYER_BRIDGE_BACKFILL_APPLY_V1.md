# JUSTTCG_TCGPLAYER_BRIDGE_BACKFILL_APPLY_V1

## Context

`JUSTTCG_CANONICAL_REMAP_AUDIT_V1` identified two candidate bridge actions:

- `26` unmapped JustTCG rows that already resolve deterministically through active TCGplayer bridges
- `3` stale JustTCG mappings that still point to non-canonical targets

This artifact re-validates that scope before any write is attempted.

## Live Mapping Breakdown

Requested apply scope:

- `REMAP = 3`
- `INSERT = 26`
- `total_candidate_scope = 29`

Live deterministic scope after re-validation:

- `INSERT ready = 26`
- `REMAP ready = 0`
- `stale_blocked_count = 3`

The `26` insert rows remain clean and deterministic. The `3` stale mappings do not.

## Stale Remap Result

All three stale mappings still fail deterministic target resolution:

- `pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection`
- `pokemon-battle-academy-2022-yamper-074-202-58-pikachu-stamped-promo`
- `pokemon-battle-academy-2022-yamper-074-202-1-pikachu-stamped-promo`

Current live outcome:

- `validation_status = BLOCKED_NO_TARGET`
- `target_candidate_count = 0`

Proof details:

- the Celebrations Classic Collection row still has no lawful same-identity canonical replacement
- the two Battle Academy 2022 Yamper rows still lack an active set-mapping contract and no canonical replacement target is surfaced

Because the stale rows are unresolved, the runner fails closed and performs no mutation.

## Insert Surface

The `26` insert rows remain deterministic:

- `stage_classification = MATCHED`
- `matched_via = tcgplayer_external_mapping`
- `new_card_print_id is not null`
- `new_gv_id is not null`
- `collision_count = 0`
- `ambiguity_count = 0`

This lane is safe in isolation, but the bounded codex requested a single `29`-row mutation surface. The worker therefore refuses a partial write.

## Remap vs Insert Counts

Live write outcome for this artifact:

- `rows_updated = 0`
- `rows_inserted = 0`
- `total_rows_affected = 0`

This is intentional. The hard gate is protecting the bridge layer from forced remaps into unresolved targets.

## Invariants Preserved

- `card_prints` remains untouched
- no `gv_id` values change
- `external_mappings` remains unchanged on blocked runs
- the `4336` review rows remain untouched
- the `1831` non-canonical upstream rows remain untouched

## Risks

- forcing a stale remap without a deterministic target would corrupt bridge truth
- inserting only the `26` safe rows under a codex that claims `29` safe rows would silently diverge from the audited contract
- writing through unresolved Battle Academy or Celebrations stale rows would encode review debt as fact

## Outcome

`JUSTTCG_TCGPLAYER_BRIDGE_BACKFILL_APPLY_V1` is implemented as a replay-safe bounded runner, but current live data fails the remap hard gate.

Next lawful move:

- split the stale surface into a separate contract-first audit
- keep the `26` insert-safe rows isolated for a later bounded apply once the stale contract is corrected
