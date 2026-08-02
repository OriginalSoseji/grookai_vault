# Card Display Identity V1

## Purpose

Every Grookai surface that identifies a canonical card print to a collector must make the exact printing understandable. A base card name alone is not an acceptable user-facing identity when Grookai knows a meaningful variant or printed identity modifier.

This contract governs visible labels, accessibility labels, image labels, selection controls, messages, share subjects, exports, and review tools in web and mobile clients.

## Authority

The authoritative display inputs are:

1. `card_prints.name`
2. `card_prints.variant_key`
3. `card_prints.printed_identity_modifier`
4. governed child-printing finish context when the selected object is a child printing
5. set identity context where a set contract supplies a deterministic discriminator

Clients must use `resolveDisplayIdentityFromFields` or `resolveCardPrintDisplayIdentity`. They must not build collector-facing card identity by concatenating arbitrary strings.

## Invariants

- A meaningful `variant_key` must be shown with the base card name.
- `printed_identity_modifier` is the fallback when no meaningful variant key is available.
- A selected child printing must retain its governed finish label.
- Set name/code and collector number remain visible nearby. They do not replace variant context.
- The same resolved identity must be used for visible text, semantics, image labels, messages, and share subjects.
- Canonical mutations continue to store the canonical base name. Display formatting must not rewrite canonical identity.
- A base/default/null variant must not be presented as a named variant unless the surrounding list deterministically distinguishes it as `Standard printing` from sibling variants.
- Variant identity must never be parsed or inferred from `gv_id`.
- When a surface cannot load known variant context, it must preserve `card_print_id` or GV-ID context for recovery. It must not claim two distinct prints are the same.

## Required Data Contract

Any DTO, RPC result, scanner candidate, or persisted presentation object that can render a canonical card print must provide one of:

- canonical `name`, `variant_key`, and `printed_identity_modifier`; or
- a server-resolved display identity produced from the same governed fields.

Rarity, finish, condition, grade, ownership, and price are useful supporting context but are not substitutes for canonical variant identity.

## Duplicate Groups

When multiple rows share the same base name, set, and collector number:

- every meaningful variant is displayed;
- the base row may be labeled `Standard printing` for contrast;
- every row retains its own canonical card-print ID;
- rows must never be collapsed solely because their base labels or images match.

## Covered Surfaces

- search and set browsing
- Card Detail and comparison
- vault, exact-copy, slab, and public collector views
- binders and binder templates
- all scanner generations and candidate/result sheets
- onboarding card selection
- Network, nearby, Pulse, inbox, and card messages
- Grookai Dex and wall showcases
- Grookai Objects, memories, lots, and sale artifacts
- founder and review tooling
- accessibility, image zoom, share, and export labels

## Enforcement

Source-contract tests inventory the active card-rendering paths and require governed display identity usage and variant transport. New card surfaces must be added to that inventory before release.

