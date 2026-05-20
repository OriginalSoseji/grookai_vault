# PRINT_IDENTITY_SEARCH_V1 Phase 3 Mobile Parity Gate

Date: 2026-05-20

## Scope

This pass is limited to mobile parity and proof. It does not add database changes or new resolver architecture.

Goals:

- Mobile consumes the same web search result contract.
- Child finish context displays consistently on mobile.
- Legacy fallback cannot disagree with web search after web resolver success.
- Dart/toolchain status is isolated before app code is blamed.

## Findings

Mobile already consumes the web resolver through `CardPrintRepository.searchCardPrintsResolved`.

The parsed mobile contract includes:

- `search_object_type`
- `search_card_printing_id`
- `printing_gv_id`
- `selected_printing_gv_id`
- `finish_key`
- `finish_label`
- `display_discriminator`
- `route_query`

The remaining gap was presentation consistency. The shared mobile display identity helper did not use child finish context, so selected child printings could lose labels such as Reverse Holo, Poké Ball, or Master Ball outside the list subtitle.

## Changes

Updated mobile display identity handling so child printing results resolve collector-visible finish context:

- Child printing search rows can display `Name · Reverse Holo`, `Name · Poké Ball`, or `Name · Master Ball`.
- Parent variant labels remain higher priority than child finish labels.
- Card detail navigation now carries selected printing and finish context from search results.
- Card detail display identity can render the selected child finish without exposing raw UUIDs.

## Legacy Fallback Boundary

`searchCardPrintsResolved` uses the web resolver contract for non-empty search queries.

The legacy `searchCardPrints` path remains available for fallback/browse behavior, but after a successful web resolver response it does not replace or reinterpret child finish context. This prevents mobile from disagreeing with web search for selected printings.

## Regression Coverage

Added mobile test coverage for:

- A child printing web contract row for `GV-PK-ME03-033-RH` displays `Espurr · Reverse Holo`.
- `printing_gv_id`, `selected_printing_gv_id`, and `route_query` survive model parsing.
- A parent variant, such as Pokémon Together Stamp, remains higher priority than a child finish label.

## Toolchain Status

The Dart/Flutter toolchain is currently responsive in this worktree.

Previously observed Dart hangs are treated as environment/toolchain debt unless they reproduce. They did not reproduce during this gate.

## Verification

Passed:

- `dart --version`
- `dart format --set-exit-if-changed lib/models/card_print.dart lib/services/identity/display_identity.dart lib/card_detail_screen.dart lib/main.dart test/identity_search_probe_test.dart`
- `flutter analyze lib/models/card_print.dart lib/services/identity/display_identity.dart lib/card_detail_screen.dart test/identity_search_probe_test.dart`
- `flutter analyze`
- `flutter test test/identity_search_probe_test.dart`
- `flutter test`

Web resolver regression evidence remains documented in:

- `docs/audits/search_resolver_v2/print_identity_search_v1_phase2_web_quality_20260520.md`

## Confirmations

- No DB writes.
- No migrations.
- No resolver architecture changes.
- No parent `card_prints.gv_id` changes.
- No Species Dex denominator changes.
- No scanner changes.
- No public child printing route enablement.
