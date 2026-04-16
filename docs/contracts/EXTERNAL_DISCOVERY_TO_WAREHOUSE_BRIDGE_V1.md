# EXTERNAL_DISCOVERY_TO_WAREHOUSE_BRIDGE_V1

Status: ACTIVE
Type: Bounded Warehouse Intake Contract
Scope: `external_discovery_candidates` -> `canon_warehouse_candidates`

## Purpose

Allow source-discovered candidates to enter the governed warehouse flow without bypassing review or writing directly into canon.

V1 is intentionally one-set scoped:

- supported external set id: `me03-perfect-order-pokemon`

## Inputs

- rows from `public.external_discovery_candidates`

## Outputs

- rows in `public.canon_warehouse_candidates` with `state = 'RAW'`

## Rules

1. V1 is one-set scoped only.
2. Only candidates already proven to be lawful singles may bridge.
3. Bridge writes only `canon_warehouse_candidates` plus warehouse event provenance.
4. Bridge must never write `sets`, `card_prints`, `card_printings`, or promotion staging rows.
5. Bridge provenance must be explicit:
   - `bridge_source = external_discovery_bridge_v1`
   - `bridge_version = EXTERNAL_DISCOVERY_TO_WAREHOUSE_BRIDGE_V1`
6. Bridge must preserve identity evidence rather than flatten it.
7. Same-name same-number identity-bearing collisions must preserve proposed `variant_key`.
8. Unlabeled collision rows must block rather than auto-collapse.
9. Rerunning the bridge for the same source candidate must not create duplicate warehouse rows.

## Required Carried Fields

The bridge must carry, at minimum:

- source candidate id
- source set id / external set slug
- normalized name
- printed number / number_plain
- claimed identity payload
- reference hints payload
- proposed variant identity payload
- provenance / evidence snapshot
- review notes / blocked reasons when present

## Schema Surfaces Used

Bridge payload data is carried using existing warehouse schema only:

- `public.canon_warehouse_candidates.claimed_identity_payload`
- `public.canon_warehouse_candidates.reference_hints_payload`
- `public.canon_warehouse_candidate_events.metadata`

## Perfect Order Rule Carry-Through

For `me03-perfect-order-pokemon`, the bridge must preserve
`PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1` outputs:

- `variant_key`
- `illustration_category`
- `collision_group_key`
- `collision_resolution_reason`

Rows missing deterministic collision identity must remain blocked and must not enter warehouse RAW.
