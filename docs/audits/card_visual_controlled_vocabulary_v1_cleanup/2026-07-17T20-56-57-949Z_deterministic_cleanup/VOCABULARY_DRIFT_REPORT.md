# FACT_GRAPH_V2_DETERMINISTIC_CLEANUP_V1 Drift Report

Source dry run: docs/audits/card_visual_semantic_facts_v2_4_card_dry_run/2026-07-17T20-26-09-641Z_dry_run_f9d59350922d

## Summary

- Replayed rows: 4
- Structurally validated: 4/4
- Validation failures: 0
- Raw observation label changes: 0
- Duplicate canonical concept extra entries before: 15
- Duplicate canonical concept extra entries after: 0
- Redundant identity search terms after cleanup: 0
- Review-status changes: 0

## Row Results

| GV-ID | Name | Branch | Status | Search Terms Before | Search Terms After | Duplicate Concepts Before -> After |
|---|---|---|---|---|---|---|
| GV-PK-JPN-M5-118 | Mega Darkrai ex | pokemon | needs_review -> needs_review | floating Mega Darkrai; yellow and black Mega Darkrai | floating; yellow and black | diagonal upright orientation x2, floating x2 -> none |
| GV-PK-JPN-M5-108 | Misty's Vitality | trainer | needs_review -> needs_review | orange spiky hair ponytail; dark blue swimsuit; indoor swimming pool | orange spiky hair ponytail; dark blue swimsuit; indoor swimming pool | forward orientation x2, left arm stretched back x2, right fist raised forward x2, water x2 -> none |
| GV-PK-JPN-S6A-100 | Turffield Stadium | stadium | needs_review -> needs_review | stadium; traffic cones; leaf emblem; curved building; trees; water body; blue sky; patterned pathway | stadium; traffic cones; leaf emblem; curved building; trees; water body; blue sky; patterned pathway | building x4, sky x2, tree x2, water x3 -> none |
| GV-PK-JPN-M5-105 | Dark Bell | item_tool_supporter | needs_review -> needs_review | dark bell; bell shaped object; black bell; swirling purple background; polygonal facets; circular sphere inside bell | dark bell; bell shaped object; black bell; swirling purple background; polygonal facets; circular sphere inside bell | circular motif x2, spiral motif x2 -> none |

## Concept Support Changes

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- diagonal upright orientation: obs_pose_001 -> obs_pose_001, obs_subject_mega_darkrai_001
- floating: obs_subject_mega_darkrai_001 -> obs_pose_001, obs_subject_mega_darkrai_001

### GV-PK-JPN-M5-108 - Misty's Vitality

- forward orientation: obs_posture_001 -> obs_posture_001, obs_subject_001
- left arm stretched back: obs_posture_001 -> obs_posture_001, obs_subject_001
- right fist raised forward: obs_posture_001 -> obs_posture_001, obs_subject_001

### GV-PK-JPN-S6A-100 - Turffield Stadium

- building: obs_env_lake_001, obs_env_leaf_logo_001, obs_env_light_bands_001, obs_env_pathway_001, obs_env_roof_structure_001, obs_env_sky_001 -> obs_env_building_001, obs_env_roof_structure_001, obs_env_stadium_structure_001
- sky: obs_env_light_bands_001 -> obs_env_sky_001
- tree: obs_env_lake_001, obs_env_leaf_logo_001, obs_env_light_bands_001, obs_env_pathway_001, obs_env_roof_structure_001, obs_env_sky_001 -> obs_env_trees_001
- water: obs_env_lake_001, obs_env_leaf_logo_001, obs_env_light_bands_001, obs_env_pathway_001, obs_env_roof_structure_001, obs_env_sky_001 -> obs_env_lake_001
- water body: none -> obs_env_lake_001

### GV-PK-JPN-M5-105 - Dark Bell

- spiral motif: obs_background_001, obs_object_001 -> obs_background_001

## Gate Checks

- 4/4 structurally valid: yes
- Zero lost raw observation labels: yes
- Zero duplicate canonical concept entries after cleanup: yes
- Zero redundant identity search terms after cleanup: yes
- Zero review-status changes from normalization: yes
- No OpenAI calls, database writes, approvals, embeddings, or downstream integrations were run.
