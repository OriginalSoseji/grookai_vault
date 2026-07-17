# Card Visual Fact Graph V2 Review Packet

Generated rows: 1
Validation failures: 0
Skipped images: 0
Estimated cost USD: 0.0090576

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0090576`
- Artwork observations: `9`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, body sphere, three black arms, purple flames, face front visible, eyes visible, mouth visible, dark purple haze background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | high | 0.99 |
| body sphere | body sphere | object | foreground | high | 0.98 |
| three black arms | three black arms | object | foreground | high | 0.98 |
| purple flames | purple flames | object | foreground | medium | 0.95 |
| face front visible | face front visible | object | foreground | high | 0.96 |
| eyes visible | eyes visible | object | foreground | medium | 0.96 |
| mouth visible | mouth visible | object | foreground | medium | 0.96 |
| dark purple haze background | dark purple haze background | environment | background | medium | 0.94 |
| main colors: purple, black, yellow | purple black yellow | color_and_light | foreground | high | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name Mega Chandelure ex | card_ui_text | top_center | fully_visible | 0.99 |
| HP 350 | card_ui_text | top_right | fully_visible | 0.99 |
| collector number 113/081 SAR | collector_number | bottom_left | fully_visible | 0.98 |
| set icon jpn-m5 | set_symbol | bottom_left | fully_visible | 0.98 |
| ability じゅばくのほのお (Curse Flame) | card_ui_text | middle_left | fully_visible | 0.97 |
| attack ファントムメイズ (Phantom Maze) 130+ | card_ui_text | middle_right | fully_visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject is | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | body component | obs_creature_anatomy_body_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | body component | obs_creature_anatomy_arms_001 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | visible effect | obs_creature_anatomy_flammes_001 | 0.95 |
| fact_creature_anatomy_004 | creature_anatomy | face position | obs_creature_anatomy_facefront_001 | 0.96 |
| fact_creature_anatomy_005 | creature_anatomy | eyes visibility | obs_creature_anatomy_eyes_001 | 0.96 |
| fact_creature_anatomy_006 | creature_anatomy | mouth visibility | obs_creature_anatomy_mouth_001 | 0.96 |
| fact_environment_001 | environment | background color theme | obs_environment_001 | 0.94 |
| fact_color_and_light_001 | color_and_light | dominate colors | obs_color_and_light_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text visible | obs_card_ui_text_name_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | hp text visible | obs_card_ui_text_hp_001 | 0.99 |
| fact_card_ui_and_print_markers_003 | collector number visible | obs_card_ui_text_number_001 | 0.98 |
| fact_card_ui_and_print_markers_004 | set symbol visible | obs_card_ui_symbol_set_001 | 0.98 |
| fact_card_ui_and_print_markers_005 | ability text visible | obs_card_ui_text_ability_001 | 0.97 |
| fact_card_ui_and_print_markers_006 | attack text visible | obs_card_ui_text_attack_001 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_001",
    "fact_card_ui_and_print_markers_002",
    "fact_card_ui_and_print_markers_003",
    "fact_card_ui_and_print_markers_004",
    "fact_card_ui_and_print_markers_005",
    "fact_card_ui_and_print_markers_006"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_text_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_text_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_symbol_set_001"
  ],
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
| subjects | complete | none | high |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

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
| body sphere | obs_creature_anatomy_body_001 |
| three black arms | obs_creature_anatomy_arms_001 |
| purple flames | obs_creature_anatomy_flammes_001 |
| face front visible | obs_creature_anatomy_facefront_001 |
| eyes visible | obs_creature_anatomy_eyes_001 |
| mouth visible | obs_creature_anatomy_mouth_001 |
| dark purple haze background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| flame | obs_creature_anatomy_flammes_001 | deterministic_rule | 0.95 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_creature_anatomy_facefront_001, obs_subject_001 | deterministic_rule | 0.99 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, body sphere, three black arms, purple flames, face front visible, eyes visible, mouth visible, dark purple haze background.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure",
      "normalized_label": "mega chandelure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_body_001",
      "kind": "object",
      "label": "body sphere",
      "normalized_label": "body sphere",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_arms_001",
      "kind": "object",
      "label": "three black arms",
      "normalized_label": "three black arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_flammes_001",
      "kind": "object",
      "label": "purple flames",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_facefront_001",
      "kind": "object",
      "label": "face front visible",
      "normalized_label": "face front visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_eyes_001",
      "kind": "object",
      "label": "eyes visible",
      "normalized_label": "eyes visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_mouth_001",
      "kind": "object",
      "label": "mouth visible",
      "normalized_label": "mouth visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark purple haze background",
      "normalized_label": "dark purple haze background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_and_light_001",
      "kind": "color_and_light",
      "label": "main colors: purple, black, yellow",
      "normalized_label": "purple black yellow",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_name_001",
      "kind": "card_ui_text",
      "label": "card name Mega Chandelure ex",
      "normalized_label": "mega chandelure ex",
      "scene_layer": "card_ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_hp_001",
      "kind": "card_ui_text",
      "label": "HP 350",
      "normalized_label": "hp 350",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_number_001",
      "kind": "collector_number",
      "label": "collector number 113/081 SAR",
      "normalized_label": "113/081 SAR",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_set_001",
      "kind": "set_symbol",
      "label": "set icon jpn-m5",
      "normalized_label": "jpn-m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_ability_001",
      "kind": "card_ui_text",
      "label": "ability じゅばくのほのお (Curse Flame)",
      "normalized_label": "じゅばくのほのお",
      "scene_layer": "card_ui",
      "frame_position": "middle_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_attack_001",
      "kind": "card_ui_text",
      "label": "attack ファントムメイズ (Phantom Maze) 130+",
      "normalized_label": "ファントムメイズ 130+",
      "scene_layer": "card_ui",
      "frame_position": "middle_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "identity",
      "claim": "subject is",
      "value": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_components.body",
      "claim": "body component",
      "value": "sphere body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_components.arms",
      "claim": "body component",
      "value": "three black arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_arms_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "effects.flames",
      "claim": "visible effect",
      "value": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_flammes_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "face.position",
      "claim": "face position",
      "value": "front visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_facefront_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "face.eyes",
      "claim": "eyes visibility",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_eyes_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "face.mouth",
      "claim": "mouth visibility",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_mouth_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background color theme",
      "value": "dark purple haze",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "dominate colors",
      "value": "purple black yellow",
      "supporting_observation_ids": [
        "obs_color_and_light_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "Mega Chandelure ex",
      "supporting_observation_ids": [
        "obs_card_ui_text_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "hp text visible",
      "value": "350",
      "supporting_observation_ids": [
        "obs_card_ui_text_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "113/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_text_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_set_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "ability_text",
      "claim": "ability text visible",
      "value": "じゅばくのほのお",
      "supporting_observation_ids": [
        "obs_card_ui_text_ability_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack text visible",
      "value": "ファントムメイズ 130+",
      "supporting_observation_ids": [
        "obs_card_ui_text_attack_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Chandelure",
      "identity_confidence": 0.99,
      "anatomy": [
        "eyes visible",
        "face front visible",
        "mouth visible",
        "purple flames",
        "sphere body",
        "three black arms"
      ],
      "physical_features": [
        "black arms",
        "purple body",
        "yellow eyes"
      ],
      "pose": [
        "floating",
        "upright"
      ],
      "orientation": "forward",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "visible",
        "eyebrows": "not visible",
        "face_position": "front",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "purple",
        "yellow"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_creature_anatomy_arms_001",
      "obs_creature_anatomy_body_001",
      "obs_creature_anatomy_eyes_001",
      "obs_creature_anatomy_facefront_001",
      "obs_creature_anatomy_flammes_001",
      "obs_creature_anatomy_mouth_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "indoor",
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "purple",
      "yellow"
    ],
    "lighting": [
      "soft diffused"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "glowing flames"
    ],
    "composition": [
      "centered subject"
    ],
    "camera_angle": "straight on",
    "framing": "tight",
    "cropping": [],
    "depth": "medium",
    "motion_cues": [],
    "motifs": [
      "flame shapes",
      "spiral arm shape"
    ],
    "repeated_shapes": [
      "curved arms"
    ],
    "style_cues": [
      "digital painting"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_flammes_001",
      "obs_environment_001",
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
    "objects_and_props_review": "none_visible",
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
      "fact_ids": [],
      "visible_body_regions": [],
      "facial_evidence": [],
      "hair": [],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_creature_anatomy_001",
        "fact_creature_anatomy_002",
        "fact_creature_anatomy_003",
        "fact_creature_anatomy_004",
        "fact_creature_anatomy_005",
        "fact_creature_anatomy_006"
      ],
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
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_flammes_001",
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_and_light_001"
      ],
      "observation_ids": [
        "obs_color_and_light_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_001",
        "fact_card_ui_and_print_markers_002",
        "fact_card_ui_and_print_markers_003",
        "fact_card_ui_and_print_markers_004",
        "fact_card_ui_and_print_markers_005",
        "fact_card_ui_and_print_markers_006"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_text_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_text_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_symbol_set_001"
      ],
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
        "body sphere",
        "three black arms",
        "purple flames",
        "face front visible",
        "eyes visible",
        "mouth visible",
        "dark purple haze background"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "creature_anatomy",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "environment",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "complete",
      "omission_risk": "none",
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
      "term": "body sphere",
      "supporting_observation_ids": [
        "obs_creature_anatomy_body_001"
      ]
    },
    {
      "term": "three black arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_arms_001"
      ]
    },
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_flammes_001"
      ]
    },
    {
      "term": "face front visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_facefront_001"
      ]
    },
    {
      "term": "eyes visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_eyes_001"
      ]
    },
    {
      "term": "mouth visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_mouth_001"
      ]
    },
    {
      "term": "dark purple haze background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_flammes_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_facefront_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upright",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

