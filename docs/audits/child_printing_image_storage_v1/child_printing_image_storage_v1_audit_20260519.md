# CHILD_PRINTING_IMAGE_STORAGE_V1 Audit

Date: 2026-05-19

## Scope

This lane adds the first governed storage and execution path for finish-specific child printing images.

## Schema Plan

Migration drafted:

`supabase/migrations/20260519163000_child_printing_image_storage_v1.sql`

The migration adds nullable image fields to `public.card_printings` and extends warehouse action constraints to allow `ENRICH_CARD_PRINTING_IMAGE`.

No migration was applied by this implementation pass.

## Warehouse Behavior

New governed action:

`ENRICH_CARD_PRINTING_IMAGE`

The action is allowed only for resolved child-printing image enrichment. The stage and executor workers require:

- founder approval before staging/execution
- `PRINTING_ONLY` identity audit
- `ATTACH_PRINTING` identity resolution
- resolved parent `card_print_id`
- resolved child `card_printing_id`
- child belongs to the parent

Executor writes are limited to:

- `card_printings.image_source`
- `card_printings.image_path`
- `card_printings.image_url`
- `card_printings.image_alt_url`
- `card_printings.image_status`
- `card_printings.image_note`

Parent `card_prints` image fields are not modified by `ENRICH_CARD_PRINTING_IMAGE`.

## App Read Model

The web read model detects whether child image storage columns exist before selecting them. This allows safe deployment before the migration is applied.

When the columns exist:

- card detail printings include child image fields
- set page printings include child image fields
- selected set tile images prefer child image fields
- card detail route context prefers a selected child image when loaded with `?printing=<card_printing_id>`

When the columns are absent or the selected child has no child image:

- UI falls back to parent/base image
- `Using base image` remains the displayed fallback state

## Guardrail Confirmation

- No parent `gv_id` changes.
- No Species Dex denominator changes.
- No scanner changes.
- No pricing changes.
- No public child printing routes enabled.
- No DB writes performed in this pass.

## Follow-Up Apply Gate

Before production execution:

1. Run migration replay/preflight.
2. Apply migration only if ledger is clean.
3. Reclassify a known missing child image candidate.
4. Stage after founder approval.
5. Execute promotion.
6. Verify child image appears only for the selected child printing.
7. Verify parent card image fields are unchanged.
