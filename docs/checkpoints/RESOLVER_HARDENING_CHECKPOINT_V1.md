# RESOLVER_HARDENING_CHECKPOINT_V1

## 1. Checkpoint Summary

This checkpoint freezes the verified state of the deterministic web resolver after the first hardening sequence. It records that web resolver authority, normalization authority, deterministic language coverage, and ranked scoring are now governed by explicit repo-native contracts instead of scattered behavior. It also records what this sequence did not solve, what remains intentionally deferred, and what future resolver work must preserve to avoid reintroducing fragmentation, silent scoring drift, or premature AI discussion.

## 2. Completed Phases

### Resolver Hardening Contract V1

Purpose:
- collapse live web resolver entrypoints behind one gateway
- establish one canonical ranked resolver authority without breaking existing routes

Key artifacts:
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [route.ts](/c:/grookai_vault/apps/web/src/app/search/route.ts)
- [ExplorePageClient.tsx](/c:/grookai_vault/apps/web/src/components/explore/ExplorePageClient.tsx)
- [RESOLVER_HARDENING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/RESOLVER_HARDENING_CONTRACT_V1.md)

What changed:
- live web resolver traffic now enters through `apps/web/src/lib/resolver/resolveQuery.ts`
- ranked resolver authority was explicitly fixed on `/explore`
- `/search` became a direct-resolution adapter routed through the gateway
- shared resolver trace logging was added at the gateway seam

What did not change:
- no scoring changes in that phase
- no normalization consolidation in that phase
- no mobile collapse
- no route removal

### Normalization Contract V1

Purpose:
- centralize deterministic web query preprocessing behind one authoritative normalization module

Key artifacts:
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [NORMALIZATION_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/NORMALIZATION_CONTRACT_V1.md)

What changed:
- one normalization packet now exists for live web resolver traffic
- direct and ranked web resolver paths consume packetized normalized inputs
- gateway tracing now exposes normalization outputs
- client-side pre-normalization in the live web path was demoted from authority

What did not change:
- no scoring changes
- no alias expansion campaign
- no candidate retrieval redesign
- no mobile work

### Alias + Variant Coverage Contract V1

Purpose:
- expand small deterministic language coverage for safe set-code forms, promo-family forms, and safe variant phrases

Key artifacts:
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- [ALIAS_VARIANT_COVERAGE_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/ALIAS_VARIANT_COVERAGE_CONTRACT_V1.md)

What changed:
- safe deterministic set-code normalization was expanded
- safe promo-family normalization was expanded
- safe variant phrase normalization was expanded
- coverage signals now show when set, promo, and variant normalization rules fired

What did not change:
- no scoring changes in that phase
- no fuzzy matching
- no large alias corpus
- no AI

### Scoring Contract V1

Purpose:
- formalize ranked resolver scoring so strong structured evidence consistently outranks weak broad overlap

Key artifacts:
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [SCORING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/SCORING_CONTRACT_V1.md)

What changed:
- ranked scoring in the canonical `/explore` resolver is now explicit and contract-backed
- fraction and promo evidence now contribute directly to ranked scoring
- `reverse` cue evidence now reaches ranked scoring
- top-result tracing now exposes score, component weights, and structured evidence contribution

What did not change:
- no direct `/search` identity redesign
- no fuzzy matching
- no mobile work
- no schema or migration changes

## 3. Resolver System State Now

Verified current state:
- web resolver authority
  - live web resolver traffic now enters through [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
  - canonical ranked resolver authority remains [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
  - `/search` remains a direct-resolution adapter, not a competing ranked resolver authority
- normalization authority
  - live web normalization authority is [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
  - direct and ranked resolver paths both consume the same normalization packet
- alias and variant coverage state
  - safe deterministic coverage exists for:
    - set-code normalization such as `sv8 -> sv08`
    - promo-family normalization such as `swsh020 -> swshp`
    - small variant phrase normalization such as `alt-art -> alt art` and `reverse-holo -> reverse`
  - coverage remains intentionally narrow and explainable
- scoring state
  - ranked scoring is explicit and structured-evidence-aware in [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
  - strong structured evidence now materially influences top-rank outcomes
  - direct resolver behavior remains separate
- tracing and observability state
  - gateway tracing now exposes:
    - raw and normalized query
    - normalization outputs
    - coverage signals
    - resolver path used
    - candidate count
    - execution time
    - top ranked result score and score components for ranked search

UNVERIFIED:
- full mobile parity
- complete search quality across all real-world query classes

## 4. Verified Wins

The following improvements are now repo-grounded and contract-backed:
- one live web resolver gateway exists in [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- one live web normalization authority exists in [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- canonical ranked resolver authority remains [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts), rather than being split across multiple competing web entrypoints
- direct and ranked web resolver paths now consume a shared normalization packet instead of duplicating authoritative preprocessing
- deterministic language coverage for safe set, promo, and variant forms is broader and observable
- ranked resolver scoring is now explicit, inspectable, and more aligned with structured search intent
- top-ranked result decisions are traceable through score components rather than only visible as final output order
- the repo now has resolver contracts that freeze authority, normalization, coverage, and scoring boundaries instead of relying on implied behavior

## 5. Known Remaining Limits

The following limits remain open or intentionally deferred:
- known unresolved query classes still exist
  - `greninja gold star`
  - `pikachu sv promo`
- those unresolved examples are currently classified in [SCORING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/SCORING_CONTRACT_V1.md) as normalization or coverage limits, not scoring drift
- mobile remains a separate resolver surface and was not collapsed in this sequence
- network latency and request fanout in ranked search were not addressed by these phases
- deterministic alias coverage is still intentionally narrow, not exhaustive
- AI remains deferred and is still not justified as necessary based on current repo evidence
- this checkpoint does not prove perfect query handling, only that the deterministic web resolver is now less fragmented and more governable

## 6. Guardrails Going Forward

Future resolver work must preserve these rules:
- do not reintroduce competing live web resolver entrypoints outside [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- do not duplicate authoritative normalization logic outside [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts) for the live web path
- do not change ranked scoring silently; scoring changes must remain explicit and contract-backed
- do not collapse ambiguity into forced identity certainty without new audited evidence and explicit contract approval
- do not treat AI as necessary unless deterministic limits are re-proven after these hardening phases
- do not expand coverage through speculative, opaque, or non-explainable rules
- do not let `/search` regain competing ranked-resolver authority
- do not treat mobile behavior as implicitly covered by web hardening unless parity is explicitly audited and contracted later

## 7. Allowed Next Steps

The following categories of future work are now valid follow-ons, based on current repo state:
- targeted deterministic normalization or coverage expansion for unresolved query classes
- resolver UX work around ambiguity handling, candidate presentation, or empty/weak-result honesty
- request fanout or latency hardening for the ranked resolver path
- mobile parity work, if separately audited and contracted
- further observability or regression instrumentation for resolver quality

These are allowed because they build on the now-explicit authority, normalization, coverage, and scoring boundaries rather than bypassing them.

## 8. Explicit Non-Goals of This Checkpoint

This checkpoint does not claim:
- complete search correctness
- complete query coverage
- mobile parity
- fuzzy search
- AI resolver adoption
- exhaustive alias coverage
- solved latency or request fanout
- elimination of all ambiguous resolver cases

## 9. Verification Basis

This checkpoint is based on the following repo artifacts:
- [RESOLVER_HARDENING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/RESOLVER_HARDENING_CONTRACT_V1.md)
- [NORMALIZATION_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/NORMALIZATION_CONTRACT_V1.md)
- [ALIAS_VARIANT_COVERAGE_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/ALIAS_VARIANT_COVERAGE_CONTRACT_V1.md)
- [SCORING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/SCORING_CONTRACT_V1.md)
- [AI_RESOLVER_L3_AUDIT_V1.md](/c:/grookai_vault/docs/audits/AI_RESOLVER_L3_AUDIT_V1.md)
- [RESOLVER_HARDENING_L3_AUDIT_V1.md](/c:/grookai_vault/docs/audits/RESOLVER_HARDENING_L3_AUDIT_V1.md)
- [RESOLVER_STRESS_TEST_V1.md](/c:/grookai_vault/docs/audits/RESOLVER_STRESS_TEST_V1.md)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
