# EXTERNAL_DISCOVERY_TO_WAREHOUSE_BRIDGE_V1

Status: ACTIVE
Type: Bounded Warehouse Intake Contract
Scope: one explicit set-scoped run from `external_discovery_candidates` -> `canon_warehouse_candidates`

## Purpose

Allow source-discovered candidates to enter the governed warehouse flow without bypassing review or writing directly into canon.

V1 is intentionally set-scoped:

- required CLI input: `--set-id=<external-set-id>`
- no default set
- no global/all-sets mode

## Inputs

- required CLI input: `--set-id=<external-set-id>`
- rows from `public.external_discovery_candidates`
- active helper alignment in `public.justtcg_set_mappings`

## Outputs

- rows in `public.canon_warehouse_candidates` with `state = 'RAW'`

## Rules

1. V1 is set-scoped only. Each run requires exactly one explicit `--set-id`.
2. The provided set must already exist in `public.external_discovery_candidates`.
3. The provided set must resolve through exactly one active `public.justtcg_set_mappings` row to one canonical `sets` row.
4. Standard bridge scope is:
   - `match_status = 'UNMATCHED'`
   - `candidate_bucket = 'CLEAN_CANON_CANDIDATE'`
5. Retroactive set-mapping bridge scope is also allowed when:
   - the row remains unresolved
   - and its recorded ingestion `classification_reason = 'set_mapping_missing'`
   - and the set now has a unique active helper mapping
6. Rows outside bridge scope are skipped, not bridged.
7. Only candidates already proven to be lawful singles may bridge.
8. Bridge writes only `canon_warehouse_candidates` plus warehouse event provenance.
9. Bridge must never write `sets`, `card_prints`, `card_printings`, or promotion staging rows.
10. Bridge provenance must be explicit:
   - `bridge_source = external_discovery_bridge_v1`
   - `bridge_version = EXTERNAL_DISCOVERY_TO_WAREHOUSE_BRIDGE_V1`
11. Bridge must preserve identity evidence rather than flatten it.
12. Same-name same-number identity-bearing collisions must preserve proposed `variant_key` when a set-specific identity rule exists.
13. Unlabeled collision rows must block rather than auto-collapse.
14. Rerunning the bridge for the same source candidate must not create duplicate warehouse rows.

## Dry Run

Default execution is dry-run.

Dry-run output must include, at minimum:

- `set_id`
- `candidates_read`
- `eligible`
- `blocked`
- `collision_rows`

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

## Set-Specific Identity Carry-Through

When a set-specific variant identity rule applies, the bridge must preserve that rule output unchanged inside:

- `claimed_identity_payload`
- `reference_hints_payload`
- warehouse event provenance metadata

Current implemented carry-through includes the existing Perfect Order rule outputs for `me03`:

- `variant_key`
- `illustration_category`
- `collision_group_key`
- `collision_resolution_reason`

Rows missing deterministic collision identity must remain blocked and must not enter warehouse RAW.
