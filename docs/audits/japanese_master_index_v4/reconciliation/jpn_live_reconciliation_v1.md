# Japanese Master Index V4 Live Reconciliation

Status: `complete_read_only_reconciliation`

## Boundary

- Production database reads: transaction-guarded and read-only
- Database writes: false
- Storage writes: false
- English mutation: false
- Promotion payload generated: false

## Summary

- Master-admissible cards: 28008
- Existing parents aligned: 22150
- Existing parents with core drift: 167
- Existing parents with any promotion blocker: 2224
- Novel parent delta candidates: 38
- Novel candidates dependent on set inserts: 3850
- Novel candidates blocked: 1803
- Promotion-ready novel candidates with image evidence: 3888
- Master-admissible sets: 1426
- Existing exact live sets: 196
- Existing parent-anchored live sets: 103
- Set insert candidates: 1041
- Sets requiring mapping review: 86
- Missing evidence-lane memberships: 24484
- Cards missing at least one expected evidence lane: 17891
- Missing species links on matched parents: 0
- English family fingerprint unchanged: true

## Card Reconciliation Status

| Status | Rows |
|---|---:|
| existing_parent_aligned | 22150 |
| existing_parent_core_drift | 167 |
| novel_candidate_missing_from_live | 5691 |

## Promotion Readiness

| Status | Rows |
|---|---:|
| already_live | 20093 |
| blocked | 1803 |
| blocked_existing_review | 2224 |
| delta_candidate | 38 |
| delta_candidate_after_set_insert | 3850 |

## Set Reconciliation Status

| Status | Rows |
|---|---:|
| existing_alias_review_required | 43 |
| existing_exact_code | 196 |
| existing_name_ambiguous | 1 |
| existing_name_review_required | 24 |
| existing_parent_anchor | 103 |
| existing_parent_anchor_ambiguous | 18 |
| missing_set | 1041 |

## Novel Candidate Blockers

| Blocker | Rows |
|---|---:|
| collector_facing_english_name_missing | 1788 |
| set_mapping_not_promotion_safe | 15 |

## Missing Evidence Lanes

| Source family | Rows |
|---|---:|
| bulbapedia | 6897 |
| limitless | 77 |
| official_jp | 5629 |
| serebii | 10113 |
| tcgdex | 1768 |

This is a reconciliation report, not a database payload or promotion approval.
