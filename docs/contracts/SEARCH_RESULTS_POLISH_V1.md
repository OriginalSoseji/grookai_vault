# SEARCH_RESULTS_POLISH_V1

## Purpose

Make search results easier to understand without changing resolver behavior.

This lane is a presentation pass only. The resolver, RPCs, ranking weights, database schema, and public route policy remain unchanged.

## Priority Rules

Search result presentation follows the existing interaction hierarchy:

1. Card identity
2. Selected finish or variant
3. Ownership state where available
4. Primary action
5. Price
6. Cameo or search context
7. Metadata
8. Diagnostics

Cameo context must stay visibly secondary to card identity. Finish or printing context must be more prominent than cameo context when both are present.

## Required Behavior

- Preserve resolver order.
- Group visible results by match intent without re-sorting rows.
- Show a clear match reason on result tiles, list rows, and detail rows.
- Keep child printing search routed through the parent card route plus selected printing query context.
- Improve loading and empty states with collector-relevant examples.
- Add client-side show-more behavior for large result sets.

## Match Intent Groups

Groups are display labels only:

- `Exact version matches`: child printings, selected finishes, printing IDs, stamps, and version-specific results.
- `Card identity matches`: parent card identity results ranked by the resolver.
- `Cameo matches`: supplemental appearance context.
- `Related results`: fallback group for ranked results without stronger intent metadata.

Groups are built as contiguous sections from the resolver-returned order. This keeps the existing ranking intact.

## Non-Goals

- No DB changes.
- No migrations.
- No RPC changes.
- No resolver ranking changes.
- No Species Dex changes.
- No scanner changes.
- No pricing changes.
- No public child route enablement.
