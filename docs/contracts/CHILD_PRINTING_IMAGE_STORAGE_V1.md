# CHILD_PRINTING_IMAGE_STORAGE_V1

## Purpose

Store reviewed finish-specific images on `card_printings` so independently ownable versions such as Reverse Holo, Poke Ball, Master Ball, and Holo can display the exact reviewed image when selected.

## Storage Contract

- `card_printings` may carry nullable image fields:
  - `image_source`
  - `image_path`
  - `image_url`
  - `image_alt_url`
  - `image_status`
  - `image_note`
- These fields are optional during rollout.
- Parent `card_prints` image fields remain unchanged and remain the canonical parent route image.
- Child image promotion must never overwrite parent image fields.

## Warehouse Action

`ENRICH_CARD_PRINTING_IMAGE` is the only governed V1 action that can attach image evidence to an existing child printing.

Required gates:

- candidate is founder approved before staging/execution
- identity resolution is `ATTACH_PRINTING`
- identity audit status is `PRINTING_ONLY`
- target parent `card_prints.id` is resolved
- target child `card_printings.id` is resolved and belongs to the parent
- normalized promotion asset or lawful public image URL exists
- executor writes only `card_printings` image fields

## UI Contract

When a selected child printing has a reviewed child image:

- set tiles prefer the child printing image
- card detail route context prefers the selected child printing image
- add-to-vault still carries the selected `card_printing_id`

When the selected child printing has no reviewed child image:

- UI continues to fall back to the parent/base image
- the existing `Using base image` notice remains the correct user-facing state

## Route Policy

No public child printing routes are enabled by this contract. Parent `/card/<parent_gv_id>` remains canonical.

## Non-Goals

- no scanner changes
- no pricing changes
- no Species Dex denominator changes
- no public `/card/<printing_gv_id>` route
- no automatic user image promotion without founder approval
