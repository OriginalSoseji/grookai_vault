# PRINT_IDENTITY_KEY_PROMO_COLLISION_REUSE_REALIGNMENT_V1

## Context

`PRINT_IDENTITY_KEY_PROMO_COLLISION_CONTRACT_AUDIT_V1` classified the blocker as:

- `classification = PROMO_IDENTITY_DUPLICATE`
- `safe_resolution_type = REUSE_CANONICAL`

This execution unit attempted the bounded two-row reuse realignment requested for the promo collision behind:

- `svp:085:pikachu-with-grey-felt-hat`

## Live Surface

The live database no longer matches the requested two-row contract.

Observed cluster:

1. `50386954-ded6-4909-8d17-6b391aeb53e4`
   - `joined_set_code = svp`
   - `set_code = null`
   - `gv_id = GV-PK-PR-SV-085`
   - active identity row present
   - active `tcgdex` mapping present

2. `5557ba0d-6aa7-451f-8195-2a300235394e`
   - `set_code = svp`
   - `gv_id = GV-PK-PR-SV-85`
   - printings and active vault usage present

3. `a48b4ff3-64c4-4a63-8c6d-434cebbf32e4`
   - `joined_set_code = svp`
   - `set_code = null`
   - `gv_id = GV-PK-SVP-85`
   - active `justtcg` mapping present
   - existing `print_identity_key = svp:085:pikachu-with-grey-felt-hat`

All three rows share:

- the same effective set lane (`svp` after `set_id` join)
- the same normalized printed name
- the same normalized promo number (`085` vs `85` is padding drift only)
- blank `variant_key`
- blank `printed_identity_modifier`

## Hard-Gate Result

The requested apply lane requires:

- exactly `2` rows in the conflict group
- exactly `1` canonical target
- a one-to-one duplicate-to-canonical reuse map

Live reality is:

- `conflict_group_size = 3`

That violates the primary hard gate before any FK movement can begin.

## Resolution Method

No mutation was performed.

The created runner supports the requested two-row reuse path, but it fails closed when run against the current live surface because the cluster is broader than the contracted scope.

## Invariants Preserved

- canonical row data unchanged
- `gv_id` unchanged
- no FK repointing performed
- no duplicate row deleted under ambiguous scope
- no orphan risk introduced

## Why Apply Is Blocked

This is no longer a single duplicate-row problem. It is a three-row same-identity cluster with mixed field completeness:

- one row carries active identity
- one row carries the joined set code directly
- one row carries the existing `print_identity_key` and JustTCG linkage

Under that surface, “delete one duplicate and keep one canonical row unchanged” is not a lawful or complete resolution.

## Deterministic Conclusion

This execution unit failed closed on live precondition drift:

- requested contract: two-row reuse
- live reality: three-row cluster

The promo backfill remains blocked until a broader cluster-level reuse contract is defined and executed.
