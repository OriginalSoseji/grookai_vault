# Semantic Support Drift Repair Replay

Source paid run: `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_arch_env_repair_dry_run/2026-07-18T15-55-38-238Z_dry_run_9165e0e5b12c`

## Source Paid Run

- Attempted: 25
- Validated before repair: 19
- Failed before repair: 6
- Needs review before repair: 13
- Pending before repair: 6
- Requests/retries: 26/1
- Tokens: input 222756, output 105621, total 328377
- Estimated cost: $0.2484192

## Repair Scope

- evidence-backed scene_type stylized background pattern labels
- evidence-backed pointing action labels
- evidence-backed clasping hands action labels
- evidence-backed light streak motif labels
- object-only semantic cameo labels are dropped instead of accepted
- ambiguous neutral/sad expression text is normalized to objective facial evidence

## Replay Result

- Previous failures replayed: 6
- Previous failures now valid: 6
- Previous failures still failed: 0
- Previous validated rows replayed: 19
- Previous validated rows still valid: 19
- Previous validated rows now failed: 0
- Total after replay: 25/25 valid

## Rows Repaired

- GV-PK-JPN-M5-118 | Mega Darkrai ex: before fact_graph_semantic_fact_label_not_supported_v1:sem_001; after valid; status pending
- GV-PK-JPN-M5-109 | Gladion's Final Battle: before fact_graph_semantic_fact_label_not_supported_v1:semfact_001; after valid; status needs_review
- GV-PK-JPN-M5-117 | Gwynn: before fact_graph_interpreted_expression_not_allowed, fact_graph_loose_semantic_label_outside_semantic_visual_facts; after valid; status needs_review
- GV-PK-JPN-M5-116 | Gladion's Final Battle: before fact_graph_semantic_fact_label_not_supported_v1:semfact_008; after valid; status needs_review
- GV-PK-JPN-M5-111 | Gwynn: before fact_graph_semantic_fact_label_not_supported_v1:sem_fact_001; after valid; status needs_review
- GV-PK-JPN-M5-073 | ごうかいボム: before fact_graph_semantic_fact_label_not_supported_v1:sem_001; after valid; status pending

## Boundaries

No OpenAI calls, database writes, approvals, embeddings, semantic search, Taste Engine, Listing Resolver, or production apply were performed.
