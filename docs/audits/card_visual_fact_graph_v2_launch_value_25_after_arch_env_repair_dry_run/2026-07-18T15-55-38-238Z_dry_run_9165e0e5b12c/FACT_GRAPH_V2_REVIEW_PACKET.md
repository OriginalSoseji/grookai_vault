# Card Visual Fact Graph V2 Review Packet

Generated rows: 19
Validation failures: 6
Skipped images: 0
Estimated cost USD: 0.2484192

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0109304`
- Artwork observations: `12`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: black metal body frame, four curved arms, purple flames on arms, black swirling tail, two black arched horns, purple eye glows, purple flame effects. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | primary_subject | 0.99 |
| body central glass orb | body central glass orb | creature_anatomy | foreground | primary_subject_feature | 0.98 |
| black metal body frame | black metal body frame | creature_anatomy | foreground | high | 0.98 |
| four black curved arms | four curved arms | creature_anatomy | foreground | high | 0.97 |
| purple flames on arms | purple flames on arms | creature_anatomy | foreground | medium | 0.96 |
| black swirling tail | black swirling tail | creature_anatomy | foreground | medium | 0.96 |
| two black arched horns | two black arched horns | creature_anatomy | foreground | high | 0.97 |
| purple eye glows | purple eye glows | creature_anatomy | foreground | high | 0.96 |
| floating pose | floating | creature_anatomy | foreground | primary_subject | 0.98 |
| dark purple background | dark purple background | environment | background | background | 0.95 |
| purple flame effects | purple flame effects | environment | background | high | 0.96 |
| palette of dark purples, blacks, and glowing yellow | palette purple black yellow | visual_design | foreground | color_palette | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| name text: メガシャンデラex | card_ui_text | top_center | visible | 0.99 |
| HP 350 | hp_text | top_right | visible | 0.99 |
| psychic energy symbol | card_ui_symbol | top_left | visible | 0.99 |
| 113/081 SAR | collector_number | bottom_left | visible | 0.98 |
| set symbol: jpn-m5 Abyss Eye | set_symbol | bottom_left | visible | 0.97 |
| rarity mark SAR | rarity_mark | bottom_left | visible | 0.97 |
| illustrator text: M5 | illustrator_text | bottom_left | visible | 0.97 |
| attack name: ファントムメイズ | card_ui_text | bottom_center | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | central glass orb body | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | four black curved arms | obs_creature_anatomy_003 | 0.97 |
| fact_creature_anatomy_003 | creature_anatomy | purple flames on arms | obs_creature_anatomy_004 | 0.96 |
| fact_creature_anatomy_004 | creature_anatomy | black swirling tail | obs_creature_anatomy_005 | 0.96 |
| fact_creature_anatomy_005 | creature_anatomy | two black arched horns | obs_creature_anatomy_006 | 0.97 |
| fact_creature_anatomy_006 | creature_anatomy | purple eye glows | obs_creature_anatomy_007 | 0.96 |
| fact_creature_anatomy_007 | creature_anatomy | floating pose | obs_pose_001 | 0.98 |
| fact_environment_001 | environment | dark purple background | obs_environment_001 | 0.95 |
| fact_environment_002 | environment | purple flame effects | obs_environment_002 | 0.96 |
| fact_visual_design_001 | color_and_light | palette of dark purples, blacks, and glowing yellow highlights | obs_visual_design_001 | 0.96 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text | obs_card_ui_001 | 0.99 |
| fact_card_ui_002 | HP value | obs_card_ui_002 | 0.99 |
| fact_card_ui_003 | psychic energy symbol | obs_card_ui_003 | 0.99 |
| fact_card_ui_004 | collector number and rarity | obs_card_ui_004, obs_card_ui_006 | 0.98 |
| fact_card_ui_005 | set symbol | obs_card_ui_005 | 0.97 |
| fact_card_ui_006 | illustrator signature | obs_card_ui_007 | 0.97 |
| fact_card_ui_007 | attack name text | obs_card_ui_008 | 0.99 |

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
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_004"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_005"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_006"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_007"
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
| color_and_light | complete | low | high |  |
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
| semfact_001 | action | floating | obs_subject_001 | obs_pose_001 | glowing purple eyes flames horns floating pose centered upright stationary | 0.98 |

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
| floating pose | obs_pose_001 |
| purple flames | obs_creature_anatomy_004 |
| glass orb body | obs_creature_anatomy_001 |
| black curved arms | obs_creature_anatomy_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_creature_anatomy_001 | deterministic_rule | 0.98 |
| circular motif | obs_creature_anatomy_001 | deterministic_rule | 0.98 |
| flame | obs_creature_anatomy_004, obs_environment_002 | deterministic_rule | 0.96 |
| floating | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_visual_design_001 | deterministic_rule | 0.92 |
| spiral motif | obs_creature_anatomy_005 | deterministic_rule | 0.96 |
| upright orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: black metal body frame, four curved arms, purple flames on arms, black swirling tail, two black arched horns, purple eye glows, purple flame effects. Semantic facts: floating.
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
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "body central glass orb",
      "normalized_label": "body central glass orb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "black metal body frame",
      "normalized_label": "black metal body frame",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "four black curved arms",
      "normalized_label": "four curved arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "purple flames on arms",
      "normalized_label": "purple flames on arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "black swirling tail",
      "normalized_label": "black swirling tail",
      "scene_layer": "foreground",
      "frame_position": "bottom_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "two black arched horns",
      "normalized_label": "two black arched horns",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "purple eye glows",
      "normalized_label": "purple eye glows",
      "scene_layer": "foreground",
      "frame_position": "head_region",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "floating pose",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark purple background",
      "normalized_label": "dark purple background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "purple flame effects",
      "normalized_label": "purple flame effects",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "visual_design",
      "label": "palette of dark purples, blacks, and glowing yellow",
      "normalized_label": "palette purple black yellow",
      "scene_layer": "foreground",
      "frame_position": "full_frame",
      "visibility": "visible",
      "salience": "color_palette",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "name text: メガシャンデラex",
      "normalized_label": "name text mega chandelure ex",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 350",
      "normalized_label": "hp 350",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "psychic energy symbol",
      "normalized_label": "psychic energy symbol",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "collector_number",
      "label": "113/081 SAR",
      "normalized_label": "collector number 113/081 SAR",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "set_symbol",
      "label": "set symbol: jpn-m5 Abyss Eye",
      "normalized_label": "set symbol jpn-m5 abyss eye",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "rarity_mark",
      "label": "rarity mark SAR",
      "normalized_label": "rarity SAR",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "illustrator_text",
      "label": "illustrator text: M5",
      "normalized_label": "illustrator m5",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "card_ui_text",
      "label": "attack name: ファントムメイズ",
      "normalized_label": "attack name phantom maze",
      "scene_layer": "ui",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subjects[0].identity",
      "claim": "subject identity",
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
      "field_path": "body_regions.central_body",
      "claim": "central glass orb body",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "four black curved arms",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.arm_flames",
      "claim": "purple flames on arms",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.tail",
      "claim": "black swirling tail",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "body_regions.head_features",
      "claim": "two black arched horns",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "body_regions.eyes",
      "claim": "purple eye glows",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "floating pose",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background.colors",
      "claim": "dark purple background",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "background.effects",
      "claim": "purple flame effects",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "palette of dark purples, blacks, and glowing yellow highlights",
      "value": "dark purples, blacks, yellow",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガシャンデラex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value",
      "value": "350",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "psychic energy symbol",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and rarity",
      "value": "113/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_004",
        "obs_card_ui_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "jpn-m5 Abyss Eye",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator signature",
      "value": "M5",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_name_text",
      "claim": "attack name text",
      "value": "ファントムメイズ",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.99,
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
        "black metal body frame",
        "black swirling tail",
        "central glass orb",
        "four black curved arms",
        "two black arched horns"
      ],
      "physical_features": [
        "purple eye glows",
        "purple flames on arms"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "glowing purple eyes",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": [
          "flames",
          "horns"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_pose_001",
      "obs_subject_001",
      "obs_visual_design_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002"
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
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blacks",
      "dark purples",
      "yellow"
    ],
    "lighting": [
      "glowing purple highlights"
    ],
    "shadows": [],
    "highlights": [
      "glowing highlights on flames and glass orb"
    ],
    "composition": [
      "centered subject, floating pose"
    ],
    "camera_angle": "straight on",
    "framing": "tight framing centered",
    "cropping": [],
    "depth": "medium depth, foreground subject distinct from background",
    "motion_cues": [],
    "motifs": [
      "swirling and curved black arms and tail"
    ],
    "repeated_shapes": [
      "curved arms and tail"
    ],
    "style_cues": [
      "dark, glowing effects"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_005",
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
          "region": "central body",
          "feature": "glass orb",
          "visibility": "visible",
          "colors": [
            "black",
            "purple"
          ],
          "details": [
            "transparent orb shows internal glow"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "black curved arms",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "curved design",
            "four arms"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "purple flames",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "flame effects on arm tips"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "black swirling tail",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "tail spirals clockwise"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "black arched horns",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "arching backward",
            "two horns"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eyes",
          "feature": "glowing purple eyes",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "eye glow effect"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_007"
          ],
          "confidence": 0.96
        }
      ],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "upright",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.98
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
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_visual_design_001"
      ],
      "observation_ids": [
        "obs_visual_design_001"
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
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004",
        "fact_card_ui_005",
        "fact_card_ui_006",
        "fact_card_ui_007"
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
        "obs_card_ui_005"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_006"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_007"
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
        "floating pose",
        "purple flames",
        "glass orb body",
        "black curved arms"
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
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "glowing purple eyes"
        ],
        "eyebrows": [],
        "facial_features": [
          "flames",
          "horns"
        ],
        "body_language": [
          "floating pose"
        ],
        "body_position": [
          "centered upright"
        ],
        "motion_state": [
          "stationary"
        ],
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
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "glass orb body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "black curved arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_creature_anatomy_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_creature_anatomy_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_visual_design_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "upright orientation",
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

### GV-PK-JPN-M5-101 - Mega Excadrill ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0131528`
- Artwork observations: `18`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Excadrill. Visible observations: mega excadrill, head, arms, claws, body, drill-shaped horn, tail, black. Semantic facts: standing, fiery background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Excadrill | mega excadrill | scene_subject | foreground | high | 0.99 |
| head | head | creature_anatomy | foreground | high | 0.98 |
| arms | arms | creature_anatomy | foreground | high | 0.97 |
| claws | claws | creature_anatomy | foreground | high | 0.96 |
| body | body | creature_anatomy | foreground | high | 0.96 |
| drill-shaped horn | drill-shaped horn | creature_anatomy | foreground | high | 0.98 |
| tail | tail | creature_anatomy | foreground | high | 0.95 |
| black | black | color_and_light | foreground | high | 0.99 |
| red | red | color_and_light | foreground | high | 0.99 |
| yellow | yellow | color_and_light | foreground | medium | 0.95 |
| white | white | color_and_light | foreground | medium | 0.96 |
| metallic segmented armor | metallic segmented armor | creature_anatomy | foreground | high | 0.97 |
| side profile pose | side profile | creature_anatomy | foreground | high | 0.96 |
| diagonal orientation | diagonal orientation | creature_anatomy | foreground | medium | 0.92 |
| standing | standing | creature_anatomy | foreground | high | 0.95 |
| flaming fiery background | fiery background | environment | background | high | 0.98 |
| centered subject | centered composition | composition | foreground | high | 0.99 |
| fiery flame effect around subject | flame effect | visual_effects | foreground | high | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top | visible | 0.99 |
| HP 340 | hp_text | top right | visible | 0.99 |
| metal type energy symbol | energy_symbol | top right next to HP | visible | 0.99 |
| 101/081 | collector_number | bottom left | visible | 0.98 |
| J M5 Abyss Eye set symbol | set_symbol | bottom left | visible | 0.97 |
| SR (secret rare) | rarity_mark | bottom left | visible | 0.97 |
| Illustrator Keisuke Azuma | illustrator_text | bottom left | visible | 0.98 |
| ©2023 Pokémon/Nintendo/Creatures/GAME FREAK | copyright_text | bottom center | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subj_001 | subjects | Mega Excadrill is the visible Pokemon subject | obs_subject_001 | 0.99 |
| fact_bodyregion_001 | creature_anatomy | The Mega Excadrill has a visible head | obs_body_region_001 | 0.98 |
| fact_bodyregion_002 | creature_anatomy | The Mega Excadrill has visible arms | obs_body_region_002 | 0.97 |
| fact_bodyregion_003 | creature_anatomy | The Mega Excadrill has visible claws | obs_body_region_003 | 0.96 |
| fact_bodyregion_004 | creature_anatomy | The Mega Excadrill has a visible body | obs_body_region_004 | 0.96 |
| fact_bodyregion_005 | creature_anatomy | The Mega Excadrill has a drill-shaped horn | obs_body_region_005 | 0.98 |
| fact_bodyregion_006 | creature_anatomy | The Mega Excadrill has a visible tail | obs_body_region_006 | 0.95 |
| fact_color_001 | color_and_light | The Mega Excadrill is primarily black in color | obs_color_001 | 0.99 |
| fact_color_002 | color_and_light | The Mega Excadrill has red coloration | obs_color_002 | 0.99 |
| fact_color_003 | color_and_light | The Mega Excadrill features yellow coloration | obs_color_003 | 0.95 |
| fact_color_004 | color_and_light | The Mega Excadrill has visible white areas on the face | obs_color_004 | 0.96 |
| fact_physical_feature_001 | creature_anatomy | The Mega Excadrill has metallic segmented armor | obs_physical_feature_001 | 0.97 |
| fact_pose_001 | creature_anatomy | The Mega Excadrill is depicted in a side profile pose | obs_pose_001 | 0.96 |
| fact_orientation_001 | creature_anatomy | The Mega Excadrill is diagonally oriented | obs_orientation_001 | 0.92 |
| fact_action_001 | creature_anatomy | The Mega Excadrill is standing | obs_action_001 | 0.95 |
| fact_environment_001 | environment | The background features a flaming fiery effect | obs_background_001 | 0.98 |
| fact_composition_001 | composition | Subject composition is centered | obs_composition_001 | 0.99 |
| fact_visual_effect_001 | visual_effects | Flaming flame effect surrounds the subject | obs_visual_effects_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | Card name text is visible in Japanese | obs_card_ui_001 | 0.99 |
| fact_card_ui_hp_text_001 | HP text visible, value 340 | obs_card_ui_002 | 0.99 |
| fact_card_ui_energy_symbol_001 | Metal type energy symbol is visible next to HP | obs_card_ui_003 | 0.99 |
| fact_card_ui_collector_number_001 | Collector number '101/081' is visible | obs_card_ui_004 | 0.98 |
| fact_card_ui_set_symbol_001 | Set symbol 'J M5 Abyss Eye' is visible | obs_card_ui_005 | 0.97 |
| fact_card_ui_rarity_mark_001 | Rarity mark 'SR' (secret rare) is visible | obs_card_ui_006 | 0.97 |
| fact_card_ui_illustrator_001 | Illustrator text 'Keisuke Azuma' is visible | obs_card_ui_007 | 0.98 |
| fact_card_ui_copyright_001 | Copyright text '©2023 Pokémon/Nintendo/Creatures/GAME FREAK' visible | obs_card_ui_008 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_number_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_energy_symbol_001",
    "fact_card_ui_hp_text_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_rarity_mark_001",
    "fact_card_ui_set_symbol_001"
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
    "obs_card_ui_005"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_006"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_008"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_007"
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
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_002 | action | standing | obs_subject_001 | obs_action_001 | side profile pose standing | 0.95 |
| sem_fact_003 | environment | fiery background |  | obs_background_001 | flaming fiery background | 0.98 |

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
| drill-shaped horn | obs_body_region_005 |
| metallic segmented armor | obs_physical_feature_001 |
| flaming fiery background | obs_background_001 |
| side profile pose | obs_pose_001 |
| black and red color | obs_color_001, obs_color_002 |
| standing pose | obs_action_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| armor | obs_physical_feature_001 | deterministic_rule | 0.97 |
| centered composition | obs_composition_001 | deterministic_rule | 0.99 |
| diagonal composition | obs_orientation_001 | deterministic_rule | 0.92 |
| diagonal orientation | obs_action_001, obs_orientation_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| fiery background | obs_background_001 | deterministic_rule | 0.98 |
| flame | obs_visual_effects_001 | deterministic_rule | 0.97 |
| metal-like appearance | obs_physical_feature_001 | deterministic_rule | 0.97 |
| side profile pose | obs_action_001, obs_orientation_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| standing | obs_action_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Excadrill. Visible observations: mega excadrill, head, arms, claws, body, drill-shaped horn, tail, black. Semantic facts: standing, fiery background.
- Quality flags: `potential_pose_or_action_without_visible_support`
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
      "observation_id": "obs_body_region_001",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "creature_anatomy",
      "label": "arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "creature_anatomy",
      "label": "claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_004",
      "kind": "creature_anatomy",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_005",
      "kind": "creature_anatomy",
      "label": "drill-shaped horn",
      "normalized_label": "drill-shaped horn",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_006",
      "kind": "creature_anatomy",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "center_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color_and_light",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color_and_light",
      "label": "red",
      "normalized_label": "red",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_003",
      "kind": "color_and_light",
      "label": "yellow",
      "normalized_label": "yellow",
      "scene_layer": "foreground",
      "frame_position": "center_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_004",
      "kind": "color_and_light",
      "label": "white",
      "normalized_label": "white",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_001",
      "kind": "creature_anatomy",
      "label": "metallic segmented armor",
      "normalized_label": "metallic segmented armor",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "side profile pose",
      "normalized_label": "side profile",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_orientation_001",
      "kind": "creature_anatomy",
      "label": "diagonal orientation",
      "normalized_label": "diagonal orientation",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_action_001",
      "kind": "creature_anatomy",
      "label": "standing",
      "normalized_label": "standing",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "flaming fiery background",
      "normalized_label": "fiery background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "centered subject",
      "normalized_label": "centered composition",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_effects_001",
      "kind": "visual_effects",
      "label": "fiery flame effect around subject",
      "normalized_label": "flame effect",
      "scene_layer": "foreground",
      "frame_position": "around subject",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 340",
      "normalized_label": "hp 340",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "energy_symbol",
      "label": "metal type energy symbol",
      "normalized_label": "metal energy symbol",
      "scene_layer": "ui",
      "frame_position": "top right next to HP",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "collector_number",
      "label": "101/081",
      "normalized_label": "collector number 101/081",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "set_symbol",
      "label": "J M5 Abyss Eye set symbol",
      "normalized_label": "set symbol j m5 abyss eye",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "rarity_mark",
      "label": "SR (secret rare)",
      "normalized_label": "secret rare rarity mark",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "illustrator_text",
      "label": "Illustrator Keisuke Azuma",
      "normalized_label": "illustrator keisuke azuma",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "copyright_text",
      "label": "©2023 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright 2023 pokemon nintendo creatures game freak",
      "scene_layer": "ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subj_001",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "Mega Excadrill is the visible Pokemon subject",
      "value": "Mega Excadrill",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bodyregion_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[0].region",
      "claim": "The Mega Excadrill has a visible head",
      "value": "head",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bodyregion_002",
      "module": "creature_anatomy",
      "field_path": "body_regions[1].region",
      "claim": "The Mega Excadrill has visible arms",
      "value": "arms",
      "supporting_observation_ids": [
        "obs_body_region_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bodyregion_003",
      "module": "creature_anatomy",
      "field_path": "physical_features[0].feature",
      "claim": "The Mega Excadrill has visible claws",
      "value": "claws",
      "supporting_observation_ids": [
        "obs_body_region_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bodyregion_004",
      "module": "creature_anatomy",
      "field_path": "body_regions[2].region",
      "claim": "The Mega Excadrill has a visible body",
      "value": "body",
      "supporting_observation_ids": [
        "obs_body_region_004"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bodyregion_005",
      "module": "creature_anatomy",
      "field_path": "physical_features[1].feature",
      "claim": "The Mega Excadrill has a drill-shaped horn",
      "value": "drill-shaped horn",
      "supporting_observation_ids": [
        "obs_body_region_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bodyregion_006",
      "module": "creature_anatomy",
      "field_path": "body_regions[3].region",
      "claim": "The Mega Excadrill has a visible tail",
      "value": "tail",
      "supporting_observation_ids": [
        "obs_body_region_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_001",
      "module": "color_and_light",
      "field_path": "colors[0]",
      "claim": "The Mega Excadrill is primarily black in color",
      "value": "black",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_002",
      "module": "color_and_light",
      "field_path": "colors[1]",
      "claim": "The Mega Excadrill has red coloration",
      "value": "red",
      "supporting_observation_ids": [
        "obs_color_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_003",
      "module": "color_and_light",
      "field_path": "colors[2]",
      "claim": "The Mega Excadrill features yellow coloration",
      "value": "yellow",
      "supporting_observation_ids": [
        "obs_color_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_004",
      "module": "color_and_light",
      "field_path": "colors[3]",
      "claim": "The Mega Excadrill has visible white areas on the face",
      "value": "white",
      "supporting_observation_ids": [
        "obs_color_004"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_physical_feature_001",
      "module": "creature_anatomy",
      "field_path": "physical_features[2].feature",
      "claim": "The Mega Excadrill has metallic segmented armor",
      "value": "metallic segmented armor",
      "supporting_observation_ids": [
        "obs_physical_feature_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose[0]",
      "claim": "The Mega Excadrill is depicted in a side profile pose",
      "value": "side profile pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_orientation_001",
      "module": "creature_anatomy",
      "field_path": "orientation",
      "claim": "The Mega Excadrill is diagonally oriented",
      "value": "diagonal orientation",
      "supporting_observation_ids": [
        "obs_orientation_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_action_001",
      "module": "creature_anatomy",
      "field_path": "action_state[0]",
      "claim": "The Mega Excadrill is standing",
      "value": "standing",
      "supporting_observation_ids": [
        "obs_action_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "The background features a flaming fiery effect",
      "value": "flaming fiery background",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "composition_style[0]",
      "claim": "Subject composition is centered",
      "value": "centered subject",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effect_001",
      "module": "visual_effects",
      "field_path": "effects[0]",
      "claim": "Flaming flame effect surrounds the subject",
      "value": "fiery flame effect around subject",
      "supporting_observation_ids": [
        "obs_visual_effects_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text is visible in Japanese",
      "value": "card name text in Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text visible, value 340",
      "value": "HP 340",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Metal type energy symbol is visible next to HP",
      "value": "metal type energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number '101/081' is visible",
      "value": "101/081",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol 'J M5 Abyss Eye' is visible",
      "value": "J M5 Abyss Eye",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_rarity_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "Rarity mark 'SR' (secret rare) is visible",
      "value": "SR",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text 'Keisuke Azuma' is visible",
      "value": "Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "Copyright text '©2023 Pokémon/Nintendo/Creatures/GAME FREAK' visible",
      "value": "©2023 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.98,
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
        "arms",
        "body",
        "claws",
        "drill-shaped horn",
        "head",
        "tail"
      ],
      "physical_features": [
        "claws",
        "drill-shaped horn",
        "metallic segmented armor"
      ],
      "pose": [
        "side profile pose"
      ],
      "orientation": "diagonal orientation",
      "action_state": [
        "standing"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "visible",
        "eyebrows": "not visible",
        "face_position": "side profile",
        "other_visible_evidence": [
          "white markings on face"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "red",
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
      "obs_action_001",
      "obs_body_region_001",
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_body_region_004",
      "obs_body_region_005",
      "obs_body_region_006",
      "obs_color_001",
      "obs_color_002",
      "obs_color_003",
      "obs_color_004",
      "obs_orientation_001",
      "obs_physical_feature_001",
      "obs_pose_001",
      "obs_subject_001",
      "obs_visual_effects_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "flaming fiery background"
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
      "obs_background_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights",
      "fiery glow"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "bright highlights on armor"
    ],
    "composition": [
      "centered subject"
    ],
    "camera_angle": "eye-level",
    "framing": "full body with partial crop on arms",
    "cropping": [
      "no significant crop"
    ],
    "depth": "moderate depth with clear foreground and background separation",
    "motion_cues": [],
    "motifs": [
      "flame motif"
    ],
    "repeated_shapes": [
      "segmented armor plates"
    ],
    "style_cues": [
      "stylized metallic realism"
    ],
    "supporting_observation_ids": [
      "obs_color_001",
      "obs_color_002",
      "obs_color_003",
      "obs_color_004",
      "obs_composition_001",
      "obs_physical_feature_001",
      "obs_visual_effects_001"
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
        "fact_subj_001"
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
        "fact_action_001",
        "fact_bodyregion_001",
        "fact_bodyregion_002",
        "fact_bodyregion_003",
        "fact_bodyregion_004",
        "fact_bodyregion_005",
        "fact_bodyregion_006",
        "fact_orientation_001",
        "fact_physical_feature_001",
        "fact_pose_001"
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
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_004"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_006"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "claws",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_003"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "drill-shaped horn",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_005"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "metallic segmented armor",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_physical_feature_001"
          ],
          "confidence": 0.97
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "side profile pose"
          ],
          "orientation": "diagonal orientation",
          "action_state": [
            "standing"
          ],
          "supporting_observation_ids": [
            "obs_action_001",
            "obs_orientation_001",
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
        "fact_environment_001"
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
        "fact_color_001",
        "fact_color_002",
        "fact_color_003",
        "fact_color_004"
      ],
      "observation_ids": [
        "obs_color_001",
        "obs_color_002",
        "obs_color_003",
        "obs_color_004"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_visual_effect_001"
      ],
      "observation_ids": [
        "obs_visual_effects_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_collector_number_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_energy_symbol_001",
        "fact_card_ui_hp_text_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_rarity_mark_001",
        "fact_card_ui_set_symbol_001"
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
        "obs_card_ui_005"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_006"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_008"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_007"
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
        "drill-shaped horn",
        "metallic segmented armor",
        "flaming fiery background",
        "side profile pose",
        "black and red color",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_action_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [
          "side profile pose"
        ],
        "motion_state": [
          "standing"
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
      "semantic_fact_id": "sem_fact_003",
      "category": "environment",
      "label": "fiery background",
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
          "flaming fiery background"
        ],
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
      "term": "drill-shaped horn",
      "supporting_observation_ids": [
        "obs_body_region_005"
      ]
    },
    {
      "term": "metallic segmented armor",
      "supporting_observation_ids": [
        "obs_physical_feature_001"
      ]
    },
    {
      "term": "flaming fiery background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "side profile pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "black and red color",
      "supporting_observation_ids": [
        "obs_color_001",
        "obs_color_002"
      ]
    },
    {
      "term": "standing pose",
      "supporting_observation_ids": [
        "obs_action_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "armor",
        "source_observation_ids": [
          "obs_physical_feature_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_orientation_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_action_001",
          "obs_orientation_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "fiery background",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_visual_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_physical_feature_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "side profile pose",
        "source_observation_ids": [
          "obs_action_001",
          "obs_orientation_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_action_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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
- Attribute confidence: `0.99`
- Cost USD: `0.0100004`
- Artwork observations: `11`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, body, blue and black with yellow, face, eyes, open mouth with teeth, left arm raised, right arm bent forward.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | mega zeraora | scene_subject | foreground | high | 0.99 |
| body of Mega Zeraora | body | object | foreground | high | 0.99 |
| blue and black fur with yellow markings | blue and black with yellow | color | foreground | high | 0.98 |
| face of Mega Zeraora | face | object | foreground | high | 0.99 |
| sharp eyes | eyes | object | foreground | high | 0.98 |
| mouth open with teeth visible | open mouth with teeth | object | foreground | medium | 0.95 |
| left arm raised with clenched fist emitting electric energy | left arm raised | object | foreground | high | 0.97 |
| right arm slightly bent forward with clenched fist emitting electric energy | right arm bent forward | object | foreground | high | 0.96 |
| blue lightning/electric energy effects surrounding limbs and body | electric energy effects | object | foreground | high | 0.99 |
| dynamic crouching pose with forward lean | crouching pose | object | foreground | high | 0.98 |
| blue lightning and electric energy effects background | electric energy background | background | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガゼラオラex | card_ui_text | top center | visible | 0.99 |
| HP 270 | card_ui_text | top right | visible | 0.99 |
| electric energy symbol | card_ui_symbol | top right next to HP | visible | 0.98 |
| サンダーフィスト 60x | card_ui_text | lower mid | visible | 0.98 |
| ゼプトターン 150 | card_ui_text | lower mid | visible | 0.98 |
| Illus. GIDORA | illustrator_text | bottom left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_identity_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_creature_color_001 | creature_anatomy | body color | obs_creature_color_001 | 0.98 |
| fact_creature_face_position_001 | creature_anatomy | face position | obs_creature_face_001 | 0.99 |
| fact_eye_appearance_001 | creature_anatomy | eyes | obs_eye_001 | 0.98 |
| fact_mouth_appearance_001 | creature_anatomy | mouth | obs_mouth_001 | 0.95 |
| fact_pose_001 | creature_anatomy | pose | obs_pose_001 | 0.98 |
| fact_limb_1_001 | creature_anatomy | left arm pose and effect | obs_body_effects_001, obs_limb_001 | 0.97 |
| fact_limb_2_001 | creature_anatomy | right arm pose and effect | obs_body_effects_001, obs_limb_002 | 0.96 |
| fact_environment_background_001 | environment | background environment | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text | obs_card_ui_name_text_001 | 0.99 |
| fact_card_ui_hp_text_001 | HP text | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_energy_symbol_001 | energy symbol | obs_card_ui_energy_symbol_001 | 0.98 |
| fact_card_ui_attack_1_001 | first attack name and damage | obs_card_ui_attack_1_001 | 0.98 |
| fact_card_ui_attack_2_001 | second attack name and damage | obs_card_ui_attack_2_001 | 0.98 |
| fact_card_ui_illustrator_001 | illustrator | obs_card_ui_illustrator_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_1_001",
    "fact_card_ui_attack_2_001",
    "fact_card_ui_energy_symbol_001",
    "fact_card_ui_hp_text_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
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
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | likely_complete | low | high |  |
| composition | partial_due_to_occlusion | medium | medium |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_occlusion | low | medium |  |

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
| electric energy | obs_background_001, obs_body_effects_001 |
| blue and black fur | obs_creature_color_001 |
| yellow markings | obs_creature_color_001 |
| crouching pose | obs_pose_001 |
| open mouth | obs_mouth_001 |
| electric lightning background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| crouching | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| forward lean | obs_subject_001 | deterministic_rule | 0.99 |
| forward-right orientation | obs_limb_002, obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_limb_001 | deterministic_rule | 0.97 |
| lightning | obs_background_001, obs_body_effects_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, body, blue and black with yellow, face, eyes, open mouth with teeth, left arm raised, right arm bent forward.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_module_incomplete_or_low_evidence`, `potential_weather_field_alignment_missing`
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
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "object",
      "label": "body of Mega Zeraora",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_color_001",
      "kind": "color",
      "label": "blue and black fur with yellow markings",
      "normalized_label": "blue and black with yellow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_face_001",
      "kind": "object",
      "label": "face of Mega Zeraora",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "object",
      "label": "sharp eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "object",
      "label": "mouth open with teeth visible",
      "normalized_label": "open mouth with teeth",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_limb_001",
      "kind": "object",
      "label": "left arm raised with clenched fist emitting electric energy",
      "normalized_label": "left arm raised",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_limb_002",
      "kind": "object",
      "label": "right arm slightly bent forward with clenched fist emitting electric energy",
      "normalized_label": "right arm bent forward",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_effects_001",
      "kind": "object",
      "label": "blue lightning/electric energy effects surrounding limbs and body",
      "normalized_label": "electric energy effects",
      "scene_layer": "foreground",
      "frame_position": "full body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "object",
      "label": "dynamic crouching pose with forward lean",
      "normalized_label": "crouching pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "background",
      "label": "blue lightning and electric energy effects background",
      "normalized_label": "electric energy background",
      "scene_layer": "background",
      "frame_position": "full card",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "メガゼラオラex",
      "normalized_label": "Mega Zeraora ex",
      "scene_layer": "ui",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP 270",
      "normalized_label": "HP 270",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_001",
      "kind": "card_ui_symbol",
      "label": "electric energy symbol",
      "normalized_label": "electric energy symbol",
      "scene_layer": "ui",
      "frame_position": "top right next to HP",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_1_001",
      "kind": "card_ui_text",
      "label": "サンダーフィスト 60x",
      "normalized_label": "Thunder Fist 60x",
      "scene_layer": "ui",
      "frame_position": "lower mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_2_001",
      "kind": "card_ui_text",
      "label": "ゼプトターン 150",
      "normalized_label": "Zept Turn 150",
      "scene_layer": "ui",
      "frame_position": "lower mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. GIDORA",
      "normalized_label": "Illustrator GIDORA",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "moderate"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_identity_001",
      "module": "subjects",
      "field_path": "0.identity",
      "claim": "identity",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_color_001",
      "module": "creature_anatomy",
      "field_path": "body.color",
      "claim": "body color",
      "value": "blue and black with yellow markings",
      "supporting_observation_ids": [
        "obs_creature_color_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_face_position_001",
      "module": "creature_anatomy",
      "field_path": "face.position",
      "claim": "face position",
      "value": "upper center",
      "supporting_observation_ids": [
        "obs_creature_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eye_appearance_001",
      "module": "creature_anatomy",
      "field_path": "eyes.appearance",
      "claim": "eyes",
      "value": "sharp eyes",
      "supporting_observation_ids": [
        "obs_eye_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_mouth_appearance_001",
      "module": "creature_anatomy",
      "field_path": "mouth.appearance",
      "claim": "mouth",
      "value": "open with visible teeth",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose",
      "value": "crouching with forward lean",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_limb_1_001",
      "module": "creature_anatomy",
      "field_path": "limbs.left_arm",
      "claim": "left arm pose and effect",
      "value": "raised with clenched fist emitting electric energy",
      "supporting_observation_ids": [
        "obs_body_effects_001",
        "obs_limb_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_limb_2_001",
      "module": "creature_anatomy",
      "field_path": "limbs.right_arm",
      "claim": "right arm pose and effect",
      "value": "bent forward with clenched fist emitting electric energy",
      "supporting_observation_ids": [
        "obs_body_effects_001",
        "obs_limb_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background environment",
      "value": "blue lightning and electric energy effects",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガゼラオラex",
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
      "claim": "HP text",
      "value": "270",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy symbol",
      "value": "electric",
      "supporting_observation_ids": [
        "obs_card_ui_energy_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_1_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_1_text",
      "claim": "first attack name and damage",
      "value": "Thunder Fist 60x",
      "supporting_observation_ids": [
        "obs_card_ui_attack_1_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_2_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_2_text",
      "claim": "second attack name and damage",
      "value": "Zept Turn 150",
      "supporting_observation_ids": [
        "obs_card_ui_attack_2_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator",
      "value": "GIDORA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 0.99,
      "anatomy": [
        "body",
        "eyes",
        "face",
        "left arm",
        "mouth",
        "right arm"
      ],
      "physical_features": [
        "black fur",
        "blue fur",
        "lightning electric energy effects",
        "yellow markings"
      ],
      "pose": [
        "crouching",
        "forward lean"
      ],
      "orientation": "forward-right",
      "action_state": [
        "attacking",
        "energy emitting"
      ],
      "facial_evidence": {
        "eyes": "sharp",
        "mouth": "open with visible teeth",
        "eyebrows": "not clearly visible",
        "face_position": "upper center",
        "other_visible_evidence": [
          "electric energy effects around face"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
        "white",
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
      "obs_body_effects_001",
      "obs_creature_body_001",
      "obs_creature_color_001",
      "obs_creature_face_001",
      "obs_eye_001",
      "obs_limb_001",
      "obs_limb_002",
      "obs_mouth_001",
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
      "electric energy",
      "stormy atmosphere"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue lightning electric effects"
    ],
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
      "black",
      "blue",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright glowing electric highlights"
    ],
    "shadows": [
      "minimal due to electric glow"
    ],
    "highlights": [
      "electric energy overlays"
    ],
    "composition": [
      "diagonal energy lines",
      "centered creature"
    ],
    "camera_angle": "slightly tilted from front-left",
    "framing": "tight crop on subject",
    "cropping": [
      "subject fully visible"
    ],
    "depth": "moderate depth with layered effects",
    "motion_cues": [
      "electric energy arcs indicating motion"
    ],
    "motifs": [
      "electric lightning bolts"
    ],
    "repeated_shapes": [
      "zig-zag lightning patterns"
    ],
    "style_cues": [
      "bright electric glow",
      "digital painting",
      "sharp edges"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_body_effects_001"
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
        "fact_subject_identity_001"
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
        "fact_creature_color_001",
        "fact_creature_face_position_001",
        "fact_eye_appearance_001",
        "fact_limb_1_001",
        "fact_limb_2_001",
        "fact_mouth_appearance_001",
        "fact_pose_001"
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
        "fact_environment_background_001"
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
        "obs_body_effects_001",
        "obs_creature_color_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_body_effects_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_1_001",
        "fact_card_ui_attack_2_001",
        "fact_card_ui_energy_symbol_001",
        "fact_card_ui_hp_text_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
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
        "electric energy",
        "blue and black fur",
        "yellow markings",
        "crouching pose",
        "open mouth",
        "electric lightning background"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "partial_due_to_occlusion",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "review_status": "partial_due_to_occlusion",
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "electric energy",
      "supporting_observation_ids": [
        "obs_background_001",
        "obs_body_effects_001"
      ]
    },
    {
      "term": "blue and black fur",
      "supporting_observation_ids": [
        "obs_creature_color_001"
      ]
    },
    {
      "term": "yellow markings",
      "supporting_observation_ids": [
        "obs_creature_color_001"
      ]
    },
    {
      "term": "crouching pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "open mouth",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ]
    },
    {
      "term": "electric lightning background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "crouching",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward lean",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_limb_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_limb_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_background_001",
          "obs_body_effects_001"
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
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0109976`
- Artwork observations: `8`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, body main black yellow blue markings, head yellow blue black patterns, eyes blue sharp angled pattern, claws sharp yellow, mid-air pose, purple gradient holographic background stylized yellow line art, overlay yellow lightning bolt patterns. Semantic facts: purple holographic background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | mega zeraora | scene_subject | foreground | high | 1 |
| body main black with yellow and blue markings | body main black yellow blue markings | creature_anatomy | foreground | high | 1 |
| head with yellow, blue, and black patterns | head yellow blue black patterns | creature_anatomy | foreground | high | 1 |
| eyes blue with sharp angled pattern | eyes blue sharp angled pattern | creature_anatomy | foreground | high | 1 |
| claws sharp yellow | claws sharp yellow | creature_anatomy | foreground | high | 1 |
| mid-air dynamic aggressive pose | mid-air pose | creature_anatomy | foreground | high | 0.95 |
| purple gradient holographic background with stylized yellow line art | purple gradient holographic background stylized yellow line art | environment | background | high | 1 |
| overlay yellow lightning bolt patterns | overlay yellow lightning bolt patterns | objects_and_props | foreground | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text - メガゼラオラex | card_ui_text | top | visible | 1 |
| HP text - 270 | card_ui_text | top right | visible | 1 |
| Electric energy symbol | card_ui_symbol | top right | visible | 1 |
| Illustrator text - Eban Graphics | illustrator_text | bottom left | visible | 0.99 |
| Set symbol J M5 | set_symbol | bottom left | visible | 1 |
| Collector number 096/081 | collector_number | bottom center | visible | 1 |
| attack text - Japanese text with move names and damage values (60x and 150) | card_ui_text | middle | visible | 0.98 |
| bottom legal and copyright text with 2026 Pokémon/Nintendo/Creatures/GAME FREAK | bottom_line_text | bottom | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | visible pokemon subject | obs_subject_001 | 1 |
| fact_creature_body_color_001 | creature_anatomy | body colors and markings | obs_creature_anatomy_body_001 | 1 |
| fact_creature_head_color_001 | creature_anatomy | head colors and pattern | obs_creature_anatomy_head_001 | 1 |
| fact_creature_eye_detail_001 | creature_anatomy | eyes appearance | obs_creature_anatomy_eyes_001 | 1 |
| fact_creature_claws_001 | creature_anatomy | claws color and shape | obs_creature_anatomy_claws_001 | 1 |
| fact_pose_001 | creature_anatomy | pose of the subject | obs_pose_001 | 0.95 |
| fact_environment_001 | environment | background environment | obs_environment_background_001 | 1 |
| fact_objects_lightning_001 | objects_and_props | overlay lightning bolt patterns | obs_objects_lightning_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 1 |
| fact_card_ui_hp_001 | HP text | obs_card_ui_hp_001 | 1 |
| fact_card_ui_energy_001 | energy symbol | obs_card_ui_energy_001 | 1 |
| fact_card_ui_illustrator_001 | illustrator text | obs_card_ui_illustrator_001 | 0.99 |
| fact_card_ui_set_symbol_001 | set symbol | obs_card_ui_set_001 | 1 |
| fact_card_ui_number_001 | collector number | obs_card_ui_number_001 | 1 |
| fact_card_ui_attack_text_001 | attack text | obs_card_ui_text_001 | 0.98 |
| fact_card_ui_bottom_text_001 | bottom legal and copyright text | obs_card_ui_bottom_text_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_text_001",
    "fact_card_ui_bottom_text_001",
    "fact_card_ui_energy_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_number_001",
    "fact_card_ui_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_001"
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
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sf_003 | environment | purple holographic background |  | obs_environment_background_001 | purple holographic background | 1 |

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
| black yellow blue markings | obs_creature_anatomy_body_001 |
| electric lightning | obs_objects_lightning_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| lightning | obs_objects_lightning_001 | deterministic_rule | 0.92 |
| mid-air | obs_pose_001, obs_subject_001 | deterministic_rule | 1 |
| pose | obs_subject_001 | deterministic_rule | 1 |
| purple holographic background | obs_environment_background_001 | deterministic_rule | 1 |
| upright angled orientation | obs_pose_001 | deterministic_rule | 0.95 |
| upright orientation | obs_subject_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, body main black yellow blue markings, head yellow blue black patterns, eyes blue sharp angled pattern, claws sharp yellow, mid-air pose, purple gradient holographic background stylized yellow line art, overlay yellow lightning bolt patterns. Semantic facts: purple holographic background.
- Quality flags: `potential_speculative_setting_language`
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
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_body_001",
      "kind": "creature_anatomy",
      "label": "body main black with yellow and blue markings",
      "normalized_label": "body main black yellow blue markings",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_head_001",
      "kind": "creature_anatomy",
      "label": "head with yellow, blue, and black patterns",
      "normalized_label": "head yellow blue black patterns",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_eyes_001",
      "kind": "creature_anatomy",
      "label": "eyes blue with sharp angled pattern",
      "normalized_label": "eyes blue sharp angled pattern",
      "scene_layer": "foreground",
      "frame_position": "face_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_claws_001",
      "kind": "creature_anatomy",
      "label": "claws sharp yellow",
      "normalized_label": "claws sharp yellow",
      "scene_layer": "foreground",
      "frame_position": "hands_feet",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "mid-air dynamic aggressive pose",
      "normalized_label": "mid-air pose",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_background_001",
      "kind": "environment",
      "label": "purple gradient holographic background with stylized yellow line art",
      "normalized_label": "purple gradient holographic background stylized yellow line art",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_lightning_001",
      "kind": "objects_and_props",
      "label": "overlay yellow lightning bolt patterns",
      "normalized_label": "overlay yellow lightning bolt patterns",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text - メガゼラオラex",
      "normalized_label": "card name text mega zeraora ex",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP text - 270",
      "normalized_label": "hp text 270",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "card_ui_symbol",
      "label": "Electric energy symbol",
      "normalized_label": "electric energy symbol",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator text - Eban Graphics",
      "normalized_label": "illustrator text eban graphics",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "set_symbol",
      "label": "Set symbol J M5",
      "normalized_label": "set symbol j m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "Collector number 096/081",
      "normalized_label": "collector number 096/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "attack text - Japanese text with move names and damage values (60x and 150)",
      "normalized_label": "attack text japanese move names damage 60x 150",
      "scene_layer": "card_ui",
      "frame_position": "middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "bottom legal and copyright text with 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "bottom legal copyright text 2026 pokemon nintendo creatures game freak",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "visible pokemon subject",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_body_color_001",
      "module": "creature_anatomy",
      "field_path": "body.color_pattern",
      "claim": "body colors and markings",
      "value": "black with yellow and blue markings",
      "supporting_observation_ids": [
        "obs_creature_anatomy_body_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_head_color_001",
      "module": "creature_anatomy",
      "field_path": "head.color_pattern",
      "claim": "head colors and pattern",
      "value": "yellow, blue, and black patterns",
      "supporting_observation_ids": [
        "obs_creature_anatomy_head_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_eye_detail_001",
      "module": "creature_anatomy",
      "field_path": "eyes.detail",
      "claim": "eyes appearance",
      "value": "blue with sharp angled pattern",
      "supporting_observation_ids": [
        "obs_creature_anatomy_eyes_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_claws_001",
      "module": "creature_anatomy",
      "field_path": "claws.color_and_shape",
      "claim": "claws color and shape",
      "value": "sharp yellow claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_claws_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose of the subject",
      "value": "mid-air pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background environment",
      "value": "purple gradient holographic background with stylized yellow line art",
      "supporting_observation_ids": [
        "obs_environment_background_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_lightning_001",
      "module": "objects_and_props",
      "field_path": "decorative_overlays",
      "claim": "overlay lightning bolt patterns",
      "value": "yellow lightning bolt patterns",
      "supporting_observation_ids": [
        "obs_objects_lightning_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガゼラオラex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text",
      "value": "270",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy symbol",
      "value": "electric",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Eban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "096/081",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack text",
      "value": "Japanese text with move names and damage 60x and 150",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "bottom legal and copyright text",
      "value": "2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 1,
      "anatomy": [
        "body",
        "claws",
        "eyes",
        "head"
      ],
      "physical_features": [
        "sharp claws",
        "yellow and blue markings"
      ],
      "pose": [
        "pose",
        "mid-air"
      ],
      "orientation": "upright",
      "action_state": [
        "in motion",
        "not grounded"
      ],
      "facial_evidence": {
        "eyes": "visible blue sharp angled",
        "mouth": "visible closed mouth",
        "eyebrows": "not distinctly visible",
        "face_position": "front right",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
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
      "obs_creature_anatomy_body_001",
      "obs_creature_anatomy_claws_001",
      "obs_creature_anatomy_eyes_001",
      "obs_creature_anatomy_head_001",
      "obs_objects_lightning_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_background_001"
    ]
  },
  "environment": {
    "setting": [
      "fantastical"
    ],
    "indoor_outdoor": "unknown",
    "sky": [
      "purple"
    ],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_lightning_001",
      "label": "yellow lightning bolt patterns",
      "normalized_label": "lightning bolt patterns",
      "object_type": "decorative overlay",
      "colors": [
        "yellow"
      ],
      "material_appearance": [
        "holographic light effect"
      ],
      "location": "around subject and background",
      "count_reference": "none",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "pink",
      "purple",
      "yellow"
    ],
    "lighting": [
      "bright contrast",
      "highlights"
    ],
    "shadows": [
      "soft shadows on subject"
    ],
    "highlights": [
      "blue light accents",
      "bright yellow edges"
    ],
    "composition": [
      "diagonal flow",
      "subject centered"
    ],
    "camera_angle": "frontal slight top angle",
    "framing": "full subject framed",
    "cropping": [],
    "depth": "deep with layering",
    "motion_cues": [
      "energy"
    ],
    "motifs": [
      "lightning bolt pattern"
    ],
    "repeated_shapes": [
      "zigzag lines"
    ],
    "style_cues": [
      "art style"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_body_001",
      "obs_environment_background_001",
      "obs_objects_lightning_001",
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
        "fact_creature_body_color_001",
        "fact_creature_claws_001",
        "fact_creature_eye_detail_001",
        "fact_creature_head_color_001",
        "fact_pose_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "color pattern",
          "visibility": "visible",
          "colors": [
            "black",
            "blue",
            "yellow"
          ],
          "details": [
            "main color black with yellow lightning-shaped patterns and blue markings"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_body_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "color pattern",
          "visibility": "visible",
          "colors": [
            "black",
            "blue",
            "yellow"
          ],
          "details": [
            "yellow crest with blue highlights and black areas"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_head_001"
          ],
          "confidence": 1
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eyes",
          "feature": "color and pattern",
          "visibility": "visible",
          "colors": [
            "blue"
          ],
          "details": [
            "sharp angled blue eyes"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_eyes_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "claws",
          "feature": "shape and color",
          "visibility": "visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "sharp pointed claws"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_claws_001"
          ],
          "confidence": 1
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "mid-air"
          ],
          "orientation": "upright angled",
          "action_state": [
            "airborne",
            "in motion"
          ],
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
      "fact_ids": [
        "fact_objects_lightning_001"
      ],
      "object_observation_ids": [
        "obs_objects_lightning_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_background_001",
        "obs_pose_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_body_001",
        "obs_environment_background_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_objects_lightning_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_text_001",
        "fact_card_ui_bottom_text_001",
        "fact_card_ui_energy_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_number_001",
        "fact_card_ui_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_001"
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
        "black yellow blue markings",
        "electric lightning"
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
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sf_003",
      "category": "environment",
      "label": "purple holographic background",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_background_001"
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
          "purple holographic background"
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
      "term": "black yellow blue markings",
      "supporting_observation_ids": [
        "obs_creature_anatomy_body_001"
      ]
    },
    {
      "term": "electric lightning",
      "supporting_observation_ids": [
        "obs_objects_lightning_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_objects_lightning_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "mid-air",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "pose",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "purple holographic background",
        "source_observation_ids": [
          "obs_environment_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "upright angled orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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

### GV-PK-JPN-M5-114 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0104104`
- Artwork observations: `10`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, black and grey coloration, purple eye, spiky tendril body parts, floating, upright orientation, dark abstract background, dark color palette. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | high | 0.99 |
| dark black and grey body color | black and grey coloration | object | foreground | high | 0.95 |
| single visible glowing purple eye | purple eye | object | foreground | high | 0.98 |
| spiky, tendril-like body extensions | spiky tendril body parts | object | foreground | high | 0.97 |
| floating pose | floating | object | foreground | high | 0.96 |
| body oriented upright | upright orientation | object | foreground | high | 0.95 |
| dark abstract swirled background with eye-like motifs | dark abstract background | environment | background | medium | 0.92 |
| dark colors palette with black, grey, purples | dark color palette | object | foreground | high | 0.95 |
| dim lighting with reflective highlights | dim lighting | object | foreground | high | 0.94 |
| glowing purple eye and bright white-tipped tendrils | glowing eye and tendrils | object | foreground | high | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガダークライex (Mega Darkrai ex) | card_ui_text | top | fully_visible | 0.99 |
| HP 280 | card_ui_text | top_right | fully_visible | 0.99 |
| dark type energy symbol | card_ui_symbol | top_right | fully_visible | 0.98 |
| ナイトレイド 110+ and アビスアイ attack texts | card_ui_text | mid | fully_visible | 0.98 |
| Illus. AKIRA EGAWA | illustrator_text | bottom_left | fully_visible | 0.97 |
| 114/081 SAR | collector_number | bottom_left | fully_visible | 0.97 |
| M5 set symbol | set_symbol | bottom_left | fully_visible | 0.95 |
| weakness x2, resistance, retreat cost | card_ui_text | bottom_mid | fully_visible | 0.94 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_creature_color_001 | creature_anatomy | body coloration | obs_body_dark_coloration | 0.95 |
| fact_creature_face_eye_001 | creature_anatomy | eye color | obs_body_highlight_purple_eye | 0.98 |
| fact_creature_anatomy_001 | creature_anatomy | spiky tendril-like body parts | obs_anatomy_body_shape | 0.97 |
| fact_creature_pose_001 | creature_anatomy | pose | obs_pose_floating | 0.96 |
| fact_creature_orientation_001 | creature_anatomy | orientation | obs_orientation_upright | 0.95 |
| fact_environment_background_001 | environment | background | obs_background_dark_abstract | 0.92 |
| fact_visual_design_palette_001 | color_and_light | color palette | obs_palette_dark_dark_purples_black | 0.95 |
| fact_visual_design_lighting_001 | color_and_light | lighting | obs_lighting_dim_with_highlights | 0.94 |
| fact_visual_effects_001 | visual_effects | glowing purple eye and white tendrils | obs_visual_effects_glowing_eye_and_tendrils | 0.96 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | visible card name text | obs_card_ui_name_text | 0.99 |
| fact_card_ui_hp_text_001 | visible HP text | obs_card_ui_hp_text | 0.99 |
| fact_card_ui_energy_symbol_001 | visible card energy symbol | obs_card_ui_energy_symbol_dark | 0.98 |
| fact_card_ui_attack_texts_001 | visible attacks text in Japanese | obs_card_ui_attacks_text | 0.98 |
| fact_card_ui_illustrator_001 | visible illustrator text | obs_card_ui_illustrator_text | 0.97 |
| fact_card_ui_set_number_001 | visible collector number | obs_card_ui_set_number | 0.97 |
| fact_card_ui_set_symbol_001 | visible set symbol | obs_card_ui_set_symbol_m5 | 0.95 |
| fact_card_ui_weakness_resistance_001 | visible weakness, resistance, and retreat cost icons | obs_card_ui_weakness_resistance_retreat | 0.94 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_texts_001",
    "fact_card_ui_energy_symbol_001",
    "fact_card_ui_hp_text_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_set_number_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_weakness_resistance_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_text"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_set_number"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_m5"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_symbol_dark"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_text"
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
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | low | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | state | floating | obs_subject_001 | obs_pose_floating | floating pose floating | 0.96 |

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
| darkrai | obs_subject_001 |
| floating darkrai | obs_pose_floating, obs_subject_001 |
| darkrai purple eye | obs_body_highlight_purple_eye |
| dark abstract background | obs_background_dark_abstract |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| floating | obs_orientation_upright, obs_pose_floating, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_visual_effects_glowing_eye_and_tendrils | deterministic_rule | 0.96 |
| upright orientation | obs_orientation_upright, obs_pose_floating, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, black and grey coloration, purple eye, spiky tendril body parts, floating, upright orientation, dark abstract background, dark color palette. Semantic facts: floating.
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
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_dark_coloration",
      "kind": "object",
      "label": "dark black and grey body color",
      "normalized_label": "black and grey coloration",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_highlight_purple_eye",
      "kind": "object",
      "label": "single visible glowing purple eye",
      "normalized_label": "purple eye",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_body_shape",
      "kind": "object",
      "label": "spiky, tendril-like body extensions",
      "normalized_label": "spiky tendril body parts",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_floating",
      "kind": "object",
      "label": "floating pose",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_orientation_upright",
      "kind": "object",
      "label": "body oriented upright",
      "normalized_label": "upright orientation",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_dark_abstract",
      "kind": "environment",
      "label": "dark abstract swirled background with eye-like motifs",
      "normalized_label": "dark abstract background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_dark_dark_purples_black",
      "kind": "object",
      "label": "dark colors palette with black, grey, purples",
      "normalized_label": "dark color palette",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_dim_with_highlights",
      "kind": "object",
      "label": "dim lighting with reflective highlights",
      "normalized_label": "dim lighting",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_effects_glowing_eye_and_tendrils",
      "kind": "object",
      "label": "glowing purple eye and bright white-tipped tendrils",
      "normalized_label": "glowing eye and tendrils",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text",
      "kind": "card_ui_text",
      "label": "メガダークライex (Mega Darkrai ex)",
      "normalized_label": "mega darkrai ex",
      "scene_layer": "ui",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_text",
      "kind": "card_ui_text",
      "label": "HP 280",
      "normalized_label": "hp 280",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_dark",
      "kind": "card_ui_symbol",
      "label": "dark type energy symbol",
      "normalized_label": "dark energy",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attacks_text",
      "kind": "card_ui_text",
      "label": "ナイトレイド 110+ and アビスアイ attack texts",
      "normalized_label": "attack texts",
      "scene_layer": "ui",
      "frame_position": "mid",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text",
      "kind": "illustrator_text",
      "label": "Illus. AKIRA EGAWA",
      "normalized_label": "illustrator akira egawa",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_number",
      "kind": "collector_number",
      "label": "114/081 SAR",
      "normalized_label": "114/81 sar",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_m5",
      "kind": "set_symbol",
      "label": "M5 set symbol",
      "normalized_label": "m5",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_resistance_retreat",
      "kind": "card_ui_text",
      "label": "weakness x2, resistance, retreat cost",
      "normalized_label": "weakness resistance retreat",
      "scene_layer": "ui",
      "frame_position": "bottom_mid",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "subject identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_color_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.color",
      "claim": "body coloration",
      "value": "black and grey",
      "supporting_observation_ids": [
        "obs_body_dark_coloration"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_face_eye_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.eye.color",
      "claim": "eye color",
      "value": "glowing purple",
      "supporting_observation_ids": [
        "obs_body_highlight_purple_eye"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.feature",
      "claim": "spiky tendril-like body parts",
      "value": "spiky tendrils",
      "supporting_observation_ids": [
        "obs_anatomy_body_shape"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_pose_floating"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_orientation_001",
      "module": "creature_anatomy",
      "field_path": "orientation",
      "claim": "orientation",
      "value": "upright",
      "supporting_observation_ids": [
        "obs_orientation_upright"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background",
      "value": "dark abstract background with eye motifs",
      "supporting_observation_ids": [
        "obs_background_dark_abstract"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_palette_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "color palette",
      "value": "dark colors with black, grey, purple",
      "supporting_observation_ids": [
        "obs_palette_dark_dark_purples_black"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_lighting_001",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "lighting",
      "value": "dim lighting with bright highlights",
      "supporting_observation_ids": [
        "obs_lighting_dim_with_highlights"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effects_001",
      "module": "visual_effects",
      "field_path": "glowing_effects",
      "claim": "glowing purple eye and white tendrils",
      "value": "glowing eye and tendrils",
      "supporting_observation_ids": [
        "obs_visual_effects_glowing_eye_and_tendrils"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "visible card name text",
      "value": "メガダークライex (Mega Darkrai ex)",
      "supporting_observation_ids": [
        "obs_card_ui_name_text"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "visible HP text",
      "value": "HP 280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_text"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "visible card energy symbol",
      "value": "dark type energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_energy_symbol_dark"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_texts_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "visible attacks text in Japanese",
      "value": "ナイトレイド 110+ and アビスアイ",
      "supporting_observation_ids": [
        "obs_card_ui_attacks_text"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "visible illustrator text",
      "value": "Illus. AKIRA EGAWA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "visible collector number",
      "value": "114/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_set_number"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "visible set symbol",
      "value": "M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_m5"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_weakness_resistance_001",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_resistance_retreat",
      "claim": "visible weakness, resistance, and retreat cost icons",
      "value": "weakness x2, resistance, retreat cost 3",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_resistance_retreat"
      ],
      "confidence": 0.94,
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
        "floating pose",
        "spiky tendrils",
        "upright orientation"
      ],
      "physical_features": [
        "black and grey body",
        "glowing purple eye"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "glowing purple eye",
        "mouth": "cannot determine",
        "eyebrows": "cannot determine",
        "face_position": "center",
        "other_visible_evidence": [
          "spiky tendrils"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "grey",
        "purple"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_anatomy_body_shape",
      "obs_body_dark_coloration",
      "obs_body_highlight_purple_eye",
      "obs_lighting_dim_with_highlights",
      "obs_orientation_upright",
      "obs_palette_dark_dark_purples_black",
      "obs_pose_floating",
      "obs_subject_001",
      "obs_visual_effects_glowing_eye_and_tendrils"
    ],
    "midground": [],
    "background": [
      "obs_background_dark_abstract"
    ]
  },
  "environment": {
    "setting": [
      "dark abstract background with eye motifs"
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
      "obs_background_dark_abstract"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "obs palette dark purples black"
    ],
    "lighting": [
      "obs lighting dim with highlights"
    ],
    "shadows": [],
    "highlights": [
      "obs lighting dim with highlights"
    ],
    "composition": [
      "dark background",
      "foreground centered subject"
    ],
    "camera_angle": "frontal",
    "framing": "tight",
    "cropping": [],
    "depth": "shallow",
    "motion_cues": [],
    "motifs": [
      "eye-like shapes in background"
    ],
    "repeated_shapes": [
      "spiky tendrils"
    ],
    "style_cues": [
      "dark"
    ],
    "supporting_observation_ids": [
      "obs_anatomy_body_shape",
      "obs_background_dark_abstract",
      "obs_lighting_dim_with_highlights",
      "obs_palette_dark_dark_purples_black",
      "obs_visual_effects_glowing_eye_and_tendrils"
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
        "fact_creature_color_001",
        "fact_creature_face_eye_001",
        "fact_creature_orientation_001",
        "fact_creature_pose_001"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "upright",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_orientation_upright",
            "obs_pose_floating"
          ],
          "confidence": 0.96
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
        "fact_environment_background_001"
      ],
      "observation_ids": [
        "obs_background_dark_abstract"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_visual_design_lighting_001",
        "fact_visual_design_palette_001"
      ],
      "observation_ids": [
        "obs_lighting_dim_with_highlights",
        "obs_palette_dark_dark_purples_black"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_visual_effects_001"
      ],
      "observation_ids": [
        "obs_visual_effects_glowing_eye_and_tendrils"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_texts_001",
        "fact_card_ui_energy_symbol_001",
        "fact_card_ui_hp_text_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_set_number_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_weakness_resistance_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_text"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_set_number"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_m5"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_symbol_dark"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_text"
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
        "darkrai",
        "floating darkrai",
        "darkrai purple eye",
        "dark abstract background"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
        "obs_pose_floating"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "floating pose"
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
      "confidence": 0.96,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "floating darkrai",
      "supporting_observation_ids": [
        "obs_pose_floating",
        "obs_subject_001"
      ]
    },
    {
      "term": "darkrai purple eye",
      "supporting_observation_ids": [
        "obs_body_highlight_purple_eye"
      ]
    },
    {
      "term": "dark abstract background",
      "supporting_observation_ids": [
        "obs_background_dark_abstract"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_orientation_upright",
          "obs_pose_floating",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_visual_effects_glowing_eye_and_tendrils"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_orientation_upright",
          "obs_pose_floating",
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
- Description confidence: `0.95`
- Attribute confidence: `0.96`
- Cost USD: `0.0075772`
- Artwork observations: `8`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary | 0.98 |
| head with horn-like structures and pink eye | head with horn-like structures and pink eye | creature_anatomy | foreground | primary | 0.95 |
| four distinct black tail-like appendages with glowing green edges | four black tail-like appendages with glowing green edges | creature_anatomy | foreground | primary | 0.93 |
| pink markings on body | pink markings on body | creature_anatomy | foreground | primary | 0.9 |
| floating, facing right, body orientation diagonal | floating right diagonal | creature_anatomy | foreground | primary | 0.9 |
| abstract green glowing background | glowing green background | environment | background | secondary | 0.9 |
| main colors: black, green, pink, white | black green pink white | color_and_light | foreground | primary | 0.95 |
| subject centered on right with abstract shapes in background | center right with abstract background | composition | foreground_background | primary | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガダークライ ex | card_ui_text | top_center | visible | 0.98 |
| HP 280 | card_ui_text | top_right | visible | 0.98 |
| Dark energy symbol | card_ui_symbol | top_right | visible | 0.95 |
| Attack text in Japanese below subject | card_ui_text | middle_bottom | visible | 0.9 |
| set symbol jpn-m5 | set_symbol | bottom_left | visible | 0.85 |
| 099/081 SR | collector_number | bottom_left | visible | 0.85 |
| Illustrator credit: 5ban Graphics | illustrator_text | bottom_left | visible | 0.9 |
| Regulation mark J M5 | regulation_mark | bottom_left | visible | 0.85 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | Mega Darkrai is the main subject | obs_subject_001 | 0.98 |
| fact_002 | creature_anatomy | Head with white horn-like structures and a single visible pink eye | obs_anatomy_001 | 0.95 |
| fact_003 | creature_anatomy | Has four black tail-like appendages with glowing green edges | obs_anatomy_002 | 0.93 |
| fact_004 | creature_anatomy | Pink glowing markings on body surface | obs_anatomy_003 | 0.9 |
| fact_005 | creature_anatomy | Mega Darkrai is floating with body oriented diagonal facing right | obs_pose_001 | 0.9 |
| fact_006 | environment | Abstract glowing green background | obs_environment_001 | 0.9 |
| fact_007 | color_and_light | Primary colors are black, green, pink, and white | obs_coloration_001 | 0.95 |
| fact_008 | composition | Subject positioned center-right with abstract shapes background | obs_composition_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_009 | Card name text in Japanese: メガダークライ ex | obs_card_ui_name_001 | 0.98 |
| fact_010 | HP 280 displayed | obs_card_ui_hp_001 | 0.98 |
| fact_011 | Dark energy symbol present | obs_card_ui_energy_001 | 0.95 |
| fact_012 | Attack text in Japanese below subject area | obs_card_ui_attack_text_001 | 0.9 |
| fact_013 | Set symbol for jpn-m5 set visible | obs_card_ui_set_symbol_001 | 0.85 |
| fact_014 | Collector number 099/081 SR | obs_card_ui_collection_number_001 | 0.85 |
| fact_015 | Illustrator credit: 5ban Graphics | obs_card_ui_illustrator_001 | 0.9 |
| fact_016 | Regulation mark J M5 present | obs_card_ui_regulation_mark_001 | 0.85 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_009",
    "fact_010",
    "fact_011",
    "fact_012",
    "fact_013",
    "fact_014",
    "fact_015",
    "fact_016"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_collection_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_attack_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_001"
  ],
  "regulation_mark_observation_ids": [
    "obs_card_ui_regulation_mark_001"
  ],
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
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | state | floating | obs_subject_001 | obs_pose_001 | visible pink eye head with horn-like structures four tail-like appendages pink glowing markings floating diagonal orientation floating glowing green background | 0.9 |

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
| floating Darkrai | obs_pose_001 |
| glowing green background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_composition_001, obs_environment_001 | deterministic_rule | 0.92 |
| diagonal body orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.98 |
| diagonal composition | obs_pose_001 | deterministic_rule | 0.9 |
| floating | obs_pose_001, obs_subject_001 | deterministic_rule | 0.98 |
| glowing highlights | obs_anatomy_002, obs_coloration_001, obs_environment_001 | deterministic_rule | 0.93 |
| right orientation | obs_composition_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
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
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_001",
      "kind": "creature_anatomy",
      "label": "head with horn-like structures and pink eye",
      "normalized_label": "head with horn-like structures and pink eye",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_002",
      "kind": "creature_anatomy",
      "label": "four distinct black tail-like appendages with glowing green edges",
      "normalized_label": "four black tail-like appendages with glowing green edges",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_003",
      "kind": "creature_anatomy",
      "label": "pink markings on body",
      "normalized_label": "pink markings on body",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "floating, facing right, body orientation diagonal",
      "normalized_label": "floating right diagonal",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "abstract green glowing background",
      "normalized_label": "glowing green background",
      "scene_layer": "background",
      "frame_position": "all",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_coloration_001",
      "kind": "color_and_light",
      "label": "main colors: black, green, pink, white",
      "normalized_label": "black green pink white",
      "scene_layer": "foreground",
      "frame_position": "all",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "subject centered on right with abstract shapes in background",
      "normalized_label": "center right with abstract background",
      "scene_layer": "foreground_background",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガダークライ ex",
      "normalized_label": "card name text in Japanese: mega darkrai ex",
      "scene_layer": "card_ui",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP 280",
      "normalized_label": "hp 280",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "card_ui_symbol",
      "label": "Dark energy symbol",
      "normalized_label": "dark energy symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_text_001",
      "kind": "card_ui_text",
      "label": "Attack text in Japanese below subject",
      "normalized_label": "attack text in Japanese",
      "scene_layer": "card_ui",
      "frame_position": "middle_bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol jpn-m5",
      "normalized_label": "set symbol jpn-m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_collection_number_001",
      "kind": "collector_number",
      "label": "099/081 SR",
      "normalized_label": "099/081 sr",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator credit: 5ban Graphics",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_regulation_mark_001",
      "kind": "regulation_mark",
      "label": "Regulation mark J M5",
      "normalized_label": "regulation mark jm5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0].identity",
      "claim": "Mega Darkrai is the main subject",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "[0].body_components.head",
      "claim": "Head with white horn-like structures and a single visible pink eye",
      "value": "head with horn-like structures and pink eye",
      "supporting_observation_ids": [
        "obs_anatomy_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "[0].body_components.tails",
      "claim": "Has four black tail-like appendages with glowing green edges",
      "value": "four black tail-like appendages with glowing green edges",
      "supporting_observation_ids": [
        "obs_anatomy_002"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "[0].body_markings",
      "claim": "Pink glowing markings on body surface",
      "value": "pink markings on body",
      "supporting_observation_ids": [
        "obs_anatomy_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "[0].pose_and_orientation",
      "claim": "Mega Darkrai is floating with body oriented diagonal facing right",
      "value": "floating right diagonal",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "environment",
      "field_path": "[0].setting",
      "claim": "Abstract glowing green background",
      "value": "glowing green background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "color_and_light",
      "field_path": "[0].color_palette",
      "claim": "Primary colors are black, green, pink, and white",
      "value": "black green pink white",
      "supporting_observation_ids": [
        "obs_coloration_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "composition",
      "field_path": "[0].layout",
      "claim": "Subject positioned center-right with abstract shapes background",
      "value": "center right with abstract background",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "Card name text in Japanese: メガダークライ ex",
      "value": "メガダークライ ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids",
      "claim": "HP 280 displayed",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids",
      "claim": "Dark energy symbol present",
      "value": "dark energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "Attack text in Japanese below subject area",
      "value": "attack text in Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_attack_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "Set symbol for jpn-m5 set visible",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "Collector number 099/081 SR",
      "value": "099/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_collection_number_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "Illustrator credit: 5ban Graphics",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_016",
      "module": "card_ui_and_print_markers",
      "field_path": "regulation_mark_observation_ids",
      "claim": "Regulation mark J M5 present",
      "value": "regulation mark J M5",
      "supporting_observation_ids": [
        "obs_card_ui_regulation_mark_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.98,
      "anatomy": [
        "four tail-like appendages",
        "glowing body markings",
        "head"
      ],
      "physical_features": [
        "black body with pink and green markings",
        "pink glowing eyes"
      ],
      "pose": [
        "diagonal body orientation",
        "floating"
      ],
      "orientation": "right",
      "action_state": [
        "idle"
      ],
      "facial_evidence": {
        "eyes": "visible pink eye",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "side",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "green",
        "pink",
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
      "obs_anatomy_001",
      "obs_anatomy_002",
      "obs_anatomy_003",
      "obs_coloration_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_composition_001",
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "glowing green abstract background"
    ],
    "indoor_outdoor": "indoor_equivalent",
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
      "green",
      "pink",
      "white"
    ],
    "lighting": [
      "glowing light from background, highlighting edges"
    ],
    "shadows": [
      "shadowed areas on subject body"
    ],
    "highlights": [
      "bright green glow and pink highlights on body marks"
    ],
    "composition": [
      "subject centered right with background abstract shapes"
    ],
    "camera_angle": "slight diagonal side view",
    "framing": "tight on subject right half",
    "cropping": [
      "no crop"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "abstract glowing shapes"
    ],
    "repeated_shapes": [
      "four tail-like appendages"
    ],
    "style_cues": [
      "digital painting",
      "illustration"
    ],
    "supporting_observation_ids": [
      "obs_coloration_001",
      "obs_composition_001",
      "obs_environment_001"
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
        "fact_005"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal body orientation",
            "floating"
          ],
          "orientation": "right",
          "action_state": [
            "idle"
          ],
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
        "fact_006"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_008"
      ],
      "observation_ids": [
        "obs_composition_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_007"
      ],
      "observation_ids": [
        "obs_coloration_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015",
        "fact_016"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_collection_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_attack_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "regulation_mark_observation_ids": [
        "obs_card_ui_regulation_mark_001"
      ],
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
        "floating Darkrai",
        "glowing green background"
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
      "semantic_fact_id": "semfact_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "visible pink eye"
        ],
        "eyebrows": [],
        "facial_features": [
          "head with horn-like structures"
        ],
        "body_language": [
          "four tail-like appendages",
          "pink glowing markings"
        ],
        "body_position": [
          "floating diagonal orientation"
        ],
        "motion_state": [
          "floating"
        ],
        "environment": [
          "glowing green background"
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
      "term": "floating Darkrai",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "glowing green background",
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
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal body orientation",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
        "concept": "floating",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_anatomy_002",
          "obs_coloration_001",
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-097 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.96`
- Attribute confidence: `0.95`
- Cost USD: `0.0102544`
- Artwork observations: `14`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, head, body, flame, flame, flame, arm, arm. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure Pokemon | mega chandelure | scene_subject | foreground | high | 1 |
| head region of Mega Chandelure | head | creature_anatomy | foreground | high | 1 |
| body region of Mega Chandelure | body | creature_anatomy | foreground | high | 1 |
| purple flame in Mega Chandelure | flame | objects_and_props | foreground | medium | 1 |
| purple flame in Mega Chandelure | flame | objects_and_props | foreground | medium | 1 |
| purple flame in Mega Chandelure | flame | objects_and_props | foreground | medium | 1 |
| spiral arm body part on Mega Chandelure right side | arm | creature_anatomy | foreground | high | 1 |
| spiral arm body part on Mega Chandelure left side | arm | creature_anatomy | foreground | high | 1 |
| Mega Chandelure face | face | creature_anatomy | foreground | high | 1 |
| Mega Chandelure eyes visible | eyes | creature_anatomy | foreground | high | 1 |
| Mega Chandelure no visible mouth | mouth | creature_anatomy | foreground | medium | 0.9 |
| Mega Chandelure floating upright | floating upright | creature_anatomy | foreground | high | 1 |
| color palette: purple, black, yellow, blue, pink | color palette | color_and_light | foreground | high | 1 |
| background with purple, blue and pink cloud-like shapes | background cloud colors | environment | background | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese with 'ex' suffix | card_ui_text | top_center | fully_visible | 1 |
| HP 350 with purple eye icon | card_ui_text | top_right | fully_visible | 1 |
| Psychic energy symbol | card_ui_symbol | top_left | fully_visible | 1 |
| card number 097/081 SR | collector_number | bottom_left | fully_visible | 1 |
| set symbol for 'jpn-m5' | set_symbol | bottom_left | fully_visible | 1 |
| illustrator text '5ban Graphics' | illustrator_text | bottom_left | fully_visible | 1 |
| bottom legal text with Pokemon, Nintendo, Creatures, GAME FREAK copyright | bottom_line_text | bottom_center | fully_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | identity | obs_subject_001 | 1 |
| fact_creature_anatomy_001 | creature_anatomy | body region | obs_body_001 | 1 |
| fact_creature_anatomy_002 | creature_anatomy | body region | obs_body_002 | 1 |
| fact_creature_anatomy_003 | creature_anatomy | flames color | obs_flames_001, obs_flames_002, obs_flames_003 | 1 |
| fact_creature_anatomy_004 | creature_anatomy | spiral arms | obs_body_wisps_001, obs_body_wisps_002 | 1 |
| fact_creature_anatomy_005 | creature_anatomy | face position | obs_face_001 | 1 |
| fact_creature_anatomy_006 | creature_anatomy | eyes visibility | obs_eye_001 | 1 |
| fact_creature_anatomy_007 | creature_anatomy | mouth visibility | obs_mouth_001 | 0.9 |
| fact_creature_anatomy_008 | creature_anatomy | pose | obs_orientation_001 | 1 |
| fact_color_and_light_001 | color_and_light | color palette | obs_color_palette_001 | 1 |
| fact_environment_001 | environment | background colors | obs_background_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text visible | obs_card_name_text_001 | 1 |
| fact_card_ui_and_print_markers_002 | HP text visible | obs_hp_text_001 | 1 |
| fact_card_ui_and_print_markers_003 | energy symbol visible | obs_energy_symbol_001 | 1 |
| fact_card_ui_and_print_markers_004 | collector number visible | obs_card_number_001 | 1 |
| fact_card_ui_and_print_markers_005 | set symbol visible | obs_set_symbol_001 | 1 |
| fact_card_ui_and_print_markers_006 | illustrator text visible | obs_illustrator_text_001 | 1 |
| fact_card_ui_and_print_markers_007 | bottom legal copyright text visible | obs_bottom_legal_text_001 | 1 |

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
    "obs_card_name_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_hp_text_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_bottom_legal_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_bottom_legal_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_energy_symbol_001"
  ],
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | medium | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semantic_fact_001 | state | floating | obs_subject_001 | obs_orientation_001 | floating upright upright | 1 |

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
| purple flames | obs_flames_001, obs_flames_002, obs_flames_003 |
| floating Pokemon | obs_orientation_001 |
| spiral arms | obs_body_wisps_001, obs_body_wisps_002 |
| purple background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cloud | obs_background_001 | deterministic_rule | 1 |
| flame | obs_flames_001, obs_flames_002, obs_flames_003 | deterministic_rule | 1 |
| floating | obs_orientation_001, obs_subject_001 | deterministic_rule | 1 |
| spiral motif | obs_body_wisps_001, obs_body_wisps_002 | deterministic_rule | 0.92 |
| upright | obs_orientation_001 | deterministic_rule | 1 |
| upright orientation | obs_orientation_001, obs_subject_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, head, body, flame, flame, flame, arm, arm. Semantic facts: floating.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure Pokemon",
      "normalized_label": "mega chandelure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_001",
      "kind": "creature_anatomy",
      "label": "head region of Mega Chandelure",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_002",
      "kind": "creature_anatomy",
      "label": "body region of Mega Chandelure",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_flames_001",
      "kind": "objects_and_props",
      "label": "purple flame in Mega Chandelure",
      "normalized_label": "flame",
      "scene_layer": "foreground",
      "frame_position": "upper_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_flames_002",
      "kind": "objects_and_props",
      "label": "purple flame in Mega Chandelure",
      "normalized_label": "flame",
      "scene_layer": "foreground",
      "frame_position": "upper_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_flames_003",
      "kind": "objects_and_props",
      "label": "purple flame in Mega Chandelure",
      "normalized_label": "flame",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_wisps_001",
      "kind": "creature_anatomy",
      "label": "spiral arm body part on Mega Chandelure right side",
      "normalized_label": "arm",
      "scene_layer": "foreground",
      "frame_position": "right_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_wisps_002",
      "kind": "creature_anatomy",
      "label": "spiral arm body part on Mega Chandelure left side",
      "normalized_label": "arm",
      "scene_layer": "foreground",
      "frame_position": "left_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "creature_anatomy",
      "label": "Mega Chandelure face",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "creature_anatomy",
      "label": "Mega Chandelure eyes visible",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "creature_anatomy",
      "label": "Mega Chandelure no visible mouth",
      "normalized_label": "mouth",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "not_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_orientation_001",
      "kind": "creature_anatomy",
      "label": "Mega Chandelure floating upright",
      "normalized_label": "floating upright",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_palette_001",
      "kind": "color_and_light",
      "label": "color palette: purple, black, yellow, blue, pink",
      "normalized_label": "color palette",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "background with purple, blue and pink cloud-like shapes",
      "normalized_label": "background cloud colors",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese with 'ex' suffix",
      "normalized_label": "card_name_text",
      "scene_layer": "midground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hp_text_001",
      "kind": "card_ui_text",
      "label": "HP 350 with purple eye icon",
      "normalized_label": "hp_text",
      "scene_layer": "midground",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_energy_symbol_001",
      "kind": "card_ui_symbol",
      "label": "Psychic energy symbol",
      "normalized_label": "psychic_energy_symbol",
      "scene_layer": "midground",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "collector_number",
      "label": "card number 097/081 SR",
      "normalized_label": "collector_number",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol for 'jpn-m5'",
      "normalized_label": "set_symbol",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator text '5ban Graphics'",
      "normalized_label": "illustrator_text",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bottom_legal_text_001",
      "kind": "bottom_line_text",
      "label": "bottom legal text with Pokemon, Nintendo, Creatures, GAME FREAK copyright",
      "normalized_label": "bottom_legal_text",
      "scene_layer": "midground",
      "frame_position": "bottom_center",
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
      "field_path": "scene_subject.identity",
      "claim": "identity",
      "value": "Mega Chandelure",
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
      "claim": "body region",
      "value": "head",
      "supporting_observation_ids": [
        "obs_body_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.body",
      "claim": "body region",
      "value": "body",
      "supporting_observation_ids": [
        "obs_body_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "physical_features.flames",
      "claim": "flames color",
      "value": "purple with yellow tips",
      "supporting_observation_ids": [
        "obs_flames_001",
        "obs_flames_002",
        "obs_flames_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.arms",
      "claim": "spiral arms",
      "value": "two spiral arms left and right",
      "supporting_observation_ids": [
        "obs_body_wisps_001",
        "obs_body_wisps_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "face_position",
      "claim": "face position",
      "value": "visible face centered at upper body",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "facial_evidence.eyes",
      "claim": "eyes visibility",
      "value": "visible eyes on face",
      "supporting_observation_ids": [
        "obs_eye_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth visibility",
      "value": "mouth not visible",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_008",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "pose",
      "value": "floating upright",
      "supporting_observation_ids": [
        "obs_orientation_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "color palette",
      "value": "purple, black, yellow, blue, pink",
      "supporting_observation_ids": [
        "obs_color_palette_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background colors",
      "value": "purple, blue, pink cloud-like shapes",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "Japanese text with 'ex' suffix",
      "supporting_observation_ids": [
        "obs_card_name_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text visible",
      "value": "HP 350 with purple eye symbol",
      "supporting_observation_ids": [
        "obs_hp_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy symbol visible",
      "value": "Psychic energy symbol",
      "supporting_observation_ids": [
        "obs_energy_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "097/081 SR",
      "supporting_observation_ids": [
        "obs_card_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "jpn-m5 set symbol",
      "supporting_observation_ids": [
        "obs_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "bottom legal copyright text visible",
      "value": "Pokemon, Nintendo, Creatures, GAME FREAK",
      "supporting_observation_ids": [
        "obs_bottom_legal_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Chandelure",
      "identity_confidence": 1,
      "anatomy": [
        "body",
        "head",
        "purple flames",
        "spiral arms"
      ],
      "physical_features": [
        "purple flames with yellow tips",
        "spiral arms"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "not visible",
        "eyebrows": "",
        "face_position": "center upper body",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
        "pink",
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
      "obs_body_001",
      "obs_body_002",
      "obs_body_wisps_001",
      "obs_body_wisps_002",
      "obs_color_palette_001",
      "obs_eye_001",
      "obs_face_001",
      "obs_flames_001",
      "obs_flames_002",
      "obs_flames_003",
      "obs_mouth_001",
      "obs_orientation_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_bottom_legal_text_001",
      "obs_card_name_text_001",
      "obs_card_number_001",
      "obs_energy_symbol_001",
      "obs_hp_text_001",
      "obs_illustrator_text_001",
      "obs_set_symbol_001"
    ],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "purple, blue, pink cloud-like background colors"
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
      "obs_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_flames_001",
      "label": "purple flame",
      "normalized_label": "flame",
      "object_type": "flame",
      "colors": [
        "purple",
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "left upper",
      "count_reference": "count_001",
      "confidence": 1
    },
    {
      "observation_id": "obs_flames_002",
      "label": "purple flame",
      "normalized_label": "flame",
      "object_type": "flame",
      "colors": [
        "purple",
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "right upper",
      "count_reference": "count_001",
      "confidence": 1
    },
    {
      "observation_id": "obs_flames_003",
      "label": "purple flame",
      "normalized_label": "flame",
      "object_type": "flame",
      "colors": [
        "purple",
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "lower center",
      "count_reference": "count_001",
      "confidence": 1
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "pink",
      "purple",
      "yellow"
    ],
    "lighting": [
      "bright highlights on flame tips and body arms"
    ],
    "shadows": [
      "soft shadows under arms and around body"
    ],
    "highlights": [
      "bright yellow highlights on arms"
    ],
    "composition": [
      "centered subject",
      "flames balanced on three sides"
    ],
    "camera_angle": "frontal",
    "framing": "tight framing focusing on Pokemon",
    "cropping": [
      "full subject visible"
    ],
    "depth": "medium depth with layered background colors",
    "motion_cues": [
      "flames glowing"
    ],
    "motifs": [
      "flames",
      "spiral arms"
    ],
    "repeated_shapes": [
      "flame shapes",
      "spirals in arms"
    ],
    "style_cues": [
      "neon colors",
      "stylized flame effects"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_body_wisps_001",
      "obs_body_wisps_002",
      "obs_color_palette_001",
      "obs_flames_001",
      "obs_flames_002",
      "obs_flames_003",
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
        "fact_creature_anatomy_007",
        "fact_creature_anatomy_008"
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
            "obs_body_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_002"
          ],
          "confidence": 1
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "spiral arms",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "curled spiral shape"
          ],
          "supporting_observation_ids": [
            "obs_body_wisps_001",
            "obs_body_wisps_002"
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
          "action_state": [],
          "supporting_observation_ids": [
            "obs_orientation_001"
          ],
          "confidence": 1
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple flames",
          "details": [
            "yellow tips"
          ],
          "supporting_observation_ids": [
            "obs_flames_001",
            "obs_flames_002",
            "obs_flames_003"
          ],
          "confidence": 1
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
      "object_observation_ids": [
        "obs_flames_001",
        "obs_flames_002",
        "obs_flames_003"
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
      "observation_ids": [
        "obs_background_001",
        "obs_flames_001",
        "obs_flames_002",
        "obs_flames_003",
        "obs_subject_001"
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
      "fact_ids": [],
      "observation_ids": [
        "obs_flames_001",
        "obs_flames_002",
        "obs_flames_003"
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
        "obs_card_name_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_hp_text_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_bottom_legal_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_bottom_legal_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_energy_symbol_001"
      ],
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
        "purple flames",
        "floating Pokemon",
        "spiral arms",
        "purple background"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semantic_fact_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_orientation_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "floating upright"
        ],
        "body_position": [
          "upright"
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
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_flames_001",
        "obs_flames_002",
        "obs_flames_003"
      ]
    },
    {
      "term": "floating Pokemon",
      "supporting_observation_ids": [
        "obs_orientation_001"
      ]
    },
    {
      "term": "spiral arms",
      "supporting_observation_ids": [
        "obs_body_wisps_001",
        "obs_body_wisps_002"
      ]
    },
    {
      "term": "purple background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_flames_001",
          "obs_flames_002",
          "obs_flames_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_orientation_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_body_wisps_001",
          "obs_body_wisps_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "upright",
        "source_observation_ids": [
          "obs_orientation_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_orientation_001",
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

### GV-PK-JPN-M5-063 - メガドリュウズex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.96`
- Cost USD: `0.0112464`
- Artwork observations: `9`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Garchomp ex. Visible observations: mega garchomp ex, body color dark gray, orange triangular marking on body, sharp fins spikes protruding from body, horn color orange and beige spiral pattern, eyes half-closed bored expression, diagonal upward orientation partially cropped, explosive shards background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Garchomp ex | mega garchomp ex | scene_subject | foreground | high | 0.99 |
| Mega Garchomp body color dark gray | body color dark gray | creature_anatomy | foreground | high | 0.98 |
| Mega Garchomp orange triangular marking on body | orange triangular marking on body | creature_anatomy | foreground | high | 0.95 |
| Mega Garchomp sharp fins/spikes protruding from body | sharp fins spikes protruding from body | creature_anatomy | foreground | high | 0.97 |
| Mega Garchomp horn color orange and beige spiral pattern | horn color orange and beige spiral pattern | creature_anatomy | foreground | high | 0.96 |
| Mega Garchomp eyes half-closed with a bored expression | eyes half-closed bored expression | creature_anatomy | foreground | high | 0.95 |
| Mega Garchomp diagonal upward orientation, partially cropped | diagonal upward orientation partially cropped | creature_anatomy | foreground | high | 0.98 |
| Background with explosive orange, yellow, and red shards | explosive shards background | environment | background | medium | 0.9 |
| Background particles with sparkles and light reflections | sparkles light reflections background | visual_design | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text 'メガドリュウズex' | card_name_text | top | visible | 0.99 |
| HP text '340' | hp_text | top-right | visible | 0.99 |
| Dragon type energy symbol | card_ui_symbol | top-right | visible | 0.99 |
| Fire type weakness symbol with ×2 multiplier | card_ui_symbol | bottom-left | visible | 0.99 |
| Grass type resistance symbol with -30 value | card_ui_symbol | bottom-left | visible | 0.99 |
| Retreat cost four colorless energy symbols | card_ui_symbol | bottom-right | visible | 0.99 |
| Illustrator text 'Illus. Keisuke Azuma' | illustrator_text | bottom-left | visible | 0.95 |
| Set code '063/081' and set symbol 'm5' | collector_number | bottom-left | visible | 0.95 |
| Rarity mark 'RR' | rarity_mark | bottom-left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_creature_color_001 | creature_anatomy | body color | obs_creature_appearance_001 | 0.98 |
| fact_creature_marking_001 | creature_anatomy | marking pattern | obs_creature_appearance_002 | 0.95 |
| fact_creature_spikes_001 | creature_anatomy | physical feature presence | obs_creature_appearance_003 | 0.97 |
| fact_creature_horns_001 | creature_anatomy | horn color pattern | obs_creature_appearance_004 | 0.96 |
| fact_creature_eyes_001 | creature_anatomy | eyes expression | obs_creature_appearance_005 | 0.95 |
| fact_creature_pose_001 | creature_anatomy | pose orientation | obs_pose_001 | 0.98 |
| fact_environment_001 | environment | background features | obs_environment_001 | 0.9 |
| fact_visual_design_001 | color_and_light | background effects | obs_visual_design_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_002 | hp text | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_003 | type symbol | obs_card_ui_energy_001 | 0.99 |
| fact_card_ui_004 | weakness symbol | obs_card_ui_weakness_001 | 0.99 |
| fact_card_ui_005 | resistance symbol | obs_card_ui_resistance_001 | 0.99 |
| fact_card_ui_006 | retreat cost | obs_card_ui_retreat_001 | 0.99 |
| fact_card_ui_007 | illustrator text | obs_card_ui_illustrator_001 | 0.95 |
| fact_card_ui_008 | collector number and set code | obs_card_ui_set_info_001 | 0.95 |
| fact_card_ui_009 | rarity mark | obs_card_ui_rarity_001 | 0.95 |

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
    "fact_card_ui_007",
    "fact_card_ui_008",
    "fact_card_ui_009"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_set_info_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_info_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_rarity_001"
  ],
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
| environment | complete | low | medium |  |
| composition | complete | low | medium |  |
| color_and_light | complete | low | medium |  |
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
| dark gray body | obs_creature_appearance_001 |
| orange triangular marking | obs_creature_appearance_002 |
| sharp fins spikes | obs_creature_appearance_003 |
| spiral horns | obs_creature_appearance_004 |
| half-closed eyes | obs_creature_appearance_005 |
| diagonal orientation | obs_pose_001 |
| explosive shards background | obs_environment_001 |
| sparkles and light reflections | obs_visual_design_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_001 | deterministic_rule | 0.92 |
| diagonal | obs_pose_001 | deterministic_rule | 0.98 |
| diagonal composition | obs_pose_001 | deterministic_rule | 0.98 |
| diagonal upward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| explosion | obs_environment_001 | deterministic_rule | 0.92 |
| partially cropped | obs_subject_001 | deterministic_rule | 0.99 |
| spiral motif | obs_creature_appearance_004 | deterministic_rule | 0.96 |
| upward | obs_pose_001 | deterministic_rule | 0.98 |
| upward orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Garchomp ex. Visible observations: mega garchomp ex, body color dark gray, orange triangular marking on body, sharp fins spikes protruding from body, horn color orange and beige spiral pattern, eyes half-closed bored expression, diagonal upward orientation partially cropped, explosive shards background.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Garchomp ex",
      "normalized_label": "mega garchomp ex",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_appearance_001",
      "kind": "creature_anatomy",
      "label": "Mega Garchomp body color dark gray",
      "normalized_label": "body color dark gray",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_appearance_002",
      "kind": "creature_anatomy",
      "label": "Mega Garchomp orange triangular marking on body",
      "normalized_label": "orange triangular marking on body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_appearance_003",
      "kind": "creature_anatomy",
      "label": "Mega Garchomp sharp fins/spikes protruding from body",
      "normalized_label": "sharp fins spikes protruding from body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_appearance_004",
      "kind": "creature_anatomy",
      "label": "Mega Garchomp horn color orange and beige spiral pattern",
      "normalized_label": "horn color orange and beige spiral pattern",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_appearance_005",
      "kind": "creature_anatomy",
      "label": "Mega Garchomp eyes half-closed with a bored expression",
      "normalized_label": "eyes half-closed bored expression",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "Mega Garchomp diagonal upward orientation, partially cropped",
      "normalized_label": "diagonal upward orientation partially cropped",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "Background with explosive orange, yellow, and red shards",
      "normalized_label": "explosive shards background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "visual_design",
      "label": "Background particles with sparkles and light reflections",
      "normalized_label": "sparkles light reflections background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "Card name text 'メガドリュウズex'",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP text '340'",
      "normalized_label": "hp text 340",
      "scene_layer": "interface",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "card_ui_symbol",
      "label": "Dragon type energy symbol",
      "normalized_label": "dragon type energy symbol",
      "scene_layer": "interface",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_001",
      "kind": "card_ui_symbol",
      "label": "Fire type weakness symbol with ×2 multiplier",
      "normalized_label": "fire weakness symbol times 2",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_resistance_001",
      "kind": "card_ui_symbol",
      "label": "Grass type resistance symbol with -30 value",
      "normalized_label": "grass resistance symbol minus 30",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_retreat_001",
      "kind": "card_ui_symbol",
      "label": "Retreat cost four colorless energy symbols",
      "normalized_label": "retreat cost four colorless energy symbols",
      "scene_layer": "interface",
      "frame_position": "bottom-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator text 'Illus. Keisuke Azuma'",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_info_001",
      "kind": "collector_number",
      "label": "Set code '063/081' and set symbol 'm5'",
      "normalized_label": "set code and collector number",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_001",
      "kind": "rarity_mark",
      "label": "Rarity mark 'RR'",
      "normalized_label": "rarity mark rr",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
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
      "field_path": "scene_subject.identity",
      "claim": "scene subject identity",
      "value": "Mega Garchomp ex",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_color_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.body_color",
      "claim": "body color",
      "value": "dark gray",
      "supporting_observation_ids": [
        "obs_creature_appearance_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_marking_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.markings",
      "claim": "marking pattern",
      "value": "orange triangular marking on body",
      "supporting_observation_ids": [
        "obs_creature_appearance_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_spikes_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.spikes",
      "claim": "physical feature presence",
      "value": "sharp fins/spikes protruding from body",
      "supporting_observation_ids": [
        "obs_creature_appearance_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_horns_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.horns.color_pattern",
      "claim": "horn color pattern",
      "value": "orange and beige spiral pattern",
      "supporting_observation_ids": [
        "obs_creature_appearance_004"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_eyes_001",
      "module": "creature_anatomy",
      "field_path": "face.eyes.expression",
      "claim": "eyes expression",
      "value": "half-closed bored expression",
      "supporting_observation_ids": [
        "obs_creature_appearance_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "pose orientation",
      "value": "diagonal upward partially cropped",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "environment.background_features",
      "claim": "background features",
      "value": "explosive orange, yellow, red shards",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_001",
      "module": "color_and_light",
      "field_path": "background.effects",
      "claim": "background effects",
      "value": "sparkles and light reflections",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "card name text",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "hp text",
      "value": "340",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "type_symbol",
      "claim": "type symbol",
      "value": "dragon type energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_symbol",
      "claim": "weakness symbol",
      "value": "fire type ×2",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_symbol",
      "claim": "resistance symbol",
      "value": "grass type -30",
      "supporting_observation_ids": [
        "obs_card_ui_resistance_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "retreat cost",
      "value": "four colorless energy symbols",
      "supporting_observation_ids": [
        "obs_card_ui_retreat_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Illus. Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_008",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_and_set_code",
      "claim": "collector number and set code",
      "value": "063/081 and set m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_info_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_009",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "rarity mark",
      "value": "RR",
      "supporting_observation_ids": [
        "obs_card_ui_rarity_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Garchomp ex",
      "identity_confidence": 0.99,
      "anatomy": [
        "dark gray body color",
        "half-closed eyes with bored expression",
        "orange triangular marking",
        "orange-beige spiral horns",
        "sharp fins/spikes"
      ],
      "physical_features": [
        "sharp fins/spikes",
        "spiral horns"
      ],
      "pose": [
        "diagonal upward orientation",
        "partially cropped"
      ],
      "orientation": "upward",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "half-closed",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "beige",
        "dark gray",
        "orange",
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
      "obs_creature_appearance_001",
      "obs_creature_appearance_002",
      "obs_creature_appearance_003",
      "obs_creature_appearance_004",
      "obs_creature_appearance_005",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_visual_design_001"
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
      "obs_environment_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "beige",
      "dark gray",
      "orange",
      "red",
      "yellow"
    ],
    "lighting": [
      "normal lighting with sparkles and reflections"
    ],
    "shadows": [],
    "highlights": [
      "sparkles and light reflections"
    ],
    "composition": [
      "centered subject with explosive shards background"
    ],
    "camera_angle": "diagonal",
    "framing": "partially cropped subject",
    "cropping": [
      "partial crop at top right"
    ],
    "depth": "shallow depth with subject in foreground",
    "motion_cues": [
      "implied shards and sparkles"
    ],
    "motifs": [
      "triangular sharp shapes of spikes and shards"
    ],
    "repeated_shapes": [
      "triangles"
    ],
    "style_cues": [
      "detailed digital painting",
      "action style"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_pose_001",
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
        "fact_creature_color_001",
        "fact_creature_eyes_001",
        "fact_creature_horns_001",
        "fact_creature_marking_001",
        "fact_creature_pose_001",
        "fact_creature_spikes_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "color",
          "visibility": "visible",
          "colors": [
            "dark gray"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_appearance_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "marking",
          "visibility": "visible",
          "colors": [
            "orange"
          ],
          "details": [
            "triangular pattern"
          ],
          "supporting_observation_ids": [
            "obs_creature_appearance_002"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "spikes",
          "visibility": "visible",
          "colors": [
            "dark gray"
          ],
          "details": [
            "sharp fins/spikes"
          ],
          "supporting_observation_ids": [
            "obs_creature_appearance_003"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "horns",
          "visibility": "visible",
          "colors": [
            "beige",
            "orange"
          ],
          "details": [
            "spiral pattern"
          ],
          "supporting_observation_ids": [
            "obs_creature_appearance_004"
          ],
          "confidence": 0.96
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal",
            "upward"
          ],
          "orientation": "upward",
          "action_state": [
            "static"
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
        "fact_visual_design_001"
      ],
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_visual_design_001"
      ],
      "observation_ids": [
        "obs_visual_design_001"
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
        "fact_card_ui_007",
        "fact_card_ui_008",
        "fact_card_ui_009"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_set_info_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_info_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_rarity_001"
      ],
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
        "dark gray body",
        "orange triangular marking",
        "sharp fins spikes",
        "spiral horns",
        "half-closed eyes",
        "diagonal orientation",
        "explosive shards background",
        "sparkles and light reflections"
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
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark gray body",
      "supporting_observation_ids": [
        "obs_creature_appearance_001"
      ]
    },
    {
      "term": "orange triangular marking",
      "supporting_observation_ids": [
        "obs_creature_appearance_002"
      ]
    },
    {
      "term": "sharp fins spikes",
      "supporting_observation_ids": [
        "obs_creature_appearance_003"
      ]
    },
    {
      "term": "spiral horns",
      "supporting_observation_ids": [
        "obs_creature_appearance_004"
      ]
    },
    {
      "term": "half-closed eyes",
      "supporting_observation_ids": [
        "obs_creature_appearance_005"
      ]
    },
    {
      "term": "diagonal orientation",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "explosive shards background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "sparkles and light reflections",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "diagonal upward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "partially cropped",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_creature_appearance_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "upward",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "upward orientation",
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

### GV-PK-JPN-M5-078 - ムク

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0093088`
- Artwork observations: `11`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: female character.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female character | female character | character | midground | primary subject | 0.99 |
| dark purple hair | dark purple hair | hair | midground | primary | 0.98 |
| headgear with black swirled horns and white crown-like element with blue gem | headgear with swirled horns | object | midground | primary subject detail | 0.95 |
| face with neutral expression, eyes visible | neutral face | face | midground | primary | 0.97 |
| white robe with yellow star-like symbol on sleeve | white robe with symbol | clothing | midground | primary subject detail | 0.97 |
| black shirt underneath robe | black inner clothing | clothing | midground | primary subject detail | 0.95 |
| belt with gold buckle shaped like a circle with horizontal bar | belt buckle circle with bar | object | midground | primary subject detail | 0.95 |
| blue gloves | blue gloves | clothing | midground | primary subject detail | 0.96 |
| brick wall with arches and lamps | indoor brick wall with arches and lamps | environment | background | background | 0.95 |
| stone floor with grid drain | stone floor with grid drain | environment | background | background detail | 0.95 |
| warm light from lamps on wall | warm lighting indoor | lighting | background | background detail | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| ムク | card_name_text | top left | visible | 0.99 |
| サポート | card_ui_text | top left corner | visible | 0.99 |
| トレーナーズ | card_ui_text | top right corner | visible | 0.99 |
| JPN m5 set marker | card_ui_set_marker | bottom left | visible | 0.99 |
| 078/081 | collector_number | bottom left | visible | 0.99 |
| Illus. nagimiso | illustrator_text | bottom left | visible | 0.99 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom center | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair color | obs_hair_001 | 0.98 |
| fact_clothing_001 | clothing | outer garment color and pattern | obs_garment_001 | 0.97 |
| fact_clothing_002 | clothing | inner garment color | obs_clothing_002 | 0.95 |
| fact_accessory_001 | clothing | belt buckle shape and color | obs_accessory_001 | 0.95 |
| fact_clothing_003 | clothing | gloves color | obs_gloves_001 | 0.96 |
| fact_creature_anatomy_001 | creature_anatomy | headgear design | obs_headgear_001 | 0.95 |
| fact_environment_001 | environment | background architecture | obs_background_001 | 0.95 |
| fact_environment_002 | environment | floor material | obs_background_002 | 0.95 |
| fact_color_and_light_001 | color_and_light | lighting type | obs_lighting_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_support_001 | support text | obs_card_ui_support_001 | 0.99 |
| fact_card_ui_trainer_001 | trainer type text | obs_card_ui_trainer_001 | 0.99 |
| fact_card_ui_set_001 | set code | obs_card_ui_set_001 | 0.99 |
| fact_card_ui_number_001 | collector number text | obs_card_ui_number_001 | 0.99 |
| fact_illustrator_001 | illustrator name text | obs_illustrator_001 | 0.99 |
| fact_copyright_001 | copyright notice text | obs_copyright_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_name_001",
    "fact_card_ui_number_001",
    "fact_card_ui_set_001",
    "fact_card_ui_support_001",
    "fact_card_ui_trainer_001",
    "fact_copyright_001",
    "fact_illustrator_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_copyright_001"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_illustrator_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_support_001",
    "obs_card_ui_trainer_001"
  ]
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | complete | none | high |  |
| human_appearance | likely_complete | low | high |  |
| creature_anatomy | likely_complete | low | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
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
| dark purple hair | obs_hair_001 |
| white robe | obs_garment_001 |
| blue gloves | obs_gloves_001 |
| indoor brick wall | obs_background_001 |
| arched wall | obs_background_001 |
| warm lighting | obs_lighting_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_accessory_001 | deterministic_rule | 0.95 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_gloves_001 | deterministic_rule | 0.96 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female character.
- Quality flags: `potential_unavailable_metadata_prompt_branch_mismatch`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "character",
      "label": "female character",
      "normalized_label": "female character",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "hair",
      "label": "dark purple hair",
      "normalized_label": "dark purple hair",
      "scene_layer": "midground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_headgear_001",
      "kind": "object",
      "label": "headgear with black swirled horns and white crown-like element with blue gem",
      "normalized_label": "headgear with swirled horns",
      "scene_layer": "midground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary subject detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "face",
      "label": "face with neutral expression, eyes visible",
      "normalized_label": "neutral face",
      "scene_layer": "midground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_garment_001",
      "kind": "clothing",
      "label": "white robe with yellow star-like symbol on sleeve",
      "normalized_label": "white robe with symbol",
      "scene_layer": "midground",
      "frame_position": "torso and arms",
      "visibility": "visible",
      "salience": "primary subject detail",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "black shirt underneath robe",
      "normalized_label": "black inner clothing",
      "scene_layer": "midground",
      "frame_position": "torso",
      "visibility": "visible",
      "salience": "primary subject detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "object",
      "label": "belt with gold buckle shaped like a circle with horizontal bar",
      "normalized_label": "belt buckle circle with bar",
      "scene_layer": "midground",
      "frame_position": "waist",
      "visibility": "visible",
      "salience": "primary subject detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_gloves_001",
      "kind": "clothing",
      "label": "blue gloves",
      "normalized_label": "blue gloves",
      "scene_layer": "midground",
      "frame_position": "hands",
      "visibility": "visible",
      "salience": "primary subject detail",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "brick wall with arches and lamps",
      "normalized_label": "indoor brick wall with arches and lamps",
      "scene_layer": "background",
      "frame_position": "full background",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_002",
      "kind": "environment",
      "label": "stone floor with grid drain",
      "normalized_label": "stone floor with grid drain",
      "scene_layer": "background",
      "frame_position": "lower background",
      "visibility": "visible",
      "salience": "background detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "lighting",
      "label": "warm light from lamps on wall",
      "normalized_label": "warm lighting indoor",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "background detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "ムク",
      "normalized_label": "ムク",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "primary card UI element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_support_001",
      "kind": "card_ui_text",
      "label": "サポート",
      "normalized_label": "Support",
      "scene_layer": "card_ui",
      "frame_position": "top left corner",
      "visibility": "visible",
      "salience": "card UI",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "Trainers",
      "scene_layer": "card_ui",
      "frame_position": "top right corner",
      "visibility": "visible",
      "salience": "card UI",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "card_ui_set_marker",
      "label": "JPN m5 set marker",
      "normalized_label": "jpn-m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "card UI",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "078/081",
      "normalized_label": "078/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "card UI",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. nagimiso",
      "normalized_label": "Illustrator Nagimiso",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "card UI",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_copyright_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "card UI",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0]",
      "claim": "subject identity",
      "value": "female character",
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
      "claim": "hair color",
      "value": "dark purple",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "outer garment color and pattern",
      "value": "white robe with yellow star symbol on sleeve",
      "supporting_observation_ids": [
        "obs_garment_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "inner garment color",
      "value": "black shirt",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessory_001",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "belt buckle shape and color",
      "value": "gold circle with horizontal bar",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_003",
      "module": "clothing",
      "field_path": "accessories[1]",
      "claim": "gloves color",
      "value": "blue gloves",
      "supporting_observation_ids": [
        "obs_gloves_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "headgear",
      "claim": "headgear design",
      "value": "white crown with black swirled horns and blue gem",
      "supporting_observation_ids": [
        "obs_headgear_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "architecture",
      "claim": "background architecture",
      "value": "indoor brick wall with arches and lamps",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "ground",
      "claim": "floor material",
      "value": "stone floor with grid drain",
      "supporting_observation_ids": [
        "obs_background_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "lighting type",
      "value": "warm light from wall lamps",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "ムク",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_support_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "support text",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_support_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_trainer_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "trainer type text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set code",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number text",
      "value": "078/081",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name text",
      "value": "Illus. nagimiso",
      "supporting_observation_ids": [
        "obs_illustrator_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_text",
      "claim": "copyright notice text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_copyright_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female character",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "hands",
        "head",
        "torso"
      ],
      "physical_features": [
        "dark purple hair",
        "neutral face"
      ],
      "pose": [
        "upright"
      ],
      "orientation": "forward",
      "action_state": [
        "standing still"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "belt buckle",
        "black inner shirt",
        "blue gloves",
        "white robe with yellow star symbol on sleeve"
      ],
      "colors": [
        "black",
        "blue",
        "dark purple",
        "white",
        "yellow"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_accessory_001",
      "obs_clothing_002",
      "obs_face_001",
      "obs_garment_001",
      "obs_gloves_001",
      "obs_hair_001",
      "obs_headgear_001",
      "obs_subject_001"
    ],
    "background": [
      "obs_background_001",
      "obs_background_002",
      "obs_lighting_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "stone floor with grid drain"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "brick wall with arches and lamps"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_background_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "brown",
      "dark purple",
      "orange",
      "white",
      "yellow"
    ],
    "lighting": [
      "warm indoor lighting"
    ],
    "shadows": [
      "soft shadows on character"
    ],
    "highlights": [
      "highlight on hair and robe"
    ],
    "composition": [
      "centered subject",
      "frontal pose"
    ],
    "camera_angle": "eye level",
    "framing": "tight vertical crop",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "arches background"
    ],
    "repeated_shapes": [
      "arched brick wall patterns"
    ],
    "style_cues": [
      "art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_lighting_001",
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
        "fact_hair_001"
      ],
      "visible_body_regions": [],
      "facial_evidence": [],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "dark purple hair",
          "details": [
            "visible hair color"
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
      "fact_ids": [
        "fact_creature_anatomy_001"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "upright"
          ],
          "orientation": "forward",
          "action_state": [
            "standing still"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.99
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "headgear with black swirled horns and white crown",
          "details": [
            "seen on head"
          ],
          "supporting_observation_ids": [
            "obs_headgear_001"
          ],
          "confidence": 0.95
        }
      ]
    },
    "clothing": {
      "fact_ids": [
        "fact_accessory_001",
        "fact_clothing_001",
        "fact_clothing_002",
        "fact_clothing_003"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and arms",
          "garment": "white robe with yellow star symbol",
          "neckline_type": "",
          "sleeve_type": "long sleeve",
          "colors": [
            "white",
            "yellow"
          ],
          "visible_details": [
            "yellow star symbol on sleeve"
          ],
          "supporting_observation_ids": [
            "obs_garment_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black inner shirt",
          "neckline_type": "",
          "sleeve_type": "not visible",
          "colors": [
            "black"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue gloves",
          "details": [
            "visible glove color"
          ],
          "supporting_observation_ids": [
            "obs_gloves_001"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "gold belt buckle circle with bar",
          "details": [
            "visible buckle"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.95
        }
      ]
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
        "obs_background_001",
        "obs_background_002"
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
        "fact_color_and_light_001"
      ],
      "observation_ids": [
        "obs_lighting_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_name_001",
        "fact_card_ui_number_001",
        "fact_card_ui_set_001",
        "fact_card_ui_support_001",
        "fact_card_ui_trainer_001",
        "fact_copyright_001",
        "fact_illustrator_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_copyright_001"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_support_001",
        "obs_card_ui_trainer_001"
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
        "dark purple hair",
        "white robe",
        "blue gloves",
        "indoor brick wall",
        "arched wall",
        "warm lighting"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "creature_anatomy",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "white robe",
      "supporting_observation_ids": [
        "obs_garment_001"
      ]
    },
    {
      "term": "blue gloves",
      "supporting_observation_ids": [
        "obs_gloves_001"
      ]
    },
    {
      "term": "indoor brick wall",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "arched wall",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "warm lighting",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_accessory_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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
        "concept": "gloves",
        "source_observation_ids": [
          "obs_gloves_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0107336`
- Artwork observations: `10`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: female human trainer. Visible observations: female human trainer, orange spiky hair with ponytail tied with black band, face with large green eyes and smiling mouth, blue sleeveless top, bent left arm with fist, extended right arm with wristband, blue swimsuit bottom, bare legs kneeling position, indoor swimming pool environment. Semantic facts: kneeling.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer | female human trainer | scene_subject | foreground | high | 0.99 |
| orange hair in spiky style with ponytail tied with black band | orange spiky hair with ponytail tied with black band | object | foreground | high | 0.98 |
| face with large green eyes, open smiling mouth, and visible ears | face with large green eyes and smiling mouth | object | foreground | high | 0.99 |
| blue sleeveless swimsuit top | blue sleeveless top | object | foreground | high | 0.99 |
| left arm bent in front with fist, right arm extended backwards with wristband | bent left arm with fist, extended right arm with wristband | object | foreground | high | 0.98 |
| blue swimsuit bottom | blue swimsuit bottom | object | foreground | high | 0.98 |
| bare legs kneeling on one knee on poolside | bare legs kneeling position | object | foreground | high | 0.99 |
| indoor swimming pool environment with water, poolside, benches | indoor swimming pool environment | environment | background | medium | 0.95 |
| blue water surface with reflections and sparkles | blue water with reflections and sparkles | environment | background | medium | 0.95 |
| blue benches in background near pool | blue benches | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese 'カスミの元気' | card_ui_text | top left | visible | 0.96 |
| red Japanese text 'サポート' (Support) at top left | card_ui_text | top left | visible | 0.95 |
| gray Japanese text 'トレーナーズ' (Trainers) at top right | card_ui_text | top right | visible | 0.95 |
| Japanese descriptive text in black mid card with white outlines | card_ui_text | middle | visible | 0.95 |
| small black copyright text and set info at bottom | card_ui_text | bottom | visible | 0.95 |
| white text on dark circle near bottom left '108/081 SR' | card_ui_text | bottom left | visible | 0.95 |
| black text 'Illus. En Morikura' near bottom left | illustrator_text | bottom left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject is female human trainer | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair color is orange with spiky style and ponytail with black tie | obs_hair_001 | 0.98 |
| fact_face_001 | human_appearance | face has large green eyes and is smiling with open mouth | obs_face_001 | 0.99 |
| fact_clothing_top_001 | clothing | wears blue sleeveless swimsuit top | obs_clothing_upper_001 | 0.99 |
| fact_clothing_bottom_001 | clothing | wears blue swimsuit bottoms | obs_swimsuit_bottom_001 | 0.98 |
| fact_body_pose_001 | human_appearance | kneeling position with bent left arm and extended right arm | obs_arms_001, obs_legs_001 | 0.98 |
| fact_environment_001 | environment | indoor swimming pool environment with benches and blue water | obs_environment_001, obs_environment_benches_001, obs_environment_water_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text visible in Japanese | obs_card_ui_name_001 | 0.96 |
| fact_card_ui_type_001 | card type Support text visible in red Japanese | obs_card_ui_supporter_001 | 0.95 |
| fact_card_ui_subtype_001 | card subtype Trainers text visible in gray Japanese | obs_card_ui_trainers_001 | 0.95 |
| fact_card_ui_textblock_001 | card ability text block visible in black and white text | obs_card_ui_card_text_001 | 0.95 |
| fact_card_ui_bottom_001 | copyright and set info text visible at bottom | obs_card_ui_bottom_text_001 | 0.95 |
| fact_card_ui_collector_number_001 | collector number and rarity text visible '108/081 SR' | obs_card_ui_set_code_001 | 0.95 |
| fact_card_ui_illustrator_001 | illustrator name text visible 'Illus. En Morikura' | obs_illustrator_text_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_bottom_001",
    "fact_card_ui_collector_number_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_subtype_001",
    "fact_card_ui_textblock_001",
    "fact_card_ui_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
  "bottom_line_text_observation_ids": [],
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
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfac_001 | action | kneeling | obs_subject_001 | obs_arms_001, obs_legs_001 | open smiling mouth open green eyes visible relaxed eyebrows ear visible left arm bent with fist right arm extended with wristband kneeling indoor swimming pool environment | 0.98 |

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
| blue swimsuit | obs_clothing_upper_001, obs_swimsuit_bottom_001 |
| orange spiky ponytail hair | obs_hair_001 |
| indoor swimming pool | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| kneeling | obs_arms_001, obs_legs_001, obs_subject_001 | deterministic_rule | 0.99 |
| left arm bent with fist | obs_subject_001 | deterministic_rule | 0.99 |
| reaching | obs_subject_001 | deterministic_rule | 0.99 |
| sleeveless clothing | obs_clothing_upper_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Visible observations: female human trainer, orange spiky hair with ponytail tied with black band, face with large green eyes and smiling mouth, blue sleeveless top, bent left arm with fist, extended right arm with wristband, blue swimsuit bottom, bare legs kneeling position, indoor swimming pool environment. Semantic facts: kneeling.
- Quality flags: `none`
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
      "kind": "object",
      "label": "orange hair in spiky style with ponytail tied with black band",
      "normalized_label": "orange spiky hair with ponytail tied with black band",
      "scene_layer": "foreground",
      "frame_position": "head upper center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "object",
      "label": "face with large green eyes, open smiling mouth, and visible ears",
      "normalized_label": "face with large green eyes and smiling mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_upper_001",
      "kind": "object",
      "label": "blue sleeveless swimsuit top",
      "normalized_label": "blue sleeveless top",
      "scene_layer": "foreground",
      "frame_position": "torso",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_arms_001",
      "kind": "object",
      "label": "left arm bent in front with fist, right arm extended backwards with wristband",
      "normalized_label": "bent left arm with fist, extended right arm with wristband",
      "scene_layer": "foreground",
      "frame_position": "arms",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_swimsuit_bottom_001",
      "kind": "object",
      "label": "blue swimsuit bottom",
      "normalized_label": "blue swimsuit bottom",
      "scene_layer": "foreground",
      "frame_position": "lower torso",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_legs_001",
      "kind": "object",
      "label": "bare legs kneeling on one knee on poolside",
      "normalized_label": "bare legs kneeling position",
      "scene_layer": "foreground",
      "frame_position": "lower body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool environment with water, poolside, benches",
      "normalized_label": "indoor swimming pool environment",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_water_001",
      "kind": "environment",
      "label": "blue water surface with reflections and sparkles",
      "normalized_label": "blue water with reflections and sparkles",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_benches_001",
      "kind": "environment",
      "label": "blue benches in background near pool",
      "normalized_label": "blue benches",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese 'カスミの元気'",
      "normalized_label": "card name text Japanese",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_supporter_001",
      "kind": "card_ui_text",
      "label": "red Japanese text 'サポート' (Support) at top left",
      "normalized_label": "card type Support text",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainers_001",
      "kind": "card_ui_text",
      "label": "gray Japanese text 'トレーナーズ' (Trainers) at top right",
      "normalized_label": "card subtype Trainers text",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_card_text_001",
      "kind": "card_ui_text",
      "label": "Japanese descriptive text in black mid card with white outlines",
      "normalized_label": "card ability text",
      "scene_layer": "interface",
      "frame_position": "middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "card_ui_text",
      "label": "small black copyright text and set info at bottom",
      "normalized_label": "copyright and set text",
      "scene_layer": "interface",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "card_ui_text",
      "label": "white text on dark circle near bottom left '108/081 SR'",
      "normalized_label": "collector number and rarity symbol",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "black text 'Illus. En Morikura' near bottom left",
      "normalized_label": "illustrator name text",
      "scene_layer": "interface",
      "frame_position": "bottom left",
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
      "field_path": "0",
      "claim": "scene subject is female human trainer",
      "value": "true",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair",
      "claim": "hair color is orange with spiky style and ponytail with black tie",
      "value": "orange spiky ponytail with black tie",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "face",
      "claim": "face has large green eyes and is smiling with open mouth",
      "value": "green eyes, smiling mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_top_001",
      "module": "clothing",
      "field_path": "garments.upper_body",
      "claim": "wears blue sleeveless swimsuit top",
      "value": "blue sleeveless top",
      "supporting_observation_ids": [
        "obs_clothing_upper_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_bottom_001",
      "module": "clothing",
      "field_path": "garments.lower_body",
      "claim": "wears blue swimsuit bottoms",
      "value": "blue swimsuit bottom",
      "supporting_observation_ids": [
        "obs_swimsuit_bottom_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_pose_001",
      "module": "human_appearance",
      "field_path": "pose",
      "claim": "kneeling position with bent left arm and extended right arm",
      "value": "kneeling, bent left arm with fist, extended right arm with wristband",
      "supporting_observation_ids": [
        "obs_arms_001",
        "obs_legs_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "indoor swimming pool environment with benches and blue water",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_benches_001",
        "obs_environment_water_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible in Japanese",
      "value": "カスミの元気",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_type_text",
      "claim": "card type Support text visible in red Japanese",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_supporter_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_subtype_001",
      "module": "card_ui_and_print_markers",
      "field_path": "subtype_text",
      "claim": "card subtype Trainers text visible in gray Japanese",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_trainers_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_textblock_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_text",
      "claim": "card ability text block visible in black and white text",
      "value": "Japanese card ability text",
      "supporting_observation_ids": [
        "obs_card_ui_card_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright and set info text visible at bottom",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and rarity text visible '108/081 SR'",
      "value": "108/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name text visible 'Illus. En Morikura'",
      "value": "Illus. En Morikura",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
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
        "legs"
      ],
      "physical_features": [
        "large green eyes",
        "orange spiky ponytail hair"
      ],
      "pose": [
        "kneeling",
        "left arm bent with fist",
        "reaching"
      ],
      "orientation": "forward",
      "action_state": [
        "energetic",
        "smiling"
      ],
      "facial_evidence": {
        "eyes": "open green eyes",
        "mouth": "open smiling mouth",
        "eyebrows": "visible relaxed eyebrows",
        "face_position": "frontal",
        "other_visible_evidence": [
          "ears visible"
        ]
      },
      "clothing_or_accessories": [
        "black wristband on right arm",
        "blue sleeveless swimsuit top",
        "blue swimsuit bottom"
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
      "obs_arms_001",
      "obs_clothing_upper_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_legs_001",
      "obs_subject_001",
      "obs_swimsuit_bottom_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_benches_001",
      "obs_environment_water_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "poolside"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "benches"
    ],
    "water": [
      "pool water"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_benches_001",
      "obs_environment_water_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "orange",
      "skin tones"
    ],
    "lighting": [
      "even indoor"
    ],
    "shadows": [
      "subtle shadowing on limbs"
    ],
    "highlights": [
      "hair strands highlight"
    ],
    "composition": [
      "centered subject",
      "portrait orientation"
    ],
    "camera_angle": "eye-level",
    "framing": "medium-close-up",
    "cropping": [
      "full torso and arms visible",
      "knees partially visible"
    ],
    "depth": "shallow depth",
    "motion_cues": [],
    "motifs": [
      "sportswear",
      "water and pool"
    ],
    "repeated_shapes": [
      "angular hair spikes"
    ],
    "style_cues": [
      "illustration"
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
        "fact_body_pose_001",
        "fact_face_001",
        "fact_hair_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "ears visible",
            "large green eyes",
            "smiling mouth"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "open green eyes",
          "mouth": "open smiling mouth",
          "eyebrows": "visible relaxed eyebrows",
          "other_visible_evidence": [
            "ears visible"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange spiky hair with ponytail",
          "details": [
            "hair strands highlight",
            "pony tied with black band"
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
          "label": "kneeling with bent left arm and extended right arm",
          "details": [
            "left fist clenched",
            "wristband on right arm"
          ],
          "supporting_observation_ids": [
            "obs_arms_001",
            "obs_legs_001"
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
      "pose_orientation": [],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_clothing_bottom_001",
        "fact_clothing_top_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper body",
          "garment": "blue sleeveless swimsuit top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "tight fit"
          ],
          "supporting_observation_ids": [
            "obs_clothing_upper_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "lower body",
          "garment": "blue swimsuit bottom",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "tight fit"
          ],
          "supporting_observation_ids": [
            "obs_swimsuit_bottom_001"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on right wrist",
          "details": [
            "simple band"
          ],
          "supporting_observation_ids": [
            "obs_arms_001"
          ],
          "confidence": 0.95
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
        "obs_environment_001",
        "obs_environment_benches_001",
        "obs_environment_water_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_face_001",
        "obs_hair_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_hair_001",
        "obs_subject_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_bottom_001",
        "fact_card_ui_collector_number_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_subtype_001",
        "fact_card_ui_textblock_001",
        "fact_card_ui_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "bottom_line_text_observation_ids": [],
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
        "blue swimsuit",
        "orange spiky ponytail hair",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfac_001",
      "category": "action",
      "label": "kneeling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_arms_001",
        "obs_legs_001"
      ],
      "evidence": {
        "mouth": [
          "open smiling mouth"
        ],
        "eyes": [
          "open green eyes"
        ],
        "eyebrows": [
          "visible relaxed eyebrows"
        ],
        "facial_features": [
          "ear visible"
        ],
        "body_language": [
          "left arm bent with fist",
          "right arm extended with wristband"
        ],
        "body_position": [
          "kneeling"
        ],
        "motion_state": [],
        "environment": [
          "indoor swimming pool environment"
        ],
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
      "term": "blue swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_upper_001",
        "obs_swimsuit_bottom_001"
      ]
    },
    {
      "term": "orange spiky ponytail hair",
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
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "kneeling",
        "source_observation_ids": [
          "obs_arms_001",
          "obs_legs_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left arm bent with fist",
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
        "concept": "sleeveless clothing",
        "source_observation_ids": [
          "obs_clothing_upper_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-110 - Rust Syndicate Grunt

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.93`
- Attribute confidence: `0.95`
- Cost USD: `0.0118484`
- Artwork observations: `16`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: Rust Syndicate Grunt female front left, Rust Syndicate Grunt male back right. Semantic facts: female standing hands on hips, male standing arms crossed behind back, green plants.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human figure front left | female human figure front left | scene_subject | foreground | primary | 0.99 |
| male human figure back right | male human figure back right | scene_subject | foreground | primary | 0.99 |
| female hair blond, wavy | female hair blond wavy | human_appearance | foreground | primary | 0.99 |
| male hair black, flat top | male hair black flat top | human_appearance | foreground | primary | 0.99 |
| female skin tone light | female skin tone light | human_appearance | foreground | primary | 0.99 |
| male skin tone dark | male skin tone dark | human_appearance | foreground | primary | 0.99 |
| female eyes visible with purple glasses | female eyes visible purple glasses | human_appearance | foreground | primary | 0.95 |
| male eyes visible with purple glasses | male eyes visible purple glasses | human_appearance | foreground | primary | 0.95 |
| female wearing dark gray business suit jacket with a purple geometric pattern pocket square | female dark gray business suit jacket purple geometric pocket square | clothing | foreground | primary | 0.95 |
| female wearing white shirt with blue diamond pattern | female white shirt blue diamond pattern | clothing | foreground | primary | 0.99 |
| female polished purple nails visible | female polished purple nails | clothing | foreground | primary | 0.93 |
| male wearing dark gray suit jacket | male dark gray suit jacket | clothing | foreground | primary | 0.95 |
| male wearing white shirt with purple striped tie | male white shirt purple striped tie | clothing | foreground | primary | 0.95 |
| female standing with hands on hips | standing hands on hips | human_appearance | foreground | primary | 0.98 |
| male standing arms crossed behind back | standing arms crossed behind back | human_appearance | foreground | primary | 0.97 |
| green leafy plants grouped at bottom left corner | green leafy plants | objects_and_props | background | secondary | 0.92 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | There are two human trainer subjects | obs_subject_001, obs_subject_002 | 0.99 |
| fact_002 | human_appearance | Female has blond wavy hair | obs_human_appearance_001 | 0.99 |
| fact_003 | human_appearance | Male has black flat top hair | obs_human_appearance_002 | 0.99 |
| fact_004 | human_appearance | Female has light skin tone | obs_human_appearance_003 | 0.99 |
| fact_005 | human_appearance | Male has dark skin tone | obs_human_appearance_004 | 0.99 |
| fact_006 | human_appearance | Female wears purple tinted glasses | obs_human_appearance_005 | 0.95 |
| fact_007 | human_appearance | Male wears purple tinted glasses | obs_human_appearance_006 | 0.95 |
| fact_008 | clothing | Female wears dark gray business suit jacket with purple geometric pattern pocket square | obs_clothing_001 | 0.95 |
| fact_009 | clothing | Female wears white shirt with blue diamond pattern | obs_clothing_002 | 0.99 |
| fact_010 | clothing | Female has polished purple fingernails | obs_clothing_003 | 0.93 |
| fact_011 | clothing | Male wears dark gray suit jacket | obs_clothing_004 | 0.95 |
| fact_012 | clothing | Male wears white shirt with purple striped tie | obs_clothing_005 | 0.95 |
| fact_013 | human_appearance | Female is standing with hands on hips | obs_pose_001 | 0.98 |
| fact_014 | human_appearance | Male is standing with arms crossed behind back | obs_pose_002 | 0.97 |
| fact_015 | objects_and_props | Grouped green leafy plants in background bottom left | obs_objects_001 | 0.92 |

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
| clothing | complete | low | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | card_ui_and_print_markers.name_text_observation_ids: name text OCR unclear due to low resolution; card_ui_and_print_markers.collector_number_observation_ids: collector number partially unclear due to low resolution |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | state | female standing hands on hips | obs_subject_001 | obs_pose_001 | closed smile visible neutral wearing purple tinted glasses hands on hips standing | 0.98 |
| sem_002 | state | male standing arms crossed behind back | obs_subject_002 | obs_pose_002 | neutral visible neutral wearing purple tinted glasses arms crossed behind back standing | 0.97 |
| sem_003 | environment | green plants |  | obs_objects_001 | green leafy plants plants | 0.92 |

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
| female trainer | obs_subject_001 |
| male trainer | obs_subject_002 |
| purple glasses | obs_human_appearance_005, obs_human_appearance_006 |
| business suit | obs_clothing_001, obs_clothing_004 |
| green plants | obs_objects_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| arms crossed behind back | obs_subject_002 | deterministic_rule | 0.99 |
| centered composition | obs_subject_002 | deterministic_rule | 0.92 |
| female standing hands on hips | obs_pose_001 | deterministic_rule | 0.98 |
| forward-left orientation | obs_subject_001 | deterministic_rule | 0.99 |
| green plants | obs_objects_001 | deterministic_rule | 0.92 |
| hands on hips | obs_subject_001 | deterministic_rule | 0.99 |
| male standing arms crossed behind back | obs_pose_002 | deterministic_rule | 0.97 |
| plant | obs_objects_001 | deterministic_rule | 0.92 |
| right orientation | obs_subject_002 | deterministic_rule | 0.99 |
| standing | obs_pose_001, obs_pose_002, obs_subject_001, obs_subject_002 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Rust Syndicate Grunt female front left, Rust Syndicate Grunt male back right. Semantic facts: female standing hands on hips, male standing arms crossed behind back, green plants.
- Quality flags: `low_resolution`, `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human figure front left",
      "normalized_label": "female human figure front left",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_002",
      "kind": "scene_subject",
      "label": "male human figure back right",
      "normalized_label": "male human figure back right",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_001",
      "kind": "human_appearance",
      "label": "female hair blond, wavy",
      "normalized_label": "female hair blond wavy",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_002",
      "kind": "human_appearance",
      "label": "male hair black, flat top",
      "normalized_label": "male hair black flat top",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_003",
      "kind": "human_appearance",
      "label": "female skin tone light",
      "normalized_label": "female skin tone light",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_004",
      "kind": "human_appearance",
      "label": "male skin tone dark",
      "normalized_label": "male skin tone dark",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_005",
      "kind": "human_appearance",
      "label": "female eyes visible with purple glasses",
      "normalized_label": "female eyes visible purple glasses",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_006",
      "kind": "human_appearance",
      "label": "male eyes visible with purple glasses",
      "normalized_label": "male eyes visible purple glasses",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "female wearing dark gray business suit jacket with a purple geometric pattern pocket square",
      "normalized_label": "female dark gray business suit jacket purple geometric pocket square",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "female wearing white shirt with blue diamond pattern",
      "normalized_label": "female white shirt blue diamond pattern",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "clothing",
      "label": "female polished purple nails visible",
      "normalized_label": "female polished purple nails",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_004",
      "kind": "clothing",
      "label": "male wearing dark gray suit jacket",
      "normalized_label": "male dark gray suit jacket",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_005",
      "kind": "clothing",
      "label": "male wearing white shirt with purple striped tie",
      "normalized_label": "male white shirt purple striped tie",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "human_appearance",
      "label": "female standing with hands on hips",
      "normalized_label": "standing hands on hips",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_002",
      "kind": "human_appearance",
      "label": "male standing arms crossed behind back",
      "normalized_label": "standing arms crossed behind back",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "green leafy plants grouped at bottom left corner",
      "normalized_label": "green leafy plants",
      "scene_layer": "background",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.92,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "subjects[0]",
      "claim": "There are two human trainer subjects",
      "value": "2",
      "supporting_observation_ids": [
        "obs_subject_001",
        "obs_subject_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "Female has blond wavy hair",
      "value": "blond wavy",
      "supporting_observation_ids": [
        "obs_human_appearance_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "hair[1]",
      "claim": "Male has black flat top hair",
      "value": "black flat top",
      "supporting_observation_ids": [
        "obs_human_appearance_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "skin[0]",
      "claim": "Female has light skin tone",
      "value": "light",
      "supporting_observation_ids": [
        "obs_human_appearance_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "human_appearance",
      "field_path": "skin[1]",
      "claim": "Male has dark skin tone",
      "value": "dark",
      "supporting_observation_ids": [
        "obs_human_appearance_004"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "glasses[0]",
      "claim": "Female wears purple tinted glasses",
      "value": "purple tinted glasses",
      "supporting_observation_ids": [
        "obs_human_appearance_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "glasses[1]",
      "claim": "Male wears purple tinted glasses",
      "value": "purple tinted glasses",
      "supporting_observation_ids": [
        "obs_human_appearance_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "Female wears dark gray business suit jacket with purple geometric pattern pocket square",
      "value": "dark gray suit jacket with purple geometric pocket square",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "Female wears white shirt with blue diamond pattern",
      "value": "white shirt with blue diamond pattern",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "clothing",
      "field_path": "nail_polish[0]",
      "claim": "Female has polished purple fingernails",
      "value": "purple polished nails",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "clothing",
      "field_path": "garments[2]",
      "claim": "Male wears dark gray suit jacket",
      "value": "dark gray suit jacket",
      "supporting_observation_ids": [
        "obs_clothing_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "clothing",
      "field_path": "garments[3]",
      "claim": "Male wears white shirt with purple striped tie",
      "value": "white shirt purple striped tie",
      "supporting_observation_ids": [
        "obs_clothing_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "human_appearance",
      "field_path": "pose[0]",
      "claim": "Female is standing with hands on hips",
      "value": "standing hands on hips",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "human_appearance",
      "field_path": "pose[1]",
      "claim": "Male is standing with arms crossed behind back",
      "value": "standing arms crossed behind back",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "objects_and_props",
      "field_path": "plants[0]",
      "claim": "Grouped green leafy plants in background bottom left",
      "value": "green leafy plants",
      "supporting_observation_ids": [
        "obs_objects_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Rust Syndicate Grunt female front left",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "hands",
        "head",
        "torso"
      ],
      "physical_features": [
        "blond wavy hair",
        "light skin"
      ],
      "pose": [
        "hands on hips",
        "standing"
      ],
      "orientation": "forward-left",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "closed smile",
        "eyebrows": "neutral",
        "face_position": "visible",
        "other_visible_evidence": [
          "wearing purple tinted glasses"
        ]
      },
      "clothing_or_accessories": [
        "dark gray business suit jacket",
        "purple geometric pattern pocket square",
        "purple polished nails",
        "white shirt with blue diamond pattern"
      ],
      "colors": [
        "blond",
        "blue",
        "dark gray",
        "light skin",
        "purple",
        "white"
      ],
      "visibility": "visible"
    },
    {
      "observation_id": "obs_subject_002",
      "subject_kind": "scene_subject",
      "identity": "Rust Syndicate Grunt male back right",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "head",
        "torso"
      ],
      "physical_features": [
        "black flat top hair",
        "dark skin"
      ],
      "pose": [
        "arms crossed behind back",
        "standing"
      ],
      "orientation": "right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "visible",
        "other_visible_evidence": [
          "wearing purple tinted glasses"
        ]
      },
      "clothing_or_accessories": [
        "dark gray suit jacket",
        "purple striped tie",
        "white shirt"
      ],
      "colors": [
        "black",
        "dark gray",
        "dark skin",
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
      "obs_subject_001",
      "obs_subject_002"
    ],
    "midground": [],
    "background": [
      "obs_objects_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor or shaded outdoor"
    ],
    "indoor_outdoor": "cannot_determine",
    "sky": [],
    "ground": [
      "floor or flat ground behind"
    ],
    "terrain": [],
    "plants": [
      "green leafy plants"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_objects_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "green leafy plants",
      "normalized_label": "plants",
      "object_type": "plant",
      "colors": [
        "green"
      ],
      "material_appearance": [],
      "location": "bottom left background",
      "count_reference": "count_plants_001",
      "confidence": 0.92
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blond",
      "blue",
      "dark gray",
      "green",
      "purple",
      "white"
    ],
    "lighting": [
      "soft diffuse lighting"
    ],
    "shadows": [
      "soft shadows from light source"
    ],
    "highlights": [
      "subtle highlights on hair and suit"
    ],
    "composition": [
      "central composition with two figures back-to-back, slightly turned torsos"
    ],
    "camera_angle": "eye level frontal angled",
    "framing": "tight framing on upper body and heads",
    "cropping": [
      "full upper body visible"
    ],
    "depth": "visible depth between foreground figures and background plants",
    "motion_cues": [],
    "motifs": [
      "geometric pattern on pocket square and shirt"
    ],
    "repeated_shapes": [
      "diamond pattern"
    ],
    "style_cues": [
      "illustrated"
    ],
    "supporting_observation_ids": [
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_objects_001",
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
        "obs_subject_001",
        "obs_subject_002"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_013",
        "fact_014"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "blond wavy hair",
            "light skin",
            "purple tinted glasses"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_001",
            "obs_human_appearance_003",
            "obs_human_appearance_005"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_002",
          "region": "face",
          "visibility": "visible",
          "details": [
            "black flat top hair",
            "dark skin",
            "purple tinted glasses"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_002",
            "obs_human_appearance_004",
            "obs_human_appearance_006"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "visibility": "visible",
          "details": [
            "polished purple nails"
          ],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.93
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "visible",
          "eyes": "visible",
          "mouth": "closed smile",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "purple tinted glasses"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_005"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "face_position": "visible",
          "eyes": "visible",
          "mouth": "neutral",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "purple tinted glasses"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_006"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blond wavy hair",
          "details": [],
          "supporting_observation_ids": [
            "obs_human_appearance_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_002",
          "label": "black flat top hair",
          "details": [],
          "supporting_observation_ids": [
            "obs_human_appearance_002"
          ],
          "confidence": 0.99
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "hands on hips",
          "details": [
            "standing"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_002",
          "label": "arms crossed behind back",
          "details": [
            "standing"
          ],
          "supporting_observation_ids": [
            "obs_pose_002"
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
        "fact_008",
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper body",
          "garment": "dark gray business suit jacket with purple geometric pattern pocket square",
          "neckline_type": "collar",
          "sleeve_type": "long sleeves",
          "colors": [
            "dark gray",
            "purple"
          ],
          "visible_details": [
            "pocket square purple geometric pattern"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper chest",
          "garment": "white shirt with blue diamond pattern",
          "neckline_type": "collar",
          "sleeve_type": "not visible",
          "colors": [
            "blue",
            "white"
          ],
          "visible_details": [
            "diamond pattern"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "hands",
          "garment": "polished purple fingernails",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "purple"
          ],
          "visible_details": [
            "polished nails"
          ],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.93
        },
        {
          "subject_observation_id": "obs_subject_002",
          "body_area": "upper body",
          "garment": "dark gray suit jacket",
          "neckline_type": "collar",
          "sleeve_type": "long sleeves",
          "colors": [
            "dark gray"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_004"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_002",
          "body_area": "upper chest",
          "garment": "white shirt with purple striped tie",
          "neckline_type": "collar",
          "sleeve_type": "not visible",
          "colors": [
            "purple",
            "white"
          ],
          "visible_details": [
            "striped tie"
          ],
          "supporting_observation_ids": [
            "obs_clothing_005"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_015"
      ],
      "object_observation_ids": [
        "obs_objects_001"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": [
        "obs_objects_001"
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
        "obs_objects_001",
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
        "female trainer",
        "male trainer",
        "purple glasses",
        "business suit",
        "green plants"
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
      "omission_risk": "low",
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "card_ui_and_print_markers.name_text_observation_ids",
          "reason": "name text OCR unclear due to low resolution",
          "affected_observation_ids": []
        },
        {
          "field_path": "card_ui_and_print_markers.collector_number_observation_ids",
          "reason": "collector number partially unclear due to low resolution",
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
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_001",
      "category": "state",
      "label": "female standing hands on hips",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [
          "closed smile"
        ],
        "eyes": [
          "visible"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "wearing purple tinted glasses"
        ],
        "body_language": [
          "hands on hips"
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
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_002",
      "category": "state",
      "label": "male standing arms crossed behind back",
      "subject_observation_id": "obs_subject_002",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "evidence": {
        "mouth": [
          "neutral"
        ],
        "eyes": [
          "visible"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "wearing purple tinted glasses"
        ],
        "body_language": [
          "arms crossed behind back"
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
      "confidence": 0.97,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_003",
      "category": "environment",
      "label": "green plants",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_objects_001"
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
          "green leafy plants"
        ],
        "objects": [
          "plants"
        ],
        "relationships": [],
        "other": []
      },
      "confidence": 0.92,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
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
      "term": "purple glasses",
      "supporting_observation_ids": [
        "obs_human_appearance_005",
        "obs_human_appearance_006"
      ]
    },
    {
      "term": "business suit",
      "supporting_observation_ids": [
        "obs_clothing_001",
        "obs_clothing_004"
      ]
    },
    {
      "term": "green plants",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "arms crossed behind back",
        "source_observation_ids": [
          "obs_subject_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_subject_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "female standing hands on hips",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "forward-left orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "green plants",
        "source_observation_ids": [
          "obs_objects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "hands on hips",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "male standing arms crossed behind back",
        "source_observation_ids": [
          "obs_pose_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_objects_001"
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
        "concept": "standing",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_pose_002",
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
- Description confidence: `0.96`
- Attribute confidence: `0.96`
- Cost USD: `0.0126732`
- Artwork observations: `19`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female human character. Visible observations: female human character, face visible, skin arms visible, skin midriff visible, legs visible, hands visible, eyes winking visible, mouth smiling open. Semantic facts: winking, smiling, arm extended with fingers spread, arm bent with fist clenched, indoor environment.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human character | female human character | scene_subject | foreground | high | 0.99 |
| face visible | face visible | human_appearance_part | foreground | high | 0.99 |
| skin arms visible | skin arms visible | human_appearance_part | foreground | high | 0.99 |
| skin midriff visible | skin midriff visible | human_appearance_part | foreground | high | 0.99 |
| legs visible | legs visible | human_appearance_part | foreground | high | 0.99 |
| hands visible | hands visible | human_appearance_part | foreground | high | 0.99 |
| eyes visible with one open and one closed (winking) | eyes winking visible | human_appearance_part | foreground | high | 0.98 |
| mouth open, smiling | mouth smiling open | human_appearance_part | foreground | high | 0.98 |
| orange hair tied in a ponytail with black hairband | orange hair ponytail black hairband | hair | foreground | high | 0.99 |
| blue sleeveless crop top | blue sleeveless crop top | clothing | foreground | high | 0.99 |
| blue shorts | blue shorts | clothing | foreground | high | 0.99 |
| black wristbands on both wrists | black wristbands | clothing_accessory | foreground | medium | 0.98 |
| arm extended outward with fingers spread | arm extended fingers spread | pose | foreground | high | 0.98 |
| other arm bent with fist clenched | arm bent fist clenched | pose | foreground | high | 0.98 |
| indoor setting | indoor | environment | background | medium | 0.99 |
| blue tiled floor | blue tiled floor | environment | background | medium | 0.98 |
| large windows with sky and fluffy clouds | large windows sky clouds | environment | background | medium | 0.98 |
| green potted plant with long leaves | green potted plant | objects_and_props | background | medium | 0.98 |
| metal chair with blue seat | metal chair blue seat | objects_and_props | background | medium | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | face visible | obs_human_appearance_001 | 0.99 |
| fact_003 | human_appearance | skin arms visible | obs_human_appearance_002 | 0.99 |
| fact_004 | human_appearance | skin midriff visible | obs_human_appearance_003 | 0.99 |
| fact_005 | human_appearance | legs visible | obs_human_appearance_004 | 0.99 |
| fact_006 | human_appearance | hands visible | obs_human_appearance_005 | 0.99 |
| fact_007 | human_appearance | eye expression | obs_human_appearance_006 | 0.98 |
| fact_008 | human_appearance | mouth expression | obs_human_appearance_007 | 0.98 |
| fact_009 | human_appearance | hair style and color | obs_human_appearance_008 | 0.99 |
| fact_010 | clothing | garment upper body | obs_clothing_001 | 0.99 |
| fact_011 | clothing | garment lower body | obs_clothing_002 | 0.99 |
| fact_012 | clothing | accessory wristbands | obs_clothing_003 | 0.98 |
| fact_013 | human_appearance | pose right arm extended fingers spread | obs_posture_001 | 0.98 |
| fact_014 | human_appearance | pose left arm bent fist clenched | obs_posture_002 | 0.98 |
| fact_015 | environment | indoor environment | obs_environment_001 | 0.99 |
| fact_016 | environment | floor type | obs_environment_002 | 0.98 |
| fact_017 | environment | presence of large windows | obs_environment_003 | 0.98 |
| fact_018 | objects_and_props | green potted plant | obs_environment_004 | 0.98 |
| fact_019 | objects_and_props | metal chair with blue seat | obs_environment_005 | 0.98 |

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
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | card_ui_and_print_markers.name_text_observation_ids: visible but partly illegible text area analysis not possible |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | expression | winking | obs_subject_001 | obs_human_appearance_006 | one eye closed one eye open | 0.98 |
| sem_fact_002 | expression | smiling | obs_subject_001 | obs_human_appearance_007 | open smiling | 0.98 |
| sem_fact_003 | action | arm extended with fingers spread | obs_subject_001 | obs_posture_001 | right arm extended outward fingers spread | 0.98 |
| sem_fact_004 | action | arm bent with fist clenched | obs_subject_001 | obs_posture_002 | left arm bent fist clenched | 0.98 |
| sem_fact_005 | environment | indoor environment |  | obs_environment_001 | indoor | 0.99 |

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
| female human trainer | obs_subject_001 |
| blue sports outfit | obs_clothing_001, obs_clothing_002 |
| orange ponytail hair | obs_human_appearance_008 |
| indoor setting | obs_environment_001, obs_environment_003 |
| green potted plant | obs_environment_004 |
| metal chair | obs_environment_005 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| arm bent with fist clenched | obs_posture_002 | deterministic_rule | 0.98 |
| arm extended with fingers spread | obs_posture_001 | deterministic_rule | 0.98 |
| centered composition | obs_subject_001 | deterministic_rule | 0.92 |
| cloud | obs_environment_003 | deterministic_rule | 0.98 |
| frontal orientation | obs_subject_001 | deterministic_rule | 0.99 |
| indoor environment | obs_environment_001 | deterministic_rule | 0.99 |
| left arm bent fist clenched | obs_subject_001 | deterministic_rule | 0.99 |
| plant | obs_environment_004 | deterministic_rule | 0.98 |
| reaching | obs_posture_001, obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_003 | deterministic_rule | 0.98 |
| sleeveless clothing | obs_clothing_001 | deterministic_rule | 0.99 |
| smiling | obs_human_appearance_007 | deterministic_rule | 0.98 |
| window | obs_environment_003, obs_subject_001 | deterministic_rule | 0.98 |
| winking | obs_human_appearance_006 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human character. Visible observations: female human character, face visible, skin arms visible, skin midriff visible, legs visible, hands visible, eyes winking visible, mouth smiling open. Semantic facts: winking, smiling, arm extended with fingers spread, arm bent with fist clenched, indoor environment.
- Quality flags: `potential_module_incomplete_or_low_evidence`
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
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_001",
      "kind": "human_appearance_part",
      "label": "face visible",
      "normalized_label": "face visible",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_002",
      "kind": "human_appearance_part",
      "label": "skin arms visible",
      "normalized_label": "skin arms visible",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_003",
      "kind": "human_appearance_part",
      "label": "skin midriff visible",
      "normalized_label": "skin midriff visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_004",
      "kind": "human_appearance_part",
      "label": "legs visible",
      "normalized_label": "legs visible",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_005",
      "kind": "human_appearance_part",
      "label": "hands visible",
      "normalized_label": "hands visible",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_006",
      "kind": "human_appearance_part",
      "label": "eyes visible with one open and one closed (winking)",
      "normalized_label": "eyes winking visible",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_007",
      "kind": "human_appearance_part",
      "label": "mouth open, smiling",
      "normalized_label": "mouth smiling open",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_008",
      "kind": "hair",
      "label": "orange hair tied in a ponytail with black hairband",
      "normalized_label": "orange hair ponytail black hairband",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue sleeveless crop top",
      "normalized_label": "blue sleeveless crop top",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "blue shorts",
      "normalized_label": "blue shorts",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "clothing_accessory",
      "label": "black wristbands on both wrists",
      "normalized_label": "black wristbands",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_posture_001",
      "kind": "pose",
      "label": "arm extended outward with fingers spread",
      "normalized_label": "arm extended fingers spread",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_posture_002",
      "kind": "pose",
      "label": "other arm bent with fist clenched",
      "normalized_label": "arm bent fist clenched",
      "scene_layer": "foreground",
      "frame_position": "left_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor setting",
      "normalized_label": "indoor",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "blue tiled floor",
      "normalized_label": "blue tiled floor",
      "scene_layer": "background",
      "frame_position": "lower_background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "large windows with sky and fluffy clouds",
      "normalized_label": "large windows sky clouds",
      "scene_layer": "background",
      "frame_position": "upper_background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "objects_and_props",
      "label": "green potted plant with long leaves",
      "normalized_label": "green potted plant",
      "scene_layer": "background",
      "frame_position": "left_background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_005",
      "kind": "objects_and_props",
      "label": "metal chair with blue seat",
      "normalized_label": "metal chair blue seat",
      "scene_layer": "background",
      "frame_position": "center_background",
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
      "field_path": "[].identity",
      "claim": "subject identity",
      "value": "female human character",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "face visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_human_appearance_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "skin arms visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_human_appearance_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "skin midriff visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_human_appearance_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "legs visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_human_appearance_004"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "hands visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_human_appearance_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "eye expression",
      "value": "winking one eye closed one eye open",
      "supporting_observation_ids": [
        "obs_human_appearance_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "human_appearance",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth expression",
      "value": "open smiling",
      "supporting_observation_ids": [
        "obs_human_appearance_007"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "human_appearance",
      "field_path": "hair",
      "claim": "hair style and color",
      "value": "orange ponytail with black hairband",
      "supporting_observation_ids": [
        "obs_human_appearance_008"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "clothing",
      "field_path": "garments",
      "claim": "garment upper body",
      "value": "blue sleeveless crop top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "clothing",
      "field_path": "garments",
      "claim": "garment lower body",
      "value": "blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "clothing",
      "field_path": "accessories",
      "claim": "accessory wristbands",
      "value": "black wristbands on both wrists",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "human_appearance",
      "field_path": "pose_orientation",
      "claim": "pose right arm extended fingers spread",
      "value": "true",
      "supporting_observation_ids": [
        "obs_posture_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "human_appearance",
      "field_path": "pose_orientation",
      "claim": "pose left arm bent fist clenched",
      "value": "true",
      "supporting_observation_ids": [
        "obs_posture_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "environment",
      "field_path": "indoor_outdoor",
      "claim": "indoor environment",
      "value": "indoor",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "environment",
      "field_path": "ground",
      "claim": "floor type",
      "value": "blue tiled floor",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "environment",
      "field_path": "architecture",
      "claim": "presence of large windows",
      "value": "true with visible sky and clouds",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_018",
      "module": "objects_and_props",
      "field_path": "objects",
      "claim": "green potted plant",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_environment_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_019",
      "module": "objects_and_props",
      "field_path": "objects",
      "claim": "metal chair with blue seat",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_environment_005"
      ],
      "confidence": 0.98,
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
        "hands",
        "legs",
        "midriff"
      ],
      "physical_features": [
        "orange hair ponytail with black hairband"
      ],
      "pose": [
        "left arm bent fist clenched",
        "reaching"
      ],
      "orientation": "frontal",
      "action_state": [
        "smiling mouth open",
        "winking eye"
      ],
      "facial_evidence": {
        "eyes": "one open one closed (winking)",
        "mouth": "open smiling",
        "eyebrows": "not distinctly visible",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristbands",
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
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_human_appearance_001",
      "obs_human_appearance_002",
      "obs_human_appearance_003",
      "obs_human_appearance_004",
      "obs_human_appearance_005",
      "obs_human_appearance_006",
      "obs_human_appearance_007",
      "obs_human_appearance_008",
      "obs_posture_001",
      "obs_posture_002",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [
      "blue sky",
      "white clouds"
    ],
    "ground": [
      "blue tiled floor"
    ],
    "terrain": [],
    "plants": [
      "green potted plant"
    ],
    "architecture": [
      "large windows"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_environment_004",
      "label": "green potted plant",
      "normalized_label": "green potted plant",
      "object_type": "plant",
      "colors": [
        "green"
      ],
      "material_appearance": [],
      "location": "background left",
      "count_reference": "",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_environment_005",
      "label": "metal chair with blue seat",
      "normalized_label": "metal chair blue seat",
      "object_type": "furniture",
      "colors": [
        "blue",
        "gray"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "background center",
      "count_reference": "",
      "confidence": 0.98
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
      "bright even lighting, no visible shadows"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "central human subject framed by bright windows"
    ],
    "camera_angle": "eye-level frontal",
    "framing": "tight medium shot",
    "cropping": [
      "full upper body"
    ],
    "depth": "medium depth with background elements visible",
    "motion_cues": [
      "outstretched arm with fingers spread"
    ],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [
      "bright and clear colors"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
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
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_008",
        "fact_009",
        "fact_013",
        "fact_014"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "eyes one open one closed (winking)",
            "mouth open smiling"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_001",
            "obs_human_appearance_006",
            "obs_human_appearance_007"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "visibility": "visible",
          "details": [
            "skin exposed"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_002"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "midriff",
          "visibility": "visible",
          "details": [
            "skin exposed"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_003"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "legs",
          "visibility": "visible",
          "details": [
            "skin exposed"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_004"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "visibility": "visible",
          "details": [
            "visible fingers"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_005"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "winking",
          "mouth": "open smiling",
          "eyebrows": "not distinctly visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_human_appearance_006",
            "obs_human_appearance_007"
          ],
          "confidence": 0.98
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange hair tied in ponytail with black hairband",
          "details": [
            "bright orange color",
            "ponytail tied to right side"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_008"
          ],
          "confidence": 0.99
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right arm extended outward fingers spread",
          "details": [
            "fingers splayed",
            "open right hand"
          ],
          "supporting_observation_ids": [
            "obs_posture_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "left arm bent with fist clenched",
          "details": [
            "fist close to body"
          ],
          "supporting_observation_ids": [
            "obs_posture_002"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands on both wrists",
          "details": [
            "smooth black wristbands made of fabric or similar"
          ],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.98
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
        "fact_010",
        "fact_011",
        "fact_012"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper body",
          "garment": "blue sleeveless crop top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "fitted garment",
            "smooth surface"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
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
          "visible_details": [
            "fitted shorts"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands",
          "details": [
            "on both wrists"
          ],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.98
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_018",
        "fact_019"
      ],
      "object_observation_ids": [
        "obs_environment_004",
        "obs_environment_005"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_015",
        "fact_016",
        "fact_017"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004",
        "obs_environment_005"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_003",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002",
        "obs_environment_003",
        "obs_subject_001"
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
        "female human trainer",
        "blue sports outfit",
        "orange ponytail hair",
        "indoor setting",
        "green potted plant",
        "metal chair"
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
          "field_path": "card_ui_and_print_markers.name_text_observation_ids",
          "reason": "visible but partly illegible text area analysis not possible",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "expression",
      "label": "winking",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_human_appearance_006"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "one eye closed",
          "one eye open"
        ],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
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
      "semantic_fact_id": "sem_fact_002",
      "category": "expression",
      "label": "smiling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_human_appearance_007"
      ],
      "evidence": {
        "mouth": [
          "open smiling"
        ],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
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
      "semantic_fact_id": "sem_fact_003",
      "category": "action",
      "label": "arm extended with fingers spread",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_posture_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "right arm extended outward fingers spread"
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
      "semantic_fact_id": "sem_fact_004",
      "category": "action",
      "label": "arm bent with fist clenched",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_posture_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "left arm bent fist clenched"
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
      "semantic_fact_id": "sem_fact_005",
      "category": "environment",
      "label": "indoor environment",
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
          "indoor"
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
      "term": "female human trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "blue sports outfit",
      "supporting_observation_ids": [
        "obs_clothing_001",
        "obs_clothing_002"
      ]
    },
    {
      "term": "orange ponytail hair",
      "supporting_observation_ids": [
        "obs_human_appearance_008"
      ]
    },
    {
      "term": "indoor setting",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_003"
      ]
    },
    {
      "term": "green potted plant",
      "supporting_observation_ids": [
        "obs_environment_004"
      ]
    },
    {
      "term": "metal chair",
      "supporting_observation_ids": [
        "obs_environment_005"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "arm bent with fist clenched",
        "source_observation_ids": [
          "obs_posture_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "arm extended with fingers spread",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
        "concept": "indoor environment",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left arm bent fist clenched",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_environment_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_posture_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
          "obs_human_appearance_007"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_environment_003",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "winking",
        "source_observation_ids": [
          "obs_human_appearance_006"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
- Attribute confidence: `0.96`
- Cost USD: `0.00597`
- Artwork observations: `6`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Semantic facts: aurora, lightning. Counts: lightning bolts: many.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| sky visible in artwork | sky | environment_sky | background | salient | 1 |
| colorful aurora-like light bands in sky | aurora | environment_atmospheric_light | background | salient | 1 |
| several lightning bolts striking ground | lightning | environment_lightning | background | salient | 1 |
| silhouettes of leafless trees on right side | leafless trees | environment_plants | background | moderate | 1 |
| mountains in background | mountain terrain | environment_terrain | background | moderate | 1 |
| dark flat ground in foreground | ground | environment_ground | foreground | moderate | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_aurora_lights_001 | environment | aurora-like light bands present in sky | obs_northern_lights_001 | 1 |
| fact_env_lightning_bolts_001 | environment | visible lightning bolts striking ground | obs_lightning_001 | 1 |
| fact_env_trees_001 | environment | leafless trees visible on right side | obs_trees_001 | 1 |
| fact_env_mountains_001 | environment | mountain terrain visible | obs_mountains_001 | 1 |
| fact_env_ground_001 | environment | dark flat ground present in foreground | obs_ground_001 | 1 |

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
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | environment | aurora |  | obs_northern_lights_001 | aurora | 1 |
| sem_fact_002 | environment | lightning |  | obs_lightning_001 | lightning | 1 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| lightning bolts | many | many | obs_lightning_001 | 1 |

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
| aurora | obs_northern_lights_001 |
| lightning | obs_lightning_001 |
| leafless trees | obs_trees_001 |
| mountain terrain | obs_mountains_001 |
| ground | obs_ground_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora | obs_northern_lights_001 | deterministic_rule | 1 |
| aurora-like light bands | obs_northern_lights_001 | deterministic_rule | 1 |
| lightning | obs_lightning_001 | deterministic_rule | 1 |
| plant | obs_trees_001 | deterministic_rule | 1 |
| sky | obs_sky_001 | deterministic_rule | 1 |
| terrain | obs_ground_001, obs_mountains_001 | deterministic_rule | 1 |
| tree | obs_trees_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Semantic facts: aurora, lightning. Counts: lightning bolts: many.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "environment_sky",
      "label": "sky visible in artwork",
      "normalized_label": "sky",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_northern_lights_001",
      "kind": "environment_atmospheric_light",
      "label": "colorful aurora-like light bands in sky",
      "normalized_label": "aurora",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_001",
      "kind": "environment_lightning",
      "label": "several lightning bolts striking ground",
      "normalized_label": "lightning",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "environment_plants",
      "label": "silhouettes of leafless trees on right side",
      "normalized_label": "leafless trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mountains_001",
      "kind": "environment_terrain",
      "label": "mountains in background",
      "normalized_label": "mountain terrain",
      "scene_layer": "background",
      "frame_position": "midground",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ground_001",
      "kind": "environment_ground",
      "label": "dark flat ground in foreground",
      "normalized_label": "ground",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_aurora_lights_001",
      "module": "environment",
      "field_path": "atmospheric_light",
      "claim": "aurora-like light bands present in sky",
      "value": "true",
      "supporting_observation_ids": [
        "obs_northern_lights_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_lightning_bolts_001",
      "module": "environment",
      "field_path": "weather",
      "claim": "visible lightning bolts striking ground",
      "value": "true",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_trees_001",
      "module": "environment",
      "field_path": "plants",
      "claim": "leafless trees visible on right side",
      "value": "true",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_mountains_001",
      "module": "environment",
      "field_path": "terrain",
      "claim": "mountain terrain visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_mountains_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_ground_001",
      "module": "environment",
      "field_path": "ground",
      "claim": "dark flat ground present in foreground",
      "value": "true",
      "supporting_observation_ids": [
        "obs_ground_001"
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
      "count_id": "count_lightning_001",
      "normalized_label": "lightning bolts",
      "count_type": "many",
      "exact_count": 0,
      "estimated_min": 3,
      "estimated_max": 5,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ],
      "scene_layer": "background",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_ground_001"
    ],
    "midground": [
      "obs_mountains_001"
    ],
    "background": [
      "obs_lightning_001",
      "obs_northern_lights_001",
      "obs_sky_001",
      "obs_trees_001"
    ]
  },
  "environment": {
    "setting": [
      "stormy environment"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "aurora",
      "lightning",
      "stormy sky"
    ],
    "ground": [
      "flat dark ground"
    ],
    "terrain": [
      "mountains"
    ],
    "plants": [
      "leafless trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [
      "lightning"
    ],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_ground_001",
      "obs_lightning_001",
      "obs_mountains_001",
      "obs_northern_lights_001",
      "obs_sky_001",
      "obs_trees_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark blue",
      "green",
      "red",
      "white"
    ],
    "lighting": [
      "dramatic lighting with bright lightning"
    ],
    "shadows": [
      "dark shadows in foreground"
    ],
    "highlights": [
      "bright white lightning highlights"
    ],
    "composition": [
      "aurora bands framing scene",
      "central lightning strikes"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing on environment scene",
    "cropping": [
      "full scene visible"
    ],
    "depth": "deep with distinct foreground middle and background",
    "motion_cues": [],
    "motifs": [
      "storm",
      "storm environment"
    ],
    "repeated_shapes": [
      "zigzag lightning bolts"
    ],
    "style_cues": [
      "natural phenomena depiction",
      "high contrast colors"
    ],
    "supporting_observation_ids": [
      "obs_ground_001",
      "obs_lightning_001",
      "obs_mountains_001",
      "obs_northern_lights_001",
      "obs_sky_001",
      "obs_trees_001"
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
    "surface_and_scan_cues_review": "not_applicable"
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
        "fact_env_aurora_lights_001",
        "fact_env_ground_001",
        "fact_env_lightning_bolts_001",
        "fact_env_mountains_001",
        "fact_env_trees_001"
      ],
      "observation_ids": [
        "obs_ground_001",
        "obs_lightning_001",
        "obs_mountains_001",
        "obs_northern_lights_001",
        "obs_sky_001",
        "obs_trees_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_ground_001",
        "obs_lightning_001",
        "obs_mountains_001",
        "obs_northern_lights_001",
        "obs_sky_001",
        "obs_trees_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_ground_001",
        "obs_lightning_001",
        "obs_mountains_001",
        "obs_northern_lights_001",
        "obs_sky_001",
        "obs_trees_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_lightning_001",
        "obs_northern_lights_001"
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
        "count_lightning_001"
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
        "aurora",
        "lightning",
        "leafless trees",
        "mountain terrain",
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
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "environment",
      "label": "aurora",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_northern_lights_001"
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
          "aurora"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "environment",
      "label": "lightning",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_lightning_001"
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
      "confidence": 1,
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
      "term": "aurora",
      "supporting_observation_ids": [
        "obs_northern_lights_001"
      ]
    },
    {
      "term": "lightning",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ]
    },
    {
      "term": "leafless trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "mountain terrain",
      "supporting_observation_ids": [
        "obs_mountains_001"
      ]
    },
    {
      "term": "ground",
      "supporting_observation_ids": [
        "obs_ground_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora",
        "source_observation_ids": [
          "obs_northern_lights_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_northern_lights_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_lightning_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_ground_001",
          "obs_mountains_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0081552`
- Artwork observations: `9`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium structure, running track, traffic cone, barrier fence, tree, sign board, water, steps. Semantic facts: stadium, trees, water body, blue sky, six traffic cones. Counts: traffic cone: 6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium structure | stadium structure | environment | midground | high | 0.99 |
| running track | running track | object | midground | high | 0.98 |
| traffic cones | traffic cone | object | foreground | medium | 0.95 |
| barrier fence | barrier fence | object | foreground | medium | 0.95 |
| trees | tree | environment | background | medium | 0.96 |
| round sign with green leaf symbol | sign board | object | midground | medium | 0.95 |
| blue sky with some clouds | sky | environment | background | low | 0.96 |
| water body | water | environment | background | medium | 0.95 |
| wooden steps | steps | object | midground | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_env_stadium_001 | 0.99 |
| fact_env_002 | environment | object visible | obs_obj_track_001 | 0.98 |
| fact_env_003 | environment | objects visible | obs_obj_cones_001 | 0.95 |
| fact_env_004 | environment | objects visible | obs_obj_fence_001 | 0.95 |
| fact_env_005 | environment | trees present | obs_env_trees_001 | 0.96 |
| fact_env_006 | environment | sky visible with blue and clouds | obs_env_sky_001 | 0.96 |
| fact_env_007 | environment | water body visible | obs_env_water_001 | 0.95 |
| fact_env_008 | environment | wooden steps visible | obs_obj_steps_001 | 0.95 |
| fact_env_009 | objects_and_props | round sign with green leaf symbol | obs_obj_sign_001 | 0.95 |

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
| composition | none_visible | none | high |  |
| color_and_light | none_visible | none | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | complete | low | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | scene_type | stadium |  | obs_env_stadium_001 | stadium structure barrier fence round sign running track traffic cones running track within stadium | 0.99 |
| sem_fact_002 | environment | trees |  | obs_env_trees_001 | trees | 0.96 |
| sem_fact_003 | environment | water body |  | obs_env_water_001 | water body | 0.95 |
| sem_fact_004 | environment | blue sky |  | obs_env_sky_001 | blue sky with clouds | 0.96 |
| sem_fact_005 | count_semantic | six traffic cones |  | obs_obj_cones_001 | traffic cones | 0.95 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| traffic cone | exact | 6 | obs_obj_cones_001 | 0.95 |

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
| stadium | obs_env_stadium_001 |
| running track | obs_obj_track_001 |
| traffic cones | obs_obj_cones_001 |
| barrier fence | obs_obj_fence_001 |
| trees | obs_env_trees_001 |
| blue sky | obs_env_sky_001 |
| water body | obs_env_water_001 |
| wooden steps | obs_obj_steps_001 |
| green leaf sign | obs_obj_sign_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| blue sky | obs_env_sky_001 | deterministic_rule | 0.96 |
| building | obs_env_stadium_001 | deterministic_rule | 0.99 |
| fence | obs_obj_fence_001 | deterministic_rule | 0.95 |
| running | obs_obj_track_001 | deterministic_rule | 0.98 |
| six traffic cones | obs_obj_cones_001 | deterministic_rule | 0.95 |
| sky | obs_env_sky_001 | deterministic_rule | 0.96 |
| stadium | obs_env_stadium_001 | deterministic_rule | 0.99 |
| stairs | obs_obj_steps_001 | deterministic_rule | 0.95 |
| tree | obs_env_trees_001 | deterministic_rule | 0.96 |
| trees | obs_env_trees_001 | deterministic_rule | 0.96 |
| water body | obs_env_water_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium structure, running track, traffic cone, barrier fence, tree, sign board, water, steps. Semantic facts: stadium, trees, water body, blue sky, six traffic cones. Counts: traffic cone: 6.
- Quality flags: `potential_count_reference_inconsistent`, `semantic_tags_metadata_or_generic_removed`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_env_stadium_001",
      "kind": "environment",
      "label": "stadium structure",
      "normalized_label": "stadium structure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_track_001",
      "kind": "object",
      "label": "running track",
      "normalized_label": "running track",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_cones_001",
      "kind": "object",
      "label": "traffic cones",
      "normalized_label": "traffic cone",
      "scene_layer": "foreground",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_fence_001",
      "kind": "object",
      "label": "barrier fence",
      "normalized_label": "barrier fence",
      "scene_layer": "foreground",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_trees_001",
      "kind": "environment",
      "label": "trees",
      "normalized_label": "tree",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_sign_001",
      "kind": "object",
      "label": "round sign with green leaf symbol",
      "normalized_label": "sign board",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_sky_001",
      "kind": "environment",
      "label": "blue sky with some clouds",
      "normalized_label": "sky",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_water_001",
      "kind": "environment",
      "label": "water body",
      "normalized_label": "water",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_steps_001",
      "kind": "object",
      "label": "wooden steps",
      "normalized_label": "steps",
      "scene_layer": "midground",
      "frame_position": "right",
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
      "field_path": "setting",
      "claim": "setting",
      "value": "stadium structure",
      "supporting_observation_ids": [
        "obs_env_stadium_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "objects_and_props.running_track",
      "claim": "object visible",
      "value": "running track",
      "supporting_observation_ids": [
        "obs_obj_track_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "objects_and_props.traffic_cones",
      "claim": "objects visible",
      "value": "traffic cones",
      "supporting_observation_ids": [
        "obs_obj_cones_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "objects_and_props.barrier_fence",
      "claim": "objects visible",
      "value": "barrier fence",
      "supporting_observation_ids": [
        "obs_obj_fence_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "plants.trees",
      "claim": "trees present",
      "value": "trees",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky visible with blue and clouds",
      "value": "blue sky with clouds",
      "supporting_observation_ids": [
        "obs_env_sky_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "water",
      "claim": "water body visible",
      "value": "water",
      "supporting_observation_ids": [
        "obs_env_water_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "environment",
      "field_path": "objects_and_props.steps",
      "claim": "wooden steps visible",
      "value": "wooden steps",
      "supporting_observation_ids": [
        "obs_obj_steps_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_009",
      "module": "objects_and_props",
      "field_path": "objects_and_props.sign",
      "claim": "round sign with green leaf symbol",
      "value": "sign board",
      "supporting_observation_ids": [
        "obs_obj_sign_001"
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
      "count_id": "count_cones_001",
      "normalized_label": "traffic cone",
      "count_type": "exact",
      "exact_count": 6,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_obj_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_obj_cones_001",
      "obs_obj_fence_001"
    ],
    "midground": [
      "obs_env_stadium_001",
      "obs_obj_sign_001",
      "obs_obj_steps_001",
      "obs_obj_track_001"
    ],
    "background": [
      "obs_env_sky_001",
      "obs_env_trees_001",
      "obs_env_water_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium structure"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky with some clouds"
    ],
    "ground": [
      "running track surface",
      "wooden steps"
    ],
    "terrain": [
      "adjacent water body",
      "stadium athletic track"
    ],
    "plants": [
      "trees"
    ],
    "architecture": [
      "barrier fence",
      "stadium structure"
    ],
    "water": [
      "water body"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_sky_001",
      "obs_env_stadium_001",
      "obs_env_trees_001",
      "obs_env_water_001",
      "obs_obj_cones_001",
      "obs_obj_fence_001",
      "obs_obj_steps_001",
      "obs_obj_track_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_track_001",
      "label": "running track",
      "normalized_label": "running track",
      "object_type": "sports facility",
      "colors": [
        "blue",
        "brown",
        "green",
        "purple"
      ],
      "material_appearance": [
        "painted",
        "smooth"
      ],
      "location": "midground",
      "count_reference": "count_track_001",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_obj_cones_001",
      "label": "traffic cones",
      "normalized_label": "traffic cone",
      "object_type": "safety equipment",
      "colors": [
        "red",
        "white"
      ],
      "material_appearance": [
        "plastic-like appearance"
      ],
      "location": "foreground bottom-left",
      "count_reference": "count_cones_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_obj_fence_001",
      "label": "barrier fence",
      "normalized_label": "barrier fence",
      "object_type": "architecture",
      "colors": [
        "black",
        "brown"
      ],
      "material_appearance": [
        "metal-like appearance",
        "wood-like appearance"
      ],
      "location": "foreground bottom-left",
      "count_reference": "count_fence_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_obj_sign_001",
      "label": "round sign with green leaf symbol",
      "normalized_label": "sign board",
      "object_type": "signage",
      "colors": [
        "green",
        "white"
      ],
      "material_appearance": [
        "metal-like appearance",
        "painted"
      ],
      "location": "midground center",
      "count_reference": "count_sign_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_obj_steps_001",
      "label": "wooden steps",
      "normalized_label": "steps",
      "object_type": "architecture",
      "colors": [
        "brown"
      ],
      "material_appearance": [
        "wood-like appearance"
      ],
      "location": "midground right",
      "count_reference": "count_steps_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "green",
      "purple",
      "red",
      "white"
    ],
    "lighting": [
      "daylight",
      "diffuse natural light"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "moderate highlights on surfaces"
    ],
    "composition": [
      "foreground objects lead viewer eye to stadium structure"
    ],
    "camera_angle": "slightly elevated frontal angle",
    "framing": "stadium centered with foreground focus",
    "cropping": [
      "complete stadium structure",
      "partial right side crop"
    ],
    "depth": "deep depth of field",
    "motion_cues": [],
    "motifs": [
      "running track",
      "sports",
      "stadium"
    ],
    "repeated_shapes": [
      "cones",
      "fence posts"
    ],
    "style_cues": [
      "detailed texture",
      "realistic illustration style"
    ],
    "supporting_observation_ids": [
      "obs_env_sky_001",
      "obs_env_stadium_001",
      "obs_env_trees_001",
      "obs_env_water_001",
      "obs_obj_cones_001",
      "obs_obj_fence_001",
      "obs_obj_sign_001",
      "obs_obj_steps_001",
      "obs_obj_track_001"
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
        "fact_env_009"
      ],
      "object_observation_ids": [
        "obs_obj_cones_001",
        "obs_obj_fence_001",
        "obs_obj_sign_001",
        "obs_obj_steps_001",
        "obs_obj_track_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004",
        "fact_env_005",
        "fact_env_006",
        "fact_env_007",
        "fact_env_008"
      ],
      "observation_ids": [
        "obs_env_sky_001",
        "obs_env_stadium_001",
        "obs_env_trees_001",
        "obs_env_water_001",
        "obs_obj_cones_001",
        "obs_obj_fence_001",
        "obs_obj_steps_001",
        "obs_obj_track_001"
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
        "count_cones_001"
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
        "stadium",
        "running track",
        "traffic cones",
        "barrier fence",
        "trees",
        "blue sky",
        "water body",
        "wooden steps",
        "green leaf sign"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "scene_type",
      "label": "stadium",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_stadium_001"
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
          "stadium structure"
        ],
        "objects": [
          "barrier fence",
          "round sign",
          "running track",
          "traffic cones"
        ],
        "relationships": [
          "running track within stadium"
        ],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "environment",
      "label": "trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_trees_001"
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
      "confidence": 0.96,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_003",
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
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_004",
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
          "blue sky with clouds"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.96,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_005",
      "category": "count_semantic",
      "label": "six traffic cones",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_obj_cones_001"
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
      "confidence": 0.95,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "stadium",
      "supporting_observation_ids": [
        "obs_env_stadium_001"
      ]
    },
    {
      "term": "running track",
      "supporting_observation_ids": [
        "obs_obj_track_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_obj_cones_001"
      ]
    },
    {
      "term": "barrier fence",
      "supporting_observation_ids": [
        "obs_obj_fence_001"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ]
    },
    {
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_env_sky_001"
      ]
    },
    {
      "term": "water body",
      "supporting_observation_ids": [
        "obs_env_water_001"
      ]
    },
    {
      "term": "wooden steps",
      "supporting_observation_ids": [
        "obs_obj_steps_001"
      ]
    },
    {
      "term": "green leaf sign",
      "supporting_observation_ids": [
        "obs_obj_sign_001"
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
        "confidence": 0.96
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_env_stadium_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "fence",
        "source_observation_ids": [
          "obs_obj_fence_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "running",
        "source_observation_ids": [
          "obs_obj_track_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "six traffic cones",
        "source_observation_ids": [
          "obs_obj_cones_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "stadium",
        "source_observation_ids": [
          "obs_env_stadium_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "stairs",
        "source_observation_ids": [
          "obs_obj_steps_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_env_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "trees",
        "source_observation_ids": [
          "obs_env_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "water body",
        "source_observation_ids": [
          "obs_env_water_001"
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
- Description confidence: `1`
- Attribute confidence: `1`
- Cost USD: `0.0067236`
- Artwork observations: `5`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: lava flow, volcano, triangular platform, spiral tail, pokémon center symbol.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| lava flow | lava flow | environment | midground | high | 1 |
| volcano or mountain in background | volcano | environment | background | medium | 1 |
| red triangular platform with black patterns and white border | triangular platform | object | midground | high | 1 |
| black spiral tail hanging from platform | spiral tail | object | midground | medium | 1 |
| Pokémon center symbol on platform | pokémon center symbol | object | midground | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_environment_lava_001 | environment | The scene contains lava flow | obs_environment_001 | 1 |
| fact_environment_volcano_002 | environment | The scene contains a volcano or mountain in the background | obs_environment_002 | 1 |
| fact_objects_platform_001 | objects_and_props | A red triangular platform with black patterns and white border is present | obs_objects_001 | 1 |
| fact_objects_tail_002 | objects_and_props | A black spiral tail is hanging from the red platform | obs_objects_002 | 1 |
| fact_objects_symbol_003 | objects_and_props | A Pokémon center symbol is visible on the platform | obs_objects_003 | 1 |

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
| lava flow | obs_environment_001 |
| volcano | obs_environment_002 |
| triangular platform | obs_objects_001 |
| spiral tail | obs_objects_002 |
| pokémon center symbol | obs_objects_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| spiral motif | obs_objects_002 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: lava flow, volcano, triangular platform, spiral tail, pokémon center symbol.
- Quality flags: `potential_module_review_conflicts_with_entries`, `potential_salient_object_missing_count_reference`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "lava flow",
      "normalized_label": "lava flow",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "volcano or mountain in background",
      "normalized_label": "volcano",
      "scene_layer": "background",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "object",
      "label": "red triangular platform with black patterns and white border",
      "normalized_label": "triangular platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_002",
      "kind": "object",
      "label": "black spiral tail hanging from platform",
      "normalized_label": "spiral tail",
      "scene_layer": "midground",
      "frame_position": "lower right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_003",
      "kind": "object",
      "label": "Pokémon center symbol on platform",
      "normalized_label": "pokémon center symbol",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_environment_lava_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "The scene contains lava flow",
      "value": "lava flow",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_volcano_002",
      "module": "environment",
      "field_path": "setting",
      "claim": "The scene contains a volcano or mountain in the background",
      "value": "volcano or mountain",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_platform_001",
      "module": "objects_and_props",
      "field_path": "object",
      "claim": "A red triangular platform with black patterns and white border is present",
      "value": "red triangular platform",
      "supporting_observation_ids": [
        "obs_objects_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_tail_002",
      "module": "objects_and_props",
      "field_path": "object",
      "claim": "A black spiral tail is hanging from the red platform",
      "value": "black spiral tail",
      "supporting_observation_ids": [
        "obs_objects_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_symbol_003",
      "module": "objects_and_props",
      "field_path": "object",
      "claim": "A Pokémon center symbol is visible on the platform",
      "value": "Pokémon center symbol",
      "supporting_observation_ids": [
        "obs_objects_003"
      ],
      "confidence": 1,
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
      "obs_environment_001",
      "obs_objects_001",
      "obs_objects_002",
      "obs_objects_003"
    ],
    "background": [
      "obs_environment_002"
    ]
  },
  "environment": {
    "setting": [
      "lava flow",
      "volcano or mountain"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [],
    "ground": [
      "lava"
    ],
    "terrain": [
      "volcano"
    ],
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
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "red triangular platform with black patterns and white border",
      "normalized_label": "triangular platform",
      "object_type": "structure",
      "colors": [
        "black",
        "red",
        "white"
      ],
      "material_appearance": [
        "matte"
      ],
      "location": "center",
      "count_reference": "",
      "confidence": 1
    },
    {
      "observation_id": "obs_objects_002",
      "label": "black spiral tail hanging from platform",
      "normalized_label": "spiral tail",
      "object_type": "object",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "matte"
      ],
      "location": "lower right",
      "count_reference": "",
      "confidence": 1
    },
    {
      "observation_id": "obs_objects_003",
      "label": "Pokémon center symbol on platform",
      "normalized_label": "pokémon center symbol",
      "object_type": "marking",
      "colors": [
        "red",
        "white"
      ],
      "material_appearance": [
        "matte"
      ],
      "location": "center",
      "count_reference": "",
      "confidence": 1
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "orange",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "subtle highlights"
    ],
    "composition": [
      "central composition",
      "illustration framed"
    ],
    "camera_angle": "elevated angle",
    "framing": "tight framing",
    "cropping": [
      "full card frame"
    ],
    "depth": "moderate depth",
    "motion_cues": [],
    "motifs": [
      "Pokémon center symbol motif",
      "volcano motif"
    ],
    "repeated_shapes": [
      "triangular platform shape"
    ],
    "style_cues": [
      "high contrast colors",
      "illustration style"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_objects_001"
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
        "fact_objects_platform_001",
        "fact_objects_symbol_003",
        "fact_objects_tail_002"
      ],
      "object_observation_ids": [
        "obs_objects_001",
        "obs_objects_002",
        "obs_objects_003"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_lava_001",
        "fact_environment_volcano_002"
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
        "obs_objects_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_objects_001"
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
        "lava flow",
        "volcano",
        "triangular platform",
        "spiral tail",
        "pokémon center symbol"
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
      "term": "lava flow",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "volcano",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "triangular platform",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    },
    {
      "term": "spiral tail",
      "supporting_observation_ids": [
        "obs_objects_002"
      ]
    },
    {
      "term": "pokémon center symbol",
      "supporting_observation_ids": [
        "obs_objects_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_objects_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11525-019 - High Pressure System

- Branch: `stadium`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0103244`
- Artwork observations: `10`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. No confident visible fact observations were extracted.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| blue sky with clouds and light reflection | blue sky with clouds and light reflection | sky | background | salient | 0.99 |
| rainbow-like light reflection | rainbow-like light reflection | object | midground | salient | 0.98 |
| stone path and stone steps | stone path and stone steps | terrain | foreground | salient | 0.99 |
| green grassy patch in center with circle symbol | green grassy patch with symbol | terrain | midground | salient | 0.99 |
| palm trees grouping on left | palm trees group | plants | midground | salient | 0.99 |
| palm trees grouping on right | palm trees group | plants | midground | salient | 0.99 |
| wooden fence with stone bases | wooden fence with stone bases | architecture | midground | salient | 0.99 |
| green, brown, blue, and beige color palette | green brown blue beige palette | visual_design_palette | all | salient | 0.99 |
| natural daylight lighting with soft shadows | natural daylight lighting | visual_design_lighting | all | salient | 0.99 |
| centered green circle on terrain with stairs leading to it | centered green circle with stairs | composition | midground | salient | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| text 'TRAINER' in silver at top-left | card_name_text | top-left | fully_visible | 0.99 |
| Japanese text 'スタジアム' on top-right | card_ui_text | top-right | fully_visible | 0.99 |
| Japanese text '高気圧' below top right text | card_ui_text | top-right below | fully_visible | 0.99 |
| Japanese descriptive text block in middle lower area | card_ui_text | mid-lower | fully_visible | 0.95 |
| illustrator name 'Illus. Ken Ikuji' at bottom right corner of text box | illustrator_text | bottom right | fully_visible | 0.99 |
| copyright line including '©2003 Pokémon/Nintendo/Creatures/GAME FREAK' | copyright_text | bottom-left | fully_visible | 0.99 |
| collector number '019/019' at bottom right | collector_number | bottom-right | fully_visible | 0.99 |
| black crescent-shaped symbol at bottom right | set_symbol | bottom-right near collector number | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | sky is blue with white clouds and light reflections | obs_light_reflection_001, obs_sky_001 | 0.99 |
| fact_env_002 | environment | terrain includes stone path, stone steps, and green grassy patch | obs_terrain_001, obs_terrain_002 | 0.99 |
| fact_env_003 | environment | plants visible are palm trees grouped on left and right sides | obs_trees_001, obs_trees_002 | 0.99 |
| fact_env_004 | environment | wooden fence with stone bases present | obs_architecture_001 | 0.99 |
| fact_grounded_search_terms_001 | fact_grounded_search_terms | contains palm trees environment | obs_trees_001, obs_trees_002 | 1 |
| fact_grounded_search_terms_002 | fact_grounded_search_terms | contains stone steps environment | obs_terrain_001 | 1 |
| fact_grounded_search_terms_003 | fact_grounded_search_terms | contains blue sky environment | obs_sky_001 | 1 |
| fact_visual_design_001 | visual_effects | color palette is green, brown, blue, and beige | obs_palette_001 | 0.99 |
| fact_visual_design_002 | visual_effects | lighting is natural daylight with soft shadows | obs_lighting_001 | 0.99 |
| fact_visual_design_003 | composition | centered green circle on terrain with stairs leading to it | obs_composition_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | visible card name text 'TRAINER' at top-left | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_002 | visible Japanese text 'スタジアム' (Stadium) at top-right | obs_card_ui_text_002 | 0.99 |
| fact_card_ui_003 | visible Japanese text '高気圧' (High Pressure) below stadium text | obs_card_ui_text_003 | 0.99 |
| fact_card_ui_004 | visible Japanese descriptive text block in mid-lower card area | obs_card_ui_text_004 | 0.95 |
| fact_card_ui_005 | visible illustrator text 'Illus. Ken Ikuji' at bottom right | obs_illustrator_text_001 | 0.99 |
| fact_card_ui_006 | visible copyright text including '©2003 Pokémon/Nintendo/Creatures/GAME FREAK' | obs_copyright_text_001 | 0.99 |
| fact_card_ui_007 | visible collector number '019/019' at bottom right | obs_card_ui_text_005 | 0.99 |
| fact_card_ui_008 | visible black crescent-shaped set symbol at bottom right | obs_set_symbol_001 | 0.99 |

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
    "fact_card_ui_007",
    "fact_card_ui_008"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "set_symbol_observation_ids": [
    "obs_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_copyright_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_004"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_illustrator_text_001"
  ],
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
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | none_visible | none | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
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
| palm trees | obs_trees_001, obs_trees_002 |
| stone steps | obs_terrain_001 |
| blue sky | obs_sky_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_architecture_001 | deterministic_rule | 0.99 |
| centered composition | obs_composition_001 | deterministic_rule | 0.99 |
| circular motif | obs_composition_001 | deterministic_rule | 0.99 |
| cloud | obs_sky_001 | deterministic_rule | 0.99 |
| fence | obs_architecture_001 | deterministic_rule | 0.99 |
| plant | obs_trees_001, obs_trees_002 | deterministic_rule | 0.99 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| stairs | obs_composition_001, obs_terrain_001 | deterministic_rule | 0.99 |
| terrain | obs_composition_001, obs_terrain_001, obs_terrain_002 | deterministic_rule | 0.99 |
| tree | obs_trees_001, obs_trees_002 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. No confident visible fact observations were extracted.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "blue sky with clouds and light reflection",
      "normalized_label": "blue sky with clouds and light reflection",
      "scene_layer": "background",
      "frame_position": "center-top",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_reflection_001",
      "kind": "object",
      "label": "rainbow-like light reflection",
      "normalized_label": "rainbow-like light reflection",
      "scene_layer": "midground",
      "frame_position": "top-left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_001",
      "kind": "terrain",
      "label": "stone path and stone steps",
      "normalized_label": "stone path and stone steps",
      "scene_layer": "foreground",
      "frame_position": "bottom-center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_002",
      "kind": "terrain",
      "label": "green grassy patch in center with circle symbol",
      "normalized_label": "green grassy patch with symbol",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "plants",
      "label": "palm trees grouping on left",
      "normalized_label": "palm trees group",
      "scene_layer": "midground",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_002",
      "kind": "plants",
      "label": "palm trees grouping on right",
      "normalized_label": "palm trees group",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_architecture_001",
      "kind": "architecture",
      "label": "wooden fence with stone bases",
      "normalized_label": "wooden fence with stone bases",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "visual_design_palette",
      "label": "green, brown, blue, and beige color palette",
      "normalized_label": "green brown blue beige palette",
      "scene_layer": "all",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "visual_design_lighting",
      "label": "natural daylight lighting with soft shadows",
      "normalized_label": "natural daylight lighting",
      "scene_layer": "all",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "centered green circle on terrain with stairs leading to it",
      "normalized_label": "centered green circle with stairs",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_name_text",
      "label": "text 'TRAINER' in silver at top-left",
      "normalized_label": "trainer text top-left",
      "scene_layer": "card_ui",
      "frame_position": "top-left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "Japanese text 'スタジアム' on top-right",
      "normalized_label": "japanese text stadium",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "Japanese text '高気圧' below top right text",
      "normalized_label": "japanese text high pressure",
      "scene_layer": "card_ui",
      "frame_position": "top-right below",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "Japanese descriptive text block in middle lower area",
      "normalized_label": "japanese descriptive text block",
      "scene_layer": "card_ui",
      "frame_position": "mid-lower",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator name 'Illus. Ken Ikuji' at bottom right corner of text box",
      "normalized_label": "illustrator text ken ikuji",
      "scene_layer": "card_ui",
      "frame_position": "bottom right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_copyright_text_001",
      "kind": "copyright_text",
      "label": "copyright line including '©2003 Pokémon/Nintendo/Creatures/GAME FREAK'",
      "normalized_label": "copyright text 2003 pokemon nintendo",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "collector_number",
      "label": "collector number '019/019' at bottom right",
      "normalized_label": "collector number 019/019",
      "scene_layer": "card_ui",
      "frame_position": "bottom-right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_symbol_001",
      "kind": "set_symbol",
      "label": "black crescent-shaped symbol at bottom right",
      "normalized_label": "black crescent shaped set symbol",
      "scene_layer": "card_ui",
      "frame_position": "bottom-right near collector number",
      "visibility": "fully_visible",
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
      "claim": "sky is blue with white clouds and light reflections",
      "value": "blue with white clouds and light reflections",
      "supporting_observation_ids": [
        "obs_light_reflection_001",
        "obs_sky_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain includes stone path, stone steps, and green grassy patch",
      "value": "stone path stone steps and green grass",
      "supporting_observation_ids": [
        "obs_terrain_001",
        "obs_terrain_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "plants visible are palm trees grouped on left and right sides",
      "value": "palm trees left and right",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "architecture",
      "claim": "wooden fence with stone bases present",
      "value": "wooden fence with stone bases",
      "supporting_observation_ids": [
        "obs_architecture_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_terms_001",
      "module": "fact_grounded_search_terms",
      "field_path": "terms",
      "claim": "contains palm trees environment",
      "value": "palm trees",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_terms_002",
      "module": "fact_grounded_search_terms",
      "field_path": "terms",
      "claim": "contains stone steps environment",
      "value": "stone steps",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_terms_003",
      "module": "fact_grounded_search_terms",
      "field_path": "terms",
      "claim": "contains blue sky environment",
      "value": "blue sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_001",
      "module": "visual_effects",
      "field_path": "palette",
      "claim": "color palette is green, brown, blue, and beige",
      "value": "green brown blue beige",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_002",
      "module": "visual_effects",
      "field_path": "lighting",
      "claim": "lighting is natural daylight with soft shadows",
      "value": "natural daylight soft shadows",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_003",
      "module": "composition",
      "field_path": "composition",
      "claim": "centered green circle on terrain with stairs leading to it",
      "value": "centered green circle with stairs",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "visible card name text 'TRAINER' at top-left",
      "value": "TRAINER",
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
      "claim": "visible Japanese text 'スタジアム' (Stadium) at top-right",
      "value": "Stadium (Japanese)",
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
      "claim": "visible Japanese text '高気圧' (High Pressure) below stadium text",
      "value": "High Pressure (Japanese)",
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
      "claim": "visible Japanese descriptive text block in mid-lower card area",
      "value": "Japanese descriptive text block",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "visible illustrator text 'Illus. Ken Ikuji' at bottom right",
      "value": "Illus. Ken Ikuji",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "visible copyright text including '©2003 Pokémon/Nintendo/Creatures/GAME FREAK'",
      "value": "©2003 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_copyright_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "visible collector number '019/019' at bottom right",
      "value": "019/019",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_008",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "visible black crescent-shaped set symbol at bottom right",
      "value": "black crescent set symbol",
      "supporting_observation_ids": [
        "obs_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_terrain_001"
    ],
    "midground": [
      "obs_architecture_001",
      "obs_composition_001",
      "obs_terrain_002",
      "obs_trees_001",
      "obs_trees_002"
    ],
    "background": [
      "obs_light_reflection_001",
      "obs_sky_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky with white clouds and light reflection"
    ],
    "ground": [
      "green grassy patch",
      "stone path",
      "stone steps"
    ],
    "terrain": [
      "grass",
      "stone path",
      "stone steps"
    ],
    "plants": [
      "palm trees"
    ],
    "architecture": [
      "wooden fence with stone bases"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_architecture_001",
      "obs_light_reflection_001",
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
      "beige",
      "blue",
      "brown",
      "green"
    ],
    "lighting": [
      "natural daylight",
      "soft shadows"
    ],
    "shadows": [
      "soft"
    ],
    "highlights": [
      "rainbow-like light reflection"
    ],
    "composition": [
      "centered green circle on terrain",
      "stairs leading to green circle"
    ],
    "camera_angle": "straight-on",
    "framing": "centered",
    "cropping": [],
    "depth": "deep",
    "motion_cues": [],
    "motifs": [
      "circular green patch"
    ],
    "repeated_shapes": [
      "palm trees"
    ],
    "style_cues": [
      "naturalistic"
    ],
    "supporting_observation_ids": [
      "obs_composition_001",
      "obs_light_reflection_001",
      "obs_lighting_001",
      "obs_palette_001",
      "obs_trees_001",
      "obs_trees_002"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "not_applicable",
    "character_representations_review": "not_applicable",
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
        "fact_env_004"
      ],
      "observation_ids": [
        "obs_architecture_001",
        "obs_light_reflection_001",
        "obs_sky_001",
        "obs_terrain_001",
        "obs_terrain_002",
        "obs_trees_001",
        "obs_trees_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_visual_design_003"
      ],
      "observation_ids": [
        "obs_composition_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_visual_design_001",
        "fact_visual_design_002"
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
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004",
        "fact_card_ui_005",
        "fact_card_ui_006",
        "fact_card_ui_007",
        "fact_card_ui_008"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "set_symbol_observation_ids": [
        "obs_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_copyright_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_illustrator_text_001"
      ],
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
      "fact_ids": [
        "fact_grounded_search_terms_001",
        "fact_grounded_search_terms_002",
        "fact_grounded_search_terms_003"
      ],
      "terms": [
        "palm trees",
        "stone steps",
        "blue sky"
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
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "term": "palm trees",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ]
    },
    {
      "term": "stone steps",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ]
    },
    {
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_architecture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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
        "concept": "fence",
        "source_observation_ids": [
          "obs_architecture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_trees_001",
          "obs_trees_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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
        "concept": "stairs",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_terrain_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_terrain_001",
          "obs_terrain_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001",
          "obs_trees_002"
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
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0081836`
- Artwork observations: `10`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: bomb, bomb body, black, rounded polygon, yellow bands, fuse, red, spark. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | high | 0.99 |
| bomb body | bomb body | object_part | foreground | high | 0.98 |
| black | black | color | foreground | medium | 0.95 |
| rounded polygon | rounded polygon | shape | foreground | high | 0.96 |
| yellow bands | yellow bands | object_part | foreground | medium | 0.92 |
| fuse | fuse | object_part | foreground | medium | 0.94 |
| red | red | color | foreground | medium | 0.94 |
| spark | spark | object_part | foreground | medium | 0.9 |
| explosion burst | explosion burst | visual_effect | foreground | high | 0.92 |
| radiant burst with orange, blue, purple | radiant burst with orange blue purple | background | background | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text | card_ui_text | top center | fully_visible | 0.99 |
| pokemon tool type text in Japanese | card_ui_text | top left | fully_visible | 0.95 |
| trainer type text in Japanese | card_ui_text | top right | fully_visible | 0.95 |
| card rules text in Japanese | card_ui_text | middle bottom | fully_visible | 0.98 |
| set symbol - jpn-m5 | set_symbol | bottom left | fully_visible | 0.95 |
| card number 106/081 SR | collector_number | bottom left | fully_visible | 0.99 |
| illustrator name in English | illustrator_text | bottom left | fully_visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | bomb | obs_bomb_001 | 0.99 |
| fact_002 | objects_and_props | bomb body color | obs_bomb_body_color_001 | 0.95 |
| fact_003 | objects_and_props | bomb body shape | obs_bomb_body_shape_001 | 0.96 |
| fact_004 | objects_and_props | yellow bands on bomb body | obs_bomb_band_001 | 0.92 |
| fact_005 | objects_and_props | red fuse | obs_bomb_fuse_001, obs_bomb_fuse_color_001 | 0.94 |
| fact_006 | visual_effects | spark at fuse tip | obs_bomb_fuse_spark_001 | 0.9 |
| fact_007 | visual_effects | explosion burst effect | obs_bomb_explosion_001 | 0.92 |
| fact_008 | environment | background radiant burst with orange, blue, purple | obs_bomb_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_009 | card name text in Japanese | obs_card_name_text_001 | 0.99 |
| fact_010 | pokemon tool type text | obs_card_upper_left_text_001 | 0.95 |
| fact_011 | trainer type text | obs_card_upper_right_text_001 | 0.95 |
| fact_012 | card rules text in Japanese | obs_card_rule_text_001 | 0.98 |
| fact_013 | set symbol jpn-m5 | obs_card_set_icon_001 | 0.95 |
| fact_014 | card number 106/081 SR | obs_card_number_001 | 0.99 |
| fact_015 | illustrator name | obs_card_illustrator_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_009",
    "fact_010",
    "fact_011",
    "fact_012",
    "fact_013",
    "fact_014",
    "fact_015"
  ],
  "name_text_observation_ids": [
    "obs_card_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_set_icon_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_number_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_rule_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_illustrator_001"
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
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
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
| bomb | exact | 1 | obs_bomb_001 | 0.99 |

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
| bomb | obs_bomb_001 |
| black bomb | obs_bomb_body_color_001 |
| yellow band bomb | obs_bomb_band_001 |
| red fuse | obs_bomb_fuse_001 |
| spark fuse | obs_bomb_fuse_spark_001 |
| explosion burst | obs_bomb_explosion_001 |
| radiant burst background | obs_bomb_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_bomb_001 | deterministic_rule | 0.92 |
| circular motif | obs_bomb_body_shape_001 | deterministic_rule | 0.96 |
| explosion | obs_bomb_explosion_001 | deterministic_rule | 0.92 |
| spark | obs_bomb_fuse_spark_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body, black, rounded polygon, yellow bands, fuse, red, spark. Counts: bomb: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_bomb_001",
      "kind": "object",
      "label": "bomb",
      "normalized_label": "bomb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_001",
      "kind": "object_part",
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_color_001",
      "kind": "color",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_shape_001",
      "kind": "shape",
      "label": "rounded polygon",
      "normalized_label": "rounded polygon",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_band_001",
      "kind": "object_part",
      "label": "yellow bands",
      "normalized_label": "yellow bands",
      "scene_layer": "foreground",
      "frame_position": "bottom half",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "kind": "object_part",
      "label": "fuse",
      "normalized_label": "fuse",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_color_001",
      "kind": "color",
      "label": "red",
      "normalized_label": "red",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_spark_001",
      "kind": "object_part",
      "label": "spark",
      "normalized_label": "spark",
      "scene_layer": "foreground",
      "frame_position": "top left fuse tip",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_explosion_001",
      "kind": "visual_effect",
      "label": "explosion burst",
      "normalized_label": "explosion burst",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_background_001",
      "kind": "background",
      "label": "radiant burst with orange, blue, purple",
      "normalized_label": "radiant burst with orange blue purple",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_upper_left_text_001",
      "kind": "card_ui_text",
      "label": "pokemon tool type text in Japanese",
      "normalized_label": "pokemon tool type text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_upper_right_text_001",
      "kind": "card_ui_text",
      "label": "trainer type text in Japanese",
      "normalized_label": "trainer type text",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_rule_text_001",
      "kind": "card_ui_text",
      "label": "card rules text in Japanese",
      "normalized_label": "card rules text",
      "scene_layer": "ui",
      "frame_position": "middle bottom",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_set_icon_001",
      "kind": "set_symbol",
      "label": "set symbol - jpn-m5",
      "normalized_label": "set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "collector_number",
      "label": "card number 106/081 SR",
      "normalized_label": "card number 106/081 SR",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator name in English",
      "normalized_label": "illustrator name",
      "scene_layer": "ui",
      "frame_position": "bottom left",
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
      "field_path": "objects_and_props[0].label",
      "claim": "bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].colors",
      "claim": "bomb body color",
      "value": "black",
      "supporting_observation_ids": [
        "obs_bomb_body_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].shape",
      "claim": "bomb body shape",
      "value": "rounded polygon",
      "supporting_observation_ids": [
        "obs_bomb_body_shape_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].detail",
      "claim": "yellow bands on bomb body",
      "value": "yellow bands",
      "supporting_observation_ids": [
        "obs_bomb_band_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].detail",
      "claim": "red fuse",
      "value": "red fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_fuse_color_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "visual_effects",
      "field_path": "visual_effects[0].label",
      "claim": "spark at fuse tip",
      "value": "spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_spark_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "visual_effects",
      "field_path": "visual_effects[1].label",
      "claim": "explosion burst effect",
      "value": "explosion burst",
      "supporting_observation_ids": [
        "obs_bomb_explosion_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "background.color_pattern",
      "claim": "background radiant burst with orange, blue, purple",
      "value": "radiant burst orange blue purple",
      "supporting_observation_ids": [
        "obs_bomb_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text in Japanese",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "category_text_top_left",
      "claim": "pokemon tool type text",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_upper_left_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "category_text_top_right",
      "claim": "trainer type text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_upper_right_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "rules_text",
      "claim": "card rules text in Japanese",
      "value": "visible rules text",
      "supporting_observation_ids": [
        "obs_card_rule_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol jpn-m5",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_set_icon_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_and_rarity",
      "claim": "card number 106/081 SR",
      "value": "106/081 SR",
      "supporting_observation_ids": [
        "obs_card_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name",
      "value": "Inose Yukie",
      "supporting_observation_ids": [
        "obs_card_illustrator_001"
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
      "count_id": "count_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_bomb_001",
      "obs_bomb_band_001",
      "obs_bomb_body_001",
      "obs_bomb_explosion_001",
      "obs_bomb_fuse_001",
      "obs_bomb_fuse_spark_001"
    ],
    "midground": [],
    "background": [
      "obs_bomb_background_001"
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
      "obs_bomb_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "tool-like object",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "bright spark",
        "dark rounded body",
        "yellow band"
      ],
      "location": "center foreground",
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
      "purple",
      "red",
      "yellow"
    ],
    "lighting": [
      "diffuse bright spark on bomb"
    ],
    "shadows": [],
    "highlights": [
      "spark highlight on bomb fuse"
    ],
    "composition": [
      "central bomb object",
      "radiant burst background"
    ],
    "camera_angle": "direct front",
    "framing": "centered tight frame",
    "cropping": [],
    "depth": "shallow depth with bomb",
    "motion_cues": [
      "exploding burst",
      "spark flicker"
    ],
    "motifs": [
      "bomb",
      "explosion"
    ],
    "repeated_shapes": [
      "polygonal bomb body segments"
    ],
    "style_cues": [
      "digital illustration"
    ],
    "supporting_observation_ids": [
      "obs_bomb_001",
      "obs_bomb_background_001",
      "obs_bomb_explosion_001",
      "obs_bomb_fuse_spark_001"
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
        "fact_004",
        "fact_005"
      ],
      "object_observation_ids": [
        "obs_bomb_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_008"
      ],
      "observation_ids": [
        "obs_bomb_background_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_007"
      ],
      "observation_ids": [
        "obs_bomb_explosion_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_002",
        "fact_005",
        "fact_008"
      ],
      "observation_ids": [
        "obs_bomb_background_001",
        "obs_bomb_body_color_001",
        "obs_bomb_fuse_color_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_006",
        "fact_007"
      ],
      "observation_ids": [
        "obs_bomb_explosion_001",
        "obs_bomb_fuse_spark_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015"
      ],
      "name_text_observation_ids": [
        "obs_card_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_set_icon_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_number_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_rule_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [
        "fact_001"
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
        "bomb",
        "black bomb",
        "yellow band bomb",
        "red fuse",
        "spark fuse",
        "explosion burst",
        "radiant burst background"
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
        "obs_bomb_001"
      ]
    },
    {
      "term": "black bomb",
      "supporting_observation_ids": [
        "obs_bomb_body_color_001"
      ]
    },
    {
      "term": "yellow band bomb",
      "supporting_observation_ids": [
        "obs_bomb_band_001"
      ]
    },
    {
      "term": "red fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001"
      ]
    },
    {
      "term": "spark fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_spark_001"
      ]
    },
    {
      "term": "explosion burst",
      "supporting_observation_ids": [
        "obs_bomb_explosion_001"
      ]
    },
    {
      "term": "radiant burst background",
      "supporting_observation_ids": [
        "obs_bomb_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_bomb_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_bomb_body_shape_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_bomb_explosion_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_bomb_fuse_spark_001"
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
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0088516`
- Artwork observations: `6`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Visible observations: dark bell, bell-shaped head, long handle, black and silver colors, circular pattern, spiraling dark purple background. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark bell | dark bell | object | midground | high | 0.99 |
| bell-shaped head | bell-shaped head | object | midground | high | 0.98 |
| long handle | long handle | object | midground | high | 0.97 |
| black and silver colors | black and silver colors | object | midground | medium | 0.95 |
| circular interior pattern | circular pattern | object | midground | medium | 0.93 |
| spiraling dark purple background | spiraling dark purple background | environment | background | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text top left, blue label | card_ui_text | top-left | visible | 0.99 |
| Japanese text top right, gray label | card_ui_text | top-right | visible | 0.99 |
| card name in Japanese black text | card_ui_text | top-left-below-blue-label | visible | 0.99 |
| Japanese white text at lower oval | card_ui_text | bottom-right | visible | 0.98 |
| set symbol and collector number 'J M5 105/081 SR' and illustrator 'Illus. Toysto Beach' | card_ui_text | bottom-left | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_dark_bell_object_001 | objects_and_props | The main object depicted is a dark bell | obs_object_dark_bell_001 | 0.99 |
| fact_bell_shape_002 | objects_and_props | The object has a bell-shaped head | obs_object_shape_head_bell_002 | 0.98 |
| fact_long_handle_003 | objects_and_props | The object has a long handle | obs_object_body_long_handle_003 | 0.97 |
| fact_colors_black_and_silver_004 | color_and_light | The object is black with silver outlining | obs_visual_detail_black_and_silver_colors_004 | 0.95 |
| fact_circular_interior_pattern_005 | objects_and_props | The bell's interior has circular decorative patterns | obs_visual_pattern_interior_circular_designs_005 | 0.93 |
| fact_background_spiral_purple_006 | environment | Background is a spiraling dark purple pattern | obs_environment_background_spiraling_dark_purple_006 | 0.96 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_japanese_blue_007 | Japanese text in blue label at top-left | obs_card_ui_text_japanese_top_007 | 0.99 |
| fact_card_ui_japanese_gray_008 | Japanese text in gray label at top-right | obs_card_ui_text_japanese_top_right_008 | 0.99 |
| fact_card_ui_name_japanese_009 | Card name in black Japanese text below blue label | obs_card_ui_text_japanese_black_009 | 0.99 |
| fact_card_ui_lower_oval_text_010 | Japanese white text in lower oval | obs_card_ui_text_japanese_white_010 | 0.98 |
| fact_card_ui_set_and_illustrator_011 | Set code J M5, collector number 105/081 SR, illustrator Illus. Toysto Beach visible | obs_card_ui_name_set_illustrator_011 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_japanese_blue_007",
    "fact_card_ui_japanese_gray_008",
    "fact_card_ui_lower_oval_text_010",
    "fact_card_ui_name_japanese_009",
    "fact_card_ui_set_and_illustrator_011"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_japanese_black_009",
    "obs_card_ui_text_japanese_top_007",
    "obs_card_ui_text_japanese_top_right_008"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_name_set_illustrator_011"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_name_set_illustrator_011"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_name_set_illustrator_011"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_japanese_white_010"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_name_set_illustrator_011"
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
| composition | none_visible | none | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
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
| dark bell | exact | 1 | obs_object_dark_bell_001 | 1 |

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
| bell-shaped head | obs_object_shape_head_bell_002 |
| long handle | obs_object_body_long_handle_003 |
| black and silver colors | obs_visual_detail_black_and_silver_colors_004 |
| circular pattern | obs_visual_pattern_interior_circular_designs_005 |
| spiraling dark purple background | obs_environment_background_spiraling_dark_purple_006 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_object_dark_bell_001 | deterministic_rule | 0.92 |
| circular motif | obs_visual_pattern_interior_circular_designs_005 | deterministic_rule | 0.93 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, bell-shaped head, long handle, black and silver colors, circular pattern, spiraling dark purple background. Counts: dark bell: 1.
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
      "observation_id": "obs_object_shape_head_bell_002",
      "kind": "object",
      "label": "bell-shaped head",
      "normalized_label": "bell-shaped head",
      "scene_layer": "midground",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_body_long_handle_003",
      "kind": "object",
      "label": "long handle",
      "normalized_label": "long handle",
      "scene_layer": "midground",
      "frame_position": "left-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_detail_black_and_silver_colors_004",
      "kind": "object",
      "label": "black and silver colors",
      "normalized_label": "black and silver colors",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_pattern_interior_circular_designs_005",
      "kind": "object",
      "label": "circular interior pattern",
      "normalized_label": "circular pattern",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_background_spiraling_dark_purple_006",
      "kind": "environment",
      "label": "spiraling dark purple background",
      "normalized_label": "spiraling dark purple background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_top_007",
      "kind": "card_ui_text",
      "label": "Japanese text top left, blue label",
      "normalized_label": "Japanese text top left",
      "scene_layer": "foreground",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_top_right_008",
      "kind": "card_ui_text",
      "label": "Japanese text top right, gray label",
      "normalized_label": "Japanese text top right",
      "scene_layer": "foreground",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_black_009",
      "kind": "card_ui_text",
      "label": "card name in Japanese black text",
      "normalized_label": "card name Japanese",
      "scene_layer": "foreground",
      "frame_position": "top-left-below-blue-label",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_white_010",
      "kind": "card_ui_text",
      "label": "Japanese white text at lower oval",
      "normalized_label": "Japanese white lower oval text",
      "scene_layer": "foreground",
      "frame_position": "bottom-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_set_illustrator_011",
      "kind": "card_ui_text",
      "label": "set symbol and collector number 'J M5 105/081 SR' and illustrator 'Illus. Toysto Beach'",
      "normalized_label": "set symbol, collector number, illustrator",
      "scene_layer": "foreground",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_dark_bell_object_001",
      "module": "objects_and_props",
      "field_path": "[0].label",
      "claim": "The main object depicted is a dark bell",
      "value": "dark bell",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bell_shape_002",
      "module": "objects_and_props",
      "field_path": "[1].label",
      "claim": "The object has a bell-shaped head",
      "value": "bell-shaped head",
      "supporting_observation_ids": [
        "obs_object_shape_head_bell_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_long_handle_003",
      "module": "objects_and_props",
      "field_path": "[2].label",
      "claim": "The object has a long handle",
      "value": "long handle",
      "supporting_observation_ids": [
        "obs_object_body_long_handle_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_colors_black_and_silver_004",
      "module": "color_and_light",
      "field_path": "[0].label",
      "claim": "The object is black with silver outlining",
      "value": "black and silver colors",
      "supporting_observation_ids": [
        "obs_visual_detail_black_and_silver_colors_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_circular_interior_pattern_005",
      "module": "objects_and_props",
      "field_path": "[3].label",
      "claim": "The bell's interior has circular decorative patterns",
      "value": "circular interior pattern",
      "supporting_observation_ids": [
        "obs_visual_pattern_interior_circular_designs_005"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_background_spiral_purple_006",
      "module": "environment",
      "field_path": "background.spiraling_pattern",
      "claim": "Background is a spiraling dark purple pattern",
      "value": "spiraling dark purple background",
      "supporting_observation_ids": [
        "obs_environment_background_spiraling_dark_purple_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_japanese_blue_007",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0]",
      "claim": "Japanese text in blue label at top-left",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_top_007"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_japanese_gray_008",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[1]",
      "claim": "Japanese text in gray label at top-right",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_top_right_008"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_japanese_009",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[2]",
      "claim": "Card name in black Japanese text below blue label",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_black_009"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_lower_oval_text_010",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text[0]",
      "claim": "Japanese white text in lower oval",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_white_010"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_and_illustrator_011",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "Set code J M5, collector number 105/081 SR, illustrator Illus. Toysto Beach visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_name_set_illustrator_011"
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
      "count_id": "count_dark_bell_001",
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
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_card_ui_name_set_illustrator_011",
      "obs_card_ui_text_japanese_black_009",
      "obs_card_ui_text_japanese_top_007",
      "obs_card_ui_text_japanese_top_right_008",
      "obs_card_ui_text_japanese_white_010"
    ],
    "midground": [
      "obs_object_body_long_handle_003",
      "obs_object_dark_bell_001",
      "obs_object_shape_head_bell_002",
      "obs_visual_detail_black_and_silver_colors_004",
      "obs_visual_pattern_interior_circular_designs_005"
    ],
    "background": [
      "obs_environment_background_spiraling_dark_purple_006"
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
      "obs_environment_background_spiraling_dark_purple_006"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_dark_bell_001",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "object_type": "tool",
      "colors": [
        "black",
        "silver"
      ],
      "material_appearance": [
        "dark rounded body",
        "reflective-looking highlights"
      ],
      "location": "center",
      "count_reference": "count_dark_bell_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "dark purple",
      "silver"
    ],
    "lighting": [
      "shiny outlines",
      "soft highlights"
    ],
    "shadows": [
      "subtle interior shading"
    ],
    "highlights": [
      "bright silver edges"
    ],
    "composition": [
      "centered main object",
      "spiral background"
    ],
    "camera_angle": "front angled view",
    "framing": "tight framing",
    "cropping": [
      "full object visible"
    ],
    "depth": "medium depth perception",
    "motion_cues": [
      "swirling background implying motion"
    ],
    "motifs": [
      "circular patterns"
    ],
    "repeated_shapes": [
      "circular designs",
      "geometric shapes"
    ],
    "style_cues": [
      "digital art",
      "stylized"
    ],
    "supporting_observation_ids": [
      "obs_environment_background_spiraling_dark_purple_006",
      "obs_object_dark_bell_001"
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
        "fact_bell_shape_002",
        "fact_circular_interior_pattern_005",
        "fact_dark_bell_object_001",
        "fact_long_handle_003"
      ],
      "object_observation_ids": [
        "obs_object_body_long_handle_003",
        "obs_object_dark_bell_001",
        "obs_object_shape_head_bell_002",
        "obs_visual_pattern_interior_circular_designs_005"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_background_spiral_purple_006"
      ],
      "observation_ids": [
        "obs_environment_background_spiraling_dark_purple_006"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_colors_black_and_silver_004"
      ],
      "observation_ids": [
        "obs_visual_detail_black_and_silver_colors_004"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_japanese_blue_007",
        "fact_card_ui_japanese_gray_008",
        "fact_card_ui_lower_oval_text_010",
        "fact_card_ui_name_japanese_009",
        "fact_card_ui_set_and_illustrator_011"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_japanese_black_009",
        "obs_card_ui_text_japanese_top_007",
        "obs_card_ui_text_japanese_top_right_008"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_name_set_illustrator_011"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_name_set_illustrator_011"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_name_set_illustrator_011"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_japanese_white_010"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_name_set_illustrator_011"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_dark_bell_001"
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
        "bell-shaped head",
        "long handle",
        "black and silver colors",
        "circular pattern",
        "spiraling dark purple background"
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
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ]
    },
    {
      "term": "bell-shaped head",
      "supporting_observation_ids": [
        "obs_object_shape_head_bell_002"
      ]
    },
    {
      "term": "long handle",
      "supporting_observation_ids": [
        "obs_object_body_long_handle_003"
      ]
    },
    {
      "term": "black and silver colors",
      "supporting_observation_ids": [
        "obs_visual_detail_black_and_silver_colors_004"
      ]
    },
    {
      "term": "circular pattern",
      "supporting_observation_ids": [
        "obs_visual_pattern_interior_circular_designs_005"
      ]
    },
    {
      "term": "spiraling dark purple background",
      "supporting_observation_ids": [
        "obs_environment_background_spiraling_dark_purple_006"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_object_dark_bell_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_visual_pattern_interior_circular_designs_005"
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
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0088688`
- Artwork observations: `5`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: silver star badge, 3d star shape, two ribbons, silver white colors, light blue swirling background. Counts: silver star badge: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| silver star badge | silver star badge | object | midground | high | 0.99 |
| 3D five-pointed star shape | 3d star shape | object | midground | high | 0.98 |
| two ribbons attached to badge | two ribbons | object | midground | medium | 0.95 |
| silver and white colors | silver white colors | color_and_light | midground | high | 0.98 |
| light blue swirling background | light blue swirling background | environment | background | medium | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| リトライバッジ | card_ui_text | top-left | visible | 0.95 |
| ポケモンのどうぐ | card_ui_text | top-left banner | visible | 0.9 |
| トレーナーズ | card_ui_text | top-right banner | visible | 0.9 |
| Illus. Toyste Beach | illustrator_text | bottom-left | visible | 0.9 |
| 074/081 | collector_number | bottom-left | visible | 0.95 |
| J m5 | set_symbol | bottom-left | visible | 0.95 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom-center | visible | 0.95 |
| ポケモンのどうぐは、自分の番に何枚でも、自分のポケモンにつけられる。ポケモン1匹につき1枚だけつけられ、つけたままにする。 | bottom_line_text | bottom-right text box | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | main object is a silver star badge with two ribbons | obs_artwork_badge_color_001, obs_artwork_badge_ribbons_001, obs_artwork_badge_star_001, obs_artwork_main_object_001 | 0.98 |
| fact_env_001 | environment | background has light blue swirling pattern | obs_artwork_background_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_name_001 | card name text is リトライバッジ | obs_card_ui_name_text_001 | 0.95 |
| fact_ui_setcode_001 | card number and set code are 074/081 and J m5 | obs_card_ui_set_code_001, obs_card_ui_set_symbol_001 | 0.95 |
| fact_ui_illust_001 | illustrator is Illus. Toyste Beach | obs_card_ui_illustrator_text_001 | 0.9 |
| fact_ui_copyright_001 | copyright line is ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | obs_card_ui_legal_line_001 | 0.95 |
| fact_ui_bottom_001 | bottom line text is Japanese text about item usage | obs_card_ui_bottom_text_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_bottom_001",
    "fact_ui_copyright_001",
    "fact_ui_illust_001",
    "fact_ui_name_001",
    "fact_ui_setcode_001"
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
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_legal_line_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
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
| subjects | none_visible | none | high |  |
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
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| silver star badge | exact | 1 | obs_artwork_main_object_001 | 0.99 |

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
| silver star badge | obs_artwork_main_object_001 |
| star-shaped badge | obs_artwork_badge_star_001 |
| light blue swirl background | obs_artwork_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| spiral motif | obs_artwork_background_001 | deterministic_rule | 0.97 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: silver star badge, 3d star shape, two ribbons, silver white colors, light blue swirling background. Counts: silver star badge: 1.
- Quality flags: `potential_overconfident_ambiguous_setting`, `potential_speculative_setting_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_artwork_main_object_001",
      "kind": "object",
      "label": "silver star badge",
      "normalized_label": "silver star badge",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_badge_star_001",
      "kind": "object",
      "label": "3D five-pointed star shape",
      "normalized_label": "3d star shape",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_badge_ribbons_001",
      "kind": "object",
      "label": "two ribbons attached to badge",
      "normalized_label": "two ribbons",
      "scene_layer": "midground",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_badge_color_001",
      "kind": "color_and_light",
      "label": "silver and white colors",
      "normalized_label": "silver white colors",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_background_001",
      "kind": "environment",
      "label": "light blue swirling background",
      "normalized_label": "light blue swirling background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "リトライバッジ",
      "normalized_label": "リトライバッジ",
      "scene_layer": "card_ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_banner_001",
      "kind": "card_ui_text",
      "label": "ポケモンのどうぐ",
      "normalized_label": "ポケモンのどうぐ",
      "scene_layer": "card_ui",
      "frame_position": "top-left banner",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_banner_002",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "トレーナーズ",
      "scene_layer": "card_ui",
      "frame_position": "top-right banner",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. Toyste Beach",
      "normalized_label": "illus toyste beach",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "collector_number",
      "label": "074/081",
      "normalized_label": "074/081",
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
      "label": "J m5",
      "normalized_label": "J m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_legal_line_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "scene_layer": "card_ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "ポケモンのどうぐは、自分の番に何枚でも、自分のポケモンにつけられる。ポケモン1匹につき1枚だけつけられ、つけたままにする。",
      "normalized_label": "ポケモンのどうぐは、自分の番に何枚でも、自分のポケモンにつけられる。ポケモン1匹につき1枚だけつけられ、つけたままにする。",
      "scene_layer": "card_ui",
      "frame_position": "bottom-right text box",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "main_object",
      "claim": "main object is a silver star badge with two ribbons",
      "value": "silver star badge with two ribbons",
      "supporting_observation_ids": [
        "obs_artwork_badge_color_001",
        "obs_artwork_badge_ribbons_001",
        "obs_artwork_badge_star_001",
        "obs_artwork_main_object_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background has light blue swirling pattern",
      "value": "light blue swirling background",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is リトライバッジ",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_setcode_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_and_set_symbol",
      "claim": "card number and set code are 074/081 and J m5",
      "value": "074/081, J m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001",
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_illust_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator is Illus. Toyste Beach",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line is ©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_legal_line_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_bottom_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "bottom line text is Japanese text about item usage",
      "value": "ポケモンのどうぐは、自分の番に何枚でも、自分のポケモンにつけられる。ポケモン1匹につき1枚だけつけられ、つけたままにする。",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
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
      "count_id": "count_obj_001",
      "normalized_label": "silver star badge",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_artwork_main_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_artwork_badge_color_001",
      "obs_artwork_badge_ribbons_001",
      "obs_artwork_badge_star_001",
      "obs_artwork_main_object_001"
    ],
    "background": [
      "obs_artwork_background_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
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
      "obs_artwork_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_artwork_main_object_001",
      "label": "silver star badge",
      "normalized_label": "silver star badge",
      "object_type": "badge",
      "colors": [
        "silver",
        "white"
      ],
      "material_appearance": [
        "metallic-looking highlight",
        "smooth"
      ],
      "location": "center",
      "count_reference": "count_obj_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "light blue",
      "silver",
      "white"
    ],
    "lighting": [
      "soft highlights on badge"
    ],
    "shadows": [
      "soft shadow under badge"
    ],
    "highlights": [
      "bright metallic highlights"
    ],
    "composition": [
      "central composition"
    ],
    "camera_angle": "slightly tilted top-down",
    "framing": "tight framing on badge",
    "cropping": [],
    "depth": "moderate depth with foreground and background separation",
    "motion_cues": [],
    "motifs": [
      "star shape motif"
    ],
    "repeated_shapes": [
      "five-pointed stars"
    ],
    "style_cues": [
      "clean digital illustration",
      "soft gradient background"
    ],
    "supporting_observation_ids": [
      "obs_artwork_background_001",
      "obs_artwork_badge_star_001",
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
        "fact_obj_001"
      ],
      "object_observation_ids": [
        "obs_artwork_main_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_artwork_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_artwork_background_001",
        "obs_artwork_main_object_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_artwork_background_001",
        "obs_artwork_badge_color_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_bottom_001",
        "fact_ui_copyright_001",
        "fact_ui_illust_001",
        "fact_ui_name_001",
        "fact_ui_setcode_001"
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
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_legal_line_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
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
        "silver star badge",
        "star-shaped badge",
        "light blue swirl background"
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
      "term": "silver star badge",
      "supporting_observation_ids": [
        "obs_artwork_main_object_001"
      ]
    },
    {
      "term": "star-shaped badge",
      "supporting_observation_ids": [
        "obs_artwork_badge_star_001"
      ]
    },
    {
      "term": "light blue swirl background",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_artwork_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-118: fact_graph_semantic_fact_label_not_supported_v1:sem_001
- GV-PK-JPN-M5-109: fact_graph_semantic_fact_label_not_supported_v1:semfact_001
- GV-PK-JPN-M5-117: fact_graph_interpreted_expression_not_allowed, fact_graph_loose_semantic_label_outside_semantic_visual_facts
- GV-PK-JPN-M5-116: fact_graph_semantic_fact_label_not_supported_v1:semfact_008
- GV-PK-JPN-M5-111: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_001
- GV-PK-JPN-M5-073: fact_graph_semantic_fact_label_not_supported_v1:sem_001

