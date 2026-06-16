# IMAGE_CONFIDENCE_CONTRACT_V1

## Status

ACTIVE

## Scope

This contract governs image confidence for English physical Pokemon card display, especially child
printings in `card_printings`.

It applies to:

- public card/set/detail display
- vault and collection display
- image truth audits
- source-image acquisition reports
- future child-printing image writes

It does not authorize:

- DB writes
- migrations
- image promotion
- parent image overwrites
- automatic warehouse apply

## Purpose

Grookai must provide useful card images without misleading collectors about exact visual truth.

The correct policy is:

```text
Display coverage and exact image truth are separate claims.
```

A card may have a usable display image while still lacking the exact visual variant image.

Examples:

- a Master Ball printing may temporarily show the base card image
- a stamped card may temporarily show the unstamped card image
- a reverse holo printing may temporarily show the normal card image
- a cosmos holo printing may temporarily show the base holo image

This is allowed only when Grookai labels the image honestly.

## Core Rule

Grookai may show a representative image for a verified printing, but it must never present that
representative image as exact.

The user-facing truth must be:

```text
This is the correct printing, but this image is not yet the exact variant image.
```

## Image Confidence Vocabulary

### exact

Definition:

The image is proven to depict the exact `card_printing` or canonical parent image target.

For child printings, exact means the image matches:

- set
- card number
- card name
- finish
- stamp or printed modifier, when present
- parallel family, when present

Allowed examples:

- exact reverse holo image for the reverse child printing
- exact Master Ball reverse image for the Master Ball child printing
- exact stamped image for the stamped identity row
- exact cosmos image for the cosmos child printing

Storage rule:

- may populate exact image fields only after source proof and dry-run/apply gates
- for child printings, exact image truth targets `card_printings`
- parent image fields must not be overwritten to repair a child printing

### representative

Definition:

The image is the correct card identity at a useful display level, but it is not proven to show the
exact child finish, stamp, or parallel.

Required match:

- set
- card number
- card name
- printed identity family

Allowed mismatch:

- finish visual
- stamp overlay
- holo/reverse treatment
- parallel pattern
- product-exclusive visual treatment

Representative images are valid for display coverage only.

They are not valid as exact image truth.

### missing_variant_visual

Definition:

A stricter representative state where Grookai knows the image is missing a specific visual property.

Use when the identity is correct but the displayed image is known not to show one or more required
variant visuals.

Examples:

- correct card, missing Master Ball pattern
- correct card, missing Poke Ball pattern
- correct card, missing Rocket reverse treatment
- correct card, missing stamp
- correct card, missing cosmos/cracked ice pattern
- correct card, normal image shown for reverse holo

This is the preferred label for the user's stated case:

```text
This is the printing, but not the correct variant image.
```

### missing

Definition:

No safe display image is available.

Use when Grookai cannot prove even representative image identity.

### blocked

Definition:

An image candidate exists, but it is unsafe to use.

Reasons include:

- source identity conflict
- non-English or digital source mismatch
- unresolved set identity
- ambiguous card number/name
- source URL cannot be preserved
- image may depict a different variant than claimed
- licensing or access constraints block use

## User-Facing Labels

The UI must distinguish confidence without making the interface noisy.

Recommended labels:

| confidence | user-facing label | user-facing explanation |
| --- | --- | --- |
| `exact` | Exact image | This image matches the selected printing. |
| `representative` | Representative image | Correct card, exact printing image not yet verified. |
| `missing_variant_visual` | Variant image pending | Correct card, but this image may not show the exact finish, stamp, or parallel. |
| `missing` | Image unavailable | No verified display image is available yet. |
| `blocked` | Image under review | A possible image exists but needs verification. |

Forbidden labels:

- "exact" for a representative image
- "verified image" for a representative image
- "Master Ball image" when the image does not show Master Ball treatment
- "stamped image" when the image does not show the stamp
- any label that hides a known missing visual variant

## Source Proof Rules

### Exact Image Proof

Exact confidence requires one of:

- source image URL and source page proving set + card number + card name + finish/modifier
- normalized owned/warehouse scan tied to the exact `card_printing_id`
- official or checklist/product source that explicitly depicts the exact visual variant

Exact confidence must preserve:

- source name
- source URL
- retrieved date when available
- evidence label or alt/title proof
- target `card_printing_id` or parent `card_print_id`

### Representative Image Proof

Representative confidence requires:

- source proves correct card identity
- source URL is preserved
- no evidence says the image belongs to a conflicting card or set

Representative confidence may use:

- TCGdex card-level image
- PokemonTCG.io card-level image
- official gallery/card database image
- parent canonical image
- source-backed base card image

Representative confidence must not use an image when the set/card identity is unresolved.

### Missing Variant Visual Proof

Use `missing_variant_visual` when:

- the target printing has a visual distinction, and
- the display image is only a base/representative image, and
- the exact visual treatment is not present or not proven.

This status is not a failure. It is an honest coverage state.

## Child Printing Rules

For child printings such as:

- reverse holo
- holo
- cosmos
- cracked ice
- Poke Ball reverse
- Master Ball reverse
- Rocket reverse
- stamped or modifier-bearing printings

The image system must answer two separate questions:

1. Can Grookai show a safe display image?
2. Can Grookai claim the image is exact for this child printing?

If answer 1 is yes and answer 2 is no, the row must be treated as `representative` or
`missing_variant_visual`, not `exact`.

## Parent Overwrite Rule

Child image repair must never overwrite parent `card_prints` image fields.

Parent images may be used as representative fallback for child printings, but the exactness claim
belongs to the selected child printing.

## Reporting Metrics

Image Truth reports must track at least:

- exact image coverage
- representative display coverage
- missing variant visual count
- missing display count
- blocked image candidates
- source URL coverage
- exact source image candidate count

Reports must not combine exact coverage and representative display coverage into one misleading
"image coverage" number.

## Promotion Gates

No image write may occur unless the package proves:

- target table and row
- intended confidence status
- source URL preservation
- no parent overwrite for child image repair
- rollback-only dry-run proof
- post-apply verification plan

Representative bulk fills are allowed only after a dry-run proves:

- rows are English physical
- source identity is deterministic
- status is not `exact`
- exact child image fields are not falsely populated

## Relationship To Existing Contracts

This contract complements:

- `REPRESENTATIVE_IMAGE_CONTRACT_V1`
- `REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1`
- `CHILD_PRINTING_IMAGE_STORAGE_V1`
- `CHILD_PRINTING_IMAGE_PROMOTION_V1`
- `SOURCE_IMAGE_ENRICHMENT_V1`

`REPRESENTATIVE_IMAGE_CONTRACT_V1` remains the base authority for exact-vs-representative
separation.

`IMAGE_CONFIDENCE_CONTRACT_V1` adds the richer confidence vocabulary required by child-printing
truth work.

## Final Principle

Grookai should prefer honest visual coverage over fake exactness.

```text
A representative image is useful.
An unlabeled representative image is a trust bug.
```
