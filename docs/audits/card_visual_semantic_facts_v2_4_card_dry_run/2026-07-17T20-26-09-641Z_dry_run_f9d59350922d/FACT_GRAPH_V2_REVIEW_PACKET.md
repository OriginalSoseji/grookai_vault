# Card Visual Fact Graph V2 Review Packet

Generated rows: 4
Validation failures: 0
Skipped images: 0
Estimated cost USD: 0.0368056

## Rows

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- V2 stress role: `dense_pokemon_artwork`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0101364`
- Artwork observations: `12`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary | 0.99 |
| body | body | object_part | foreground | primary | 0.98 |
| head | head | object_part | foreground | primary | 0.98 |
| eyes | eyes | object_part | foreground | primary | 0.9 |
| mouth | mouth | object_part | foreground | primary | 0.9 |
| arms and legs | arms and legs | object_part | foreground | primary | 0.95 |
| tail | tail | object_part | foreground | primary | 0.92 |
| horns/spikes | horns/spikes | object_part | foreground | primary | 0.93 |
| dark shadow and yellow energy effect | dark shadow and yellow energy effect | object_part | foreground | primary | 0.95 |
| predominant colors | yellow, black, gold | color_and_light | foreground | primary | 0.99 |
| floating slightly upright pose | floating upright diagonal | pose_orientation | foreground | primary | 0.96 |
| gold patterned abstract background | gold patterned abstract background | environment | background | primary | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガダークライ ex | card_ui_text | top center | visible | 0.98 |
| HP text: 280 | card_ui_text | top right | visible | 0.99 |
| dark-type energy icon | card_ui_symbol | top right next to HP | visible | 0.99 |
| set symbol with code M5 | set_symbol | bottom left | visible | 0.97 |
| collector number 118/081 | collector_number | bottom left | visible | 0.98 |
| illustrator: 5ban Graphics (Sban Graphics) | illustrator_text | bottom left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_identity_001 | subjects | scene subject identity | obs_subject_mega_darkrai_001 | 0.99 |
| fact_creature_body_color_001 | creature_anatomy | body colors | obs_color_palette_001, obs_creature_anatomy_body_001 | 0.98 |
| fact_creature_pose_001 | creature_anatomy | pose | obs_pose_001 | 0.96 |
| fact_creature_effects_001 | creature_anatomy | effects | obs_creature_anatomy_effects_001 | 0.95 |
| fact_environment_background_001 | environment | background | obs_environment_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text | obs_card_ui_name_text_001 | 0.98 |
| fact_card_ui_hp_text_001 | HP text | obs_card_ui_hp_text_001 | 0.99 |
| fact_card_ui_energy_symbol_001 | energy type symbol | obs_card_ui_energy_symbol_001 | 0.99 |
| fact_card_ui_set_symbol_001 | set symbol | obs_card_ui_set_symbol_001 | 0.97 |
| fact_card_ui_collector_number_001 | collector number | obs_card_ui_collector_number_001 | 0.98 |
| fact_card_ui_illustrator_text_001 | illustrator text | obs_card_ui_illustrator_text_001 | 0.95 |

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
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_floating_001 | action | floating | obs_subject_mega_darkrai_001 | obs_pose_001 | visible mouth visible eyes floating pose upright diagonal idle | 0.96 |

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
| floating Mega Darkrai | obs_pose_001, obs_subject_mega_darkrai_001 |
| yellow and black Mega Darkrai | obs_color_palette_001, obs_subject_mega_darkrai_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_color_palette_001, obs_creature_anatomy_effects_001, obs_environment_background_001 | deterministic_rule | 0.92 |
| diagonal composition | obs_pose_001 | deterministic_rule | 0.96 |
| diagonal upright orientation | obs_subject_mega_darkrai_001 | deterministic_rule | 0.99 |
| diagonal upright orientation | obs_pose_001 | deterministic_rule | 0.96 |
| floating | obs_pose_001 | deterministic_rule | 0.96 |
| floating | obs_subject_mega_darkrai_001 | deterministic_rule | 0.99 |
| lightning | obs_color_palette_001, obs_creature_anatomy_effects_001, obs_environment_background_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_speculative_setting_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_mega_darkrai_001",
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
      "observation_id": "obs_creature_anatomy_body_001",
      "kind": "object_part",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_head_001",
      "kind": "object_part",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_eyes_001",
      "kind": "object_part",
      "label": "eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_mouth_001",
      "kind": "object_part",
      "label": "mouth",
      "normalized_label": "mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_limbs_001",
      "kind": "object_part",
      "label": "arms and legs",
      "normalized_label": "arms and legs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_tail_001",
      "kind": "object_part",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_horns_001",
      "kind": "object_part",
      "label": "horns/spikes",
      "normalized_label": "horns/spikes",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_effects_001",
      "kind": "object_part",
      "label": "dark shadow and yellow energy effect",
      "normalized_label": "dark shadow and yellow energy effect",
      "scene_layer": "foreground",
      "frame_position": "all around subject",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_palette_001",
      "kind": "color_and_light",
      "label": "predominant colors",
      "normalized_label": "yellow, black, gold",
      "scene_layer": "foreground",
      "frame_position": "overall",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose_orientation",
      "label": "floating slightly upright pose",
      "normalized_label": "floating upright diagonal",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_background_001",
      "kind": "environment",
      "label": "gold patterned abstract background",
      "normalized_label": "gold patterned abstract background",
      "scene_layer": "background",
      "frame_position": "full background",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガダークライ ex",
      "normalized_label": "mega darkrai ex",
      "scene_layer": "midground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_text_001",
      "kind": "card_ui_text",
      "label": "HP text: 280",
      "normalized_label": "280 HP",
      "scene_layer": "midground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_001",
      "kind": "card_ui_symbol",
      "label": "dark-type energy icon",
      "normalized_label": "dark energy type",
      "scene_layer": "midground",
      "frame_position": "top right next to HP",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol with code M5",
      "normalized_label": "M5 set symbol",
      "scene_layer": "midground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "collector number 118/081",
      "normalized_label": "118 of 81",
      "scene_layer": "midground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator: 5ban Graphics (Sban Graphics)",
      "normalized_label": "5ban Graphics",
      "scene_layer": "midground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_identity_001",
      "module": "subjects",
      "field_path": "[0].identity",
      "claim": "scene subject identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_mega_darkrai_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_body_color_001",
      "module": "creature_anatomy",
      "field_path": "body.colors",
      "claim": "body colors",
      "value": "yellow, black",
      "supporting_observation_ids": [
        "obs_color_palette_001",
        "obs_creature_anatomy_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose",
      "value": "floating slightly upright diagonally",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_effects_001",
      "module": "creature_anatomy",
      "field_path": "effects",
      "claim": "effects",
      "value": "dark shadow and yellow energy effect",
      "supporting_observation_ids": [
        "obs_creature_anatomy_effects_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background",
      "value": "gold patterned abstract",
      "supporting_observation_ids": [
        "obs_environment_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガダークライ ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text",
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
      "claim": "energy type symbol",
      "value": "dark-type",
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
      "claim": "set symbol",
      "value": "M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "118/081",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_mega_darkrai_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms and legs",
        "body",
        "dark shadow and yellow energy effect",
        "eyes",
        "head",
        "horns/spikes",
        "mouth",
        "tail"
      ],
      "physical_features": [
        "black and yellow coloration",
        "glowing effects"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "diagonal upright",
      "action_state": [
        "idle"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "visible",
        "eyebrows": "cannot determine",
        "face_position": "center",
        "other_visible_evidence": [
          "dark shadow and yellow energy effect"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
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
      "obs_creature_anatomy_effects_001",
      "obs_creature_anatomy_eyes_001",
      "obs_creature_anatomy_head_001",
      "obs_creature_anatomy_horns_001",
      "obs_creature_anatomy_limbs_001",
      "obs_creature_anatomy_mouth_001",
      "obs_creature_anatomy_tail_001",
      "obs_subject_mega_darkrai_001"
    ],
    "midground": [
      "obs_card_ui_collector_number_001",
      "obs_card_ui_energy_symbol_001",
      "obs_card_ui_hp_text_001",
      "obs_card_ui_illustrator_text_001",
      "obs_card_ui_name_text_001",
      "obs_card_ui_set_symbol_001"
    ],
    "background": [
      "obs_environment_background_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract magical background"
    ],
    "indoor_outdoor": "not_applicable",
    "sky": [],
    "ground": [],
    "terrain": [
      "abstract patterned background"
    ],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_background_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "gold",
      "yellow"
    ],
    "lighting": [
      "bright lighting on edges",
      "golden holographic highlights"
    ],
    "shadows": [
      "dark shadows around subject"
    ],
    "highlights": [
      "strong golden highlights"
    ],
    "composition": [
      "central subject",
      "symmetrical background pattern"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing around character",
    "cropping": [
      "full subject visible"
    ],
    "depth": "moderate depth with layered background",
    "motion_cues": [],
    "motifs": [
      "lightning bolt shapes in background"
    ],
    "repeated_shapes": [
      "angular spikes",
      "lightning shapes"
    ],
    "style_cues": [
      "comic style drawing",
      "holographic foil"
    ],
    "supporting_observation_ids": [
      "obs_color_palette_001",
      "obs_creature_anatomy_effects_001",
      "obs_environment_background_001"
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
        "obs_subject_mega_darkrai_001"
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
        "fact_creature_effects_001",
        "fact_creature_pose_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_mega_darkrai_001",
          "region": "body",
          "feature": "body",
          "visibility": "visible",
          "colors": [
            "black",
            "yellow"
          ],
          "details": [
            "glowing effects"
          ],
          "supporting_observation_ids": [
            "obs_color_palette_001",
            "obs_creature_anatomy_body_001"
          ],
          "confidence": 0.98
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_mega_darkrai_001",
          "region": "head",
          "feature": "horns/spikes",
          "visibility": "visible",
          "colors": [
            "black",
            "yellow"
          ],
          "details": [
            "angular",
            "sharp"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_horns_001"
          ],
          "confidence": 0.93
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_mega_darkrai_001",
          "pose": [
            "floating"
          ],
          "orientation": "diagonal upright",
          "action_state": [
            "idle"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.96
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_mega_darkrai_001",
          "label": "dark shadow and yellow energy effect",
          "details": [
            "glowing energy aura",
            "holographic foil effect"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_effects_001"
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
        "fact_environment_background_001"
      ],
      "observation_ids": [
        "obs_environment_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_creature_body_color_001"
      ],
      "observation_ids": [
        "obs_color_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_creature_effects_001"
      ],
      "observation_ids": [
        "obs_creature_anatomy_effects_001"
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
        "floating Mega Darkrai",
        "yellow and black Mega Darkrai"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_floating_001",
      "category": "action",
      "label": "floating",
      "subject_observation_id": "obs_subject_mega_darkrai_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [
          "visible mouth"
        ],
        "eyes": [
          "visible eyes"
        ],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "floating pose"
        ],
        "body_position": [
          "upright diagonal"
        ],
        "motion_state": [
          "idle"
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
      "term": "floating Mega Darkrai",
      "supporting_observation_ids": [
        "obs_pose_001",
        "obs_subject_mega_darkrai_001"
      ]
    },
    {
      "term": "yellow and black Mega Darkrai",
      "supporting_observation_ids": [
        "obs_color_palette_001",
        "obs_subject_mega_darkrai_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_color_palette_001",
          "obs_creature_anatomy_effects_001",
          "obs_environment_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "diagonal upright orientation",
        "source_observation_ids": [
          "obs_subject_mega_darkrai_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal upright orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_subject_mega_darkrai_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_color_palette_001",
          "obs_creature_anatomy_effects_001",
          "obs_environment_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- V2 stress role: `trainer_person_artwork`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0080336`
- Artwork observations: `10`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: female trainer. Visible observations: orange spiky hair tied in ponytail, black wristband right wrist, indoor swimming pool, pool lane dividers, bench seat. Semantic facts: smiling.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| young female trainer | young female trainer | scene_subject | foreground | primary | 0.98 |
| orange spiky hair tied in a ponytail | orange spiky hair tied in ponytail | feature | foreground | high | 0.98 |
| visible face with open eyes and smiling mouth | face visible, eyes open, smiling mouth | feature | foreground | primary | 0.98 |
| dark blue sleeveless swimsuit with round neckline | dark blue sleeveless swimsuit round neckline | feature | foreground | primary | 0.97 |
| black wristband on right wrist | black wristband right wrist | feature | foreground | medium | 0.95 |
| right fist raised forward, left arm stretched back | right fist forward left arm back | feature | foreground | primary | 0.96 |
| indoor swimming pool environment | indoor swimming pool | background | background | medium | 0.95 |
| pool lane dividers | pool lane dividers | object | background | medium | 0.93 |
| bench seat behind pool | bench seat | object | background | medium | 0.92 |
| sparkles of light reflections on water | sparkles on water | object | background | low | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text 'カスミの元気' (Misty's Vitality) | card_ui_text | top left | visible | 0.99 |
| supporter type text 'サポート' | card_ui_text | top left | visible | 0.98 |
| trainer type text 'トレーナーズ' | card_ui_text | top right | visible | 0.98 |
| legal text and usage limits text in Japanese at bottom center circle area | card_ui_text | bottom center | visible | 0.95 |
| card number and rarity text '108/081 SR' | card_ui_text | bottom left | visible | 0.97 |
| set code and logo text 'J M5' | card_ui_text | bottom left | visible | 0.95 |
| copyright text at card bottom '©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | card_ui_text | bottom edge | visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject is a young female trainer | obs_subject_001 | 0.98 |
| fact_hair_001 | human_appearance | hair is orange, spiky, tied in a side ponytail | obs_hair_001 | 0.98 |
| fact_face_001 | human_appearance | face visible with open eyes and smiling mouth | obs_face_001 | 0.98 |
| fact_clothing_001 | clothing | wearing dark blue sleeveless swimsuit with round neckline | obs_clothing_001 | 0.97 |
| fact_clothing_002 | clothing | wearing black wristband on right wrist | obs_accessory_001 | 0.95 |
| fact_creature_anatomy_001 | creature_anatomy | right fist raised forward, left arm stretched back | obs_posture_001 | 0.96 |
| fact_environment_001 | environment | indoor swimming pool environment | obs_environment_001, obs_environment_002, obs_environment_003, obs_environment_004 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text visible as 'カスミの元気' | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | rarity mark text 'SR' visible in card number text | obs_card_ui_text_005 | 0.97 |
| fact_card_ui_and_print_markers_003 | supporter type text 'サポート' visible | obs_card_ui_text_002 | 0.98 |
| fact_card_ui_and_print_markers_004 | trainer type text 'トレーナーズ' visible | obs_card_ui_text_003 | 0.98 |
| fact_card_ui_and_print_markers_005 | card number text '108/081' visible | obs_card_ui_text_005 | 0.97 |
| fact_card_ui_and_print_markers_006 | set symbol text 'J M5' visible | obs_card_ui_text_006 | 0.95 |
| fact_card_ui_and_print_markers_007 | copyright text visible | obs_card_ui_text_007 | 0.97 |

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
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_text_006"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_007"
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
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | complete | none | medium |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | expression | smiling | obs_subject_001 | obs_face_001 | smiling open neutral face visible left arm stretched back right fist raised forward standing standing indoor swimming pool | 0.98 |

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
| orange spiky hair ponytail | obs_hair_001 |
| dark blue swimsuit | obs_clothing_001 |
| indoor swimming pool | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_001, obs_environment_004, obs_subject_001 | deterministic_rule | 0.92 |
| circular motif | obs_clothing_001 | deterministic_rule | 0.97 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.98 |
| forward orientation | obs_posture_001 | deterministic_rule | 0.96 |
| forward-right orientation | obs_posture_001 | deterministic_rule | 0.96 |
| left arm stretched back | obs_subject_001 | deterministic_rule | 0.98 |
| left arm stretched back | obs_posture_001 | deterministic_rule | 0.96 |
| right fist raised forward | obs_subject_001 | deterministic_rule | 0.98 |
| right fist raised forward | obs_posture_001 | deterministic_rule | 0.96 |
| right orientation | obs_accessory_001 | deterministic_rule | 0.95 |
| sleeveless clothing | obs_clothing_001 | deterministic_rule | 0.97 |
| smiling | obs_face_001 | deterministic_rule | 0.98 |
| water | obs_environment_004 | deterministic_rule | 0.9 |
| water | obs_environment_001, obs_environment_004, obs_subject_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female trainer. Visible observations: orange spiky hair tied in ponytail, black wristband right wrist, indoor swimming pool, pool lane dividers, bench seat. Semantic facts: smiling.
- Quality flags: `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "young female trainer",
      "normalized_label": "young female trainer",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "feature",
      "label": "orange spiky hair tied in a ponytail",
      "normalized_label": "orange spiky hair tied in ponytail",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "feature",
      "label": "visible face with open eyes and smiling mouth",
      "normalized_label": "face visible, eyes open, smiling mouth",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "feature",
      "label": "dark blue sleeveless swimsuit with round neckline",
      "normalized_label": "dark blue sleeveless swimsuit round neckline",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "feature",
      "label": "black wristband on right wrist",
      "normalized_label": "black wristband right wrist",
      "scene_layer": "foreground",
      "frame_position": "right forearm",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_posture_001",
      "kind": "feature",
      "label": "right fist raised forward, left arm stretched back",
      "normalized_label": "right fist forward left arm back",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "background",
      "label": "indoor swimming pool environment",
      "normalized_label": "indoor swimming pool",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "object",
      "label": "pool lane dividers",
      "normalized_label": "pool lane dividers",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "object",
      "label": "bench seat behind pool",
      "normalized_label": "bench seat",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "object",
      "label": "sparkles of light reflections on water",
      "normalized_label": "sparkles on water",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text 'カスミの元気' (Misty's Vitality)",
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
      "label": "supporter type text 'サポート'",
      "normalized_label": "supporter type text",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "trainer type text 'トレーナーズ'",
      "normalized_label": "trainer type text",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "legal text and usage limits text in Japanese at bottom center circle area",
      "normalized_label": "legal and usage limit text",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "card number and rarity text '108/081 SR'",
      "normalized_label": "card number and rarity",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "card_ui_text",
      "label": "set code and logo text 'J M5'",
      "normalized_label": "set code and logo",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_007",
      "kind": "card_ui_text",
      "label": "copyright text at card bottom '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright text",
      "scene_layer": "interface",
      "frame_position": "bottom edge",
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
      "field_path": "scene_subject.identity",
      "claim": "scene subject is a young female trainer",
      "value": "true",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair",
      "claim": "hair is orange, spiky, tied in a side ponytail",
      "value": "orange, spiky, ponytail",
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
      "claim": "face visible with open eyes and smiling mouth",
      "value": "face visible, eyes open, smiling mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments",
      "claim": "wearing dark blue sleeveless swimsuit with round neckline",
      "value": "dark blue sleeveless swimsuit round neckline",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "accessories",
      "claim": "wearing black wristband on right wrist",
      "value": "black wristband right wrist",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "right fist raised forward, left arm stretched back",
      "value": "right fist forward left arm back",
      "supporting_observation_ids": [
        "obs_posture_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "indoor swimming pool environment",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text_observation_ids",
      "claim": "card name text visible as 'カスミの元気'",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark_observation_ids",
      "claim": "rarity mark text 'SR' visible in card number text",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "supporter_type_text_observation_ids",
      "claim": "supporter type text 'サポート' visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "trainer_type_text_observation_ids",
      "claim": "trainer type text 'トレーナーズ' visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "card_number_observation_ids",
      "claim": "card number text '108/081' visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "set symbol text 'J M5' visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "copyright text visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_007"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female trainer",
      "identity_confidence": 0.98,
      "anatomy": [
        "arms",
        "face"
      ],
      "physical_features": [
        "orange spiky hair tied ponytail"
      ],
      "pose": [
        "left arm stretched back",
        "right fist raised forward"
      ],
      "orientation": "forward",
      "action_state": [
        "standing"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "smiling",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband",
        "dark blue sleeveless swimsuit"
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
      "obs_clothing_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_posture_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [
      "bench seat",
      "pool lane dividers"
    ],
    "water": [
      "pool water with reflections"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "light blue water",
      "orange",
      "skin tone"
    ],
    "lighting": [
      "bright indoor lighting"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "sparkling water reflections"
    ],
    "composition": [
      "background architectural elements",
      "central subject"
    ],
    "camera_angle": "frontal",
    "framing": "tight crop on trainer centered",
    "cropping": [
      "no significant cropping"
    ],
    "depth": "moderate",
    "motion_cues": [
      "raised fist",
      "stretched arm"
    ],
    "motifs": [
      "sports",
      "water"
    ],
    "repeated_shapes": [
      "triangular hair spikes"
    ],
    "style_cues": [
      "clean lines"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_004",
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
        "fact_hair_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
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
          "face_position": "centered",
          "eyes": "open",
          "mouth": "smiling",
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
          "label": "orange spiky hair tied ponytail",
          "details": [
            "orange",
            "ponytail",
            "spiky"
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
          "label": "raised right fist and stretched left arm",
          "details": [
            "left arm back",
            "right fist forward"
          ],
          "supporting_observation_ids": [
            "obs_posture_001"
          ],
          "confidence": 0.96
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on right wrist",
          "details": [
            "black",
            "right wrist"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.95
        }
      ]
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
            "left arm stretched back",
            "right fist raised forward"
          ],
          "orientation": "forward",
          "action_state": [
            "standing"
          ],
          "supporting_observation_ids": [
            "obs_posture_001"
          ],
          "confidence": 0.96
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
          "garment": "dark blue sleeveless swimsuit",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "dark blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband",
          "details": [
            "black",
            "right wrist"
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
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004"
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
        "obs_environment_004"
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
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_007"
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
        "orange spiky hair ponytail",
        "dark blue swimsuit",
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
      "review_status": "complete",
      "omission_risk": "none",
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
      "category": "expression",
      "label": "smiling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "evidence": {
        "mouth": [
          "smiling"
        ],
        "eyes": [
          "open"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "face visible"
        ],
        "body_language": [
          "left arm stretched back",
          "right fist raised forward"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [
          "standing"
        ],
        "environment": [
          "indoor swimming pool"
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
      "term": "orange spiky hair ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "dark blue swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
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
          "obs_environment_004",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_clothing_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "left arm stretched back",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "left arm stretched back",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "right fist raised forward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right fist raised forward",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_accessory_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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
        "concept": "water",
        "source_observation_ids": [
          "obs_environment_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_environment_004",
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
- Description confidence: `0.98`
- Attribute confidence: `0.98`
- Cost USD: `0.009868`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: curved stadium building, roof truss structure with grid pattern, green leaf emblem, patterned pathway, traffic cones, cluster of trees, blue sky with clouds, colored light bands. Semantic facts: stadium environment, cluster of trees, water scene, blue sky with clouds, colored light bands in sky, six traffic cones. Counts: traffic cones: 6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| curved stadium building | curved stadium building | environment_structure | midground | high | 1 |
| roof truss structure with grid pattern | roof truss structure with grid pattern | environment_structure | midground | medium | 1 |
| green circular emblem with leaf symbol | green leaf emblem | environment_object | midground | medium | 1 |
| pathway with green and gray geometric pattern | patterned pathway | environment_object | foreground | high | 1 |
| orange and white traffic cones | traffic cones | object | foreground | medium | 1 |
| cluster of green trees | cluster of trees | environment_plant | background | medium | 1 |
| small water body | water body | environment_terrain | background | low | 1 |
| blue sky with some white clouds | blue sky with clouds | environment_sky | background | medium | 1 |
| colored light bands in sky | colored light bands | environment_light_effect | background | medium | 1 |
| structure with windows and door beneath emblem | building structure | environment_building | midground | medium | 1 |
| metal fence beside pathway | metal fence | environment_object | foreground | low | 1 |
| stairs leading down near water | stairs near water | environment_object | background | low | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_env_roof_structure_001, obs_env_stadium_structure_001 | 1 |
| fact_env_002 | environment | architecture includes curved building with emblem and roof structure | obs_env_leaf_logo_001, obs_env_roof_structure_001, obs_env_stadium_structure_001 | 1 |
| fact_env_003 | environment | has cluster of green trees near water | obs_env_trees_001 | 1 |
| fact_env_004 | environment | presence of water body beside stadium | obs_env_lake_001 | 1 |
| fact_env_005 | environment | sky is blue with white clouds and colored light bands | obs_env_light_bands_001, obs_env_sky_001 | 1 |
| fact_env_006 | environment | includes patterned pathway and stairs | obs_env_pathway_001, obs_env_stairs_001 | 1 |
| fact_env_007 | environment | orange and white traffic cones near fence | obs_env_fencing_001, obs_obj_traffic_cones_001 | 1 |

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
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium |  |
| counts | complete | low | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | environment | stadium environment |  | obs_env_roof_structure_001, obs_env_stadium_structure_001 | curved stadium building roof truss structure | 1 |
| sem_fact_002 | environment | cluster of trees |  | obs_env_trees_001 | green trees | 1 |
| sem_fact_003 | environment | water scene |  | obs_env_lake_001 | water body | 1 |
| sem_fact_004 | environment | blue sky with clouds |  | obs_env_sky_001 | blue sky white clouds | 1 |
| sem_fact_005 | environment | colored light bands in sky |  | obs_env_light_bands_001 | colored light bands | 1 |
| sem_fact_006 | count_semantic | six traffic cones |  | obs_obj_traffic_cones_001 | traffic cones visible in foreground traffic cones | 1 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| traffic cones | exact | 6 | obs_obj_traffic_cones_001 | 1 |

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
| stadium | obs_env_stadium_structure_001 |
| traffic cones | obs_obj_traffic_cones_001 |
| leaf emblem | obs_env_leaf_logo_001 |
| curved building | obs_env_stadium_structure_001 |
| trees | obs_env_trees_001 |
| water body | obs_env_lake_001 |
| blue sky | obs_env_sky_001 |
| patterned pathway | obs_env_pathway_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora-like light bands | obs_env_light_bands_001 | deterministic_rule | 1 |
| blue sky with clouds | obs_env_sky_001 | deterministic_rule | 1 |
| building | obs_env_stadium_structure_001 | deterministic_rule | 1 |
| building | obs_env_roof_structure_001 | deterministic_rule | 1 |
| building | obs_env_building_001 | deterministic_rule | 1 |
| building | obs_env_lake_001, obs_env_leaf_logo_001, obs_env_light_bands_001, obs_env_pathway_001, obs_env_roof_structure_001, obs_env_sky_001 | deterministic_rule | 0.92 |
| circular motif | obs_env_leaf_logo_001 | deterministic_rule | 1 |
| cloud | obs_env_sky_001 | deterministic_rule | 1 |
| cluster of trees | obs_env_trees_001 | deterministic_rule | 1 |
| colored light bands in sky | obs_env_light_bands_001 | deterministic_rule | 1 |
| downward orientation | obs_env_stairs_001 | deterministic_rule | 1 |
| six traffic cones | obs_obj_traffic_cones_001 | deterministic_rule | 1 |
| sky | obs_env_sky_001 | deterministic_rule | 1 |
| sky | obs_env_light_bands_001 | deterministic_rule | 1 |
| stadium environment | obs_env_roof_structure_001, obs_env_stadium_structure_001 | deterministic_rule | 1 |
| terrain | obs_env_lake_001 | deterministic_rule | 1 |
| tree | obs_env_trees_001 | deterministic_rule | 1 |
| tree | obs_env_lake_001, obs_env_leaf_logo_001, obs_env_light_bands_001, obs_env_pathway_001, obs_env_roof_structure_001, obs_env_sky_001 | deterministic_rule | 0.92 |
| water | obs_env_lake_001 | deterministic_rule | 1 |
| water | obs_env_stairs_001 | deterministic_rule | 1 |
| water | obs_env_lake_001, obs_env_leaf_logo_001, obs_env_light_bands_001, obs_env_pathway_001, obs_env_roof_structure_001, obs_env_sky_001 | deterministic_rule | 0.92 |
| water scene | obs_env_lake_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: curved stadium building, roof truss structure with grid pattern, green leaf emblem, patterned pathway, traffic cones, cluster of trees, blue sky with clouds, colored light bands. Semantic facts: stadium environment, cluster of trees, water scene, blue sky with clouds, colored light bands in sky, six traffic cones. Counts: traffic cones: 6.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `semantic_tags_metadata_or_generic_removed`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_env_stadium_structure_001",
      "kind": "environment_structure",
      "label": "curved stadium building",
      "normalized_label": "curved stadium building",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_roof_structure_001",
      "kind": "environment_structure",
      "label": "roof truss structure with grid pattern",
      "normalized_label": "roof truss structure with grid pattern",
      "scene_layer": "midground",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_leaf_logo_001",
      "kind": "environment_object",
      "label": "green circular emblem with leaf symbol",
      "normalized_label": "green leaf emblem",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_pathway_001",
      "kind": "environment_object",
      "label": "pathway with green and gray geometric pattern",
      "normalized_label": "patterned pathway",
      "scene_layer": "foreground",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_traffic_cones_001",
      "kind": "object",
      "label": "orange and white traffic cones",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_trees_001",
      "kind": "environment_plant",
      "label": "cluster of green trees",
      "normalized_label": "cluster of trees",
      "scene_layer": "background",
      "frame_position": "right-side",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_lake_001",
      "kind": "environment_terrain",
      "label": "small water body",
      "normalized_label": "water body",
      "scene_layer": "background",
      "frame_position": "right-side",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_sky_001",
      "kind": "environment_sky",
      "label": "blue sky with some white clouds",
      "normalized_label": "blue sky with clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_light_bands_001",
      "kind": "environment_light_effect",
      "label": "colored light bands in sky",
      "normalized_label": "colored light bands",
      "scene_layer": "background",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_building_001",
      "kind": "environment_building",
      "label": "structure with windows and door beneath emblem",
      "normalized_label": "building structure",
      "scene_layer": "midground",
      "frame_position": "center-lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_fencing_001",
      "kind": "environment_object",
      "label": "metal fence beside pathway",
      "normalized_label": "metal fence",
      "scene_layer": "foreground",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_stairs_001",
      "kind": "environment_object",
      "label": "stairs leading down near water",
      "normalized_label": "stairs near water",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "stadium environment with a curved building and roof truss",
      "supporting_observation_ids": [
        "obs_env_roof_structure_001",
        "obs_env_stadium_structure_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "architecture",
      "claim": "architecture includes curved building with emblem and roof structure",
      "value": "curved stadium building with truss roof",
      "supporting_observation_ids": [
        "obs_env_leaf_logo_001",
        "obs_env_roof_structure_001",
        "obs_env_stadium_structure_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "has cluster of green trees near water",
      "value": "trees",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "water",
      "claim": "presence of water body beside stadium",
      "value": "water body",
      "supporting_observation_ids": [
        "obs_env_lake_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky is blue with white clouds and colored light bands",
      "value": "blue sky with clouds and colored light bands",
      "supporting_observation_ids": [
        "obs_env_light_bands_001",
        "obs_env_sky_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "terrain",
      "claim": "includes patterned pathway and stairs",
      "value": "pathway with geometric pattern and stairs",
      "supporting_observation_ids": [
        "obs_env_pathway_001",
        "obs_env_stairs_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "orange and white traffic cones near fence",
      "value": "traffic cones",
      "supporting_observation_ids": [
        "obs_env_fencing_001",
        "obs_obj_traffic_cones_001"
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
      "exact_count": 6,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_obj_traffic_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_env_fencing_001",
      "obs_env_pathway_001",
      "obs_obj_traffic_cones_001"
    ],
    "midground": [
      "obs_env_building_001",
      "obs_env_leaf_logo_001",
      "obs_env_roof_structure_001",
      "obs_env_stadium_structure_001"
    ],
    "background": [
      "obs_env_lake_001",
      "obs_env_light_bands_001",
      "obs_env_sky_001",
      "obs_env_stairs_001",
      "obs_env_trees_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium environment"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "colored light bands",
      "white clouds"
    ],
    "ground": [
      "patterned pathway",
      "stairs"
    ],
    "terrain": [],
    "plants": [
      "cluster of trees"
    ],
    "architecture": [
      "building with windows and door",
      "curved stadium building",
      "green leaf emblem",
      "roof truss structure"
    ],
    "water": [
      "small water body"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_building_001",
      "obs_env_fencing_001",
      "obs_env_lake_001",
      "obs_env_leaf_logo_001",
      "obs_env_light_bands_001",
      "obs_env_pathway_001",
      "obs_env_roof_structure_001",
      "obs_env_sky_001",
      "obs_env_stadium_structure_001",
      "obs_env_stairs_001",
      "obs_env_trees_001",
      "obs_obj_traffic_cones_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_traffic_cones_001",
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
      "location": "foreground near pathway and fence",
      "count_reference": "count_traffic_cones_001",
      "confidence": 1
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
      "bright daylight"
    ],
    "shadows": [
      "some soft shadows"
    ],
    "highlights": [
      "emblem highlights",
      "roof structure highlights"
    ],
    "composition": [
      "background trees and water",
      "foreground pathway leading to midground stadium structure"
    ],
    "camera_angle": "eye-level",
    "framing": "slightly off-center to stadium building",
    "cropping": [],
    "depth": "moderate depth with foreground, midground, background layers",
    "motion_cues": [],
    "motifs": [
      "geometric patterned pathway",
      "green leaf emblem"
    ],
    "repeated_shapes": [
      "orange and white cones",
      "rectangular windows"
    ],
    "style_cues": [
      "realistic illustration style"
    ],
    "supporting_observation_ids": [
      "obs_env_lake_001",
      "obs_env_leaf_logo_001",
      "obs_env_light_bands_001",
      "obs_env_pathway_001",
      "obs_env_roof_structure_001",
      "obs_env_sky_001",
      "obs_env_stadium_structure_001",
      "obs_env_trees_001",
      "obs_obj_traffic_cones_001"
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
        "fact_env_007"
      ],
      "object_observation_ids": [
        "obs_obj_traffic_cones_001"
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
        "obs_env_building_001",
        "obs_env_fencing_001",
        "obs_env_lake_001",
        "obs_env_leaf_logo_001",
        "obs_env_light_bands_001",
        "obs_env_pathway_001",
        "obs_env_roof_structure_001",
        "obs_env_sky_001",
        "obs_env_stadium_structure_001",
        "obs_env_stairs_001",
        "obs_env_trees_001",
        "obs_obj_traffic_cones_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_pathway_001",
        "obs_env_stadium_structure_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_light_bands_001",
        "obs_env_sky_001"
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
        "traffic cones",
        "leaf emblem",
        "curved building",
        "trees",
        "water body",
        "blue sky",
        "patterned pathway"
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
      "review_status": "partial_due_to_low_resolution",
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001",
      "category": "environment",
      "label": "stadium environment",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_roof_structure_001",
        "obs_env_stadium_structure_001"
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
          "curved stadium building",
          "roof truss structure"
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
      "label": "cluster of trees",
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
          "green trees"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_003",
      "category": "environment",
      "label": "water scene",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_lake_001"
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
      "semantic_fact_id": "sem_fact_004",
      "category": "environment",
      "label": "blue sky with clouds",
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
          "blue sky",
          "white clouds"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_005",
      "category": "environment",
      "label": "colored light bands in sky",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_light_bands_001"
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
          "colored light bands"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_006",
      "category": "count_semantic",
      "label": "six traffic cones",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_obj_traffic_cones_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [
          "traffic cones visible in foreground"
        ],
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
      "term": "stadium",
      "supporting_observation_ids": [
        "obs_env_stadium_structure_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_obj_traffic_cones_001"
      ]
    },
    {
      "term": "leaf emblem",
      "supporting_observation_ids": [
        "obs_env_leaf_logo_001"
      ]
    },
    {
      "term": "curved building",
      "supporting_observation_ids": [
        "obs_env_stadium_structure_001"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ]
    },
    {
      "term": "water body",
      "supporting_observation_ids": [
        "obs_env_lake_001"
      ]
    },
    {
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_env_sky_001"
      ]
    },
    {
      "term": "patterned pathway",
      "supporting_observation_ids": [
        "obs_env_pathway_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_env_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "blue sky with clouds",
        "source_observation_ids": [
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_env_stadium_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_env_roof_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_env_building_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_env_lake_001",
          "obs_env_leaf_logo_001",
          "obs_env_light_bands_001",
          "obs_env_pathway_001",
          "obs_env_roof_structure_001",
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_env_leaf_logo_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "cluster of trees",
        "source_observation_ids": [
          "obs_env_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "colored light bands in sky",
        "source_observation_ids": [
          "obs_env_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "downward orientation",
        "source_observation_ids": [
          "obs_env_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "six traffic cones",
        "source_observation_ids": [
          "obs_obj_traffic_cones_001"
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
        "concept": "sky",
        "source_observation_ids": [
          "obs_env_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "stadium environment",
        "source_observation_ids": [
          "obs_env_roof_structure_001",
          "obs_env_stadium_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_env_lake_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_env_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_env_lake_001",
          "obs_env_leaf_logo_001",
          "obs_env_light_bands_001",
          "obs_env_pathway_001",
          "obs_env_roof_structure_001",
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_env_lake_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_env_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_env_lake_001",
          "obs_env_leaf_logo_001",
          "obs_env_light_bands_001",
          "obs_env_pathway_001",
          "obs_env_roof_structure_001",
          "obs_env_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "water scene",
        "source_observation_ids": [
          "obs_env_lake_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
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
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0087676`
- Artwork observations: `8`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: dark bell, bell body, bell handle, polygonal facets, sphere inside bell, black, white highlight, swirling purple blue background. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Dark Bell object | dark bell | object | foreground | high | 0.99 |
| bell body | bell body | object | foreground | high | 0.95 |
| bell handle | bell handle | object | foreground | high | 0.95 |
| polygonal facets on bell | polygonal facets | object | foreground | medium | 0.9 |
| circular sphere inside bell | sphere inside bell | object | foreground | medium | 0.9 |
| black | black | color | foreground | high | 0.99 |
| white highlights | white highlight | color | foreground | medium | 0.95 |
| swirling purple and blue background | swirling purple blue background | environment | background | high | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text dark bell name | card_ui_text | top left | visible | 0.95 |
| Japanese text goods header top left | card_ui_text | top left | visible | 0.9 |
| Japanese text trainers header top right | card_ui_text | top right | visible | 0.9 |
| Japanese text main effect text | card_ui_text | center below illustration | visible | 0.95 |
| card illustrator text Toysto Beach | card_ui_text | bottom left | visible | 0.95 |
| card number 105/081 SR | card_ui_text | bottom left | visible | 0.95 |
| copyright Pokémon/Nintendo/Creatures/GAME FREAK | card_ui_text | bottom center | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | object is a bell-shaped item | obs_object_001 | 0.99 |
| fact_obj_002 | objects_and_props | object color is primarily black | obs_color_001, obs_object_001 | 0.99 |
| fact_obj_003 | objects_and_props | object has polygonal facets on bell body | obs_object_part_003 | 0.9 |
| fact_obj_004 | objects_and_props | object has a circular sphere inside bell | obs_object_part_004 | 0.9 |
| fact_env_001 | environment | background is swirling purple and blue | obs_background_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | card name text is Japanese for Dark Bell | obs_text_001 | 0.95 |
| fact_ui_002 | header text in Japanese 'Goods' | obs_text_002 | 0.9 |
| fact_ui_003 | header text in Japanese 'Trainers' | obs_text_003 | 0.9 |
| fact_ui_004 | copyright line visible | obs_text_007 | 0.95 |
| fact_ui_005 | collector number is 105/081 SR | obs_text_006 | 0.95 |
| fact_ui_006 | illustrator text is 'Illus. Toysto Beach' | obs_text_005 | 0.95 |

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
    "obs_text_001"
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
    "obs_text_007"
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
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

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
| bell shaped object | obs_object_001 |
| black bell | obs_color_001 |
| swirling purple background | obs_background_001 |
| polygonal facets | obs_object_part_003 |
| circular sphere inside bell | obs_object_part_004 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_background_001, obs_object_001 | deterministic_rule | 0.92 |
| circular motif | obs_object_part_004 | deterministic_rule | 0.9 |
| circular motif | obs_background_001, obs_object_001 | deterministic_rule | 0.92 |
| spiral motif | obs_background_001 | deterministic_rule | 0.99 |
| spiral motif | obs_background_001, obs_object_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, bell body, bell handle, polygonal facets, sphere inside bell, black, white highlight, swirling purple blue background. Counts: dark bell: 1.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "Dark Bell object",
      "normalized_label": "dark bell",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_part_001",
      "kind": "object",
      "label": "bell body",
      "normalized_label": "bell body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_part_002",
      "kind": "object",
      "label": "bell handle",
      "normalized_label": "bell handle",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_part_003",
      "kind": "object",
      "label": "polygonal facets on bell",
      "normalized_label": "polygonal facets",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_part_004",
      "kind": "object",
      "label": "circular sphere inside bell",
      "normalized_label": "sphere inside bell",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color",
      "label": "white highlights",
      "normalized_label": "white highlight",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "swirling purple and blue background",
      "normalized_label": "swirling purple blue background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_001",
      "kind": "card_ui_text",
      "label": "Japanese text dark bell name",
      "normalized_label": "dark bell name text",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_002",
      "kind": "card_ui_text",
      "label": "Japanese text goods header top left",
      "normalized_label": "goods header text",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_003",
      "kind": "card_ui_text",
      "label": "Japanese text trainers header top right",
      "normalized_label": "trainers header text",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_004",
      "kind": "card_ui_text",
      "label": "Japanese text main effect text",
      "normalized_label": "effect text",
      "scene_layer": "card_ui",
      "frame_position": "center below illustration",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_005",
      "kind": "card_ui_text",
      "label": "card illustrator text Toysto Beach",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_006",
      "kind": "card_ui_text",
      "label": "card number 105/081 SR",
      "normalized_label": "card number and rarity text",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_007",
      "kind": "card_ui_text",
      "label": "copyright Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].label",
      "claim": "object is a bell-shaped item",
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
      "field_path": "objects_and_props[0].colors",
      "claim": "object color is primarily black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_color_001",
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].visible_parts",
      "claim": "object has polygonal facets on bell body",
      "value": "polygonal facets",
      "supporting_observation_ids": [
        "obs_object_part_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_004",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].visible_parts",
      "claim": "object has a circular sphere inside bell",
      "value": "circular sphere inside",
      "supporting_observation_ids": [
        "obs_object_part_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "environment.setting",
      "claim": "background is swirling purple and blue",
      "value": "swirling purple blue background",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "card name text is Japanese for Dark Bell",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "header text in Japanese 'Goods'",
      "value": "グッズ",
      "supporting_observation_ids": [
        "obs_text_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "header text in Japanese 'Trainers'",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_text_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "copyright line visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_text_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number is 105/081 SR",
      "value": "105/081 SR",
      "supporting_observation_ids": [
        "obs_text_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text is 'Illus. Toysto Beach'",
      "value": "Toysto Beach",
      "supporting_observation_ids": [
        "obs_text_005"
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
      "obs_color_001",
      "obs_color_002",
      "obs_object_001",
      "obs_object_part_001",
      "obs_object_part_002",
      "obs_object_part_003",
      "obs_object_part_004"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "swirling purple blue background"
    ],
    "indoor_outdoor": "",
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
      "label": "dark bell",
      "normalized_label": "dark bell",
      "object_type": "tool-like object",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "dark rounded surface",
        "white highlights"
      ],
      "location": "center",
      "count_reference": "count_obj_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "purple",
      "white"
    ],
    "lighting": [
      "white highlights"
    ],
    "shadows": [],
    "highlights": [
      "white highlights"
    ],
    "composition": [
      "centered object",
      "swirling background"
    ],
    "camera_angle": "frontal angled top-down",
    "framing": "center framing",
    "cropping": [],
    "depth": "medium depth",
    "motion_cues": [
      "swirling background swirl pattern"
    ],
    "motifs": [
      "circular sphere motif",
      "polygonal facet motif"
    ],
    "repeated_shapes": [
      "polygonal facets"
    ],
    "style_cues": [
      "illustration"
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
        "fact_obj_001",
        "fact_obj_002",
        "fact_obj_003",
        "fact_obj_004"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_part_001",
        "obs_object_part_002",
        "obs_object_part_003",
        "obs_object_part_004"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001"
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
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005",
        "fact_ui_006"
      ],
      "name_text_observation_ids": [
        "obs_text_001"
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
        "obs_text_007"
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
        "dark bell",
        "bell shaped object",
        "black bell",
        "swirling purple background",
        "polygonal facets",
        "circular sphere inside bell"
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
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "bell shaped object",
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
      "term": "swirling purple background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "polygonal facets",
      "supporting_observation_ids": [
        "obs_object_part_003"
      ]
    },
    {
      "term": "circular sphere inside bell",
      "supporting_observation_ids": [
        "obs_object_part_004"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_background_001",
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_part_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_background_001",
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_001",
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

