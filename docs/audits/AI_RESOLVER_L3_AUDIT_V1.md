# AI_RESOLVER_L3_AUDIT_V1

## 1. Executive Verdict
- Verdict: `DEFER`

Grookai Vault should not add an AI-assisted query normalization layer to live search/resolver yet. The current resolver stack is already split across deterministic surfaces, remains heavily network-bound, and lacks resolver-grade observability, caching, confidence instrumentation, and failure analytics. Repo evidence shows the biggest current problem is not missing semantics first; it is duplicated request fanout, weak variant/promo heuristics in a deterministic stack, and limited explainability around ranking behavior. AI could plausibly help only a narrow subset of weak-query interpretation later, but adding it now would create hidden cost, latency, and trust drift before the current deterministic path is sufficiently measured and contracted.

## 2. Current Resolver Topology

### Public web search topology
- Primary public submit entrypoint: `apps/web/src/components/PublicSearchForm.tsx`
  - `handleSubmit -> buildPublicSearchDestination(query) -> router.push(nextUrl)`
  - No debounce or local cache. One submit triggers one navigation.
- Query router: `apps/web/src/lib/publicSearchRouting.ts`
  - `shouldUseResolverRoute(raw)` sends structured-looking queries to `/search`
  - everything else goes to `/explore`
  - structured heuristics already include:
    - Grookai ID detection
    - collector fraction detection
    - set-code detection (`sv02`, `swsh7`, `base1`, `pr-*`)
    - exact set aliases (`151`, `base set`, `lost origin`, `silver tempest`, etc.)
    - prefixed collector numbers
- Direct resolver route: `apps/web/src/app/search/route.ts`
  - `GET -> auth.getUser -> trackServerEvent(search_performed) -> resolvePublicSearch(rawQuery)`
  - redirect outputs:
    - `/card/[gv_id]`
    - `/sets/[set_code]`
    - `/sets?q=...`
    - `/explore?q=...`
- Direct resolver logic: `apps/web/src/lib/publicSearchResolver.ts`
  - deterministic staged pipeline:
    - `normalize`
    - `direct_gv_lookup`
    - `structured_collector`
    - `exact_name`
    - `set_intent`
    - `alias`
  - current alias lane is intentionally empty:
    - `resolveAliasOrNickname()` returns `null`
    - inline comment: future semantic alias lane is intentionally conservative until a real alias table exists
  - data access is direct and deterministic:
    - `card_prints` lookup by `gv_id`
    - `card_prints` lookup by `number` + optional `set_code`
    - `card_prints.ilike("name", normalizedInput)`
    - `getPublicSets()` for set intent and alias resolution
- Ranked results path: `apps/web/src/components/explore/ExplorePageClient.tsx`
  - `useEffect -> getExploreRows(normalizedQuery, sortMode, exactSetCode, exactReleaseYear, exactIllustrator)`
  - reruns on query/sort/filter changes
  - client component, so browser navigation/bootstrap sits ahead of server work
- Ranked results logic: `apps/web/src/lib/explore/getExploreRows.ts`
  - deterministic query builder:
    - set expectation detection
    - variant cue detection
    - collector-number expectation detection
  - candidate fanout:
    - multiple `search_card_prints_v1` RPC calls
    - `tcgdex_sets` lookup
    - `tcgdex_cards` lookup
    - `card_prints` fetch by returned ids / tcgdex ids / direct gv_id
    - `sets` metadata lookup
    - pricing lookup via `getPublicPricingByCardIds`
  - final ranking stays deterministic in-process through `scoreRow` / `rankRows`

### Search contract and DB surfaces
- SQL search contract: `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql`
  - `public.search_card_prints_v1(q, set_code_in, number_in, limit_in, offset_in)`
  - deterministic where/order rules:
    - optional exact set filter
    - number matching by digits, padded digits, slashed prefix
    - name filter via `ILIKE`
    - ordering by number match rank, set match rank, then name/id
- Search view: `public.v_card_search` in `supabase/migrations/20251213153627_baseline_views.sql`
  - exposes `id`, `name`, `set_code`, `number`, derived number shapes, images, and latest price

### Duplicate or adjacent search/match paths
- Mobile catalog search: `lib/models/card_print.dart`
  - prefers `search_card_prints_v1`
  - falls back to legacy direct `card_prints` queries when RPC errors or returns empty
  - this is a live parallel search path, not just dead code
- Vault import matcher: `apps/web/src/lib/import/matchCardPrints.ts`
  - separate deterministic exact matcher using normalized set/name/number
  - not the public resolver, but evidence that search/match logic is already split by domain
- Identity worker: `backend/identity/identity_scan_worker_v1.mjs`
  - uses `search_card_prints_v1` for candidate generation in a separate identity pipeline
  - not the public search authority

### Existing topology conclusion
- The current resolver stack is not one canonical search pipeline.
- It is a deterministic federation of:
  - route classifier
  - direct redirect resolver
  - ranked explorer
  - mobile fallback search
  - separate import/identity matchers
- Any AI layer inserted casually would land in a system that is already split and latency-sensitive.

## 3. Verified Failure Classes

| Failure class | Evidence | Current likely root cause | Deterministic vs AI-fit judgment |
| ------ | ------ | ------ | ------ |
| Network-bound slowness | `docs/audits/RESOLVER_STRESS_TEST_V1.md` shows avg latency `17669.49 ms`, P95 `25128.1 ms`, avg network share `97.85%`. `docs/audits/RESOLVER_REQUEST_PATH_AUDIT_V1.md` shows avg `17.88` requests/query and up to `62`. | Remote request fanout, dual `/search` + `/explore` path costs, repeated Supabase/TCGDex/pricing lookups. | Deterministic/system-architecture issue. AI does not solve this and likely worsens it. |
| Variant cue under-ranking | `docs/audits/RESOLVER_STRESS_TEST_V1.md` flags `greninja gold star` with top result `Ash-Greninja-EX • xyp • #XY133` and remaining `variant_token_missing_from_top`. `apps/web/src/lib/explore/getExploreRows.ts` variant cues are limited to `alt art`, `alternate art`, `full art`, `black star promo`, `promo`, `holo`, `rainbow`, `gold`. | Variant lexicon is narrow; ranking still leans heavily on name/token matches when variant cues are sparse. | Best solved deterministically first. AI could help only as a suggestion lane later, not ranking authority. |
| Promo ambiguity | `docs/audits/RESOLVER_STRESS_TEST_V1.md` shows `pikachu sv promo` top result `_____'s Pikachu • basep • #24`. Routing heuristics and set aliases in `publicSearchRouting.ts` / `publicSets.shared` do not evidence a full promo family normalization layer. | Promo families and promo code aliases are under-modeled deterministically. | Deterministic first. AI is dangerous here because promo ambiguity can redirect to the wrong printed identity with false certainty. |
| Set-alias ambiguity | `publicSearchResolver.ts` returns `{ kind: "sets" }` when alias/exact/fuzzy set intent matches multiple sets. Alias maps in `publicSearchRouting.ts` and `publicSets.shared` are finite and hand-curated. | Some aliases are inherently multi-match; current resolver chooses conservative fallback rather than overcommitting. | AI may appear helpful, but this is dangerous to hand to AI because ambiguity is real, not just linguistic. |
| Weak alias/nickname coverage | `resolveAliasOrNickname()` in `publicSearchResolver.ts` is a stub that always returns `null`, with a comment deferring semantic alias support until a real alias table exists. | Missing deterministic alias table / nickname layer. | Deterministic first. This is one of the clearest non-AI gaps still open. |
| Structured vs broad query split overhead | `docs/audits/RESOLVER_REQUEST_PATH_AUDIT_V1.md` states `/search` and `/explore` are separate live surfaces and a user flow can pay both serially. | Route classification is deterministic but split. Redirect intent and ranked results are not unified. | AI does not address root cause. AI before both surfaces would multiply cost; AI inside only one surface would create inconsistent behavior. |
| Collector number / set token issues | Same stress audit shows `number_token_missing_from_top` and `set_token_missing_from_top` improved to `0` after deterministic ranking passes. SQL RPC already normalizes number shapes. | This class is materially improved already by deterministic work. | Not a good AI justification. |
| Typo sensitivity | UNVERIFIED. Repo has token similarity for set ranking (`bestTokenSimilarity`, Dice coefficient) but no repo-grounded audit artifact proving typo failures as a dominant class. | UNVERIFIED. | UNVERIFIED. Do not use typo claims to justify AI without measurement. |
| Missing resolver explainability at query level | Founder telemetry aggregates only `search_performed` counts/top terms in `apps/web/src/app/founder/page.tsx`. `trackServerEvent` only stores generic event fields. No resolver confidence, no candidate trace, no failure bucket logging. | Search instrumentation is query-count telemetry, not resolver-decision telemetry. | Deterministic observability gap first. AI would magnify blind spots. |
| Mobile/web search drift risk | `lib/models/card_print.dart` still falls back from RPC to legacy direct queries, while web uses `/search` + `/explore` deterministic routing. | Search authority is already split across clients. | AI inserted in one client only would create drift; inserted in both would multiply operational complexity. |

## 4. Cost Landmine Audit

### Cost risk verdict
- Inline AI normalization in the current resolver path: `HIGH`
- AI only after deterministic low-confidence failure, with caching and contract controls: `MEDIUM`, but still not ready now

### Why cost risk is high in the current repo
- Current query flow already multiplies remote work.
  - `docs/audits/RESOLVER_REQUEST_PATH_AUDIT_V1.md` shows average `17.88` requests per product query and worst cases above `50`.
  - Some flows pay both `/search` resolution and `/explore` results.
- There is no resolver-query cache in the current path.
  - `PublicSearchForm` submits directly.
  - `publicSearchResolver.ts` does not cache query outputs.
  - `getExploreRows.ts` does not cache normalized query results.
  - Only `getPublicSets()` is React-cached, which helps set metadata, not query normalization.
- There are multiple live clients.
  - web public search
  - web explore reruns on sort/filter changes
  - mobile catalog search
  - separate identity/import matchers adjacent to the same search contract
- Current client behavior can amplify duplicate normalization.
  - same user query can hit `/search`, then `/explore`
  - `/explore` reruns when sort/filter changes
  - mobile can execute its own search path independently
- Telemetry is too coarse to measure AI burn safely.
  - `web_events` only captures `search_performed` and raw search term metadata
  - no per-stage resolver metrics are persisted
  - no normalization hit/miss counters
  - no cache hit metrics because no cache exists

### Natural cache keys that do exist
- A natural deterministic key exists:
  - normalized raw query
  - search surface (`/search` vs `/explore`)
  - possibly filter context (`set`, `year`, `illustrator`, sort)
- But the repo does not implement a normalization cache on those keys today.

### Prompt-size / call-shape risk
- Query text itself is small, so prompt-size risk is not the main cost problem.
- The real cost-shape risk is call count amplification:
  - repeated submits
  - duplicate surfaces
  - mobile/web drift
  - lack of caching
  - lack of low-confidence gating

## 5. Latency and UX Landmine Audit

### Verified current latency reality
- Search is already slow for the wrong reason.
  - `RESOLVER_STRESS_TEST_V1.md`: average `17.7s`, P95 `25.1s`
  - `RESOLVER_REQUEST_PATH_AUDIT_V1.md`: direct resolver avg `14.4s`; product search route avg `15.4s`
- Current bottleneck is overwhelmingly network-bound, not local ranking compute.

### AI latency risk by insertion point
- Pre-search inline normalization: `HIGH`
  - every query pays AI before any deterministic route decision
  - worst place for cost and responsiveness
- Mid-resolver normalization before candidate retrieval: `HIGH`
  - would sit directly in the hot path of `/search`
  - likely still followed by `/explore` for non-direct matches
- Inline augmentation inside `getExploreRows`: `HIGH`
  - explore already fans out across RPC, TCGDex, set metadata, and pricing lookups
  - adding AI here would make already-slow search feel worse
- Post-failure suggestion generation only: `LOWER`, but still `DEFER`
  - safest UX boundary later because it can be optional and only shown when deterministic confidence is low

### UX conclusion
- AI does not belong in the current hot path.
- If it ever exists, the safest UX shape is not inline authority. It is a secondary recovery/suggestion layer after deterministic failure or ambiguity.
- Streaming or staged UX would likely be required later if AI is used interactively, because current inline search already feels slow. That is a future design question, not something the repo is ready for now.

## 6. Trust / Identity Risk Audit

### Risk verdict
- False certainty risk: `HIGH`
- Explainability degradation risk: `HIGH`
- Canonical identity contamination risk: `HIGH` if AI crosses candidate-selection authority
- Wrong redirect / wrong-card risk: `HIGH`

### Repo-grounded reasons
- Grookai’s current direct resolver is intentionally conservative.
  - ambiguous set intent returns `sets` list routing instead of forcing a card
  - alias lane is intentionally disabled until a real deterministic alias table exists
- Printed identity is still modeled deterministically.
  - `search_card_prints_v1` is exact about set/number matching order
  - `resolveStructuredCollectorQuery` requires unique match before redirecting to a card
- The current resolver is explainable from code.
  - parse -> deterministic filters -> deterministic ranking -> redirect/fallback
- AI normalization would weaken that explainability unless every rewrite were logged, visible, replayable, and contract-bound.

### Specific trust landmines
- Wrong redirects on ambiguous cards
  - promo families
  - set alias overlap
  - shared names across eras
  - variant-labeled queries where the variant cue is semantically important
- Hidden ranking drift
  - if AI rewrites query terms before deterministic retrieval, maintainers may debug the wrong query
- Canonical identity contamination
  - if AI ever becomes final candidate selector or redirect authority, it would cross the current deterministic identity spine
- Trust-surface degradation
  - users would see a deterministic result page but the real interpretation would be opaque

### Strict conclusion
- AI must not become canonical identity authority in the current architecture.
- AI must not silently rewrite queries and feed results without surfacing that a rewrite occurred.

## 7. Architecture Boundary Recommendation

### Safest allowed AI boundary, if any
- Only safe future boundary identified from current repo structure:
  - **post-deterministic, low-confidence, suggestion-only query rewrite**
  - examples of acceptable future role:
    - “Did you mean” suggestion
    - optional alternate query suggestion
    - non-authoritative hint generation after deterministic parse fails or stays ambiguous

### Why this is the safest boundary
- It preserves deterministic candidate retrieval and identity resolution as canonical truth.
- It avoids silent rewrites in the main hot path.
- It matches the existing conservative repo posture:
  - ambiguous direct resolver results already fall back instead of overcommitting
  - alias lane is intentionally deferred pending real contract/table support

### Explicitly forbidden boundaries
- AI as final identity selector
- AI as automatic redirect authority for `/search`
- AI inside `search_card_prints_v1` ranking authority
- AI silently rewriting every query before `/search` and `/explore`
- AI write paths that mutate canonical identity or alias truth without separate contract

## 8. Observability Readiness

### What exists
- Query-count telemetry
  - `search_performed` event in `trackServerEvent.ts`
  - founder aggregates top search terms and counts in `apps/web/src/app/founder/page.tsx`
- Ad hoc timing instrumentation in code
  - `publicSearchResolver.ts` and `getExploreRows.ts` both track staged timings via `globalThis.__grookaiResolverTiming`
- Existing audit harnesses
  - `docs/audits/RESOLVER_STRESS_TEST_V1.md`
  - `docs/audits/RESOLVER_REQUEST_PATH_AUDIT_V1.md`

### What is missing
- persisted resolver confidence
- persisted candidate trace / rank trace
- failure bucket analytics by query class
- rewrite logging
- cache hit/miss instrumentation
- surface-specific normalization metrics
- mobile/web cross-surface comparison analytics
- query replay harness for ambiguous/weak queries tied to production telemetry

### Readiness judgment
- Current observability readiness for safe AI experimentation: `LOW`
- Experimentation would still be partially blind because the repo can count queries, but it cannot reliably explain:
  - why a search failed
  - whether a rewrite helped
  - whether a wrong redirect came from deterministic logic or an AI rewrite
  - what the spend/latency impact was per normalization event

## 9. Strongest Non-AI Alternatives Still Available

These deterministic alternatives are still open in the current repo and should be exhausted first:

1. Real alias / nickname table for `resolveAliasOrNickname`
   - strongest unfilled deterministic gap visible in `publicSearchResolver.ts`
2. Expand deterministic promo and variant lexicon
   - `getExploreRows.ts` variant cues are still narrow
   - stress audit still shows variant/promo misses
3. Route/path consolidation
   - current split between `/search` and `/explore` creates serial overhead and duplicated interpretation cost
4. Query preprocessing improvements
   - stronger token segmentation for promo codes, set aliases, collector formats, and glued terms
5. Deterministic “did you mean” / alternate query suggestions
   - typo/alias dictionary and normalized suggestion tables
6. Shared search contract across web and mobile
   - mobile still falls back to legacy direct `card_prints` queries
   - search authority should be unified before introducing any AI layer
7. Resolver-grade observability
   - candidate traces, failure classes, confidence flags, and query replay should exist before AI is added

## 10. Final Decision
- Final decision: `DEFER`

The repo does not support a safe AI-assisted normalization rollout today. The current resolver/search system is deterministic but split, slow because of remote request fanout, weakly instrumented at the decision layer, and still has obvious deterministic improvements left. AI would not fix the main proven bottleneck, would increase operational complexity and hidden cost, and would create trust/identity landmines before Grookai has the instrumentation and contracts needed to contain them. The idea is not rejected forever, but it is not ready for implementation and should not move into build phase yet.

## 11. Preconditions Before Any Future Contract

Any future implementation contract should be blocked until all of the following are true:

1. Resolver authority is clearly contracted
   - web `/search`
   - web `/explore`
   - mobile catalog search
   - any fallback behavior
   - all must define which layer is authoritative and which are fallback-only
2. Resolver observability exists at decision level
   - persisted confidence/failure buckets
   - candidate trace or equivalent replayable evidence
   - normalization event logging
   - per-surface metrics
3. Deterministic alias / promo / variant gaps are re-audited after another deterministic pass
   - especially the currently empty alias lane
4. A hard architecture contract forbids AI from final identity selection
   - AI may not redirect to a canonical card without deterministic confirmation
5. A cache/key contract exists for any AI normalization layer
   - no uncached hot-path normalization
   - no duplicate normalization across web/mobile without explicit strategy
6. A trust-surface contract exists for AI assistance
   - rewritten or suggested queries must be visible and explainable
   - no silent fallback behavior
7. Cost/latency experiment plan is measurable before rollout
   - budget ceilings
   - cache hit expectations
   - per-query instrumentation
   - abort criteria

