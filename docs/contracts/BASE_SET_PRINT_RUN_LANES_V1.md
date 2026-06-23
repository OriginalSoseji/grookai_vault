# Base Set Print Run Lanes V1

Status: active

Date: 2026-06-22

## Objective

Grookai must model Base Set collector print runs as governed lanes instead of treating first edition, Shadowless, Unlimited, and 1999-2000 printings as incidental variants.

This contract covers English physical Base Set only.

## Canonical Lanes

The governed collector lanes are:

- `base1-unlimited` - Base Set Unlimited
- `base1-shadowless` - Base Set Shadowless
- `base1-first-edition` - Base Set 1st Edition
- `base1-1999-2000` - Base Set 1999-2000

The source expansion remains `base1` / Base Set. Derived lane pages may be exposed as set-like collector lanes, but they must preserve the underlying Base Set source identity.

## Required Slot Coverage

Each lane has 102 checklist slots.

Unlimited is satisfied by the current ordinary `base1` checklist rows when no print-run modifier is present.

Shadowless, 1st Edition, and 1999-2000 require explicit lane identity or lane membership. They must not be inferred at render time from ordinary Unlimited rows.

## Pikachu Slot Rule

Base Set Pikachu number 58 is a governed special slot because cheek-color identities already exist.

For Shadowless and 1st Edition lanes, the red-cheeks and yellow-cheeks Pikachu rows are valid lane identities for slot 58.

The Ghost Stamp Shadowless Pikachu row is an error/special identity. It must not satisfy the ordinary Shadowless lane slot unless a later contract explicitly promotes that behavior.

No generic `GV-PK-BASE1-58-SHADOWLESS` or `GV-PK-BASE1-58-FIRST-EDITION` row may be inserted while the cheek-color rows remain the governed slot identities.

## 1999-2000 Rule

The 1999-2000 printing is a separate collector lane for Grookai. It represents the fourth-print / UK-style Base Set copyright-line printing. It is not a separate source expansion unless a future migration introduces a lane-aware set table or membership table.

## Image Rule

Lane rows and lane memberships may use exact images only when the image depicts the same physical print lane.

Representative imagery is allowed only when marked as representative or missing lane imagery under existing image confidence contracts. In the current `card_prints` schema, new lane rows use `image_status = 'missing'` plus an explicit `image_note` until exact lane images are cataloged. A Shadowless, first-edition, or 1999-2000 card must not silently show an Unlimited image as exact truth.

## DB Write Boundary

This V1 contract is audit-first.

Allowed now:

- read-only DB audits
- generated missing-lane plans
- UI and search planning
- contract tests

Not allowed in this V1 contract:

- direct DB writes
- migrations
- destructive cleanup
- blind cloning of all 102 ordinary Base Set rows
- changing existing Pikachu special identities
- treating image fallback as exact image truth

Any later apply step must have a guarded write plan that proves:

- every candidate row has a deterministic `gv_id`
- every candidate row preserves source `base1` identity
- Pikachu number 58 is handled by existing cheek-color rows where applicable
- Ghost Stamp remains excluded from ordinary lane coverage
- lane pages and card detail pages render the same lane identity

## Beta Hardening Requirement

Before beta, Base Set lane gaps must be visible as known catalog gaps rather than silent missing images or broken Dex/set parity.
