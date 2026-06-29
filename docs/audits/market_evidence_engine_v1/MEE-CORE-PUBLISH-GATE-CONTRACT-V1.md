# MEE Core Publish Gate Contract V1

Generated: 2026-06-27T05:23:02.003Z

Status: contract only

## Rule

Internal review does not publish pricing. Publication is a separate final gate.

## Minimum Gate Rules

- Only resolved review_confirmed_internal_candidate rows may be considered.
- Evidence lane must be raw_single or slab, never mixed_raw_slab.
- All public flags must still be false before publish-gate apply.
- Source mix, confidence, freshness, outlier rules, and replay references must be present.
- Reference metrics alone cannot publish.
- Active listing asking prices alone cannot publish as market truth.
- Publish gate writes require a separate future approval and must never be bundled with ingest or review actions.

## Current State

No public pricing writes are allowed by this contract.
