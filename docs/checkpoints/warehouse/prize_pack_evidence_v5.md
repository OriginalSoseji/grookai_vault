# Prize Pack Evidence V5

Generated at: 2026-04-20T04:01:09.707Z

## Context

This pass recomputes the post-Batch-5 Prize Pack wait pool, selects the highest-yield contiguous coverage-window slice, and resolves that slice without widening into promotion or canon mutation.

## Current Prize Pack State

- wait_for_more_evidence: 291
- do_not_canon_total: 125
- already_promoted_prize_pack_total: 252

## Coverage Window Selection

- Series 1-2: 136
- Series 2-3: 55
- Series 3-4: 37

Selected window: Series 1-2
Shared question: Across Prize Pack Series 1 and 2, does this unique-base-route row appear in Series 1 only, in both Series 1 and 2, or in neither series?
Bounded slice size: 59
Set cluster used to stay bounded: swsh5, swsh6

## Evidence Sources Used

- Bulbapedia Prize Pack Series One raw card list (community transcription of the cited official card list)
- Bulbapedia Prize Pack Series Two raw card list (community transcription of the cited official card list)
- Resolved official checklist URLs for Series 1 and Series 2 as reference targets; local fetch remains bot-gated
- Existing Prize Pack evidence V4 input and Batch 5 closure artifacts

## Reclassification Summary

- rows_investigated: 59
- moved_to_ready: 0
- moved_to_do_not_canon: 40
- still_wait: 19

## Decision Patterns

- [1,2]: 40
- [1]: 19

## Newly READY_FOR_WAREHOUSE

- None in this pass. Single-series hits stayed WAIT because the best reproducible evidence remained TIER_3.

## Newly DO_NOT_CANON

- Kricketune V | 006/163 | swsh5 | confirmed_series=1, 2
- Cherrim | 008/163 | swsh5 | confirmed_series=1, 2
- Octillery | 037/163 | swsh5 | confirmed_series=1, 2
- Single Strike Urshifu V | 085/163 | swsh5 | confirmed_series=1, 2
- Single Strike Urshifu VMAX | 086/163 | swsh5 | confirmed_series=1, 2
- Rapid Strike Urshifu V | 087/163 | swsh5 | confirmed_series=1, 2
- Rapid Strike Urshifu VMAX | 088/163 | swsh5 | confirmed_series=1, 2
- Houndoom | 096/163 | swsh5 | confirmed_series=1, 2
- Bronzong | 102/163 | swsh5 | confirmed_series=1, 2
- Bruno | 121/163 | swsh5 | confirmed_series=1, 2
- Cheryl | 123/163 | swsh5 | confirmed_series=1, 2
- Escape Rope | 125/163 | swsh5 | confirmed_series=1, 2

## Still WAIT

- Victini VMAX | 022/163 | swsh5 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Empoleon V | 040/163 | swsh5 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Orbeetle | 065/163 | swsh5 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Crobat | 091/163 | swsh5 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Tyranitar V | 097/163 | swsh5 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Corviknight V | 109/163 | swsh5 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Corviknight VMAX | 110/163 | swsh5 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Exp. Share | 126/163 | swsh5 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Blaziken V | 020/198 | swsh6 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Blaziken VMAX | 021/198 | swsh6 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Froslass | 036/198 | swsh6 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5
- Zeraora V | 053/198 | swsh6 | reason=single_series_match_but_best_evidence_tier_remains_tier_3_v5

## Remaining Prize Pack Backlog

- wait_for_more_evidence: 251
- do_not_canon_total_after_v5: 165
- already_promoted_total: 252
- BASE_ROUTE_AMBIGUOUS: 38
- NO_SERIES_CONFIRMATION_UNINVESTIGATED: 194
- SINGLE_SERIES_MATCH_COMMUNITY_ONLY: 19

## Recommended Next Step

- PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V6

