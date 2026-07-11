# Navigation Friction Pass 6

Status: implemented
Branch: chore/nav-friction-pass-6
Base: main @ 64ee900e

## Objective

Make the Compare workspace reachable without scrolling to the bottom of Search:

> When one or more cards are selected for Compare, the Compare action should stay
> visible as a floating control above the Search content instead of rendering
> inline after results and Load more.

## Scope

### Floating Compare Workspace

File: `lib/main.dart`

Target behavior:

- `_buildCompareWorkspaceEntry(...)` keeps the same selected-count, Clear, and
  Compare actions.
- The control now uses the shared `GvSurfaceVariant.glass` vocabulary.
- The Search results area is wrapped in a `Stack`.
- The Compare control is pinned with `Positioned(...)` near the bottom of the
  Search screen while selected cards exist.
- The old inline `SliverPadding` / `SliverToBoxAdapter` placement after Load
  more is removed.
- The bottom spacer grows only while Compare has selected cards so the floating
  pill does not cover final rows.

## Explicit Non-Goals

- No changes to Compare selection state.
- No changes to the Compare screen.
- No changes to card tile Compare toggles.
- No schema, RPC, pricing, identity, scanner, notification, Pulse, Journey, or
  Wall changes.

## Verification

Required checks:

- `git diff --check`
- `flutter analyze`
- `flutter test`
- `npm run shipcheck`

Targeted test:

- Source-level regression coverage proving the Compare workspace is rendered
  from a floating `Positioned(...)` child inside the Search `Stack`, uses
  `GvSurfaceVariant.glass`, and is no longer rendered inline inside a result
  `SliverPadding`.

Manual/device checks:

- Select one card for Compare in Search and verify the glass Compare pill is
  visible without scrolling.
- Select two cards and verify the same pill remains visible.
- Tap Clear and verify the pill disappears.
- Tap Compare and verify the existing Compare screen opens.

## Rollback

Rollback is code-only:

- Restore the previous inline sliver placement after Load more.
- Remove the floating `Positioned(...)` wrapper and compare-aware bottom spacer.

No database rollback is needed.
