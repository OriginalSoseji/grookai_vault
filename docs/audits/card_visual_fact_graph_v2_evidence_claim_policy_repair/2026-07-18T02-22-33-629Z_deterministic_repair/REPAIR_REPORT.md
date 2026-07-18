# Evidence-Backed Claim Policy Repair Replay

## Summary

- Source run: `docs/audits/card_visual_fact_graph_v2_launch_value_25_live_lock_dry_run/2026-07-17T23-38-05-345Z_dry_run_441470da849a`
- OpenAI calls: `0`
- DB writes: `false`
- Schema migrations: `false`
- Former failed payloads replayed: `7`
- Former failed payloads passing after repair: `7/7`
- Prior generated rows replayed: `18`
- Prior generated rows still passing: `18/18`

## Policy Result

The repair evaluates semantic wording by visible evidence instead of blanket term rejection. Supported labels such as `ghostly environment`, `night`, and `two green palms` can remain. Unsupported or circular labels such as evidence-only `mouth not visible` or unsupported `annoyed expression` do not become accepted semantic facts.

## Repaired Failure Classes

- unsupported environment claims without observation support are normalized away unless support can be inferred
- evidence-only semantic labels such as mouth not visible are dropped from semantic_visual_facts
- ghostly/haunted environment labels are allowed only with ghostly visual evidence
- expression labels such as annoyed are allowed only with visible facial support and non-circular evidence
- count_semantic labels such as two green palms are allowed when observation evidence supports the counted visual object
- time-of-day labels such as night are allowed with dark/night sky evidence
- invented object observation IDs are repaired to the observation backbone when count/label evidence identifies the real observation

## Failed Payload Replay

### 1. Mega Chandelure ex (GV-PK-JPN-M5-113)
- Before findings: `fact_graph_environment_claim_without_support`
- After validation: passed
- After findings: none
- Review status after normalization: `pending`
- Review flags after normalization: `potential_module_incomplete_or_low_evidence`
- Semantic facts after normalization: `floating`
- Environment support IDs: none
- Object observation IDs: none

### 2. Mega Darkrai ex (GV-PK-JPN-M5-118)
- Before findings: `fact_graph_semantic_fact_label_not_supported_v1:sem_fact_002`
- After validation: passed
- After findings: none
- Review status after normalization: `pending`
- Review flags after normalization: none
- Semantic facts after normalization: `floating`
- Environment support IDs: `obs_environment_001`
- Object observation IDs: none

### 3. Mega Chandelure ex (GV-PK-JPN-M5-097)
- Before findings: `fact_graph_semantic_fact_label_not_supported_v1:sem_fact_003`
- After validation: passed
- After findings: none
- Review status after normalization: `pending`
- Review flags after normalization: `potential_module_review_conflicts_with_entries`
- Semantic facts after normalization: `floating`, `haunted or ghostly environment`
- Environment support IDs: `obs_creature_anatomy_005`, `obs_creature_anatomy_006`, `obs_creature_anatomy_007`
- Object observation IDs: none

### 4. メガドリュウズex (GV-PK-JPN-M5-063)
- Before findings: `fact_graph_semantic_fact_label_not_supported_v1:sem_001`
- After validation: passed
- After findings: none
- Review status after normalization: `pending`
- Review flags after normalization: `potential_count_reference_inconsistent`
- Semantic facts after normalization: none
- Environment support IDs: `obs_environment_001`, `obs_environment_002`, `obs_environment_003`
- Object observation IDs: `obs_subject_002`

### 5. Rust Syndicate Grunt (GV-PK-JPN-M5-110)
- Before findings: `fact_graph_semantic_fact_label_not_supported_v1:sem_004`
- After validation: passed
- After findings: none
- Review status after normalization: `pending`
- Review flags after normalization: `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`
- Semantic facts after normalization: `smiling`, `indoor dark background with lighting`, `two green palms`
- Environment support IDs: `obs_environment_001`, `obs_object_001`
- Object observation IDs: `obs_object_001`

### 6. Magnetic Storm (GV-PK-JPN-TCGCOLLECTOR11526-019)
- Before findings: `fact_graph_semantic_fact_label_not_supported_v1:sem_fact_night_001`
- After validation: passed
- After findings: none
- Review status after normalization: `pending`
- Review flags after normalization: `potential_module_review_conflicts_with_entries`, `potential_salient_object_missing_count_reference`
- Semantic facts after normalization: `stormy`, `aurora borealis`, `night`, `bare trees`, `mountain`
- Environment support IDs: `obs_aurora_borealis_002`, `obs_bare_trees_006`, `obs_dark_shadowed_ground_008`, `obs_lightning_strikes_004`, `obs_mountainous_terrain_007`, `obs_stormy_night_sky_001`
- Object observation IDs: `obs_lightning_strikes_004`

### 7. High Pressure System (GV-PK-JPN-TCGCOLLECTOR11525-019)
- Before findings: `fact_graph_module_observation_missing:fact_graph.modules.objects_and_props.object_observation_ids:obj_palm_trees_left_001`, `fact_graph_module_observation_missing:fact_graph.modules.objects_and_props.object_observation_ids:obj_palm_trees_right_001`, `fact_graph_module_observation_missing:fact_graph.modules.objects_and_props.object_observation_ids:obj_stone_steps_001`, `fact_graph_module_observation_missing:fact_graph.modules.objects_and_props.object_observation_ids:obj_stone_wall_001`, `fact_graph_object_observation_missing:obj_palm_trees_left_001`, `fact_graph_object_observation_missing:obj_palm_trees_right_001`, `fact_graph_object_observation_missing:obj_stone_steps_001`, `fact_graph_object_observation_missing:obj_stone_wall_001`
- After validation: passed
- After findings: none
- Review status after normalization: `pending`
- Review flags after normalization: `potential_count_reference_inconsistent`
- Semantic facts after normalization: none
- Environment support IDs: `obs_pattern_001`, `obs_sky_001`, `obs_structure_001`, `obs_structure_002`, `obs_structure_003`, `obs_terrain_001`, `obs_trees_001`, `obs_trees_002`
- Object observation IDs: `obs_trees_001`, `obs_trees_002`, `obs_structure_001`, `obs_structure_002`
