# CEL25C_NUMBER_15_IDENTITY_CONFLICT_AUDIT_V1

## Context

The bounded single-card promotion for `Here Comes Team Rocket!` failed correctly on a live same-set collision:

- proposed row:
  - `name = Here Comes Team Rocket!`
  - `number = 15`
  - `number_plain = 15`
  - `variant_key = cc`
  - `proposed_gv_id = GV-PK-CEL-15CC`
- collision target:
  - `d62d4f5c-277b-4f32-b5aa-a393d990fbb3`
  - `Venusaur`
  - `set_code = cel25c`
  - `gv_id = GV-PK-CEL-15CC`

That failure changed the question. This is not a simple missing-row insert. The issue is ownership of the `cel25c` `15` lane.

## Row Analysis

Current `cel25c` number-15 surface:

- canonical row:
  - `d62d4f5c-277b-4f32-b5aa-a393d990fbb3`
  - `Venusaur`
  - `number = 15`
  - `number_plain = 15`
  - `variant_key = cc`
  - `gv_id = GV-PK-CEL-15CC`
- source placeholder row:
  - `c267755e-9f4a-4ed5-a6aa-190dd42ae977`
  - `Here Comes Team Rocket!`
  - `number = 15`
  - `number_plain = 15`
  - `variant_key = ''`
  - JustTCG source:
    - external id `pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection`
    - raw number `15/82`
    - raw set `celebrations-classic-collection-pokemon`

Neighboring same-set rows make the problem larger than one stale bridge:

- `Venusaur` canonical row already occupies `15 / 15CC`
- `Here Comes Team Rocket!` placeholder is also on `15`
- `Rocket's Zapdos` placeholder currently sits on `16`
- `Claydol` placeholder currently sits on `17`
- `Umbreon ★` canonical row sits on `17 / 17CC`

So the unresolved surface is not “one missing card at 15.” It is a local numbering-family conflict inside `cel25c`.

## Upstream Evidence

JustTCG active set mapping is explicit:

- JustTCG set `celebrations-classic-collection-pokemon`
- maps to Grookai set `cel25c`
- active = `true`

Upstream same-set raw rows with `15/...` numbering in Classic Collection:

- `Venusaur` → `15/102`
- `Here Comes Team Rocket!` → `15/82`
- `Rocket's Zapdos` → `15/132`
- `Claydol` → `15/106`

That is the decisive fact.

It proves:

1. `Here Comes Team Rocket!` is not source noise.
2. `Venusaur` is not the only lawful `cel25c` card whose printed source number begins with `15`.
3. The current `GV-PK-CEL-15CC` pattern cannot be treated as a unique ownership proof for the entire `15` family.

Repo history independently points in the same direction. Older Bulbapedia compare artifacts already recorded synthetic disambiguated forms:

- `15A1` Venusaur
- `15A2` Here Comes Team Rocket!
- `15A3` Rocket's Zapdos
- `15A4` Claydol

That prior evidence matches the live collision shape: multiple lawful Classic Collection cards compete for the same `15` numerator family.

## Assumption Check

Why the earlier “missing canonical card” conclusion was insufficient:

- it correctly proved that no same-set canonical `Here Comes Team Rocket!` row exists
- it did not test whether the broader `cel25c` numbering lane could lawfully support another `15CC` identity

The false assumptions are now clear:

- the JustTCG row was not mis-assigned to the wrong set
  - active set mapping and raw set labels both support `cel25c`
- the source row is not weak or noisy
  - upstream support is direct and specific
- the current Venusaur row is not proven to be the wrong card
  - Venusaur is a real Classic Collection card with raw `15/102`

What reality actually shows:

- `cel25c` contains multiple real Classic Collection cards whose upstream numbers normalize to the same leading token `15`
- the current identity contract collapses that family into one canonical namespace slot
- the blocker is therefore a numbering-contract limitation, not a single bad source row

## Final Classification

Final classification:

- `NUMBERING_RULE_GAP`

Decision fields:

- `current_venusaur_row_lawful = yes`
- `here_comes_team_rocket_promotion_allowed_now = no`
- `required_next_action = DEFINE_CLASSIC_COLLECTION_NUMBERING_CONTRACT_FIRST`

Why `current_venusaur_row_lawful = yes`:

- Venusaur is supported by the same upstream Classic Collection surface
- there is no evidence that the current row points to the wrong card

Why promotion is still blocked:

- `GV-PK-CEL-15CC` is already occupied
- the current lane has no lawful rule for disambiguating multiple `cel25c` cards that share the same `15` numerator family
- inserting `Here Comes Team Rocket!` now would force an arbitrary identity choice instead of a contract-backed one

## Next Execution Recommendation

Exact next unit:

- `CEL25C_CLASSIC_COLLECTION_NUMBERING_CONTRACT_AUDIT_V1`

Why this is the safest deterministic next step:

- it addresses the real blocker at the lane level
- it can define how shared Classic Collection number families such as `15/102`, `15/82`, `15/132`, and `15/106` must be represented
- it avoids unsafe one-off fixes to either Venusaur or the JustTCG bridge before the numbering contract exists

## Result

The `cel25c` number-15 conflict is now fully explained:

- `conflict_row_count = 2`
- `final_classification = NUMBERING_RULE_GAP`
- `current_venusaur_row_lawful = yes`
- `here_comes_team_rocket_promotion_allowed_now = no`
- `required_next_action = DEFINE_CLASSIC_COLLECTION_NUMBERING_CONTRACT_FIRST`

The false “missing canonical card only” framing is corrected. The real unresolved surface is a Classic Collection numbering-family contract gap.
