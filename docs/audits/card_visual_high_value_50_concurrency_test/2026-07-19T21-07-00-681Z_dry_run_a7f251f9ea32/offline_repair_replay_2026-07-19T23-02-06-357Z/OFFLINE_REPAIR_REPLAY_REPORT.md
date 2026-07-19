# High-Value 50 Offline Repair Replay

Generated: 2026-07-19T23:02:06.357Z

Source run: `docs/audits/card_visual_high_value_50_concurrency_test/2026-07-19T21-07-00-681Z_dry_run_a7f251f9ea32`

Source run commit: `aa13afa441022378e2cdb274eeb64ba54136f155`

Repair base commit: `aa13afa441022378e2cdb274eeb64ba54136f155`

Branch: `feature/card-visual-description-agent`

No OpenAI calls, database writes, approvals, embeddings, or downstream integrations were performed.

## Summary

- Total failure rows: 9
- Replayable raw payloads: 8
- Replayable payloads now valid: 8
- Remaining invalid replayable payloads: 0
- Provider exceptions not replayable: 1

## Rows

| GV-ID | Name | Before Findings | Offline Replay Result | Classification |
| --- | --- | --- | --- | --- |
| GV-PK-SK-149 | Ho-oh | fact_graph_time_claim_without_time_field<br>fact_graph_unreadable_card_ui_missing_abstention:obs_card_ui_resistance_001 | valid | repaired_offline |
| GV-PK-DR-100 | Charizard | fact_graph_loose_semantic_label_outside_semantic_visual_facts | valid | repaired_offline |
| GV-PK-DS-111 | Groudon ★ | fact_graph_semantic_fact_label_not_supported_v1:sem_fact_003 | valid | repaired_offline |
| GV-PK-SLG-76 | Mewtwo GX | generation_exception | not replayable provider exception | not_replayable_provider_exception |
| GV-PK-CEC-215 | Blastoise & Piplup-GX | fact_graph_loose_semantic_label_outside_semantic_visual_facts | valid | repaired_offline |
| GV-PK-PRE-149 | Vaporeon ex | fact_graph_loose_semantic_label_outside_semantic_visual_facts | valid | repaired_offline |
| GV-PK-DS-13 | Rayquaza δ | fact_graph_semantic_fact_label_not_supported_v1:semfact_001 | valid | repaired_offline |
| GV-PK-SM-SM162 | Pikachu | fact_graph_semantic_fact_label_not_supported_v1:sfact_003 | valid | repaired_offline |
| GV-PK-CRE-224 | Snorlax | fact_graph_semantic_fact_label_not_supported_v1:semfact_001 | valid | repaired_offline |

## Repair Scope

- objective mouth and teeth semantic facts are allowed when evidence-backed
- unsupported/circular expression labels are removed before validation
- non-semantic facial/anatomy fields strip subjective expression words while preserving visible evidence
- environment time/weather fields are aligned when already-supported environment claims include those cues
- weak or blurred card UI observations derive card-ui abstentions even when not represented by a known module field
- OpenAI pricing preflight rejects missing or zero input/output rates before provider calls
