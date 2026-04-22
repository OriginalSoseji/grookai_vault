# prize_pack_base_route_repair_family

## 1. Purpose

The `prize_pack_base_route_repair_v*.mjs` family performs bounded structural route-repair passes for Prize Pack rows whose blocker is `BASE_ROUTE_AMBIGUOUS` or an equivalent structural identity ambiguity. A route repair pass decides whether the row has one lawful base printed identity, remains ambiguous, or should be ruled out structurally.

## 2. Family pattern

Every version must:

- Rebuild the current ambiguous pool from prior artifacts.
- Cluster rows by one exact ambiguity shape.
- Select one coherent target cluster.
- Define one shared route question.
- Audit candidate canon owners without guessing.
- Write JSON and markdown checkpoints.
- Rebucket rows only into route-resolved WAIT, DO_NOT_CANON, READY, or still ambiguous.

The family is structural. It must not acquire new series evidence and must not promote rows.

## 3. Version history from the milestone

- `v2` clustered the base-route ambiguous pool.
- `v3` proved annotated-name normalization was evidence-hard rather than route-hard.
- `v4` audited alt-art-only number-slot collision.
- `v5` documented printed identity versus variant-key routing for alt-art number slots.
- `v6` collapsed the remaining high-value exact name-number structural cluster into evidence-bound WAIT rows and left the special-family row for a separate repair path.

## 4. When to create a new version

Create a new route-repair version only when:

- A current checkpoint shows rows still structurally ambiguous.
- The rows share one route question.
- The question can be answered from current canon and current artifacts.
- The pass will not depend on missing official source acquisition.
- The output can be checkpointed row by row.

## 5. When not to create a new version

Do not create a new route-repair version when:

- The row has a valid route and only lacks series evidence.
- The only signal is no-hit or near-hit evidence.
- The desired decision would require weakening a global identity rule.
- The row is acquisition-blocked.
- The remaining issue is source-staging cleanup.

## 6. Checkpoint requirements

Each version must write:

- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v<n>_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v<n>_target_cluster.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v<n>.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v<n>.md`

If a version has no target cluster because of a STOP condition, the markdown must state the exact blocker and the smallest valid re-cluster.

## 7. Classification outputs

Allowed route outputs:

- `ROUTE_RESOLVED_WAIT`: exactly one lawful base route exists, but series evidence is still missing.
- `ROUTE_RESOLVED_DO_NOT_CANON`: route proof shows the row inherits a duplicate or non-canon outcome.
- `ROUTE_RESOLVED_READY`: route proof removes the final blocker and evidence is already sufficient.
- `STILL_ROUTE_AMBIGUOUS`: multiple plausible routes or a missing invariant remains.

No other status should be invented inside this family.

## 8. Safe usage

- Start from the latest final or live route checkpoint.
- Work on one coherent cluster only.
- Include candidate GV IDs, set codes, normalized name comparisons, printed-number comparisons, and route notes.
- Preserve all unresolved rows in WAIT unless deterministic proof supports a stronger decision.

## 9. Unsafe usage

- Using evidence questions inside a route pass.
- Promoting route-resolved rows without a READY candidate batch.
- Broadly changing identity rules to solve one row.
- Treating an alt-art label as more important than printed number after `PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1`.

## 10. Freeze and retirement

A version is retired once its checkpoint is written and the next step is chosen. Do not edit old repair checkpoints. If a later source or canon change reopens a route issue, create a new version that cites the prior version and explains why the prior conclusion is no longer sufficient.
