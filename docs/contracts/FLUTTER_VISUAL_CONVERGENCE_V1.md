# Flutter Visual Convergence V1

## Purpose

This contract makes the native Grookai application visibly consistent across
its primary collector journeys without changing product authority. It governs
presentation only: palette, hierarchy, spacing, surfaces, navigation chrome,
and repeated card geometry.

## Primary Navigation

The mobile dock remains fixed in this order:

1. Pulse
2. Wall
3. Scan
4. Vault
5. Search

Scan remains the central action. The dock uses stable equal-width slots and
persistent labels. Selection may change color, border, and indicator treatment,
but it must not resize or shift neighboring destinations.

## Visual Language

- The base canvas is neutral rather than blue-tinted.
- Blue communicates primary navigation and action.
- Mint communicates activity and positive collector state.
- Gold communicates collection and curation.
- Repeated panels use quiet borders and restrained elevation.
- Card artwork remains the strongest visual object on card-bearing surfaces.
- UI decoration must not cover card identity, set, collector number, finish,
  ownership, or price evidence.

## Hierarchy

- Each primary destination has a compact title and a stable accent marker.
- Search begins with one bounded search control, then resolution state,
  filters, and results.
- Vault begins with Binders as a compact collection-project shortcut, followed
  by an explicit collection summary, controls, and owned cards.
- Repeated card tiles keep stable artwork, title, metadata, price, and ownership
  slots so image or label changes cannot shift the grid.

## Invariants

- Exact printing and finish remain visible whenever known.
- Unresolved printing remains explicit and is never inferred.
- Hosted-first image resolution remains unchanged.
- Search, ownership, Binder, message, follow, privacy, and pricing behavior are
  unchanged.
- No database schema, RPC, policy, or mutation path is introduced by this work.
- Dark and light modes use the same semantic color roles.
- Controls remain at least 40 logical pixels, with primary actions at least 46.

## Verification

The release candidate must pass Flutter analysis and tests, then be installed
on a physical Samsung device. Pulse, Wall, Vault, Search, exact Card Detail,
Binders, and Messages must be inspected for text fit, image rendering,
navigation stability, and render-overflow or crash signatures.
