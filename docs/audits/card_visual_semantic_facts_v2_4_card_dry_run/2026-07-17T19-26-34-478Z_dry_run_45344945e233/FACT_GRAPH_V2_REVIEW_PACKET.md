# Card Visual Fact Graph V2 Review Packet

Generated rows: 3
Validation failures: 1
Skipped images: 0
Estimated cost USD: 0.0367624

## Rows

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- V2 stress role: `trainer_person_artwork`
- Review status: `needs_review`
- Description confidence: `0.97`
- Attribute confidence: `0.96`
- Cost USD: `0.010358`
- Artwork observations: `9`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: female human character.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human character | female human | scene_subject | foreground | primary_subject | 0.99 |
| orange hair tied in side high ponytail | orange hair | human_hair | foreground | primary_subject_feature | 0.98 |
| face with large blue eyes, small nose, open smiling mouth | face with visible eyes and smiling mouth | human_face | foreground | primary_subject_feature | 0.98 |
| blue one-piece swimsuit | blue swimsuit | clothing | foreground | primary_subject_feature | 0.98 |
| black wristband on left wrist | black wristband | clothing_accessory | foreground | secondary_subject_feature | 0.97 |
| visible exposed arms, shoulders, neck, part of upper chest, legs | visible skin body parts | human_body_part | foreground | primary_subject_feature | 0.98 |
| sporty running/racing stance with raised left fist and bent right arm | running pose arms raised | pose | foreground | primary_subject_feature | 0.98 |
| indoor swimming pool with blue water and poolside chairs | indoor swimming pool environment | environment | background | primary_scene | 0.95 |
| blue pool ladder with metallic handrails | pool ladder | environment_object | background | secondary_scene_element | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_name_text | top left | fully_visible | 0.99 |
| Japanese text block at bottom center | card_ui_text | bottom center | fully_visible | 0.97 |
| set symbol on bottom left circle | set_symbol | bottom left | fully_visible | 0.98 |
| collector number 108/081 | collector_number | bottom left | fully_visible | 0.98 |
| rarity mark SR | rarity_mark | bottom left | fully_visible | 0.98 |
| illustrator name En Morikura | illustrator_text | bottom left | fully_visible | 0.98 |
| copyright Pokémon/Nintendo/Creatures/GAME FREAK text line | copyright_text | bottom | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair color and style | obs_hair_001 | 0.98 |
| fact_face_001 | human_appearance | eyes and mouth visible | obs_face_001 | 0.98 |
| fact_clothing_001 | clothing | swimsuit | obs_clothing_001 | 0.98 |
| fact_accessory_001 | clothing | wristband | obs_accessory_001 | 0.97 |
| fact_body_visible_001 | human_appearance | visible exposed body parts | obs_body_visible_001 | 0.98 |
| fact_pose_001 | human_appearance | pose | obs_pose_001 | 0.98 |
| fact_environment_001 | environment | setting | obs_environment_001, obs_environment_002 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_text_001 | Japanese card bottom text | obs_card_ui_text_001 | 0.97 |
| fact_card_ui_set_symbol_001 | set symbol | obs_card_ui_set_symbol_001 | 0.98 |
| fact_card_ui_number_001 | collector number | obs_card_ui_number_001 | 0.98 |
| fact_card_ui_rarity_001 | rarity mark | obs_card_ui_rarity_001 | 0.98 |
| fact_card_ui_illustrator_001 | illustrator | obs_card_ui_illustrator_001 | 0.98 |
| fact_card_ui_copyright_001 | copyright | obs_card_ui_copyright_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_copyright_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_number_001",
    "fact_card_ui_rarity_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_rarity_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": []
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | low | medium |  |
| environment | complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | medium | medium |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| none recorded | | | |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| female human | obs_subject_001 |
| blue swimsuit | obs_clothing_001 |
| orange hair ponytail | obs_hair_001 |
| indoor swimming pool | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_001, obs_hair_001, obs_subject_001 | deterministic_rule | 0.92 |
| frontal orientation | obs_subject_001 | deterministic_rule | 0.99 |
| frontal orientation | obs_pose_001 | deterministic_rule | 0.98 |
| left fist raised | obs_subject_001 | deterministic_rule | 0.99 |
| left fist raised | obs_pose_001 | deterministic_rule | 0.98 |
| left orientation | obs_accessory_001 | deterministic_rule | 0.97 |
| metal-like appearance | obs_environment_002 | deterministic_rule | 0.9 |
| right arm bent | obs_subject_001 | deterministic_rule | 0.99 |
| right arm bent | obs_pose_001 | deterministic_rule | 0.98 |
| right orientation | obs_pose_001 | deterministic_rule | 0.98 |
| running | obs_pose_001 | deterministic_rule | 0.98 |
| running | obs_subject_001 | deterministic_rule | 0.99 |
| water | obs_environment_001 | deterministic_rule | 0.95 |
| water | obs_environment_001, obs_hair_001, obs_subject_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human character.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human character",
      "normalized_label": "female human",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_hair",
      "label": "orange hair tied in side high ponytail",
      "normalized_label": "orange hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_face",
      "label": "face with large blue eyes, small nose, open smiling mouth",
      "normalized_label": "face with visible eyes and smiling mouth",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue one-piece swimsuit",
      "normalized_label": "blue swimsuit",
      "scene_layer": "foreground",
      "frame_position": "torso and legs",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing_accessory",
      "label": "black wristband on left wrist",
      "normalized_label": "black wristband",
      "scene_layer": "foreground",
      "frame_position": "left wrist",
      "visibility": "fully_visible",
      "salience": "secondary_subject_feature",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_visible_001",
      "kind": "human_body_part",
      "label": "visible exposed arms, shoulders, neck, part of upper chest, legs",
      "normalized_label": "visible skin body parts",
      "scene_layer": "foreground",
      "frame_position": "arms, legs, neck, upper chest",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "sporty running/racing stance with raised left fist and bent right arm",
      "normalized_label": "running pose arms raised",
      "scene_layer": "foreground",
      "frame_position": "full body",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool with blue water and poolside chairs",
      "normalized_label": "indoor swimming pool environment",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "primary_scene",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment_object",
      "label": "blue pool ladder with metallic handrails",
      "normalized_label": "pool ladder",
      "scene_layer": "background",
      "frame_position": "background near right",
      "visibility": "fully_visible",
      "salience": "secondary_scene_element",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "card name text in Japanese",
      "normalized_label": "Japanese card name text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "primary_ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "Japanese text block at bottom center",
      "normalized_label": "Japanese text block",
      "scene_layer": "ui",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "primary_ui_element",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol on bottom left circle",
      "normalized_label": "set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "secondary_ui_element",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "collector number 108/081",
      "normalized_label": "108/081",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "secondary_ui_element",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_001",
      "kind": "rarity_mark",
      "label": "rarity mark SR",
      "normalized_label": "SR",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "secondary_ui_element",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator name En Morikura",
      "normalized_label": "En Morikura",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "secondary_ui_element",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "copyright Pokémon/Nintendo/Creatures/GAME FREAK text line",
      "normalized_label": "copyright text",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "secondary_ui_element",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0]",
      "claim": "subject identity",
      "value": "female human character",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "hair color and style",
      "value": "orange hair tied in side high ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "facial_features",
      "claim": "eyes and mouth visible",
      "value": "large blue eyes, smiling open mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "swimsuit",
      "value": "blue one-piece swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessory_001",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "wristband",
      "value": "black wristband on left wrist",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_visible_001",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "visible exposed body parts",
      "value": "arms, shoulders, neck, upper chest, legs",
      "supporting_observation_ids": [
        "obs_body_visible_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "human_appearance",
      "field_path": "pose_orientation[0]",
      "claim": "pose",
      "value": "sporty running/racing stance with raised left fist and bent right arm",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "setting",
      "value": "indoor swimming pool with water and poolside chairs",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "Japanese card name text",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[0]",
      "claim": "Japanese card bottom text",
      "value": "Japanese text block",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "set symbol",
      "value": "visible set symbol at bottom left",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number",
      "value": "108/081",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_rarity_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark_observation_ids[0]",
      "claim": "rarity mark",
      "value": "SR",
      "supporting_observation_ids": [
        "obs_card_ui_rarity_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator",
      "value": "En Morikura",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human character",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "legs",
        "neck",
        "shoulders",
        "upper chest"
      ],
      "physical_features": [
        "large blue eyes",
        "open smiling mouth"
      ],
      "pose": [
        "left fist raised",
        "right arm bent",
        "running"
      ],
      "orientation": "frontal",
      "action_state": [
        "running pose"
      ],
      "facial_evidence": {
        "eyes": "large blue eyes",
        "mouth": "open smiling mouth",
        "eyebrows": "visible",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband left wrist",
        "blue one-piece swimsuit"
      ],
      "colors": [
        "black",
        "blue",
        "orange"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_accessory_001",
      "obs_body_visible_001",
      "obs_clothing_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "pool water"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "chairs",
      "pool interior",
      "pool ladder"
    ],
    "water": [
      "pool water"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_environment_002",
      "label": "pool ladder",
      "normalized_label": "pool ladder",
      "object_type": "environment object",
      "colors": [
        "blue",
        "metallic"
      ],
      "material_appearance": [
        "metallic",
        "painted"
      ],
      "location": "background near right",
      "count_reference": "",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "light blue",
      "orange",
      "skin tone",
      "white"
    ],
    "lighting": [
      "soft indoor"
    ],
    "shadows": [
      "soft"
    ],
    "highlights": [
      "hair highlights",
      "water sparkles"
    ],
    "composition": [
      "centered subject",
      "medium closeup"
    ],
    "camera_angle": "eye level",
    "framing": "vertical",
    "cropping": [
      "full body visible with some background environment"
    ],
    "depth": "deep with background environment",
    "motion_cues": [
      "running pose implied by clenched fist and bent arm"
    ],
    "motifs": [
      "sporty",
      "vitality"
    ],
    "repeated_shapes": [
      "sparkles"
    ],
    "style_cues": [
      "bright colors",
      "cartoon style",
      "clean lines"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_hair_001",
      "obs_subject_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "observed",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "none_visible",
    "scene_layers_review": "observed",
    "environment_review": "observed",
    "objects_and_props_review": "observed",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
  },
  "modules": {
    "subjects": {
      "fact_ids": [
        "fact_subject_001"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_body_visible_001",
        "fact_face_001",
        "fact_hair_001",
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_body_visible_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "shoulders",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_body_visible_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "neck",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_body_visible_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "upper_chest",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_body_visible_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "legs",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_body_visible_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "large blue eyes",
          "mouth": "open smiling mouth",
          "eyebrows": "visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange hair tied in side high ponytail",
          "details": [
            "bright orange color",
            "shiny highlights",
            "spiky"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "left fist raised",
            "right arm bent",
            "running"
          ],
          "orientation": "frontal",
          "action_state": [
            "running pose"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.98
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_accessory_001",
        "fact_clothing_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and legs",
          "garment": "blue one-piece swimsuit",
          "neckline_type": "scoop neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "solid color",
            "tight fit"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on left wrist",
          "details": [
            "elastic band",
            "solid black color"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.97
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": [
        "obs_environment_002"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_pose_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_hair_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_copyright_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_number_001",
        "fact_card_ui_rarity_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_rarity_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": []
    },
    "relationships": {
      "fact_ids": [],
      "relationship_ids": []
    },
    "surface_and_scan_cues": {
      "fact_ids": [],
      "observation_ids": []
    },
    "uncertainty_and_abstentions": {
      "fact_ids": [],
      "fields": []
    },
    "fact_grounded_search_terms": {
      "fact_ids": [],
      "terms": [
        "female human",
        "blue swimsuit",
        "orange hair ponytail",
        "indoor swimming pool"
      ]
    }
  },
  "module_reviews": [
    {
      "module": "subjects",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "human_appearance",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "creature_anatomy",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "clothing",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "objects_and_props",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "environment",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "counts",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "relationships",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "surface_and_scan_cues",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "uncertainty_and_abstentions",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "fact_grounded_search_terms",
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "female human",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "blue swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "orange hair ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_hair_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "left fist raised",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left fist raised",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_accessory_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "right arm bent",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right arm bent",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "running",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "running",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_hair_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- V2 stress role: `environment_heavy_stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0087588`
- Artwork observations: `10`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: blue sky with white clouds, wooden stadium structure, leaf emblem, stadium roof with supports, stadium stairs with railings, stadium field and parade ring, three green trees, road with traffic cones. Counts: trees: 3.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| partial blue sky with white clouds | blue sky with white clouds | sky | background | medium | 0.95 |
| sturdy stadium structure with stylized wooden walls | wooden stadium structure | object | midground | high | 0.98 |
| green stylized leaf emblem on stadium wall | leaf emblem | object | midground | high | 0.99 |
| stadium roof with grid and metallic hanging supports | stadium roof with supports | object | midground | high | 0.95 |
| stairs down to field area with railings | stadium stairs with railings | object | foreground | medium | 0.98 |
| stadium field with green grass and parade ring base with leaf emblem | stadium field and parade ring | terrain | midground | high | 0.99 |
| three green leafy trees in background right | three green trees | plant | background | medium | 0.97 |
| road or paved ground with orange and white traffic cones on left side | road with traffic cones | object | foreground | medium | 0.98 |
| lake or pond body of water visible near stadium right side | body of water | environment_water | background | medium | 0.98 |
| soft lighting with shadows from stadium roof and trees | soft natural lighting | light_and_shadow | all | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_sky_001 | environment | The sky is blue with white clouds | obs_sky_001 | 0.95 |
| fact_env_structure_001 | environment | The stadium has a sturdy wooden structure | obs_stadium_structure_001 | 0.98 |
| fact_env_emblem_001 | environment | A green stylized leaf emblem is visible on the stadium wall | obs_stadium_symbol_001 | 0.99 |
| fact_env_roof_001 | environment | The stadium roof has a grid with metallic hanging supports | obs_stadium_roof_001 | 0.95 |
| fact_env_stairs_001 | environment | Stairs with railings lead down to the field area | obs_stadium_stairs_001 | 0.98 |
| fact_env_field_001 | environment | The field area is grassy with a parade ring featuring a leaf emblem | obs_stadium_field_001 | 0.99 |
| fact_env_trees_001 | environment | Three green leafy trees are visible in the right background | obs_trees_001 | 0.97 |
| fact_env_road_cones_001 | objects_and_props | Several orange and white traffic cones are lined along the left side | obs_road_and_traffic_cones_001 | 0.98 |
| fact_env_water_001 | environment | A body of water such as a lake or pond is visible near the stadium on right side | obs_water_001 | 0.98 |
| fact_visual_lighting_001 | color_and_light | Soft natural lighting with shadows from stadium structure and trees | obs_light_and_shadow_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| none recorded | | | |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [],
  "name_text_observation_ids": [],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": []
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text_observation_ids: card name text is visible but not fully OCR readable; partial text visible only |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| trees | exact | 3 | obs_trees_001 | 0.97 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| none recorded | | | |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| blue sky with white clouds | obs_sky_001 |
| wooden stadium structure | obs_stadium_structure_001 |
| leaf emblem | obs_stadium_symbol_001 |
| stadium roof with supports | obs_stadium_roof_001 |
| stadium stairs with railings | obs_stadium_stairs_001 |
| stadium field and parade ring | obs_stadium_field_001 |
| three green trees | obs_trees_001 |
| road with traffic cones | obs_road_and_traffic_cones_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_stadium_structure_001 | deterministic_rule | 0.98 |
| building | obs_light_and_shadow_001, obs_road_and_traffic_cones_001, obs_sky_001, obs_stadium_field_001, obs_stadium_roof_001, obs_stadium_stairs_001 | deterministic_rule | 0.92 |
| cloud | obs_sky_001 | deterministic_rule | 0.95 |
| downward orientation | obs_stadium_stairs_001 | deterministic_rule | 0.98 |
| left orientation | obs_road_and_traffic_cones_001 | deterministic_rule | 0.98 |
| metal-like appearance | obs_stadium_roof_001 | deterministic_rule | 0.95 |
| metal-like appearance | obs_light_and_shadow_001, obs_road_and_traffic_cones_001, obs_sky_001, obs_stadium_field_001, obs_stadium_roof_001, obs_stadium_stairs_001 | deterministic_rule | 0.92 |
| right orientation | obs_trees_001 | deterministic_rule | 0.97 |
| right orientation | obs_water_001 | deterministic_rule | 0.98 |
| sky | obs_sky_001 | deterministic_rule | 0.95 |
| terrain | obs_stadium_field_001 | deterministic_rule | 0.99 |
| terrain | obs_road_and_traffic_cones_001 | deterministic_rule | 0.98 |
| tree | obs_trees_001 | deterministic_rule | 0.97 |
| tree | obs_light_and_shadow_001 | deterministic_rule | 0.95 |
| tree | obs_light_and_shadow_001, obs_road_and_traffic_cones_001, obs_sky_001, obs_stadium_field_001, obs_stadium_roof_001, obs_stadium_stairs_001 | deterministic_rule | 0.92 |
| water | obs_water_001 | deterministic_rule | 0.98 |
| water | obs_light_and_shadow_001, obs_road_and_traffic_cones_001, obs_sky_001, obs_stadium_field_001, obs_stadium_roof_001, obs_stadium_stairs_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: blue sky with white clouds, wooden stadium structure, leaf emblem, stadium roof with supports, stadium stairs with railings, stadium field and parade ring, three green trees, road with traffic cones. Counts: trees: 3.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "partial blue sky with white clouds",
      "normalized_label": "blue sky with white clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_structure_001",
      "kind": "object",
      "label": "sturdy stadium structure with stylized wooden walls",
      "normalized_label": "wooden stadium structure",
      "scene_layer": "midground",
      "frame_position": "middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_symbol_001",
      "kind": "object",
      "label": "green stylized leaf emblem on stadium wall",
      "normalized_label": "leaf emblem",
      "scene_layer": "midground",
      "frame_position": "middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_roof_001",
      "kind": "object",
      "label": "stadium roof with grid and metallic hanging supports",
      "normalized_label": "stadium roof with supports",
      "scene_layer": "midground",
      "frame_position": "middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_stairs_001",
      "kind": "object",
      "label": "stairs down to field area with railings",
      "normalized_label": "stadium stairs with railings",
      "scene_layer": "foreground",
      "frame_position": "lower right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_field_001",
      "kind": "terrain",
      "label": "stadium field with green grass and parade ring base with leaf emblem",
      "normalized_label": "stadium field and parade ring",
      "scene_layer": "midground",
      "frame_position": "bottom middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "plant",
      "label": "three green leafy trees in background right",
      "normalized_label": "three green trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_road_and_traffic_cones_001",
      "kind": "object",
      "label": "road or paved ground with orange and white traffic cones on left side",
      "normalized_label": "road with traffic cones",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_water_001",
      "kind": "environment_water",
      "label": "lake or pond body of water visible near stadium right side",
      "normalized_label": "body of water",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_and_shadow_001",
      "kind": "light_and_shadow",
      "label": "soft lighting with shadows from stadium roof and trees",
      "normalized_label": "soft natural lighting",
      "scene_layer": "all",
      "frame_position": "all",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_sky_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "The sky is blue with white clouds",
      "value": "blue sky with white clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_structure_001",
      "module": "environment",
      "field_path": "architecture",
      "claim": "The stadium has a sturdy wooden structure",
      "value": "wooden structure",
      "supporting_observation_ids": [
        "obs_stadium_structure_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_emblem_001",
      "module": "environment",
      "field_path": "architecture",
      "claim": "A green stylized leaf emblem is visible on the stadium wall",
      "value": "green leaf emblem",
      "supporting_observation_ids": [
        "obs_stadium_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_roof_001",
      "module": "environment",
      "field_path": "architecture",
      "claim": "The stadium roof has a grid with metallic hanging supports",
      "value": "grid roof with supports",
      "supporting_observation_ids": [
        "obs_stadium_roof_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_stairs_001",
      "module": "environment",
      "field_path": "architecture",
      "claim": "Stairs with railings lead down to the field area",
      "value": "stairs with railings",
      "supporting_observation_ids": [
        "obs_stadium_stairs_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_field_001",
      "module": "environment",
      "field_path": "terrain",
      "claim": "The field area is grassy with a parade ring featuring a leaf emblem",
      "value": "grass field with parade ring and leaf emblem",
      "supporting_observation_ids": [
        "obs_stadium_field_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_trees_001",
      "module": "environment",
      "field_path": "plants",
      "claim": "Three green leafy trees are visible in the right background",
      "value": "three green trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_road_cones_001",
      "module": "objects_and_props",
      "field_path": "objects",
      "claim": "Several orange and white traffic cones are lined along the left side",
      "value": "traffic cones",
      "supporting_observation_ids": [
        "obs_road_and_traffic_cones_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_water_001",
      "module": "environment",
      "field_path": "water",
      "claim": "A body of water such as a lake or pond is visible near the stadium on right side",
      "value": "body of water",
      "supporting_observation_ids": [
        "obs_water_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_lighting_001",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "Soft natural lighting with shadows from stadium structure and trees",
      "value": "soft lighting with shadows",
      "supporting_observation_ids": [
        "obs_light_and_shadow_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_trees_001",
      "normalized_label": "trees",
      "count_type": "exact",
      "exact_count": 3,
      "estimated_min": 3,
      "estimated_max": 3,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "scene_layer": "background",
      "confidence": 0.97
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_road_and_traffic_cones_001",
      "obs_stadium_stairs_001"
    ],
    "midground": [
      "obs_stadium_field_001",
      "obs_stadium_roof_001",
      "obs_stadium_structure_001",
      "obs_stadium_symbol_001"
    ],
    "background": [
      "obs_sky_001",
      "obs_trees_001",
      "obs_water_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "white clouds"
    ],
    "ground": [
      "grassy field",
      "road"
    ],
    "terrain": [
      "stadium field",
      "stairs"
    ],
    "plants": [
      "trees"
    ],
    "architecture": [
      "railing stairs",
      "roof grid",
      "wooden stadium walls"
    ],
    "water": [
      "lake or pond"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_road_and_traffic_cones_001",
      "obs_sky_001",
      "obs_stadium_field_001",
      "obs_stadium_roof_001",
      "obs_stadium_stairs_001",
      "obs_stadium_structure_001",
      "obs_stadium_symbol_001",
      "obs_trees_001",
      "obs_water_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_stadium_symbol_001",
      "label": "green leaf emblem on stadium wall",
      "normalized_label": "leaf emblem",
      "object_type": "decorative emblem",
      "colors": [
        "green",
        "white"
      ],
      "material_appearance": [],
      "location": "on stadium wall",
      "count_reference": "count_leaf_emblem_001",
      "confidence": 0.99
    },
    {
      "observation_id": "obs_road_and_traffic_cones_001",
      "label": "orange and white traffic cones",
      "normalized_label": "traffic cones",
      "object_type": "safety cones",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [
        "plastic-like appearance-like"
      ],
      "location": "left side near road",
      "count_reference": "count_traffic_cones_001",
      "confidence": 0.98
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "gray",
      "green",
      "orange",
      "white"
    ],
    "lighting": [
      "soft natural lighting"
    ],
    "shadows": [
      "soft shadows from structure and trees"
    ],
    "highlights": [
      "subtle highlights on metallic roof supports"
    ],
    "composition": [
      "background trees and water",
      "foreground stairs and traffic cones",
      "midground stadium structure and field"
    ],
    "camera_angle": "slightly elevated side view",
    "framing": "tight framing around stadium and immediate surroundings",
    "cropping": [
      "full card view with edges visible"
    ],
    "depth": "good depth with foreground to background elements",
    "motion_cues": [],
    "motifs": [
      "leaf emblem repeated"
    ],
    "repeated_shapes": [
      "cylindrical traffic cones",
      "rectangular windows"
    ],
    "style_cues": [
      "detailed illustration style with soft shading"
    ],
    "supporting_observation_ids": [
      "obs_light_and_shadow_001",
      "obs_road_and_traffic_cones_001",
      "obs_sky_001",
      "obs_stadium_field_001",
      "obs_stadium_roof_001",
      "obs_stadium_stairs_001",
      "obs_stadium_structure_001",
      "obs_stadium_symbol_001",
      "obs_trees_001",
      "obs_water_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "observed",
    "environment_review": "observed",
    "objects_and_props_review": "observed",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
  },
  "modules": {
    "subjects": {
      "fact_ids": [],
      "scene_subject_observation_ids": [],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [],
      "visible_body_regions": [],
      "facial_evidence": [],
      "hair": [],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [],
      "effects": []
    },
    "clothing": {
      "fact_ids": [],
      "garments": [],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_env_emblem_001",
        "fact_env_road_cones_001"
      ],
      "object_observation_ids": [
        "obs_road_and_traffic_cones_001",
        "obs_stadium_symbol_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_emblem_001",
        "fact_env_field_001",
        "fact_env_roof_001",
        "fact_env_sky_001",
        "fact_env_stairs_001",
        "fact_env_structure_001",
        "fact_env_trees_001",
        "fact_env_water_001"
      ],
      "observation_ids": [
        "obs_sky_001",
        "obs_stadium_field_001",
        "obs_stadium_roof_001",
        "obs_stadium_stairs_001",
        "obs_stadium_structure_001",
        "obs_stadium_symbol_001",
        "obs_trees_001",
        "obs_water_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_visual_lighting_001"
      ],
      "observation_ids": [
        "obs_light_and_shadow_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_visual_lighting_001"
      ],
      "observation_ids": [
        "obs_light_and_shadow_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [],
      "name_text_observation_ids": [],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_trees_001"
      ]
    },
    "relationships": {
      "fact_ids": [],
      "relationship_ids": []
    },
    "surface_and_scan_cues": {
      "fact_ids": [],
      "observation_ids": []
    },
    "uncertainty_and_abstentions": {
      "fact_ids": [],
      "fields": []
    },
    "fact_grounded_search_terms": {
      "fact_ids": [],
      "terms": [
        "blue sky with white clouds",
        "wooden stadium structure",
        "leaf emblem",
        "stadium roof with supports",
        "stadium stairs with railings",
        "stadium field and parade ring",
        "three green trees",
        "road with traffic cones"
      ]
    }
  },
  "module_reviews": [
    {
      "module": "subjects",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "human_appearance",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "creature_anatomy",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "clothing",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "objects_and_props",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "environment",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text_observation_ids",
          "reason": "card name text is visible but not fully OCR readable; partial text visible only",
          "affected_observation_ids": []
        }
      ]
    },
    {
      "module": "counts",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "relationships",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "surface_and_scan_cues",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "uncertainty_and_abstentions",
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "fact_grounded_search_terms",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "blue sky with white clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "wooden stadium structure",
      "supporting_observation_ids": [
        "obs_stadium_structure_001"
      ]
    },
    {
      "term": "leaf emblem",
      "supporting_observation_ids": [
        "obs_stadium_symbol_001"
      ]
    },
    {
      "term": "stadium roof with supports",
      "supporting_observation_ids": [
        "obs_stadium_roof_001"
      ]
    },
    {
      "term": "stadium stairs with railings",
      "supporting_observation_ids": [
        "obs_stadium_stairs_001"
      ]
    },
    {
      "term": "stadium field and parade ring",
      "supporting_observation_ids": [
        "obs_stadium_field_001"
      ]
    },
    {
      "term": "three green trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "road with traffic cones",
      "supporting_observation_ids": [
        "obs_road_and_traffic_cones_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_stadium_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_light_and_shadow_001",
          "obs_road_and_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_field_001",
          "obs_stadium_roof_001",
          "obs_stadium_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "downward orientation",
        "source_observation_ids": [
          "obs_stadium_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_road_and_traffic_cones_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_stadium_roof_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_light_and_shadow_001",
          "obs_road_and_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_field_001",
          "obs_stadium_roof_001",
          "obs_stadium_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_water_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_stadium_field_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_road_and_traffic_cones_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_light_and_shadow_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_light_and_shadow_001",
          "obs_road_and_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_field_001",
          "obs_stadium_roof_001",
          "obs_stadium_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_water_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_light_and_shadow_001",
          "obs_road_and_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_field_001",
          "obs_stadium_roof_001",
          "obs_stadium_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-105 - Dark Bell

- Branch: `item_tool_supporter`
- V2 stress role: `object_heavy_item`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.0082696`
- Artwork observations: `5`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Visible observations: dark bell, geometric pattern, dark rounded body, black gem or sphere inside bell, purple vortex swirl background. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark bell | dark bell | object | foreground | high | 0.99 |
| geometric pattern | geometric pattern | object | foreground | medium | 0.95 |
| dark rounded body | dark rounded body | object | foreground | high | 0.98 |
| black gem or sphere inside bell | black gem or sphere inside bell | object | foreground | medium | 0.95 |
| purple vortex swirl background | purple vortex swirl background | environment | background | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| カードタイプテキスト: グッズ (Goods) | card_ui_text | top left | visible | 0.98 |
| カードタイプテキスト: トレーナーズ (Trainers) | card_ui_text | top right | visible | 0.98 |
| カード名: ダークベル (Dark Bell) | card_name_text | top center | visible | 0.99 |
| カード本文テキスト: Japanese text near bottom left | card_ui_text | bottom left inside main box | visible | 0.95 |
| Illust. Toysto Beach | card_ui_text | bottom left corner | visible | 0.97 |
| Set code and number: J M5 105/081 SR | card_ui_text | bottom left corner | visible | 0.97 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom center | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | main object is a dark bell | obs_object_001 | 0.99 |
| fact_obj_002 | objects_and_props | bell body has dark rounded appearance | obs_object_detail_002 | 0.98 |
| fact_obj_003 | objects_and_props | bell has geometric black and white patterns | obs_object_detail_001 | 0.95 |
| fact_obj_004 | objects_and_props | black gem or sphere inside bell | obs_object_detail_003 | 0.95 |
| fact_env_001 | environment | background is purple vortex swirl | obs_environment_001 | 0.96 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | card name is ダークベル (Dark Bell) | obs_text_003 | 0.99 |
| fact_ui_002 | card type is Goods (グッズ) | obs_text_001 | 0.98 |
| fact_ui_003 | card sub-type is Trainers (トレーナーズ) | obs_text_002 | 0.98 |
| fact_ui_004 | illustrator is Toysto Beach | obs_text_005 | 0.97 |
| fact_ui_005 | collector number and set code is J M5 105/081 SR | obs_text_006 | 0.97 |
| fact_ui_006 | copyright line includes ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | obs_text_007 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_001",
    "fact_ui_002",
    "fact_ui_003",
    "fact_ui_004",
    "fact_ui_005",
    "fact_ui_006"
  ],
  "name_text_observation_ids": [
    "obs_text_001",
    "obs_text_002",
    "obs_text_003"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_text_006"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_text_006"
  ],
  "copyright_line_observation_ids": [
    "obs_text_007"
  ],
  "bottom_line_text_observation_ids": [
    "obs_text_004"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_text_005"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": []
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| dark bell | exact | 1 | obs_object_001 | 0.99 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| none recorded | | | |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| dark bell | obs_object_001 |
| geometric pattern | obs_object_detail_001 |
| dark rounded body | obs_object_detail_002 |
| black gem or sphere inside bell | obs_object_detail_003 |
| purple vortex swirl background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_001, obs_object_001, obs_object_detail_001 | deterministic_rule | 0.92 |
| circular motif | obs_object_detail_002 | deterministic_rule | 0.98 |
| glowing highlights | obs_environment_001, obs_object_001, obs_object_detail_001 | deterministic_rule | 0.92 |
| reflective-looking surface | obs_environment_001, obs_object_001, obs_object_detail_001 | deterministic_rule | 0.92 |
| spiral motif | obs_environment_001 | deterministic_rule | 0.96 |
| spiral motif | obs_environment_001, obs_object_001, obs_object_detail_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, geometric pattern, dark rounded body, black gem or sphere inside bell, purple vortex swirl background. Counts: dark bell: 1.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_001",
      "kind": "object",
      "label": "geometric pattern",
      "normalized_label": "geometric pattern",
      "scene_layer": "foreground",
      "frame_position": "on bell",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_002",
      "kind": "object",
      "label": "dark rounded body",
      "normalized_label": "dark rounded body",
      "scene_layer": "foreground",
      "frame_position": "bell body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_detail_003",
      "kind": "object",
      "label": "black gem or sphere inside bell",
      "normalized_label": "black gem or sphere inside bell",
      "scene_layer": "foreground",
      "frame_position": "inside bell",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "purple vortex swirl background",
      "normalized_label": "purple vortex swirl background",
      "scene_layer": "background",
      "frame_position": "full card background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_001",
      "kind": "card_ui_text",
      "label": "カードタイプテキスト: グッズ (Goods)",
      "normalized_label": "goods",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_002",
      "kind": "card_ui_text",
      "label": "カードタイプテキスト: トレーナーズ (Trainers)",
      "normalized_label": "trainers",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_003",
      "kind": "card_name_text",
      "label": "カード名: ダークベル (Dark Bell)",
      "normalized_label": "dark bell",
      "scene_layer": "card_ui",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_004",
      "kind": "card_ui_text",
      "label": "カード本文テキスト: Japanese text near bottom left",
      "normalized_label": "card main text",
      "scene_layer": "card_ui",
      "frame_position": "bottom left inside main box",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_005",
      "kind": "card_ui_text",
      "label": "Illust. Toysto Beach",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom left corner",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_006",
      "kind": "card_ui_text",
      "label": "Set code and number: J M5 105/081 SR",
      "normalized_label": "set code and number",
      "scene_layer": "card_ui",
      "frame_position": "bottom left corner",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_007",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "main object is a dark bell",
      "value": "dark bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "[1]",
      "claim": "bell body has dark rounded appearance",
      "value": "dark rounded body",
      "supporting_observation_ids": [
        "obs_object_detail_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "[2]",
      "claim": "bell has geometric black and white patterns",
      "value": "geometric pattern",
      "supporting_observation_ids": [
        "obs_object_detail_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_004",
      "module": "objects_and_props",
      "field_path": "[3]",
      "claim": "black gem or sphere inside bell",
      "value": "black gem or sphere inside bell",
      "supporting_observation_ids": [
        "obs_object_detail_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "background is purple vortex swirl",
      "value": "purple vortex swirl",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text[0]",
      "claim": "card name is ダークベル (Dark Bell)",
      "value": "ダークベル (Dark Bell)",
      "supporting_observation_ids": [
        "obs_text_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card type is Goods (グッズ)",
      "value": "goods",
      "supporting_observation_ids": [
        "obs_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[1]",
      "claim": "card sub-type is Trainers (トレーナーズ)",
      "value": "trainers",
      "supporting_observation_ids": [
        "obs_text_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator is Toysto Beach",
      "value": "Toysto Beach",
      "supporting_observation_ids": [
        "obs_text_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number and set code is J M5 105/081 SR",
      "value": "J M5 105/081 SR",
      "supporting_observation_ids": [
        "obs_text_006"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright line includes ©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_text_007"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_obj_001",
      "normalized_label": "dark bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_object_001",
      "obs_object_detail_001",
      "obs_object_detail_002",
      "obs_object_detail_003"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "purple vortex swirl"
    ],
    "indoor_outdoor": "unknown",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "object_type": "tool-like object",
      "colors": [
        "black",
        "dark gray",
        "white"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded body",
        "geometric pattern"
      ],
      "location": "center foreground",
      "count_reference": "count_obj_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue swirl",
      "dark gray",
      "purple",
      "white"
    ],
    "lighting": [
      "bright highlight on object"
    ],
    "shadows": [
      "shadows inside bell"
    ],
    "highlights": [
      "bright reflective highlight"
    ],
    "composition": [
      "central object with swirling background"
    ],
    "camera_angle": "slightly top angled",
    "framing": "centered with balanced margins",
    "cropping": [],
    "depth": "foreground object with deep background swirl",
    "motion_cues": [
      "swirling vortex background"
    ],
    "motifs": [
      "geometric pattern on bell"
    ],
    "repeated_shapes": [
      "diamond shapes on bell"
    ],
    "style_cues": [
      "clean graphic style",
      "sharp outlines"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_object_001",
      "obs_object_detail_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "observed",
    "environment_review": "observed",
    "objects_and_props_review": "observed",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
  },
  "modules": {
    "subjects": {
      "fact_ids": [],
      "scene_subject_observation_ids": [],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [],
      "visible_body_regions": [],
      "facial_evidence": [],
      "hair": [],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [],
      "effects": []
    },
    "clothing": {
      "fact_ids": [],
      "garments": [],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_obj_001",
        "fact_obj_002",
        "fact_obj_003",
        "fact_obj_004"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_detail_001",
        "obs_object_detail_002",
        "obs_object_detail_003"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_object_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_object_001",
        "obs_object_detail_001",
        "obs_object_detail_002"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005",
        "fact_ui_006"
      ],
      "name_text_observation_ids": [
        "obs_text_001",
        "obs_text_002",
        "obs_text_003"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_text_006"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_text_006"
      ],
      "copyright_line_observation_ids": [
        "obs_text_007"
      ],
      "bottom_line_text_observation_ids": [
        "obs_text_004"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_text_005"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [
        "fact_obj_001"
      ],
      "count_ids": [
        "count_obj_001"
      ]
    },
    "relationships": {
      "fact_ids": [],
      "relationship_ids": []
    },
    "surface_and_scan_cues": {
      "fact_ids": [],
      "observation_ids": []
    },
    "uncertainty_and_abstentions": {
      "fact_ids": [],
      "fields": []
    },
    "fact_grounded_search_terms": {
      "fact_ids": [],
      "terms": [
        "dark bell",
        "geometric pattern",
        "dark rounded body",
        "black gem or sphere inside bell",
        "purple vortex swirl background"
      ]
    }
  },
  "module_reviews": [
    {
      "module": "subjects",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "human_appearance",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "creature_anatomy",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "clothing",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "objects_and_props",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "environment",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "counts",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "relationships",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "surface_and_scan_cues",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "uncertainty_and_abstentions",
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "fact_grounded_search_terms",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "geometric pattern",
      "supporting_observation_ids": [
        "obs_object_detail_001"
      ]
    },
    {
      "term": "dark rounded body",
      "supporting_observation_ids": [
        "obs_object_detail_002"
      ]
    },
    {
      "term": "black gem or sphere inside bell",
      "supporting_observation_ids": [
        "obs_object_detail_003"
      ]
    },
    {
      "term": "purple vortex swirl background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_object_001",
          "obs_object_detail_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_detail_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_object_001",
          "obs_object_detail_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "reflective-looking surface",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_object_001",
          "obs_object_detail_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_object_001",
          "obs_object_detail_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-118: fact_graph_card_ui_observation_in_artwork_module:color_and_light:fact_card_ui_and_print_markers_008

