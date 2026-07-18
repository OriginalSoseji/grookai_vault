# Card Visual Fact Graph V2 Review Packet

Generated rows: 21
Validation failures: 4
Skipped images: 0
Estimated cost USD: 0.2404944

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0112376`
- Artwork observations: `8`
- Card UI / print-marker observations: `10`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, central globe, chandelier arms, purple flames, eye feature, spiral tail, horn-like antennae, colorful fragmented light background. Semantic facts: floating. Counts: chandelier arms: 5.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | high | 0.99 |
| central glass body sphere with purple hue | central globe | creature_anatomy | foreground | high | 0.95 |
| curved black chandelier arms | chandelier arms | creature_anatomy | foreground | high | 0.95 |
| purple flames at arm tips | purple flames | creature_anatomy | foreground | medium | 0.9 |
| large eye shape on central globe | eye feature | creature_anatomy | foreground | high | 0.9 |
| spiral tail arm | spiral tail | creature_anatomy | foreground | medium | 0.9 |
| two black horn-like antennae with white tips | horn-like antennae | creature_anatomy | foreground | medium | 0.9 |
| colorful prism-like fragmented light patterns background | colorful fragmented light background | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガシャンデラex | card_ui_text | top left | visible | 0.99 |
| HP text: 350 | card_ui_text | top right | visible | 0.99 |
| psychic energy symbol | card_ui_symbol | top right next to HP | visible | 0.95 |
| subtype text in Japanese | card_ui_text | below card name | visible | 0.92 |
| attack name in Japanese: ファントムメイズ | card_ui_text | bottom center | visible | 0.95 |
| attack damage value: 130+ | card_ui_text | bottom center | visible | 0.95 |
| collector number: 113/081 SAR | card_ui_text | bottom left | visible | 0.95 |
| set symbol | card_ui_symbol | bottom left near collector number | visible | 0.9 |
| rarity mark: SAR | card_ui_text | bottom left | visible | 0.9 |
| illustrator text in Japanese | card_ui_text | bottom right | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | Mega Chandelure presence | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | central globe body | obs_creature_anatomy_001 | 0.95 |
| fact_creature_anatomy_002 | creature_anatomy | chandelier arms | obs_creature_anatomy_002 | 0.95 |
| fact_creature_anatomy_003 | creature_anatomy | flame tips on arms | obs_creature_anatomy_003 | 0.9 |
| fact_creature_anatomy_004 | creature_anatomy | central globe eye feature | obs_creature_anatomy_004 | 0.9 |
| fact_creature_anatomy_005 | creature_anatomy | spiral tail arm | obs_creature_anatomy_005 | 0.9 |
| fact_creature_anatomy_006 | creature_anatomy | black horn-like antennae | obs_creature_anatomy_006 | 0.9 |
| fact_environment_001 | environment | background setting | obs_environment_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | HP value | obs_card_ui_text_002 | 0.99 |
| fact_card_ui_and_print_markers_003 | set symbol present | obs_card_ui_symbol_002 | 0.9 |
| fact_card_ui_and_print_markers_004 | rarity mark | obs_card_ui_text_007 | 0.9 |
| fact_card_ui_and_print_markers_005 | collector number | obs_card_ui_text_006 | 0.95 |
| fact_card_ui_and_print_markers_006 | illustrator text present | obs_card_ui_text_008 | 0.9 |
| fact_card_ui_and_print_markers_007 | attack name text | obs_card_ui_text_004 | 0.95 |
| fact_card_ui_and_print_markers_008 | attack damage | obs_card_ui_text_005 | 0.95 |
| fact_card_ui_and_print_markers_009 | psychic energy symbol | obs_card_ui_symbol_001 | 0.95 |

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
    "obs_card_ui_text_006"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_symbol_002"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_text_007"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_symbol_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_008"
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
| composition | partial_due_to_crop | medium | medium |  |
| color_and_light | partial_due_to_crop | medium | medium |  |
| visual_effects | partial_due_to_crop | medium | medium |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | low | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_002 | state | floating | obs_subject_001 | obs_subject_001 | floating upright still | 0.95 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| chandelier arms | exact | 5 | obs_creature_anatomy_002 | 0.95 |

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
| chandelier arms | obs_creature_anatomy_002 |
| purple flames | obs_creature_anatomy_003 |
| spiral tail | obs_creature_anatomy_005 |
| floating Pokemon | obs_subject_001 |
| colorful light background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_creature_anatomy_001 | deterministic_rule | 0.95 |
| flame | obs_creature_anatomy_003 | deterministic_rule | 0.9 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| forward-right orientation | obs_subject_001 | deterministic_rule | 0.99 |
| spiral motif | obs_creature_anatomy_005 | deterministic_rule | 0.9 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, central globe, chandelier arms, purple flames, eye feature, spiral tail, horn-like antennae, colorful fragmented light background. Semantic facts: floating. Counts: chandelier arms: 5.
- Quality flags: `potential_module_incomplete_or_low_evidence`
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
      "label": "central glass body sphere with purple hue",
      "normalized_label": "central globe",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "curved black chandelier arms",
      "normalized_label": "chandelier arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "purple flames at arm tips",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "large eye shape on central globe",
      "normalized_label": "eye feature",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "spiral tail arm",
      "normalized_label": "spiral tail",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "two black horn-like antennae with white tips",
      "normalized_label": "horn-like antennae",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "colorful prism-like fragmented light patterns background",
      "normalized_label": "colorful fragmented light background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガシャンデラex",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "HP text: 350",
      "normalized_label": "HP 350",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "card_ui_symbol",
      "label": "psychic energy symbol",
      "normalized_label": "psychic energy symbol",
      "scene_layer": "interface",
      "frame_position": "top right next to HP",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "subtype text in Japanese",
      "normalized_label": "subtype text",
      "scene_layer": "interface",
      "frame_position": "below card name",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "attack name in Japanese: ファントムメイズ",
      "normalized_label": "attack name",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "attack damage value: 130+",
      "normalized_label": "attack damage 130+",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "card_ui_text",
      "label": "collector number: 113/081 SAR",
      "normalized_label": "collector number 113/081 SAR",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_002",
      "kind": "card_ui_symbol",
      "label": "set symbol",
      "normalized_label": "set symbol",
      "scene_layer": "interface",
      "frame_position": "bottom left near collector number",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_007",
      "kind": "card_ui_text",
      "label": "rarity mark: SAR",
      "normalized_label": "rarity mark SAR",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_008",
      "kind": "card_ui_text",
      "label": "illustrator text in Japanese",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "Mega Chandelure presence",
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
      "field_path": "body_regions.central_globe",
      "claim": "central globe body",
      "value": "purple glass sphere",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "chandelier arms",
      "value": "black curved chandelier arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.flames",
      "claim": "flame tips on arms",
      "value": "purple flames at arm tips",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.eye_feature",
      "claim": "central globe eye feature",
      "value": "large eye shape on globe",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "body_regions.tail",
      "claim": "spiral tail arm",
      "value": "spiraled tail arm",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "body_regions.horns",
      "claim": "black horn-like antennae",
      "value": "two black horn-like antennae with white tips",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting.background",
      "claim": "background setting",
      "value": "colorful prism-fragmented light background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
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
      "field_path": "hp_text_observation_ids",
      "claim": "HP value",
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
      "field_path": "set_symbol_observation_ids",
      "claim": "set symbol present",
      "value": "set symbol discernible",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark_observation_ids",
      "claim": "rarity mark",
      "value": "SAR",
      "supporting_observation_ids": [
        "obs_card_ui_text_007"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "collector number",
      "value": "113/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator text present",
      "value": "illustrator text in Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_text_008"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_name_observation_ids",
      "claim": "attack name text",
      "value": "ファントムメイズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage_observation_ids",
      "claim": "attack damage",
      "value": "130+",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_009",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids",
      "claim": "psychic energy symbol",
      "value": "psychic energy symbol present",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_001"
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
        "central glass body sphere",
        "chandelier arms",
        "horn-like antennae",
        "large eye shape on central globe",
        "purple flames at arm tips",
        "spiral tail arm"
      ],
      "physical_features": [
        "black curved arms",
        "purple flames",
        "purple hue",
        "white tips on antennae"
      ],
      "pose": [
        "floating",
        "upright"
      ],
      "orientation": "forward-right",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "visible large single eye shape on globe",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": [
          "no traditional face"
        ]
      },
      "clothing_or_accessories": [],
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
  "counts": [
    {
      "count_id": "count_arms_001",
      "normalized_label": "chandelier arms",
      "count_type": "exact",
      "exact_count": 5,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
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
      "colorful prism-fragmented light background"
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
      "obs_environment_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "multicolor light fragments",
      "purple",
      "white"
    ],
    "lighting": [
      "highlighted glowing effect on flames and central globe"
    ],
    "shadows": [
      "soft shadows on chandelier arms"
    ],
    "highlights": [
      "glossy shine on glass globe"
    ],
    "composition": [
      "centered main subject",
      "diagonal orientation of arms"
    ],
    "camera_angle": "slightly elevated",
    "framing": "tight framing",
    "cropping": [
      "none"
    ],
    "depth": "shallow depth, main subject in sharp focus",
    "motion_cues": [],
    "motifs": [
      "chandelier pattern",
      "spiral shapes"
    ],
    "repeated_shapes": [
      "circular globe",
      "curved arms"
    ],
    "style_cues": [
      "stylized creature"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_002",
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
        "fact_creature_anatomy_006"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "central globe",
          "feature": "body sphere",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "glass-like",
            "large eye shape"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001",
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "chandelier arms",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "curved",
            "five arms"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "flames",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "purple flames at arm tips"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "spiral tail arm",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "spiral shape"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "horns",
          "feature": "horn-like antennae",
          "visibility": "visible",
          "colors": [
            "black",
            "white"
          ],
          "details": [
            "two",
            "white tips"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.9
        }
      ],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating",
            "upright"
          ],
          "orientation": "forward-right",
          "action_state": [
            "still"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.95
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple flames",
          "details": [
            "purple flames at arm tips"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.9
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
        "obs_card_ui_text_006"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_symbol_002"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_text_007"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_008"
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
        "chandelier arms",
        "purple flames",
        "spiral tail",
        "floating Pokemon",
        "colorful light background"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_002",
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
      "confidence": 0.95,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "chandelier arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    },
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "spiral tail",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "floating Pokemon",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "colorful light background",
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
          "obs_creature_anatomy_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
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
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
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

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.010046`
- Artwork observations: `6`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating. Counts: mega darkrai: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | salient | 0.95 |
| body yellow and gold | body yellow gold | creature_anatomy | foreground | salient | 0.9 |
| head with horn-like extensions | head horn-like extensions | creature_anatomy | foreground | salient | 0.9 |
| eyes closed or shadowed | eyes closed shadowed | creature_anatomy | foreground | salient | 0.8 |
| floating pose, upright orientation | floating upright | creature_anatomy | foreground | salient | 0.9 |
| gold ornamental background with symmetrical pattern | gold ornamental background symmetrical pattern | environment | background | salient | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese with 'ex' | card_ui_text | top | visible | 0.95 |
| HP text with 280 and darkness symbol | card_ui_text | top_right | visible | 0.95 |
| darkness energy symbol | card_ui_symbol | near attacks | visible | 0.95 |
| attack names and descriptions in Japanese text | card_ui_text | mid | visible | 0.95 |
| weakness indicator with grass symbol x2 | card_ui_text | bottom_left | visible | 0.95 |
| retreat cost with two colorless energy symbols | card_ui_text | bottom_center | visible | 0.95 |
| illustrator text: 5ban Graphics | card_ui_text | bottom_left | visible | 0.95 |
| set code and collector number: jpn-m5 118/081 | card_ui_text | bottom_left | visible | 0.95 |
| copyright line with 2026 Nintendo/Creatures/GAME FREAK | card_ui_text | bottom | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | Mega Darkrai is the visible scene subject | obs_subject_001 | 0.95 |
| fact_creature_anatomy_001 | creature_anatomy | Body colors are yellow and gold | obs_creature_anatomy_001 | 0.9 |
| fact_creature_anatomy_002 | creature_anatomy | Head has horn-like extensions | obs_creature_anatomy_002 | 0.9 |
| fact_creature_anatomy_003 | creature_anatomy | Eyes appear closed or shadowed | obs_creature_anatomy_003 | 0.8 |
| fact_creature_anatomy_004 | creature_anatomy | Subject is floating and upright | obs_creature_anatomy_004 | 0.9 |
| fact_environment_001 | environment | Gold ornamental symmetrical background pattern | obs_environment_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | Name text in Japanese with ex suffix | obs_card_ui_001 | 0.95 |
| fact_card_ui_and_print_markers_002 | HP text reads 280 with darkness type | obs_card_ui_002 | 0.95 |
| fact_card_ui_and_print_markers_003 | Darkness energy symbol near attacks | obs_card_ui_003 | 0.95 |
| fact_card_ui_and_print_markers_004 | Attack names and descriptions in Japanese text present | obs_card_ui_004 | 0.95 |
| fact_card_ui_and_print_markers_005 | Weakness shown with grass symbol x2 | obs_card_ui_005 | 0.95 |
| fact_card_ui_and_print_markers_006 | Retreat cost shown as two colorless energy symbols | obs_card_ui_006 | 0.95 |
| fact_card_ui_and_print_markers_007 | Illustrator text reads '5ban Graphics' | obs_card_ui_007 | 0.95 |
| fact_card_ui_and_print_markers_008 | Set code and collector number visible as jpn-m5 118/081 | obs_card_ui_008 | 0.95 |
| fact_card_ui_and_print_markers_009 | Copyright line visible with 2026 Pokemon/Nintendo/Creatures/GAME FREAK | obs_card_ui_009 | 0.95 |

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
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_008"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
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
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
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
| sem_fact_002 | state | floating | obs_subject_001 | obs_creature_anatomy_004 | floating floating | 0.9 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| mega darkrai | exact | 1 | obs_subject_001 | 0.95 |

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
| floating pokemon | obs_creature_anatomy_004 |
| yellow gold coloration | obs_creature_anatomy_001 |
| ornamental gold background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| floating | obs_creature_anatomy_004, obs_subject_001 | deterministic_rule | 0.95 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating. Counts: mega darkrai: 1.
- Quality flags: `potential_empty_module_marked_complete`
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
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "body yellow and gold",
      "normalized_label": "body yellow gold",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "head with horn-like extensions",
      "normalized_label": "head horn-like extensions",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "eyes closed or shadowed",
      "normalized_label": "eyes closed shadowed",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "floating pose, upright orientation",
      "normalized_label": "floating upright",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "gold ornamental background with symmetrical pattern",
      "normalized_label": "gold ornamental background symmetrical pattern",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese with 'ex'",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "HP text with 280 and darkness symbol",
      "normalized_label": "hp 280 darkness",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "darkness energy symbol",
      "normalized_label": "energy symbol darkness",
      "scene_layer": "ui",
      "frame_position": "near attacks",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "attack names and descriptions in Japanese text",
      "normalized_label": "attack text",
      "scene_layer": "ui",
      "frame_position": "mid",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "weakness indicator with grass symbol x2",
      "normalized_label": "weakness grass x2",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "retreat cost with two colorless energy symbols",
      "normalized_label": "retreat cost 2 colorless",
      "scene_layer": "ui",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "illustrator text: 5ban Graphics",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "card_ui_text",
      "label": "set code and collector number: jpn-m5 118/081",
      "normalized_label": "set code jpn-m5 collector 118/081",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_009",
      "kind": "card_ui_text",
      "label": "copyright line with 2026 Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright 2026",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subjects[0].identity",
      "claim": "Mega Darkrai is the visible scene subject",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.body_colors",
      "claim": "Body colors are yellow and gold",
      "value": "yellow, gold",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.features.head",
      "claim": "Head has horn-like extensions",
      "value": "horn-like extensions",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "face.eyes",
      "claim": "Eyes appear closed or shadowed",
      "value": "closed or shadowed",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "Subject is floating and upright",
      "value": "floating, upright",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background.pattern",
      "claim": "Gold ornamental symmetrical background pattern",
      "value": "gold ornamental symmetrical pattern",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "Name text in Japanese with ex suffix",
      "value": "present",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids",
      "claim": "HP text reads 280 with darkness type",
      "value": "280 HP darkness",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids",
      "claim": "Darkness energy symbol near attacks",
      "value": "darkness energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text_observation_ids",
      "claim": "Attack names and descriptions in Japanese text present",
      "value": "present",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_indicator_observation_ids",
      "claim": "Weakness shown with grass symbol x2",
      "value": "grass x2",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost_observation_ids",
      "claim": "Retreat cost shown as two colorless energy symbols",
      "value": "2 colorless",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "Illustrator text reads '5ban Graphics'",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "Set code and collector number visible as jpn-m5 118/081",
      "value": "jpn-m5 118/081",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_009",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "Copyright line visible with 2026 Pokemon/Nintendo/Creatures/GAME FREAK",
      "value": "2026 Pokemon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_009"
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
      "identity_confidence": 0.95,
      "anatomy": [
        "body",
        "head",
        "horns"
      ],
      "physical_features": [
        "horn-like extensions on head",
        "yellow and gold coloration"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "closed or shadowed",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "gold",
        "yellow"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_subjects_001",
      "normalized_label": "mega darkrai",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "ornamental background"
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
      "obs_environment_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "gold",
      "yellow"
    ],
    "lighting": [
      "bright highlights"
    ],
    "shadows": [
      "soft shadowing on body contours"
    ],
    "highlights": [
      "strong gold highlights"
    ],
    "composition": [
      "centered subject",
      "symmetrical background"
    ],
    "camera_angle": "frontal",
    "framing": "tight framing with full subject visible",
    "cropping": [],
    "depth": "moderate depth with foreground and background separation",
    "motion_cues": [
      "floating implied by suspension of subject"
    ],
    "motifs": [
      "ornamental symmetrical pattern"
    ],
    "repeated_shapes": [
      "circular and pointed star shapes"
    ],
    "style_cues": [
      "stylized ornamental art style"
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
        "fact_creature_anatomy_004"
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
        "fact_card_ui_and_print_markers_008",
        "fact_card_ui_and_print_markers_009"
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
      "rarity_mark_observation_ids": [],
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
        "obs_card_ui_007"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_subjects_001"
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
        "floating pokemon",
        "yellow gold coloration",
        "ornamental gold background"
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_002",
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
        "body_language": [],
        "body_position": [
          "floating"
        ],
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
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating pokemon",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "yellow gold coloration",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "ornamental gold background",
      "supporting_observation_ids": [
        "obs_environment_001"
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
        "confidence": 0.95
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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
- Attribute confidence: `0.96`
- Cost USD: `0.0116792`
- Artwork observations: `11`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Excadrill. Visible observations: mega excadrill, head, eyes, horn, arms, claws, lower body, tail. Semantic facts: fiery background. Counts: Mega Excadrill: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Excadrill | mega excadrill | scene_subject | foreground | high | 0.99 |
| head | head | creature_anatomy | foreground | high | 0.99 |
| eyes | eyes | creature_anatomy | foreground | high | 0.99 |
| drill horn | horn | creature_anatomy | foreground | high | 0.99 |
| arms with drills | arms | creature_anatomy | foreground | high | 0.99 |
| claws | claws | creature_anatomy | foreground | medium | 0.95 |
| lower body | lower body | creature_anatomy | foreground | high | 0.98 |
| tail | tail | creature_anatomy | foreground | medium | 0.97 |
| colors palette | colors | color_and_light | foreground | high | 0.98 |
| dark fiery background with flames | fiery background | environment | background | medium | 0.95 |
| red and yellow flame effects | flame effects | objects_and_props | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top | fully_visible | 0.98 |
| HP 340 text | hp_text | top_right | fully_visible | 0.99 |
| energy cost symbols | card_ui_symbol | mid_left | fully_visible | 0.9 |
| attack text and damage values | card_ui_text | middle | fully_visible | 0.95 |
| set symbol bottom left | set_symbol | bottom_left | fully_visible | 0.9 |
| rarity symbol SR | rarity_mark | bottom_left | fully_visible | 0.9 |
| copyright text line bottom | copyright_text | very_bottom | fully_visible | 0.9 |
| illustrator name text | illustrator_text | bottom_left | fully_visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_mega_excadrill_001 | subjects | the card shows a single scene subject | obs_subject_001 | 0.99 |
| fact_creature_anatomy_head_001 | creature_anatomy | head is fully visible | obs_creature_anatomy_001 | 0.99 |
| fact_creature_anatomy_eyes_001 | creature_anatomy | eyes are fully visible | obs_creature_anatomy_002 | 0.99 |
| fact_creature_anatomy_horns_001 | creature_anatomy | drill horn present | obs_creature_anatomy_003 | 0.99 |
| fact_creature_anatomy_arms_001 | creature_anatomy | arms have drills | obs_creature_anatomy_004 | 0.99 |
| fact_creature_anatomy_claws_001 | creature_anatomy | sharp claws visible | obs_creature_anatomy_005 | 0.95 |
| fact_creature_anatomy_tail_001 | creature_anatomy | tail present at lower right | obs_creature_anatomy_007 | 0.97 |
| fact_creature_anatomy_pose_001 | creature_anatomy | pose is upright and slightly diagonal | obs_subject_001 | 0.95 |
| fact_colors_001 | color_and_light | main color palette | obs_colors_001 | 0.98 |
| fact_environment_001 | environment | background with dark fiery environment | obs_environment_001, obs_object_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text visible | obs_card_ui_name_001 | 0.98 |
| fact_card_ui_hp_001 | HP 340 text visible | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_energy_001 | energy cost symbols visible | obs_card_ui_energy_001 | 0.9 |
| fact_card_ui_attack_text_001 | attack text and damage values visible | obs_card_ui_text_attack_001 | 0.95 |
| fact_card_ui_set_symbol_001 | set symbol visible bottom left | obs_card_ui_set_symbol_001 | 0.9 |
| fact_card_ui_rarity_001 | rarity symbol SR visible | obs_card_ui_rarity_001 | 0.9 |
| fact_card_ui_copyright_001 | copyright line text visible bottom | obs_card_ui_copyright_001 | 0.9 |
| fact_card_ui_illustrator_001 | illustrator name visible | obs_card_ui_illustrator_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_text_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_energy_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_rarity_001",
    "fact_card_ui_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_rarity_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
  ],
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
| creature_anatomy | complete | none | high |  |
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
| svf_003 | environment | fiery background | obs_subject_001 | obs_environment_001, obs_object_001 | flames and fire effects flame effects | 0.95 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| Mega Excadrill | exact | 1 | obs_subject_001 | 0.99 |

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
| upright pose | obs_subject_001 |
| drill horn | obs_creature_anatomy_003 |
| flame background | obs_environment_001, obs_object_001 |
| black red yellow color scheme | obs_colors_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal composition | obs_subject_001 | deterministic_rule | 0.92 |
| fiery background | obs_environment_001, obs_object_001 | deterministic_rule | 0.95 |
| flame | obs_object_001 | deterministic_rule | 0.95 |
| glowing highlights | obs_object_001 | deterministic_rule | 0.92 |
| right orientation | obs_subject_001 | deterministic_rule | 0.99 |
| slightly diagonal | obs_subject_001 | deterministic_rule | 0.99 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Excadrill. Visible observations: mega excadrill, head, eyes, horn, arms, claws, lower body, tail. Semantic facts: fiery background. Counts: Mega Excadrill: 1.
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
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "drill horn",
      "normalized_label": "horn",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "arms with drills",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "lower body",
      "normalized_label": "lower body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_colors_001",
      "kind": "color_and_light",
      "label": "colors palette",
      "normalized_label": "colors",
      "scene_layer": "foreground",
      "frame_position": "entire",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark fiery background with flames",
      "normalized_label": "fiery background",
      "scene_layer": "background",
      "frame_position": "whole",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "red and yellow flame effects",
      "normalized_label": "flame effects",
      "scene_layer": "background",
      "frame_position": "mid",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 340 text",
      "normalized_label": "hp 340",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "card_ui_symbol",
      "label": "energy cost symbols",
      "normalized_label": "energy symbols",
      "scene_layer": "card_ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_attack_001",
      "kind": "card_ui_text",
      "label": "attack text and damage values",
      "normalized_label": "attack text and damage",
      "scene_layer": "card_ui",
      "frame_position": "middle",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol bottom left",
      "normalized_label": "set symbol",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_001",
      "kind": "rarity_mark",
      "label": "rarity symbol SR",
      "normalized_label": "rarity SR",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "copyright text line bottom",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "very_bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator name text",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_mega_excadrill_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "the card shows a single scene subject",
      "value": "Mega Excadrill",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_head_001",
      "module": "creature_anatomy",
      "field_path": "head",
      "claim": "head is fully visible",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_eyes_001",
      "module": "creature_anatomy",
      "field_path": "eyes",
      "claim": "eyes are fully visible",
      "value": "visible eye with a large pupil",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_horns_001",
      "module": "creature_anatomy",
      "field_path": "horns",
      "claim": "drill horn present",
      "value": "sharp drill horn",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_arms_001",
      "module": "creature_anatomy",
      "field_path": "arms",
      "claim": "arms have drills",
      "value": "visible with red and black drill design",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_claws_001",
      "module": "creature_anatomy",
      "field_path": "claws",
      "claim": "sharp claws visible",
      "value": "light tan claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_tail_001",
      "module": "creature_anatomy",
      "field_path": "tail",
      "claim": "tail present at lower right",
      "value": "long multi-segmented tail",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose is upright and slightly diagonal",
      "value": "Mega Excadrill partially crouched facing right",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_colors_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "main color palette",
      "value": "black, red, yellow, grey, white, pink",
      "supporting_observation_ids": [
        "obs_colors_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background with dark fiery environment",
      "value": "flames and red-orange highlights",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_object_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "Japanese text メガドリュウズex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP 340 text visible",
      "value": "HP 340",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy cost symbols visible",
      "value": "various energy symbols shown near attacks",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack text and damage values visible",
      "value": "two attacks with damage 90 and 200+",
      "supporting_observation_ids": [
        "obs_card_ui_text_attack_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible bottom left",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_rarity_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "rarity symbol SR visible",
      "value": "SR",
      "supporting_observation_ids": [
        "obs_card_ui_rarity_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line text visible bottom",
      "value": "© 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name visible",
      "value": "Illustrator Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.9,
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
        "arms with drills",
        "claws",
        "drill horn",
        "eyes",
        "head",
        "lower body",
        "tail"
      ],
      "physical_features": [
        "segment body parts",
        "sharp claws",
        "spiral drill horns"
      ],
      "pose": [
        "slightly diagonal",
        "upright"
      ],
      "orientation": "right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible open eye with pupil",
        "mouth": "closed",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "grey",
        "pink",
        "red",
        "white"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_single_mega_excadrill",
      "normalized_label": "Mega Excadrill",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_colors_001",
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_subject_001"
    ],
    "midground": [
      "obs_object_001"
    ],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "dark",
      "fiery"
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
      "obs_environment_001",
      "obs_object_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "flames and fire effects",
      "normalized_label": "fire effects",
      "object_type": "effect",
      "colors": [
        "orange",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "background",
      "count_reference": "count_flame_effects_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "grey",
      "pink",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights on red and yellow"
    ],
    "shadows": [
      "shadow on lower body areas"
    ],
    "highlights": [
      "on drill arms and head"
    ],
    "composition": [
      "centered large Pokemon",
      "foreground subject with fiery background"
    ],
    "camera_angle": "slightly diagonal eye-level",
    "framing": "central with top text and bottom card elements",
    "cropping": [
      "not cropped"
    ],
    "depth": "clear foreground and background separation",
    "motion_cues": [],
    "motifs": [
      "flame motif",
      "spiral drill shape"
    ],
    "repeated_shapes": [
      "drill spirals"
    ],
    "style_cues": [
      "bold colors",
      "pose",
      "high contrast"
    ],
    "supporting_observation_ids": [
      "obs_colors_001",
      "obs_creature_anatomy_004",
      "obs_object_001",
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
    "objects_and_props_review": "observed",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
  },
  "modules": {
    "subjects": {
      "fact_ids": [
        "fact_subject_mega_excadrill_001"
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
        "fact_creature_anatomy_arms_001",
        "fact_creature_anatomy_claws_001",
        "fact_creature_anatomy_eyes_001",
        "fact_creature_anatomy_head_001",
        "fact_creature_anatomy_horns_001",
        "fact_creature_anatomy_pose_001",
        "fact_creature_anatomy_tail_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "pink",
            "white"
          ],
          "details": [
            "face with open eye",
            "sharp drill horn",
            "white snout"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001",
            "obs_creature_anatomy_002",
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.99
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "drill shaped arms",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "red"
          ],
          "details": [
            "red and black segments",
            "spiral drill shape"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "claws",
          "feature": "sharp claws",
          "visibility": "fully_visible",
          "colors": [
            "light tan"
          ],
          "details": [
            "curved claws"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "slightly diagonal",
            "upright"
          ],
          "orientation": "right",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_subject_001"
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
        "fact_environment_001"
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
        "obs_object_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_creature_anatomy_pose_001"
      ],
      "observation_ids": [
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_colors_001"
      ],
      "observation_ids": [
        "obs_colors_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_text_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_energy_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_rarity_001",
        "fact_card_ui_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_rarity_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
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
        "count_single_mega_excadrill"
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
      "fact_ids": [
        "fact_colors_001",
        "fact_creature_anatomy_pose_001",
        "fact_subject_mega_excadrill_001"
      ],
      "terms": [
        "upright pose",
        "drill horn",
        "flame background",
        "black red yellow color scheme"
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "svf_003",
      "category": "environment",
      "label": "fiery background",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_object_001"
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
          "flames and fire effects"
        ],
        "objects": [
          "flame effects"
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
      "term": "upright pose",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "drill horn",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "flame background",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_object_001"
      ]
    },
    {
      "term": "black red yellow color scheme",
      "supporting_observation_ids": [
        "obs_colors_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "fiery background",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "slightly diagonal",
        "source_observation_ids": [
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

### GV-PK-JPN-M5-112 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.95`
- Cost USD: `0.0098708`
- Artwork observations: `8`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, black and blue coloration, yellow markings, white claws forelimbs, fighting pose, electric blue energy limbs, sharp eyes, electric blue lightning background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora Pokemon | mega zeraora | scene_subject | foreground | high | 0.99 |
| black fur with blue glow | black and blue coloration | creature_anatomy | foreground | high | 0.98 |
| yellow markings on head and chest | yellow markings | creature_anatomy | foreground | high | 0.95 |
| white sharp claws on forelimbs | white claws forelimbs | creature_anatomy | foreground | high | 0.97 |
| Mega Zeraora in dynamic fighting pose | fighting pose | creature_anatomy | foreground | high | 0.96 |
| electric blue energy surrounding limbs | electric blue energy limbs | creature_anatomy | foreground | high | 0.97 |
| face with sharp eyes looking focused | sharp eyes | creature_anatomy | foreground | high | 0.95 |
| electric blue lighting and lightning streaks | electric blue lightning background | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガゼラオラex | card_name_text | top_center | fully_visible | 0.99 |
| HP 270 | hp_text | top_right | fully_visible | 0.99 |
| Electric energy symbol | energy_symbol | top_right_beside_hp | fully_visible | 0.99 |
| japanese set symbol | set_symbol | bottom_left | fully_visible | 0.95 |
| 112/081 SAR | collector_number | bottom_left | fully_visible | 0.99 |
| Illus. GIDORA | illustrator_text | bottom_left | fully_visible | 0.95 |
| SAR rarity mark | rarity_mark | bottom_left | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | coloration | obs_anatomy_001 | 0.98 |
| fact_003 | creature_anatomy | markings | obs_anatomy_002 | 0.95 |
| fact_004 | creature_anatomy | claws | obs_anatomy_003 | 0.97 |
| fact_005 | creature_anatomy | pose | obs_pose_001 | 0.96 |
| fact_006 | creature_anatomy | effects | obs_effects_001 | 0.97 |
| fact_007 | creature_anatomy | eyes expression | obs_face_001 | 0.95 |
| fact_008 | environment | background lighting | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_009 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_010 | hp text | obs_card_ui_hp_001 | 0.99 |
| fact_011 | energy symbol | obs_card_ui_energy_001 | 0.99 |
| fact_012 | set symbol | obs_card_ui_set_symbol_001 | 0.95 |
| fact_013 | collector number | obs_card_ui_collector_number_001 | 0.99 |
| fact_014 | illustrator text | obs_card_ui_illustrator_001 | 0.95 |
| fact_015 | rarity mark | obs_card_ui_rarity_001 | 0.95 |

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
    "obs_card_ui_name_001"
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
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | low | high |  |
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
| electric blue energy | obs_background_001, obs_effects_001 |
| fighting pose | obs_pose_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| fighting pose | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_background_001, obs_effects_001 | deterministic_rule | 0.92 |
| lightning | obs_background_001 | deterministic_rule | 0.95 |
| upright orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, black and blue coloration, yellow markings, white claws forelimbs, fighting pose, electric blue energy limbs, sharp eyes, electric blue lightning background.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Zeraora Pokemon",
      "normalized_label": "mega zeraora",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_001",
      "kind": "creature_anatomy",
      "label": "black fur with blue glow",
      "normalized_label": "black and blue coloration",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_002",
      "kind": "creature_anatomy",
      "label": "yellow markings on head and chest",
      "normalized_label": "yellow markings",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_003",
      "kind": "creature_anatomy",
      "label": "white sharp claws on forelimbs",
      "normalized_label": "white claws forelimbs",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "Mega Zeraora in dynamic fighting pose",
      "normalized_label": "fighting pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_effects_001",
      "kind": "creature_anatomy",
      "label": "electric blue energy surrounding limbs",
      "normalized_label": "electric blue energy limbs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "creature_anatomy",
      "label": "face with sharp eyes looking focused",
      "normalized_label": "sharp eyes",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "electric blue lighting and lightning streaks",
      "normalized_label": "electric blue lightning background",
      "scene_layer": "background",
      "frame_position": "entire_card",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "メガゼラオラex",
      "normalized_label": "メガゼラオラex",
      "scene_layer": "card_ui",
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
      "normalized_label": "270 HP",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "energy_symbol",
      "label": "Electric energy symbol",
      "normalized_label": "electric energy symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_right_beside_hp",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "japanese set symbol",
      "normalized_label": "japanese set symbol",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "112/081 SAR",
      "normalized_label": "112/081 SAR",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. GIDORA",
      "normalized_label": "GIDORA illustrator",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_001",
      "kind": "rarity_mark",
      "label": "SAR rarity mark",
      "normalized_label": "SAR rarity",
      "scene_layer": "card_ui",
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
      "field_path": "subjects[0].identity",
      "claim": "identity",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.coloration",
      "claim": "coloration",
      "value": "black fur with blue glow",
      "supporting_observation_ids": [
        "obs_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.markings",
      "claim": "markings",
      "value": "yellow markings on head and chest",
      "supporting_observation_ids": [
        "obs_anatomy_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.claws",
      "claim": "claws",
      "value": "white sharp claws on forelimbs",
      "supporting_observation_ids": [
        "obs_anatomy_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose",
      "value": "fighting pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "effects.energy",
      "claim": "effects",
      "value": "electric blue energy surrounding limbs",
      "supporting_observation_ids": [
        "obs_effects_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "face.eyes",
      "claim": "eyes expression",
      "value": "sharp eyes",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "background.lighting",
      "claim": "background lighting",
      "value": "electric blue lightning streaks",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガゼラオラex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "hp text",
      "value": "270 HP",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy symbol",
      "value": "Electric energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "japanese set symbol",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "112/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Illus. GIDORA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "rarity mark",
      "value": "SAR rarity mark",
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
      "identity": "Mega Zeraora",
      "identity_confidence": 0.99,
      "anatomy": [
        "black fur with blue glow",
        "white sharp claws on forelimbs",
        "yellow markings on head and chest"
      ],
      "physical_features": [
        "white claws"
      ],
      "pose": [
        "fighting pose"
      ],
      "orientation": "upright",
      "action_state": [
        "engaged in attack pose"
      ],
      "facial_evidence": {
        "eyes": "sharp eyes",
        "mouth": "closed",
        "eyebrows": "cannot determine",
        "face_position": "upper center",
        "other_visible_evidence": [
          "blue energy effects near face"
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
      "obs_anatomy_001",
      "obs_anatomy_002",
      "obs_anatomy_003",
      "obs_effects_001",
      "obs_face_001",
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
      "electric energy background"
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "electric blue",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights",
      "glowing energy effects"
    ],
    "shadows": [
      "soft shadows on subject"
    ],
    "highlights": [
      "electric blue glow on limbs"
    ],
    "composition": [
      "centered subject",
      "diagonal composition"
    ],
    "camera_angle": "diagonal close-up",
    "framing": "tight around subject",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [
      "electric energy arcs suggesting movement"
    ],
    "motifs": [
      "electricity motif"
    ],
    "repeated_shapes": [
      "zigzag lightning patterns"
    ],
    "style_cues": [
      "stylized comic art style"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_effects_001",
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
          "region": "fur and skin",
          "feature": "coloration",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "blue"
          ],
          "details": [
            "glowing blue electric accents"
          ],
          "supporting_observation_ids": [
            "obs_anatomy_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head and chest",
          "feature": "markings",
          "visibility": "fully_visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "sharp zigzag yellow markings"
          ],
          "supporting_observation_ids": [
            "obs_anatomy_002"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "forelimbs",
          "feature": "claws",
          "visibility": "fully_visible",
          "colors": [
            "white"
          ],
          "details": [
            "sharp claws"
          ],
          "supporting_observation_ids": [
            "obs_anatomy_003"
          ],
          "confidence": 0.97
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "fighting pose"
          ],
          "orientation": "upright",
          "action_state": [
            "engaged in attack pose"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.96
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "electric blue energy surrounding limbs",
          "details": [
            "bright blue electric glow on forearms and legs"
          ],
          "supporting_observation_ids": [
            "obs_effects_001"
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
        "fact_008"
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
        "obs_effects_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_006"
      ],
      "observation_ids": [
        "obs_effects_001"
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
        "obs_card_ui_name_001"
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
        "electric blue energy",
        "fighting pose"
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "electric blue energy",
      "supporting_observation_ids": [
        "obs_background_001",
        "obs_effects_001"
      ]
    },
    {
      "term": "fighting pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "fighting pose",
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
          "obs_background_001",
          "obs_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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

### GV-PK-JPN-M5-096 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0104024`
- Artwork observations: `10`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: Mega Zeraora, black fur color, yellow fur color, blue fur color, blue eyes, electric markings, claws present, standing upright pose. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | Mega Zeraora | scene_subject | foreground | high | 0.98 |
| fur_color_black | black fur color | creature_anatomy | foreground | high | 0.95 |
| fur_color_yellow | yellow fur color | creature_anatomy | foreground | high | 0.95 |
| fur_color_blue | blue fur color | creature_anatomy | foreground | high | 0.95 |
| eye_color_blue | blue eyes | creature_anatomy | foreground | high | 0.95 |
| electric_markings | electric markings | creature_anatomy | foreground | high | 0.95 |
| claws_present | claws present | creature_anatomy | foreground | medium | 0.9 |
| standing_pose | standing upright pose | creature_anatomy | foreground | high | 0.9 |
| background_colored_pattern | purple pink gradient background | environment | background | medium | 0.9 |
| electric_energy_effects | electric energy effects | environment | foreground | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card_name_text | card_ui_text | top_center | visible | 0.98 |
| hp_text | card_ui_text | top_right | visible | 0.98 |
| lightning_type_symbol | card_ui_symbol | top_right_next_to_hp | visible | 0.98 |
| attack_name_1_text | card_ui_text | lower_center | visible | 0.95 |
| attack_damage_1_text | card_ui_text | lower_center_right | visible | 0.95 |
| attack_name_2_text | card_ui_text | lower_center_below_attack_1 | visible | 0.95 |
| attack_damage_2_text | card_ui_text | lower_center_right_below_attack_1 | visible | 0.95 |
| weakness_text | card_ui_text | bottom_center_left | visible | 0.95 |
| illustrator_text | card_ui_text | bottom_left | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.98 |
| fact_creature_anatomy_001 | creature_anatomy | primary colors of fur | obs_creature_anatomy_001, obs_creature_anatomy_002, obs_creature_anatomy_003 | 0.95 |
| fact_creature_anatomy_002 | creature_anatomy | eye color | obs_creature_anatomy_004 | 0.95 |
| fact_creature_anatomy_003 | creature_anatomy | has electric markings | obs_creature_anatomy_005 | 0.95 |
| fact_creature_anatomy_004 | creature_anatomy | presence of claws | obs_creature_anatomy_006 | 0.9 |
| fact_creature_anatomy_005 | creature_anatomy | pose orientation | obs_creature_anatomy_007 | 0.9 |
| fact_environment_001 | environment | background color theme | obs_environment_001 | 0.9 |
| fact_environment_002 | environment | electric energy effects present | obs_environment_002 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text visible | obs_card_ui_001 | 0.98 |
| fact_card_ui_and_print_markers_002 | hp text visible | obs_card_ui_002 | 0.98 |
| fact_card_ui_and_print_markers_003 | energy type symbol visible | obs_card_ui_003 | 0.98 |
| fact_card_ui_and_print_markers_004 | attack name 1 text visible | obs_card_ui_004 | 0.95 |
| fact_card_ui_and_print_markers_005 | attack damage 1 text visible | obs_card_ui_005 | 0.95 |
| fact_card_ui_and_print_markers_006 | attack name 2 text visible | obs_card_ui_006 | 0.95 |
| fact_card_ui_and_print_markers_007 | attack damage 2 text visible | obs_card_ui_007 | 0.95 |
| fact_card_ui_and_print_markers_008 | weakness value visible | obs_card_ui_008 | 0.95 |
| fact_card_ui_and_print_markers_009 | illustrator text visible | obs_card_ui_009 | 0.9 |

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
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_009"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": []
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | complete | low | high |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | likely_complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_002 | action | standing | obs_subject_001 | obs_creature_anatomy_007 | upright standing pose full body still | 0.9 |

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
| black fur color | obs_creature_anatomy_001 |
| yellow fur color | obs_creature_anatomy_002 |
| blue fur color | obs_creature_anatomy_003 |
| blue eyes | obs_creature_anatomy_004 |
| electric markings | obs_creature_anatomy_005 |
| claws present | obs_creature_anatomy_006 |
| standing upright pose | obs_creature_anatomy_007 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| lightning | obs_environment_002 | deterministic_rule | 0.9 |
| standing | obs_creature_anatomy_007, obs_subject_001 | deterministic_rule | 0.98 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: Mega Zeraora, black fur color, yellow fur color, blue fur color, blue eyes, electric markings, claws present, standing upright pose. Semantic facts: standing.
- Quality flags: `potential_module_review_conflicts_with_entries`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Zeraora",
      "normalized_label": "Mega Zeraora",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "fur_color_black",
      "normalized_label": "black fur color",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "fur_color_yellow",
      "normalized_label": "yellow fur color",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "fur_color_blue",
      "normalized_label": "blue fur color",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "eye_color_blue",
      "normalized_label": "blue eyes",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "electric_markings",
      "normalized_label": "electric markings",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "claws_present",
      "normalized_label": "claws present",
      "scene_layer": "foreground",
      "frame_position": "hands_and_feet",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "standing_pose",
      "normalized_label": "standing upright pose",
      "scene_layer": "foreground",
      "frame_position": "full_body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "background_colored_pattern",
      "normalized_label": "purple pink gradient background",
      "scene_layer": "background",
      "frame_position": "full_card",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "electric_energy_effects",
      "normalized_label": "electric energy effects",
      "scene_layer": "foreground",
      "frame_position": "surrounding_body",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card_name_text",
      "normalized_label": "メガゼラオラex",
      "scene_layer": "midground",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "hp_text",
      "normalized_label": "270 HP",
      "scene_layer": "midground",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "lightning_type_symbol",
      "normalized_label": "electric type symbol",
      "scene_layer": "midground",
      "frame_position": "top_right_next_to_hp",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "attack_name_1_text",
      "normalized_label": "サンダーフィスト",
      "scene_layer": "midground",
      "frame_position": "lower_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "attack_damage_1_text",
      "normalized_label": "60x",
      "scene_layer": "midground",
      "frame_position": "lower_center_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "attack_name_2_text",
      "normalized_label": "ゼプトターン",
      "scene_layer": "midground",
      "frame_position": "lower_center_below_attack_1",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "attack_damage_2_text",
      "normalized_label": "150",
      "scene_layer": "midground",
      "frame_position": "lower_center_right_below_attack_1",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "card_ui_text",
      "label": "weakness_text",
      "normalized_label": "x2",
      "scene_layer": "midground",
      "frame_position": "bottom_center_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_009",
      "kind": "card_ui_text",
      "label": "illustrator_text",
      "normalized_label": "Illus. Eban Graphics",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
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
      "field_path": "scene_subject.identity",
      "claim": "scene subject identity",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body.color.primary",
      "claim": "primary colors of fur",
      "value": "black, yellow, blue",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001",
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "eye.color",
      "claim": "eye color",
      "value": "blue",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "physical_features.electric_markings",
      "claim": "has electric markings",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.claws",
      "claim": "presence of claws",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "pose orientation",
      "value": "standing upright",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background.color_pattern",
      "claim": "background color theme",
      "value": "purple pink gradient",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "environmental_effects.electric_energy",
      "claim": "electric energy effects present",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "メガゼラオラex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "hp text visible",
      "value": "270 HP",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_type_symbol",
      "claim": "energy type symbol visible",
      "value": "electric",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_name_1",
      "claim": "attack name 1 text visible",
      "value": "サンダーフィスト",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage_1",
      "claim": "attack damage 1 text visible",
      "value": "60x",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_name_2",
      "claim": "attack name 2 text visible",
      "value": "ゼプトターン",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage_2",
      "claim": "attack damage 2 text visible",
      "value": "150",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_text",
      "claim": "weakness value visible",
      "value": "x2",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_009",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "Illus. Eban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_009"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 0.98,
      "anatomy": [
        "claws present",
        "electric markings",
        "eye color blue",
        "fur color black",
        "fur color blue",
        "fur color yellow"
      ],
      "physical_features": [
        "claws",
        "electric markings"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "visible",
        "eyebrows": "visible",
        "face_position": "center",
        "other_visible_evidence": [
          "electric markings"
        ]
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_environment_002",
      "obs_subject_001"
    ],
    "midground": [
      "obs_card_ui_001",
      "obs_card_ui_002",
      "obs_card_ui_003",
      "obs_card_ui_004",
      "obs_card_ui_005",
      "obs_card_ui_006",
      "obs_card_ui_007",
      "obs_card_ui_008",
      "obs_card_ui_009"
    ],
    "background": [
      "obs_environment_001"
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
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [],
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
      "bright",
      "highlighted"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "bright highlights"
    ],
    "composition": [
      "centered subject"
    ],
    "camera_angle": "eye level",
    "framing": "close-up full body",
    "cropping": [
      "none"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [
      "upright pose"
    ],
    "motifs": [
      "electric patterns"
    ],
    "repeated_shapes": [
      "angular shapes"
    ],
    "style_cues": [
      "stylized artwork"
    ],
    "supporting_observation_ids": [
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
        "fact_environment_002"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
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
      "observation_ids": [
        "obs_environment_002"
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
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_009"
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
        "black fur color",
        "yellow fur color",
        "blue fur color",
        "blue eyes",
        "electric markings",
        "claws present",
        "standing upright pose"
      ]
    }
  },
  "module_reviews": [
    {
      "module": "subjects",
      "review_status": "complete",
      "omission_risk": "low",
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
      "review_status": "likely_complete",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "upright standing pose"
        ],
        "body_position": [
          "full body"
        ],
        "motion_state": [
          "still"
        ],
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
      "term": "black fur color",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "yellow fur color",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    },
    {
      "term": "blue fur color",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "blue eyes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "electric markings",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "claws present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ]
    },
    {
      "term": "standing upright pose",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_creature_anatomy_007",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
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

### GV-PK-JPN-M5-114 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.008428`
- Artwork observations: `11`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary | 0.99 |
| body | body | creature_anatomy | foreground | primary | 0.99 |
| head | head | creature_anatomy | foreground | primary | 0.99 |
| eyes | eyes | creature_anatomy | foreground | primary | 0.98 |
| arms | arms | creature_anatomy | foreground | primary | 0.97 |
| claws | claws | creature_anatomy | foreground | primary | 0.96 |
| dark purple flames | dark purple flames | visual_effects | foreground | primary | 0.9 |
| horns | horns | creature_anatomy | foreground | primary | 0.95 |
| dark blacks and greys | dark blacks greys | color_and_light | foreground | primary | 0.99 |
| bright magenta eye glow | magenta eye glow | color_and_light | foreground | primary | 0.97 |
| dark swirling shadowy background | dark swirling shadowy background | environment | background | secondary | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text メガダークライ ex | card_ui_text | top center | visible | 0.99 |
| HP 280 | card_ui_text | top right | visible | 0.99 |
| darkness type symbol | card_ui_symbol | top right near HP | visible | 0.99 |
| 114/081 SAR | card_ui_text | bottom left | visible | 0.96 |
| illus. AKIRA EGAWA | card_ui_text | bottom left | visible | 0.95 |
| M5 set code | card_ui_text | bottom left | visible | 0.95 |
| Japanese attack text below art | card_ui_text | lower part of art | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_body_001 | creature_anatomy | body region visible | obs_creature_anatomy_001 | 0.99 |
| fact_creature_anatomy_head_002 | creature_anatomy | body region visible | obs_creature_anatomy_002 | 0.99 |
| fact_creature_anatomy_eyes_003 | creature_anatomy | eye color | obs_color_002, obs_creature_anatomy_003 | 0.97 |
| fact_creature_anatomy_arms_004 | creature_anatomy | arms visible | obs_creature_anatomy_004, obs_creature_anatomy_005 | 0.97 |
| fact_creature_anatomy_horns_005 | creature_anatomy | horns visible | obs_creature_anatomy_006 | 0.95 |
| fact_visual_effects_001 | visual_effects | dark purple flames surrounding subject | obs_visual_effects_001 | 0.9 |
| fact_color_and_light_001 | color_and_light | dominant body colors | obs_color_001 | 0.99 |
| fact_environment_001 | environment | background setting | obs_environment_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_name_001 | card name text | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_and_print_markers_hp_001 | HP text | obs_card_ui_text_002 | 0.99 |
| fact_card_ui_and_print_markers_type_001 | type symbol | obs_card_ui_symbol_001 | 0.99 |
| fact_card_ui_and_print_markers_set_001 | collector number text | obs_card_ui_text_003 | 0.96 |
| fact_card_ui_and_print_markers_illustrator_001 | illustrator text | obs_card_ui_text_004 | 0.95 |
| fact_card_ui_and_print_markers_set_code_001 | set code text | obs_card_ui_text_005 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_hp_001",
    "fact_card_ui_and_print_markers_illustrator_001",
    "fact_card_ui_and_print_markers_name_001",
    "fact_card_ui_and_print_markers_set_001",
    "fact_card_ui_and_print_markers_set_code_001",
    "fact_card_ui_and_print_markers_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_text_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_text_003"
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
    "obs_card_ui_text_004"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_text_005"
  ]
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
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_002 | state | floating | obs_subject_001 | obs_subject_001 | floating stationary | 0.96 |

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
| dark purple flames | obs_visual_effects_001 |
| magenta glowing eyes | obs_color_002, obs_creature_anatomy_003 |
| floating | obs_subject_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| flame | obs_visual_effects_001 | deterministic_rule | 0.9 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_color_002 | deterministic_rule | 0.97 |
| spiral motif | obs_environment_001 | deterministic_rule | 0.95 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
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
      "visibility": "visible",
      "salience": "primary",
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
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "lower",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "lower",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_effects_001",
      "kind": "visual_effects",
      "label": "dark purple flames",
      "normalized_label": "dark purple flames",
      "scene_layer": "foreground",
      "frame_position": "surrounding subject",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "horns",
      "normalized_label": "horns",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color_and_light",
      "label": "dark blacks and greys",
      "normalized_label": "dark blacks greys",
      "scene_layer": "foreground",
      "frame_position": "full subject",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color_and_light",
      "label": "bright magenta eye glow",
      "normalized_label": "magenta eye glow",
      "scene_layer": "foreground",
      "frame_position": "eyes",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark swirling shadowy background",
      "normalized_label": "dark swirling shadowy background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text メガダークライ ex",
      "normalized_label": "card name text mega darkrai ex",
      "scene_layer": "card_ui",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "HP 280",
      "normalized_label": "hp 280",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "card_ui_symbol",
      "label": "darkness type symbol",
      "normalized_label": "darkness symbol",
      "scene_layer": "card_ui",
      "frame_position": "top right near HP",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "114/081 SAR",
      "normalized_label": "114/081 sar",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "illus. AKIRA EGAWA",
      "normalized_label": "illustrator akira egawa",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "M5 set code",
      "normalized_label": "m5 set code",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "card_ui_text",
      "label": "Japanese attack text below art",
      "normalized_label": "japanese attack text",
      "scene_layer": "card_ui",
      "frame_position": "lower part of art",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "identity",
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
      "field_path": "body_regions.body",
      "claim": "body region visible",
      "value": "body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_head_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "body region visible",
      "value": "head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_eyes_003",
      "module": "creature_anatomy",
      "field_path": "physical_features.eyes",
      "claim": "eye color",
      "value": "bright magenta glow",
      "supporting_observation_ids": [
        "obs_color_002",
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_arms_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "arms visible",
      "value": "arms with claws visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_horns_005",
      "module": "creature_anatomy",
      "field_path": "physical_features.horns",
      "claim": "horns visible",
      "value": "horns present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effects_001",
      "module": "visual_effects",
      "field_path": "effects",
      "claim": "dark purple flames surrounding subject",
      "value": "dark purple flames",
      "supporting_observation_ids": [
        "obs_visual_effects_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "palette.colors",
      "claim": "dominant body colors",
      "value": "dark blacks and greys",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting.background",
      "claim": "background setting",
      "value": "dark swirling shadowy background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガダークライ ex",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "type symbol",
      "value": "darkness",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number text",
      "value": "114/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "illus. AKIRA EGAWA",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "set code text",
      "value": "M5",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
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
        "arms",
        "body",
        "claws",
        "eyes",
        "head",
        "horns"
      ],
      "physical_features": [
        "bright magenta glowing eyes",
        "dark purple flames surrounding"
      ],
      "pose": [
        "floating",
        "upright"
      ],
      "orientation": "forward",
      "action_state": [
        "stationary"
      ],
      "facial_evidence": {
        "eyes": "bright magenta glowing",
        "mouth": "closed",
        "eyebrows": "not visible",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "dark black",
        "grey",
        "magenta"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_color_001",
      "obs_color_002",
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_subject_001",
      "obs_visual_effects_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "dark swirling shadowy background"
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
      "dark black",
      "grey",
      "magenta"
    ],
    "lighting": [
      "spotlight on subject"
    ],
    "shadows": [
      "deep shadows surrounding subject"
    ],
    "highlights": [
      "magenta glow in eyes"
    ],
    "composition": [
      "centralized subject",
      "symmetrical framing"
    ],
    "camera_angle": "frontal",
    "framing": "tight",
    "cropping": [],
    "depth": "medium",
    "motion_cues": [],
    "motifs": [
      "darkness and shadow"
    ],
    "repeated_shapes": [
      "claw shapes",
      "horn shapes"
    ],
    "style_cues": [
      "dark style"
    ],
    "supporting_observation_ids": [
      "obs_color_002",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
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
        "fact_creature_anatomy_arms_004",
        "fact_creature_anatomy_body_001",
        "fact_creature_anatomy_eyes_003",
        "fact_creature_anatomy_head_002",
        "fact_creature_anatomy_horns_005"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "body",
          "visibility": "visible",
          "colors": [
            "dark black",
            "grey"
          ],
          "details": [
            "central body and limbs"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head",
          "visibility": "visible",
          "colors": [
            "dark black"
          ],
          "details": [
            "head with horns and magenta eye glow"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.99
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "eyes",
          "visibility": "visible",
          "colors": [
            "bright magenta"
          ],
          "details": [
            "glowing eyes"
          ],
          "supporting_observation_ids": [
            "obs_color_002",
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "arms and claws",
          "visibility": "visible",
          "colors": [
            "dark black",
            "grey"
          ],
          "details": [
            "arms with claws extending"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004",
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "horns",
          "visibility": "visible",
          "colors": [
            "dark black"
          ],
          "details": [
            "pair of horns on head"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating",
            "upright"
          ],
          "orientation": "forward",
          "action_state": [
            "stationary"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.96
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "dark purple flames",
          "details": [
            "flames around arm and body edges"
          ],
          "supporting_observation_ids": [
            "obs_visual_effects_001"
          ],
          "confidence": 0.9
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
        "fact_color_and_light_001"
      ],
      "observation_ids": [
        "obs_color_001",
        "obs_color_002"
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
        "fact_card_ui_and_print_markers_hp_001",
        "fact_card_ui_and_print_markers_illustrator_001",
        "fact_card_ui_and_print_markers_name_001",
        "fact_card_ui_and_print_markers_set_001",
        "fact_card_ui_and_print_markers_set_code_001",
        "fact_card_ui_and_print_markers_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_text_003"
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
        "obs_card_ui_text_004"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_text_005"
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
        "dark purple flames",
        "magenta glowing eyes",
        "floating"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_002",
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
        "body_language": [],
        "body_position": [
          "floating"
        ],
        "motion_state": [
          "stationary"
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
      "term": "dark purple flames",
      "supporting_observation_ids": [
        "obs_visual_effects_001"
      ]
    },
    {
      "term": "magenta glowing eyes",
      "supporting_observation_ids": [
        "obs_color_002",
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "floating",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_visual_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
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
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_color_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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

### GV-PK-JPN-M5-099 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0092572`
- Artwork observations: `11`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Darkrai. Visible observations: claws, limbs, eye, head plume, spikes on body, green glowing silhouette, high contrast, card interface text symbols. Semantic facts: floating, green glowing background silhouette. Counts: limbs: 4, claws: 4, spikes: many.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Darkrai | darkrai | scene_subject | foreground | primary | 0.99 |
| body | body | creature_anatomy | foreground | primary | 0.99 |
| head | head | creature_anatomy | foreground | primary | 0.99 |
| claws | claws | creature_anatomy | foreground | high | 0.98 |
| limbs | limbs | creature_anatomy | foreground | high | 0.98 |
| eye | eye | creature_anatomy | foreground | high | 0.98 |
| head plume | head plume | creature_anatomy | foreground | high | 0.98 |
| spikes on body | spikes on body | creature_anatomy | foreground | medium | 0.97 |
| green glowing silhouette in background | green glowing silhouette | environment | background | medium | 0.96 |
| high contrast with bright lime green and black | high contrast | visual_design | foreground-background | high | 0.99 |
| card interface text and symbols in Japanese at top and bottom | card interface text symbols | visual_design | interface | high | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text メガダークライex in Japanese at top center | card_ui_text | top-center | visible | 0.99 |
| HP 280 in top right | card_ui_text | top-right | visible | 0.99 |
| attacks and associated text in Japanese below artwork | card_ui_text | lower-center | visible | 0.99 |
| collector number 099/081 at bottom left | card_ui_text | bottom-left | visible | 0.98 |
| set symbol at bottom left near collector number | card_ui_symbol | bottom-left | visible | 0.98 |
| illustrator credit Illus. 5ban Graphics at bottom left | card_ui_text | bottom-left | visible | 0.98 |
| resistance and weakness text and symbols at center bottom area | card_ui_text | bottom-center | visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | body color | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | head color | obs_creature_anatomy_002, obs_creature_anatomy_006 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | eye color | obs_creature_anatomy_005 | 0.98 |
| fact_creature_anatomy_004 | creature_anatomy | limb count | obs_creature_anatomy_004 | 0.98 |
| fact_creature_anatomy_005 | creature_anatomy | claws count | obs_creature_anatomy_003 | 0.97 |
| fact_creature_anatomy_006 | creature_anatomy | spike count | obs_creature_anatomy_007 | 0.96 |
| fact_creature_anatomy_007 | creature_anatomy | pose | obs_subject_001 | 0.99 |
| fact_environment_001 | environment | background details | obs_environment_001 | 0.96 |
| fact_visual_design_001 | color_and_light | palette | obs_creature_anatomy_005, obs_visual_design_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text | obs_card_ui_001 | 0.99 |
| fact_card_ui_002 | HP text | obs_card_ui_002 | 0.99 |
| fact_card_ui_003 | collector number | obs_card_ui_004 | 0.98 |
| fact_card_ui_004 | illustrator text | obs_card_ui_006 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003",
    "fact_card_ui_004"
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
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_006"
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
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | low | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | state | floating | obs_subject_001 | obs_subject_001 | floating pose diagonal orientation floating | 0.98 |
| sem_fact_003 | motif | green glowing background silhouette |  | obs_environment_001 | green glowing silhouette | 0.96 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| limbs | exact | 4 | obs_creature_anatomy_004 | 0.98 |
| claws | exact | 4 | obs_creature_anatomy_003 | 0.97 |
| spikes | many | many | obs_creature_anatomy_007 | 0.96 |

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
| pink eyes | obs_creature_anatomy_005 |
| white head plume | obs_creature_anatomy_006 |
| black body | obs_creature_anatomy_001 |
| green glowing background silhouette | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal orientation | obs_subject_001 | deterministic_rule | 0.99 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_environment_001, obs_visual_design_001 | deterministic_rule | 0.96 |
| green glowing background silhouette | obs_environment_001 | deterministic_rule | 0.96 |
| right orientation | obs_subject_001 | deterministic_rule | 0.99 |
| right-facing | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Darkrai. Visible observations: claws, limbs, eye, head plume, spikes on body, green glowing silhouette, high contrast, card interface text symbols. Semantic facts: floating, green glowing background silhouette. Counts: limbs: 4, claws: 4, spikes: many.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Darkrai",
      "normalized_label": "darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
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
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "left-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "limbs",
      "normalized_label": "limbs",
      "scene_layer": "foreground",
      "frame_position": "center-lower",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "eye",
      "normalized_label": "eye",
      "scene_layer": "foreground",
      "frame_position": "head-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "head plume",
      "normalized_label": "head plume",
      "scene_layer": "foreground",
      "frame_position": "head-top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "spikes on body",
      "normalized_label": "spikes on body",
      "scene_layer": "foreground",
      "frame_position": "body-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "green glowing silhouette in background",
      "normalized_label": "green glowing silhouette",
      "scene_layer": "background",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "visual_design",
      "label": "high contrast with bright lime green and black",
      "normalized_label": "high contrast",
      "scene_layer": "foreground-background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_002",
      "kind": "visual_design",
      "label": "card interface text and symbols in Japanese at top and bottom",
      "normalized_label": "card interface text symbols",
      "scene_layer": "interface",
      "frame_position": "edges",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text メガダークライex in Japanese at top center",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "HP 280 in top right",
      "normalized_label": "HP text",
      "scene_layer": "interface",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "attacks and associated text in Japanese below artwork",
      "normalized_label": "attack text",
      "scene_layer": "interface",
      "frame_position": "lower-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "collector number 099/081 at bottom left",
      "normalized_label": "collector number",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_symbol",
      "label": "set symbol at bottom left near collector number",
      "normalized_label": "set symbol",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "illustrator credit Illus. 5ban Graphics at bottom left",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "resistance and weakness text and symbols at center bottom area",
      "normalized_label": "weakness and resistance",
      "scene_layer": "interface",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "subject identity",
      "value": "Darkrai",
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
      "claim": "body color",
      "value": "black",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "head",
      "claim": "head color",
      "value": "black with white plume",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "eye",
      "claim": "eye color",
      "value": "pink",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "limbs",
      "claim": "limb count",
      "value": "4",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "claws",
      "claim": "claws count",
      "value": "4",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "body_spikes",
      "claim": "spike count",
      "value": "multiple",
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
      "claim": "pose",
      "value": "floating, diagonal orientation, body right-facing",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background details",
      "value": "green glowing humanoid silhouette shape",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "palette",
      "value": "high contrast black, bright lime green, white highlights, pink eye accent",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005",
        "obs_visual_design_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガダークライex",
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
      "claim": "HP text",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "099/081",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Darkrai",
      "identity_confidence": 0.99,
      "anatomy": [
        "body",
        "claws",
        "eye",
        "head",
        "head plume",
        "limbs",
        "spikes on body"
      ],
      "physical_features": [
        "black body",
        "pink eye",
        "white plume on head"
      ],
      "pose": [
        "diagonal orientation",
        "floating",
        "right-facing"
      ],
      "orientation": "right",
      "action_state": [
        "floating"
      ],
      "facial_evidence": {
        "eyes": "open pink eyes",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "right profile",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
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
      "count_id": "count_limbs_001",
      "normalized_label": "limbs",
      "count_type": "exact",
      "exact_count": 4,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "scene_layer": "foreground",
      "confidence": 0.98
    },
    {
      "count_id": "count_claws_001",
      "normalized_label": "claws",
      "count_type": "exact",
      "exact_count": 4,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "scene_layer": "foreground",
      "confidence": 0.97
    },
    {
      "count_id": "count_spikes_001",
      "normalized_label": "spikes",
      "count_type": "many",
      "exact_count": 0,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "scene_layer": "foreground",
      "confidence": 0.96
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
      "obs_creature_anatomy_007",
      "obs_subject_001",
      "obs_visual_design_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract background"
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "lime green",
      "pink",
      "white"
    ],
    "lighting": [
      "bright highlights on plume and spikes"
    ],
    "shadows": [
      "dark body with shadowed areas"
    ],
    "highlights": [
      "white highlights on head plume"
    ],
    "composition": [
      "subject centered, floating dynamically"
    ],
    "camera_angle": "slightly diagonal",
    "framing": "tight framing on subject",
    "cropping": [],
    "depth": "visible mid and background layers",
    "motion_cues": [
      "floating pose"
    ],
    "motifs": [
      "darkness and light contrast"
    ],
    "repeated_shapes": [
      "claws",
      "spikes"
    ],
    "style_cues": [
      "contrast colors",
      "digital art",
      "style",
      "sharp edges"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
      "obs_environment_001",
      "obs_subject_001",
      "obs_visual_design_001"
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
        "fact_creature_anatomy_006",
        "fact_creature_anatomy_007"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head plume",
          "visibility": "visible",
          "colors": [
            "white"
          ],
          "details": [
            "distinct white plume curling"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.98
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eye",
          "feature": "eye color",
          "visibility": "visible",
          "colors": [
            "pink"
          ],
          "details": [
            "bright pink iris"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.98
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal orientation",
            "floating"
          ],
          "orientation": "right",
          "action_state": [
            "floating"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.99
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
        "fact_card_ui_004"
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
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_006"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_claws_001",
        "count_limbs_001",
        "count_spikes_001"
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
        "pink eyes",
        "white head plume",
        "black body",
        "green glowing background silhouette"
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
          "floating pose"
        ],
        "body_position": [
          "diagonal orientation"
        ],
        "motion_state": [
          "floating"
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
      "semantic_fact_id": "sem_fact_003",
      "category": "motif",
      "label": "green glowing background silhouette",
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
          "green glowing silhouette"
        ],
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
      "term": "floating",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "pink eyes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "white head plume",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ]
    },
    {
      "term": "black body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "green glowing background silhouette",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_visual_design_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "green glowing background silhouette",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right-facing",
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

### GV-PK-JPN-M5-097 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.0118208`
- Artwork observations: `10`
- Card UI / print-marker observations: `11`
- Card UI module evidence references: `9`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | main_subject | 0.99 |
| lantern-shaped body with flame inside | lantern body | creature_anatomy | foreground | main_subject_detail | 0.98 |
| four curved chandelier arms ending in blue to gold flames | four flame arms | creature_anatomy | foreground | main_subject_detail | 0.98 |
| flames at arms and top section | multiple flaming parts | creature_anatomy | foreground | main_subject_detail | 0.95 |
| black-and-gold crown on top of body | black gold crown | creature_anatomy | foreground | main_subject_detail | 0.97 |
| spiral arm extending from lantern body | spiral arm | creature_anatomy | foreground | main_subject_detail | 0.96 |
| face located on front of lantern body | face front lantern | creature_anatomy | foreground | main_subject_feature | 0.95 |
| floating pose | floating pose | creature_anatomy | foreground | main_subject_pose | 0.99 |
| color palette includes purple, black, gold, blue, and pink | purple black gold blue pink palette | color_and_light | foreground | color_palette | 0.99 |
| abstract vibrant blue and pink background with swirls | abstract vibrant blue pink background | environment | background | background | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name 'メガシャンデラex' visible in yellow and black font on top center | card_ui_text | top_center | fully_visible | 0.98 |
| HP 350 with psychic energy symbol at top right | hp_text | top_right | fully_visible | 0.98 |
| Psychic energy symbol near top right by HP | card_ui_symbol | top_right | fully_visible | 0.99 |
| Lantern evolution symbol top left corner | card_ui_symbol | top_left | fully_visible | 0.97 |
| Water weakness symbol with x2 multiplier | card_ui_symbol | bottom_left | fully_visible | 0.96 |
| Fighting resistance symbol with -30 modifier | card_ui_symbol | bottom_left | fully_visible | 0.96 |
| Two colorless energy retreat cost | card_ui_symbol | bottom_right | fully_visible | 0.95 |
| Illustrator text '5ban Graphics' bottom left corner above card number | illustrator_text | bottom_left | fully_visible | 0.97 |
| Card number 097/081 SR in bottom left | collector_number | bottom_left | fully_visible | 0.97 |
| Set mark 'J M5' below illustrator text | set_symbol | bottom_left | fully_visible | 0.97 |
| Small copyright text at bottom edge | bottom_line_text | bottom | partially_visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | The main Pokemon shown is Mega Chandelure | obs_subject_001 | 0.99 |
| fact_creature_body_001 | creature_anatomy | The body is lantern-shaped with a visible flame inside | obs_creature_anatomy_body_001 | 0.98 |
| fact_creature_arms_001 | creature_anatomy | There are four curved chandelier arms ending in blue to gold flames | obs_creature_anatomy_arms_001 | 0.98 |
| fact_creature_flames_001 | creature_anatomy | Flames are visible on arms and top sections | obs_creature_anatomy_flaming_tails_001 | 0.95 |
| fact_creature_crown_001 | creature_anatomy | A black-and-gold crown adorns the top of the body | obs_creature_anatomy_crown_001 | 0.97 |
| fact_creature_spiral_arm_001 | creature_anatomy | A spiral arm extends from the lantern body | obs_creature_anatomy_spiral_arm_001 | 0.96 |
| fact_creature_face_position_001 | creature_anatomy | Face is located on front of the lantern body | obs_creature_anatomy_face_position_001 | 0.95 |
| fact_creature_pose_001 | creature_anatomy | Mega Chandelure is floating in the artwork | obs_creature_anatomy_flying_001 | 0.99 |
| fact_color_palette_001 | color_and_light | The artwork color palette includes purple, black, gold, blue, and pink | obs_color_palette_001 | 0.99 |
| fact_environment_background_001 | environment | The artwork background is an abstract vibrant blue and pink swirl pattern | obs_artwork_background_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | Card name text 'メガシャンデラex' is visible in yellow and black on top center | obs_card_ui_name_001 | 0.98 |
| fact_card_ui_hp_001 | HP value is 350 with psychic energy symbol top right | obs_card_ui_energy_symbol_001, obs_card_ui_hp_001 | 0.98 |
| fact_card_ui_evolution_symbol_001 | Evolution symbol indicating lantern evolution is visible at top left corner | obs_card_ui_type_icon_001 | 0.97 |
| fact_card_ui_weakness_001 | Weakness symbol is water with x2 multiplier at bottom left | obs_card_ui_weakness_001 | 0.96 |
| fact_card_ui_resistance_001 | Resistance symbol is fighting with -30 modifier at bottom left | obs_card_ui_resistance_001 | 0.96 |
| fact_card_ui_retreat_cost_001 | Retreat cost is two colorless energies at bottom right | obs_card_ui_retreat_cost_001 | 0.95 |
| fact_card_ui_illustrator_001 | Illustrator text '5ban Graphics' is visible bottom left | obs_card_ui_illustrator_001 | 0.97 |
| fact_card_ui_card_number_001 | Card number '097/081 SR' visible bottom left | obs_card_ui_setnumber_001 | 0.97 |
| fact_card_ui_set_mark_001 | Set mark 'J M5' is visible bottom left | obs_card_ui_set_mark_001 | 0.97 |
| fact_card_ui_copyright_001 | Small copyright text is visible along bottom edge with partial legibility | obs_card_ui_bottom_line_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_card_number_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_evolution_symbol_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_resistance_001",
    "fact_card_ui_retreat_cost_001",
    "fact_card_ui_set_mark_001",
    "fact_card_ui_weakness_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_setnumber_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_mark_001",
    "obs_card_ui_type_icon_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_line_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_line_001"
  ],
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
| environment | complete | low | high |  |
| composition | complete | low | high |  |
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
| semfact_pose_001 | state | floating | obs_subject_001 | obs_creature_anatomy_flying_001 | face visible floating pose floating floating | 0.99 |

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
| lantern shaped body | obs_creature_anatomy_body_001 |
| floating | obs_creature_anatomy_flying_001, obs_subject_001 |
| purple gold color palette | obs_color_palette_001 |
| four flame arms | obs_creature_anatomy_arms_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| flame | obs_creature_anatomy_arms_001 | deterministic_rule | 0.98 |
| floating | obs_creature_anatomy_flying_001, obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_creature_anatomy_face_position_001 | deterministic_rule | 0.95 |
| spiral motif | obs_creature_anatomy_spiral_arm_001 | deterministic_rule | 0.96 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Semantic facts: floating.
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
      "visibility": "fully_visible",
      "salience": "main_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_body_001",
      "kind": "creature_anatomy",
      "label": "lantern-shaped body with flame inside",
      "normalized_label": "lantern body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "main_subject_detail",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_arms_001",
      "kind": "creature_anatomy",
      "label": "four curved chandelier arms ending in blue to gold flames",
      "normalized_label": "four flame arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "main_subject_detail",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_flaming_tails_001",
      "kind": "creature_anatomy",
      "label": "flames at arms and top section",
      "normalized_label": "multiple flaming parts",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "main_subject_detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_crown_001",
      "kind": "creature_anatomy",
      "label": "black-and-gold crown on top of body",
      "normalized_label": "black gold crown",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "main_subject_detail",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_spiral_arm_001",
      "kind": "creature_anatomy",
      "label": "spiral arm extending from lantern body",
      "normalized_label": "spiral arm",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "main_subject_detail",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_face_position_001",
      "kind": "creature_anatomy",
      "label": "face located on front of lantern body",
      "normalized_label": "face front lantern",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "main_subject_feature",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_flying_001",
      "kind": "creature_anatomy",
      "label": "floating pose",
      "normalized_label": "floating pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "main_subject_pose",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_palette_001",
      "kind": "color_and_light",
      "label": "color palette includes purple, black, gold, blue, and pink",
      "normalized_label": "purple black gold blue pink palette",
      "scene_layer": "foreground",
      "frame_position": "full_card",
      "visibility": "fully_visible",
      "salience": "color_palette",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_background_001",
      "kind": "environment",
      "label": "abstract vibrant blue and pink background with swirls",
      "normalized_label": "abstract vibrant blue pink background",
      "scene_layer": "background",
      "frame_position": "full_card",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name 'メガシャンデラex' visible in yellow and black font on top center",
      "normalized_label": "card_name_text",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 350 with psychic energy symbol at top right",
      "normalized_label": "hp_350_psychic_symbol",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_001",
      "kind": "card_ui_symbol",
      "label": "Psychic energy symbol near top right by HP",
      "normalized_label": "psychic_energy_symbol",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "ui_symbol",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_icon_001",
      "kind": "card_ui_symbol",
      "label": "Lantern evolution symbol top left corner",
      "normalized_label": "evolution_symbol_lantern",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "ui_symbol",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_001",
      "kind": "card_ui_symbol",
      "label": "Water weakness symbol with x2 multiplier",
      "normalized_label": "water_weakness_symbol",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_symbol",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_resistance_001",
      "kind": "card_ui_symbol",
      "label": "Fighting resistance symbol with -30 modifier",
      "normalized_label": "fighting_resistance_symbol",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_symbol",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_retreat_cost_001",
      "kind": "card_ui_symbol",
      "label": "Two colorless energy retreat cost",
      "normalized_label": "two_colorless_retreat_cost",
      "scene_layer": "ui",
      "frame_position": "bottom_right",
      "visibility": "fully_visible",
      "salience": "ui_symbol",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator text '5ban Graphics' bottom left corner above card number",
      "normalized_label": "illustrator_text_5ban_graphics",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_setnumber_001",
      "kind": "collector_number",
      "label": "Card number 097/081 SR in bottom left",
      "normalized_label": "card_number_097_081_SR",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_mark_001",
      "kind": "set_symbol",
      "label": "Set mark 'J M5' below illustrator text",
      "normalized_label": "set_mark_J_M5",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_symbol",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_line_001",
      "kind": "bottom_line_text",
      "label": "Small copyright text at bottom edge",
      "normalized_label": "copyright_line_bottom_edge",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "partially_visible",
      "salience": "ui_text",
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "The main Pokemon shown is Mega Chandelure",
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
      "field_path": "body_regions.body",
      "claim": "The body is lantern-shaped with a visible flame inside",
      "value": "lantern-shaped body with flame",
      "supporting_observation_ids": [
        "obs_creature_anatomy_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_arms_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "There are four curved chandelier arms ending in blue to gold flames",
      "value": "four curved arms with flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_arms_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_flames_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.flaming_parts",
      "claim": "Flames are visible on arms and top sections",
      "value": "flames at arms and top section",
      "supporting_observation_ids": [
        "obs_creature_anatomy_flaming_tails_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_crown_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.crown",
      "claim": "A black-and-gold crown adorns the top of the body",
      "value": "black-and-gold crown on top",
      "supporting_observation_ids": [
        "obs_creature_anatomy_crown_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_spiral_arm_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "A spiral arm extends from the lantern body",
      "value": "spiral arm",
      "supporting_observation_ids": [
        "obs_creature_anatomy_spiral_arm_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_face_position_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.face_position",
      "claim": "Face is located on front of the lantern body",
      "value": "face on front lantern body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_face_position_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.pose",
      "claim": "Mega Chandelure is floating in the artwork",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_creature_anatomy_flying_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_palette_001",
      "module": "color_and_light",
      "field_path": "palette.colors",
      "claim": "The artwork color palette includes purple, black, gold, blue, and pink",
      "value": "purple, black, gold, blue, pink",
      "supporting_observation_ids": [
        "obs_color_palette_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "The artwork background is an abstract vibrant blue and pink swirl pattern",
      "value": "abstract vibrant blue and pink background",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text 'メガシャンデラex' is visible in yellow and black on top center",
      "value": "メガシャンデラex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value is 350 with psychic energy symbol top right",
      "value": "350 HP psychic",
      "supporting_observation_ids": [
        "obs_card_ui_energy_symbol_001",
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_evolution_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Evolution symbol indicating lantern evolution is visible at top left corner",
      "value": "lantern evolution symbol",
      "supporting_observation_ids": [
        "obs_card_ui_type_icon_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_weakness_001",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_symbol",
      "claim": "Weakness symbol is water with x2 multiplier at bottom left",
      "value": "water x2 weakness",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_resistance_001",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_symbol",
      "claim": "Resistance symbol is fighting with -30 modifier at bottom left",
      "value": "fighting -30 resistance",
      "supporting_observation_ids": [
        "obs_card_ui_resistance_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_retreat_cost_001",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "Retreat cost is two colorless energies at bottom right",
      "value": "two colorless retreat cost",
      "supporting_observation_ids": [
        "obs_card_ui_retreat_cost_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text '5ban Graphics' is visible bottom left",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_card_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Card number '097/081 SR' visible bottom left",
      "value": "097/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_setnumber_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set mark 'J M5' is visible bottom left",
      "value": "J M5 set mark",
      "supporting_observation_ids": [
        "obs_card_ui_set_mark_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "Small copyright text is visible along bottom edge with partial legibility",
      "value": "copyright text bottom edge",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_line_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Chandelure",
      "identity_confidence": 0.99,
      "anatomy": [
        "black-and-gold crown",
        "face on front body",
        "flames on arms and top",
        "four chandelier arms",
        "lantern-shaped body",
        "spiral arm"
      ],
      "physical_features": [
        "crown",
        "flames"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "cannot determine",
        "mouth": "cannot determine",
        "eyebrows": "cannot determine",
        "face_position": "front of lantern body",
        "other_visible_evidence": [
          "face visible"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
        "gold",
        "pink",
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
      "obs_card_ui_bottom_line_001",
      "obs_card_ui_energy_symbol_001",
      "obs_card_ui_hp_001",
      "obs_card_ui_illustrator_001",
      "obs_card_ui_name_001",
      "obs_card_ui_resistance_001",
      "obs_card_ui_retreat_cost_001",
      "obs_card_ui_set_mark_001",
      "obs_card_ui_setnumber_001",
      "obs_card_ui_type_icon_001",
      "obs_card_ui_weakness_001",
      "obs_color_palette_001",
      "obs_creature_anatomy_arms_001",
      "obs_creature_anatomy_body_001",
      "obs_creature_anatomy_crown_001",
      "obs_creature_anatomy_face_position_001",
      "obs_creature_anatomy_flaming_tails_001",
      "obs_creature_anatomy_flying_001",
      "obs_creature_anatomy_spiral_arm_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_artwork_background_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract background"
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
      "obs_artwork_background_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "gold",
      "pink",
      "purple"
    ],
    "lighting": [
      "highlight on crown and flames"
    ],
    "shadows": [
      "dark shading on lantern body"
    ],
    "highlights": [
      "golden highlights on arms and crown"
    ],
    "composition": [
      "central subject with swirling background"
    ],
    "camera_angle": "frontal",
    "framing": "tight on subject",
    "cropping": [],
    "depth": "shallow",
    "motion_cues": [],
    "motifs": [
      "chandelier",
      "flames",
      "lantern"
    ],
    "repeated_shapes": [
      "flame shapes",
      "spirals on arms"
    ],
    "style_cues": [
      "bright saturated colors",
      "digital illustration"
    ],
    "supporting_observation_ids": [
      "obs_artwork_background_001",
      "obs_color_palette_001",
      "obs_creature_anatomy_arms_001",
      "obs_creature_anatomy_crown_001",
      "obs_creature_anatomy_flaming_tails_001"
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
        "fact_creature_arms_001",
        "fact_creature_body_001",
        "fact_creature_crown_001",
        "fact_creature_face_position_001",
        "fact_creature_flames_001",
        "fact_creature_pose_001",
        "fact_creature_spiral_arm_001"
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
        "obs_artwork_background_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_environment_background_001"
      ],
      "observation_ids": [
        "obs_artwork_background_001"
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
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_card_number_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_evolution_symbol_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_resistance_001",
        "fact_card_ui_retreat_cost_001",
        "fact_card_ui_set_mark_001",
        "fact_card_ui_weakness_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_setnumber_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_mark_001",
        "obs_card_ui_type_icon_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_line_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_line_001"
      ],
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
        "lantern shaped body",
        "floating",
        "purple gold color palette",
        "four flame arms"
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
      "semantic_fact_id": "semfact_pose_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_anatomy_flying_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [
          "face visible"
        ],
        "body_language": [
          "floating pose"
        ],
        "body_position": [
          "floating"
        ],
        "motion_state": [
          "floating"
        ],
        "environment": [],
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
      "term": "lantern shaped body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_body_001"
      ]
    },
    {
      "term": "floating",
      "supporting_observation_ids": [
        "obs_creature_anatomy_flying_001",
        "obs_subject_001"
      ]
    },
    {
      "term": "purple gold color palette",
      "supporting_observation_ids": [
        "obs_color_palette_001"
      ]
    },
    {
      "term": "four flame arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_arms_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_arms_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_anatomy_flying_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_face_position_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_creature_anatomy_spiral_arm_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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

### GV-PK-JPN-M5-063 - メガドリュウズex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.97`
- Attribute confidence: `0.96`
- Cost USD: `0.0101776`
- Artwork observations: `6`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Steel-type Pokemon with drill horn. Visible observations: steel-type pokemon, large drill horn, armored face with eyes, two large drill arms, gray silver armored body, explosive background shards. Counts: steel energy symbol: 5.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Steel-type Pokemon with large drill horn and armored body | steel-type pokemon | scene_subject | foreground | high | 0.99 |
| Large metallic drill horn on head with orange and silver spiral pattern | large drill horn | object | foreground | high | 0.98 |
| Armored face with eyes visible, red markings near eyes, mouth visible with stern expression | armored face with eyes | object | foreground | high | 0.98 |
| Two large silver drill-like arms positioned forward | two large drill arms | object | foreground | high | 0.97 |
| Dark gray and silver armor plating with yellow and red lightning-like background streaks | gray silver armored body | object | foreground | high | 0.96 |
| Background with bright yellow and red gradient lighting and broken explosive shards | explosive background shards | object | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text in Japanese メガドリュウズex | card_name_text | top center | fully_visible | 1 |
| HP 340 text in top right corner | hp_text | top right | fully_visible | 1 |
| Two steel energy cost symbols for first attack | card_ui_symbol | mid left | fully_visible | 1 |
| Three steel energy cost symbols for second attack | card_ui_symbol | mid center | fully_visible | 1 |
| Illustrator text: Illus. Keisuke Azuma in bottom left | illustrator_text | bottom left | fully_visible | 1 |
| Collector number 063/081 RR in bottom left | collector_number | bottom left | fully_visible | 1 |
| Copyright text ©2026 Pokemon/Nintendo/Creatures/GAME FREAK | copyright_text | bottom | fully_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | head horn large metallic drill shaped with orange and silver spiral pattern | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | armored face with visible eyes and red markings | obs_creature_anatomy_002 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | two large silver drill shaped arms | obs_creature_anatomy_003 | 0.97 |
| fact_creature_anatomy_004 | creature_anatomy | dark gray and silver armor plating body with yellow and red background lighting | obs_creature_anatomy_004, obs_environment_001 | 0.96 |
| fact_environment_001 | environment | background with yellow and red explosive shard lighting | obs_environment_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text visible in Japanese | obs_card_ui_001 | 1 |
| fact_card_ui_002 | HP is 340 | obs_card_ui_002 | 1 |
| fact_card_ui_003 | first attack cost two steel energy symbols | obs_card_ui_003 | 1 |
| fact_card_ui_004 | second attack cost three steel energy symbols | obs_card_ui_004 | 1 |
| fact_card_ui_005 | illustrator is Keisuke Azuma | obs_card_ui_005 | 1 |
| fact_card_ui_006 | collector number 063/081 RR | obs_card_ui_006 | 1 |
| fact_card_ui_007 | copyright linevisible with ©2026 Pokemon/Nintendo/Creatures/GAME FREAK | obs_card_ui_007 | 1 |

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
    "obs_card_ui_006"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_006"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_007"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003",
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
| subjects | complete | none | high |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | partial_due_to_crop | medium | medium |  |
| color_and_light | complete | low | high |  |
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
| steel energy symbol | exact | 5 | obs_card_ui_003, obs_card_ui_004 | 1 |

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
| large drill horn | obs_creature_anatomy_001 |
| steel-type pokemon | obs_subject_001 |
| metallic drill arms | obs_creature_anatomy_003 |
| red markings eye | obs_creature_anatomy_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| explosion | obs_environment_001 | deterministic_rule | 0.95 |
| facing front-right | obs_subject_001 | deterministic_rule | 0.99 |
| static | obs_subject_001 | deterministic_rule | 0.99 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |
| upward-right orientation | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Steel-type Pokemon with drill horn. Visible observations: steel-type pokemon, large drill horn, armored face with eyes, two large drill arms, gray silver armored body, explosive background shards. Counts: steel energy symbol: 5.
- Quality flags: `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Steel-type Pokemon with large drill horn and armored body",
      "normalized_label": "steel-type pokemon",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "object",
      "label": "Large metallic drill horn on head with orange and silver spiral pattern",
      "normalized_label": "large drill horn",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "object",
      "label": "Armored face with eyes visible, red markings near eyes, mouth visible with stern expression",
      "normalized_label": "armored face with eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "object",
      "label": "Two large silver drill-like arms positioned forward",
      "normalized_label": "two large drill arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "object",
      "label": "Dark gray and silver armor plating with yellow and red lightning-like background streaks",
      "normalized_label": "gray silver armored body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "object",
      "label": "Background with bright yellow and red gradient lighting and broken explosive shards",
      "normalized_label": "explosive background shards",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_name_text",
      "label": "Card name text in Japanese メガドリュウズex",
      "normalized_label": "card name megadoryuuzu ex",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 340 text in top right corner",
      "normalized_label": "hp 340",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "Two steel energy cost symbols for first attack",
      "normalized_label": "steel energy symbols",
      "scene_layer": "foreground",
      "frame_position": "mid left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_symbol",
      "label": "Three steel energy cost symbols for second attack",
      "normalized_label": "steel energy symbols",
      "scene_layer": "foreground",
      "frame_position": "mid center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "illustrator_text",
      "label": "Illustrator text: Illus. Keisuke Azuma in bottom left",
      "normalized_label": "illustrator keisuke azuma",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "collector_number",
      "label": "Collector number 063/081 RR in bottom left",
      "normalized_label": "collector number 063/081",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "copyright_text",
      "label": "Copyright text ©2026 Pokemon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright 2026 pokemon nintendo creatures game freak",
      "scene_layer": "foreground",
      "frame_position": "bottom",
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
      "claim": "scene subject identity",
      "value": "Mega Steel-type Pokemon with drill horn",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.head.horn",
      "claim": "head horn large metallic drill shaped with orange and silver spiral pattern",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.head.face",
      "claim": "armored face with visible eyes and red markings",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms.forearm.drill_shape",
      "claim": "two large silver drill shaped arms",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.body_coloration",
      "claim": "dark gray and silver armor plating body with yellow and red background lighting",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_environment_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background.lighting_and_colors",
      "claim": "background with yellow and red explosive shard lighting",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible in Japanese",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP is 340",
      "value": "340",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_costs.attack_1",
      "claim": "first attack cost two steel energy symbols",
      "value": "steel, steel",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_costs.attack_2",
      "claim": "second attack cost three steel energy symbols",
      "value": "steel, steel",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator is Keisuke Azuma",
      "value": "Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number 063/081 RR",
      "value": "063/081 RR",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright linevisible with ©2026 Pokemon/Nintendo/Creatures/GAME FREAK",
      "value": "©2026 Pokemon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Steel-type Pokemon with drill horn",
      "identity_confidence": 0.99,
      "anatomy": [
        "armored face",
        "dark gray and silver armored body",
        "large drill horn on head",
        "two drill shaped arms"
      ],
      "physical_features": [
        "red markings near eyes"
      ],
      "pose": [
        "facing front-right",
        "upright"
      ],
      "orientation": "upward-right",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "visible, stern",
        "eyebrows": "not visible",
        "face_position": "frontal, center",
        "other_visible_evidence": [
          "red markings near eyes"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "gray",
        "orange",
        "red",
        "silver",
        "yellow"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "steel energy symbol",
      "count_type": "exact",
      "exact_count": 5,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_card_ui_003",
        "obs_card_ui_004"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_card_ui_001",
      "obs_card_ui_002",
      "obs_card_ui_003",
      "obs_card_ui_004",
      "obs_card_ui_005",
      "obs_card_ui_006",
      "obs_card_ui_007",
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
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
      "obs_environment_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark gray",
      "orange",
      "red",
      "silver",
      "yellow"
    ],
    "lighting": [
      "bright",
      "explosive highlights"
    ],
    "shadows": [
      "soft shadows on armor plates"
    ],
    "highlights": [
      "metallic sheen on drills and armor"
    ],
    "composition": [
      "central subject",
      "diagonal orientation",
      "foreground sharp focus"
    ],
    "camera_angle": "eye-level",
    "framing": "tight crop on Pokemon figure",
    "cropping": [
      "bottom right cut on drill arm"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "drill",
      "explosive energy",
      "mechanical"
    ],
    "repeated_shapes": [
      "drill cones"
    ],
    "style_cues": [
      "lighting",
      "realistic metallic texture"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_003",
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
        "fact_creature_anatomy_001",
        "fact_creature_anatomy_002",
        "fact_creature_anatomy_003",
        "fact_creature_anatomy_004"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "horn",
          "visibility": "fully_visible",
          "colors": [
            "orange",
            "silver"
          ],
          "details": [
            "large",
            "metallic",
            "spiral patterned"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.98
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "eyes",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "white"
          ],
          "details": [
            "red markings near eyes",
            "visible"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "drill-shaped forearms",
          "visibility": "fully_visible",
          "colors": [
            "silver"
          ],
          "details": [
            "two large drills"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.97
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "static",
            "upright"
          ],
          "orientation": "upward-right",
          "action_state": [
            "static"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.99
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
        "obs_card_ui_006"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_006"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_007"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003",
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
        "large drill horn",
        "steel-type pokemon",
        "metallic drill arms",
        "red markings eye"
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
      "review_status": "partial_due_to_crop",
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
      "term": "large drill horn",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "steel-type pokemon",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "metallic drill arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "red markings eye",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "facing front-right",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "static",
        "source_observation_ids": [
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
      },
      {
        "concept": "upward-right orientation",
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
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0073416`
- Artwork observations: `6`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: human female child. Visible observations: human female child, hair, one-piece swimsuit, swimming pool interior, wristband, hair tie. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human female child | human female child | scene_subject | foreground | high | 0.99 |
| hair | hair | human_appearance | foreground | high | 0.99 |
| one-piece swimsuit | one-piece swimsuit | clothing | foreground | high | 0.99 |
| swimming pool interior | swimming pool interior | environment | background | medium | 0.98 |
| black wristband on right wrist | wristband | clothing | foreground | medium | 0.95 |
| black hair tie | hair tie | clothing | foreground | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text 'カスミの元気' | card_ui_text | top | visible | 0.98 |
| top left red text 'サポート' | card_ui_text | top left | visible | 0.97 |
| top right gray text 'トレーナーズ' | card_ui_text | top right | visible | 0.97 |
| bottom text in white oval | card_ui_text | bottom center | visible | 0.95 |
| bottom copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK' | card_ui_text | bottom | visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair style | obs_clothing_accessory_002, obs_hair_001 | 0.98 |
| fact_clothing_001 | clothing | garment type | obs_clothing_001 | 0.99 |
| fact_clothing_002 | clothing | wrist accessory | obs_clothing_accessory_001 | 0.95 |
| fact_environment_001 | environment | setting | obs_environment_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 0.98 |
| fact_card_ui_support_001 | card type text | obs_card_ui_text_002 | 0.97 |
| fact_card_ui_trainer_001 | card subtype text | obs_card_ui_text_003 | 0.97 |
| fact_card_ui_text_001 | bottom ability text area | obs_card_ui_text_004 | 0.95 |
| fact_card_ui_copyright_001 | copyright text | obs_card_ui_text_005 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_copyright_001",
    "fact_card_ui_name_001",
    "fact_card_ui_support_001",
    "fact_card_ui_text_001",
    "fact_card_ui_trainer_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
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
| human_appearance | complete | low | high |  |
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | complete | low | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | action | standing | obs_subject_001 | obs_subject_001 | open smiling open neutral left arm bent backward right arm bent forward with fist standing indoor swimming pool black wristband on right wrist blue one-piece swimsuit orange hair tied with black hair tie | 0.98 |

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
| swimming pool | obs_environment_001 |
| one-piece swimsuit | obs_clothing_001 |
| orange hair ponytail | obs_clothing_accessory_002, obs_hair_001 |
| black wristband | obs_clothing_accessory_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.5 |
| left arm bent backward | obs_subject_001 | deterministic_rule | 0.5 |
| right arm bent forward with fist | obs_subject_001 | deterministic_rule | 0.5 |
| standing | obs_subject_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human female child. Visible observations: human female child, hair, one-piece swimsuit, swimming pool interior, wristband, hair tie. Semantic facts: standing.
- Quality flags: `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human female child",
      "normalized_label": "human female child",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "hair",
      "normalized_label": "hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "one-piece swimsuit",
      "normalized_label": "one-piece swimsuit",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "swimming pool interior",
      "normalized_label": "swimming pool interior",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text 'カスミの元気'",
      "normalized_label": "card name text",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "top left red text 'サポート'",
      "normalized_label": "card type text",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "top right gray text 'トレーナーズ'",
      "normalized_label": "card subtype text",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "bottom text in white oval",
      "normalized_label": "ability text area",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "bottom copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK'",
      "normalized_label": "copyright text",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_accessory_001",
      "kind": "clothing",
      "label": "black wristband on right wrist",
      "normalized_label": "wristband",
      "scene_layer": "foreground",
      "frame_position": "right wrist",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_accessory_002",
      "kind": "clothing",
      "label": "black hair tie",
      "normalized_label": "hair tie",
      "scene_layer": "foreground",
      "frame_position": "hair tie",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "scene subject",
      "value": "human female child",
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
      "claim": "hair style",
      "value": "orange hair tied to side with hair tie",
      "supporting_observation_ids": [
        "obs_clothing_accessory_002",
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment type",
      "value": "one-piece swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "wrist accessory",
      "value": "black wristband on right wrist",
      "supporting_observation_ids": [
        "obs_clothing_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "setting",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "カスミの元気",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_support_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker_observation_ids[0]",
      "claim": "card type text",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_trainer_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker_observation_ids[1]",
      "claim": "card subtype text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[0]",
      "claim": "bottom ability text area",
      "value": "text inside white oval",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human female child",
      "identity_confidence": 0.5,
      "anatomy": [],
      "physical_features": [
        "orange hair"
      ],
      "pose": [
        "left arm bent backward",
        "right arm bent forward with fist"
      ],
      "orientation": "forward",
      "action_state": [
        "standing"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "open smiling",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black hair tie",
        "black wristband",
        "one-piece swimsuit blue"
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
      "obs_clothing_accessory_001",
      "obs_clothing_accessory_002",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "pool tiles"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "pool railings",
      "swimming pool structure"
    ],
    "water": [
      "pool water"
    ],
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
      "light blue",
      "orange",
      "white"
    ],
    "lighting": [
      "bright even lighting"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "hair highlights"
    ],
    "composition": [
      "centered subject",
      "close-up portrait"
    ],
    "camera_angle": "eye level",
    "framing": "tight crop",
    "cropping": [
      "bottom cropped at waist"
    ],
    "depth": "shallow",
    "motion_cues": [
      "subject running arm motion"
    ],
    "motifs": [
      "water sparkle effects"
    ],
    "repeated_shapes": [
      "star-like sparkles"
    ],
    "style_cues": [],
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
          "label": "orange hair tied to side",
          "details": [
            "large spiky ponytail tied with black hair tie"
          ],
          "supporting_observation_ids": [
            "obs_clothing_accessory_002",
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
          "body_area": "torso",
          "garment": "one-piece swimsuit",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "simple design"
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
          "label": "black wristband",
          "details": [
            "on right wrist"
          ],
          "supporting_observation_ids": [
            "obs_clothing_accessory_001"
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
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_copyright_001",
        "fact_card_ui_name_001",
        "fact_card_ui_support_001",
        "fact_card_ui_text_001",
        "fact_card_ui_trainer_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
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
        "swimming pool",
        "one-piece swimsuit",
        "orange hair ponytail",
        "black wristband"
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
      "omission_risk": "low",
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
      "omission_risk": "low",
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
      "review_status": "not_applicable",
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
      "semantic_fact_id": "semfact_001",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [
          "open smiling"
        ],
        "eyes": [
          "open"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [],
        "body_language": [
          "left arm bent backward",
          "right arm bent forward with fist"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [],
        "environment": [
          "indoor swimming pool"
        ],
        "objects": [],
        "relationships": [],
        "other": [
          "black wristband on right wrist",
          "blue one-piece swimsuit",
          "orange hair tied with black hair tie"
        ]
      },
      "confidence": 0.98,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "one-piece swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "orange hair ponytail",
      "supporting_observation_ids": [
        "obs_clothing_accessory_002",
        "obs_hair_001"
      ]
    },
    {
      "term": "black wristband",
      "supporting_observation_ids": [
        "obs_clothing_accessory_001"
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
        "confidence": 0.5
      },
      {
        "concept": "left arm bent backward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.5
      },
      {
        "concept": "right arm bent forward with fist",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.5
      },
      {
        "concept": "standing",
        "source_observation_ids": [
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

### GV-PK-JPN-M5-109 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0106092`
- Artwork observations: `12`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: human character. Visible observations: human, face visible, hair blond, hair style long bangs and spikes, eyes green left visible, ear piercings, clothing black hooded jacket, clothing red strap.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Human character | human | scene_subject | foreground | high | 0.99 |
| Face visible | face visible | human_appearance | foreground | high | 0.99 |
| Blond hair | hair blond | human_appearance | foreground | high | 0.99 |
| Long bangs covering one eye and swept side, back sharp spikes | hair style long bangs and spikes | human_appearance | foreground | high | 0.99 |
| Green eye, visible left eye open | eyes green left visible | human_appearance | foreground | high | 0.99 |
| Ear piercings | ear piercings | human_appearance | foreground | medium | 0.95 |
| Black hooded jacket with large collar and grey pattern | clothing black hooded jacket | clothing | foreground | high | 0.99 |
| Red strap crossing torso | clothing red strap | clothing | foreground | medium | 0.99 |
| Left hand and fingers extended forward | hand left extended | human_appearance | foreground | high | 0.99 |
| Right hand relaxed down near waist | hand right relaxed | human_appearance | foreground | high | 0.99 |
| Cloudy sky with dynamic cloud shapes | sky cloudy | environment | background | medium | 0.99 |
| Green grassy field with some leaves floating or falling | ground grass | environment | midground | medium | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text in Japanese at top left | card_ui_text | top-left | fully_visible | 0.99 |
| Supporter and Trainer label text at top | card_ui_text | top | fully_visible | 0.99 |
| Card description text in Japanese at lower left | card_ui_text | lower-left | fully_visible | 0.99 |
| Illustrator credit text 'Illus. akagi' bottom left | card_ui_text | bottom-left | fully_visible | 0.99 |
| Set code and card number 'J M5 109/081 SR' bottom left | card_ui_text | bottom-left | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair color | obs_hair_001 | 0.99 |
| fact_hair_style_001 | human_appearance | hair style | obs_hair_style_001 | 0.99 |
| fact_face_001 | human_appearance | face visibility | obs_human_appearance_001 | 0.99 |
| fact_eye_001 | human_appearance | eye color and visibility | obs_eye_001 | 0.99 |
| fact_ear_001 | human_appearance | ear piercings | obs_ear_001 | 0.95 |
| fact_clothing_001 | clothing | garment type and color | obs_clothing_001 | 0.99 |
| fact_clothing_002 | clothing | red strap crossing torso | obs_clothing_002 | 0.99 |
| fact_hand_001 | human_appearance | left hand pose | obs_hand_001 | 0.99 |
| fact_hand_002 | human_appearance | right hand pose | obs_hand_002 | 0.99 |
| fact_environment_001 | environment | cloudy sky with clouds | obs_background_001 | 0.99 |
| fact_environment_002 | environment | green grassy field with floating leaves | obs_background_002 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | card name text in Japanese | obs_text_001 | 0.99 |
| fact_ui_002 | card type and category text | obs_text_002 | 0.99 |
| fact_ui_003 | card description text in Japanese visible | obs_text_003 | 0.99 |
| fact_ui_004 | illustrator text visible as 'Illus. akagi' | obs_text_004 | 0.99 |
| fact_ui_005 | set code and card number visible as 'J M5 109/081 SR' | obs_text_005 | 0.99 |

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
  "other_print_marker_observation_ids": [
    "obs_text_002",
    "obs_text_003"
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
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
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
| blond hair | obs_hair_001 |
| black jacket | obs_clothing_001 |
| red strap | obs_clothing_002 |
| green eye | obs_eye_001 |
| cloudy sky | obs_background_001 |
| grassy field | obs_background_002 |
| ear piercings | obs_ear_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| left hand extended forward | obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_eye_001 | deterministic_rule | 0.99 |
| right hand relaxed down | obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_background_001 | deterministic_rule | 0.99 |
| terrain | obs_background_002 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human character. Visible observations: human, face visible, hair blond, hair style long bangs and spikes, eyes green left visible, ear piercings, clothing black hooded jacket, clothing red strap.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Human character",
      "normalized_label": "human",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_001",
      "kind": "human_appearance",
      "label": "Face visible",
      "normalized_label": "face visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "Blond hair",
      "normalized_label": "hair blond",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_style_001",
      "kind": "human_appearance",
      "label": "Long bangs covering one eye and swept side, back sharp spikes",
      "normalized_label": "hair style long bangs and spikes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "human_appearance",
      "label": "Green eye, visible left eye open",
      "normalized_label": "eyes green left visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ear_001",
      "kind": "human_appearance",
      "label": "Ear piercings",
      "normalized_label": "ear piercings",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "Black hooded jacket with large collar and grey pattern",
      "normalized_label": "clothing black hooded jacket",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "Red strap crossing torso",
      "normalized_label": "clothing red strap",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_001",
      "kind": "human_appearance",
      "label": "Left hand and fingers extended forward",
      "normalized_label": "hand left extended",
      "scene_layer": "foreground",
      "frame_position": "left-center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_002",
      "kind": "human_appearance",
      "label": "Right hand relaxed down near waist",
      "normalized_label": "hand right relaxed",
      "scene_layer": "foreground",
      "frame_position": "lower-center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "Cloudy sky with dynamic cloud shapes",
      "normalized_label": "sky cloudy",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_002",
      "kind": "environment",
      "label": "Green grassy field with some leaves floating or falling",
      "normalized_label": "ground grass",
      "scene_layer": "midground",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_001",
      "kind": "card_ui_text",
      "label": "Card name text in Japanese at top left",
      "normalized_label": "card_name_japanese",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_002",
      "kind": "card_ui_text",
      "label": "Supporter and Trainer label text at top",
      "normalized_label": "supporter_and_trainer_text",
      "scene_layer": "ui",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_003",
      "kind": "card_ui_text",
      "label": "Card description text in Japanese at lower left",
      "normalized_label": "card_description_japanese",
      "scene_layer": "ui",
      "frame_position": "lower-left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_004",
      "kind": "card_ui_text",
      "label": "Illustrator credit text 'Illus. akagi' bottom left",
      "normalized_label": "illustrator_credit_text",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_005",
      "kind": "card_ui_text",
      "label": "Set code and card number 'J M5 109/081 SR' bottom left",
      "normalized_label": "set_code_and_card_number",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "0",
      "claim": "scene subject",
      "value": "human character",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair.0",
      "claim": "hair color",
      "value": "blond",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_style_001",
      "module": "human_appearance",
      "field_path": "hair.0.style",
      "claim": "hair style",
      "value": "long bangs covering one eye and back sharp spikes",
      "supporting_observation_ids": [
        "obs_hair_style_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "face",
      "claim": "face visibility",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_human_appearance_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eye_001",
      "module": "human_appearance",
      "field_path": "face.eyes.0",
      "claim": "eye color and visibility",
      "value": "green left eye visible",
      "supporting_observation_ids": [
        "obs_eye_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ear_001",
      "module": "human_appearance",
      "field_path": "ear",
      "claim": "ear piercings",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_ear_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments.0",
      "claim": "garment type and color",
      "value": "black hooded jacket with large collar and grey pattern",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments.1",
      "claim": "red strap crossing torso",
      "value": "red strap visible",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hand_001",
      "module": "human_appearance",
      "field_path": "hands.left",
      "claim": "left hand pose",
      "value": "fingers extended forward",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hand_002",
      "module": "human_appearance",
      "field_path": "hands.right",
      "claim": "right hand pose",
      "value": "relaxed down near waist",
      "supporting_observation_ids": [
        "obs_hand_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "cloudy sky with clouds",
      "value": "cloudy sky",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "ground",
      "claim": "green grassy field with floating leaves",
      "value": "grass field and leaves",
      "supporting_observation_ids": [
        "obs_background_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text in Japanese",
      "value": "グラジオの決戦",
      "supporting_observation_ids": [
        "obs_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "card_type_name_text",
      "claim": "card type and category text",
      "value": "サポート (Supporter) and トレーナーズ (Trainer)",
      "supporting_observation_ids": [
        "obs_text_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "description_text",
      "claim": "card description text in Japanese visible",
      "value": "description visible in text",
      "supporting_observation_ids": [
        "obs_text_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible as 'Illus. akagi'",
      "value": "Illus. akagi",
      "supporting_observation_ids": [
        "obs_text_004"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "set_and_number_text",
      "claim": "set code and card number visible as 'J M5 109/081 SR'",
      "value": "J M5 109/081 SR",
      "supporting_observation_ids": [
        "obs_text_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human character",
      "identity_confidence": 0.99,
      "anatomy": [
        "ears",
        "eyes",
        "face",
        "hands"
      ],
      "physical_features": [
        "blond hair",
        "ear piercings",
        "green eye"
      ],
      "pose": [
        "left hand extended forward",
        "right hand relaxed down"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "left eye open green",
        "mouth": "closed neutral",
        "eyebrows": "neutral",
        "face_position": "visible",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black hooded jacket with grey pattern",
        "red strap crossing torso"
      ],
      "colors": [
        "black",
        "blond",
        "grey",
        "pinkish skin tone",
        "red"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_ear_001",
      "obs_eye_001",
      "obs_hair_001",
      "obs_hair_style_001",
      "obs_hand_001",
      "obs_hand_002",
      "obs_human_appearance_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_background_002"
    ],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "cloudy"
    ],
    "ground": [
      "grassy field"
    ],
    "terrain": [],
    "plants": [
      "floating leaves"
    ],
    "architecture": [],
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
      "blond",
      "blue",
      "green",
      "grey",
      "red",
      "white"
    ],
    "lighting": [
      "diffuse natural light"
    ],
    "shadows": [
      "soft shadows on subject and ground"
    ],
    "highlights": [
      "hair highlights"
    ],
    "composition": [
      "centered subject with raised hand",
      "diagonal line by arm"
    ],
    "camera_angle": "straight-on",
    "framing": "close mid-shot",
    "cropping": [
      "fully visible subject"
    ],
    "depth": "moderate depth",
    "motion_cues": [
      "floating leaves motion implied"
    ],
    "motifs": [
      "energy"
    ],
    "repeated_shapes": [
      "sharp angular shapes in clothing collar"
    ],
    "style_cues": [
      "stylized anime art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_background_002",
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
        "fact_ear_001",
        "fact_eye_001",
        "fact_face_001",
        "fact_hair_001",
        "fact_hair_style_001",
        "fact_hand_001",
        "fact_hand_002"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "face visible",
            "left eye open green",
            "mouth closed neutral",
            "neutral eyebrows"
          ],
          "supporting_observation_ids": [
            "obs_eye_001",
            "obs_human_appearance_001"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "visible",
          "eyes": "left eye open green",
          "mouth": "closed neutral",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "ear piercings"
          ],
          "supporting_observation_ids": [
            "obs_ear_001",
            "obs_eye_001",
            "obs_human_appearance_001"
          ],
          "confidence": 0.99
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blond hair",
          "details": [
            "back sharp spikes",
            "long bangs covering one eye"
          ],
          "supporting_observation_ids": [
            "obs_hair_001",
            "obs_hair_style_001"
          ],
          "confidence": 0.99
        }
      ],
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
      "fact_ids": [
        "fact_clothing_001",
        "fact_clothing_002"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black hooded jacket",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black",
            "grey"
          ],
          "visible_details": [
            "grey pattern on chest",
            "large collar"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "red strap crossing torso",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "red"
          ],
          "visible_details": [
            "single strap"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.99
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
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_background_002",
        "obs_subject_001"
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
      "other_print_marker_observation_ids": [
        "obs_text_002",
        "obs_text_003"
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
        "blond hair",
        "black jacket",
        "red strap",
        "green eye",
        "cloudy sky",
        "grassy field",
        "ear piercings"
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
  "semantic_visual_facts": [],
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
      "term": "red strap",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "green eye",
      "supporting_observation_ids": [
        "obs_eye_001"
      ]
    },
    {
      "term": "cloudy sky",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "grassy field",
      "supporting_observation_ids": [
        "obs_background_002"
      ]
    },
    {
      "term": "ear piercings",
      "supporting_observation_ids": [
        "obs_ear_001"
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
        "concept": "left hand extended forward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_eye_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right hand relaxed down",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_background_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-116 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0100704`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: unknown human male. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human male standing in dynamic pose | human male standing | scene_subject | foreground | primary_subject | 0.99 |
| blond hair with long bangs | blond hair | human_appearance | foreground | primary_subject_detail | 0.98 |
| yellow eyes with sharp gaze | yellow eyes | human_appearance | foreground | primary_subject_detail | 0.95 |
| right hand making claw-like gesture near head | hand claw-like gesture | human_appearance | foreground | primary_subject_action | 0.95 |
| left hand holding right side of abdomen | hand holding abdomen | human_appearance | foreground | primary_subject_action | 0.94 |
| black high-neck long sleeved top with purple triangular shoulder pads | black high-neck top with purple triangular shoulder pads | clothing | foreground | primary_subject_detail | 0.98 |
| dark purple pants | dark purple pants | clothing | foreground | primary_subject_detail | 0.97 |
| red satchel or bag fastened around waist | red waist bag | objects_and_props | foreground | primary_subject_weapon_or_tool | 0.96 |
| daylight outdoor setting with blue sky and white clouds | outdoor bright sky clouds | environment | background | background | 0.99 |
| green and rocky mountain-like terrain below horizon | mountain terrain | environment | background | background | 0.95 |
| shining sun in upper left corner | sun | environment | background | background | 0.98 |
| dynamic angular light streaks crossing foreground | light streaks | visual_effects | foreground | primary_subject_emphasis | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | primary subject is a human male standing in pose | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | subject has blond hair with long bangs | obs_human_appearance_001 | 0.98 |
| fact_eyes_001 | human_appearance | subject's eyes are yellow with sharp gaze | obs_human_appearance_002 | 0.95 |
| fact_pose_001 | human_appearance | subject's right hand is making a claw-like gesture near head | obs_human_appearance_003 | 0.95 |
| fact_pose_002 | human_appearance | subject's left hand is holding right side of abdomen | obs_human_appearance_004 | 0.94 |
| fact_clothing_001 | clothing | subject wears black high-neck long sleeved top with purple triangular shoulder pads | obs_clothing_001 | 0.98 |
| fact_clothing_002 | clothing | subject wears dark purple pants | obs_clothing_002 | 0.97 |
| fact_object_001 | objects_and_props | subject has a red satchel or bag fastened around waist | obs_objects_001 | 0.96 |
| fact_environment_001 | environment | card artwork depicts an outdoor daylight setting with blue sky and white clouds | obs_environment_001 | 0.99 |
| fact_environment_002 | environment | terrain includes green and rocky mountain-like landscape below horizon | obs_environment_002 | 0.95 |
| fact_environment_003 | environment | visible shining sun in upper left corner | obs_environment_003 | 0.98 |
| fact_visual_effects_001 | visual_effects | angular light streaks cross the foreground and subject | obs_visual_effect_001 | 0.95 |

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
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | none_visible | none | not_applicable |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | action | standing | obs_subject_001 | obs_subject_001 | standing | 0.99 |

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
| blond hair | obs_human_appearance_001 |
| yellow eyes | obs_human_appearance_002 |
| light streaks | obs_visual_effect_001 |
| mountain terrain | obs_environment_002 |
| outdoor daylight | obs_environment_001, obs_environment_003 |
| red waist bag | obs_objects_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cloud | obs_environment_001 | deterministic_rule | 0.99 |
| diagonal composition | obs_visual_effect_001 | deterministic_rule | 0.92 |
| holding | obs_human_appearance_004, obs_subject_001 | deterministic_rule | 0.99 |
| light streaks | obs_visual_effect_001 | deterministic_rule | 0.95 |
| right hand claw gesture | obs_subject_001 | deterministic_rule | 0.99 |
| right orientation | obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_001 | deterministic_rule | 0.99 |
| standing | obs_subject_001 | deterministic_rule | 0.99 |
| terrain | obs_environment_002 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown human male. Semantic facts: standing.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human male standing in dynamic pose",
      "normalized_label": "human male standing",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_001",
      "kind": "human_appearance",
      "label": "blond hair with long bangs",
      "normalized_label": "blond hair",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_002",
      "kind": "human_appearance",
      "label": "yellow eyes with sharp gaze",
      "normalized_label": "yellow eyes",
      "scene_layer": "foreground",
      "frame_position": "upper_center_face",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_003",
      "kind": "human_appearance",
      "label": "right hand making claw-like gesture near head",
      "normalized_label": "hand claw-like gesture",
      "scene_layer": "foreground",
      "frame_position": "upper_center_hands",
      "visibility": "fully_visible",
      "salience": "primary_subject_action",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_004",
      "kind": "human_appearance",
      "label": "left hand holding right side of abdomen",
      "normalized_label": "hand holding abdomen",
      "scene_layer": "foreground",
      "frame_position": "center_hands",
      "visibility": "fully_visible",
      "salience": "primary_subject_action",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "black high-neck long sleeved top with purple triangular shoulder pads",
      "normalized_label": "black high-neck top with purple triangular shoulder pads",
      "scene_layer": "foreground",
      "frame_position": "center_torso",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "dark purple pants",
      "normalized_label": "dark purple pants",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "red satchel or bag fastened around waist",
      "normalized_label": "red waist bag",
      "scene_layer": "foreground",
      "frame_position": "center_waist",
      "visibility": "fully_visible",
      "salience": "primary_subject_weapon_or_tool",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "daylight outdoor setting with blue sky and white clouds",
      "normalized_label": "outdoor bright sky clouds",
      "scene_layer": "background",
      "frame_position": "upper_background",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "green and rocky mountain-like terrain below horizon",
      "normalized_label": "mountain terrain",
      "scene_layer": "background",
      "frame_position": "lower_background",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "shining sun in upper left corner",
      "normalized_label": "sun",
      "scene_layer": "background",
      "frame_position": "upper_left",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_effect_001",
      "kind": "visual_effects",
      "label": "dynamic angular light streaks crossing foreground",
      "normalized_label": "light streaks",
      "scene_layer": "foreground",
      "frame_position": "all_over",
      "visibility": "fully_visible",
      "salience": "primary_subject_emphasis",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0]",
      "claim": "primary subject is a human male standing in pose",
      "value": "human male standing",
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
      "claim": "subject has blond hair with long bangs",
      "value": "blond hair",
      "supporting_observation_ids": [
        "obs_human_appearance_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eyes_001",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "subject's eyes are yellow with sharp gaze",
      "value": "yellow eyes",
      "supporting_observation_ids": [
        "obs_human_appearance_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "human_appearance",
      "field_path": "pose",
      "claim": "subject's right hand is making a claw-like gesture near head",
      "value": "right hand claw-like gesture",
      "supporting_observation_ids": [
        "obs_human_appearance_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_002",
      "module": "human_appearance",
      "field_path": "pose",
      "claim": "subject's left hand is holding right side of abdomen",
      "value": "left hand holding abdomen",
      "supporting_observation_ids": [
        "obs_human_appearance_004"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "subject wears black high-neck long sleeved top with purple triangular shoulder pads",
      "value": "black high-neck top with purple triangular shoulder pads",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "subject wears dark purple pants",
      "value": "dark purple pants",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0]",
      "claim": "subject has a red satchel or bag fastened around waist",
      "value": "red waist bag",
      "supporting_observation_ids": [
        "obs_objects_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "card artwork depicts an outdoor daylight setting with blue sky and white clouds",
      "value": "outdoor bright sky clouds",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain includes green and rocky mountain-like landscape below horizon",
      "value": "mountain terrain",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "sky",
      "claim": "visible shining sun in upper left corner",
      "value": "sun",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effects_001",
      "module": "visual_effects",
      "field_path": "motion_cues",
      "claim": "angular light streaks cross the foreground and subject",
      "value": "light streaks",
      "supporting_observation_ids": [
        "obs_visual_effect_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown human male",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "eyes",
        "face",
        "hair",
        "hands",
        "legs",
        "torso",
        "waist"
      ],
      "physical_features": [
        "blond hair",
        "sharp gaze",
        "yellow eyes"
      ],
      "pose": [
        "holding",
        "right hand claw gesture",
        "standing"
      ],
      "orientation": "right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "yellow",
        "mouth": "closed",
        "eyebrows": "neutral",
        "face_position": "front face",
        "other_visible_evidence": [
          "sharp gaze"
        ]
      },
      "clothing_or_accessories": [
        "black high-neck top with purple triangular shoulder pads",
        "dark purple pants",
        "red waist bag"
      ],
      "colors": [
        "black",
        "blond",
        "purple",
        "red",
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
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_human_appearance_001",
      "obs_human_appearance_002",
      "obs_human_appearance_003",
      "obs_human_appearance_004",
      "obs_objects_001",
      "obs_subject_001",
      "obs_visual_effect_001"
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
      "outdoor"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "sun",
      "white clouds"
    ],
    "ground": [
      "mountain terrain"
    ],
    "terrain": [
      "green",
      "rocky"
    ],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "daylight"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "red satchel or bag fastened around waist",
      "normalized_label": "red waist bag",
      "object_type": "accessory",
      "colors": [
        "red"
      ],
      "material_appearance": [
        "fabric-like appearance"
      ],
      "location": "waist",
      "count_reference": "none",
      "confidence": 0.96
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "green",
      "purple",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright daylight",
      "high contrast"
    ],
    "shadows": [
      "soft shadows on clothing and face"
    ],
    "highlights": [
      "sunlight reflections on hair and light streaks"
    ],
    "composition": [
      "central subject",
      "diagonal light streaks",
      "mountain horizon background"
    ],
    "camera_angle": "eye-level",
    "framing": "full body centered",
    "cropping": [],
    "depth": "deep with distinct foreground and background",
    "motion_cues": [
      "angular light streaks enhancing action"
    ],
    "motifs": [
      "energy"
    ],
    "repeated_shapes": [
      "angular light streaks",
      "triangular shoulder pads"
    ],
    "style_cues": [
      "anime-style illustration"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
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
        "fact_eyes_001",
        "fact_hair_001",
        "fact_pose_001",
        "fact_pose_002"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hair",
          "visibility": "fully_visible",
          "details": [
            "blond",
            "long bangs"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eyes",
          "visibility": "fully_visible",
          "details": [
            "sharp gaze",
            "yellow eyes"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "visibility": "fully_visible",
          "details": [
            "left hand holding right side of abdomen",
            "right hand claw-like gesture near head"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_003",
            "obs_human_appearance_004"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "front face",
          "eyes": "yellow",
          "mouth": "closed",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "sharp gaze"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_002"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blond hair",
          "details": [
            "long bangs"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right hand claw-like gesture",
          "details": [
            "position near head"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_003"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "left hand holding abdomen",
          "details": [
            "holding right side of abdomen"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_004"
          ],
          "confidence": 0.94
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
          "body_area": "torso",
          "garment": "black high-neck long sleeved top with purple triangular shoulder pads",
          "neckline_type": "high-neck",
          "sleeve_type": "long sleeves",
          "colors": [
            "black",
            "purple"
          ],
          "visible_details": [
            "triangular shoulder pads"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "legs",
          "garment": "dark purple pants",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "dark purple"
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
          "label": "red waist bag",
          "details": [
            "fastened around waist"
          ],
          "supporting_observation_ids": [
            "obs_objects_001"
          ],
          "confidence": 0.96
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_object_001"
      ],
      "object_observation_ids": [
        "obs_objects_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001",
        "fact_environment_002",
        "fact_environment_003"
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
        "obs_visual_effect_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_003"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_visual_effects_001"
      ],
      "observation_ids": [
        "obs_visual_effect_001"
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
        "yellow eyes",
        "light streaks",
        "mountain terrain",
        "outdoor daylight",
        "red waist bag"
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
      "semantic_fact_id": "semfact_001",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [
          "standing"
        ],
        "motion_state": [],
        "environment": [],
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
      "term": "blond hair",
      "supporting_observation_ids": [
        "obs_human_appearance_001"
      ]
    },
    {
      "term": "yellow eyes",
      "supporting_observation_ids": [
        "obs_human_appearance_002"
      ]
    },
    {
      "term": "light streaks",
      "supporting_observation_ids": [
        "obs_visual_effect_001"
      ]
    },
    {
      "term": "mountain terrain",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "outdoor daylight",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_003"
      ]
    },
    {
      "term": "red waist bag",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_visual_effect_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "holding",
        "source_observation_ids": [
          "obs_human_appearance_004",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "light streaks",
        "source_observation_ids": [
          "obs_visual_effect_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right hand claw gesture",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_001"
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
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-075 - カスミの元気

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.96`
- Attribute confidence: `0.96`
- Cost USD: `0.010134`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female human character. Visible observations: female human character, orange hair, winking smiling face, blue crop top, blue shorts, black wristband, visible body regions, indoor pool. Semantic facts: winking, indoor swimming pool.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human character | female human character | scene_subject | foreground | high | 0.99 |
| orange ponytail hair with black hair tie | orange hair | object | foreground | high | 0.98 |
| winking with left eye, open right eye, smiling mouth | winking smiling face | object | foreground | high | 0.97 |
| blue sleeveless crop top | blue crop top | object | foreground | high | 0.98 |
| blue shorts | blue shorts | object | foreground | high | 0.98 |
| black wristbands on both wrists | black wristband | object | foreground | medium | 0.95 |
| visible face, neck, midriff, arms, hands, legs | visible body regions | object | foreground | high | 0.99 |
| indoor swimming pool area | indoor pool | object | background | medium | 0.95 |
| green leafy plant on left side | plant | object | midground | low | 0.9 |
| blue tiled floor | tiled floor | object | midground | medium | 0.95 |
| pool ladder with silver railings in midground | pool ladder | object | midground | medium | 0.95 |
| large windows showing trees and sky outside | windows with outdoor view | object | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair color and style | obs_hair_001 | 0.98 |
| fact_003 | human_appearance | face expression | obs_facial_expression_001 | 0.97 |
| fact_004 | clothing | top garment | obs_clothing_001 | 0.98 |
| fact_005 | clothing | bottom garment | obs_clothing_002 | 0.98 |
| fact_006 | clothing | wristbands | obs_accessory_001 | 0.95 |
| fact_007 | human_appearance | body regions visible | obs_body_region_001 | 0.99 |
| fact_008 | environment | indoor pool area | obs_environment_001 | 0.95 |
| fact_009 | environment | green plant | obs_environment_002 | 0.9 |
| fact_010 | environment | floor type | obs_environment_003 | 0.95 |
| fact_011 | environment | pool ladder | obs_environment_004 | 0.95 |
| fact_012 | environment | windows showing outdoor foliage and sky | obs_environment_005 | 0.95 |

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
| color_and_light | likely_complete | low | medium |  |
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
| sem_001 | expression | winking | obs_subject_001 | obs_facial_expression_001 | smiling mouth left eye closed winking right eye open neutral left fist clenched near body right arm extended forward frontal standing | 0.97 |
| sem_002 | scene_type | indoor swimming pool |  | obs_environment_001 | indoor swimming pool green leafy plant pool ladder | 0.95 |

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
| orange ponytail hair | obs_hair_001 |
| blue sleeveless crop top | obs_clothing_001 |
| blue shorts | obs_clothing_002 |
| black wristbands | obs_accessory_001 |
| indoor swimming pool | obs_environment_001 |
| green plant | obs_environment_002 |
| pool ladder | obs_environment_004 |
| tiled floor | obs_environment_003 |
| large windows | obs_environment_005 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_subject_001 | deterministic_rule | 0.92 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| indoor swimming pool | obs_environment_001 | deterministic_rule | 0.95 |
| plant | obs_environment_002 | deterministic_rule | 0.9 |
| smiling | obs_subject_001 | deterministic_rule | 0.99 |
| standing | obs_subject_001 | deterministic_rule | 0.99 |
| window | obs_environment_005 | deterministic_rule | 0.95 |
| winking | obs_facial_expression_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human character. Visible observations: female human character, orange hair, winking smiling face, blue crop top, blue shorts, black wristband, visible body regions, indoor pool. Semantic facts: winking, indoor swimming pool.
- Quality flags: `none`
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
      "observation_id": "obs_hair_001",
      "kind": "object",
      "label": "orange ponytail hair with black hair tie",
      "normalized_label": "orange hair",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_expression_001",
      "kind": "object",
      "label": "winking with left eye, open right eye, smiling mouth",
      "normalized_label": "winking smiling face",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "object",
      "label": "blue sleeveless crop top",
      "normalized_label": "blue crop top",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "object",
      "label": "blue shorts",
      "normalized_label": "blue shorts",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "object",
      "label": "black wristbands on both wrists",
      "normalized_label": "black wristband",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "object",
      "label": "visible face, neck, midriff, arms, hands, legs",
      "normalized_label": "visible body regions",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "object",
      "label": "indoor swimming pool area",
      "normalized_label": "indoor pool",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "object",
      "label": "green leafy plant on left side",
      "normalized_label": "plant",
      "scene_layer": "midground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "object",
      "label": "blue tiled floor",
      "normalized_label": "tiled floor",
      "scene_layer": "midground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "object",
      "label": "pool ladder with silver railings in midground",
      "normalized_label": "pool ladder",
      "scene_layer": "midground",
      "frame_position": "right_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_005",
      "kind": "object",
      "label": "large windows showing trees and sky outside",
      "normalized_label": "windows with outdoor view",
      "scene_layer": "background",
      "frame_position": "upper",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
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
      "field_path": "hair",
      "claim": "hair color and style",
      "value": "orange ponytail with black hair tie",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "facial_evidence",
      "claim": "face expression",
      "value": "winking with left eye, open right eye, smiling mouth",
      "supporting_observation_ids": [
        "obs_facial_expression_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "top garment",
      "value": "blue sleeveless crop top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "bottom garment",
      "value": "blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "accessories",
      "claim": "wristbands",
      "value": "black wristbands on both wrists",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "body regions visible",
      "value": "face, neck, midriff, arms, hands, legs",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "setting",
      "claim": "indoor pool area",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "plants",
      "claim": "green plant",
      "value": "green leafy plant",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "ground",
      "claim": "floor type",
      "value": "blue tiled floor",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "pool ladder",
      "value": "pool ladder with silver railings",
      "supporting_observation_ids": [
        "obs_environment_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "environment",
      "field_path": "setting",
      "claim": "windows showing outdoor foliage and sky",
      "value": "large windows with outdoor view",
      "supporting_observation_ids": [
        "obs_environment_005"
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
        "hands",
        "legs",
        "midriff",
        "neck"
      ],
      "physical_features": [
        "black hair tie",
        "orange hair ponytail"
      ],
      "pose": [
        "smiling",
        "standing",
        "winking"
      ],
      "orientation": "forward",
      "action_state": [
        "smiling",
        "winking"
      ],
      "facial_evidence": {
        "eyes": "left eye closed winking, right eye open",
        "mouth": "smiling open mouth showing teeth",
        "eyebrows": "visible, neutral curve",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristbands on both wrists",
        "blue crop top",
        "blue shorts"
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
      "obs_body_region_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_facial_expression_001",
      "obs_hair_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004"
    ],
    "background": [
      "obs_environment_001",
      "obs_environment_005"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "blue tiled floor"
    ],
    "terrain": [],
    "plants": [
      "green leafy plant"
    ],
    "architecture": [
      "large windows"
    ],
    "water": [
      "swimming pool water visible"
    ],
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
      "label": "pool ladder",
      "normalized_label": "pool ladder",
      "object_type": "object",
      "colors": [
        "silver"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "midground right center",
      "count_reference": "",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "green",
      "orange",
      "silver"
    ],
    "lighting": [
      "bright indoor lighting"
    ],
    "shadows": [
      "minimal soft shadows"
    ],
    "highlights": [
      "hair highlights"
    ],
    "composition": [
      "background pool and plant asymmetrically balanced",
      "human subject centered with extended arm forward"
    ],
    "camera_angle": "eye-level frontal",
    "framing": "tight crop to human upper body and environment",
    "cropping": [
      "visible full upper body"
    ],
    "depth": "moderate depth with clear foreground midground background separation",
    "motion_cues": [
      "extended right arm forward gesture"
    ],
    "motifs": [
      "none"
    ],
    "repeated_shapes": [
      "parallel pool ladder rails",
      "rectangular windows",
      "tiled floor squares"
    ],
    "style_cues": [
      "vibrant colors"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005",
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
        "fact_007"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "open right eye",
            "smiling mouth",
            "winking left eye"
          ],
          "supporting_observation_ids": [
            "obs_facial_expression_001"
          ],
          "confidence": 0.97
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "left eye closed winking, right eye open",
          "mouth": "smiling open mouth showing teeth",
          "eyebrows": "neutral curve",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_facial_expression_001"
          ],
          "confidence": 0.97
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange ponytail",
          "details": [
            "black hair tie"
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
          "label": "right arm extended forward",
          "details": [
            "left fist clenched near body"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands",
          "details": [
            "worn on both wrists"
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
        "fact_004",
        "fact_005",
        "fact_006"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue sleeveless crop top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "hips and upper legs",
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
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands",
          "details": [
            "both wrists"
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
        "fact_011"
      ],
      "object_observation_ids": [
        "obs_environment_004"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_008",
        "fact_009",
        "fact_010",
        "fact_012"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_005"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_003",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_hair_001",
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
        "orange ponytail hair",
        "blue sleeveless crop top",
        "blue shorts",
        "black wristbands",
        "indoor swimming pool",
        "green plant",
        "pool ladder",
        "tiled floor",
        "large windows"
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
      "review_status": "likely_complete",
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
      "semantic_fact_id": "sem_001",
      "category": "expression",
      "label": "winking",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_facial_expression_001"
      ],
      "evidence": {
        "mouth": [
          "smiling mouth"
        ],
        "eyes": [
          "left eye closed winking",
          "right eye open"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [],
        "body_language": [
          "left fist clenched near body",
          "right arm extended forward"
        ],
        "body_position": [
          "frontal",
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
      "semantic_fact_id": "sem_002",
      "category": "scene_type",
      "label": "indoor swimming pool",
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
          "indoor swimming pool"
        ],
        "objects": [
          "green leafy plant",
          "pool ladder"
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
      "term": "orange ponytail hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "blue sleeveless crop top",
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
      "term": "black wristbands",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ]
    },
    {
      "term": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "green plant",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "pool ladder",
      "supporting_observation_ids": [
        "obs_environment_004"
      ]
    },
    {
      "term": "tiled floor",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "large windows",
      "supporting_observation_ids": [
        "obs_environment_005"
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
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "smiling",
        "source_observation_ids": [
          "obs_subject_001"
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
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_environment_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "winking",
        "source_observation_ids": [
          "obs_facial_expression_001",
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

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0077556`
- Artwork observations: `7`
- Card UI / print-marker observations: `4`
- Card UI module evidence references: `3`
- Derived digest: Fact digest. Semantic facts: aurora lights, lightning strikes, leafless trees, mountainous terrain. Counts: trees: 2-6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| sky | sky | environment | background | salient | 0.99 |
| aurora-like green and red northern lights | aurora-like green and red northern lights | environment | background | salient | 0.98 |
| multiple white and red lightning bolts | lightning | object | midground | salient | 0.99 |
| group of dark leafless trees | trees | environment | foreground | salient | 0.97 |
| group of dark leafless trees | trees | environment | foreground | salient | 0.97 |
| dark mountainous terrain | mountainous terrain | environment | background | salient | 0.98 |
| dark green ground with grassy texture | ground | environment | foreground | salient | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top-right | visible | 0.95 |
| word 'TRAINER' in English uppercase letters | card_ui_text | top-left | visible | 0.99 |
| collector number '019/019' | collector_number | bottom-right | visible | 0.98 |
| illustrator text 'Illus. Shin-ichi Yoshikawa' | illustrator_text | bottom-right | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | The card artwork shows a visible sky | obs_sky_001 | 0.99 |
| fact_env_002 | environment | The card artwork contains aurora-like green and red light bands in the sky | obs_northern_lights_001 | 0.98 |
| fact_env_003 | environment | At least two white and red lightning bolts are visible in the artwork | obs_lightning_001 | 0.99 |
| fact_env_004 | environment | There are groups of leafless dark trees visible on left and right midground foreground | obs_trees_001, obs_trees_002 | 0.97 |
| fact_env_005 | environment | The terrain is mountainous and dark in the background | obs_terrain_001 | 0.98 |
| fact_env_006 | environment | Visible dark green grassy ground is present in the foreground | obs_ground_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | Card name text is visible in Japanese near top-right | obs_card_ui_name_001 | 0.95 |
| fact_card_ui_002 | Trainer label text 'TRAINER' in upper left visible | obs_card_ui_trainer_001 | 0.99 |
| fact_card_ui_003 | Collector number is visible '019/019' | obs_card_ui_number_001 | 0.98 |
| fact_card_ui_004 | Illustrator text 'Illus. Shin-ichi Yoshikawa' is visible | obs_card_ui_illustrator_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003",
    "fact_card_ui_004"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_number_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
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
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | none_visible | none | high |  |
| environment | complete | low | high |  |
| composition | partial_due_to_crop | medium | medium |  |
| color_and_light | partial_due_to_crop | medium | medium |  |
| visual_effects | partial_due_to_crop | medium | medium |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | likely_complete | low | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_env_001 | environment | aurora lights |  | obs_northern_lights_001 | aurora-like green and red color bands in sky | 0.98 |
| sem_fact_env_002 | environment | lightning strikes |  | obs_lightning_001 | visible lightning bolts stormy sky white and red lightning bolts | 0.99 |
| sem_fact_env_003 | environment | leafless trees |  | obs_trees_001, obs_trees_002 | dark leafless trees visible in foreground | 0.97 |
| sem_fact_env_004 | environment | mountainous terrain |  | obs_terrain_001 | dark mountainous terrain background | 0.98 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| trees | estimated_range | 2-6 | obs_trees_001, obs_trees_002 | 0.96 |

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
| aurora lights | obs_northern_lights_001 |
| lightning strikes | obs_lightning_001 |
| leafless trees | obs_trees_001, obs_trees_002 |
| mountainous terrain | obs_terrain_001 |
| dark sky | obs_sky_001 |
| stormy sky | obs_lightning_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora lights | obs_northern_lights_001 | deterministic_rule | 0.98 |
| aurora-like light bands | obs_northern_lights_001 | deterministic_rule | 0.98 |
| leafless trees | obs_trees_001, obs_trees_002 | deterministic_rule | 0.97 |
| lightning | obs_lightning_001 | deterministic_rule | 0.99 |
| lightning strikes | obs_lightning_001 | deterministic_rule | 0.99 |
| mountainous terrain | obs_terrain_001 | deterministic_rule | 0.98 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| terrain | obs_ground_001, obs_terrain_001 | deterministic_rule | 0.98 |
| tree | obs_trees_001, obs_trees_002 | deterministic_rule | 0.97 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Semantic facts: aurora lights, lightning strikes, leafless trees, mountainous terrain. Counts: trees: 2-6.
- Quality flags: `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "environment",
      "label": "sky",
      "normalized_label": "sky",
      "scene_layer": "background",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_northern_lights_001",
      "kind": "environment",
      "label": "aurora-like green and red northern lights",
      "normalized_label": "aurora-like green and red northern lights",
      "scene_layer": "background",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_001",
      "kind": "object",
      "label": "multiple white and red lightning bolts",
      "normalized_label": "lightning",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "environment",
      "label": "group of dark leafless trees",
      "normalized_label": "trees",
      "scene_layer": "foreground",
      "frame_position": "right-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_002",
      "kind": "environment",
      "label": "group of dark leafless trees",
      "normalized_label": "trees",
      "scene_layer": "foreground",
      "frame_position": "left-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_001",
      "kind": "environment",
      "label": "dark mountainous terrain",
      "normalized_label": "mountainous terrain",
      "scene_layer": "background",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ground_001",
      "kind": "environment",
      "label": "dark green ground with grassy texture",
      "normalized_label": "ground",
      "scene_layer": "foreground",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_001",
      "kind": "card_ui_text",
      "label": "word 'TRAINER' in English uppercase letters",
      "normalized_label": "trainer label",
      "scene_layer": "card_ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "collector number '019/019'",
      "normalized_label": "collector number",
      "scene_layer": "card_ui",
      "frame_position": "bottom-right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text 'Illus. Shin-ichi Yoshikawa'",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom-right",
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
      "field_path": "setting.sky",
      "claim": "The card artwork shows a visible sky",
      "value": "true",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "sky.aurora_lights",
      "claim": "The card artwork contains aurora-like green and red light bands in the sky",
      "value": "true",
      "supporting_observation_ids": [
        "obs_northern_lights_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "objects_and_props.lightning",
      "claim": "At least two white and red lightning bolts are visible in the artwork",
      "value": "true",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "plants.trees",
      "claim": "There are groups of leafless dark trees visible on left and right midground foreground",
      "value": "true",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "terrain.mountainous",
      "claim": "The terrain is mountainous and dark in the background",
      "value": "true",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "ground.grass",
      "claim": "Visible dark green grassy ground is present in the foreground",
      "value": "true",
      "supporting_observation_ids": [
        "obs_ground_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text is visible in Japanese near top-right",
      "value": "磁気嵐 (Magnetic Storm in Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "Trainer label text 'TRAINER' in upper left visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number is visible '019/019'",
      "value": "019/019",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text 'Illus. Shin-ichi Yoshikawa' is visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
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
      "normalized_label": "trees",
      "count_type": "estimated_range",
      "exact_count": 0,
      "estimated_min": 2,
      "estimated_max": 6,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "scene_layer": "foreground",
      "confidence": 0.96
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_ground_001",
      "obs_trees_001",
      "obs_trees_002"
    ],
    "midground": [
      "obs_lightning_001"
    ],
    "background": [
      "obs_northern_lights_001",
      "obs_sky_001",
      "obs_terrain_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "outdoor",
    "sky": [
      "aurora",
      "color bands"
    ],
    "ground": [
      "grassy"
    ],
    "terrain": [
      "mountainous"
    ],
    "plants": [
      "leafless trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_ground_001",
      "obs_lightning_001",
      "obs_northern_lights_001",
      "obs_sky_001",
      "obs_terrain_001",
      "obs_trees_001",
      "obs_trees_002"
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
      "dramatic lighting on sky and lightning"
    ],
    "shadows": [
      "none clearly visible"
    ],
    "highlights": [
      "white lightning highlights"
    ],
    "composition": [
      "central lightning focus",
      "framing by northern lights"
    ],
    "camera_angle": "straight-on",
    "framing": "tight to card art border",
    "cropping": [
      "full card art visible"
    ],
    "depth": "deep with foreground, midground, and background",
    "motion_cues": [
      "lightning strike motion implied"
    ],
    "motifs": [
      "aurora motif",
      "lightning motif",
      "storm motif"
    ],
    "repeated_shapes": [
      "branching lightning bolts",
      "multiple trees silhouettes"
    ],
    "style_cues": [
      "illustrated style"
    ],
    "supporting_observation_ids": [
      "obs_ground_001",
      "obs_lightning_001",
      "obs_northern_lights_001",
      "obs_sky_001",
      "obs_terrain_001",
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
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004",
        "fact_env_005",
        "fact_env_006"
      ],
      "observation_ids": [
        "obs_ground_001",
        "obs_lightning_001",
        "obs_northern_lights_001",
        "obs_sky_001",
        "obs_terrain_001",
        "obs_trees_001",
        "obs_trees_002"
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
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
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
        "aurora lights",
        "lightning strikes",
        "leafless trees",
        "mountainous terrain",
        "dark sky",
        "stormy sky"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "review_status": "likely_complete",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "semantic_fact_id": "sem_fact_env_001",
      "category": "environment",
      "label": "aurora lights",
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
          "aurora-like green and red color bands in sky"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_env_002",
      "category": "environment",
      "label": "lightning strikes",
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
        "motion_state": [
          "visible lightning bolts"
        ],
        "environment": [
          "stormy sky"
        ],
        "objects": [
          "white and red lightning bolts"
        ],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_env_003",
      "category": "environment",
      "label": "leafless trees",
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
          "dark leafless trees visible in foreground"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_env_004",
      "category": "environment",
      "label": "mountainous terrain",
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
          "dark mountainous terrain background"
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
      "term": "aurora lights",
      "supporting_observation_ids": [
        "obs_northern_lights_001"
      ]
    },
    {
      "term": "lightning strikes",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ]
    },
    {
      "term": "leafless trees",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ]
    },
    {
      "term": "mountainous terrain",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ]
    },
    {
      "term": "dark sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "stormy sky",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora lights",
        "source_observation_ids": [
          "obs_northern_lights_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_northern_lights_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "leafless trees",
        "source_observation_ids": [
          "obs_trees_001",
          "obs_trees_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_lightning_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "lightning strikes",
        "source_observation_ids": [
          "obs_lightning_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "mountainous terrain",
        "source_observation_ids": [
          "obs_terrain_001"
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
        "concept": "terrain",
        "source_observation_ids": [
          "obs_ground_001",
          "obs_terrain_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001",
          "obs_trees_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.97`
- Attribute confidence: `0.95`
- Cost USD: `0.0092448`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium, track, emblem with leaf shape, trees, grass, traffic cones, fence, water.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium structure | stadium | environment | midground | high | 0.99 |
| purple track | track | objects_and_props | midground | high | 0.95 |
| green emblem circle with leaf-like shape | emblem with leaf shape | objects_and_props | midground | high | 0.98 |
| trees | trees | environment | background | medium | 0.97 |
| grass terrain | grass | environment | midground | medium | 0.97 |
| orange and white traffic cones | traffic cones | objects_and_props | foreground | medium | 0.96 |
| metal railing fence | fence | objects_and_props | foreground | medium | 0.94 |
| water body | water | environment | background | medium | 0.95 |
| wooden bridge or walkway | bridge | objects_and_props | background | medium | 0.94 |
| blue sky with scattered clouds | sky with clouds | environment | background | medium | 0.97 |
| curved stadium roof with grid-like structure | curved roof grid | composition | midground | medium | 0.95 |
| purple and blue paneling on stadium exterior | paneling | objects_and_props | midground | medium | 0.94 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_environment_001 | environment | setting | obs_environment_001 | 0.99 |
| fact_environment_002 | environment | presence of grass terrain | obs_environment_003 | 0.97 |
| fact_environment_003 | environment | presence of many trees | obs_environment_002 | 0.97 |
| fact_environment_004 | environment | presence of water body | obs_environment_004 | 0.95 |
| fact_environment_005 | environment | sky with scattered clouds | obs_environment_005 | 0.97 |
| fact_objects_001 | objects_and_props | presence of traffic cones | obs_objects_and_props_003 | 0.96 |
| fact_objects_002 | objects_and_props | presence of metal fence | obs_objects_and_props_004 | 0.94 |
| fact_objects_003 | objects_and_props | presence of wooden bridge or walkway | obs_objects_and_props_005 | 0.94 |
| fact_objects_004 | objects_and_props | purple track or raceway | obs_objects_and_props_001 | 0.95 |
| fact_environment_006 | environment | curved stadium roof with grid-like structure | obs_composition_001 | 0.95 |
| fact_objects_005 | objects_and_props | circular green emblem with leaf design | obs_objects_and_props_002 | 0.98 |
| fact_objects_006 | objects_and_props | purple and blue paneling on building exterior | obs_objects_and_props_006 | 0.94 |

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
| color_and_light | none_visible | none | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | none_visible | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
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
| stadium | obs_environment_001 |
| track | obs_objects_and_props_001 |
| emblem with leaf shape | obs_objects_and_props_002 |
| trees | obs_environment_002 |
| grass | obs_environment_003 |
| traffic cones | obs_objects_and_props_003 |
| fence | obs_objects_and_props_004 |
| water | obs_environment_004 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| bridge | obs_objects_and_props_005 | deterministic_rule | 0.94 |
| building | obs_composition_001, obs_environment_001 | deterministic_rule | 0.99 |
| centered composition | obs_composition_001, obs_environment_001 | deterministic_rule | 0.92 |
| circular motif | obs_objects_and_props_002 | deterministic_rule | 0.92 |
| cloud | obs_environment_005 | deterministic_rule | 0.97 |
| fence | obs_objects_and_props_004 | deterministic_rule | 0.94 |
| sky | obs_environment_005 | deterministic_rule | 0.97 |
| terrain | obs_environment_003 | deterministic_rule | 0.97 |
| tree | obs_environment_002 | deterministic_rule | 0.97 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium, track, emblem with leaf shape, trees, grass, traffic cones, fence, water.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_review_conflicts_with_entries`, `semantic_tags_metadata_or_generic_removed`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "stadium structure",
      "normalized_label": "stadium",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_001",
      "kind": "objects_and_props",
      "label": "purple track",
      "normalized_label": "track",
      "scene_layer": "midground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_002",
      "kind": "objects_and_props",
      "label": "green emblem circle with leaf-like shape",
      "normalized_label": "emblem with leaf shape",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "trees",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "grass terrain",
      "normalized_label": "grass",
      "scene_layer": "midground",
      "frame_position": "center_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_003",
      "kind": "objects_and_props",
      "label": "orange and white traffic cones",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_004",
      "kind": "objects_and_props",
      "label": "metal railing fence",
      "normalized_label": "fence",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "environment",
      "label": "water body",
      "normalized_label": "water",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_005",
      "kind": "objects_and_props",
      "label": "wooden bridge or walkway",
      "normalized_label": "bridge",
      "scene_layer": "background",
      "frame_position": "right_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_005",
      "kind": "environment",
      "label": "blue sky with scattered clouds",
      "normalized_label": "sky with clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "curved stadium roof with grid-like structure",
      "normalized_label": "curved roof grid",
      "scene_layer": "midground",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_006",
      "kind": "objects_and_props",
      "label": "purple and blue paneling on stadium exterior",
      "normalized_label": "paneling",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "stadium",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "terrain",
      "claim": "presence of grass terrain",
      "value": "grass terrain",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "presence of many trees",
      "value": "trees",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_004",
      "module": "environment",
      "field_path": "water",
      "claim": "presence of water body",
      "value": "water body",
      "supporting_observation_ids": [
        "obs_environment_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_005",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky with scattered clouds",
      "value": "blue sky with clouds",
      "supporting_observation_ids": [
        "obs_environment_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_001",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "presence of traffic cones",
      "value": "orange and white traffic cones",
      "supporting_observation_ids": [
        "obs_objects_and_props_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_002",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "presence of metal fence",
      "value": "metal railing fence",
      "supporting_observation_ids": [
        "obs_objects_and_props_004"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_003",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "presence of wooden bridge or walkway",
      "value": "wooden bridge or walkway",
      "supporting_observation_ids": [
        "obs_objects_and_props_005"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_004",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "purple track or raceway",
      "value": "purple track",
      "supporting_observation_ids": [
        "obs_objects_and_props_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_006",
      "module": "environment",
      "field_path": "architecture",
      "claim": "curved stadium roof with grid-like structure",
      "value": "curved roof with grid",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_005",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "circular green emblem with leaf design",
      "value": "green emblem circle with leaf-like shape",
      "supporting_observation_ids": [
        "obs_objects_and_props_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_006",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "purple and blue paneling on building exterior",
      "value": "purple and blue paneling",
      "supporting_observation_ids": [
        "obs_objects_and_props_006"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_objects_and_props_003",
      "obs_objects_and_props_004",
      "obs_objects_and_props_006"
    ],
    "midground": [
      "obs_composition_001",
      "obs_environment_001",
      "obs_environment_003",
      "obs_objects_and_props_001",
      "obs_objects_and_props_002",
      "obs_objects_and_props_006"
    ],
    "background": [
      "obs_environment_002",
      "obs_environment_004",
      "obs_environment_005",
      "obs_objects_and_props_005"
    ]
  },
  "environment": {
    "setting": [
      "stadium"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "scattered clouds"
    ],
    "ground": [
      "grass"
    ],
    "terrain": [
      "grass terrain"
    ],
    "plants": [
      "many trees"
    ],
    "architecture": [
      "curved stadium roof",
      "paneling"
    ],
    "water": [
      "presence of water body"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_composition_001",
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005",
      "obs_objects_and_props_001",
      "obs_objects_and_props_002",
      "obs_objects_and_props_006"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_and_props_001",
      "label": "purple track",
      "normalized_label": "track",
      "object_type": "track",
      "colors": [
        "blue",
        "purple"
      ],
      "material_appearance": [
        "smooth surface"
      ],
      "location": "center",
      "count_reference": "not_visible",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_objects_and_props_002",
      "label": "green emblem circle with leaf-like shape",
      "normalized_label": "emblem",
      "object_type": "emblem",
      "colors": [
        "green"
      ],
      "material_appearance": [
        "glossy"
      ],
      "location": "center stadium exterior",
      "count_reference": "not_visible",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_objects_and_props_003",
      "label": "orange and white traffic cones",
      "normalized_label": "traffic cones",
      "object_type": "cone",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [
        "plastic-like appearance"
      ],
      "location": "foreground left",
      "count_reference": "not_visible",
      "confidence": 0.96
    },
    {
      "observation_id": "obs_objects_and_props_004",
      "label": "metal railing fence",
      "normalized_label": "fence",
      "object_type": "fence",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "metal-like appearance"
      ],
      "location": "foreground left",
      "count_reference": "not_visible",
      "confidence": 0.94
    },
    {
      "observation_id": "obs_objects_and_props_005",
      "label": "wooden bridge or walkway",
      "normalized_label": "bridge",
      "object_type": "bridge",
      "colors": [
        "brown"
      ],
      "material_appearance": [
        "wood-like appearance"
      ],
      "location": "background right",
      "count_reference": "not_visible",
      "confidence": 0.94
    },
    {
      "observation_id": "obs_objects_and_props_006",
      "label": "purple and blue paneling on stadium exterior",
      "normalized_label": "stadium paneling",
      "object_type": "paneling",
      "colors": [
        "blue",
        "purple"
      ],
      "material_appearance": [
        "painted surface"
      ],
      "location": "stadium exterior",
      "count_reference": "not_visible",
      "confidence": 0.94
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "green",
      "orange",
      "purple",
      "white"
    ],
    "lighting": [
      "daylight illumination"
    ],
    "shadows": [
      "natural soft shadows"
    ],
    "highlights": [
      "glossy highlights on emblem"
    ],
    "composition": [
      "central framing of stadium structure",
      "foreground elements guide view to stadium"
    ],
    "camera_angle": "slightly tilted upward",
    "framing": "tight framing with focus on stadium and foreground",
    "cropping": [
      "full view of stadium exterior but partial for background"
    ],
    "depth": "distinct foreground, midground, background layers",
    "motion_cues": [],
    "motifs": [
      "leaf symbol motif"
    ],
    "repeated_shapes": [
      "circular emblem",
      "cones",
      "oval windows"
    ],
    "style_cues": [
      "detailed digital illustration"
    ],
    "supporting_observation_ids": [
      "obs_composition_001",
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005",
      "obs_objects_and_props_001",
      "obs_objects_and_props_002",
      "obs_objects_and_props_003",
      "obs_objects_and_props_004",
      "obs_objects_and_props_005",
      "obs_objects_and_props_006"
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
      "fact_ids": [
        "fact_objects_001",
        "fact_objects_002",
        "fact_objects_003",
        "fact_objects_004",
        "fact_objects_005",
        "fact_objects_006"
      ],
      "object_observation_ids": [
        "obs_objects_and_props_001",
        "obs_objects_and_props_002",
        "obs_objects_and_props_003",
        "obs_objects_and_props_004",
        "obs_objects_and_props_005",
        "obs_objects_and_props_006"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001",
        "fact_environment_002",
        "fact_environment_003",
        "fact_environment_004",
        "fact_environment_005",
        "fact_environment_006"
      ],
      "observation_ids": [
        "obs_composition_001",
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004",
        "obs_environment_005",
        "obs_objects_and_props_001",
        "obs_objects_and_props_002",
        "obs_objects_and_props_006"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_environment_006"
      ],
      "observation_ids": [
        "obs_composition_001"
      ]
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
        "stadium",
        "track",
        "emblem with leaf shape",
        "trees",
        "grass",
        "traffic cones",
        "fence",
        "water"
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "term": "stadium",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "track",
      "supporting_observation_ids": [
        "obs_objects_and_props_001"
      ]
    },
    {
      "term": "emblem with leaf shape",
      "supporting_observation_ids": [
        "obs_objects_and_props_002"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "grass",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_objects_and_props_003"
      ]
    },
    {
      "term": "fence",
      "supporting_observation_ids": [
        "obs_objects_and_props_004"
      ]
    },
    {
      "term": "water",
      "supporting_observation_ids": [
        "obs_environment_004"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "bridge",
        "source_observation_ids": [
          "obs_objects_and_props_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
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
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_objects_and_props_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_environment_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "fence",
        "source_observation_ids": [
          "obs_objects_and_props_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "tree",
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

### GV-PK-JPN-PMCG6-085 - Cinnabar City Gym

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.98`
- Cost USD: `0.0075908`
- Artwork observations: `6`
- Card UI / print-marker observations: `4`
- Card UI module evidence references: `3`
- Derived digest: Fact digest. Visible observations: lava environment, triangular platform, flame pattern, rusty pipes, rocky wall with lava flow, lava flow.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| lava environment | lava environment | environment | background | high | 1 |
| triangular platform | triangular platform | objects_and_props | midground | high | 1 |
| red and black flame pattern on platform | flame pattern | objects_and_props | midground | medium | 1 |
| rusty pipes supporting platform | rusty pipes | objects_and_props | midground | medium | 1 |
| rocky wall with lava flow | rocky wall with lava flow | environment | background | medium | 1 |
| yellow lava flow from wall | lava flow | environment | background | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top center | visible | 1 |
| TRAINER text in English | card_ui_text | top center | visible | 1 |
| print marker circle at lower right | card_ui_symbol | bottom right | visible | 1 |
| Japanese text descriptive box center-bottom | card_ui_text | bottom center | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting includes lava environment | obs_environment_background_wall_001, obs_environment_lava_001, obs_environment_lava_flow_001 | 1 |
| fact_env_002 | environment | presence of triangular platform supported by pipes | obs_object_pipesupport_001, obs_object_platform_001 | 1 |
| fact_objects_001 | objects_and_props | platform has red and black flame pattern | obs_pattern_platform_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text is Japanese characters below TRAINER | obs_card_ui_name_text_001 | 1 |
| fact_card_ui_002 | English TRAINER text at top center | obs_card_ui_trainer_text_001 | 1 |
| fact_card_ui_003 | Japanese description text present in bottom center text box | obs_card_ui_text_box_001 | 1 |
| fact_card_ui_004 | circular print marker at lower right corner | obs_card_ui_print_marker_circle_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003",
    "fact_card_ui_004"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_box_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_print_marker_circle_001"
  ]
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
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
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
| lava environment | obs_environment_lava_001 |
| triangular platform | obs_object_platform_001 |
| flame pattern | obs_pattern_platform_001 |
| rusty pipes | obs_object_pipesupport_001 |
| rocky wall with lava flow | obs_environment_background_wall_001 |
| lava flow | obs_environment_lava_flow_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_object_platform_001 | deterministic_rule | 0.92 |
| flame | obs_pattern_platform_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: lava environment, triangular platform, flame pattern, rusty pipes, rocky wall with lava flow, lava flow.
- Quality flags: `potential_module_review_conflicts_with_entries`, `potential_salient_object_missing_count_reference`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_lava_001",
      "kind": "environment",
      "label": "lava environment",
      "normalized_label": "lava environment",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_platform_001",
      "kind": "objects_and_props",
      "label": "triangular platform",
      "normalized_label": "triangular platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pattern_platform_001",
      "kind": "objects_and_props",
      "label": "red and black flame pattern on platform",
      "normalized_label": "flame pattern",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_pipesupport_001",
      "kind": "objects_and_props",
      "label": "rusty pipes supporting platform",
      "normalized_label": "rusty pipes",
      "scene_layer": "midground",
      "frame_position": "below platform",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_background_wall_001",
      "kind": "environment",
      "label": "rocky wall with lava flow",
      "normalized_label": "rocky wall with lava flow",
      "scene_layer": "background",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_lava_flow_001",
      "kind": "environment",
      "label": "yellow lava flow from wall",
      "normalized_label": "lava flow",
      "scene_layer": "background",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_text_001",
      "kind": "card_ui_text",
      "label": "TRAINER text in English",
      "normalized_label": "trainer text",
      "scene_layer": "ui",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_print_marker_circle_001",
      "kind": "card_ui_symbol",
      "label": "print marker circle at lower right",
      "normalized_label": "print marker circle",
      "scene_layer": "ui",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_box_001",
      "kind": "card_ui_text",
      "label": "Japanese text descriptive box center-bottom",
      "normalized_label": "description text box",
      "scene_layer": "ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting includes lava environment",
      "value": "lava environment",
      "supporting_observation_ids": [
        "obs_environment_background_wall_001",
        "obs_environment_lava_001",
        "obs_environment_lava_flow_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "architecture",
      "claim": "presence of triangular platform supported by pipes",
      "value": "triangular platform and rusty pipes",
      "supporting_observation_ids": [
        "obs_object_pipesupport_001",
        "obs_object_platform_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_001",
      "module": "objects_and_props",
      "field_path": "object_details",
      "claim": "platform has red and black flame pattern",
      "value": "red and black flame pattern",
      "supporting_observation_ids": [
        "obs_pattern_platform_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is Japanese characters below TRAINER",
      "value": "Japanese text below TRAINER text",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "trainer_text",
      "claim": "English TRAINER text at top center",
      "value": "TRAINER",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "description_text_box",
      "claim": "Japanese description text present in bottom center text box",
      "value": "Japanese text",
      "supporting_observation_ids": [
        "obs_card_ui_text_box_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "print_marker",
      "claim": "circular print marker at lower right corner",
      "value": "print marker circle",
      "supporting_observation_ids": [
        "obs_card_ui_print_marker_circle_001"
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
      "obs_object_pipesupport_001",
      "obs_object_platform_001",
      "obs_pattern_platform_001"
    ],
    "background": [
      "obs_environment_background_wall_001",
      "obs_environment_lava_001",
      "obs_environment_lava_flow_001"
    ]
  },
  "environment": {
    "setting": [
      "lava environment"
    ],
    "indoor_outdoor": "uncertain",
    "sky": [],
    "ground": [
      "lava environment"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "triangular platform and rusty pipes"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_background_wall_001",
      "obs_environment_lava_001",
      "obs_environment_lava_flow_001",
      "obs_object_pipesupport_001",
      "obs_object_platform_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_platform_001",
      "label": "triangular platform with flame pattern",
      "normalized_label": "triangular platform",
      "object_type": "man-made platform",
      "colors": [
        "black",
        "red"
      ],
      "material_appearance": [
        "flat surface",
        "solid"
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
      "brown",
      "orange",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright glowing lava light"
    ],
    "shadows": [
      "shadow under platform"
    ],
    "highlights": [
      "highlight on platform surface"
    ],
    "composition": [
      "centered triangular platform"
    ],
    "camera_angle": "frontal slight downward",
    "framing": "tight frame on platform and lava background",
    "cropping": [],
    "depth": "moderate depth with foreground pipes and background lava wall",
    "motion_cues": [],
    "motifs": [
      "flames on platform",
      "lava flow"
    ],
    "repeated_shapes": [
      "triangular shape"
    ],
    "style_cues": [
      "digital illustration style"
    ],
    "supporting_observation_ids": [
      "obs_environment_background_wall_001",
      "obs_environment_lava_001",
      "obs_environment_lava_flow_001",
      "obs_object_pipesupport_001",
      "obs_object_platform_001",
      "obs_pattern_platform_001"
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
        "obs_object_pipesupport_001",
        "obs_object_platform_001",
        "obs_pattern_platform_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002"
      ],
      "observation_ids": [
        "obs_environment_background_wall_001",
        "obs_environment_lava_001",
        "obs_environment_lava_flow_001",
        "obs_object_pipesupport_001",
        "obs_object_platform_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_lava_001",
        "obs_object_platform_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_lava_001",
        "obs_object_platform_001"
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
        "fact_card_ui_004"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_box_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_print_marker_circle_001"
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
        "lava environment",
        "triangular platform",
        "flame pattern",
        "rusty pipes",
        "rocky wall with lava flow",
        "lava flow"
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
      "term": "lava environment",
      "supporting_observation_ids": [
        "obs_environment_lava_001"
      ]
    },
    {
      "term": "triangular platform",
      "supporting_observation_ids": [
        "obs_object_platform_001"
      ]
    },
    {
      "term": "flame pattern",
      "supporting_observation_ids": [
        "obs_pattern_platform_001"
      ]
    },
    {
      "term": "rusty pipes",
      "supporting_observation_ids": [
        "obs_object_pipesupport_001"
      ]
    },
    {
      "term": "rocky wall with lava flow",
      "supporting_observation_ids": [
        "obs_environment_background_wall_001"
      ]
    },
    {
      "term": "lava flow",
      "supporting_observation_ids": [
        "obs_environment_lava_flow_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_object_platform_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_pattern_platform_001"
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
- Review status: `needs_review`
- Description confidence: `0.96`
- Attribute confidence: `0.95`
- Cost USD: `0.0076268`
- Artwork observations: `10`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: colored light bands purple and white, lightning bolt shape, rocky dry ground, stone stairs, palm tree left, palm tree right, multiple palm or tropical trees, rock barrier around grassy patch. Semantic facts: outdoor, lightning, palm trees, circular motif. Counts: palm trees: 5-10.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| clear blue sky with some clouds | clear blue sky with clouds | environment_sky | background | prominent | 0.99 |
| purple and white aurora-like light rays from top left | colored light bands purple and white | environment_light_bands | background | high | 0.98 |
| thin yellow lightning bolt shape in left sky | lightning bolt shape | environment_lightning | background | medium | 0.96 |
| rocky dry ground with some cracks and patches of light sandy color | rocky dry ground | environment_terrain | foreground | high | 0.97 |
| circular green grassy patch with concentric darker circle pattern in center | circular grassy patch with pattern | environment_terrain | midground | prominent | 0.98 |
| stone stairs leading up to circular patch | stone stairs | environment_architecture | midground | medium | 0.95 |
| palm tree with broad green fronds on left foreground | palm tree left | environment_plants | foreground | high | 0.98 |
| palm tree with green fronds on right foreground | palm tree right | environment_plants | foreground | high | 0.98 |
| several smaller palm or tropical trees scattered around midground and background | multiple palm or tropical trees | environment_plants | midground and background | medium | 0.95 |
| rock formation or barrier encircling green patch in midground | rock barrier around grassy patch | environment_terrain | midground | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | sky type | obs_sky_001 | 0.99 |
| fact_env_002 | environment | colored light bands | obs_sky_light_bands_001 | 0.98 |
| fact_env_003 | environment | lightning visible | obs_lightning_001 | 0.96 |
| fact_env_004 | environment | terrain type | obs_terrain_001 | 0.97 |
| fact_env_005 | environment | feature | obs_terrain_green_patch_001 | 0.98 |
| fact_env_006 | environment | stone stairs present | obs_stairs_001 | 0.95 |
| fact_env_007 | environment | trees | obs_many_trees_001, obs_palm_tree_left_001, obs_palm_tree_right_001 | 0.98 |
| fact_env_008 | environment | rock barrier | obs_rock_barrier_001 | 0.95 |

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
| environment | complete | none | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | card_ui_and_print_markers.name_text_observation_ids: card name text present but not OCR readable |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | environment | outdoor |  | obs_palm_tree_left_001, obs_sky_001, obs_terrain_001 | clear blue sky with clouds palm trees rocky dry terrain | 0.99 |
| semfact_002 | environment | lightning |  | obs_lightning_001 | yellow lightning bolt shape in sky | 0.96 |
| semfact_003 | environment | palm trees |  | obs_many_trees_001, obs_palm_tree_left_001, obs_palm_tree_right_001 | green palm fronds visible | 0.97 |
| semfact_004 | motif | circular motif |  | obs_terrain_green_patch_001 | circular green grassy patch with concentric pattern | 0.98 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| palm trees | estimated_range | 5-10 | obs_many_trees_001, obs_palm_tree_left_001, obs_palm_tree_right_001 | 0.95 |

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
| clear blue sky with clouds | obs_sky_001 |
| colored light bands purple and white | obs_sky_light_bands_001 |
| lightning bolt shape | obs_lightning_001 |
| rocky dry ground | obs_terrain_001 |
| circular grassy patch with pattern | obs_terrain_green_patch_001 |
| stone stairs | obs_stairs_001 |
| palm tree left | obs_palm_tree_left_001 |
| palm tree right | obs_palm_tree_right_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora-like light bands | obs_sky_light_bands_001 | deterministic_rule | 0.98 |
| centered composition | obs_stairs_001, obs_terrain_green_patch_001 | deterministic_rule | 0.92 |
| circular motif | obs_terrain_green_patch_001 | deterministic_rule | 0.98 |
| cloud | obs_sky_001 | deterministic_rule | 0.99 |
| diagonal composition | obs_sky_light_bands_001 | deterministic_rule | 0.92 |
| left orientation | obs_palm_tree_left_001, obs_sky_light_bands_001 | deterministic_rule | 0.98 |
| lightning | obs_lightning_001 | deterministic_rule | 0.96 |
| outdoor | obs_palm_tree_left_001, obs_sky_001, obs_terrain_001 | deterministic_rule | 0.99 |
| palm trees | obs_many_trees_001, obs_palm_tree_left_001, obs_palm_tree_right_001 | deterministic_rule | 0.97 |
| plant | obs_many_trees_001, obs_palm_tree_left_001, obs_palm_tree_right_001 | deterministic_rule | 0.98 |
| right orientation | obs_palm_tree_right_001 | deterministic_rule | 0.98 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| stairs | obs_stairs_001 | deterministic_rule | 0.95 |
| terrain | obs_rock_barrier_001, obs_terrain_001, obs_terrain_green_patch_001 | deterministic_rule | 0.98 |
| tree | obs_many_trees_001, obs_palm_tree_left_001, obs_palm_tree_right_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: colored light bands purple and white, lightning bolt shape, rocky dry ground, stone stairs, palm tree left, palm tree right, multiple palm or tropical trees, rock barrier around grassy patch. Semantic facts: outdoor, lightning, palm trees, circular motif. Counts: palm trees: 5-10.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "environment_sky",
      "label": "clear blue sky with some clouds",
      "normalized_label": "clear blue sky with clouds",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_light_bands_001",
      "kind": "environment_light_bands",
      "label": "purple and white aurora-like light rays from top left",
      "normalized_label": "colored light bands purple and white",
      "scene_layer": "background",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_001",
      "kind": "environment_lightning",
      "label": "thin yellow lightning bolt shape in left sky",
      "normalized_label": "lightning bolt shape",
      "scene_layer": "background",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_001",
      "kind": "environment_terrain",
      "label": "rocky dry ground with some cracks and patches of light sandy color",
      "normalized_label": "rocky dry ground",
      "scene_layer": "foreground",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_green_patch_001",
      "kind": "environment_terrain",
      "label": "circular green grassy patch with concentric darker circle pattern in center",
      "normalized_label": "circular grassy patch with pattern",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stairs_001",
      "kind": "environment_architecture",
      "label": "stone stairs leading up to circular patch",
      "normalized_label": "stone stairs",
      "scene_layer": "midground",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palm_tree_left_001",
      "kind": "environment_plants",
      "label": "palm tree with broad green fronds on left foreground",
      "normalized_label": "palm tree left",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palm_tree_right_001",
      "kind": "environment_plants",
      "label": "palm tree with green fronds on right foreground",
      "normalized_label": "palm tree right",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_many_trees_001",
      "kind": "environment_plants",
      "label": "several smaller palm or tropical trees scattered around midground and background",
      "normalized_label": "multiple palm or tropical trees",
      "scene_layer": "midground and background",
      "frame_position": "center and sides",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_rock_barrier_001",
      "kind": "environment_terrain",
      "label": "rock formation or barrier encircling green patch in midground",
      "normalized_label": "rock barrier around grassy patch",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky type",
      "value": "clear blue with clouds",
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
      "claim": "colored light bands",
      "value": "purple and white aurora-like light rays from top left",
      "supporting_observation_ids": [
        "obs_sky_light_bands_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "weather",
      "claim": "lightning visible",
      "value": "thin yellow lightning bolt shape in left sky",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain type",
      "value": "rocky dry ground with sandy patches",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "terrain",
      "claim": "feature",
      "value": "circular green grassy patch with pattern",
      "supporting_observation_ids": [
        "obs_terrain_green_patch_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "architecture",
      "claim": "stone stairs present",
      "value": "stone stairs leading to grassy patch",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "plants",
      "claim": "trees",
      "value": "multiple palm trees and tropical plants in foreground and background",
      "supporting_observation_ids": [
        "obs_many_trees_001",
        "obs_palm_tree_left_001",
        "obs_palm_tree_right_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "environment",
      "field_path": "terrain",
      "claim": "rock barrier",
      "value": "rock formation encircling grassy patch",
      "supporting_observation_ids": [
        "obs_rock_barrier_001"
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
      "normalized_label": "palm trees",
      "count_type": "estimated_range",
      "exact_count": 0,
      "estimated_min": 5,
      "estimated_max": 10,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_many_trees_001",
        "obs_palm_tree_left_001",
        "obs_palm_tree_right_001"
      ],
      "scene_layer": "foreground_midground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_palm_tree_left_001",
      "obs_palm_tree_right_001",
      "obs_terrain_001"
    ],
    "midground": [
      "obs_many_trees_001",
      "obs_rock_barrier_001",
      "obs_stairs_001",
      "obs_terrain_green_patch_001"
    ],
    "background": [
      "obs_lightning_001",
      "obs_sky_001",
      "obs_sky_light_bands_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "aurora-like light bands",
      "clear blue",
      "clouds"
    ],
    "ground": [
      "grassy patch",
      "rocky dry ground"
    ],
    "terrain": [
      "green grassy patch",
      "rock barrier",
      "rocky",
      "stone stairs"
    ],
    "plants": [
      "palm trees",
      "tropical trees"
    ],
    "architecture": [
      "rock barrier",
      "stone stairs"
    ],
    "water": [],
    "weather": [
      "lightning"
    ],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_lightning_001",
      "obs_many_trees_001",
      "obs_palm_tree_left_001",
      "obs_palm_tree_right_001",
      "obs_rock_barrier_001",
      "obs_sky_001",
      "obs_sky_light_bands_001",
      "obs_stairs_001",
      "obs_terrain_001",
      "obs_terrain_green_patch_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "green",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright daylight"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "aurora light bands highlight"
    ],
    "composition": [
      "balanced palm trees on both sides",
      "central circular patch framed by stairs and rocks",
      "light rays diagonal from top left"
    ],
    "camera_angle": "eye-level, straight-on",
    "framing": "tight framing on stadium area",
    "cropping": [
      "full scene visible"
    ],
    "depth": "deep with clear foreground, midground, background separation",
    "motion_cues": [],
    "motifs": [
      "circular pattern",
      "natural outdoor"
    ],
    "repeated_shapes": [
      "circular patch",
      "palm fronds"
    ],
    "style_cues": [
      "natural colors",
      "realistic style"
    ],
    "supporting_observation_ids": [
      "obs_palm_tree_left_001",
      "obs_palm_tree_right_001",
      "obs_sky_001",
      "obs_sky_light_bands_001",
      "obs_stairs_001",
      "obs_terrain_green_patch_001"
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
        "obs_lightning_001",
        "obs_many_trees_001",
        "obs_palm_tree_left_001",
        "obs_palm_tree_right_001",
        "obs_rock_barrier_001",
        "obs_sky_001",
        "obs_sky_light_bands_001",
        "obs_stairs_001",
        "obs_terrain_001",
        "obs_terrain_green_patch_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_palm_tree_left_001",
        "obs_palm_tree_right_001",
        "obs_sky_light_bands_001",
        "obs_stairs_001",
        "obs_terrain_green_patch_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_sky_001",
        "obs_sky_light_bands_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_lightning_001"
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
        "clear blue sky with clouds",
        "colored light bands purple and white",
        "lightning bolt shape",
        "rocky dry ground",
        "circular grassy patch with pattern",
        "stone stairs",
        "palm tree left",
        "palm tree right"
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
      "omission_risk": "none",
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "card_ui_and_print_markers.name_text_observation_ids",
          "reason": "card name text present but not OCR readable",
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
      "label": "outdoor",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_palm_tree_left_001",
        "obs_sky_001",
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
          "clear blue sky with clouds",
          "palm trees",
          "rocky dry terrain"
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
          "yellow lightning bolt shape in sky"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.96,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_003",
      "category": "environment",
      "label": "palm trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_many_trees_001",
        "obs_palm_tree_left_001",
        "obs_palm_tree_right_001"
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
          "green palm fronds visible"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_004",
      "category": "motif",
      "label": "circular motif",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_terrain_green_patch_001"
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
        "objects": [],
        "relationships": [],
        "other": [
          "circular green grassy patch with concentric pattern"
        ]
      },
      "confidence": 0.98,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "clear blue sky with clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "colored light bands purple and white",
      "supporting_observation_ids": [
        "obs_sky_light_bands_001"
      ]
    },
    {
      "term": "lightning bolt shape",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ]
    },
    {
      "term": "rocky dry ground",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ]
    },
    {
      "term": "circular grassy patch with pattern",
      "supporting_observation_ids": [
        "obs_terrain_green_patch_001"
      ]
    },
    {
      "term": "stone stairs",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ]
    },
    {
      "term": "palm tree left",
      "supporting_observation_ids": [
        "obs_palm_tree_left_001"
      ]
    },
    {
      "term": "palm tree right",
      "supporting_observation_ids": [
        "obs_palm_tree_right_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_sky_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_stairs_001",
          "obs_terrain_green_patch_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_terrain_green_patch_001"
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
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_sky_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_palm_tree_left_001",
          "obs_sky_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_lightning_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "outdoor",
        "source_observation_ids": [
          "obs_palm_tree_left_001",
          "obs_sky_001",
          "obs_terrain_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "palm trees",
        "source_observation_ids": [
          "obs_many_trees_001",
          "obs_palm_tree_left_001",
          "obs_palm_tree_right_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_many_trees_001",
          "obs_palm_tree_left_001",
          "obs_palm_tree_right_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_palm_tree_right_001"
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
        "concept": "stairs",
        "source_observation_ids": [
          "obs_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_rock_barrier_001",
          "obs_terrain_001",
          "obs_terrain_green_patch_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_many_trees_001",
          "obs_palm_tree_left_001",
          "obs_palm_tree_right_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-106 - Tremendous Bomb

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.96`
- Attribute confidence: `0.95`
- Cost USD: `0.0088924`
- Artwork observations: `8`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: bomb, bomb body, black and yellow stripes, fuse, red fuse, spark, explosion flash, color gradient background. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | high | 0.99 |
| body of bomb | bomb body | object_part | foreground | high | 0.98 |
| black and yellow striped body | black and yellow stripes | color_region | foreground | high | 0.99 |
| fuse of bomb | fuse | object_part | foreground | high | 0.95 |
| red fuse | red fuse | color_region | foreground | medium | 0.95 |
| lit fuse spark | spark | visual_effect | foreground | medium | 0.98 |
| bomb explosion flash | explosion flash | visual_effect | foreground | high | 0.97 |
| orange, blue and purple gradient background | color gradient background | background | background | medium | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text top left | card_ui_text | top left | visible | 0.9 |
| Japanese text top right | card_ui_text | top right | visible | 0.9 |
| Japanese card name text below header | card_ui_text | top center | visible | 0.95 |
| Japanese main descriptive text below illustration | card_ui_text | below illustration | visible | 0.95 |
| Japanese text in purple oval bottom right | card_ui_text | bottom right | visible | 0.94 |
| illus. inose yukie | illustrator_text | bottom left | visible | 0.95 |
| set symbol J M5 | card_ui_symbol | bottom left | visible | 0.96 |
| 106/081 SR | collector_number | bottom left | visible | 0.96 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_count_bomb_001 | counts | exact count of bombs | obs_bomb_001 | 0.99 |
| fact_object_bomb_body_001 | objects_and_props | object labeled as bomb body | obs_bomb_body_001, obs_bomb_body_color_001 | 0.98 |
| fact_object_bomb_fuse_001 | objects_and_props | object labeled as bomb fuse | obs_bomb_fuse_001, obs_bomb_fuse_color_001, obs_bomb_fuse_lit_001 | 0.96 |
| fact_background_gradient_001 | environment | background setting color gradient | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_text_japanese_001 | card name text in Japanese | obs_text_card_name_001 | 0.95 |
| fact_main_text_japanese_001 | main descriptive text in Japanese | obs_text_main_001 | 0.95 |
| fact_footer_text_japanese_001 | text in purple oval at bottom right | obs_text_footer_001 | 0.94 |
| fact_illustrator_text_001 | illustrator text | obs_illustrator_001 | 0.95 |
| fact_set_symbol_001 | visible set symbol | obs_set_icon_001 | 0.96 |
| fact_card_number_001 | collector number visible | obs_card_number_001 | 0.96 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_name_text_japanese_001",
    "fact_card_number_001",
    "fact_footer_text_japanese_001",
    "fact_illustrator_text_001",
    "fact_main_text_japanese_001",
    "fact_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_text_card_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_icon_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_text_footer_001",
    "obs_text_main_001"
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
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | none_visible | none | high |  |
| color_and_light | none_visible | none | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
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
| bomb body | obs_bomb_body_001 |
| black and yellow stripes | obs_bomb_body_color_001 |
| fuse | obs_bomb_fuse_001 |
| red fuse | obs_bomb_fuse_color_001 |
| spark | obs_bomb_fuse_lit_001 |
| explosion flash | obs_bomb_flash_001 |
| color gradient background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_bomb_001 | deterministic_rule | 0.92 |
| explosion | obs_bomb_flash_001 | deterministic_rule | 0.97 |
| spark | obs_bomb_fuse_lit_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body, black and yellow stripes, fuse, red fuse, spark, explosion flash, color gradient background. Counts: bomb: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
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
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_001",
      "kind": "object_part",
      "label": "body of bomb",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_color_001",
      "kind": "color_region",
      "label": "black and yellow striped body",
      "normalized_label": "black and yellow stripes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "kind": "object_part",
      "label": "fuse of bomb",
      "normalized_label": "fuse",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_color_001",
      "kind": "color_region",
      "label": "red fuse",
      "normalized_label": "red fuse",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_lit_001",
      "kind": "visual_effect",
      "label": "lit fuse spark",
      "normalized_label": "spark",
      "scene_layer": "foreground",
      "frame_position": "top right fuse",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_flash_001",
      "kind": "visual_effect",
      "label": "bomb explosion flash",
      "normalized_label": "explosion flash",
      "scene_layer": "foreground",
      "frame_position": "center right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "background",
      "label": "orange, blue and purple gradient background",
      "normalized_label": "color gradient background",
      "scene_layer": "background",
      "frame_position": "full card",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_top_001",
      "kind": "card_ui_text",
      "label": "Japanese text top left",
      "normalized_label": "Japanese text top left",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_text_top_right_001",
      "kind": "card_ui_text",
      "label": "Japanese text top right",
      "normalized_label": "Japanese text top right",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_text_card_name_001",
      "kind": "card_ui_text",
      "label": "Japanese card name text below header",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_main_001",
      "kind": "card_ui_text",
      "label": "Japanese main descriptive text below illustration",
      "normalized_label": "main descriptive text",
      "scene_layer": "card_ui",
      "frame_position": "below illustration",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_footer_001",
      "kind": "card_ui_text",
      "label": "Japanese text in purple oval bottom right",
      "normalized_label": "purple oval text",
      "scene_layer": "card_ui",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_001",
      "kind": "illustrator_text",
      "label": "illus. inose yukie",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_icon_001",
      "kind": "card_ui_symbol",
      "label": "set symbol J M5",
      "normalized_label": "set icon j m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "collector_number",
      "label": "106/081 SR",
      "normalized_label": "106/81 SR",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_count_bomb_001",
      "module": "counts",
      "field_path": "counts.count_id",
      "claim": "exact count of bombs",
      "value": "1",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_body_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.label",
      "claim": "object labeled as bomb body",
      "value": "bomb body with black and yellow stripes",
      "supporting_observation_ids": [
        "obs_bomb_body_001",
        "obs_bomb_body_color_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_fuse_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.label",
      "claim": "object labeled as bomb fuse",
      "value": "red fuse with lit spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_fuse_color_001",
        "obs_bomb_fuse_lit_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_background_gradient_001",
      "module": "environment",
      "field_path": "environment.setting",
      "claim": "background setting color gradient",
      "value": "orange, blue and purple gradient",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_name_text_japanese_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.name_text_observation_ids",
      "claim": "card name text in Japanese",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_text_card_name_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_main_text_japanese_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.bottom_line_text_observation_ids",
      "claim": "main descriptive text in Japanese",
      "value": "present",
      "supporting_observation_ids": [
        "obs_text_main_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_footer_text_japanese_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.bottom_line_text_observation_ids",
      "claim": "text in purple oval at bottom right",
      "value": "present",
      "supporting_observation_ids": [
        "obs_text_footer_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.illustrator_text_observation_ids",
      "claim": "illustrator text",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.set_symbol_observation_ids",
      "claim": "visible set symbol",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_set_icon_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.collector_number_observation_ids",
      "claim": "collector number visible",
      "value": "106/081 SR",
      "supporting_observation_ids": [
        "obs_card_number_001"
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
      "count_id": "count_bomb_001",
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
      "obs_bomb_body_001",
      "obs_bomb_body_color_001",
      "obs_bomb_flash_001",
      "obs_bomb_fuse_001",
      "obs_bomb_fuse_color_001",
      "obs_bomb_fuse_lit_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "blue gradient",
      "orange gradient",
      "purple gradient"
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
      "obs_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "device",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded body",
        "striped yellow band"
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
      "purple",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright highlight on bomb body",
      "lit fuse spark"
    ],
    "shadows": [
      "none clearly visible"
    ],
    "highlights": [
      "white bright highlight"
    ],
    "composition": [
      "central bomb object",
      "radiating shape gradient background"
    ],
    "camera_angle": "straight-on",
    "framing": "tight crop around bomb",
    "cropping": [],
    "depth": "moderate",
    "motion_cues": [
      "lit fuse spark suggesting ignition"
    ],
    "motifs": [
      "striped yellow bands"
    ],
    "repeated_shapes": [
      "oblong body",
      "rounded spark shapes"
    ],
    "style_cues": [
      "stylized illustration",
      "vibrant colors"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_bomb_001",
      "obs_bomb_fuse_lit_001"
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
        "fact_count_bomb_001",
        "fact_object_bomb_body_001",
        "fact_object_bomb_fuse_001"
      ],
      "object_observation_ids": [
        "obs_bomb_001",
        "obs_bomb_body_001",
        "obs_bomb_fuse_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_background_gradient_001"
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
      "observation_ids": [
        "obs_bomb_flash_001",
        "obs_bomb_fuse_lit_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_name_text_japanese_001",
        "fact_card_number_001",
        "fact_footer_text_japanese_001",
        "fact_illustrator_text_001",
        "fact_main_text_japanese_001",
        "fact_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_text_card_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_icon_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_text_footer_001",
        "obs_text_main_001"
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
      "fact_ids": [
        "fact_count_bomb_001"
      ],
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
        "bomb body",
        "black and yellow stripes",
        "fuse",
        "red fuse",
        "spark",
        "explosion flash",
        "color gradient background"
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
      "review_status": "likely_complete",
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    },
    {
      "term": "bomb body",
      "supporting_observation_ids": [
        "obs_bomb_body_001"
      ]
    },
    {
      "term": "black and yellow stripes",
      "supporting_observation_ids": [
        "obs_bomb_body_color_001"
      ]
    },
    {
      "term": "fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001"
      ]
    },
    {
      "term": "red fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_color_001"
      ]
    },
    {
      "term": "spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_lit_001"
      ]
    },
    {
      "term": "explosion flash",
      "supporting_observation_ids": [
        "obs_bomb_flash_001"
      ]
    },
    {
      "term": "color gradient background",
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
          "obs_bomb_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_bomb_flash_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_bomb_fuse_lit_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
- Attribute confidence: `0.95`
- Cost USD: `0.0090196`
- Artwork observations: `5`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Visible observations: bell, handle, bell body, sphere, purple swirl vortex. Counts: bell-shaped object: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bell-shaped object | bell | object | midground | high | 0.99 |
| handle of bell | handle | object | midground | medium | 0.98 |
| bell body with geometric patterns | bell body | object | midground | high | 0.99 |
| inner sphere in bell | sphere | object | midground | medium | 0.95 |
| purple swirling vortex background | purple swirl vortex | environment | background | high | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text at top left | card_ui_text | top_left | fully_visible | 0.95 |
| Japanese text at top right | card_ui_text | top_right | fully_visible | 0.95 |
| Japanese text below top left corner | card_ui_text | upper_left_center | fully_visible | 0.99 |
| Japanese text across bottom center inside blue oval | card_ui_text | bottom_center | fully_visible | 0.97 |
| Illustrator credit text 'Illus. Toystep Beach' at bottom left | card_ui_text | bottom_left | fully_visible | 0.96 |
| Set and number code 'J M5 105/081 SR' at bottom left | card_ui_text | bottom_left | fully_visible | 0.98 |
| Copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' along bottom | card_ui_text | bottom | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | bell-shaped object is present | obs_object_001 | 0.99 |
| fact_obj_002 | objects_and_props | handle attached to bell | obs_object_002 | 0.98 |
| fact_obj_003 | objects_and_props | bell body has geometric patterns | obs_object_003 | 0.99 |
| fact_obj_004 | objects_and_props | inner sphere inside bell | obs_object_004 | 0.95 |
| fact_env_001 | environment | background has purple swirling vortex | obs_environment_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | card has Japanese name text at top left | obs_card_ui_003 | 0.99 |
| fact_ui_002 | additional Japanese text at top left and right | obs_card_ui_001, obs_card_ui_002 | 0.95 |
| fact_ui_003 | card has Japanese text within blue oval near bottom center | obs_card_ui_004 | 0.97 |
| fact_ui_004 | illustrator is 'Illus. Toystep Beach' | obs_card_ui_005 | 0.96 |
| fact_ui_005 | collector number is '105/081 SR' with Set Code 'J M5' | obs_card_ui_006 | 0.98 |
| fact_ui_006 | copyright text present | obs_card_ui_007 | 0.99 |

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
    "obs_card_ui_003"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_006"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_007"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_004"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_005"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_001",
    "obs_card_ui_002"
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
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | none_visible | none | high |  |
| color_and_light | none_visible | none | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
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
| bell-shaped object | exact | 1 | obs_object_001 | 0.99 |

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
| bell | obs_object_001 |
| handle | obs_object_002 |
| bell body | obs_object_003 |
| sphere | obs_object_004 |
| purple swirl vortex | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| spiral motif | obs_environment_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bell, handle, bell body, sphere, purple swirl vortex. Counts: bell-shaped object: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "bell-shaped object",
      "normalized_label": "bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "handle of bell",
      "normalized_label": "handle",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_003",
      "kind": "object",
      "label": "bell body with geometric patterns",
      "normalized_label": "bell body",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_004",
      "kind": "object",
      "label": "inner sphere in bell",
      "normalized_label": "sphere",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "purple swirling vortex background",
      "normalized_label": "purple swirl vortex",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "Japanese text at top left",
      "normalized_label": "japanese text",
      "scene_layer": "foreground",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "Japanese text at top right",
      "normalized_label": "japanese text",
      "scene_layer": "foreground",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "Japanese text below top left corner",
      "normalized_label": "japanese text",
      "scene_layer": "foreground",
      "frame_position": "upper_left_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "Japanese text across bottom center inside blue oval",
      "normalized_label": "japanese text",
      "scene_layer": "foreground",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "Illustrator credit text 'Illus. Toystep Beach' at bottom left",
      "normalized_label": "illustrator text",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "Set and number code 'J M5 105/081 SR' at bottom left",
      "normalized_label": "collector number and set",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "Copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' along bottom",
      "normalized_label": "copyright line",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].label",
      "claim": "bell-shaped object is present",
      "value": "bell-shaped object",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "objects_and_props[1].label",
      "claim": "handle attached to bell",
      "value": "handle",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "objects_and_props[2].label",
      "claim": "bell body has geometric patterns",
      "value": "geometric patterned bell body",
      "supporting_observation_ids": [
        "obs_object_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_004",
      "module": "objects_and_props",
      "field_path": "objects_and_props[3].label",
      "claim": "inner sphere inside bell",
      "value": "sphere",
      "supporting_observation_ids": [
        "obs_object_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "environment.setting[0]",
      "claim": "background has purple swirling vortex",
      "value": "purple swirling vortex",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.name_text_observation_ids[0]",
      "claim": "card has Japanese name text at top left",
      "value": "Japanese text",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.other_print_marker_observation_ids[0]",
      "claim": "additional Japanese text at top left and right",
      "value": "Japanese text",
      "supporting_observation_ids": [
        "obs_card_ui_001",
        "obs_card_ui_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.bottom_line_text_observation_ids[0]",
      "claim": "card has Japanese text within blue oval near bottom center",
      "value": "Japanese text",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.illustrator_text_observation_ids[0]",
      "claim": "illustrator is 'Illus. Toystep Beach'",
      "value": "Illus. Toystep Beach",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.collector_number_observation_ids[0]",
      "claim": "collector number is '105/081 SR' with Set Code 'J M5'",
      "value": "105/081 SR, J M5",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.copyright_line_observation_ids[0]",
      "claim": "copyright text present",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_007"
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
      "count_id": "count_bell_001",
      "normalized_label": "bell-shaped object",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_card_ui_001",
      "obs_card_ui_002",
      "obs_card_ui_003",
      "obs_card_ui_004",
      "obs_card_ui_005",
      "obs_card_ui_006",
      "obs_card_ui_007"
    ],
    "midground": [
      "obs_object_001",
      "obs_object_002",
      "obs_object_003",
      "obs_object_004"
    ],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "purple swirling vortex"
    ],
    "indoor_outdoor": "indoor_appearance_suggested_by_vortex",
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
      "label": "bell-shaped object",
      "normalized_label": "bell",
      "object_type": "object",
      "colors": [
        "black",
        "dark",
        "grey",
        "purple"
      ],
      "material_appearance": [
        "dark rounded body",
        "geometric patterned surface",
        "highlighted edges"
      ],
      "location": "center",
      "count_reference": "count_bell_001",
      "confidence": 0.99
    },
    {
      "observation_id": "obs_object_002",
      "label": "handle of bell",
      "normalized_label": "handle",
      "object_type": "part",
      "colors": [
        "black",
        "dark"
      ],
      "material_appearance": [
        "dark rounded surface",
        "geometric shape"
      ],
      "location": "attached to bell",
      "count_reference": "count_bell_001",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_object_003",
      "label": "bell body with geometric patterns",
      "normalized_label": "bell body",
      "object_type": "part",
      "colors": [
        "black",
        "dark blue",
        "grey"
      ],
      "material_appearance": [
        "geometric patterns",
        "highlighted edges"
      ],
      "location": "bell main part",
      "count_reference": "count_bell_001",
      "confidence": 0.99
    },
    {
      "observation_id": "obs_object_004",
      "label": "inner sphere in bell",
      "normalized_label": "sphere",
      "object_type": "part",
      "colors": [
        "black",
        "white highlight"
      ],
      "material_appearance": [
        "smooth round"
      ],
      "location": "inside bell",
      "count_reference": "count_bell_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue highlights",
      "dark purple",
      "grey",
      "white highlights"
    ],
    "lighting": [
      "glowing highlights",
      "reflected light on edges"
    ],
    "shadows": [
      "defined black shadows on object edges"
    ],
    "highlights": [
      "bright white edge highlights",
      "metallic-style highlights"
    ],
    "composition": [
      "central placement",
      "rotated sideways positioning",
      "swirling vortex background"
    ],
    "camera_angle": "orthogonal framed",
    "framing": "tight crop with full object",
    "cropping": [],
    "depth": "medium depth cues with shadow and highlights",
    "motion_cues": [
      "swirling vortex background indicating motion"
    ],
    "motifs": [
      "geometric pattern on bell body"
    ],
    "repeated_shapes": [
      "multiple polygonal facets on bell surface"
    ],
    "style_cues": [
      "shading",
      "sharp edges"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_object_001",
      "obs_object_002",
      "obs_object_003",
      "obs_object_004"
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
        "obs_object_002",
        "obs_object_003",
        "obs_object_004"
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
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005",
        "fact_ui_006"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_003"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_006"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_007"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_004"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_005"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_001",
        "obs_card_ui_002"
      ]
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_bell_001"
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
        "bell",
        "handle",
        "bell body",
        "sphere",
        "purple swirl vortex"
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
      "term": "bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "handle",
      "supporting_observation_ids": [
        "obs_object_002"
      ]
    },
    {
      "term": "bell body",
      "supporting_observation_ids": [
        "obs_object_003"
      ]
    },
    {
      "term": "sphere",
      "supporting_observation_ids": [
        "obs_object_004"
      ]
    },
    {
      "term": "purple swirl vortex",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-074 - リトライバッジ

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0083664`
- Artwork observations: `2`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Counts: silver star-shaped badge with ribbon: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| silver star-shaped badge with ribbon | silver star-shaped badge with ribbon | object | midground | primary | 0.99 |
| light blue swirling background | light blue swirling background | object | background | primary | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text 'リトライバッジ' | card_ui_text | top_left | fully_visible | 0.99 |
| set symbol 'm5' | set_symbol | bottom_left | fully_visible | 0.99 |
| collector number '074/081' | collector_number | bottom_left | fully_visible | 0.99 |
| illustrator text 'Illus. Toyste Beach' | illustrator_text | bottom_left | fully_visible | 0.95 |
| copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' | bottom_line_text | bottom_center | fully_visible | 0.95 |
| text banner top left 'ポケモンのどうぐ' | card_ui_text | top_left | fully_visible | 0.95 |
| text banner top right 'トレーナーズ' | card_ui_text | top_right | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001_main_object | objects_and_props | main object is a silver star-shaped badge with ribbon | obs_object_001 | 0.99 |
| fact_env_001_background | environment | background setting is light blue swirling pattern | obs_object_002 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text reads 'リトライバッジ' | obs_card_ui_name_text_001 | 0.99 |
| fact_card_ui_set_symbol_001 | set symbol 'm5' is visible | obs_card_ui_set_symbol_001 | 0.99 |
| fact_card_ui_collector_num_001 | collector number '074/081' is visible | obs_card_ui_collector_number_001 | 0.99 |
| fact_card_ui_illustrator_001 | illustrator text reads 'Illus. Toyste Beach' | obs_card_ui_illustrator_text_001 | 0.95 |
| fact_card_ui_copyright_001 | copyright text reads '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' | obs_card_ui_bottom_legal_text_001 | 0.95 |
| fact_card_ui_top_banner_001 | top banner text left reads 'ポケモンのどうぐ' | obs_card_ui_top_banner_001 | 0.95 |
| fact_card_ui_top_banner_002 | top banner text right reads 'トレーナーズ' | obs_card_ui_top_banner_002 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_num_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_top_banner_001",
    "fact_card_ui_top_banner_002"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001",
    "obs_card_ui_top_banner_001",
    "obs_card_ui_top_banner_002"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_legal_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_legal_text_001"
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
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
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| silver star-shaped badge with ribbon | exact | 1 | obs_object_001 | 0.99 |

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
| silver star-shaped badge with ribbon | obs_object_001 |
| light blue swirling background | obs_object_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_object_001 | deterministic_rule | 0.92 |
| spiral motif | obs_object_002 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: silver star-shaped badge with ribbon: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "silver star-shaped badge with ribbon",
      "normalized_label": "silver star-shaped badge with ribbon",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "light blue swirling background",
      "normalized_label": "light blue swirling background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text 'リトライバッジ'",
      "normalized_label": "リトライバッジ",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol 'm5'",
      "normalized_label": "m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "collector number '074/081'",
      "normalized_label": "074/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator text 'Illus. Toyste Beach'",
      "normalized_label": "Illus. Toyste Beach",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_legal_text_001",
      "kind": "bottom_line_text",
      "label": "copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.'",
      "normalized_label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "scene_layer": "card_ui",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_banner_001",
      "kind": "card_ui_text",
      "label": "text banner top left 'ポケモンのどうぐ'",
      "normalized_label": "ポケモンのどうぐ",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_banner_002",
      "kind": "card_ui_text",
      "label": "text banner top right 'トレーナーズ'",
      "normalized_label": "トレーナーズ",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001_main_object",
      "module": "objects_and_props",
      "field_path": "objects[0]",
      "claim": "main object is a silver star-shaped badge with ribbon",
      "value": "silver star-shaped badge with ribbon",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001_background",
      "module": "environment",
      "field_path": "environment.setting",
      "claim": "background setting is light blue swirling pattern",
      "value": "light blue swirling background",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text reads 'リトライバッジ'",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol 'm5' is visible",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_num_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number '074/081' is visible",
      "value": "074/081",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text reads 'Illus. Toyste Beach'",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text reads '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.'",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_legal_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_top_banner_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "top banner text left reads 'ポケモンのどうぐ'",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_top_banner_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_top_banner_002",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "top banner text right reads 'トレーナーズ'",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_top_banner_002"
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
      "normalized_label": "silver star-shaped badge with ribbon",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
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
      "obs_object_002"
    ]
  },
  "environment": {
    "setting": [
      "light blue swirling background"
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
      "obs_object_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "silver star-shaped badge with ribbon",
      "normalized_label": "silver star-shaped badge with ribbon",
      "object_type": "badge",
      "colors": [
        "light blue",
        "silver",
        "white"
      ],
      "material_appearance": [
        "bright highlights",
        "metallic-looking highlights"
      ],
      "location": "center midground",
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
      "bright",
      "soft"
    ],
    "shadows": [
      "minimal"
    ],
    "highlights": [
      "metallic-looking highlights"
    ],
    "composition": [
      "centered main object",
      "symmetrical design"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing",
    "cropping": [
      "full badge visible"
    ],
    "depth": "moderate",
    "motion_cues": [],
    "motifs": [
      "star shape"
    ],
    "repeated_shapes": [
      "circular ring",
      "star points"
    ],
    "style_cues": [
      "clean",
      "metallic",
      "modern"
    ],
    "supporting_observation_ids": [
      "obs_object_001",
      "obs_object_002"
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
        "fact_obj_001_main_object"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001_background"
      ],
      "observation_ids": [
        "obs_object_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_obj_001_main_object"
      ],
      "observation_ids": [
        "obs_object_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_obj_001_main_object"
      ],
      "observation_ids": [
        "obs_object_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_collector_num_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_top_banner_001",
        "fact_card_ui_top_banner_002"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001",
        "obs_card_ui_top_banner_001",
        "obs_card_ui_top_banner_002"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_legal_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_legal_text_001"
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
        "silver star-shaped badge with ribbon",
        "light blue swirling background"
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "silver star-shaped badge with ribbon",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "light blue swirling background",
      "supporting_observation_ids": [
        "obs_object_002"
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
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_object_002"
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
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0083776`
- Artwork observations: `10`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: bomb, bomb body, black, bright shiny highlight, yellow and black striped band, yellow and black, red fuse, spark ignition. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | high | 0.95 |
| bomb body | bomb body | object | foreground | high | 0.95 |
| black bomb body color | black | color_field | foreground | high | 0.95 |
| bright shiny highlight on bomb body | bright shiny highlight | highlight | foreground | medium | 0.9 |
| yellow and black striped band around bomb | yellow and black striped band | object | foreground | high | 0.95 |
| yellow and black colors on band | yellow and black | color_field | foreground | high | 0.95 |
| red fuse attached to bomb | red fuse | object | foreground | high | 0.95 |
| spark ignition at fuse tip | spark ignition | visual_effect | foreground | high | 0.95 |
| yellow explosion icon on bomb body | yellow explosion icon | object | foreground | medium | 0.9 |
| blue and orange radial background behind bomb | blue and orange | color_field | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| ごうかいボム | card_name_text | top-center | visible | 0.95 |
| jpn-m5 | set_symbol | bottom-left | visible | 0.9 |
| 073/081 | collector_number | bottom-left | visible | 0.9 |
| U | rarity_mark | bottom-left | visible | 0.9 |
| illus. inose yukie | illustrator_text | bottom-left | visible | 0.9 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | copyright_text | bottom | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_count_bomb_001 | counts | exact count of bombs | obs_artwork_main_object_001 | 0.95 |
| fact_obj_bomb_body_color_001 | objects_and_props | bomb body color is black | obs_artwork_bomb_color_001 | 0.95 |
| fact_obj_bomb_band_colors_001 | objects_and_props | bomb band colors are yellow and black | obs_artwork_bomb_band_color_001 | 0.95 |
| fact_obj_bomb_fuse_color_001 | objects_and_props | bomb fuse color is red | obs_artwork_bomb_fuse_001 | 0.95 |
| fact_obj_bomb_fuse_spark_001 | visual_effects | spark ignition at fuse tip | obs_artwork_bomb_fuse_spark_001 | 0.95 |
| fact_obj_bomb_explosion_icon_001 | objects_and_props | yellow explosion icon on bomb body | obs_artwork_bomb_explosion_icon_001 | 0.9 |
| fact_env_background_color_001 | environment | background radial pattern of blue and orange colors | obs_artwork_background_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text visible | obs_card_ui_name_text_001 | 0.95 |
| fact_card_ui_set_symbol_001 | set symbol visible | obs_card_ui_set_symbol_001 | 0.9 |
| fact_card_ui_collector_number_001 | collector number visible | obs_card_ui_collector_number_001 | 0.9 |
| fact_card_ui_rarity_mark_001 | rarity mark visible | obs_card_ui_rarity_mark_001 | 0.9 |
| fact_card_ui_illustrator_001 | illustrator text visible | obs_card_ui_illustrator_text_001 | 0.9 |
| fact_card_ui_copyright_001 | copyright line visible | obs_card_ui_copyright_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_number_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_rarity_mark_001",
    "fact_card_ui_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_rarity_mark_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
  ],
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
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | none_visible | none | high |  |
| color_and_light | none_visible | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_artwork_main_object_001 | 0.95 |

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
| red fuse | obs_artwork_bomb_fuse_001 |
| black bomb body | obs_artwork_bomb_body_001 |
| yellow and black striped band | obs_artwork_bomb_band_001 |
| spark ignition | obs_artwork_bomb_fuse_spark_001 |
| yellow explosion icon | obs_artwork_bomb_explosion_icon_001 |
| blue and orange radial background | obs_artwork_background_001 |
| bright reflective-looking highlight on bomb | obs_artwork_bomb_shiny_highlight_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| explosion | obs_artwork_bomb_explosion_icon_001 | deterministic_rule | 0.9 |
| radial lines | obs_artwork_background_001 | deterministic_rule | 0.92 |
| reflective-looking surface | obs_artwork_bomb_shiny_highlight_001 | deterministic_rule | 0.9 |
| spark | obs_artwork_bomb_fuse_spark_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body, black, bright shiny highlight, yellow and black striped band, yellow and black, red fuse, spark ignition. Counts: bomb: 1.
- Quality flags: `none`
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
      "scene_layer": "interface",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "jpn-m5",
      "normalized_label": "jpn-m5",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "073/081",
      "normalized_label": "073/081",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_mark_001",
      "kind": "rarity_mark",
      "label": "U",
      "normalized_label": "U",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illus. inose yukie",
      "normalized_label": "illus. inose yukie",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "scene_layer": "interface",
      "frame_position": "bottom",
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
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_body_001",
      "kind": "object",
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_color_001",
      "kind": "color_field",
      "label": "black bomb body color",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_shiny_highlight_001",
      "kind": "highlight",
      "label": "bright shiny highlight on bomb body",
      "normalized_label": "bright shiny highlight",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_band_001",
      "kind": "object",
      "label": "yellow and black striped band around bomb",
      "normalized_label": "yellow and black striped band",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_band_color_001",
      "kind": "color_field",
      "label": "yellow and black colors on band",
      "normalized_label": "yellow and black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_fuse_001",
      "kind": "object",
      "label": "red fuse attached to bomb",
      "normalized_label": "red fuse",
      "scene_layer": "foreground",
      "frame_position": "top-right of bomb",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_fuse_spark_001",
      "kind": "visual_effect",
      "label": "spark ignition at fuse tip",
      "normalized_label": "spark ignition",
      "scene_layer": "foreground",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_explosion_icon_001",
      "kind": "object",
      "label": "yellow explosion icon on bomb body",
      "normalized_label": "yellow explosion icon",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_background_001",
      "kind": "color_field",
      "label": "blue and orange radial background behind bomb",
      "normalized_label": "blue and orange",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_count_bomb_001",
      "module": "counts",
      "field_path": "exact_count",
      "claim": "exact count of bombs",
      "value": "1",
      "supporting_observation_ids": [
        "obs_artwork_main_object_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_body_color_001",
      "module": "objects_and_props",
      "field_path": "colors",
      "claim": "bomb body color is black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_artwork_bomb_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_band_colors_001",
      "module": "objects_and_props",
      "field_path": "colors",
      "claim": "bomb band colors are yellow and black",
      "value": "yellow and black",
      "supporting_observation_ids": [
        "obs_artwork_bomb_band_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_fuse_color_001",
      "module": "objects_and_props",
      "field_path": "colors",
      "claim": "bomb fuse color is red",
      "value": "red",
      "supporting_observation_ids": [
        "obs_artwork_bomb_fuse_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_fuse_spark_001",
      "module": "visual_effects",
      "field_path": "label",
      "claim": "spark ignition at fuse tip",
      "value": "spark ignition",
      "supporting_observation_ids": [
        "obs_artwork_bomb_fuse_spark_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_explosion_icon_001",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "yellow explosion icon on bomb body",
      "value": "yellow explosion icon",
      "supporting_observation_ids": [
        "obs_artwork_bomb_explosion_icon_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_background_color_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background radial pattern of blue and orange colors",
      "value": "blue and orange radial background",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "073/081",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_rarity_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "rarity mark visible",
      "value": "U",
      "supporting_observation_ids": [
        "obs_card_ui_rarity_mark_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
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
      "count_id": "count_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_artwork_main_object_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_artwork_bomb_band_001",
      "obs_artwork_bomb_body_001",
      "obs_artwork_bomb_explosion_icon_001",
      "obs_artwork_bomb_fuse_001",
      "obs_artwork_bomb_fuse_spark_001",
      "obs_artwork_main_object_001"
    ],
    "midground": [],
    "background": [
      "obs_artwork_background_001"
    ]
  },
  "environment": {
    "setting": [
      "blue and orange radial background"
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
      "obs_artwork_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_artwork_main_object_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "object",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "reflective-looking"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "orange",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright highlights on bomb body"
    ],
    "shadows": [],
    "highlights": [
      "bright shiny highlight on bomb body"
    ],
    "composition": [
      "central composition",
      "radial background"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing on bomb and fuse",
    "cropping": [
      "full bomb visible"
    ],
    "depth": "moderate depth",
    "motion_cues": [
      "spark at fuse tip"
    ],
    "motifs": [
      "circular motif",
      "explosion icon"
    ],
    "repeated_shapes": [
      "hexagonal shapes on bomb band"
    ],
    "style_cues": [
      "illustration style consistent with TCG art"
    ],
    "supporting_observation_ids": [
      "obs_artwork_background_001",
      "obs_artwork_bomb_fuse_spark_001",
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
        "fact_obj_bomb_band_colors_001",
        "fact_obj_bomb_body_color_001",
        "fact_obj_bomb_explosion_icon_001",
        "fact_obj_bomb_fuse_color_001",
        "fact_obj_count_bomb_001"
      ],
      "object_observation_ids": [
        "obs_artwork_bomb_band_001",
        "obs_artwork_bomb_body_001",
        "obs_artwork_bomb_explosion_icon_001",
        "obs_artwork_bomb_fuse_001",
        "obs_artwork_main_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_background_color_001"
      ],
      "observation_ids": [
        "obs_artwork_background_001"
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
        "fact_obj_bomb_fuse_spark_001"
      ],
      "observation_ids": [
        "obs_artwork_bomb_fuse_spark_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_collector_number_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_rarity_mark_001",
        "fact_card_ui_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_rarity_mark_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
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
      "fact_ids": [
        "fact_obj_count_bomb_001"
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
        "red fuse",
        "black bomb body",
        "yellow and black striped band",
        "spark ignition",
        "yellow explosion icon",
        "blue and orange radial background",
        "bright reflective-looking highlight on bomb"
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
        "obs_artwork_main_object_001"
      ]
    },
    {
      "term": "red fuse",
      "supporting_observation_ids": [
        "obs_artwork_bomb_fuse_001"
      ]
    },
    {
      "term": "black bomb body",
      "supporting_observation_ids": [
        "obs_artwork_bomb_body_001"
      ]
    },
    {
      "term": "yellow and black striped band",
      "supporting_observation_ids": [
        "obs_artwork_bomb_band_001"
      ]
    },
    {
      "term": "spark ignition",
      "supporting_observation_ids": [
        "obs_artwork_bomb_fuse_spark_001"
      ]
    },
    {
      "term": "yellow explosion icon",
      "supporting_observation_ids": [
        "obs_artwork_bomb_explosion_icon_001"
      ]
    },
    {
      "term": "blue and orange radial background",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ]
    },
    {
      "term": "bright reflective-looking highlight on bomb",
      "supporting_observation_ids": [
        "obs_artwork_bomb_shiny_highlight_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_artwork_bomb_explosion_icon_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "radial lines",
        "source_observation_ids": [
          "obs_artwork_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "reflective-looking surface",
        "source_observation_ids": [
          "obs_artwork_bomb_shiny_highlight_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_artwork_bomb_fuse_spark_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-078: fact_graph_semantic_fact_label_not_supported_v1:fact_sem_001
- GV-PK-JPN-M5-117: fact_graph_semantic_fact_label_not_supported_v1:semfact_004
- GV-PK-JPN-M5-111: fact_graph_search_terms_missing, semantic_tags_missing
- GV-PK-JPN-M5-110: fact_graph_semantic_fact_label_not_supported_v1:semantic_001, fact_graph_semantic_fact_label_not_supported_v1:semantic_002

