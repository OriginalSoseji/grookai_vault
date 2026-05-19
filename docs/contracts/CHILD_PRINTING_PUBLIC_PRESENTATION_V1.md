# CHILD_PRINTING_PUBLIC_PRESENTATION_V1

Status: Draft contract
Date: 2026-05-18

## Purpose

Define when and how finish-specific child printing identity can become visible to collectors.

This contract is presentation-only. It does not authorize DB writes, migrations, parent `gv_id` changes, Species Dex denominator changes, scanner changes, pricing changes, or public child-printing routes.

## Current Baseline

The app now has three separate identity layers:

- parent card identity: `card_prints.gv_id`
- owned copy identity: `vault_item_instances.gv_vi_id`
- child printing identity: `card_printings.printing_gv_id`

Parent card identity remains the canonical public card route:

```text
/card/<parent_gv_id>
```

Owned copy identity remains the canonical exact-copy route:

```text
/gvvi/<gv_vi_id>
```

Child printing identity is stable but not route-enabled in this contract:

```text
GV-PK-PRE-002-MB
GV-PK-PRE-002-PB
GV-PK-SV035-025-RH
```

## Public Route Rule

V1 keeps direct public child printing routes disabled.

The following must not resolve yet:

```text
/card/<printing_gv_id>
```

If a route parameter is not a canonical parent `card_prints.gv_id`, the card page must return not found or another safe non-resolution state.

## Display Rule

Collector-facing surfaces should show the finish label first and the child printing public ID only when it adds clarity.

Default display:

```text
Master Ball
Poké Ball
Reverse Holo
Holo
Normal
```

Optional secondary display:

```text
Master Ball · GV-PK-PRE-002-MB
```

Raw `card_printing_id` UUIDs must never be shown as collector-facing identity text.

## Allowed V1 Surfaces

### Vault Copy Lists

Allowed:

- show finish label per raw copy
- show `Finish not selected` for legacy/null rows
- optionally expose `printing_gv_id` as secondary metadata after UX review

Not allowed:

- link child `printing_gv_id` directly to `/card/<printing_gv_id>`
- replace `gv_vi_id` as owned-copy identity

### Exact Copy Pages

Allowed:

- show Finish
- show child printing public ID as a non-link field when present
- keep `gv_vi_id` as the exact-copy addressable identity

Not allowed:

- make child printing public ID look like the owned copy ID
- expose private owner inventory state on public copy pages beyond the already-public copy record

### Set Pages

Allowed:

- show finish chips
- use child finish labels for tile disambiguation
- carry selected child printing as parent route context
- optionally use `printing_gv_id` in query context after route contract review

Not allowed:

- inflate set card counts by child printing count
- resolve child printing IDs as standalone card routes

### Card Detail Pages

Allowed:

- show finish selector
- show selected finish label
- submit internal `card_printing_id` for authenticated add-to-vault actions
- display child printing public ID as secondary metadata if it is not route-linked

Not allowed:

- make child printing public ID the canonical card title identity
- bypass server validation that selected child belongs to the parent card print

### Grookai Dex

Allowed:

- show parent Card Print Completion
- show Master Set Options and Variant Options separately
- show owned finish labels where known
- show child printing public IDs as optional secondary metadata for variant options after UX review

Not allowed:

- change Species Dex denominator
- count child printings as separate species completion cards
- expose private ownership counts publicly

## Privacy Rule

Public pages may show catalog-level child printing data.

Public pages must not show user ownership state unless the surface is already an intentionally public owner/copy surface.

Examples:

- `/sets/sv8pt5`: may show that Exeggutor has Master Ball and Poké Ball options.
- `/dex/pikachu`: may show catalog options publicly, but user-owned progress requires an authenticated session.
- `/gvvi/<gv_vi_id>`: may show finish label for that public copy if the copy itself is public.
- `/card/<printing_gv_id>`: remains disabled.

## Link Model

V1 keeps parent links canonical:

```text
/card/<parent_gv_id>?printing=<internal_card_printing_id>
```

This query parameter is an internal context carrier. It is not the public identity contract.

A future route lane must decide whether to use:

```text
/card/<parent_gv_id>?printing=<printing_gv_id>
```

or:

```text
/printing/<printing_gv_id>
```

or:

```text
/card/<printing_gv_id>
```

No future route may be enabled until crawler behavior, canonical metadata, privacy, redirects, and parent-card fallback behavior are explicitly specified.

## Presentation Precedence

When a child printing is selected or owned, display text should resolve in this order:

1. special parent variant label
2. child printing finish label
3. `printing_gv_id` as optional secondary metadata
4. `printed_identity_modifier` label
5. fallback discriminator

`printing_gv_id` is never a substitute for a missing finish label.

## Release Gates

Before making child printing public IDs broadly visible:

- authenticated vault smoke must verify selected Master Ball and Poké Ball copies display correctly
- legacy/null rows must display `Finish not selected`
- `/card/<printing_gv_id>` must remain not found
- Species Dex denominators must remain unchanged
- public set pages must not leak ownership state
- build, lint, typecheck, contracts, and runtime health must pass

## Non-Goals

This contract does not approve:

- public child printing routes
- DB writes
- migrations
- pricing changes
- scanner changes
- Species Dex denominator changes
- master-set denominator changes
- parent `gv_id` changes

## Open Decisions

- Whether collector-facing public child identity should be shown on card detail by default or behind an expand/copy affordance.
- Whether exports should include both `card_prints.gv_id` and `card_printings.printing_gv_id`.
- Whether future direct links should be parent-routed with a child query parameter or use a dedicated child printing route.
- Whether child printing public IDs should be included in marketplace, pricing, and trade surfaces before pricing has printing-level confidence.
