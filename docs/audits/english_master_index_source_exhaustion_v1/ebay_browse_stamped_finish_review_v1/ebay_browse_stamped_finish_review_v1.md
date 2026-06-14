# eBay Browse Stamped Finish Review V1

Audit-only source review for stamped Master Index blockers. This report does not promote eBay listings into canonical truth and does not perform DB writes.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- write_ready_now: 0
- source_policy: eBay Browse listing titles are volatile review evidence only; they are not automatically promoted into Master Index truth.

## Summary

- rows_targeted: 23
- browse_queries_attempted: 23
- browse_queries_succeeded: 23
- exact_title_match_rows: 3
- exact_title_matches: 4
- partial_title_match_rows: 1

| review_status | count |
| --- | --- |
| no_usable_title_evidence | 19 |
| exact_title_review_candidate_not_promotable | 3 |
| partial_title_review_only | 1 |

## Review Rows

| set | number | card | variant | finish | search | exact | partial | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| me02 | 26 | Suicune | gamestop_stamp | holo | ok | 1 | 0 | exact_title_review_candidate_not_promotable |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse | ok | 1 | 0 | exact_title_review_candidate_not_promotable |
| sm6 | 102 | Beast Ring | league_stamp | reverse | ok | 2 | 0 | exact_title_review_candidate_not_promotable |
| xy1 | 83 | Honedge | regional_championships_stamp | reverse | ok | 0 | 1 | partial_title_review_only |

## Governance

- eBay Browse evidence is volatile marketplace evidence.
- Exact title matches are review candidates only.
- A future promotion path must preserve item URL, retrieval timestamp, and title validation checks, and must not overwrite stronger preserved source evidence.
