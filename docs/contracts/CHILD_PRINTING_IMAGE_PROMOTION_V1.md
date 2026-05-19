# Child Printing Image Promotion V1

Status: Draft contract for governed implementation.

## Purpose

`CHILD_PRINTING_IMAGE_PROMOTION_V1` defines how a founder-reviewed warehouse image suggestion can become a canonical image for an independently ownable child printing such as Reverse Holo, Poké Ball, Master Ball, or Holo.

This contract closes the current gap where child printings have public identity and ownership support, but canonical images still live only on parent `card_prints`.

## Scope

In scope:

- canonical image storage for `public.card_printings`
- founder promotion write plans for child-printing images
- promotion executor support for child image targets
- public/app read model fallback from child image to parent image
- card detail, set, Dex, and vault display of selected child images

Out of scope:

- public `/card/<printing_gv_id>` routes
- Species Dex denominator changes
- pricing changes
- scanner changes
- automatic image promotion without founder approval
- auto-promoting raw user uploads into canon

## Current Problem

Parent image fields are:

- `card_prints.image_source`
- `card_prints.image_path`
- `card_prints.image_url`
- `card_prints.image_alt_url`
- `card_prints.representative_image_url`

Child printings currently have:

- `card_printings.id`
- `card_printings.card_print_id`
- `card_printings.finish_key`
- `card_printings.printing_gv_id`

They do not have a canonical image target. Therefore a Reverse Holo image suggestion can resolve to a child printing, but the executor has no lawful child image field to update.

## Identity Boundary

Parent print identity remains `card_prints.gv_id`.

Child printing identity remains `card_printings.printing_gv_id`.

Child images must attach to the child printing row, not to the parent print, when the submitted image represents a finish-specific object.

## Schema Direction

Preferred nullable schema:

```sql
alter table public.card_printings
  add column image_source text null,
  add column image_path text null,
  add column image_url text null,
  add column image_alt_url text null,
  add column image_status text null,
  add column image_note text null;
```

Column meanings mirror the parent card image model:

- `image_source`: `identity`, `external`, or legacy external-compatible source label
- `image_path`: durable private storage path for normalized identity-backed images
- `image_url`: external/public exact child image URL
- `image_alt_url`: external/public alternate child image URL
- `image_status`: lifecycle/status label for review and display
- `image_note`: founder-readable note

V1 columns must remain nullable.

V1 must not require every child printing to have its own image.

## Image Resolution Rule

Child printing image resolution order:

1. child `card_printings.image_source = 'identity'` with `image_path`
2. child `card_printings.image_url`
3. child `card_printings.image_alt_url`
4. parent canonical display image
5. parent representative image
6. no image

The UI must expose when it is using a parent fallback for a selected child printing.

## Promotion Action

Preferred V1 action:

```text
ENRICH_CARD_PRINTING_IMAGE
```

This action may update only the resolved child printing image fields.

It must not update parent `card_prints` image fields.

It must not create public child routes.

It must not alter `card_prints.gv_id`, `card_printings.printing_gv_id`, ownership, pricing, or Dex denominators.

## Existing Action Compatibility

`CREATE_CARD_PRINTING` remains valid for creating a missing child printing row.

For a missing-image submission where the child row does not yet exist, V1 may use a two-step governed path:

1. stage/create the child printing row
2. stage/enrich the child printing image after the child id exists

The executor must not combine a child-row create and child-image write unless a later contract explicitly allows a compound action with complete post-write proofs.

## Founder Review Rule

Founder review must show:

- parent card print target
- child printing target or proposed child printing target
- finish label
- current child image state
- parent fallback image state
- normalized promotion image readiness
- exact fields that would be written

If the child printing does not exist yet, image promotion must be blocked or staged as child-row creation first.

## Normalization Rule

Only normalized promotion assets may be attached as `image_path`.

Raw warehouse evidence remains immutable provenance.

If no normalized front asset exists, the child image write must fail closed.

## Executor Rule

Executor preflight for child image enrichment must validate:

- staging row is founder approved
- action type is `ENRICH_CARD_PRINTING_IMAGE`
- matched `card_printing_id` exists
- matched child belongs to the matched parent when parent is present
- normalized front image path or lawful public image URL exists
- target child image field is empty or matches the desired value idempotently
- no parent image fields are touched

Post-write proof must validate:

- only the intended `card_printings` row changed
- child image field now resolves
- parent `card_prints` image fields are unchanged
- parent and child public identities are unchanged
- Species Dex denominator is unchanged

## App Read Model

Card detail, set tiles, Dex variant options, and vault copy views may consume child image fields when present.

Selected child printing should render the child exact image when available.

If the selected child image is missing, the UI should continue to show the parent fallback with a clear fallback label and a review-only suggestion path.

## Security

Private normalized images must be stored as durable paths and signed at read time.

Signed URLs must not be stored in canon.

User uploads must not become canon until founder-approved promotion execution succeeds.

## Migration Gate

Before applying schema:

- local migration replay passes
- linked ledger is aligned
- schema confirms no existing child image columns
- read models are prepared for nullable columns
- executor dry-run proves no parent image writes for child image candidates

## Rollback

Schema rollback is nullable-column removal only before writes.

After writes, rollback must be compensating:

- clear child image fields only for rows linked to the failed staging execution
- leave warehouse evidence and events intact
- leave parent image fields untouched

## Non-Regression Requirements

- no parent `gv_id` changes
- no child `printing_gv_id` changes
- no Species Dex denominator changes
- no scanner changes
- no pricing changes
- no public child routes
- no raw UUID exposure
