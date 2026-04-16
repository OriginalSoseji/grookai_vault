# Perfect Order Closure Complete

Status: COMPLETE  
Scope: `me03` / Perfect Order closure under representative image contract  
Updated: 2026-04-16

## Context

Perfect Order already closed the canonical promotion lane:

- `sets.code = 'me03'`: 1 row
- `card_prints where set_code = 'me03'`: 130
- `canon_warehouse_candidates` for `me03-perfect-order-pokemon`: 130 `PROMOTED`
- current promotion staging rows for `me03-perfect-order-pokemon`: 130 `SUCCEEDED`
- active JustTCG mappings for `me03`: 130

The remaining set-closure gap was image enrichment. That gap is now closed with representative-image coverage that preserves exact vs representative truth.

## Representative Image Implementation V1

- contract: `docs/contracts/SOURCE_IMAGE_ENRICHMENT_V1.md`
- worker: `backend/images/source_image_enrichment_worker_v1.mjs`
- chosen source: `TCGdex`
- scope: `--set-code=me03` only
- mode: dry-run by default, `--apply` optional

Applied result:

- total cards: 130
- representative coverage: 130
- exact image coverage: 0
- `representative_shared`: 118
- `representative_shared_collision`: 12
- `missing`: 0
- `image_url` writes: 0

Representative-image rerun proof:

- representative assignments pending on rerun: 0
- `skipped_existing_representative`: 130
- unmatched: 0
- ambiguous: 0

## Collision Shared-Representative Policy

The six proven collision pairs now use the shared-representative lane:

- `089` Spewpa -> `illustration_rare`, `shiny_rare`
- `090` Rowlet -> `illustration_rare`, `shiny_rare`
- `092` Aurorus -> `illustration_rare`, `shiny_rare`
- `093` Dedenne -> `illustration_rare`, `shiny_rare`
- `094` Clefairy -> `illustration_rare`, `shiny_rare`
- `095` Espurr -> `illustration_rare`, `shiny_rare`

For each of those numbers:

- both rows keep distinct canonical identity
- both rows use the same `representative_image_url`
- `image_status = representative_shared_collision`
- `image_note` explains that the exact variant image is still pending

This follows `REPRESENTATIVE_IMAGE_CONTRACT_V1` without polluting `image_url`.

## UI Fallback Result

Representative rendering is now surfaced honestly on the bounded card surfaces patched in this pass:

- public card page
- public set grid
- explore card grid / list / table surfaces
- founder warehouse preview
- Flutter card detail
- Flutter public set detail

Representative rows now render through read-model fallback and are visibly labeled.

## Decision

Perfect Order is fully closed in this pass.

Closed:

- canon
- warehouse
- founder-gated promotion
- JustTCG mapping
- representative image coverage
- honest UI fallback labeling

Still pending in a future optional quality pass:

- exact variant-specific imagery for the 12 collision rows

That future upgrade is non-blocking because `image_url` remains reserved for exact images and representative rendering stays explicitly marked.
