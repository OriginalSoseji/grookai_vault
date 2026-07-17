# Card Visual Fact Graph V2 Review Packet

Generated rows: 11
Validation failures: 14
Skipped images: 0
Estimated cost USD: 0.2520328

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0107344`
- Artwork observations: `11`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, body, chandelier arms with flames, glass central body, purple flames, candle flames on arms, swirling smoke effects, curled arm ends. Semantic facts: floating, dark forest.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | high | 0.99 |
| body | body | creature_anatomy | foreground | high | 0.99 |
| three chandelier arms with flames | chandelier arms with flames | creature_anatomy | foreground | medium | 0.95 |
| glass-like central lantern body | glass central body | creature_anatomy | foreground | medium | 0.95 |
| purple flame effects | purple flames | creature_anatomy | foreground | medium | 0.95 |
| candle flames on arms | candle flames on arms | creature_anatomy | foreground | medium | 0.9 |
| swirling smoke or shadow effects | swirling smoke effects | creature_anatomy | foreground | medium | 0.9 |
| twisting curled arm ends | curled arm ends | creature_anatomy | foreground | medium | 0.9 |
| dark forest background | dark forest | environment | background | medium | 0.9 |
| purple and black color palette | purple black palette | environment | background | medium | 0.9 |
| centered subject framing | centered framing | composition | foreground | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text: メガシャンデラex (Mega Chandelure ex) | card_ui_text | top | visible | 0.99 |
| HP text: HP 350 | card_ui_text | top_right | visible | 0.99 |
| psychic type symbol near HP | card_ui_symbol | top_right | visible | 0.99 |
| attack name text: ファントムメイズ (Phantom Maze) | card_ui_text | mid | visible | 0.95 |
| attack damage number: 130+ | card_ui_text | mid | visible | 0.95 |
| collector number: 113/081 SAR | card_ui_text | bottom_left | visible | 0.95 |
| set code: M5 | card_ui_text | bottom_left | visible | 0.95 |
| text: Japanese text below name and in attack description | card_ui_text | mid | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | body | obs_creature_anatomy_001, obs_creature_anatomy_002 | 0.99 |
| fact_creature_anatomy_002 | creature_anatomy | presence of flames on arms | obs_creature_anatomy_004, obs_creature_anatomy_005 | 0.95 |
| fact_creature_anatomy_003 | creature_anatomy | body glass like translucent central body | obs_creature_anatomy_003 | 0.95 |
| fact_creature_anatomy_004 | creature_anatomy | purple flame effects around body | obs_creature_anatomy_004 | 0.95 |
| fact_creature_anatomy_005 | creature_anatomy | floating pose | obs_subject_001 | 0.9 |
| fact_environment_001 | environment | dark forest background | obs_environment_001 | 0.9 |
| fact_composition_001 | composition | subject centered in frame | obs_composition_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | HP text | obs_card_ui_text_002 | 0.99 |
| fact_card_ui_and_print_markers_003 | psychic type symbol | obs_card_ui_symbol_001 | 0.99 |
| fact_card_ui_and_print_markers_004 | attack name text | obs_card_ui_text_003 | 0.95 |
| fact_card_ui_and_print_markers_005 | attack damage | obs_card_ui_text_004 | 0.95 |
| fact_card_ui_and_print_markers_006 | collector number text | obs_card_ui_text_005 | 0.95 |
| fact_card_ui_and_print_markers_007 | set code text | obs_card_ui_text_006 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_001",
    "fact_card_ui_and_print_markers_002",
    "fact_card_ui_and_print_markers_003",
    "fact_card_ui_and_print_markers_004",
    "fact_card_ui_and_print_markers_005",
    "fact_card_ui_and_print_markers_006",
    "fact_card_ui_and_print_markers_007"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_text_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_symbol_001"
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
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | state | floating | obs_subject_001 | obs_subject_001 | floating floating | 0.9 |
| sem_fact_002 | environment | dark forest |  | obs_environment_001 | dark forest | 0.9 |

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
| floating | obs_subject_001 |
| purple flames | obs_creature_anatomy_004 |
| glass lantern body | obs_creature_anatomy_003 |
| chandelier arms | obs_creature_anatomy_002 |
| dark forest background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_composition_001, obs_creature_anatomy_003 | deterministic_rule | 0.95 |
| dark forest | obs_environment_001 | deterministic_rule | 0.9 |
| flame | obs_creature_anatomy_002, obs_creature_anatomy_004, obs_creature_anatomy_005 | deterministic_rule | 0.95 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| forest | obs_environment_001 | deterministic_rule | 0.9 |
| smoke | obs_creature_anatomy_006 | deterministic_rule | 0.9 |
| spiral motif | obs_creature_anatomy_006 | deterministic_rule | 0.9 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, body, chandelier arms with flames, glass central body, purple flames, candle flames on arms, swirling smoke effects, curled arm ends. Semantic facts: floating, dark forest.
- Quality flags: `none`
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
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "three chandelier arms with flames",
      "normalized_label": "chandelier arms with flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "glass-like central lantern body",
      "normalized_label": "glass central body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "purple flame effects",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "candle flames on arms",
      "normalized_label": "candle flames on arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "swirling smoke or shadow effects",
      "normalized_label": "swirling smoke effects",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "twisting curled arm ends",
      "normalized_label": "curled arm ends",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark forest background",
      "normalized_label": "dark forest",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "purple and black color palette",
      "normalized_label": "purple black palette",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "centered subject framing",
      "normalized_label": "centered framing",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text: メガシャンデラex (Mega Chandelure ex)",
      "normalized_label": "card_name_text",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "HP text: HP 350",
      "normalized_label": "hp_text",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "card_ui_symbol",
      "label": "psychic type symbol near HP",
      "normalized_label": "psychic_type_symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "attack name text: ファントムメイズ (Phantom Maze)",
      "normalized_label": "attack_name_text",
      "scene_layer": "card_ui",
      "frame_position": "mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "attack damage number: 130+",
      "normalized_label": "attack_damage_text",
      "scene_layer": "card_ui",
      "frame_position": "mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "collector number: 113/081 SAR",
      "normalized_label": "collector_number_text",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "card_ui_text",
      "label": "set code: M5",
      "normalized_label": "set_code_text",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_007",
      "kind": "card_ui_text",
      "label": "text: Japanese text below name and in attack description",
      "normalized_label": "japanese_text",
      "scene_layer": "card_ui",
      "frame_position": "mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0]",
      "claim": "scene subject identity",
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
      "field_path": "body_regions[0]",
      "claim": "body",
      "value": "chandelier shaped body with three arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001",
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "physical_features[0]",
      "claim": "presence of flames on arms",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "physical_features[1]",
      "claim": "body glass like translucent central body",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "special_effects[0]",
      "claim": "purple flame effects around body",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[0]",
      "claim": "floating pose",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "dark forest background",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "composition[0]",
      "claim": "subject centered in frame",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガシャンデラex",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text",
      "value": "350",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "psychic type symbol",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack name text",
      "value": "ファントムメイズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack damage",
      "value": "130+",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number text",
      "value": "113/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "set_code",
      "claim": "set code text",
      "value": "M5",
      "supporting_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "confidence": 0.95,
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
        "body",
        "chandelier arms with flames",
        "glass-like central lantern body"
      ],
      "physical_features": [
        "candle flames on arms",
        "purple flame effects",
        "swirling smoke or shadow effects",
        "twisting curled arm ends"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "cannot determine due to partial crop",
        "mouth": "cannot determine due to partial crop",
        "eyebrows": "cannot determine due to partial crop",
        "face_position": "partial face visible",
        "other_visible_evidence": [
          "dark swirling flame eyes"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
        "orange flame",
        "purple"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_composition_001",
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
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
      "dark forest"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [],
    "ground": [],
    "terrain": [
      "forest floor"
    ],
    "plants": [
      "trees"
    ],
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
      "blue",
      "orange",
      "purple"
    ],
    "lighting": [
      "diffuse",
      "dim",
      "glowing flames"
    ],
    "shadows": [
      "glowing flame shadows",
      "soft shadows"
    ],
    "highlights": [
      "glass highlights",
      "glowing flame highlights"
    ],
    "composition": [
      "diagonal arm placement",
      "subject centered"
    ],
    "camera_angle": "frontal",
    "framing": "centered with upper body visible",
    "cropping": [
      "partial face crop"
    ],
    "depth": "shallow depth",
    "motion_cues": [
      "floating motion implied"
    ],
    "motifs": [
      "flame",
      "ghostly"
    ],
    "repeated_shapes": [
      "curled arm ends"
    ],
    "style_cues": [
      "dark",
      "glowing flame effects",
      "translucent glass texture"
    ],
    "supporting_observation_ids": [
      "obs_composition_001",
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_004",
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
        "fact_creature_anatomy_005"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "chandelier shaped body with three arms",
          "visibility": "visible",
          "colors": [
            "black",
            "purple"
          ],
          "details": [
            "glass-like central lantern body"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001",
            "obs_creature_anatomy_002",
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "three chandelier arms with flames",
          "visibility": "visible",
          "colors": [
            "orange",
            "purple"
          ],
          "details": [
            "candle flames on arms",
            "twisting curled arm ends"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002",
            "obs_creature_anatomy_004",
            "obs_creature_anatomy_005",
            "obs_creature_anatomy_007"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "flames on arms",
          "feature": "purple flame effects",
          "visibility": "visible",
          "colors": [
            "orange",
            "purple"
          ],
          "details": [
            "glowing flame highlights"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004",
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "upright",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.9
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple flame effects",
          "details": [
            "glowing flame effects around body"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.95
        }
      ]
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
      "fact_ids": [
        "fact_composition_001"
      ],
      "observation_ids": [
        "obs_composition_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_004",
        "obs_environment_002"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_001",
        "fact_card_ui_and_print_markers_002",
        "fact_card_ui_and_print_markers_003",
        "fact_card_ui_and_print_markers_004",
        "fact_card_ui_and_print_markers_005",
        "fact_card_ui_and_print_markers_006",
        "fact_card_ui_and_print_markers_007"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_symbol_001"
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
        "floating",
        "purple flames",
        "glass lantern body",
        "chandelier arms",
        "dark forest background"
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
      "omission_risk": "low",
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
      "omission_risk": "low",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "floating"
        ],
        "body_position": [],
        "motion_state": [
          "floating"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "environment",
      "label": "dark forest",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "dark forest"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "glass lantern body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "chandelier arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    },
    {
      "term": "dark forest background",
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
          "obs_composition_001",
          "obs_creature_anatomy_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "dark forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_002",
          "obs_creature_anatomy_004",
          "obs_creature_anatomy_005"
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
        "concept": "forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "smoke",
        "source_observation_ids": [
          "obs_creature_anatomy_006"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_creature_anatomy_006"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "upright orientation",
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

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.9`
- Attribute confidence: `0.85`
- Cost USD: `0.0080436`
- Artwork observations: `3`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: pokemon, gold metallic, water energy symbol. Counts: water energy symbols: 2.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Pokemon figure shape in artwork | pokemon | scene_subject | foreground | high | 0.9 |
| gold metallic tone in artwork | gold metallic | object_color | foreground | high | 1 |
| water energy symbols | water energy symbol | object | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese with ex symbol | card_ui_text | top-center | fully_visible | 0.99 |
| HP 280 text | card_ui_text | top-right | fully_visible | 0.99 |
| illustrator text Illus. 5ban Graphics | card_ui_text | bottom-left | fully_visible | 0.95 |
| card set and number text M5 118/081 | card_ui_text | bottom-left | fully_visible | 0.95 |
| small copyright text bottom | card_ui_text | bottom | partially_visible | 0.8 |
| set symbol and rarity symbol in bottom left | print_marker | bottom-left | fully_visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject | obs_subject_001 | 0.9 |
| fact_002 | color_and_light | primary color | obs_color_001 | 1 |
| fact_003 | objects_and_props | energy symbol type | obs_object_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_004 | visible card name text | obs_ui_text_name_001 | 0.99 |
| fact_005 | visible hp text | obs_ui_text_hp_001 | 0.99 |
| fact_006 | visible illustrator text | obs_ui_text_bottom_left_001 | 0.95 |
| fact_007 | visible card set and number | obs_ui_text_set_number_001 | 0.95 |
| fact_008 | visible copyright text at bottom | obs_ui_text_bottom_text_001 | 0.8 |
| fact_009 | visible set and rarity symbol | obs_object_002 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_004",
    "fact_005",
    "fact_006",
    "fact_007",
    "fact_008",
    "fact_009"
  ],
  "name_text_observation_ids": [
    "obs_ui_text_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_ui_text_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_ui_text_set_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_object_002"
  ],
  "rarity_mark_observation_ids": [
    "obs_object_002"
  ],
  "copyright_line_observation_ids": [
    "obs_ui_text_bottom_text_001"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_ui_text_bottom_left_001"
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
| environment | none_visible | none | not_applicable |  |
| composition | complete | low | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| water energy symbols | exact | 2 | obs_object_001 | 0.9 |

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
| gold metallic pokemon figure | obs_color_001, obs_subject_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| floating | obs_subject_001 | deterministic_rule | 0.9 |
| frontal orientation | obs_subject_001 | deterministic_rule | 0.9 |
| metal-like appearance | obs_color_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: pokemon, gold metallic, water energy symbol. Counts: water energy symbols: 2.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_subject_kind_classification_confusion`
- Policy results: 1

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Pokemon figure shape in artwork",
      "normalized_label": "pokemon",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "object_color",
      "label": "gold metallic tone in artwork",
      "normalized_label": "gold metallic",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "water energy symbols",
      "normalized_label": "water energy symbol",
      "scene_layer": "background",
      "frame_position": "mid-left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese with ex symbol",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top-center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_hp_001",
      "kind": "card_ui_text",
      "label": "HP 280 text",
      "normalized_label": "hp text",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_bottom_left_001",
      "kind": "card_ui_text",
      "label": "illustrator text Illus. 5ban Graphics",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_set_number_001",
      "kind": "card_ui_text",
      "label": "card set and number text M5 118/081",
      "normalized_label": "collector number and set code",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_bottom_text_001",
      "kind": "card_ui_text",
      "label": "small copyright text bottom",
      "normalized_label": "copyright text",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "partially_visible",
      "salience": "low",
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "print_marker",
      "label": "set symbol and rarity symbol in bottom left",
      "normalized_label": "set symbol and rarity mark",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "scene subject",
      "value": "pokemon",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "color_and_light",
      "field_path": "[0]",
      "claim": "primary color",
      "value": "gold metallic",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "energy symbol type",
      "value": "water energy symbol",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "visible card name text",
      "value": "Japanese text with ex symbol",
      "supporting_observation_ids": [
        "obs_ui_text_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids[0]",
      "claim": "visible hp text",
      "value": "280",
      "supporting_observation_ids": [
        "obs_ui_text_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "visible illustrator text",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_ui_text_bottom_left_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "visible card set and number",
      "value": "M5 118/081",
      "supporting_observation_ids": [
        "obs_ui_text_set_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "visible copyright text at bottom",
      "value": "small copyright text",
      "supporting_observation_ids": [
        "obs_ui_text_bottom_text_001"
      ],
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "visible set and rarity symbol",
      "value": "set symbol and rarity mark",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.9,
      "anatomy": [
        "crest-like head features",
        "head",
        "typical body shape visible"
      ],
      "physical_features": [
        "glowing gold metallic body surface"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "frontal",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "not clearly visible due to gold foil effect",
        "mouth": "not clearly visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": [
          "head crest shape"
        ]
      },
      "clothing_or_accessories": [
        "none visible"
      ],
      "colors": [
        "gold metallic"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "water energy symbols",
      "count_type": "exact",
      "exact_count": 2,
      "estimated_min": 2,
      "estimated_max": 2,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "scene_layer": "background",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_color_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_object_001"
    ],
    "background": [
      "obs_object_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "unknown",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": []
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "water energy symbols",
      "normalized_label": "water energy symbol",
      "object_type": "energy symbol",
      "colors": [
        "blue",
        "white"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "mid-left corner",
      "count_reference": "count_001",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "gold metallic"
    ],
    "lighting": [
      "reflective metallic highlights"
    ],
    "shadows": [
      "subtle"
    ],
    "highlights": [
      "strong highlights"
    ],
    "composition": [
      "central subject, symmetrical background pattern"
    ],
    "camera_angle": "frontal",
    "framing": "tight centered on main figure",
    "cropping": [
      "no cropping visible"
    ],
    "depth": "moderate depth suggested by shading and gradient",
    "motion_cues": [],
    "motifs": [
      "radiating circular pattern in background"
    ],
    "repeated_shapes": [
      "circular arcs surrounding main figure"
    ],
    "style_cues": [
      "printing",
      "metallic texture"
    ],
    "supporting_observation_ids": [
      "obs_color_001",
      "obs_subject_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "observed",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "observed",
    "environment_review": "none_visible",
    "objects_and_props_review": "observed",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "not_applicable"
  },
  "modules": {
    "subjects": {
      "fact_ids": [
        "fact_001"
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
        "fact_003"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": []
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_color_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_002"
      ],
      "observation_ids": [
        "obs_color_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_008",
        "fact_009"
      ],
      "name_text_observation_ids": [
        "obs_ui_text_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_ui_text_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_ui_text_set_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_object_002"
      ],
      "rarity_mark_observation_ids": [
        "obs_object_002"
      ],
      "copyright_line_observation_ids": [
        "obs_ui_text_bottom_text_001"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_ui_text_bottom_left_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [
        "fact_003"
      ],
      "count_ids": [
        "count_001"
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
        "gold metallic pokemon figure"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "not_applicable",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "gold metallic pokemon figure",
      "supporting_observation_ids": [
        "obs_color_001",
        "obs_subject_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_color_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-114 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0108688`
- Artwork observations: `14`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: dark forest, floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary | 0.99 |
| head | head | body_region | foreground | primary | 0.98 |
| arms | arms | body_region | foreground | primary | 0.98 |
| torso | torso | body_region | foreground | primary | 0.98 |
| purple glowing eyes | purple glowing eyes | physical_feature | foreground | primary | 0.99 |
| black | black | color | foreground | primary | 1 |
| white | white | color | foreground | primary | 1 |
| purple | purple | color | foreground | primary | 1 |
| floating | floating | pose | foreground | primary | 0.95 |
| still | still | action_state | foreground | primary | 0.9 |
| dark forest background | dark forest | environment | background | primary | 0.98 |
| dark gray | dark gray | color | background | secondary | 0.95 |
| green | green | color | background | secondary | 0.9 |
| purple magical glow | purple glow | visual_effect | foreground | primary | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガダークライex (Mega Darkrai ex) | card_name_text | top_center | fully_visible | 0.99 |
| HP 280 | hp_text | top_right | fully_visible | 0.99 |
| Darkness Energy Symbol | energy_symbol | top_right_near_hp | fully_visible | 0.99 |
| M5 Abyss Eye Set Symbol | set_symbol | bottom_left | fully_visible | 0.99 |
| 114/081 SAR | collector_number | bottom_left | fully_visible | 0.99 |
| Illus. AKIRA EGAWA | illustrator_text | bottom_left | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | identifies the main Pokemon in artwork | obs_subject_001 | 0.99 |
| fact_body_region_head_001 | creature_anatomy | shows head of Mega Darkrai | obs_body_region_001 | 0.98 |
| fact_body_region_arms_001 | creature_anatomy | shows arms of Mega Darkrai | obs_body_region_002 | 0.98 |
| fact_body_region_torso_001 | creature_anatomy | shows torso of Mega Darkrai | obs_body_region_003 | 0.98 |
| fact_physical_feature_eyes_001 | creature_anatomy | Mega Darkrai has purple glowing eyes | obs_body_feature_001 | 0.99 |
| fact_colors_black_001 | color_and_light | Mega Darkrai is predominantly black | obs_color_001 | 1 |
| fact_colors_white_001 | color_and_light | Mega Darkrai has white body parts | obs_color_002 | 1 |
| fact_colors_purple_001 | color_and_light | Mega Darkrai has purple eyes and effects | obs_color_003, obs_visual_effect_001 | 1 |
| fact_pose_floating_001 | creature_anatomy | Mega Darkrai is floating | obs_pose_001 | 0.95 |
| fact_action_still_001 | creature_anatomy | Mega Darkrai is still in pose | obs_action_state_001 | 0.9 |
| fact_environment_dark_forest_001 | environment | background setting is dark forest | obs_environment_001 | 0.98 |
| fact_colors_dark_gray_001 | color_and_light | background features dark gray tones | obs_color_004 | 0.95 |
| fact_colors_green_001 | color_and_light | background has green foliage | obs_color_005 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text shows メガダークライex (Mega Darkrai ex) | obs_card_ui_name_text_001 | 0.99 |
| fact_card_ui_hp_text_001 | card HP text is 280 | obs_card_ui_hp_text_001 | 0.99 |
| fact_card_ui_energy_symbol_001 | card shows Darkness Energy Symbol near HP | obs_card_ui_energy_symbol_001 | 0.99 |
| fact_card_ui_set_symbol_001 | card set symbol is M5 Abyss Eye | obs_card_ui_set_symbol_001 | 0.99 |
| fact_card_ui_collector_number_001 | card number is 114/081 SAR | obs_card_ui_collector_number_001 | 0.99 |
| fact_card_ui_illustrator_text_001 | illustrator text is AKIRA EGAWA | obs_card_ui_illustrator_text_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_number_001",
    "fact_card_ui_energy_symbol_001",
    "fact_card_ui_hp_text_001",
    "fact_card_ui_illustrator_text_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_text_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_symbol_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_text_001"
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | medium | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_001 | environment | dark forest |  | obs_environment_001 | dark forest background | 0.98 |
| svf_002 | state | floating | obs_subject_001 | obs_pose_001 | floating | 0.95 |

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
| floating darkrai | obs_pose_001 |
| dark forest background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_subject_001 | deterministic_rule | 0.92 |
| dark forest | obs_environment_001 | deterministic_rule | 0.98 |
| floating | obs_action_state_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| forest | obs_environment_001 | deterministic_rule | 0.98 |
| glowing highlights | obs_body_feature_001, obs_visual_effect_001 | deterministic_rule | 0.99 |
| upright orientation | obs_action_state_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: dark forest, floating.
- Quality flags: `potential_empty_module_marked_complete`, `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Darkrai",
      "normalized_label": "mega darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "body_region",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "body_region",
      "label": "arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center_left_and_right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "body_region",
      "label": "torso",
      "normalized_label": "torso",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_feature_001",
      "kind": "physical_feature",
      "label": "purple glowing eyes",
      "normalized_label": "purple glowing eyes",
      "scene_layer": "foreground",
      "frame_position": "center_head",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color",
      "label": "white",
      "normalized_label": "white",
      "scene_layer": "foreground",
      "frame_position": "head_and_torso",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_003",
      "kind": "color",
      "label": "purple",
      "normalized_label": "purple",
      "scene_layer": "foreground",
      "frame_position": "eyes_center_head",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "floating",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_action_state_001",
      "kind": "action_state",
      "label": "still",
      "normalized_label": "still",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark forest background",
      "normalized_label": "dark forest",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_004",
      "kind": "color",
      "label": "dark gray",
      "normalized_label": "dark gray",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_005",
      "kind": "color",
      "label": "green",
      "normalized_label": "green",
      "scene_layer": "background",
      "frame_position": "forest foliage",
      "visibility": "partially_visible",
      "salience": "secondary",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_visual_effect_001",
      "kind": "visual_effect",
      "label": "purple magical glow",
      "normalized_label": "purple glow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_name_text",
      "label": "メガダークライex (Mega Darkrai ex)",
      "normalized_label": "mega darkrai ex",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_text_001",
      "kind": "hp_text",
      "label": "HP 280",
      "normalized_label": "280 hp",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_001",
      "kind": "energy_symbol",
      "label": "Darkness Energy Symbol",
      "normalized_label": "darkness energy",
      "scene_layer": "ui",
      "frame_position": "top_right_near_hp",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "M5 Abyss Eye Set Symbol",
      "normalized_label": "abyss eye set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "114/081 SAR",
      "normalized_label": "114 slash 081 sar",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. AKIRA EGAWA",
      "normalized_label": "illustrator akira egawa",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subject_identity",
      "claim": "identifies the main Pokemon in artwork",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_region_head_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "shows head of Mega Darkrai",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_region_arms_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "shows arms of Mega Darkrai",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_region_torso_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.torso",
      "claim": "shows torso of Mega Darkrai",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_physical_feature_eyes_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.eyes",
      "claim": "Mega Darkrai has purple glowing eyes",
      "value": "purple glowing eyes",
      "supporting_observation_ids": [
        "obs_body_feature_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_colors_black_001",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "Mega Darkrai is predominantly black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_colors_white_001",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "Mega Darkrai has white body parts",
      "value": "white",
      "supporting_observation_ids": [
        "obs_color_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_colors_purple_001",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "Mega Darkrai has purple eyes and effects",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_color_003",
        "obs_visual_effect_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_floating_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.pose",
      "claim": "Mega Darkrai is floating",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_action_still_001",
      "module": "creature_anatomy",
      "field_path": "action_state",
      "claim": "Mega Darkrai is still in pose",
      "value": "still",
      "supporting_observation_ids": [
        "obs_action_state_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_dark_forest_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background setting is dark forest",
      "value": "dark forest",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_colors_dark_gray_001",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "background features dark gray tones",
      "value": "dark gray",
      "supporting_observation_ids": [
        "obs_color_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_colors_green_001",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "background has green foliage",
      "value": "green",
      "supporting_observation_ids": [
        "obs_color_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text shows メガダークライex (Mega Darkrai ex)",
      "value": "メガダークライex",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "card HP text is 280",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "card shows Darkness Energy Symbol near HP",
      "value": "Darkness Energy Symbol",
      "supporting_observation_ids": [
        "obs_card_ui_energy_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "card set symbol is M5 Abyss Eye",
      "value": "M5 Abyss Eye",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "card number is 114/081 SAR",
      "value": "114/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text is AKIRA EGAWA",
      "value": "AKIRA EGAWA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "head",
        "torso"
      ],
      "physical_features": [
        "purple glowing eyes"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "purple glowing",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "purple",
        "white"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_body_feature_001",
      "obs_body_region_001",
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_subject_001",
      "obs_visual_effect_001"
    ],
    "midground": [],
    "background": [
      "obs_color_004",
      "obs_color_005",
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "dark forest"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [
      "foliage",
      "trees"
    ],
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
      "dark gray",
      "green",
      "purple",
      "white"
    ],
    "lighting": [
      "dim",
      "glow from eyes"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "purple highlights on eyes and chest"
    ],
    "composition": [
      "centered main subject",
      "dark background with scattered light spots"
    ],
    "camera_angle": "straight on",
    "framing": "tight crop",
    "cropping": [],
    "depth": "moderate depth",
    "motion_cues": [],
    "motifs": [
      "dark and"
    ],
    "repeated_shapes": [
      "spiky organic shapes"
    ],
    "style_cues": [
      "detailed painting style"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_subject_001",
      "obs_visual_effect_001"
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
        "fact_action_still_001",
        "fact_body_region_arms_001",
        "fact_body_region_head_001",
        "fact_body_region_torso_001",
        "fact_physical_feature_eyes_001",
        "fact_pose_floating_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_002"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "torso",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_003"
          ],
          "confidence": 0.98
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "purple glowing eyes",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [
            "eyes glowing purple"
          ],
          "supporting_observation_ids": [
            "obs_body_feature_001"
          ],
          "confidence": 0.99
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "upright",
          "action_state": [
            "still"
          ],
          "supporting_observation_ids": [
            "obs_action_state_001",
            "obs_pose_001"
          ],
          "confidence": 0.93
        }
      ],
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
        "fact_environment_dark_forest_001"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_colors_black_001",
        "fact_colors_dark_gray_001",
        "fact_colors_green_001",
        "fact_colors_purple_001",
        "fact_colors_white_001"
      ],
      "observation_ids": [
        "obs_color_001",
        "obs_color_002",
        "obs_color_003",
        "obs_color_004",
        "obs_color_005"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_visual_effect_001"
      ],
      "observation_ids": [
        "obs_visual_effect_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_collector_number_001",
        "fact_card_ui_energy_symbol_001",
        "fact_card_ui_hp_text_001",
        "fact_card_ui_illustrator_text_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_text_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_symbol_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_text_001"
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
        "floating darkrai",
        "dark forest background"
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
      "omission_risk": "low",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "svf_001",
      "category": "environment",
      "label": "dark forest",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "dark forest background"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "svf_002",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [
          "floating"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating darkrai",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "dark forest background",
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
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "dark forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_action_state_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_body_feature_001",
          "obs_visual_effect_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_action_state_001",
          "obs_pose_001",
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

### GV-PK-JPN-M5-099 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.010682`
- Artwork observations: `19`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: white, eye, purple pink eye, tail, dark pink outline, spikes, gray, arms. Semantic facts: floating, dark forest, glowing aura.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | dominant | 0.99 |
| body | body | creature_anatomy | foreground | dominant | 0.95 |
| dark bluish black body | dark blue black | color_and_light | foreground | dominant | 0.95 |
| head | head | creature_anatomy | foreground | dominant | 0.95 |
| head crest or plume | head crest | creature_anatomy | foreground | dominant | 0.92 |
| white head crest or plume | white | color_and_light | foreground | high | 0.9 |
| eye | eye | creature_anatomy | foreground | high | 0.9 |
| purple eye with pink pupil | purple pink eye | color_and_light | foreground | high | 0.9 |
| tail | tail | creature_anatomy | foreground | high | 0.9 |
| dark tail with faint pink outline | dark pink outline | color_and_light | foreground | high | 0.85 |
| shoulder spikes | spikes | creature_anatomy | foreground | high | 0.9 |
| gray shoulder spikes | gray | color_and_light | foreground | high | 0.9 |
| arms with claws | arms | creature_anatomy | foreground | high | 0.9 |
| black claws | black | color_and_light | foreground | high | 0.85 |
| floating pose diagonal orientation | floating diagonal | creature_anatomy | foreground | dominant | 0.95 |
| dark forest background with green shades and glowing elements | dark forest | environment | background | significant | 0.95 |
| green, yellow-green, black, gray, white, purple, pink palette | green yellow black gray white purple pink | color_and_light | multi | dominant | 0.95 |
| strong contrast lighting with glow effects | strong contrast glow | color_and_light | foreground-background | high | 0.95 |
| glowing aura and energy effects around Pokemon | glowing aura energy effects | visual_effects | foreground | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガダークライex | card_name_text | top left | fully_visible | 0.99 |
| HP 280 | hp_text | top right | fully_visible | 0.99 |
| Darkness type symbol | card_ui_symbol | top right | fully_visible | 0.98 |
| Japanese attack and effect text below artwork | card_ui_text | below artwork | fully_visible | 0.95 |
| Illus. 5ban Graphics | illustrator_text | bottom left | fully_visible | 0.95 |
| 099/081 SR | collector_number | bottom left | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_body_001 | creature_anatomy | body region visible | obs_body_region_001 | 0.95 |
| fact_creature_anatomy_body_color_001 | creature_anatomy | body color | obs_body_color_001 | 0.95 |
| fact_creature_anatomy_head_001 | creature_anatomy | body region visible | obs_body_region_002 | 0.95 |
| fact_creature_anatomy_head_crest_001 | creature_anatomy | head crest visible | obs_body_color_002, obs_body_region_003 | 0.92 |
| fact_creature_anatomy_eye_001 | creature_anatomy | eye detail visible | obs_eye_001, obs_eye_color_001 | 0.9 |
| fact_creature_anatomy_tail_001 | creature_anatomy | tail visible | obs_body_region_004, obs_tail_color_001 | 0.9 |
| fact_creature_anatomy_spikes_001 | creature_anatomy | shoulder spikes visible | obs_body_color_003, obs_body_feature_001 | 0.9 |
| fact_creature_anatomy_arms_claws_001 | creature_anatomy | arms with black claws visible | obs_body_region_005, obs_claw_color_001 | 0.9 |
| fact_creature_anatomy_pose_001 | creature_anatomy | pose and orientation | obs_pose_001 | 0.95 |
| fact_environment_001 | environment | environment setting visible | obs_environment_001 | 0.95 |
| fact_color_and_light_001 | color_and_light | visible palette colors | obs_colors_001 | 0.95 |
| fact_color_and_light_002 | color_and_light | lighting | obs_lighting_001 | 0.95 |
| fact_visual_effects_001 | visual_effects | visual effects | obs_visual_design_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text visible | obs_card_name_text_001 | 0.99 |
| fact_card_ui_hp_text_001 | HP text visible | obs_hp_text_001 | 0.99 |
| fact_card_ui_set_symbol_001 | type symbol visible | obs_type_symbol_001 | 0.98 |
| fact_card_ui_text_001 | card attack and effect text visible | obs_text_block_001 | 0.95 |
| fact_card_ui_illustrator_001 | illustrator text visible | obs_illustrator_text_001 | 0.95 |
| fact_card_ui_collector_number_001 | collector number visible | obs_number_text_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_number_001",
    "fact_card_ui_hp_text_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_name_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_hp_text_001"
  ],
  "collector_number_observation_ids": [
    "obs_number_text_001"
  ],
  "set_symbol_observation_ids": [
    "obs_type_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_text_block_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_illustrator_text_001"
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | state | floating | obs_subject_001 | obs_pose_001 | floating diagonal floating | 0.95 |
| sem_fact_002 | environment | dark forest |  | obs_environment_001 | dark forest | 0.95 |
| sem_fact_003 | motif | glowing aura | obs_subject_001 | obs_visual_design_001 | glowing aura | 0.95 |

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
| dark forest background | obs_environment_001 |
| floating pose | obs_pose_001 |
| glowing aura | obs_visual_design_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| dark forest | obs_environment_001 | deterministic_rule | 0.95 |
| diagonal | obs_pose_001 | deterministic_rule | 0.95 |
| diagonal composition | obs_pose_001 | deterministic_rule | 0.95 |
| diagonal orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| floating | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| forest | obs_environment_001 | deterministic_rule | 0.95 |
| glowing aura | obs_visual_design_001 | deterministic_rule | 0.95 |
| glowing highlights | obs_lighting_001, obs_visual_design_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: white, eye, purple pink eye, tail, dark pink outline, spikes, gray, arms. Semantic facts: floating, dark forest, glowing aura.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Darkrai",
      "normalized_label": "mega darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "creature_anatomy",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_color_001",
      "kind": "color_and_light",
      "label": "dark bluish black body",
      "normalized_label": "dark blue black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "creature_anatomy",
      "label": "head crest or plume",
      "normalized_label": "head crest",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_color_002",
      "kind": "color_and_light",
      "label": "white head crest or plume",
      "normalized_label": "white",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "creature_anatomy",
      "label": "eye",
      "normalized_label": "eye",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_color_001",
      "kind": "color_and_light",
      "label": "purple eye with pink pupil",
      "normalized_label": "purple pink eye",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_004",
      "kind": "creature_anatomy",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tail_color_001",
      "kind": "color_and_light",
      "label": "dark tail with faint pink outline",
      "normalized_label": "dark pink outline",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_feature_001",
      "kind": "creature_anatomy",
      "label": "shoulder spikes",
      "normalized_label": "spikes",
      "scene_layer": "foreground",
      "frame_position": "center right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_color_003",
      "kind": "color_and_light",
      "label": "gray shoulder spikes",
      "normalized_label": "gray",
      "scene_layer": "foreground",
      "frame_position": "center right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_005",
      "kind": "creature_anatomy",
      "label": "arms with claws",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_claw_color_001",
      "kind": "color_and_light",
      "label": "black claws",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "floating pose diagonal orientation",
      "normalized_label": "floating diagonal",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark forest background with green shades and glowing elements",
      "normalized_label": "dark forest",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "significant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_colors_001",
      "kind": "color_and_light",
      "label": "green, yellow-green, black, gray, white, purple, pink palette",
      "normalized_label": "green yellow black gray white purple pink",
      "scene_layer": "multi",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "color_and_light",
      "label": "strong contrast lighting with glow effects",
      "normalized_label": "strong contrast glow",
      "scene_layer": "foreground-background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "visual_effects",
      "label": "glowing aura and energy effects around Pokemon",
      "normalized_label": "glowing aura energy effects",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_text_001",
      "kind": "card_name_text",
      "label": "メガダークライex",
      "normalized_label": "mega darkrai ex",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hp_text_001",
      "kind": "hp_text",
      "label": "HP 280",
      "normalized_label": "hp 280",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_type_symbol_001",
      "kind": "card_ui_symbol",
      "label": "Darkness type symbol",
      "normalized_label": "darkness symbol",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_block_001",
      "kind": "card_ui_text",
      "label": "Japanese attack and effect text below artwork",
      "normalized_label": "attack and effect text",
      "scene_layer": "card_ui",
      "frame_position": "below artwork",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. 5ban Graphics",
      "normalized_label": "5ban graphics illustrator",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_number_text_001",
      "kind": "collector_number",
      "label": "099/081 SR",
      "normalized_label": "099/081 sr",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "scene subject identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_body_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[0].region",
      "claim": "body region visible",
      "value": "body",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_body_color_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[0].color",
      "claim": "body color",
      "value": "dark bluish black",
      "supporting_observation_ids": [
        "obs_body_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_head_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[1].region",
      "claim": "body region visible",
      "value": "head",
      "supporting_observation_ids": [
        "obs_body_region_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_head_crest_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[2].feature",
      "claim": "head crest visible",
      "value": "white head crest or plume",
      "supporting_observation_ids": [
        "obs_body_color_002",
        "obs_body_region_003"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_eye_001",
      "module": "creature_anatomy",
      "field_path": "physical_features[0].feature",
      "claim": "eye detail visible",
      "value": "purple eye with pink pupil",
      "supporting_observation_ids": [
        "obs_eye_001",
        "obs_eye_color_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_tail_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[3].region",
      "claim": "tail visible",
      "value": "dark tail with faint pink outline",
      "supporting_observation_ids": [
        "obs_body_region_004",
        "obs_tail_color_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_spikes_001",
      "module": "creature_anatomy",
      "field_path": "physical_features[1].feature",
      "claim": "shoulder spikes visible",
      "value": "gray shoulder spikes",
      "supporting_observation_ids": [
        "obs_body_color_003",
        "obs_body_feature_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_arms_claws_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[4].region",
      "claim": "arms with black claws visible",
      "value": "arms with claws",
      "supporting_observation_ids": [
        "obs_body_region_005",
        "obs_claw_color_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "pose and orientation",
      "value": "floating diagonal orientation",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "environment setting visible",
      "value": "dark forest",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "visible palette colors",
      "value": "green, yellow-green, black, gray, white, purple, pink",
      "supporting_observation_ids": [
        "obs_colors_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_002",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "lighting",
      "value": "strong contrast lighting with glow effects",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effects_001",
      "module": "visual_effects",
      "field_path": "effects",
      "claim": "visual effects",
      "value": "glowing aura and energy effects",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "メガダークライex",
      "supporting_observation_ids": [
        "obs_card_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text visible",
      "value": "280",
      "supporting_observation_ids": [
        "obs_hp_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "type symbol visible",
      "value": "Darkness type symbol",
      "supporting_observation_ids": [
        "obs_type_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "card attack and effect text visible",
      "value": "Japanese attack and effect text below artwork",
      "supporting_observation_ids": [
        "obs_text_block_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "099/081 SR",
      "supporting_observation_ids": [
        "obs_number_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms with claws",
        "body",
        "eye",
        "head",
        "head crest",
        "shoulder spikes",
        "tail"
      ],
      "physical_features": [
        "black claws",
        "shoulder spikes"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "diagonal",
      "action_state": [],
      "facial_evidence": {
        "eyes": "purple with pink pupil",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "right center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "dark bluish black",
        "gray",
        "pink",
        "purple",
        "white"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_body_feature_001",
      "obs_body_region_001",
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_body_region_004",
      "obs_body_region_005",
      "obs_eye_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "dark forest"
    ],
    "indoor_outdoor": "outdoor",
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
      "gray",
      "green",
      "pink",
      "purple",
      "white",
      "yellow-green"
    ],
    "lighting": [
      "glow effects",
      "strong contrast lighting"
    ],
    "shadows": [],
    "highlights": [
      "glowing aura"
    ],
    "composition": [],
    "camera_angle": "slanted diagonal",
    "framing": "full frame",
    "cropping": [],
    "depth": "shallow depth",
    "motion_cues": [
      "floating"
    ],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_colors_001",
      "obs_lighting_001",
      "obs_visual_design_001"
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
        "fact_creature_anatomy_arms_claws_001",
        "fact_creature_anatomy_body_001",
        "fact_creature_anatomy_body_color_001",
        "fact_creature_anatomy_eye_001",
        "fact_creature_anatomy_head_001",
        "fact_creature_anatomy_head_crest_001",
        "fact_creature_anatomy_pose_001",
        "fact_creature_anatomy_spikes_001",
        "fact_creature_anatomy_tail_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [
            "dark bluish black"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_color_001",
            "obs_body_region_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head crest",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [
            "white"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_color_002",
            "obs_body_region_003"
          ],
          "confidence": 0.92
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [
            "dark with faint pink outline"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_004",
            "obs_tail_color_001"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "claws",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_005",
            "obs_claw_color_001"
          ],
          "confidence": 0.9
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "shoulders",
          "feature": "spikes",
          "visibility": "fully_visible",
          "colors": [
            "gray"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_color_003",
            "obs_body_feature_001"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eyes",
          "feature": "eye shape and color",
          "visibility": "fully_visible",
          "colors": [
            "pink pupil",
            "purple"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_eye_001",
            "obs_eye_color_001"
          ],
          "confidence": 0.9
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal",
            "floating"
          ],
          "orientation": "diagonal",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.95
        }
      ],
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
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_and_light_001",
        "fact_color_and_light_002"
      ],
      "observation_ids": [
        "obs_colors_001",
        "obs_lighting_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_visual_effects_001"
      ],
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_collector_number_001",
        "fact_card_ui_hp_text_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_name_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_hp_text_001"
      ],
      "collector_number_observation_ids": [
        "obs_number_text_001"
      ],
      "set_symbol_observation_ids": [
        "obs_type_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_text_block_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_illustrator_text_001"
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
        "dark forest background",
        "floating pose",
        "glowing aura"
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
      "omission_risk": "low",
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
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "floating"
        ],
        "body_position": [
          "diagonal"
        ],
        "motion_state": [
          "floating"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "environment",
      "label": "dark forest",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "dark forest"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_003",
      "category": "motif",
      "label": "glowing aura",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [
          "glowing aura"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark forest background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "glowing aura",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "dark forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "glowing aura",
        "source_observation_ids": [
          "obs_visual_design_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_lighting_001",
          "obs_visual_design_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0086144`
- Artwork observations: `10`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: female human trainer. Visible observations: female human trainer, orange spiked ponytail hair, smiling face, blue sleeveless swimsuit, black wristband, white red sneakers, standing pose with raised clenched fists, indoor swimming pool environment. Semantic facts: smiling, indoor swimming pool.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer | female human trainer | scene_subject | foreground | high | 0.99 |
| orange hair with spiked and ponytail style | orange spiked ponytail hair | hair | foreground | high | 0.98 |
| visible face with open mouth smiling, open eyes, arched eyebrows | smiling face | face | foreground | high | 0.98 |
| blue sleeveless swimsuit body garment | blue sleeveless swimsuit | clothing | foreground | high | 0.99 |
| black wristband on left wrist | black wristband | accessory | foreground | medium | 0.95 |
| white and red sneakers with black soles | white red sneakers | footwear | foreground | medium | 0.96 |
| standing with left arm bent and fist clenched in front, right arm bent back with fist clenched | standing pose with raised clenched fists | pose | foreground | high | 0.97 |
| indoor swimming pool with water and poolside bench | indoor swimming pool environment | environment | background | high | 0.98 |
| pool water with light reflections and sparkles | pool water sparkles | environment | background | medium | 0.95 |
| blue poolside bench | poolside bench | object | background | medium | 0.93 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese at top left | card_ui_text | top left | visible | 0.99 |
| Supporter category text in Japanese at top left corner | card_ui_text | top left | visible | 0.98 |
| Trainer category text in Japanese at top right | card_ui_text | top right | visible | 0.98 |
| small copyright text at bottom center | copyright_text | bottom center | visible | 0.95 |
| card set and number text at bottom left | card_ui_text | bottom left | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject presence | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair color and style | obs_hair_001 | 0.98 |
| fact_003 | human_appearance | facial expression | obs_face_001 | 0.98 |
| fact_004 | human_appearance | pose | obs_pose_001 | 0.97 |
| fact_005 | clothing | garment type and color | obs_clothing_001 | 0.99 |
| fact_006 | clothing | left wrist accessory | obs_clothing_002 | 0.95 |
| fact_007 | clothing | footwear description | obs_clothing_003 | 0.96 |
| fact_008 | environment | setting | obs_environment_001, obs_environment_002, obs_objects_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_009 | card name text | obs_card_ui_001 | 0.99 |
| fact_010 | category text | obs_card_ui_002, obs_card_ui_003 | 0.98 |
| fact_011 | copyright text present | obs_card_ui_004 | 0.95 |
| fact_012 | set and number text | obs_card_ui_005 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_009",
    "fact_010",
    "fact_011",
    "fact_012"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_005"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_004"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_002",
    "obs_card_ui_003"
  ]
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | complete | none | high |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | expression | smiling | obs_subject_001 | obs_face_001 | open smiling open arched raised clenched fists standing static | 0.98 |
| sem_002 | scene_type | indoor swimming pool |  | obs_environment_001, obs_environment_002 | indoor pool tiles pool water bench | 0.98 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| standing in front of | obs_subject_001 | obs_environment_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| indoor swimming pool | obs_environment_001, obs_environment_002 |
| female trainer | obs_subject_001 |
| blue swimsuit | obs_clothing_001 |
| orange ponytail hair | obs_hair_001 |
| black wristband | obs_clothing_002 |
| white red sneakers | obs_clothing_003 |
| smiling female trainer | obs_face_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| arms bent | obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| indoor swimming pool | obs_environment_001, obs_environment_002 | deterministic_rule | 0.98 |
| left fist clenched | obs_subject_001 | deterministic_rule | 0.99 |
| right fist clenched | obs_subject_001 | deterministic_rule | 0.99 |
| sleeveless clothing | obs_clothing_001 | deterministic_rule | 0.99 |
| smiling | obs_face_001 | deterministic_rule | 0.98 |
| standing | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Visible observations: female human trainer, orange spiked ponytail hair, smiling face, blue sleeveless swimsuit, black wristband, white red sneakers, standing pose with raised clenched fists, indoor swimming pool environment. Semantic facts: smiling, indoor swimming pool.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_fact_reference_missing`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human trainer",
      "normalized_label": "female human trainer",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "hair",
      "label": "orange hair with spiked and ponytail style",
      "normalized_label": "orange spiked ponytail hair",
      "scene_layer": "foreground",
      "frame_position": "upper-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "face",
      "label": "visible face with open mouth smiling, open eyes, arched eyebrows",
      "normalized_label": "smiling face",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue sleeveless swimsuit body garment",
      "normalized_label": "blue sleeveless swimsuit",
      "scene_layer": "foreground",
      "frame_position": "center-lower",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "accessory",
      "label": "black wristband on left wrist",
      "normalized_label": "black wristband",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "footwear",
      "label": "white and red sneakers with black soles",
      "normalized_label": "white red sneakers",
      "scene_layer": "foreground",
      "frame_position": "lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "standing with left arm bent and fist clenched in front, right arm bent back with fist clenched",
      "normalized_label": "standing pose with raised clenched fists",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool with water and poolside bench",
      "normalized_label": "indoor swimming pool environment",
      "scene_layer": "background",
      "frame_position": "full background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "pool water with light reflections and sparkles",
      "normalized_label": "pool water sparkles",
      "scene_layer": "background",
      "frame_position": "background lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "object",
      "label": "blue poolside bench",
      "normalized_label": "poolside bench",
      "scene_layer": "background",
      "frame_position": "background center-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese at top left",
      "normalized_label": "card name text Japanese",
      "scene_layer": "ui_layer",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "Supporter category text in Japanese at top left corner",
      "normalized_label": "supporter category text",
      "scene_layer": "ui_layer",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "Trainer category text in Japanese at top right",
      "normalized_label": "trainer category text Japanese",
      "scene_layer": "ui_layer",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "copyright_text",
      "label": "small copyright text at bottom center",
      "normalized_label": "copyright line",
      "scene_layer": "ui_layer",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "card set and number text at bottom left",
      "normalized_label": "card set and number text",
      "scene_layer": "ui_layer",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "0",
      "claim": "scene subject presence",
      "value": "female human trainer present",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair",
      "claim": "hair color and style",
      "value": "orange spiked ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "face",
      "claim": "facial expression",
      "value": "smiling, open eyes, arched eyebrows",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "pose",
      "claim": "pose",
      "value": "standing with raised clenched fists",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments",
      "claim": "garment type and color",
      "value": "blue sleeveless swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "accessories",
      "claim": "left wrist accessory",
      "value": "black wristband",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "clothing",
      "field_path": "footwear",
      "claim": "footwear description",
      "value": "white and red sneakers with black soles",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_objects_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "カスミの元気",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "card_type_text",
      "claim": "category text",
      "value": "Supporter, Trainer (Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_002",
        "obs_card_ui_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text present",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "set_and_number_text",
      "claim": "set and number text",
      "value": "J M5 108/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human trainer",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "feet",
        "hands",
        "legs",
        "neck",
        "shoulders"
      ],
      "physical_features": [
        "orange spiked ponytail hair"
      ],
      "pose": [
        "arms bent",
        "left fist clenched",
        "right fist clenched",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [
        "smiling"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "open smiling",
        "eyebrows": "arched",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband left wrist",
        "blue sleeveless swimsuit",
        "white red sneakers"
      ],
      "colors": [
        "black",
        "blue",
        "orange",
        "red",
        "white"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_face_001",
      "obs_hair_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_objects_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "pool floor tiles"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "pool structure",
      "poolside bench"
    ],
    "water": [
      "swimming pool water"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_objects_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "blue poolside bench",
      "normalized_label": "poolside bench",
      "object_type": "furniture",
      "colors": [
        "blue"
      ],
      "material_appearance": [
        "plastic-like appearance or metal-like appearance"
      ],
      "location": "background center-right",
      "count_reference": "count_001",
      "confidence": 0.93
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_subject_001",
      "target_observation_id": "obs_environment_001",
      "relationship": "standing in front of",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "blue tones",
      "bright colors",
      "orange hair"
    ],
    "lighting": [
      "even indoor light"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "hair shine highlights",
      "water sparkle highlights"
    ],
    "composition": [
      "centered subject",
      "foreground focus"
    ],
    "camera_angle": "eye-level",
    "framing": "medium full body",
    "cropping": [
      "full subject"
    ],
    "depth": "shallow depth",
    "motion_cues": [
      "static pose"
    ],
    "motifs": [
      "sports, swimming"
    ],
    "repeated_shapes": [
      "pool tiles pattern"
    ],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
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
    "relationships_review": "observed",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
  },
  "modules": {
    "subjects": {
      "fact_ids": [
        "fact_001"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_002",
        "fact_003",
        "fact_004"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "arched eyebrows",
            "open eyes",
            "smiling mouth"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "open",
          "mouth": "open smiling",
          "eyebrows": "arched",
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
          "label": "orange spiked ponytail hair",
          "details": [
            "bright orange color",
            "spiky bangs",
            "tied ponytail"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "standing with raised bent arms and clenched fists",
          "details": [
            "clenched fists",
            "left arm bent forward",
            "right arm bent back"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.97
        }
      ],
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
      "fact_ids": [
        "fact_005",
        "fact_006",
        "fact_007"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue sleeveless swimsuit",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on left wrist",
          "details": [
            "black color",
            "simple band"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": [
        "obs_objects_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_008"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_objects_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002",
        "obs_hair_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_005"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_004"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_002",
        "obs_card_ui_003"
      ]
    },
    "counts": {
      "fact_ids": [],
      "count_ids": []
    },
    "relationships": {
      "fact_ids": [
        "rel_001"
      ],
      "relationship_ids": [
        "rel_001"
      ]
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
        "indoor swimming pool",
        "female trainer",
        "blue swimsuit",
        "orange ponytail hair",
        "black wristband",
        "white red sneakers",
        "smiling female trainer"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_001",
      "category": "expression",
      "label": "smiling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "evidence": {
        "mouth": [
          "open smiling"
        ],
        "eyes": [
          "open"
        ],
        "eyebrows": [
          "arched"
        ],
        "facial_features": [],
        "body_language": [
          "raised clenched fists"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [
          "static"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_002",
      "category": "scene_type",
      "label": "indoor swimming pool",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "indoor",
          "pool tiles",
          "pool water"
        ],
        "objects": [
          "bench"
        ],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    {
      "term": "female trainer",
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
      "term": "orange ponytail hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "black wristband",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "white red sneakers",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ]
    },
    {
      "term": "smiling female trainer",
      "supporting_observation_ids": [
        "obs_face_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "arms bent",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "indoor swimming pool",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "left fist clenched",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right fist clenched",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sleeveless clothing",
        "source_observation_ids": [
          "obs_clothing_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "smiling",
        "source_observation_ids": [
          "obs_face_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_pose_001",
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

### GV-PK-JPN-M5-117 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.96`
- Attribute confidence: `0.95`
- Cost USD: `0.0086888`
- Artwork observations: `10`
- Card UI / print-marker observations: `4`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: female human trainer. Visible observations: female human trainer, face, hair, eyes, mouth, blue dress with wide cuffs, orange collar, extended right arm open palm. Semantic facts: right arm extended with open palm, abstract colorful background with stars and sparkles.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer | female human trainer | scene_subject | foreground | high | 0.99 |
| face of female human trainer | face | human_face | foreground | high | 0.98 |
| dark purple hair with curls | hair | human_hair | foreground | high | 0.98 |
| purple eyes | eyes | human_eyes | foreground | high | 0.98 |
| neutral mouth expression | mouth | human_mouth | foreground | medium | 0.9 |
| long sleeve blue dress with wide cuffs | blue dress with wide cuffs | clothing | foreground | high | 0.97 |
| orange collar | orange collar | clothing | foreground | medium | 0.95 |
| extended right arm with open palm | extended right arm open palm | pose | foreground | high | 0.96 |
| abstract colorful background with stars and sparkles | abstract colorful background | environment | background | medium | 0.9 |
| horned helmet or headpiece floating behind head | horned helmet/headpiece | object | foreground | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text | card_ui_text | top-left | visible | 0.99 |
| supporter label text | card_ui_text | top-left | visible | 0.99 |
| trainer label text | card_ui_text | top-right | visible | 0.99 |
| rule text area at bottom center | card_ui_text | bottom-left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject kind | obs_subject_001 | 0.99 |
| fact_human_appearance_001 | human_appearance | hair color | obs_human_appearance_hair_001 | 0.98 |
| fact_human_appearance_002 | human_appearance | eye color | obs_human_appearance_eyes_001 | 0.98 |
| fact_human_appearance_003 | human_appearance | mouth expression | obs_human_appearance_mouth_001 | 0.9 |
| fact_clothing_001 | clothing | garment type and color | obs_clothing_garment_001 | 0.97 |
| fact_clothing_002 | clothing | garment detail | obs_clothing_garment_002 | 0.95 |
| fact_human_appearance_004 | human_appearance | gesture | obs_pose_001 | 0.96 |
| fact_objects_and_props_001 | objects_and_props | object | obs_objects_001 | 0.9 |
| fact_environment_001 | environment | background | obs_background_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | visible card name text | obs_card_ui_text_name_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | visible supporter label | obs_card_ui_text_supporter_001 | 0.99 |
| fact_card_ui_and_print_markers_003 | visible trainer label | obs_card_ui_text_trainer_001 | 0.99 |
| fact_card_ui_and_print_markers_004 | visible rule text | obs_card_ui_text_description_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_001",
    "fact_card_ui_and_print_markers_002",
    "fact_card_ui_and_print_markers_003",
    "fact_card_ui_and_print_markers_004"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_description_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_text_supporter_001",
    "obs_card_ui_text_trainer_001"
  ]
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_003 | action | right arm extended with open palm | obs_subject_001 | obs_pose_001 | right arm extended with open palm | 0.96 |
| semfact_004 | environment | abstract colorful background with stars and sparkles |  | obs_background_001 | abstract colorful background sparkles stars | 0.9 |

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
| purple hair | obs_human_appearance_hair_001 |
| blue dress | obs_clothing_garment_001 |
| horned helmet | obs_objects_001 |
| sparkles background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| abstract colorful background with stars and sparkles | obs_background_001 | deterministic_rule | 0.9 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| reaching | obs_subject_001 | deterministic_rule | 0.99 |
| right arm extended with open palm | obs_pose_001 | deterministic_rule | 0.96 |
| right orientation | obs_pose_001 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Visible observations: female human trainer, face, hair, eyes, mouth, blue dress with wide cuffs, orange collar, extended right arm open palm. Semantic facts: right arm extended with open palm, abstract colorful background with stars and sparkles.
- Quality flags: `potential_overconfident_ambiguous_setting`, `potential_speculative_setting_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human trainer",
      "normalized_label": "female human trainer",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_face_001",
      "kind": "human_face",
      "label": "face of female human trainer",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_hair_001",
      "kind": "human_hair",
      "label": "dark purple hair with curls",
      "normalized_label": "hair",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_eyes_001",
      "kind": "human_eyes",
      "label": "purple eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_mouth_001",
      "kind": "human_mouth",
      "label": "neutral mouth expression",
      "normalized_label": "mouth",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_garment_001",
      "kind": "clothing",
      "label": "long sleeve blue dress with wide cuffs",
      "normalized_label": "blue dress with wide cuffs",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_garment_002",
      "kind": "clothing",
      "label": "orange collar",
      "normalized_label": "orange collar",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "extended right arm with open palm",
      "normalized_label": "extended right arm open palm",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "abstract colorful background with stars and sparkles",
      "normalized_label": "abstract colorful background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "object",
      "label": "horned helmet or headpiece floating behind head",
      "normalized_label": "horned helmet/headpiece",
      "scene_layer": "foreground",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_name_001",
      "kind": "card_ui_text",
      "label": "card name text",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_supporter_001",
      "kind": "card_ui_text",
      "label": "supporter label text",
      "normalized_label": "supporter label text",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_trainer_001",
      "kind": "card_ui_text",
      "label": "trainer label text",
      "normalized_label": "trainer label text",
      "scene_layer": "ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_description_001",
      "kind": "card_ui_text",
      "label": "rule text area at bottom center",
      "normalized_label": "rule text",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0]",
      "claim": "subject kind",
      "value": "scene subject",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_appearance_001",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "hair color",
      "value": "dark purple",
      "supporting_observation_ids": [
        "obs_human_appearance_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_appearance_002",
      "module": "human_appearance",
      "field_path": "eyes[0]",
      "claim": "eye color",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_human_appearance_eyes_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_appearance_003",
      "module": "human_appearance",
      "field_path": "mouth[0]",
      "claim": "mouth expression",
      "value": "neutral",
      "supporting_observation_ids": [
        "obs_human_appearance_mouth_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment type and color",
      "value": "blue long sleeve dress with wide cuffs",
      "supporting_observation_ids": [
        "obs_clothing_garment_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "garment detail",
      "value": "orange collar",
      "supporting_observation_ids": [
        "obs_clothing_garment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_appearance_004",
      "module": "human_appearance",
      "field_path": "pose[0]",
      "claim": "gesture",
      "value": "right arm extended with open palm",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_and_props_001",
      "module": "objects_and_props",
      "field_path": "objects[0]",
      "claim": "object",
      "value": "horned helmet or headpiece floating behind head",
      "supporting_observation_ids": [
        "obs_objects_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background",
      "value": "abstract colorful with stars and sparkles",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "visible card name text",
      "value": "ムク",
      "supporting_observation_ids": [
        "obs_card_ui_text_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "supporter_text",
      "claim": "visible supporter label",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_text_supporter_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "trainer_text",
      "claim": "visible trainer label",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_trainer_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "rule_text",
      "claim": "visible rule text",
      "value": "visible Japanese text",
      "supporting_observation_ids": [
        "obs_card_ui_text_description_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human trainer",
      "identity_confidence": 0.99,
      "anatomy": [
        "eyes",
        "face",
        "hair",
        "hand",
        "mouth",
        "right arm"
      ],
      "physical_features": [
        "dark purple hair",
        "neutral mouth expression",
        "purple eyes"
      ],
      "pose": [
        "reaching"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible, purple",
        "mouth": "neutral",
        "eyebrows": "not distinctly visible",
        "face_position": "center-left",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "blue long sleeve dress",
        "orange collar"
      ],
      "colors": [
        "blue",
        "dark purple",
        "orange"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_clothing_garment_001",
      "obs_clothing_garment_002",
      "obs_human_appearance_eyes_001",
      "obs_human_appearance_face_001",
      "obs_human_appearance_hair_001",
      "obs_human_appearance_mouth_001",
      "obs_objects_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract"
    ],
    "indoor_outdoor": "uncertain",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "horned helmet or headpiece floating behind head",
      "normalized_label": "horned helmet/headpiece",
      "object_type": "accessory",
      "colors": [
        "beige",
        "browns"
      ],
      "material_appearance": [
        "smooth"
      ],
      "location": "floating behind head",
      "count_reference": "",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "beige",
      "blue",
      "brown",
      "orange",
      "purple"
    ],
    "lighting": [
      "soft light on face"
    ],
    "shadows": [
      "slight shadow on neck"
    ],
    "highlights": [
      "hair highlights"
    ],
    "composition": [
      "headpiece centered",
      "subject on left"
    ],
    "camera_angle": "frontal",
    "framing": "medium close-up",
    "cropping": [
      "visible full upper torso and head"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "star sparkles"
    ],
    "repeated_shapes": [
      "spiral horn shapes on headpiece"
    ],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_objects_001",
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
        "fact_human_appearance_001",
        "fact_human_appearance_002",
        "fact_human_appearance_003",
        "fact_human_appearance_004"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "dark purple hair",
            "neutral mouth",
            "purple eyes"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_eyes_001",
            "obs_human_appearance_face_001",
            "obs_human_appearance_hair_001",
            "obs_human_appearance_mouth_001"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "center-left",
          "eyes": "visible, purple",
          "mouth": "neutral",
          "eyebrows": "not distinctly visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_human_appearance_eyes_001",
            "obs_human_appearance_mouth_001"
          ],
          "confidence": 0.9
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "dark purple hair",
          "details": [
            "curled ends"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right arm extended with open palm",
          "details": [
            "arm and hand visible"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.96
        }
      ],
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
      "fact_ids": [
        "fact_clothing_001",
        "fact_clothing_002"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "arms and torso",
          "garment": "blue long sleeve dress with wide cuffs",
          "neckline_type": "not fully visible",
          "sleeve_type": "long with wide cuffs",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "wide cuffs"
          ],
          "supporting_observation_ids": [
            "obs_clothing_garment_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "neck",
          "garment": "orange collar",
          "neckline_type": "collar",
          "sleeve_type": "not applicable",
          "colors": [
            "orange"
          ],
          "visible_details": [
            "orange collar"
          ],
          "supporting_observation_ids": [
            "obs_clothing_garment_002"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_objects_and_props_001"
      ],
      "object_observation_ids": [
        "obs_objects_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": []
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
        "fact_card_ui_and_print_markers_004"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_description_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_text_supporter_001",
        "obs_card_ui_text_trainer_001"
      ]
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
        "purple hair",
        "blue dress",
        "horned helmet",
        "sparkles background"
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
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "environment",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_003",
      "category": "action",
      "label": "right arm extended with open palm",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "right arm extended with open palm"
        ],
        "body_position": [],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.96,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_004",
      "category": "environment",
      "label": "abstract colorful background with stars and sparkles",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "abstract colorful background",
          "sparkles",
          "stars"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "purple hair",
      "supporting_observation_ids": [
        "obs_human_appearance_hair_001"
      ]
    },
    {
      "term": "blue dress",
      "supporting_observation_ids": [
        "obs_clothing_garment_001"
      ]
    },
    {
      "term": "horned helmet",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    },
    {
      "term": "sparkles background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "abstract colorful background with stars and sparkles",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right arm extended with open palm",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.93`
- Cost USD: `0.0077884`
- Artwork observations: `7`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: sky, lightning, lightning, tree, tree, mountains, ground. Semantic facts: lightning, aurora, mountains, trees. Counts: trees: 2.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| sky with multicolored aurora-like light bands | sky | sky | background | high | 0.99 |
| bright white lightning bolts | lightning | lightning | background | high | 0.99 |
| bright pinkish-red lightning bolts | lightning | lightning | background | high | 0.98 |
| leafless dark trees with complex branches | tree | tree | midground | medium | 0.95 |
| bare dark tree silhouettes | tree | tree | midground | medium | 0.93 |
| mountains with rocky textures | mountains | terrain | background | high | 0.95 |
| dark ground terrain | ground | terrain | foreground | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_environment_001 | environment | sky contains multicolored aurora-like light bands | obs_sky_001 | 0.99 |
| fact_environment_002 | environment | presence of lightning bolts | obs_lightning_001, obs_lightning_002 | 0.99 |
| fact_environment_003 | environment | presence of bare leafless trees | obs_trees_001, obs_trees_002 | 0.95 |
| fact_environment_004 | environment | mountains and dark ground terrain visible | obs_terrain_001, obs_terrain_002 | 0.95 |

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
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | none_visible | none | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | complete | low | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | environment | lightning |  | obs_lightning_001, obs_lightning_002 | lightning | 0.99 |
| semfact_002 | environment | aurora |  | obs_sky_001 | multicolored aurora-like light bands | 0.99 |
| semfact_003 | environment | mountains |  | obs_terrain_001 | mountains | 0.95 |
| semfact_004 | environment | trees |  | obs_trees_001, obs_trees_002 | bare leafless trees | 0.95 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| trees | exact | 2 | obs_trees_001, obs_trees_002 | 0.95 |

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
| sky | obs_sky_001 |
| lightning | obs_lightning_001 |
| tree | obs_trees_001 |
| mountains | obs_terrain_001 |
| ground | obs_terrain_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora | obs_sky_001 | deterministic_rule | 0.99 |
| aurora-like light bands | obs_lightning_001, obs_lightning_002 | deterministic_rule | 0.92 |
| lightning | obs_lightning_001, obs_lightning_002 | deterministic_rule | 0.99 |
| mountains | obs_terrain_001 | deterministic_rule | 0.95 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| terrain | obs_terrain_001, obs_terrain_002 | deterministic_rule | 0.95 |
| tree | obs_trees_001, obs_trees_002 | deterministic_rule | 0.95 |
| trees | obs_trees_001, obs_trees_002 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: sky, lightning, lightning, tree, tree, mountains, ground. Semantic facts: lightning, aurora, mountains, trees. Counts: trees: 2.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "sky with multicolored aurora-like light bands",
      "normalized_label": "sky",
      "scene_layer": "background",
      "frame_position": "full_frame",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_001",
      "kind": "lightning",
      "label": "bright white lightning bolts",
      "normalized_label": "lightning",
      "scene_layer": "background",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_002",
      "kind": "lightning",
      "label": "bright pinkish-red lightning bolts",
      "normalized_label": "lightning",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "tree",
      "label": "leafless dark trees with complex branches",
      "normalized_label": "tree",
      "scene_layer": "midground",
      "frame_position": "right_foreground",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_002",
      "kind": "tree",
      "label": "bare dark tree silhouettes",
      "normalized_label": "tree",
      "scene_layer": "midground",
      "frame_position": "left_midground",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_001",
      "kind": "terrain",
      "label": "mountains with rocky textures",
      "normalized_label": "mountains",
      "scene_layer": "background",
      "frame_position": "middle_lower",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_002",
      "kind": "terrain",
      "label": "dark ground terrain",
      "normalized_label": "ground",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky contains multicolored aurora-like light bands",
      "value": "multicolored aurora-like light bands",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "weather",
      "claim": "presence of lightning bolts",
      "value": "lightning bolts",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "presence of bare leafless trees",
      "value": "bare leafless trees",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_004",
      "module": "environment",
      "field_path": "terrain",
      "claim": "mountains and dark ground terrain visible",
      "value": "mountains and ground terrain",
      "supporting_observation_ids": [
        "obs_terrain_001",
        "obs_terrain_002"
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
      "exact_count": 2,
      "estimated_min": 2,
      "estimated_max": 2,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "scene_layer": "midground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_terrain_002"
    ],
    "midground": [
      "obs_trees_001",
      "obs_trees_002"
    ],
    "background": [
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_sky_001",
      "obs_terrain_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "outdoor",
    "sky": [
      "multicolored aurora-like light bands"
    ],
    "ground": [
      "dark ground terrain"
    ],
    "terrain": [
      "mountains"
    ],
    "plants": [
      "bare leafless trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [
      "lightning"
    ],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_sky_001",
      "obs_terrain_001",
      "obs_terrain_002",
      "obs_trees_001",
      "obs_trees_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark blues",
      "green",
      "pinkish-red",
      "white"
    ],
    "lighting": [
      "dark with bright lightning highlights"
    ],
    "shadows": [
      "dark shadows"
    ],
    "highlights": [
      "bright lightning and aurora highlights"
    ],
    "composition": [
      "background sky and lightning",
      "foreground terrain",
      "landscape orientation",
      "midground trees"
    ],
    "camera_angle": "eye-level",
    "framing": "centered on lightning and aurora",
    "cropping": [
      "full card visible"
    ],
    "depth": "deep landscape depth",
    "motion_cues": [],
    "motifs": [
      "aurora lights",
      "stormy environment"
    ],
    "repeated_shapes": [
      "lightning bolts"
    ],
    "style_cues": [
      "realistic with aurora"
    ],
    "supporting_observation_ids": [
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_sky_001",
      "obs_terrain_001",
      "obs_terrain_002",
      "obs_trees_001",
      "obs_trees_002"
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
    "objects_and_props_review": "none_visible",
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
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001",
        "fact_environment_002",
        "fact_environment_003",
        "fact_environment_004"
      ],
      "observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_sky_001",
        "obs_terrain_001",
        "obs_terrain_002",
        "obs_trees_001",
        "obs_trees_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_sky_001",
        "obs_terrain_001",
        "obs_terrain_002",
        "obs_trees_001",
        "obs_trees_002"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_sky_001",
        "obs_terrain_001",
        "obs_terrain_002",
        "obs_trees_001",
        "obs_trees_002"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ]
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
        "sky",
        "lightning",
        "tree",
        "mountains",
        "ground"
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
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "counts",
      "review_status": "complete",
      "omission_risk": "low",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_001",
      "category": "environment",
      "label": "lightning",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "lightning"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_002",
      "category": "environment",
      "label": "aurora",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "multicolored aurora-like light bands"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_003",
      "category": "environment",
      "label": "mountains",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "mountains"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_004",
      "category": "environment",
      "label": "trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "bare leafless trees"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "lightning",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ]
    },
    {
      "term": "tree",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "mountains",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ]
    },
    {
      "term": "ground",
      "supporting_observation_ids": [
        "obs_terrain_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_lightning_001",
          "obs_lightning_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_lightning_001",
          "obs_lightning_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "mountains",
        "source_observation_ids": [
          "obs_terrain_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_terrain_001",
          "obs_terrain_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001",
          "obs_trees_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "trees",
        "source_observation_ids": [
          "obs_trees_001",
          "obs_trees_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-PMCG6-085 - Cinnabar City Gym

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.94`
- Cost USD: `0.00795`
- Artwork observations: `14`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: floor, lava, platform, triangular platform, red black pattern, lava, lava waterfall, wood walls.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| floor | floor | environment_feature | background | medium | 0.95 |
| lava floor | lava | environment_feature | background | high | 0.98 |
| platform | platform | object | midground | high | 0.99 |
| triangular platform | triangular platform | object | midground | high | 0.95 |
| red and black pattern on platform | red black pattern | object_detail | midground | high | 0.98 |
| molten lava | lava | environment_feature | background | high | 0.97 |
| lava waterfall | lava waterfall | environment_feature | background | medium | 0.95 |
| wooden walls | wood walls | environment_feature | background | medium | 0.93 |
| fire | fire | environment_feature | background | medium | 0.94 |
| metal pipes | pipes | object | midground | medium | 0.92 |
| metal pipe | pipe | object | midground | medium | 0.92 |
| centered composition | centered composition | composition | whole | high | 0.9 |
| warm color palette | warm colors | color_and_light | whole | high | 0.97 |
| red, orange, black colors | red orange black | color_and_light | whole | high | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | floor is lava | obs_environment_floor_002, obs_environment_lava_001 | 0.98 |
| fact_env_002 | environment | scene contains wooden walls | obs_environment_wood_walls_001 | 0.93 |
| fact_env_003 | environment | metal pipes present near floor | obs_objects_and_props_pipes_001, obs_objects_and_props_pipes_002 | 0.92 |
| fact_objects_001 | objects_and_props | triangular platform with red and black pattern present | obs_objects_and_props_platform_001, obs_objects_and_props_platform_002, obs_objects_and_props_platform_pattern_001 | 0.98 |
| fact_env_004 | environment | lava waterfall visible | obs_environment_lava_fall_001 | 0.95 |
| fact_composition_001 | composition | centered composition with platform as focal point | obs_composition_framing_001 | 0.9 |
| fact_color_001 | color_and_light | color palette is warm with red, orange, black | obs_color_and_light_palette_001, obs_color_and_light_palette_002 | 0.97 |

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
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | none_visible | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

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
| floor | obs_environment_floor_001 |
| lava | obs_environment_floor_002 |
| platform | obs_objects_and_props_platform_001 |
| triangular platform | obs_objects_and_props_platform_002 |
| red black pattern | obs_objects_and_props_platform_pattern_001 |
| lava waterfall | obs_environment_lava_fall_001 |
| wood walls | obs_environment_wood_walls_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_composition_framing_001 | deterministic_rule | 0.9 |
| flame | obs_environment_fire_001 | deterministic_rule | 0.94 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: floor, lava, platform, triangular platform, red black pattern, lava, lava waterfall, wood walls.
- Quality flags: `potential_module_review_conflicts_with_entries`, `potential_salient_object_missing_count_reference`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_floor_001",
      "kind": "environment_feature",
      "label": "floor",
      "normalized_label": "floor",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_floor_002",
      "kind": "environment_feature",
      "label": "lava floor",
      "normalized_label": "lava",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_platform_001",
      "kind": "object",
      "label": "platform",
      "normalized_label": "platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_platform_002",
      "kind": "object",
      "label": "triangular platform",
      "normalized_label": "triangular platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_platform_pattern_001",
      "kind": "object_detail",
      "label": "red and black pattern on platform",
      "normalized_label": "red black pattern",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_lava_001",
      "kind": "environment_feature",
      "label": "molten lava",
      "normalized_label": "lava",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_lava_fall_001",
      "kind": "environment_feature",
      "label": "lava waterfall",
      "normalized_label": "lava waterfall",
      "scene_layer": "background",
      "frame_position": "left-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_wood_walls_001",
      "kind": "environment_feature",
      "label": "wooden walls",
      "normalized_label": "wood walls",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_fire_001",
      "kind": "environment_feature",
      "label": "fire",
      "normalized_label": "fire",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_pipes_001",
      "kind": "object",
      "label": "metal pipes",
      "normalized_label": "pipes",
      "scene_layer": "midground",
      "frame_position": "right-bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_pipes_002",
      "kind": "object",
      "label": "metal pipe",
      "normalized_label": "pipe",
      "scene_layer": "midground",
      "frame_position": "left-bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_framing_001",
      "kind": "composition",
      "label": "centered composition",
      "normalized_label": "centered composition",
      "scene_layer": "whole",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_color_and_light_palette_001",
      "kind": "color_and_light",
      "label": "warm color palette",
      "normalized_label": "warm colors",
      "scene_layer": "whole",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_and_light_palette_002",
      "kind": "color_and_light",
      "label": "red, orange, black colors",
      "normalized_label": "red orange black",
      "scene_layer": "whole",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "floor",
      "claim": "floor is lava",
      "value": "lava",
      "supporting_observation_ids": [
        "obs_environment_floor_002",
        "obs_environment_lava_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "structures",
      "claim": "scene contains wooden walls",
      "value": "wooden walls",
      "supporting_observation_ids": [
        "obs_environment_wood_walls_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "structures",
      "claim": "metal pipes present near floor",
      "value": "metal pipes",
      "supporting_observation_ids": [
        "obs_objects_and_props_pipes_001",
        "obs_objects_and_props_pipes_002"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_001",
      "module": "objects_and_props",
      "field_path": "platform",
      "claim": "triangular platform with red and black pattern present",
      "value": "triangular platform red black pattern",
      "supporting_observation_ids": [
        "obs_objects_and_props_platform_001",
        "obs_objects_and_props_platform_002",
        "obs_objects_and_props_platform_pattern_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "liquid",
      "claim": "lava waterfall visible",
      "value": "lava waterfall",
      "supporting_observation_ids": [
        "obs_environment_lava_fall_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "framing",
      "claim": "centered composition with platform as focal point",
      "value": "centered composition",
      "supporting_observation_ids": [
        "obs_composition_framing_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_color_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "color palette is warm with red, orange, black",
      "value": "warm colors red orange black",
      "supporting_observation_ids": [
        "obs_color_and_light_palette_001",
        "obs_color_and_light_palette_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_objects_and_props_pipes_001",
      "obs_objects_and_props_pipes_002",
      "obs_objects_and_props_platform_001",
      "obs_objects_and_props_platform_002",
      "obs_objects_and_props_platform_pattern_001"
    ],
    "background": [
      "obs_environment_fire_001",
      "obs_environment_floor_001",
      "obs_environment_floor_002",
      "obs_environment_lava_001",
      "obs_environment_lava_fall_001",
      "obs_environment_wood_walls_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "lava floor"
    ],
    "terrain": [
      "rocky terrain"
    ],
    "plants": [],
    "architecture": [
      "metal pipes",
      "wooden walls"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_floor_002",
      "obs_environment_lava_001",
      "obs_environment_lava_fall_001",
      "obs_environment_wood_walls_001",
      "obs_objects_and_props_pipes_001",
      "obs_objects_and_props_pipes_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_and_props_platform_001",
      "label": "platform",
      "normalized_label": "platform",
      "object_type": "platform",
      "colors": [
        "black",
        "red"
      ],
      "material_appearance": [
        "matte",
        "solid"
      ],
      "location": "center",
      "count_reference": "",
      "confidence": 0.99
    },
    {
      "observation_id": "obs_objects_and_props_pipes_001",
      "label": "metal pipes",
      "normalized_label": "pipes",
      "object_type": "pipes",
      "colors": [
        "gray",
        "silver"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "bottom right and left",
      "count_reference": "",
      "confidence": 0.92
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "orange",
      "red",
      "yellow"
    ],
    "lighting": [
      "glowing",
      "warm"
    ],
    "shadows": [
      "soft"
    ],
    "highlights": [
      "bright on platform edges"
    ],
    "composition": [
      "centered platform",
      "foreground objects framing"
    ],
    "camera_angle": "slightly elevated angle",
    "framing": "tight framing on platform",
    "cropping": [
      "full platform visible"
    ],
    "depth": "medium depth",
    "motion_cues": [],
    "motifs": [
      "triangular geometric"
    ],
    "repeated_shapes": [
      "triangles"
    ],
    "style_cues": [
      "digital illustration",
      "stylized"
    ],
    "supporting_observation_ids": [
      "obs_environment_fire_001",
      "obs_environment_lava_001",
      "obs_environment_lava_fall_001",
      "obs_environment_wood_walls_001",
      "obs_objects_and_props_platform_001",
      "obs_objects_and_props_platform_pattern_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
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
        "fact_objects_001"
      ],
      "object_observation_ids": [
        "obs_objects_and_props_pipes_001",
        "obs_objects_and_props_platform_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004"
      ],
      "observation_ids": [
        "obs_environment_floor_002",
        "obs_environment_lava_001",
        "obs_environment_lava_fall_001",
        "obs_environment_wood_walls_001",
        "obs_objects_and_props_pipes_001",
        "obs_objects_and_props_pipes_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_composition_001"
      ],
      "observation_ids": [
        "obs_composition_framing_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_001"
      ],
      "observation_ids": [
        "obs_color_and_light_palette_001",
        "obs_color_and_light_palette_002"
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
        "floor",
        "lava",
        "platform",
        "triangular platform",
        "red black pattern",
        "lava waterfall",
        "wood walls"
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
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "counts",
      "review_status": "none_visible",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "term": "floor",
      "supporting_observation_ids": [
        "obs_environment_floor_001"
      ]
    },
    {
      "term": "lava",
      "supporting_observation_ids": [
        "obs_environment_floor_002"
      ]
    },
    {
      "term": "platform",
      "supporting_observation_ids": [
        "obs_objects_and_props_platform_001"
      ]
    },
    {
      "term": "triangular platform",
      "supporting_observation_ids": [
        "obs_objects_and_props_platform_002"
      ]
    },
    {
      "term": "red black pattern",
      "supporting_observation_ids": [
        "obs_objects_and_props_platform_pattern_001"
      ]
    },
    {
      "term": "lava waterfall",
      "supporting_observation_ids": [
        "obs_environment_lava_fall_001"
      ]
    },
    {
      "term": "wood walls",
      "supporting_observation_ids": [
        "obs_environment_wood_walls_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_framing_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_environment_fire_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-106 - Tremendous Bomb

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0103108`
- Artwork observations: `11`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: bomb, bomb rounded segmented body, black segmented panels on bomb body, yellow and white diagonal stripes on bomb lower body, red fuse attached to bomb top, lit fuse spark at bomb fuse tip, bright spark and burst at fuse tip, orange-red flames around bomb. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | high | 0.99 |
| bomb rounded segmented body | bomb rounded segmented body | object_part | foreground | high | 0.98 |
| black segmented panels on bomb body | black segmented panels on bomb body | object_part | foreground | high | 0.96 |
| yellow and white diagonal stripes on bomb lower body | yellow and white diagonal stripes on bomb lower body | object_part | foreground | medium | 0.94 |
| red fuse attached to bomb top | red fuse attached to bomb top | object_part | foreground | high | 0.97 |
| lit fuse spark at bomb fuse tip | lit fuse spark at bomb fuse tip | object_part | foreground | high | 0.95 |
| bright spark and burst at fuse tip | bright spark and burst at fuse tip | visual_effect | foreground | high | 0.94 |
| orange-red flames around bomb | orange-red flames around bomb | environment | midground | high | 0.95 |
| blue flames behind bomb | blue flames behind bomb | environment | background | medium | 0.93 |
| centered bomb composition | centered bomb composition | composition | foreground | high | 0.95 |
| palette including black, yellow, white, red, orange, blue | palette including black, yellow, white, red, orange, blue | color_and_light | all | high | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese card name 'ごうかいボム' at top center | card_ui_text | top-center | visible | 0.99 |
| Japanese text 'ポケモンのどうぐ' top left banner | card_ui_text | top-left | visible | 0.98 |
| Japanese text 'トレーナーズ' top right banner | card_ui_text | top-right | visible | 0.98 |
| Japanese descriptive text block bottom center | card_ui_text | bottom-center | visible | 0.97 |
| Copyright and publisher line at bottom center | copyright_text | bottom-center | visible | 0.96 |
| Set info 'J M5 106/081 SR' bottom left | card_ui_text | bottom-left | visible | 0.95 |
| Illustrator text 'illus. inose yukie' bottom left | illustrator_text | bottom-left | visible | 0.94 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_bomb_001 | objects_and_props | object is bomb | obs_object_bomb_001 | 0.99 |
| fact_object_bomb_body_001 | objects_and_props | bomb body is rounded and segmented | obs_object_bomb_body_001 | 0.98 |
| fact_object_bomb_panels_001 | objects_and_props | bomb has black segmented panels | obs_object_bomb_panels_001 | 0.96 |
| fact_object_bomb_stripes_001 | objects_and_props | bomb lower body has yellow and white diagonal stripes | obs_object_bomb_stripe_001 | 0.94 |
| fact_object_bomb_fuse_001 | objects_and_props | bomb has red fuse attached to top | obs_object_bomb_fuse_001 | 0.97 |
| fact_object_bomb_fuse_lit_001 | objects_and_props | bomb fuse is lit with bright spark | obs_object_bomb_fuse_lit_001, obs_visual_effects_spark_001 | 0.95 |
| fact_environment_flames_001 | environment | orange-red flames surround bomb | obs_environment_flames_001 | 0.95 |
| fact_environment_blue_flames_001 | environment | blue flames behind and around bomb | obs_environment_blue_flames_001 | 0.93 |
| fact_composition_centered_001 | composition | bomb is centered compositionally | obs_composition_centered_001 | 0.95 |
| fact_color_palette_001 | color_and_light | palette includes black, yellow, white, red, orange, blue | obs_color_palette_001 | 0.96 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_title_001 | card name Japanese text ごうかいボム visible | obs_card_ui_text_title_001 | 0.99 |
| fact_card_ui_top_banner1_001 | Japanese text ポケモンのどうぐ visible top left | obs_card_ui_text_top_banner_001 | 0.98 |
| fact_card_ui_top_banner2_001 | Japanese text トレーナーズ visible top right | obs_card_ui_text_top_banner_002 | 0.98 |
| fact_card_ui_bottom_text_001 | Japanese descriptive text block visible bottom center | obs_card_ui_text_bottom_text_001 | 0.97 |
| fact_card_ui_copyright_001 | copyright and publisher line visible at bottom center | obs_card_ui_text_legal_line_001 | 0.96 |
| fact_card_ui_set_info_001 | set identification text visible bottom left | obs_card_ui_text_set_info_001 | 0.95 |
| fact_card_ui_illustrator_001 | illustrator text 'illus. inose yukie' visible bottom left | obs_card_ui_text_illustrator_001 | 0.94 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_bottom_text_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_set_info_001",
    "fact_card_ui_title_001",
    "fact_card_ui_top_banner1_001",
    "fact_card_ui_top_banner2_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_title_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_set_info_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_legal_line_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_bottom_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_illustrator_001"
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | likely_complete | low | medium |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
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
| bomb | exact | 1 | obs_object_bomb_001 | 0.99 |

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
| bomb | obs_object_bomb_001 |
| bomb rounded segmented body | obs_object_bomb_body_001 |
| black segmented panels on bomb body | obs_object_bomb_panels_001 |
| yellow and white diagonal stripes on bomb lower body | obs_object_bomb_stripe_001 |
| red fuse attached to bomb top | obs_object_bomb_fuse_001 |
| lit fuse spark at bomb fuse tip | obs_object_bomb_fuse_lit_001 |
| bright spark and burst at fuse tip | obs_visual_effects_spark_001 |
| orange-red flames around bomb | obs_environment_flames_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_composition_centered_001 | deterministic_rule | 0.95 |
| circular motif | obs_object_bomb_body_001 | deterministic_rule | 0.98 |
| diagonal composition | obs_object_bomb_stripe_001 | deterministic_rule | 0.94 |
| flame | obs_environment_blue_flames_001, obs_environment_flames_001 | deterministic_rule | 0.95 |
| spark | obs_object_bomb_fuse_lit_001, obs_visual_effects_spark_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb rounded segmented body, black segmented panels on bomb body, yellow and white diagonal stripes on bomb lower body, red fuse attached to bomb top, lit fuse spark at bomb fuse tip, bright spark and burst at fuse tip, orange-red flames around bomb. Counts: bomb: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_bomb_001",
      "kind": "object",
      "label": "bomb",
      "normalized_label": "bomb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bomb_body_001",
      "kind": "object_part",
      "label": "bomb rounded segmented body",
      "normalized_label": "bomb rounded segmented body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bomb_panels_001",
      "kind": "object_part",
      "label": "black segmented panels on bomb body",
      "normalized_label": "black segmented panels on bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bomb_stripe_001",
      "kind": "object_part",
      "label": "yellow and white diagonal stripes on bomb lower body",
      "normalized_label": "yellow and white diagonal stripes on bomb lower body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bomb_fuse_001",
      "kind": "object_part",
      "label": "red fuse attached to bomb top",
      "normalized_label": "red fuse attached to bomb top",
      "scene_layer": "foreground",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bomb_fuse_lit_001",
      "kind": "object_part",
      "label": "lit fuse spark at bomb fuse tip",
      "normalized_label": "lit fuse spark at bomb fuse tip",
      "scene_layer": "foreground",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_effects_spark_001",
      "kind": "visual_effect",
      "label": "bright spark and burst at fuse tip",
      "normalized_label": "bright spark and burst at fuse tip",
      "scene_layer": "foreground",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_flames_001",
      "kind": "environment",
      "label": "orange-red flames around bomb",
      "normalized_label": "orange-red flames around bomb",
      "scene_layer": "midground",
      "frame_position": "around-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_blue_flames_001",
      "kind": "environment",
      "label": "blue flames behind bomb",
      "normalized_label": "blue flames behind bomb",
      "scene_layer": "background",
      "frame_position": "around-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_centered_001",
      "kind": "composition",
      "label": "centered bomb composition",
      "normalized_label": "centered bomb composition",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_palette_001",
      "kind": "color_and_light",
      "label": "palette including black, yellow, white, red, orange, blue",
      "normalized_label": "palette including black, yellow, white, red, orange, blue",
      "scene_layer": "all",
      "frame_position": "all",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_title_001",
      "kind": "card_ui_text",
      "label": "Japanese card name 'ごうかいボム' at top center",
      "normalized_label": "Japanese card name ごうかいボム",
      "scene_layer": "card_ui",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_top_banner_001",
      "kind": "card_ui_text",
      "label": "Japanese text 'ポケモンのどうぐ' top left banner",
      "normalized_label": "Japanese text ポケモンのどうぐ",
      "scene_layer": "card_ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_top_banner_002",
      "kind": "card_ui_text",
      "label": "Japanese text 'トレーナーズ' top right banner",
      "normalized_label": "Japanese text トレーナーズ",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_bottom_text_001",
      "kind": "card_ui_text",
      "label": "Japanese descriptive text block bottom center",
      "normalized_label": "Japanese descriptive text block",
      "scene_layer": "card_ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_legal_line_001",
      "kind": "copyright_text",
      "label": "Copyright and publisher line at bottom center",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_set_info_001",
      "kind": "card_ui_text",
      "label": "Set info 'J M5 106/081 SR' bottom left",
      "normalized_label": "set info text",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator text 'illus. inose yukie' bottom left",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_object_bomb_001",
      "module": "objects_and_props",
      "field_path": "object.label",
      "claim": "object is bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_object_bomb_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_body_001",
      "module": "objects_and_props",
      "field_path": "object.parts.body",
      "claim": "bomb body is rounded and segmented",
      "value": "rounded segmented body",
      "supporting_observation_ids": [
        "obs_object_bomb_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_panels_001",
      "module": "objects_and_props",
      "field_path": "object.parts.panels",
      "claim": "bomb has black segmented panels",
      "value": "black segmented panels",
      "supporting_observation_ids": [
        "obs_object_bomb_panels_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_stripes_001",
      "module": "objects_and_props",
      "field_path": "object.parts.stripes",
      "claim": "bomb lower body has yellow and white diagonal stripes",
      "value": "yellow and white diagonal stripes",
      "supporting_observation_ids": [
        "obs_object_bomb_stripe_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_fuse_001",
      "module": "objects_and_props",
      "field_path": "object.parts.fuse",
      "claim": "bomb has red fuse attached to top",
      "value": "red fuse",
      "supporting_observation_ids": [
        "obs_object_bomb_fuse_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_fuse_lit_001",
      "module": "objects_and_props",
      "field_path": "object.parts.fuse.lit",
      "claim": "bomb fuse is lit with bright spark",
      "value": "lit fuse spark",
      "supporting_observation_ids": [
        "obs_object_bomb_fuse_lit_001",
        "obs_visual_effects_spark_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_flames_001",
      "module": "environment",
      "field_path": "environment.flames",
      "claim": "orange-red flames surround bomb",
      "value": "orange-red flames",
      "supporting_observation_ids": [
        "obs_environment_flames_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_blue_flames_001",
      "module": "environment",
      "field_path": "environment.flames",
      "claim": "blue flames behind and around bomb",
      "value": "blue flames",
      "supporting_observation_ids": [
        "obs_environment_blue_flames_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_centered_001",
      "module": "composition",
      "field_path": "composition.layout",
      "claim": "bomb is centered compositionally",
      "value": "centered bomb",
      "supporting_observation_ids": [
        "obs_composition_centered_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_palette_001",
      "module": "color_and_light",
      "field_path": "color_and_light.palette",
      "claim": "palette includes black, yellow, white, red, orange, blue",
      "value": "black yellow white red orange blue",
      "supporting_observation_ids": [
        "obs_color_palette_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_title_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "card name Japanese text ごうかいボム visible",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_text_title_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_top_banner1_001",
      "module": "card_ui_and_print_markers",
      "field_path": "top_banner_text_left",
      "claim": "Japanese text ポケモンのどうぐ visible top left",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_text_top_banner_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_top_banner2_001",
      "module": "card_ui_and_print_markers",
      "field_path": "top_banner_text_right",
      "claim": "Japanese text トレーナーズ visible top right",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_top_banner_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_text_block",
      "claim": "Japanese descriptive text block visible bottom center",
      "value": "bottom center descriptive text",
      "supporting_observation_ids": [
        "obs_card_ui_text_bottom_text_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright and publisher line visible at bottom center",
      "value": "copyright line",
      "supporting_observation_ids": [
        "obs_card_ui_text_legal_line_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_info_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_info_text",
      "claim": "set identification text visible bottom left",
      "value": "J M5 106/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_text_set_info_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text 'illus. inose yukie' visible bottom left",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_text_illustrator_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_bomb_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_composition_centered_001",
      "obs_object_bomb_001",
      "obs_object_bomb_body_001",
      "obs_object_bomb_fuse_001",
      "obs_object_bomb_fuse_lit_001",
      "obs_object_bomb_panels_001",
      "obs_object_bomb_stripe_001",
      "obs_visual_effects_spark_001"
    ],
    "midground": [
      "obs_environment_flames_001"
    ],
    "background": [
      "obs_environment_blue_flames_001"
    ]
  },
  "environment": {
    "setting": [],
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
      "obs_environment_blue_flames_001",
      "obs_environment_flames_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "tool-like object",
      "colors": [
        "black",
        "red",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "colored stripes",
        "lit fuse spark",
        "rounded dark body"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "orange",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright spark lighting at fuse tip"
    ],
    "shadows": [],
    "highlights": [
      "bright spark"
    ],
    "composition": [
      "centered bomb"
    ],
    "camera_angle": "straight-on",
    "framing": "tight crop on bomb",
    "cropping": [],
    "depth": "moderate depth with background flames",
    "motion_cues": [
      "sparks"
    ],
    "motifs": [
      "flare burst"
    ],
    "repeated_shapes": [
      "segmented panels"
    ],
    "style_cues": [
      "bold color contrast",
      "comic explosion effect"
    ],
    "supporting_observation_ids": [
      "obs_color_palette_001",
      "obs_composition_centered_001",
      "obs_environment_flames_001",
      "obs_object_bomb_panels_001",
      "obs_visual_effects_spark_001"
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
        "fact_object_bomb_001",
        "fact_object_bomb_body_001",
        "fact_object_bomb_fuse_001",
        "fact_object_bomb_fuse_lit_001",
        "fact_object_bomb_panels_001",
        "fact_object_bomb_stripes_001"
      ],
      "object_observation_ids": [
        "obs_object_bomb_001",
        "obs_object_bomb_body_001",
        "obs_object_bomb_fuse_001",
        "obs_object_bomb_fuse_lit_001",
        "obs_object_bomb_panels_001",
        "obs_object_bomb_stripe_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_blue_flames_001",
        "fact_environment_flames_001"
      ],
      "observation_ids": [
        "obs_environment_blue_flames_001",
        "obs_environment_flames_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_composition_centered_001"
      ],
      "observation_ids": [
        "obs_composition_centered_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_palette_001"
      ],
      "observation_ids": [
        "obs_color_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_visual_effects_spark_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_bottom_text_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_set_info_001",
        "fact_card_ui_title_001",
        "fact_card_ui_top_banner1_001",
        "fact_card_ui_top_banner2_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_title_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_set_info_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_legal_line_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_bottom_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_bomb_001"
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
        "bomb",
        "bomb rounded segmented body",
        "black segmented panels on bomb body",
        "yellow and white diagonal stripes on bomb lower body",
        "red fuse attached to bomb top",
        "lit fuse spark at bomb fuse tip",
        "bright spark and burst at fuse tip",
        "orange-red flames around bomb"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_object_bomb_001"
      ]
    },
    {
      "term": "bomb rounded segmented body",
      "supporting_observation_ids": [
        "obs_object_bomb_body_001"
      ]
    },
    {
      "term": "black segmented panels on bomb body",
      "supporting_observation_ids": [
        "obs_object_bomb_panels_001"
      ]
    },
    {
      "term": "yellow and white diagonal stripes on bomb lower body",
      "supporting_observation_ids": [
        "obs_object_bomb_stripe_001"
      ]
    },
    {
      "term": "red fuse attached to bomb top",
      "supporting_observation_ids": [
        "obs_object_bomb_fuse_001"
      ]
    },
    {
      "term": "lit fuse spark at bomb fuse tip",
      "supporting_observation_ids": [
        "obs_object_bomb_fuse_lit_001"
      ]
    },
    {
      "term": "bright spark and burst at fuse tip",
      "supporting_observation_ids": [
        "obs_visual_effects_spark_001"
      ]
    },
    {
      "term": "orange-red flames around bomb",
      "supporting_observation_ids": [
        "obs_environment_flames_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_centered_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_bomb_body_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_object_bomb_stripe_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_environment_blue_flames_001",
          "obs_environment_flames_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_object_bomb_fuse_lit_001",
          "obs_visual_effects_spark_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-074 - リトライバッジ

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0070792`
- Artwork observations: `2`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Counts: badge: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| silver star-shaped badge with ribbon | badge | object | midground | salient | 0.99 |
| light blue swirl pattern background | background swirl pattern | object | background | salient | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| リトライバッジ | card_name_text | top left | visible | 0.98 |
| ポケモンのどうぐ | card_ui_text | top left | visible | 0.95 |
| トレーナーズ | card_ui_text | top right | visible | 0.95 |
| Japanese text description in bottom half | card_ui_text | bottom half | visible | 0.85 |
| Illus. Toyste Beach | illustrator_text | bottom left | visible | 0.95 |
| 074/081 | collector_number | bottom left | visible | 0.95 |
| m5 | set_symbol | bottom left | visible | 0.95 |
| U | rarity_mark | bottom left | visible | 0.95 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | bottom_line_text | bottom | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_001 | objects_and_props | object present | obs_object_001 | 0.99 |
| fact_environment_001 | environment | background pattern | obs_background_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_name_001 | card name text | obs_card_ui_name_001 | 0.98 |
| fact_ui_topbar_001 | top left text | obs_card_ui_topbar_001 | 0.95 |
| fact_ui_topbar_002 | top right text | obs_card_ui_topbar_002 | 0.95 |
| fact_ui_textblock_001 | presence of Japanese description text block | obs_card_ui_textblock_001 | 0.85 |
| fact_ui_illustrator_001 | illustrator text | obs_card_ui_illustrator_001 | 0.95 |
| fact_ui_setcode_001 | collector number and set code | obs_card_ui_setcode_001, obs_card_ui_setsymbol_001 | 0.95 |
| fact_ui_rarity_001 | rarity mark | obs_card_ui_rare_001 | 0.95 |
| fact_ui_copyright_001 | copyright text | obs_card_ui_bottomtext_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_copyright_001",
    "fact_ui_illustrator_001",
    "fact_ui_name_001",
    "fact_ui_rarity_001",
    "fact_ui_setcode_001",
    "fact_ui_textblock_001",
    "fact_ui_topbar_001",
    "fact_ui_topbar_002"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_setcode_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_setsymbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_rare_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottomtext_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottomtext_001"
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
| subjects | none_visible | none | not_applicable |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
| environment | likely_complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
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
| badge | exact | 1 | obs_object_001 | 0.99 |

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
| badge | obs_object_001 |
| background swirl pattern | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| spiral motif | obs_background_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: badge: 1.
- Quality flags: `potential_empty_module_marked_complete`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "silver star-shaped badge with ribbon",
      "normalized_label": "badge",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "object",
      "label": "light blue swirl pattern background",
      "normalized_label": "background swirl pattern",
      "scene_layer": "background",
      "frame_position": "full card artwork",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "リトライバッジ",
      "normalized_label": "リトライバッジ",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_topbar_001",
      "kind": "card_ui_text",
      "label": "ポケモンのどうぐ",
      "normalized_label": "pokemon no dougu",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_topbar_002",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "trainers",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_textblock_001",
      "kind": "card_ui_text",
      "label": "Japanese text description in bottom half",
      "normalized_label": "Japanese text description",
      "scene_layer": "card_ui",
      "frame_position": "bottom half",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. Toyste Beach",
      "normalized_label": "Illus. Toyste Beach",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_setcode_001",
      "kind": "collector_number",
      "label": "074/081",
      "normalized_label": "074/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_setsymbol_001",
      "kind": "set_symbol",
      "label": "m5",
      "normalized_label": "m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rare_001",
      "kind": "rarity_mark",
      "label": "U",
      "normalized_label": "uncommon",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottomtext_001",
      "kind": "bottom_line_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_object_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "object present",
      "value": "silver star-shaped badge with ribbon",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background pattern",
      "value": "light blue swirl pattern",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_topbar_001",
      "module": "card_ui_and_print_markers",
      "field_path": "top_left_text",
      "claim": "top left text",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_topbar_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_topbar_002",
      "module": "card_ui_and_print_markers",
      "field_path": "top_right_text",
      "claim": "top right text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_topbar_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_textblock_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_text_description",
      "claim": "presence of Japanese description text block",
      "value": "Japanese text visible",
      "supporting_observation_ids": [
        "obs_card_ui_textblock_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_setcode_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and set code",
      "value": "074/081 m5",
      "supporting_observation_ids": [
        "obs_card_ui_setcode_001",
        "obs_card_ui_setsymbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_rarity_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "rarity mark",
      "value": "U (uncommon)",
      "supporting_observation_ids": [
        "obs_card_ui_rare_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "copyright text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottomtext_001"
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
      "count_id": "count_obj_001",
      "normalized_label": "badge",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_object_001"
    ],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "uncertain",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "silver star-shaped badge with ribbon",
      "normalized_label": "badge",
      "object_type": "badge",
      "colors": [
        "light blue",
        "silver",
        "white"
      ],
      "material_appearance": [
        "metallic-looking highlight",
        "reflective-looking highlight"
      ],
      "location": "center",
      "count_reference": "count_obj_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "grey",
      "light blue",
      "silver",
      "white"
    ],
    "lighting": [
      "bright highlights",
      "reflective shine"
    ],
    "shadows": [
      "soft shadows under badge"
    ],
    "highlights": [
      "metallic bright highlights on badge edges"
    ],
    "composition": [
      "centered object",
      "radiating swirl background"
    ],
    "camera_angle": "frontal",
    "framing": "tight centered on badge",
    "cropping": [
      "full badge visible"
    ],
    "depth": "shallow",
    "motion_cues": [],
    "motifs": [
      "ribbon tails",
      "star shape"
    ],
    "repeated_shapes": [
      "star"
    ],
    "style_cues": [
      "clean edges",
      "digital art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_object_001"
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
        "fact_object_001"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_object_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_copyright_001",
        "fact_ui_illustrator_001",
        "fact_ui_name_001",
        "fact_ui_rarity_001",
        "fact_ui_setcode_001",
        "fact_ui_textblock_001",
        "fact_ui_topbar_001",
        "fact_ui_topbar_002"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_setcode_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_setsymbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_rare_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottomtext_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottomtext_001"
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
        "badge",
        "background swirl pattern"
      ]
    }
  },
  "module_reviews": [
    {
      "module": "subjects",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "likely_complete",
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
      "term": "badge",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "background swirl pattern",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-073 - ごうかいボム

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.96`
- Cost USD: `0.0074792`
- Artwork observations: `6`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: bomb, black, yellow and black striped band, yellow explosion symbol, red lit fuse, orange and blue burst. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | artwork | high | 0.99 |
| black body | black | color | artwork | high | 0.99 |
| yellow band with black stripes | yellow and black striped band | object_part | artwork | high | 0.98 |
| yellow explosion symbol | yellow explosion symbol | object_part | artwork | medium | 0.97 |
| red fuse with sparkling lit end | red lit fuse | object_part | artwork | high | 0.99 |
| orange and blue radiating burst | orange and blue burst | background | artwork_background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| ごうかいボム | card_name_text | top-center | visible | 0.99 |
| 073/081 | collector_number | bottom-left | visible | 0.95 |
| m5 | set_symbol | bottom-left | visible | 0.95 |
| U | rarity_mark | bottom-left | visible | 0.95 |
| Illus. inose yukie | illustrator_text | bottom-left | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_artwork_shape_001 | objects_and_props | The main object is a bomb | obs_artwork_main_object_001 | 0.99 |
| fact_artwork_color_001 | objects_and_props | The bomb body color is black | obs_artwork_bomb_color_001 | 0.99 |
| fact_artwork_band_001 | objects_and_props | The bomb has a yellow band with black stripes | obs_artwork_bomb_band_001 | 0.98 |
| fact_artwork_symbol_001 | objects_and_props | The bomb has a yellow explosion symbol | obs_artwork_bomb_symbol_001 | 0.97 |
| fact_artwork_fuse_001 | objects_and_props | The bomb has a red lit fuse with sparkling end | obs_artwork_bomb_fuse_001 | 0.99 |
| fact_artwork_background_001 | environment | The artwork background has an orange and blue radiating burst | obs_artwork_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_text_001 | Card name text reads ごうかいボム | obs_card_ui_name_text_001 | 0.99 |
| fact_card_set_code_001 | Card collector number is 073/081 | obs_card_ui_set_code_001 | 0.95 |
| fact_card_set_symbol_001 | Card set symbol reads m5 | obs_card_ui_set_symbol_001 | 0.95 |
| fact_card_rarity_mark_001 | Card rarity mark is U (uncommon) | obs_card_ui_rarity_mark_001 | 0.95 |
| fact_card_illustrator_001 | Card illustrator text reads Illus. inose yukie | obs_card_ui_illustrator_text_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_illustrator_001",
    "fact_card_name_text_001",
    "fact_card_rarity_mark_001",
    "fact_card_set_code_001",
    "fact_card_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_rarity_mark_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_text_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": []
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | none_visible | none | not_applicable |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
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
| bomb | exact | 1 | obs_artwork_main_object_001 | 0.99 |

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
| bomb | obs_artwork_main_object_001 |
| black | obs_artwork_bomb_color_001 |
| yellow and black striped band | obs_artwork_bomb_band_001 |
| yellow explosion symbol | obs_artwork_bomb_symbol_001 |
| red lit fuse | obs_artwork_bomb_fuse_001 |
| orange and blue burst | obs_artwork_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_artwork_main_object_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, black, yellow and black striped band, yellow explosion symbol, red lit fuse, orange and blue burst. Counts: bomb: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_name_text",
      "label": "ごうかいボム",
      "normalized_label": "ごうかいボム",
      "scene_layer": "card_ui",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "collector_number",
      "label": "073/081",
      "normalized_label": "073/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "m5",
      "normalized_label": "m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_mark_001",
      "kind": "rarity_mark",
      "label": "U",
      "normalized_label": "uncommon",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. inose yukie",
      "normalized_label": "inosé yukie",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_main_object_001",
      "kind": "object",
      "label": "bomb",
      "normalized_label": "bomb",
      "scene_layer": "artwork",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_color_001",
      "kind": "color",
      "label": "black body",
      "normalized_label": "black",
      "scene_layer": "artwork",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_band_001",
      "kind": "object_part",
      "label": "yellow band with black stripes",
      "normalized_label": "yellow and black striped band",
      "scene_layer": "artwork",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_symbol_001",
      "kind": "object_part",
      "label": "yellow explosion symbol",
      "normalized_label": "yellow explosion symbol",
      "scene_layer": "artwork",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_fuse_001",
      "kind": "object_part",
      "label": "red fuse with sparkling lit end",
      "normalized_label": "red lit fuse",
      "scene_layer": "artwork",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_background_001",
      "kind": "background",
      "label": "orange and blue radiating burst",
      "normalized_label": "orange and blue burst",
      "scene_layer": "artwork_background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_artwork_shape_001",
      "module": "objects_and_props",
      "field_path": "observations[obs_artwork_main_object_001]",
      "claim": "The main object is a bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_artwork_main_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_artwork_color_001",
      "module": "objects_and_props",
      "field_path": "observations[obs_artwork_bomb_color_001]",
      "claim": "The bomb body color is black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_artwork_bomb_color_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_artwork_band_001",
      "module": "objects_and_props",
      "field_path": "observations[obs_artwork_bomb_band_001]",
      "claim": "The bomb has a yellow band with black stripes",
      "value": "yellow and black striped band",
      "supporting_observation_ids": [
        "obs_artwork_bomb_band_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_artwork_symbol_001",
      "module": "objects_and_props",
      "field_path": "observations[obs_artwork_bomb_symbol_001]",
      "claim": "The bomb has a yellow explosion symbol",
      "value": "yellow explosion symbol",
      "supporting_observation_ids": [
        "obs_artwork_bomb_symbol_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_artwork_fuse_001",
      "module": "objects_and_props",
      "field_path": "observations[obs_artwork_bomb_fuse_001]",
      "claim": "The bomb has a red lit fuse with sparkling end",
      "value": "red lit fuse",
      "supporting_observation_ids": [
        "obs_artwork_bomb_fuse_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_artwork_background_001",
      "module": "environment",
      "field_path": "observations[obs_artwork_background_001]",
      "claim": "The artwork background has an orange and blue radiating burst",
      "value": "orange and blue burst",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "observations[obs_card_ui_name_text_001]",
      "claim": "Card name text reads ごうかいボム",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "observations[obs_card_ui_set_code_001]",
      "claim": "Card collector number is 073/081",
      "value": "073/081",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "observations[obs_card_ui_set_symbol_001]",
      "claim": "Card set symbol reads m5",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_rarity_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "observations[obs_card_ui_rarity_mark_001]",
      "claim": "Card rarity mark is U (uncommon)",
      "value": "U",
      "supporting_observation_ids": [
        "obs_card_ui_rarity_mark_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "observations[obs_card_ui_illustrator_text_001]",
      "claim": "Card illustrator text reads Illus. inose yukie",
      "value": "inosé yukie",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_bomb_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_artwork_main_object_001"
      ],
      "scene_layer": "artwork",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_artwork_bomb_band_001",
      "obs_artwork_bomb_color_001",
      "obs_artwork_bomb_fuse_001",
      "obs_artwork_bomb_symbol_001",
      "obs_artwork_main_object_001"
    ],
    "midground": [
      "obs_artwork_background_001"
    ],
    "background": []
  },
  "environment": {
    "setting": [],
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
      "obs_artwork_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_artwork_main_object_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "weapon like object",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded body",
        "sparkling lit fuse",
        "yellow striped band"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "orange",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlight on bomb body",
      "sparkling lit fuse"
    ],
    "shadows": [
      "shadow under bomb body"
    ],
    "highlights": [
      "bright reflective highlight on bomb"
    ],
    "composition": [
      "centered bomb object",
      "radiating burst background"
    ],
    "camera_angle": "front tilted slightly above",
    "framing": "tight framing around bomb",
    "cropping": [
      "no crop on bomb"
    ],
    "depth": "shallow depth with distinct background",
    "motion_cues": [
      "sparkling fuse sparks"
    ],
    "motifs": [
      "explosion symbol",
      "radiating burst colors"
    ],
    "repeated_shapes": [
      "striped band segments"
    ],
    "style_cues": [
      "bold colors",
      "illustrative style"
    ],
    "supporting_observation_ids": [
      "obs_artwork_background_001",
      "obs_artwork_bomb_band_001",
      "obs_artwork_bomb_fuse_001",
      "obs_artwork_bomb_symbol_001",
      "obs_artwork_main_object_001"
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
        "fact_artwork_band_001",
        "fact_artwork_color_001",
        "fact_artwork_fuse_001",
        "fact_artwork_shape_001",
        "fact_artwork_symbol_001"
      ],
      "object_observation_ids": [
        "obs_artwork_bomb_band_001",
        "obs_artwork_bomb_color_001",
        "obs_artwork_bomb_fuse_001",
        "obs_artwork_bomb_symbol_001",
        "obs_artwork_main_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_artwork_background_001"
      ],
      "observation_ids": [
        "obs_artwork_background_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_artwork_background_001"
      ],
      "observation_ids": [
        "obs_artwork_background_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_artwork_color_001",
        "fact_artwork_fuse_001"
      ],
      "observation_ids": [
        "obs_artwork_bomb_color_001",
        "obs_artwork_bomb_fuse_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_illustrator_001",
        "fact_card_name_text_001",
        "fact_card_rarity_mark_001",
        "fact_card_set_code_001",
        "fact_card_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_rarity_mark_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_bomb_001"
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
        "bomb",
        "black",
        "yellow and black striped band",
        "yellow explosion symbol",
        "red lit fuse",
        "orange and blue burst"
      ]
    }
  },
  "module_reviews": [
    {
      "module": "subjects",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_artwork_main_object_001"
      ]
    },
    {
      "term": "black",
      "supporting_observation_ids": [
        "obs_artwork_bomb_color_001"
      ]
    },
    {
      "term": "yellow and black striped band",
      "supporting_observation_ids": [
        "obs_artwork_bomb_band_001"
      ]
    },
    {
      "term": "yellow explosion symbol",
      "supporting_observation_ids": [
        "obs_artwork_bomb_symbol_001"
      ]
    },
    {
      "term": "red lit fuse",
      "supporting_observation_ids": [
        "obs_artwork_bomb_fuse_001"
      ]
    },
    {
      "term": "orange and blue burst",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_artwork_main_object_001"
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

- GV-PK-JPN-M5-101: fact_graph_semantic_fact_label_not_supported_v1:svf_001
- GV-PK-JPN-M5-112: fact_graph_semantic_fact_label_not_supported_v1:semfact_pose_001
- GV-PK-JPN-M5-096: fact_graph_semantic_fact_label_not_supported_v1:sem_001
- GV-PK-JPN-M5-097: fact_graph_exact_count_range_conflict:count_arms_001
- GV-PK-JPN-M5-063: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_002, fact_graph_semantic_fact_label_not_supported_v1:sem_fact_005
- GV-PK-JPN-M5-078: fact_graph_semantic_fact_label_not_supported_v1:semfact_001
- GV-PK-JPN-M5-109: fact_graph_semantic_fact_label_not_supported_v1:sem_001
- GV-PK-JPN-M5-116: fact_graph_interpreted_expression_not_allowed, fact_graph_semantic_fact_label_not_supported_v1:semfact_001
- GV-PK-JPN-M5-111: fact_graph_semantic_fact_label_not_supported_v1:sem_001
- GV-PK-JPN-M5-110: fact_graph_subjective_or_interpreted_label_not_allowed
- GV-PK-JPN-M5-075: fact_graph_semantic_fact_label_not_supported_v1:semfact_001
- GV-PK-JPN-S6A-100: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_bridge_001
- GV-PK-JPN-TCGCOLLECTOR11525-019: fact_graph_semantic_fact_label_not_supported_v1:semfact_005, fact_graph_semantic_fact_label_not_supported_v1:semfact_006
- GV-PK-JPN-M5-105: fact_graph_unreadable_card_ui_missing_abstention:obs_card_ui_bottom_center_text_001

