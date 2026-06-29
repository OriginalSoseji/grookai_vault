# MEE-DAILY-HEALTH-REPORT-V1

## Status

- Health status: `pass`
- Package fingerprint: `e57e7653dd23228e5a5788c396e05804e494aebad70bfe5956673eac569e7d20`
- Findings: `none`
- Public/app-visible pricing writes: `false`

## Reference Candidates By Source

| source | rows | latest_created_at |
| --- | --- | --- |
| ebay_active | 15 | Thu Jun 25 2026 21:14:27 GMT+0000 (Coordinated Universal Time) |
| pokemontcg_io_reference | 14592 | Mon Jun 29 2026 00:40:42 GMT+0000 (Coordinated Universal Time) |
| tcgcsv_reference | 7605 | Mon Jun 29 2026 00:44:36 GMT+0000 (Coordinated Universal Time) |
| tcgdex_cardmarket_reference | 200069 | Sun Jun 28 2026 16:01:32 GMT+0000 (Coordinated Universal Time) |
| tcgdex_tcgplayer_reference | 110675 | Sun Jun 28 2026 16:01:32 GMT+0000 (Coordinated Universal Time) |

## Reference Normalized By Source

| source | rows | latest_normalized_at |
| --- | --- | --- |
| pokemontcg_io_reference | 14592 | Mon Jun 29 2026 00:41:04 GMT+0000 (Coordinated Universal Time) |
| tcgcsv_reference | 7605 | Mon Jun 29 2026 00:44:37 GMT+0000 (Coordinated Universal Time) |
| tcgdex_cardmarket_reference | 200069 | Sun Jun 28 2026 16:14:12 GMT+0000 (Coordinated Universal Time) |
| tcgdex_tcgplayer_reference | 110675 | Sun Jun 28 2026 16:14:12 GMT+0000 (Coordinated Universal Time) |

## Listing Warehouse Counts

| table_name | rows | latest_created_at |
| --- | --- | --- |
| market_listing_acquisition_runs | 4 | Sat Jun 27 2026 07:40:54 GMT+0000 (Coordinated Universal Time) |
| market_listing_card_candidates | 183635 | Sat Jun 27 2026 08:33:59 GMT+0000 (Coordinated Universal Time) |
| market_listing_observations | 218866 | Sat Jun 27 2026 07:40:54 GMT+0000 (Coordinated Universal Time) |
| market_listing_price_events | 218866 | Sat Jun 27 2026 07:40:54 GMT+0000 (Coordinated Universal Time) |
| market_listing_query_cache | 4005 | Fri Jun 26 2026 02:07:43 GMT+0000 (Coordinated Universal Time) |
| market_listing_raw_snapshots | 218866 | Sat Jun 27 2026 07:40:54 GMT+0000 (Coordinated Universal Time) |
| market_listing_rollups | 10701 | Sun Jun 28 2026 13:56:06 GMT+0000 (Coordinated Universal Time) |

## Lifecycle Current State

| metric | rows | latest_created_at |
| --- | --- | --- |
| lifecycle_public_boundary_rows | 0 |  |
| market_evidence_lifecycle_events | 3537849 | Sun Jun 28 2026 19:58:27 GMT+0000 (Coordinated Universal Time) |
| market_evidence_observations | 505407 | Sun Jun 28 2026 19:58:14 GMT+0000 (Coordinated Universal Time) |

## Review Disposition Status

| review_lane | review_status | review_disposition | rows |
| --- | --- | --- | --- |
| candidate_review | blocked | review_blocked | 231 |
| candidate_review | blocked | review_split_required | 544 |
| candidate_review | resolved | review_defer_more_evidence | 761 |
| classification_review | blocked | review_reclassify | 19 |
| high_signal_review | blocked | review_blocked | 8 |
| high_signal_review | blocked | review_split_required | 6 |
| high_signal_review | resolved | review_defer_more_evidence | 199 |
| low_signal_monitor | resolved | monitor_only | 380 |
| reference_only_review | resolved | review_defer_active_market_evidence | 4 |

## Publication Gate Candidates

| gate_decision | evidence_lane | rows |
| --- | --- | --- |
| blocked_classification | classification_blocked | 19 |
| blocked_lane_split_required | mixed_raw_slab | 574 |
| blocked_low_signal | low_signal | 156 |
| blocked_low_signal | unknown | 18 |
| blocked_reference_only | reference_metric | 915 |
| defer_review_confirmation | raw_single | 378 |
| defer_review_confirmation | slab | 92 |

## Normalization Assignment Queue

| source | assignment_queue_reason | rows |
| --- | --- | --- |
| ebay_active | excluded_or_ambiguous_non_candidate | 34210 |
| ebay_active | missing_candidate | 1021 |

## Public Boundary Probe

```json
{
  "lifecycle_public_rows": 0,
  "disposition_public_rows": 0,
  "listing_candidate_direct_publish_rows": 0
}
```

## Timers

```
NEXT                            LEFT LAST                         PASSED UNIT                                ACTIVATES
Mon 2026-06-29 02:49:51 UTC 1h 54min -                                 - grookai-mee-reference-refresh.timer grookai-mee-reference-refresh.service
Mon 2026-06-29 03:25:37 UTC 2h 30min Sun 2026-06-28 06:48:16 UTC 18h ago grookai-mee-nightly.timer           grookai-mee-nightly.service
Mon 2026-06-29 03:38:22 UTC 2h 42min Sun 2026-06-28 06:39:05 UTC       - grookai-mee-post-ingest.timer       grookai-mee-post-ingest.service

3 timers listed.

```

## Latest Artifacts

```json
{
  "reference_delta_writer": [
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_reference_warehouse_delta_writer_v1_2026-06-29T00-43-59-021Z.json",
      "mtime_ms": 1782693877959.682,
      "package_fingerprint_sha256": "ad37785edf551c901508308de3ee5574149f0bf0e25a61dfbb1e7512a7e58214",
      "findings": [],
      "mode": "guarded_run_missing_rows_only"
    },
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_reference_warehouse_delta_writer_v1_2026-06-29T00-39-54-431Z.json",
      "mtime_ms": 1782693668471.0725,
      "package_fingerprint_sha256": "988b08a6b57d4c720076fbcdd687da52abaeb5e88cdaa2c34cf3816a31177e4a",
      "findings": [],
      "mode": "guarded_run_missing_rows_only"
    },
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_reference_warehouse_delta_writer_v1_2026-06-29T00-37-59-430Z.json",
      "mtime_ms": 1782693517621.63,
      "package_fingerprint_sha256": "e26d266911601c10a640e29e679d632a287cce99e411ea34fa941718613bca3e",
      "findings": [
        "tcgdex_audit_missing",
        "preflight_findings_block_run"
      ],
      "mode": "guarded_run_missing_rows_only"
    }
  ],
  "reference_refresh_worker": [
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_reference_source_refresh_worker_v1_2026-06-29T00-43-41-615Z.json",
      "mtime_ms": 1782693838785.5684,
      "package_fingerprint_sha256": "6bba6c0262cd175c68ebf18a8f3830cbe6cbcad2466a1933cfb1006d3a60e035",
      "findings": [],
      "mode": "run"
    },
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_reference_source_refresh_worker_v1_2026-06-29T00-37-34-351Z.json",
      "mtime_ms": 1782693479188.5166,
      "package_fingerprint_sha256": "c9f074a3c56cc5689b80c098447b4087b0f7d5ff05bedcddf0b7e011d7aff916",
      "findings": [],
      "mode": "run"
    },
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_reference_source_refresh_worker_v1_2026-06-29T00-34-11-689Z.json",
      "mtime_ms": 1782693251699.838,
      "package_fingerprint_sha256": "d071f71d4e28aa935f9478ba84818f2ad64e376cfbbe29dec8555d6ae4a97fc1",
      "findings": [],
      "mode": "dry_run"
    }
  ],
  "post_ingest_orchestrator": [
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_nightly_post_ingest_orchestrator_v1_2026-06-29T00-45-34-340Z.json",
      "mtime_ms": 1782694006351.0532,
      "package_fingerprint_sha256": "f00ec8e8decf72778080b0f1ff05864f1ae589b9fccf499e56e485d8c132ed13",
      "findings": [],
      "mode": "dry_run_plan_only"
    },
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_nightly_post_ingest_orchestrator_v1_2026-06-29T00-45-18-472Z.json",
      "mtime_ms": 1782693918485.7993,
      "package_fingerprint_sha256": "01fd0f66865f40bea45022dee11b140056a97fe6b70e43dbda92e207ef3f4c65",
      "findings": [],
      "mode": "dry_run_plan_only"
    },
    {
      "path": "docs/audits/market_evidence_engine_v1/mee_nightly_post_ingest_orchestrator_v1_2026-06-28T21-31-09-644Z.json",
      "mtime_ms": 1782682421336.7375,
      "package_fingerprint_sha256": "c89ebff74664136b25cb7f47a85b60122d5a9277b1a8139253538227232ea4a7",
      "findings": [],
      "mode": "run_readbacks_only"
    }
  ],
  "foundation_checkpoint": []
}
```
