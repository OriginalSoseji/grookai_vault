# Smart Search Phase 1 Result Cards And Sentence Filters V1

Date: 2026-06-17

Status: implemented

## Objective

Begin `GROOKAI_SMART_SEARCH_V1` implementation.

This phase focused on:

- collector-first search result cards
- deterministic sentence parsing
- visible interpreted search filters
- year-range support for natural language queries

## Files Updated

- `apps/web/src/components/explore/ExploreCardGridItem.tsx`
- `apps/web/src/components/explore/ExploreCardListItem.tsx`
- `apps/web/src/components/explore/ExploreCardDetailsRow.tsx`
- `apps/web/src/components/explore/ExplorePageClient.tsx`
- `apps/web/src/lib/search/smartSearchIntent.ts`
- `apps/web/src/app/api/resolver/search/route.ts`
- `apps/web/src/lib/resolver/resolveQuery.ts`
- `apps/web/src/lib/explore/getExploreRows.ts`

## Result Card Hierarchy

Changed search result presentation so the default visual order is:

1. image
2. card name
3. set and number
4. finish
5. variant or context badges
6. price/value
7. image confidence

Moved diagnostic identity fields behind a small `Card identity` disclosure:

- parent `GV-ID`
- child `Printing ID`
- resolver match reason
- search context discriminator

This keeps the data available without making the search page feel like a database table.

## Smart Sentence Parsing

Added deterministic parser:

```text
apps/web/src/lib/search/smartSearchIntent.ts
```

Current recognized features:

- release year ranges
- common finish phrases
- filler phrase cleanup
- `Pikachus` to `Pikachu` normalization

Example:

```text
Give me all reverse holos, Pikachus, from 2014-2026.
```

Interprets as:

```text
residual query: reverse holo Pikachu
filters: Reverse Holo, 2014-2026
```

## Search Explainability UI

Explore now shows a `Smart search interpretation` panel when the parser recognizes intent.

It displays:

- residual trusted-catalog search text
- interpreted filter chips

## Resolver Support

Added release-year range support to the ranked resolver path.

The search layer still fails closed:

- no arbitrary SQL
- no DB writes
- no migrations
- no canonical identity mutation
- no guessed card truth

## Deferred

Still pending:

- exact finish-key hard filtering for no-text queries
- owned/missing structured filters
- stamp-label structured filters
- artist natural-language parser
- image-confidence natural-language parser
- unrecognized-term UI
- mobile app implementation

## Verification

Passed:

```text
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
git diff --check
```

Known warning:

```text
apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx uses <img>.
```

This warning existed outside this phase.
