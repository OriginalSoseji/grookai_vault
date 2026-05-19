# Child Printing Image Promotion V1 Audit

Date: 2026-05-19

Status: Audit and contract only. No migration applied. No DB write performed by this audit.

## Objective

Define the first safe lane for promoting reviewed child-printing images into canon without misusing parent card image fields.

## Current Live Findings

Read-only live checks showed:

- `public.card_printings` row count: `55,582`
- active owned rows with `vault_item_instances.card_printing_id`: `5`
- missing-image warehouse candidates already resolving to image-related actions: `5`
- candidate `5b20c5f5-836f-4c48-ae5e-0d3cdb1191c6` now resolves to:
  - state: `REVIEW_READY`
  - decision: `CHILD`
  - finish: `reverse`
  - proposed action: `CREATE_CARD_PRINTING`

## Current `card_printings` Columns

Live schema currently has:

- `id`
- `card_print_id`
- `finish_key`
- `created_at`
- `is_provisional`
- `provenance_source`
- `provenance_ref`
- `created_by`
- `printing_gv_id`

There are no child-level image columns.

## Current Parent Image Model

Parent canonical images use `public.card_prints` fields:

- `image_source`
- `image_path`
- `image_url`
- `image_alt_url`
- `representative_image_url`
- `image_status`
- `image_note`

Public read models and card detail logic currently resolve parent image fields and use representative fallback when exact images are missing.

## Promotion Gap

The existing promotion executor supports:

- `CREATE_CARD_PRINT`
- `CREATE_CARD_PRINTING`
- `ENRICH_CANON_IMAGE`

`ENRICH_CANON_IMAGE` writes parent `card_prints` image fields. It is not a safe target for a child-specific Reverse Holo, Poké Ball, Master Ball, or Holo image.

Therefore child image suggestions can be classified, reviewed, and staged toward child identity, but they cannot yet be promoted into a canonical child image without either:

- incorrectly writing the parent image, or
- creating a new child image storage surface.

## Required Contract Decision

Use child image fields on `public.card_printings`.

Do not store child images in parent fields.

Do not overload `representative_image_url` for child-specific images.

Do not enable public child routes in this lane.

## Proposed Schema

Nullable V1 columns:

```sql
alter table public.card_printings
  add column image_source text null,
  add column image_path text null,
  add column image_url text null,
  add column image_alt_url text null,
  add column image_status text null,
  add column image_note text null;
```

Rationale:

- mirrors the parent image model
- supports private normalized storage paths
- supports external image URLs if needed
- keeps existing child rows compatible
- avoids forcing all child printings to have images

## Proposed Executor Action

Add:

```text
ENRICH_CARD_PRINTING_IMAGE
```

This action updates only one `card_printings` row.

It must validate the child printing target and must not update `card_prints`.

## Two-Step Rule

For candidates where the child printing does not exist:

1. create/reuse the child printing through `CREATE_CARD_PRINTING`
2. promote the child image only after a concrete `card_printing_id` exists

Do not combine child creation and child image enrichment in V1 unless a separate compound-action contract is approved.

## Read Model Changes Needed

Update these surfaces after schema exists:

- `apps/web/src/lib/getPublicCardByGvId.ts`
- `apps/web/src/lib/publicSets.ts`
- Dex species detail read helpers
- vault exact-copy display helpers
- card detail finish selector data

Required rendering behavior:

- selected child with exact child image: show child image
- selected child without child image: show parent fallback and label it clearly
- parent route remains canonical

## Founder Review Changes Needed

Founder review must distinguish:

- parent image enrichment
- child printing image enrichment
- child printing creation

For child image enrichment, display:

- parent card
- child printing
- finish label
- current child image status
- parent fallback status
- normalized asset readiness
- exact child image fields to be written

## Current Espurr Case

For `GV-PK-ME03-095-SHINY-RARE` Reverse Holo:

- parent card exists
- requested finish is `reverse`
- no child printing row currently exists for that parent/finish
- the lawful first write is child printing creation
- child image promotion remains blocked until child image schema and `ENRICH_CARD_PRINTING_IMAGE` exist

## Risk Analysis

High risk:

- accidentally writing child-specific images into parent image fields
- treating parent representative images as exact child images
- allowing raw evidence paths into public canon

Medium risk:

- child printing exists but parent fallback causes UI to look exact
- founder review write plan appears ready without normalized image asset
- vault/Dex tiles continue to show fallback without clear label

Low risk:

- nullable schema addition itself, if replay passes and read paths degrade safely

## Implementation Plan

1. Add nullable child image columns in a reviewed migration.
2. Add child image read resolver mirroring parent canon image resolution.
3. Update card/detail/set/Dex/vault read models to project child image fields.
4. Add `ENRICH_CARD_PRINTING_IMAGE` to interpreter/review/staging/executor allowlists.
5. Implement executor preflight and post-write proof for child image enrichment.
6. Keep public child routes disabled.
7. Run browser smoke on:
   - `/card/GV-PK-ME03-095-SHINY-RARE?printing=reverse`
   - `/sets/me03`
   - `/dex/espurr`
   - `/vault`

## Verification Plan

Before migration:

- `supabase migration list --linked`
- strict migration preflight
- local reset
- read-only schema check that columns are absent

After migration:

- child image columns exist
- existing `card_printings` count unchanged
- all new columns nullable
- public build passes

After executor implementation:

- dry-run child image promotion
- create/reuse child printing first when needed
- child image enrichment writes only `card_printings`
- parent image checksum unchanged
- selected child image renders when present
- fallback label renders when absent

## Stop Conditions

Stop if:

- schema drift exists
- migration replay fails
- executor needs to write parent image fields for child-specific images
- normalized asset package is missing
- public child routes become required
- Species Dex denominator would change

## Confirmed Non-Changes

- no parent `gv_id` change
- no child `printing_gv_id` change
- no Species Dex denominator change
- no scanner change
- no pricing change
- no public child route enablement
