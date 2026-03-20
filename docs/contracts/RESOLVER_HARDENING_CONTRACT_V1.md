# RESOLVER_HARDENING_CONTRACT_V1

## 1. Canonical Resolver Selection

### Chosen canonical resolver path
- Canonical ranked resolver authority: `/explore`
- Concrete implementation surface: `apps/web/src/lib/explore/getExploreRows.ts`

### Why this path was chosen
- It is the most complete live search surface in the repo.
  - It parses set expectations, collector numbers, and variant cues.
  - It queries the deterministic SQL search contract `search_card_prints_v1`.
  - It expands candidates with `tcgdex_sets` and `tcgdex_cards`.
  - It joins pricing and set metadata before final ranking.
  - It owns the ranked result list actually shown to users.
- It is the closest thing the repo currently has to a full search resolver.
  - `/search` is not a full ranked resolver. It is a direct-resolution adapter that either redirects to one card/set or falls through to `/explore`.
- Repo evidence:
  - `apps/web/src/components/explore/ExplorePageClient.tsx`
  - `apps/web/src/lib/explore/getExploreRows.ts`
  - `apps/web/src/app/search/route.ts`
  - `apps/web/src/lib/publicSearchResolver.ts`
  - `docs/audits/RESOLVER_REQUEST_PATH_AUDIT_V1.md`
  - `docs/audits/RESOLVER_HARDENING_L3_AUDIT_V1.md`

### Important boundary
- Phase 1 does **not** delete or replace `/search`.
- `/search` remains a direct-resolution adapter for backward-compatible route behavior.
- The collapse in this phase is entrypoint consolidation, not scoring or behavior redesign.

## 2. Gateway Design

### File location
- `apps/web/src/lib/resolver/resolveQuery.ts`

### Function signature
- Single gateway entrypoint:
  - `resolveQuery(rawQuery, { mode: "direct" })`
  - `resolveQuery(rawQuery, { mode: "ranked", sortMode, exactSetCode, exactReleaseYear, exactIllustrator })`

### What it does
- Routing only
- No scoring changes
- No normalization changes to resolver behavior
- No identity changes
- No ranking changes

### Internal behavior
- Direct mode
  - delegates to `resolvePublicSearchWithTiming(rawQuery)`
  - returns the same direct resolver result shape as before
- Ranked mode
  - delegates to `getExploreRowsWithTiming(...)`
  - returns the same ranked rows as before

### Why this qualifies as Phase 1 hardening
- One runtime gateway now owns web resolver entrypoint execution.
- Existing logic remains intact behind that gateway.
- The gateway adds shared tracing without changing outputs.

## 3. Routing Changes

### Files updated
- `apps/web/src/lib/resolver/resolveQuery.ts`
- `apps/web/src/app/search/route.ts`
- `apps/web/src/components/explore/ExplorePageClient.tsx`

### Paths unified
- `/search`
  - before: `route.ts -> resolvePublicSearch(...)`
  - after: `route.ts -> resolveQuery(..., { mode: "direct" })`
- `/explore`
  - before: `ExplorePageClient -> getExploreRows(...)`
  - after: `ExplorePageClient -> resolveQuery(..., { mode: "ranked", ... })`

### Scope boundary
- Phase 1 unifies live **web** resolver entrypoints.
- Mobile catalog search remains a known separate surface and is not collapsed in this phase because the required gateway location for this contract is inside `apps/web`.

## 4. Request Flow Before vs After

### Before
- Public search submit
  - `PublicSearchForm -> buildPublicSearchDestination -> /search -> resolvePublicSearch`
  - or
  - `PublicSearchForm -> /explore -> ExplorePageClient -> getExploreRows`
- Two live web resolver codepaths entered directly from callers
- No single runtime gateway file
- Resolver tracing split across separate modules only

### After
- Public search submit
  - `PublicSearchForm -> buildPublicSearchDestination -> /search -> resolveQuery(mode=direct) -> resolvePublicSearchWithTiming`
  - or
  - `PublicSearchForm -> /explore -> ExplorePageClient -> resolveQuery(mode=ranked) -> getExploreRowsWithTiming`
- One web resolver gateway file now sits in front of both runtime paths
- Direct and ranked behavior stay unchanged

## 5. Observability Added

### What is now visible
Each gateway call now emits a structured resolver trace containing:
- raw query
- normalized query
- resolver path used
  - `direct`
  - `ranked`
- candidate count returned
  - direct mode logs direct candidate result count
  - ranked mode logs final ranked row count
- execution time
- upstream request count when available
- direct result kind when available

### Why this matters
- Before Phase 1, caller entrypoints invoked separate resolver modules directly.
- Now all live web resolver traffic passes through one logging seam.
- This makes later hardening work measurable without changing search behavior first.

## 6. Risk Assessment

### What could break
- Type drift between gateway return types and existing caller expectations
- Client/server boundary issues in `ExplorePageClient`
- Logging noise from new trace output

### Why this should not break behavior
- Gateway delegates to the exact existing resolver functions:
  - `resolvePublicSearchWithTiming`
  - `getExploreRowsWithTiming`
- Returned shapes are preserved:
  - direct mode returns the same direct resolver result shape
  - ranked mode returns the same rows array shape
- No scoring, normalization, or ranking code was changed
- No DB queries or route outputs were changed

### Known non-goals of Phase 1
- No alias expansion
- No normalization consolidation beyond gateway entrypoint routing
- No scoring unification
- No request fanout reduction inside `getExploreRows`
- No mobile resolver collapse

### Reversibility
- Fully reversible at file level:
  - remove `resolveQuery.ts`
  - restore direct imports in `/search` and `ExplorePageClient`
- No schema, contract, or data migrations involved

