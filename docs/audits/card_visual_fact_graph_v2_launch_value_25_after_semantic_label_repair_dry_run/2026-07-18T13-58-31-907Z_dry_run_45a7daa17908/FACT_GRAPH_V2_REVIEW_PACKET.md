# Card Visual Fact Graph V2 Review Packet

Generated rows: 24
Validation failures: 1
Skipped images: 0
Estimated cost USD: 0.2510464

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.98`
- Cost USD: `0.010652`
- Artwork observations: `10`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: mega_chandelure. Semantic facts: floating. Counts: purple flames on candle tips: 5.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | primary_subject | 0.99 |
| body | body | creature_anatomy | foreground | primary_subject | 0.99 |
| head with glowing purple core | head glowing purple core | creature_anatomy | foreground | primary_subject | 0.95 |
| two large horn-like appendages on head | horns | creature_anatomy | foreground | primary_subject | 0.95 |
| four swirling candle arms with flames | candle arms with flames | creature_anatomy | foreground | primary_subject | 0.97 |
| five purple flames on candle tips | flames | creature_anatomy | foreground | primary_subject | 0.97 |
| purple body with dark and light shading | purple body shading | color_and_light | foreground | primary_subject | 0.98 |
| black twisted metal parts on body and arms | black metal parts | color_and_light | foreground | primary_subject | 0.98 |
| dark smoky swirling purple and black shadowy background | dark smoky shadowy background | environment | background | background | 0.95 |
| floating diagonal pose | floating diagonal pose | creature_anatomy | foreground | primary_subject_pose | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese and English: メガシャンデラ ex Mega Chandelure ex | card_ui_text | top | fully_visible | 0.99 |
| HP text: 350 | card_ui_text | top_right | fully_visible | 0.99 |
| Psychic type symbol | card_ui_symbol | near_top_left | fully_visible | 0.99 |
| set number and rarity symbol: 113/081 SAR | card_ui_text | bottom_left | fully_visible | 0.99 |
| set code and rarity info: jpn-m5 M5 | card_ui_text | bottom_left | fully_visible | 0.99 |
| attack name: ファントムメイズ | card_ui_text | mid_right | fully_visible | 0.98 |
| attack damage: 130+ | card_ui_text | mid_right | fully_visible | 0.99 |
| flavor and rule text in Japanese below ability and attack | card_ui_text | mid_right | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | has body | obs_creature_anatomy_001 | 0.99 |
| fact_creature_anatomy_002 | creature_anatomy | head has glowing purple core | obs_creature_anatomy_002 | 0.95 |
| fact_creature_anatomy_003 | creature_anatomy | two large curved horns | obs_creature_anatomy_003 | 0.95 |
| fact_creature_anatomy_004 | creature_anatomy | four candle-like arms with purple flames | obs_creature_anatomy_004, obs_creature_anatomy_005 | 0.97 |
| fact_creature_anatomy_005 | creature_anatomy | five visible flames on candle tips | obs_creature_anatomy_005 | 0.97 |
| fact_creature_pose_001 | creature_anatomy | floating diagonal pose | obs_creature_pose_001 | 0.9 |
| fact_color_and_light_001 | color_and_light | purple colors with dark and light shading | obs_color_001 | 0.98 |
| fact_color_and_light_002 | color_and_light | black twisted metal parts | obs_color_002 | 0.98 |
| fact_environment_001 | environment | dark smoky purple and black swirling shadowy background | obs_environment_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text | obs_card_ui_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | hp text | obs_card_ui_002 | 0.99 |
| fact_card_ui_and_print_markers_003 | psychic type symbol | obs_card_ui_003 | 0.99 |
| fact_card_ui_and_print_markers_004 | collector number and rarity | obs_card_ui_004 | 0.99 |
| fact_card_ui_and_print_markers_005 | set code and rarity info | obs_card_ui_005 | 0.99 |
| fact_card_ui_and_print_markers_006 | attack name fantommaze | obs_card_ui_006 | 0.98 |
| fact_card_ui_and_print_markers_007 | attack damage 130 plus | obs_card_ui_007 | 0.99 |
| fact_card_ui_and_print_markers_008 | ability and attack text japanese | obs_card_ui_008 | 0.95 |

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
    "fact_card_ui_and_print_markers_007",
    "fact_card_ui_and_print_markers_008"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_004"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_003",
    "obs_card_ui_005"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_004"
  ],
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
| human_appearance | not_applicable | none | not_applicable |  |
| creature_anatomy | complete | none | high |  |
| clothing | not_applicable | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | action | floating | obs_subject_001 | obs_creature_pose_001 | glowing purple core floating pose diagonal | 0.9 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| purple flames on candle tips | exact | 5 | obs_creature_anatomy_005 | 0.97 |

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
| dark smoky shadowy background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cannot determine due to lack of feet contact orientation | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| diagonal | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| diagonal composition | obs_creature_pose_001 | deterministic_rule | 0.9 |
| flame | obs_creature_anatomy_004, obs_creature_anatomy_005 | deterministic_rule | 0.97 |
| floating | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_anatomy_002 | deterministic_rule | 0.95 |
| smoke | obs_environment_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: mega_chandelure. Semantic facts: floating. Counts: purple flames on candle tips: 5.
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
      "salience": "primary_subject",
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
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "head with glowing purple core",
      "normalized_label": "head glowing purple core",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "two large horn-like appendages on head",
      "normalized_label": "horns",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "four swirling candle arms with flames",
      "normalized_label": "candle arms with flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "five purple flames on candle tips",
      "normalized_label": "flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color_and_light",
      "label": "purple body with dark and light shading",
      "normalized_label": "purple body shading",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color_and_light",
      "label": "black twisted metal parts on body and arms",
      "normalized_label": "black metal parts",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark smoky swirling purple and black shadowy background",
      "normalized_label": "dark smoky shadowy background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_pose_001",
      "kind": "creature_anatomy",
      "label": "floating diagonal pose",
      "normalized_label": "floating diagonal pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_pose",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese and English: メガシャンデラ ex Mega Chandelure ex",
      "normalized_label": "card_name_text",
      "scene_layer": "card_interface",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "primary_card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "HP text: 350",
      "normalized_label": "hp_text",
      "scene_layer": "card_interface",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "primary_card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "Psychic type symbol",
      "normalized_label": "psychic_type_symbol",
      "scene_layer": "card_interface",
      "frame_position": "near_top_left",
      "visibility": "fully_visible",
      "salience": "primary_card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "set number and rarity symbol: 113/081 SAR",
      "normalized_label": "collector_number_and_rarity",
      "scene_layer": "card_interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "set code and rarity info: jpn-m5 M5",
      "normalized_label": "set_code_and_rarity_info",
      "scene_layer": "card_interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "attack name: ファントムメイズ",
      "normalized_label": "attack_name_fantommaze",
      "scene_layer": "card_interface",
      "frame_position": "mid_right",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "attack damage: 130+",
      "normalized_label": "attack_damage_130_plus",
      "scene_layer": "card_interface",
      "frame_position": "mid_right",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "card_ui_text",
      "label": "flavor and rule text in Japanese below ability and attack",
      "normalized_label": "ability_and_attack_text_japanese",
      "scene_layer": "card_interface",
      "frame_position": "mid_right",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "scene subject",
      "value": "mega chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body",
      "claim": "has body",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "head",
      "claim": "head has glowing purple core",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "horns",
      "claim": "two large curved horns",
      "value": "two",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "arms",
      "claim": "four candle-like arms with purple flames",
      "value": "four",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "flames",
      "claim": "five visible flames on candle tips",
      "value": "five",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "floating diagonal pose",
      "value": "floating diagonal",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "colors_body",
      "claim": "purple colors with dark and light shading",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_002",
      "module": "color_and_light",
      "field_path": "colors_metal_parts",
      "claim": "black twisted metal parts",
      "value": "black",
      "supporting_observation_ids": [
        "obs_color_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "dark smoky purple and black swirling shadowy background",
      "value": "dark smoky shadowy background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガシャンデラ ex Mega Chandelure ex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "hp text",
      "value": "350",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "psychic type symbol",
      "value": "psychic",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and rarity",
      "value": "113/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set code and rarity info",
      "value": "jpn-m5 M5",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_name",
      "claim": "attack name fantommaze",
      "value": "ファントムメイズ",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage",
      "claim": "attack damage 130 plus",
      "value": "130+",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "rule_text",
      "claim": "ability and attack text japanese",
      "value": "present",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "mega_chandelure",
      "identity_confidence": 0.99,
      "anatomy": [
        "body",
        "candle arms with flames",
        "head",
        "horns"
      ],
      "physical_features": [
        "glowing purple core"
      ],
      "pose": [
        "diagonal",
        "floating"
      ],
      "orientation": "cannot determine due to lack of feet contact",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "not visible",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "centered",
        "other_visible_evidence": [
          "glowing purple core"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "purple"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_flames_001",
      "normalized_label": "purple flames on candle tips",
      "count_type": "exact",
      "exact_count": 5,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "scene_layer": "foreground",
      "confidence": 0.97
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_color_001",
      "obs_color_002",
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "dark shadowy supernatural environment"
    ],
    "indoor_outdoor": "cannot_determine",
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
      "light highlights",
      "purples"
    ],
    "lighting": [
      "ambient glowing effects on core and flames"
    ],
    "shadows": [
      "soft shadows from floating subject"
    ],
    "highlights": [
      "flame tips highlights",
      "glowing purple core highlight"
    ],
    "composition": [
      "centered subject diagonal pose"
    ],
    "camera_angle": "frontal",
    "framing": "centered tight vertical frame",
    "cropping": [],
    "depth": "shallow depth with background blur",
    "motion_cues": [],
    "motifs": [
      "ghostly flames",
      "swirling smoke"
    ],
    "repeated_shapes": [
      "curved candle arms",
      "spiral shapes on arms"
    ],
    "style_cues": [
      "digital illustration",
      "glowing effect"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_environment_001",
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
        "fact_creature_pose_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "body",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [
            "glowing purple core"
          ],
          "supporting_observation_ids": [
            "obs_color_001",
            "obs_creature_anatomy_001",
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.99
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "horns",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "two large curved horns"
          ],
          "supporting_observation_ids": [
            "obs_color_002",
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal",
            "floating"
          ],
          "orientation": "cannot determine due to lack of feet contact",
          "action_state": [
            "static"
          ],
          "supporting_observation_ids": [
            "obs_creature_pose_001"
          ],
          "confidence": 0.9
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple flames on candle arms",
          "details": [
            "five visible purple flames on candle tips"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004",
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.97
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
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_and_light_001",
        "fact_color_and_light_002"
      ],
      "observation_ids": [
        "obs_color_001",
        "obs_color_002"
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
        "fact_card_ui_and_print_markers_006",
        "fact_card_ui_and_print_markers_007",
        "fact_card_ui_and_print_markers_008"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_004"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_003",
        "obs_card_ui_005"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_004"
      ],
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
        "count_flames_001"
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
        "dark smoky shadowy background"
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
      "review_status": "not_applicable",
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
      "review_status": "not_applicable",
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
      "review_status": "none_visible",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_001",
      "category": "action",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [
          "glowing purple core"
        ],
        "body_language": [
          "floating pose"
        ],
        "body_position": [
          "diagonal"
        ],
        "motion_state": [],
        "environment": [],
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
      "term": "dark smoky shadowy background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cannot determine due to lack of feet contact orientation",
        "source_observation_ids": [
          "obs_creature_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal",
        "source_observation_ids": [
          "obs_creature_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_creature_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_anatomy_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "smoke",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.93`
- Attribute confidence: `0.92`
- Cost USD: `0.0117132`
- Artwork observations: `10`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: Darkrai, head, shoulders, body cape, collar, arms, smoky shadow effect, eye. Semantic facts: floating, abstract golden patterned background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Darkrai Pokemon figure | Darkrai | scene_subject | foreground | high | 1 |
| Darkrai head | head | creature_anatomy | foreground | high | 1 |
| Darkrai shoulders | shoulders | creature_anatomy | foreground | high | 1 |
| Darkrai flowing cape-like body | body cape | creature_anatomy | foreground | high | 1 |
| Darkrai spiked collar | collar | creature_anatomy | foreground | medium | 0.95 |
| Darkrai arms | arms | creature_anatomy | foreground | medium | 0.9 |
| Darkrai shadowy form, smoky effect | smoky shadow effect | creature_anatomy | foreground | medium | 1 |
| Darkrai eye visible under hood | eye | creature_anatomy | foreground | high | 1 |
| Darkrai shadowy aura effect | shadowy aura | objects_and_props | foreground | high | 1 |
| Abstract golden patterned background | background abstract golden | environment | background | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text 'メガダークライex' (Mega Darkrai ex in Japanese) | card_ui_text | top_center | fully_visible | 1 |
| HP text '280' | card_ui_text | top_right | fully_visible | 1 |
| Dark type energy symbol | card_ui_symbol | top_right_near_hp | fully_visible | 1 |
| Japanese move names and descriptions text | card_ui_text | mid_left | fully_visible | 1 |
| Japanese weakness text 'x2' with grass symbol | card_ui_text | bottom_left | fully_visible | 1 |
| Japanese resistance text empty | card_ui_text | bottom_center_left | visible_area | 1 |
| Japanese retreat cost '2 colorless energy' symbols | card_ui_text | bottom_center_right | fully_visible | 1 |
| Artist credit 'Illus. 5ban Graphics' | card_ui_text | bottom_left | fully_visible | 1 |
| Set info '118/081 M5' | card_ui_text | bottom_left_below_artist | fully_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 1 |
| fact_creature_anatomy_001 | creature_anatomy | presence of head | obs_creature_anatomy_001 | 1 |
| fact_creature_anatomy_002 | creature_anatomy | presence of shoulders | obs_creature_anatomy_002 | 1 |
| fact_creature_anatomy_003 | creature_anatomy | presence of cape-like body | obs_creature_anatomy_003 | 1 |
| fact_creature_anatomy_004 | creature_anatomy | presence of spiked collar | obs_creature_anatomy_004 | 0.95 |
| fact_creature_anatomy_005 | creature_anatomy | presence of arms | obs_creature_anatomy_005 | 0.9 |
| fact_creature_anatomy_006 | creature_anatomy | presence of smoky shadowy effect | obs_creature_anatomy_006, obs_objects_001 | 1 |
| fact_creature_anatomy_007 | creature_anatomy | visible eye under hood | obs_creature_anatomy_007 | 1 |
| fact_environment_001 | environment | presence of abstract patterned golden background | obs_environment_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text | obs_card_ui_text_001 | 1 |
| fact_card_ui_and_print_markers_002 | HP text | obs_card_ui_text_002 | 1 |
| fact_card_ui_and_print_markers_003 | energy symbol | obs_card_ui_symbol_001 | 1 |
| fact_card_ui_and_print_markers_004 | attack text in Japanese | obs_card_ui_text_003 | 1 |
| fact_card_ui_and_print_markers_005 | weakness to grass x2 | obs_card_ui_text_004 | 1 |
| fact_card_ui_and_print_markers_006 | resistance text area visible but blank | obs_card_ui_text_005 | 1 |
| fact_card_ui_and_print_markers_007 | retreat cost 2 colorless energy | obs_card_ui_text_006 | 1 |
| fact_card_ui_and_print_markers_008 | illustrator credit | obs_card_ui_text_007 | 1 |
| fact_card_ui_and_print_markers_009 | set info and card number | obs_card_ui_text_008 | 1 |

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
    "fact_card_ui_and_print_markers_007",
    "fact_card_ui_and_print_markers_008",
    "fact_card_ui_and_print_markers_009"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_text_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_text_008"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_symbol_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_007"
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
| clothing | likely_complete | low | high |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_002 | action | floating | obs_subject_001 | obs_subject_001 | floating body pose upright still | 1 |
| svf_003 | environment | abstract golden patterned background |  | obs_environment_001 | abstract golden pattern | 1 |

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
| floating Darkrai | obs_subject_001 |
| shadowy aura Darkrai | obs_creature_anatomy_006, obs_objects_001 |
| golden card background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| abstract golden patterned background | obs_environment_001 | deterministic_rule | 1 |
| cape | obs_creature_anatomy_003 | deterministic_rule | 1 |
| floating | obs_subject_001 | deterministic_rule | 1 |
| smoke | obs_creature_anatomy_006 | deterministic_rule | 1 |
| upright | obs_subject_001 | deterministic_rule | 1 |
| upright orientation | obs_subject_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: Darkrai, head, shoulders, body cape, collar, arms, smoky shadow effect, eye. Semantic facts: floating, abstract golden patterned background.
- Quality flags: `potential_count_reference_inconsistent`, `potential_speculative_setting_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Darkrai Pokemon figure",
      "normalized_label": "Darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "Darkrai head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center_upper",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "Darkrai shoulders",
      "normalized_label": "shoulders",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "Darkrai flowing cape-like body",
      "normalized_label": "body cape",
      "scene_layer": "foreground",
      "frame_position": "center_lower",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "Darkrai spiked collar",
      "normalized_label": "collar",
      "scene_layer": "foreground",
      "frame_position": "center_upper",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "Darkrai arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center_lower_sides",
      "visibility": "partially_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "Darkrai shadowy form, smoky effect",
      "normalized_label": "smoky shadow effect",
      "scene_layer": "foreground",
      "frame_position": "around_body",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "Darkrai eye visible under hood",
      "normalized_label": "eye",
      "scene_layer": "foreground",
      "frame_position": "head_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "Darkrai shadowy aura effect",
      "normalized_label": "shadowy aura",
      "scene_layer": "foreground",
      "frame_position": "around_pokemon",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "Abstract golden patterned background",
      "normalized_label": "background abstract golden",
      "scene_layer": "background",
      "frame_position": "full_card_background",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "Card name text 'メガダークライex' (Mega Darkrai ex in Japanese)",
      "normalized_label": "card_name_text",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "HP text '280'",
      "normalized_label": "hp_text",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "card_ui_symbol",
      "label": "Dark type energy symbol",
      "normalized_label": "energy_symbol_dark",
      "scene_layer": "ui",
      "frame_position": "top_right_near_hp",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "Japanese move names and descriptions text",
      "normalized_label": "attack_text",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "Japanese weakness text 'x2' with grass symbol",
      "normalized_label": "weakness_text",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "Japanese resistance text empty",
      "normalized_label": "resistance_text",
      "scene_layer": "ui",
      "frame_position": "bottom_center_left",
      "visibility": "visible_area",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "card_ui_text",
      "label": "Japanese retreat cost '2 colorless energy' symbols",
      "normalized_label": "retreat_cost_text",
      "scene_layer": "ui",
      "frame_position": "bottom_center_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_007",
      "kind": "card_ui_text",
      "label": "Artist credit 'Illus. 5ban Graphics'",
      "normalized_label": "illustrator_text",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_008",
      "kind": "card_ui_text",
      "label": "Set info '118/081 M5'",
      "normalized_label": "collector_number_and_set_code",
      "scene_layer": "ui",
      "frame_position": "bottom_left_below_artist",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "subject identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "presence of head",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.shoulders",
      "claim": "presence of shoulders",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.cape_body",
      "claim": "presence of cape-like body",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.collar_spikes",
      "claim": "presence of spiked collar",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "physical_features.arms",
      "claim": "presence of arms",
      "value": "partially visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "physical_features.smoky_shadow_effect",
      "claim": "presence of smoky shadowy effect",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006",
        "obs_objects_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "physical_features.eye_under_hood",
      "claim": "visible eye under hood",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background.pattern",
      "claim": "presence of abstract patterned golden background",
      "value": "present",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "card name text",
      "value": "メガダークライex",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy symbol",
      "value": "dark type",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack text in Japanese",
      "value": "present",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_text",
      "claim": "weakness to grass x2",
      "value": "present",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_text",
      "claim": "resistance text area visible but blank",
      "value": "empty",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost_text",
      "claim": "retreat cost 2 colorless energy",
      "value": "present",
      "supporting_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator credit",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_text_007"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_009",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_and_set_code",
      "claim": "set info and card number",
      "value": "118/081 M5",
      "supporting_observation_ids": [
        "obs_card_ui_text_008"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 1,
      "anatomy": [
        "arms",
        "cape-like body",
        "eye under hood",
        "head",
        "shoulders",
        "smoky shadowy effect",
        "spiked collar"
      ],
      "physical_features": [
        "collar spikes",
        "smoky shadow effect",
        "visible eye under hood"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "partially visible with shadow",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": [
          "shadowy hood"
        ]
      },
      "clothing_or_accessories": [
        "spiked collar"
      ],
      "colors": [
        "black",
        "gold",
        "gray",
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
      "obs_creature_anatomy_006",
      "obs_objects_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract card background"
    ],
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
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "shadowy aura effect",
      "normalized_label": "shadowy aura",
      "object_type": "visual effect",
      "colors": [
        "black",
        "dark gray"
      ],
      "material_appearance": [
        "ethereal",
        "smoky"
      ],
      "location": "around Darkrai figure",
      "count_reference": "none_visible",
      "confidence": 1
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "gold",
      "gray",
      "yellow"
    ],
    "lighting": [
      "bright highlight on gold background",
      "shadow on figure"
    ],
    "shadows": [
      "shadow around subject, darker areas on figure"
    ],
    "highlights": [
      "highlight on golden background pattern"
    ],
    "composition": [
      "central composition with subject centered"
    ],
    "camera_angle": "frontal",
    "framing": "complete subject visible",
    "cropping": [],
    "depth": "shallow depth emphasizing figure",
    "motion_cues": [],
    "motifs": [
      "golden angular patterned motif"
    ],
    "repeated_shapes": [
      "angular lines"
    ],
    "style_cues": [
      "background",
      "Japanese card style"
    ],
    "supporting_observation_ids": [
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
        "fact_creature_anatomy_006",
        "fact_creature_anatomy_007"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "gray"
          ],
          "details": [
            "shadowy hood covering face except eye"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "shoulders",
          "feature": "shoulders",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "broad, rounded"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "cape-like body",
          "feature": "cape-like body",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "dark gray"
          ],
          "details": [
            "flowing, tattered edges"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 1
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "neck",
          "feature": "spiked collar",
          "visibility": "fully_visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "bright yellow spikes around neck"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "arms",
          "visibility": "partial",
          "colors": [
            "black",
            "dark gray"
          ],
          "details": [
            "shadowy, partially visible"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "eyes under hood",
          "visibility": "fully_visible",
          "colors": [
            "white",
            "yellow"
          ],
          "details": [
            "one eye visible under shadowy hood"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_007"
          ],
          "confidence": 1
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating",
            "upright"
          ],
          "orientation": "upright",
          "action_state": [
            "still"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 1
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "shadowy aura effect",
          "details": [
            "smoky dark gray-black effect around body"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006",
            "obs_objects_001"
          ],
          "confidence": 1
        }
      ]
    },
    "clothing": {
      "fact_ids": [],
      "garments": [],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "spiked collar accessory",
          "details": [
            "bright yellow spiked collar around neck"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
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
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_001"
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
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_007",
        "obs_environment_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_006",
        "obs_objects_001"
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
        "fact_card_ui_and_print_markers_007",
        "fact_card_ui_and_print_markers_008",
        "fact_card_ui_and_print_markers_009"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_text_008"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_007"
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
        "floating Darkrai",
        "shadowy aura Darkrai",
        "golden card background"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
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
      "semantic_fact_id": "svf_002",
      "category": "action",
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
          "floating body pose"
        ],
        "body_position": [
          "upright"
        ],
        "motion_state": [
          "still"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "svf_003",
      "category": "environment",
      "label": "abstract golden patterned background",
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
          "abstract golden pattern"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "shadowy aura Darkrai",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006",
        "obs_objects_001"
      ]
    },
    {
      "term": "golden card background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "abstract golden patterned background",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "cape",
        "source_observation_ids": [
          "obs_creature_anatomy_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "smoke",
        "source_observation_ids": [
          "obs_creature_anatomy_006"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "upright",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-101 - Mega Excadrill ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0113464`
- Artwork observations: `10`
- Card UI / print-marker observations: `10`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Excadrill. Visible observations: mega excadrill, drill arms, metallic drill body, claws, spike on back, gray black metallic main color, pink nails and nose, diagonal pose upper right to lower left.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Excadrill | mega excadrill | scene_subject | foreground | high | 0.99 |
| drill arms | drill arms | feature | foreground | high | 0.98 |
| metallic drill body | metallic drill body | feature | foreground | high | 0.98 |
| claws | claws | feature | foreground | high | 0.95 |
| spike on back | spike on back | feature | foreground | medium | 0.9 |
| gray black metallic main color | gray black metallic main color | color | foreground | high | 0.98 |
| pink nails and nose | pink nails and nose | color | foreground | medium | 0.96 |
| diagonal pose, body oriented upper right to lower left | diagonal pose upper right to lower left | pose_orientation | foreground | high | 0.95 |
| abstract red and yellow fiery background | fiery background | environment | background | medium | 0.9 |
| yellow glowing sparks or streaks near drill arms | yellow glowing sparks or streaks | object | foreground | medium | 0.87 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガドリュウズex | card_ui_text | top_center | fully_visible | 0.99 |
| HP 340 | card_ui_text | top_right | fully_visible | 0.99 |
| metal energy type symbol | card_ui_symbol | top_right | fully_visible | 0.99 |
| attack name 1: ほりくずす (Horikuzusu) | card_ui_text | mid_left | fully_visible | 0.95 |
| attack damage 90 | card_ui_text | mid_left | fully_visible | 0.95 |
| attack name 2: マキシマムドリル (Maximum Drill) | card_ui_text | mid_left | fully_visible | 0.95 |
| attack damage 200+ | card_ui_text | mid_left | fully_visible | 0.95 |
| collector number 101/081 SR | card_ui_text | bottom_left | fully_visible | 0.95 |
| copyright 2026 Pokémon/Nintendo/Creatures/GAME FREAK | card_ui_text | bottom | fully_visible | 0.95 |
| illustrator text Illus. Keisuke Azuma | card_ui_text | bottom_left | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject is Mega Excadrill | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | Mega Excadrill has drill arms | obs_creature_anatomy_001 | 0.98 |
| fact_003 | creature_anatomy | Mega Excadrill has a metallic drill-shaped body | obs_creature_anatomy_002 | 0.98 |
| fact_004 | creature_anatomy | Mega Excadrill has claws | obs_creature_anatomy_003 | 0.95 |
| fact_005 | creature_anatomy | Mega Excadrill has spikes on back | obs_creature_anatomy_004 | 0.9 |
| fact_006 | color_and_light | Mega Excadrill's primary body colors are gray, black metallic with pink nails and nose | obs_creature_anatomy_005, obs_creature_anatomy_006 | 0.97 |
| fact_007 | creature_anatomy | Mega Excadrill is positioned diagonally with body orientation upper right to lower left | obs_creature_anatomy_007 | 0.95 |
| fact_008 | environment | background is an abstract red and yellow fiery pattern | obs_environment_001 | 0.9 |
| fact_009 | objects_and_props | yellow glowing sparks or streaks near drill arms | obs_objects_001 | 0.87 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_010 | card name text in Japanese: メガドリュウズex | obs_card_ui_001 | 0.99 |
| fact_011 | HP value visible as 340 | obs_card_ui_002 | 0.99 |
| fact_012 | metal energy type symbol visible | obs_card_ui_003 | 0.99 |
| fact_013 | attack names visible: ほりくずす and マキシマムドリル | obs_card_ui_004, obs_card_ui_006 | 0.95 |
| fact_014 | attack damage values visible: 90 and 200+ | obs_card_ui_005, obs_card_ui_007 | 0.95 |
| fact_015 | collector number visible: 101/081 SR | obs_card_ui_008 | 0.95 |
| fact_016 | copyright line visible: 2026 Pokémon/Nintendo/Creatures/GAME FREAK | obs_card_ui_009 | 0.95 |
| fact_017 | illustrator text visible: Illus. Keisuke Azuma | obs_card_ui_010 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_010",
    "fact_011",
    "fact_012",
    "fact_013",
    "fact_014",
    "fact_015",
    "fact_016",
    "fact_017"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_008"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_008"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_009"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_010"
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

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
| metallic gray and black | obs_creature_anatomy_005 |
| fiery background | obs_environment_001 |
| yellow sparks | obs_objects_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal composition | obs_creature_anatomy_007 | deterministic_rule | 0.95 |
| diagonal orientation | obs_creature_anatomy_007, obs_subject_001 | deterministic_rule | 0.99 |
| diagonal pose upper right to lower left | obs_creature_anatomy_007, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_objects_001 | deterministic_rule | 0.92 |
| metal-like appearance | obs_creature_anatomy_002, obs_creature_anatomy_005 | deterministic_rule | 0.98 |
| right orientation | obs_creature_anatomy_007 | deterministic_rule | 0.95 |
| spark | obs_objects_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Excadrill. Visible observations: mega excadrill, drill arms, metallic drill body, claws, spike on back, gray black metallic main color, pink nails and nose, diagonal pose upper right to lower left.
- Quality flags: `potential_count_reference_inconsistent`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Excadrill",
      "normalized_label": "mega excadrill",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "feature",
      "label": "drill arms",
      "normalized_label": "drill arms",
      "scene_layer": "foreground",
      "frame_position": "right_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "feature",
      "label": "metallic drill body",
      "normalized_label": "metallic drill body",
      "scene_layer": "foreground",
      "frame_position": "right_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "feature",
      "label": "claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "feature",
      "label": "spike on back",
      "normalized_label": "spike on back",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "color",
      "label": "gray black metallic main color",
      "normalized_label": "gray black metallic main color",
      "scene_layer": "foreground",
      "frame_position": "entire_subject",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "color",
      "label": "pink nails and nose",
      "normalized_label": "pink nails and nose",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "pose_orientation",
      "label": "diagonal pose, body oriented upper right to lower left",
      "normalized_label": "diagonal pose upper right to lower left",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "abstract red and yellow fiery background",
      "normalized_label": "fiery background",
      "scene_layer": "background",
      "frame_position": "behind subject",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "object",
      "label": "yellow glowing sparks or streaks near drill arms",
      "normalized_label": "yellow glowing sparks or streaks",
      "scene_layer": "foreground",
      "frame_position": "right_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.87,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガドリュウズex",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "HP 340",
      "normalized_label": "HP 340",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "metal energy type symbol",
      "normalized_label": "metal energy type symbol",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "attack name 1: ほりくずす (Horikuzusu)",
      "normalized_label": "attack name 1 horikuzusu",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "attack damage 90",
      "normalized_label": "attack damage 90",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "attack name 2: マキシマムドリル (Maximum Drill)",
      "normalized_label": "attack name 2 maximum drill",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "attack damage 200+",
      "normalized_label": "attack damage 200+",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "card_ui_text",
      "label": "collector number 101/081 SR",
      "normalized_label": "collector number 101/081 SR",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_009",
      "kind": "card_ui_text",
      "label": "copyright 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_010",
      "kind": "card_ui_text",
      "label": "illustrator text Illus. Keisuke Azuma",
      "normalized_label": "illustrator text",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "identity",
      "claim": "subject is Mega Excadrill",
      "value": "Mega Excadrill",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.drill_arms",
      "claim": "Mega Excadrill has drill arms",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.body",
      "claim": "Mega Excadrill has a metallic drill-shaped body",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.claws",
      "claim": "Mega Excadrill has claws",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "physical_features.spike_on_back",
      "claim": "Mega Excadrill has spikes on back",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "color_and_light",
      "field_path": "palette.colors",
      "claim": "Mega Excadrill's primary body colors are gray, black metallic with pink nails and nose",
      "value": "gray, black metallic, pink",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005",
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.pose",
      "claim": "Mega Excadrill is positioned diagonally with body orientation upper right to lower left",
      "value": "diagonal pose upper right to lower left",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "setting.background",
      "claim": "background is an abstract red and yellow fiery pattern",
      "value": "abstract fiery background red and yellow",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "objects_and_props",
      "field_path": "objects.sparks_or_streaks",
      "claim": "yellow glowing sparks or streaks near drill arms",
      "value": "yellow glowing sparks or streaks",
      "supporting_observation_ids": [
        "obs_objects_001"
      ],
      "confidence": 0.87,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text in Japanese: メガドリュウズex",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value visible as 340",
      "value": "340",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_type_symbol",
      "claim": "metal energy type symbol visible",
      "value": "metal",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_names",
      "claim": "attack names visible: ほりくずす and マキシマムドリル",
      "value": "ほりくずす, マキシマムドリル",
      "supporting_observation_ids": [
        "obs_card_ui_004",
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage_values",
      "claim": "attack damage values visible: 90 and 200+",
      "value": "90, 200+",
      "supporting_observation_ids": [
        "obs_card_ui_005",
        "obs_card_ui_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible: 101/081 SR",
      "value": "101/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line visible: 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "value": "2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_009"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible: Illus. Keisuke Azuma",
      "value": "Illus. Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_010"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Excadrill",
      "identity_confidence": 0.99,
      "anatomy": [
        "claws",
        "drill arms",
        "metallic drill body",
        "spikes on back"
      ],
      "physical_features": [
        "gray black metallic body",
        "pink nails and nose"
      ],
      "pose": [
        "diagonal pose upper right to lower left"
      ],
      "orientation": "diagonal",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "visible, line-art style",
        "mouth": "closed",
        "eyebrows": "present",
        "face_position": "front right side",
        "other_visible_evidence": [
          "metallic face shape"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gray",
        "pink"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_objects_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract fiery background"
    ],
    "indoor_outdoor": "not_applicable",
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
      "observation_id": "obs_objects_001",
      "label": "yellow glowing sparks or streaks",
      "normalized_label": "yellow glowing sparks or streaks",
      "object_type": "effect",
      "colors": [
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "near drill arms",
      "count_reference": "not_counted",
      "confidence": 0.87
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "gray",
      "pink",
      "red",
      "yellow"
    ],
    "lighting": [
      "glowing yellow sparks",
      "strong highlights on metallic surfaces"
    ],
    "shadows": [
      "none strong due to abstract background"
    ],
    "highlights": [
      "strong on drills and face"
    ],
    "composition": [
      "centered subject",
      "diagonal body pose"
    ],
    "camera_angle": "straight on",
    "framing": "tight crop",
    "cropping": [
      "full subject visible"
    ],
    "depth": "moderate depth with layered effects",
    "motion_cues": [
      "static"
    ],
    "motifs": [
      "fiery background"
    ],
    "repeated_shapes": [
      "drill patterns"
    ],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
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
      "fact_ids": [
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "drill arms",
          "feature": "drill arms",
          "visibility": "fully_visible",
          "colors": [],
          "details": [
            "metallic shiny"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "metallic drill body",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "gray"
          ],
          "details": [
            "metallic reflective surface"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "lower limbs",
          "feature": "claws",
          "visibility": "fully_visible",
          "colors": [
            "pink"
          ],
          "details": [
            "sharp claws"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "back",
          "feature": "spike on back",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "sharp spike"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.9
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "colors",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "gray",
            "pink"
          ],
          "details": [
            "gray and black metallic body with pink nails and nose"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005",
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.97
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal pose upper right to lower left"
          ],
          "orientation": "diagonal",
          "action_state": [
            "static"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_007"
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
      "fact_ids": [
        "fact_009"
      ],
      "object_observation_ids": [
        "obs_objects_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_008"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_007"
      ],
      "observation_ids": [
        "obs_creature_anatomy_007"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_006"
      ],
      "observation_ids": [
        "obs_creature_anatomy_005",
        "obs_creature_anatomy_006"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_009"
      ],
      "observation_ids": [
        "obs_objects_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015",
        "fact_016",
        "fact_017"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_008"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_008"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_009"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_010"
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
      "fact_ids": [
        "fact_001",
        "fact_006",
        "fact_008",
        "fact_009"
      ],
      "terms": [
        "metallic gray and black",
        "fiery background",
        "yellow sparks"
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
      "review_status": "complete",
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
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "metallic gray and black",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "fiery background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "yellow sparks",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_creature_anatomy_007"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_007",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal pose upper right to lower left",
        "source_observation_ids": [
          "obs_creature_anatomy_007",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_objects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_creature_anatomy_002",
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_007"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_objects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-112 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0111892`
- Artwork observations: `14`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: ears coloration, eye color, mouth open, right leg, left leg, tail coloration, yellow lightning bolt markings, electric themed background. Semantic facts: electricity effects surrounding Mega Zeraora.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | mega zeraora | scene_subject | foreground | very_high | 0.99 |
| body with black, blue, white and yellow fur | body fur colors | object | foreground | very_high | 0.99 |
| head with large ears and blue face | head features | object | foreground | very_high | 0.99 |
| pointed ears with black and yellow pattern | ears coloration | object | foreground | high | 0.98 |
| sharp blue eyes | eye color | object | foreground | high | 0.98 |
| open mouth with fangs visible | mouth open | object | foreground | high | 0.97 |
| right arm raised with glowing blue electric energy around fist | right arm raised with electric energy | object | foreground | very_high | 0.99 |
| left arm extended forward with glowing blue electric energy around fist | left arm extended with electric energy | object | foreground | very_high | 0.99 |
| right leg visible, blue and black fur | right leg | object | foreground | medium | 0.95 |
| left leg partially visible | left leg | object | foreground | medium | 0.9 |
| tail barely visible, blue with darker tip | tail coloration | object | foreground | medium | 0.85 |
| yellow lightning bolt patterns on head, torso and limbs | yellow lightning bolt markings | object | foreground | high | 0.98 |
| blue electricity effects surrounding creature | electricity effects | object | foreground | very_high | 0.99 |
| blue and white abstract electric background | electric themed background | object | background | high | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガゼラオラ ex (Mega Zeraora ex) | card_ui_text | top_center | fully_visible | 0.99 |
| HP 270 | card_ui_text | top_right | fully_visible | 0.99 |
| Electric energy symbol | card_ui_symbol | top_right | fully_visible | 0.99 |
| サンダーフィスト (Thunder Fist) | card_ui_text | mid_left | fully_visible | 0.98 |
| ぜプトターン (Zepto Turn) | card_ui_text | mid_left | fully_visible | 0.98 |
| 60× | card_ui_text | mid_left | fully_visible | 0.98 |
| 150 | card_ui_text | mid_left | fully_visible | 0.98 |
| Illus. GIDORA | illustrator_text | bottom_left | fully_visible | 0.95 |
| J M5 112/081 SAR | card_ui_text | bottom_left | fully_visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_body_001 | creature_anatomy | body fur colors | obs_creature_body_001 | 0.99 |
| fact_anatomy_001 | creature_anatomy | head features | obs_creature_ear_001, obs_creature_head_001 | 0.99 |
| fact_eye_001 | creature_anatomy | eye color | obs_creature_eye_001 | 0.98 |
| fact_mouth_001 | creature_anatomy | mouth open with fangs visible | obs_creature_mouth_001 | 0.97 |
| fact_pose_001 | creature_anatomy | pose | obs_creature_arm_001, obs_creature_arm_002, obs_creature_leg_001, obs_creature_leg_002 | 0.98 |
| fact_tail_001 | creature_anatomy | tail coloration | obs_creature_tail_001 | 0.85 |
| fact_markings_001 | creature_anatomy | yellow lightning bolt markings on head, torso, limbs | obs_creature_markings_001 | 0.98 |
| fact_effects_001 | visual_effects | blue electricity effects surrounding Mega Zeraora | obs_effects_001 | 0.99 |
| fact_environment_001 | environment | electric themed blue and white abstract background | obs_environment_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_hp_001 | hp text | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_type_001 | electric type symbol visible | obs_card_ui_type_001 | 0.99 |
| fact_card_ui_attack_001 | attack 1 name | obs_card_ui_attack_001 | 0.98 |
| fact_card_ui_attack_002 | attack 2 name | obs_card_ui_attack_002 | 0.98 |
| fact_card_ui_attack_dmg_001 | attack 1 damage | obs_card_ui_attack_damage_001 | 0.98 |
| fact_card_ui_attack_dmg_002 | attack 2 damage | obs_card_ui_attack_damage_002 | 0.98 |
| fact_illustrator_001 | illustrator text | obs_card_ui_illustrator_001 | 0.95 |
| fact_card_ui_set_001 | set code and number | obs_card_ui_set_001 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_001",
    "fact_card_ui_attack_002",
    "fact_card_ui_attack_dmg_001",
    "fact_card_ui_attack_dmg_002",
    "fact_card_ui_hp_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_001",
    "fact_card_ui_type_001",
    "fact_illustrator_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_set_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_type_001"
  ],
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | partial_due_to_low_resolution | medium | medium |  |
| color_and_light | partial_due_to_low_resolution | medium | medium |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | action | electricity effects surrounding Mega Zeraora | obs_subject_001 | obs_creature_arm_001, obs_creature_arm_002, obs_effects_001 | mouth open with fangs visible sharp blue eyes black and yellow ears blue face left arm extended right arm raised centered, diagonal right-leaning electric energy charging electric themed background blue glowing electric energy around fists | 0.99 |

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
| electricity effects | obs_effects_001 |
| yellow lightning bolt markings | obs_creature_markings_001 |
| blue electric energy | obs_creature_arm_001, obs_creature_arm_002 |
| blue and white abstract electric background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_creature_arm_001, obs_creature_arm_002 | deterministic_rule | 0.92 |
| electricity effects surrounding Mega Zeraora | obs_creature_arm_001, obs_creature_arm_002, obs_effects_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_arm_001, obs_creature_arm_002, obs_effects_001 | deterministic_rule | 0.92 |
| left orientation | obs_creature_leg_002 | deterministic_rule | 0.9 |
| legs visible | obs_subject_001 | deterministic_rule | 0.99 |
| lightning | obs_creature_arm_001, obs_creature_arm_002, obs_creature_markings_001, obs_effects_001 | deterministic_rule | 0.99 |
| reaching | obs_creature_arm_002, obs_subject_001 | deterministic_rule | 0.99 |
| right arm raised | obs_subject_001 | deterministic_rule | 0.99 |
| right orientation | obs_creature_arm_001, obs_creature_leg_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: ears coloration, eye color, mouth open, right leg, left leg, tail coloration, yellow lightning bolt markings, electric themed background. Semantic facts: electricity effects surrounding Mega Zeraora.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_module_incomplete_or_low_evidence`
- Policy results: 1

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Zeraora",
      "normalized_label": "mega zeraora",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "very_high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "object",
      "label": "body with black, blue, white and yellow fur",
      "normalized_label": "body fur colors",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "very_high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_head_001",
      "kind": "object",
      "label": "head with large ears and blue face",
      "normalized_label": "head features",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "very_high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_ear_001",
      "kind": "object",
      "label": "pointed ears with black and yellow pattern",
      "normalized_label": "ears coloration",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_eye_001",
      "kind": "object",
      "label": "sharp blue eyes",
      "normalized_label": "eye color",
      "scene_layer": "foreground",
      "frame_position": "head_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_mouth_001",
      "kind": "object",
      "label": "open mouth with fangs visible",
      "normalized_label": "mouth open",
      "scene_layer": "foreground",
      "frame_position": "head_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_arm_001",
      "kind": "object",
      "label": "right arm raised with glowing blue electric energy around fist",
      "normalized_label": "right arm raised with electric energy",
      "scene_layer": "foreground",
      "frame_position": "right_center",
      "visibility": "fully_visible",
      "salience": "very_high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_arm_002",
      "kind": "object",
      "label": "left arm extended forward with glowing blue electric energy around fist",
      "normalized_label": "left arm extended with electric energy",
      "scene_layer": "foreground",
      "frame_position": "left_center",
      "visibility": "fully_visible",
      "salience": "very_high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_leg_001",
      "kind": "object",
      "label": "right leg visible, blue and black fur",
      "normalized_label": "right leg",
      "scene_layer": "foreground",
      "frame_position": "lower_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_creature_leg_002",
      "kind": "object",
      "label": "left leg partially visible",
      "normalized_label": "left leg",
      "scene_layer": "foreground",
      "frame_position": "lower_left",
      "visibility": "partially_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_tail_001",
      "kind": "object",
      "label": "tail barely visible, blue with darker tip",
      "normalized_label": "tail coloration",
      "scene_layer": "foreground",
      "frame_position": "lower_left",
      "visibility": "partially_visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_markings_001",
      "kind": "object",
      "label": "yellow lightning bolt patterns on head, torso and limbs",
      "normalized_label": "yellow lightning bolt markings",
      "scene_layer": "foreground",
      "frame_position": "various",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_effects_001",
      "kind": "object",
      "label": "blue electricity effects surrounding creature",
      "normalized_label": "electricity effects",
      "scene_layer": "foreground",
      "frame_position": "around subject",
      "visibility": "fully_visible",
      "salience": "very_high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "object",
      "label": "blue and white abstract electric background",
      "normalized_label": "electric themed background",
      "scene_layer": "background",
      "frame_position": "full_frame",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "メガゼラオラ ex (Mega Zeraora ex)",
      "normalized_label": "card name text",
      "scene_layer": "ui_layer",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP 270",
      "normalized_label": "hp text",
      "scene_layer": "ui_layer",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "Electric energy symbol",
      "normalized_label": "electric type symbol",
      "scene_layer": "ui_layer",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_attack_001",
      "kind": "card_ui_text",
      "label": "サンダーフィスト (Thunder Fist)",
      "normalized_label": "attack name 1",
      "scene_layer": "ui_layer",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_attack_002",
      "kind": "card_ui_text",
      "label": "ぜプトターン (Zepto Turn)",
      "normalized_label": "attack name 2",
      "scene_layer": "ui_layer",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_attack_damage_001",
      "kind": "card_ui_text",
      "label": "60×",
      "normalized_label": "attack damage 1",
      "scene_layer": "ui_layer",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_attack_damage_002",
      "kind": "card_ui_text",
      "label": "150",
      "normalized_label": "attack damage 2",
      "scene_layer": "ui_layer",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. GIDORA",
      "normalized_label": "illustrator text",
      "scene_layer": "ui_layer",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "high"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "card_ui_text",
      "label": "J M5 112/081 SAR",
      "normalized_label": "set code and number",
      "scene_layer": "ui_layer",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "high"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "scene subject identity",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_body_001",
      "module": "creature_anatomy",
      "field_path": "body_colors",
      "claim": "body fur colors",
      "value": "black, blue, white, yellow",
      "supporting_observation_ids": [
        "obs_creature_body_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "head_features",
      "claim": "head features",
      "value": "large ears with black and yellow pattern, blue face",
      "supporting_observation_ids": [
        "obs_creature_ear_001",
        "obs_creature_head_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_eye_001",
      "module": "creature_anatomy",
      "field_path": "eyes",
      "claim": "eye color",
      "value": "blue",
      "supporting_observation_ids": [
        "obs_creature_eye_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_mouth_001",
      "module": "creature_anatomy",
      "field_path": "mouth",
      "claim": "mouth open with fangs visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_mouth_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose",
      "value": "right arm raised with glowing electric energy, left arm extended with glowing electric energy, legs visible",
      "supporting_observation_ids": [
        "obs_creature_arm_001",
        "obs_creature_arm_002",
        "obs_creature_leg_001",
        "obs_creature_leg_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_tail_001",
      "module": "creature_anatomy",
      "field_path": "tail",
      "claim": "tail coloration",
      "value": "blue with darker tip",
      "supporting_observation_ids": [
        "obs_creature_tail_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_markings_001",
      "module": "creature_anatomy",
      "field_path": "markings",
      "claim": "yellow lightning bolt markings on head, torso, limbs",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_markings_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_effects_001",
      "module": "visual_effects",
      "field_path": "electricity_effects",
      "claim": "blue electricity effects surrounding Mega Zeraora",
      "value": "present",
      "supporting_observation_ids": [
        "obs_effects_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "electric themed blue and white abstract background",
      "value": "present",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガゼラオラ ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "hp text",
      "value": "270",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_card_ui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "electric type symbol visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_card_ui_attack_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_names",
      "claim": "attack 1 name",
      "value": "サンダーフィスト",
      "supporting_observation_ids": [
        "obs_card_ui_attack_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_card_ui_attack_002",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_names",
      "claim": "attack 2 name",
      "value": "ぜプトターン",
      "supporting_observation_ids": [
        "obs_card_ui_attack_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_card_ui_attack_dmg_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage",
      "claim": "attack 1 damage",
      "value": "60×",
      "supporting_observation_ids": [
        "obs_card_ui_attack_damage_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_card_ui_attack_dmg_002",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage",
      "claim": "attack 2 damage",
      "value": "150",
      "supporting_observation_ids": [
        "obs_card_ui_attack_damage_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Illus. GIDORA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "high"
    },
    {
      "fact_id": "fact_card_ui_set_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_code_and_number",
      "claim": "set code and number",
      "value": "J M5 112/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "high"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "ears",
        "eyes",
        "head",
        "legs",
        "markings",
        "mouth",
        "tail"
      ],
      "physical_features": [
        "blue glowing electric energy around fists",
        "yellow lightning bolt markings"
      ],
      "pose": [
        "reaching",
        "legs visible",
        "right arm raised"
      ],
      "orientation": "right",
      "action_state": [
        "electric energy charging"
      ],
      "facial_evidence": {
        "eyes": "sharp, blue",
        "mouth": "open with visible fangs",
        "eyebrows": "not clearly visible",
        "face_position": "front right angled",
        "other_visible_evidence": [
          "black and yellow ears"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
        "white",
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
      "obs_creature_arm_001",
      "obs_creature_arm_002",
      "obs_creature_body_001",
      "obs_creature_ear_001",
      "obs_creature_eye_001",
      "obs_creature_head_001",
      "obs_creature_leg_001",
      "obs_creature_leg_002",
      "obs_creature_markings_001",
      "obs_creature_mouth_001",
      "obs_creature_tail_001",
      "obs_effects_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "electric themed abstract background"
    ],
    "indoor_outdoor": "not_applicable",
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
      "blue",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights on electric energy effects",
      "glowing blue electricity"
    ],
    "shadows": [
      "dark shadows on body fur"
    ],
    "highlights": [
      "white glowing light"
    ],
    "composition": [
      "centered subject with electric energy effects"
    ],
    "camera_angle": "slightly diagonal from lower front left",
    "framing": "subject fully framed",
    "cropping": [],
    "depth": "medium depth",
    "motion_cues": [
      "electric energy arcs around fists"
    ],
    "motifs": [
      "electricity",
      "lightning bolt shapes"
    ],
    "repeated_shapes": [
      "lightning bolt pattern"
    ],
    "style_cues": [
      "manga style illustration"
    ],
    "supporting_observation_ids": [
      "obs_creature_arm_001",
      "obs_creature_arm_002",
      "obs_creature_markings_001",
      "obs_effects_001",
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
        "fact_anatomy_001",
        "fact_body_001",
        "fact_eye_001",
        "fact_markings_001",
        "fact_mouth_001",
        "fact_pose_001",
        "fact_tail_001"
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
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": []
    },
    "visual_effects": {
      "fact_ids": [
        "fact_effects_001"
      ],
      "observation_ids": [
        "obs_effects_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_001",
        "fact_card_ui_attack_002",
        "fact_card_ui_attack_dmg_001",
        "fact_card_ui_attack_dmg_002",
        "fact_card_ui_hp_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_001",
        "fact_card_ui_type_001",
        "fact_illustrator_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_type_001"
      ],
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
        "electricity effects",
        "yellow lightning bolt markings",
        "blue electric energy",
        "blue and white abstract electric background"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "semantic_fact_id": "semfact_001",
      "category": "action",
      "label": "electricity effects surrounding Mega Zeraora",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_arm_001",
        "obs_creature_arm_002",
        "obs_effects_001"
      ],
      "evidence": {
        "mouth": [
          "mouth open with fangs visible"
        ],
        "eyes": [
          "sharp blue eyes"
        ],
        "eyebrows": [],
        "facial_features": [
          "black and yellow ears",
          "blue face"
        ],
        "body_language": [
          "left arm extended",
          "right arm raised"
        ],
        "body_position": [
          "centered, diagonal right-leaning"
        ],
        "motion_state": [
          "electric energy charging"
        ],
        "environment": [
          "electric themed background"
        ],
        "objects": [
          "blue glowing electric energy around fists"
        ],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "electricity effects",
      "supporting_observation_ids": [
        "obs_effects_001"
      ]
    },
    {
      "term": "yellow lightning bolt markings",
      "supporting_observation_ids": [
        "obs_creature_markings_001"
      ]
    },
    {
      "term": "blue electric energy",
      "supporting_observation_ids": [
        "obs_creature_arm_001",
        "obs_creature_arm_002"
      ]
    },
    {
      "term": "blue and white abstract electric background",
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
          "obs_creature_arm_001",
          "obs_creature_arm_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "electricity effects surrounding Mega Zeraora",
        "source_observation_ids": [
          "obs_creature_arm_001",
          "obs_creature_arm_002",
          "obs_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_arm_001",
          "obs_creature_arm_002",
          "obs_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_creature_leg_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "legs visible",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_creature_arm_001",
          "obs_creature_arm_002",
          "obs_creature_markings_001",
          "obs_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_creature_arm_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right arm raised",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_creature_arm_001",
          "obs_creature_leg_001",
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

### GV-PK-JPN-M5-096 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0125704`
- Artwork observations: `19`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: head, left arm, right arm, left leg, right leg, yellow lightning bolt markings, blue markings arms legs, yellow triangular ears. Semantic facts: crouching.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | mega zeraora | scene_subject | foreground | primary | 0.99 |
| head | head | creature_anatomy | foreground | high | 0.99 |
| left arm | left arm | creature_anatomy | foreground | high | 0.99 |
| right arm | right arm | creature_anatomy | foreground | high | 0.99 |
| left leg | left leg | creature_anatomy | foreground | high | 0.99 |
| right leg | right leg | creature_anatomy | foreground | high | 0.99 |
| yellow lightning bolt markings | yellow lightning bolt markings | creature_anatomy | foreground | high | 0.98 |
| blue markings on arms and legs | blue markings arms legs | creature_anatomy | foreground | high | 0.98 |
| yellow triangular ears | yellow triangular ears | creature_anatomy | foreground | high | 0.99 |
| light blue ear tips | light blue ear tips | creature_anatomy | foreground | high | 0.97 |
| crouching, forward facing | crouching forward facing | creature_anatomy | foreground | primary | 0.98 |
| diagonal tilt from left rear to right front | diagonal tilt left rear to right front | creature_anatomy | foreground | high | 0.95 |
| closed mouth, neutral expression | closed mouth | creature_anatomy | foreground | medium | 0.9 |
| blue eyes with sharp pupil detail | blue eyes sharp pupil | creature_anatomy | foreground | high | 0.98 |
| magenta and purple abstract background | magenta purple abstract background | environment | background | medium | 0.95 |
| yellow lightning bolt shape behind subject | yellow lightning bolt shape behind subject | objects_and_props | background | medium | 0.9 |
| palette includes black, yellow, blue, magenta, and purple | palette black yellow blue magenta purple | color_and_light | all_layers | high | 0.99 |
| strong dynamic lighting with bright highlights and shadows | lighting bright highlights shadows | color_and_light | foreground | high | 0.92 |
| close-up diagonal composition with subject angled front right | closeup diagonal front right angle | composition | foreground | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text in Japanese 'メガゼラオラeX' (Mega Zeraora EX) | card_ui_text | top_center | fully_visible | 0.99 |
| HP 270 | hp_text | top_right | fully_visible | 0.99 |
| Lightning Energy symbol next to HP | card_ui_symbol | top_right | fully_visible | 0.99 |
| Illustrator text 'Illus. Eban Graphics' at bottom left | illustrator_text | bottom_left | fully_visible | 0.95 |
| Set symbol J M5 near bottom left | set_symbol | bottom_left | fully_visible | 0.95 |
| Collector number 096/081 SR | collector_number | bottom_left | fully_visible | 0.95 |
| Bottom text with copyright, Nintendo/Creatures/GAME FREAK | bottom_line_text | bottom | fully_visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subj_mega_zeraora_001 | subjects | scene subject is Mega Zeraora | obs_subject_001 | 0.99 |
| fact_cre_a_head_001 | creature_anatomy | Mega Zeraora has a fully visible head with yellow triangular ears and light blue ear tips | obs_body_region_001, obs_physical_feature_003, obs_physical_feature_004 | 0.98 |
| fact_cre_a_limbs_001 | creature_anatomy | Mega Zeraora has fully visible left arm, right arm, left leg, and right leg | obs_body_region_002, obs_body_region_003, obs_body_region_004, obs_body_region_005 | 0.99 |
| fact_cre_a_markings_001 | creature_anatomy | Mega Zeraora has yellow lightning bolt markings and blue markings on limbs | obs_physical_feature_001, obs_physical_feature_002 | 0.98 |
| fact_cre_a_pose_001 | creature_anatomy | Mega Zeraora is crouching and diagonally tilted from left rear to right front | obs_orientation_001, obs_pose_001 | 0.97 |
| fact_cre_a_facial_expression_001 | creature_anatomy | Mega Zeraora has a closed mouth with | obs_mouth_001 | 0.9 |
| fact_cre_a_facial_expression_002 | creature_anatomy | Mega Zeraora has sharp blue eyes | obs_eyes_001 | 0.98 |
| fact_env_abstract_bg_001 | environment | Background is magenta and purple abstract pattern | obs_background_001 | 0.95 |
| fact_obj_001 | objects_and_props | Yellow lightning bolt shaped object behind the subject | obs_object_001 | 0.9 |
| fact_color_palette_001 | color_and_light | Card palette includes black, yellow, blue, magenta, and purple | obs_palette_001 | 0.99 |
| fact_lighting_001 | color_and_light | Strong lighting with bright highlights and shadows on subject | obs_lighting_001 | 0.92 |
| fact_composition_001 | composition | Close-up diagonal composition with subject angled front right | obs_composition_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_name_001 | Card name text in Japanese 'メガゼラオラeX' visible at top center | obs_card_ui_text_001 | 0.99 |
| fact_ui_hp_001 | HP 270 text visible at top right | obs_card_ui_hp_001 | 0.99 |
| fact_ui_energy_001 | Lightning Energy symbol visible next to HP | obs_card_ui_energy_001 | 0.99 |
| fact_ui_illustrator_001 | Illustrator text 'Illus. Eban Graphics' visible at bottom left | obs_card_ui_illustrator_001 | 0.95 |
| fact_ui_set_symbol_001 | Set symbol 'J M5' visible near bottom left | obs_card_ui_set_symbol_001 | 0.95 |
| fact_ui_collector_number_001 | Collector number '096/081 SR' visible at bottom left | obs_card_ui_collector_number_001 | 0.95 |
| fact_ui_copyright_001 | Copyright text contains '©2026 Pokémon/Nintendo/Creatures/GAME FREAK' visible at bottom | obs_card_ui_bottom_text_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_collector_number_001",
    "fact_ui_copyright_001",
    "fact_ui_energy_001",
    "fact_ui_hp_001",
    "fact_ui_illustrator_001",
    "fact_ui_name_001",
    "fact_ui_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_001"
  ],
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_002 | action | crouching | obs_subject_001 | obs_pose_001 | crouching pose crouching | 0.98 |

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
| yellow lightning bolt markings | obs_physical_feature_001 |
| magenta background | obs_background_001 |
| blue eyes | obs_eyes_001 |
| crouching pose | obs_pose_001 |
| lightning bolt shape background | obs_object_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| crouching | obs_orientation_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| diagonal composition | obs_composition_001, obs_orientation_001 | deterministic_rule | 0.95 |
| forward orientation | obs_pose_001 | deterministic_rule | 0.98 |
| forward-right orientation | obs_composition_001, obs_orientation_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_lighting_001 | deterministic_rule | 0.92 |
| left orientation | obs_body_region_002, obs_body_region_004 | deterministic_rule | 0.99 |
| lightning | obs_object_001, obs_physical_feature_001 | deterministic_rule | 0.98 |
| right orientation | obs_body_region_003, obs_body_region_005 | deterministic_rule | 0.99 |
| upward orientation | obs_composition_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: head, left arm, right arm, left leg, right leg, yellow lightning bolt markings, blue markings arms legs, yellow triangular ears. Semantic facts: crouching.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Zeraora",
      "normalized_label": "mega zeraora",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "creature_anatomy",
      "label": "left arm",
      "normalized_label": "left arm",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "creature_anatomy",
      "label": "right arm",
      "normalized_label": "right arm",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_004",
      "kind": "creature_anatomy",
      "label": "left leg",
      "normalized_label": "left leg",
      "scene_layer": "foreground",
      "frame_position": "lower_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_005",
      "kind": "creature_anatomy",
      "label": "right leg",
      "normalized_label": "right leg",
      "scene_layer": "foreground",
      "frame_position": "lower_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_001",
      "kind": "creature_anatomy",
      "label": "yellow lightning bolt markings",
      "normalized_label": "yellow lightning bolt markings",
      "scene_layer": "foreground",
      "frame_position": "various",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_002",
      "kind": "creature_anatomy",
      "label": "blue markings on arms and legs",
      "normalized_label": "blue markings arms legs",
      "scene_layer": "foreground",
      "frame_position": "various",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_003",
      "kind": "creature_anatomy",
      "label": "yellow triangular ears",
      "normalized_label": "yellow triangular ears",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_004",
      "kind": "creature_anatomy",
      "label": "light blue ear tips",
      "normalized_label": "light blue ear tips",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "crouching, forward facing",
      "normalized_label": "crouching forward facing",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_orientation_001",
      "kind": "creature_anatomy",
      "label": "diagonal tilt from left rear to right front",
      "normalized_label": "diagonal tilt left rear to right front",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "creature_anatomy",
      "label": "closed mouth, neutral expression",
      "normalized_label": "closed mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "creature_anatomy",
      "label": "blue eyes with sharp pupil detail",
      "normalized_label": "blue eyes sharp pupil",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "magenta and purple abstract background",
      "normalized_label": "magenta purple abstract background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "yellow lightning bolt shape behind subject",
      "normalized_label": "yellow lightning bolt shape behind subject",
      "scene_layer": "background",
      "frame_position": "behind_subject",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_and_light",
      "label": "palette includes black, yellow, blue, magenta, and purple",
      "normalized_label": "palette black yellow blue magenta purple",
      "scene_layer": "all_layers",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "color_and_light",
      "label": "strong dynamic lighting with bright highlights and shadows",
      "normalized_label": "lighting bright highlights shadows",
      "scene_layer": "foreground",
      "frame_position": "subject",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "close-up diagonal composition with subject angled front right",
      "normalized_label": "closeup diagonal front right angle",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "Card name text in Japanese 'メガゼラオラeX' (Mega Zeraora EX)",
      "normalized_label": "card_name_japanese_mega_zeraora_ex",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 270",
      "normalized_label": "hp_270",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "card_ui_symbol",
      "label": "Lightning Energy symbol next to HP",
      "normalized_label": "energy_symbol_lightning",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator text 'Illus. Eban Graphics' at bottom left",
      "normalized_label": "illustrator_eban_graphics",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "Set symbol J M5 near bottom left",
      "normalized_label": "set_symbol_j_m5",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "Collector number 096/081 SR",
      "normalized_label": "collector_number_096_081_sr",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "Bottom text with copyright, Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright_nintendo_creatures_game_freak",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subj_mega_zeraora_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "scene subject is Mega Zeraora",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cre_a_head_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "Mega Zeraora has a fully visible head with yellow triangular ears and light blue ear tips",
      "value": "yellow triangular ears, light blue ear tips",
      "supporting_observation_ids": [
        "obs_body_region_001",
        "obs_physical_feature_003",
        "obs_physical_feature_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cre_a_limbs_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.limbs",
      "claim": "Mega Zeraora has fully visible left arm, right arm, left leg, and right leg",
      "value": "left arm, right arm, left leg, right leg",
      "supporting_observation_ids": [
        "obs_body_region_002",
        "obs_body_region_003",
        "obs_body_region_004",
        "obs_body_region_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cre_a_markings_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.markings",
      "claim": "Mega Zeraora has yellow lightning bolt markings and blue markings on limbs",
      "value": "yellow lightning bolt markings, blue markings on arms and legs",
      "supporting_observation_ids": [
        "obs_physical_feature_001",
        "obs_physical_feature_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cre_a_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_and_orientation.pose_orientation",
      "claim": "Mega Zeraora is crouching and diagonally tilted from left rear to right front",
      "value": "crouching, diagonal tilt",
      "supporting_observation_ids": [
        "obs_orientation_001",
        "obs_pose_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cre_a_facial_expression_001",
      "module": "creature_anatomy",
      "field_path": "facial_features.mouth",
      "claim": "Mega Zeraora has a closed mouth with",
      "value": "closed mouth",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_cre_a_facial_expression_002",
      "module": "creature_anatomy",
      "field_path": "facial_features.eyes",
      "claim": "Mega Zeraora has sharp blue eyes",
      "value": "blue eyes with sharp pupil detail",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_abstract_bg_001",
      "module": "environment",
      "field_path": "background",
      "claim": "Background is magenta and purple abstract pattern",
      "value": "magenta and purple abstract background",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "objects",
      "claim": "Yellow lightning bolt shaped object behind the subject",
      "value": "yellow lightning bolt shape behind subject",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_palette_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "Card palette includes black, yellow, blue, magenta, and purple",
      "value": "black, yellow, blue, magenta, purple",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_lighting_001",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "Strong lighting with bright highlights and shadows on subject",
      "value": "lighting with bright highlights and shadows",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "composition_style",
      "claim": "Close-up diagonal composition with subject angled front right",
      "value": "close-up diagonal composition with front right angle",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text in Japanese 'メガゼラオラeX' visible at top center",
      "value": "メガゼラオラeX",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP 270 text visible at top right",
      "value": "270",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_energy_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Lightning Energy symbol visible next to HP",
      "value": "lightning",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text 'Illus. Eban Graphics' visible at bottom left",
      "value": "Illus. Eban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol 'J M5' visible near bottom left",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number '096/081 SR' visible at bottom left",
      "value": "096/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "Copyright text contains '©2026 Pokémon/Nintendo/Creatures/GAME FREAK' visible at bottom",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 0.99,
      "anatomy": [
        "head",
        "left arm",
        "left leg",
        "right arm",
        "right leg"
      ],
      "physical_features": [
        "blue markings on arms and legs",
        "light blue ear tips",
        "yellow lightning bolt markings",
        "yellow triangular ears"
      ],
      "pose": [
        "crouching"
      ],
      "orientation": "forward-right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "blue eyes with sharp pupil detail",
        "mouth": "closed mouth",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
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
      "obs_body_region_001",
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_body_region_004",
      "obs_body_region_005",
      "obs_eyes_001",
      "obs_mouth_001",
      "obs_orientation_001",
      "obs_physical_feature_001",
      "obs_physical_feature_002",
      "obs_physical_feature_003",
      "obs_physical_feature_004",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_object_001"
    ],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "cannot_determine",
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
      "label": "yellow lightning bolt shape behind subject",
      "normalized_label": "yellow lightning bolt shape behind subject",
      "object_type": "abstract shape",
      "colors": [
        "yellow"
      ],
      "material_appearance": [],
      "location": "background behind subject",
      "count_reference": "count_not_visible",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "magenta",
      "purple",
      "yellow"
    ],
    "lighting": [
      "bright highlights",
      "shadows",
      "strong lighting"
    ],
    "shadows": [
      "visible on subject"
    ],
    "highlights": [
      "bright highlights on edges"
    ],
    "composition": [
      "close-up",
      "diagonal tilt",
      "subject angled front right"
    ],
    "camera_angle": "slightly above eye level",
    "framing": "subject centered, filling frame",
    "cropping": [
      "fully visible subject"
    ],
    "depth": "good depth with foreground subject and background elements",
    "motion_cues": [
      "crouching forward pose implies action readiness"
    ],
    "motifs": [
      "lightning bolt shapes",
      "sharp jagged edges"
    ],
    "repeated_shapes": [
      "lightning bolts",
      "triangular ears"
    ],
    "style_cues": [
      "bold color blocking"
    ],
    "supporting_observation_ids": [
      "obs_composition_001",
      "obs_lighting_001",
      "obs_object_001",
      "obs_palette_001"
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
        "fact_subj_mega_zeraora_001"
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
        "fact_cre_a_facial_expression_001",
        "fact_cre_a_facial_expression_002",
        "fact_cre_a_head_001",
        "fact_cre_a_limbs_001",
        "fact_cre_a_markings_001",
        "fact_cre_a_pose_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head",
          "visibility": "fully_visible",
          "colors": [],
          "details": [
            "light blue ear tips",
            "yellow triangular ears"
          ],
          "supporting_observation_ids": [
            "obs_body_region_001",
            "obs_physical_feature_003",
            "obs_physical_feature_004"
          ],
          "confidence": 0.99
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "limbs",
          "feature": "left arm",
          "visibility": "fully_visible",
          "colors": [
            "blue",
            "yellow"
          ],
          "details": [
            "blue markings on arms and legs",
            "yellow lightning bolt markings"
          ],
          "supporting_observation_ids": [
            "obs_body_region_002",
            "obs_physical_feature_001",
            "obs_physical_feature_002"
          ],
          "confidence": 0.98
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "crouching"
          ],
          "orientation": "forward-right",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_orientation_001",
            "obs_pose_001"
          ],
          "confidence": 0.97
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
      "fact_ids": [
        "fact_obj_001"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_abstract_bg_001"
      ],
      "observation_ids": [
        "obs_background_001"
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
      "fact_ids": [
        "fact_color_palette_001",
        "fact_lighting_001"
      ],
      "observation_ids": [
        "obs_lighting_001",
        "obs_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_collector_number_001",
        "fact_ui_copyright_001",
        "fact_ui_energy_001",
        "fact_ui_hp_001",
        "fact_ui_illustrator_001",
        "fact_ui_name_001",
        "fact_ui_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_001"
      ],
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
        "yellow lightning bolt markings",
        "magenta background",
        "blue eyes",
        "crouching pose",
        "lightning bolt shape background"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "action",
      "label": "crouching",
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
          "crouching pose"
        ],
        "body_position": [
          "crouching"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [],
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
      "term": "yellow lightning bolt markings",
      "supporting_observation_ids": [
        "obs_physical_feature_001"
      ]
    },
    {
      "term": "magenta background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "blue eyes",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ]
    },
    {
      "term": "crouching pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "lightning bolt shape background",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "crouching",
        "source_observation_ids": [
          "obs_orientation_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_orientation_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_orientation_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_body_region_002",
          "obs_body_region_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_object_001",
          "obs_physical_feature_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_body_region_003",
          "obs_body_region_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upward orientation",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-114 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0100632`
- Artwork observations: `9`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating. Counts: dark tendrils: 6-9.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary_subject | 0.99 |
| body | body | creature_anatomy | foreground | primary_subject | 0.99 |
| head with a prominent central horn-like structure | head with horn | creature_anatomy | foreground | primary_subject | 0.98 |
| glowing magenta eyes | glowing magenta eyes | creature_anatomy | foreground | primary_subject | 0.97 |
| multiple dark tendrils or arms spreading outwards | dark tendrils | creature_anatomy | foreground | primary_subject | 0.98 |
| claw-like appendages at the ends of some tendrils | claw-like appendages | creature_anatomy | foreground | primary_subject | 0.95 |
| dark rocky texture on body and tendrils | dark rocky texture | creature_anatomy | foreground | primary_subject | 0.96 |
| dark, chaotic, nightmarish background with winding shapes and subtle greenish spots | dark chaotic background | environment | background | background | 0.95 |
| predominantly black and dark gray palette with some green accents and magenta luminous points | black gray green magenta palette | color_and_light | foreground_and_background | primary | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese 'メガダークライ ex' | card_ui_text | top_left | fully_visible | 0.99 |
| HP 280 in top right corner | card_ui_text | top_right | fully_visible | 0.99 |
| Dark type symbol next to HP | card_ui_symbol | top_right | fully_visible | 0.99 |
| collector number 114/081 | collector_number | bottom_left | fully_visible | 0.99 |
| set symbol near collector number | set_symbol | bottom_left | fully_visible | 0.99 |
| illustrator credit 'Illus. AKIRA EGAWA' near bottom left | illustrator_text | bottom_left | fully_visible | 0.98 |
| attack text in Japanese below artwork | card_ui_text | middle_bottom | fully_visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_body_001 | creature_anatomy | body texture and color | obs_creature_anatomy_001, obs_creature_anatomy_006 | 0.96 |
| fact_creature_anatomy_head_001 | creature_anatomy | head anatomy | obs_creature_anatomy_002 | 0.98 |
| fact_creature_anatomy_eyes_001 | creature_anatomy | eye color and visibility | obs_creature_anatomy_003 | 0.97 |
| fact_creature_anatomy_appendages_001 | creature_anatomy | appendage description | obs_creature_anatomy_004, obs_creature_anatomy_005 | 0.96 |
| fact_creature_anatomy_pose_001 | creature_anatomy | pose | obs_creature_anatomy_004 | 0.95 |
| fact_environment_001 | environment | background type | obs_environment_001 | 0.95 |
| fact_color_and_light_001 | color_and_light | color palette | obs_color_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_text_name_001 | 0.99 |
| fact_card_ui_hp_001 | HP text | obs_card_ui_text_hp_001 | 0.99 |
| fact_card_ui_set_symbol_001 | set symbol | obs_card_ui_symbol_set_001 | 0.99 |
| fact_card_ui_collectornumber_001 | collector number | obs_card_ui_text_number_001 | 0.99 |
| fact_card_ui_illustrator_001 | illustrator credit text | obs_card_ui_text_illustrator_001 | 0.98 |
| fact_card_ui_attack_text_001 | attack text presence | obs_card_ui_text_attack_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_text_001",
    "fact_card_ui_collectornumber_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_symbol_001"
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
| subjects | complete | none | high |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | likely_complete | medium | medium |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | likely_complete | medium | medium |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_occlusion | medium | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | state | floating | obs_subject_001 | obs_creature_anatomy_004 | tendrils spread diagonally outward floating static dark chaotic background | 0.95 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| dark tendrils | estimated_range | 6-9 | obs_creature_anatomy_004 | 0.9 |

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
| dark tendrils | obs_creature_anatomy_004 |
| glowing magenta eyes | obs_creature_anatomy_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| floating | obs_creature_anatomy_004, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_anatomy_003 | deterministic_rule | 0.97 |
| tendrils spread diagonally | obs_subject_001 | deterministic_rule | 0.99 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating. Counts: dark tendrils: 6-9.
- Quality flags: `potential_module_incomplete_or_low_evidence`
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
      "salience": "primary_subject",
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
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "head with a prominent central horn-like structure",
      "normalized_label": "head with horn",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "glowing magenta eyes",
      "normalized_label": "glowing magenta eyes",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "multiple dark tendrils or arms spreading outwards",
      "normalized_label": "dark tendrils",
      "scene_layer": "foreground",
      "frame_position": "center_mid",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "claw-like appendages at the ends of some tendrils",
      "normalized_label": "claw-like appendages",
      "scene_layer": "foreground",
      "frame_position": "center_mid",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "dark rocky texture on body and tendrils",
      "normalized_label": "dark rocky texture",
      "scene_layer": "foreground",
      "frame_position": "full_center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark, chaotic, nightmarish background with winding shapes and subtle greenish spots",
      "normalized_label": "dark chaotic background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color_and_light",
      "label": "predominantly black and dark gray palette with some green accents and magenta luminous points",
      "normalized_label": "black gray green magenta palette",
      "scene_layer": "foreground_and_background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese 'メガダークライ ex'",
      "normalized_label": "card name text Japanese 'メガダークライ ex'",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_hp_001",
      "kind": "card_ui_text",
      "label": "HP 280 in top right corner",
      "normalized_label": "HP 280",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_type_001",
      "kind": "card_ui_symbol",
      "label": "Dark type symbol next to HP",
      "normalized_label": "dark type symbol",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_number_001",
      "kind": "collector_number",
      "label": "collector number 114/081",
      "normalized_label": "collector number 114/081",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_set_001",
      "kind": "set_symbol",
      "label": "set symbol near collector number",
      "normalized_label": "set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator credit 'Illus. AKIRA EGAWA' near bottom left",
      "normalized_label": "illustrator AKIRA EGAWA",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_attack_001",
      "kind": "card_ui_text",
      "label": "attack text in Japanese below artwork",
      "normalized_label": "attack text japanese",
      "scene_layer": "ui",
      "frame_position": "middle_bottom",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "subject identity",
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
      "field_path": "body",
      "claim": "body texture and color",
      "value": "dark rocky texture in shades of black and gray",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001",
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_head_001",
      "module": "creature_anatomy",
      "field_path": "head",
      "claim": "head anatomy",
      "value": "head with prominent central horn-like structure",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_eyes_001",
      "module": "creature_anatomy",
      "field_path": "eyes",
      "claim": "eye color and visibility",
      "value": "glowing magenta eyes visible on head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_appendages_001",
      "module": "creature_anatomy",
      "field_path": "appendages",
      "claim": "appendage description",
      "value": "multiple dark tendrils with claw-like ends",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "pose",
      "value": "floating or hovering with tendrils spread diagonally",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background type",
      "value": "dark chaotic nightmarish background with greenish spots",
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
      "claim": "color palette",
      "value": "predominantly black, dark gray, green accents, magenta highlights",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガダークライ ex",
      "supporting_observation_ids": [
        "obs_card_ui_text_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_text_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "visible near collector number",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_set_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collectornumber_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "114/081",
      "supporting_observation_ids": [
        "obs_card_ui_text_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator credit text",
      "value": "Illus. AKIRA EGAWA",
      "supporting_observation_ids": [
        "obs_card_ui_text_illustrator_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_text_description",
      "claim": "attack text presence",
      "value": "attack text in Japanese visible below artwork",
      "supporting_observation_ids": [
        "obs_card_ui_text_attack_001"
      ],
      "confidence": 0.98,
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
        "body",
        "dark tendrils with claws",
        "glowing magenta eyes",
        "head with horn"
      ],
      "physical_features": [
        "dark rocky texture",
        "glowing eyes"
      ],
      "pose": [
        "floating",
        "tendrils spread diagonally"
      ],
      "orientation": "upright",
      "action_state": [
        "hovering",
        "static"
      ],
      "facial_evidence": {
        "eyes": "glowing magenta",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "dark gray",
        "green accents",
        "magenta"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_tendrils_001",
      "normalized_label": "dark tendrils",
      "count_type": "estimated_range",
      "exact_count": 0,
      "estimated_min": 6,
      "estimated_max": 9,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "scene_layer": "foreground",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "dark chaotic background"
    ],
    "indoor_outdoor": "not_applicable",
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
      "dark gray",
      "green",
      "magenta"
    ],
    "lighting": [
      "dark shadows",
      "glowing eyes"
    ],
    "shadows": [
      "strong shadows on tendrils and body"
    ],
    "highlights": [
      "magenta eye glow",
      "white highlights on horn and body edges"
    ],
    "composition": [
      "central frontal composition",
      "tendrils spread diagonally outward"
    ],
    "camera_angle": "frontal",
    "framing": "tight framing on subject",
    "cropping": [
      "full body visible",
      "no significant cropping"
    ],
    "depth": "moderate depth with foreground subject and background",
    "motion_cues": [],
    "motifs": [
      "dark theme",
      "tentacle/tendril motif"
    ],
    "repeated_shapes": [
      "winding tendril shapes"
    ],
    "style_cues": [
      "detailed digital painting",
      "high contrast"
    ],
    "supporting_observation_ids": [
      "obs_color_001",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_006",
      "obs_environment_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "observed",
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
        "fact_creature_anatomy_appendages_001",
        "fact_creature_anatomy_body_001",
        "fact_creature_anatomy_eyes_001",
        "fact_creature_anatomy_head_001",
        "fact_creature_anatomy_pose_001"
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
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_006",
        "obs_environment_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_and_light_001"
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
        "fact_card_ui_attack_text_001",
        "fact_card_ui_collectornumber_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_symbol_001"
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
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_tendrils_001"
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
        "dark tendrils",
        "glowing magenta eyes"
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
      "review_status": "likely_complete",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "counts",
      "review_status": "likely_complete",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "review_status": "partial_due_to_occlusion",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "tendrils spread diagonally outward"
        ],
        "body_position": [
          "floating"
        ],
        "motion_state": [
          "static"
        ],
        "environment": [
          "dark chaotic background"
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
      "term": "dark tendrils",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "glowing magenta eyes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_anatomy_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "tendrils spread diagonally",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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

### GV-PK-JPN-M5-099 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.94`
- Cost USD: `0.011406`
- Artwork observations: `13`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: green yellow energy background, dark shadowy environment, glowing flame energy background. Semantic facts: floating. Counts: tail appendages: 4.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai Pokemon | mega darkrai | scene_subject | foreground | primary | 0.99 |
| Mega Darkrai body | body | object | foreground | primary | 0.98 |
| dark gray and white color | dark gray and white | color | foreground | primary | 0.99 |
| pink eye with slit pupil | pink eye | object | foreground | primary | 0.98 |
| white plume on head | white plume | object | foreground | primary | 0.97 |
| four legs with sharp claws | legs with claws | object | foreground | primary | 0.96 |
| four black curved-tail-like appendages | four tail appendages | object | foreground | primary | 0.95 |
| floating diagonal orientation | floating diagonal | pose_orientation | foreground | primary | 0.94 |
| background with green and yellow flame/energy forms | green yellow energy background | environment | background | medium | 0.9 |
| dark shadowy thematic environment | dark shadowy environment | environment | background | medium | 0.88 |
| centered subject with diagonal pose | centered diagonal composition | composition | foreground | primary | 0.93 |
| color palette dominated by dark gray, black, white, and neon green/yellow accents | dark gray black white neon green yellow palette | color_and_light | foreground and background | primary | 0.92 |
| energy-like glowing background flames | glowing flame energy background | visual_effects | background | medium | 0.91 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese "メガダークライ EX" | card_ui_text | top center | visible | 0.99 |
| HP 280 | hp_text | top right | visible | 0.99 |
| dark type energy symbol | card_ui_symbol | top right near HP | visible | 0.98 |
| attack text in Japanese below artwork | card_ui_text | mid lower | visible | 0.95 |
| illustrator name "5ban Graphics" | illustrator_text | bottom left | visible | 0.98 |
| card number 099/081 SR | collector_number | bottom left | visible | 0.99 |
| set symbol with JPN M5 code | set_symbol | bottom left | visible | 0.96 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | The main scene subject is Mega Darkrai | obs_scene_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | Mega Darkrai body is dark gray and black with white plume | obs_creature_body_001, obs_creature_color_001, obs_creature_head_feature_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | Mega Darkrai has pink eyes with slit pupils | obs_creature_eye_001 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | Mega Darkrai has four legs with sharp claws | obs_creature_limbs_001 | 0.96 |
| fact_creature_anatomy_004 | creature_anatomy | Mega Darkrai has four black curved tail appendages | obs_creature_tail_001 | 0.95 |
| fact_creature_anatomy_005 | creature_anatomy | Mega Darkrai is floating in a diagonal orientation | obs_pose_001 | 0.94 |
| fact_environment_001 | environment | Background has green and yellow flame-like energy forms | obs_environment_001 | 0.9 |
| fact_environment_002 | environment | Background has dark shadowy thematic elements | obs_environment_002 | 0.88 |
| fact_composition_001 | composition | The subject is centered with diagonal pose | obs_composition_001 | 0.93 |
| fact_color_and_light_001 | color_and_light | Color palette dominated by dark gray, black, white, neon green and yellow accents | obs_color_palette_001 | 0.92 |
| fact_visual_effects_001 | visual_effects | Background includes glowing flame-like energy effects | obs_visual_effects_001 | 0.91 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | Card name text in Japanese: メガダークライ EX | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | HP text is 280 | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_and_print_markers_003 | Dark type energy symbol is visible | obs_card_ui_energy_001 | 0.98 |
| fact_card_ui_and_print_markers_004 | Attack text present in Japanese below artwork | obs_card_ui_attack_001 | 0.95 |
| fact_card_ui_and_print_markers_005 | Illustrator text is '5ban Graphics' | obs_card_ui_illustrator_001 | 0.98 |
| fact_card_ui_and_print_markers_006 | Card collector number is 099/081 SR | obs_card_ui_collector_001 | 0.99 |
| fact_card_ui_and_print_markers_007 | Set symbol with code JPN M5 is visible | obs_card_ui_set_001 | 0.96 |

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
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_001"
  ],
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_visual_001 | state | floating | obs_scene_subject_001 | obs_pose_001 | floating diagonal floating | 0.94 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| tail appendages | exact | 4 | obs_creature_tail_001 | 0.95 |

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
| floating | obs_pose_001, obs_scene_subject_001 |
| dark shadowy background | obs_environment_002 |
| green yellow flame energy | obs_environment_001, obs_visual_effects_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_composition_001 | deterministic_rule | 0.93 |
| diagonal composition | obs_composition_001, obs_pose_001 | deterministic_rule | 0.94 |
| diagonal orientation | obs_pose_001, obs_scene_subject_001 | deterministic_rule | 0.99 |
| flame | obs_visual_effects_001 | deterministic_rule | 0.92 |
| floating | obs_pose_001, obs_scene_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_visual_effects_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: green yellow energy background, dark shadowy environment, glowing flame energy background. Semantic facts: floating. Counts: tail appendages: 4.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_scene_subject_001",
      "kind": "scene_subject",
      "label": "Mega Darkrai Pokemon",
      "normalized_label": "mega darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "object",
      "label": "Mega Darkrai body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_color_001",
      "kind": "color",
      "label": "dark gray and white color",
      "normalized_label": "dark gray and white",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_eye_001",
      "kind": "object",
      "label": "pink eye with slit pupil",
      "normalized_label": "pink eye",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_head_feature_001",
      "kind": "object",
      "label": "white plume on head",
      "normalized_label": "white plume",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_limbs_001",
      "kind": "object",
      "label": "four legs with sharp claws",
      "normalized_label": "legs with claws",
      "scene_layer": "foreground",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_tail_001",
      "kind": "object",
      "label": "four black curved-tail-like appendages",
      "normalized_label": "four tail appendages",
      "scene_layer": "foreground",
      "frame_position": "rear",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose_orientation",
      "label": "floating diagonal orientation",
      "normalized_label": "floating diagonal",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "background with green and yellow flame/energy forms",
      "normalized_label": "green yellow energy background",
      "scene_layer": "background",
      "frame_position": "full frame",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "dark shadowy thematic environment",
      "normalized_label": "dark shadowy environment",
      "scene_layer": "background",
      "frame_position": "full frame",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.88,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "centered subject with diagonal pose",
      "normalized_label": "centered diagonal composition",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_palette_001",
      "kind": "color_and_light",
      "label": "color palette dominated by dark gray, black, white, and neon green/yellow accents",
      "normalized_label": "dark gray black white neon green yellow palette",
      "scene_layer": "foreground and background",
      "frame_position": "full frame",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_effects_001",
      "kind": "visual_effects",
      "label": "energy-like glowing background flames",
      "normalized_label": "glowing flame energy background",
      "scene_layer": "background",
      "frame_position": "surrounding subject",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese \"メガダークライ EX\"",
      "normalized_label": "card name japanese megadarkrai ex",
      "scene_layer": "ui",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 280",
      "normalized_label": "hp 280",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "card_ui_symbol",
      "label": "dark type energy symbol",
      "normalized_label": "dark energy symbol",
      "scene_layer": "ui",
      "frame_position": "top right near HP",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_001",
      "kind": "card_ui_text",
      "label": "attack text in Japanese below artwork",
      "normalized_label": "attack text japanese",
      "scene_layer": "ui",
      "frame_position": "mid lower",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator name \"5ban Graphics\"",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_001",
      "kind": "collector_number",
      "label": "card number 099/081 SR",
      "normalized_label": "card number 099 081 sr",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "set_symbol",
      "label": "set symbol with JPN M5 code",
      "normalized_label": "set symbol jpn m5",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "The main scene subject is Mega Darkrai",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_scene_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.body",
      "claim": "Mega Darkrai body is dark gray and black with white plume",
      "value": "dark gray, black and white plume",
      "supporting_observation_ids": [
        "obs_creature_body_001",
        "obs_creature_color_001",
        "obs_creature_head_feature_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "physical_features.eye",
      "claim": "Mega Darkrai has pink eyes with slit pupils",
      "value": "pink slit pupils",
      "supporting_observation_ids": [
        "obs_creature_eye_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "physical_features.limbs",
      "claim": "Mega Darkrai has four legs with sharp claws",
      "value": "four legs with claws",
      "supporting_observation_ids": [
        "obs_creature_limbs_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.tail_appendages",
      "claim": "Mega Darkrai has four black curved tail appendages",
      "value": "four tail appendages",
      "supporting_observation_ids": [
        "obs_creature_tail_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "Mega Darkrai is floating in a diagonal orientation",
      "value": "floating diagonal",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "Background has green and yellow flame-like energy forms",
      "value": "green and yellow flame energy background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "background",
      "claim": "Background has dark shadowy thematic elements",
      "value": "dark shadowy environment",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.88,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "subject_position",
      "claim": "The subject is centered with diagonal pose",
      "value": "centered diagonal composition",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "color_palette",
      "claim": "Color palette dominated by dark gray, black, white, neon green and yellow accents",
      "value": "dark gray black white neon green yellow palette",
      "supporting_observation_ids": [
        "obs_color_palette_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effects_001",
      "module": "visual_effects",
      "field_path": "energy_effects",
      "claim": "Background includes glowing flame-like energy effects",
      "value": "glowing flame energy background",
      "supporting_observation_ids": [
        "obs_visual_effects_001"
      ],
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text in Japanese: メガダークライ EX",
      "value": "メガダークライ EX",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text is 280",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Dark type energy symbol is visible",
      "value": "dark energy",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "Attack text present in Japanese below artwork",
      "value": "attack text japanese",
      "supporting_observation_ids": [
        "obs_card_ui_attack_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text is '5ban Graphics'",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Card collector number is 099/081 SR",
      "value": "099/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_collector_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol with code JPN M5 is visible",
      "value": "JPN M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_scene_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.99,
      "anatomy": [
        "dark gray body",
        "four legs with claws",
        "four tail appendages",
        "pink eyes",
        "white head plume"
      ],
      "physical_features": [
        "clawed feet",
        "dark body color",
        "multiple tail appendages",
        "pink slit eyes",
        "white plume on head"
      ],
      "pose": [
        "diagonal orientation",
        "floating"
      ],
      "orientation": "diagonal",
      "action_state": [
        "floating"
      ],
      "facial_evidence": {
        "eyes": "visible pink slit eyes",
        "mouth": "not clearly visible",
        "eyebrows": "not visible",
        "face_position": "centered and visible",
        "other_visible_evidence": [
          "white plume"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "dark gray",
        "neon green background accents",
        "pink",
        "white"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_tail_appendages_001",
      "normalized_label": "tail appendages",
      "count_type": "exact",
      "exact_count": 4,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_tail_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_composition_001",
      "obs_creature_body_001",
      "obs_creature_color_001",
      "obs_creature_eye_001",
      "obs_creature_head_feature_001",
      "obs_creature_limbs_001",
      "obs_creature_tail_001",
      "obs_pose_001",
      "obs_scene_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_visual_effects_001"
    ]
  },
  "environment": {
    "setting": [
      "dark shadowy background with energy flames"
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
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark gray",
      "neon green",
      "white",
      "yellow"
    ],
    "lighting": [
      "glowing background",
      "highlight on white plume"
    ],
    "shadows": [
      "shadowed body parts on central subject"
    ],
    "highlights": [
      "bright white plume"
    ],
    "composition": [
      "centered subject",
      "diagonal pose"
    ],
    "camera_angle": "slightly tilted",
    "framing": "front centered",
    "cropping": [],
    "depth": "shallow depth with focus on subject",
    "motion_cues": [
      "floating"
    ],
    "motifs": [
      "energy flame motif"
    ],
    "repeated_shapes": [
      "curved tail appendages"
    ],
    "style_cues": [
      "dark thematic style"
    ],
    "supporting_observation_ids": [
      "obs_color_palette_001",
      "obs_composition_001",
      "obs_creature_body_001",
      "obs_creature_tail_001",
      "obs_visual_effects_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "observed",
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
      "fact_ids": [
        "fact_subject_001"
      ],
      "scene_subject_observation_ids": [
        "obs_scene_subject_001"
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
          "subject_observation_id": "obs_scene_subject_001",
          "region": "body",
          "feature": "dark gray and black color",
          "visibility": "visible",
          "colors": [
            "black",
            "dark gray"
          ],
          "details": [
            "primary body colors"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_001",
            "obs_creature_color_001"
          ],
          "confidence": 0.98
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_scene_subject_001",
          "region": "head",
          "feature": "white plume",
          "visibility": "visible",
          "colors": [
            "white"
          ],
          "details": [
            "head plume"
          ],
          "supporting_observation_ids": [
            "obs_creature_head_feature_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_scene_subject_001",
          "region": "eyes",
          "feature": "pink slit pupils",
          "visibility": "visible",
          "colors": [
            "pink"
          ],
          "details": [
            "eye shape slit"
          ],
          "supporting_observation_ids": [
            "obs_creature_eye_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_scene_subject_001",
          "region": "legs",
          "feature": "four legs with claws",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "clawed feet"
          ],
          "supporting_observation_ids": [
            "obs_creature_limbs_001"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_scene_subject_001",
          "region": "tail",
          "feature": "four curved tail appendages",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "four tails"
          ],
          "supporting_observation_ids": [
            "obs_creature_tail_001"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_scene_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "diagonal",
          "action_state": [
            "floating"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.94
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
        "fact_environment_001",
        "fact_environment_002"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
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
      "fact_ids": [
        "fact_color_and_light_001"
      ],
      "observation_ids": [
        "obs_color_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_visual_effects_001"
      ],
      "observation_ids": [
        "obs_visual_effects_001"
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
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_001"
      ],
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
        "count_tail_appendages_001"
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
        "floating",
        "dark shadowy background",
        "green yellow flame energy"
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
      "review_status": "complete",
      "omission_risk": "none",
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
      "review_status": "none_visible",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_visual_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_scene_subject_001",
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
      "confidence": 0.94,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating",
      "supporting_observation_ids": [
        "obs_pose_001",
        "obs_scene_subject_001"
      ]
    },
    {
      "term": "dark shadowy background",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "green yellow flame energy",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_visual_effects_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_scene_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_visual_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_scene_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_visual_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-097 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0106432`
- Artwork observations: `12`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, body, blue flame, blue flame, blue flame, lantern body orb, lantern crown, arms. Semantic facts: floating. Counts: arms: 4.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | Mega Chandelure | scene_subject | foreground | high | 0.99 |
| body | body | creature_anatomy | foreground | high | 0.99 |
| blue flame on top center | blue flame | creature_anatomy | foreground | medium | 0.98 |
| blue flame on left arm tip | blue flame | creature_anatomy | foreground | medium | 0.98 |
| blue flame on right arm tip | blue flame | creature_anatomy | foreground | medium | 0.98 |
| lantern body central orb | lantern body orb | creature_anatomy | foreground | high | 0.99 |
| lantern crown upper black and yellow structure | lantern crown | creature_anatomy | foreground | high | 0.99 |
| four curved black arms with spiral shapes | arms | creature_anatomy | foreground | high | 0.99 |
| face with blue eyes and mouth | face | creature_anatomy | foreground | high | 0.98 |
| purple, blue, black, yellow, gold notable colors | color palette | visual_design | foreground | high | 0.99 |
| floating diagonal pose | floating diagonal pose | creature_anatomy | foreground | high | 0.97 |
| blue and pink abstract swirling background with symbols | abstract background | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese with 'ex' suffix | card_ui_text | top-left | visible | 0.98 |
| HP 350 in top right | card_ui_text | top-right | visible | 0.98 |
| Psychic energy symbol at top left | card_ui_symbol | top-left | visible | 0.99 |
| Attack text in Japanese with damage '130+' | card_ui_text | middle | visible | 0.95 |
| Weakness symbol at bottom left | card_ui_symbol | bottom-left | visible | 0.9 |
| Resistance symbol '-30' next to weakness | card_ui_symbol | bottom-left | visible | 0.9 |
| Retreat cost of two colorless energies bottom-right | card_ui_symbol | bottom-right | visible | 0.9 |
| Illustrator text '5ban Graphics' at bottom left | illustrator_text | bottom-left | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | visible scene subject is Mega Chandelure | obs_subject_001 | 0.99 |
| fact_creature_body_001 | creature_anatomy | body is a lantern-type orb with black crown and yellow/gold accents | obs_body_001, obs_lantern_body_001, obs_lantern_crown_001 | 0.99 |
| fact_creature_arms_001 | creature_anatomy | four curved black arms with spiral shapes each tipped with blue flames | obs_arms_001, obs_flame_001, obs_flame_002, obs_flame_003 | 0.99 |
| fact_creature_face_001 | creature_anatomy | face visible with blue eyes and mouth | obs_face_001 | 0.98 |
| fact_creature_pose_001 | creature_anatomy | Mega Chandelure is floating diagonally upright | obs_position_001 | 0.97 |
| fact_environment_001 | environment | background is abstract with blue and pink swirling shapes and symbols | obs_background_001 | 0.95 |
| fact_visual_design_palette_001 | color_and_light | palette includes purple, blue, black, yellow, and gold | obs_color_palette_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text visible including 'ex' suffix | obs_card_name_UI_001 | 0.98 |
| fact_card_ui_hp_001 | HP text visible as 350 | obs_hp_UI_001 | 0.98 |
| fact_card_ui_energy_001 | Psychic energy symbol visible at top left | obs_energy_UI_001 | 0.99 |
| fact_card_ui_attack_001 | attack text visible with damage 130+ | obs_attack_UI_001 | 0.95 |
| fact_card_ui_weakness_001 | weakness symbol visible with x2 multiplier | obs_weakness_UI_001 | 0.9 |
| fact_card_ui_resistance_001 | resistance symbol visible with -30 | obs_resistance_UI_001 | 0.9 |
| fact_card_ui_retreat_001 | retreat cost symbol visible with two colorless energy | obs_retreat_cost_UI_001 | 0.9 |
| fact_card_ui_illustrator_001 | illustrator text visible as '5ban Graphics' | obs_illustrator_UI_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_001",
    "fact_card_ui_energy_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_resistance_001",
    "fact_card_ui_retreat_001",
    "fact_card_ui_weakness_001"
  ],
  "name_text_observation_ids": [
    "obs_card_name_UI_001"
  ],
  "hp_text_observation_ids": [
    "obs_hp_UI_001"
  ],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_energy_UI_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_illustrator_UI_001"
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
| composition | likely_complete | low | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | state | floating | obs_subject_001 | obs_position_001 | floating diagonal pose stationary | 0.97 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| arms | exact | 4 | obs_arms_001 | 0.99 |

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
| floating pose | obs_position_001 |
| lantern body | obs_lantern_body_001 |
| blue flames | obs_flame_001, obs_flame_002, obs_flame_003 |
| purple and black color palette | obs_color_palette_001 |
| abstract background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_lantern_body_001 | deterministic_rule | 0.99 |
| diagonal composition | obs_position_001 | deterministic_rule | 0.97 |
| diagonal orientation | obs_position_001, obs_subject_001 | deterministic_rule | 0.99 |
| flame | obs_flame_001, obs_flame_002, obs_flame_003 | deterministic_rule | 0.98 |
| floating | obs_position_001, obs_subject_001 | deterministic_rule | 0.99 |
| spiral motif | obs_arms_001 | deterministic_rule | 0.92 |
| upright diagonal orientation | obs_position_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, body, blue flame, blue flame, blue flame, lantern body orb, lantern crown, arms. Semantic facts: floating. Counts: arms: 4.
- Quality flags: `potential_speculative_setting_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure",
      "normalized_label": "Mega Chandelure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_001",
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
      "observation_id": "obs_flame_001",
      "kind": "creature_anatomy",
      "label": "blue flame on top center",
      "normalized_label": "blue flame",
      "scene_layer": "foreground",
      "frame_position": "center-top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_flame_002",
      "kind": "creature_anatomy",
      "label": "blue flame on left arm tip",
      "normalized_label": "blue flame",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_flame_003",
      "kind": "creature_anatomy",
      "label": "blue flame on right arm tip",
      "normalized_label": "blue flame",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lantern_body_001",
      "kind": "creature_anatomy",
      "label": "lantern body central orb",
      "normalized_label": "lantern body orb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lantern_crown_001",
      "kind": "creature_anatomy",
      "label": "lantern crown upper black and yellow structure",
      "normalized_label": "lantern crown",
      "scene_layer": "foreground",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_arms_001",
      "kind": "creature_anatomy",
      "label": "four curved black arms with spiral shapes",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "creature_anatomy",
      "label": "face with blue eyes and mouth",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "upper-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_palette_001",
      "kind": "visual_design",
      "label": "purple, blue, black, yellow, gold notable colors",
      "normalized_label": "color palette",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_position_001",
      "kind": "creature_anatomy",
      "label": "floating diagonal pose",
      "normalized_label": "floating diagonal pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "blue and pink abstract swirling background with symbols",
      "normalized_label": "abstract background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_UI_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese with 'ex' suffix",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hp_UI_001",
      "kind": "card_ui_text",
      "label": "HP 350 in top right",
      "normalized_label": "hp text",
      "scene_layer": "interface",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_energy_UI_001",
      "kind": "card_ui_symbol",
      "label": "Psychic energy symbol at top left",
      "normalized_label": "psychic energy symbol",
      "scene_layer": "interface",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_attack_UI_001",
      "kind": "card_ui_text",
      "label": "Attack text in Japanese with damage '130+'",
      "normalized_label": "attack damage text",
      "scene_layer": "interface",
      "frame_position": "middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_weakness_UI_001",
      "kind": "card_ui_symbol",
      "label": "Weakness symbol at bottom left",
      "normalized_label": "weakness symbol",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_resistance_UI_001",
      "kind": "card_ui_symbol",
      "label": "Resistance symbol '-30' next to weakness",
      "normalized_label": "resistance symbol",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_retreat_cost_UI_001",
      "kind": "card_ui_symbol",
      "label": "Retreat cost of two colorless energies bottom-right",
      "normalized_label": "retreat cost symbol",
      "scene_layer": "interface",
      "frame_position": "bottom-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_UI_001",
      "kind": "illustrator_text",
      "label": "Illustrator text '5ban Graphics' at bottom left",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "visible scene subject is Mega Chandelure",
      "value": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_body_001",
      "module": "creature_anatomy",
      "field_path": "body",
      "claim": "body is a lantern-type orb with black crown and yellow/gold accents",
      "value": "lantern body with black crown and yellow/gold accents",
      "supporting_observation_ids": [
        "obs_body_001",
        "obs_lantern_body_001",
        "obs_lantern_crown_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_arms_001",
      "module": "creature_anatomy",
      "field_path": "arms",
      "claim": "four curved black arms with spiral shapes each tipped with blue flames",
      "value": "four curved black arms with blue flames on tips",
      "supporting_observation_ids": [
        "obs_arms_001",
        "obs_flame_001",
        "obs_flame_002",
        "obs_flame_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_face_001",
      "module": "creature_anatomy",
      "field_path": "face",
      "claim": "face visible with blue eyes and mouth",
      "value": "face with blue eyes and mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "Mega Chandelure is floating diagonally upright",
      "value": "floating diagonal pose",
      "supporting_observation_ids": [
        "obs_position_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background is abstract with blue and pink swirling shapes and symbols",
      "value": "abstract blue and pink swirling background with symbols",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_palette_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "palette includes purple, blue, black, yellow, and gold",
      "value": "purple, blue, black, yellow, gold",
      "supporting_observation_ids": [
        "obs_color_palette_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible including 'ex' suffix",
      "value": "visible card name text in Japanese with ex suffix",
      "supporting_observation_ids": [
        "obs_card_name_UI_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text visible as 350",
      "value": "HP 350",
      "supporting_observation_ids": [
        "obs_hp_UI_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Psychic energy symbol visible at top left",
      "value": "Psychic energy symbol",
      "supporting_observation_ids": [
        "obs_energy_UI_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack text visible with damage 130+",
      "value": "attack with damage 130+",
      "supporting_observation_ids": [
        "obs_attack_UI_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_weakness_001",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_symbol",
      "claim": "weakness symbol visible with x2 multiplier",
      "value": "weakness x2 symbol",
      "supporting_observation_ids": [
        "obs_weakness_UI_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_resistance_001",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_symbol",
      "claim": "resistance symbol visible with -30",
      "value": "resistance -30 symbol",
      "supporting_observation_ids": [
        "obs_resistance_UI_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_retreat_001",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost_symbol",
      "claim": "retreat cost symbol visible with two colorless energy",
      "value": "retreat cost two colorless energies",
      "supporting_observation_ids": [
        "obs_retreat_cost_UI_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible as '5ban Graphics'",
      "value": "illustrator 5ban Graphics",
      "supporting_observation_ids": [
        "obs_illustrator_UI_001"
      ],
      "confidence": 0.9,
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
        "face with blue eyes and mouth",
        "four blue flames on arm tips",
        "four curved black arms",
        "lantern body orb",
        "lantern crown"
      ],
      "physical_features": [
        "black and yellow pattern",
        "glowing blue flames",
        "purple color"
      ],
      "pose": [
        "diagonal orientation",
        "floating"
      ],
      "orientation": "upright diagonal",
      "action_state": [
        "stationary"
      ],
      "facial_evidence": {
        "eyes": "visible blue eyes",
        "mouth": "visible mouth",
        "eyebrows": "not applicable",
        "face_position": "upper-center",
        "other_visible_evidence": [
          "face with blue glowing eyes",
          "mouth visible"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
        "gold",
        "purple",
        "yellow"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_arms_001",
      "normalized_label": "arms",
      "count_type": "exact",
      "exact_count": 4,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_arms_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_arms_001",
      "obs_body_001",
      "obs_color_palette_001",
      "obs_face_001",
      "obs_flame_001",
      "obs_flame_002",
      "obs_flame_003",
      "obs_lantern_body_001",
      "obs_lantern_crown_001",
      "obs_position_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract background"
    ],
    "indoor_outdoor": "indoor-like fantasy setting",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "indeterminate"
    ],
    "supporting_observation_ids": [
      "obs_background_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "gold",
      "purple",
      "yellow"
    ],
    "lighting": [
      "soft luminous glow on flames and body"
    ],
    "shadows": [
      "subtle shadows on black arms and body"
    ],
    "highlights": [
      "bright yellow/gold highlights on lantern crown"
    ],
    "composition": [
      "centered subject",
      "diagonal pose"
    ],
    "camera_angle": "frontal",
    "framing": "tight framing centered",
    "cropping": [],
    "depth": "shallow depth with clear foreground subject",
    "motion_cues": [],
    "motifs": [
      "flame motifs",
      "spiral shapes on arms"
    ],
    "repeated_shapes": [
      "blue flame shapes"
    ],
    "style_cues": [
      "digital artwork",
      "style"
    ],
    "supporting_observation_ids": [
      "obs_arms_001",
      "obs_background_001",
      "obs_body_001",
      "obs_color_palette_001",
      "obs_position_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "observed",
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
        "fact_creature_arms_001",
        "fact_creature_body_001",
        "fact_creature_face_001",
        "fact_creature_pose_001"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal orientation",
            "floating"
          ],
          "orientation": "upright diagonal",
          "action_state": [
            "stationary"
          ],
          "supporting_observation_ids": [
            "obs_position_001"
          ],
          "confidence": 0.97
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
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_position_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_visual_design_palette_001"
      ],
      "observation_ids": [
        "obs_color_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_001",
        "fact_card_ui_energy_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_resistance_001",
        "fact_card_ui_retreat_001",
        "fact_card_ui_weakness_001"
      ],
      "name_text_observation_ids": [
        "obs_card_name_UI_001"
      ],
      "hp_text_observation_ids": [
        "obs_hp_UI_001"
      ],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_energy_UI_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_illustrator_UI_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_arms_001"
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
        "floating pose",
        "lantern body",
        "blue flames",
        "purple and black color palette",
        "abstract background"
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
      "review_status": "likely_complete",
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
        "obs_position_001"
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
          "diagonal pose"
        ],
        "motion_state": [
          "stationary"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_position_001"
      ]
    },
    {
      "term": "lantern body",
      "supporting_observation_ids": [
        "obs_lantern_body_001"
      ]
    },
    {
      "term": "blue flames",
      "supporting_observation_ids": [
        "obs_flame_001",
        "obs_flame_002",
        "obs_flame_003"
      ]
    },
    {
      "term": "purple and black color palette",
      "supporting_observation_ids": [
        "obs_color_palette_001"
      ]
    },
    {
      "term": "abstract background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_lantern_body_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_position_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_position_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_flame_001",
          "obs_flame_002",
          "obs_flame_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_position_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_arms_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "upright diagonal orientation",
        "source_observation_ids": [
          "obs_position_001",
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

### GV-PK-JPN-M5-063 - メガドリュウズex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0118704`
- Artwork observations: `11`
- Card UI / print-marker observations: `12`
- Card UI module evidence references: `9`
- Derived digest: Fact digest. Scene subjects: メガドリュウズex. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| メガドリュウズex (Mega Steelix EX) | Mega Steelix EX | scene_subject | foreground | prominent | 1 |
| metallic segmented body | metallic segmented body | creature_anatomy | foreground | prominent | 1 |
| gray metallic body | gray metallic body | creature_anatomy | foreground | prominent | 1 |
| red marking on body segment | red marking on body | creature_anatomy | foreground | prominent | 1 |
| half-open eye | half-open eye | creature_anatomy | foreground | prominent | 1 |
| long conical drill head | long conical drill head | creature_anatomy | foreground | prominent | 1 |
| drill tip with yellow and orange stripes | striped drill tip | creature_anatomy | foreground | prominent | 1 |
| floating diagonal pose | floating diagonal pose | creature_anatomy | foreground | prominent | 0.9 |
| red and yellow abstract fragmented background | abstract fragmented background | environment | background | strong | 1 |
| palette includes gray, red, yellow, orange, green | color palette gray red yellow orange green | color_and_light | foreground background | prominent | 1 |
| bright highlights on metallic surfaces | bright metallic highlights | color_and_light | foreground | prominent | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text メガドリュウズex | card_ui_text | top center | visible | 1 |
| HP 340 with steel type symbol | card_ui_text | top right | visible | 1 |
| two steel energy symbols for first attack | card_ui_symbol | attacks section | visible | 1 |
| three steel energy symbols for second attack | card_ui_symbol | attacks section | visible | 1 |
| attack names and damages in Japanese with numeric values 90 and 200+ | card_ui_text | attacks section | visible | 1 |
| fire weakness x2 | card_ui_symbol | bottom left | visible | 1 |
| grass resistance -30 | card_ui_symbol | bottom left | visible | 1 |
| four colorless retreat cost | card_ui_symbol | bottom right | visible | 1 |
| Illus. Keisuke Azuma | illustrator_text | bottom left | visible | 1 |
| set symbol J m5 | set_symbol | bottom left | visible | 1 |
| collector number 063/081 | collector_number | bottom left | visible | 1 |
| rarity mark RR | rarity_mark | bottom left | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | The main Pokemon depicted is メガドリュウズex (Mega Steelix EX) | obs_subject_001 | 1 |
| fact_bodycolor_001 | creature_anatomy | Body is gray metallic | obs_body_color_001 | 1 |
| fact_marking_001 | creature_anatomy | Has red marking on body segment | obs_red_marking_001 | 1 |
| fact_eye_001 | creature_anatomy | Has half-open eye visible | obs_eye_001 | 1 |
| fact_headhorn_001 | creature_anatomy | Has long conical drill head | obs_headhorn_001 | 1 |
| fact_pose_001 | creature_anatomy | Floating diagonal pose | obs_pose_001 | 0.9 |
| fact_background_001 | environment | Background is red and yellow abstract fragmented | obs_background_001 | 1 |
| fact_palette_001 | color_and_light | Palette includes gray, red, yellow, orange, green | obs_palette_001 | 1 |
| fact_lighting_001 | color_and_light | Bright highlights on metallic surfaces | obs_lighting_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_001 | Card name text メガドリュウズex | obs_card_ui_name_001 | 1 |
| fact_card_hp_001 | Card HP is 340 with steel type symbol | obs_card_ui_hp_001 | 1 |
| fact_attack_cost_001 | First attack costs two steel energies | obs_card_ui_energy_cost_001 | 1 |
| fact_attack_cost_002 | Second attack costs three steel energies | obs_card_ui_energy_cost_002 | 1 |
| fact_attack_damage_001 | Attack damage values visible: 90 and 200+ | obs_card_ui_attacks_001 | 1 |
| fact_weakness_001 | Fire weakness x2 | obs_card_ui_weakness_001 | 1 |
| fact_resistance_001 | Grass resistance -30 | obs_card_ui_resistance_001 | 1 |
| fact_retreat_001 | Retreat cost is four colorless energies | obs_card_ui_retreat_001 | 1 |
| fact_illustrator_001 | Illustrator text visible: Illus. Keisuke Azuma | obs_illustrator_001 | 1 |
| fact_set_symbol_001 | Set symbol J m5 visible | obs_set_symbol_001 | 1 |
| fact_collector_number_001 | Collector number 063/081 visible | obs_card_number_001 | 1 |
| fact_rarity_001 | Rarity mark RR visible | obs_rarity_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_attack_cost_001",
    "fact_attack_cost_002",
    "fact_attack_damage_001",
    "fact_card_hp_001",
    "fact_card_name_001",
    "fact_collector_number_001",
    "fact_illustrator_001",
    "fact_rarity_001",
    "fact_resistance_001",
    "fact_retreat_001",
    "fact_set_symbol_001",
    "fact_weakness_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_rarity_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_attacks_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_cost_001",
    "obs_card_ui_energy_cost_002"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_illustrator_001"
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
| composition | complete | low | high |  |
| color_and_light | complete | none | high |  |
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
| semantic_001 | scene_type | floating | obs_subject_001 | obs_pose_001 | half-open eye half-open eye floating diagonal floating abstract fragmented background | 0.9 |

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
| metallic segmented body | obs_body_001 |
| Mega Steelix EX | obs_subject_001 |
| floating diagonal pose | obs_pose_001 |
| red and yellow abstract background | obs_background_001 |
| striped drill tip | obs_drill_tip_001 |
| gray metallic color | obs_body_color_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal | obs_pose_001 | deterministic_rule | 0.9 |
| diagonal composition | obs_pose_001 | deterministic_rule | 0.9 |
| diagonal orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 1 |
| floating | obs_pose_001, obs_subject_001 | deterministic_rule | 1 |
| glowing highlights | obs_lighting_001 | deterministic_rule | 0.92 |
| metal-like appearance | obs_body_001, obs_body_color_001, obs_lighting_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: メガドリュウズex. Semantic facts: floating.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "メガドリュウズex (Mega Steelix EX)",
      "normalized_label": "Mega Steelix EX",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_001",
      "kind": "creature_anatomy",
      "label": "metallic segmented body",
      "normalized_label": "metallic segmented body",
      "scene_layer": "foreground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_color_001",
      "kind": "creature_anatomy",
      "label": "gray metallic body",
      "normalized_label": "gray metallic body",
      "scene_layer": "foreground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_red_marking_001",
      "kind": "creature_anatomy",
      "label": "red marking on body segment",
      "normalized_label": "red marking on body",
      "scene_layer": "foreground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "creature_anatomy",
      "label": "half-open eye",
      "normalized_label": "half-open eye",
      "scene_layer": "foreground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_headhorn_001",
      "kind": "creature_anatomy",
      "label": "long conical drill head",
      "normalized_label": "long conical drill head",
      "scene_layer": "foreground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_drill_tip_001",
      "kind": "creature_anatomy",
      "label": "drill tip with yellow and orange stripes",
      "normalized_label": "striped drill tip",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "floating diagonal pose",
      "normalized_label": "floating diagonal pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "red and yellow abstract fragmented background",
      "normalized_label": "abstract fragmented background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "strong",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_and_light",
      "label": "palette includes gray, red, yellow, orange, green",
      "normalized_label": "color palette gray red yellow orange green",
      "scene_layer": "foreground background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "color_and_light",
      "label": "bright highlights on metallic surfaces",
      "normalized_label": "bright metallic highlights",
      "scene_layer": "foreground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text メガドリュウズex",
      "normalized_label": "card name メガドリュウズex",
      "scene_layer": "card_ui",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP 340 with steel type symbol",
      "normalized_label": "HP 340 steel",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_cost_001",
      "kind": "card_ui_symbol",
      "label": "two steel energy symbols for first attack",
      "normalized_label": "two steel energy cost",
      "scene_layer": "card_ui",
      "frame_position": "attacks section",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_cost_002",
      "kind": "card_ui_symbol",
      "label": "three steel energy symbols for second attack",
      "normalized_label": "three steel energy cost",
      "scene_layer": "card_ui",
      "frame_position": "attacks section",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attacks_001",
      "kind": "card_ui_text",
      "label": "attack names and damages in Japanese with numeric values 90 and 200+",
      "normalized_label": "attacks 90 and 200+ damage",
      "scene_layer": "card_ui",
      "frame_position": "attacks section",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_001",
      "kind": "card_ui_symbol",
      "label": "fire weakness x2",
      "normalized_label": "fire weakness x2",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_resistance_001",
      "kind": "card_ui_symbol",
      "label": "grass resistance -30",
      "normalized_label": "grass resistance -30",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_retreat_001",
      "kind": "card_ui_symbol",
      "label": "four colorless retreat cost",
      "normalized_label": "colorless retreat cost 4",
      "scene_layer": "card_ui",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. Keisuke Azuma",
      "normalized_label": "illustrator Keisuke Azuma",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol J m5",
      "normalized_label": "set symbol J m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "collector_number",
      "label": "collector number 063/081",
      "normalized_label": "collector number 063 of 081",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_rarity_001",
      "kind": "rarity_mark",
      "label": "rarity mark RR",
      "normalized_label": "rarity RR",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "The main Pokemon depicted is メガドリュウズex (Mega Steelix EX)",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bodycolor_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.color",
      "claim": "Body is gray metallic",
      "value": "gray metallic",
      "supporting_observation_ids": [
        "obs_body_color_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_marking_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.markings",
      "claim": "Has red marking on body segment",
      "value": "red marking",
      "supporting_observation_ids": [
        "obs_red_marking_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eye_001",
      "module": "creature_anatomy",
      "field_path": "facial_evidence.eyes",
      "claim": "Has half-open eye visible",
      "value": "half-open eye",
      "supporting_observation_ids": [
        "obs_eye_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_headhorn_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.anatomy",
      "claim": "Has long conical drill head",
      "value": "drill head",
      "supporting_observation_ids": [
        "obs_headhorn_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "Floating diagonal pose",
      "value": "floating diagonal",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_background_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "Background is red and yellow abstract fragmented",
      "value": "abstract fragmented background",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_palette_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "Palette includes gray, red, yellow, orange, green",
      "value": "gray, red, yellow, orange, green",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_lighting_001",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "Bright highlights on metallic surfaces",
      "value": "bright highlights",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text メガドリュウズex",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "Card HP is 340 with steel type symbol",
      "value": "340 steel",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_attack_cost_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "First attack costs two steel energies",
      "value": "two steel",
      "supporting_observation_ids": [
        "obs_card_ui_energy_cost_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_attack_cost_002",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Second attack costs three steel energies",
      "value": "three steel",
      "supporting_observation_ids": [
        "obs_card_ui_energy_cost_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_attack_damage_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "Attack damage values visible: 90 and 200+",
      "value": "90 and 200+",
      "supporting_observation_ids": [
        "obs_card_ui_attacks_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_weakness_001",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness",
      "claim": "Fire weakness x2",
      "value": "fire x2",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_resistance_001",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance",
      "claim": "Grass resistance -30",
      "value": "grass -30",
      "supporting_observation_ids": [
        "obs_card_ui_resistance_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_retreat_001",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "Retreat cost is four colorless energies",
      "value": "4 colorless",
      "supporting_observation_ids": [
        "obs_card_ui_retreat_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text visible: Illus. Keisuke Azuma",
      "value": "Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_illustrator_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol J m5 visible",
      "value": "J m5",
      "supporting_observation_ids": [
        "obs_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number 063/081 visible",
      "value": "063/081",
      "supporting_observation_ids": [
        "obs_card_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_rarity_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "Rarity mark RR visible",
      "value": "RR",
      "supporting_observation_ids": [
        "obs_rarity_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "メガドリュウズex",
      "identity_confidence": 1,
      "anatomy": [
        "gray metallic body",
        "half-open eye",
        "long conical drill head",
        "metallic segmented body",
        "red marking on body"
      ],
      "physical_features": [
        "red markings",
        "striped drill tip in yellow and orange"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "diagonal",
      "action_state": [],
      "facial_evidence": {
        "eyes": "half-open",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "visible",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "gray",
        "orange",
        "red",
        "yellow"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_body_001",
      "obs_body_color_001",
      "obs_drill_tip_001",
      "obs_eye_001",
      "obs_headhorn_001",
      "obs_pose_001",
      "obs_red_marking_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract fragmented background"
    ],
    "indoor_outdoor": "not_applicable",
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "gray",
      "green",
      "orange",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright metallic highlights"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights"
    ],
    "composition": [
      "centered subject",
      "diagonal orientation",
      "fragmented background"
    ],
    "camera_angle": "straight on",
    "framing": "tight framing",
    "cropping": [],
    "depth": "clear depth separation",
    "motion_cues": [],
    "motifs": [
      "drill and metal motifs"
    ],
    "repeated_shapes": [
      "segmented body plates"
    ],
    "style_cues": [
      "detailed digital art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_lighting_001",
      "obs_palette_001",
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
        "fact_bodycolor_001",
        "fact_eye_001",
        "fact_headhorn_001",
        "fact_marking_001",
        "fact_pose_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "metallic segmented body",
          "visibility": "visible",
          "colors": [
            "gray"
          ],
          "details": [
            "red marking"
          ],
          "supporting_observation_ids": [
            "obs_body_001",
            "obs_body_color_001",
            "obs_red_marking_001"
          ],
          "confidence": 1
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "half-open eye",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_eye_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "long conical drill head",
          "visibility": "visible",
          "colors": [
            "orange",
            "yellow"
          ],
          "details": [
            "striped drill tip"
          ],
          "supporting_observation_ids": [
            "obs_drill_tip_001",
            "obs_headhorn_001"
          ],
          "confidence": 1
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
          "confidence": 0.9
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
        "fact_background_001"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_lighting_001",
        "fact_palette_001"
      ],
      "observation_ids": [
        "obs_lighting_001",
        "obs_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_attack_cost_001",
        "fact_attack_cost_002",
        "fact_attack_damage_001",
        "fact_card_hp_001",
        "fact_card_name_001",
        "fact_collector_number_001",
        "fact_illustrator_001",
        "fact_rarity_001",
        "fact_resistance_001",
        "fact_retreat_001",
        "fact_set_symbol_001",
        "fact_weakness_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_rarity_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_attacks_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_cost_001",
        "obs_card_ui_energy_cost_002"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_illustrator_001"
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
        "metallic segmented body",
        "Mega Steelix EX",
        "floating diagonal pose",
        "red and yellow abstract background",
        "striped drill tip",
        "gray metallic color"
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
      "semantic_fact_id": "semantic_001",
      "category": "scene_type",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "half-open eye"
        ],
        "eyebrows": [],
        "facial_features": [
          "half-open eye"
        ],
        "body_language": [
          "floating"
        ],
        "body_position": [
          "diagonal"
        ],
        "motion_state": [
          "floating"
        ],
        "environment": [
          "abstract fragmented background"
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
      "term": "metallic segmented body",
      "supporting_observation_ids": [
        "obs_body_001"
      ]
    },
    {
      "term": "Mega Steelix EX",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "floating diagonal pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "red and yellow abstract background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "striped drill tip",
      "supporting_observation_ids": [
        "obs_drill_tip_001"
      ]
    },
    {
      "term": "gray metallic color",
      "supporting_observation_ids": [
        "obs_body_color_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_body_001",
          "obs_body_color_001",
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0113064`
- Artwork observations: `11`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: female human character. Semantic facts: smiling, indoor swimming pool.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human character | female human character | scene_subject | foreground | primary | 0.99 |
| spiky orange hair tied in high ponytail | orange hair | hair | foreground | primary | 0.98 |
| face with open teal eyes, smiling mouth | face open eyes smiling | face | foreground | primary | 0.99 |
| visible upper body, arms, and hands | visible upper body arms hands | human_body_region | foreground | primary | 0.98 |
| navy blue one-piece swimsuit | navy blue swimsuit | clothing | foreground | primary | 0.99 |
| black wristband on right wrist | black wristband | accessory | foreground | secondary | 0.95 |
| right arm bent with fist forward, left arm bent with fist back, standing upright | posed with fists bent arms | pose | foreground | primary | 0.97 |
| red and white sneaker on right foot | red white sneaker | object | foreground | secondary | 0.95 |
| indoor swimming pool with water and lane dividers | indoor swimming pool | environment | background | primary | 0.99 |
| light blue pool water surface with reflections | pool water surface | environment | background | primary | 0.97 |
| poolside blue benches | blue benches | environment | background | secondary | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese カスミの元気 (Misty's Vitality) | card_ui_text | top left | visible | 0.99 |
| category text Supporter in Japanese サポート (top left red text) | card_ui_text | top left | visible | 0.99 |
| text トレーナーズ (Trainers) in Japanese top right corner | card_ui_text | top right | visible | 0.99 |
| framed rectangular text box at bottom containing Japanese text | card_ui_text | bottom center | visible | 0.9 |
| copyright text: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | card_ui_text | bottom | visible | 0.99 |
| set symbol with code J M5 | set_symbol | bottom left | visible | 0.98 |
| collector number 108/081 SR | collector_number | bottom left | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair color and style | obs_hair_001 | 0.98 |
| fact_face_001 | human_appearance | face with open eyes and smiling mouth | obs_face_001 | 0.99 |
| fact_body_region_001 | human_appearance | visible body regions | obs_body_region_001 | 0.98 |
| fact_clothing_001 | clothing | wearing navy blue one piece swimsuit | obs_clothing_001 | 0.99 |
| fact_accessory_001 | clothing | wearing black wristband on right wrist | obs_accessory_001 | 0.95 |
| fact_pose_001 | human_appearance | pose with right arm bent fist forward left arm bent fist back | obs_posture_001 | 0.97 |
| fact_object_001 | objects_and_props | wearing red white sneaker on right foot | obs_object_001 | 0.95 |
| fact_environment_001 | environment | indoor swimming pool with blue water and benches | obs_environment_001, obs_environment_002, obs_environment_003 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text japanese mistys vitality | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_002 | supporter text japanese | obs_card_ui_text_002 | 0.99 |
| fact_card_ui_003 | trainers text japanese | obs_card_ui_text_003 | 0.99 |
| fact_card_ui_004 | bottom center text box with japanese text | obs_card_ui_text_004 | 0.9 |
| fact_card_ui_005 | copyright text visible | obs_card_ui_text_005 | 0.99 |
| fact_card_ui_006 | set symbol j m5 visible | obs_card_ui_symbol_001 | 0.98 |
| fact_card_ui_007 | collector number 108 081 sr | obs_card_ui_text_006 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003",
    "fact_card_ui_004",
    "fact_card_ui_005",
    "fact_card_ui_006",
    "fact_card_ui_007"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_006"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_004"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_text_002",
    "obs_card_ui_text_003"
  ]
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | none | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_001 | expression | smiling | obs_subject_001 | obs_face_001 | smiling mouth open eyes neutral | 0.99 |
| svf_002 | environment | indoor swimming pool |  | obs_environment_001, obs_environment_002, obs_environment_003 | blue benches indoor swimming pool pool water surface | 0.99 |

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
| indoor swimming pool | obs_environment_001 |
| orange spiky hair | obs_hair_001 |
| navy blue swimsuit | obs_clothing_001 |
| black wristband | obs_accessory_001 |
| smiling face | obs_face_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| frontal orientation | obs_subject_001 | deterministic_rule | 0.99 |
| indoor swimming pool | obs_environment_001, obs_environment_002, obs_environment_003 | deterministic_rule | 0.99 |
| left arm bent fist back | obs_subject_001 | deterministic_rule | 0.99 |
| right arm bent fist forward | obs_subject_001 | deterministic_rule | 0.99 |
| smiling | obs_face_001 | deterministic_rule | 0.99 |
| standing | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human character. Semantic facts: smiling, indoor swimming pool.
- Quality flags: `potential_count_reference_inconsistent`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human character",
      "normalized_label": "female human character",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "hair",
      "label": "spiky orange hair tied in high ponytail",
      "normalized_label": "orange hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "face",
      "label": "face with open teal eyes, smiling mouth",
      "normalized_label": "face open eyes smiling",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "human_body_region",
      "label": "visible upper body, arms, and hands",
      "normalized_label": "visible upper body arms hands",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "navy blue one-piece swimsuit",
      "normalized_label": "navy blue swimsuit",
      "scene_layer": "foreground",
      "frame_position": "torso and legs",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "accessory",
      "label": "black wristband on right wrist",
      "normalized_label": "black wristband",
      "scene_layer": "foreground",
      "frame_position": "right wrist",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_posture_001",
      "kind": "pose",
      "label": "right arm bent with fist forward, left arm bent with fist back, standing upright",
      "normalized_label": "posed with fists bent arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "red and white sneaker on right foot",
      "normalized_label": "red white sneaker",
      "scene_layer": "foreground",
      "frame_position": "right foot",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool with water and lane dividers",
      "normalized_label": "indoor swimming pool",
      "scene_layer": "background",
      "frame_position": "back",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "light blue pool water surface with reflections",
      "normalized_label": "pool water surface",
      "scene_layer": "background",
      "frame_position": "back",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "poolside blue benches",
      "normalized_label": "blue benches",
      "scene_layer": "background",
      "frame_position": "back",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese カスミの元気 (Misty's Vitality)",
      "normalized_label": "card name Japanese",
      "scene_layer": "ui_layer",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "category text Supporter in Japanese サポート (top left red text)",
      "normalized_label": "Supporter text Japanese",
      "scene_layer": "ui_layer",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "text トレーナーズ (Trainers) in Japanese top right corner",
      "normalized_label": "Trainers text Japanese",
      "scene_layer": "ui_layer",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "framed rectangular text box at bottom containing Japanese text",
      "normalized_label": "text box bottom Japanese text",
      "scene_layer": "ui_layer",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "copyright text: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright text",
      "scene_layer": "ui_layer",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol with code J M5",
      "normalized_label": "set symbol J M5",
      "scene_layer": "ui_layer",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "collector_number",
      "label": "collector number 108/081 SR",
      "normalized_label": "collector number 108/081 SR",
      "scene_layer": "ui_layer",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "scene subject identity",
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
      "field_path": "hair[0].label",
      "claim": "hair color and style",
      "value": "spiky orange hair tied in high ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "facial_evidence[0]",
      "claim": "face with open eyes and smiling mouth",
      "value": "teal eyes open, mouth smiling",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_region_001",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "visible body regions",
      "value": "face, neck, shoulders, upper chest, arms, hands",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "wearing navy blue one piece swimsuit",
      "value": "navy blue one-piece swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessory_001",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "wearing black wristband on right wrist",
      "value": "black wristband on right wrist",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "human_appearance",
      "field_path": "pose",
      "claim": "pose with right arm bent fist forward left arm bent fist back",
      "value": "right arm bent with fist forward, left arm bent with fist back, standing upright",
      "supporting_observation_ids": [
        "obs_posture_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_001",
      "module": "objects_and_props",
      "field_path": "objects[0].label",
      "claim": "wearing red white sneaker on right foot",
      "value": "red and white sneaker on right foot",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "indoor swimming pool with blue water and benches",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text japanese mistys vitality",
      "value": "カスミの元気",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker_observation_ids",
      "claim": "supporter text japanese",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker_observation_ids",
      "claim": "trainers text japanese",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "bottom center text box with japanese text",
      "value": "visible text box with Japanese text",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "copyright text visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "set symbol j m5 visible",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "collector number 108 081 sr",
      "value": "108/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "confidence": 0.99,
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
        "hands",
        "head",
        "neck",
        "shoulders",
        "upper chest"
      ],
      "physical_features": [
        "orange spiky hair",
        "smiling mouth",
        "teal eyes"
      ],
      "pose": [
        "left arm bent fist back",
        "right arm bent fist forward",
        "standing"
      ],
      "orientation": "frontal",
      "action_state": [],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "smiling",
        "eyebrows": "neutral",
        "face_position": "front",
        "other_visible_evidence": [
          "teal eye color"
        ]
      },
      "clothing_or_accessories": [
        "black wristband on right wrist",
        "navy blue one-piece swimsuit",
        "red and white sneaker on right foot"
      ],
      "colors": [
        "black",
        "navy blue",
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
      "obs_accessory_001",
      "obs_body_region_001",
      "obs_clothing_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_object_001",
      "obs_posture_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "pool water surface"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "poolside benches"
    ],
    "water": [
      "pool water surface"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "red and white sneaker on right foot",
      "normalized_label": "red white sneaker",
      "object_type": "clothing footwear",
      "colors": [
        "red",
        "white"
      ],
      "material_appearance": [],
      "location": "right foot",
      "count_reference": "not_counted",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "light blue",
      "navy blue",
      "orange",
      "red",
      "white"
    ],
    "lighting": [
      "bright even lighting",
      "soft shadows"
    ],
    "shadows": [
      "soft shadows on neck and arms"
    ],
    "highlights": [
      "hair highlights",
      "water reflections"
    ],
    "composition": [
      "centered character",
      "frontal pose",
      "upper body focus"
    ],
    "camera_angle": "eye level",
    "framing": "medium close up",
    "cropping": [
      "bottom cropped at legs",
      "full head and upper body visible"
    ],
    "depth": "moderate depth with clear foreground and background",
    "motion_cues": [],
    "motifs": [
      "water and swimming pool"
    ],
    "repeated_shapes": [],
    "style_cues": [
      "clean line art",
      "colored shading"
    ],
    "supporting_observation_ids": [
      "obs_clothing_001",
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
        "fact_accessory_001",
        "fact_body_region_001",
        "fact_face_001",
        "fact_hair_001",
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "open teal eyes",
            "smiling mouth"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "visibility": "visible",
          "details": [
            "left arm bent",
            "right arm bent"
          ],
          "supporting_observation_ids": [
            "obs_posture_001"
          ],
          "confidence": 0.97
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "front",
          "eyes": "open",
          "mouth": "smiling",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "teal eyes"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "spiky orange hair tied in high ponytail",
          "details": [
            "orange hair",
            "ponytail",
            "spiky"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on right wrist",
          "details": [
            "black color",
            "wristband"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.95
        }
      ]
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
        "fact_accessory_001",
        "fact_clothing_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and legs",
          "garment": "one-piece swimsuit",
          "neckline_type": "tank neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "navy blue"
          ],
          "visible_details": [
            "navy blue",
            "one-piece"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on right wrist",
          "details": [
            "black wristband"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.95
        }
      ]
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
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
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
        "obs_clothing_001",
        "obs_environment_002",
        "obs_hair_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004",
        "fact_card_ui_005",
        "fact_card_ui_006",
        "fact_card_ui_007"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_text_002",
        "obs_card_ui_text_003"
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
        "indoor swimming pool",
        "orange spiky hair",
        "navy blue swimsuit",
        "black wristband",
        "smiling face"
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
      "review_status": "not_applicable",
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
      "omission_risk": "none",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "svf_001",
      "category": "expression",
      "label": "smiling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "evidence": {
        "mouth": [
          "smiling mouth"
        ],
        "eyes": [
          "open eyes"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "svf_002",
      "category": "environment",
      "label": "indoor swimming pool",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
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
          "blue benches",
          "indoor swimming pool",
          "pool water surface"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "orange spiky hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "navy blue swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "black wristband",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ]
    },
    {
      "term": "smiling face",
      "supporting_observation_ids": [
        "obs_face_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "frontal orientation",
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
          "obs_environment_002",
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left arm bent fist back",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right arm bent fist forward",
        "source_observation_ids": [
          "obs_subject_001"
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
        "confidence": 0.99
      },
      {
        "concept": "standing",
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

### GV-PK-JPN-M5-109 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.98`
- Cost USD: `0.01203`
- Artwork observations: `12`
- Card UI / print-marker observations: `10`
- Card UI module evidence references: `10`
- Derived digest: Fact digest. Scene subjects: Gladion. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human character Gladion | gladion | scene_subject | foreground | primary_subject | 1 |
| face frontal left side visible | face left front | human_appearance | foreground | primary_subject_face | 1 |
| human hair blonde/light yellow | hair blonde | human_appearance | foreground | primary_subject_hair | 1 |
| green eyes | eye green | human_appearance | foreground | face_features | 1 |
| dark eyebrows angled | eyebrows angled | human_appearance | foreground | face_features | 1 |
| mouth neutral expression | mouth neutral | human_appearance | foreground | face_features | 1 |
| black hooded garment with red and white logo/graphic on chest | hooded garment black red white logo | clothing | foreground | primary_clothing | 1 |
| red belt or sash | belt red | clothing | foreground | secondary_clothing | 1 |
| pale skin tone visible on face and hands | skin pale | human_appearance | foreground | primary_subject_skin | 1 |
| standing posture, right arm extended forward with fingers visible | standing pose right arm extended | human_appearance | foreground | posture_gesture | 1 |
| outdoor natural background with blue sky and gray/white clouds | outdoor sky cloudy | environment | background | background_sky_weather | 1 |
| green grassy field visible in lower background | grass field green | environment | background | background_ground | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: グラジオの決戦 (Gladion's Final Battle) | card_ui_text | top left | fully_visible | 0.95 |
| top left red word サポート (Supporter) | card_ui_text | top left | fully_visible | 1 |
| top right gray word トレーナーズ (Trainers) | card_ui_text | top right | fully_visible | 1 |
| illustrator credit 'Illus. akagi' | illustrator_text | bottom left | fully_visible | 1 |
| Set symbol and code J M5 visible lower left | set_symbol | bottom left | fully_visible | 1 |
| collector number '109/081' in bottom left | collector_number | bottom left | fully_visible | 1 |
| rarity mark 'SR' near collector number | rarity_mark | bottom left | fully_visible | 1 |
| copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' at bottom | copyright_text | bottom center | fully_visible | 1 |
| supporter use text in Japanese in bubble bottom center | card_ui_text | bottom center | fully_visible | 1 |
| Japanese small print text block beneath card name in upper center left area | card_ui_text | upper center left | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 1 |
| fact_hair_001 | human_appearance | hair color | obs_human_hair_001 | 1 |
| fact_human_face_001 | human_appearance | face visible | obs_human_face_001 | 1 |
| fact_eye_color_001 | human_appearance | eye color | obs_human_eye_001 | 1 |
| fact_eyebrows_001 | human_appearance | eyebrows visible | obs_human_eyebrows_001 | 1 |
| fact_mouth_001 | human_appearance | mouth expression | obs_human_mouth_001 | 1 |
| fact_clothing_001 | clothing | main garment | obs_human_clothing_001 | 1 |
| fact_clothing_002 | clothing | belt or sash color | obs_human_clothing_002 | 1 |
| fact_posture_001 | human_appearance | pose | obs_human_posture_001 | 1 |
| fact_environment_001 | environment | environment setting | obs_environment_001, obs_environment_002 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_001 | card name text | obs_text_001 | 0.95 |
| fact_supporter_text_001 | supporter text | obs_text_002 | 1 |
| fact_trainer_text_001 | trainer text | obs_text_003 | 1 |
| fact_illustrator_001 | illustrator text | obs_illustrator_001 | 1 |
| fact_set_symbol_001 | set symbol and code | obs_set_symbol_001 | 1 |
| fact_collector_number_001 | collector number | obs_collector_number_001 | 1 |
| fact_rarity_mark_001 | rarity mark | obs_rare_mark_001 | 1 |
| fact_copyright_001 | copyright text | obs_copyright_001 | 1 |
| fact_supporter_use_text_001 | supporter use text | obs_text_004 | 1 |
| fact_small_print_001 | small print text near top center | obs_text_005 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_name_001",
    "fact_collector_number_001",
    "fact_copyright_001",
    "fact_illustrator_001",
    "fact_rarity_mark_001",
    "fact_set_symbol_001",
    "fact_small_print_001",
    "fact_supporter_text_001",
    "fact_supporter_use_text_001",
    "fact_trainer_text_001"
  ],
  "name_text_observation_ids": [
    "obs_text_001",
    "obs_text_002",
    "obs_text_003"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_rare_mark_001"
  ],
  "copyright_line_observation_ids": [
    "obs_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_text_004",
    "obs_text_005"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_illustrator_001"
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
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_standing_001 | action | standing | obs_subject_001 | obs_human_posture_001 | right arm extended with fingers visible standing | 1 |

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
| blonde hair | obs_human_hair_001 |
| green eyes | obs_human_eye_001 |
| black hooded garment | obs_human_clothing_001 |
| red belt | obs_human_clothing_002 |
| standing pose | obs_human_posture_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward-left orientation | obs_human_face_001, obs_human_posture_001, obs_subject_001 | deterministic_rule | 1 |
| reaching | obs_human_posture_001 | deterministic_rule | 1 |
| sky | obs_environment_001 | deterministic_rule | 1 |
| standing | obs_human_posture_001, obs_subject_001 | deterministic_rule | 1 |
| terrain | obs_environment_002 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Gladion. Semantic facts: standing.
- Quality flags: `potential_module_review_conflicts_with_entries`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human character Gladion",
      "normalized_label": "gladion",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_face_001",
      "kind": "human_appearance",
      "label": "face frontal left side visible",
      "normalized_label": "face left front",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_face",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_hair_001",
      "kind": "human_appearance",
      "label": "human hair blonde/light yellow",
      "normalized_label": "hair blonde",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_hair",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_eye_001",
      "kind": "human_appearance",
      "label": "green eyes",
      "normalized_label": "eye green",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "fully_visible",
      "salience": "face_features",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_eyebrows_001",
      "kind": "human_appearance",
      "label": "dark eyebrows angled",
      "normalized_label": "eyebrows angled",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "fully_visible",
      "salience": "face_features",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_mouth_001",
      "kind": "human_appearance",
      "label": "mouth neutral expression",
      "normalized_label": "mouth neutral",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "fully_visible",
      "salience": "face_features",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_clothing_001",
      "kind": "clothing",
      "label": "black hooded garment with red and white logo/graphic on chest",
      "normalized_label": "hooded garment black red white logo",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_clothing",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_clothing_002",
      "kind": "clothing",
      "label": "red belt or sash",
      "normalized_label": "belt red",
      "scene_layer": "foreground",
      "frame_position": "lower torso",
      "visibility": "fully_visible",
      "salience": "secondary_clothing",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_skin_001",
      "kind": "human_appearance",
      "label": "pale skin tone visible on face and hands",
      "normalized_label": "skin pale",
      "scene_layer": "foreground",
      "frame_position": "face and hands",
      "visibility": "fully_visible",
      "salience": "primary_subject_skin",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_posture_001",
      "kind": "human_appearance",
      "label": "standing posture, right arm extended forward with fingers visible",
      "normalized_label": "standing pose right arm extended",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "posture_gesture",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "outdoor natural background with blue sky and gray/white clouds",
      "normalized_label": "outdoor sky cloudy",
      "scene_layer": "background",
      "frame_position": "upper center",
      "visibility": "fully_visible",
      "salience": "background_sky_weather",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "green grassy field visible in lower background",
      "normalized_label": "grass field green",
      "scene_layer": "background",
      "frame_position": "lower center",
      "visibility": "fully_visible",
      "salience": "background_ground",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: グラジオの決戦 (Gladion's Final Battle)",
      "normalized_label": "card_name_japanese",
      "scene_layer": "ui_foreground",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "card_name_ui",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_text_002",
      "kind": "card_ui_text",
      "label": "top left red word サポート (Supporter)",
      "normalized_label": "supporter_text_japanese",
      "scene_layer": "ui_foreground",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "supporter_ui",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_003",
      "kind": "card_ui_text",
      "label": "top right gray word トレーナーズ (Trainers)",
      "normalized_label": "trainer_text_japanese",
      "scene_layer": "ui_foreground",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "trainer_ui",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator credit 'Illus. akagi'",
      "normalized_label": "illustrator_akagi",
      "scene_layer": "ui_foreground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "illustrator_credit",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_symbol_001",
      "kind": "set_symbol",
      "label": "Set symbol and code J M5 visible lower left",
      "normalized_label": "set_symbol_j_m5",
      "scene_layer": "ui_foreground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "set_symbol_ui",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_collector_number_001",
      "kind": "collector_number",
      "label": "collector number '109/081' in bottom left",
      "normalized_label": "collector_number_109_081",
      "scene_layer": "ui_foreground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "collector_number_ui",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_rare_mark_001",
      "kind": "rarity_mark",
      "label": "rarity mark 'SR' near collector number",
      "normalized_label": "rarity_sr",
      "scene_layer": "ui_foreground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "rarity_mark_ui",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_copyright_001",
      "kind": "copyright_text",
      "label": "copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' at bottom",
      "normalized_label": "copyright_text_2026",
      "scene_layer": "ui_foreground",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "copyright_ui",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_004",
      "kind": "card_ui_text",
      "label": "supporter use text in Japanese in bubble bottom center",
      "normalized_label": "supporter_use_text_japanese",
      "scene_layer": "ui_foreground",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "bottom_text_ui",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_005",
      "kind": "card_ui_text",
      "label": "Japanese small print text block beneath card name in upper center left area",
      "normalized_label": "small_print_text_japanese",
      "scene_layer": "ui_foreground",
      "frame_position": "upper center left",
      "visibility": "fully_visible",
      "salience": "small_text_ui",
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0]",
      "claim": "scene subject identity",
      "value": "Gladion",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "hair color",
      "value": "blonde",
      "supporting_observation_ids": [
        "obs_human_hair_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_face_001",
      "module": "human_appearance",
      "field_path": "visible_body_regions.face",
      "claim": "face visible",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eye_color_001",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "eye color",
      "value": "green",
      "supporting_observation_ids": [
        "obs_human_eye_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eyebrows_001",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyebrows",
      "claim": "eyebrows visible",
      "value": "angled",
      "supporting_observation_ids": [
        "obs_human_eyebrows_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_mouth_001",
      "module": "human_appearance",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth expression",
      "value": "neutral",
      "supporting_observation_ids": [
        "obs_human_mouth_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "main garment",
      "value": "black hooded garment with red and white logo",
      "supporting_observation_ids": [
        "obs_human_clothing_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "belt or sash color",
      "value": "red",
      "supporting_observation_ids": [
        "obs_human_clothing_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_posture_001",
      "module": "human_appearance",
      "field_path": "pose_orientation.pose",
      "claim": "pose",
      "value": "standing with right arm extended forward",
      "supporting_observation_ids": [
        "obs_human_posture_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "environment setting",
      "value": "outdoor grassy field with cloudy sky",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "グラジオの決戦 (Gladion's Final Battle)",
      "supporting_observation_ids": [
        "obs_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_supporter_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[1]",
      "claim": "supporter text",
      "value": "サポート (Supporter)",
      "supporting_observation_ids": [
        "obs_text_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_trainer_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[2]",
      "claim": "trainer text",
      "value": "トレーナーズ (Trainers)",
      "supporting_observation_ids": [
        "obs_text_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator text",
      "value": "Illus. akagi",
      "supporting_observation_ids": [
        "obs_illustrator_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "set symbol and code",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number",
      "value": "109/081",
      "supporting_observation_ids": [
        "obs_collector_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_rarity_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark_observation_ids[0]",
      "claim": "rarity mark",
      "value": "SR",
      "supporting_observation_ids": [
        "obs_rare_mark_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_copyright_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_supporter_use_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[0]",
      "claim": "supporter use text",
      "value": "サポートは、自分の番に1枚しか使えない。",
      "supporting_observation_ids": [
        "obs_text_004"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_small_print_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[1]",
      "claim": "small print text near top center",
      "value": "Japanese text block describing card rules",
      "supporting_observation_ids": [
        "obs_text_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Gladion",
      "identity_confidence": 1,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "head"
      ],
      "physical_features": [
        "blonde hair",
        "green eyes",
        "pale skin"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "forward-left",
      "action_state": [
        "hand extended forward"
      ],
      "facial_evidence": {
        "eyes": "visible green",
        "mouth": "neutral",
        "eyebrows": "angled",
        "face_position": "left front",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black hooded garment with red and white logo",
        "red belt or sash"
      ],
      "colors": [
        "black",
        "blonde",
        "green",
        "red",
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
      "obs_human_clothing_001",
      "obs_human_clothing_002",
      "obs_human_eye_001",
      "obs_human_eyebrows_001",
      "obs_human_face_001",
      "obs_human_hair_001",
      "obs_human_mouth_001",
      "obs_human_posture_001",
      "obs_human_skin_001",
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
      "outdoor grassy field with cloudy sky"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "cloudy gray and white clouds"
    ],
    "ground": [
      "green grassy field"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blonde",
      "blue",
      "gray",
      "green",
      "red",
      "white"
    ],
    "lighting": [
      "diffused natural light"
    ],
    "shadows": [
      "soft shadows on figure"
    ],
    "highlights": [
      "hair highlights"
    ],
    "composition": [
      "background natural",
      "central figure",
      "foreground dominant"
    ],
    "camera_angle": "eye level",
    "framing": "tight crop on figure upper body",
    "cropping": [
      "slight crop top and bottom"
    ],
    "depth": "medium depth with background",
    "motion_cues": [
      "hand gesture"
    ],
    "motifs": [
      "logo on chest garment",
      "red sash as accent"
    ],
    "repeated_shapes": [
      "angular shapes in garment"
    ],
    "style_cues": [
      "anime-style art"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_human_clothing_001",
      "obs_human_clothing_002",
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
      "fact_ids": [
        "fact_eye_color_001",
        "fact_eyebrows_001",
        "fact_hair_001",
        "fact_human_face_001",
        "fact_mouth_001",
        "fact_posture_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "face frontal left side visible"
          ],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 1
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "left front",
          "eyes": "green",
          "mouth": "neutral",
          "eyebrows": "angled",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_human_eye_001",
            "obs_human_eyebrows_001",
            "obs_human_mouth_001"
          ],
          "confidence": 1
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blonde",
          "details": [],
          "supporting_observation_ids": [
            "obs_human_hair_001"
          ],
          "confidence": 1
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right arm extended with fingers visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_human_posture_001"
          ],
          "confidence": 1
        }
      ],
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
            "standing"
          ],
          "orientation": "forward-left",
          "action_state": [
            "hand extended forward"
          ],
          "supporting_observation_ids": [
            "obs_human_posture_001"
          ],
          "confidence": 1
        }
      ],
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
          "body_area": "upper body",
          "garment": "black hooded garment with red and white logo",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black",
            "red",
            "white"
          ],
          "visible_details": [
            "hooded",
            "logo on chest"
          ],
          "supporting_observation_ids": [
            "obs_human_clothing_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "waist",
          "garment": "red belt or sash",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "red"
          ],
          "visible_details": [
            "belt or sash"
          ],
          "supporting_observation_ids": [
            "obs_human_clothing_002"
          ],
          "confidence": 1
        }
      ],
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
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_human_clothing_001",
        "obs_subject_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_name_001",
        "fact_collector_number_001",
        "fact_copyright_001",
        "fact_illustrator_001",
        "fact_rarity_mark_001",
        "fact_set_symbol_001",
        "fact_small_print_001",
        "fact_supporter_text_001",
        "fact_supporter_use_text_001",
        "fact_trainer_text_001"
      ],
      "name_text_observation_ids": [
        "obs_text_001",
        "obs_text_002",
        "obs_text_003"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_rare_mark_001"
      ],
      "copyright_line_observation_ids": [
        "obs_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_text_004",
        "obs_text_005"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_illustrator_001"
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
        "blonde hair",
        "green eyes",
        "black hooded garment",
        "red belt",
        "standing pose"
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
      "review_status": "not_applicable",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_standing_001",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_human_posture_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "right arm extended with fingers visible"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "blonde hair",
      "supporting_observation_ids": [
        "obs_human_hair_001"
      ]
    },
    {
      "term": "green eyes",
      "supporting_observation_ids": [
        "obs_human_eye_001"
      ]
    },
    {
      "term": "black hooded garment",
      "supporting_observation_ids": [
        "obs_human_clothing_001"
      ]
    },
    {
      "term": "red belt",
      "supporting_observation_ids": [
        "obs_human_clothing_002"
      ]
    },
    {
      "term": "standing pose",
      "supporting_observation_ids": [
        "obs_human_posture_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward-left orientation",
        "source_observation_ids": [
          "obs_human_face_001",
          "obs_human_posture_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_human_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_human_posture_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-117 - Gwynn

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.96`
- Attribute confidence: `0.96`
- Cost USD: `0.0093632`
- Artwork observations: `7`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: human female character. Semantic facts: right hand finger pointing upward.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human female character | human female character | scene_subject | foreground | primary | 0.99 |
| long purple hair with bangs | long purple hair with bangs | hair | foreground | primary | 0.98 |
| helmet with ram-like curly horns and jewel | helmet with horns and jewel | clothing_accessory | foreground | primary | 0.97 |
| visible face with purple eyes, neutral expression | face with purple eyes | face | foreground | primary | 0.96 |
| blue jacket with dark blue collar and cuff | blue jacket | clothing | foreground | primary | 0.97 |
| right hand with finger pointing upward | right hand pointing upward | body_part | foreground | primary | 0.95 |
| warm background with orange, red, yellow colors and light streaks | warm bright background | environment | background | secondary | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: ムク | card_name_text | top-left | fully_visible | 0.99 |
| text in orange top left corner: サポート (Support) | card_ui_text | top-left | fully_visible | 0.98 |
| text in top right corner: トレーナーズ (Trainers) | card_ui_text | top-right | fully_visible | 0.98 |
| Japanese text block for card rules/effect below artwork | card_ui_text | bottom-center below artwork | fully_visible | 0.95 |
| 117/081 SAR and set symbol text | collector_number | bottom left corner | fully_visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair style and color | obs_hair_001 | 0.98 |
| fact_accessory_001 | clothing | head accessory | obs_accessory_001 | 0.97 |
| fact_face_001 | human_appearance | face features | obs_face_001 | 0.96 |
| fact_clothing_001 | clothing | garment description | obs_clothing_001 | 0.97 |
| fact_hand_001 | human_appearance | right hand gesture | obs_hand_001 | 0.95 |
| fact_environment_001 | environment | background colors and composition | obs_environment_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_text | 0.99 |
| fact_card_ui_supporter_text_001 | supporter category text | obs_card_ui_supporter_text | 0.98 |
| fact_card_ui_trainer_type_001 | trainer type text | obs_card_ui_trainer_type_text | 0.98 |
| fact_card_ui_text_bottom_001 | card effect rule text | obs_card_ui_text_bottom | 0.95 |
| fact_card_ui_collector_number_001 | collector number and set symbol | obs_card_ui_set_info | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_number_001",
    "fact_card_ui_name_001",
    "fact_card_ui_supporter_text_001",
    "fact_card_ui_text_bottom_001",
    "fact_card_ui_trainer_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_info"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_info"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_bottom"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_supporter_text",
    "obs_card_ui_trainer_type_text"
  ]
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | medium |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_002 | action | right hand finger pointing upward | obs_subject_001 | obs_hand_001 | finger pointing upward | 0.95 |

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
| long purple hair | obs_hair_001 |
| helmet with ram horns | obs_accessory_001 |
| blue jacket | obs_clothing_001 |
| female human character | obs_subject_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_environment_001 | deterministic_rule | 0.92 |
| right hand finger pointing upward | obs_hand_001, obs_subject_001 | deterministic_rule | 0.99 |
| upward-right orientation | obs_hand_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human female character. Semantic facts: right hand finger pointing upward.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human female character",
      "normalized_label": "human female character",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "hair",
      "label": "long purple hair with bangs",
      "normalized_label": "long purple hair with bangs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing_accessory",
      "label": "helmet with ram-like curly horns and jewel",
      "normalized_label": "helmet with horns and jewel",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "face",
      "label": "visible face with purple eyes, neutral expression",
      "normalized_label": "face with purple eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue jacket with dark blue collar and cuff",
      "normalized_label": "blue jacket",
      "scene_layer": "foreground",
      "frame_position": "torso and arms",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_001",
      "kind": "body_part",
      "label": "right hand with finger pointing upward",
      "normalized_label": "right hand pointing upward",
      "scene_layer": "foreground",
      "frame_position": "right side near center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "warm background with orange, red, yellow colors and light streaks",
      "normalized_label": "warm bright background",
      "scene_layer": "background",
      "frame_position": "behind character",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_name_text",
      "kind": "card_name_text",
      "label": "card name text in Japanese: ムク",
      "normalized_label": "card name text Muku",
      "scene_layer": "interface",
      "frame_position": "top-left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_supporter_text",
      "kind": "card_ui_text",
      "label": "text in orange top left corner: サポート (Support)",
      "normalized_label": "support label",
      "scene_layer": "interface",
      "frame_position": "top-left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_type_text",
      "kind": "card_ui_text",
      "label": "text in top right corner: トレーナーズ (Trainers)",
      "normalized_label": "trainer type label",
      "scene_layer": "interface",
      "frame_position": "top-right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_bottom",
      "kind": "card_ui_text",
      "label": "Japanese text block for card rules/effect below artwork",
      "normalized_label": "card effect text",
      "scene_layer": "interface",
      "frame_position": "bottom-center below artwork",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_info",
      "kind": "collector_number",
      "label": "117/081 SAR and set symbol text",
      "normalized_label": "collector number and set symbol",
      "scene_layer": "interface",
      "frame_position": "bottom left corner",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "scene subject identity",
      "value": "human female character",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair[0].label",
      "claim": "hair style and color",
      "value": "long purple hair with bangs",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessory_001",
      "module": "clothing",
      "field_path": "accessories[0].label",
      "claim": "head accessory",
      "value": "helmet with ram-like curly horns and jewel",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "face.visible_features",
      "claim": "face features",
      "value": "visible face with purple eyes",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0].label",
      "claim": "garment description",
      "value": "blue jacket with dark blue collar and cuff",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hand_001",
      "module": "human_appearance",
      "field_path": "hands[0].pose",
      "claim": "right hand gesture",
      "value": "right hand finger pointing upward",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background colors and composition",
      "value": "warm bright background with orange, red, yellow light streaks",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "ムク",
      "supporting_observation_ids": [
        "obs_card_ui_name_text"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_supporter_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "supporter category text",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_supporter_text"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_trainer_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "trainer type text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_type_text"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_bottom_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "card effect rule text",
      "value": "visible Japanese effect text below artwork",
      "supporting_observation_ids": [
        "obs_card_ui_text_bottom"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and set symbol",
      "value": "117/081 SAR and set symbol",
      "supporting_observation_ids": [
        "obs_card_ui_set_info"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human female character",
      "identity_confidence": 0.99,
      "anatomy": [
        "face",
        "hands"
      ],
      "physical_features": [
        "long purple hair with bangs"
      ],
      "pose": [
        "right hand finger pointing upward"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "purple eyes",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "front center",
        "other_visible_evidence": [
          "face fully visible"
        ]
      },
      "clothing_or_accessories": [
        "blue jacket",
        "helmet with ram-like curly horns and jewel"
      ],
      "colors": [
        "blue",
        "orange background",
        "purple"
      ],
      "visibility": "fully visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_accessory_001",
      "obs_clothing_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_hand_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "bright colorful light streak background"
    ],
    "indoor_outdoor": "indoor_or_abstract",
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
      "blue",
      "orange",
      "purple",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright",
      "glowing light streaks"
    ],
    "shadows": [
      "soft shadows on character"
    ],
    "highlights": [
      "glowing effect in background",
      "specular highlight on helmet jewel"
    ],
    "composition": [
      "central subject",
      "close-up portrait"
    ],
    "camera_angle": "front straight-on",
    "framing": "tight medium close-up",
    "cropping": [
      "full torso visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "ram horn motif"
    ],
    "repeated_shapes": [
      "spiral horns"
    ],
    "style_cues": [
      "anime-style illustration"
    ],
    "supporting_observation_ids": [
      "obs_accessory_001",
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
      "fact_ids": [
        "fact_face_001",
        "fact_hair_001",
        "fact_hand_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "neutral eyebrows",
            "neutral mouth expression",
            "purple eyes"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.96
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "front center",
          "eyes": "purple eyes",
          "mouth": "neutral",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "face fully visible"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.96
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "long purple hair with bangs",
          "details": [
            "frontal bangs",
            "long hair",
            "purple color"
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
          "label": "right hand finger pointing upward",
          "details": [
            "finger pointing upward",
            "right hand visible"
          ],
          "supporting_observation_ids": [
            "obs_hand_001"
          ],
          "confidence": 0.95
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
        "fact_accessory_001",
        "fact_clothing_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and arms",
          "garment": "blue jacket",
          "neckline_type": "unknown",
          "sleeve_type": "long sleeves",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "dark blue collar and cuffs"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "helmet with ram-like curly horns and jewel",
          "details": [
            "blue jewel on front",
            "curled horns",
            "helmet"
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
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_collector_number_001",
        "fact_card_ui_name_001",
        "fact_card_ui_supporter_text_001",
        "fact_card_ui_text_bottom_001",
        "fact_card_ui_trainer_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_info"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_info"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_bottom"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_supporter_text",
        "obs_card_ui_trainer_type_text"
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
        "long purple hair",
        "helmet with ram horns",
        "blue jacket",
        "female human character"
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
      "review_status": "not_applicable",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "semantic_fact_id": "svf_002",
      "category": "action",
      "label": "right hand finger pointing upward",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "finger pointing upward"
        ],
        "body_position": [],
        "motion_state": [],
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
      "term": "long purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "helmet with ram horns",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ]
    },
    {
      "term": "blue jacket",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "female human character",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "right hand finger pointing upward",
        "source_observation_ids": [
          "obs_hand_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upward-right orientation",
        "source_observation_ids": [
          "obs_hand_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-116 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.93`
- Cost USD: `0.0093184`
- Artwork observations: `11`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: Human male character. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Human male character | human male | scene_subject | foreground | primary_subject | 0.99 |
| Blond hair with sharp angular bangs | blond hair | human_appearance | foreground | primary_subject_feature | 0.98 |
| Black jacket with high collar and brown buttons | black jacket | clothing | foreground | primary_subject_feature | 0.95 |
| Brown shoulder bag strap crossing chest | brown bag strap | clothing | foreground | secondary_subject_feature | 0.94 |
| Standing pose with back slightly turned facing right | standing pose facing right | scene_subject | foreground | primary_subject_pose | 0.95 |
| Right hand raised near face, fingers in ok sign | right hand ok gesture | scene_subject | foreground | gesture | 0.9 |
| Side profile face with serious expression, eyes open, mouth neutral | face side profile | human_appearance | foreground | primary_subject_face | 0.97 |
| Bright blue sky with stylized clouds and sun | bright blue sky sun | environment | background | background_environment | 0.98 |
| Tall mountains in background | mountains background | environment | background | background_environment | 0.95 |
| Forest trees at mountain base | forest mountain base | environment | background | background_environment | 0.93 |
| Dynamic streaks of magenta and purple light crossing image | magenta purple light streaks | environment | foreground_background_overlap | dynamic_effects | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject kind | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair is blond | obs_hair_001 | 0.98 |
| fact_003 | clothing | garment color black | obs_clothing_001 | 0.95 |
| fact_004 | clothing | brown bag strap visible | obs_clothing_002 | 0.94 |
| fact_005 | human_appearance | standing pose facing right | obs_pose_001 | 0.95 |
| fact_006 | human_appearance | right hand making ok sign near face | obs_gesture_001 | 0.9 |
| fact_007 | human_appearance | side profile face with open eyes | obs_face_001 | 0.97 |
| fact_008 | environment | bright blue sky with stylized clouds and sun | obs_environment_001 | 0.98 |
| fact_009 | environment | mountains present in background | obs_environment_002 | 0.95 |
| fact_010 | environment | forest trees at mountain base | obs_environment_003 | 0.93 |
| fact_011 | visual_effects | magenta and purple light streaks crossing image | obs_environment_004 | 0.9 |

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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text: Card name text is in Japanese and not fully decipherable due to image resolution and angle, precise OCR not possible |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | action | standing | obs_subject_001 | obs_pose_001 | neutral open neutral face right hand ok gesture standing static pose | 0.95 |

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
| blond hair | obs_hair_001 |
| black jacket | obs_clothing_001 |
| standing human male | obs_subject_001 |
| mountain background | obs_environment_002 |
| forest | obs_environment_003 |
| bright blue sky | obs_environment_001 |
| sun | obs_environment_001 |
| purple light streaks | obs_environment_004 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal composition | obs_environment_004 | deterministic_rule | 0.92 |
| forest | obs_environment_003 | deterministic_rule | 0.93 |
| right orientation | obs_gesture_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.95 |
| sky | obs_environment_001 | deterministic_rule | 0.98 |
| standing | obs_pose_001, obs_subject_001 | deterministic_rule | 0.95 |
| terrain | obs_environment_003 | deterministic_rule | 0.93 |
| tree | obs_environment_003 | deterministic_rule | 0.93 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Human male character. Semantic facts: standing.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`, `potential_subject_kind_classification_confusion`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Human male character",
      "normalized_label": "human male",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "Blond hair with sharp angular bangs",
      "normalized_label": "blond hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "Black jacket with high collar and brown buttons",
      "normalized_label": "black jacket",
      "scene_layer": "foreground",
      "frame_position": "torso",
      "visibility": "visible",
      "salience": "primary_subject_feature",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "Brown shoulder bag strap crossing chest",
      "normalized_label": "brown bag strap",
      "scene_layer": "foreground",
      "frame_position": "chest",
      "visibility": "visible",
      "salience": "secondary_subject_feature",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "scene_subject",
      "label": "Standing pose with back slightly turned facing right",
      "normalized_label": "standing pose facing right",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_pose",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_gesture_001",
      "kind": "scene_subject",
      "label": "Right hand raised near face, fingers in ok sign",
      "normalized_label": "right hand ok gesture",
      "scene_layer": "foreground",
      "frame_position": "upper_right",
      "visibility": "visible",
      "salience": "gesture",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "Side profile face with serious expression, eyes open, mouth neutral",
      "normalized_label": "face side profile",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary_subject_face",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "Bright blue sky with stylized clouds and sun",
      "normalized_label": "bright blue sky sun",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "background_environment",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "Tall mountains in background",
      "normalized_label": "mountains background",
      "scene_layer": "background",
      "frame_position": "lower_background",
      "visibility": "visible",
      "salience": "background_environment",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "Forest trees at mountain base",
      "normalized_label": "forest mountain base",
      "scene_layer": "background",
      "frame_position": "lower_background",
      "visibility": "visible",
      "salience": "background_environment",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "environment",
      "label": "Dynamic streaks of magenta and purple light crossing image",
      "normalized_label": "magenta purple light streaks",
      "scene_layer": "foreground_background_overlap",
      "frame_position": "varied",
      "visibility": "visible",
      "salience": "dynamic_effects",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "subject kind",
      "value": "scene subject",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair.color",
      "claim": "hair is blond",
      "value": "blond",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "clothing",
      "field_path": "garments[0].color",
      "claim": "garment color black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "brown bag strap visible",
      "value": "brown bag strap",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "human_appearance",
      "field_path": "pose",
      "claim": "standing pose facing right",
      "value": "standing facing right",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "gesture",
      "claim": "right hand making ok sign near face",
      "value": "right hand ok sign",
      "supporting_observation_ids": [
        "obs_gesture_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "face_expression",
      "claim": "side profile face with open eyes",
      "value": "face side profile",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "setting.sky",
      "claim": "bright blue sky with stylized clouds and sun",
      "value": "bright blue sky sun",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "setting.mountains",
      "claim": "mountains present in background",
      "value": "mountains background",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "setting.forest_trees",
      "claim": "forest trees at mountain base",
      "value": "forest mountain base",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "visual_effects",
      "field_path": "effects[0]",
      "claim": "magenta and purple light streaks crossing image",
      "value": "magenta purple light streaks",
      "supporting_observation_ids": [
        "obs_environment_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Human male character",
      "identity_confidence": 0.5,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "head",
        "torso"
      ],
      "physical_features": [
        "blond hair",
        "face"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "right",
      "action_state": [
        "static pose"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "side profile",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black jacket",
        "brown bag strap"
      ],
      "colors": [
        "black",
        "blond",
        "brown"
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
      "obs_face_001",
      "obs_gesture_001",
      "obs_hair_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_environment_004"
    ],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003"
    ]
  },
  "environment": {
    "setting": [
      "bright blue sky with stylized clouds and sun",
      "forest trees at mountain base",
      "mountains present in background"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "bright blue sky",
      "stylized clouds",
      "sun"
    ],
    "ground": [
      "forest",
      "mountain base"
    ],
    "terrain": [
      "mountains"
    ],
    "plants": [
      "forest trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "daytime bright sun"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "bright blue",
      "brown",
      "purple",
      "yellow"
    ],
    "lighting": [
      "bright sunlight",
      "high contrast"
    ],
    "shadows": [
      "soft shadows on subject"
    ],
    "highlights": [
      "glowing sky",
      "yellow hair highlights"
    ],
    "composition": [
      "centered subject",
      "diagonal light streaks"
    ],
    "camera_angle": "side profile eye level",
    "framing": "vertical portrait",
    "cropping": [
      "full body visible"
    ],
    "depth": "deep depth with background mountains",
    "motion_cues": [
      "light streaks"
    ],
    "motifs": [
      "angular hair shapes",
      "diagonal lines"
    ],
    "repeated_shapes": [
      "angular hair",
      "diagonal streaks"
    ],
    "style_cues": [
      "stylized anime"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_004",
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
    "objects_and_props_review": "none_visible",
    "relationships_review": "none_visible",
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
        "fact_005",
        "fact_006",
        "fact_007"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "visibility": "visible",
          "details": [
            "blond hair",
            "face side profile with open eyes",
            "neutral mouth"
          ],
          "supporting_observation_ids": [
            "obs_face_001",
            "obs_hair_001"
          ],
          "confidence": 0.97
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "side profile",
          "eyes": "open",
          "mouth": "neutral",
          "eyebrows": "neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.97
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blond hair",
          "details": [
            "sharp angular bangs"
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
          "label": "right hand ok sign",
          "details": [
            "right hand raised near face"
          ],
          "supporting_observation_ids": [
            "obs_gesture_001"
          ],
          "confidence": 0.9
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
        "fact_003",
        "fact_004"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black jacket",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black"
          ],
          "visible_details": [
            "brown buttons",
            "high collar"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "brown shoulder bag strap",
          "details": [
            "crossing chest"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.94
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_008",
        "fact_009",
        "fact_010"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_011"
      ],
      "observation_ids": [
        "obs_environment_004"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": []
    },
    "visual_effects": {
      "fact_ids": [
        "fact_011"
      ],
      "observation_ids": [
        "obs_environment_004"
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
        "blond hair",
        "black jacket",
        "standing human male",
        "mountain background",
        "forest",
        "bright blue sky",
        "sun",
        "purple light streaks"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text",
          "reason": "Card name text is in Japanese and not fully decipherable due to image resolution and angle, precise OCR not possible",
          "affected_observation_ids": []
        }
      ]
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_001",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [
          "neutral"
        ],
        "eyes": [
          "open"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "face"
        ],
        "body_language": [
          "right hand ok gesture"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [
          "static pose"
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
      "term": "blond hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "black jacket",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "standing human male",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "mountain background",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "forest",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "bright blue sky",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "sun",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "purple light streaks",
      "supporting_observation_ids": [
        "obs_environment_004"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_environment_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "forest",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_gesture_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_001"
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
        "confidence": 0.95
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-111 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0099916`
- Artwork observations: `11`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female human trainer. Semantic facts: hands clasped, indoor corridor.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Female human trainer wearing blue and white outfit with hat | female human trainer blue white outfit hat | scene_subject | foreground | primary | 0.99 |
| Long straight purple hair with bangs | long straight purple hair bangs | hair | foreground | primary | 0.98 |
| White lab coat with light blue interior and pointed tails at back | white lab coat light blue interior pointed tails | clothing | foreground | primary | 0.99 |
| Black dress underneath lab coat | black dress | clothing | foreground | primary | 0.98 |
| Cap with blue and white panel sections and gold rim around base, large black curled horn decorations attached | cap blue white gold rim black curled horns | clothing | foreground | primary | 0.99 |
| Hands clasped together forming a gesture | hands clasped gesture | gesture | foreground | primary | 0.98 |
| Blue gloves covering entire hands with distinct finger outlines | blue gloves full hand | clothing | foreground | primary | 0.98 |
| Face with purple irises and visible eyebrows, neutral mouth expression | face purple eyes neutral mouth | face | foreground | primary | 0.98 |
| Stone brick walled corridor and stairs with light coming through a window | stone brick corridor stairs window light | environment | background | secondary | 0.95 |
| Light source from left side casting shadows | left side light shadows | environment | background | secondary | 0.94 |
| Black and yellow triangular emblem on dress midsection | black yellow emblem midsection | objects_and_props | foreground | primary | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | Identity of subject is female human trainer | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | Hair color is purple | obs_hair_001 | 0.98 |
| fact_003 | human_appearance | Hair is long and straight with bangs | obs_hair_001 | 0.98 |
| fact_004 | clothing | Wearing white lab coat with light blue interior and pointed tails | obs_clothing_garment_001 | 0.99 |
| fact_005 | clothing | Wearing black dress underneath lab coat | obs_clothing_garment_002 | 0.98 |
| fact_006 | clothing | Wearing blue gloves covering entire hands | obs_clothing_accessory_002 | 0.98 |
| fact_007 | human_appearance | Hands clasped together forming a gesture | obs_hand_gesture_001 | 0.98 |
| fact_008 | human_appearance | Face has purple irises, visible eyebrows, and neutral mouth expression | obs_face_001 | 0.98 |
| fact_009 | clothing | Wearing cap with blue and white panel, gold rim, and large black curled horns | obs_clothing_accessory_001 | 0.99 |
| fact_010 | environment | Stone brick walled corridor and stairs with window light | obs_environment_001 | 0.95 |
| fact_011 | environment | Light source from left side casting shadows | obs_environment_002 | 0.94 |
| fact_012 | objects_and_props | Black and yellow triangular emblem on dress midsection | obs_object_001 | 0.97 |

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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | none_visible | none | not_applicable |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | action | hands clasped | obs_subject_001 | obs_hand_gesture_001 | hands clasped | 0.98 |
| sem_002 | environment | indoor corridor |  | obs_environment_001 | stairs stone brick walls window light | 0.95 |

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
| purple hair | obs_hair_001 |
| white lab coat | obs_clothing_garment_001 |
| blue gloves | obs_clothing_accessory_002 |
| black dress | obs_clothing_garment_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_hand_gesture_001, obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_clothing_accessory_002 | deterministic_rule | 0.98 |
| hands clasped | obs_hand_gesture_001 | deterministic_rule | 0.98 |
| hat | obs_clothing_accessory_001, obs_subject_001 | deterministic_rule | 0.99 |
| indoor corridor | obs_environment_001 | deterministic_rule | 0.95 |
| left orientation | obs_environment_002 | deterministic_rule | 0.94 |
| stairs | obs_environment_001 | deterministic_rule | 0.95 |
| standing | obs_hand_gesture_001, obs_subject_001 | deterministic_rule | 0.99 |
| window | obs_environment_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Semantic facts: hands clasped, indoor corridor.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_review_conflicts_with_entries`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Female human trainer wearing blue and white outfit with hat",
      "normalized_label": "female human trainer blue white outfit hat",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "hair",
      "label": "Long straight purple hair with bangs",
      "normalized_label": "long straight purple hair bangs",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_garment_001",
      "kind": "clothing",
      "label": "White lab coat with light blue interior and pointed tails at back",
      "normalized_label": "white lab coat light blue interior pointed tails",
      "scene_layer": "foreground",
      "frame_position": "midbody",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_garment_002",
      "kind": "clothing",
      "label": "Black dress underneath lab coat",
      "normalized_label": "black dress",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_accessory_001",
      "kind": "clothing",
      "label": "Cap with blue and white panel sections and gold rim around base, large black curled horn decorations attached",
      "normalized_label": "cap blue white gold rim black curled horns",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_gesture_001",
      "kind": "gesture",
      "label": "Hands clasped together forming a gesture",
      "normalized_label": "hands clasped gesture",
      "scene_layer": "foreground",
      "frame_position": "hands",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_accessory_002",
      "kind": "clothing",
      "label": "Blue gloves covering entire hands with distinct finger outlines",
      "normalized_label": "blue gloves full hand",
      "scene_layer": "foreground",
      "frame_position": "hands",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "face",
      "label": "Face with purple irises and visible eyebrows, neutral mouth expression",
      "normalized_label": "face purple eyes neutral mouth",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "Stone brick walled corridor and stairs with light coming through a window",
      "normalized_label": "stone brick corridor stairs window light",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "Light source from left side casting shadows",
      "normalized_label": "left side light shadows",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "Black and yellow triangular emblem on dress midsection",
      "normalized_label": "black yellow emblem midsection",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "scene_subjects[0].identity",
      "claim": "Identity of subject is female human trainer",
      "value": "female human trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair[0].color",
      "claim": "Hair color is purple",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "hair[0].style",
      "claim": "Hair is long and straight with bangs",
      "value": "long straight bangs",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "Wearing white lab coat with light blue interior and pointed tails",
      "value": "white lab coat with light blue interior and tails",
      "supporting_observation_ids": [
        "obs_clothing_garment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "Wearing black dress underneath lab coat",
      "value": "black dress",
      "supporting_observation_ids": [
        "obs_clothing_garment_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "Wearing blue gloves covering entire hands",
      "value": "blue gloves",
      "supporting_observation_ids": [
        "obs_clothing_accessory_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "hands.gesture",
      "claim": "Hands clasped together forming a gesture",
      "value": "clasped together",
      "supporting_observation_ids": [
        "obs_hand_gesture_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "human_appearance",
      "field_path": "face.features",
      "claim": "Face has purple irises, visible eyebrows, and neutral mouth expression",
      "value": "purple eyes, visible eyebrows, neutral mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "clothing",
      "field_path": "accessories[1]",
      "claim": "Wearing cap with blue and white panel, gold rim, and large black curled horns",
      "value": "cap with horns",
      "supporting_observation_ids": [
        "obs_clothing_accessory_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "setting",
      "claim": "Stone brick walled corridor and stairs with window light",
      "value": "stone brick corridor",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "environment",
      "field_path": "lighting",
      "claim": "Light source from left side casting shadows",
      "value": "left side light",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "objects_and_props",
      "field_path": "body_emblem",
      "claim": "Black and yellow triangular emblem on dress midsection",
      "value": "black yellow triangular emblem",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.97,
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
        "hands",
        "head"
      ],
      "physical_features": [
        "purple hair",
        "violet eyes"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "forward",
      "action_state": [
        "hands clasped"
      ],
      "facial_evidence": {
        "eyes": "visible purple irises",
        "mouth": "neutral",
        "eyebrows": "visible",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black dress",
        "blue gloves",
        "cap with black horn decorations",
        "white lab coat"
      ],
      "colors": [
        "black",
        "blue",
        "purple",
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
      "obs_clothing_accessory_001",
      "obs_clothing_accessory_002",
      "obs_clothing_garment_001",
      "obs_clothing_garment_002",
      "obs_face_001",
      "obs_hair_001",
      "obs_hand_gesture_001",
      "obs_object_001",
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
      "stone brick walled corridor",
      "stone stairs"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [
      "stone stairs"
    ],
    "plants": [],
    "architecture": [
      "stone brick walls",
      "stone stairs"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "black and yellow triangular emblem on dress midsection",
      "normalized_label": "black yellow emblem midsection",
      "object_type": "emblem",
      "colors": [
        "black",
        "yellow"
      ],
      "material_appearance": [
        "fabric-like appearance"
      ],
      "location": "midsection on black dress",
      "count_reference": "count_1",
      "confidence": 0.97
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "natural light from left",
      "soft shadows"
    ],
    "shadows": [
      "soft shadows on walls and stairs"
    ],
    "highlights": [
      "light reflecting off hair and coat"
    ],
    "composition": [
      "centered subject",
      "leading lines of stairs and walls"
    ],
    "camera_angle": "eye level",
    "framing": "medium close-up",
    "cropping": [
      "full subject visible"
    ],
    "depth": "moderate depth with background corridor visible",
    "motion_cues": [],
    "motifs": [
      "horned cap motif"
    ],
    "repeated_shapes": [
      "curled horn spirals"
    ],
    "style_cues": [
      "soft shading"
    ],
    "supporting_observation_ids": [
      "obs_clothing_accessory_001",
      "obs_environment_001",
      "obs_environment_002",
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
      "fact_ids": [
        "fact_002",
        "fact_003",
        "fact_007",
        "fact_008"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "visibility": "visible",
          "details": [
            "face with purple eyes, visible eyebrows, neutral mouth",
            "hair purple long straight bangs"
          ],
          "supporting_observation_ids": [
            "obs_face_001",
            "obs_hair_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "visibility": "visible",
          "details": [
            "blue gloves",
            "hands clasped gesture"
          ],
          "supporting_observation_ids": [
            "obs_clothing_accessory_002",
            "obs_hand_gesture_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "visible purple irises",
          "mouth": "neutral",
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
          "label": "purple hair",
          "details": [
            "bangs",
            "long",
            "straight"
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
          "label": "hands clasped",
          "details": [
            "hands clasped together gesture"
          ],
          "supporting_observation_ids": [
            "obs_hand_gesture_001"
          ],
          "confidence": 0.98
        }
      ],
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
            "standing"
          ],
          "orientation": "forward",
          "action_state": [
            "hands clasped"
          ],
          "supporting_observation_ids": [
            "obs_hand_gesture_001",
            "obs_subject_001"
          ],
          "confidence": 0.99
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_009"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "white lab coat",
          "neckline_type": "high collar",
          "sleeve_type": "long sleeves",
          "colors": [
            "light blue interior",
            "white"
          ],
          "visible_details": [
            "pointed tails at back"
          ],
          "supporting_observation_ids": [
            "obs_clothing_garment_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black dress",
          "neckline_type": "not visible",
          "sleeve_type": "not visible",
          "colors": [
            "black"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_garment_002"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue gloves",
          "details": [
            "covering entire hands",
            "finger outlines visible"
          ],
          "supporting_observation_ids": [
            "obs_clothing_accessory_002"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "cap with black curled horn decorations",
          "details": [
            "blue and white panels",
            "gold rim around base",
            "large black curled horns attached"
          ],
          "supporting_observation_ids": [
            "obs_clothing_accessory_001"
          ],
          "confidence": 0.99
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_012"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_010",
        "fact_011"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_010",
        "fact_011"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_010",
        "fact_011"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
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
        "purple hair",
        "white lab coat",
        "blue gloves",
        "black dress"
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
      "review_status": "not_applicable",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_001",
      "category": "action",
      "label": "hands clasped",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hand_gesture_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "hands clasped"
        ],
        "body_position": [],
        "motion_state": [],
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
      "category": "environment",
      "label": "indoor corridor",
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
          "stairs",
          "stone brick walls",
          "window light"
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
      "term": "purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "white lab coat",
      "supporting_observation_ids": [
        "obs_clothing_garment_001"
      ]
    },
    {
      "term": "blue gloves",
      "supporting_observation_ids": [
        "obs_clothing_accessory_002"
      ]
    },
    {
      "term": "black dress",
      "supporting_observation_ids": [
        "obs_clothing_garment_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_hand_gesture_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_clothing_accessory_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "hands clasped",
        "source_observation_ids": [
          "obs_hand_gesture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "hat",
        "source_observation_ids": [
          "obs_clothing_accessory_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "indoor corridor",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "stairs",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_hand_gesture_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-110 - Rust Syndicate Grunt

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.01077`
- Artwork observations: `14`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: Rust Syndicate Grunt female, Rust Syndicate Grunt male. Visible observations: female human trainer, male human trainer, blond hair, black hair, black jacket, white shirt, purple nail polish, purple sunglasses. Semantic facts: smiling.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer in foreground | female human trainer | scene_subject | foreground | high | 0.99 |
| male human trainer in background | male human trainer | scene_subject | foreground | high | 0.99 |
| female short wavy blond hair | blond hair | object | foreground | high | 0.95 |
| male flat-top haircut black hair | black hair | object | foreground | high | 0.95 |
| female trainer black jacket with purple emblem | black jacket | object | foreground | high | 0.98 |
| female trainer white shirt with blue tie | white shirt | object | foreground | high | 0.98 |
| female trainer with purple nail polish | purple nail polish | object | foreground | medium | 0.9 |
| female trainer wearing purple sunglasses | purple sunglasses | object | foreground | medium | 0.9 |
| male trainer black suit jacket | black suit jacket | object | foreground | high | 0.98 |
| male trainer white shirt with purple tie | white shirt | object | foreground | high | 0.98 |
| female trainer smirking smiling mouth | smiling mouth | object | foreground | medium | 0.95 |
| male trainer neutral mouth expression | neutral mouth | object | foreground | medium | 0.9 |
| female trainer left hand on hip gesture | hand on hip gesture | object | foreground | medium | 0.93 |
| green leafy plants background | plants | object | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject kind | obs_subject_001 | 0.99 |
| fact_002 | subjects | subject kind | obs_subject_002 | 0.99 |
| fact_003 | human_appearance | hair color | obs_hair_001 | 0.95 |
| fact_004 | human_appearance | hair style | obs_hair_002 | 0.95 |
| fact_005 | clothing | garment color | obs_clothing_001 | 0.98 |
| fact_006 | clothing | garment color | obs_clothing_002 | 0.98 |
| fact_007 | clothing | item | obs_clothing_003 | 0.9 |
| fact_008 | clothing | item | obs_clothing_004 | 0.9 |
| fact_009 | clothing | garment color | obs_clothing_005 | 0.98 |
| fact_010 | clothing | garment color | obs_clothing_006 | 0.98 |
| fact_011 | human_appearance | mouth expression | obs_facial_001 | 0.95 |
| fact_012 | human_appearance | mouth expression | obs_facial_002 | 0.9 |
| fact_013 | human_appearance | pose | obs_hand_pose_001 | 0.93 |
| fact_014 | environment | plant type | obs_environment_001 | 0.9 |

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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_crop | medium | medium | illustrator_text_observation_ids: cannot read full illustrator text due to partial crop |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | expression | smiling | obs_subject_001 | obs_facial_001 | smiling mouth covered by sunglasses purple sunglasses | 0.95 |

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
| rust syndicate grunt | obs_subject_001, obs_subject_002 |
| female trainer | obs_subject_001 |
| male trainer | obs_subject_002 |
| black jacket | obs_clothing_001, obs_clothing_005 |
| blue tie | obs_clothing_002 |
| purple nail polish | obs_clothing_003 |
| purple sunglasses | obs_clothing_004 |
| flat-top haircut | obs_hair_002 |
| short wavy blond hair | obs_hair_001 |
| green leafy plants | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| left hand on hip | obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_subject_001 | deterministic_rule | 0.99 |
| plant | obs_environment_001 | deterministic_rule | 0.92 |
| right orientation | obs_subject_002 | deterministic_rule | 0.99 |
| smiling | obs_facial_001 | deterministic_rule | 0.95 |
| standing | obs_subject_001, obs_subject_002 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Rust Syndicate Grunt female, Rust Syndicate Grunt male. Visible observations: female human trainer, male human trainer, blond hair, black hair, black jacket, white shirt, purple nail polish, purple sunglasses. Semantic facts: smiling.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`, `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`, `potential_subject_kind_classification_confusion`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human trainer in foreground",
      "normalized_label": "female human trainer",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_002",
      "kind": "scene_subject",
      "label": "male human trainer in background",
      "normalized_label": "male human trainer",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "object",
      "label": "female short wavy blond hair",
      "normalized_label": "blond hair",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_002",
      "kind": "object",
      "label": "male flat-top haircut black hair",
      "normalized_label": "black hair",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "object",
      "label": "female trainer black jacket with purple emblem",
      "normalized_label": "black jacket",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "object",
      "label": "female trainer white shirt with blue tie",
      "normalized_label": "white shirt",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "object",
      "label": "female trainer with purple nail polish",
      "normalized_label": "purple nail polish",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_004",
      "kind": "object",
      "label": "female trainer wearing purple sunglasses",
      "normalized_label": "purple sunglasses",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_005",
      "kind": "object",
      "label": "male trainer black suit jacket",
      "normalized_label": "black suit jacket",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_006",
      "kind": "object",
      "label": "male trainer white shirt with purple tie",
      "normalized_label": "white shirt",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_001",
      "kind": "object",
      "label": "female trainer smirking smiling mouth",
      "normalized_label": "smiling mouth",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_002",
      "kind": "object",
      "label": "male trainer neutral mouth expression",
      "normalized_label": "neutral mouth",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_pose_001",
      "kind": "object",
      "label": "female trainer left hand on hip gesture",
      "normalized_label": "hand on hip gesture",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "object",
      "label": "green leafy plants background",
      "normalized_label": "plants",
      "scene_layer": "background",
      "frame_position": "bottom-left and bottom-right corners",
      "visibility": "visible",
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
      "claim": "subject kind",
      "value": "scene subject",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "subjects",
      "field_path": "[1]",
      "claim": "subject kind",
      "value": "scene subject",
      "supporting_observation_ids": [
        "obs_subject_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "hair color",
      "value": "blond",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "hair[1]",
      "claim": "hair style",
      "value": "flat-top haircut",
      "supporting_observation_ids": [
        "obs_hair_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment color",
      "value": "black",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "garment color",
      "value": "white",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "item",
      "value": "purple nail polish",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "clothing",
      "field_path": "accessories[1]",
      "claim": "item",
      "value": "purple sunglasses",
      "supporting_observation_ids": [
        "obs_clothing_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "clothing",
      "field_path": "garments[2]",
      "claim": "garment color",
      "value": "black",
      "supporting_observation_ids": [
        "obs_clothing_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "clothing",
      "field_path": "garments[3]",
      "claim": "garment color",
      "value": "white",
      "supporting_observation_ids": [
        "obs_clothing_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "human_appearance",
      "field_path": "facial_evidence[0]",
      "claim": "mouth expression",
      "value": "smiling",
      "supporting_observation_ids": [
        "obs_facial_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "human_appearance",
      "field_path": "facial_evidence[1]",
      "claim": "mouth expression",
      "value": "neutral",
      "supporting_observation_ids": [
        "obs_facial_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "human_appearance",
      "field_path": "gestures[0]",
      "claim": "pose",
      "value": "left hand on hip",
      "supporting_observation_ids": [
        "obs_hand_pose_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "environment",
      "field_path": "plants[0]",
      "claim": "plant type",
      "value": "green leafy plants",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Rust Syndicate Grunt female",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "hands",
        "head",
        "torso"
      ],
      "physical_features": [
        "purple nail polish",
        "short wavy blond hair"
      ],
      "pose": [
        "left hand on hip",
        "standing"
      ],
      "orientation": "left",
      "action_state": [
        "standing still"
      ],
      "facial_evidence": {
        "eyes": "covered by sunglasses",
        "mouth": "smiling",
        "eyebrows": "not visible",
        "face_position": "visible",
        "other_visible_evidence": [
          "purple sunglasses"
        ]
      },
      "clothing_or_accessories": [
        "black jacket",
        "blue tie",
        "purple nail polish",
        "purple sunglasses",
        "white shirt"
      ],
      "colors": [
        "black",
        "blond",
        "purple",
        "white"
      ],
      "visibility": "visible"
    },
    {
      "observation_id": "obs_subject_002",
      "subject_kind": "scene_subject",
      "identity": "Rust Syndicate Grunt male",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "head",
        "torso"
      ],
      "physical_features": [
        "flat-top black hair"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "right",
      "action_state": [
        "standing still"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "neutral",
        "eyebrows": "visible",
        "face_position": "visible",
        "other_visible_evidence": [
          "purple tie"
        ]
      },
      "clothing_or_accessories": [
        "black suit jacket",
        "purple tie",
        "white shirt"
      ],
      "colors": [
        "black",
        "purple",
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
      "obs_clothing_004",
      "obs_clothing_005",
      "obs_clothing_006",
      "obs_facial_001",
      "obs_facial_002",
      "obs_hair_001",
      "obs_hair_002",
      "obs_hand_pose_001",
      "obs_subject_001",
      "obs_subject_002"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "indoors (suggested by suit attire)"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [
      "green leafy plants"
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
      "dark tones",
      "green plants",
      "purple accents",
      "white"
    ],
    "lighting": [
      "even lighting",
      "soft shadows from overhead"
    ],
    "shadows": [
      "soft shadows cast by figures"
    ],
    "highlights": [
      "highlight on hair and suit fabric"
    ],
    "composition": [
      "foreground centered composition",
      "two characters back-to-back"
    ],
    "camera_angle": "eye-level",
    "framing": "centered on two trainers",
    "cropping": [
      "full figures visible"
    ],
    "depth": "moderate depth, characters in foreground distinct from background plants",
    "motion_cues": [],
    "motifs": [
      "purple color motif in clothing and accessories"
    ],
    "repeated_shapes": [
      "angular hairstyles",
      "rectangular glasses"
    ],
    "style_cues": [
      "anime-style illustration",
      "vibrant color palette"
    ],
    "supporting_observation_ids": [
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_environment_001",
      "obs_hair_001",
      "obs_hair_002",
      "obs_subject_001",
      "obs_subject_002"
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
        "fact_001",
        "fact_002"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001",
        "obs_subject_002"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_003",
        "fact_004",
        "fact_011",
        "fact_012",
        "fact_013"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "visibility": "visible",
          "details": [
            "purple sunglasses",
            "short wavy blond hair"
          ],
          "supporting_observation_ids": [
            "obs_clothing_004",
            "obs_hair_001"
          ],
          "confidence": 0.93
        },
        {
          "subject_observation_id": "obs_subject_002",
          "region": "head",
          "visibility": "visible",
          "details": [
            "flat-top haircut black hair"
          ],
          "supporting_observation_ids": [
            "obs_hair_002"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "visible",
          "eyes": "covered by sunglasses",
          "mouth": "smiling",
          "eyebrows": "not visible",
          "other_visible_evidence": [
            "purple sunglasses"
          ],
          "supporting_observation_ids": [
            "obs_clothing_004",
            "obs_facial_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "face_position": "visible",
          "eyes": "visible",
          "mouth": "neutral",
          "eyebrows": "visible",
          "other_visible_evidence": [
            "purple tie"
          ],
          "supporting_observation_ids": [
            "obs_clothing_006",
            "obs_facial_002"
          ],
          "confidence": 0.9
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "short wavy blond hair",
          "details": [
            "short",
            "wavy"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "label": "flat-top black hair",
          "details": [
            "flat-top"
          ],
          "supporting_observation_ids": [
            "obs_hair_002"
          ],
          "confidence": 0.95
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "left hand on hip",
          "details": [
            "left hand placed on hip"
          ],
          "supporting_observation_ids": [
            "obs_hand_pose_001"
          ],
          "confidence": 0.93
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple nail polish",
          "details": [
            "purple nail polish on fingers"
          ],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.9
        }
      ]
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
        "fact_007",
        "fact_008",
        "fact_009",
        "fact_010"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black jacket",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black"
          ],
          "visible_details": [
            "purple emblem on jacket left side"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "white shirt",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "white"
          ],
          "visible_details": [
            "blue tie"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_002",
          "body_area": "torso",
          "garment": "black suit jacket",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_005"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_002",
          "body_area": "torso",
          "garment": "white shirt",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "white"
          ],
          "visible_details": [
            "purple tie"
          ],
          "supporting_observation_ids": [
            "obs_clothing_006"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple nail polish",
          "details": [
            "painted fingernails purple"
          ],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple sunglasses",
          "details": [
            "worn on face"
          ],
          "supporting_observation_ids": [
            "obs_clothing_004"
          ],
          "confidence": 0.9
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_014"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_subject_001",
        "obs_subject_002"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_subject_001",
        "obs_subject_002"
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
        "rust syndicate grunt",
        "female trainer",
        "male trainer",
        "black jacket",
        "blue tie",
        "purple nail polish",
        "purple sunglasses",
        "flat-top haircut",
        "short wavy blond hair",
        "green leafy plants"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "illustrator_text_observation_ids",
          "reason": "cannot read full illustrator text due to partial crop",
          "affected_observation_ids": []
        }
      ]
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
      "omission_risk": "low",
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
        "obs_facial_001"
      ],
      "evidence": {
        "mouth": [
          "smiling mouth"
        ],
        "eyes": [
          "covered by sunglasses"
        ],
        "eyebrows": [],
        "facial_features": [
          "purple sunglasses"
        ],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
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
      "term": "rust syndicate grunt",
      "supporting_observation_ids": [
        "obs_subject_001",
        "obs_subject_002"
      ]
    },
    {
      "term": "female trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "male trainer",
      "supporting_observation_ids": [
        "obs_subject_002"
      ]
    },
    {
      "term": "black jacket",
      "supporting_observation_ids": [
        "obs_clothing_001",
        "obs_clothing_005"
      ]
    },
    {
      "term": "blue tie",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "purple nail polish",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ]
    },
    {
      "term": "purple sunglasses",
      "supporting_observation_ids": [
        "obs_clothing_004"
      ]
    },
    {
      "term": "flat-top haircut",
      "supporting_observation_ids": [
        "obs_hair_002"
      ]
    },
    {
      "term": "short wavy blond hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "green leafy plants",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "left hand on hip",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_subject_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "smiling",
        "source_observation_ids": [
          "obs_facial_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_subject_001",
          "obs_subject_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-075 - カスミの元気

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.0089164`
- Artwork observations: `14`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female human trainer. Semantic facts: smiling.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer | female human trainer | scene_subject | foreground | dominant | 0.99 |
| orange hair ponytail | orange hair ponytail | human_appearance | foreground | prominent | 0.99 |
| green eyes | green eyes | human_appearance | foreground | prominent | 0.95 |
| smiling face with one eye closed | smiling face with one eye closed | human_appearance | foreground | prominent | 0.98 |
| blue sleeveless crop top | blue sleeveless crop top | clothing | foreground | prominent | 0.97 |
| blue shorts | blue shorts | clothing | foreground | prominent | 0.97 |
| black wristband on right wrist | black wristband | clothing | foreground | moderate | 0.96 |
| black wristband on left wrist | black wristband | clothing | foreground | moderate | 0.96 |
| visible midriff and arms | visible midriff and arms | human_appearance | foreground | prominent | 0.99 |
| right arm extended forward with open hand, left arm bent backward in fist | pose with right arm forward and left arm back | human_appearance | foreground | prominent | 0.95 |
| indoor swimming pool room with tiled floor | indoor swimming pool room tiled floor | environment | background | moderate | 0.98 |
| large window with multiple panes revealing bright sky and foliage outside | large window multiple panes bright sky foliage | environment | background | moderate | 0.97 |
| green leafy potted plant near window | green leafy potted plant | environment | background | moderate | 0.96 |
| metal pool ladder with three steps | metal pool ladder three steps | objects_and_props | background | moderate | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | There is a female human trainer in the scene | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | The human trainer has orange hair tied in a ponytail | obs_hair_001 | 0.99 |
| fact_003 | human_appearance | The human trainer has green eyes | obs_eyes_001 | 0.95 |
| fact_004 | human_appearance | The human trainer has a smiling face with one eye closed | obs_face_001 | 0.98 |
| fact_005 | clothing | The human trainer is wearing a blue sleeveless crop top | obs_clothing_001 | 0.97 |
| fact_006 | clothing | The human trainer is wearing blue shorts | obs_clothing_002 | 0.97 |
| fact_007 | clothing | The human trainer is wearing black wristbands on both wrists | obs_accessory_001, obs_accessory_002 | 0.96 |
| fact_008 | human_appearance | Visible body regions include midriff and arms | obs_body_region_001 | 0.99 |
| fact_009 | human_appearance | The human trainer's right arm is extended forward with an open hand, left arm bent backward with fist | obs_pose_001 | 0.95 |
| fact_010 | environment | The scene is set indoors in a swimming pool room with tiled floor | obs_environment_001 | 0.98 |
| fact_011 | environment | There is a large window with multiple panes showing bright sky and foliage outside | obs_environment_002 | 0.97 |
| fact_012 | environment | There is a green leafy potted plant near the window | obs_environment_003 | 0.96 |
| fact_013 | objects_and_props | There is a metal pool ladder with three steps next to the pool | obs_object_001 | 0.95 |

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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | none_visible | none | not_applicable |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | expression | smiling | obs_subject_001 | obs_face_001 | smiling mouth one eye closed winking neutral face visible right arm extended front facing | 0.98 |

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
| orange hair ponytail | obs_hair_001 |
| blue crop top | obs_clothing_001 |
| blue shorts | obs_clothing_002 |
| smiling | obs_face_001 |
| indoor swimming pool | obs_environment_001 |
| metal pool ladder | obs_object_001 |
| green leafy potted plant | obs_environment_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| forward-right orientation | obs_pose_001 | deterministic_rule | 0.95 |
| left arm bent backward | obs_subject_001 | deterministic_rule | 0.99 |
| plant | obs_environment_003 | deterministic_rule | 0.96 |
| reaching | obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_002 | deterministic_rule | 0.97 |
| sleeveless clothing | obs_clothing_001 | deterministic_rule | 0.97 |
| smiling | obs_face_001 | deterministic_rule | 0.98 |
| stairs | obs_object_001 | deterministic_rule | 0.95 |
| window | obs_environment_002 | deterministic_rule | 0.97 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Semantic facts: smiling.
- Quality flags: `potential_count_reference_inconsistent`
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
      "salience": "dominant",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "orange hair ponytail",
      "normalized_label": "orange hair ponytail",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "human_appearance",
      "label": "green eyes",
      "normalized_label": "green eyes",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "smiling face with one eye closed",
      "normalized_label": "smiling face with one eye closed",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue sleeveless crop top",
      "normalized_label": "blue sleeveless crop top",
      "scene_layer": "foreground",
      "frame_position": "upper body",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "blue shorts",
      "normalized_label": "blue shorts",
      "scene_layer": "foreground",
      "frame_position": "lower body",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing",
      "label": "black wristband on right wrist",
      "normalized_label": "black wristband",
      "scene_layer": "foreground",
      "frame_position": "right wrist",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_002",
      "kind": "clothing",
      "label": "black wristband on left wrist",
      "normalized_label": "black wristband",
      "scene_layer": "foreground",
      "frame_position": "left wrist",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "human_appearance",
      "label": "visible midriff and arms",
      "normalized_label": "visible midriff and arms",
      "scene_layer": "foreground",
      "frame_position": "torso and arms",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "human_appearance",
      "label": "right arm extended forward with open hand, left arm bent backward in fist",
      "normalized_label": "pose with right arm forward and left arm back",
      "scene_layer": "foreground",
      "frame_position": "full upper body",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool room with tiled floor",
      "normalized_label": "indoor swimming pool room tiled floor",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "large window with multiple panes revealing bright sky and foliage outside",
      "normalized_label": "large window multiple panes bright sky foliage",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "green leafy potted plant near window",
      "normalized_label": "green leafy potted plant",
      "scene_layer": "background",
      "frame_position": "left side",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "metal pool ladder with three steps",
      "normalized_label": "metal pool ladder three steps",
      "scene_layer": "background",
      "frame_position": "background near pool",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "There is a female human trainer in the scene",
      "value": "female human trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair.color_and_style",
      "claim": "The human trainer has orange hair tied in a ponytail",
      "value": "orange hair ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "face.eye_color",
      "claim": "The human trainer has green eyes",
      "value": "green eyes",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "face.expression",
      "claim": "The human trainer has a smiling face with one eye closed",
      "value": "smiling face with one eye closed",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "upper_body.garment",
      "claim": "The human trainer is wearing a blue sleeveless crop top",
      "value": "blue sleeveless crop top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "lower_body.garment",
      "claim": "The human trainer is wearing blue shorts",
      "value": "blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "clothing",
      "field_path": "accessories.wristbands",
      "claim": "The human trainer is wearing black wristbands on both wrists",
      "value": "black wristbands on both wrists",
      "supporting_observation_ids": [
        "obs_accessory_001",
        "obs_accessory_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "Visible body regions include midriff and arms",
      "value": "midriff and arms visible",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "human_appearance",
      "field_path": "pose_and_gesture",
      "claim": "The human trainer's right arm is extended forward with an open hand, left arm bent backward with fist",
      "value": "pose with right arm forward and left arm back",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "setting.indoor",
      "claim": "The scene is set indoors in a swimming pool room with tiled floor",
      "value": "indoor swimming pool room with tiled floor",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "environment",
      "field_path": "setting.window_and_outside_view",
      "claim": "There is a large window with multiple panes showing bright sky and foliage outside",
      "value": "large window multiple panes bright sky foliage",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "environment",
      "field_path": "plants.potted",
      "claim": "There is a green leafy potted plant near the window",
      "value": "green leafy potted plant",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "objects_and_props",
      "field_path": "object.pool_ladder",
      "claim": "There is a metal pool ladder with three steps next to the pool",
      "value": "metal pool ladder with three steps",
      "supporting_observation_ids": [
        "obs_object_001"
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
        "arms",
        "face",
        "midriff"
      ],
      "physical_features": [
        "green eyes",
        "light skin tone",
        "orange hair"
      ],
      "pose": [
        "left arm bent backward",
        "reaching"
      ],
      "orientation": "forward",
      "action_state": [
        "smiling",
        "winking"
      ],
      "facial_evidence": {
        "eyes": "one eye closed winking",
        "mouth": "smiling mouth",
        "eyebrows": "neutral",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristbands on both wrists",
        "blue shorts",
        "blue sleeveless crop top"
      ],
      "colors": [
        "black",
        "blue",
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
      "obs_accessory_001",
      "obs_accessory_002",
      "obs_body_region_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_eyes_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_object_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool room"
    ],
    "indoor_outdoor": "indoor",
    "sky": [
      "bright sky"
    ],
    "ground": [
      "tiled floor"
    ],
    "terrain": [],
    "plants": [
      "green leafy potted plant"
    ],
    "architecture": [
      "large window with multiple panes"
    ],
    "water": [
      "swimming pool water reflective surface"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_object_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "metal pool ladder",
      "normalized_label": "pool ladder",
      "object_type": "pool furnishing",
      "colors": [],
      "material_appearance": [
        "metallic"
      ],
      "location": "background next to pool",
      "count_reference": "count_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "green",
      "orange"
    ],
    "lighting": [
      "bright indoor lighting"
    ],
    "shadows": [
      "soft shadows on ground"
    ],
    "highlights": [
      "shiny hair highlights"
    ],
    "composition": [
      "centered subject",
      "window framing background"
    ],
    "camera_angle": "eye level",
    "framing": "medium shot",
    "cropping": [
      "full figure",
      "head and upper body"
    ],
    "depth": "moderate depth with background elements",
    "motion_cues": [
      "gesture with extended arm"
    ],
    "motifs": [
      "indoor pool"
    ],
    "repeated_shapes": [
      "window panes"
    ],
    "style_cues": [
      "clean lines"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_object_001",
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
        "fact_004",
        "fact_008",
        "fact_009"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "green eyes",
            "one eye closed",
            "smiling mouth"
          ],
          "supporting_observation_ids": [
            "obs_eyes_001",
            "obs_face_001"
          ],
          "confidence": 0.97
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "one eye closed winking",
          "mouth": "smiling mouth",
          "eyebrows": "neutral",
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
          "label": "orange hair ponytail",
          "details": [
            "bright shiny highlights"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.99
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right arm extended forward with open hand",
          "details": [],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands on both wrists",
          "details": [],
          "supporting_observation_ids": [
            "obs_accessory_001",
            "obs_accessory_002"
          ],
          "confidence": 0.96
        }
      ]
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
          "body_area": "upper body",
          "garment": "blue sleeveless crop top",
          "neckline_type": "round neckline",
          "sleeve_type": "no sleeves",
          "colors": [
            "blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "lower body",
          "garment": "blue shorts",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands on both wrists",
          "details": [],
          "supporting_observation_ids": [
            "obs_accessory_001",
            "obs_accessory_002"
          ],
          "confidence": 0.96
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_013"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_010",
        "fact_011",
        "fact_012"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
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
        "orange hair ponytail",
        "blue crop top",
        "blue shorts",
        "smiling",
        "indoor swimming pool",
        "metal pool ladder",
        "green leafy potted plant"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "category": "expression",
      "label": "smiling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "evidence": {
        "mouth": [
          "smiling mouth"
        ],
        "eyes": [
          "one eye closed winking"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "face visible"
        ],
        "body_language": [
          "right arm extended"
        ],
        "body_position": [
          "front facing"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [],
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
      "term": "orange hair ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "blue crop top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "smiling",
      "supporting_observation_ids": [
        "obs_face_001"
      ]
    },
    {
      "term": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "metal pool ladder",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "green leafy potted plant",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "left arm bent backward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "sleeveless clothing",
        "source_observation_ids": [
          "obs_clothing_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
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
        "concept": "stairs",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0081348`
- Artwork observations: `7`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: dark sky, white lightning bolts, branching lightning strike on right, aurora bands, mountain terrain, bare trees, group of trees. Semantic facts: lightning, aurora bands, bare trees, stormy. Counts: bare trees: 3-6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark sky | dark sky | environment | background | high | 0.99 |
| white lightning bolts | white lightning bolts | object | midground | high | 0.99 |
| branching lightning strike on right | branching lightning strike on right | object | midground | high | 0.98 |
| red and green aurora bands | aurora bands | environment | background | high | 0.97 |
| dark mountain silhouettes | mountain terrain | environment | background | medium | 0.95 |
| bare black tree silhouettes | bare trees | environment | foreground | medium | 0.96 |
| group of bare trees | group of trees | environment | foreground | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_environment_dark_sky_001 | environment | sky contains dark sky | obs_sky_001 | 0.99 |
| fact_environment_lightning_001 | environment | weather contains lightning | obs_lightning_001, obs_lightning_002 | 0.99 |
| fact_environment_aurora_bands_001 | environment | sky contains aurora bands | obs_colored_light_bands_001 | 0.97 |
| fact_environment_mountains_001 | environment | terrain contains mountains | obs_mountainous_terrain_001 | 0.95 |
| fact_environment_trees_001 | environment | scene contains bare trees | obs_tree_group_001, obs_tree_silhouettes_001 | 0.96 |

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
| subjects | none_visible | none | not_applicable |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | partial_due_to_low_resolution | medium | medium |  |
| color_and_light | partial_due_to_low_resolution | medium | medium |  |
| visual_effects | partial_due_to_low_resolution | medium | medium |  |
| card_ui_and_print_markers | none_visible | none | not_applicable |  |
| counts | complete | low | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sf_storm_001 | weather | lightning |  | obs_lightning_001, obs_lightning_002 | branching lightning strike on right white lightning bolts | 0.98 |
| sf_aurora_001 | environment | aurora bands |  | obs_colored_light_bands_001 | red and green aurora bands | 0.97 |
| sf_trees_001 | environment | bare trees |  | obs_tree_group_001, obs_tree_silhouettes_001 | bare black tree silhouettes | 0.95 |
| sf_setting_001 | environment | stormy |  | obs_lightning_001, obs_sky_001 | dark sky white lightning bolts | 0.99 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bare trees | estimated_range | 3-6 | obs_tree_group_001, obs_tree_silhouettes_001 | 0.95 |

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
| lightning | obs_lightning_001, obs_lightning_002 |
| aurora bands | obs_colored_light_bands_001 |
| bare trees | obs_tree_group_001, obs_tree_silhouettes_001 |
| stormy | obs_lightning_001, obs_sky_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora bands | obs_colored_light_bands_001 | deterministic_rule | 0.97 |
| aurora-like light bands | obs_colored_light_bands_001 | deterministic_rule | 0.97 |
| bare trees | obs_tree_group_001, obs_tree_silhouettes_001 | deterministic_rule | 0.95 |
| lightning | obs_lightning_001, obs_lightning_002 | deterministic_rule | 0.99 |
| right orientation | obs_lightning_002 | deterministic_rule | 0.98 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| stormy | obs_lightning_001, obs_sky_001 | deterministic_rule | 0.99 |
| terrain | obs_mountainous_terrain_001 | deterministic_rule | 0.95 |
| tree | obs_tree_group_001, obs_tree_silhouettes_001 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark sky, white lightning bolts, branching lightning strike on right, aurora bands, mountain terrain, bare trees, group of trees. Semantic facts: lightning, aurora bands, bare trees, stormy. Counts: bare trees: 3-6.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "environment",
      "label": "dark sky",
      "normalized_label": "dark sky",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_001",
      "kind": "object",
      "label": "white lightning bolts",
      "normalized_label": "white lightning bolts",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_002",
      "kind": "object",
      "label": "branching lightning strike on right",
      "normalized_label": "branching lightning strike on right",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_colored_light_bands_001",
      "kind": "environment",
      "label": "red and green aurora bands",
      "normalized_label": "aurora bands",
      "scene_layer": "background",
      "frame_position": "top and center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mountainous_terrain_001",
      "kind": "environment",
      "label": "dark mountain silhouettes",
      "normalized_label": "mountain terrain",
      "scene_layer": "background",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_silhouettes_001",
      "kind": "environment",
      "label": "bare black tree silhouettes",
      "normalized_label": "bare trees",
      "scene_layer": "foreground",
      "frame_position": "right foreground",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_group_001",
      "kind": "environment",
      "label": "group of bare trees",
      "normalized_label": "group of trees",
      "scene_layer": "foreground",
      "frame_position": "right foreground",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_environment_dark_sky_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky contains dark sky",
      "value": "dark sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_lightning_001",
      "module": "environment",
      "field_path": "weather",
      "claim": "weather contains lightning",
      "value": "lightning",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_aurora_bands_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky contains aurora bands",
      "value": "aurora bands",
      "supporting_observation_ids": [
        "obs_colored_light_bands_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_mountains_001",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain contains mountains",
      "value": "mountain terrain",
      "supporting_observation_ids": [
        "obs_mountainous_terrain_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_trees_001",
      "module": "environment",
      "field_path": "plants",
      "claim": "scene contains bare trees",
      "value": "bare trees",
      "supporting_observation_ids": [
        "obs_tree_group_001",
        "obs_tree_silhouettes_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_trees_001",
      "normalized_label": "bare trees",
      "count_type": "estimated_range",
      "exact_count": 0,
      "estimated_min": 3,
      "estimated_max": 6,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_tree_group_001",
        "obs_tree_silhouettes_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_tree_group_001",
      "obs_tree_silhouettes_001"
    ],
    "midground": [
      "obs_lightning_001",
      "obs_lightning_002"
    ],
    "background": [
      "obs_colored_light_bands_001",
      "obs_mountainous_terrain_001",
      "obs_sky_001"
    ]
  },
  "environment": {
    "setting": [
      "stormy"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "aurora bands",
      "dark sky"
    ],
    "ground": [
      "mountain terrain"
    ],
    "terrain": [
      "mountain terrain"
    ],
    "plants": [
      "bare trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [
      "lightning"
    ],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_colored_light_bands_001",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_mountainous_terrain_001",
      "obs_sky_001",
      "obs_tree_group_001",
      "obs_tree_silhouettes_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark blue",
      "green",
      "red",
      "white"
    ],
    "lighting": [
      "dim",
      "lightning flashes"
    ],
    "shadows": [
      "mountain shadow silhouettes"
    ],
    "highlights": [
      "bright lightning"
    ],
    "composition": [
      "aurora bands framing",
      "centered lightning"
    ],
    "camera_angle": "straight on",
    "framing": "tight rectangle",
    "cropping": [],
    "depth": "deep landscape",
    "motion_cues": [
      "lightning strike zigzag"
    ],
    "motifs": [
      "stormy night"
    ],
    "repeated_shapes": [
      "lightning bolts"
    ],
    "style_cues": [
      "dramatic contrast",
      "glowing effects"
    ],
    "supporting_observation_ids": [
      "obs_colored_light_bands_001",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_mountainous_terrain_001",
      "obs_sky_001",
      "obs_tree_silhouettes_001"
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
        "fact_environment_aurora_bands_001",
        "fact_environment_dark_sky_001",
        "fact_environment_lightning_001",
        "fact_environment_mountains_001",
        "fact_environment_trees_001"
      ],
      "observation_ids": [
        "obs_colored_light_bands_001",
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_mountainous_terrain_001",
        "obs_sky_001",
        "obs_tree_group_001",
        "obs_tree_silhouettes_001"
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
        "lightning",
        "aurora bands",
        "bare trees",
        "stormy"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sf_storm_001",
      "category": "weather",
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
          "branching lightning strike on right",
          "white lightning bolts"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sf_aurora_001",
      "category": "environment",
      "label": "aurora bands",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_colored_light_bands_001"
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
          "red and green aurora bands"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sf_trees_001",
      "category": "environment",
      "label": "bare trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_tree_group_001",
        "obs_tree_silhouettes_001"
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
          "bare black tree silhouettes"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sf_setting_001",
      "category": "environment",
      "label": "stormy",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_lightning_001",
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
          "dark sky",
          "white lightning bolts"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "lightning",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ]
    },
    {
      "term": "aurora bands",
      "supporting_observation_ids": [
        "obs_colored_light_bands_001"
      ]
    },
    {
      "term": "bare trees",
      "supporting_observation_ids": [
        "obs_tree_group_001",
        "obs_tree_silhouettes_001"
      ]
    },
    {
      "term": "stormy",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_sky_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora bands",
        "source_observation_ids": [
          "obs_colored_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_colored_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "bare trees",
        "source_observation_ids": [
          "obs_tree_group_001",
          "obs_tree_silhouettes_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_lightning_002"
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
        "confidence": 0.99
      },
      {
        "concept": "stormy",
        "source_observation_ids": [
          "obs_lightning_001",
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_mountainous_terrain_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_tree_group_001",
          "obs_tree_silhouettes_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0102224`
- Artwork observations: `11`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium building structure, stadium roof framework, patterned ground, leaf emblem, trees, sky, pathway, traffic cones. Semantic facts: stadium, trees, water body, blue sky, light clouds, five traffic cones. Counts: traffic cones: 5.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium building structure with round shape and roof framework | stadium building structure | environment | midground | high | 1 |
| stadium roof framework with grid pattern | stadium roof framework | environment | background | medium | 1 |
| dark green patterned ground with lighter green trims and shapes | patterned ground | environment | foreground | high | 1 |
| green and white emblem with leaf symbol on stadium wall | leaf emblem | objects_and_props | midground | medium | 1 |
| dense group of green trees in background | trees | environment | background | medium | 1 |
| body of water visible behind the trees on right | water body | environment | background | low | 1 |
| blue sky with light clouds | sky | environment | background | medium | 1 |
| light-colored pathway or steps descending near water on right | pathway | environment | midground | medium | 1 |
| five orange and white traffic cones along a fence near bottom left | traffic cones | objects_and_props | foreground | medium | 1 |
| black metal fence bordering pathway near traffic cones | fence | objects_and_props | foreground | medium | 1 |
| green stadium light pole or tower on right side | light pole | objects_and_props | midground | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting includes large stadium building structure | obs_env_stadium_building_001 | 1 |
| fact_env_002 | environment | architecture includes roof framework structure | obs_env_stadium_roof_001 | 1 |
| fact_env_003 | environment | ground features dark green patterned floor with highlighted patterns | obs_env_ground_001 | 1 |
| fact_env_004 | environment | plants include dense green trees in background | obs_env_trees_group_001 | 1 |
| fact_env_005 | environment | water body visible behind trees | obs_env_water_001 | 1 |
| fact_env_006 | environment | sky is blue with light clouds | obs_env_sky_001 | 1 |
| fact_env_007 | objects_and_props | visible objects include traffic cones clustered near fence | obs_env_traffic_cones_001 | 1 |
| fact_env_008 | objects_and_props | black metal fence borders pathway near traffic cones | obs_env_fence_001 | 1 |
| fact_env_009 | objects_and_props | green light pole or tower structure on side | obs_env_light_tower_001 | 1 |
| fact_env_010 | objects_and_props | green and white leaf emblem on stadium wall | obs_env_logo_001 | 1 |

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
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_crop | medium | medium |  |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sf_001 | environment | stadium |  | obs_env_stadium_building_001, obs_env_stadium_roof_001 | roof framework stadium | 1 |
| sf_002 | environment | trees |  | obs_env_trees_group_001 | trees | 1 |
| sf_003 | environment | water body |  | obs_env_water_001 | water body | 1 |
| sf_004 | environment | blue sky |  | obs_env_sky_001 | blue sky | 1 |
| sf_005 | environment | light clouds |  | obs_env_sky_001 | light clouds | 1 |
| sf_006 | count_semantic | five traffic cones |  | obs_env_traffic_cones_001 | traffic cones | 1 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| traffic cones | exact | 5 | obs_env_traffic_cones_001 | 1 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| adjacent_to | obs_env_fence_001 | obs_env_traffic_cones_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| stadium building | obs_env_stadium_building_001 |
| roof framework | obs_env_stadium_roof_001 |
| leaf emblem | obs_env_logo_001 |
| traffic cones | obs_env_traffic_cones_001 |
| green trees | obs_env_trees_group_001 |
| water body | obs_env_water_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| blue sky | obs_env_sky_001 | deterministic_rule | 1 |
| building | obs_env_stadium_building_001 | deterministic_rule | 1 |
| fence | obs_env_fence_001 | deterministic_rule | 1 |
| five traffic cones | obs_env_traffic_cones_001 | deterministic_rule | 1 |
| light clouds | obs_env_sky_001 | deterministic_rule | 1 |
| sky | obs_env_sky_001 | deterministic_rule | 1 |
| stadium | obs_env_stadium_building_001, obs_env_stadium_roof_001 | deterministic_rule | 1 |
| terrain | obs_env_ground_001 | deterministic_rule | 1 |
| tree | obs_env_trees_group_001 | deterministic_rule | 1 |
| trees | obs_env_trees_group_001 | deterministic_rule | 1 |
| water | obs_env_water_001 | deterministic_rule | 1 |
| water body | obs_env_water_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium building structure, stadium roof framework, patterned ground, leaf emblem, trees, sky, pathway, traffic cones. Semantic facts: stadium, trees, water body, blue sky, light clouds, five traffic cones. Counts: traffic cones: 5.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_env_stadium_building_001",
      "kind": "environment",
      "label": "stadium building structure with round shape and roof framework",
      "normalized_label": "stadium building structure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_stadium_roof_001",
      "kind": "environment",
      "label": "stadium roof framework with grid pattern",
      "normalized_label": "stadium roof framework",
      "scene_layer": "background",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_ground_001",
      "kind": "environment",
      "label": "dark green patterned ground with lighter green trims and shapes",
      "normalized_label": "patterned ground",
      "scene_layer": "foreground",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_logo_001",
      "kind": "objects_and_props",
      "label": "green and white emblem with leaf symbol on stadium wall",
      "normalized_label": "leaf emblem",
      "scene_layer": "midground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_trees_group_001",
      "kind": "environment",
      "label": "dense group of green trees in background",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_water_001",
      "kind": "environment",
      "label": "body of water visible behind the trees on right",
      "normalized_label": "water body",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_sky_001",
      "kind": "environment",
      "label": "blue sky with light clouds",
      "normalized_label": "sky",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_pathway_001",
      "kind": "environment",
      "label": "light-colored pathway or steps descending near water on right",
      "normalized_label": "pathway",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_traffic_cones_001",
      "kind": "objects_and_props",
      "label": "five orange and white traffic cones along a fence near bottom left",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_fence_001",
      "kind": "objects_and_props",
      "label": "black metal fence bordering pathway near traffic cones",
      "normalized_label": "fence",
      "scene_layer": "foreground",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_light_tower_001",
      "kind": "objects_and_props",
      "label": "green stadium light pole or tower on right side",
      "normalized_label": "light pole",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting includes large stadium building structure",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_stadium_building_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "architecture",
      "claim": "architecture includes roof framework structure",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_stadium_roof_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "ground",
      "claim": "ground features dark green patterned floor with highlighted patterns",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_ground_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "plants",
      "claim": "plants include dense green trees in background",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_trees_group_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "water",
      "claim": "water body visible behind trees",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_water_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky is blue with light clouds",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_sky_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "visible objects include traffic cones clustered near fence",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_traffic_cones_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "black metal fence borders pathway near traffic cones",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_fence_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_009",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "green light pole or tower structure on side",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_light_tower_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_010",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "green and white leaf emblem on stadium wall",
      "value": "true",
      "supporting_observation_ids": [
        "obs_env_logo_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_traffic_cones_001",
      "normalized_label": "traffic cones",
      "count_type": "exact",
      "exact_count": 5,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_env_traffic_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_env_fence_001",
      "obs_env_ground_001",
      "obs_env_traffic_cones_001"
    ],
    "midground": [
      "obs_env_light_tower_001",
      "obs_env_logo_001",
      "obs_env_pathway_001",
      "obs_env_stadium_building_001"
    ],
    "background": [
      "obs_env_sky_001",
      "obs_env_stadium_roof_001",
      "obs_env_trees_group_001",
      "obs_env_water_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue",
      "light clouds"
    ],
    "ground": [
      "dark green patterned ground"
    ],
    "terrain": [],
    "plants": [
      "green trees"
    ],
    "architecture": [
      "roof framework",
      "stadium building"
    ],
    "water": [
      "water body"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_ground_001",
      "obs_env_sky_001",
      "obs_env_stadium_building_001",
      "obs_env_stadium_roof_001",
      "obs_env_trees_group_001",
      "obs_env_water_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_env_traffic_cones_001",
      "label": "traffic cones",
      "normalized_label": "traffic cones",
      "object_type": "object",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [
        "plastic-like appearance"
      ],
      "location": "bottom-left near fence",
      "count_reference": "count_traffic_cones_001",
      "confidence": 1
    },
    {
      "observation_id": "obs_env_fence_001",
      "label": "black metal fence",
      "normalized_label": "fence",
      "object_type": "object",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "metal-like appearance"
      ],
      "location": "foreground left",
      "count_reference": "not_counted",
      "confidence": 1
    },
    {
      "observation_id": "obs_env_light_tower_001",
      "label": "green light pole or tower",
      "normalized_label": "light pole",
      "object_type": "object",
      "colors": [
        "green"
      ],
      "material_appearance": [],
      "location": "right side",
      "count_reference": "not_counted",
      "confidence": 1
    },
    {
      "observation_id": "obs_env_logo_001",
      "label": "green and white emblem with leaf symbol",
      "normalized_label": "leaf emblem",
      "object_type": "object",
      "colors": [
        "green",
        "white"
      ],
      "material_appearance": [
        "painted"
      ],
      "location": "stadium wall",
      "count_reference": "not_counted",
      "confidence": 1
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_env_fence_001",
      "target_observation_id": "obs_env_traffic_cones_001",
      "relationship": "adjacent_to",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "blue",
      "dark brown",
      "green",
      "orange",
      "white"
    ],
    "lighting": [
      "bright outdoor light"
    ],
    "shadows": [
      "soft shadows under cones and fence"
    ],
    "highlights": [
      "roof structure highlights"
    ],
    "composition": [
      "background trees framing scene",
      "centered stadium",
      "foreground cones leading eye"
    ],
    "camera_angle": "wide angle eye-level",
    "framing": "portrait card vertical framing",
    "cropping": [
      "full stadium side visible",
      "no major crop on cones or trees"
    ],
    "depth": "deep with foreground, midground, background clearly visible",
    "motion_cues": [],
    "motifs": [
      "leaf emblem",
      "zigzag ground patterns"
    ],
    "repeated_shapes": [
      "cones",
      "roof grid"
    ],
    "style_cues": [
      "detailed realistic illustration",
      "smooth textures"
    ],
    "supporting_observation_ids": [
      "obs_env_fence_001",
      "obs_env_ground_001",
      "obs_env_light_tower_001",
      "obs_env_logo_001",
      "obs_env_sky_001",
      "obs_env_stadium_building_001",
      "obs_env_stadium_roof_001",
      "obs_env_traffic_cones_001",
      "obs_env_trees_group_001"
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
    "relationships_review": "observed",
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
        "fact_env_007",
        "fact_env_008",
        "fact_env_009",
        "fact_env_010"
      ],
      "object_observation_ids": [
        "obs_env_fence_001",
        "obs_env_light_tower_001",
        "obs_env_logo_001",
        "obs_env_traffic_cones_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004",
        "fact_env_005",
        "fact_env_006"
      ],
      "observation_ids": [
        "obs_env_ground_001",
        "obs_env_sky_001",
        "obs_env_stadium_building_001",
        "obs_env_stadium_roof_001",
        "obs_env_trees_group_001",
        "obs_env_water_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_ground_001",
        "obs_env_stadium_building_001",
        "obs_env_traffic_cones_001",
        "obs_env_trees_group_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_ground_001",
        "obs_env_sky_001",
        "obs_env_stadium_building_001"
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
        "count_traffic_cones_001"
      ]
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
        "stadium building",
        "roof framework",
        "leaf emblem",
        "traffic cones",
        "green trees",
        "water body"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "review_status": "complete",
      "omission_risk": "low",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "fact_grounded_search_terms",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sf_001",
      "category": "environment",
      "label": "stadium",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_stadium_building_001",
        "obs_env_stadium_roof_001"
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
          "roof framework",
          "stadium"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sf_002",
      "category": "environment",
      "label": "trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_trees_group_001"
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
          "trees"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sf_003",
      "category": "environment",
      "label": "water body",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_water_001"
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
          "water body"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sf_004",
      "category": "environment",
      "label": "blue sky",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_sky_001"
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
          "blue sky"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sf_005",
      "category": "environment",
      "label": "light clouds",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_sky_001"
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
          "light clouds"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sf_006",
      "category": "count_semantic",
      "label": "five traffic cones",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_traffic_cones_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [],
        "objects": [
          "traffic cones"
        ],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "stadium building",
      "supporting_observation_ids": [
        "obs_env_stadium_building_001"
      ]
    },
    {
      "term": "roof framework",
      "supporting_observation_ids": [
        "obs_env_stadium_roof_001"
      ]
    },
    {
      "term": "leaf emblem",
      "supporting_observation_ids": [
        "obs_env_logo_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_env_traffic_cones_001"
      ]
    },
    {
      "term": "green trees",
      "supporting_observation_ids": [
        "obs_env_trees_group_001"
      ]
    },
    {
      "term": "water body",
      "supporting_observation_ids": [
        "obs_env_water_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "blue sky",
        "source_observation_ids": [
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_env_stadium_building_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "fence",
        "source_observation_ids": [
          "obs_env_fence_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "five traffic cones",
        "source_observation_ids": [
          "obs_env_traffic_cones_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "light clouds",
        "source_observation_ids": [
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "stadium",
        "source_observation_ids": [
          "obs_env_stadium_building_001",
          "obs_env_stadium_roof_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_env_ground_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_env_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "trees",
        "source_observation_ids": [
          "obs_env_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_env_water_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "water body",
        "source_observation_ids": [
          "obs_env_water_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-PMCG6-085 - Cinnabar City Gym

- Branch: `stadium`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.98`
- Cost USD: `0.008274`
- Artwork observations: `7`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: lava pool, stairs, stone platform, rocky walls with lava, flowing lava, orange glow, color palette.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| lava pool | lava pool | environment | midground | high | 0.99 |
| stairs leading to platform | stairs | environment | midground | medium | 0.97 |
| stone platform with red and black triangular pattern with white Pokeball symbol | stone platform | environment | midground | high | 0.99 |
| rocky walls with cracks and flowing lava streams | rocky walls with lava | environment | background | high | 0.98 |
| lava flowing from upper left to pool | flowing lava | environment | background | medium | 0.95 |
| orange glow around lava and platform | orange glow | environment | midground | medium | 0.95 |
| color palette of reds, oranges, yellows, blacks, and grays | color palette | objects_and_props | full card | high | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Trainer header text in black on yellow-gold bar | card_ui_text | top center | visible | 0.99 |
| Japanese text below header and beside artwork | card_ui_text | just below header, beside artwork | visible | 0.95 |
| Japanese text block below artwork | card_ui_text | below artwork | visible | 0.95 |
| silver energy symbol below artwork to left | card_ui_symbol | just below artwork left | visible | 0.98 |
| copyright and illustrator text at bottom left | card_ui_text | bottom left | visible | 0.9 |
| set symbol on bottom right | card_ui_symbol | bottom right | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | presence of lava pool environment | obs_environment_001, obs_environment_004, obs_environment_005 | 0.99 |
| fact_env_002 | environment | presence of stone platform with distinct pattern | obs_environment_003 | 0.99 |
| fact_env_003 | environment | presence of stairs leading to platform | obs_environment_002 | 0.97 |
| fact_env_004 | environment | presence of orange glow from lava | obs_environment_006 | 0.95 |
| fact_env_005 | environment | presence of rocky cavern walls | obs_environment_004 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | card header text 'TRAINER' in black on yellow-gold bar | obs_card_ui_001 | 0.99 |
| fact_ui_002 | Japanese text below header and to the right of header | obs_card_ui_002, obs_card_ui_003 | 0.95 |
| fact_ui_003 | silver energy symbol below artwork left | obs_card_ui_004 | 0.98 |
| fact_ui_004 | copyright and illustrator text at bottom left | obs_card_ui_005 | 0.9 |
| fact_ui_005 | set symbol at bottom right | obs_card_ui_006 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_001",
    "fact_ui_002",
    "fact_ui_003",
    "fact_ui_004",
    "fact_ui_005"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [
    "obs_card_ui_006"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_005"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_004"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_005"
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
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| lava pool | obs_environment_001 |
| stone platform | obs_environment_003 |
| stairs | obs_environment_002 |
| orange glow | obs_environment_006 |
| red and black triangular pattern | obs_environment_003 |
| Pokeball symbol | obs_environment_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_002 | deterministic_rule | 0.92 |
| glowing highlights | obs_environment_006 | deterministic_rule | 0.95 |
| stairs | obs_environment_002 | deterministic_rule | 0.97 |
| upward orientation | obs_environment_002 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: lava pool, stairs, stone platform, rocky walls with lava, flowing lava, orange glow, color palette.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "lava pool",
      "normalized_label": "lava pool",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "stairs leading to platform",
      "normalized_label": "stairs",
      "scene_layer": "midground",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "stone platform with red and black triangular pattern with white Pokeball symbol",
      "normalized_label": "stone platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "environment",
      "label": "rocky walls with cracks and flowing lava streams",
      "normalized_label": "rocky walls with lava",
      "scene_layer": "background",
      "frame_position": "full background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_005",
      "kind": "environment",
      "label": "lava flowing from upper left to pool",
      "normalized_label": "flowing lava",
      "scene_layer": "background",
      "frame_position": "upper left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_006",
      "kind": "environment",
      "label": "orange glow around lava and platform",
      "normalized_label": "orange glow",
      "scene_layer": "midground",
      "frame_position": "around platform",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "objects_and_props",
      "label": "color palette of reds, oranges, yellows, blacks, and grays",
      "normalized_label": "color palette",
      "scene_layer": "full card",
      "frame_position": "all",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "Trainer header text in black on yellow-gold bar",
      "normalized_label": "card header text",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "Japanese text below header and beside artwork",
      "normalized_label": "Japanese text",
      "scene_layer": "foreground",
      "frame_position": "just below header, beside artwork",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "Japanese text block below artwork",
      "normalized_label": "Japanese text block",
      "scene_layer": "foreground",
      "frame_position": "below artwork",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_symbol",
      "label": "silver energy symbol below artwork to left",
      "normalized_label": "energy symbol",
      "scene_layer": "foreground",
      "frame_position": "just below artwork left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "copyright and illustrator text at bottom left",
      "normalized_label": "copyright line",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_symbol",
      "label": "set symbol on bottom right",
      "normalized_label": "set symbol",
      "scene_layer": "foreground",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "terrain.lava_pool",
      "claim": "presence of lava pool environment",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_004",
        "obs_environment_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "structure.stone_platform",
      "claim": "presence of stone platform with distinct pattern",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "structure.stairs",
      "claim": "presence of stairs leading to platform",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "lighting.lava_glow",
      "claim": "presence of orange glow from lava",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "terrain.rocky_walls",
      "claim": "presence of rocky cavern walls",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "header_text",
      "claim": "card header text 'TRAINER' in black on yellow-gold bar",
      "value": "TRAINER",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "Japanese_text",
      "claim": "Japanese text below header and to the right of header",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_002",
        "obs_card_ui_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "silver energy symbol below artwork left",
      "value": "silver energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright and illustrator text at bottom left",
      "value": "visible but not fully legible",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol at bottom right",
      "value": "set symbol visible",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_card_ui_001",
      "obs_card_ui_002",
      "obs_card_ui_003",
      "obs_card_ui_004",
      "obs_card_ui_005",
      "obs_card_ui_006"
    ],
    "midground": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_006"
    ],
    "background": [
      "obs_environment_004",
      "obs_environment_005"
    ]
  },
  "environment": {
    "setting": [
      "lava pool",
      "rocky walls",
      "stairs",
      "stone platform"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "lava pool",
      "stone floor platform"
    ],
    "terrain": [
      "lava streams",
      "rocky cavern walls"
    ],
    "plants": [],
    "architecture": [
      "stairs",
      "stone platform"
    ],
    "water": [
      "lava"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005",
      "obs_environment_006"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "gray",
      "orange",
      "red",
      "yellow"
    ],
    "lighting": [
      "orange glow from lava"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights on lava and platform"
    ],
    "composition": [
      "centered platform with stairs leading up"
    ],
    "camera_angle": "slightly elevated front angle",
    "framing": "tight frame around platform and lava pool",
    "cropping": [],
    "depth": "clear depth between foreground UI and midground artwork",
    "motion_cues": [
      "lava flow"
    ],
    "motifs": [
      "Pokeball symbol",
      "triangular pattern on platform"
    ],
    "repeated_shapes": [
      "triangles"
    ],
    "style_cues": [
      "realistic rock texture",
      "stylized lava flow"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005",
      "obs_environment_006"
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
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004",
        "fact_env_005"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004",
        "obs_environment_005",
        "obs_environment_006"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_env_004"
      ],
      "observation_ids": [
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_006"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_env_004"
      ],
      "observation_ids": [
        "obs_environment_006"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [
        "obs_card_ui_006"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_005"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_004"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_005"
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
        "lava pool",
        "stone platform",
        "stairs",
        "orange glow",
        "red and black triangular pattern",
        "Pokeball symbol"
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "lava pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "stone platform",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "stairs",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "orange glow",
      "supporting_observation_ids": [
        "obs_environment_006"
      ]
    },
    {
      "term": "red and black triangular pattern",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "Pokeball symbol",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_environment_006"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "stairs",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "upward orientation",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11525-019 - High Pressure System

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0078364`
- Artwork observations: `13`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Counts: palm trees: 4-6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| blue sky with white clouds | blue sky with white clouds | sky | background | salient | 0.99 |
| purple and white light streaks in sky | purple and white light streaks in sky | light_band | background | prominent | 0.98 |
| pink light circular glow near horizon center | pink light circular glow near horizon center | light_band | background | prominent | 0.98 |
| rocky ground with cracks and small stones | rocky ground | terrain | midground | prominent | 0.98 |
| large flat grassy green circle center ground | grass patch ground | terrain | midground | salient | 0.99 |
| stone steps leading up to grassy circle | stone steps | object | midground | salient | 0.98 |
| cluster of palm trees on right with broad leaves | palm trees | tree | midground | prominent | 0.99 |
| group of palm trees on left side with broad leaves | palm trees | tree | midground | prominent | 0.99 |
| low stone wall surrounding grassy circle | stone wall | architecture | midground | prominent | 0.97 |
| circular symbol or design on grassy circle | circle symbol on grass | object | midground | salient | 0.98 |
| color palette includes blue, green, brown, purple, pink, white | color palette varied natural colors | palette | background and midground | salient | 0.99 |
| diffuse daylight with glow effect in center sky | daylight diffuse with glow | lighting | background | prominent | 0.99 |
| center-ground grassy circle flanked by palm trees left and right | center composition with framing trees | composition | midground | salient | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | sky includes blue color and white clouds | obs_sky_001 | 0.99 |
| fact_env_002 | environment | presence of purple and white light streaks in sky | obs_light_band_001 | 0.98 |
| fact_env_003 | environment | pink glowing light circle near horizon center | obs_light_band_002 | 0.98 |
| fact_env_004 | environment | rocky ground with cracks and small stones | obs_terrain_001 | 0.98 |
| fact_env_005 | environment | large flat grassy circular patch on ground center | obs_terrain_002 | 0.99 |
| fact_env_006 | environment | stone steps leading to grassy patch | obs_object_001 | 0.98 |
| fact_env_007 | environment | palm trees with broad leaves on right | obs_tree_group_001 | 0.99 |
| fact_env_008 | environment | palm trees with broad leaves on left | obs_tree_group_002 | 0.99 |
| fact_env_009 | environment | low stone wall surrounding grassy circle | obs_architecture_001 | 0.97 |
| fact_env_010 | environment | circular symbol on grassy patch center | obs_object_002 | 0.98 |
| fact_design_001 | color_and_light | color palette includes blue, green, brown, purple, pink, and white | obs_palette_001 | 0.99 |
| fact_design_002 | color_and_light | diffuse daylight with glow in center sky | obs_lighting_001 | 0.99 |
| fact_design_003 | composition | center-ground grassy circle flanked by palm trees left and right | obs_composition_001 | 0.99 |

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
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text_observation_ids: text not fully readable due to low resolution; collector_number_observation_ids: text not fully readable due to low resolution; set_symbol_observation_ids: print symbol not fully clear |
| counts | complete | low | high |  |
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
| palm trees | estimated_range | 4-6 | obs_tree_group_001, obs_tree_group_002 | 0.98 |

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
| purple and white light streaks in sky | obs_light_band_001 |
| pink light circular glow near horizon center | obs_light_band_002 |
| rocky ground | obs_terrain_001 |
| grass patch ground | obs_terrain_002 |
| stone steps | obs_object_001 |
| palm trees | obs_tree_group_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora-like light bands | obs_light_band_001, obs_light_band_002 | deterministic_rule | 0.98 |
| building | obs_architecture_001 | deterministic_rule | 0.97 |
| circular motif | obs_light_band_002, obs_object_002 | deterministic_rule | 0.98 |
| cloud | obs_sky_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_light_band_001, obs_light_band_002, obs_lighting_001 | deterministic_rule | 0.99 |
| sky | obs_light_band_001, obs_sky_001 | deterministic_rule | 0.99 |
| stairs | obs_object_001 | deterministic_rule | 0.98 |
| terrain | obs_object_002, obs_terrain_001, obs_terrain_002 | deterministic_rule | 0.99 |
| tree | obs_composition_001, obs_tree_group_001, obs_tree_group_002 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: palm trees: 4-6.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "blue sky with white clouds",
      "normalized_label": "blue sky with white clouds",
      "scene_layer": "background",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_band_001",
      "kind": "light_band",
      "label": "purple and white light streaks in sky",
      "normalized_label": "purple and white light streaks in sky",
      "scene_layer": "background",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_band_002",
      "kind": "light_band",
      "label": "pink light circular glow near horizon center",
      "normalized_label": "pink light circular glow near horizon center",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_001",
      "kind": "terrain",
      "label": "rocky ground with cracks and small stones",
      "normalized_label": "rocky ground",
      "scene_layer": "midground",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_002",
      "kind": "terrain",
      "label": "large flat grassy green circle center ground",
      "normalized_label": "grass patch ground",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "stone steps leading up to grassy circle",
      "normalized_label": "stone steps",
      "scene_layer": "midground",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_group_001",
      "kind": "tree",
      "label": "cluster of palm trees on right with broad leaves",
      "normalized_label": "palm trees",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_group_002",
      "kind": "tree",
      "label": "group of palm trees on left side with broad leaves",
      "normalized_label": "palm trees",
      "scene_layer": "midground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_architecture_001",
      "kind": "architecture",
      "label": "low stone wall surrounding grassy circle",
      "normalized_label": "stone wall",
      "scene_layer": "midground",
      "frame_position": "center-back",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "circular symbol or design on grassy circle",
      "normalized_label": "circle symbol on grass",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "palette",
      "label": "color palette includes blue, green, brown, purple, pink, white",
      "normalized_label": "color palette varied natural colors",
      "scene_layer": "background and midground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "lighting",
      "label": "diffuse daylight with glow effect in center sky",
      "normalized_label": "daylight diffuse with glow",
      "scene_layer": "background",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "center-ground grassy circle flanked by palm trees left and right",
      "normalized_label": "center composition with framing trees",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky includes blue color and white clouds",
      "value": "blue sky and white clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "sky",
      "claim": "presence of purple and white light streaks in sky",
      "value": "purple and white light streaks",
      "supporting_observation_ids": [
        "obs_light_band_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "sky",
      "claim": "pink glowing light circle near horizon center",
      "value": "pink glow near horizon",
      "supporting_observation_ids": [
        "obs_light_band_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "terrain",
      "claim": "rocky ground with cracks and small stones",
      "value": "rocky ground",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "terrain",
      "claim": "large flat grassy circular patch on ground center",
      "value": "grassy circular patch",
      "supporting_observation_ids": [
        "obs_terrain_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "stone steps leading to grassy patch",
      "value": "stone steps on ground",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "plants",
      "claim": "palm trees with broad leaves on right",
      "value": "palm trees on right",
      "supporting_observation_ids": [
        "obs_tree_group_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "environment",
      "field_path": "plants",
      "claim": "palm trees with broad leaves on left",
      "value": "palm trees on left",
      "supporting_observation_ids": [
        "obs_tree_group_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_009",
      "module": "environment",
      "field_path": "architecture",
      "claim": "low stone wall surrounding grassy circle",
      "value": "stone wall surrounding grassy patch",
      "supporting_observation_ids": [
        "obs_architecture_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_010",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "circular symbol on grassy patch center",
      "value": "circular symbol on grass",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_design_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "color palette includes blue, green, brown, purple, pink, and white",
      "value": "varied natural colors",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_design_002",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "diffuse daylight with glow in center sky",
      "value": "daylight diffuse with glow",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_design_003",
      "module": "composition",
      "field_path": "composition",
      "claim": "center-ground grassy circle flanked by palm trees left and right",
      "value": "center composition with framing trees",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_trees_001",
      "normalized_label": "palm trees",
      "count_type": "estimated_range",
      "exact_count": 0,
      "estimated_min": 4,
      "estimated_max": 6,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_tree_group_001",
        "obs_tree_group_002"
      ],
      "scene_layer": "midground",
      "confidence": 0.98
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_architecture_001",
      "obs_composition_001",
      "obs_object_001",
      "obs_object_002",
      "obs_terrain_001",
      "obs_terrain_002",
      "obs_tree_group_001",
      "obs_tree_group_002"
    ],
    "background": [
      "obs_light_band_001",
      "obs_light_band_002",
      "obs_lighting_001",
      "obs_palette_001",
      "obs_sky_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky with white clouds",
      "pink light circular glow",
      "purple and white light streaks"
    ],
    "ground": [
      "grassy circle",
      "rocky ground"
    ],
    "terrain": [
      "grassy circle",
      "rocky ground"
    ],
    "plants": [
      "palm trees"
    ],
    "architecture": [
      "stone wall"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_architecture_001",
      "obs_light_band_001",
      "obs_light_band_002",
      "obs_sky_001",
      "obs_terrain_001",
      "obs_terrain_002",
      "obs_tree_group_001",
      "obs_tree_group_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "stone steps",
      "normalized_label": "stone steps",
      "object_type": "steps",
      "colors": [
        "brown",
        "gray"
      ],
      "material_appearance": [
        "rough",
        "stone-like appearance"
      ],
      "location": "bottom-center",
      "count_reference": "count_steps_001",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_object_002",
      "label": "circular symbol on grass",
      "normalized_label": "circular symbol",
      "object_type": "symbol",
      "colors": [
        "dark green"
      ],
      "material_appearance": [
        "painted or natural variation"
      ],
      "location": "center",
      "count_reference": "count_symbol_001",
      "confidence": 0.98
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "green",
      "pink",
      "purple",
      "white"
    ],
    "lighting": [
      "diffuse daylight",
      "glow effect"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "glowing light streaks"
    ],
    "composition": [
      "center framed by trees",
      "circular grassy patch focus"
    ],
    "camera_angle": "straight-on",
    "framing": "centered",
    "cropping": [
      "full card art visible"
    ],
    "depth": "deep scene with foreground and background",
    "motion_cues": [],
    "motifs": [
      "nature",
      "tropical"
    ],
    "repeated_shapes": [
      "circular grassy patch",
      "circular symbol"
    ],
    "style_cues": [
      "digital illustration",
      "soft shading"
    ],
    "supporting_observation_ids": [
      "obs_architecture_001",
      "obs_composition_001",
      "obs_light_band_001",
      "obs_light_band_002",
      "obs_lighting_001",
      "obs_object_002",
      "obs_sky_001",
      "obs_terrain_001",
      "obs_terrain_002",
      "obs_tree_group_001",
      "obs_tree_group_002"
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
        "fact_env_006",
        "fact_env_010"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_002"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004",
        "fact_env_005",
        "fact_env_007",
        "fact_env_008",
        "fact_env_009"
      ],
      "observation_ids": [
        "obs_architecture_001",
        "obs_light_band_001",
        "obs_light_band_002",
        "obs_sky_001",
        "obs_terrain_001",
        "obs_terrain_002",
        "obs_tree_group_001",
        "obs_tree_group_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_design_003"
      ],
      "observation_ids": [
        "obs_composition_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_design_001",
        "fact_design_002"
      ],
      "observation_ids": [
        "obs_lighting_001",
        "obs_palette_001"
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
        "purple and white light streaks in sky",
        "pink light circular glow near horizon center",
        "rocky ground",
        "grass patch ground",
        "stone steps",
        "palm trees"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text_observation_ids",
          "reason": "text not fully readable due to low resolution",
          "affected_observation_ids": []
        },
        {
          "field_path": "collector_number_observation_ids",
          "reason": "text not fully readable due to low resolution",
          "affected_observation_ids": []
        },
        {
          "field_path": "set_symbol_observation_ids",
          "reason": "print symbol not fully clear",
          "affected_observation_ids": []
        }
      ]
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
      "term": "purple and white light streaks in sky",
      "supporting_observation_ids": [
        "obs_light_band_001"
      ]
    },
    {
      "term": "pink light circular glow near horizon center",
      "supporting_observation_ids": [
        "obs_light_band_002"
      ]
    },
    {
      "term": "rocky ground",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ]
    },
    {
      "term": "grass patch ground",
      "supporting_observation_ids": [
        "obs_terrain_002"
      ]
    },
    {
      "term": "stone steps",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "palm trees",
      "supporting_observation_ids": [
        "obs_tree_group_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_light_band_001",
          "obs_light_band_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_architecture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_light_band_002",
          "obs_object_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_light_band_001",
          "obs_light_band_002",
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_light_band_001",
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "stairs",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_object_002",
          "obs_terrain_001",
          "obs_terrain_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_tree_group_001",
          "obs_tree_group_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-106 - Tremendous Bomb

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.00659`
- Artwork observations: `5`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Visible observations: bomb, bomb body panels, bomb fuse, bomb fuse spark, radiating burst background. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | high | 0.99 |
| bomb round segmented body panels | bomb body panels | object | foreground | medium | 0.95 |
| bomb fuse | bomb fuse | object | foreground | medium | 0.95 |
| bomb lit fuse spark | bomb fuse spark | object | foreground | medium | 0.95 |
| blue and orange radiating burst background | radiating burst background | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top_left | visible | 0.99 |
| card type text in Japanese at top right | card_ui_text | top_right | visible | 0.9 |
| attack or effect description text in Japanese | card_ui_text | lower_half | visible | 0.95 |
| illustration credit text: Illus. inose yukie | card_ui_text | bottom_left | visible | 0.95 |
| card number and rarity text: J M5 106/081 SR | card_ui_text | bottom_left_near_illustrator | visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | object is bomb | obs_obj_001 | 0.99 |
| fact_002 | objects_and_props | bomb body has segmented black rounded panels | obs_obj_002 | 0.95 |
| fact_003 | objects_and_props | bomb has a red fuse | obs_obj_003 | 0.95 |
| fact_004 | objects_and_props | bomb fuse is lit with bright spark | obs_obj_004 | 0.95 |
| fact_005 | environment | card artwork background has blue and orange radiating burst | obs_env_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_006 | card name text is Japanese text 'ごうかいボム' | obs_text_001 | 0.99 |
| fact_007 | card type text in Japanese at top right | obs_text_002 | 0.9 |
| fact_008 | card description text with attack/effect in Japanese | obs_text_003 | 0.95 |
| fact_009 | illustrator text 'Illus. inose yukie' visible | obs_text_004 | 0.95 |
| fact_010 | card number and rarity text 'J M5 106/081 SR' visible | obs_text_005 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_006",
    "fact_007",
    "fact_008",
    "fact_009",
    "fact_010"
  ],
  "name_text_observation_ids": [
    "obs_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_text_005"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_text_005"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_text_004"
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
| objects_and_props | complete | none | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_obj_001 | 0.99 |

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
| bomb | obs_obj_001 |
| bomb body panels | obs_obj_002 |
| bomb fuse | obs_obj_003 |
| bomb fuse spark | obs_obj_004 |
| radiating burst background | obs_env_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_env_001 | deterministic_rule | 0.92 |
| circular motif | obs_obj_002 | deterministic_rule | 0.92 |
| spark | obs_obj_004 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body panels, bomb fuse, bomb fuse spark, radiating burst background. Counts: bomb: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_obj_001",
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
      "observation_id": "obs_obj_002",
      "kind": "object",
      "label": "bomb round segmented body panels",
      "normalized_label": "bomb body panels",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_003",
      "kind": "object",
      "label": "bomb fuse",
      "normalized_label": "bomb fuse",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_004",
      "kind": "object",
      "label": "bomb lit fuse spark",
      "normalized_label": "bomb fuse spark",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_001",
      "kind": "environment",
      "label": "blue and orange radiating burst background",
      "normalized_label": "radiating burst background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name text Japanese",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_002",
      "kind": "card_ui_text",
      "label": "card type text in Japanese at top right",
      "normalized_label": "card type text Japanese",
      "scene_layer": "interface",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_003",
      "kind": "card_ui_text",
      "label": "attack or effect description text in Japanese",
      "normalized_label": "card description text Japanese",
      "scene_layer": "interface",
      "frame_position": "lower_half",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_004",
      "kind": "card_ui_text",
      "label": "illustration credit text: Illus. inose yukie",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_005",
      "kind": "card_ui_text",
      "label": "card number and rarity text: J M5 106/081 SR",
      "normalized_label": "card number and rarity text",
      "scene_layer": "interface",
      "frame_position": "bottom_left_near_illustrator",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "0.label",
      "claim": "object is bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_obj_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "1.label",
      "claim": "bomb body has segmented black rounded panels",
      "value": "black segmented body panels",
      "supporting_observation_ids": [
        "obs_obj_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "2.label",
      "claim": "bomb has a red fuse",
      "value": "red fuse",
      "supporting_observation_ids": [
        "obs_obj_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "objects_and_props",
      "field_path": "3.label",
      "claim": "bomb fuse is lit with bright spark",
      "value": "lit fuse spark",
      "supporting_observation_ids": [
        "obs_obj_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "environment",
      "field_path": "0.label",
      "claim": "card artwork background has blue and orange radiating burst",
      "value": "blue and orange radiating burst background",
      "supporting_observation_ids": [
        "obs_env_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text is Japanese text 'ごうかいボム'",
      "value": "Japanese card name text",
      "supporting_observation_ids": [
        "obs_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "card_type_text_observation_ids",
      "claim": "card type text in Japanese at top right",
      "value": "Japanese card type text",
      "supporting_observation_ids": [
        "obs_text_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "description_text_observation_ids",
      "claim": "card description text with attack/effect in Japanese",
      "value": "Japanese description text",
      "supporting_observation_ids": [
        "obs_text_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator text 'Illus. inose yukie' visible",
      "value": "illustrator text",
      "supporting_observation_ids": [
        "obs_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "card number and rarity text 'J M5 106/081 SR' visible",
      "value": "card number and rarity text",
      "supporting_observation_ids": [
        "obs_text_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_obj_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_obj_001",
      "obs_obj_002",
      "obs_obj_003",
      "obs_obj_004"
    ],
    "midground": [],
    "background": [
      "obs_env_001"
    ]
  },
  "environment": {
    "setting": [
      "radiating burst"
    ],
    "indoor_outdoor": "not_visible",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "misc tool or device",
      "colors": [
        "black",
        "red",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "bright spark on fuse tip",
        "dark rounded body",
        "white and gray segmented panels",
        "yellow band"
      ],
      "location": "center",
      "count_reference": "count_001",
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
      "bright fuse spark highlight",
      "white light reflection on bomb surface"
    ],
    "shadows": [
      "black rounded shadow panels on bomb body"
    ],
    "highlights": [
      "bright spark on fuse",
      "white highlights on bomb body"
    ],
    "composition": [
      "centered bomb with radiating burst background"
    ],
    "camera_angle": "frontal",
    "framing": "tight around bomb and fuse",
    "cropping": [
      "full bomb visible",
      "fuse and spark visible"
    ],
    "depth": "shallow",
    "motion_cues": [
      "lit fuse spark with flame"
    ],
    "motifs": [
      "circular segmented body",
      "radiating burst"
    ],
    "repeated_shapes": [
      "bomb body panels"
    ],
    "style_cues": [
      "bold colors",
      "cartoonish"
    ],
    "supporting_observation_ids": [
      "obs_env_001",
      "obs_obj_001",
      "obs_obj_002",
      "obs_obj_003",
      "obs_obj_004"
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
        "fact_001",
        "fact_002",
        "fact_003",
        "fact_004"
      ],
      "object_observation_ids": [
        "obs_obj_001",
        "obs_obj_002",
        "obs_obj_003",
        "obs_obj_004"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_005"
      ],
      "observation_ids": [
        "obs_env_001"
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
        "fact_006",
        "fact_007",
        "fact_008",
        "fact_009",
        "fact_010"
      ],
      "name_text_observation_ids": [
        "obs_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_text_005"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_text_005"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_text_004"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
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
        "bomb",
        "bomb body panels",
        "bomb fuse",
        "bomb fuse spark",
        "radiating burst background"
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
      "review_status": "none_visible",
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
        "obs_obj_001"
      ]
    },
    {
      "term": "bomb body panels",
      "supporting_observation_ids": [
        "obs_obj_002"
      ]
    },
    {
      "term": "bomb fuse",
      "supporting_observation_ids": [
        "obs_obj_003"
      ]
    },
    {
      "term": "bomb fuse spark",
      "supporting_observation_ids": [
        "obs_obj_004"
      ]
    },
    {
      "term": "radiating burst background",
      "supporting_observation_ids": [
        "obs_env_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_env_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_obj_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_obj_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-105 - Dark Bell

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.9`
- Attribute confidence: `0.9`
- Cost USD: `0.0092084`
- Artwork observations: `5`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Visible observations: dark bell, upper bell handle polygonal facets, bell body polygonal facets circular inner element, dark black dark gray white outlines bell, purple blue swirl background. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark bell | dark bell | object | midground | high | 0.99 |
| upper part of bell handle with polygonal facets | upper bell handle polygonal facets | object | midground | medium | 0.95 |
| bell body with polygonal facets and circular inner element | bell body polygonal facets circular inner element | object | midground | high | 0.98 |
| dark black and dark gray colors with white outlines on bell | dark black dark gray white outlines bell | object | midground | high | 0.97 |
| purple blue swirl background | purple blue swirl background | object | background | medium | 0.93 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese card title "ダークベル" | card_ui_text | top left | visible | 0.9 |
| Japanese text in top left corner "グッズ" (goods) | card_ui_text | top left | visible | 0.85 |
| Japanese text in top right corner "トレーナーズ" (trainers) | card_ui_text | top right | visible | 0.85 |
| Japanese explanatory text on bottom left | card_ui_text | bottom left | visible | 0.8 |
| illustrator credit "Illus. Toysto Beach" bottom left | illustrator_text | bottom left | visible | 0.9 |
| set and card number "J M5 105/081 SR" bottom left | collector_number | bottom left | visible | 0.9 |
| copyright line "©2026 Pokémon/Nintendo/Creatures/GAME FREAK." bottom center | copyright_text | bottom center | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_dark_bell_001 | objects_and_props | The main object is a dark bell | obs_object_colors_001, obs_object_dark_bell_001, obs_object_shape_lower_part_001, obs_object_shape_upper_part_001 | 0.99 |
| fact_obj_shape_upper_001 | objects_and_props | Upper part of bell handle has polygonal facets | obs_object_shape_upper_part_001 | 0.95 |
| fact_obj_shape_lower_001 | objects_and_props | Bell body has polygonal facets with visible circular inner element | obs_object_shape_lower_part_001 | 0.98 |
| fact_obj_colors_001 | color_and_light | Bell has dark black and dark gray colors with white outlines | obs_object_colors_001 | 0.97 |
| fact_env_background_001 | environment | Background features purple and blue swirl pattern | obs_background_swirl_001 | 0.93 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_text_title_001 | Card title is "ダークベル" in Japanese | obs_text_japanese_title_001 | 0.9 |
| fact_card_ui_text_top_left_001 | Top left Japanese word "グッズ" (Goods) is visible | obs_text_japanese_top_left_001 | 0.85 |
| fact_card_ui_text_top_right_001 | Top right Japanese word "トレーナーズ" (Trainers) is visible | obs_text_japanese_top_right_001 | 0.85 |
| fact_card_ui_text_explanatory_001 | Japanese explanatory text near bottom left is visible | obs_text_japanese_bottom_001 | 0.8 |
| fact_illustrator_text_001 | Illustrator credit is "Illus. Toysto Beach" | obs_text_illustrator_001 | 0.9 |
| fact_set_info_001 | Set code and card number is "J M5 105/081 SR" | obs_text_set_info_001 | 0.9 |
| fact_copyright_line_001 | Copyright line is "©2026 Pokémon/Nintendo/Creatures/GAME FREAK." | obs_text_copyright_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_text_explanatory_001",
    "fact_card_ui_text_title_001",
    "fact_card_ui_text_top_left_001",
    "fact_card_ui_text_top_right_001",
    "fact_copyright_line_001",
    "fact_illustrator_text_001",
    "fact_set_info_001"
  ],
  "name_text_observation_ids": [
    "obs_text_japanese_title_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_text_set_info_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_text_copyright_001"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_text_illustrator_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_text_japanese_bottom_001",
    "obs_text_japanese_top_left_001",
    "obs_text_japanese_top_right_001"
  ]
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
| card_ui_and_print_markers | complete | low | medium |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | not_applicable | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| dark bell | exact | 1 | obs_object_dark_bell_001 | 0.99 |

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
| dark bell | obs_object_dark_bell_001 |
| upper bell handle polygonal facets | obs_object_shape_upper_part_001 |
| bell body polygonal facets circular inner element | obs_object_shape_lower_part_001 |
| dark black dark gray white outlines bell | obs_object_colors_001 |
| purple blue swirl background | obs_background_swirl_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_object_shape_lower_part_001 | deterministic_rule | 0.98 |
| radial lines | obs_background_swirl_001 | deterministic_rule | 0.92 |
| spiral motif | obs_background_swirl_001 | deterministic_rule | 0.93 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, upper bell handle polygonal facets, bell body polygonal facets circular inner element, dark black dark gray white outlines bell, purple blue swirl background. Counts: dark bell: 1.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_dark_bell_001",
      "kind": "object",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_shape_upper_part_001",
      "kind": "object",
      "label": "upper part of bell handle with polygonal facets",
      "normalized_label": "upper bell handle polygonal facets",
      "scene_layer": "midground",
      "frame_position": "upper left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_shape_lower_part_001",
      "kind": "object",
      "label": "bell body with polygonal facets and circular inner element",
      "normalized_label": "bell body polygonal facets circular inner element",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_colors_001",
      "kind": "object",
      "label": "dark black and dark gray colors with white outlines on bell",
      "normalized_label": "dark black dark gray white outlines bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_swirl_001",
      "kind": "object",
      "label": "purple blue swirl background",
      "normalized_label": "purple blue swirl background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_japanese_title_001",
      "kind": "card_ui_text",
      "label": "Japanese card title \"ダークベル\"",
      "normalized_label": "Japanese card title dark bell",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_japanese_top_left_001",
      "kind": "card_ui_text",
      "label": "Japanese text in top left corner \"グッズ\" (goods)",
      "normalized_label": "Japanese text top left goods",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_japanese_top_right_001",
      "kind": "card_ui_text",
      "label": "Japanese text in top right corner \"トレーナーズ\" (trainers)",
      "normalized_label": "Japanese text top right trainers",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_japanese_bottom_001",
      "kind": "card_ui_text",
      "label": "Japanese explanatory text on bottom left",
      "normalized_label": "Japanese explanatory text bottom left",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_text_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator credit \"Illus. Toysto Beach\" bottom left",
      "normalized_label": "illustrator text Toysto Beach",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_set_info_001",
      "kind": "collector_number",
      "label": "set and card number \"J M5 105/081 SR\" bottom left",
      "normalized_label": "set code J M5 105/081 SR",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_copyright_001",
      "kind": "copyright_text",
      "label": "copyright line \"©2026 Pokémon/Nintendo/Creatures/GAME FREAK.\" bottom center",
      "normalized_label": "copyright 2026 Pokemon Nintendo Creatures GAME FREAK",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_dark_bell_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.object_observation_ids",
      "claim": "The main object is a dark bell",
      "value": "dark bell",
      "supporting_observation_ids": [
        "obs_object_colors_001",
        "obs_object_dark_bell_001",
        "obs_object_shape_lower_part_001",
        "obs_object_shape_upper_part_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_shape_upper_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.object_observation_ids",
      "claim": "Upper part of bell handle has polygonal facets",
      "value": "polygonal facets",
      "supporting_observation_ids": [
        "obs_object_shape_upper_part_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_shape_lower_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.object_observation_ids",
      "claim": "Bell body has polygonal facets with visible circular inner element",
      "value": "polygonal facets with circular inner element",
      "supporting_observation_ids": [
        "obs_object_shape_lower_part_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_colors_001",
      "module": "color_and_light",
      "field_path": "objects_and_props.colors",
      "claim": "Bell has dark black and dark gray colors with white outlines",
      "value": "dark black, dark gray, white outlines",
      "supporting_observation_ids": [
        "obs_object_colors_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_background_001",
      "module": "environment",
      "field_path": "environment.setting",
      "claim": "Background features purple and blue swirl pattern",
      "value": "purple blue swirl",
      "supporting_observation_ids": [
        "obs_background_swirl_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_title_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.name_text_observation_ids",
      "claim": "Card title is \"ダークベル\" in Japanese",
      "value": "ダークベル (Dark Bell)",
      "supporting_observation_ids": [
        "obs_text_japanese_title_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_top_left_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.other_print_marker_observation_ids",
      "claim": "Top left Japanese word \"グッズ\" (Goods) is visible",
      "value": "グッズ",
      "supporting_observation_ids": [
        "obs_text_japanese_top_left_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_top_right_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.other_print_marker_observation_ids",
      "claim": "Top right Japanese word \"トレーナーズ\" (Trainers) is visible",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_text_japanese_top_right_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_explanatory_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.other_print_marker_observation_ids",
      "claim": "Japanese explanatory text near bottom left is visible",
      "value": "Japanese explanatory text",
      "supporting_observation_ids": [
        "obs_text_japanese_bottom_001"
      ],
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.illustrator_text_observation_ids",
      "claim": "Illustrator credit is \"Illus. Toysto Beach\"",
      "value": "Illus. Toysto Beach",
      "supporting_observation_ids": [
        "obs_text_illustrator_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_info_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.collector_number_observation_ids",
      "claim": "Set code and card number is \"J M5 105/081 SR\"",
      "value": "J M5 105/081 SR",
      "supporting_observation_ids": [
        "obs_text_set_info_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_copyright_line_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.copyright_line_observation_ids",
      "claim": "Copyright line is \"©2026 Pokémon/Nintendo/Creatures/GAME FREAK.\"",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_text_copyright_001"
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
      "count_id": "count_1_dark_bell_001",
      "normalized_label": "dark bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_object_colors_001",
      "obs_object_dark_bell_001",
      "obs_object_shape_lower_part_001",
      "obs_object_shape_upper_part_001"
    ],
    "background": [
      "obs_background_swirl_001"
    ]
  },
  "environment": {
    "setting": [
      "purple blue swirl"
    ],
    "indoor_outdoor": "not_visible",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_swirl_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_dark_bell_001",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "object_type": "item",
      "colors": [
        "black",
        "dark gray",
        "white"
      ],
      "material_appearance": [
        "dark rounded surface",
        "white outline"
      ],
      "location": "center",
      "count_reference": "count_1_dark_bell_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "dark black",
      "dark gray",
      "purple",
      "white"
    ],
    "lighting": [
      "soft highlights on bell facets"
    ],
    "shadows": [
      "subtle shading on facets"
    ],
    "highlights": [
      "white outline highlights"
    ],
    "composition": [
      "centered object",
      "radial swirl background"
    ],
    "camera_angle": "frontal slight tilt",
    "framing": "tight",
    "cropping": [
      "no cropping"
    ],
    "depth": "medium depth with layered shading",
    "motion_cues": [
      "none"
    ],
    "motifs": [
      "circular shape in bell body",
      "geometric polygonal facets"
    ],
    "repeated_shapes": [
      "polygonal shapes"
    ],
    "style_cues": [
      "digital illustration"
    ],
    "supporting_observation_ids": [
      "obs_background_swirl_001",
      "obs_object_colors_001",
      "obs_object_dark_bell_001",
      "obs_object_shape_lower_part_001",
      "obs_object_shape_upper_part_001"
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
        "fact_obj_colors_001",
        "fact_obj_dark_bell_001",
        "fact_obj_shape_lower_001",
        "fact_obj_shape_upper_001"
      ],
      "object_observation_ids": [
        "obs_object_colors_001",
        "obs_object_dark_bell_001",
        "obs_object_shape_lower_part_001",
        "obs_object_shape_upper_part_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_background_001"
      ],
      "observation_ids": [
        "obs_background_swirl_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_obj_shape_lower_001",
        "fact_obj_shape_upper_001"
      ],
      "observation_ids": [
        "obs_object_shape_lower_part_001",
        "obs_object_shape_upper_part_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_obj_colors_001"
      ],
      "observation_ids": [
        "obs_object_colors_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_text_explanatory_001",
        "fact_card_ui_text_title_001",
        "fact_card_ui_text_top_left_001",
        "fact_card_ui_text_top_right_001",
        "fact_copyright_line_001",
        "fact_illustrator_text_001",
        "fact_set_info_001"
      ],
      "name_text_observation_ids": [
        "obs_text_japanese_title_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_text_set_info_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_text_copyright_001"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_text_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_text_japanese_bottom_001",
        "obs_text_japanese_top_left_001",
        "obs_text_japanese_top_right_001"
      ]
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_1_dark_bell_001"
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
        "upper bell handle polygonal facets",
        "bell body polygonal facets circular inner element",
        "dark black dark gray white outlines bell",
        "purple blue swirl background"
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ]
    },
    {
      "term": "upper bell handle polygonal facets",
      "supporting_observation_ids": [
        "obs_object_shape_upper_part_001"
      ]
    },
    {
      "term": "bell body polygonal facets circular inner element",
      "supporting_observation_ids": [
        "obs_object_shape_lower_part_001"
      ]
    },
    {
      "term": "dark black dark gray white outlines bell",
      "supporting_observation_ids": [
        "obs_object_colors_001"
      ]
    },
    {
      "term": "purple blue swirl background",
      "supporting_observation_ids": [
        "obs_background_swirl_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_shape_lower_part_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "radial lines",
        "source_observation_ids": [
          "obs_background_swirl_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_swirl_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-074 - リトライバッジ

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.007512`
- Artwork observations: `3`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: silver star-shaped badge with ribbons, ribbons attached below star badge, soft blue and white swirling background. Counts: silver star-shaped badge with ribbons: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| silver star-shaped badge with ribbons | silver star-shaped badge with ribbons | object | foreground | high | 0.99 |
| ribbons attached below star badge | ribbons attached below star badge | object | foreground | medium | 0.99 |
| soft blue and white swirling background | soft blue and white swirling background | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| リトライバッジ | card_ui_text | top left | fully_visible | 0.99 |
| トレーナーズ | card_ui_text | top right | fully_visible | 0.99 |
| m5 | card_ui_text | bottom left | fully_visible | 0.99 |
| 074/081 | card_ui_text | bottom left | fully_visible | 0.99 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom center | fully_visible | 0.99 |
| Illus. Toyste Beach | illustrator_text | bottom left above set code | fully_visible | 0.99 |
| purple text box with rules text in Japanese | card_ui_text | bottom right | fully_visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | main object | obs_object_001, obs_object_002 | 0.99 |
| fact_002 | environment | background pattern | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| none recorded | | | |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_textbox_001"
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
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| silver star-shaped badge with ribbons | exact | 1 | obs_object_001 | 0.99 |

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
| star badge | obs_object_001 |
| silver badge | obs_object_001 |
| ribbons | obs_object_002 |
| blue swirl background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_object_001 | deterministic_rule | 0.92 |
| downward orientation | obs_object_002 | deterministic_rule | 0.99 |
| spiral motif | obs_background_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: silver star-shaped badge with ribbons, ribbons attached below star badge, soft blue and white swirling background. Counts: silver star-shaped badge with ribbons: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "silver star-shaped badge with ribbons",
      "normalized_label": "silver star-shaped badge with ribbons",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "ribbons attached below star badge",
      "normalized_label": "ribbons attached below star badge",
      "scene_layer": "foreground",
      "frame_position": "below center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "soft blue and white swirling background",
      "normalized_label": "soft blue and white swirling background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "リトライバッジ",
      "normalized_label": "リトライバッジ",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_header_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "トレーナーズ",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "card_ui_text",
      "label": "m5",
      "normalized_label": "m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "card_ui_text",
      "label": "074/081",
      "normalized_label": "074/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. Toyste Beach",
      "normalized_label": "Illus. Toyste Beach",
      "scene_layer": "card_ui",
      "frame_position": "bottom left above set code",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_textbox_001",
      "kind": "card_ui_text",
      "label": "purple text box with rules text in Japanese",
      "normalized_label": "purple text box with Japanese rules text",
      "scene_layer": "card_ui",
      "frame_position": "bottom right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "0",
      "claim": "main object",
      "value": "silver star-shaped badge with ribbons",
      "supporting_observation_ids": [
        "obs_object_001",
        "obs_object_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "environment",
      "field_path": "background",
      "claim": "background pattern",
      "value": "soft blue and white swirling background",
      "supporting_observation_ids": [
        "obs_background_001"
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
      "count_id": "count_001",
      "normalized_label": "silver star-shaped badge with ribbons",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
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
      "obs_object_002"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
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
      "obs_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "silver star-shaped badge with ribbons",
      "normalized_label": "silver star-shaped badge with ribbons",
      "object_type": "object",
      "colors": [
        "silver",
        "white"
      ],
      "material_appearance": [
        "bright highlight",
        "metallic-looking highlight"
      ],
      "location": "center foreground",
      "count_reference": "count_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "light blue",
      "purple",
      "silver",
      "white"
    ],
    "lighting": [
      "bright",
      "even"
    ],
    "shadows": [
      "soft"
    ],
    "highlights": [
      "bright metallic gleam on badge edges"
    ],
    "composition": [
      "centered main object",
      "framed by blue and white swirl background"
    ],
    "camera_angle": "slightly top-down",
    "framing": "tight framing on object",
    "cropping": [
      "full object visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "ribbon tails",
      "star shape"
    ],
    "repeated_shapes": [
      "star shape"
    ],
    "style_cues": [
      "clean digital illustration"
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
        "fact_001"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_002"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_002"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_object_001"
      ]
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
      "fact_ids": [],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_textbox_001"
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
        "star badge",
        "silver badge",
        "ribbons",
        "blue swirl background"
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "star badge",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "silver badge",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "ribbons",
      "supporting_observation_ids": [
        "obs_object_002"
      ]
    },
    {
      "term": "blue swirl background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "downward orientation",
        "source_observation_ids": [
          "obs_object_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-073 - ごうかいボム

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0079488`
- Artwork observations: `9`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| illustrated bomb | bomb | artwork | foreground | primary | 1 |
| bomb body | bomb body | object | foreground | primary | 1 |
| black | black | color | foreground | primary | 1 |
| yellow-striped band around bomb body | yellow stripe band | object | foreground | primary | 1 |
| bomb fuse | fuse | object | foreground | primary | 1 |
| red fuse | red fuse | color | foreground | primary | 1 |
| lit fuse tip with sparks | lit fuse tip | object | foreground | primary | 1 |
| yellow explosion symbol on bomb body | explosion symbol | object | foreground | primary | 1 |
| background with blue and orange colors | blue and orange background | color | background | primary | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text ごうかいボム | card_ui_text | top-center | visible | 1 |
| illustrator text illus. inose yukie | card_ui_text | bottom-left | visible | 1 |
| set symbol m5 inside black hex | card_ui_symbol | bottom-left | visible | 1 |
| collector number 073/081 | collector_number | bottom-left | visible | 1 |
| no visible energy symbol | card_ui_symbol | none | not_visible | 0 |
| bottom right text area partially visible but unreadable | card_ui_text | bottom-right | visible | 0.5 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | object is bomb | obs_artwork_001 | 1 |
| fact_obj_002 | objects_and_props | bomb body is black | obs_color_black_001, obs_object_body_001 | 1 |
| fact_obj_003 | objects_and_props | bomb body has yellow stripes | obs_object_yellow_stripe_001 | 1 |
| fact_obj_004 | objects_and_props | object is fuse | obs_object_fuse_001 | 1 |
| fact_obj_005 | objects_and_props | fuse is red | obs_fuse_color_red_001, obs_object_fuse_001 | 1 |
| fact_obj_006 | objects_and_props | lit fuse tip with sparks visible | obs_object_fuse_tip_001 | 1 |
| fact_obj_007 | objects_and_props | yellow explosion symbol visible on bomb body | obs_object_explosion_symbol_001 | 1 |
| fact_obj_008 | environment | background contains blue and orange colors | obs_background_color_blue_orange_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_obj_009 | card name text visible: ごうかいボム | obs_card_ui_name_text_001 | 1 |
| fact_obj_010 | illustrator text visible: illus. inose yukie | obs_card_ui_illus_001 | 1 |
| fact_obj_011 | set symbol visible: m5 inside black hex | obs_card_ui_set_symbol_001 | 1 |
| fact_obj_012 | collector number visible: 073/081 | obs_card_ui_number_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_obj_009",
    "fact_obj_010",
    "fact_obj_011",
    "fact_obj_012"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_unreadable_area_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illus_001"
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
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | likely_complete | low | mixed | card_ui_and_print_markers.unreadable_or_weak_text: card UI text is explicitly marked unreadable, weak, or cannot be determined in the observation |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_artwork_001 | 1 |

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
| bomb | obs_artwork_001 |
| yellow striped band | obs_object_yellow_stripe_001 |
| red fuse | obs_object_fuse_001 |
| lit fuse tip with sparks | obs_object_fuse_tip_001 |
| explosion symbol | obs_object_explosion_symbol_001 |
| blue and orange background | obs_background_color_blue_orange_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| explosion | obs_object_explosion_symbol_001 | deterministic_rule | 1 |
| glowing highlights | obs_object_body_001, obs_object_explosion_symbol_001, obs_object_fuse_tip_001, obs_object_yellow_stripe_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: bomb: 1.
- Quality flags: `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_artwork_001",
      "kind": "artwork",
      "label": "illustrated bomb",
      "normalized_label": "bomb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_body_001",
      "kind": "object",
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_black_001",
      "kind": "color",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_yellow_stripe_001",
      "kind": "object",
      "label": "yellow-striped band around bomb body",
      "normalized_label": "yellow stripe band",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_fuse_001",
      "kind": "object",
      "label": "bomb fuse",
      "normalized_label": "fuse",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_fuse_color_red_001",
      "kind": "color",
      "label": "red fuse",
      "normalized_label": "red fuse",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_fuse_tip_001",
      "kind": "object",
      "label": "lit fuse tip with sparks",
      "normalized_label": "lit fuse tip",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_explosion_symbol_001",
      "kind": "object",
      "label": "yellow explosion symbol on bomb body",
      "normalized_label": "explosion symbol",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_color_blue_orange_001",
      "kind": "color",
      "label": "background with blue and orange colors",
      "normalized_label": "blue and orange background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text ごうかいボム",
      "normalized_label": "card name",
      "scene_layer": "ui",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illus_001",
      "kind": "card_ui_text",
      "label": "illustrator text illus. inose yukie",
      "normalized_label": "illustrator text",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "card_ui_symbol",
      "label": "set symbol m5 inside black hex",
      "normalized_label": "set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "collector number 073/081",
      "normalized_label": "collector number",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_none_001",
      "kind": "card_ui_symbol",
      "label": "no visible energy symbol",
      "normalized_label": "energy symbol none",
      "scene_layer": "ui",
      "frame_position": "none",
      "visibility": "not_visible",
      "salience": "low",
      "confidence": 0,
      "evidence_strength": "weak"
    },
    {
      "observation_id": "obs_card_ui_text_unreadable_area_001",
      "kind": "card_ui_text",
      "label": "bottom right text area partially visible but unreadable",
      "normalized_label": "unreadable text",
      "scene_layer": "ui",
      "frame_position": "bottom-right",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.5,
      "evidence_strength": "weak"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "[0].label",
      "claim": "object is bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_artwork_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "[1].colors",
      "claim": "bomb body is black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_color_black_001",
        "obs_object_body_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "[2].colors",
      "claim": "bomb body has yellow stripes",
      "value": "yellow",
      "supporting_observation_ids": [
        "obs_object_yellow_stripe_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_004",
      "module": "objects_and_props",
      "field_path": "[3].label",
      "claim": "object is fuse",
      "value": "bomb fuse",
      "supporting_observation_ids": [
        "obs_object_fuse_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_005",
      "module": "objects_and_props",
      "field_path": "[3].colors",
      "claim": "fuse is red",
      "value": "red",
      "supporting_observation_ids": [
        "obs_fuse_color_red_001",
        "obs_object_fuse_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_006",
      "module": "objects_and_props",
      "field_path": "[4].label",
      "claim": "lit fuse tip with sparks visible",
      "value": "lit fuse tip",
      "supporting_observation_ids": [
        "obs_object_fuse_tip_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_007",
      "module": "objects_and_props",
      "field_path": "[5].label",
      "claim": "yellow explosion symbol visible on bomb body",
      "value": "explosion symbol",
      "supporting_observation_ids": [
        "obs_object_explosion_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_008",
      "module": "environment",
      "field_path": "background.colors",
      "claim": "background contains blue and orange colors",
      "value": "blue and orange background",
      "supporting_observation_ids": [
        "obs_background_color_blue_orange_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_009",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible: ごうかいボム",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_010",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible: illus. inose yukie",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_illus_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_011",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible: m5 inside black hex",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_012",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible: 073/081",
      "value": "073/081",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_obj_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_artwork_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_artwork_001",
      "obs_color_black_001",
      "obs_fuse_color_red_001",
      "obs_object_body_001",
      "obs_object_explosion_symbol_001",
      "obs_object_fuse_001",
      "obs_object_fuse_tip_001",
      "obs_object_yellow_stripe_001"
    ],
    "midground": [],
    "background": [
      "obs_background_color_blue_orange_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "not_visible",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_color_blue_orange_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_artwork_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "bomb",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "dark rounded surface"
      ],
      "location": "center",
      "count_reference": "count_obj_001",
      "confidence": 1
    },
    {
      "observation_id": "obs_object_yellow_stripe_001",
      "label": "yellow-striped band around bomb body",
      "normalized_label": "yellow stripe band",
      "object_type": "band",
      "colors": [
        "yellow"
      ],
      "material_appearance": [
        "bright stripe"
      ],
      "location": "center",
      "count_reference": "count_obj_001",
      "confidence": 1
    },
    {
      "observation_id": "obs_object_fuse_001",
      "label": "red bomb fuse",
      "normalized_label": "fuse",
      "object_type": "fuse",
      "colors": [
        "red"
      ],
      "material_appearance": [
        "flexible tube"
      ],
      "location": "top right",
      "count_reference": "count_obj_001",
      "confidence": 1
    },
    {
      "observation_id": "obs_object_fuse_tip_001",
      "label": "lit fuse tip with sparks",
      "normalized_label": "lit fuse tip",
      "object_type": "fuse tip",
      "colors": [
        "white",
        "yellow"
      ],
      "material_appearance": [
        "glowing sparks"
      ],
      "location": "top right",
      "count_reference": "count_obj_001",
      "confidence": 1
    },
    {
      "observation_id": "obs_object_explosion_symbol_001",
      "label": "yellow explosion symbol on bomb body",
      "normalized_label": "explosion symbol",
      "object_type": "symbol",
      "colors": [
        "yellow"
      ],
      "material_appearance": [
        "painted"
      ],
      "location": "center-right",
      "count_reference": "count_obj_001",
      "confidence": 1
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
      "glowing fuse tip",
      "highlight reflection on bomb body"
    ],
    "shadows": [
      "soft shadow on bomb body"
    ],
    "highlights": [
      "bright highlight on bomb body"
    ],
    "composition": [
      "bomb centered",
      "explosion symbol visible",
      "fuse leading top right"
    ],
    "camera_angle": "slightly above tilted front",
    "framing": "tight around bomb",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [
      "sparks from lit fuse tip"
    ],
    "motifs": [
      "explosion symbol motif"
    ],
    "repeated_shapes": [
      "hexagonal facets on bomb body band"
    ],
    "style_cues": [
      "cartoon style",
      "digital art"
    ],
    "supporting_observation_ids": [
      "obs_artwork_001",
      "obs_background_color_blue_orange_001",
      "obs_object_body_001",
      "obs_object_explosion_symbol_001",
      "obs_object_fuse_001",
      "obs_object_fuse_tip_001",
      "obs_object_yellow_stripe_001"
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
        "fact_obj_004",
        "fact_obj_005",
        "fact_obj_006",
        "fact_obj_007"
      ],
      "object_observation_ids": [
        "obs_artwork_001",
        "obs_object_body_001",
        "obs_object_explosion_symbol_001",
        "obs_object_fuse_001",
        "obs_object_fuse_tip_001",
        "obs_object_yellow_stripe_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_obj_008"
      ],
      "observation_ids": [
        "obs_background_color_blue_orange_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_artwork_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_artwork_001",
        "obs_background_color_blue_orange_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_fuse_tip_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_obj_009",
        "fact_obj_010",
        "fact_obj_011",
        "fact_obj_012"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_unreadable_area_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illus_001"
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
        "bomb",
        "yellow striped band",
        "red fuse",
        "lit fuse tip with sparks",
        "explosion symbol",
        "blue and orange background"
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "mixed",
      "abstentions": [
        {
          "field_path": "card_ui_and_print_markers.unreadable_or_weak_text",
          "reason": "card UI text is explicitly marked unreadable, weak, or cannot be determined in the observation",
          "affected_observation_ids": [
            "obs_card_ui_text_unreadable_area_001"
          ]
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_artwork_001"
      ]
    },
    {
      "term": "yellow striped band",
      "supporting_observation_ids": [
        "obs_object_yellow_stripe_001"
      ]
    },
    {
      "term": "red fuse",
      "supporting_observation_ids": [
        "obs_object_fuse_001"
      ]
    },
    {
      "term": "lit fuse tip with sparks",
      "supporting_observation_ids": [
        "obs_object_fuse_tip_001"
      ]
    },
    {
      "term": "explosion symbol",
      "supporting_observation_ids": [
        "obs_object_explosion_symbol_001"
      ]
    },
    {
      "term": "blue and orange background",
      "supporting_observation_ids": [
        "obs_background_color_blue_orange_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_object_explosion_symbol_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_object_body_001",
          "obs_object_explosion_symbol_001",
          "obs_object_fuse_tip_001",
          "obs_object_yellow_stripe_001"
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

- GV-PK-JPN-M5-078: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_003

