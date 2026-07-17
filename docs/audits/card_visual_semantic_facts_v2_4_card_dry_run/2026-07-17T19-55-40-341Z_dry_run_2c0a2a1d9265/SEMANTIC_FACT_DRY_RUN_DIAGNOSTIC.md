# Semantic Visual Facts V2 Four-Card Diagnostic

Run: `2026-07-17T19-55-40-341Z_dry_run_2c0a2a1d9265`

This diagnostic includes validated rows and failed-validation raw payloads. Failed rows are not accepted outputs; they are shown so review can see what changed and why the gate stopped.

- Attempted: 4
- Validated: 1
- Failed validation: 3
- Estimated cost USD: 0.0368328
- DB writes: 0

## GV-PK-JPN-M5-105 - Dark Bell

- Status: `validated`
- Review status: `pending`
- Digest: Fact digest. Counts: bell: 1.
- Artwork observations: 6
- Card UI observations: 6

### Semantic Facts
- none

### Counts
- bell: exact 1; support=obs_object_bell_001

### Search Terms
- bell -> obs_object_bell_001
- dark blue bell -> obs_object_bell_color_001
- angular bell -> obs_object_bell_detail_001, obs_object_bell_detail_002
- swirling vortex background -> obs_background_001

## GV-PK-JPN-M5-108 - Misty's Vitality

- Status: `failed_validation`
- Validation findings: `fact_graph_semantic_fact_label_not_supported_v1:svf_003`
- Digest: Fact digest. Scene subjects: female human character. Semantic facts: smiling, open eyes, neutral eyebrows, standing, indoor swimming pool.
- Artwork observations: 10
- Card UI observations: 8

### Subjects
- female human character: pose=standing, right arm bent, left arm extended; visible=visible; evidence=obs_subject_001

### Semantic Facts
- smiling (expression), confidence=0.98, support=obs_human_appearance_face_001, evidence=mouth: smiling; eyes: open; eyebrows: neutral; body_position: standing
- open eyes (expression), confidence=0.98, support=obs_human_appearance_face_001, evidence=mouth: smiling; eyes: open; eyebrows: neutral; body_position: standing
- neutral eyebrows (expression), confidence=0.98, support=obs_human_appearance_face_001, evidence=mouth: smiling; eyes: open; eyebrows: neutral; body_position: standing
- standing (state), confidence=0.98, support=obs_pose_001, evidence=body_language: right arm bent, left arm extended; body_position: standing
- indoor swimming pool (environment), confidence=0.99, support=obs_environment_pool_001, evidence=environment: indoor swimming pool

### Counts
- none

### Search Terms
- female human character -> obs_subject_001
- blue swimsuit -> obs_human_appearance_clothing_001
- indoor swimming pool -> obs_environment_pool_001

## GV-PK-JPN-M5-118 - Mega Darkrai ex

- Status: `failed_validation`
- Validation findings: `fact_graph_semantic_fact_label_not_supported_v1:semfact_001`
- Digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: eyes not clearly visible, floating. Counts: dark energy symbol: 2.
- Artwork observations: 7
- Card UI observations: 7

### Subjects
- Mega Darkrai: pose=floating upright; visible=visible; evidence=obs_subject_001

### Semantic Facts
- eyes not clearly visible (expression), confidence=0.85, support=obs_creature_anatomy_002, evidence=eyes: not visible; body_position: floating upright; motion_state: idle
- floating (state), confidence=0.9, support=obs_subject_001, evidence=body_position: floating upright; motion_state: idle

### Counts
- dark energy symbol: exact 2; support=obs_objects_props_001

### Search Terms
- Mega Darkrai -> obs_subject_001
- gold foil -> obs_color_001
- floating Pokemon -> obs_subject_001
- dark energy symbol -> obs_objects_props_001

## GV-PK-JPN-S6A-100 - Turffield Stadium

- Status: `failed_validation`
- Validation findings: `fact_graph_semantic_fact_label_not_supported_v1:semfact_002`, `fact_graph_semantic_fact_label_not_supported_v1:semfact_003`, `fact_graph_semantic_fact_label_not_supported_v1:semfact_005`
- Digest: Fact digest. Semantic facts: stadium environment, traffic cones, coniferous trees, reflective water, blue sky with clouds. Counts: traffic cones: 7.
- Artwork observations: 10
- Card UI observations: 0

### Semantic Facts
- stadium environment (environment), confidence=0.98, support=obs_stadium_structure_001, evidence=environment: stadium environment with pathway and seating area; objects: obs_stadium_lamps_001, obs_stadium_ornament_001
- traffic cones (environment), confidence=0.85, support=obs_stadium_lamps_001, evidence=environment: multiple orange-white traffic cones along path; objects: obs_stadium_lamps_001
- coniferous trees (environment), confidence=0.9, support=obs_trees_group_001, evidence=environment: group of coniferous trees
- reflective water (environment), confidence=0.9, support=obs_lake_water_001, evidence=environment: calm reflective lake or pond
- blue sky with clouds (environment), confidence=0.95, support=obs_sky_001, evidence=environment: blue sky with white clouds

### Counts
- traffic cones: exact 7; support=obs_stadium_lamps_001

### Search Terms
- stadium environment -> obs_stadium_structure_001
- traffic cones -> obs_stadium_lamps_001
- coniferous trees -> obs_trees_group_001
- reflective water -> obs_lake_water_001
- stone stairway -> obs_stadium_stone_path_001
- blue sky with clouds -> obs_sky_001
- leaf emblem -> obs_stadium_ornament_001, obs_stadium_embossed_logo_001
- purple color bands -> obs_stadium_color_bands_001

