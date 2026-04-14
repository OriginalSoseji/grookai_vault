# JUSTTCG_STALE_REMAP_CONTRACT_AUDIT_V1

## Context

`JUSTTCG_BRIDGE_INSERT_ONLY_APPLY_V1` closed the deterministic insert lane and intentionally left `3` stale mappings blocked:

- `1` Celebrations Classic Collection row
- `2` Battle Academy 2022 Yamper rows

All three still point at `gv_id is null` targets, so bridge repair is blocked until the ambiguity contract is explicit.

This artifact is read-only:

- no remap was executed
- no canonical rows were touched
- no `gv_id` values were changed

## Row Analysis

### 1. `pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection`

Live shape:

- raw: `Here Comes Team Rocket!`
- raw number: `15/82`
- raw set: `celebrations-classic-collection-pokemon`
- current mapped target: `c267755e-9f4a-4ed5-a6aa-190dd42ae977`
- current mapped target state: non-canonical (`gv_id = null`)

Deterministic findings:

- active set alignment exists to `cel25c`
- there is no same-set canonical `Here Comes Team Rocket!` target in `cel25c`
- the strongest cross-set canonical hit is `GV-PK-TR-15` in `base5`
- `cel25c` already has a different canonical row on the same normalized token:
  `GV-PK-CEL-15CC / Venusaur`

Conclusion:

- this is a real same-set canonical gap, not a safe remap
- reusing `GV-PK-TR-15` would violate set-local identity

Classification:

- `PROMOTION_REQUIRED`
- root cause: `CLASSIC_COLLECTION_SAME_SET_CANONICAL_ABSENT`
- safe resolution: `REQUIRE_MANUAL_REVIEW`

### 2. `pokemon-battle-academy-2022-yamper-074-202-58-pikachu-stamped-promo`

Live shape:

- raw: `Yamper - 074/202 (#58 Pikachu Stamped)`
- raw set: `battle-academy-2022-pokemon`
- current mapped target: `ae1896de-c635-4487-a04f-c63809a14f57 / Yamper / A4a`
- current mapped target state: non-canonical (`gv_id = null`)

Strongest canonical hit:

- `GV-PK-SSH-74 / Yamper / swsh1`

Why that is unsafe:

- the raw source label carries Battle Academy deck-stamped identity evidence
- the `swsh1` row is the underlying Sword & Shield base print, not the Battle Academy overlay print
- the Battle Academy contract requires release-scoped overlay identity and must not collapse into non-BA canon

Classification:

- `TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES`
- root cause: `BATTLE_ACADEMY_OVERLAY_IDENTITY_MISSING`
- safe resolution: `NEED_NEW_RULE`

### 3. `pokemon-battle-academy-2022-yamper-074-202-1-pikachu-stamped-promo`

Live shape is the same family as row 2:

- raw: `Yamper - 074/202 (#1 Pikachu Stamped)`
- strongest current canonical hit: `GV-PK-SSH-74 / Yamper / swsh1`
- current mapped target is the same non-canonical `A4a` Yamper row

Why deterministic remap still fails:

- `#1` and `#58` are different source-facing Battle Academy identity surfaces
- both collapse to the same underlying `swsh1` Yamper if bridge logic ignores the overlay contract
- that would erase identity that the Battle Academy contract treats as governing evidence

Classification:

- `TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES`
- root cause: `BATTLE_ACADEMY_OVERLAY_IDENTITY_MISSING`
- safe resolution: `NEED_NEW_RULE`

## Ambiguity Explanation

The stale surface is not one generic bug. It splits cleanly into two contract families.

### Family A: Classic Collection same-set canonical absence

Count:

- `1`

Failure mode:

- upstream row is a real canonical card
- current mapped target is non-canonical
- same-set canonical replacement does not exist
- cross-set reprint reuse would be wrong

### Family B: Battle Academy overlay identity missing

Count:

- `2`

Failure mode:

- upstream rows carry Battle Academy deck-stamped overlay identity
- the only current canonical hit is the underlying `swsh1` base print
- remapping would collapse distinct Battle Academy prints into non-BA canon

## System Limitations

1. JustTCG stale remap cannot repair a row by crossing set boundaries simply because name and token agree.
2. Battle Academy overlay identity is governed by its own contract and is not reducible to the underlying non-BA card.
3. Existing stale mappings to `gv_id-null` rows must stay blocked until a lawful target exists.

## Final Contract Rules

1. Cross-set exact name+number agreement is insufficient for stale JustTCG remap. Same-set canonical truth is required.
2. Battle Academy 2022 deck-stamped rows such as `(#1 Pikachu Stamped)` and `(#58 Pikachu Stamped)` must never remap to `swsh1` or any other underlying set by token/name alone.
3. Celebrations Classic Collection rows that still point to non-canonical placeholders remain blocked until a same-set `cel25c` canonical row exists.
4. Stale mappings remain fail-closed until either a lawful same-set canonical target exists or a domain-specific identity contract is implemented.

## Safe Resolution Counts

- `SAFE_REMAP = 0`
- `REQUIRE_MANUAL_REVIEW = 1`
- `PERMANENTLY_NON_CANONICAL = 0`
- `NEED_NEW_RULE = 2`

## Next Actions

Highest-leverage next execution unit:

- `JUSTTCG_BATTLE_ACADEMY_STALE_MAPPING_CONTRACT_AUDIT_V1`

Why this is next:

- it resolves the dominant repeated family (`2 / 3` rows)
- it defines bridge behavior for future Battle Academy stale rows, not just these two Yamper cases
- the remaining Classic Collection row can remain in manual review without risking bridge corruption

## Result

The stale JustTCG surface is now fully explained:

- `stale_row_count = 3`
- `PROMOTION_REQUIRED = 1`
- `TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES = 2`
- `safe remap = 0`

Correct system behavior is explicit:

- do not remap any of the three rows now
- keep the bridge fail-closed
- route the two Battle Academy rows into a dedicated overlay mapping contract
- leave the Classic Collection row in review until a lawful same-set canonical target exists
