# Launch Proof Search Fallback Repair Replay

Source paid run: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_support_drift_repair_dry_run/2026-07-18T19-00-39-893Z_dry_run_41f0e884059b`

## Source Paid Run

- Attempted: 25
- Validated before repair: 21
- Failed before repair: 4
- Needs review before repair: 14
- Pending before repair: 7
- Requests/retries: 25/0
- Tokens: input 222756, output 100668, total 323424
- Estimated cost: $0.2404944

## Repair Scope

- neutral and neutral/concerned expression semantic facts are treated as evidence-only and dropped
- evidence-backed star sparkle motif semantic facts are allowed
- fallback search-term derivation recognizes underscore salience values such as primary_subject_detail
- fallback search-term derivation prefers descriptive observation labels over generic normalized labels

## Replay Result

- Previous failures replayed: 4
- Previous failures now valid: 4
- Previous failures still failed: 0
- Previous validated rows replayed: 21
- Previous validated rows still valid: 21
- Previous validated rows now failed: 0
- Total after replay: 25/25 valid

## Rows Repaired

- GV-PK-JPN-M5-078 | ムク: before fact_graph_semantic_fact_label_not_supported_v1:fact_sem_001; after valid; status needs_review
- GV-PK-JPN-M5-117 | Gwynn: before fact_graph_semantic_fact_label_not_supported_v1:semfact_004; after valid; status needs_review
- GV-PK-JPN-M5-111 | Gwynn: before fact_graph_search_terms_missing, semantic_tags_missing; after valid; status needs_review
- GV-PK-JPN-M5-110 | Rust Syndicate Grunt: before fact_graph_semantic_fact_label_not_supported_v1:semantic_001, fact_graph_semantic_fact_label_not_supported_v1:semantic_002; after valid; status needs_review

## Boundaries

No OpenAI calls, database writes, approvals, embeddings, semantic search, Taste Engine, Listing Resolver, or production apply were performed.
