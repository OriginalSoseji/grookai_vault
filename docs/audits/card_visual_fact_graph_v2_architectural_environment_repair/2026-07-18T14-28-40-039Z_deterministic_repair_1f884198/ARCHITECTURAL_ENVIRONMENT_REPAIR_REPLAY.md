# Architectural Environment Label Repair Replay

## Context

The fresh 25-card OpenAI dry run at `docs/audits/card_visual_fact_graph_v2_launch_value_25_after_semantic_label_repair_dry_run/2026-07-18T13-58-31-907Z_dry_run_45a7daa17908` completed with 24/25 structurally validated and 1 validation failure. It spent an estimated $0.2510464. No database writes, approvals, embeddings, or downstream integrations occurred.

## Repair

The validator now accepts evidence-backed architectural environment labels such as `brick wall corridor`, `corridor`, `wall`, `brick`, `arches`, and `lamps` when the semantic fact cites supporting observations. This is a vocabulary support repair, not a prompt or schema change.

## Replay Result

- Previous validation failures replayed: 1
- Previous validation failures now valid: 1
- Previously valid generated rows replayed: 24
- Previously valid generated rows still valid: 24
- OpenAI calls: 0
- DB writes: false

## Failed Rows Before Repair

| GV-ID | Name | Before finding | After status | After findings |
| --- | --- | --- | --- | --- |
| GV-PK-JPN-M5-078 | ムク | fact_graph_semantic_fact_label_not_supported_v1:sem_fact_003 | validated | none |

## Decision

The repair passes offline replay, but Fact Graph V2 live lock is not claimed. The next gate remains one fresh 25-card OpenAI dry-run proof with code frozen for the duration of the run.
