# Fact Graph V2 Launch-Value 25 Deterministic Repair Replay

Status: OFFLINE REPAIR PASSED; LIVE LOCK NOT CLAIMED

## Scope

- Prompt: `CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2`
- Schema: `CARD_VISUAL_FACT_GRAPH_SCHEMA_V2`
- Model used by source runs: `gpt-4.1-mini`, image detail `high`
- Energies: deferred/excluded
- DB writes: `0`
- Approvals: `0`
- Embeddings/downstream integrations/story generation: `0`

## Live Runs

### docs/audits/card_visual_fact_graph_v2_launch_value_25_dry_run/2026-07-17T21-26-04-988Z_dry_run_7626a76c2d3d

- attempted: 25
- live validated: 14
- live failed: 11
- live pending: 5
- live needs_review: 9
- estimated cost: $0.2480872
- request_count: 25
- input_tokens: 220006
- output_tokens: 105381
- total_tokens: 325387
- offline replay after repair: 25/25 valid
- recovered previous failures: 11
- generated outputs newly failed: 0

### docs/audits/card_visual_fact_graph_v2_launch_value_25_dry_run/2026-07-17T21-56-45-176Z_dry_run_3a11bae7e273

- attempted: 25
- live validated: 11
- live failed: 14
- live pending: 2
- live needs_review: 9
- estimated cost: $0.2520328
- request_count: 25
- input_tokens: 220006
- output_tokens: 108903
- total_tokens: 328909
- offline replay after repair: 25/25 valid
- recovered previous failures: 14
- generated outputs newly failed: 0

## Aggregate Offline Replay

- replayed payloads: 50
- valid after repair: 50
- failed after repair: 0
- recovered previous failures: 25
- previously valid rows newly failed: 0

## Deterministic Repair Classes

- drop evidence-only semantic labels such as colored eyes, neutral mouth, serious/cannot-determine expression, and generic human-character labels
- drop unsupported intention/generic pose semantic labels such as ready for attack, stance, and pose
- allow directly visible semantic labels for winking, gestures, aurora/lightning/electricity effects, bridges, stairs, fences, tables, windows, plants, and explosion/impact effects
- normalize exact counts by clearing stale estimated range values while preserving invalid many-count conflicts for validation
- normalize human body-region and facial-evidence rows through objective visual text cleanup
- derive card UI abstentions when a card UI observation already says unreadable, weak, or cannot determine

## Decision

Do not claim live 25-card lock from this gate. The paid live reruns exposed model variance, but both saved 25-card payload sets replay cleanly after deterministic repair. The next gate should be one fresh paid launch-value 25-card dry run with this code frozen, only if the user authorizes another model-cost run.

