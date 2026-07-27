# Japanese Master Index V4 Card Acquisition Plan

Generator: `JPN-MASTER-INDEX-CARD-ACQUISITION-PLAN-V1`

This is a deterministic, no-fetch, no-database-write plan. It does not promote card identities.

## Summary

| Measure | Count |
| --- | ---: |
| Source lanes | 11 |
| Independent source groups | 11 |
| Registry-backed work items | 2,335 |
| Preserved live evidence rows | 116,589 |
| Missing assertion dispositions | 0 |

## Source Lanes

| Tier | Lane | Authority | Set assertions | Preserved rows | Dispositions |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | artofpkm_jp_cards | collector_archive | 419 | 23,868 | scheduled: 419 |
| 1 | limitless_jp_cards | structured_collector_database | 262 | 18,462 | scheduled: 262 |
| 1 | official_jp_cards | primary_official | 640 | 21,294 | scheduled: 137, release_context_only: 503 |
| 1 | tcgdex_ja_cards | structured_community_api | 177 | 6,061 | scheduled: 177 |
| 2 | bulbapedia_jp_card_lists | community_reference | 160 | 4,111 | targeted_after_primary_delta: 160 |
| 2 | pokeguardian_release_reports | release_report | 59 | 0 | targeted_after_primary_delta: 59 |
| 2 | pokellector_jp_manual | collector_database | 0 | 17,734 |  |
| 2 | serebii_jp_cards | editorial_checklist | 165 | 0 | scheduled: 165 |
| 2 | tcgcollector_jp_manual | structured_collector_database | 453 | 25,059 | manual_review_only: 453 |
| 3 | bounded_marketplace_review | corroborating_marketplace_evidence | 0 | 0 | gap_targeted_after_primary_harvest: 1 |
| 3 | historical_distribution_archives | mixed_historical_evidence | 0 | 0 | gap_targeted_after_primary_harvest: 1 |

## Guardrails

- Pokellector remains manual-only without written permission.
- Fresh source loss cannot remove preserved evidence.
- Editorial and marketplace lanes are targeted after primary-source deltas, not bulk-crawled.
- Every adapter must preserve raw snapshots and replay offline before its assertions enter the union.
- This plan contains no database credentials and performs no network requests.

