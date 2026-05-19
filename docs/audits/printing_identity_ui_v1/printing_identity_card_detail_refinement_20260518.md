# PRINTING_IDENTITY_CARD_DETAIL_REFINEMENT_20260518

Date: 2026-05-18
Status: implemented

## Scope

This lane refines finish and variant presentation on the parent card detail route.

Allowed:

- card detail wording changes
- stronger selected printing state
- selected-version ownership messaging
- review-only image suggestion affordance

Not allowed and not performed:

- DB writes
- migrations
- scanner changes
- pricing changes
- Species Dex denominator changes
- public child printing route enablement
- raw UUID exposure
- automatic image promotion

## Wording Changes

The card detail add-to-vault selector now uses:

```text
Variant / Finish
```

The helper copy now says:

```text
Choose the exact version before adding it to your vault.
```

The selected-state panel now says:

```text
Selected version
```

instead of the more technical `Selected Printing`.

## Selected State Changes

Active finish chips were strengthened with:

- heavier text weight
- darker active state
- subtle ring and shadow

The selected version panel now shows:

- selected version label, such as `Poké Ball` or `Master Ball`
- selected-version ownership state:
  - `Owned: 1`
  - `Not in vault`

This keeps selected child printings understandable without changing the canonical parent `/card/<parent_gv_id>` route.

## Image Fallback Behavior

When the selected child printing has no child-specific image in the current read model, the UI shows:

```text
Using base image
Suggest image
```

The `Suggest image` affordance is disabled in this V1 lane because there is no approved direct image suggestion/promotion pipeline for card detail variants yet.

No image upload, storage write, promotion staging, or canon image update was added.

## Route Policy

Public child routes remain disabled.

The lane does not enable:

```text
/card/<printing_gv_id>
```

Selected child printing remains form/query/context only under the parent card route.

## Smoke Notes

Required smoke cases:

- Exeggutor selected Normal
- Exeggutor selected Poké Ball
- Exeggutor selected Master Ball
- one Reverse Holo example

Expected results:

- section title says `Variant / Finish`
- selected version is visible
- selected-version owned count is visible
- fallback image notice appears when the selected child image is missing
- raw UUIDs are not shown
- add-to-vault still carries selected `card_printing_id`
- `/card/<printing_gv_id>` remains not found

Local built-page HTTP smoke was attempted with `next start`, but the request path hit the existing runtime TLS blocker:

```text
UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

The local server was stopped after the failed smoke attempt.

Production read-only route-policy smoke:

- `/card/GV-PK-PRE-002-MB` returned the safe card-not-found surface.

Browser/authenticated smoke remains manual because this Codex session does not expose a callable authenticated browser runtime.

Verification commands run:

- `npm --prefix apps/web run typecheck`
- `npm --prefix apps/web run lint`
- `npm --prefix apps/web run build`
- `npm run contracts:test`
- `npm run contracts:runtime-health`
- `git diff --check`

## Explicit Confirmations

- No DB writes.
- No migrations.
- No scanner changes.
- No pricing changes.
- No Species Dex denominator changes.
- No public child route enablement.
- No raw UUID display.
- No image promotion pipeline added.
