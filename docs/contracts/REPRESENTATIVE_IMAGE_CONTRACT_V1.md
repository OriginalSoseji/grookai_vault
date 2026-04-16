# REPRESENTATIVE_IMAGE_CONTRACT_V1

## Status

ACTIVE

## Scope

Governs how Grookai Vault handles images when exact variant-specific images are unavailable.

This contract applies to:

- all `card_prints`
- any future image-enrichment workers
- any future image-related read or UI systems

## Purpose

Define a lawful, transparent system for displaying images when:

- the canonical card identity is known and correct
- but an exact, variant-specific image is not available

The goals are:

- preserve canonical truth
- avoid misleading users
- maintain system trust
- allow full UI usability even with incomplete image coverage

## Core Principle

Grookai must never present a representative image as if it were the exact image of a canonical card.

Identity may be exact while imagery is approximate.

## Image Types

Grookai supports two image types:

1. exact image
2. representative image

## Exact Image

Definition:

An image that is confirmed to represent the exact canonical card identity.

Requirements:

- matches `(set_code, number_plain, variant_key)`
- correct for variant-specific identity when applicable
- sourced from a trusted, lawful image source

Storage:

- `card_prints.image_url`

Status:

- `image_status = exact`

## Representative Image

Definition:

A temporary or shared image used when the exact variant-specific image is unavailable.

Allowed use cases:

- same-number variant collisions such as IR vs Shiny
- stamped cards lacking unique image coverage
- source-backed sets missing image data
- any case where identity is confirmed but image is not

Storage:

- `card_prints.representative_image_url`
- `card_prints.image_status`
- optional: `card_prints.image_note`

Representative status values:

- `representative_shared`
- `representative_shared_collision`
- `representative_shared_stamp`

## Strict Rules

1. `image_url` must remain `NULL` if an exact image is not confirmed.
2. Representative images must never:
   - overwrite `image_url`
   - be treated as canonical truth
   - be indistinguishable from exact images in the UI
3. Representative images must:
   - be explicitly marked in UI
   - be replaceable without side effects

## UI Requirements

When displaying a representative image, the UI must surface a visible label such as:

- `Representative Image`
- `Shared Preview`
- `Exact Variant Image Pending`

Optional explanatory text is allowed:

`This card's identity is confirmed, but the displayed image is a shared representative image until the exact variant image is available.`

The UI must not:

- imply exactness
- hide representative status
- visually treat representative images as final truth

## Collision Rule

For same-number identity collisions such as:

- `Spewpa 089/088 (illustration_rare)`
- `Spewpa 089/088 (shiny_rare)`

Allowed:

- both rows may use the same representative image

Required:

- both rows remain distinct identities
- UI indicates representative status

Forbidden:

- assigning identical images as if they were exact matches
- collapsing rows due to image similarity

## Stamped Card Rule

Stamped cards may use non-stamped artwork as representative images if:

- identity is correct
- stamped distinction is preserved in identity
- UI clearly marks the image as representative

## Data Model Requirements

The system must distinguish:

- exact: `image_url`
- representative: `representative_image_url`
- status: `image_status`
- optional note: `image_note`

The system must allow:

- future replacement of representative images with exact images
- tracking which rows still require exact image coverage

## Enrichment Rule

Image enrichment must follow:

1. attempt exact match
2. if exact match fails:
   - assign representative image if lawful and deterministic
3. if ambiguous:
   - leave both exact and representative image fields `NULL`
   - mark as unresolved

Representative assignment must be deterministic:

- same input -> same representative image

## Auditability

The system must allow querying:

- rows with exact images
- rows with representative images
- rows missing images entirely

Example audit surfaces:

- `image_status`
- `image_url is null`
- `representative_image_url is not null`

## Anti-Drift Rule

The system must never:

- silently upgrade representative images to exact
- overwrite exact images with representative images
- lose track of image provenance
- treat image similarity as identity equivalence

## Relationship To Existing Image Contracts

This contract complements, not replaces:

- `CANON_IMAGE_RESOLUTION_CONTRACT_V1`
- `SOURCE_IMAGE_ENRICHMENT_V1`

`CANON_IMAGE_RESOLUTION_CONTRACT_V1` still governs how exact canon images are stored and resolved.

`REPRESENTATIVE_IMAGE_CONTRACT_V1` governs the additive fallback lane used when exact imagery is not available.

## Implementation Note

Schema/read-model alignment is now present:

- `card_prints.image_url` remains the exact-image lane
- `card_prints.representative_image_url` now exists
- `card_prints.image_note` now exists
- `card_prints.image_status` now accepts the V1 vocabulary
- read surfaces may now expose:
  - exact image
  - representative image
  - derived display image
  - derived display image kind

Compatibility note:

- legacy `ok`, `placeholder`, and `user_uploaded` values remain temporarily allowed in the DB constraint for compatibility
- deterministic rows were normalized toward `exact` / `missing`
- representative-image writes and UI rendering remain a later bounded pass

## Result

Grookai can safely support:

- cards with confirmed identity but incomplete image coverage
- same-number collision rows without image-driven identity drift
- stamped and special-case cards whose exact imagery is not yet available
- future image improvements without breaking canonical truth
