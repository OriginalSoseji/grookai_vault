# PRINTING_IDENTITY_IMAGE_SUGGESTION_LINK_V1_20260519

Date: 2026-05-19
Status: implemented

## Scope

Wire the card detail `Suggest image` affordance into the existing Warehouse intake route without adding a new upload system.

## Changes

- `Suggest image` now links to `/submit` when a selected child printing is using the parent/base card image.
- The link carries safe query context:
  - `intent=MISSING_IMAGE`
  - parent `gv_id`
  - public child printing reference when available, otherwise finish key/label
  - selected finish label
  - image gap reason
- Unauthenticated users are routed through login with the `/submit` context preserved.
- `/submit` now accepts the query context and prefills:
  - `MISSING_IMAGE`
  - notes describing the card, selected version, printing reference, and image gap reason.

## Existing Intake Boundary Preserved

The actual upload still uses the existing Warehouse path:

1. browser uploads evidence image
2. `warehouse-intake-v1` validates the request
3. `warehouse_intake_v1` writes candidate/evidence rows atomically
4. founder review remains required before promotion

## Known Constraint

The existing `MISSING_IMAGE` intake still requires a TCGPlayer ID unless the submission is scan-backed. This lane does not change that backend rule.

The link reduces user friction and preserves selected-version context in notes, but a later structured-context lane is still needed for first-class parent/child printing references in `reference_hints_payload`.

## Not Changed

- No DB writes were performed.
- No migrations were added or applied.
- No scanner code changed.
- No pricing code changed.
- No parent `gv_id` behavior changed.
- No Species Dex denominator changed.
- No public child printing route was enabled.
- No image promotion pipeline was added.

