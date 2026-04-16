# WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1

Status: ACTIVE
Type: Warehouse Intake Contract
Scope: source-backed warehouse candidates carried by bridge payloads

## Purpose

Allow governed warehouse candidates to advance without image evidence when their
identity was already frozen by a trusted bridge payload.

V1 is validated against:

- `bridge_source = external_discovery_bridge_v1`
- `source_set_id = me03-perfect-order-pokemon`

## Intake Modes

Warehouse now supports two intake modes:

1. `IMAGE_BACKED`
   - identity is derived from evidence rows, scans, and normalized assets
2. `SOURCE_BACKED`
   - identity is derived from `claimed_identity_payload` and
     `reference_hints_payload`

## Source-Backed Entry Rule

A candidate is `SOURCE_BACKED` when:

- `reference_hints_payload.bridge_source = external_discovery_bridge_v1`

and the candidate carries, at minimum:

- `claimed_identity_payload.name` or `card_name`
- `claimed_identity_payload.number_plain`
- `claimed_identity_payload.set_code` or `set_hint`

## Behavior

For `SOURCE_BACKED` candidates:

1. classifier may bypass warehouse evidence-row and front-image requirements
2. metadata extraction may derive identity from bridge payloads without images
3. staging may bypass normalization-asset requirements for
   `CREATE_CARD_PRINT`
4. source-backed candidates may auto-advance only through governed
   preparation:
   - bridge -> warehouse `RAW`
   - classification
   - metadata extraction
   - review-only staging preparation where lawful
5. source-backed candidates must not auto-advance through founder approval
   or canon execution
6. final canon execution remains explicitly founder-gated

## Guardrails

1. collision-resolved rows must never stage with empty `variant_key`
2. source-backed mode never permits direct canon writes outside the executor
3. source-backed mode must keep:
   - `name`
   - `number_plain`
   - `set_code`
4. source-backed candidates must always tag:
   - `source_type = SOURCE_BACKED`
5. review-only staging must not be treated as founder approval
6. executor must require explicit founder approval evidence before any
   canon write

## Non-Goals

This contract does not:

- change canonical schema
- bypass warehouse staging/executor
- change search contracts beyond minimal worker compatibility fixes
- authorize promotion for unrelated sets
