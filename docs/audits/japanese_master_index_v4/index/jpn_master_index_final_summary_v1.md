# Japanese Master Index V4 Final Package

Generated: `2026-07-27T01:05:00.000Z`
Status: `complete_no_write_master_index`

## Index

- Existing Japanese parents: **26047**
- Fresh source assertions: **99195**
- Identity candidates: **71992**
- Conservative distinct lower bound: **41825**
- Source-isolated upper bound: **71992**
- Novel conservative candidates: **15778**
- Explicit conflict rows: **50952**
- Residual automated targeted work: **0**
- Future-release work deferred: **3**

## Strict Admission

- Discovered sets/products adjudicated: **1453**
- Master-admissible sets/products: **1426**
- Source assertions disposed: **215784**
- Working card identities: **71992**
- Master-admissible card identities: **28008**
- Blocked card identities: **43806**
- Adjudicated identity exclusions: **178**
- Working printing facts: **71900**
- Master-admissible printing facts: **0**
- Blocked printing facts: **71900**
- Family relationships: **28008**
- Explicit source gaps: **115717**

## Source Completion

| Tier | Lane | Containers | Assertions | Status |
|---|---|---:|---:|---|
| primary | artofpkm_jp_cards | 419 / 419 | 23015 | complete |
| primary | limitless_jp_cards | 262 / 262 | 19904 | complete |
| primary | official_jp_cards | 137 / 137 | 9843 | complete |
| primary | serebii_jp_cards | 165 / 165 | 14477 | complete |
| primary | tcgdex_ja_cards | 177 / 177 | 8159 | complete |
| targeted | bulbapedia_jp_card_lists | 152 / 152 | 18113 | complete |
| targeted | pokeguardian_release_reports | 54 / 54 | 5684 | complete |

## Gates

| Result | Gate |
|---|---|
| PASS | final_union_includes_primary_and_targeted_sources |
| PASS | all_governed_source_lanes_present |
| PASS | all_governed_source_lanes_complete |
| PASS | zero_source_fetch_or_parser_failures |
| PASS | raw_source_evidence_archives_are_verified |
| PASS | release_uses_packaged_source_evidence_only |
| PASS | targeted_queue_fingerprint_is_pinned |
| PASS | zero_residual_automated_targeted_work |
| PASS | zero_incomplete_or_pending_governed_source_lanes |
| PASS | baseline_manifest_is_the_frozen_union_input |
| PASS | strict_admission_checks_all_pass |
| PASS | strict_admission_uses_final_candidate_union |
| PASS | strict_admission_execution_boundary_has_no_mutation |
| PASS | fresh_live_read_only_baseline_matches_frozen_baseline |
| PASS | english_family_reference_is_unchanged_live |
| PASS | union_execution_boundary_has_no_mutation |
| PASS | repository_change_scope_is_audit_only |
| PASS | full_local_replay_is_reproducible |

## Boundary

- Database writes: `false`
- Storage writes: `false`
- Canonical identity promotion: `false`
- Family promotion: `false`
- English mutation: `false`

This package is a strict master-admissible index plus explicit blocked, conflict, exclusion, and source-gap records. It is not a database payload and does not authorize promotion.
