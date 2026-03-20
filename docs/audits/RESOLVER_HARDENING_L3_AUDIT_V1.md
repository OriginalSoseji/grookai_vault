# RESOLVER_HARDENING_L3_AUDIT_V1

## 1. Executive Summary

The resolver feels bad because Grookai Vault does not currently have one resolver. It has multiple deterministic search/resolution surfaces with different normalization, different ranking behavior, and different fallback behavior:
- web `/search` direct resolver
- web `/explore` ranked results resolver
- mobile catalog search with RPC-first then legacy fallback
- separate deterministic matchers for import and identity workflows

The core problem is structural fragmentation more than missing intelligence. Repo evidence shows the public search path is already heavily network-bound, can pay both `/search` and `/explore`, duplicates query interpretation across layers, and still has obvious alias/promo/variant normalization gaps. The system is not fundamentally unsalvageable, but it is fragmented and needs consolidation, normalization hardening, and resolver-grade observability before any AI layer should be reconsidered.

## 2. Resolver Topology Map

### Web entry points
- Public search submit: `apps/web/src/components/PublicSearchForm.tsx`
  - `handleSubmit -> buildPublicSearchDestination(query) -> router.push(nextUrl)`
- Structured/direct route: `apps/web/src/app/search/route.ts`
  - `GET -> auth.getUser -> trackServerEvent(search_performed) -> resolvePublicSearch(rawQuery)`
- Ranked results surface: `apps/web/src/components/explore/ExplorePageClient.tsx`
  - `useEffect -> getExploreRows(normalizedQuery, sortMode, exactSetCode, exactReleaseYear, exactIllustrator)`

### Web resolver paths
- `/search`
  - authority: `apps/web/src/lib/publicSearchResolver.ts`
  - goal: direct resolution only
  - outputs:
    - single card redirect
    - single set redirect
    - set-list redirect
    - fallback to `/explore`
- `/explore`
  - authority: `apps/web/src/lib/explore/getExploreRows.ts`
  - goal: ranked result list
  - runs in client-triggered fetch flow through `ExplorePageClient`

### Mobile entry points
- Catalog search entrypoints: `lib/main.dart`
  - `_runSearch -> CardPrintRepository.searchCardPrints(...)`
  - `_onQueryChanged` debounces by `300ms`
- Mobile search authority: `lib/models/card_print.dart`
  - prefers RPC `search_card_prints_v1`
  - falls back to legacy direct `card_prints` queries on RPC error or empty result

### Duplicate or adjacent deterministic matchers
- Import matcher: `apps/web/src/lib/import/matchCardPrints.ts`
  - exact deterministic set/name/number matching for import preview
- Identity scan candidate resolver: `backend/identity/identity_scan_worker_v1.mjs`
  - uses `search_card_prints_v1` in a separate pipeline

### Data sources and DB surfaces
- `public.search_card_prints_v1`
  - defined in `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql`
  - deterministic SQL search contract over `public.v_card_search`
- `public.v_card_search`
  - defined in `supabase/migrations/20251213153627_baseline_views.sql`
- direct `card_prints` queries
  - used by `publicSearchResolver.ts`
  - used by mobile legacy fallback in `lib/models/card_print.dart`
- `sets`
  - used for set alias/set intent resolution
- `tcgdex_sets` and `tcgdex_cards`
  - used by `getExploreRows.ts` for set-aware candidate expansion
- pricing read surface
  - `getPublicPricingByCardIds(...)` is joined into explore rows

### Scoring/ranking locations
- `/search` direct resolver
  - no numeric scoring
  - deterministic staged unique-match gating
- `/explore`
  - explicit scoring in `apps/web/src/lib/explore/getExploreRows.ts`
  - `scoreRow`, `rankRows`, `compareRowsByRelevance`
- SQL search RPC
  - deterministic SQL ordering in `search_card_prints_v1`
- mobile fallback
  - no shared scoring contract
  - mostly query-mode and DB ordering based

### Request flow map
- Web direct-resolution path:
  - `PublicSearchForm -> buildPublicSearchDestination -> /search -> resolvePublicSearch -> card/set/explore redirect`
- Web ranked-results path:
  - `PublicSearchForm -> /explore -> ExplorePageClient useEffect -> getExploreRows -> RPC/queries -> ranked rows`
- Mobile path:
  - `CatalogSearchField -> debounce -> CardPrintRepository.searchCardPrints -> RPC or legacy direct queries -> list`

### Topology conclusion
- There is not one resolver.
- There are multiple competing deterministic resolvers with shared schema surfaces but different normalization and fallback rules.

## 3. Request Fanout Analysis

### Verified request counts
From `docs/audits/RESOLVER_REQUEST_PATH_AUDIT_V1.md`:

| Flow | Avg request count | Avg total latency |
| ------ | ------: | ------: |
| `direct_resolver` | `40.77` | `14386.93 ms` |
| `product_search_route` | `41.77` | `15401.88 ms` |
| `explore_results` | `11.50` | `3282.56 ms` |
| `product_search_to_explore` | `17.88` | `6036.53 ms` |

Also verified:
- average request count per end-to-end product query: `17.88`
- worst-case request count: `62`
- total requests across audited run: `465`

### Where duplication occurs
- Route duplication
  - `/search` can decide a query belongs on `/explore`
  - user can therefore pay `/search` interpretation cost and then `/explore` ranked-results cost
- Explore candidate duplication
  - `getExploreRows.ts` issues:
    - one primary `search_card_prints_v1` RPC
    - one extra RPC per significant text token
    - extra RPCs combining token + number
    - `tcgdex_sets` lookup
    - multiple `tcgdex_cards` lookups
    - follow-up `card_prints`, `sets`, and pricing lookups
- Mobile duplication
  - mobile first calls `search_card_prints_v1`
  - then reruns search through legacy direct queries when RPC returns empty or errors
- Client reruns
  - `ExplorePageClient` reruns search on query, sort, set, year, or illustrator changes
  - mobile reruns on every debounced query change

### Are results merged client-side?
- Web `/explore` merges multiple remote candidate sources inside `getExploreRows.ts` before client display.
- It dedupes ids after multiple RPC and TCGDex fetches, then builds rows and ranks them locally.

### Are retries or alternate paths present?
- Web public search:
  - yes, path-level alternate flow between `/search` and `/explore`
- Mobile:
  - yes, explicit RPC-first then legacy fallback

### Fanout conclusion
- Search quality is being degraded by architecture fragmentation and repeated remote work, not just ranking quality.
- The same intent is often interpreted more than once.

## 4. Normalization Pipeline Audit

### Where normalization happens
- Client routing normalization: `apps/web/src/lib/publicSearchRouting.ts`
  - `normalizeSearchInput`
  - `normalizeForClassification`
  - token-based structured-query detection
- Direct resolver normalization: `apps/web/src/lib/publicSearchResolver.ts`
  - `normalizeFallbackQuery`
  - `normalizeResolverInput`
  - `splitTokens`
  - `tokenizeWords`
  - `normalizeDigits`
  - `normalizeGvIdInput`
  - `parseCollectorFraction`
  - `parsePrintedNumberToken`
- Explore normalization: `apps/web/src/lib/explore/getExploreRows.ts`
  - `normalizeFreeTextQuery`
  - `normalizeTextForMatch`
  - `tokenizeNormalizedQuery`
  - `tokenizeQuerySegments`
  - `normalizeCollectorToken`
  - `normalizeDigits`
  - `buildResolverQuery`
- Shared set normalization: `apps/web/src/lib/publicSets.shared.ts`
  - `normalizeSetQuery`
  - `tokenizeSetWords`
  - set alias maps
- Mobile normalization: `lib/models/card_print.dart`
  - `_tokenize`
  - `_rawNumberDigits`
  - `_normalizeCardNumber`
  - `_extractNumberCandidate`
  - `_resolveSetByName`

### Centralized vs duplicated
- Duplicated, not centralized.
- Set normalization is partly shared in `publicSets.shared.ts`.
- General search normalization is not shared across:
  - client routing
  - direct resolver
  - ranked results
  - mobile

### Verified normalization capabilities
- Lowercasing: yes
- Whitespace compaction: yes
- ampersand normalization to `and`: yes
- punctuation cleanup: yes, but not consistently identical across all paths
- collector number normalization (`043` vs `43`): yes, in multiple places
- fraction parsing (`043/198`): yes
- Grookai ID normalization: yes in web direct resolver/routing
- set alias mapping: partial
- variant cue detection: partial

### Missing or weak normalization layers
- true alias/nickname resolution
  - `resolveAliasOrNickname()` is intentionally stubbed in `publicSearchResolver.ts`
- centralized promo normalization
- centralized variant vocabulary normalization
- shared normalization contract across web and mobile
- typo dictionary or deterministic suggestion layer: UNVERIFIED / not evidenced

### Normalization conclusion
- Normalization is one of the main architectural leaks.
- It exists in several layers, but it is duplicated and not contractually unified.

## 5. Alias + Variant Coverage Audit

### Set alias coverage
- Defined in:
  - `apps/web/src/lib/publicSearchRouting.ts`
  - `apps/web/src/lib/publicSets.shared.ts`
- Verified aliases include:
  - `151`, `pokemon 151`
  - `base set`
  - `brilliant stars`, `brs`
  - `lost origin`, `lor`
  - `silver tempest`, `sit`
  - `obs`, `svi`
  - some trainer gallery cases

### Alias coverage gaps
- Alias handling is finite and hand-curated.
- `resolveAliasOrNickname()` is unimplemented.
- Promo-family alias handling is weak.
- Mobile path does not use the same shared alias tables.

### Variant coverage
- Variant cue parsing in `getExploreRows.ts` supports:
  - `alt art`
  - `alternate art`
  - `full art`
  - `black star promo`
  - `promo`
  - `holo`
  - `rainbow`
  - `gold`
- Row-side variant cue detection uses:
  - `rarity`
  - `variant_key`
  - some text-based cues

### Proven gaps
- Stress test still shows variant failure:
  - `greninja gold star` -> wrong top result pattern remained flagged in `docs/audits/RESOLVER_STRESS_TEST_V1.md`
- Promo ambiguity is still visible:
  - `pikachu sv promo` top result was `_____'s Pikachu • basep • #24`
- Reverse holo handling is not evidenced in current explore cue set.
- Finish-level nuance is not strongly represented in resolver ranking.

### Coverage conclusion
- Alias and variant coverage are incomplete and inconsistent across surfaces.
- This is one of the main quality gaps still open.

## 6. Scoring Consistency Audit

### Where scoring happens
- SQL ranking
  - `search_card_prints_v1`
  - deterministic order by number match, set match, name, id
- Explore in-process ranking
  - `scoreRow`
  - `rankRows`
  - `sortRows`
- Direct resolver
  - no scoring model, only staged unique-resolution checks
- Mobile
  - RPC-first deterministic order
  - legacy direct query fallback with query-mode-specific ordering

### Evidence of inconsistency
- `/search` and `/explore` do not share one scoring function.
- `/search` resolves a card only when unique deterministic match exists.
- `/explore` ranks many candidates using a larger heuristic layer including:
  - text tokens
  - set cues
  - number cues
  - variant cues
  - TCGDex set-aware candidate expansion
- mobile fallback does not reuse web ranking logic
  - it changes query mode (`set+number`, `set`, `number`, `name+number`, `set+name`, `name`)
  - then trusts DB ordering or fallback relaxed-name behavior

### Stronger signals vs weaker signals
- SQL RPC strongly prioritizes number and set matching.
- Explore ranking adds variant and token weighting, but still permits weak name noise to compete in broader ranked results.
- Mobile legacy fallback can degrade into name-only or first-token relaxed search when deterministic RPC returns empty.

### Non-deterministic ranking behavior?
- Strictly speaking, ranking is deterministic per surface.
- But cross-surface behavior is inconsistent because different surfaces apply different ranking systems.

### Scoring conclusion
- The problem is not randomness.
- The problem is multiple deterministic scoring systems with different authority and different fallback behavior.

## 7. Identity Resolution Risk Audit

### When auto-resolution happens
- `/search` auto-redirects to a card only when:
  - GV ID matches exactly
  - structured collector parsing yields exactly one `gv_id`
  - exact canonical name yields exactly one match
- set intent resolves to a set only when exactly one set match exists

### Conservative behavior that exists
- ambiguous set intent returns `kind: "sets"` or falls back to `/explore`
- structured collector resolution returns `null` unless one unique match survives filters
- alias lane is intentionally disabled rather than guessing

### Risks that still remain
- Weak query can still land on poor ranked results in `/explore`
  - this is not silent canonical mis-resolution, but it is poor relevance
- Promo and variant ambiguity can put misleading top results in front of the user
- Mobile fallback can widen risk
  - if RPC yields nothing, legacy queries may broaden by name and even relax to first token

### False-positive risk
- Web direct resolver false-positive risk: `LOWER` than ranked-results risk because it is conservative
- Explore misleading-top-result risk: `HIGHER`
- Mobile legacy fallback false-positive risk: `HIGHER` than web direct resolver

### Identity guarantee conclusion
- The direct resolver is relatively cautious.
- The broader deterministic system still leaks silent quality risk through ranked-result ordering and mobile fallback broadening.

## 8. Observability Gaps

### What exists
- coarse telemetry:
  - `search_performed` in `apps/web/src/lib/telemetry/events.ts`
  - insert path in `apps/web/src/lib/telemetry/trackServerEvent.ts`
  - founder aggregates top search terms and counts in `apps/web/src/app/founder/page.tsx`
- audit harnesses:
  - `docs/audits/RESOLVER_REQUEST_PATH_AUDIT_V1.md`
  - `docs/audits/RESOLVER_STRESS_TEST_V1.md`
- in-process timing hooks:
  - `globalThis.__grookaiResolverTiming` in `publicSearchResolver.ts` and `getExploreRows.ts`

### What is missing
- persisted parsed-token logging
- candidate list logging
- per-candidate score logging
- final-decision explanation
- resolver confidence fields
- per-surface failure buckets
- production query replay path tied to telemetry
- mobile/web drift analytics

### Observability conclusion
- Resolver debugging is still mostly audit-script driven, not system-native.
- In day-to-day operation, the repo is effectively blind at the decision layer.

## 9. UX Failure Modes

### Verified UX behavior
- Web `/explore`
  - empty state: `No results yet.`
  - no suggestion system
  - no “did you mean”
  - no ambiguity explanation
  - no explanation of why top result won
- Mobile catalog search
  - empty state: `No results. Try another search term.`
  - no alternatives or explanation
- `/search`
  - redirects directly or falls through
  - user does not see resolver confidence or ambiguity reasoning

### Failure surfaces
- weak query
  - user just gets ranked results, even if the top result is weak
- multiple strong candidates
  - explore shows list, but without saying ambiguity is the reason
- ambiguous set/promo query
  - no structured explanation of ambiguity
- no-result query
  - no guided correction path

### UX conclusion
- Search feels bad partly because the system exposes raw ranking outcomes without enough ambiguity handling or explanation.
- It asks the user to infer confidence from result quality.

## 10. Root Cause Analysis

The resolver feels bad because quality is leaking at three structural boundaries:

1. **Architecture fragmentation**
   - There is no single deterministic resolver authority.
   - Web direct resolution, web ranked results, mobile fallback search, and adjacent deterministic matchers all interpret queries differently.

2. **Normalization fragmentation**
   - Query normalization is duplicated across routing, resolver, explore, and mobile.
   - Alias, promo, and variant handling are incomplete and not consistently shared.

3. **Request fanout dominates the experience**
   - Resolver quality is being buried under slow, repeated remote work.
   - Users feel slowness and inconsistency even when deterministic logic is technically sound in parts.

4. **Scoring systems are not unified**
   - SQL ordering, explore scoring, and mobile fallback logic are not one contract.
   - Strong signals are not guaranteed to dominate the same way across surfaces.

5. **Observability is too weak**
   - The repo can count searches and run stress audits, but it cannot natively explain production resolver decisions.

This is why the resolver feels bad:
- not because deterministic search is impossible
- but because the deterministic system is fragmented, under-instrumented, and still incomplete at the normalization layer

## 11. Required Fixes (P0 / P1 / P2)

### P0
- Consolidate search authority so web and mobile do not rely on competing resolver/fallback systems.
- Eliminate duplicate public resolver surfaces as authorities; one surface may route, but one deterministic ranking/resolution contract must own search behavior.
- Centralize normalization rules for query parsing, set aliases, collector numbers, promo codes, and variant cues.
- Remove silent quality broadening paths that bypass the primary deterministic contract, especially mobile legacy fallback drift.
- Add resolver-grade observability:
  - parsed query
  - candidate set
  - score/decision trace
  - failure bucket telemetry

### P1
- Expand deterministic alias coverage with a real alias/nickname layer.
- Expand promo and variant dictionaries and make them shared across surfaces.
- Harden ambiguity handling so weak/ambiguous ranked results are surfaced honestly rather than just shown as generic results.
- Reduce request fanout in the ranked-results path so quality work is not masked by latency and duplicate remote calls.

### P2
- Improve empty/weak-result UX with clearer ambiguity and recovery messaging.
- Add deterministic suggestion/correction surfaces only after normalization and authority are unified.
- Re-audit typo handling and other UNVERIFIED failure classes after the authority/normalization cleanup lands.

## 12. Final Verdict

The resolver is **fragmented and needs consolidation**.

It is not fundamentally unsound in the sense that the repo already contains useful deterministic building blocks:
- a real SQL search contract
- a cautious direct resolver
- explicit set/number parsing
- deterministic ranking code

But it is structurally flawed as a product system because those pieces are spread across multiple competing search authorities, duplicated normalization layers, and inconsistent fallback behavior.

Is AI still unnecessary after these fixes?
- `UNVERIFIED`

Current repo evidence does prove this much:
- AI is unnecessary **before** these fixes.
- After these deterministic fixes are complete and re-audited, the need for AI should be reassessed from fresh evidence rather than assumed now.

