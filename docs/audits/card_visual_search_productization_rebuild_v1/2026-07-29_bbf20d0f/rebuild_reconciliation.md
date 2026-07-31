# Visual Search V1 Productization Rebuild Reconciliation

Date: 2026-07-29

Status: `reconciled_with_documented_ranker_hardening`

Producing SHA: `bbf20d0f4a59e61c4d529f523de0a9721c964dd9`

## Stage Counts

| Stage | Exact | Rebuilt counts |
| --- | --- | --- |
| eligibility | yes | `{"source_ids":11000,"tier_a":2687,"tier_b":7015,"tier_c":1298,"search_eligible":9702,"energy_rows_eligible":0}` |
| grouping | yes | `{"eligible_rows":9702,"artwork_groups":9532,"memberships":9702,"conflict_rows":0}` |
| projection | yes | `{"projected_artworks":9532,"documents":28596,"evidence_entries":357413,"exclusions":168046,"projection_failures":0}` |
| bootstrap | yes | `{"total_queries":250,"calibration_queries":200,"holdout_queries":50,"holdout_executed":false,"failure_count":142,"indexed_entries":321937}` |

## Semantic Files

| File | Byte-identical | Rebuilt SHA-256 |
| --- | --- | --- |
| eligibility/eligibility_decisions.jsonl | yes | `d099d5602a54eacec7887b8e8624070f7b89726206609347a3916aec1e11daff` |
| grouping/artwork_groups.jsonl | yes | `8fe68c81b8baaf06e716fbb92dd6e59bd3b760fdb3e24e894136986f50a82922` |
| grouping/artwork_group_memberships.jsonl | yes | `e8e4226ccafb90c69f6da7c991e41f0bde875a1749610463134f8fa64289cb06` |
| projection/visual_search_artworks.jsonl | yes | `f709b8ce3804ba79474288b01b3fea6f65d780f05a8fb3803ca5627eebd52e16` |
| projection/visual_search_documents.jsonl | yes | `663d4a8a2abdbc3cc3230e4208a3168a7eb92006a8bcfbe56fcf2a58527e721b` |
| projection/visual_search_concept_evidence.jsonl | yes | `b8161741642d0433f1944dd425ac101e73018c28be94f36f87b32fc89d35d69f` |
| bootstrap/query_suite.jsonl | yes | `76268725e798fdc8d5d7ec7af4220058d9877605d364493bb77867f7c72a2afc` |
| bootstrap/evaluation_failures.jsonl | yes | `42668007732c5cb5cf621271e8bc300ab84dcb724c167ce73784d2c168514e05` |
| bootstrap/holdout_judgment_seals.jsonl | yes | `d02999d18454384e5d9c48fec9e64f5334e43186677df38b0eda693179cda866` |
| bootstrap/ranked_outputs.jsonl | no | `8a7b9fefc63db2364f1c76982534a0470fd15f9ccf1a6944eb94bf361f24bf7f` |

## Ranker Reconciliation

- Queries compared: `200`
- Top-result changes: `0`
- Result-window changes: `3`
- Total-match changes: `8`
- Match expansions: `0`
- Match reductions: `8`
- Failure classifications byte-identical: `true`
- Cause: later governed hardening `fix: reject negated visual search evidence`

The locked bootstrap predates the negative-evidence hardening. The
productization replay is therefore stricter for eight queries. It introduces no
match expansions, changes no top result, and preserves the exact calibration
failure classifications.

## Boundaries

No provider call, database connection or write, approval, embedding, holdout
execution, public search activation, or pricing change occurred.
