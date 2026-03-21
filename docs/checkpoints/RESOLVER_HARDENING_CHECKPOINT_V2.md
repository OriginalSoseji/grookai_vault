# RESOLVER_HARDENING_CHECKPOINT_V2

## 1. Checkpoint Summary

This checkpoint freezes the deterministic resolver system after Coverage Expansion V2. It exists because resolver hardening is no longer just a set of local improvements. The web resolver now has explicit authority, centralized normalization, bounded deterministic language coverage, formal ranked scoring, explicit resolver states, and observable decision traces. This checkpoint records that post-V2 state as the governing baseline so future work cannot quietly drift back into split authority, duplicated preprocessing, silent scoring changes, or premature AI pressure.

## 2. Completed Resolver Phases

### 1. Resolver Hardening Contract V1

Purpose:
- unify live web resolver entrypoints behind one gateway
- establish one canonical ranked resolver authority

Key artifacts:
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [route.ts](/c:/grookai_vault/apps/web/src/app/search/route.ts)
- [ExplorePageClient.tsx](/c:/grookai_vault/apps/web/src/components/explore/ExplorePageClient.tsx)
- [RESOLVER_HARDENING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/RESOLVER_HARDENING_CONTRACT_V1.md)

What changed:
- live web resolver traffic now enters through the gateway
- canonical ranked authority was fixed on `/explore`
- `/search` was routed through the same gateway
- shared resolver tracing was introduced

What did not change:
- no scoring changes in that phase
- no normalization consolidation in that phase
- no mobile parity work
- no route removal

### 2. Normalization Contract V1

Purpose:
- centralize deterministic query preprocessing for the live web resolver path

Key artifacts:
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [NORMALIZATION_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/NORMALIZATION_CONTRACT_V1.md)

What changed:
- one normalization packet became authoritative for live web queries
- direct and ranked resolver paths both consume packetized normalized inputs
- normalization outputs became visible in gateway tracing

What did not change:
- no scoring changes
- no large alias expansion
- no mobile work
- no schema changes

### 3. Alias + Variant Coverage Contract V1

Purpose:
- add small deterministic language coverage for safe set, promo, and variant forms

Key artifacts:
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- [ALIAS_VARIANT_COVERAGE_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/ALIAS_VARIANT_COVERAGE_CONTRACT_V1.md)

What changed:
- safe set-code normalization expanded
- safe promo-family normalization expanded
- safe variant phrase normalization expanded
- `coverageSignals` were added for set, promo, and variant rules

What did not change:
- no scoring changes
- no fuzzy matching
- no large alias corpus
- no AI

### 4. Scoring Contract V1

Purpose:
- formalize ranked scoring so structured evidence consistently outranks weak generic overlap

Key artifacts:
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [SCORING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/SCORING_CONTRACT_V1.md)

What changed:
- ranked scoring priorities became explicit
- fraction and promo evidence now contribute directly in ranked scoring
- top-result score tracing was added

What did not change:
- no direct `/search` redesign
- no fuzzy matching
- no mobile work
- no schema changes

### 5. Resolver UX / Ambiguity Contract V1

Purpose:
- make weak, ambiguous, and no-match behavior explicit and honest

Key artifacts:
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [route.ts](/c:/grookai_vault/apps/web/src/app/search/route.ts)
- [ExplorePageClient.tsx](/c:/grookai_vault/apps/web/src/components/explore/ExplorePageClient.tsx)
- [RESOLVER_UX_AMBIGUITY_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/RESOLVER_UX_AMBIGUITY_CONTRACT_V1.md)

What changed:
- resolver states were introduced:
  - `STRONG_MATCH`
  - `AMBIGUOUS_MATCH`
  - `WEAK_MATCH`
  - `NO_MATCH`
- auto-resolution was restricted to `STRONG_MATCH`
- ranked no-match, weak-match, and ambiguous states became visible in `/explore`
- resolver decision tracing now exposes state and score-gap information

What did not change:
- no scoring-weight changes
- no normalization-rule changes in that phase
- no mobile work
- no broad UI redesign

### 6. Resolver Coverage Expansion V2

Purpose:
- improve weak deterministic query coverage using a small, evidence-driven rule set

Key artifacts:
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [RESOLVER_COVERAGE_EXPANSION_V2.md](/c:/grookai_vault/docs/contracts/RESOLVER_COVERAGE_EXPANSION_V2.md)

What changed:
- targeted special-family phrase normalization was added
- targeted promo-family shorthand and phrase bridging were added
- new coverage trace categories were added:
  - `specialRules`
  - `shorthandRules`
  - `familyRules`

What did not change:
- no scoring changes
- no fuzzy matching
- no AI
- no mobile work
- no large alias project

## 3. Current Resolver Architecture (Web)

Resolver gateway:
- authoritative web entrypoint: [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- responsibilities:
  - normalize once
  - route to direct or ranked resolver
  - emit shared resolver trace data
  - emit resolver-state metadata

Normalization authority:
- authoritative normalization module: [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- responsibilities:
  - produce one normalized query packet
  - extract deterministic structured tokens
  - attach coverage signals

Ranked resolver:
- canonical ranked resolver: [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- responsibilities:
  - retrieve ranked candidates
  - apply formal scoring contract
  - expose top-score trace data

Direct resolver path:
- direct resolver implementation: [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- responsibilities:
  - handle direct `gv_id`
  - resolve structured collector queries
  - resolve exact set and set-intent paths
  - remain conservative relative to ranked search

Route flow:
- `/search`
  - [route.ts](/c:/grookai_vault/apps/web/src/app/search/route.ts)
  - flow:
    - request query
    - gateway normalization and direct resolution
    - redirect only for `STRONG_MATCH`
    - otherwise fall through to `/sets` or `/explore` as appropriate

- `/explore`
  - [ExplorePageClient.tsx](/c:/grookai_vault/apps/web/src/components/explore/ExplorePageClient.tsx)
  - flow:
    - request query
    - gateway normalization and ranked resolution
    - ranked rows plus resolver-state metadata
    - honest state messaging for weak, ambiguous, or no-match cases

Architecture rule now frozen:
- there is one live web resolver gateway
- there is one live web normalization authority
- there is one canonical ranked resolver
- direct resolution remains separate but routed through the same gateway

## 4. Resolver Behavior Model

Current resolver states:

- `STRONG_MATCH`
  - occurs when the top result is strong enough to trust as a deterministic winner
  - ranked rules are defined in [RESOLVER_UX_AMBIGUITY_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/RESOLVER_UX_AMBIGUITY_CONTRACT_V1.md)
  - system response:
    - `/search` may auto-resolve
    - `/explore` still renders ranked results, but the state is strong

- `AMBIGUOUS_MATCH`
  - occurs when multiple plausible candidates remain or the top result does not separate cleanly
  - system response:
    - do not auto-resolve
    - show ranked candidates
    - surface ambiguity honestly

- `WEAK_MATCH`
  - occurs when candidates exist but deterministic evidence is thin or under-structured
  - system response:
    - do not auto-resolve
    - show results as approximate
    - do not imply certainty

- `NO_MATCH`
  - occurs when no viable ranked candidates exist
  - system response:
    - do not fabricate fallback matches
    - show honest no-match state

Auto-resolution rules now frozen:
- `/search` may redirect only on `STRONG_MATCH`
- ambiguity may not be silently collapsed
- weak matches may not be presented as strong certainty

## 5. Normalization + Coverage State

Normalization currently handles:
- lowercase normalization
- whitespace cleanup
- safe punctuation cleanup
- token extraction
- collector-number extraction
- fraction extraction
- promo token extraction
- set-token extraction
- variant token extraction
- direct `gv_id` normalization

Structured packet outputs currently include:
- `expectedSetCodes`
- `promoTokens`
- `variantTokens`
- `possibleSetTokens`
- `setConsumedTokens`
- `collectorExpectations`
- `numberTokens`
- `fractionTokens`

Coverage state after V1 and V2:
- safe set-code normalization exists
  - examples:
    - `sv8 -> sv08`
    - existing safe set alias phrases from `STRUCTURED_CARD_SET_ALIAS_MAP`
- safe promo-family normalization exists
  - examples:
    - `swsh020 -> swshp`
    - `svp -> svp`
    - `sv promo -> svp`
    - `scarlet violet promo -> sv promo -> svp`
- safe variant phrase normalization exists
  - examples:
    - `alt-art -> alt art`
    - `reverse-holo -> reverse`
    - `black star promo -> promo`
- special-family normalization exists
  - example:
    - `gold star -> ★`

Coverage V2 specifically added:
- `gold star` bridging into printed-star card names already present in repo data
- Scarlet & Violet promo family bridging
- exact promo-family shorthand token handling
- additional trace categories for special-family and shorthand rules

Current `coverageSignals` categories:
- `setRules`
- `promoRules`
- `variantRules`
- `specialRules`
- `shorthandRules`
- `familyRules`

## 6. Scoring State

Current ranked scoring state:
- authority remains in [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- structured evidence materially dominates generic name overlap

Structured evidence priorities now include:
- direct `gv_id` exact hit
- exact collector number match
- exact fraction match
- expected set code match
- promo-token exact or promo-family match
- strong variant cue match
- exact or near-exact name/token overlap

Tie-breaking remains:
1. score
2. `name`
3. `set_name`
4. `number`
5. `gv_id`

What scoring intentionally does not do:
- it does not perform fuzzy matching
- it does not invent missing structured evidence
- it does not collapse ambiguity into forced identity certainty
- it does not act as AI interpretation

## 7. Observability State

Resolver observability now exposes:
- normalization outputs
  - normalized query
  - normalized tokens
  - collector and fraction tokens
  - promo and set tokens
- coverage signals
  - set
  - promo
  - variant
  - special
  - shorthand
  - family
- resolver decision state
  - `resolverState`
- ranked score visibility
  - `topScore`
  - `secondScore`
  - `scoreGapToSecond`
- candidate visibility
  - `candidateCount`
- auto-resolution visibility
  - `autoResolved`
- winning-result evidence
  - top result id
  - top score components
  - structured evidence contributions

This observability is exposed through [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts) and ranked timing metadata from [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts).

## 8. Verified Improvements

Verified improvements across phases:
- resolver fragmentation on web has been reduced
  - one gateway now fronts live web resolution
- normalization authority is centralized
  - live web queries pass through one normalization packet
- structured ranked resolution is stronger and more explicit
  - exact set, number, fraction, and promo evidence outrank weak generic overlap
- ambiguity honesty has improved
  - generic `charizard` and `pikachu` queries are no longer treated like strong certainty
- weak deterministic language gaps improved in V2
  - `greninja gold star` moved from `WEAK_MATCH` to `STRONG_MATCH`
  - `pikachu sv promo` moved from `WEAK_MATCH` to `AMBIGUOUS_MATCH`
  - `pikachu scarlet violet promo` moved from `WEAK_MATCH` to `AMBIGUOUS_MATCH`
  - `pikachu sv black star promo` moved from `WEAK_MATCH` to `AMBIGUOUS_MATCH`
- safe non-regression controls held
  - `pikachu swsh020` remained `STRONG_MATCH`
  - `charizard 4/102 base` remained `STRONG_MATCH`
  - `greninja star` remained `WEAK_MATCH`, proving the V2 family rule did not over-expand into unsafe generic `star`

## 9. Known Remaining Limits

Remaining limits supported by current repo artifacts:
- not all weak queries are solved
- some family or shorthand gaps may still remain outside the small, audited working sets
- some queries may remain intentionally ambiguous even after coverage improvements
- mobile is still a separate surface and is not yet routed through the web gateway
- there is still no fuzzy search
- there is still no AI interpretation layer
- the alias corpus remains intentionally bounded, not exhaustive
- ranked resolver request fanout and network latency were not addressed by these phases

UNVERIFIED:
- complete mobile parity
- exhaustive recall across all real-world user phrasing
- persisted query-log coverage at production scale, because the repo does not currently expose a persistent resolver query-log store

## 10. Guardrails (CRITICAL)

Future work must not violate these rules:
- do not reintroduce multiple live web resolver entrypoints outside [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- do not duplicate authoritative normalization logic outside [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts) for live web traffic
- do not silently change ranked scoring
- do not bypass resolver states when deciding whether to auto-resolve
- do not collapse ambiguity into forced identity certainty without new audited evidence
- do not introduce AI into the resolver without a new audit and contract
- do not expand coverage with speculative or opaque rules
- do not treat mobile as covered by web hardening unless parity is explicitly audited and contracted

## 11. Allowed Next Steps

Based on the current state, the following categories of work are now safe follow-ons:
- mobile parity work that routes mobile through the same resolver gateway model
- further targeted, evidence-driven deterministic coverage expansion
- resolver UX polish built on the existing resolver-state model
- observability or regression instrumentation improvements
- later AI evaluation only if a new audit is performed after deterministic limits are re-proven

These are allowed because the architecture, behavior model, and guardrails are now explicit.

## 12. Explicit Non-Goals

This system does not yet include:
- fuzzy search
- full alias corpus coverage
- AI interpretation
- mobile parity
- perfect recall
- exhaustive query analytics persistence

This checkpoint also does not claim complete search perfection. It freezes the current hardened deterministic baseline only.

## 13. Verification Basis

This checkpoint is grounded in the following repo artifacts:
- [RESOLVER_HARDENING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/RESOLVER_HARDENING_CONTRACT_V1.md)
- [NORMALIZATION_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/NORMALIZATION_CONTRACT_V1.md)
- [ALIAS_VARIANT_COVERAGE_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/ALIAS_VARIANT_COVERAGE_CONTRACT_V1.md)
- [SCORING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/SCORING_CONTRACT_V1.md)
- [RESOLVER_UX_AMBIGUITY_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/RESOLVER_UX_AMBIGUITY_CONTRACT_V1.md)
- [RESOLVER_COVERAGE_EXPANSION_V2.md](/c:/grookai_vault/docs/contracts/RESOLVER_COVERAGE_EXPANSION_V2.md)
- [RESOLVER_HARDENING_CHECKPOINT_V1.md](/c:/grookai_vault/docs/checkpoints/RESOLVER_HARDENING_CHECKPOINT_V1.md)
- [AI_RESOLVER_L3_AUDIT_V1.md](/c:/grookai_vault/docs/audits/AI_RESOLVER_L3_AUDIT_V1.md)
- [RESOLVER_HARDENING_L3_AUDIT_V1.md](/c:/grookai_vault/docs/audits/RESOLVER_HARDENING_L3_AUDIT_V1.md)
- [RESOLVER_STRESS_TEST_V1.md](/c:/grookai_vault/docs/audits/RESOLVER_STRESS_TEST_V1.md)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- [route.ts](/c:/grookai_vault/apps/web/src/app/search/route.ts)
- [ExplorePageClient.tsx](/c:/grookai_vault/apps/web/src/components/explore/ExplorePageClient.tsx)
