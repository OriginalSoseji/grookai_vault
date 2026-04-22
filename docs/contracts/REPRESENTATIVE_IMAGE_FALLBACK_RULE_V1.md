# REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1

Status: ACTIVE
Type: Representative Image Fallback Contract
Scope: deterministic sibling-base representative fallback for stamped canonical rows

## Purpose

Defines when representative imagery may fall back to a sibling base image for a stamped
canonical row whose identity is already correct but whose exact stamped image is unavailable.

This rule exists so stamped rows can receive honest visual coverage without mutating exact-image
truth or relying on undocumented worker behavior.

## Relationship To Existing Contracts

- `REPRESENTATIVE_IMAGE_CONTRACT_V1` remains the authority for exact vs representative image
  boundaries, storage, and UI truth requirements.
- `SOURCE_IMAGE_ENRICHMENT_V1` remains the authority for exact-match-first source-backed image
  enrichment.
- This rule applies only after exact stamped image assignment is unavailable or unusable and a
  lawful representative fallback is needed for an already-canonical stamped row.

## Allowed Use Case

Sibling-base representative fallback is allowed only when all of the following are true:

- the target canonical row identity is already correct
- the target row is stamped or otherwise variant-bearing within the same printed identity family
- no exact stamped image is available for lawful write to `image_url`
- the routed promo/source image is unavailable or unusable for representative assignment
- a deterministic sibling base row exists for the same underlying printed identity family
- the sibling base image is visually representative enough for display-only use
- the UI/read model continues to mark the image as representative

## Required Preconditions

All of the following must be true before fallback activates:

1. the target row is an existing valid canonical `card_prints` row
2. `card_prints.image_url` is `NULL` or empty for the target row
3. no more specific lawful representative image source has already been assigned to the target row
4. the sibling base row is deterministically identified from the same identity family
5. the sibling base row has a usable exact image or a stable representative source suitable for
   replayable fallback
6. the fallback does not cross unrelated sets, eras, or routed identity families
7. the fallback remains display-only and does not change canonical identity

## Forbidden Uses

Sibling-base fallback is not allowed when:

- the sibling base row is ambiguous
- multiple candidate base rows exist with no deterministic winner
- the fallback would cross unrelated sets, eras, or routing families
- the fallback would materially mislead collectors about the physical stamped card
- a more correct exact or representative image source already exists
- the write would place fallback imagery into `image_url`

## Storage Rule

Sibling-base fallback may write only to:

- `card_prints.representative_image_url`
- `card_prints.image_status`
- `card_prints.image_note`
- `card_prints.image_source`

Sibling-base fallback must never write to:

- `card_prints.image_url`

## Status Rule

For stamped fallback governed by this rule:

- `image_status = representative_shared_stamp`

## Note Rule

Fallback rows must carry a clear representative note such as:

`Identity is confirmed. Displayed image is a representative image until the exact stamped image is available.`

## Determinism Rule

Given the same target row, the same audited sibling-base proof, and the same available image
inputs, the system must produce the same fallback selection on every replay.

## Auditability Rule

The system must preserve enough replayable evidence to explain:

- why sibling-base fallback activated
- which sibling base row supplied the image
- why exact stamped image assignment was unavailable or unusable

This evidence may live in worker output, dry-run/apply summaries, or checkpoint artifacts. This
rule does not require a new schema field.

## Anti-Drift Rule

Representative sibling-base fallback must never be silently upgraded to exact imagery.

Any later exact-image replacement must occur through the normal exact-image path and must write to
`image_url` only when exact proof exists.

## Result

Grookai may provide honest visual coverage for stamped rows while preserving exact identity truth,
determinism, and auditability.

## Non-Goals

This contract does not:

- change canonical identity
- widen image enrichment into a global repair pass
- authorize schema changes
- authorize UI changes
- replace exact-image sourcing rules
