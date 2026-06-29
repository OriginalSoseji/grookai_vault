# MEE Price Publication Policy V1

Status: plan-only

Date: 2026-06-29

## Objective

Define the first deterministic policy for moving internal Market Evidence Engine price candidates toward future publication review.

This is not public pricing. It does not publish prices, write app-visible prices, write `pricing_observations`, write `ebay_active_prices_latest`, or create market truth.

## Source Roles

Providers create evidence only:

- eBay active listings provide asking-price evidence, not sold-comparable truth.
- TCGCSV, PokemonTCG.io, TCGdex, and other free/reference APIs provide reference context only.
- No provider may set `can_publish_price_directly`, `publishable`, `app_visible`, or `market_truth`.

Grookai owns matching, classification, quality gates, lane separation, review decisions, and publication policy.

## Evidence Lanes

The policy keeps evidence lanes separate:

- `raw_single`: candidate raw-card asking-price evidence.
- `slab`: graded-card asking-price evidence, held until grade-specific policy exists.
- `reference`: context-only evidence; never publishable by itself.

Raw singles and slabs must never share a displayed median.

## Initial Policy Decisions

The candidate view may produce these internal decisions:

- `raw_single_policy_candidate`
- `raw_single_review_candidate`
- `hold_slab_grade_policy`
- `hold_high_value_manual_review`
- `hold_special_lane_policy`
- `hold_outlier_review`
- `hold_reference_context_only`
- `defer_more_evidence`
- `defer_review`
- `blocked_public_boundary`
- `blocked_unknown_source_type`
- `blocked_lane_unknown`

None of these decisions are app-visible prices.

## Candidate Thresholds

The first future-publication-review candidate is deliberately narrow:

| Lane | Required source type | Required status | Evidence count | Seller count | Price cap | Spread rule |
| --- | --- | --- | ---: | ---: | ---: | --- |
| raw_single | active_listing | high_confidence internal_candidate | >= 20 | >= 8 | < 250 USD median | candidate_high / candidate_low < 20 |

`raw_single_review_candidate` uses lower review thresholds, but does not qualify for future publication review:

| Lane | Evidence count | Seller count |
| --- | ---: | ---: |
| raw_single | >= 8 | >= 4 |

## Mandatory Holds

The policy holds these cases:

- all slab rows until grade-specific policy exists,
- all reference-only rows,
- all high-value raw single rows at or above 250 USD median,
- all wide-spread rows where candidate_high / candidate_low is 20 or more,
- World Championship, McDonald's, Trainer Kit, Base Set first edition, Shadowless, and 1999-2000 special lanes,
- any row with a public-boundary flag already set.

## Future Work

Before anything becomes app-visible, Grookai still needs a separate public pricing contract that writes a governed destination, preserves replay hashes, and defines user-facing display copy.
