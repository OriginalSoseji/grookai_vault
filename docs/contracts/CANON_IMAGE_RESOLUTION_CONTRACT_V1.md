# CANON_IMAGE_RESOLUTION_CONTRACT_V1

## Status

ACTIVE

## Type

Storage + Read Resolution Contract

## Purpose

Define the lawful way canonical card images are stored and rendered when the source image is a private derived asset instead of a durable public URL.

This contract unblocks:

- promotion executor image attachment
- founder/public rendering of normalized identity images
- future image refresh without storing expiring signed URLs in canon

## Core Rule

Canon images are resolved at read time.

They are not stored as signed URLs.

## Storage Model

For `public.card_prints`:

- `image_source` records the image source class
- `image_path` stores the durable storage object path for identity-backed images
- `image_url` remains available for legacy external/public URL sources
- `image_alt_url` remains available for external alternate URL compatibility

`image_path` is the source of truth for identity-backed canon images.

## Source Classes

V1 recognizes these canonical source classes:

- `identity`
- `external`
- `none`

Repo compatibility note:

Existing source values such as `tcgdex`, `ptcg`, and `pokemonapi` remain lawful legacy external-compatible values in current data. Read paths must treat them as external URL sources until they are normalized later.

## Identity Image Rule

When `image_source = 'identity'`:

- `image_path` must contain the canonical storage path
- `image_url` must not be treated as required
- runtime resolution must derive a signed URL from `image_path`

## External Image Rule

When the image source is external-compatible:

- app reads may use `image_url`
- no storage signing is required

## None Rule

When no lawful image exists:

- renderers must return no image/fallback
- no signed URL may be invented

## Resolution Model

The app/backend resolves canon images this way:

1. if `image_source = 'identity'` and `image_path` exists
   - sign `image_path` at runtime
   - return the signed URL
2. else if an external-compatible public URL exists
   - return `image_url`
   - otherwise fall back to `image_alt_url`
3. else
   - return no image

No signed URL or expiration timestamp may be stored back into canon.

## Security

- canonical identity images remain private in storage
- read access is granted only through runtime signed URLs
- no bucket is made public for canon identity rendering

## Replay Safety

- the durable stored value is the stable `image_path`
- the resolved signed URL may change over time, but that change is not canon state
- repeated reads of the same `image_path` must resolve the same underlying asset

## Promotion Executor Compatibility

Promotion execution must attach normalized identity images by writing:

- `image_source = 'identity'`
- `image_path = <normalized_front_storage_path>`

It must not:

- store signed URLs
- expose public bucket URLs
- overwrite raw warehouse evidence

## Founder / Public Rendering Rule

Founder review and public card surfaces must use the same canon image resolution rule for canonical card images.

Founder evidence previews remain separate and may continue to resolve warehouse evidence directly.

## Derived Asset Boundary

Warehouse normalization produces derived assets only.

Raw warehouse evidence remains immutable provenance.

Canon may reference only the derived normalized path selected for promotion, not the original evidence path.

## Failure Behavior

If `image_source = 'identity'` but `image_path` cannot be signed:

- read surfaces must fail closed to fallback/no-image
- canon data must remain unchanged
- no synthetic URL may be returned

If promotion has no lawful normalized asset path:

- executor must not attach a canon identity image

## Result

This contract makes storage paths first-class canon image identity inputs while keeping runtime rendering secure, durable, and replay-safe.
