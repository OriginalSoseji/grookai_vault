# RESOLVER_UX_AMBIGUITY_CONTRACT_V1

## 1. Scope

This phase hardens resolver behavior and user-facing ambiguity handling for the **web** resolver only.

Covered:
- explicit resolver decision states for ranked and direct web resolution
- non-breaking resolver metadata for state, candidate count, and top-score visibility
- explicit strong-match gating for `/search` auto-resolution
- honest ambiguous, weak, and no-match messaging on `/explore`
- gateway trace visibility for resolver state and auto-resolution behavior

Not covered:
- scoring changes
- normalization changes
- alias expansion
- fuzzy matching
- AI
- mobile integration
- schema or migration changes
- broad search UI redesign

## 2. Current Behavior Audit

Verified pre-phase behavior from repo code:

- `/search`
  - file: [route.ts](/c:/grookai_vault/apps/web/src/app/search/route.ts)
  - behavior before this phase:
    - calls direct resolver through the gateway
    - redirects immediately to:
      - `/card/[gv_id]` for `kind: "card"`
      - `/sets/[set_code]` for `kind: "set"`
      - `/sets?q=...` for `kind: "sets"`
      - `/explore?q=...` for `kind: "explore"`
  - weakness:
    - auto-resolution behavior depended on direct result kind only, not an explicit resolver-state contract

- `/explore`
  - files:
    - [ExplorePageClient.tsx](/c:/grookai_vault/apps/web/src/components/explore/ExplorePageClient.tsx)
    - [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
  - behavior before this phase:
    - always fetched ranked rows
    - rendered results count and rows
    - empty state was a generic `No results yet.`
  - weaknesses:
    - weak matches were not visibly marked as weak
    - ambiguous same-name queries were not visibly marked as ambiguous
    - no-match state was honest only in the sense of an empty list, but not explicit about deterministic failure

- resolver tracing
  - file: [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
  - behavior before this phase:
    - already logged normalization outputs and ranked top-score components
  - weakness:
    - did not emit an explicit resolver decision state
    - did not expose whether auto-resolution actually occurred

Repo-grounded examples observed before/at phase start:
- strong structured queries:
  - `gardevoir ex sv01 245`
  - `charizard 4/102 base`
- ambiguous exact-name queries:
  - `charizard`
  - `pikachu`
- weak unresolved queries:
  - `pikachu promo`
  - `pikachu sv promo`
  - `greninja gold star`
- no-match query:
  - `zzzzzzzzzz`

## 3. Resolver State Model

This phase defines four explicit resolver states:

- `STRONG_MATCH`
  - the top result is strong enough to trust as a deterministic winner

- `AMBIGUOUS_MATCH`
  - multiple strong candidates exist, or the query remains broad enough that the top result should not be treated as certain

- `WEAK_MATCH`
  - some candidates exist, but the evidence is too thin or too weak to imply strong certainty

- `NO_MATCH`
  - no viable ranked candidates exist

Direct resolver mapping:
- `card` / `set` -> `STRONG_MATCH`
- `sets` -> `AMBIGUOUS_MATCH`
- `explore` with non-empty query -> `WEAK_MATCH`
- `explore` with empty query -> `NO_MATCH`

Ranked resolver mapping:
- derived from candidate count, top score, score gap to second candidate, and structured-evidence presence

## 4. Decision Rules

Ranked decision rules implemented in [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts):

- `NO_MATCH`
  - `candidateCount === 0`
  - or no top-ranked match trace exists

- `STRONG_MATCH`
  - `topScore >= 2200`
  - and structured evidence is present:
    - expected set
    - number
    - fraction
    - promo
    - or variant evidence
  - and `scoreGapToSecond >= 400`

  OR

  - `topScore >= 2800`
  - and `scoreGapToSecond >= 600`

- `AMBIGUOUS_MATCH`
  - multiple candidates exist
  - and either:
    - `topScore >= 2200` with `scoreGapToSecond < 400`
    - or `topScore >= 1800` without structured evidence

- `WEAK_MATCH`
  - any remaining ranked result set with candidates that does not satisfy strong or ambiguous rules

Why these thresholds are repo-grounded:
- verified strong structured queries in this repo currently score in the `2300-4800` range
  - `gardevoir ex sv01 245` -> `3810`
  - `charizard 4/102 base` -> `4770`
- verified ambiguous exact-name queries score high but tie at the top
  - `charizard` -> `2980` with `scoreGapToSecond = 0`
  - `pikachu` -> `2980` with `scoreGapToSecond = 0`
- verified weak unresolved queries score much lower
  - `pikachu promo` -> `1200`
  - `pikachu sv promo` -> `1380`
  - `greninja gold star` -> `360`

## 5. Behavior Changes

Files changed in this phase:
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [route.ts](/c:/grookai_vault/apps/web/src/app/search/route.ts)
- [ExplorePageClient.tsx](/c:/grookai_vault/apps/web/src/components/explore/ExplorePageClient.tsx)

What changed:
- added non-breaking resolver metadata through `resolveQueryWithMeta(...)`
- added explicit resolver-state classification
- added ranked top-match gap metadata:
  - `topScore`
  - `secondScore`
  - `scoreGapToSecond`
- made `/search` auto-resolution explicit:
  - card/set redirects now require `STRONG_MATCH`
- kept ambiguous and weak queries on the ranked explore path
- added lightweight explore-state messaging:
  - ambiguous: multiple plausible matches
  - weak: approximate results
  - no match: explicit deterministic no-match state
- improved empty-state copy so no-match queries are honest instead of generic

What did not change:
- no scoring weights were changed in this phase
- no normalization rules were changed in this phase
- no alias coverage work was added
- no route shapes were changed
- no candidate retrieval logic was changed
- no mobile behavior was changed

## 6. Observability Added

Gateway tracing in [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts) now exposes:
- `resolverState`
- `topScore`
- `candidateCount`
- `autoResolved`
- `topMatch.secondScore`
- `topMatch.scoreGapToSecond`

This makes the following previously implicit behaviors visible:
- whether a ranked result was strong, ambiguous, weak, or empty
- whether `/search` actually auto-resolved
- whether the top result won clearly or only narrowly

## 7. Verification

Commands run:

```powershell
cd C:\grookai_vault\apps\web
npm run typecheck
npx eslint src/app/search/route.ts src/components/explore/ExplorePageClient.tsx src/lib/resolver/resolveQuery.ts src/lib/explore/getExploreRows.ts
```

Outcomes:
- `npm run typecheck` passed
- targeted `eslint` passed

Ranked resolver verification queries:

```powershell
cd C:\grookai_vault
@'
import { resolveQueryWithMeta } from '@/lib/resolver/resolveQuery';
const queries = [
  'gardevoir ex sv01 245',
  'charizard',
  'pikachu',
  'lugia neo genesis',
  'pikachu promo',
  'greninja gold star',
  'pikachu sv promo',
  'charizard 4/102 base',
  'zzzzzzzzzz'
];
for (const query of queries) {
  const resolved = await resolveQueryWithMeta(query, { mode: 'ranked', sortMode: 'relevance', exactSetCode: '' });
  console.log(JSON.stringify({
    query,
    resolverState: resolved.meta.resolverState,
    topScore: resolved.meta.topScore,
    candidateCount: resolved.meta.candidateCount,
    top: resolved.rows[0] ? { gv_id: resolved.rows[0].gv_id, name: resolved.rows[0].name, set_code: resolved.rows[0].set_code, number: resolved.rows[0].number } : null
  }));
}
'@ | node --loader ./tools/resolver/ts_web_loader.mjs --input-type=module -
```

Observed outcomes:
- `gardevoir ex sv01 245` -> `STRONG_MATCH`
- `charizard` -> `AMBIGUOUS_MATCH`
- `pikachu` -> `AMBIGUOUS_MATCH`
- `lugia neo genesis` -> `STRONG_MATCH`
- `pikachu promo` -> `WEAK_MATCH`
- `greninja gold star` -> `WEAK_MATCH`
- `pikachu sv promo` -> `WEAK_MATCH`
- `charizard 4/102 base` -> `STRONG_MATCH`
- `zzzzzzzzzz` -> `NO_MATCH`

Direct resolver runtime verification:
- direct runtime behavior was verified by code inspection and type-safe route integration in [route.ts](/c:/grookai_vault/apps/web/src/app/search/route.ts)
- standalone direct runtime verification through the local loader was `UNVERIFIED` because the direct resolver requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in that standalone shell path

## 8. Risks / Non-Goals

This phase intentionally did not solve:
- weak-query normalization gaps such as `greninja gold star`
- promo-family inference gaps such as `pikachu sv promo`
- mobile resolver parity
- latency or request fanout
- scoring redesign
- fuzzy or semantic resolver behavior
- AI fallback behavior

Known limit after this phase:
- the system is now more honest about weak and ambiguous outcomes, but it still depends on deterministic language coverage and scoring quality established in prior phases
- some unresolved queries remain weak because the normalization/coverage layer does not yet produce stronger deterministic evidence for them
