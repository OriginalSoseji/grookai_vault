# Live-Lock Evidence Repair Replay

Generated at: 2026-07-18T06:56:54.225Z
Source run: docs/audits/card_visual_fact_graph_v2_launch_value_25_evidence_policy_retry_dry_run/2026-07-18T06-22-38-454Z_dry_run_81281d9cbc31

## Boundary

- OpenAI calls: 0
- DB writes: false
- Schema migrations: false
- Approvals: false
- Embeddings: false

## Replay Result

- Failed payloads replayed: 4
- Failed payloads now valid: 4
- Failed payloads still failed: 0
- Previously generated rows replayed: 21
- Previously generated rows still valid: 21
- Previously generated rows now failed: 0

## Prior Failure Repairs

### GV-PK-JPN-M5-112 - Mega Zeraora ex

Before: fact_graph_semantic_fact_label_not_supported_v1:semantic_001
After: valid

### GV-PK-JPN-M5-108 - Misty's Vitality

Before: fact_graph_search_term_without_matching_fact_components:human face with open eyes and smiling mouth
After: valid

### GV-PK-JPN-M5-110 - Rust Syndicate Grunt

Before: fact_graph_typed_fact_observation_missing:obs_clothes_005
After: valid

### GV-PK-JPN-S6A-100 - Turffield Stadium

Before: fact_graph_semantic_fact_evidence_contradiction:svf_005:count_semantic_without_counted_visual_evidence
After: valid

## Repaired Failure Classes

- evidence-backed focused/determined expression semantic labels are allowed only with visible facial support
- smile/happy search terms may be supported directly by cited facial observations or human appearance evidence
- obvious clothing observation ID typos such as obs_clothes_N are repaired to existing obs_clothing_N references
- count_semantic labels may validate against matching exact count rows with shared supporting observations
