# Card Visual Fact Graph V2 Review Packet

Generated rows: 20
Validation failures: 5
Skipped images: 0
Estimated cost USD: 0.2191248

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0094212`
- Artwork observations: `9`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Chandelure Pokemon | scene_subject | foreground | primary | 0.99 |
| Lantern body | object | foreground | primary | 0.98 |
| Swirling black arms | object | foreground | primary | 0.95 |
| Purple flames on arms | visual_effect | foreground | secondary | 0.95 |
| Swirling horn-like structures on top | creature_anatomy | foreground | primary | 0.96 |
| Floating posture | pose | foreground | primary | 0.94 |
| Primarily purple body color | color | foreground | primary | 0.99 |
| Black accents on arms and lantern frame | color | foreground | primary | 0.97 |
| Dark mystical background with purple and Christmas lights sparkle effect | environment | background | secondary | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text in Japanese 'メガシャンデラ ex' | card_ui_text | top center | fully_visible | 0.99 |
| Hit Points 350 in upper right | card_ui_text | top right | fully_visible | 0.99 |
| Psychic energy symbol | card_ui_symbol | top left below name | fully_visible | 0.99 |
| Set symbol 'jpn-m5' at bottom left | set_symbol | bottom left | fully_visible | 0.99 |
| Rarity mark 'SAR' bottom right | rarity_mark | bottom right | fully_visible | 0.95 |
| Illustrator credit bottom right | illustrator_text | bottom right | fully_visible | 0.9 |
| Collector number 113/081 | collector_number | bottom left | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | has lantern body part | obs_body_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | arms are swirling and black | obs_body_002 | 0.95 |
| fact_creature_anatomy_003 | creature_anatomy | arms have purple flames | obs_effect_001 | 0.95 |
| fact_creature_anatomy_004 | creature_anatomy | horn-like structures on top | obs_creature_anatomy_001 | 0.96 |
| fact_creature_anatomy_005 | creature_anatomy | Floating posture | obs_pose_001 | 0.94 |
| fact_color_and_light_001 | color_and_light | body color primarily purple | obs_color_001 | 0.99 |
| fact_color_and_light_002 | color_and_light | accents and frame black | obs_color_002 | 0.97 |
| fact_environment_001 | environment | dark mystical background | obs_environment_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_name_001 | card name text | obs_ui_name_001 | 0.99 |
| fact_card_ui_and_print_markers_hp_001 | HP | obs_ui_hp_001 | 0.99 |
| fact_card_ui_and_print_markers_energy_symbol_001 | psychic energy symbol | obs_ui_energy_symbol_001 | 0.99 |
| fact_card_ui_and_print_markers_set_symbol_001 | set symbol | obs_ui_set_symbol_001 | 0.99 |
| fact_card_ui_and_print_markers_rarity_mark_001 | rarity mark | obs_ui_rarity_mark_001 | 0.95 |
| fact_card_ui_and_print_markers_illustrator_text_001 | illustrator credit | obs_ui_illustrator_text_001 | 0.9 |
| fact_card_ui_and_print_markers_collector_number_001 | collector number | obs_ui_collector_number_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_collector_number_001",
    "fact_card_ui_and_print_markers_energy_symbol_001",
    "fact_card_ui_and_print_markers_hp_001",
    "fact_card_ui_and_print_markers_illustrator_text_001",
    "fact_card_ui_and_print_markers_name_001",
    "fact_card_ui_and_print_markers_rarity_mark_001",
    "fact_card_ui_and_print_markers_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_ui_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_ui_rarity_mark_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_ui_energy_symbol_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_ui_illustrator_text_001"
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
| environment | complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | partial_due_to_crop | low | medium |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| Mega Chandelure | obs_subject_001 |
| floating purple lantern | obs_body_001, obs_color_001, obs_pose_001 |
| purple flame | obs_effect_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`, `potential_module_incomplete_or_low_evidence`, `potential_speculative_setting_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure Pokemon",
      "normalized_label": "Mega Chandelure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_001",
      "kind": "object",
      "label": "Lantern body",
      "normalized_label": "lantern body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_002",
      "kind": "object",
      "label": "Swirling black arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_effect_001",
      "kind": "visual_effect",
      "label": "Purple flames on arms",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "Swirling horn-like structures on top",
      "normalized_label": "horn-like structures",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "Floating posture",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color",
      "label": "Primarily purple body color",
      "normalized_label": "purple",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color",
      "label": "Black accents on arms and lantern frame",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "Dark mystical background with purple and Christmas lights sparkle effect",
      "normalized_label": "dark mystical background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_ui_name_001",
      "kind": "card_ui_text",
      "label": "Card name text in Japanese 'メガシャンデラ ex'",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_hp_001",
      "kind": "card_ui_text",
      "label": "Hit Points 350 in upper right",
      "normalized_label": "hp 350",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_energy_symbol_001",
      "kind": "card_ui_symbol",
      "label": "Psychic energy symbol",
      "normalized_label": "psychic energy symbol",
      "scene_layer": "ui",
      "frame_position": "top left below name",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "Set symbol 'jpn-m5' at bottom left",
      "normalized_label": "set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_rarity_mark_001",
      "kind": "rarity_mark",
      "label": "Rarity mark 'SAR' bottom right",
      "normalized_label": "rarity mark",
      "scene_layer": "ui",
      "frame_position": "bottom right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illustrator credit bottom right",
      "normalized_label": "illustrator text",
      "scene_layer": "ui",
      "frame_position": "bottom right",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_ui_collector_number_001",
      "kind": "collector_number",
      "label": "Collector number 113/081",
      "normalized_label": "collector number",
      "scene_layer": "ui",
      "frame_position": "bottom left",
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
      "field_path": "subjects[0].identity",
      "claim": "identity",
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
      "field_path": "body_regions[0].region",
      "claim": "has lantern body part",
      "value": "lantern body",
      "supporting_observation_ids": [
        "obs_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions[1].feature",
      "claim": "arms are swirling and black",
      "value": "swirling black arms",
      "supporting_observation_ids": [
        "obs_body_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions[2].feature",
      "claim": "arms have purple flames",
      "value": "purple flames on arms",
      "supporting_observation_ids": [
        "obs_effect_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "body_regions[3].feature",
      "claim": "horn-like structures on top",
      "value": "swirling horn-like structures",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "Floating posture",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "colors[0]",
      "claim": "body color primarily purple",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_002",
      "module": "color_and_light",
      "field_path": "colors[1]",
      "claim": "accents and frame black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_color_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "dark mystical background",
      "value": "dark mystical background with sparkle effect",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text",
      "value": "メガシャンデラ ex",
      "supporting_observation_ids": [
        "obs_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids",
      "claim": "HP",
      "value": "350",
      "supporting_observation_ids": [
        "obs_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_energy_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids",
      "claim": "psychic energy symbol",
      "value": "psychic energy symbol",
      "supporting_observation_ids": [
        "obs_ui_energy_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "set symbol",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_ui_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_rarity_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark_observation_ids",
      "claim": "rarity mark",
      "value": "SAR",
      "supporting_observation_ids": [
        "obs_ui_rarity_mark_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator credit",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_ui_illustrator_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "collector number",
      "value": "113/081",
      "supporting_observation_ids": [
        "obs_ui_collector_number_001"
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
        "lantern body",
        "purple flames on arms",
        "swirling black arms",
        "swirling horn-like structures"
      ],
      "physical_features": [
        "black accents",
        "purple body color"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "floating",
      "action_state": [],
      "facial_evidence": {
        "eyes": "not visible",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "frontal",
        "other_visible_evidence": []
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
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_body_001",
      "obs_body_002",
      "obs_color_001",
      "obs_color_002",
      "obs_creature_anatomy_001",
      "obs_effect_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "dark mystical background with sparkle effect"
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
      "dark tones",
      "purple"
    ],
    "lighting": [
      "soft"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "purple flame highlights"
    ],
    "composition": [
      "centered subject"
    ],
    "camera_angle": "frontal",
    "framing": "centered full body",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "flames",
      "swirling shapes"
    ],
    "repeated_shapes": [
      "circular motifs in lantern and arms"
    ],
    "style_cues": [
      "dark fantasy",
      "fantasy art style"
    ],
    "supporting_observation_ids": [
      "obs_body_001",
      "obs_color_001",
      "obs_creature_anatomy_001",
      "obs_effect_001",
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
          "feature": "lantern body",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "swirling black arms",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "swirling shape"
          ],
          "supporting_observation_ids": [
            "obs_body_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "purple flames",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [
            "flames on arms"
          ],
          "supporting_observation_ids": [
            "obs_effect_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "swirling horn-like structures",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
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
          "orientation": "floating",
          "action_state": [],
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
      "observation_ids": [
        "obs_effect_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_collector_number_001",
        "fact_card_ui_and_print_markers_energy_symbol_001",
        "fact_card_ui_and_print_markers_hp_001",
        "fact_card_ui_and_print_markers_illustrator_text_001",
        "fact_card_ui_and_print_markers_name_001",
        "fact_card_ui_and_print_markers_rarity_mark_001",
        "fact_card_ui_and_print_markers_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_ui_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_ui_rarity_mark_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_ui_energy_symbol_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_ui_illustrator_text_001"
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
        "fact_color_and_light_001",
        "fact_creature_anatomy_005",
        "fact_subject_001"
      ],
      "terms": [
        "floating purple lantern",
        "Mega Chandelure",
        "purple flame"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "partial_due_to_crop",
      "omission_risk": "low",
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "floating purple lantern",
      "supporting_observation_ids": [
        "obs_body_001",
        "obs_color_001",
        "obs_pose_001"
      ]
    },
    {
      "term": "purple flame",
      "supporting_observation_ids": [
        "obs_effect_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0109384`
- Artwork observations: `12`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Darkrai | scene_subject | foreground | salient | 0.99 |
| body | creature_anatomy | foreground | salient | 0.98 |
| head | creature_anatomy | foreground | salient | 0.98 |
| horns | creature_anatomy | foreground | salient | 0.95 |
| upper limbs (arms) | creature_anatomy | foreground | salient | 0.93 |
| lower limbs (legs) | creature_anatomy | foreground | salient | 0.92 |
| tail | creature_anatomy | foreground | salient | 0.95 |
| facial features - eyes and mouth | creature_anatomy | foreground | salient | 0.94 |
| floating upright pose | pose | foreground | prominent | 0.95 |
| facing forward | pose | foreground | prominent | 0.96 |
| yellow glowing aura | visual_effects | foreground | prominent | 0.95 |
| background golden pattern with star motif | objects_and_props | background | background | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text | card_ui_text | top-center | visible | 0.99 |
| HP text 280 | card_ui_text | top-right | visible | 0.99 |
| dark type energy symbol | card_ui_symbol | top-right | visible | 0.95 |
| attack names and descriptions in Japanese | card_ui_text | middle | visible | 0.9 |
| illustrator text '5ban Graphics' | illustrator_text | bottom-left | visible | 0.95 |
| set number 118/081 | collector_number | bottom-left | visible | 0.95 |
| set icon with code jpn-m5 | set_symbol | bottom-left | visible | 0.95 |
| bottom legal text with copyright details | bottom_line_text | bottom | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_creature_body_001 | creature_anatomy | body region | obs_creature_body_001 | 0.98 |
| fact_creature_head_001 | creature_anatomy | body region | obs_creature_head_001 | 0.98 |
| fact_creature_head_horns_001 | creature_anatomy | physical feature | obs_creature_head_horns_001 | 0.95 |
| fact_creature_upper_limbs_001 | creature_anatomy | body region | obs_creature_upper_limbs_001 | 0.93 |
| fact_creature_lower_limbs_001 | creature_anatomy | body region | obs_creature_lower_limbs_001 | 0.92 |
| fact_creature_tail_001 | creature_anatomy | body region | obs_creature_tail_001 | 0.95 |
| fact_creature_facial_features_001 | creature_anatomy | physical feature | obs_creature_facial_features_001 | 0.94 |
| fact_pose_001 | creature_anatomy | pose | obs_creature_pose_001 | 0.95 |
| fact_pose_002 | creature_anatomy | orientation | obs_creature_orientation_001 | 0.96 |
| fact_effects_001 | visual_effects | visual effect | obs_effects_001 | 0.95 |
| fact_environment_001 | environment | background pattern | obs_objects_and_props_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_hp_001 | HP text | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_energy_001 | energy symbol | obs_card_ui_energy_symbol_001 | 0.95 |
| fact_card_ui_attacks_001 | attack texts | obs_card_ui_attacks_001 | 0.9 |
| fact_card_ui_illustrator_001 | illustrator text | obs_card_ui_illustrator_001 | 0.95 |
| fact_card_ui_set_number_001 | collector number | obs_card_ui_set_number_001 | 0.95 |
| fact_card_ui_set_code_001 | set symbol | obs_card_ui_set_code_001 | 0.95 |
| fact_card_ui_bottom_text_001 | bottom legal text copyright | obs_card_ui_bottom_text_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attacks_001",
    "fact_card_ui_bottom_text_001",
    "fact_card_ui_energy_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_code_001",
    "fact_card_ui_set_number_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_set_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_attacks_001",
    "obs_card_ui_bottom_text_001"
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| Mega Darkrai | obs_subject_001 |
| yellow glowing aura | obs_effects_001 |
| golden star background | obs_objects_and_props_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`
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
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "creature_anatomy",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_head_001",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center-top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_head_horns_001",
      "kind": "creature_anatomy",
      "label": "horns",
      "normalized_label": "horns",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_upper_limbs_001",
      "kind": "creature_anatomy",
      "label": "upper limbs (arms)",
      "normalized_label": "upper limbs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_lower_limbs_001",
      "kind": "creature_anatomy",
      "label": "lower limbs (legs)",
      "normalized_label": "lower limbs",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_tail_001",
      "kind": "creature_anatomy",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_facial_features_001",
      "kind": "creature_anatomy",
      "label": "facial features - eyes and mouth",
      "normalized_label": "facial features",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_pose_001",
      "kind": "pose",
      "label": "floating upright pose",
      "normalized_label": "floating upright pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_orientation_001",
      "kind": "pose",
      "label": "facing forward",
      "normalized_label": "facing forward",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_effects_001",
      "kind": "visual_effects",
      "label": "yellow glowing aura",
      "normalized_label": "yellow glowing aura",
      "scene_layer": "foreground",
      "frame_position": "around creature",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_001",
      "kind": "objects_and_props",
      "label": "background golden pattern with star motif",
      "normalized_label": "background pattern star motif",
      "scene_layer": "background",
      "frame_position": "full card artwork background",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP text 280",
      "normalized_label": "hp 280",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_001",
      "kind": "card_ui_symbol",
      "label": "dark type energy symbol",
      "normalized_label": "dark type energy",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attacks_001",
      "kind": "card_ui_text",
      "label": "attack names and descriptions in Japanese",
      "normalized_label": "attack texts japanese",
      "scene_layer": "card_ui",
      "frame_position": "middle",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text '5ban Graphics'",
      "normalized_label": "illustrator 5ban Graphics",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "present",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_number_001",
      "kind": "collector_number",
      "label": "set number 118/081",
      "normalized_label": "118/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "present",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "set_symbol",
      "label": "set icon with code jpn-m5",
      "normalized_label": "set jpn-m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "present",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "bottom legal text with copyright details",
      "normalized_label": "copyright and legal text",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "present",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_body_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[0].region",
      "claim": "body region",
      "value": "body",
      "supporting_observation_ids": [
        "obs_creature_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_head_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[1].region",
      "claim": "body region",
      "value": "head",
      "supporting_observation_ids": [
        "obs_creature_head_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_head_horns_001",
      "module": "creature_anatomy",
      "field_path": "physical_features[0].feature",
      "claim": "physical feature",
      "value": "horns",
      "supporting_observation_ids": [
        "obs_creature_head_horns_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_upper_limbs_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[2].region",
      "claim": "body region",
      "value": "upper limbs (arms)",
      "supporting_observation_ids": [
        "obs_creature_upper_limbs_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_lower_limbs_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[3].region",
      "claim": "body region",
      "value": "lower limbs (legs)",
      "supporting_observation_ids": [
        "obs_creature_lower_limbs_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_tail_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[4].region",
      "claim": "body region",
      "value": "tail",
      "supporting_observation_ids": [
        "obs_creature_tail_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_facial_features_001",
      "module": "creature_anatomy",
      "field_path": "physical_features[1].feature",
      "claim": "physical feature",
      "value": "facial features - eyes and mouth",
      "supporting_observation_ids": [
        "obs_creature_facial_features_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[0].pose",
      "claim": "pose",
      "value": "floating upright pose",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_002",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[0].orientation",
      "claim": "orientation",
      "value": "facing forward",
      "supporting_observation_ids": [
        "obs_creature_orientation_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_effects_001",
      "module": "visual_effects",
      "field_path": "effects[0].label",
      "claim": "visual effect",
      "value": "yellow glowing aura",
      "supporting_observation_ids": [
        "obs_effects_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "architecture[0]",
      "claim": "background pattern",
      "value": "golden star motif",
      "supporting_observation_ids": [
        "obs_objects_and_props_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "メガダークライex (Mega Darkrai ex)",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids[0]",
      "claim": "HP text",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids[0]",
      "claim": "energy symbol",
      "value": "dark type",
      "supporting_observation_ids": [
        "obs_card_ui_energy_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attacks_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[0]",
      "claim": "attack texts",
      "value": "two attacks, Japanese text",
      "supporting_observation_ids": [
        "obs_card_ui_attacks_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator text",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number",
      "value": "118/081",
      "supporting_observation_ids": [
        "obs_card_ui_set_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "set symbol",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[1]",
      "claim": "bottom legal text copyright",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
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
        "body",
        "facial features",
        "head",
        "horns",
        "lower limbs",
        "tail",
        "upper limbs"
      ],
      "physical_features": [
        "eyes",
        "horns",
        "mouth"
      ],
      "pose": [
        "floating upright pose"
      ],
      "orientation": "facing forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gold",
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
      "obs_creature_body_001",
      "obs_creature_facial_features_001",
      "obs_creature_head_001",
      "obs_creature_head_horns_001",
      "obs_creature_lower_limbs_001",
      "obs_creature_orientation_001",
      "obs_creature_pose_001",
      "obs_creature_tail_001",
      "obs_creature_upper_limbs_001",
      "obs_effects_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_objects_and_props_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "not_applicable",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [
      "obs_objects_and_props_001"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_objects_and_props_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_and_props_001",
      "label": "background golden pattern with star motif",
      "normalized_label": "background pattern star motif",
      "object_type": "pattern",
      "colors": [
        "gold",
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "background",
      "count_reference": "",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "gold",
      "yellow"
    ],
    "lighting": [
      "glowing",
      "highlighted"
    ],
    "shadows": [
      "none prominent"
    ],
    "highlights": [
      "gold foil gleam effect"
    ],
    "composition": [
      "centered subject",
      "symmetrical background star pattern"
    ],
    "camera_angle": "frontal",
    "framing": "full artwork with card UI framing",
    "cropping": [],
    "depth": "flat artwork style",
    "motion_cues": [],
    "motifs": [
      "glowing aura",
      "star shape"
    ],
    "repeated_shapes": [
      "star patterns"
    ],
    "style_cues": [
      "digital illustration style",
      "holographic foil effect"
    ],
    "supporting_observation_ids": [
      "obs_effects_001",
      "obs_objects_and_props_001",
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
        "fact_creature_body_001",
        "fact_creature_facial_features_001",
        "fact_creature_head_001",
        "fact_creature_head_horns_001",
        "fact_creature_lower_limbs_001",
        "fact_creature_tail_001",
        "fact_creature_upper_limbs_001",
        "fact_pose_001",
        "fact_pose_002"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "gold",
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_body_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "gold",
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_head_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "upper limbs (arms)",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "gold",
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_upper_limbs_001"
          ],
          "confidence": 0.93
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "lower limbs (legs)",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "gold",
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_lower_limbs_001"
          ],
          "confidence": 0.92
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "gold",
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_tail_001"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "horns",
          "visibility": "visible",
          "colors": [
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_head_horns_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "facial features - eyes and mouth",
          "visibility": "visible",
          "colors": [
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_facial_features_001"
          ],
          "confidence": 0.94
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating upright pose"
          ],
          "orientation": "facing forward",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_creature_orientation_001",
            "obs_creature_pose_001"
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
        "obs_objects_and_props_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_objects_and_props_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_effects_001",
        "obs_objects_and_props_001",
        "obs_subject_001"
      ]
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
        "fact_card_ui_attacks_001",
        "fact_card_ui_bottom_text_001",
        "fact_card_ui_energy_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_code_001",
        "fact_card_ui_set_number_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_set_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_attacks_001",
        "obs_card_ui_bottom_text_001"
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
        "golden star background",
        "Mega Darkrai",
        "yellow glowing aura"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "yellow glowing aura",
      "supporting_observation_ids": [
        "obs_effects_001"
      ]
    },
    {
      "term": "golden star background",
      "supporting_observation_ids": [
        "obs_objects_and_props_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-101 - Mega Excadrill ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.96`
- Attribute confidence: `0.95`
- Cost USD: `0.0102436`
- Artwork observations: `13`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Excadrill.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Excadrill | scene_subject | foreground | salient | 0.99 |
| head and nose drill | creature_anatomy | foreground | salient | 0.98 |
| claw limbs | creature_anatomy | foreground | salient | 0.95 |
| metallic gray body | color_and_light | foreground | salient | 0.97 |
| bright red back spikes | color_and_light | foreground | salient | 0.96 |
| yellow outline and glow | color_and_light | foreground | salient | 0.94 |
| single white eye visible | human_appearance | foreground | salient | 0.98 |
| no visible mouth | human_appearance | foreground | salient | 1 |
| side profile pose | creature_anatomy | foreground | salient | 0.95 |
| facing right | creature_anatomy | foreground | salient | 0.96 |
| static pose, no movement | creature_anatomy | foreground | salient | 0.92 |
| dark fiery background with yellow and red flames | environment | background | moderate | 0.9 |
| silver circular steel energy symbol top left | objects_and_props | midground | salient | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text in Japanese | card_ui_text | top | fully_visible | 0.95 |
| HP 340 text at top right | hp_text | top right | fully_visible | 0.95 |
| steel energy type symbol top left | card_ui_symbol | top left | fully_visible | 0.97 |
| attack text and damage values in Japanese | card_ui_text | mid lower | fully_visible | 0.93 |
| collector number 101/081 SR bottom left | collector_number | bottom left | fully_visible | 0.95 |
| Illus. Keisuke Azuma bottom left | illustrator_text | bottom left | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | Pokemon identity | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | Head shows drill-shaped nose | obs_creature_body_001 | 0.98 |
| fact_003 | creature_anatomy | Has claw limbs | obs_creature_body_002 | 0.95 |
| fact_004 | creature_anatomy | Body primarily metallic gray | obs_creature_colors_001 | 0.97 |
| fact_005 | creature_anatomy | Back has bright red spikes | obs_creature_colors_002 | 0.96 |
| fact_006 | creature_anatomy | Yellow glow outlining | obs_creature_colors_003 | 0.94 |
| fact_007 | human_appearance | One white eye visible looking right | obs_creature_eye_001 | 0.98 |
| fact_008 | human_appearance | No visible mouth | obs_creature_mouth_001 | 1 |
| fact_009 | creature_anatomy | Pokemon faces right side | obs_orientation_001, obs_pose_001 | 0.96 |
| fact_010 | creature_anatomy | Static pose, no movement visible | obs_action_001 | 0.92 |
| fact_011 | environment | Fiery dark background with red and yellow flames | obs_background_001 | 0.9 |
| fact_012 | objects_and_props | Steel energy type symbol visible | obs_object_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_013 | Card name text in Japanese | obs_card_ui_001 | 0.95 |
| fact_014 | HP text showing 340 | obs_card_ui_002 | 0.95 |
| fact_015 | Steel energy type symbol top left | obs_card_ui_003 | 0.97 |
| fact_016 | Attack text and damage values present in Japanese | obs_card_ui_004 | 0.93 |
| fact_017 | Collector number '101/081 SR' visible | obs_card_ui_005 | 0.95 |
| fact_018 | Illustrator text 'Illus. Keisuke Azuma' visible | obs_card_ui_006 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_013",
    "fact_014",
    "fact_015",
    "fact_016",
    "fact_017",
    "fact_018"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_005"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_003"
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
| human_appearance | complete | low | high |  |
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
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
| Mega Excadrill | obs_subject_001 |
| metallic gray body | obs_creature_colors_001 |
| red spikes | obs_creature_colors_002 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Excadrill.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`
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
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "creature_anatomy",
      "label": "head and nose drill",
      "normalized_label": "head and nose drill",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_002",
      "kind": "creature_anatomy",
      "label": "claw limbs",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_colors_001",
      "kind": "color_and_light",
      "label": "metallic gray body",
      "normalized_label": "gray",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_colors_002",
      "kind": "color_and_light",
      "label": "bright red back spikes",
      "normalized_label": "red",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_colors_003",
      "kind": "color_and_light",
      "label": "yellow outline and glow",
      "normalized_label": "yellow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_eye_001",
      "kind": "human_appearance",
      "label": "single white eye visible",
      "normalized_label": "eye visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_mouth_001",
      "kind": "human_appearance",
      "label": "no visible mouth",
      "normalized_label": "mouth not visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 1,
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
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_orientation_001",
      "kind": "creature_anatomy",
      "label": "facing right",
      "normalized_label": "facing right",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_action_001",
      "kind": "creature_anatomy",
      "label": "static pose, no movement",
      "normalized_label": "static",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "dark fiery background with yellow and red flames",
      "normalized_label": "fiery background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "silver circular steel energy symbol top left",
      "normalized_label": "steel energy symbol",
      "scene_layer": "midground",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "Card name text in Japanese",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 340 text at top right",
      "normalized_label": "hp text 340",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "steel energy type symbol top left",
      "normalized_label": "steel energy symbol",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "attack text and damage values in Japanese",
      "normalized_label": "attack text",
      "scene_layer": "interface",
      "frame_position": "mid lower",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "collector_number",
      "label": "collector number 101/081 SR bottom left",
      "normalized_label": "collector number",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "illustrator_text",
      "label": "Illus. Keisuke Azuma bottom left",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "Pokemon identity",
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
      "field_path": "body_regions.head",
      "claim": "Head shows drill-shaped nose",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_creature_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.limbs",
      "claim": "Has claw limbs",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_creature_body_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "physical_features.colors.body_main",
      "claim": "Body primarily metallic gray",
      "value": "metallic gray",
      "supporting_observation_ids": [
        "obs_creature_colors_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "physical_features.colors.back_spikes",
      "claim": "Back has bright red spikes",
      "value": "red",
      "supporting_observation_ids": [
        "obs_creature_colors_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "physical_features.colors.glows_and_outlines",
      "claim": "Yellow glow outlining",
      "value": "yellow",
      "supporting_observation_ids": [
        "obs_creature_colors_003"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "face.eyes",
      "claim": "One white eye visible looking right",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_eye_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "human_appearance",
      "field_path": "face.mouth",
      "claim": "No visible mouth",
      "value": "not visible",
      "supporting_observation_ids": [
        "obs_creature_mouth_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "Pokemon faces right side",
      "value": "facing right",
      "supporting_observation_ids": [
        "obs_orientation_001",
        "obs_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "creature_anatomy",
      "field_path": "pose.action_state",
      "claim": "Static pose, no movement visible",
      "value": "static",
      "supporting_observation_ids": [
        "obs_action_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "environment",
      "field_path": "setting.background",
      "claim": "Fiery dark background with red and yellow flames",
      "value": "fiery background",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "objects_and_props",
      "field_path": "objects[0].label",
      "claim": "Steel energy type symbol visible",
      "value": "steel energy symbol",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text in Japanese",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text showing 340",
      "value": "340",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Steel energy type symbol top left",
      "value": "steel energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "Attack text and damage values present in Japanese",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number '101/081 SR' visible",
      "value": "101/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_018",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text 'Illus. Keisuke Azuma' visible",
      "value": "Illus. Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_006"
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
        "claw limbs",
        "head and nose drill"
      ],
      "physical_features": [
        "bright red back spikes",
        "metallic gray body",
        "yellow outline and glow"
      ],
      "pose": [
        "side profile pose"
      ],
      "orientation": "facing right",
      "action_state": [
        "static pose"
      ],
      "facial_evidence": {
        "eyes": "one white eye visible",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "side profile",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "metallic gray",
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
      "obs_action_001",
      "obs_creature_body_001",
      "obs_creature_body_002",
      "obs_creature_colors_001",
      "obs_creature_colors_002",
      "obs_creature_colors_003",
      "obs_creature_eye_001",
      "obs_creature_mouth_001",
      "obs_orientation_001",
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
    "setting": [
      "fiery background"
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
      "observation_id": "obs_object_001",
      "label": "steel energy symbol",
      "normalized_label": "steel energy symbol",
      "object_type": "symbol",
      "colors": [
        "gray",
        "silver"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "top left",
      "count_reference": "",
      "confidence": 0.97
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "bright red",
      "metallic gray",
      "yellow"
    ],
    "lighting": [
      "bright glow on yellow outlines"
    ],
    "shadows": [
      "dark shading on body parts"
    ],
    "highlights": [
      "highlighted metallic surfaces"
    ],
    "composition": [
      "centered subject with dynamic flames background"
    ],
    "camera_angle": "frontal slight side view",
    "framing": "close-up",
    "cropping": [
      "no significant crop"
    ],
    "depth": "significant depth with foreground subject and background flames",
    "motion_cues": [
      "static pose, no motion blur"
    ],
    "motifs": [
      "sharp red spikes"
    ],
    "repeated_shapes": [
      "triangular spikes"
    ],
    "style_cues": [
      "high detail, digital art style"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
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
        "fact_007",
        "fact_008"
      ],
      "visible_body_regions": [],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "side profile",
          "eyes": "one white eye visible",
          "mouth": "not visible",
          "eyebrows": "not visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_creature_eye_001",
            "obs_creature_mouth_001"
          ],
          "confidence": 0.98
        }
      ],
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
        "fact_009",
        "fact_010"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "nose drill",
          "visibility": "fully_visible",
          "colors": [],
          "details": [
            "drill shaped"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "limbs",
          "feature": "claws",
          "visibility": "fully_visible",
          "colors": [],
          "details": [
            "claw limbs visible"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_002"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "metallic gray body color",
          "visibility": "fully_visible",
          "colors": [
            "metallic gray"
          ],
          "details": [
            "body main color"
          ],
          "supporting_observation_ids": [
            "obs_creature_colors_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "back",
          "feature": "red spikes",
          "visibility": "fully_visible",
          "colors": [
            "red"
          ],
          "details": [
            "bright red spikes on back"
          ],
          "supporting_observation_ids": [
            "obs_creature_colors_002"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "outline",
          "feature": "yellow glow",
          "visibility": "fully_visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "yellow outline and glow"
          ],
          "supporting_observation_ids": [
            "obs_creature_colors_003"
          ],
          "confidence": 0.94
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "side profile"
          ],
          "orientation": "facing right",
          "action_state": [
            "static pose"
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
      "fact_ids": [
        "fact_012"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_011"
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
        "obs_creature_colors_001",
        "obs_creature_colors_002",
        "obs_creature_colors_003"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_013",
        "fact_014",
        "fact_015",
        "fact_016",
        "fact_017",
        "fact_018"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_005"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_003"
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
        "fact_004",
        "fact_005"
      ],
      "terms": [
        "Mega Excadrill",
        "metallic gray body",
        "red spikes"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Mega Excadrill",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "metallic gray body",
      "supporting_observation_ids": [
        "obs_creature_colors_001"
      ]
    },
    {
      "term": "red spikes",
      "supporting_observation_ids": [
        "obs_creature_colors_002"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-112 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.97`
- Attribute confidence: `0.96`
- Cost USD: `0.0126464`
- Artwork observations: `22`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: head, eyes, mouth, ears, arms, hands with claws, legs, feet with claws.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Zeraora | scene_subject | foreground | primary_subject | 0.98 |
| head | creature_anatomy | foreground | high | 0.98 |
| eyes | creature_anatomy | foreground | high | 0.98 |
| mouth | creature_anatomy | foreground | high | 0.95 |
| ears | creature_anatomy | foreground | high | 0.97 |
| arms | creature_anatomy | foreground | high | 0.96 |
| hands with claws | creature_anatomy | foreground | high | 0.95 |
| legs | creature_anatomy | foreground | high | 0.96 |
| feet with claws | creature_anatomy | foreground | high | 0.95 |
| tail | creature_anatomy | foreground | medium | 0.94 |
| fur pattern with yellow and black zigzag markings | creature_anatomy | foreground | high | 0.96 |
| body color primarily blue | creature_anatomy | foreground | high | 0.97 |
| white spike on forehead | creature_anatomy | foreground | medium | 0.95 |
| electric blue glowing streaks around body and paws | creature_anatomy | foreground | high | 0.95 |
| lightning shaped markings on arms and tail tips | creature_anatomy | foreground | high | 0.96 |
| dynamic aggressive pose with left arm forward, right arm back | creature_anatomy | foreground | high | 0.97 |
| head turned slightly to the left | creature_anatomy | foreground | medium | 0.96 |
| standing upright, feet visible on ground | creature_anatomy | foreground | high | 0.95 |
| blue static and electric energy effects in background | environment | background | high | 0.98 |
| white bursts of light around limbs | environment | foreground | high | 0.95 |
| blue and black color palette with yellow accents | color_and_light | full_card | high | 0.98 |
| bright highlights on fur and electric energy | color_and_light | foreground | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガゼラオラeX | card_ui_text | top_center | fully_visible | 0.99 |
| HP 270 | hp_text | top_right | fully_visible | 0.99 |
| Electric energy symbol near HP | card_ui_symbol | top_right | fully_visible | 0.99 |
| Illustrator GIDORA | illustrator_text | bottom_left | fully_visible | 0.95 |
| 112/081 SAR | collector_number | bottom_left | fully_visible | 0.95 |
| Set symbol J M5 | set_symbol | bottom_left | fully_visible | 0.95 |
| Bottom legal and copyright text | bottom_line_text | bottom | visible_but_partially_unreadable | 0.6 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_mega_zeraora_001 | subjects | subject_identity | obs_subject_001 | 0.98 |
| fact_creature_anatomy_001 | creature_anatomy | has_body_region | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | has_physical_feature | obs_creature_anatomy_002 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | has_physical_feature | obs_creature_anatomy_003 | 0.95 |
| fact_creature_anatomy_004 | creature_anatomy | has_body_region | obs_creature_anatomy_004 | 0.97 |
| fact_creature_anatomy_005 | creature_anatomy | has_body_region | obs_creature_anatomy_005, obs_creature_anatomy_006 | 0.96 |
| fact_creature_anatomy_006 | creature_anatomy | has_body_region | obs_creature_anatomy_007, obs_creature_anatomy_008 | 0.96 |
| fact_creature_anatomy_007 | creature_anatomy | has_body_region | obs_creature_anatomy_009 | 0.94 |
| fact_creature_anatomy_008 | creature_anatomy | fur_color_pattern | obs_creature_anatomy_010, obs_creature_anatomy_011, obs_creature_anatomy_014 | 0.96 |
| fact_creature_anatomy_009 | creature_anatomy | has_physical_feature | obs_creature_anatomy_012 | 0.95 |
| fact_creature_anatomy_010 | creature_anatomy | has_physical_feature | obs_creature_anatomy_013 | 0.95 |
| fact_creature_anatomy_011 | creature_anatomy | pose_description | obs_pose_orientation_001 | 0.97 |
| fact_creature_anatomy_012 | creature_anatomy | head_orientation | obs_pose_orientation_002 | 0.96 |
| fact_creature_anatomy_013 | creature_anatomy | standing_pose | obs_pose_orientation_003 | 0.95 |
| fact_environment_001 | environment | background_description | obs_environment_001 | 0.98 |
| fact_environment_002 | environment | foreground_effects_description | obs_environment_002 | 0.95 |
| fact_visual_design_001 | color_and_light | color_palette | obs_visual_design_001 | 0.98 |
| fact_visual_design_002 | color_and_light | lighting_features | obs_visual_design_002 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card_name_text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | hp_text_value | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_and_print_markers_003 | energy_type | obs_card_ui_energy_001 | 0.99 |
| fact_card_ui_and_print_markers_004 | illustrator_name | obs_card_ui_illustrator_001 | 0.95 |
| fact_card_ui_and_print_markers_005 | collector_number_code | obs_card_ui_set_001 | 0.95 |
| fact_card_ui_and_print_markers_006 | set_symbol_code | obs_card_ui_set_002 | 0.95 |
| fact_card_ui_and_print_markers_007 | bottom_legal_and_copyright_text | obs_card_ui_bottom_text_001 | 0.6 |

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
    "obs_card_ui_set_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_002"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
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
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | low | medium |  |

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
| Mega Zeraora | obs_subject_001 |
| electric blue glowing streaks | obs_creature_anatomy_013 |
| yellow and black zigzag fur pattern | obs_creature_anatomy_010 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: head, eyes, mouth, ears, arms, hands with claws, legs, feet with claws.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`, `potential_module_incomplete_or_low_evidence`, `potential_unsupported_personality_or_species_interpretation`
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
      "salience": "primary_subject",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "mouth",
      "normalized_label": "mouth",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "ears",
      "normalized_label": "ears",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "hands with claws",
      "normalized_label": "hands with claws",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "legs",
      "normalized_label": "legs",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_008",
      "kind": "creature_anatomy",
      "label": "feet with claws",
      "normalized_label": "feet with claws",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_009",
      "kind": "creature_anatomy",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "lower_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_010",
      "kind": "creature_anatomy",
      "label": "fur pattern with yellow and black zigzag markings",
      "normalized_label": "fur pattern yellow black zigzag",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_011",
      "kind": "creature_anatomy",
      "label": "body color primarily blue",
      "normalized_label": "body color blue",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_012",
      "kind": "creature_anatomy",
      "label": "white spike on forehead",
      "normalized_label": "white spike forehead",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_013",
      "kind": "creature_anatomy",
      "label": "electric blue glowing streaks around body and paws",
      "normalized_label": "electric blue glowing streaks",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_014",
      "kind": "creature_anatomy",
      "label": "lightning shaped markings on arms and tail tips",
      "normalized_label": "lightning shaped markings",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_orientation_001",
      "kind": "creature_anatomy",
      "label": "dynamic aggressive pose with left arm forward, right arm back",
      "normalized_label": "dynamic aggressive pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_orientation_002",
      "kind": "creature_anatomy",
      "label": "head turned slightly to the left",
      "normalized_label": "head orientation left",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_orientation_003",
      "kind": "creature_anatomy",
      "label": "standing upright, feet visible on ground",
      "normalized_label": "standing upright",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "blue static and electric energy effects in background",
      "normalized_label": "electric energy background",
      "scene_layer": "background",
      "frame_position": "full_card",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "white bursts of light around limbs",
      "normalized_label": "white light bursts",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "color_and_light",
      "label": "blue and black color palette with yellow accents",
      "normalized_label": "blue black yellow palette",
      "scene_layer": "full_card",
      "frame_position": "full_card",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_002",
      "kind": "color_and_light",
      "label": "bright highlights on fur and electric energy",
      "normalized_label": "bright highlights",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガゼラオラeX",
      "normalized_label": "card name text",
      "scene_layer": "ui_layer",
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
      "normalized_label": "hp 270",
      "scene_layer": "ui_layer",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "card_ui_symbol",
      "label": "Electric energy symbol near HP",
      "normalized_label": "electric energy symbol",
      "scene_layer": "ui_layer",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator GIDORA",
      "normalized_label": "illustrator gidora",
      "scene_layer": "ui_layer",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "collector_number",
      "label": "112/081 SAR",
      "normalized_label": "collectornumber 112/081 SAR",
      "scene_layer": "ui_layer",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_002",
      "kind": "set_symbol",
      "label": "Set symbol J M5",
      "normalized_label": "set symbol j m5",
      "scene_layer": "ui_layer",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "Bottom legal and copyright text",
      "normalized_label": "bottom legal copyright text",
      "scene_layer": "ui_layer",
      "frame_position": "bottom",
      "visibility": "visible_but_partially_unreadable",
      "salience": "low",
      "confidence": 0.6,
      "evidence_strength": "weak"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_mega_zeraora_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "subject_identity",
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
      "field_path": "body_regions.head",
      "claim": "has_body_region",
      "value": "head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "physical_features.eyes",
      "claim": "has_physical_feature",
      "value": "eyes visible, blue",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "physical_features.mouth",
      "claim": "has_physical_feature",
      "value": "mouth visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.ears",
      "claim": "has_body_region",
      "value": "ears",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "has_body_region",
      "value": "arms with claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005",
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "body_regions.legs",
      "claim": "has_body_region",
      "value": "legs with claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007",
        "obs_creature_anatomy_008"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "body_regions.tail",
      "claim": "has_body_region",
      "value": "tail visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_009"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_008",
      "module": "creature_anatomy",
      "field_path": "physical_features.fur_color_pattern",
      "claim": "fur_color_pattern",
      "value": "blue body with yellow and black zigzag markings",
      "supporting_observation_ids": [
        "obs_creature_anatomy_010",
        "obs_creature_anatomy_011",
        "obs_creature_anatomy_014"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_009",
      "module": "creature_anatomy",
      "field_path": "physical_features.white_forehead_spike",
      "claim": "has_physical_feature",
      "value": "white spike on forehead",
      "supporting_observation_ids": [
        "obs_creature_anatomy_012"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_010",
      "module": "creature_anatomy",
      "field_path": "physical_features.electric_glowing_streaks",
      "claim": "has_physical_feature",
      "value": "electric blue glowing streaks on body and paws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_013"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_011",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose_description",
      "value": "dynamic aggressive pose with left arm forward, right arm back",
      "supporting_observation_ids": [
        "obs_pose_orientation_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_012",
      "module": "creature_anatomy",
      "field_path": "orientation.head_direction",
      "claim": "head_orientation",
      "value": "turned slightly to the left",
      "supporting_observation_ids": [
        "obs_pose_orientation_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_013",
      "module": "creature_anatomy",
      "field_path": "pose.standing",
      "claim": "standing_pose",
      "value": "standing upright with feet visible",
      "supporting_observation_ids": [
        "obs_pose_orientation_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background_description",
      "value": "blue static and electric energy effects",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "foreground_effects",
      "claim": "foreground_effects_description",
      "value": "white bursts of light around limbs",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "color_palette",
      "value": "blue and black with yellow accents",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_design_002",
      "module": "color_and_light",
      "field_path": "lighting.highlights",
      "claim": "lighting_features",
      "value": "bright highlights on fur and electric energy",
      "supporting_observation_ids": [
        "obs_visual_design_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card_name_text",
      "value": "メガゼラオラeX",
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
      "claim": "hp_text_value",
      "value": "270",
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
      "claim": "energy_type",
      "value": "electric",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator_name",
      "value": "GIDORA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector_number_code",
      "value": "112/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set_symbol_code",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "bottom_legal_and_copyright_text",
      "value": "visible but partially unreadable",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.6,
      "evidence_strength": "weak"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 0.98,
      "anatomy": [
        "arms",
        "ears",
        "eyes",
        "feet with claws",
        "hands with claws",
        "head",
        "legs",
        "mouth",
        "tail"
      ],
      "physical_features": [
        "blue body color",
        "electric blue glowing streaks",
        "lightning shaped markings",
        "white spike on forehead",
        "yellow and black zigzag fur pattern"
      ],
      "pose": [
        "dynamic aggressive pose with left arm forward and right arm back",
        "head turned slightly to the left",
        "standing upright with feet visible"
      ],
      "orientation": "head turned slightly to the left",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible, blue",
        "mouth": "visible, closed",
        "eyebrows": "not distinctly visible",
        "face_position": "slightly left",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
        "electric blue",
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_creature_anatomy_008",
      "obs_creature_anatomy_009",
      "obs_creature_anatomy_010",
      "obs_creature_anatomy_011",
      "obs_creature_anatomy_012",
      "obs_creature_anatomy_013",
      "obs_creature_anatomy_014",
      "obs_environment_002",
      "obs_pose_orientation_001",
      "obs_pose_orientation_002",
      "obs_pose_orientation_003",
      "obs_subject_001",
      "obs_visual_design_002"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_visual_design_001"
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
      "yellow"
    ],
    "lighting": [
      "bright highlights on fur and electric energy"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights"
    ],
    "composition": [
      "dynamic aggressive pose centered",
      "head turned slightly left"
    ],
    "camera_angle": "frontal",
    "framing": "close up",
    "cropping": [],
    "depth": "medium depth",
    "motion_cues": [
      "electric energy effects and bursts of light"
    ],
    "motifs": [
      "lightning shapes"
    ],
    "repeated_shapes": [
      "zigzag markings"
    ],
    "style_cues": [
      "bold color contrast",
      "electric glow effects"
    ],
    "supporting_observation_ids": [
      "obs_visual_design_001",
      "obs_visual_design_002"
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
        "fact_subject_mega_zeraora_001"
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
        "fact_creature_anatomy_008",
        "fact_creature_anatomy_009",
        "fact_creature_anatomy_010",
        "fact_creature_anatomy_011",
        "fact_creature_anatomy_012",
        "fact_creature_anatomy_013"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [
            "white spike on forehead"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001",
            "obs_creature_anatomy_012"
          ],
          "confidence": 0.97
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eyes",
          "feature": "eyes",
          "visibility": "fully_visible",
          "colors": [
            "blue"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "mouth",
          "feature": "mouth",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "fur",
          "feature": "fur pattern yellow and black zigzag markings",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "blue",
            "electric blue",
            "yellow"
          ],
          "details": [
            "electric blue glowing streaks on body and paws",
            "lightning shaped markings on arms and tail tips"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_010",
            "obs_creature_anatomy_011",
            "obs_creature_anatomy_013",
            "obs_creature_anatomy_014"
          ],
          "confidence": 0.96
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "dynamic aggressive pose with left arm forward, right arm back",
            "standing upright with feet visible"
          ],
          "orientation": "head turned slightly to the left",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_orientation_001",
            "obs_pose_orientation_002",
            "obs_pose_orientation_003"
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
        "fact_visual_design_001",
        "fact_visual_design_002"
      ],
      "observation_ids": [
        "obs_visual_design_001",
        "obs_visual_design_002"
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
        "fact_card_ui_and_print_markers_007"
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
      "set_symbol_observation_ids": [
        "obs_card_ui_set_002"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
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
        "electric blue glowing streaks",
        "Mega Zeraora",
        "yellow and black zigzag fur pattern"
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
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "electric blue glowing streaks",
      "supporting_observation_ids": [
        "obs_creature_anatomy_013"
      ]
    },
    {
      "term": "yellow and black zigzag fur pattern",
      "supporting_observation_ids": [
        "obs_creature_anatomy_010"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-096 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.0120516`
- Artwork observations: `17`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Zeraora | living_entity | foreground | primary_subject | 0.99 |
| ear | body_region | foreground | primary_subject_detail | 0.98 |
| head | body_region | foreground | primary_subject_detail | 0.99 |
| eyes | body_region | foreground | primary_subject_detail | 0.98 |
| mouth | body_region | foreground | primary_subject_detail | 0.95 |
| arms | body_region | foreground | primary_subject_detail | 0.97 |
| hands | body_region | foreground | primary_subject_detail | 0.95 |
| legs | body_region | foreground | primary_subject_detail | 0.97 |
| feet | body_region | foreground | primary_subject_detail | 0.96 |
| yellow lightning bolt-like markings | physical_feature | foreground | primary_subject_detail | 0.97 |
| bright blue markings on limbs and face | physical_feature | foreground | primary_subject_detail | 0.96 |
| black body fur | physical_feature | foreground | primary_subject_detail | 0.99 |
| crouching stance | pose | foreground | primary_subject_detail | 0.95 |
| facing right side | orientation | foreground | primary_subject_detail | 0.96 |
| purple background | environment_element | background | background | 0.98 |
| pink flame-like patterns | environment_element | background | background_detail | 0.97 |
| electricity or lightning bolt symbol | object | foreground | ui_element | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Text 'メガゼラオラex' in yellow and white with black outline at card top | card_name_text | top_central | fully_visible | 0.99 |
| HP 270 with electric energy symbol in top right | hp_text | top_right | fully_visible | 0.99 |
| Collector number '096/081 SR' at bottom left | collector_number | bottom_left | fully_visible | 0.99 |
| Set symbol near collector number at bottom left | set_symbol | bottom_left | fully_visible | 0.99 |
| Illustrator credit 'Illus. Eban Graphics' at bottom left above collector number | illustrator_text | bottom_left | fully_visible | 0.99 |
| Small copyright text near bottom left corner | copyright_text | bottom_left | fully_visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | visible body region | obs_subject_001_body_region_001 | 0.98 |
| fact_003 | creature_anatomy | visible body region | obs_subject_001_body_region_002 | 0.99 |
| fact_004 | creature_anatomy | visible body region | obs_subject_001_body_region_003 | 0.98 |
| fact_005 | creature_anatomy | visible body region | obs_subject_001_body_region_004 | 0.95 |
| fact_006 | creature_anatomy | visible body region | obs_subject_001_body_region_005 | 0.97 |
| fact_007 | creature_anatomy | visible body region | obs_subject_001_body_region_006 | 0.95 |
| fact_008 | creature_anatomy | visible body region | obs_subject_001_body_region_007 | 0.97 |
| fact_009 | creature_anatomy | visible body region | obs_subject_001_body_region_008 | 0.96 |
| fact_010 | creature_anatomy | visible physical feature | obs_subject_001_physical_feature_001 | 0.97 |
| fact_011 | creature_anatomy | visible physical feature | obs_subject_001_physical_feature_002 | 0.96 |
| fact_012 | creature_anatomy | visible physical feature | obs_subject_001_physical_feature_003 | 0.99 |
| fact_013 | creature_anatomy | pose | obs_subject_001_pose_001 | 0.95 |
| fact_014 | creature_anatomy | orientation | obs_subject_001_orientation_001 | 0.96 |
| fact_015 | environment | background color | obs_environment_001 | 0.98 |
| fact_016 | environment | background pattern | obs_environment_002 | 0.97 |
| fact_017 | objects_and_props | electricity or lightning bolt symbol | obs_objects_and_props_001 | 0.99 |
| fact_024 | fact_grounded_search_terms | search term | obs_subject_001 | 0.99 |
| fact_025 | fact_grounded_search_terms | search term | obs_environment_001 | 0.98 |
| fact_026 | fact_grounded_search_terms | search term | obs_subject_001_physical_feature_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_018 | card name text | obs_card_ui_001 | 0.99 |
| fact_019 | HP text | obs_card_ui_002 | 0.99 |
| fact_020 | collector number | obs_card_ui_003 | 0.99 |
| fact_021 | set symbol | obs_card_ui_004 | 0.99 |
| fact_022 | illustrator credit | obs_card_ui_005 | 0.99 |
| fact_023 | copyright text | obs_card_ui_006 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_018",
    "fact_019",
    "fact_020",
    "fact_021",
    "fact_022",
    "fact_023"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_003"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_004"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_006"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
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
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| Mega Zeraora | obs_subject_001 |
| purple background | obs_environment_001 |
| yellow lightning markings | obs_subject_001_physical_feature_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_count_reference_inconsistent`, `potential_metadata_or_identity_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "living_entity",
      "label": "Mega Zeraora",
      "normalized_label": "mega zeraora",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_body_region_001",
      "kind": "body_region",
      "label": "ear",
      "normalized_label": "ear",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_body_region_002",
      "kind": "body_region",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_body_region_003",
      "kind": "body_region",
      "label": "eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_body_region_004",
      "kind": "body_region",
      "label": "mouth",
      "normalized_label": "mouth",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_body_region_005",
      "kind": "body_region",
      "label": "arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_body_region_006",
      "kind": "body_region",
      "label": "hands",
      "normalized_label": "hands",
      "scene_layer": "foreground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_body_region_007",
      "kind": "body_region",
      "label": "legs",
      "normalized_label": "legs",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_body_region_008",
      "kind": "body_region",
      "label": "feet",
      "normalized_label": "feet",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_physical_feature_001",
      "kind": "physical_feature",
      "label": "yellow lightning bolt-like markings",
      "normalized_label": "yellow lightning bolt-like markings",
      "scene_layer": "foreground",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_physical_feature_002",
      "kind": "physical_feature",
      "label": "bright blue markings on limbs and face",
      "normalized_label": "bright blue markings",
      "scene_layer": "foreground",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_physical_feature_003",
      "kind": "physical_feature",
      "label": "black body fur",
      "normalized_label": "black body fur",
      "scene_layer": "foreground",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_pose_001",
      "kind": "pose",
      "label": "crouching stance",
      "normalized_label": "crouching",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_subject_001_orientation_001",
      "kind": "orientation",
      "label": "facing right side",
      "normalized_label": "facing right",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_detail",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment_element",
      "label": "purple background",
      "normalized_label": "purple background",
      "scene_layer": "background",
      "frame_position": "full_card_background",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment_element",
      "label": "pink flame-like patterns",
      "normalized_label": "pink flame patterns",
      "scene_layer": "background",
      "frame_position": "midground",
      "visibility": "fully_visible",
      "salience": "background_detail",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_001",
      "kind": "object",
      "label": "electricity or lightning bolt symbol",
      "normalized_label": "electricity symbol",
      "scene_layer": "foreground",
      "frame_position": "right_upper",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_name_text",
      "label": "Text 'メガゼラオラex' in yellow and white with black outline at card top",
      "normalized_label": "card name text visible",
      "scene_layer": "interface_foreground",
      "frame_position": "top_central",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 270 with electric energy symbol in top right",
      "normalized_label": "hp text 270",
      "scene_layer": "interface_foreground",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "collector_number",
      "label": "Collector number '096/081 SR' at bottom left",
      "normalized_label": "collector number 096/081 SR",
      "scene_layer": "interface_foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "set_symbol",
      "label": "Set symbol near collector number at bottom left",
      "normalized_label": "set symbol",
      "scene_layer": "interface_foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "illustrator_text",
      "label": "Illustrator credit 'Illus. Eban Graphics' at bottom left above collector number",
      "normalized_label": "illustrator text",
      "scene_layer": "interface_foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "copyright_text",
      "label": "Small copyright text near bottom left corner",
      "normalized_label": "copyright text",
      "scene_layer": "interface_foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "ui_element",
      "confidence": 0.97,
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
      "field_path": "body_regions[0].region",
      "claim": "visible body region",
      "value": "ear",
      "supporting_observation_ids": [
        "obs_subject_001_body_region_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "body_regions[1].region",
      "claim": "visible body region",
      "value": "head",
      "supporting_observation_ids": [
        "obs_subject_001_body_region_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "body_regions[2].region",
      "claim": "visible body region",
      "value": "eyes",
      "supporting_observation_ids": [
        "obs_subject_001_body_region_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "body_regions[3].region",
      "claim": "visible body region",
      "value": "mouth",
      "supporting_observation_ids": [
        "obs_subject_001_body_region_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "body_regions[4].region",
      "claim": "visible body region",
      "value": "arms",
      "supporting_observation_ids": [
        "obs_subject_001_body_region_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "body_regions[5].region",
      "claim": "visible body region",
      "value": "hands",
      "supporting_observation_ids": [
        "obs_subject_001_body_region_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "creature_anatomy",
      "field_path": "body_regions[6].region",
      "claim": "visible body region",
      "value": "legs",
      "supporting_observation_ids": [
        "obs_subject_001_body_region_007"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "creature_anatomy",
      "field_path": "body_regions[7].region",
      "claim": "visible body region",
      "value": "feet",
      "supporting_observation_ids": [
        "obs_subject_001_body_region_008"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "creature_anatomy",
      "field_path": "physical_features[0].feature",
      "claim": "visible physical feature",
      "value": "yellow lightning bolt-like markings",
      "supporting_observation_ids": [
        "obs_subject_001_physical_feature_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "creature_anatomy",
      "field_path": "physical_features[1].feature",
      "claim": "visible physical feature",
      "value": "bright blue markings on limbs and face",
      "supporting_observation_ids": [
        "obs_subject_001_physical_feature_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "creature_anatomy",
      "field_path": "physical_features[2].feature",
      "claim": "visible physical feature",
      "value": "black body fur",
      "supporting_observation_ids": [
        "obs_subject_001_physical_feature_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "creature_anatomy",
      "field_path": "pose[0]",
      "claim": "pose",
      "value": "crouching stance",
      "supporting_observation_ids": [
        "obs_subject_001_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "creature_anatomy",
      "field_path": "orientation",
      "claim": "orientation",
      "value": "facing right side",
      "supporting_observation_ids": [
        "obs_subject_001_orientation_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "background color",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "environment",
      "field_path": "setting[1]",
      "claim": "background pattern",
      "value": "pink flame-like patterns",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].label",
      "claim": "electricity or lightning bolt symbol",
      "value": "electricity symbol",
      "supporting_observation_ids": [
        "obs_objects_and_props_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_018",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "メガゼラオラex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_019",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids[0]",
      "claim": "HP text",
      "value": "270 HP",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_020",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number",
      "value": "096/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_021",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "set symbol",
      "value": "visible set symbol",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_022",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator credit",
      "value": "Illus. Eban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_023",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright text",
      "value": "visible copyright text line",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_024",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[0]",
      "claim": "search term",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_025",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[1]",
      "claim": "search term",
      "value": "purple background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_026",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[2]",
      "claim": "search term",
      "value": "yellow lightning markings",
      "supporting_observation_ids": [
        "obs_subject_001_physical_feature_001"
      ],
      "confidence": 0.97,
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
        "arms",
        "ear",
        "eyes",
        "feet",
        "hands",
        "head",
        "legs",
        "mouth"
      ],
      "physical_features": [
        "black body fur",
        "bright blue markings on limbs and face",
        "yellow lightning bolt-like markings"
      ],
      "pose": [
        "crouching stance"
      ],
      "orientation": "facing right side",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "visible",
        "eyebrows": "not visible",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "bright blue",
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
      "obs_objects_and_props_001",
      "obs_subject_001",
      "obs_subject_001_body_region_001",
      "obs_subject_001_body_region_002",
      "obs_subject_001_body_region_003",
      "obs_subject_001_body_region_004",
      "obs_subject_001_body_region_005",
      "obs_subject_001_body_region_006",
      "obs_subject_001_body_region_007",
      "obs_subject_001_body_region_008",
      "obs_subject_001_orientation_001",
      "obs_subject_001_physical_feature_001",
      "obs_subject_001_physical_feature_002",
      "obs_subject_001_physical_feature_003",
      "obs_subject_001_pose_001"
    ],
    "midground": [
      "obs_environment_002"
    ],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "pink flame-like patterns",
      "purple background"
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
  "objects_and_props": [
    {
      "observation_id": "obs_objects_and_props_001",
      "label": "electricity or lightning bolt symbol",
      "normalized_label": "electricity symbol",
      "object_type": "symbol",
      "colors": [
        "yellow"
      ],
      "material_appearance": [
        "bright"
      ],
      "location": "upper right",
      "count_reference": "count_none",
      "confidence": 0.99
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
      "bright highlights on subject"
    ],
    "shadows": [
      "subtle shadows on subject"
    ],
    "highlights": [
      "bright highlights on yellow markings and blue accents"
    ],
    "composition": [
      "background patterning enhancing subject",
      "subject centered crouching"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing on subject",
    "cropping": [
      "card edges visible"
    ],
    "depth": "medium depth with layered background",
    "motion_cues": [
      "implied dynamic crouch"
    ],
    "motifs": [
      "lightning bolt shapes"
    ],
    "repeated_shapes": [
      "zigzag patterns on markings"
    ],
    "style_cues": [
      "bright contrasting colors",
      "detailed stylized illustration"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_subject_001",
      "obs_subject_001_physical_feature_001"
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
        "fact_007",
        "fact_008",
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "ear",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_body_region_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_body_region_002"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eyes",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_body_region_003"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "mouth",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_body_region_004"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_body_region_005"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_body_region_006"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "legs",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_body_region_007"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "feet",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_body_region_008"
          ],
          "confidence": 0.96
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "",
          "feature": "yellow lightning bolt-like markings",
          "visibility": "fully_visible",
          "colors": [
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_physical_feature_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "",
          "feature": "bright blue markings on limbs and face",
          "visibility": "fully_visible",
          "colors": [
            "bright blue"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_physical_feature_002"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "",
          "feature": "black body fur",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_subject_001_physical_feature_003"
          ],
          "confidence": 0.99
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "crouching stance"
          ],
          "orientation": "facing right side",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_subject_001_orientation_001",
            "obs_subject_001_pose_001"
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
        "fact_017"
      ],
      "object_observation_ids": [
        "obs_objects_and_props_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_015",
        "fact_016"
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
      "fact_ids": [],
      "observation_ids": []
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_018",
        "fact_019",
        "fact_020",
        "fact_021",
        "fact_022",
        "fact_023"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_003"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_004"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_006"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
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
      "fact_ids": [
        "fact_024",
        "fact_025",
        "fact_026"
      ],
      "terms": [
        "Mega Zeraora",
        "purple background",
        "yellow lightning markings"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "purple background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "yellow lightning markings",
      "supporting_observation_ids": [
        "obs_subject_001_physical_feature_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.96`
- Attribute confidence: `0.95`
- Cost USD: `0.0106692`
- Artwork observations: `13`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: unknown. Visible observations: orange spiky hair tied back in ponytail, face with teal eyes, eyebrows and smiling mouth, visible upper body, arms, and hands, dark blue sleeveless swimwear or athletic top, dark blue swimsuit bottom, black wristband on right wrist, right arm bent with fist forward, left arm bent back with clenched fist, standing posture, indoor swimming pool with light reflections on water surface.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| female human character | scene_subject | foreground | primary | 0.98 |
| orange spiky hair tied back in ponytail | human_appearance | foreground | high | 0.98 |
| face with teal eyes, eyebrows and smiling mouth | human_appearance | foreground | high | 0.98 |
| visible upper body, arms, and hands | human_appearance | foreground | high | 0.98 |
| dark blue sleeveless swimwear or athletic top | clothing | foreground | high | 0.98 |
| dark blue swimsuit bottom | clothing | foreground | high | 0.98 |
| black wristband on right wrist | clothing | foreground | medium | 0.96 |
| right arm bent with fist forward, left arm bent back with clenched fist, standing posture | human_appearance | foreground | high | 0.98 |
| indoor swimming pool with light reflections on water surface | environment | background | high | 0.97 |
| blue railing with horizontal bars behind character | environment | background | medium | 0.95 |
| poolside area floor with light reflections | environment | background | medium | 0.95 |
| pool lane markings visible beneath water | environment | background | medium | 0.95 |
| lighting with sparkle or star effects on water | environment | background | medium | 0.94 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese at top left | card_ui_text | top left | visible | 0.98 |
| trainer type label in Japanese at top right | card_ui_text | top right | visible | 0.98 |
| card text description in Japanese below illustration | card_ui_text | lower illustration | visible | 0.98 |
| copyright and publisher text at bottom edge | card_ui_text | bottom edge | visible | 0.96 |
| set code and collector number '108/081 SR' at bottom center | card_ui_text | bottom center | visible | 0.97 |
| illustrator credit 'Illus. En Morikura' at bottom left | card_ui_text | bottom left | visible | 0.96 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene_subject | obs_subject_001 | 0.98 |
| fact_hair_001 | human_appearance | hair color and style | obs_hair_001 | 0.98 |
| fact_face_001 | human_appearance | visible facial features | obs_face_001 | 0.98 |
| fact_pose_001 | human_appearance | pose | obs_pose_001 | 0.98 |
| fact_clothing_001 | clothing | garment torso | obs_clothing_001 | 0.98 |
| fact_clothing_002 | clothing | garment lower body | obs_clothing_002 | 0.98 |
| fact_accessory_001 | clothing | wristband | obs_accessory_001 | 0.96 |
| fact_environment_001 | environment | environment setting | obs_environment_001, obs_environment_004 | 0.97 |
| fact_environment_002 | environment | additional environment features | obs_environment_002 | 0.95 |
| fact_environment_003 | environment | lighting sparkle effects | obs_environment_005 | 0.94 |
| fact_grounded_search_term_001 | fact_grounded_search_terms | search term | obs_hair_001 | 0.98 |
| fact_grounded_search_term_002 | fact_grounded_search_terms | search term | obs_clothing_001 | 0.98 |
| fact_grounded_search_term_003 | fact_grounded_search_terms | search term | obs_environment_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_text_001 | card name text in Japanese | obs_card_ui_001 | 0.98 |
| fact_trainer_type_001 | trainer type label in Japanese | obs_card_ui_002 | 0.98 |
| fact_card_text_001 | description text in Japanese | obs_card_ui_003 | 0.98 |
| fact_copyright_001 | copyright and publisher text visible | obs_card_ui_004 | 0.96 |
| fact_collector_number_001 | collector number and set code visible | obs_card_ui_005 | 0.97 |
| fact_illustrator_001 | illustrator text visible | obs_card_ui_006 | 0.96 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_name_text_001",
    "fact_card_text_001",
    "fact_collector_number_001",
    "fact_copyright_001",
    "fact_illustrator_001",
    "fact_trainer_type_001"
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
  "bottom_line_text_observation_ids": [
    "obs_card_ui_003"
  ],
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
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| orange spiky ponytail | obs_hair_001 |
| dark blue sleeveless swimwear | obs_clothing_001 |
| indoor swimming pool background | obs_environment_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown. Visible observations: orange spiky hair tied back in ponytail, face with teal eyes, eyebrows and smiling mouth, visible upper body, arms, and hands, dark blue sleeveless swimwear or athletic top, dark blue swimsuit bottom, black wristband on right wrist, right arm bent with fist forward, left arm bent back with clenched fist, standing posture, indoor swimming pool with light reflections on water surface.
- Quality flags: `potential_module_review_conflicts_with_entries`
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
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "orange spiky hair tied back in ponytail",
      "normalized_label": "orange spiky hair tied back in ponytail",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "face with teal eyes, eyebrows and smiling mouth",
      "normalized_label": "face with teal eyes, eyebrows, smiling mouth",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_upper_body_001",
      "kind": "human_appearance",
      "label": "visible upper body, arms, and hands",
      "normalized_label": "visible upper body, arms, hands",
      "scene_layer": "foreground",
      "frame_position": "torso and arms",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "dark blue sleeveless swimwear or athletic top",
      "normalized_label": "dark blue sleeveless swimwear or athletic top",
      "scene_layer": "foreground",
      "frame_position": "torso",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "dark blue swimsuit bottom",
      "normalized_label": "dark blue swimsuit bottom",
      "scene_layer": "foreground",
      "frame_position": "hip and legs",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing",
      "label": "black wristband on right wrist",
      "normalized_label": "black wristband on right wrist",
      "scene_layer": "foreground",
      "frame_position": "arm",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "human_appearance",
      "label": "right arm bent with fist forward, left arm bent back with clenched fist, standing posture",
      "normalized_label": "right arm bent fist forward, left arm bent back clenched fist, standing",
      "scene_layer": "foreground",
      "frame_position": "arms and torso",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool with light reflections on water surface",
      "normalized_label": "indoor swimming pool with light reflections",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "blue railing with horizontal bars behind character",
      "normalized_label": "blue railing with horizontal bars",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "poolside area floor with light reflections",
      "normalized_label": "poolside area floor with reflections",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "environment",
      "label": "pool lane markings visible beneath water",
      "normalized_label": "pool lane markings beneath water",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_005",
      "kind": "environment",
      "label": "lighting with sparkle or star effects on water",
      "normalized_label": "sparkle star effects on water lighting",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese at top left",
      "normalized_label": "card name text Japanese",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "trainer type label in Japanese at top right",
      "normalized_label": "trainer type label Japanese",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "card text description in Japanese below illustration",
      "normalized_label": "card text description Japanese",
      "scene_layer": "interface",
      "frame_position": "lower illustration",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "copyright and publisher text at bottom edge",
      "normalized_label": "copyright publisher text",
      "scene_layer": "interface",
      "frame_position": "bottom edge",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "set code and collector number '108/081 SR' at bottom center",
      "normalized_label": "set code collector number 108/081 SR",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "illustrator credit 'Illus. En Morikura' at bottom left",
      "normalized_label": "illustrator credit En Morikura",
      "scene_layer": "interface",
      "frame_position": "bottom left",
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
      "field_path": "subjects[0]",
      "claim": "scene_subject",
      "value": "female human character",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "hair color and style",
      "value": "orange spiky hair tied back in ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "facial_evidence",
      "claim": "visible facial features",
      "value": "teal eyes, eyebrows, smiling mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "human_appearance",
      "field_path": "pose[0]",
      "claim": "pose",
      "value": "right arm bent with fist forward, left arm bent back with clenched fist, standing posture",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment torso",
      "value": "dark blue sleeveless swimwear or athletic top",
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
      "claim": "garment lower body",
      "value": "dark blue swimsuit bottom",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessory_001",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "wristband",
      "value": "black wristband on right wrist",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "environment setting",
      "value": "indoor swimming pool with water reflections and lane markings",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_004"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "environment_details[0]",
      "claim": "additional environment features",
      "value": "blue rail with horizontal bars behind character",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "lighting_effects[0]",
      "claim": "lighting sparkle effects",
      "value": "sparkle or star shapes on pool water surface",
      "supporting_observation_ids": [
        "obs_environment_005"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text in Japanese",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_trainer_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_text[0]",
      "claim": "trainer type label in Japanese",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_text_observation_ids[0]",
      "claim": "description text in Japanese",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright and publisher text visible",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number and set code visible",
      "value": "108/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator text visible",
      "value": "Illus. En Morikura",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_term_001",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[0]",
      "claim": "search term",
      "value": "orange spiky ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_term_002",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[1]",
      "claim": "search term",
      "value": "dark blue sleeveless swimwear",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_term_003",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[2]",
      "claim": "search term",
      "value": "indoor swimming pool background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown",
      "identity_confidence": 0.6,
      "anatomy": [
        "arms",
        "hands",
        "head",
        "legs",
        "torso"
      ],
      "physical_features": [
        "orange spiky hair",
        "teal eyes"
      ],
      "pose": [
        "left arm bent back fist",
        "right arm bent forward fist",
        "standing"
      ],
      "orientation": "frontal",
      "action_state": [
        "posing fist forward",
        "standing"
      ],
      "facial_evidence": {
        "eyes": "open teal eyes looking forward",
        "mouth": "open smiling mouth",
        "eyebrows": "visible eyebrows",
        "face_position": "frontal face",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband right wrist",
        "dark blue sleeveless swimwear top",
        "dark blue swimsuit bottom"
      ],
      "colors": [
        "black",
        "dark blue",
        "orange",
        "teal"
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
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_face_001",
      "obs_hair_001",
      "obs_pose_001",
      "obs_subject_001",
      "obs_upper_body_001"
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
      "indoor swimming pool with light reflections and lane markings"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "poolside area floor"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [
      "swimming pool water"
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark blue",
      "light blue",
      "orange",
      "teal"
    ],
    "lighting": [
      "bright lighting",
      "sparkle light effects"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "water sparkle highlights"
    ],
    "composition": [
      "balanced framing",
      "centered character",
      "frontal portrait"
    ],
    "camera_angle": "eye level",
    "framing": "medium close up",
    "cropping": [
      "full body visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [
      "static pose"
    ],
    "motifs": [
      "water sparkle"
    ],
    "repeated_shapes": [
      "star sparkle"
    ],
    "style_cues": [
      "bright colorful anime style"
    ],
    "supporting_observation_ids": [
      "obs_environment_005",
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
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "visibility": "visible",
          "details": [
            "orange spiky hair tied back in ponytail"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "open teal eyes",
          "mouth": "open smiling",
          "eyebrows": "visible eyebrows",
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
          "label": "orange spiky hair tied back in ponytail",
          "details": [],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right arm bent fist forward, left arm bent back fist",
          "details": [],
          "supporting_observation_ids": [
            "obs_pose_001"
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
            "left arm bent back clenched fist",
            "right arm bent forward fist",
            "standing"
          ],
          "orientation": "frontal",
          "action_state": [
            "posing",
            "standing"
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
        "fact_clothing_001",
        "fact_clothing_002"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "dark blue sleeveless swimwear or athletic top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "dark blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "lower body",
          "garment": "dark blue swimsuit bottom",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "dark blue"
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
          "label": "black wristband on right wrist",
          "details": [],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.96
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
        "fact_environment_002",
        "fact_environment_003"
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
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_005"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_005"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_name_text_001",
        "fact_card_text_001",
        "fact_collector_number_001",
        "fact_copyright_001",
        "fact_illustrator_001",
        "fact_trainer_type_001"
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
      "bottom_line_text_observation_ids": [
        "obs_card_ui_003"
      ],
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
        "fact_grounded_search_term_001",
        "fact_grounded_search_term_002",
        "fact_grounded_search_term_003"
      ],
      "terms": [
        "dark blue sleeveless swimwear",
        "indoor swimming pool background",
        "orange spiky ponytail"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "orange spiky ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "dark blue sleeveless swimwear",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "indoor swimming pool background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-117 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.97`
- Attribute confidence: `0.94`
- Cost USD: `0.007438`
- Artwork observations: `7`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female human. Visible observations: female human figure, long dark purple hair, blue hooded coat with wide collar, extending right arm forward with open hand, face with purple eyes looking slightly left, neutral mouth expression, abstract colorful background with yellow, orange, and red starburst pattern, hat with distinct curved horns and purple, white, and yellow color patterns.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| female human figure | person | foreground | high | 0.99 |
| long dark purple hair | hair | foreground | high | 0.99 |
| blue hooded coat with wide collar | clothing | foreground | high | 0.95 |
| extending right arm forward with open hand | pose | foreground | high | 0.98 |
| face with purple eyes looking slightly left, neutral mouth expression | face | foreground | high | 0.97 |
| abstract colorful background with yellow, orange, and red starburst pattern | environment | background | medium | 0.95 |
| hat with distinct curved horns and purple, white, and yellow color patterns | object | foreground | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene_subject is female human | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | human hair color is dark purple | obs_hair_001 | 0.99 |
| fact_003 | human_appearance | human pose is right arm extended forward with open hand | obs_pose_001 | 0.98 |
| fact_004 | human_appearance | human eyes are purple and looking slightly left | obs_facial_evidence_001 | 0.97 |
| fact_005 | human_appearance | human mouth visible with neutral expression | obs_facial_evidence_001 | 0.97 |
| fact_006 | clothing | subject wears blue hooded coat with wide collar | obs_clothing_001 | 0.95 |
| fact_007 | human_appearance | subject wears hat with curved horns colored purple, white, and yellow | obs_object_001 | 0.95 |
| fact_008 | environment | background is abstract colorful starburst design with yellow, orange, and red tones | obs_background_001 | 0.95 |

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
| objects_and_props | complete | none | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | none_visible | none | not_applicable |  |
| counts | none_visible | none | not_applicable |  |
| relationships | complete | none | high |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| wears | obs_subject_001 | obs_object_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| female human | obs_subject_001 |
| purple hair | obs_hair_001 |
| hat with horns | obs_object_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human. Visible observations: female human figure, long dark purple hair, blue hooded coat with wide collar, extending right arm forward with open hand, face with purple eyes looking slightly left, neutral mouth expression, abstract colorful background with yellow, orange, and red starburst pattern, hat with distinct curved horns and purple, white, and yellow color patterns.
- Quality flags: `potential_pose_or_action_without_visible_support`, `potential_salient_object_missing_count_reference`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "person",
      "label": "female human figure",
      "normalized_label": "female human",
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
      "label": "long dark purple hair",
      "normalized_label": "hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue hooded coat with wide collar",
      "normalized_label": "hooded coat",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "extending right arm forward with open hand",
      "normalized_label": "arm extended forward",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_evidence_001",
      "kind": "face",
      "label": "face with purple eyes looking slightly left, neutral mouth expression",
      "normalized_label": "face",
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
      "label": "abstract colorful background with yellow, orange, and red starburst pattern",
      "normalized_label": "background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "hat with distinct curved horns and purple, white, and yellow color patterns",
      "normalized_label": "hat with horns",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "scene_subject is female human",
      "value": "female human",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair[0].label",
      "claim": "human hair color is dark purple",
      "value": "dark purple",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "pose[0].label",
      "claim": "human pose is right arm extended forward with open hand",
      "value": "right arm extended forward with open hand",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "facial_evidence[0].eyes",
      "claim": "human eyes are purple and looking slightly left",
      "value": "purple eyes looking slightly left",
      "supporting_observation_ids": [
        "obs_facial_evidence_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "human_appearance",
      "field_path": "facial_evidence[0].mouth",
      "claim": "human mouth visible with neutral expression",
      "value": "neutral mouth",
      "supporting_observation_ids": [
        "obs_facial_evidence_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "garments[0].label",
      "claim": "subject wears blue hooded coat with wide collar",
      "value": "blue hooded coat with wide collar",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "headwear[0].label",
      "claim": "subject wears hat with curved horns colored purple, white, and yellow",
      "value": "hat with curved horns purple white yellow",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "setting",
      "claim": "background is abstract colorful starburst design with yellow, orange, and red tones",
      "value": "abstract colorful starburst background yellow orange red",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human",
      "identity_confidence": 0.99,
      "anatomy": [
        "head",
        "left_arm",
        "right_arm",
        "torso"
      ],
      "physical_features": [
        "long hair",
        "purple eyes"
      ],
      "pose": [
        "right arm extended forward",
        "standing"
      ],
      "orientation": "slightly turned left",
      "action_state": [],
      "facial_evidence": {
        "eyes": "purple looking slightly left",
        "mouth": "neutral expression",
        "eyebrows": "visible but neutral",
        "face_position": "upright center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "blue hooded coat with wide collar",
        "hat with curved horns"
      ],
      "colors": [
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
    "foreground": [
      "obs_clothing_001",
      "obs_facial_evidence_001",
      "obs_hair_001",
      "obs_object_001",
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
      "abstract colorful starburst pattern"
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
      "observation_id": "obs_object_001",
      "label": "hat with distinct curved horns",
      "normalized_label": "hat with horns",
      "object_type": "headwear",
      "colors": [
        "purple",
        "white",
        "yellow"
      ],
      "material_appearance": [],
      "location": "on head",
      "count_reference": "",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_subject_001",
      "target_observation_id": "obs_object_001",
      "relationship": "wears",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "blue",
      "dark purple",
      "orange",
      "pink",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "even",
      "soft"
    ],
    "shadows": [
      "minimal"
    ],
    "highlights": [
      "subtle"
    ],
    "composition": [
      "centered subject",
      "extended arm gesture",
      "frontal pose"
    ],
    "camera_angle": "eye level",
    "framing": "medium close-up",
    "cropping": [],
    "depth": "shallow",
    "motion_cues": [],
    "motifs": [
      "curved horns on hat",
      "starburst background"
    ],
    "repeated_shapes": [
      "curved spirals"
    ],
    "style_cues": [
      "anime style",
      "clean line art",
      "soft shading"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
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
        "fact_004",
        "fact_005",
        "fact_007"
      ],
      "visible_body_regions": [],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "upright center",
          "eyes": "purple looking slightly left",
          "mouth": "neutral expression",
          "eyebrows": "visible but neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_facial_evidence_001"
          ],
          "confidence": 0.97
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "long dark purple hair",
          "details": [],
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
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "hat with curved horns purple white yellow",
          "details": [],
          "supporting_observation_ids": [
            "obs_object_001"
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
        "fact_006"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue hooded coat",
          "neckline_type": "wide collar",
          "sleeve_type": "",
          "colors": [
            "blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_007"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
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
      "fact_ids": [
        "fact_007"
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
        "female human",
        "hat with horns",
        "purple hair"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "female human",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "hat with horns",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-116 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.008718`
- Artwork observations: `11`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: human trainer gladion. Visible observations: human trainer gladion, short blond hair with side bangs, yellow eyes, neutral expression, side face, black long sleeved high collar jacket with purple accents, purple pants, red pouch attached to clothing, right hand raised near face with thumb and index finger forming a circle, left hand holding right wrist.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| human trainer gladion | scene_subject | foreground | high | 0.99 |
| short blond hair with side bangs | feature | foreground | high | 0.99 |
| yellow eyes, neutral expression, side face | feature | foreground | high | 0.99 |
| black long sleeved high collar jacket with purple accents | clothing | foreground | high | 0.98 |
| purple pants | clothing | foreground | medium | 0.95 |
| red pouch attached to clothing | clothing | foreground | medium | 0.95 |
| right hand raised near face with thumb and index finger forming a circle | gesture | foreground | high | 0.98 |
| left hand holding right wrist | gesture | foreground | medium | 0.97 |
| mountainous background with blue sky and white clouds | environment | background | medium | 0.99 |
| sun visible in sky | environment | background | medium | 0.99 |
| pink and purple light streaks crossing from bottom left to top right | visual_effect | foreground | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair style and color | obs_hair_001 | 0.99 |
| fact_003 | human_appearance | face position and features | obs_face_001 | 0.99 |
| fact_004 | clothing | jacket color and style | obs_clothing_001 | 0.98 |
| fact_005 | clothing | pants color | obs_clothing_002 | 0.95 |
| fact_006 | clothing | presence of red pouch accessory | obs_clothing_003 | 0.95 |
| fact_007 | human_appearance | right hand gesture | obs_hand_pose_001 | 0.98 |
| fact_008 | human_appearance | left hand posture | obs_hand_pose_002 | 0.97 |
| fact_009 | environment | background environment | obs_environment_001 | 0.99 |
| fact_010 | environment | sun visible | obs_environment_002 | 0.99 |
| fact_011 | visual_effects | light streaks | obs_light_effects_001 | 0.95 |

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
| environment | complete | none | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | none_visible | none | not_applicable |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| human trainer gladion | obs_subject_001 |
| blond hair | obs_hair_001 |
| black and purple clothing | obs_clothing_001 |
| circular hand gesture | obs_hand_pose_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human trainer gladion. Visible observations: human trainer gladion, short blond hair with side bangs, yellow eyes, neutral expression, side face, black long sleeved high collar jacket with purple accents, purple pants, red pouch attached to clothing, right hand raised near face with thumb and index finger forming a circle, left hand holding right wrist.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human trainer gladion",
      "normalized_label": "human trainer gladion",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "feature",
      "label": "short blond hair with side bangs",
      "normalized_label": "short blond hair",
      "scene_layer": "foreground",
      "frame_position": "center_face",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "feature",
      "label": "yellow eyes, neutral expression, side face",
      "normalized_label": "face side profile neutral expression with yellow eyes",
      "scene_layer": "foreground",
      "frame_position": "center_face",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "black long sleeved high collar jacket with purple accents",
      "normalized_label": "black jacket with purple accents and high collar",
      "scene_layer": "foreground",
      "frame_position": "center_torso",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "purple pants",
      "normalized_label": "purple pants",
      "scene_layer": "foreground",
      "frame_position": "lower_body",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "clothing",
      "label": "red pouch attached to clothing",
      "normalized_label": "red pouch",
      "scene_layer": "foreground",
      "frame_position": "waist_side",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_pose_001",
      "kind": "gesture",
      "label": "right hand raised near face with thumb and index finger forming a circle",
      "normalized_label": "thumb and index finger circle gesture right hand",
      "scene_layer": "foreground",
      "frame_position": "center_hands",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_pose_002",
      "kind": "gesture",
      "label": "left hand holding right wrist",
      "normalized_label": "left hand holding right wrist",
      "scene_layer": "foreground",
      "frame_position": "center_hands",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "mountainous background with blue sky and white clouds",
      "normalized_label": "mountainous background blue sky white clouds",
      "scene_layer": "background",
      "frame_position": "full_background",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "sun visible in sky",
      "normalized_label": "visible sun in sky",
      "scene_layer": "background",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_effects_001",
      "kind": "visual_effect",
      "label": "pink and purple light streaks crossing from bottom left to top right",
      "normalized_label": "pink purple light streaks crossing diagonal",
      "scene_layer": "foreground",
      "frame_position": "center_foreground",
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
      "claim": "subject identity",
      "value": "human trainer gladion",
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
      "claim": "hair style and color",
      "value": "short blond hair with side bangs",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "face",
      "claim": "face position and features",
      "value": "side face with yellow eyes",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments.jacket",
      "claim": "jacket color and style",
      "value": "black long sleeved high collar jacket with purple accents",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments.pants",
      "claim": "pants color",
      "value": "purple pants",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "accessories.pouch",
      "claim": "presence of red pouch accessory",
      "value": "red pouch attached to waist",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "hands.gesture.right_hand",
      "claim": "right hand gesture",
      "value": "thumb and index forming circle near face",
      "supporting_observation_ids": [
        "obs_hand_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "human_appearance",
      "field_path": "hands.gesture.left_hand",
      "claim": "left hand posture",
      "value": "left hand holding right wrist",
      "supporting_observation_ids": [
        "obs_hand_pose_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "setting.mountains_and_sky",
      "claim": "background environment",
      "value": "mountainous background with blue sky and white clouds",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "setting.sun",
      "claim": "sun visible",
      "value": "visible sun in sky",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "visual_effects",
      "field_path": "lighting.effects",
      "claim": "light streaks",
      "value": "pink and purple diagonal light streaks",
      "supporting_observation_ids": [
        "obs_light_effects_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human trainer gladion",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "hands",
        "head",
        "legs",
        "neck",
        "torso"
      ],
      "physical_features": [
        "blond hair",
        "yellow eyes"
      ],
      "pose": [
        "left hand holding right wrist",
        "right hand raised near face forming circle",
        "side face profile"
      ],
      "orientation": "right_profile",
      "action_state": [
        "standing"
      ],
      "facial_evidence": {
        "eyes": "yellow",
        "mouth": "neutral closed",
        "eyebrows": "visible, neutral",
        "face_position": "right profile",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black long sleeved high collar jacket with purple accents",
        "purple pants",
        "red pouch"
      ],
      "colors": [
        "black",
        "blond",
        "purple",
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
      "obs_clothing_003",
      "obs_face_001",
      "obs_hair_001",
      "obs_hand_pose_001",
      "obs_hand_pose_002",
      "obs_light_effects_001",
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
      "blue sky",
      "mountainous background",
      "white clouds"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "visible sun",
      "white clouds"
    ],
    "ground": [
      "mountainous terrain"
    ],
    "terrain": [
      "mountains"
    ],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "daytime with sun"
    ],
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
      "blond",
      "blue",
      "pink",
      "purple",
      "red",
      "white"
    ],
    "lighting": [
      "strong sunlight with highlights"
    ],
    "shadows": [
      "human figure cast shadows consistent with sunlight"
    ],
    "highlights": [
      "pink and purple light streak highlights"
    ],
    "composition": [
      "center composition with subject side profile and background mountains"
    ],
    "camera_angle": "level eye view",
    "framing": "tight framing on upper half of subject",
    "cropping": [
      "bottom crop includes waist and above"
    ],
    "depth": "clear foreground subject with detailed background",
    "motion_cues": [
      "light streaks suggesting movement or energy"
    ],
    "motifs": [
      "circular gesture motif with hand"
    ],
    "repeated_shapes": [
      "diagonal light streaks"
    ],
    "style_cues": [
      "illustrated anime style"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_light_effects_001",
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
        "fact_003",
        "fact_007",
        "fact_008"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "neutral eyebrows",
            "neutral mouth",
            "side face",
            "yellow eyes"
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
          "face_position": "right profile",
          "eyes": "yellow",
          "mouth": "neutral closed",
          "eyebrows": "visible, neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "short blond hair with side bangs",
          "details": [
            "blond color",
            "short length",
            "side bangs"
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
          "label": "right hand forming circle near face",
          "details": [
            "thumb and index finger forming circle shape"
          ],
          "supporting_observation_ids": [
            "obs_hand_pose_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "left hand holding right wrist",
          "details": [
            "left hand grasping right wrist"
          ],
          "supporting_observation_ids": [
            "obs_hand_pose_002"
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
        "fact_004",
        "fact_005",
        "fact_006"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper_body",
          "garment": "black long sleeved high collar jacket with purple accents",
          "neckline_type": "high collar",
          "sleeve_type": "long sleeve",
          "colors": [
            "black",
            "purple"
          ],
          "visible_details": [
            "high collar",
            "purple accents"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "lower_body",
          "garment": "purple pants",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "purple"
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
          "label": "red pouch",
          "details": [
            "attached to waist"
          ],
          "supporting_observation_ids": [
            "obs_clothing_003"
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
        "fact_009",
        "fact_010"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_011"
      ],
      "observation_ids": [
        "obs_light_effects_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_011"
      ],
      "observation_ids": [
        "obs_light_effects_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_011"
      ],
      "observation_ids": [
        "obs_light_effects_001"
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
        "black and purple clothing",
        "blond hair",
        "circular hand gesture",
        "human trainer gladion"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "human trainer gladion",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "blond hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "black and purple clothing",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "circular hand gesture",
      "supporting_observation_ids": [
        "obs_hand_pose_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-111 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0103672`
- Artwork observations: `11`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: female human trainer. Visible observations: female human trainer, long purple hair, purple eyes with lashes, visible face with nose and mouth lightly parted, long white coat with gold gear emblem and black inner garment, black dress or shirt beneath coat with gold gear emblem and blue vertical stripes, blue gloves covering hands, hands clasped together.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| female human trainer | scene_subject | foreground | high | 0.99 |
| long purple hair | human_appearance | foreground | high | 0.99 |
| purple eyes with lashes | human_appearance | foreground | high | 0.98 |
| visible face with nose and mouth lightly parted | human_appearance | foreground | high | 0.98 |
| long white coat with gold gear emblem and black inner garment | clothing | foreground | high | 0.98 |
| black dress or shirt beneath coat with gold gear emblem and blue vertical stripes | clothing | foreground | high | 0.97 |
| blue gloves covering hands | clothing | foreground | medium | 0.97 |
| hands clasped together | human_appearance | foreground | medium | 0.96 |
| blue and gold crown or hat with black swirl decorations | clothing | foreground | high | 0.98 |
| stone wall background with square blocks and window | environment | background | medium | 0.97 |
| stone stairway to right side | environment | background | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text 'ムク' in Japanese | card_name_text | top-left | visible | 0.99 |
| Japanese text in red 'サポート' (support) at top-left | card_ui_text | top-left | visible | 0.99 |
| Japanese text 'トレーナーズ' (trainers) at top-right | card_ui_text | top-right | visible | 0.99 |
| illustrator credit '(illus. nagimiso)' at bottom-left | illustrator_text | bottom-left | visible | 0.98 |
| collector number '111/081' with set code 'M5' and rarity 'SR' at bottom center | collector_number | bottom-center | visible | 0.99 |
| copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' at bottom | copyright_text | bottom | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject present | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair color and style | obs_hair_001 | 0.99 |
| fact_003 | human_appearance | eye appearance | obs_eyes_001 | 0.98 |
| fact_004 | human_appearance | face visible | obs_face_001 | 0.98 |
| fact_005 | clothing | garment type and color | obs_clothing_001 | 0.98 |
| fact_006 | clothing | inner garment details | obs_clothing_002 | 0.97 |
| fact_007 | clothing | hand accessories | obs_accessories_001 | 0.97 |
| fact_008 | human_appearance | hand gesture | obs_hands_001 | 0.96 |
| fact_009 | clothing | headwear description | obs_headwear_001 | 0.98 |
| fact_010 | environment | background environment | obs_environment_001 | 0.97 |
| fact_011 | environment | background environment | obs_environment_002 | 0.96 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_012 | card name text | obs_card_ui_name_001 | 0.99 |
| fact_013 | support text top-left | obs_card_ui_top_left_text_001 | 0.99 |
| fact_014 | trainers text top-right | obs_card_ui_top_right_text_001 | 0.99 |
| fact_015 | illustrator credit | obs_card_ui_illustrator_001 | 0.98 |
| fact_016 | collector number and set code | obs_card_ui_set_code_001 | 0.99 |
| fact_017 | copyright text | obs_card_ui_copyright_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_012",
    "fact_013",
    "fact_014",
    "fact_015",
    "fact_016",
    "fact_017"
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
    "obs_card_ui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_top_left_text_001",
    "obs_card_ui_top_right_text_001"
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
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| purple hair character | obs_hair_001 |
| blue and gold crown | obs_headwear_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Visible observations: female human trainer, long purple hair, purple eyes with lashes, visible face with nose and mouth lightly parted, long white coat with gold gear emblem and black inner garment, black dress or shirt beneath coat with gold gear emblem and blue vertical stripes, blue gloves covering hands, hands clasped together.
- Quality flags: `potential_pose_or_action_without_visible_support`
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
      "kind": "human_appearance",
      "label": "long purple hair",
      "normalized_label": "long purple hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "human_appearance",
      "label": "purple eyes with lashes",
      "normalized_label": "purple eyes",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "visible face with nose and mouth lightly parted",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "long white coat with gold gear emblem and black inner garment",
      "normalized_label": "coat with emblem",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "black dress or shirt beneath coat with gold gear emblem and blue vertical stripes",
      "normalized_label": "black dress shirt with emblem and stripes",
      "scene_layer": "foreground",
      "frame_position": "torso",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessories_001",
      "kind": "clothing",
      "label": "blue gloves covering hands",
      "normalized_label": "blue gloves",
      "scene_layer": "foreground",
      "frame_position": "hands",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hands_001",
      "kind": "human_appearance",
      "label": "hands clasped together",
      "normalized_label": "hands clasped",
      "scene_layer": "foreground",
      "frame_position": "hands",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_headwear_001",
      "kind": "clothing",
      "label": "blue and gold crown or hat with black swirl decorations",
      "normalized_label": "crown with swirl decorations",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "stone wall background with square blocks and window",
      "normalized_label": "stone wall background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "stone stairway to right side",
      "normalized_label": "stone stairway",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "card name text 'ムク' in Japanese",
      "normalized_label": "card name text 'ムク'",
      "scene_layer": "card_ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_left_text_001",
      "kind": "card_ui_text",
      "label": "Japanese text in red 'サポート' (support) at top-left",
      "normalized_label": "support text 'サポート'",
      "scene_layer": "card_ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_right_text_001",
      "kind": "card_ui_text",
      "label": "Japanese text 'トレーナーズ' (trainers) at top-right",
      "normalized_label": "trainers text 'トレーナーズ'",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator credit '(illus. nagimiso)' at bottom-left",
      "normalized_label": "illustrator text 'illus. nagimiso'",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "collector_number",
      "label": "collector number '111/081' with set code 'M5' and rarity 'SR' at bottom center",
      "normalized_label": "collector number 111/081 with set code M5 and rarity SR",
      "scene_layer": "card_ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' at bottom",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
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
      "field_path": "[0]",
      "claim": "subject present",
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
      "field_path": "hair[0]",
      "claim": "hair color and style",
      "value": "long purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "face_eyes[0]",
      "claim": "eye appearance",
      "value": "purple eyes",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "face[0]",
      "claim": "face visible",
      "value": "visible face with nose and mouth lightly parted",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment type and color",
      "value": "long white coat with gold gear emblem",
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
      "claim": "inner garment details",
      "value": "black dress or shirt with gold gear emblem and blue vertical stripes",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "hand accessories",
      "value": "blue gloves",
      "supporting_observation_ids": [
        "obs_accessories_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "human_appearance",
      "field_path": "hands[0]",
      "claim": "hand gesture",
      "value": "hands clasped together",
      "supporting_observation_ids": [
        "obs_hands_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "clothing",
      "field_path": "headwear[0]",
      "claim": "headwear description",
      "value": "blue and gold crown or hat with black swirl decorations",
      "supporting_observation_ids": [
        "obs_headwear_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "background environment",
      "value": "stone wall background with square blocks and window",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "environment",
      "field_path": "setting[1]",
      "claim": "background environment",
      "value": "stone stairway to right side",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0]",
      "claim": "card name text",
      "value": "ムク (Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker[0]",
      "claim": "support text top-left",
      "value": "サポート (Support in Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_top_left_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker[1]",
      "claim": "trainers text top-right",
      "value": "トレーナーズ (Trainers in Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_top_right_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text[0]",
      "claim": "illustrator credit",
      "value": "illus. nagimiso",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "collector number and set code",
      "value": "111/081 M5 SR",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line[0]",
      "claim": "copyright text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
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
        "hands",
        "head",
        "neck",
        "shoulders"
      ],
      "physical_features": [
        "purple eyes",
        "purple hair"
      ],
      "pose": [
        "hands clasped",
        "standing"
      ],
      "orientation": "front",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "round purple eyes",
        "mouth": "closed with slight part",
        "eyebrows": "visible",
        "face_position": "centered frontal face",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black dress or shirt with blue vertical stripes",
        "blue and gold crown or hat",
        "blue gloves",
        "long white coat with gold gear emblem"
      ],
      "colors": [
        "black",
        "blue",
        "gold",
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
      "obs_accessories_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_eyes_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_hands_001",
      "obs_headwear_001",
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
      "indoor",
      "stone stairway",
      "stone wall structure",
      "window"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [
      "stone"
    ],
    "plants": [],
    "architecture": [
      "stone masonry",
      "window with bars"
    ],
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
      "gold",
      "purple",
      "white"
    ],
    "lighting": [
      "indoor diffuse lighting"
    ],
    "shadows": [
      "soft shadows on walls"
    ],
    "highlights": [
      "specular highlights on hair and coat"
    ],
    "composition": [
      "central composition",
      "frontal portrait"
    ],
    "camera_angle": "eye-level",
    "framing": "medium portrait",
    "cropping": [
      "full figure visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "gear motif on coat and shirt"
    ],
    "repeated_shapes": [
      "spirals swirl in crown design"
    ],
    "style_cues": [
      "anime style"
    ],
    "supporting_observation_ids": [
      "obs_clothing_001",
      "obs_headwear_001",
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
        "fact_003",
        "fact_004",
        "fact_008"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hair",
          "visibility": "visible",
          "details": [
            "long purple hair"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "purple eyes",
            "visible face with nose and mouth lightly parted"
          ],
          "supporting_observation_ids": [
            "obs_eyes_001",
            "obs_face_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "visibility": "visible",
          "details": [
            "hands clasped together",
            "wearing blue gloves"
          ],
          "supporting_observation_ids": [
            "obs_accessories_001",
            "obs_hands_001"
          ],
          "confidence": 0.96
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered frontal face",
          "eyes": "round purple eyes",
          "mouth": "closed with slight part",
          "eyebrows": "visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_eyes_001",
            "obs_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "long purple hair",
          "details": [
            "dark purple shades"
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
          "label": "hands clasped",
          "details": [
            "interlaced fingers"
          ],
          "supporting_observation_ids": [
            "obs_hands_001"
          ],
          "confidence": 0.96
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue gloves",
          "details": [
            "finger gloves"
          ],
          "supporting_observation_ids": [
            "obs_accessories_001"
          ],
          "confidence": 0.97
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
        "fact_009"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "long white coat",
          "neckline_type": "high neckline",
          "sleeve_type": "long sleeves",
          "colors": [
            "white"
          ],
          "visible_details": [
            "gold gear emblem on coat front"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black inner garment",
          "neckline_type": "standard neckline",
          "sleeve_type": "unknown",
          "colors": [
            "black",
            "blue stripes"
          ],
          "visible_details": [
            "blue vertical stripes",
            "gold gear emblem"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue gloves",
          "details": [
            "covering hands fully"
          ],
          "supporting_observation_ids": [
            "obs_accessories_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue and gold crown or hat",
          "details": [
            "black swirl decorative elements"
          ],
          "supporting_observation_ids": [
            "obs_headwear_001"
          ],
          "confidence": 0.98
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
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
        "obs_subject_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015",
        "fact_016",
        "fact_017"
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
        "obs_card_ui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_top_left_text_001",
        "obs_card_ui_top_right_text_001"
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
        "fact_001",
        "fact_002",
        "fact_009"
      ],
      "terms": [
        "blue and gold crown",
        "female human trainer",
        "purple hair character"
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
      "evidence_quality": "high",
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "female human trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "purple hair character",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "blue and gold crown",
      "supporting_observation_ids": [
        "obs_headwear_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.96`
- Cost USD: `0.0074956`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: large outdoor stadium structure, stadium roof framework with glass panels, purple running track with blue and green lane markers, green grassy field inside stadium, green circular emblem with white plant leaf symbol on stadium wall, group of orange and white traffic cones arranged in line, black metal fence posts with small chains between them, group of dense green coniferous trees. Counts: traffic cones: 7.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| large outdoor stadium structure | environment | midground | high | 0.99 |
| stadium roof framework with glass panels | environment | midground | medium | 0.98 |
| purple running track with blue and green lane markers | environment | midground | medium | 0.98 |
| green grassy field inside stadium | environment | midground | high | 0.99 |
| green circular emblem with white plant leaf symbol on stadium wall | objects_and_props | midground | medium | 0.97 |
| group of orange and white traffic cones arranged in line | objects_and_props | foreground | medium | 0.96 |
| black metal fence posts with small chains between them | objects_and_props | foreground | medium | 0.95 |
| group of dense green coniferous trees | environment | background | medium | 0.98 |
| paved walkway with parallel white lines | environment | midground | medium | 0.97 |
| small water body or pond next to walkway | environment | midground | medium | 0.96 |
| light blue sky with some white clouds | environment | background | medium | 0.98 |
| green poles holding stadium roof structure | objects_and_props | midground | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_field_001, obs_stadium_001, obs_track_001 | 0.99 |
| fact_env_002 | environment | sky composition | obs_sky_001 | 0.98 |
| fact_env_003 | environment | terrain types | obs_field_001, obs_lake_001, obs_path_001 | 0.97 |
| fact_env_004 | environment | plants present | obs_trees_001 | 0.98 |
| fact_objects_001 | objects_and_props | objects present | obs_cones_001, obs_emblem_001, obs_fence_001, obs_light_poles_001 | 0.96 |
| fact_counts_001 | counts | count of traffic cones | obs_cones_001 | 0.95 |

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
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | card_ui_and_print_markers.name_text_observation_ids: name text partially unreadable; card_ui_and_print_markers.collector_number_observation_ids: collector number partially unreadable; card_ui_and_print_markers.set_symbol_observation_ids: set symbol partially unreadable; card_ui_and_print_markers.rarity_mark_observation_ids: rarity mark partially unreadable; card_ui_and_print_markers.copyright_line_observation_ids: copyright line partially unreadable; card_ui_and_print_markers.bottom_line_text_observation_ids: bottom line text partially unreadable; card_ui_and_print_markers.illustrator_text_observation_ids: illustrator text partially unreadable |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| traffic cones | exact | 7 | obs_cones_001 | 0.95 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| supported by | obs_roof_001 | obs_light_poles_001 | strong |
| attached to | obs_emblem_001 | obs_stadium_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| stadium environment | obs_field_001, obs_stadium_001, obs_track_001 |
| coniferous trees | obs_trees_001 |
| stadium emblem | obs_emblem_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: large outdoor stadium structure, stadium roof framework with glass panels, purple running track with blue and green lane markers, green grassy field inside stadium, green circular emblem with white plant leaf symbol on stadium wall, group of orange and white traffic cones arranged in line, black metal fence posts with small chains between them, group of dense green coniferous trees. Counts: traffic cones: 7.
- Quality flags: `potential_actual_material_claim_without_visual_evidence`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_001",
      "kind": "environment",
      "label": "large outdoor stadium structure",
      "normalized_label": "stadium structure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_roof_001",
      "kind": "environment",
      "label": "stadium roof framework with glass panels",
      "normalized_label": "roof framework",
      "scene_layer": "midground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_track_001",
      "kind": "environment",
      "label": "purple running track with blue and green lane markers",
      "normalized_label": "running track",
      "scene_layer": "midground",
      "frame_position": "mid_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_field_001",
      "kind": "environment",
      "label": "green grassy field inside stadium",
      "normalized_label": "field",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_emblem_001",
      "kind": "objects_and_props",
      "label": "green circular emblem with white plant leaf symbol on stadium wall",
      "normalized_label": "stadium emblem",
      "scene_layer": "midground",
      "frame_position": "center_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cones_001",
      "kind": "objects_and_props",
      "label": "group of orange and white traffic cones arranged in line",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_fence_001",
      "kind": "objects_and_props",
      "label": "black metal fence posts with small chains between them",
      "normalized_label": "metal fence",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "environment",
      "label": "group of dense green coniferous trees",
      "normalized_label": "coniferous trees",
      "scene_layer": "background",
      "frame_position": "right_side",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_path_001",
      "kind": "environment",
      "label": "paved walkway with parallel white lines",
      "normalized_label": "walkway",
      "scene_layer": "midground",
      "frame_position": "middle_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lake_001",
      "kind": "environment",
      "label": "small water body or pond next to walkway",
      "normalized_label": "pond",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_001",
      "kind": "environment",
      "label": "light blue sky with some white clouds",
      "normalized_label": "sky",
      "scene_layer": "background",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_poles_001",
      "kind": "objects_and_props",
      "label": "green poles holding stadium roof structure",
      "normalized_label": "poles",
      "scene_layer": "midground",
      "frame_position": "center_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "outdoor stadium structure with field and running track",
      "supporting_observation_ids": [
        "obs_field_001",
        "obs_stadium_001",
        "obs_track_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky composition",
      "value": "light blue sky with white clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain types",
      "value": "grass field, paved walkway, water pond",
      "supporting_observation_ids": [
        "obs_field_001",
        "obs_lake_001",
        "obs_path_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "plants",
      "claim": "plants present",
      "value": "dense coniferous trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_001",
      "module": "objects_and_props",
      "field_path": "objects",
      "claim": "objects present",
      "value": "stadium emblem, traffic cones, metal fence, green poles",
      "supporting_observation_ids": [
        "obs_cones_001",
        "obs_emblem_001",
        "obs_fence_001",
        "obs_light_poles_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_counts_001",
      "module": "counts",
      "field_path": "counts/cones",
      "claim": "count of traffic cones",
      "value": "7",
      "supporting_observation_ids": [
        "obs_cones_001"
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
      "normalized_label": "traffic cones",
      "count_type": "exact",
      "exact_count": 7,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_cones_001",
      "obs_fence_001"
    ],
    "midground": [
      "obs_emblem_001",
      "obs_field_001",
      "obs_lake_001",
      "obs_light_poles_001",
      "obs_path_001",
      "obs_roof_001",
      "obs_stadium_001",
      "obs_track_001"
    ],
    "background": [
      "obs_sky_001",
      "obs_trees_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor stadium structure"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "light blue sky",
      "white clouds"
    ],
    "ground": [
      "paved walkway"
    ],
    "terrain": [
      "grass field"
    ],
    "plants": [
      "coniferous trees"
    ],
    "architecture": [
      "stadium roof framework"
    ],
    "water": [
      "pond"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_cones_001",
      "obs_emblem_001",
      "obs_fence_001",
      "obs_field_001",
      "obs_lake_001",
      "obs_light_poles_001",
      "obs_path_001",
      "obs_roof_001",
      "obs_sky_001",
      "obs_stadium_001",
      "obs_track_001",
      "obs_trees_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_emblem_001",
      "label": "stadium emblem with leaf symbol",
      "normalized_label": "stadium emblem",
      "object_type": "decorative emblem",
      "colors": [
        "green",
        "white"
      ],
      "material_appearance": [],
      "location": "stadium wall",
      "count_reference": "",
      "confidence": 0.97
    },
    {
      "observation_id": "obs_cones_001",
      "label": "traffic cones",
      "normalized_label": "traffic cones",
      "object_type": "safety cones",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [
        "plastic"
      ],
      "location": "foreground near fence",
      "count_reference": "count_cones_001",
      "confidence": 0.96
    },
    {
      "observation_id": "obs_fence_001",
      "label": "metal fence with chains",
      "normalized_label": "metal fence",
      "object_type": "fence",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "metal"
      ],
      "location": "foreground",
      "count_reference": "",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_light_poles_001",
      "label": "green poles supporting roof",
      "normalized_label": "support poles",
      "object_type": "roof support poles",
      "colors": [
        "green"
      ],
      "material_appearance": [],
      "location": "side and rear of stadium",
      "count_reference": "",
      "confidence": 0.96
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_roof_001",
      "target_observation_id": "obs_light_poles_001",
      "relationship": "supported by",
      "evidence_strength": "strong"
    },
    {
      "relationship_id": "rel_002",
      "source_observation_id": "obs_emblem_001",
      "target_observation_id": "obs_stadium_001",
      "relationship": "attached to",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "brown",
      "green",
      "light blue",
      "orange",
      "purple",
      "white"
    ],
    "lighting": [
      "natural daylight"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "roof glass reflections"
    ],
    "composition": [
      "background trees and sky",
      "foreground cones and fence",
      "midground stadium"
    ],
    "camera_angle": "slightly elevated, front-facing",
    "framing": "centered on stadium structure",
    "cropping": [
      "full card visible"
    ],
    "depth": "deep depth of field",
    "motion_cues": [],
    "motifs": [
      "stadium emblem leaf symbol",
      "traffic cones"
    ],
    "repeated_shapes": [
      "lane markers",
      "rectangular fence posts"
    ],
    "style_cues": [
      "detailed digital painting",
      "realistic lighting"
    ],
    "supporting_observation_ids": [
      "obs_cones_001",
      "obs_emblem_001",
      "obs_fence_001",
      "obs_field_001",
      "obs_lake_001",
      "obs_light_poles_001",
      "obs_path_001",
      "obs_roof_001",
      "obs_sky_001",
      "obs_stadium_001",
      "obs_track_001",
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
    "objects_and_props_review": "observed",
    "relationships_review": "observed",
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
        "fact_objects_001"
      ],
      "object_observation_ids": [
        "obs_cones_001",
        "obs_emblem_001",
        "obs_fence_001",
        "obs_light_poles_001"
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
        "obs_cones_001",
        "obs_emblem_001",
        "obs_fence_001",
        "obs_field_001",
        "obs_lake_001",
        "obs_light_poles_001",
        "obs_path_001",
        "obs_roof_001",
        "obs_sky_001",
        "obs_stadium_001",
        "obs_track_001",
        "obs_trees_001"
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
      "fact_ids": [
        "fact_counts_001"
      ],
      "count_ids": [
        "count_cones_001"
      ]
    },
    "relationships": {
      "fact_ids": [],
      "relationship_ids": [
        "rel_001",
        "rel_002"
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
      "fact_ids": [
        "fact_env_001",
        "fact_env_004",
        "fact_objects_001"
      ],
      "terms": [
        "coniferous trees",
        "stadium emblem",
        "stadium environment"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "card_ui_and_print_markers.name_text_observation_ids",
          "reason": "name text partially unreadable",
          "affected_observation_ids": [
            "obs_name_text_001"
          ]
        },
        {
          "field_path": "card_ui_and_print_markers.collector_number_observation_ids",
          "reason": "collector number partially unreadable",
          "affected_observation_ids": [
            "obs_collector_number_001"
          ]
        },
        {
          "field_path": "card_ui_and_print_markers.set_symbol_observation_ids",
          "reason": "set symbol partially unreadable",
          "affected_observation_ids": [
            "obs_set_symbol_001"
          ]
        },
        {
          "field_path": "card_ui_and_print_markers.rarity_mark_observation_ids",
          "reason": "rarity mark partially unreadable",
          "affected_observation_ids": [
            "obs_rarity_mark_001"
          ]
        },
        {
          "field_path": "card_ui_and_print_markers.copyright_line_observation_ids",
          "reason": "copyright line partially unreadable",
          "affected_observation_ids": [
            "obs_copyright_line_001"
          ]
        },
        {
          "field_path": "card_ui_and_print_markers.bottom_line_text_observation_ids",
          "reason": "bottom line text partially unreadable",
          "affected_observation_ids": [
            "obs_bottom_line_001"
          ]
        },
        {
          "field_path": "card_ui_and_print_markers.illustrator_text_observation_ids",
          "reason": "illustrator text partially unreadable",
          "affected_observation_ids": [
            "obs_illustrator_text_001"
          ]
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
      "review_status": "complete",
      "omission_risk": "low",
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "stadium environment",
      "supporting_observation_ids": [
        "obs_field_001",
        "obs_stadium_001",
        "obs_track_001"
      ]
    },
    {
      "term": "coniferous trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "stadium emblem",
      "supporting_observation_ids": [
        "obs_emblem_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-PMCG6-085 - Cinnabar City Gym

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.93`
- Cost USD: `0.0068112`
- Artwork observations: `8`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. No confident visible fact observations were extracted.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| indoor | environment_setting | background | salient | 0.99 |
| lava pool | environment_terrain | midground | salient | 0.98 |
| grate platform | environment_object | midground | salient | 0.98 |
| lava falls | environment_structure | background | salient | 0.95 |
| bright yellow-orange lava | color | midground | salient | 0.99 |
| dark red platform surface with black patterns | color | midground | salient | 0.98 |
| glowing lava light reflection | objective_lighting | midground | salient | 0.97 |
| vertical rock walls | environment_horizon | background | salient | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_environment_001 | 0.99 |
| fact_env_002 | environment | terrain | obs_environment_002 | 0.98 |
| fact_env_003 | environment | architecture | obs_environment_003 | 0.98 |
| fact_env_004 | environment | environment_object | obs_environment_004 | 0.95 |
| fact_env_005 | environment | color | obs_environment_005 | 0.99 |
| fact_env_006 | environment | color | obs_environment_006 | 0.98 |
| fact_env_007 | environment | lighting | obs_environment_007 | 0.97 |
| fact_env_008 | environment | architecture | obs_environment_008 | 0.98 |

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
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | bottom_line_text_observation_ids: text visible but too low resolution to read reliably |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| lava | obs_environment_002 |
| grate platform | obs_environment_003 |
| vertical rock walls | obs_environment_008 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. No confident visible fact observations were extracted.
- Quality flags: `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "environment_setting",
      "label": "indoor",
      "normalized_label": "indoor",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment_terrain",
      "label": "lava pool",
      "normalized_label": "lava pool",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment_object",
      "label": "grate platform",
      "normalized_label": "grate platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "environment_structure",
      "label": "lava falls",
      "normalized_label": "lava falls",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_005",
      "kind": "color",
      "label": "bright yellow-orange lava",
      "normalized_label": "bright yellow-orange lava",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_006",
      "kind": "color",
      "label": "dark red platform surface with black patterns",
      "normalized_label": "dark red with black patterns",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_007",
      "kind": "objective_lighting",
      "label": "glowing lava light reflection",
      "normalized_label": "glowing lava light reflection",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_008",
      "kind": "environment_horizon",
      "label": "vertical rock walls",
      "normalized_label": "vertical rock walls",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "setting",
      "value": "indoor",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "terrain[0]",
      "claim": "terrain",
      "value": "lava pool",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "architecture[0]",
      "claim": "architecture",
      "value": "grate platform",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "environment_objects[0]",
      "claim": "environment_object",
      "value": "lava falls",
      "supporting_observation_ids": [
        "obs_environment_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "colors[0]",
      "claim": "color",
      "value": "bright yellow-orange lava",
      "supporting_observation_ids": [
        "obs_environment_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "colors[1]",
      "claim": "color",
      "value": "dark red with black patterns on platform surface",
      "supporting_observation_ids": [
        "obs_environment_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "lighting[0]",
      "claim": "lighting",
      "value": "glowing lava light reflection",
      "supporting_observation_ids": [
        "obs_environment_007"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "environment",
      "field_path": "architecture[1]",
      "claim": "architecture",
      "value": "vertical rock walls",
      "supporting_observation_ids": [
        "obs_environment_008"
      ],
      "confidence": 0.98,
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
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_005",
      "obs_environment_006",
      "obs_environment_007"
    ],
    "background": [
      "obs_environment_001",
      "obs_environment_004",
      "obs_environment_008"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "lava pool"
    ],
    "terrain": [
      "lava pool"
    ],
    "plants": [],
    "architecture": [
      "grate platform",
      "vertical rock walls"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_005",
      "obs_environment_006",
      "obs_environment_007",
      "obs_environment_008"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "bright yellow-orange",
      "dark red"
    ],
    "lighting": [
      "glowing lava light reflection"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "central triangular platform in lava pool",
      "vertical rock walls background"
    ],
    "camera_angle": "slightly elevated",
    "framing": "tight framing around platform and lava pool",
    "cropping": [],
    "depth": "medium depth with distinct foreground and background",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [
      "painterly artwork"
    ],
    "supporting_observation_ids": [
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004",
      "obs_environment_006",
      "obs_environment_007",
      "obs_environment_008"
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
        "fact_env_005",
        "fact_env_006",
        "fact_env_007",
        "fact_env_008"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004",
        "obs_environment_005",
        "obs_environment_006",
        "obs_environment_007",
        "obs_environment_008"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_env_007"
      ],
      "observation_ids": [
        "obs_environment_007"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_env_005",
        "fact_env_006",
        "fact_env_007"
      ],
      "observation_ids": [
        "obs_environment_005",
        "obs_environment_006",
        "obs_environment_007"
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
        "grate platform",
        "lava",
        "vertical rock walls"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "bottom_line_text_observation_ids",
          "reason": "text visible but too low resolution to read reliably",
          "affected_observation_ids": [
            "obs_card_ui_bottom_line_001"
          ]
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "lava",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "grate platform",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "vertical rock walls",
      "supporting_observation_ids": [
        "obs_environment_008"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-SMG-039 - Dimension Valley

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0080808`
- Artwork observations: `10`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: floating grassy terrain platforms with moss, leafless small tree on floating terrain, another leafless small tree on floating terrain, group of 2 leafless small trees, eight floating terrain platforms, multicolored aurora like bands in sky, colorful light bands with yellow, pink, purple, blue, colorful floating orbs over terrain. Counts: floating terrain platforms: 8.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| floating grassy terrain platforms with moss | environment | midground | high | 1 |
| leafless small tree on floating terrain | objects_and_props | midground | medium | 1 |
| another leafless small tree on floating terrain | objects_and_props | midground | medium | 1 |
| group of 2 leafless small trees | environment | midground | medium | 1 |
| eight floating terrain platforms | counts | midground | high | 1 |
| multicolored aurora like bands in sky | environment | background | high | 1 |
| colorful light bands with yellow, pink, purple, blue | environment | background | high | 1 |
| colorful floating orbs over terrain | objects_and_props | midground | medium | 1 |
| multicolored orbs scattered on terrain surfaces | objects_and_props | midground | medium | 1 |
| green grassy terrain patches on floating rocks | environment | midground | high | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | environment | floating grassy terrain platforms | obs_floating_islands_count, obs_scene_001 | 1 |
| fact_002 | environment | count of leafless small trees | obs_tree_001, obs_tree_002, obs_tree_group_001 | 1 |
| fact_003 | environment | multicolored aurora-like bands in sky | obs_sky_001, obs_sky_color_bands_001 | 1 |
| fact_004 | environment | leafless small trees visible | obs_tree_001, obs_tree_002 | 1 |
| fact_005 | environment | green grassy terrain patches on floating platforms | obs_grassy_terrain_001 | 1 |

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
| objects_and_props | likely_complete | low | high |  |
| environment | likely_complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text: small text in upper left, partially unreadable; collector_number: small text in lower left, partially unreadable; set_symbol: set symbol area visible but some blurring; copyright_line: tiny print at bottom center, could not fully read; illustrator_text: small illustrator credit text partially unreadable |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| floating terrain platforms | exact | 8 | obs_floating_islands_count | 1 |

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
| floating grassy terrain | obs_floating_islands_count, obs_scene_001 |
| leafless trees | obs_tree_001, obs_tree_002 |
| aurora bands | obs_sky_001, obs_sky_color_bands_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: floating grassy terrain platforms with moss, leafless small tree on floating terrain, another leafless small tree on floating terrain, group of 2 leafless small trees, eight floating terrain platforms, multicolored aurora like bands in sky, colorful light bands with yellow, pink, purple, blue, colorful floating orbs over terrain. Counts: floating terrain platforms: 8.
- Quality flags: `partial_due_to_low_resolution`, `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`, `potential_speculative_setting_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_scene_001",
      "kind": "environment",
      "label": "floating grassy terrain platforms with moss",
      "normalized_label": "floating grassy terrain",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_001",
      "kind": "objects_and_props",
      "label": "leafless small tree on floating terrain",
      "normalized_label": "tree",
      "scene_layer": "midground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_002",
      "kind": "objects_and_props",
      "label": "another leafless small tree on floating terrain",
      "normalized_label": "tree",
      "scene_layer": "midground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_group_001",
      "kind": "environment",
      "label": "group of 2 leafless small trees",
      "normalized_label": "2 trees",
      "scene_layer": "midground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_floating_islands_count",
      "kind": "counts",
      "label": "eight floating terrain platforms",
      "normalized_label": "floating terrain platforms",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_001",
      "kind": "environment",
      "label": "multicolored aurora like bands in sky",
      "normalized_label": "aurora bands",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_color_bands_001",
      "kind": "environment",
      "label": "colorful light bands with yellow, pink, purple, blue",
      "normalized_label": "colored light bands",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_floating_orb_001",
      "kind": "objects_and_props",
      "label": "colorful floating orbs over terrain",
      "normalized_label": "floating orbs",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_floating_orb_002",
      "kind": "objects_and_props",
      "label": "multicolored orbs scattered on terrain surfaces",
      "normalized_label": "floating orbs",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_grassy_terrain_001",
      "kind": "environment",
      "label": "green grassy terrain patches on floating rocks",
      "normalized_label": "grassy terrain",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "environment",
      "field_path": "terrain.floating_islands",
      "claim": "floating grassy terrain platforms",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_floating_islands_count",
        "obs_scene_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "environment",
      "field_path": "plants.trees.count",
      "claim": "count of leafless small trees",
      "value": "2",
      "supporting_observation_ids": [
        "obs_tree_001",
        "obs_tree_002",
        "obs_tree_group_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "environment",
      "field_path": "sky.colored_light_bands",
      "claim": "multicolored aurora-like bands in sky",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_sky_001",
        "obs_sky_color_bands_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "environment",
      "field_path": "plants.trees.label",
      "claim": "leafless small trees visible",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_tree_001",
        "obs_tree_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "environment",
      "field_path": "terrain.grassy_patches",
      "claim": "green grassy terrain patches on floating platforms",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_grassy_terrain_001"
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
      "count_id": "count_floating_islands_001",
      "normalized_label": "floating terrain platforms",
      "count_type": "exact",
      "exact_count": 8,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_floating_islands_count"
      ],
      "scene_layer": "midground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_floating_islands_count",
      "obs_floating_orb_001",
      "obs_floating_orb_002",
      "obs_grassy_terrain_001",
      "obs_scene_001",
      "obs_tree_001",
      "obs_tree_002"
    ],
    "background": [
      "obs_sky_001",
      "obs_sky_color_bands_001"
    ]
  },
  "environment": {
    "setting": [
      "floating grassy islands"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "aurora-like colored light bands"
    ],
    "ground": [
      "floating grassy terrain"
    ],
    "terrain": [
      "floating rocky terrain"
    ],
    "plants": [
      "leafless trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_floating_islands_count",
      "obs_grassy_terrain_001",
      "obs_scene_001",
      "obs_sky_001",
      "obs_sky_color_bands_001",
      "obs_tree_001",
      "obs_tree_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_floating_orb_001",
      "label": "colorful floating orbs",
      "normalized_label": "floating orbs",
      "object_type": "abstract",
      "colors": [
        "blue",
        "pink",
        "purple",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "floating above and on terrain",
      "count_reference": "count_floating_orbs_001",
      "confidence": 1
    },
    {
      "observation_id": "obs_floating_orb_002",
      "label": "multicolored orbs scattered on terrain",
      "normalized_label": "floating orbs",
      "object_type": "abstract",
      "colors": [
        "blue",
        "pink",
        "purple",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "floating and scattered",
      "count_reference": "count_floating_orbs_001",
      "confidence": 1
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
      "red",
      "yellow"
    ],
    "lighting": [
      "diffuse ambient lighting"
    ],
    "shadows": [
      "soft shadows under platforms"
    ],
    "highlights": [
      "glowing orbs"
    ],
    "composition": [
      "aurora bands in background",
      "floating elements",
      "layered depth"
    ],
    "camera_angle": "slightly angled top-down view",
    "framing": "centered on floating islands",
    "cropping": [],
    "depth": "pronounced depth",
    "motion_cues": [],
    "motifs": [
      "aurora light bands",
      "colorful glowing orbs",
      "floating platforms"
    ],
    "repeated_shapes": [
      "floating terrain platforms",
      "orbs"
    ],
    "style_cues": [
      "bright and surreal",
      "digital fantasy art"
    ],
    "supporting_observation_ids": [
      "obs_floating_orb_001",
      "obs_floating_orb_002",
      "obs_scene_001",
      "obs_sky_001",
      "obs_sky_color_bands_001"
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
        "fact_005"
      ],
      "object_observation_ids": [
        "obs_floating_orb_001",
        "obs_floating_orb_002"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_001",
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005"
      ],
      "observation_ids": [
        "obs_floating_islands_count",
        "obs_grassy_terrain_001",
        "obs_scene_001",
        "obs_sky_001",
        "obs_sky_color_bands_001",
        "obs_tree_001",
        "obs_tree_002",
        "obs_tree_group_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_scene_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_scene_001",
        "obs_sky_001"
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
      "fact_ids": [
        "fact_005"
      ],
      "count_ids": [
        "count_floating_islands_001"
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
        "fact_001",
        "fact_002",
        "fact_003"
      ],
      "terms": [
        "aurora bands",
        "floating grassy terrain",
        "leafless trees"
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
      "review_status": "likely_complete",
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
          "reason": "small text in upper left, partially unreadable",
          "affected_observation_ids": [
            "obs_card_name_japanese_001"
          ]
        },
        {
          "field_path": "collector_number",
          "reason": "small text in lower left, partially unreadable",
          "affected_observation_ids": [
            "obs_card_collector_number_001"
          ]
        },
        {
          "field_path": "set_symbol",
          "reason": "set symbol area visible but some blurring",
          "affected_observation_ids": [
            "obs_card_set_symbol_001"
          ]
        },
        {
          "field_path": "copyright_line",
          "reason": "tiny print at bottom center, could not fully read",
          "affected_observation_ids": [
            "obs_card_copyright_001"
          ]
        },
        {
          "field_path": "illustrator_text",
          "reason": "small illustrator credit text partially unreadable",
          "affected_observation_ids": [
            "obs_illustrator_text_001"
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
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating grassy terrain",
      "supporting_observation_ids": [
        "obs_floating_islands_count",
        "obs_scene_001"
      ]
    },
    {
      "term": "leafless trees",
      "supporting_observation_ids": [
        "obs_tree_001",
        "obs_tree_002"
      ]
    },
    {
      "term": "aurora bands",
      "supporting_observation_ids": [
        "obs_sky_001",
        "obs_sky_color_bands_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11541-013 - Psychic Energy

- Branch: `energy`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0069784`
- Artwork observations: `4`
- Card UI / print-marker observations: `3`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Visible observations: central circular emblem with black eye-like symbol, purple circular color field behind symbol, white radiating lines and dots from center, card color palette mainly purple, black and white. Counts: eye-like symbol: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| central circular emblem with black eye-like symbol | abstract_symbol | midground | high | 0.99 |
| purple circular color field behind symbol | color_field | midground | high | 0.98 |
| white radiating lines and dots from center | visual_effects | midground | medium | 0.95 |
| card color palette mainly purple, black and white | color_palette | midground | high | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| top left card name text ENERGY | card_ui_text | top-left | visible | 0.99 |
| top right eye energy symbol | card_ui_symbol | top-right | visible | 0.99 |
| bottom copyright and numbering text | card_ui_text | bottom | visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_symbol_001 | objects_and_props | symbol shape | obs_symbol_001 | 0.99 |
| fact_color_001 | color_and_light | color palette | obs_color_field_001, obs_palette_001, obs_radiating_lines_001 | 0.99 |
| fact_radiating_lines_001 | visual_effects | radiating lines | obs_radiating_lines_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_text_001 | card name text | obs_card_name_001 | 0.99 |
| fact_energy_symbol_001 | energy symbol | obs_card_ui_symbol_001 | 0.99 |
| fact_bottom_text_001 | bottom line text | obs_bottom_text_001 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_bottom_text_001",
    "fact_card_name_text_001",
    "fact_energy_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_bottom_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_bottom_text_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_symbol_001"
  ],
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
| objects_and_props | complete | none | high |  |
| environment | not_applicable | none | not_applicable |  |
| composition | not_applicable | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | medium |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| eye-like symbol | exact | 1 | obs_symbol_001 | 0.99 |

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
| eye-like symbol | obs_symbol_001 |
| purple black white palette | obs_palette_001 |
| white radiating lines | obs_radiating_lines_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: central circular emblem with black eye-like symbol, purple circular color field behind symbol, white radiating lines and dots from center, card color palette mainly purple, black and white. Counts: eye-like symbol: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_symbol_001",
      "kind": "abstract_symbol",
      "label": "central circular emblem with black eye-like symbol",
      "normalized_label": "eye-like symbol",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_field_001",
      "kind": "color_field",
      "label": "purple circular color field behind symbol",
      "normalized_label": "purple color field",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_radiating_lines_001",
      "kind": "visual_effects",
      "label": "white radiating lines and dots from center",
      "normalized_label": "white radiating lines",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_palette",
      "label": "card color palette mainly purple, black and white",
      "normalized_label": "purple black white palette",
      "scene_layer": "midground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_001",
      "kind": "card_ui_text",
      "label": "top left card name text ENERGY",
      "normalized_label": "card name ENERGY",
      "scene_layer": "foreground",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "card_ui_symbol",
      "label": "top right eye energy symbol",
      "normalized_label": "energy symbol eye",
      "scene_layer": "foreground",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bottom_text_001",
      "kind": "card_ui_text",
      "label": "bottom copyright and numbering text",
      "normalized_label": "bottom copyright and numbering",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_symbol_001",
      "module": "objects_and_props",
      "field_path": "0.label",
      "claim": "symbol shape",
      "value": "black eye-like symbol centered in circular emblem",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_001",
      "module": "color_and_light",
      "field_path": "0.label",
      "claim": "color palette",
      "value": "purple, black, white",
      "supporting_observation_ids": [
        "obs_color_field_001",
        "obs_palette_001",
        "obs_radiating_lines_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_radiating_lines_001",
      "module": "visual_effects",
      "field_path": "0.label",
      "claim": "radiating lines",
      "value": "white radiating lines and dots radiating from center",
      "supporting_observation_ids": [
        "obs_radiating_lines_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "ENERGY",
      "supporting_observation_ids": [
        "obs_card_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_energy_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids",
      "claim": "energy symbol",
      "value": "eye-like symbol at top right",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "bottom line text",
      "value": "copyright and card numbering line",
      "supporting_observation_ids": [
        "obs_bottom_text_001"
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
      "count_id": "count_symbol_001",
      "normalized_label": "eye-like symbol",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_bottom_text_001",
      "obs_card_name_001",
      "obs_card_ui_symbol_001"
    ],
    "midground": [
      "obs_color_field_001",
      "obs_radiating_lines_001",
      "obs_symbol_001"
    ],
    "background": []
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "not_applicable",
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
      "observation_id": "obs_symbol_001",
      "label": "eye-like symbol",
      "normalized_label": "eye-like symbol",
      "object_type": "abstract_symbol",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "flat color"
      ],
      "location": "center",
      "count_reference": "count_symbol_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "purple",
      "white"
    ],
    "lighting": [
      "flat"
    ],
    "shadows": [],
    "highlights": [
      "white bright spots"
    ],
    "composition": [
      "central emblem",
      "circular motif",
      "radiating pattern",
      "symmetrical"
    ],
    "camera_angle": "straight-on",
    "framing": "centered",
    "cropping": [],
    "depth": "flat",
    "motion_cues": [],
    "motifs": [
      "circular",
      "eye-like",
      "radiating spots"
    ],
    "repeated_shapes": [
      "small white dots"
    ],
    "style_cues": [
      "abstract",
      "symbolic"
    ],
    "supporting_observation_ids": [
      "obs_color_field_001",
      "obs_palette_001",
      "obs_radiating_lines_001",
      "obs_symbol_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "observed",
    "environment_review": "not_applicable",
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
        "fact_symbol_001"
      ],
      "object_observation_ids": [
        "obs_symbol_001"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": []
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_001"
      ],
      "observation_ids": [
        "obs_color_field_001",
        "obs_palette_001",
        "obs_radiating_lines_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_radiating_lines_001"
      ],
      "observation_ids": [
        "obs_radiating_lines_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_bottom_text_001",
        "fact_card_name_text_001",
        "fact_energy_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_bottom_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_bottom_text_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_symbol_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_symbol_001"
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
        "fact_color_001",
        "fact_radiating_lines_001",
        "fact_symbol_001"
      ],
      "terms": [
        "eye-like symbol",
        "purple black white palette",
        "white radiating lines"
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "not_applicable",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "eye-like symbol",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "purple black white palette",
      "supporting_observation_ids": [
        "obs_palette_001"
      ]
    },
    {
      "term": "white radiating lines",
      "supporting_observation_ids": [
        "obs_radiating_lines_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-L1BSS-070 - Rainbow Energy

- Branch: `energy`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0080828`
- Artwork observations: `7`
- Card UI / print-marker observations: `3`
- Card UI module evidence references: `2`
- Derived digest: Fact digest. Visible observations: large central black circular symbol with crescent cutout, dark teal to black vertical gradient background, three symmetrical white light rays radiating from central symbol downward, white crescent moon shape in upper left background, dark silhouette of four-legged fox-like animal with large ears left side, three blue-gray blocky buildings with windows right background. Counts: central_black_circular_symbol_with_crescent_cutout: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| large central black circular symbol with crescent cutout | abstract_symbol | midground | high | 0.99 |
| dark teal to black vertical gradient background | color_gradient | background | high | 0.95 |
| three symmetrical white light rays radiating from central symbol downward | light_rays | midground | high | 0.98 |
| white crescent moon shape in upper left background | moon_shape | background | medium | 0.9 |
| dark silhouette of four-legged fox-like animal with large ears left side | animal_silhouette | midground | medium | 0.92 |
| three blue-gray blocky buildings with windows right background | buildings | background | medium | 0.9 |
| dark ground or shrubbery silhouette base foreground | ground_layer | foreground | low | 0.85 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| top left ENERGY text with gradient fill | card_ui_text | top_left | visible | 0.99 |
| top right Japanese text block with black moon symbol | card_ui_text | top_right | visible | 0.99 |
| bottom copyright line text | card_ui_text | bottom | visible | 0.85 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | central_symbol_shape | obs_001 | 0.99 |
| fact_002 | environment | background_gradient_colors | obs_002 | 0.95 |
| fact_003 | visual_effects | light_rays_count_and_position | obs_003 | 0.98 |
| fact_004 | objects_and_props | moon_shape_position | obs_004 | 0.9 |
| fact_005 | objects_and_props | fox_silhouette_position | obs_005 | 0.92 |
| fact_006 | objects_and_props | buildings_count_and_position | obs_006 | 0.9 |
| fact_007 | environment | ground_layer_presence | obs_007 | 0.85 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_008 | card_name_text_presence | obs_008 | 0.99 |
| fact_009 | printed_japanese_text_with_moon | obs_009 | 0.99 |
| fact_010 | copyright_text_present | obs_010 | 0.85 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_008",
    "fact_009",
    "fact_010"
  ],
  "name_text_observation_ids": [
    "obs_008"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_010"
  ],
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
| composition | not_applicable | none | not_applicable |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| central_black_circular_symbol_with_crescent_cutout | exact | 1 | obs_001 | 0.99 |

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
| central black crescent cutout symbol | obs_001 |
| dark teal to black gradient background | obs_002 |
| three white light rays radiating downward | obs_003 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: large central black circular symbol with crescent cutout, dark teal to black vertical gradient background, three symmetrical white light rays radiating from central symbol downward, white crescent moon shape in upper left background, dark silhouette of four-legged fox-like animal with large ears left side, three blue-gray blocky buildings with windows right background. Counts: central_black_circular_symbol_with_crescent_cutout: 1.
- Quality flags: `potential_abstract_shape_literalization`
- Policy results: 1

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_001",
      "kind": "abstract_symbol",
      "label": "large central black circular symbol with crescent cutout",
      "normalized_label": "central_black_circular_symbol_with_crescent_cutout",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_002",
      "kind": "color_gradient",
      "label": "dark teal to black vertical gradient background",
      "normalized_label": "dark_teal_black_gradient",
      "scene_layer": "background",
      "frame_position": "full_card_background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_003",
      "kind": "light_rays",
      "label": "three symmetrical white light rays radiating from central symbol downward",
      "normalized_label": "three_white_light_rays_from_center",
      "scene_layer": "midground",
      "frame_position": "center_lower",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_004",
      "kind": "moon_shape",
      "label": "white crescent moon shape in upper left background",
      "normalized_label": "white_crescent_moon_upper_left",
      "scene_layer": "background",
      "frame_position": "upper_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_005",
      "kind": "animal_silhouette",
      "label": "dark silhouette of four-legged fox-like animal with large ears left side",
      "normalized_label": "dark_fox_silhouette_left",
      "scene_layer": "midground",
      "frame_position": "left_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_006",
      "kind": "buildings",
      "label": "three blue-gray blocky buildings with windows right background",
      "normalized_label": "three_buildings_right_background",
      "scene_layer": "background",
      "frame_position": "upper_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_007",
      "kind": "ground_layer",
      "label": "dark ground or shrubbery silhouette base foreground",
      "normalized_label": "dark_ground_silhouette",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_008",
      "kind": "card_ui_text",
      "label": "top left ENERGY text with gradient fill",
      "normalized_label": "top_left_energy_text",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_009",
      "kind": "card_ui_text",
      "label": "top right Japanese text block with black moon symbol",
      "normalized_label": "top_right_japanese_text_moon_symbol",
      "scene_layer": "interface",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_010",
      "kind": "card_ui_text",
      "label": "bottom copyright line text",
      "normalized_label": "bottom_copyright_text",
      "scene_layer": "interface",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "symbol.central_symbol",
      "claim": "central_symbol_shape",
      "value": "large black circle with crescent cutout",
      "supporting_observation_ids": [
        "obs_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "environment",
      "field_path": "background.color_gradient",
      "claim": "background_gradient_colors",
      "value": "dark teal to black vertical gradient",
      "supporting_observation_ids": [
        "obs_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "visual_effects",
      "field_path": "light_rays",
      "claim": "light_rays_count_and_position",
      "value": "three symmetrical white light rays radiating downward from central symbol",
      "supporting_observation_ids": [
        "obs_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "objects_and_props",
      "field_path": "moon_shape.position",
      "claim": "moon_shape_position",
      "value": "upper left background",
      "supporting_observation_ids": [
        "obs_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_005",
      "module": "objects_and_props",
      "field_path": "fox_silhouette.position",
      "claim": "fox_silhouette_position",
      "value": "left center foreground",
      "supporting_observation_ids": [
        "obs_005"
      ],
      "confidence": 0.92,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_006",
      "module": "objects_and_props",
      "field_path": "buildings.position",
      "claim": "buildings_count_and_position",
      "value": "three blue-gray buildings upper right background",
      "supporting_observation_ids": [
        "obs_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_007",
      "module": "environment",
      "field_path": "ground_layer",
      "claim": "ground_layer_presence",
      "value": "dark ground or shrubbery silhouette at bottom foreground",
      "supporting_observation_ids": [
        "obs_007"
      ],
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text.top_left",
      "claim": "card_name_text_presence",
      "value": "ENERGY text with gradient fill top left",
      "supporting_observation_ids": [
        "obs_008"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "printed_text.top_right",
      "claim": "printed_japanese_text_with_moon",
      "value": "Japanese characters with black moon symbol top right",
      "supporting_observation_ids": [
        "obs_009"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line.bottom",
      "claim": "copyright_text_present",
      "value": "©2009 Pokémon/Nintendo/Creatures/GAME FREAK. bottom line",
      "supporting_observation_ids": [
        "obs_010"
      ],
      "confidence": 0.85,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "central_black_circular_symbol_with_crescent_cutout",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_007"
    ],
    "midground": [
      "obs_001",
      "obs_003",
      "obs_005"
    ],
    "background": [
      "obs_002",
      "obs_004",
      "obs_006"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "uncertain",
    "sky": [
      "dark teal gradient background with moon"
    ],
    "ground": [
      "dark shrubbery or ground silhouette foreground"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "three blue-gray buildings upper right background"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "presence of crescent moon shape"
    ],
    "supporting_observation_ids": [
      "obs_002",
      "obs_004",
      "obs_006",
      "obs_007"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_001",
      "label": "central black circular symbol with crescent cutout",
      "normalized_label": "central_black_circular_symbol_with_crescent_cutout",
      "object_type": "symbol",
      "colors": [
        "black",
        "blue-gray",
        "dark teal"
      ],
      "material_appearance": [
        "glowing edges"
      ],
      "location": "center midground",
      "count_reference": "count_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue-gray",
      "dark teal",
      "white"
    ],
    "lighting": [
      "glowing symbol edge",
      "white light rays"
    ],
    "shadows": [
      "dark silhouettes of animal and buildings"
    ],
    "highlights": [
      "glowing circle edges and light rays"
    ],
    "composition": [
      "balanced dark silhouettes on left and right",
      "central placement of symbol",
      "symmetrical light rays around central symbol"
    ],
    "camera_angle": "straight-on",
    "framing": "central symbol framed by light rays",
    "cropping": [],
    "depth": "medium depth with foreground silhouettes and background buildings",
    "motion_cues": [
      "radiating light rays from center"
    ],
    "motifs": [
      "circular symbol",
      "crescent moon",
      "light rays"
    ],
    "repeated_shapes": [
      "three light rays"
    ],
    "style_cues": [
      "abstract",
      "glowing",
      "silhouette"
    ],
    "supporting_observation_ids": [
      "obs_001",
      "obs_002",
      "obs_003",
      "obs_004",
      "obs_005",
      "obs_006",
      "obs_007"
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
        "fact_004",
        "fact_005",
        "fact_006"
      ],
      "object_observation_ids": [
        "obs_001",
        "obs_004",
        "obs_005",
        "obs_006"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_002",
        "fact_007"
      ],
      "observation_ids": [
        "obs_002",
        "obs_007"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_002",
        "fact_003"
      ],
      "observation_ids": [
        "obs_002",
        "obs_003"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_003"
      ],
      "observation_ids": [
        "obs_003"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_008",
        "fact_009",
        "fact_010"
      ],
      "name_text_observation_ids": [
        "obs_008"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_010"
      ],
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
      "fact_ids": [
        "fact_001",
        "fact_002",
        "fact_003"
      ],
      "terms": [
        "central black crescent cutout symbol",
        "dark teal to black gradient background",
        "three white light rays radiating downward"
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
      "review_status": "not_applicable",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "central black crescent cutout symbol",
      "supporting_observation_ids": [
        "obs_001"
      ]
    },
    {
      "term": "dark teal to black gradient background",
      "supporting_observation_ids": [
        "obs_002"
      ]
    },
    {
      "term": "three white light rays radiating downward",
      "supporting_observation_ids": [
        "obs_003"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11194-057 - Water Energy

- Branch: `energy`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0080096`
- Artwork observations: `6`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: central circular emblem with black water drop-like symbol, blue color gradient background, dark blue and light blue shades, white radiating light spots pattern, symmetrical abstract composition with central emblem, one central circular emblem. Counts: central emblem: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| central circular emblem with black water drop-like symbol | object | foreground | high | 0.99 |
| blue color gradient background | color_and_light | background | high | 0.98 |
| dark blue and light blue shades | color_and_light | background | high | 0.98 |
| white radiating light spots pattern | visual_effects | background | medium | 0.97 |
| symmetrical abstract composition with central emblem | composition | foreground | high | 0.99 |
| one central circular emblem | counts | foreground | high | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| text 'ENERGY' at top-left | card_ui_text | top-left | visible | 0.99 |
| water drop energy symbol at top-right | card_ui_symbol | top-right | visible | 0.99 |
| black text line at bottom edge | card_ui_text | bottom-center | visible | 0.85 |
| black text including year 2003 near bottom-center | card_ui_text | bottom-center | visible | 0.85 |
| set symbol mark bottom-right corner | set_symbol | bottom-right | visible | 0.9 |
| collector number '057/PCG-P' at bottom-right | collector_number | bottom-right | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_count_001 | counts | exact count of central circular emblem | obs_count_001 | 1 |
| fact_symbol_001 | objects_and_props | central emblem shape | obs_symbol_001 | 0.99 |
| fact_palette_001 | color_and_light | color palette | obs_palette_001, obs_palette_002 | 0.98 |
| fact_visual_effects_001 | visual_effects | radiating light spots pattern | obs_visual_effect_001 | 0.97 |
| fact_composition_001 | composition | symmetrical abstract composition | obs_composition_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_name_text_001 | card name text | obs_ui_text_001 | 0.99 |
| fact_ui_energy_symbol_001 | energy symbol at top-right | obs_ui_icon_001 | 0.99 |
| fact_ui_copyright_001 | copyright line text present | obs_ui_text_002, obs_ui_text_003 | 0.85 |
| fact_ui_set_symbol_001 | set symbol bottom-right | obs_ui_symbol_001 | 0.9 |
| fact_ui_collector_number_001 | collector number text | obs_ui_text_004 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_collector_number_001",
    "fact_ui_copyright_001",
    "fact_ui_energy_symbol_001",
    "fact_ui_name_text_001",
    "fact_ui_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_ui_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_ui_text_004"
  ],
  "set_symbol_observation_ids": [
    "obs_ui_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_ui_text_002",
    "obs_ui_text_003"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_ui_icon_001"
  ],
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
| objects_and_props | complete | none | high |  |
| environment | not_applicable | none | not_applicable |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| central emblem | exact | 1 | obs_count_001 | 1 |

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
| central circular emblem | obs_symbol_001 |
| water drop symbol | obs_symbol_001 |
| blue gradient background | obs_palette_001, obs_palette_002 |
| white radiant spots | obs_visual_effect_001 |
| symmetrical composition | obs_composition_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: central circular emblem with black water drop-like symbol, blue color gradient background, dark blue and light blue shades, white radiating light spots pattern, symmetrical abstract composition with central emblem, one central circular emblem. Counts: central emblem: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_symbol_001",
      "kind": "object",
      "label": "central circular emblem with black water drop-like symbol",
      "normalized_label": "circular emblem",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_and_light",
      "label": "blue color gradient background",
      "normalized_label": "blue gradient",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_002",
      "kind": "color_and_light",
      "label": "dark blue and light blue shades",
      "normalized_label": "blue shades",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_effect_001",
      "kind": "visual_effects",
      "label": "white radiating light spots pattern",
      "normalized_label": "radiating light spots",
      "scene_layer": "background",
      "frame_position": "centered",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "symmetrical abstract composition with central emblem",
      "normalized_label": "symmetrical composition",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_count_001",
      "kind": "counts",
      "label": "one central circular emblem",
      "normalized_label": "one emblem",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_001",
      "kind": "card_ui_text",
      "label": "text 'ENERGY' at top-left",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_icon_001",
      "kind": "card_ui_symbol",
      "label": "water drop energy symbol at top-right",
      "normalized_label": "energy symbol",
      "scene_layer": "ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_002",
      "kind": "card_ui_text",
      "label": "black text line at bottom edge",
      "normalized_label": "copyright line text",
      "scene_layer": "ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_ui_text_003",
      "kind": "card_ui_text",
      "label": "black text including year 2003 near bottom-center",
      "normalized_label": "small print text",
      "scene_layer": "ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_ui_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol mark bottom-right corner",
      "normalized_label": "set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_004",
      "kind": "collector_number",
      "label": "collector number '057/PCG-P' at bottom-right",
      "normalized_label": "collector number",
      "scene_layer": "ui",
      "frame_position": "bottom-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_count_001",
      "module": "counts",
      "field_path": "counts[0].exact_count",
      "claim": "exact count of central circular emblem",
      "value": "1",
      "supporting_observation_ids": [
        "obs_count_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_symbol_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].label",
      "claim": "central emblem shape",
      "value": "black water drop-like symbol",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_palette_001",
      "module": "color_and_light",
      "field_path": "palette[0]",
      "claim": "color palette",
      "value": "blue gradient with dark and light blue shades",
      "supporting_observation_ids": [
        "obs_palette_001",
        "obs_palette_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effects_001",
      "module": "visual_effects",
      "field_path": "visual_effects[0].label",
      "claim": "radiating light spots pattern",
      "value": "white radiating light spots",
      "supporting_observation_ids": [
        "obs_visual_effect_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "composition[0].label",
      "claim": "symmetrical abstract composition",
      "value": "symmetrical abstract composition with central emblem",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0]",
      "claim": "card name text",
      "value": "ENERGY",
      "supporting_observation_ids": [
        "obs_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_energy_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol[0]",
      "claim": "energy symbol at top-right",
      "value": "water drop symbol",
      "supporting_observation_ids": [
        "obs_ui_icon_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_text[0]",
      "claim": "copyright line text present",
      "value": "copyright text with year 2003 at bottom",
      "supporting_observation_ids": [
        "obs_ui_text_002",
        "obs_ui_text_003"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol[0]",
      "claim": "set symbol bottom-right",
      "value": "set symbol mark",
      "supporting_observation_ids": [
        "obs_ui_symbol_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "collector number text",
      "value": "057/PCG-P",
      "supporting_observation_ids": [
        "obs_ui_text_004"
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
      "normalized_label": "central emblem",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_count_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_symbol_001"
    ],
    "midground": [
      "obs_visual_effect_001"
    ],
    "background": [
      "obs_palette_001",
      "obs_palette_002"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "not_applicable",
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
      "observation_id": "obs_symbol_001",
      "label": "central circular emblem with black water drop-like symbol",
      "normalized_label": "circular emblem",
      "object_type": "abstract_symbol",
      "colors": [
        "black",
        "light blue"
      ],
      "material_appearance": [
        "glossy"
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
      "dark blue",
      "light blue",
      "white"
    ],
    "lighting": [
      "radiating white spots"
    ],
    "shadows": [],
    "highlights": [
      "glossy highlight on emblem"
    ],
    "composition": [
      "central focus",
      "symmetrical"
    ],
    "camera_angle": "frontal",
    "framing": "centered",
    "cropping": [],
    "depth": "flat",
    "motion_cues": [],
    "motifs": [
      "circular emblem",
      "radiating light spots"
    ],
    "repeated_shapes": [
      "circles"
    ],
    "style_cues": [
      "abstract",
      "clean",
      "symbolic"
    ],
    "supporting_observation_ids": [
      "obs_composition_001",
      "obs_palette_001",
      "obs_symbol_001",
      "obs_visual_effect_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "observed",
    "environment_review": "not_applicable",
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
        "fact_symbol_001"
      ],
      "object_observation_ids": [
        "obs_symbol_001"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": []
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
        "fact_palette_001"
      ],
      "observation_ids": [
        "obs_palette_001",
        "obs_palette_002"
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
      "fact_ids": [
        "fact_ui_collector_number_001",
        "fact_ui_copyright_001",
        "fact_ui_energy_symbol_001",
        "fact_ui_name_text_001",
        "fact_ui_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_ui_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_ui_text_004"
      ],
      "set_symbol_observation_ids": [
        "obs_ui_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_ui_text_002",
        "obs_ui_text_003"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_ui_icon_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [
        "fact_count_001"
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
        "blue gradient background",
        "central circular emblem",
        "symmetrical composition",
        "water drop symbol",
        "white radiant spots"
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "central circular emblem",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "water drop symbol",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "blue gradient background",
      "supporting_observation_ids": [
        "obs_palette_001",
        "obs_palette_002"
      ]
    },
    {
      "term": "white radiant spots",
      "supporting_observation_ids": [
        "obs_visual_effect_001"
      ]
    },
    {
      "term": "symmetrical composition",
      "supporting_observation_ids": [
        "obs_composition_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-106 - Tremendous Bomb

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0074976`
- Artwork observations: `7`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Visible observations: bomb, black rounded bomb body with yellow and black diagonal stripes at bottom, black bomb top with fuse attachment, short red fuse with spark at end, bright yellow spark at fuse end, multiple black segmented panels on bomb body, orange, blue, and purple radial burst background. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| bomb | object | foreground | high | 0.99 |
| black rounded bomb body with yellow and black diagonal stripes at bottom | object | foreground | high | 0.99 |
| black bomb top with fuse attachment | object | foreground | high | 0.95 |
| short red fuse with spark at end | object | foreground | high | 0.98 |
| bright yellow spark at fuse end | visual_effect | foreground | high | 0.97 |
| multiple black segmented panels on bomb body | object | foreground | medium | 0.9 |
| orange, blue, and purple radial burst background | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text: ごうかいボム | card_ui_text | top center | visible | 0.99 |
| card type text: トレーナーズ (Trainers) | card_ui_text | top right | visible | 0.99 |
| category text: ポケモンのどうぐ (Pokemon Tools) | card_ui_text | top left | visible | 0.99 |
| set code and rarity text: J M5 106/081 SR | card_ui_text | bottom left | visible | 0.99 |
| illustrator text: Illus. inose yukie | card_ui_text | bottom left | visible | 0.99 |
| card ability and rules text in Japanese | card_ui_text | bottom center | visible | 0.95 |
| copyright text: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | card_ui_text | bottom right | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_bomb_001 | objects_and_props | object_type | obs_object_bomb_001 | 0.99 |
| fact_bomb_body_001 | objects_and_props | appearance | obs_bomb_body_001 | 0.99 |
| fact_bomb_top_001 | objects_and_props | body_part | obs_bomb_top_001 | 0.95 |
| fact_bomb_fuse_001 | objects_and_props | body_part | obs_bomb_fuse_001, obs_bomb_spark_001 | 0.98 |
| fact_bomb_panels_001 | objects_and_props | surface_pattern | obs_bomb_panels_001 | 0.9 |
| fact_background_colors_001 | environment | background_color_region | obs_background_colors_001 | 0.95 |
| fact_count_bomb_001 | counts | exact_count | obs_object_bomb_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_name_001 | card_name_text | obs_card_ui_name_001 | 0.99 |
| fact_ui_type_001 | card_type_text | obs_card_ui_trainer_001 | 0.99 |
| fact_ui_category_001 | category_text | obs_card_ui_subtitle_001 | 0.99 |
| fact_ui_set_info_001 | set_code_and_number | obs_card_ui_series_001 | 0.99 |
| fact_ui_illustrator_001 | illustrator_text | obs_card_ui_illustrator_001 | 0.99 |
| fact_ui_textbox_001 | rules_text | obs_card_ui_textbox_001 | 0.95 |
| fact_ui_copyright_001 | copyright_text | obs_card_ui_footer_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_category_001",
    "fact_ui_copyright_001",
    "fact_ui_illustrator_001",
    "fact_ui_name_001",
    "fact_ui_set_info_001",
    "fact_ui_textbox_001",
    "fact_ui_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_series_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_series_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_footer_001"
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
  "other_print_marker_observation_ids": [
    "obs_card_ui_subtitle_001",
    "obs_card_ui_trainer_001"
  ]
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
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| black rounded bomb body with yellow and black diagonal stripes | obs_bomb_body_001 |
| red fuse with bright spark | obs_bomb_fuse_001, obs_bomb_spark_001 |
| orange blue purple radial burst background | obs_background_colors_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, black rounded bomb body with yellow and black diagonal stripes at bottom, black bomb top with fuse attachment, short red fuse with spark at end, bright yellow spark at fuse end, multiple black segmented panels on bomb body, orange, blue, and purple radial burst background. Counts: bomb: 1.
- Quality flags: `none`
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
      "observation_id": "obs_bomb_body_001",
      "kind": "object",
      "label": "black rounded bomb body with yellow and black diagonal stripes at bottom",
      "normalized_label": "bomb body with yellow black stripes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_top_001",
      "kind": "object",
      "label": "black bomb top with fuse attachment",
      "normalized_label": "bomb top with fuse",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "kind": "object",
      "label": "short red fuse with spark at end",
      "normalized_label": "red fuse with spark",
      "scene_layer": "foreground",
      "frame_position": "upper right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_spark_001",
      "kind": "visual_effect",
      "label": "bright yellow spark at fuse end",
      "normalized_label": "bright yellow spark",
      "scene_layer": "foreground",
      "frame_position": "upper right corner",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_panels_001",
      "kind": "object",
      "label": "multiple black segmented panels on bomb body",
      "normalized_label": "black segmented panels",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_colors_001",
      "kind": "environment",
      "label": "orange, blue, and purple radial burst background",
      "normalized_label": "radial burst background orange blue purple",
      "scene_layer": "background",
      "frame_position": "full card background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text: ごうかいボム",
      "normalized_label": "card name text Japanese",
      "scene_layer": "interface",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_trainer_001",
      "kind": "card_ui_text",
      "label": "card type text: トレーナーズ (Trainers)",
      "normalized_label": "card type text Japanese",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_subtitle_001",
      "kind": "card_ui_text",
      "label": "category text: ポケモンのどうぐ (Pokemon Tools)",
      "normalized_label": "category text Japanese",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_series_001",
      "kind": "card_ui_text",
      "label": "set code and rarity text: J M5 106/081 SR",
      "normalized_label": "set code J M5 and card number rarity 106/081 SR",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "card_ui_text",
      "label": "illustrator text: Illus. inose yukie",
      "normalized_label": "illustrator text inose yukie",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_textbox_001",
      "kind": "card_ui_text",
      "label": "card ability and rules text in Japanese",
      "normalized_label": "rules text Japanese",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_footer_001",
      "kind": "card_ui_text",
      "label": "copyright text: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright text",
      "scene_layer": "interface",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_object_bomb_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "object_type",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_object_bomb_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_body_001",
      "module": "objects_and_props",
      "field_path": "[1]",
      "claim": "appearance",
      "value": "black rounded body with yellow and black diagonal stripes at bottom",
      "supporting_observation_ids": [
        "obs_bomb_body_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_top_001",
      "module": "objects_and_props",
      "field_path": "[2]",
      "claim": "body_part",
      "value": "black bomb top with fuse",
      "supporting_observation_ids": [
        "obs_bomb_top_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_fuse_001",
      "module": "objects_and_props",
      "field_path": "[3]",
      "claim": "body_part",
      "value": "red fuse with spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_spark_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_panels_001",
      "module": "objects_and_props",
      "field_path": "[4]",
      "claim": "surface_pattern",
      "value": "black segmented panels on bomb body",
      "supporting_observation_ids": [
        "obs_bomb_panels_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_background_colors_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background_color_region",
      "value": "orange, blue, and purple radial burst",
      "supporting_observation_ids": [
        "obs_background_colors_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_count_bomb_001",
      "module": "counts",
      "field_path": "exact_count",
      "claim": "exact_count",
      "value": "1",
      "supporting_observation_ids": [
        "obs_object_bomb_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card_name_text",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker_observation_ids",
      "claim": "card_type_text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_trainer_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_category_001",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker_observation_ids",
      "claim": "category_text",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_subtitle_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_set_info_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "set_code_and_number",
      "value": "J M5 106/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_series_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator_text",
      "value": "Illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_textbox_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "rules_text",
      "value": "Japanese text rules box",
      "supporting_observation_ids": [
        "obs_card_ui_textbox_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "copyright_text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "supporting_observation_ids": [
        "obs_card_ui_footer_001"
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
      "count_id": "count_bomb_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
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
      "obs_bomb_body_001",
      "obs_bomb_fuse_001",
      "obs_bomb_panels_001",
      "obs_bomb_spark_001",
      "obs_bomb_top_001",
      "obs_object_bomb_001"
    ],
    "midground": [],
    "background": [
      "obs_background_colors_001"
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
      "obs_background_colors_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "bomb",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "rounded body",
        "striped pattern"
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
      "bright spark highlight on fuse end"
    ],
    "shadows": [
      "soft shading on bomb rounded body"
    ],
    "highlights": [
      "bright reflection on bomb body near spark"
    ],
    "composition": [
      "central large bomb",
      "radial burst background"
    ],
    "camera_angle": "straight on",
    "framing": "centered full object",
    "cropping": [],
    "depth": "moderate depth with foreground object and background color burst",
    "motion_cues": [
      "spark flicker"
    ],
    "motifs": [
      "radial burst around bomb"
    ],
    "repeated_shapes": [
      "segmented bomb panels"
    ],
    "style_cues": [
      "bold colors",
      "dynamic lighting"
    ],
    "supporting_observation_ids": [
      "obs_background_colors_001",
      "obs_bomb_body_001",
      "obs_bomb_fuse_001",
      "obs_bomb_spark_001",
      "obs_object_bomb_001"
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
        "fact_bomb_body_001",
        "fact_bomb_fuse_001",
        "fact_bomb_panels_001",
        "fact_bomb_top_001",
        "fact_object_bomb_001"
      ],
      "object_observation_ids": [
        "obs_bomb_body_001",
        "obs_bomb_fuse_001",
        "obs_bomb_panels_001",
        "obs_bomb_top_001",
        "obs_object_bomb_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_background_colors_001"
      ],
      "observation_ids": [
        "obs_background_colors_001"
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
        "fact_ui_category_001",
        "fact_ui_copyright_001",
        "fact_ui_illustrator_001",
        "fact_ui_name_001",
        "fact_ui_set_info_001",
        "fact_ui_textbox_001",
        "fact_ui_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_series_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_series_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_footer_001"
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
      "other_print_marker_observation_ids": [
        "obs_card_ui_subtitle_001",
        "obs_card_ui_trainer_001"
      ]
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
        "black rounded bomb body with yellow and black diagonal stripes",
        "orange blue purple radial burst background",
        "red fuse with bright spark"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "black rounded bomb body with yellow and black diagonal stripes",
      "supporting_observation_ids": [
        "obs_bomb_body_001"
      ]
    },
    {
      "term": "red fuse with bright spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_spark_001"
      ]
    },
    {
      "term": "orange blue purple radial burst background",
      "supporting_observation_ids": [
        "obs_background_colors_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-105 - Dark Bell

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0063912`
- Artwork observations: `7`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: Dark Bell, bell body, handle, decorative patterns, black, white outlines, blue background swirl. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Dark Bell | object | midground | high | 0.99 |
| bell body | object_part | midground | high | 0.98 |
| handle | object_part | midground | high | 0.95 |
| decorative patterns | object_part | midground | medium | 0.97 |
| black | color | midground | high | 0.99 |
| white outlines | color | midground | high | 0.98 |
| blue background swirl | color | background | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese ダークベル | card_ui_text | top left | fully_visible | 0.99 |
| collector number 105/081 SR | card_ui_text | bottom left | fully_visible | 0.95 |
| set code J M5 | card_ui_text | bottom left | fully_visible | 0.95 |
| illustrator name Toysto Beach | card_ui_text | bottom left | fully_visible | 0.95 |
| copyright line 2026 Pokémon/Nintendo/Creatures/GAME FREAK | card_ui_text | bottom center | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | object | obs_object_001 | 0.99 |
| fact_002 | objects_and_props | bell body visible | obs_object_002 | 0.98 |
| fact_003 | objects_and_props | handle visible | obs_object_003 | 0.95 |
| fact_004 | objects_and_props | decorative patterns visible | obs_object_004 | 0.97 |
| fact_005 | color_and_light | dominant colors | obs_color_001, obs_color_002, obs_color_003 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_006 | card name text visible | obs_card_ui_001 | 0.99 |
| fact_007 | collector number visible | obs_card_ui_002 | 0.95 |
| fact_008 | set code visible | obs_card_ui_003 | 0.95 |
| fact_009 | illustrator name visible | obs_card_ui_004 | 0.95 |
| fact_010 | copyright line visible | obs_card_ui_005 | 0.95 |

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
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_002"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_005"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_004"
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
| environment | none_visible | none | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| black bell | obs_color_001 |
| white outlines | obs_color_002 |
| blue swirl background | obs_color_003 |
| hexagonal shapes | obs_object_004 |
| circular motifs | obs_object_004 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: Dark Bell, bell body, handle, decorative patterns, black, white outlines, blue background swirl. Counts: dark bell: 1.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "Dark Bell",
      "normalized_label": "dark bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object_part",
      "label": "bell body",
      "normalized_label": "bell body",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_003",
      "kind": "object_part",
      "label": "handle",
      "normalized_label": "handle",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_004",
      "kind": "object_part",
      "label": "decorative patterns",
      "normalized_label": "decorative patterns",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color",
      "label": "white outlines",
      "normalized_label": "white",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_003",
      "kind": "color",
      "label": "blue background swirl",
      "normalized_label": "blue swirl background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese ダークベル",
      "normalized_label": "dark bell",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "collector number 105/081 SR",
      "normalized_label": "105/081 SR",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "set code J M5",
      "normalized_label": "J M5",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "illustrator name Toysto Beach",
      "normalized_label": "Toysto Beach",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "copyright line 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright line",
      "scene_layer": "ui",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "object",
      "value": "dark bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "[0].body_parts[0]",
      "claim": "bell body visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "[0].body_parts[1]",
      "claim": "handle visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "objects_and_props",
      "field_path": "[0].decorative_patterns",
      "claim": "decorative patterns visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_004"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "dominant colors",
      "value": "black, white outlines, blue swirl background",
      "supporting_observation_ids": [
        "obs_color_001",
        "obs_color_002",
        "obs_color_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "105/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set code visible",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name visible",
      "value": "Toysto Beach",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line visible",
      "value": "2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_005"
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
      "normalized_label": "dark bell",
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
      "obs_color_001",
      "obs_color_002",
      "obs_object_001",
      "obs_object_002",
      "obs_object_003",
      "obs_object_004"
    ],
    "background": [
      "obs_color_003"
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
      "label": "Dark Bell",
      "normalized_label": "dark bell",
      "object_type": "tool-like object",
      "colors": [
        "black",
        "white"
      ],
      "material_appearance": [
        "dark rounded surface",
        "white outlines"
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
      "white"
    ],
    "lighting": [
      "highlight on bell body"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "white outline highlights"
    ],
    "composition": [
      "centralized main object",
      "radial swirl background"
    ],
    "camera_angle": "front tilted",
    "framing": "tight framing",
    "cropping": [],
    "depth": "shallow depth",
    "motion_cues": [
      "radial swirl background suggests spinning motion"
    ],
    "motifs": [
      "bell",
      "circular patterns",
      "hexagonal facets"
    ],
    "repeated_shapes": [
      "circles",
      "hexagons"
    ],
    "style_cues": [
      "digital art",
      "graphic stylization"
    ],
    "supporting_observation_ids": [
      "obs_color_003",
      "obs_object_001",
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
    "environment_review": "none_visible",
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
        "obs_object_001",
        "obs_object_002",
        "obs_object_003",
        "obs_object_004"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": []
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_color_003",
        "obs_object_001",
        "obs_object_004"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_005"
      ],
      "observation_ids": [
        "obs_color_001",
        "obs_color_002",
        "obs_color_003"
      ]
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
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_002"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_005"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_004"
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
        "black bell",
        "blue swirl background",
        "circular motifs",
        "dark bell",
        "hexagonal shapes",
        "white outlines"
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
      "review_status": "none_visible",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "black bell",
      "supporting_observation_ids": [
        "obs_color_001"
      ]
    },
    {
      "term": "white outlines",
      "supporting_observation_ids": [
        "obs_color_002"
      ]
    },
    {
      "term": "blue swirl background",
      "supporting_observation_ids": [
        "obs_color_003"
      ]
    },
    {
      "term": "hexagonal shapes",
      "supporting_observation_ids": [
        "obs_object_004"
      ]
    },
    {
      "term": "circular motifs",
      "supporting_observation_ids": [
        "obs_object_004"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-074 - リトライバッジ

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0080628`
- Artwork observations: `4`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Counts: star badge: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| silver star-shaped badge with ribbon | object | foreground | primary | 0.99 |
| circular backing for star badge | object | foreground | primary | 0.95 |
| two ribbon tails attached to badge | object | foreground | secondary | 0.95 |
| blurred background with swirling blue and white patterns | environment | background | background | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese card name text リトライバッジ | card_ui_text | top_left | visible | 0.99 |
| Japanese text in card description area beneath artwork | card_ui_text | bottom_half | visible | 0.95 |
| illustrator text Illus. Toyste Beach | card_ui_text | bottom_left | visible | 0.9 |
| set code text m5 | card_ui_text | bottom_left | visible | 0.95 |
| collector number text 074/081 | card_ui_text | bottom_left | visible | 0.95 |
| Item card type symbol purple icon top left | card_ui_symbol | top_left | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | a star-shaped silver badge object is present | obs_object_001 | 0.99 |
| fact_002 | objects_and_props | a circular backing for the badge is visible | obs_object_002 | 0.95 |
| fact_003 | objects_and_props | two ribbon tails are attached to the badge | obs_object_003 | 0.95 |
| fact_004 | environment | blurred blue and white swirl background is visible behind badge | obs_environment_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_005 | card name text is リトライバッジ in Japanese | obs_card_ui_text_001 | 0.99 |
| fact_006 | collector number text reads 074/081 | obs_card_ui_text_005 | 0.95 |
| fact_007 | illustrator text reads Illus. Toyste Beach | obs_card_ui_text_003 | 0.9 |
| fact_008 | set code text is m5 | obs_card_ui_text_004 | 0.95 |
| fact_009 | visible item card type symbol in purple color top left | obs_card_ui_symbol_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_005",
    "fact_006",
    "fact_007",
    "fact_008",
    "fact_009"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_text_004"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_003"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_symbol_001"
  ]
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
| environment | complete | low | medium |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| star badge | exact | 1 | obs_object_001 | 0.99 |

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
| silver star badge | obs_object_001 |
| ribbon tails | obs_object_003 |
| blue and white swirl background | obs_environment_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: star badge: 1.
- Quality flags: `potential_actual_material_claim_without_visual_evidence`, `potential_object_material_or_card_surface_confusion`, `potential_visual_material_vs_surface_confusion`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "silver star-shaped badge with ribbon",
      "normalized_label": "silver star badge",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "circular backing for star badge",
      "normalized_label": "circle backing",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_003",
      "kind": "object",
      "label": "two ribbon tails attached to badge",
      "normalized_label": "ribbon tails",
      "scene_layer": "foreground",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "blurred background with swirling blue and white patterns",
      "normalized_label": "blurred blue-white swirl background",
      "scene_layer": "background",
      "frame_position": "full frame",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "Japanese card name text リトライバッジ",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "Japanese text in card description area beneath artwork",
      "normalized_label": "card description text",
      "scene_layer": "interface",
      "frame_position": "bottom_half",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "illustrator text Illus. Toyste Beach",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "set code text m5",
      "normalized_label": "set code",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "collector number text 074/081",
      "normalized_label": "collector number",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "card_ui_symbol",
      "label": "Item card type symbol purple icon top left",
      "normalized_label": "item card symbol",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].label",
      "claim": "a star-shaped silver badge object is present",
      "value": "silver star badge",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "objects_and_props[1].label",
      "claim": "a circular backing for the badge is visible",
      "value": "circular backing",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "objects_and_props[2].label",
      "claim": "two ribbon tails are attached to the badge",
      "value": "two ribbon tails",
      "supporting_observation_ids": [
        "obs_object_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "environment",
      "field_path": "environment.setting",
      "claim": "blurred blue and white swirl background is visible behind badge",
      "value": "blurred swirl background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_005",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.name_text_observation_ids",
      "claim": "card name text is リトライバッジ in Japanese",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.collector_number_observation_ids",
      "claim": "collector number text reads 074/081",
      "value": "074/081",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.illustrator_text_observation_ids",
      "claim": "illustrator text reads Illus. Toyste Beach",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.set_symbol_observation_ids",
      "claim": "set code text is m5",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.other_print_marker_observation_ids",
      "claim": "visible item card type symbol in purple color top left",
      "value": "item card type symbol",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_001"
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
      "normalized_label": "star badge",
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
      "obs_object_002",
      "obs_object_003"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "blurred swirl background"
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
      "label": "silver star-shaped badge with ribbon",
      "normalized_label": "silver star badge",
      "object_type": "badge",
      "colors": [
        "silver",
        "white"
      ],
      "material_appearance": [
        "metallic-looking",
        "shiny"
      ],
      "location": "center foreground",
      "count_reference": "count_001",
      "confidence": 0.99
    },
    {
      "observation_id": "obs_object_002",
      "label": "circular backing for star badge",
      "normalized_label": "circle backing",
      "object_type": "component",
      "colors": [
        "grey",
        "silver"
      ],
      "material_appearance": [
        "metallic-looking",
        "shiny"
      ],
      "location": "center behind star",
      "count_reference": "count_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_object_003",
      "label": "two ribbon tails attached to badge",
      "normalized_label": "ribbon tails",
      "object_type": "ribbons",
      "colors": [
        "white"
      ],
      "material_appearance": [
        "fabric-like"
      ],
      "location": "bottom center foreground",
      "count_reference": "count_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "silver",
      "white"
    ],
    "lighting": [
      "diffuse lighting",
      "highlight on badge"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights on metallic badge"
    ],
    "composition": [
      "centered composition",
      "close-up"
    ],
    "camera_angle": "front",
    "framing": "tight",
    "cropping": [
      "full badge visible"
    ],
    "depth": "shallow",
    "motion_cues": [],
    "motifs": [
      "ribbon motif",
      "star shape"
    ],
    "repeated_shapes": [
      "circular backing",
      "star points"
    ],
    "style_cues": [
      "clean illustration"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_object_001",
      "obs_object_002",
      "obs_object_003"
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
        "fact_003"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_002",
        "obs_object_003"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_004"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_001",
        "obs_object_002",
        "obs_object_003"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_001",
        "obs_object_002",
        "obs_object_003"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_008",
        "fact_009"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_symbol_001"
      ]
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
        "blue and white swirl background",
        "ribbon tails",
        "silver star badge"
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
      "evidence_quality": "medium",
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "silver star badge",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "ribbon tails",
      "supporting_observation_ids": [
        "obs_object_003"
      ]
    },
    {
      "term": "blue and white swirl background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-073 - ごうかいボム

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0086804`
- Artwork observations: `7`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Counts: bomb-like object: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| bomb-like object | object | foreground | salient | 1 |
| bomb body | object | foreground | salient | 1 |
| yellow and black striped band around bomb | object | foreground | salient | 1 |
| red fuse with lit spark | object | foreground | salient | 1 |
| lit spark at fuse tip | visual_effect | foreground | salient | 1 |
| flower emblem on bomb body | object | foreground | salient | 1 |
| blue and orange background glow | environment | background | salient | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text ごうかいボム | card_ui_text | top-left | visible | 0.98 |
| set symbol m5 | set_symbol | bottom-left | visible | 0.95 |
| collector number 073/081 | collector_number | bottom-left | visible | 0.95 |
| rarity mark U | rarity_mark | bottom-left | visible | 0.95 |
| illustrator inose yukie | illustrator_text | bottom-left | visible | 0.95 |
| copyright text Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom-center | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_bomb_001 | objects_and_props | main object is a bomb-like device | obs_obj_bomb_001, obs_obj_bomb_body_001 | 1 |
| fact_obj_bomb_band_001 | objects_and_props | bomb has yellow and black striped band around | obs_obj_bomb_band_001 | 1 |
| fact_obj_bomb_fuse_001 | objects_and_props | bomb has a red fuse with lit spark | obs_obj_bomb_fuse_001, obs_obj_bomb_spark_001 | 1 |
| fact_obj_bomb_flower_001 | objects_and_props | bomb body has a flower emblem | obs_obj_bomb_flower_001 | 1 |
| fact_env_bg_001 | environment | background contains blue and orange glow | obs_background_blue_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_001 | card name text visible | obs_card_name_text_001 | 0.98 |
| fact_set_symbol_001 | set symbol visible | obs_set_icon_001 | 0.95 |
| fact_collector_number_001 | collector number visible | obs_card_number_001 | 0.95 |
| fact_rarity_mark_001 | rarity mark visible | obs_rarity_mark_001 | 0.95 |
| fact_illustrator_text_001 | illustrator text visible | obs_illustrator_text_001 | 0.95 |
| fact_copyright_001 | copyright line visible | obs_copyright_line_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_name_001",
    "fact_collector_number_001",
    "fact_copyright_001",
    "fact_illustrator_text_001",
    "fact_rarity_mark_001",
    "fact_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_icon_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_rarity_mark_001"
  ],
  "copyright_line_observation_ids": [
    "obs_copyright_line_001"
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

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb-like object | exact | 1 | obs_obj_bomb_001 | 1 |

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
| bomb-like object | obs_obj_bomb_001 |
| yellow black striped band | obs_obj_bomb_band_001 |
| lit spark | obs_obj_bomb_spark_001 |
| red fuse | obs_obj_bomb_fuse_001 |
| flower emblem | obs_obj_bomb_flower_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: bomb-like object: 1.
- Quality flags: `potential_empty_module_marked_complete`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_obj_bomb_001",
      "kind": "object",
      "label": "bomb-like object",
      "normalized_label": "bomb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_body_001",
      "kind": "object",
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_band_001",
      "kind": "object",
      "label": "yellow and black striped band around bomb",
      "normalized_label": "yellow black striped band",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_fuse_001",
      "kind": "object",
      "label": "red fuse with lit spark",
      "normalized_label": "red fuse",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_spark_001",
      "kind": "visual_effect",
      "label": "lit spark at fuse tip",
      "normalized_label": "spark",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_bomb_flower_001",
      "kind": "object",
      "label": "flower emblem on bomb body",
      "normalized_label": "flower emblem",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_blue_001",
      "kind": "environment",
      "label": "blue and orange background glow",
      "normalized_label": "background glow",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text ごうかいボム",
      "normalized_label": "ごうかいボム",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_icon_001",
      "kind": "set_symbol",
      "label": "set symbol m5",
      "normalized_label": "set symbol m5",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "collector_number",
      "label": "collector number 073/081",
      "normalized_label": "073/081",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_rarity_mark_001",
      "kind": "rarity_mark",
      "label": "rarity mark U",
      "normalized_label": "rarity mark U",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator inose yukie",
      "normalized_label": "inose yukie",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_copyright_line_001",
      "kind": "copyright_text",
      "label": "copyright text Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "scene_layer": "ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_bomb_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "main object is a bomb-like device",
      "value": "bomb-like object",
      "supporting_observation_ids": [
        "obs_obj_bomb_001",
        "obs_obj_bomb_body_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_band_001",
      "module": "objects_and_props",
      "field_path": "[0].band",
      "claim": "bomb has yellow and black striped band around",
      "value": "yellow and black striped band",
      "supporting_observation_ids": [
        "obs_obj_bomb_band_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_fuse_001",
      "module": "objects_and_props",
      "field_path": "[0].fuse",
      "claim": "bomb has a red fuse with lit spark",
      "value": "red fuse with lit spark",
      "supporting_observation_ids": [
        "obs_obj_bomb_fuse_001",
        "obs_obj_bomb_spark_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_bomb_flower_001",
      "module": "objects_and_props",
      "field_path": "[0].decoration",
      "claim": "bomb body has a flower emblem",
      "value": "flower emblem",
      "supporting_observation_ids": [
        "obs_obj_bomb_flower_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_bg_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background contains blue and orange glow",
      "value": "blue and orange background glow",
      "supporting_observation_ids": [
        "obs_background_blue_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text visible",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_name_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "set symbol visible",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_set_icon_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "collector number visible",
      "value": "073/081",
      "supporting_observation_ids": [
        "obs_card_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_rarity_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark_observation_ids",
      "claim": "rarity mark visible",
      "value": "U",
      "supporting_observation_ids": [
        "obs_rarity_mark_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator text visible",
      "value": "inose yukie",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "copyright line visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "supporting_observation_ids": [
        "obs_copyright_line_001"
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
      "count_id": "count_obj_bomb_001",
      "normalized_label": "bomb-like object",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_obj_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_obj_bomb_001",
      "obs_obj_bomb_band_001",
      "obs_obj_bomb_body_001",
      "obs_obj_bomb_flower_001",
      "obs_obj_bomb_fuse_001",
      "obs_obj_bomb_spark_001"
    ],
    "midground": [],
    "background": [
      "obs_background_blue_001"
    ]
  },
  "environment": {
    "setting": [
      "blue and orange background glow"
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
      "obs_background_blue_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_bomb_001",
      "label": "bomb-like object",
      "normalized_label": "bomb",
      "object_type": "device",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded surface",
        "yellow and black striped band"
      ],
      "location": "center",
      "count_reference": "count_obj_bomb_001",
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
      "yellow"
    ],
    "lighting": [
      "bright highlight on bomb body",
      "spark bright glow"
    ],
    "shadows": [
      "none distinctly visible"
    ],
    "highlights": [
      "bright highlight on bomb body"
    ],
    "composition": [
      "central bomb surrounded by blue and orange glow"
    ],
    "camera_angle": "front-facing",
    "framing": "centered, full bomb visible",
    "cropping": [],
    "depth": "shallow depth, bomb prominent",
    "motion_cues": [
      "spark flare effect on fuse tip"
    ],
    "motifs": [
      "circular bomb shape",
      "striped band pattern"
    ],
    "repeated_shapes": [
      "circular forms"
    ],
    "style_cues": [
      "cartoon style",
      "digital illustration"
    ],
    "supporting_observation_ids": [
      "obs_background_blue_001",
      "obs_obj_bomb_001",
      "obs_obj_bomb_band_001",
      "obs_obj_bomb_fuse_001",
      "obs_obj_bomb_spark_001"
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
        "fact_obj_bomb_001",
        "fact_obj_bomb_band_001",
        "fact_obj_bomb_flower_001",
        "fact_obj_bomb_fuse_001"
      ],
      "object_observation_ids": [
        "obs_obj_bomb_001",
        "obs_obj_bomb_band_001",
        "obs_obj_bomb_flower_001",
        "obs_obj_bomb_fuse_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_bg_001"
      ],
      "observation_ids": [
        "obs_background_blue_001"
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
        "fact_card_name_001",
        "fact_collector_number_001",
        "fact_copyright_001",
        "fact_illustrator_text_001",
        "fact_rarity_mark_001",
        "fact_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_icon_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_rarity_mark_001"
      ],
      "copyright_line_observation_ids": [
        "obs_copyright_line_001"
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
      "count_ids": [
        "count_obj_bomb_001"
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
        "bomb-like object",
        "flower emblem",
        "lit spark",
        "red fuse",
        "yellow black striped band"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "bomb-like object",
      "supporting_observation_ids": [
        "obs_obj_bomb_001"
      ]
    },
    {
      "term": "yellow black striped band",
      "supporting_observation_ids": [
        "obs_obj_bomb_band_001"
      ]
    },
    {
      "term": "lit spark",
      "supporting_observation_ids": [
        "obs_obj_bomb_spark_001"
      ]
    },
    {
      "term": "red fuse",
      "supporting_observation_ids": [
        "obs_obj_bomb_fuse_001"
      ]
    },
    {
      "term": "flower emblem",
      "supporting_observation_ids": [
        "obs_obj_bomb_flower_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-072 - 古びたたての化石

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0087164`
- Artwork observations: `6`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Depicted subjects: gray and yellow fossil icon. Visible observations: fossil stone object, band around fossil, cracks on fossil surface, rocky ground surface, green plants, small gray fossil icon with yellow body. Counts: fossil stone object: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| fossil stone object | object | midground | high | 0.99 |
| band around fossil | object | midground | medium | 0.98 |
| cracks on fossil surface | object | midground | medium | 0.98 |
| rocky ground surface | object | background | medium | 0.98 |
| green plants | object | background | medium | 0.95 |
| small gray fossil icon with yellow body | depicted_subject | foreground | medium | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name Japanese text 古びたたての化石 | card_ui_text | top | visible | 0.99 |
| HP 60 | card_ui_text | top right | visible | 0.99 |
| jpn-m5 set symbol | set_symbol | bottom left | visible | 0.99 |
| 072/081 | collector_number | bottom left | visible | 0.99 |
| Illus. AYUMI ODASHIMA | illustrator_text | bottom left | visible | 0.99 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | bottom_line_text | bottom center | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | main object is a fossil stone object with cracks and a band | obs_object_fossil_001, obs_object_fossil_001_cracks_001, obs_object_fossil_001_sideband_001 | 0.99 |
| fact_002 | objects_and_props | the fossil object is placed on rocky ground with green plants | obs_object_plants_001, obs_object_rocky_ground_001 | 0.95 |
| fact_003 | objects_and_props | there is a small depicted fossil icon with gray and yellow colors | obs_depicted_subject_tatetopsu_icon_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_004 | card name text is visible in Japanese | obs_card_ui_name_text_001 | 0.99 |
| fact_005 | HP text is visible as 60 in black text | obs_card_ui_hp_text_001 | 0.99 |
| fact_006 | set symbol jpn-m5 is visible at bottom left | obs_card_ui_set_symbol_001 | 0.99 |
| fact_007 | collector number visible as 072/081 | obs_card_ui_collector_number_001 | 0.99 |
| fact_008 | illustrator credit visible as Illus. AYUMI ODASHIMA | obs_card_ui_illustrator_text_001 | 0.99 |
| fact_009 | copyright line visible as ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | obs_card_ui_bottom_line_text_001 | 0.99 |

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
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_line_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_line_text_001"
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
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| fossil stone object | exact | 1 | obs_object_fossil_001 | 0.99 |

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
| fossil stone object | obs_object_fossil_001 |
| banded cracked fossil | obs_object_fossil_001_cracks_001, obs_object_fossil_001_sideband_001 |
| rocky ground with plants | obs_object_plants_001, obs_object_rocky_ground_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Depicted subjects: gray and yellow fossil icon. Visible observations: fossil stone object, band around fossil, cracks on fossil surface, rocky ground surface, green plants, small gray fossil icon with yellow body. Counts: fossil stone object: 1.
- Quality flags: `potential_actual_material_claim_without_visual_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_fossil_001",
      "kind": "object",
      "label": "fossil stone object",
      "normalized_label": "fossil stone object",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_fossil_001_sideband_001",
      "kind": "object",
      "label": "band around fossil",
      "normalized_label": "band around fossil",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_fossil_001_cracks_001",
      "kind": "object",
      "label": "cracks on fossil surface",
      "normalized_label": "cracks on fossil surface",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_rocky_ground_001",
      "kind": "object",
      "label": "rocky ground surface",
      "normalized_label": "rocky ground surface",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_plants_001",
      "kind": "object",
      "label": "green plants",
      "normalized_label": "green plants",
      "scene_layer": "background",
      "frame_position": "left and right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_depicted_subject_tatetopsu_icon_001",
      "kind": "depicted_subject",
      "label": "small gray fossil icon with yellow body",
      "normalized_label": "small gray fossil icon with yellow body",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name Japanese text 古びたたての化石",
      "normalized_label": "card name Japanese text",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_text_001",
      "kind": "card_ui_text",
      "label": "HP 60",
      "normalized_label": "HP value",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "jpn-m5 set symbol",
      "normalized_label": "set symbol",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "072/081",
      "normalized_label": "collector number",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. AYUMI ODASHIMA",
      "normalized_label": "illustrator text",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_line_text_001",
      "kind": "bottom_line_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright line",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "main object is a fossil stone object with cracks and a band",
      "value": "fossil stone object with cracks and side band",
      "supporting_observation_ids": [
        "obs_object_fossil_001",
        "obs_object_fossil_001_cracks_001",
        "obs_object_fossil_001_sideband_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "[1]",
      "claim": "the fossil object is placed on rocky ground with green plants",
      "value": "rocky ground with green plants",
      "supporting_observation_ids": [
        "obs_object_plants_001",
        "obs_object_rocky_ground_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "[2]",
      "claim": "there is a small depicted fossil icon with gray and yellow colors",
      "value": "small gray and yellow fossil icon",
      "supporting_observation_ids": [
        "obs_depicted_subject_tatetopsu_icon_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is visible in Japanese",
      "value": "古びたたての化石",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text is visible as 60 in black text",
      "value": "60 HP",
      "supporting_observation_ids": [
        "obs_card_ui_hp_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol jpn-m5 is visible at bottom left",
      "value": "jpn-m5 set symbol",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible as 072/081",
      "value": "072/081",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator credit visible as Illus. AYUMI ODASHIMA",
      "value": "Illus. AYUMI ODASHIMA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "copyright line visible as ©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_line_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [
    {
      "observation_id": "obs_depicted_subject_tatetopsu_icon_001",
      "subject_kind": "depicted_subject",
      "represented_identity": "gray and yellow fossil icon",
      "identity_confidence": 0.98,
      "host_surface": "card illustration area",
      "surface_type": "illustration",
      "visibility": "visible",
      "confidence": 0.98
    }
  ],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "fossil stone object",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_fossil_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_card_ui_bottom_line_text_001",
      "obs_card_ui_collector_number_001",
      "obs_card_ui_hp_text_001",
      "obs_card_ui_illustrator_text_001",
      "obs_card_ui_name_text_001",
      "obs_card_ui_set_symbol_001",
      "obs_depicted_subject_tatetopsu_icon_001"
    ],
    "midground": [
      "obs_object_fossil_001",
      "obs_object_fossil_001_cracks_001",
      "obs_object_fossil_001_sideband_001"
    ],
    "background": [
      "obs_object_plants_001",
      "obs_object_rocky_ground_001"
    ]
  },
  "environment": {
    "setting": [
      "rocky ground"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [],
    "ground": [
      "rocky ground"
    ],
    "terrain": [
      "rocky"
    ],
    "plants": [
      "green plants"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_object_plants_001",
      "obs_object_rocky_ground_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_fossil_001",
      "label": "fossil stone object",
      "normalized_label": "fossil stone object",
      "object_type": "fossil",
      "colors": [
        "brown",
        "tan"
      ],
      "material_appearance": [
        "band around middle",
        "cracked surface",
        "stone-like appearance"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "brown",
      "gray",
      "green",
      "tan"
    ],
    "lighting": [
      "diffuse natural light"
    ],
    "shadows": [
      "soft shadows under fossil and plants"
    ],
    "highlights": [
      "light reflection on fossil"
    ],
    "composition": [
      "central composition",
      "close-up framing"
    ],
    "camera_angle": "slightly elevated top down angle",
    "framing": "centered close-up",
    "cropping": [
      "full fossil visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "ancient",
      "natural"
    ],
    "repeated_shapes": [
      "rounded edges"
    ],
    "style_cues": [
      "detailed texture",
      "painterly realistic"
    ],
    "supporting_observation_ids": [
      "obs_object_fossil_001",
      "obs_object_plants_001",
      "obs_object_rocky_ground_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "observed",
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
        "fact_003"
      ],
      "object_observation_ids": [
        "obs_depicted_subject_tatetopsu_icon_001",
        "obs_object_fossil_001",
        "obs_object_plants_001",
        "obs_object_rocky_ground_001"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_plants_001",
        "obs_object_rocky_ground_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_fossil_001",
        "obs_object_rocky_ground_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_fossil_001",
        "obs_object_plants_001"
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
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_line_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_line_text_001"
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
        "banded cracked fossil",
        "fossil stone object",
        "rocky ground with plants"
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "fossil stone object",
      "supporting_observation_ids": [
        "obs_object_fossil_001"
      ]
    },
    {
      "term": "banded cracked fossil",
      "supporting_observation_ids": [
        "obs_object_fossil_001_cracks_001",
        "obs_object_fossil_001_sideband_001"
      ]
    },
    {
      "term": "rocky ground with plants",
      "supporting_observation_ids": [
        "obs_object_plants_001",
        "obs_object_rocky_ground_001"
      ]
    }
  ]
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-109: fact_graph_weather_claim_without_weather_field
- GV-PK-JPN-TCGCOLLECTOR11526-019: fact_graph_search_terms_too_sparse, semantic_tags_too_sparse
- GV-PK-JPN-TCGCOLLECTOR11525-019: fact_graph_count_observation_missing:obs_counts_palmtrees_001
- GV-PK-JPN-TCGCOLLECTOR11515-020: fact_graph_card_ui_observation_in_artwork_module:objects_and_props:obs_energy_symbol_001
- GV-PK-JPN-SM1PLUS-069: fact_graph_card_ui_observation_in_artwork_module:color_and_light:fact_001

