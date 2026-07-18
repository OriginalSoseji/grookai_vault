# Live Proof Semantic Label Repair Replay

## Context

The fresh 25-card OpenAI dry run at `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_proof_dry_run/2026-07-18T13-12-33-464Z_dry_run_45feb5f3f1e7` failed the live-lock gate before this repair. It attempted 25 cards, validated 21, failed 4, and spent an estimated $0.2540672. No database writes, approvals, embeddings, or downstream integrations occurred.

## Repair

This repair is deterministic and offline only. It does not change schema, prompt version, database behavior, embeddings, or model settings.

- Electricity semantic motif labels are accepted when backed by electric/lightning observations.
- Alert expression/state labels are accepted only when backed by non-circular visible attention evidence such as open eyes, looking forward, upright posture, or upright orientation, and no contradiction such as eyes closed or face not visible is present.
- Hands-on-hips action labels are accepted when backed by visible pose/body-language evidence.

## Replay Result

- Previous validation failures replayed: 4
- Previous validation failures now valid: 4
- Previously valid generated rows replayed: 21
- Previously valid generated rows still valid: 21
- OpenAI calls: 0
- DB writes: false

## Failed Rows Before Repair

| GV-ID | Name | Before finding | After status | After findings |
| --- | --- | --- | --- | --- |
| GV-PK-JPN-M5-112 | Mega Zeraora ex | fact_graph_semantic_fact_label_not_supported_v1:sem_002 | validated | none |
| GV-PK-JPN-M5-096 | Mega Zeraora ex | fact_graph_semantic_fact_label_not_supported_v1:semfact_pose_alert_001 | validated | none |
| GV-PK-JPN-M5-063 | メガドリュウズex | fact_graph_semantic_fact_label_not_supported_v1:sem_fact_002 | validated | none |
| GV-PK-JPN-M5-110 | Rust Syndicate Grunt | fact_graph_semantic_fact_label_not_supported_v1:svf_pose_female_001 | validated | none |

## Decision

The repair passes offline replay, but Visual Fact Graph V2 live lock is not claimed. The next gate remains one fresh 25-card OpenAI dry-run proof with code frozen for the duration of the run.
