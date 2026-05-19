# PRINTING_IDENTITY_UI_V1

Status: Draft contract
Date: 2026-05-18

## Purpose

Define how Grookai Vault presents finish-specific child printing identity across public set pages, card detail pages, Grookai Dex, and Vault surfaces.

This contract is display/read-model only. It does not authorize schema changes, DB writes, scanner changes, Species Dex denominator changes, pricing changes, or public child-printing routes.

## Identity Layers

### Parent Print Identity

`card_prints.gv_id` remains the canonical public card identity.

Parent routes stay canonical:

```text
/card/<parent_gv_id>
```

Parent identity is used for:

- card detail routing
- set tiles
- Dex parent-print completion
- public share links
- compare links
- canonical metadata

### Child Printing Identity

Child printings are finish-specific options under a parent print.

Examples:

- Normal
- Holo
- Reverse Holo
- Poké Ball
- Master Ball

If `card_printings.printing_gv_id` exists in a deployed schema, it is a stable finish-specific identity for app internals, audit evidence, export, future pricing, and future direct-link design. It is not a replacement for `card_prints.gv_id`.

Until a public child-route contract is approved, child printing selection must be represented only as parent route context:

```text
/card/<parent_gv_id>?printing=<card_printing_id>
```

Raw UUIDs may be used as form/query context when authenticated actions need an exact DB row. Raw UUIDs must not be presented as collector-facing public identity text.

## Public Route Rule

V1 does not enable public child printing routes.

The following must remain unsupported until a separate route contract is approved:

```text
/card/<printing_gv_id>
```

If a requested ID is not a canonical parent `card_prints.gv_id`, the card page must return not found or another safe non-resolution state. It must not resolve a child printing as if it were a parent card.

## Display Rules

Every surface that exposes variant or finish options must show a collector-readable label. Label precedence follows the existing variant display contract:

1. Special parent variant label
2. Child printing finish label
3. `printed_identity_modifier` label
4. fallback discriminator

Finish labels must come from normalized helpers or read models, not ad hoc substring matching in UI components.

Allowed collector-facing labels include:

- Standard Print
- Normal
- Holo
- Reverse Holo
- Poké Ball
- Master Ball
- Prerelease Stamp
- Staff Prerelease Stamp
- Pokemon Together Stamp
- Delta Species
- Variant
- Unclassified Variant

## Surface Contract

### `/sets/[setCode]`

Set card tiles should:

- render one parent tile per canonical parent print
- display available child printing finish chips when present
- let the user select a finish chip without duplicating parent tiles
- update active chip state when a finish is selected
- update selected label text
- carry selected `card_printing_id` to the card detail route as query context
- keep the visible public identity anchored on parent `gv_id`

Set tiles must not inflate set count by child printing count.

### `/card/[gv_id]`

Card detail should:

- resolve only parent `card_prints.gv_id`
- show a `Variant / Finish` selector above or near card actions when multiple display printings exist
- default to owned finish when known, otherwise normal/holo priority, otherwise first available finish
- pass selected `card_printing_id` to add-to-vault actions
- validate that selected `card_printing_id` belongs to the current parent `card_print_id`
- show owned raw copies with finish labels when available
- show a safe fallback label such as `Finish not selected` when ownership predates finish selection
- make the selected version and selected-version ownership state clear using collector-readable labels
- show a base-image fallback notice when the selected child printing has no reviewed image
- keep image suggestions review-only; do not upload or promote images directly from the card page

Card detail must not expose raw UUIDs as collector-facing identity labels.

### `/dex/[speciesSlug]`

Species Dex must remain parent-print based.

Dex completion denominator:

```text
count(distinct parent card_print_id where counts_for_completion = true)
```

Dex may show separate option counts for master-set and variant options, but these are not Species Dex denominator changes.

Dex species detail should:

- show parent print completion
- show owned parent print counts
- show owned child finish labels where known
- keep missing/owned tabs based on parent prints
- route to parent `/card/[gv_id]`
- optionally include selected finish query context only when the UI action is explicitly about a child option

### `/vault`

Vault grouped views should:

- group ownership by parent print unless a future view explicitly groups by child printing
- retain total owned count compatibility
- show finish mix for grouped raw copies when `card_printing_id` is known
- show copy-level finish labels in copy lists
- show `Finish not selected` for null `card_printing_id` rows
- never merge a selected Master Ball/Poké Ball/Reverse Holo into an unlabeled raw bucket without visible copy-level detail

### `/vault/card/[cardId]` and exact copy pages

Vault card management and exact copy views should:

- show the selected finish label for each owned raw copy when known
- show `Finish not selected` for legacy/null rows
- preserve `gv_vi_id` as the owned-copy identity
- avoid presenting child printing UUIDs as public identity

## Add-To-Vault Rule

When the selected child printing is known:

- add-to-vault must submit `card_printing_id`
- server code must verify the selected child belongs to the parent `card_print_id`
- ownership may remain parent-compatible when `card_printing_id` is null

If a UI cannot safely carry the selected `card_printing_id`, it must either fall back to parent-only ownership with a visible finish-not-selected state or block the action with a clear TODO/fail-safe.

## Non-Goals

This contract does not approve:

- child public card routes
- Species Dex denominator changes
- master-set denominator changes
- schema migrations
- DB backfills
- scanner changes
- pricing changes
- route behavior changes for parent `gv_id`

## Acceptance Criteria

- `/sets/[setCode]` finish chips remain selectable and parent-tile based.
- `/card/[gv_id]` supports finish selection and parent-route canonical metadata.
- `/dex/[speciesSlug]` keeps parent-print completion stable.
- `/vault` and exact-copy surfaces have a clear implementation plan for finish labels.
- `/card/<child-printing-public-id>` remains disabled until a separate contract intentionally enables it.
- No raw UUID is displayed as the user-facing child printing identity.
