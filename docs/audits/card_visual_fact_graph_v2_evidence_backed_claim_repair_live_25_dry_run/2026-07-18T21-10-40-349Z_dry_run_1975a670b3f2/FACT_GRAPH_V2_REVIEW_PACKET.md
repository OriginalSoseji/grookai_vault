# Card Visual Fact Graph V2 Review Packet

Generated rows: 22
Validation failures: 3
Skipped images: 0
Estimated cost USD: 0.2430256

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.93`
- Cost USD: `0.0102216`
- Artwork observations: `9`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: central spherical glass body, black chandelier arms, purple flames, long curled tail, black tendrils upward, face on body sphere, dark purple black gradient background. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | dominant | 0.99 |
| body | body | creature_anatomy | foreground | dominant | 0.98 |
| central spherical glass body | central spherical glass body | creature_anatomy | foreground | high | 0.97 |
| black chandelier arms | black chandelier arms | creature_anatomy | foreground | high | 0.96 |
| purple flames on arms and upper body | purple flames | creature_anatomy | foreground | high | 0.96 |
| long curled tail visible | long curled tail | creature_anatomy | foreground | high | 0.96 |
| black tendrils extending upward | black tendrils upward | creature_anatomy | foreground | medium | 0.95 |
| face with outlined eyes and mouth on body sphere | face on body sphere | creature_anatomy | foreground | high | 0.98 |
| dark purple to black gradient background with sparkles | dark purple black gradient background | visual_effects | background | medium | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| name text | card_ui_text | top | visible | 0.95 |
| HP text '350' | card_ui_text | top_right | visible | 0.97 |
| Psychic type symbol | card_ui_symbol | top_left | visible | 0.98 |
| Japanese name text 'メガシャンデラex' | card_ui_text | top | visible | 0.95 |
| set symbol 'M5' | set_symbol | bottom_left | visible | 0.95 |
| collector number '113/081' | collector_number | bottom_left | visible | 0.95 |
| illustrator text in Japanese | illustrator_text | bottom_right | visible | 0.9 |
| evolution symbol - from Chandelure | card_ui_symbol | upper_left | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subj_001 | subjects | Mega Chandelure as scene subject | obs_subj_001 | 0.99 |
| fact_ca_body_001 | creature_anatomy | body includes central spherical glass body | obs_creature_anatomy_002 | 0.97 |
| fact_ca_arms_001 | creature_anatomy | arms appear as black chandelier arms | obs_creature_anatomy_003 | 0.96 |
| fact_ca_flames_001 | creature_anatomy | purple flames visible on arms and upper body | obs_creature_anatomy_004 | 0.96 |
| fact_ca_tail_001 | creature_anatomy | long curled tail visible | obs_creature_anatomy_005 | 0.96 |
| fact_ca_tendrils_001 | creature_anatomy | black tendrils extend upwards from body | obs_creature_anatomy_006 | 0.95 |
| fact_ca_face_001 | creature_anatomy | face with outlined eyes and mouth visible on central body sphere | obs_creature_anatomy_007 | 0.98 |
| fact_env_001 | environment | dark purple to black gradient background with sparkles | obs_visual_design_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_cardui_name_001 | card name text is 'メガシャンデラex' in Japanese | obs_ui_name_001, obs_ui_name_jp_001 | 0.95 |
| fact_cardui_hp_001 | HP text of 350 visible | obs_ui_hp_001 | 0.97 |
| fact_cardui_type_001 | Psychic type symbol visible | obs_ui_type_001 | 0.98 |
| fact_cardui_set_001 | set symbol 'M5' visible | obs_ui_set_001 | 0.95 |
| fact_cardui_number_001 | collector number '113/081' visible | obs_ui_number_001 | 0.95 |
| fact_cardui_illustrator_001 | illustrator text visible in Japanese | obs_ui_illustrator_001 | 0.9 |
| fact_cardui_evolution_001 | evolution symbol from Chandelure visible | obs_ui_type_generic_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_cardui_evolution_001",
    "fact_cardui_hp_001",
    "fact_cardui_illustrator_001",
    "fact_cardui_name_001",
    "fact_cardui_number_001",
    "fact_cardui_set_001",
    "fact_cardui_type_001"
  ],
  "name_text_observation_ids": [
    "obs_ui_name_001",
    "obs_ui_name_jp_001"
  ],
  "hp_text_observation_ids": [
    "obs_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_ui_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_ui_set_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_ui_illustrator_001"
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
| composition | partial_due_to_crop | low | medium |  |
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
| semfact_001 | state | floating | obs_subj_001 | obs_subj_001 | arms raised slightly hovering body floating in air static | 0.95 |

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
| central spherical glass body | obs_creature_anatomy_002 |
| black chandelier arms | obs_creature_anatomy_003 |
| purple flames | obs_creature_anatomy_004 |
| long curled tail | obs_creature_anatomy_005 |
| black tendrils upward | obs_creature_anatomy_006 |
| face on body sphere | obs_creature_anatomy_007 |
| dark purple black gradient background | obs_visual_design_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_creature_anatomy_002 | deterministic_rule | 0.97 |
| flame | obs_creature_anatomy_004 | deterministic_rule | 0.96 |
| floating | obs_subj_001 | deterministic_rule | 0.99 |
| forward orientation | obs_subj_001 | deterministic_rule | 0.99 |
| upright | obs_subj_001 | deterministic_rule | 0.99 |
| upward orientation | obs_creature_anatomy_006 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: central spherical glass body, black chandelier arms, purple flames, long curled tail, black tendrils upward, face on body sphere, dark purple black gradient background. Semantic facts: floating.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subj_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure",
      "normalized_label": "mega chandelure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "dominant",
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
      "salience": "dominant",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "central spherical glass body",
      "normalized_label": "central spherical glass body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "black chandelier arms",
      "normalized_label": "black chandelier arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "purple flames on arms and upper body",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "long curled tail visible",
      "normalized_label": "long curled tail",
      "scene_layer": "foreground",
      "frame_position": "lower_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "black tendrils extending upward",
      "normalized_label": "black tendrils upward",
      "scene_layer": "foreground",
      "frame_position": "upper_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "face with outlined eyes and mouth on body sphere",
      "normalized_label": "face on body sphere",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "visual_effects",
      "label": "dark purple to black gradient background with sparkles",
      "normalized_label": "dark purple black gradient background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_name_001",
      "kind": "card_ui_text",
      "label": "name text",
      "normalized_label": "name_text",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP text '350'",
      "normalized_label": "hp_text_350",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "Psychic type symbol",
      "normalized_label": "psychic_type_symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_name_jp_001",
      "kind": "card_ui_text",
      "label": "Japanese name text 'メガシャンデラex'",
      "normalized_label": "name_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_set_001",
      "kind": "set_symbol",
      "label": "set symbol 'M5'",
      "normalized_label": "set_symbol_m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_number_001",
      "kind": "collector_number",
      "label": "collector number '113/081'",
      "normalized_label": "collector_number_113_of_081",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text in Japanese",
      "normalized_label": "illustrator_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "bottom_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_type_generic_001",
      "kind": "card_ui_symbol",
      "label": "evolution symbol - from Chandelure",
      "normalized_label": "evolution_symbol_from_chandelure",
      "scene_layer": "card_ui",
      "frame_position": "upper_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subj_001",
      "module": "subjects",
      "field_path": "subject_identity",
      "claim": "Mega Chandelure as scene subject",
      "value": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subj_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_body_001",
      "module": "creature_anatomy",
      "field_path": "body_main_component",
      "claim": "body includes central spherical glass body",
      "value": "central spherical glass body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_arms_001",
      "module": "creature_anatomy",
      "field_path": "arms_structure",
      "claim": "arms appear as black chandelier arms",
      "value": "black chandelier arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_flames_001",
      "module": "creature_anatomy",
      "field_path": "flames_on_body",
      "claim": "purple flames visible on arms and upper body",
      "value": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_tail_001",
      "module": "creature_anatomy",
      "field_path": "tail",
      "claim": "long curled tail visible",
      "value": "long curled tail",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_tendrils_001",
      "module": "creature_anatomy",
      "field_path": "tendrils",
      "claim": "black tendrils extend upwards from body",
      "value": "black tendrils",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_face_001",
      "module": "creature_anatomy",
      "field_path": "face_position_and_features",
      "claim": "face with outlined eyes and mouth visible on central body sphere",
      "value": "face on body sphere",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "background",
      "claim": "dark purple to black gradient background with sparkles",
      "value": "dark purple black gradient background",
      "supporting_observation_ids": [
        "obs_visual_design_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is 'メガシャンデラex' in Japanese",
      "value": "メガシャンデラex",
      "supporting_observation_ids": [
        "obs_ui_name_001",
        "obs_ui_name_jp_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text of 350 visible",
      "value": "350",
      "supporting_observation_ids": [
        "obs_ui_hp_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "type_symbol",
      "claim": "Psychic type symbol visible",
      "value": "psychic",
      "supporting_observation_ids": [
        "obs_ui_type_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_set_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol 'M5' visible",
      "value": "M5",
      "supporting_observation_ids": [
        "obs_ui_set_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number '113/081' visible",
      "value": "113/081",
      "supporting_observation_ids": [
        "obs_ui_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible in Japanese",
      "value": "illustrator text Japanese",
      "supporting_observation_ids": [
        "obs_ui_illustrator_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_evolution_001",
      "module": "card_ui_and_print_markers",
      "field_path": "evolution_symbol",
      "claim": "evolution symbol from Chandelure visible",
      "value": "evolution from Chandelure",
      "supporting_observation_ids": [
        "obs_ui_type_generic_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subj_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Chandelure",
      "identity_confidence": 0.99,
      "anatomy": [
        "black chandelier arms",
        "black tendrils upward",
        "body",
        "central spherical glass body",
        "face on sphere",
        "long curled tail",
        "purple flames"
      ],
      "physical_features": [
        "black chandelier arms",
        "long curled tail",
        "purple flames on body"
      ],
      "pose": [
        "floating",
        "upright"
      ],
      "orientation": "forward",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "outlined eyes",
        "mouth": "outlined mouth",
        "eyebrows": "not visible",
        "face_position": "on central body sphere",
        "other_visible_evidence": []
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
      "obs_subj_001"
    ],
    "midground": [],
    "background": [
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
      "obs_visual_design_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark gray",
      "purple"
    ],
    "lighting": [
      "glowing flames",
      "highlight on glass sphere",
      "soft"
    ],
    "shadows": [
      "soft shadows on body"
    ],
    "highlights": [
      "bright highlights on glass sphere"
    ],
    "composition": [
      "central subject focus",
      "diagonal lines from arms and tendrils"
    ],
    "camera_angle": "frontal",
    "framing": "centered",
    "cropping": [],
    "depth": "moderate depth with foreground subject distinct from background",
    "motion_cues": [],
    "motifs": [
      "elegant chandelier motif",
      "purple flames motif"
    ],
    "repeated_shapes": [
      "curled tendrils",
      "spherical body"
    ],
    "style_cues": [
      "digital art"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
      "obs_subj_001",
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
        "fact_subj_001"
      ],
      "scene_subject_observation_ids": [
        "obs_subj_001"
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
        "fact_ca_arms_001",
        "fact_ca_body_001",
        "fact_ca_face_001",
        "fact_ca_flames_001",
        "fact_ca_tail_001",
        "fact_ca_tendrils_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subj_001",
          "region": "body",
          "feature": "central spherical glass body",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "glass appearance with black face markings"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002",
            "obs_creature_anatomy_007"
          ],
          "confidence": 0.97
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subj_001",
          "region": "arms",
          "feature": "black chandelier arms",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "chandelier style arms"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subj_001",
          "region": "body",
          "feature": "purple flames",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "flames on arms and upper body"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subj_001",
          "region": "tail",
          "feature": "long curled tail",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "curled tail visible"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subj_001",
          "region": "head area",
          "feature": "black tendrils extending upward",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [
            "tendrils extending from body"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subj_001",
          "pose": [
            "floating",
            "upright"
          ],
          "orientation": "forward",
          "action_state": [
            "static"
          ],
          "supporting_observation_ids": [
            "obs_subj_001"
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
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_visual_design_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_cardui_evolution_001",
        "fact_cardui_hp_001",
        "fact_cardui_illustrator_001",
        "fact_cardui_name_001",
        "fact_cardui_number_001",
        "fact_cardui_set_001",
        "fact_cardui_type_001"
      ],
      "name_text_observation_ids": [
        "obs_ui_name_001",
        "obs_ui_name_jp_001"
      ],
      "hp_text_observation_ids": [
        "obs_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_ui_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_ui_set_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_ui_illustrator_001"
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
        "central spherical glass body",
        "black chandelier arms",
        "purple flames",
        "long curled tail",
        "black tendrils upward",
        "face on body sphere",
        "dark purple black gradient background"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "semantic_fact_id": "semfact_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subj_001",
      "supporting_observation_ids": [
        "obs_subj_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "arms raised slightly",
          "hovering body"
        ],
        "body_position": [
          "floating in air"
        ],
        "motion_state": [
          "static"
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
      "term": "central spherical glass body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    },
    {
      "term": "black chandelier arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "long curled tail",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "black tendrils upward",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ]
    },
    {
      "term": "face on body sphere",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ]
    },
    {
      "term": "dark purple black gradient background",
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
          "obs_creature_anatomy_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_subj_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subj_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upright",
        "source_observation_ids": [
          "obs_subj_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upward orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_006"
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
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0106748`
- Artwork observations: `10`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating, mandala-like background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary subject | 0.99 |
| creature body with spike-like appendages around neck | body with spike-like appendages | creature_anatomy | foreground | primary anatomy | 0.98 |
| large head spike extending upwards | large head spike | creature_anatomy | foreground | primary anatomy | 0.97 |
| arms floating outward, not touching ground | floating arms | creature_anatomy | foreground | pose | 0.96 |
| body floating upright in mid-air | floating upright | creature_anatomy | foreground | pose | 0.95 |
| predominantly gold and yellow tones throughout artwork | gold and yellow palette | color_and_light | foreground | dominant color scheme | 0.99 |
| intricate golden patterned background resembling mandala or sunburst | intricate golden patterned background | environment | background | background | 0.99 |
| shadow details showing eyes are closed or not visible | eyes not visible | creature_anatomy | foreground | face | 0.9 |
| mouth not visibly open or smiling | mouth neutral or not visible | creature_anatomy | foreground | face | 0.9 |
| floating pose with arms extended sideways | floating with extended arms | creature_anatomy | foreground | pose | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガダークライex (Mega Darkrai ex) | card_name_text | top | visible | 0.99 |
| HP 280 | hp_text | top right | visible | 0.99 |
| Dark type symbol (crescent moon-like) | card_ui_symbol | top right | visible | 0.98 |
| 118/081 | collector_number | bottom left | visible | 0.99 |
| jpn-m5 (Abyss Eye set) symbol | set_symbol | bottom left | visible | 0.99 |
| Illus. 5ban Graphics | illustrator_text | bottom left | visible | 0.99 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | copyright_text | bottom | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject is Mega Darkrai | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | Mega Darkrai has spike-like appendages around neck | obs_creature_anatomy_001 | 0.98 |
| fact_003 | creature_anatomy | Mega Darkrai is floating upright | obs_creature_anatomy_004, obs_creature_anatomy_005, obs_creature_anatomy_006, obs_pose_001 | 0.95 |
| fact_004 | creature_anatomy | Mega Darkrai has a large head spike extending upwards | obs_creature_anatomy_002 | 0.97 |
| fact_005 | color_and_light | Artwork predominantly shows gold and yellow tones | obs_color_001 | 0.99 |
| fact_006 | environment | Background has intricate golden mandala or sunburst pattern | obs_environment_001 | 0.99 |
| fact_007 | creature_anatomy | Mega Darkrai's eyes not visible or closed | obs_creature_anatomy_005 | 0.9 |
| fact_008 | creature_anatomy | Mega Darkrai's mouth is neutral or not visible | obs_creature_anatomy_006 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_009 | Card name text is 'メガダークライex' (Mega Darkrai ex) | obs_card_ui_001 | 0.99 |
| fact_010 | HP text is 280 | obs_card_ui_002 | 0.99 |
| fact_011 | Dark type energy symbol is visible | obs_card_ui_003 | 0.98 |
| fact_012 | Collector number is 118/081 | obs_card_ui_004 | 0.99 |
| fact_013 | Set symbol is jpn-m5 (Abyss Eye) | obs_card_ui_005 | 0.99 |
| fact_014 | Illustrator is 5ban Graphics | obs_card_ui_006 | 0.99 |
| fact_015 | Copyright line is visible | obs_card_ui_007 | 0.99 |

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
  "copyright_line_observation_ids": [
    "obs_card_ui_007"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
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
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_003 | action | floating | obs_subject_001 | obs_creature_anatomy_004, obs_pose_001 | arms extended sideways floating upright floating | 0.95 |
| sem_004 | environment | mandala-like background |  | obs_environment_001 | intricate golden mandala background | 0.99 |

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
| floating pose | obs_creature_anatomy_004, obs_pose_001 |
| golden color palette | obs_color_001 |
| mandala background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| floating | obs_creature_anatomy_003, obs_creature_anatomy_004, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| mandala-like background | obs_environment_001 | deterministic_rule | 0.99 |
| reaching | obs_creature_anatomy_004, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| upright orientation | obs_creature_anatomy_004, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating, mandala-like background.
- Quality flags: `potential_object_material_or_card_surface_confusion`, `potential_visual_material_vs_surface_confusion`
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
      "salience": "primary subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "creature body with spike-like appendages around neck",
      "normalized_label": "body with spike-like appendages",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary anatomy",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "large head spike extending upwards",
      "normalized_label": "large head spike",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary anatomy",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "arms floating outward, not touching ground",
      "normalized_label": "floating arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "pose",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "body floating upright in mid-air",
      "normalized_label": "floating upright",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "pose",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color_and_light",
      "label": "predominantly gold and yellow tones throughout artwork",
      "normalized_label": "gold and yellow palette",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "dominant color scheme",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "intricate golden patterned background resembling mandala or sunburst",
      "normalized_label": "intricate golden patterned background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "shadow details showing eyes are closed or not visible",
      "normalized_label": "eyes not visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "face",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "mouth not visibly open or smiling",
      "normalized_label": "mouth neutral or not visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "face",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "floating pose with arms extended sideways",
      "normalized_label": "floating with extended arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "pose",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_name_text",
      "label": "メガダークライex (Mega Darkrai ex)",
      "normalized_label": "Mega Darkrai ex",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "card name text",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 280",
      "normalized_label": "HP 280",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "HP text",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "Dark type symbol (crescent moon-like)",
      "normalized_label": "dark type symbol",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "energy/type symbol",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "collector_number",
      "label": "118/081",
      "normalized_label": "collector number 118/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "collector number",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "set_symbol",
      "label": "jpn-m5 (Abyss Eye set) symbol",
      "normalized_label": "Abyss Eye set symbol",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "set symbol",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "illustrator_text",
      "label": "Illus. 5ban Graphics",
      "normalized_label": "illustrator 5ban Graphics",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "illustrator text",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "copyright line",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0].identity",
      "claim": "scene subject is Mega Darkrai",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "[0].body_components.spikes_around_neck",
      "claim": "Mega Darkrai has spike-like appendages around neck",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "[0].pose.orientation",
      "claim": "Mega Darkrai is floating upright",
      "value": "floating upright",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005",
        "obs_creature_anatomy_006",
        "obs_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "[0].head_spike",
      "claim": "Mega Darkrai has a large head spike extending upwards",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "Artwork predominantly shows gold and yellow tones",
      "value": "gold and yellow palette",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "environment",
      "field_path": "background_pattern",
      "claim": "Background has intricate golden mandala or sunburst pattern",
      "value": "intricate golden patterned background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "face.eyes",
      "claim": "Mega Darkrai's eyes not visible or closed",
      "value": "not visible/closed",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_008",
      "module": "creature_anatomy",
      "field_path": "face.mouth",
      "claim": "Mega Darkrai's mouth is neutral or not visible",
      "value": "neutral/not visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "Card name text is 'メガダークライex' (Mega Darkrai ex)",
      "value": "メガダークライex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text is 280",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Dark type energy symbol is visible",
      "value": "dark",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number is 118/081",
      "value": "118/081",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol is jpn-m5 (Abyss Eye)",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator is 5ban Graphics",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "Copyright line is visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_007"
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
        "arms floating outward, not touching ground",
        "creature body with spike-like appendages around neck",
        "large head spike extending upwards"
      ],
      "physical_features": [
        "floating upright"
      ],
      "pose": [
        "floating",
        "reaching"
      ],
      "orientation": "upright",
      "action_state": [
        "floating"
      ],
      "facial_evidence": {
        "eyes": "not visible or closed",
        "mouth": "neutral or not visible",
        "eyebrows": "not visible",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "bright yellow",
        "golden yellow"
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
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
      "gold",
      "yellow"
    ],
    "lighting": [
      "bright highlight",
      "even lighting"
    ],
    "shadows": [
      "minimal shadows"
    ],
    "highlights": [
      "golden highlights"
    ],
    "composition": [
      "centered subject",
      "symmetrical background"
    ],
    "camera_angle": "front-facing",
    "framing": "tight centered",
    "cropping": [],
    "depth": "shallow depth with subject",
    "motion_cues": [
      "floating arm pose"
    ],
    "motifs": [
      "mandala-like background pattern"
    ],
    "repeated_shapes": [
      "spike shapes around neck"
    ],
    "style_cues": [
      "glossy finish",
      "sealed card effects",
      "stylized artwork"
    ],
    "supporting_observation_ids": [
      "obs_color_001",
      "obs_environment_001",
      "obs_pose_001"
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
      "fact_ids": [
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_007",
        "fact_008"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "neck",
          "feature": "spike-like appendages",
          "visibility": "visible",
          "colors": [
            "gold",
            "yellow"
          ],
          "details": [
            "sharp pointed shapes"
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
          "region": "pose",
          "feature": "floating upright",
          "visibility": "visible",
          "colors": [],
          "details": [
            "arms extended sideways, not touching ground"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004",
            "obs_pose_001"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "reaching",
            "floating"
          ],
          "orientation": "upright",
          "action_state": [
            "floating"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004",
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
        "fact_006"
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
        "fact_005"
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
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015"
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
      "copyright_line_observation_ids": [
        "obs_card_ui_007"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
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
      "fact_ids": [],
      "terms": [
        "floating pose",
        "golden color palette",
        "mandala background"
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_003",
      "category": "action",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "arms extended sideways"
        ],
        "body_position": [
          "floating upright"
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
      "semantic_fact_id": "sem_004",
      "category": "environment",
      "label": "mandala-like background",
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
          "intricate golden mandala background"
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
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_pose_001"
      ]
    },
    {
      "term": "golden color palette",
      "supporting_observation_ids": [
        "obs_color_001"
      ]
    },
    {
      "term": "mandala background",
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
          "obs_creature_anatomy_003",
          "obs_creature_anatomy_004",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "mandala-like background",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
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

### GV-PK-JPN-M5-112 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.93`
- Cost USD: `0.011826`
- Artwork observations: `15`
- Card UI / print-marker observations: `11`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, blue black yellow white fur, blue fur, black fur patches, yellow lightning markings, white chest fur patch, white glowing claws, glowing blue paw pads.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | mega zeraora | scene_subject | foreground | high | 0.98 |
| fur and body colors | blue black yellow white fur | creature_anatomy | foreground | high | 0.98 |
| body color blue | blue fur | creature_anatomy | foreground | high | 0.98 |
| fur black patches | black fur patches | creature_anatomy | foreground | high | 0.98 |
| yellow lightning markings | yellow lightning markings | creature_anatomy | foreground | high | 0.95 |
| white chest fur patch | white chest fur patch | creature_anatomy | foreground | high | 0.95 |
| claws white glowing | white glowing claws | creature_anatomy | foreground | high | 0.9 |
| glowing blue paw pads | glowing blue paw pads | creature_anatomy | foreground | high | 0.9 |
| blue glowing electricity effects | blue electricity effects | creature_anatomy | foreground | high | 0.9 |
| eyes blue fierce expression | blue eyes | creature_anatomy | foreground | high | 0.9 |
| mouth slightly open | mouth slightly open | creature_anatomy | foreground | high | 0.85 |
| dynamic fighting pose | fighting pose | creature_anatomy | foreground | high | 0.95 |
| body diagonal, facing right | diagonal orientation facing right | creature_anatomy | foreground | high | 0.95 |
| electricity blue background | electricity blue background | environment | background | medium | 0.9 |
| bursting electric energy effects | electric energy effects | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text Japanese Mega Zeraora ex メガゼラオラ ex | card_ui_text | top center | visible | 0.95 |
| HP 270 | hp_text | top right | visible | 0.95 |
| electric type symbol | card_ui_symbol | top right near HP | visible | 0.95 |
| attack name text Thunder Fist サンダーフィスト with 60x damage | card_ui_text | mid left | visible | 0.95 |
| attack name text Zepturn ゼプトターン with 150 damage | card_ui_text | mid center | visible | 0.95 |
| fighting weakness x2 | card_ui_symbol | bottom left | visible | 0.9 |
| resistance none | card_ui_text | bottom center left | visible | 0.9 |
| retreat cost 1 colorless | card_ui_symbol | bottom right | visible | 0.9 |
| set code J M5 number 112 SAR | collector_number | bottom left | visible | 0.9 |
| illustrator GIDORA | illustrator_text | bottom left | visible | 0.9 |
| copyright line 2026 Pokemon Nintendo Creatures GAME FREAK unreadable parts | bottom_line_text | bottom edge | visible | 0.85 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subj_001 | subjects | Subject is Mega Zeraora | obs_subject_001 | 0.98 |
| fact_ca_001 | creature_anatomy | Body primarily blue with black and yellow lightning markings and white chest patch | obs_creature_anatomy_001, obs_creature_anatomy_002, obs_creature_anatomy_003, obs_creature_anatomy_004, obs_creature_anatomy_005 | 0.98 |
| fact_ca_002 | creature_anatomy | Blue glowing electrical energy effects visible on limbs and paws | obs_creature_anatomy_006, obs_creature_anatomy_007, obs_creature_anatomy_008 | 0.9 |
| fact_ca_003 | creature_anatomy | Eyes are blue and show a facial evidence | obs_creature_anatomy_009 | 0.9 |
| fact_ca_004 | creature_anatomy | Mouth is slightly open | obs_creature_anatomy_010 | 0.85 |
| fact_ca_005 | creature_anatomy | Body is in a fighting pose, diagonal orientation facing right | obs_pose_001, obs_pose_002 | 0.95 |
| fact_env_001 | environment | Background has electric blue and white electricity effects | obs_environment_001, obs_environment_002 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | Card name displayed as Japanese text メガゼラオラ ex | obs_card_ui_name_001 | 0.95 |
| fact_ui_002 | Hit Points indicated as 270 | obs_card_ui_hp_001 | 0.95 |
| fact_ui_003 | Electric type symbol visible near HP | obs_card_ui_type_001 | 0.95 |
| fact_ui_004 | Attacks named Thunder Fist (60x damage) and Zepturn (150 damage) | obs_card_ui_attack_001, obs_card_ui_attack_002 | 0.95 |
| fact_ui_005 | Fighting weakness x2 symbol visible | obs_card_ui_weakness_001 | 0.9 |
| fact_ui_006 | No resistance symbol or text visible | obs_card_ui_resistance_001 | 0.9 |
| fact_ui_007 | Retreat cost of 1 colorless energy symbol visible | obs_card_ui_retreat_cost_001 | 0.9 |
| fact_ui_008 | Set code J M5 number 112 SAR visible | obs_card_ui_set_info_001 | 0.9 |
| fact_ui_009 | Illustrator name GIDORA visible | obs_card_ui_illustrator_001 | 0.9 |
| fact_ui_010 | Copyright line shows 2026 Pokemon Nintendo Creatures GAME FREAK with some unreadable text | obs_card_ui_bottom_text_001 | 0.85 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_001",
    "fact_ui_002",
    "fact_ui_003",
    "fact_ui_004",
    "fact_ui_005",
    "fact_ui_006",
    "fact_ui_007",
    "fact_ui_008",
    "fact_ui_009",
    "fact_ui_010"
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
  "set_symbol_observation_ids": [],
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
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | likely_complete | low | mixed | card_ui_and_print_markers.unreadable_or_weak_text: card UI text is explicitly marked unreadable, weak, or cannot be determined in the observation |
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
| electricity effects | obs_creature_anatomy_008, obs_environment_002 |
| blue lightning | obs_creature_anatomy_004, obs_creature_anatomy_008, obs_environment_001 |
| fighting pose | obs_pose_001, obs_pose_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal composition | obs_pose_002 | deterministic_rule | 0.95 |
| diagonal orientation | obs_subject_001 | deterministic_rule | 0.98 |
| facing right | obs_subject_001 | deterministic_rule | 0.98 |
| fighting pose | obs_subject_001 | deterministic_rule | 0.98 |
| glowing highlights | obs_creature_anatomy_006, obs_creature_anatomy_007, obs_environment_002 | deterministic_rule | 0.92 |
| lightning | obs_creature_anatomy_004, obs_creature_anatomy_008, obs_environment_001, obs_environment_002 | deterministic_rule | 0.95 |
| right orientation | obs_pose_002 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, blue black yellow white fur, blue fur, black fur patches, yellow lightning markings, white chest fur patch, white glowing claws, glowing blue paw pads.
- Quality flags: `potential_module_incomplete_or_low_evidence`
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
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "fur and body colors",
      "normalized_label": "blue black yellow white fur",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "body color blue",
      "normalized_label": "blue fur",
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
      "label": "fur black patches",
      "normalized_label": "black fur patches",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "yellow lightning markings",
      "normalized_label": "yellow lightning markings",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "white chest fur patch",
      "normalized_label": "white chest fur patch",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "claws white glowing",
      "normalized_label": "white glowing claws",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "glowing blue paw pads",
      "normalized_label": "glowing blue paw pads",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_008",
      "kind": "creature_anatomy",
      "label": "blue glowing electricity effects",
      "normalized_label": "blue electricity effects",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_009",
      "kind": "creature_anatomy",
      "label": "eyes blue fierce expression",
      "normalized_label": "blue eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_010",
      "kind": "creature_anatomy",
      "label": "mouth slightly open",
      "normalized_label": "mouth slightly open",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "dynamic fighting pose",
      "normalized_label": "fighting pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_002",
      "kind": "creature_anatomy",
      "label": "body diagonal, facing right",
      "normalized_label": "diagonal orientation facing right",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "electricity blue background",
      "normalized_label": "electricity blue background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "bursting electric energy effects",
      "normalized_label": "electric energy effects",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text Japanese Mega Zeraora ex メガゼラオラ ex",
      "normalized_label": "メガゼラオラ ex",
      "scene_layer": "interface",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 270",
      "normalized_label": "270 HP",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "electric type symbol",
      "normalized_label": "electric type symbol",
      "scene_layer": "interface",
      "frame_position": "top right near HP",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_001",
      "kind": "card_ui_text",
      "label": "attack name text Thunder Fist サンダーフィスト with 60x damage",
      "normalized_label": "Thunder Fist 60x",
      "scene_layer": "interface",
      "frame_position": "mid left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_002",
      "kind": "card_ui_text",
      "label": "attack name text Zepturn ゼプトターン with 150 damage",
      "normalized_label": "Zepturn 150",
      "scene_layer": "interface",
      "frame_position": "mid center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_001",
      "kind": "card_ui_symbol",
      "label": "fighting weakness x2",
      "normalized_label": "fighting weakness x2",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_resistance_001",
      "kind": "card_ui_text",
      "label": "resistance none",
      "normalized_label": "no resistance",
      "scene_layer": "interface",
      "frame_position": "bottom center left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_retreat_cost_001",
      "kind": "card_ui_symbol",
      "label": "retreat cost 1 colorless",
      "normalized_label": "retreat cost 1",
      "scene_layer": "interface",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_set_info_001",
      "kind": "collector_number",
      "label": "set code J M5 number 112 SAR",
      "normalized_label": "J M5 112 SAR",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator GIDORA",
      "normalized_label": "GIDORA",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "copyright line 2026 Pokemon Nintendo Creatures GAME FREAK unreadable parts",
      "normalized_label": "©2026 Pokemon Nintendo Creatures GAME FREAK partial",
      "scene_layer": "interface",
      "frame_position": "bottom edge",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subj_001",
      "module": "subjects",
      "field_path": "[0].identity",
      "claim": "Subject is Mega Zeraora",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_001",
      "module": "creature_anatomy",
      "field_path": "body_colors",
      "claim": "Body primarily blue with black and yellow lightning markings and white chest patch",
      "value": "blue, black, yellow, white",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001",
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_003",
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_002",
      "module": "creature_anatomy",
      "field_path": "physical_features.energy_effects",
      "claim": "Blue glowing electrical energy effects visible on limbs and paws",
      "value": "blue glowing electrical energy",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006",
        "obs_creature_anatomy_007",
        "obs_creature_anatomy_008"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_003",
      "module": "creature_anatomy",
      "field_path": "face.eyes",
      "claim": "Eyes are blue and show a facial evidence",
      "value": "blue eyes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_009"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_004",
      "module": "creature_anatomy",
      "field_path": "face.mouth",
      "claim": "Mouth is slightly open",
      "value": "slightly open mouth",
      "supporting_observation_ids": [
        "obs_creature_anatomy_010"
      ],
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ca_005",
      "module": "creature_anatomy",
      "field_path": "pose.orientation_and_action",
      "claim": "Body is in a fighting pose, diagonal orientation facing right",
      "value": "fighting pose, diagonal facing right",
      "supporting_observation_ids": [
        "obs_pose_001",
        "obs_pose_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "Background has electric blue and white electricity effects",
      "value": "electric blue electricity background",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name displayed as Japanese text メガゼラオラ ex",
      "value": "メガゼラオラ ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "Hit Points indicated as 270",
      "value": "270 HP",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "type_symbol",
      "claim": "Electric type symbol visible near HP",
      "value": "electric",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_names_and_damage",
      "claim": "Attacks named Thunder Fist (60x damage) and Zepturn (150 damage)",
      "value": "Thunder Fist 60x, Zepturn 150",
      "supporting_observation_ids": [
        "obs_card_ui_attack_001",
        "obs_card_ui_attack_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness",
      "claim": "Fighting weakness x2 symbol visible",
      "value": "fighting x2",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance",
      "claim": "No resistance symbol or text visible",
      "value": "none",
      "supporting_observation_ids": [
        "obs_card_ui_resistance_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "Retreat cost of 1 colorless energy symbol visible",
      "value": "1 colorless",
      "supporting_observation_ids": [
        "obs_card_ui_retreat_cost_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_008",
      "module": "card_ui_and_print_markers",
      "field_path": "set_number_and_code",
      "claim": "Set code J M5 number 112 SAR visible",
      "value": "J M5 112 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_set_info_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_009",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator name GIDORA visible",
      "value": "GIDORA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_010",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "Copyright line shows 2026 Pokemon Nintendo Creatures GAME FREAK with some unreadable text",
      "value": "©2026 Pokemon Nintendo Creatures GAME FREAK partial",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 0.98,
      "anatomy": [
        "claws",
        "eyes",
        "fur",
        "mouth",
        "paws"
      ],
      "physical_features": [
        "black fur patches",
        "blue fur",
        "glowing blue electricity effects",
        "white chest patch",
        "yellow lightning markings"
      ],
      "pose": [
        "diagonal orientation",
        "facing right",
        "fighting pose"
      ],
      "orientation": "diagonal",
      "action_state": [
        "fighting",
        "in action"
      ],
      "facial_evidence": {
        "eyes": "blue eyes",
        "mouth": "slightly open",
        "eyebrows": "not clearly visible",
        "face_position": "center",
        "other_visible_evidence": [
          "white chest fur patch",
          "yellow markings"
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
      "obs_pose_001",
      "obs_pose_002",
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
      "electric blue electricity background"
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
      "blue",
      "white",
      "yellow"
    ],
    "lighting": [
      "electric energy glow",
      "glowing highlights"
    ],
    "shadows": [
      "contrasted shadows on body"
    ],
    "highlights": [
      "bright electric highlights on claws and markings"
    ],
    "composition": [
      "diagonal subject centered"
    ],
    "camera_angle": "eye-level",
    "framing": "centered subject with electric burst background",
    "cropping": [
      "subject fully visible"
    ],
    "depth": "layered foreground and background",
    "motion_cues": [
      "energy bursts",
      "paw in forward punching position"
    ],
    "motifs": [
      "electricity",
      "lightning bolts"
    ],
    "repeated_shapes": [
      "zigzag lightning patterns"
    ],
    "style_cues": [
      "digital painting"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
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
        "fact_ca_001",
        "fact_ca_002",
        "fact_ca_003",
        "fact_ca_004",
        "fact_ca_005"
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
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_pose_001",
        "obs_pose_002"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_001",
        "obs_environment_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_008",
        "obs_environment_002"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005",
        "fact_ui_006",
        "fact_ui_007",
        "fact_ui_008",
        "fact_ui_009",
        "fact_ui_010"
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
      "set_symbol_observation_ids": [],
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
        "blue lightning",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "mixed",
      "abstentions": [
        {
          "field_path": "card_ui_and_print_markers.unreadable_or_weak_text",
          "reason": "card UI text is explicitly marked unreadable, weak, or cannot be determined in the observation",
          "affected_observation_ids": [
            "obs_card_ui_bottom_text_001"
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
      "term": "electricity effects",
      "supporting_observation_ids": [
        "obs_creature_anatomy_008",
        "obs_environment_002"
      ]
    },
    {
      "term": "blue lightning",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004",
        "obs_creature_anatomy_008",
        "obs_environment_001"
      ]
    },
    {
      "term": "fighting pose",
      "supporting_observation_ids": [
        "obs_pose_001",
        "obs_pose_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_pose_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "facing right",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "fighting pose",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_anatomy_006",
          "obs_creature_anatomy_007",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_creature_anatomy_008",
          "obs_environment_001",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_pose_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-114 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0098584`
- Artwork observations: `6`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: dark misty swirling background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary_subject | 0.99 |
| dark misty body with tendrils | dark misty body tendrils | creature_anatomy | foreground | primary_subject_detail | 0.98 |
| central white face with purple glowing eye | central white face purple glowing eye | creature_anatomy | foreground | primary_subject_facial_feature | 0.98 |
| multiple dark limbs/tentacles emerging from body | multiple dark limbs tentacles | creature_anatomy | foreground | primary_subject_limbs | 0.98 |
| dark, misty, swirling background | dark misty swirl background | environment | background | background | 0.9 |
| glowing green and yellow light spots in background | glowing green yellow spots | environment | background | background_detail | 0.85 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガダークライex (Mega Darkrai ex) | card_ui_text | top-center | visible | 0.99 |
| HP text: 280 | card_ui_text | top-right | visible | 0.99 |
| dark type energy symbol next to HP | card_ui_symbol | top-right | visible | 0.99 |
| attack names and damage values in Japanese | card_ui_text | middle-lower | visible | 0.98 |
| collector number and set info: 114/081 SAR, M5 | card_ui_text | bottom-left | visible | 0.97 |
| illustrator credit: Illus. AKIRA EGAWA | card_ui_text | bottom-left | visible | 0.97 |
| copyright text at the bottom | card_ui_text | bottom | visible | 0.85 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | presence of dark misty body with tendrils | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | central white face with purple glowing eye | obs_creature_anatomy_002 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | multiple dark limbs/tentacles emerging from body | obs_creature_anatomy_003 | 0.98 |
| fact_environment_001 | environment | dark misty swirling abstract background | obs_environment_001 | 0.9 |
| fact_environment_002 | environment | glowing green and yellow light spots in background | obs_environment_002 | 0.85 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text in Japanese: メガダークライex | obs_card_ui_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | HP text is 280 | obs_card_ui_002 | 0.99 |
| fact_card_ui_and_print_markers_003 | dark type energy symbol present next to HP | obs_card_ui_003 | 0.99 |
| fact_card_ui_and_print_markers_004 | attack names and damage in Japanese | obs_card_ui_004 | 0.98 |
| fact_card_ui_and_print_markers_005 | collector number and set info: 114/081 SAR, M5 | obs_card_ui_005 | 0.97 |
| fact_card_ui_and_print_markers_006 | illustrator credit: Illus. AKIRA EGAWA | obs_card_ui_006 | 0.97 |
| fact_card_ui_and_print_markers_007 | copyright text visible at bottom | obs_card_ui_007 | 0.85 |

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
  "copyright_line_observation_ids": [
    "obs_card_ui_007"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
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
| environment | complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | low | high |  |
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
| semfact_002 | environment | dark misty swirling background |  | obs_environment_001 | dark misty swirling background | 0.9 |

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
| dark tendrils | obs_creature_anatomy_001 |
| purple glowing eye | obs_creature_anatomy_002 |
| dark misty background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_creature_anatomy_002 | deterministic_rule | 0.98 |
| dark misty swirling background | obs_environment_001 | deterministic_rule | 0.9 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| frontal orientation | obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_anatomy_002, obs_environment_002 | deterministic_rule | 0.98 |
| spiral motif | obs_environment_001 | deterministic_rule | 0.92 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: dark misty swirling background.
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
      "visibility": "visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "dark misty body with tendrils",
      "normalized_label": "dark misty body tendrils",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_detail",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "central white face with purple glowing eye",
      "normalized_label": "central white face purple glowing eye",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_facial_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "multiple dark limbs/tentacles emerging from body",
      "normalized_label": "multiple dark limbs tentacles",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_limbs",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark, misty, swirling background",
      "normalized_label": "dark misty swirl background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "glowing green and yellow light spots in background",
      "normalized_label": "glowing green yellow spots",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "background_detail",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガダークライex (Mega Darkrai ex)",
      "normalized_label": "card_name_text_megadarkrai_ex",
      "scene_layer": "interface",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "card_name",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "HP text: 280",
      "normalized_label": "hp_text_280",
      "scene_layer": "interface",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "hp_text",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "dark type energy symbol next to HP",
      "normalized_label": "dark_type_energy_symbol",
      "scene_layer": "interface",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "type_symbol",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "attack names and damage values in Japanese",
      "normalized_label": "attack_text_japanese",
      "scene_layer": "interface",
      "frame_position": "middle-lower",
      "visibility": "visible",
      "salience": "attack_text",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "collector number and set info: 114/081 SAR, M5",
      "normalized_label": "collector_number_set_info",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "collector_number",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "illustrator credit: Illus. AKIRA EGAWA",
      "normalized_label": "illustrator_akira_egawa",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "illustrator_text",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "copyright text at the bottom",
      "normalized_label": "copyright_text",
      "scene_layer": "interface",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "copyright_text",
      "confidence": 0.85,
      "evidence_strength": "medium"
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
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions",
      "claim": "presence of dark misty body with tendrils",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "physical_features.face",
      "claim": "central white face with purple glowing eye",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "limbs.tentacles",
      "claim": "multiple dark limbs/tentacles emerging from body",
      "value": "multiple",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "dark misty swirling abstract background",
      "value": "present",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "background_details",
      "claim": "glowing green and yellow light spots in background",
      "value": "present",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "card name text in Japanese: メガダークライex",
      "value": "visible",
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
      "claim": "HP text is 280",
      "value": "280",
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
      "claim": "dark type energy symbol present next to HP",
      "value": "dark type",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack names and damage in Japanese",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and set info: 114/081 SAR, M5",
      "value": "114/081 SAR, M5",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator credit: Illus. AKIRA EGAWA",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text visible at bottom",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_007"
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
      "identity_confidence": 0.99,
      "anatomy": [
        "central white face",
        "dark misty body with tendrils",
        "multiple dark limbs/tentacles",
        "purple glowing eye"
      ],
      "physical_features": [
        "glowing purple eye"
      ],
      "pose": [
        "floating",
        "upright"
      ],
      "orientation": "frontal",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "purple glowing eye visible",
        "mouth": "cannot determine",
        "eyebrows": "cannot determine",
        "face_position": "centered",
        "other_visible_evidence": [
          "white face with tendrils"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gray",
        "green glow",
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
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
      "dark misty swirling background"
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
      "obs_environment_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "gray",
      "green",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "glowing green and yellow light spots",
      "glowing purple eye"
    ],
    "shadows": [
      "dark body shadows with tendrils"
    ],
    "highlights": [
      "white face region"
    ],
    "composition": [
      "central face with spreading tendrils"
    ],
    "camera_angle": "frontal",
    "framing": "centered",
    "cropping": [
      "full body mostly visible"
    ],
    "depth": "moderate depth",
    "motion_cues": [
      "still"
    ],
    "motifs": [
      "dark misty swirling tendrils"
    ],
    "repeated_shapes": [
      "tentacle-like limbs"
    ],
    "style_cues": [
      "dark"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
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
        "fact_creature_anatomy_003"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "dark misty body with tendrils",
          "visibility": "visible",
          "colors": [
            "black",
            "gray"
          ],
          "details": [
            "misty",
            "tendrils"
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
          "feature": "central white face with purple glowing eye",
          "visibility": "visible",
          "colors": [
            "purple",
            "white"
          ],
          "details": [
            "glowing eye"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.98
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating",
            "upright"
          ],
          "orientation": "frontal",
          "action_state": [
            "still"
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
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_anatomy_002",
        "obs_environment_002",
        "obs_subject_001"
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
      "copyright_line_observation_ids": [
        "obs_card_ui_007"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
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
      "fact_ids": [],
      "terms": [
        "dark tendrils",
        "purple glowing eye",
        "dark misty background"
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
      "semantic_fact_id": "semfact_002",
      "category": "environment",
      "label": "dark misty swirling background",
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
          "dark misty swirling background"
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
      "term": "dark tendrils",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "purple glowing eye",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    },
    {
      "term": "dark misty background",
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
          "obs_creature_anatomy_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "dark misty swirling background",
        "source_observation_ids": [
          "obs_environment_001"
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
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_anatomy_002",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
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
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0124668`
- Artwork observations: `17`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: face partly obscured by white smoke/flame.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary_subject | 0.99 |
| body | body | creature_anatomy | foreground | primary_subject | 0.99 |
| head | head | creature_anatomy | foreground | primary_subject | 0.99 |
| tail | tail | creature_anatomy | foreground | primary_subject | 0.99 |
| 4 arms | arms | creature_anatomy | foreground | primary_subject | 0.95 |
| legs | legs | creature_anatomy | foreground | primary_subject | 0.95 |
| spiked collar | spiked collar | creature_anatomy | foreground | primary_subject | 0.9 |
| tail tip light green | tail tip light green | creature_anatomy | foreground | primary_subject | 0.9 |
| 4 purple claws on one arm | claws | creature_anatomy | foreground | primary_subject | 0.85 |
| purple glow inside body edges | purple glow | visual_effects | foreground | primary_subject | 0.9 |
| face partially obscured with white smoke-like flame | face obscured | creature_anatomy | foreground | primary_subject | 0.95 |
| magenta/red eyes visible | magenta eyes | creature_anatomy | foreground | primary_subject | 0.9 |
| green glowing shapes/symbols | green glowing shapes | objects_and_props | background | background | 0.9 |
| golden cracks/lightning lines on black body | golden cracks | objects_and_props | foreground | primary_subject | 0.9 |
| glowing green background | green glowing background | environment | background | background | 0.95 |
| centered subject with diagonal body orientation | diagonal composition | composition | foreground | primary_subject | 0.95 |
| dark body with purple and gold highlights | dark purple gold highlights | color_and_light | foreground | primary_subject | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top_left | fully_visible | 0.99 |
| HP 280 text | hp_text | top_right | fully_visible | 0.99 |
| attack names and descriptions in Japanese text | card_ui_text | bottom center-left | fully_visible | 0.98 |
| collector number 099/081 SR | collector_number | bottom left | fully_visible | 0.99 |
| set symbol to left of collector number | set_symbol | bottom left | fully_visible | 0.95 |
| illustrator text Illus. 5ban Graphics | illustrator_text | bottom left | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | body color | obs_coloreffect_002, obs_creature_anatomy_001 | 0.95 |
| fact_003 | creature_anatomy | head partly obscured by white smoke/flame | obs_creature_anatomy_009 | 0.95 |
| fact_004 | creature_anatomy | eye color | obs_creature_anatomy_010 | 0.9 |
| fact_005 | creature_anatomy | number of arms | obs_creature_anatomy_004 | 0.95 |
| fact_006 | creature_anatomy | number of legs | obs_creature_anatomy_005 | 0.95 |
| fact_007 | creature_anatomy | tail presence and color | obs_creature_anatomy_003, obs_creature_anatomy_007 | 0.9 |
| fact_008 | creature_anatomy | claws visible | obs_creature_anatomy_008 | 0.85 |
| fact_009 | creature_anatomy | spiked collar around neck | obs_creature_anatomy_006 | 0.9 |
| fact_010 | objects_and_props | green glowing background shapes | obs_environment_001, obs_object_001 | 0.9 |
| fact_011 | visual_effects | purple glow edge effect | obs_coloreffect_001 | 0.9 |
| fact_012 | objects_and_props | golden cracks or lightning effect | obs_object_002 | 0.9 |
| fact_013 | composition | subject framing and orientation | obs_composition_001 | 0.95 |
| fact_014 | color_and_light | subject color palette | obs_coloreffect_002 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_015 | card name text visible | obs_card_ui_001 | 0.99 |
| fact_016 | HP 280 visible | obs_card_ui_002 | 0.99 |
| fact_017 | attack names and descriptions in Japanese | obs_card_ui_003 | 0.98 |
| fact_018 | collector number visible | obs_card_ui_004 | 0.99 |
| fact_019 | set symbol visible | obs_card_ui_005 | 0.95 |
| fact_020 | illustrator text visible | obs_card_ui_006 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_015",
    "fact_016",
    "fact_017",
    "fact_018",
    "fact_019",
    "fact_020"
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
| clothing | complete | low | medium |  |
| objects_and_props | complete | low | medium |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | expression | face partly obscured by white smoke/flame | obs_subject_001 | obs_creature_anatomy_009 | magenta eyes visible face partially obscured with white smoke-like flame diagonal floating body position floating green glowing background golden cracks on body purple glow inside body edges four arms spiked collar | 0.95 |

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
| magenta eyes | obs_creature_anatomy_010 |
| white smoke on head | obs_creature_anatomy_009 |
| purple glow edge | obs_coloreffect_001 |
| four arms | obs_creature_anatomy_004 |
| spiked collar | obs_creature_anatomy_006 |
| glowing green background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| altered-state visual cue evidence | obs_creature_anatomy_009, obs_creature_anatomy_010 | deterministic_rule | 0.86 |
| centered composition | obs_composition_001 | deterministic_rule | 0.92 |
| diagonal body orientation | obs_composition_001 | deterministic_rule | 0.95 |
| diagonal composition | obs_composition_001 | deterministic_rule | 0.95 |
| diagonal orientation | obs_composition_001, obs_subject_001 | deterministic_rule | 0.99 |
| face partly obscured by white smoke/flame | obs_creature_anatomy_009 | deterministic_rule | 0.95 |
| floating | obs_composition_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_coloreffect_001, obs_environment_001, obs_object_001 | deterministic_rule | 0.95 |
| gold highlights | obs_coloreffect_002 | deterministic_rule | 0.95 |
| red eyes | obs_creature_anatomy_010 | deterministic_rule | 0.9 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: face partly obscured by white smoke/flame.
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
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "4 arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "legs",
      "normalized_label": "legs",
      "scene_layer": "foreground",
      "frame_position": "bottom-center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "spiked collar",
      "normalized_label": "spiked collar",
      "scene_layer": "foreground",
      "frame_position": "neck",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "tail tip light green",
      "normalized_label": "tail tip light green",
      "scene_layer": "foreground",
      "frame_position": "tail tip",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_008",
      "kind": "creature_anatomy",
      "label": "4 purple claws on one arm",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "arms",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_coloreffect_001",
      "kind": "visual_effects",
      "label": "purple glow inside body edges",
      "normalized_label": "purple glow",
      "scene_layer": "foreground",
      "frame_position": "center body edges",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_009",
      "kind": "creature_anatomy",
      "label": "face partially obscured with white smoke-like flame",
      "normalized_label": "face obscured",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_010",
      "kind": "creature_anatomy",
      "label": "magenta/red eyes visible",
      "normalized_label": "magenta eyes",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "green glowing shapes/symbols",
      "normalized_label": "green glowing shapes",
      "scene_layer": "background",
      "frame_position": "upper left",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "objects_and_props",
      "label": "golden cracks/lightning lines on black body",
      "normalized_label": "golden cracks",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "glowing green background",
      "normalized_label": "green glowing background",
      "scene_layer": "background",
      "frame_position": "full background",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "centered subject with diagonal body orientation",
      "normalized_label": "diagonal composition",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_coloreffect_002",
      "kind": "color_and_light",
      "label": "dark body with purple and gold highlights",
      "normalized_label": "dark purple gold highlights",
      "scene_layer": "foreground",
      "frame_position": "whole subject",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 280 text",
      "normalized_label": "hp 280",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "attack names and descriptions in Japanese text",
      "normalized_label": "attack texts",
      "scene_layer": "ui",
      "frame_position": "bottom center-left",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "collector_number",
      "label": "collector number 099/081 SR",
      "normalized_label": "collector number",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "set_symbol",
      "label": "set symbol to left of collector number",
      "normalized_label": "set symbol",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "illustrator_text",
      "label": "illustrator text Illus. 5ban Graphics",
      "normalized_label": "illustrator",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "ui_text",
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "subject",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "[0].body",
      "claim": "body color",
      "value": "very dark purple or black",
      "supporting_observation_ids": [
        "obs_coloreffect_002",
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "[0].head",
      "claim": "head partly obscured by white smoke/flame",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_009"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "[0].eyes",
      "claim": "eye color",
      "value": "magenta/red",
      "supporting_observation_ids": [
        "obs_creature_anatomy_010"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "[0].arms",
      "claim": "number of arms",
      "value": "4",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "[0].legs",
      "claim": "number of legs",
      "value": "2",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "[0].tail",
      "claim": "tail presence and color",
      "value": "present with light green tip",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003",
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_008",
      "module": "creature_anatomy",
      "field_path": "[0].claws",
      "claim": "claws visible",
      "value": "4 purple claws on an arm",
      "supporting_observation_ids": [
        "obs_creature_anatomy_008"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_009",
      "module": "creature_anatomy",
      "field_path": "[0].neck_spike_collar",
      "claim": "spiked collar around neck",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_010",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "green glowing background shapes",
      "value": "visible behind subject",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_object_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_011",
      "module": "visual_effects",
      "field_path": "[0]",
      "claim": "purple glow edge effect",
      "value": "purple glow inside dark body edges",
      "supporting_observation_ids": [
        "obs_coloreffect_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_012",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "golden cracks or lightning effect",
      "value": "visible on body",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_013",
      "module": "composition",
      "field_path": "[0]",
      "claim": "subject framing and orientation",
      "value": "centered with diagonal body pose",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "color_and_light",
      "field_path": "[0]",
      "claim": "subject color palette",
      "value": "dark body with purple, black, gold highlights",
      "supporting_observation_ids": [
        "obs_coloreffect_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "Japanese text at top left",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP 280 visible",
      "value": "280 in top right corner",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_texts",
      "claim": "attack names and descriptions in Japanese",
      "value": "visible in bottom half",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_018",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "099/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_019",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "visible near collector number bottom left",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_020",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
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
        "head",
        "legs",
        "spiked collar",
        "tail"
      ],
      "physical_features": [
        "dark purple body",
        "golden cracks on body",
        "light green tail tip",
        "magenta eyes",
        "purple claws",
        "white smoke/flame on head"
      ],
      "pose": [
        "diagonal orientation",
        "floating"
      ],
      "orientation": "diagonal",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "visible magenta",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "partly obscured by white smoke",
        "other_visible_evidence": [
          "white smoke/flame obscuring face area"
        ]
      },
      "clothing_or_accessories": [
        "spiked collar"
      ],
      "colors": [
        "black",
        "dark purple",
        "gold accents",
        "light green tail tip",
        "purple claws"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_coloreffect_001",
      "obs_coloreffect_002",
      "obs_composition_001",
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
      "obs_object_002",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_object_001"
    ]
  },
  "environment": {
    "setting": [
      "glowing green background"
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
      "label": "green glowing shapes/symbols background",
      "normalized_label": "green glowing shapes",
      "object_type": "background element",
      "colors": [
        "green"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "background",
      "count_reference": "none",
      "confidence": 0.9
    },
    {
      "observation_id": "obs_object_002",
      "label": "golden cracks/lightning lines on body",
      "normalized_label": "golden cracks",
      "object_type": "body surface cracks/pattern",
      "colors": [
        "gold"
      ],
      "material_appearance": [
        "reflective-looking"
      ],
      "location": "body",
      "count_reference": "none",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark purple",
      "gold",
      "green",
      "white smoke"
    ],
    "lighting": [
      "glowing green background",
      "gold accents highlight",
      "purple inner glow edges"
    ],
    "shadows": [
      "dark shadows on creature body"
    ],
    "highlights": [
      "gold cracks",
      "purple glow edges"
    ],
    "composition": [
      "centered",
      "diagonal body pose"
    ],
    "camera_angle": "eye-level",
    "framing": "full body centered",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [
      "floating implied"
    ],
    "motifs": [
      "dark elegant creature motif"
    ],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_coloreffect_001",
      "obs_coloreffect_002",
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
        "fact_009"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "dark purple or black body color",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "dark purple"
          ],
          "details": [
            "purple inner glow edges",
            "shiny gold cracks"
          ],
          "supporting_observation_ids": [
            "obs_coloreffect_001",
            "obs_coloreffect_002",
            "obs_creature_anatomy_001",
            "obs_object_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "face partly obscured by white smoke/flame",
          "visibility": "fully_visible",
          "colors": [
            "white"
          ],
          "details": [
            "smoke or flame obscuring face"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_009"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eyes",
          "feature": "magenta/red eyes visible",
          "visibility": "fully_visible",
          "colors": [
            "magenta"
          ],
          "details": [
            "eyes glowing"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_010"
          ],
          "confidence": 0.9
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "4 arms",
          "visibility": "fully_visible",
          "colors": [
            "dark purple"
          ],
          "details": [
            "4 purple claws visible on one arm"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004",
            "obs_creature_anatomy_008"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "legs",
          "feature": "2 legs",
          "visibility": "fully_visible",
          "colors": [
            "dark purple"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "neck",
          "feature": "spiked collar",
          "visibility": "fully_visible",
          "colors": [
            "dark purple"
          ],
          "details": [
            "collar spikes"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "tail with light green tip",
          "visibility": "fully_visible",
          "colors": [
            "dark purple",
            "light green"
          ],
          "details": [
            "tail tip light green"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003",
            "obs_creature_anatomy_007"
          ],
          "confidence": 0.9
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal body orientation",
            "floating"
          ],
          "orientation": "diagonal",
          "action_state": [
            "static"
          ],
          "supporting_observation_ids": [
            "obs_composition_001"
          ],
          "confidence": 0.95
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple glow inside body edges",
          "details": [
            "purple color glow along body edges"
          ],
          "supporting_observation_ids": [
            "obs_coloreffect_001"
          ],
          "confidence": 0.9
        }
      ]
    },
    "clothing": {
      "fact_ids": [],
      "garments": [],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "spiked collar",
          "details": [
            "dark purple with spikes"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.9
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_010",
        "fact_012"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_002"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_010"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_object_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_013"
      ],
      "observation_ids": [
        "obs_composition_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_011",
        "fact_014"
      ],
      "observation_ids": [
        "obs_coloreffect_001",
        "obs_coloreffect_002"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_011"
      ],
      "observation_ids": [
        "obs_coloreffect_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_015",
        "fact_016",
        "fact_017",
        "fact_018",
        "fact_019",
        "fact_020"
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
        "magenta eyes",
        "white smoke on head",
        "purple glow edge",
        "four arms",
        "spiked collar",
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
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "clothing",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "semantic_fact_id": "sem_001",
      "category": "expression",
      "label": "face partly obscured by white smoke/flame",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_anatomy_009"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "magenta eyes visible"
        ],
        "eyebrows": [],
        "facial_features": [
          "face partially obscured with white smoke-like flame"
        ],
        "body_language": [],
        "body_position": [
          "diagonal floating body position"
        ],
        "motion_state": [
          "floating"
        ],
        "environment": [
          "green glowing background"
        ],
        "objects": [
          "golden cracks on body",
          "purple glow inside body edges"
        ],
        "relationships": [],
        "other": [
          "four arms",
          "spiked collar"
        ]
      },
      "confidence": 0.95,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "magenta eyes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_010"
      ]
    },
    {
      "term": "white smoke on head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_009"
      ]
    },
    {
      "term": "purple glow edge",
      "supporting_observation_ids": [
        "obs_coloreffect_001"
      ]
    },
    {
      "term": "four arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "spiked collar",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
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
        "concept": "altered-state visual cue evidence",
        "source_observation_ids": [
          "obs_creature_anatomy_009",
          "obs_creature_anatomy_010"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.86
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal body orientation",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "face partly obscured by white smoke/flame",
        "source_observation_ids": [
          "obs_creature_anatomy_009"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_coloreffect_001",
          "obs_environment_001",
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "gold highlights",
        "source_observation_ids": [
          "obs_coloreffect_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "red eyes",
        "source_observation_ids": [
          "obs_creature_anatomy_010"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-097 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0101984`
- Artwork observations: `9`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure Pokemon | mega chandelure | scene_subject | foreground | primary_subject | 0.99 |
| body | body | object | foreground | primary_subject_part | 0.99 |
| lantern cage upper body with cross pattern | lantern cage upper body | object | foreground | primary_subject_part | 0.95 |
| black chandelier arm shape | chandelier arm | object | foreground | primary_subject_part | 0.95 |
| flame on chandelier arm | flame on arm | object | foreground | primary_subject_part | 0.95 |
| purple body | purple color | object | foreground | primary_subject_color | 0.99 |
| gold and black chandelier arms | gold black color | object | foreground | primary_subject_color | 0.95 |
| blue and pink abstract background | blue pink background | object | background | background | 0.99 |
| floating pose | floating | object | foreground | primary_subject_pose | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Mega Chandelure ex | card_name_text | top_center | visible | 0.99 |
| HP 350 | hp_text | top_right | visible | 0.99 |
| Psychic energy symbol near HP | card_ui_symbol | top_right | visible | 0.99 |
| Psychic-type energy symbol | card_ui_symbol | top_left | visible | 0.99 |
| illlus. 5ban Graphics | illustrator_text | bottom_left | visible | 0.99 |
| 097/081 SR | collector_number | bottom_center | visible | 0.99 |
| Jpn-M5 set symbol | set_symbol | bottom_left | visible | 0.99 |
| Japanese text blocks in middle area | card_ui_text | middle | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | body color | obs_creature_body_001, obs_creature_color_001 | 0.99 |
| fact_003 | creature_anatomy | feature | obs_creature_component_001 | 0.95 |
| fact_004 | creature_anatomy | feature | obs_creature_color_002, obs_creature_component_002 | 0.95 |
| fact_005 | creature_anatomy | presence | obs_creature_component_003 | 0.95 |
| fact_006 | creature_anatomy | pose | obs_creature_pose_001 | 0.9 |
| fact_007 | environment | dominant colors | obs_creature_color_003 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_008 | name text | obs_card_ui_name_001 | 0.99 |
| fact_009 | HP text | obs_card_ui_hp_001 | 0.99 |
| fact_010 | set symbol | obs_card_ui_set_001 | 0.99 |
| fact_011 | collector number | obs_card_ui_number_001 | 0.99 |
| fact_012 | illustrator text | obs_card_ui_illustrator_001 | 0.99 |
| fact_013 | Japanese text blocks | obs_card_ui_text_all_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_008",
    "fact_009",
    "fact_010",
    "fact_011",
    "fact_012",
    "fact_013"
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
  "other_print_marker_observation_ids": [
    "obs_card_ui_text_all_001"
  ]
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
| environment | likely_complete | low | high |  |
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
| sem_001 | state | floating | obs_subject_001 | obs_creature_pose_001 | floating floating floating | 0.9 |

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
| lantern body | obs_creature_component_001 |
| chandelier arms | obs_creature_component_002 |
| purple and gold color | obs_creature_color_001, obs_creature_color_002 |
| floating pose | obs_creature_pose_001 |
| abstract blue and pink background | obs_creature_color_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal composition | obs_creature_color_002 | deterministic_rule | 0.92 |
| flame | obs_creature_color_002, obs_creature_component_003 | deterministic_rule | 0.95 |
| floating | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| floating orientation | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Semantic facts: floating.
- Quality flags: `potential_module_incomplete_or_low_evidence`
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
      "visibility": "visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "object",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_part",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_component_001",
      "kind": "object",
      "label": "lantern cage upper body with cross pattern",
      "normalized_label": "lantern cage upper body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_part",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_component_002",
      "kind": "object",
      "label": "black chandelier arm shape",
      "normalized_label": "chandelier arm",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_part",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_component_003",
      "kind": "object",
      "label": "flame on chandelier arm",
      "normalized_label": "flame on arm",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_part",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_color_001",
      "kind": "object",
      "label": "purple body",
      "normalized_label": "purple color",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_color",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_color_002",
      "kind": "object",
      "label": "gold and black chandelier arms",
      "normalized_label": "gold black color",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_color",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_color_003",
      "kind": "object",
      "label": "blue and pink abstract background",
      "normalized_label": "blue pink background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_pose_001",
      "kind": "object",
      "label": "floating pose",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_pose",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "Mega Chandelure ex",
      "normalized_label": "mega_chandelure_ex",
      "scene_layer": "card_ui",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 350",
      "normalized_label": "hp_350",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_icon_001",
      "kind": "card_ui_symbol",
      "label": "Psychic energy symbol near HP",
      "normalized_label": "psychic_energy_symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "Psychic-type energy symbol",
      "normalized_label": "psychic_type_symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illlus. 5ban Graphics",
      "normalized_label": "illustrator_5ban_graphics",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "097/081 SR",
      "normalized_label": "097_slash_081_sr",
      "scene_layer": "card_ui",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "set_symbol",
      "label": "Jpn-M5 set symbol",
      "normalized_label": "jpn_m5_set_symbol",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_all_001",
      "kind": "card_ui_text",
      "label": "Japanese text blocks in middle area",
      "normalized_label": "japanese_text_blocks",
      "scene_layer": "card_ui",
      "frame_position": "middle",
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
      "field_path": "scene_subject.identity",
      "claim": "identity",
      "value": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.body",
      "claim": "body color",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_creature_body_001",
        "obs_creature_color_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.lantern_cage_upper_body",
      "claim": "feature",
      "value": "cross pattern on upper lantern cage body",
      "supporting_observation_ids": [
        "obs_creature_component_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.chandelier_arms",
      "claim": "feature",
      "value": "black chandelier arms with gold highlights",
      "supporting_observation_ids": [
        "obs_creature_color_002",
        "obs_creature_component_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "body_regions.flames",
      "claim": "presence",
      "value": "flames on chandelier arms",
      "supporting_observation_ids": [
        "obs_creature_component_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "pose",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "environment",
      "field_path": "background.colors",
      "claim": "dominant colors",
      "value": "blue and pink abstract background",
      "supporting_observation_ids": [
        "obs_creature_color_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "name text",
      "value": "Mega Chandelure ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text",
      "value": "HP 350",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "Jpn-M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "097/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_text",
      "claim": "Japanese text blocks",
      "value": "multiple Japanese text blocks describing card effects",
      "supporting_observation_ids": [
        "obs_card_ui_text_all_001"
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
        "black chandelier arms with gold highlights",
        "flames on chandelier arms",
        "lantern cage upper body with cross pattern",
        "purple body"
      ],
      "physical_features": [
        "chandelier arms have flames",
        "lantern cage body has cross pattern"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "floating",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "cannot determine",
        "mouth": "cannot determine",
        "eyebrows": "cannot determine",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gold",
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
      "obs_creature_body_001",
      "obs_creature_component_001",
      "obs_creature_component_002",
      "obs_creature_component_003",
      "obs_creature_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_creature_color_003"
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
      "obs_creature_color_003"
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
      "diffuse soft background light",
      "highlighted edges on chandelier arms"
    ],
    "shadows": [
      "shadows under chandelier arms"
    ],
    "highlights": [
      "bright highlights on lantern parts"
    ],
    "composition": [
      "centered main subject",
      "diagonal chandelier arms"
    ],
    "camera_angle": "head-on",
    "framing": "full view of subject floating",
    "cropping": [],
    "depth": "visible depth with chandelier arms and body",
    "motion_cues": [],
    "motifs": [
      "cross pattern on lantern cage"
    ],
    "repeated_shapes": [
      "repeated flames on chandelier arms"
    ],
    "style_cues": [
      "bright lighting",
      "stylized card art"
    ],
    "supporting_observation_ids": [
      "obs_creature_color_001",
      "obs_creature_color_002",
      "obs_creature_color_003",
      "obs_creature_component_001",
      "obs_creature_component_002",
      "obs_creature_component_003",
      "obs_creature_pose_001"
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
        "fact_006"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "purple color",
          "visibility": "visible",
          "colors": [
            "purple"
          ],
          "details": [
            "main body lantern cage is purple"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_001",
            "obs_creature_color_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "upper lantern cage",
          "feature": "cross pattern",
          "visibility": "visible",
          "colors": [],
          "details": [
            "visible golden cross pattern on upper lantern cage body"
          ],
          "supporting_observation_ids": [
            "obs_creature_component_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "chandelier arms",
          "feature": "black colored with gold highlights",
          "visibility": "visible",
          "colors": [
            "black",
            "gold"
          ],
          "details": [
            "arms are black with gold ends and swirl shapes"
          ],
          "supporting_observation_ids": [
            "obs_creature_color_002",
            "obs_creature_component_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "chandelier arms",
          "feature": "flame",
          "visibility": "visible",
          "colors": [
            "orange",
            "yellow"
          ],
          "details": [
            "flames burning on arm tips"
          ],
          "supporting_observation_ids": [
            "obs_creature_component_003"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "lantern cage",
          "feature": "cross lines and round joints pattern",
          "visibility": "visible",
          "colors": [],
          "details": [
            "visible structural cross pattern on lantern body"
          ],
          "supporting_observation_ids": [
            "obs_creature_component_001"
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
          "orientation": "floating",
          "action_state": [
            "static"
          ],
          "supporting_observation_ids": [
            "obs_creature_pose_001"
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
        "fact_007"
      ],
      "observation_ids": [
        "obs_creature_color_003"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_color_001",
        "obs_creature_color_002",
        "obs_creature_color_003"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_component_003"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_008",
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013"
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
      "other_print_marker_observation_ids": [
        "obs_card_ui_text_all_001"
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
        "lantern body",
        "chandelier arms",
        "purple and gold color",
        "floating pose",
        "abstract blue and pink background"
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
      "review_status": "likely_complete",
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
      "omission_risk": "medium",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
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
      "term": "lantern body",
      "supporting_observation_ids": [
        "obs_creature_component_001"
      ]
    },
    {
      "term": "chandelier arms",
      "supporting_observation_ids": [
        "obs_creature_component_002"
      ]
    },
    {
      "term": "purple and gold color",
      "supporting_observation_ids": [
        "obs_creature_color_001",
        "obs_creature_color_002"
      ]
    },
    {
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ]
    },
    {
      "term": "abstract blue and pink background",
      "supporting_observation_ids": [
        "obs_creature_color_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_creature_color_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_color_002",
          "obs_creature_component_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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
        "concept": "floating orientation",
        "source_observation_ids": [
          "obs_creature_pose_001",
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
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0117376`
- Artwork observations: `10`
- Card UI / print-marker observations: `11`
- Card UI module evidence references: `9`
- Derived digest: Fact digest. Scene subjects: メガドリュウズex Pokemon. Visible observations: sharp drill-like head cone, face half-closed eyes red markings, red triangular markings, explosion debris dust. Semantic facts: explosion debris.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| メガドリュウズex Pokemon | メガドリュウズex Pokemon | scene_subject | foreground | dominant | 1 |
| body with dark gray armor-like plates | dark gray armor-like body | creature_anatomy | foreground | dominant | 1 |
| large drill-like arms on both sides, orange and metallic striped | orange metallic striped drill arms | creature_anatomy | foreground | dominant | 1 |
| sharp drill-like head cone, dark gray with metallic texture and orange tip | sharp drill-like head cone | creature_anatomy | foreground | high | 1 |
| face with half-closed eyes, white face, red markings near eyes and mouth | face half-closed eyes red markings | creature_anatomy | foreground | high | 1 |
| red triangular markings on face and body | red triangular markings | creature_anatomy | foreground | high | 1 |
| diagonal pose facing right | diagonal facing right | creature_anatomy | foreground | dominant | 1 |
| explosion debris and dust particles around the Pokemon | explosion debris dust | environment | foreground | medium | 1 |
| color palette dominated by dark gray, orange, red, white, and green highlights | dark gray orange red white green palette | color_and_light | foreground | dominant | 1 |
| bright lighting with reflective metallic highlights on body and arms | bright metallic highlights | color_and_light | foreground | dominant | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name: メガドリュウズex | card_ui_text | top center | visible | 1 |
| HP: 340 | card_ui_text | top right | visible | 1 |
| Metal energy symbol next to HP | card_ui_symbol | top right near HP | visible | 1 |
| Attack 1: 90 damage | card_ui_text | bottom left | visible | 1 |
| Attack 2: 200+ damage | card_ui_text | bottom left | visible | 1 |
| Fire weakness x2 | card_ui_symbol | bottom center-left | visible | 1 |
| Grass resistance -30 | card_ui_symbol | bottom center | visible | 1 |
| Retreat cost 4 colorless energy | card_ui_symbol | bottom center-right | visible | 1 |
| Japanese copyright and legal lines visible at bottom | card_ui_text | bottom | visible | 1 |
| Illustrator text: Illus. Keisuke Azuma | card_ui_text | bottom left | visible | 1 |
| Set code: m5 063/081 RR | card_ui_text | bottom left | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject presence | obs_subject_001 | 1 |
| fact_002 | creature_anatomy | body color | obs_creature_body_001 | 1 |
| fact_003 | creature_anatomy | arms type and color | obs_creature_anatomy_arm_001 | 1 |
| fact_004 | creature_anatomy | head shape and color | obs_creature_head_001 | 1 |
| fact_005 | creature_anatomy | face features | obs_creature_face_001, obs_creature_red_markings_001 | 1 |
| fact_006 | creature_anatomy | pose orientation | obs_creature_pose_001 | 1 |
| fact_007 | environment | has explosion debris and dust | obs_environment_001 | 1 |
| fact_008 | color_and_light | color palette | obs_palette_001 | 1 |
| fact_009 | color_and_light | lighting type | obs_lighting_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_010 | card name text | obs_card_ui_name_001 | 1 |
| fact_011 | HP text | obs_card_ui_hp_001 | 1 |
| fact_012 | energy type symbol | obs_card_ui_energy_type_001 | 1 |
| fact_013 | attack 1 damage | obs_card_ui_move_001 | 1 |
| fact_014 | attack 2 damage | obs_card_ui_move_002 | 1 |
| fact_015 | weakness fire x2 | obs_card_ui_weakness_001 | 1 |
| fact_016 | resistance grass minus 30 | obs_card_ui_resistance_001 | 1 |
| fact_017 | retreat cost | obs_card_ui_retreat_001 | 1 |
| fact_018 | copyright text visible | obs_card_ui_text_bottom_001 | 1 |
| fact_019 | illustrator name | obs_card_ui_illustrator_001 | 1 |
| fact_020 | set code and number | obs_card_ui_set_001 | 1 |

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
    "fact_017",
    "fact_018",
    "fact_019",
    "fact_020"
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
    "obs_card_ui_set_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_set_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_bottom_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_bottom_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_type_001"
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
| environment | none_visible | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semantic_fact_002 | environment | explosion debris |  | obs_environment_001 | dust particles explosion debris explosion debris | 1 |

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
| メガドリュウズex | obs_subject_001 |
| metallic drill arms | obs_creature_anatomy_arm_001 |
| red triangular markings | obs_creature_red_markings_001 |
| explosion debris | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| armor | obs_creature_body_001 | deterministic_rule | 1 |
| centered composition | obs_creature_pose_001 | deterministic_rule | 0.92 |
| diagonal | obs_creature_pose_001 | deterministic_rule | 1 |
| diagonal composition | obs_creature_pose_001 | deterministic_rule | 1 |
| diagonal pose | obs_subject_001 | deterministic_rule | 1 |
| explosion | obs_environment_001 | deterministic_rule | 1 |
| explosion debris | obs_environment_001 | deterministic_rule | 1 |
| half-closed eyes | obs_creature_face_001 | deterministic_rule | 1 |
| metal-like appearance | obs_creature_anatomy_arm_001, obs_lighting_001 | deterministic_rule | 1 |
| right orientation | obs_creature_pose_001, obs_subject_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: メガドリュウズex Pokemon. Visible observations: sharp drill-like head cone, face half-closed eyes red markings, red triangular markings, explosion debris dust. Semantic facts: explosion debris.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`, `potential_object_material_or_card_surface_confusion`, `potential_visual_material_vs_surface_confusion`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "メガドリュウズex Pokemon",
      "normalized_label": "メガドリュウズex Pokemon",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "dominant",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "creature_anatomy",
      "label": "body with dark gray armor-like plates",
      "normalized_label": "dark gray armor-like body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "dominant",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_arm_001",
      "kind": "creature_anatomy",
      "label": "large drill-like arms on both sides, orange and metallic striped",
      "normalized_label": "orange metallic striped drill arms",
      "scene_layer": "foreground",
      "frame_position": "center-left and center-right",
      "visibility": "visible",
      "salience": "dominant",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_head_001",
      "kind": "creature_anatomy",
      "label": "sharp drill-like head cone, dark gray with metallic texture and orange tip",
      "normalized_label": "sharp drill-like head cone",
      "scene_layer": "foreground",
      "frame_position": "center top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_face_001",
      "kind": "creature_anatomy",
      "label": "face with half-closed eyes, white face, red markings near eyes and mouth",
      "normalized_label": "face half-closed eyes red markings",
      "scene_layer": "foreground",
      "frame_position": "center top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_red_markings_001",
      "kind": "creature_anatomy",
      "label": "red triangular markings on face and body",
      "normalized_label": "red triangular markings",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_pose_001",
      "kind": "creature_anatomy",
      "label": "diagonal pose facing right",
      "normalized_label": "diagonal facing right",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "dominant",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "explosion debris and dust particles around the Pokemon",
      "normalized_label": "explosion debris dust",
      "scene_layer": "foreground",
      "frame_position": "around subject",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_and_light",
      "label": "color palette dominated by dark gray, orange, red, white, and green highlights",
      "normalized_label": "dark gray orange red white green palette",
      "scene_layer": "foreground",
      "frame_position": "full image",
      "visibility": "visible",
      "salience": "dominant",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "color_and_light",
      "label": "bright lighting with reflective metallic highlights on body and arms",
      "normalized_label": "bright metallic highlights",
      "scene_layer": "foreground",
      "frame_position": "full image",
      "visibility": "visible",
      "salience": "dominant",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "Card name: メガドリュウズex",
      "normalized_label": "メガドリュウズex",
      "scene_layer": "overlay",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP: 340",
      "normalized_label": "340 HP",
      "scene_layer": "overlay",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_type_001",
      "kind": "card_ui_symbol",
      "label": "Metal energy symbol next to HP",
      "normalized_label": "metal energy symbol",
      "scene_layer": "overlay",
      "frame_position": "top right near HP",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_move_001",
      "kind": "card_ui_text",
      "label": "Attack 1: 90 damage",
      "normalized_label": "90 damage attack",
      "scene_layer": "overlay",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_move_002",
      "kind": "card_ui_text",
      "label": "Attack 2: 200+ damage",
      "normalized_label": "200+ damage attack",
      "scene_layer": "overlay",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_001",
      "kind": "card_ui_symbol",
      "label": "Fire weakness x2",
      "normalized_label": "fire weakness x2",
      "scene_layer": "overlay",
      "frame_position": "bottom center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_resistance_001",
      "kind": "card_ui_symbol",
      "label": "Grass resistance -30",
      "normalized_label": "grass resistance -30",
      "scene_layer": "overlay",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_retreat_001",
      "kind": "card_ui_symbol",
      "label": "Retreat cost 4 colorless energy",
      "normalized_label": "retreat cost 4 colorless",
      "scene_layer": "overlay",
      "frame_position": "bottom center-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_bottom_001",
      "kind": "card_ui_text",
      "label": "Japanese copyright and legal lines visible at bottom",
      "normalized_label": "copyright text at bottom",
      "scene_layer": "overlay",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "card_ui_text",
      "label": "Illustrator text: Illus. Keisuke Azuma",
      "normalized_label": "illustrator Keisuke Azuma",
      "scene_layer": "overlay",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "card_ui_text",
      "label": "Set code: m5 063/081 RR",
      "normalized_label": "set m5 063/081 RR",
      "scene_layer": "overlay",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "subject presence",
      "value": "メガドリュウズex Pokemon present",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "body.color",
      "claim": "body color",
      "value": "dark gray with metallic appearance",
      "supporting_observation_ids": [
        "obs_creature_body_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "arms.description",
      "claim": "arms type and color",
      "value": "large orange and metallic striped drill arms on both sides",
      "supporting_observation_ids": [
        "obs_creature_anatomy_arm_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "head.description",
      "claim": "head shape and color",
      "value": "sharp drill-like head cone dark gray with metallic texture and orange tip",
      "supporting_observation_ids": [
        "obs_creature_head_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "face.features",
      "claim": "face features",
      "value": "half-closed eyes white face with red triangular markings near eyes and mouth",
      "supporting_observation_ids": [
        "obs_creature_face_001",
        "obs_creature_red_markings_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "pose orientation",
      "value": "diagonal facing right",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "environment",
      "field_path": "explosion_debris",
      "claim": "has explosion debris and dust",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "color palette",
      "value": "dark gray, orange, red, white, green highlights",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "lighting type",
      "value": "bright with metallic reflective highlights",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text",
      "value": "340",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy type symbol",
      "value": "metal",
      "supporting_observation_ids": [
        "obs_card_ui_energy_type_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack 1 damage",
      "value": "90",
      "supporting_observation_ids": [
        "obs_card_ui_move_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack 2 damage",
      "value": "200+",
      "supporting_observation_ids": [
        "obs_card_ui_move_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_symbol",
      "claim": "weakness fire x2",
      "value": "fire x2",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_symbol",
      "claim": "resistance grass minus 30",
      "value": "grass -30",
      "supporting_observation_ids": [
        "obs_card_ui_resistance_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "retreat cost",
      "value": "4 colorless",
      "supporting_observation_ids": [
        "obs_card_ui_retreat_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_018",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text visible",
      "value": "©2026 Pokemon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_bottom_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_019",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name",
      "value": "Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_020",
      "module": "card_ui_and_print_markers",
      "field_path": "set_and_number",
      "claim": "set code and number",
      "value": "m5 063/081 RR",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "メガドリュウズex Pokemon",
      "identity_confidence": 1,
      "anatomy": [
        "arms",
        "body",
        "face",
        "head"
      ],
      "physical_features": [
        "large orange and metallic striped drill arms",
        "metallic dark gray body plates",
        "red triangular markings on face and body",
        "sharp drill-like head cone"
      ],
      "pose": [
        "diagonal pose"
      ],
      "orientation": "right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "half-closed",
        "mouth": "visible with red markings",
        "eyebrows": "not visible",
        "face_position": "center top",
        "other_visible_evidence": [
          "white face"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "dark gray",
        "green",
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
      "obs_creature_anatomy_arm_001",
      "obs_creature_body_001",
      "obs_creature_face_001",
      "obs_creature_head_001",
      "obs_creature_pose_001",
      "obs_creature_red_markings_001",
      "obs_environment_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": []
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "",
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark gray",
      "green",
      "orange",
      "red",
      "white"
    ],
    "lighting": [
      "bright",
      "metallic highlights"
    ],
    "shadows": [],
    "highlights": [
      "reflective metallic body highlights"
    ],
    "composition": [
      "diagonal pose centered"
    ],
    "camera_angle": "not detectable",
    "framing": "centered tightly around subject",
    "cropping": [],
    "depth": "visible depth with foreground focus",
    "motion_cues": [
      "dust particles",
      "explosion debris"
    ],
    "motifs": [
      "triangular red markings"
    ],
    "repeated_shapes": [
      "drill arm cones"
    ],
    "style_cues": [
      "metallic texture",
      "shiny surface"
    ],
    "supporting_observation_ids": [
      "obs_creature_pose_001",
      "obs_environment_001",
      "obs_lighting_001",
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
    "environment_review": "none_visible",
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
        "fact_006"
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
          "details": [
            "armor-like plates"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_001"
          ],
          "confidence": 1
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "drill-like arms",
          "visibility": "visible",
          "colors": [
            "metallic orange stripes",
            "orange"
          ],
          "details": [
            "large",
            "striped"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_arm_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head cone",
          "visibility": "visible",
          "colors": [
            "dark gray",
            "orange tip"
          ],
          "details": [
            "metallic texture",
            "sharp"
          ],
          "supporting_observation_ids": [
            "obs_creature_head_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "facial markings",
          "visibility": "visible",
          "colors": [
            "red",
            "white"
          ],
          "details": [
            "half-closed eyes",
            "red triangular markings near eyes and mouth"
          ],
          "supporting_observation_ids": [
            "obs_creature_face_001",
            "obs_creature_red_markings_001"
          ],
          "confidence": 1
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal"
          ],
          "orientation": "right",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_creature_pose_001"
          ],
          "confidence": 1
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
        "fact_007"
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
        "fact_008",
        "fact_009"
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
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015",
        "fact_016",
        "fact_017",
        "fact_018",
        "fact_019",
        "fact_020"
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
        "obs_card_ui_set_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_bottom_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_bottom_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_type_001"
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
        "メガドリュウズex",
        "metallic drill arms",
        "red triangular markings",
        "explosion debris"
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
      "review_status": "none_visible",
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semantic_fact_002",
      "category": "environment",
      "label": "explosion debris",
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
        "motion_state": [
          "dust particles",
          "explosion debris"
        ],
        "environment": [
          "explosion debris"
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
      "term": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "metallic drill arms",
      "supporting_observation_ids": [
        "obs_creature_anatomy_arm_001"
      ]
    },
    {
      "term": "red triangular markings",
      "supporting_observation_ids": [
        "obs_creature_red_markings_001"
      ]
    },
    {
      "term": "explosion debris",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "armor",
        "source_observation_ids": [
          "obs_creature_body_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_creature_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal",
        "source_observation_ids": [
          "obs_creature_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_creature_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "diagonal pose",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "explosion debris",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "half-closed eyes",
        "source_observation_ids": [
          "obs_creature_face_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_creature_anatomy_arm_001",
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_creature_pose_001",
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

### GV-PK-JPN-M5-078 - ムク

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0092976`
- Artwork observations: `9`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: female human figure.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human figure | female human figure | scene_subject | foreground | primary_subject | 0.99 |
| purple medium-length hair | purple hair | object | foreground | primary_subject_feature | 0.98 |
| white crown with black and gold details and central blue gem | white crown with gem | object | foreground | primary_subject_feature | 0.97 |
| female face with purple eyes, closed mouth, neutral eyebrows | face female | object | foreground | primary_subject_feature | 0.99 |
| white cape with gold details over black dress with blue belt and white shirt collar | white cape and black dress | object | foreground | primary_subject_feature | 0.98 |
| left blue glove on hand touching hair | blue glove left hand | object | foreground | primary_subject_feature | 0.97 |
| brick wall background with arches and glowing wall lamps, green and brown pipes | brick wall arches lights | object | background | background | 0.99 |
| indoor cave or dungeon-like environment with stone floor and metal grate | indoor cave dungeon | object | background | background | 0.95 |
| female standing, hand touching hair, facing viewer | standing pose facing viewer | object | foreground | primary_subject_pose | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| ムク | card_name_text | top_left | fully_visible | 0.99 |
| m5 | card_ui_text | bottom_left | fully_visible | 0.99 |
| 078/081 | collector_number | bottom_left | fully_visible | 0.99 |
| U (uncommon) | rarity_mark | bottom_left | fully_visible | 0.99 |
| Illus. nagimiso | illustrator_text | bottom_left | fully_visible | 0.99 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | copyright_text | bottom | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject is female human figure | obs_subject_001 | 0.99 |
| fact_creature_anatomy_hair_001 | creature_anatomy | hair color is purple | obs_hair_001 | 0.98 |
| fact_creature_anatomy_headgear_001 | creature_anatomy | headgear present with white, black, and gold with blue gem | obs_headgear_001 | 0.97 |
| fact_creature_anatomy_face_001 | creature_anatomy | face with purple eyes, closed mouth, neutral eyebrows | obs_face_001 | 0.99 |
| fact_clothing_garment_001 | clothing | wears white cape with gold details | obs_clothing_001 | 0.98 |
| fact_clothing_garment_002 | clothing | wears black dress with blue belt and white shirt collar | obs_clothing_001 | 0.98 |
| fact_clothing_accessory_001 | clothing | wears single blue glove on left hand | obs_glove_001 | 0.97 |
| fact_creature_anatomy_pose_001 | creature_anatomy | standing pose facing viewer with hand touching hair | obs_pose_001 | 0.99 |
| fact_environment_setting_001 | environment | indoor cave or dungeon-like environment | obs_environment_001 | 0.95 |
| fact_environment_architecture_001 | environment | brick arches and glowing wall lamps in background | obs_background_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_name_text_001 | card name text is ムク | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_and_print_markers_set_symbol_001 | set code is m5 | obs_card_ui_set_code_001 | 0.99 |
| fact_card_ui_and_print_markers_collector_number_001 | collector number is 078/081 | obs_card_ui_collector_number_001 | 0.99 |
| fact_card_ui_and_print_markers_rarity_mark_001 | rarity mark is uncommon | obs_card_ui_rarity_mark_001 | 0.99 |
| fact_card_ui_and_print_markers_illustrator_text_001 | illustrator text is nagimiso | obs_card_ui_illustrator_001 | 0.99 |
| fact_card_ui_and_print_markers_copyright_line_001 | copyright line visible | obs_card_ui_copyright_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_collector_number_001",
    "fact_card_ui_and_print_markers_copyright_line_001",
    "fact_card_ui_and_print_markers_illustrator_text_001",
    "fact_card_ui_and_print_markers_name_text_001",
    "fact_card_ui_and_print_markers_rarity_mark_001",
    "fact_card_ui_and_print_markers_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_code_001"
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
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
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
| purple hair | obs_hair_001 |
| white crown with gem | obs_headgear_001 |
| face female | obs_face_001 |
| white cape and black dress | obs_clothing_001 |
| blue glove left hand | obs_glove_001 |
| brick wall arches lights | obs_background_001 |
| indoor cave dungeon | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cape | obs_clothing_001 | deterministic_rule | 0.98 |
| centered composition | obs_background_001 | deterministic_rule | 0.92 |
| circular motif | obs_headgear_001 | deterministic_rule | 0.92 |
| forward orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_glove_001 | deterministic_rule | 0.97 |
| glowing highlights | obs_background_001, obs_headgear_001 | deterministic_rule | 0.92 |
| hand touching hair | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_glove_001 | deterministic_rule | 0.97 |
| standing | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human figure.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human figure",
      "normalized_label": "female human figure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "object",
      "label": "purple medium-length hair",
      "normalized_label": "purple hair",
      "scene_layer": "foreground",
      "frame_position": "head_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_headgear_001",
      "kind": "object",
      "label": "white crown with black and gold details and central blue gem",
      "normalized_label": "white crown with gem",
      "scene_layer": "foreground",
      "frame_position": "head_top_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "object",
      "label": "female face with purple eyes, closed mouth, neutral eyebrows",
      "normalized_label": "face female",
      "scene_layer": "foreground",
      "frame_position": "head_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "object",
      "label": "white cape with gold details over black dress with blue belt and white shirt collar",
      "normalized_label": "white cape and black dress",
      "scene_layer": "foreground",
      "frame_position": "body_center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_glove_001",
      "kind": "object",
      "label": "left blue glove on hand touching hair",
      "normalized_label": "blue glove left hand",
      "scene_layer": "foreground",
      "frame_position": "left_hand",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "object",
      "label": "brick wall background with arches and glowing wall lamps, green and brown pipes",
      "normalized_label": "brick wall arches lights",
      "scene_layer": "background",
      "frame_position": "background_full",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "object",
      "label": "indoor cave or dungeon-like environment with stone floor and metal grate",
      "normalized_label": "indoor cave dungeon",
      "scene_layer": "background",
      "frame_position": "background_full",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "object",
      "label": "female standing, hand touching hair, facing viewer",
      "normalized_label": "standing pose facing viewer",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_pose",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_name_text",
      "label": "ムク",
      "normalized_label": "ムク",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "card_ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "card_ui_text",
      "label": "m5",
      "normalized_label": "m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "078/081",
      "normalized_label": "078/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_mark_001",
      "kind": "rarity_mark",
      "label": "U (uncommon)",
      "normalized_label": "uncommon",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illus. nagimiso",
      "normalized_label": "nagimiso",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "card_ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0]",
      "claim": "subject is female human figure",
      "value": "true",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_hair_001",
      "module": "creature_anatomy",
      "field_path": "hair[0]",
      "claim": "hair color is purple",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_headgear_001",
      "module": "creature_anatomy",
      "field_path": "headgear[0]",
      "claim": "headgear present with white, black, and gold with blue gem",
      "value": "white crown with gem",
      "supporting_observation_ids": [
        "obs_headgear_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_face_001",
      "module": "creature_anatomy",
      "field_path": "face",
      "claim": "face with purple eyes, closed mouth, neutral eyebrows",
      "value": "female",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_garment_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "wears white cape with gold details",
      "value": "white cape with gold details",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_garment_002",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "wears black dress with blue belt and white shirt collar",
      "value": "black dress with blue belt and white shirt collar",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_accessory_001",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "wears single blue glove on left hand",
      "value": "blue glove left hand",
      "supporting_observation_ids": [
        "obs_glove_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose[0]",
      "claim": "standing pose facing viewer with hand touching hair",
      "value": "standing pose facing viewer",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_setting_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "indoor cave or dungeon-like environment",
      "value": "indoor cave dungeon",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_architecture_001",
      "module": "environment",
      "field_path": "architecture[0]",
      "claim": "brick arches and glowing wall lamps in background",
      "value": "brick arches lights",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0]",
      "claim": "card name text is ムク",
      "value": "ムク",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol[0]",
      "claim": "set code is m5",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "collector number is 078/081",
      "value": "078/081",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_rarity_mark_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark[0]",
      "claim": "rarity mark is uncommon",
      "value": "uncommon",
      "supporting_observation_ids": [
        "obs_card_ui_rarity_mark_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text[0]",
      "claim": "illustrator text is nagimiso",
      "value": "nagimiso",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_copyright_line_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line[0]",
      "claim": "copyright line visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human figure",
      "identity_confidence": 0.99,
      "anatomy": [
        "head",
        "left arm",
        "right arm",
        "torso"
      ],
      "physical_features": [
        "purple eyes",
        "purple hair"
      ],
      "pose": [
        "hand touching hair",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible purple eyes",
        "mouth": "closed",
        "eyebrows": "neutral",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black dress with blue belt",
        "blue glove on left hand",
        "white cape with gold details"
      ],
      "colors": [
        "black",
        "blue",
        "gold",
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
      "obs_clothing_001",
      "obs_face_001",
      "obs_glove_001",
      "obs_hair_001",
      "obs_headgear_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001",
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor cave dungeon"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "metal grate",
      "stone floor"
    ],
    "terrain": [
      "stone"
    ],
    "plants": [],
    "architecture": [
      "brick arches",
      "glowing wall lamps",
      "pipes"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_environment_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "brown",
      "gold",
      "green",
      "purple",
      "white"
    ],
    "lighting": [
      "warm glowing wall lamps lighting"
    ],
    "shadows": [
      "soft shadows on floor and walls"
    ],
    "highlights": [
      "bright highlights on crown gem"
    ],
    "composition": [
      "central subject framed by background arches"
    ],
    "camera_angle": "eye level",
    "framing": "centered tight framing",
    "cropping": [],
    "depth": "moderate depth with clear background",
    "motion_cues": [],
    "motifs": [
      "arched brick walls",
      "circular crown gem motif"
    ],
    "repeated_shapes": [
      "arches",
      "pipes"
    ],
    "style_cues": [
      "illustration style"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_headgear_001",
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
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple hair",
          "details": [
            "medium-length hair",
            "purple color"
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
          "label": "blue glove on left hand",
          "details": [
            "blue color",
            "single glove"
          ],
          "supporting_observation_ids": [
            "obs_glove_001"
          ],
          "confidence": 0.97
        }
      ]
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_creature_anatomy_face_001",
        "fact_creature_anatomy_hair_001",
        "fact_creature_anatomy_headgear_001",
        "fact_creature_anatomy_pose_001"
      ],
      "body_regions": [],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "hair",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [
            "medium-length hair"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "headgear",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "gold",
            "white"
          ],
          "details": [
            "blue central gem",
            "crown-like"
          ],
          "supporting_observation_ids": [
            "obs_headgear_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "facial features",
          "visibility": "fully_visible",
          "colors": [
            "purple eyes"
          ],
          "details": [
            "closed mouth",
            "neutral eyebrows"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "hand touching hair",
            "standing"
          ],
          "orientation": "forward",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.99
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_clothing_accessory_001",
        "fact_clothing_garment_001",
        "fact_clothing_garment_002"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "white cape with gold details",
          "neckline_type": "",
          "sleeve_type": "wide sleeves",
          "colors": [
            "gold",
            "white"
          ],
          "visible_details": [
            "arm wide sleeves",
            "cape"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black dress with blue belt and white shirt collar",
          "neckline_type": "collared neckline",
          "sleeve_type": "no visible sleeves",
          "colors": [
            "black",
            "blue",
            "white"
          ],
          "visible_details": [
            "belt",
            "shirt collar"
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
          "label": "blue glove on left hand",
          "details": [
            "blue color",
            "single glove"
          ],
          "supporting_observation_ids": [
            "obs_glove_001"
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
        "fact_environment_architecture_001",
        "fact_environment_setting_001"
      ],
      "observation_ids": [
        "obs_background_001",
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_clothing_001",
        "obs_headgear_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_collector_number_001",
        "fact_card_ui_and_print_markers_copyright_line_001",
        "fact_card_ui_and_print_markers_illustrator_text_001",
        "fact_card_ui_and_print_markers_name_text_001",
        "fact_card_ui_and_print_markers_rarity_mark_001",
        "fact_card_ui_and_print_markers_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_code_001"
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
        "purple hair",
        "white crown with gem",
        "face female",
        "white cape and black dress",
        "blue glove left hand",
        "brick wall arches lights",
        "indoor cave dungeon"
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
      "term": "purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "white crown with gem",
      "supporting_observation_ids": [
        "obs_headgear_001"
      ]
    },
    {
      "term": "face female",
      "supporting_observation_ids": [
        "obs_face_001"
      ]
    },
    {
      "term": "white cape and black dress",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "blue glove left hand",
      "supporting_observation_ids": [
        "obs_glove_001"
      ]
    },
    {
      "term": "brick wall arches lights",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "indoor cave dungeon",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cape",
        "source_observation_ids": [
          "obs_clothing_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_headgear_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_glove_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_background_001",
          "obs_headgear_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "hand touching hair",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_glove_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
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

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0091512`
- Artwork observations: `8`
- Card UI / print-marker observations: `3`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: female human trainer. Semantic facts: posing with right fist clenched forward.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer | female human trainer | scene_subject | foreground | salient | 0.99 |
| orange spiky ponytail hair | orange spiky ponytail hair | hair | foreground | salient | 0.98 |
| face with large green eyes and open smiling mouth | face with large green eyes and open smiling mouth | face | foreground | salient | 0.99 |
| blue sleeveless swimming suit | blue sleeveless swimsuit | clothing | foreground | salient | 0.99 |
| black wristband on right hand | black wristband on right hand | clothing | foreground | salient | 0.95 |
| right fist clenched and forward, left arm bent backward | right fist clenched forward, left arm bent backward | pose | foreground | salient | 0.97 |
| swimming pool background with blue water and ladder | swimming pool environment | environment | background | salient | 0.98 |
| poolside bench | poolside bench | environment | background | salient | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese at top left | card_name_text | top-left | fully_visible | 0.99 |
| card type text in Japanese top right | card_ui_text | top-right | fully_visible | 0.99 |
| bottom line text with copyright and set info | bottom_line_text | bottom | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject kind | obs_subject_001 | 0.99 |
| fact_subject_002 | subjects | identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair color and style | obs_hair_001 | 0.98 |
| fact_human_face_001 | human_appearance | facial features | obs_face_001 | 0.99 |
| fact_clothing_001 | clothing | garment | obs_clothing_001 | 0.99 |
| fact_clothing_002 | clothing | accessory | obs_clothing_002 | 0.95 |
| fact_pose_001 | creature_anatomy | pose | obs_pose_001 | 0.97 |
| fact_environment_001 | environment | environment | obs_environment_001, obs_environment_002 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | visible card name text | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_002 | visible card type text | obs_card_ui_text_002 | 0.99 |
| fact_card_ui_003 | visible copyright and set info text | obs_card_ui_text_003 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [
    "obs_card_ui_text_002"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_003"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_003"
  ],
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
| creature_anatomy | likely_complete | low | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
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
| semantic_001 | action | posing with right fist clenched forward | obs_subject_001 | obs_pose_001, obs_subject_001 | open smiling mouth large green eyes neutral face visible left arm bent backward right fist clenched forward standing static pose | 0.97 |

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
| swimming pool | obs_environment_001, obs_subject_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| forward-right orientation | obs_pose_001 | deterministic_rule | 0.97 |
| left arm bent backward | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| posing with right fist clenched forward | obs_pose_001, obs_subject_001 | deterministic_rule | 0.97 |
| right fist clenched | obs_subject_001 | deterministic_rule | 0.99 |
| right fist clenched forward | obs_pose_001 | deterministic_rule | 0.97 |
| right orientation | obs_clothing_002 | deterministic_rule | 0.95 |
| sleeveless clothing | obs_clothing_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Semantic facts: posing with right fist clenched forward.
- Quality flags: `potential_module_review_conflicts_with_entries`, `potential_pose_or_action_without_visible_support`
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
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "hair",
      "label": "orange spiky ponytail hair",
      "normalized_label": "orange spiky ponytail hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "face",
      "label": "face with large green eyes and open smiling mouth",
      "normalized_label": "face with large green eyes and open smiling mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue sleeveless swimming suit",
      "normalized_label": "blue sleeveless swimsuit",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "black wristband on right hand",
      "normalized_label": "black wristband on right hand",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "right fist clenched and forward, left arm bent backward",
      "normalized_label": "right fist clenched forward, left arm bent backward",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "swimming pool background with blue water and ladder",
      "normalized_label": "swimming pool environment",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "poolside bench",
      "normalized_label": "poolside bench",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_name_text",
      "label": "card name text in Japanese at top left",
      "normalized_label": "card name text Japanese",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "card type text in Japanese top right",
      "normalized_label": "card type text Japanese",
      "scene_layer": "ui",
      "frame_position": "top-right",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "bottom_line_text",
      "label": "bottom line text with copyright and set info",
      "normalized_label": "copyright and set info text",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "salient",
      "confidence": 0.99,
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
      "fact_id": "fact_subject_002",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "identity",
      "value": "female human trainer",
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
      "value": "orange spiky ponytail hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_face_001",
      "module": "human_appearance",
      "field_path": "face[0]",
      "claim": "facial features",
      "value": "large green eyes, open smiling mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment",
      "value": "blue sleeveless swimsuit",
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
      "claim": "accessory",
      "value": "black wristband on right hand",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose[0]",
      "claim": "pose",
      "value": "right fist clenched forward, left arm bent backward",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "environment",
      "value": "swimming pool with ladder",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "visible card name text",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "visible card type text",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "visible copyright and set info text",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.99,
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
        "neck",
        "shoulders"
      ],
      "physical_features": [
        "orange hair",
        "skin visible"
      ],
      "pose": [
        "left arm bent backward",
        "right fist clenched"
      ],
      "orientation": "forward",
      "action_state": [
        "posing",
        "standing"
      ],
      "facial_evidence": {
        "eyes": "large green eyes",
        "mouth": "open smiling mouth",
        "eyebrows": "neutral",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband",
        "blue sleeveless swimsuit"
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
      "obs_clothing_001",
      "obs_clothing_002",
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
      "poolside bench",
      "swimming pool with ladder"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "pool deck"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "bench"
    ],
    "water": [
      "swimming pool water"
    ],
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
      "light blue water",
      "orange",
      "skin tone"
    ],
    "lighting": [
      "bright even indoor lighting"
    ],
    "shadows": [
      "soft shadows under chin and arms"
    ],
    "highlights": [
      "hair highlight"
    ],
    "composition": [
      "balanced background elements",
      "centered subject",
      "pose"
    ],
    "camera_angle": "eye level",
    "framing": "medium shot framing",
    "cropping": [
      "full body visible"
    ],
    "depth": "medium depth with foreground subject and background pool elements",
    "motion_cues": [
      "action pose right fist forward",
      "left arm back"
    ],
    "motifs": [
      "aquatic",
      "fitness",
      "sport"
    ],
    "repeated_shapes": [
      "angular hair spikes"
    ],
    "style_cues": [
      "clean lineart",
      "flat colors with shading"
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
        "fact_subject_001",
        "fact_subject_002"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_hair_001",
        "fact_human_face_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "large green eyes",
            "open smiling mouth"
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
          "eyes": "large green eyes",
          "mouth": "open smiling mouth",
          "eyebrows": "neutral",
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
          "label": "orange spiky ponytail hair",
          "details": [
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
          "label": "black wristband",
          "details": [
            "on right wrist"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        }
      ]
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_pose_001"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "left arm bent backward",
            "right fist clenched forward"
          ],
          "orientation": "forward",
          "action_state": [
            "posing",
            "standing"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.97
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
          "body_area": "torso",
          "garment": "blue sleeveless swimsuit",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "single piece swimsuit"
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
            "obs_clothing_002"
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
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_003"
      ],
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
        "swimming pool"
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semantic_001",
      "category": "action",
      "label": "posing with right fist clenched forward",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001",
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [
          "open smiling mouth"
        ],
        "eyes": [
          "large green eyes"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "face visible"
        ],
        "body_language": [
          "left arm bent backward",
          "right fist clenched forward"
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
      "confidence": 0.97,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
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
          "obs_pose_001",
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
        "confidence": 0.97
      },
      {
        "concept": "left arm bent backward",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "posing with right fist clenched forward",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
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
        "concept": "right fist clenched forward",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_clothing_002"
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
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-109 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0100252`
- Artwork observations: `15`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: human male character. Visible observations: human male character, hair blond large bangs, hair blond tied back, eye color green, eyes open, mouth neutral, upper chest visible, hands visible. Semantic facts: right hand finger pointing forward, cloudy sky.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human male character | human male character | scene_subject | foreground | high | 0.99 |
| hair blond large bangs | hair blond large bangs | attribute | foreground | high | 0.98 |
| hair blond tied back | hair blond tied back | attribute | foreground | medium | 0.96 |
| green eyes | eye color green | attribute | foreground | high | 0.99 |
| eyes open | eyes open | attribute | foreground | high | 0.99 |
| mouth neutral expression | mouth neutral | attribute | foreground | high | 0.95 |
| upper chest visible | upper chest visible | attribute | foreground | high | 0.98 |
| hands visible | hands visible | attribute | foreground | high | 0.99 |
| black jacket with sharp collar and red detail | black jacket | object | foreground | high | 0.98 |
| red belt bag with black and white circle detail | red belt bag | object | foreground | high | 0.97 |
| black shirt under jacket | black shirt | object | foreground | medium | 0.95 |
| right hand finger pointing forward | finger pointing forward right hand | attribute | foreground | high | 0.95 |
| left hand relaxed down | left hand down relaxed | attribute | foreground | medium | 0.94 |
| cloudy sky background | cloudy sky | environment | background | high | 0.97 |
| green ground with scattered falling leaves | green ground with leaves | environment | midground | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text top-left | card_ui_text | top-left | visible | 0.9 |
| Japanese text top-right | card_ui_text | top-right | visible | 0.9 |
| Japanese text multiple lines mid-left | card_ui_text | mid-left | visible | 0.9 |
| Illustrator text bottom-left | card_ui_text | bottom-left | visible | 0.88 |
| Card number text bottom center | card_ui_text | bottom-center | visible | 0.92 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject is human male character | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair blond with large bangs and tied back | obs_hair_001, obs_hair_002 | 0.97 |
| fact_003 | human_appearance | eyes green | obs_face_001 | 0.99 |
| fact_004 | human_appearance | eyes open | obs_face_002 | 0.99 |
| fact_005 | human_appearance | mouth neutral | obs_face_003 | 0.95 |
| fact_006 | human_appearance | upper chest visible | obs_body_001 | 0.98 |
| fact_007 | human_appearance | hands visible | obs_body_002 | 0.99 |
| fact_008 | clothing | wearing black jacket with sharp collar and red detail | obs_clothing_001 | 0.98 |
| fact_009 | clothing | wearing red belt bag with black and white circle detail | obs_clothing_002 | 0.97 |
| fact_010 | clothing | wearing black shirt under jacket | obs_clothing_003 | 0.95 |
| fact_011 | human_appearance | right hand finger pointing forward | obs_pose_001 | 0.95 |
| fact_012 | human_appearance | left hand relaxed downward | obs_pose_002 | 0.94 |
| fact_013 | environment | cloudy sky | obs_env_001 | 0.97 |
| fact_014 | environment | green ground with scattered leaves | obs_env_002 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_015 | visible Japanese name text at top-left and top-right | obs_ui_text_001, obs_ui_text_002 | 0.9 |
| fact_016 | visible Japanese descriptive text mid-left | obs_ui_text_003 | 0.9 |
| fact_017 | visible illustrator text bottom-left | obs_ui_text_004 | 0.88 |
| fact_018 | visible card number text bottom-center '109/081' | obs_ui_text_005 | 0.92 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_015",
    "fact_016",
    "fact_017",
    "fact_018"
  ],
  "name_text_observation_ids": [
    "obs_ui_text_001",
    "obs_ui_text_002"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_ui_text_005"
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
    "obs_ui_text_004"
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
| card_ui_and_print_markers | complete | none | medium |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_003 | action | right hand finger pointing forward | obs_subject_001 | obs_pose_001 | right hand finger pointing forward | 0.95 |
| semfact_004 | environment | cloudy sky |  | obs_env_001 | cloudy sky | 0.97 |

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
| blond hair | obs_hair_001, obs_hair_002 |
| green eyes | obs_face_001 |
| black jacket | obs_clothing_001 |
| red belt bag | obs_clothing_002 |
| cloudy sky | obs_env_001 |
| pointing finger | obs_pose_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cloudy sky | obs_env_001 | deterministic_rule | 0.97 |
| downward-left orientation | obs_pose_002 | deterministic_rule | 0.94 |
| forward-right orientation | obs_pose_001 | deterministic_rule | 0.95 |
| frontal orientation | obs_subject_001 | deterministic_rule | 0.99 |
| left hand relaxed downward | obs_subject_001 | deterministic_rule | 0.99 |
| right hand finger pointing forward | obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_env_001 | deterministic_rule | 0.97 |
| terrain | obs_env_002 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human male character. Visible observations: human male character, hair blond large bangs, hair blond tied back, eye color green, eyes open, mouth neutral, upper chest visible, hands visible. Semantic facts: right hand finger pointing forward, cloudy sky.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human male character",
      "normalized_label": "human male character",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "attribute",
      "label": "hair blond large bangs",
      "normalized_label": "hair blond large bangs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_002",
      "kind": "attribute",
      "label": "hair blond tied back",
      "normalized_label": "hair blond tied back",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "attribute",
      "label": "green eyes",
      "normalized_label": "eye color green",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_002",
      "kind": "attribute",
      "label": "eyes open",
      "normalized_label": "eyes open",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_003",
      "kind": "attribute",
      "label": "mouth neutral expression",
      "normalized_label": "mouth neutral",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_001",
      "kind": "attribute",
      "label": "upper chest visible",
      "normalized_label": "upper chest visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_002",
      "kind": "attribute",
      "label": "hands visible",
      "normalized_label": "hands visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "object",
      "label": "black jacket with sharp collar and red detail",
      "normalized_label": "black jacket",
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
      "label": "red belt bag with black and white circle detail",
      "normalized_label": "red belt bag",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "object",
      "label": "black shirt under jacket",
      "normalized_label": "black shirt",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "attribute",
      "label": "right hand finger pointing forward",
      "normalized_label": "finger pointing forward right hand",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_002",
      "kind": "attribute",
      "label": "left hand relaxed down",
      "normalized_label": "left hand down relaxed",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_env_001",
      "kind": "environment",
      "label": "cloudy sky background",
      "normalized_label": "cloudy sky",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_002",
      "kind": "environment",
      "label": "green ground with scattered falling leaves",
      "normalized_label": "green ground with leaves",
      "scene_layer": "midground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_001",
      "kind": "card_ui_text",
      "label": "Japanese text top-left",
      "normalized_label": "Japanese text",
      "scene_layer": "interface",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_ui_text_002",
      "kind": "card_ui_text",
      "label": "Japanese text top-right",
      "normalized_label": "Japanese text",
      "scene_layer": "interface",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_ui_text_003",
      "kind": "card_ui_text",
      "label": "Japanese text multiple lines mid-left",
      "normalized_label": "Japanese text",
      "scene_layer": "interface",
      "frame_position": "mid-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_ui_text_004",
      "kind": "card_ui_text",
      "label": "Illustrator text bottom-left",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.88,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_ui_text_005",
      "kind": "card_ui_text",
      "label": "Card number text bottom center",
      "normalized_label": "card number 109/081",
      "scene_layer": "interface",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.92,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "scene subject is human male character",
      "value": "human male character",
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
      "claim": "hair blond with large bangs and tied back",
      "value": "blond, large bangs, tied back",
      "supporting_observation_ids": [
        "obs_hair_001",
        "obs_hair_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "facial_features.eyes",
      "claim": "eyes green",
      "value": "green",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "facial_features.eyes",
      "claim": "eyes open",
      "value": "open",
      "supporting_observation_ids": [
        "obs_face_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "human_appearance",
      "field_path": "facial_features.mouth",
      "claim": "mouth neutral",
      "value": "neutral",
      "supporting_observation_ids": [
        "obs_face_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "visible_body_regions.upper_chest",
      "claim": "upper chest visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "visible_body_regions.hands",
      "claim": "hands visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "clothing",
      "field_path": "garments.jacket",
      "claim": "wearing black jacket with sharp collar and red detail",
      "value": "black jacket with sharp collar and red detail",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "clothing",
      "field_path": "garments.bag",
      "claim": "wearing red belt bag with black and white circle detail",
      "value": "red belt bag with black and white circle detail",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "clothing",
      "field_path": "garments.shirt",
      "claim": "wearing black shirt under jacket",
      "value": "black shirt",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_011",
      "module": "human_appearance",
      "field_path": "pose.right_hand",
      "claim": "right hand finger pointing forward",
      "value": "finger pointing forward right hand",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "human_appearance",
      "field_path": "pose.left_hand",
      "claim": "left hand relaxed downward",
      "value": "left hand down relaxed",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "confidence": 0.94,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_013",
      "module": "environment",
      "field_path": "sky",
      "claim": "cloudy sky",
      "value": "cloudy sky",
      "supporting_observation_ids": [
        "obs_env_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "environment",
      "field_path": "ground",
      "claim": "green ground with scattered leaves",
      "value": "green ground with scattered leaves",
      "supporting_observation_ids": [
        "obs_env_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "visible Japanese name text at top-left and top-right",
      "value": "Japanese text",
      "supporting_observation_ids": [
        "obs_ui_text_001",
        "obs_ui_text_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_016",
      "module": "card_ui_and_print_markers",
      "field_path": "body_text_observation_ids",
      "claim": "visible Japanese descriptive text mid-left",
      "value": "Japanese text",
      "supporting_observation_ids": [
        "obs_ui_text_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_017",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "visible illustrator text bottom-left",
      "value": "illustrator text",
      "supporting_observation_ids": [
        "obs_ui_text_004"
      ],
      "confidence": 0.88,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_018",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "visible card number text bottom-center '109/081'",
      "value": "109/081",
      "supporting_observation_ids": [
        "obs_ui_text_005"
      ],
      "confidence": 0.92,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human male character",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "head",
        "neck",
        "shoulders",
        "upper chest"
      ],
      "physical_features": [
        "blond hair",
        "green eyes"
      ],
      "pose": [
        "left hand relaxed downward",
        "right hand finger pointing forward"
      ],
      "orientation": "frontal",
      "action_state": [],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black jacket with sharp collar and red detail",
        "black shirt",
        "red belt bag with black and white circle detail"
      ],
      "colors": [
        "black",
        "blond",
        "green",
        "red"
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
      "obs_body_002",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_face_001",
      "obs_face_002",
      "obs_face_003",
      "obs_hair_001",
      "obs_hair_002",
      "obs_pose_001",
      "obs_pose_002",
      "obs_subject_001"
    ],
    "midground": [
      "obs_env_002"
    ],
    "background": [
      "obs_env_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "outdoor",
    "sky": [
      "cloudy"
    ],
    "ground": [
      "green grass with leaves"
    ],
    "terrain": [],
    "plants": [
      "leaves scattered"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_001",
      "obs_env_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blond",
      "green",
      "red"
    ],
    "lighting": [
      "diffused",
      "soft"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "hair highlights"
    ],
    "composition": [
      "central subject",
      "portrait framing"
    ],
    "camera_angle": "frontal",
    "framing": "tight",
    "cropping": [
      "full subject visible"
    ],
    "depth": "shallow",
    "motion_cues": [],
    "motifs": [
      "sharp collar red detail"
    ],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_clothing_001",
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
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_011",
        "fact_012"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "eyes open",
            "green eyes",
            "mouth neutral"
          ],
          "supporting_observation_ids": [
            "obs_face_001",
            "obs_face_002",
            "obs_face_003"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "upper chest",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_body_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_body_002"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "open",
          "mouth": "neutral",
          "eyebrows": "neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_face_001",
            "obs_face_002",
            "obs_face_003"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blond hair with large bangs and tied back",
          "details": [
            "large bangs",
            "tied back"
          ],
          "supporting_observation_ids": [
            "obs_hair_001",
            "obs_hair_002"
          ],
          "confidence": 0.97
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right hand finger pointing forward",
          "details": [
            "finger pointing"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "left hand relaxed downward",
          "details": [
            "hand relaxed"
          ],
          "supporting_observation_ids": [
            "obs_pose_002"
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
        "fact_008",
        "fact_009",
        "fact_010"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black jacket with sharp collar and red detail",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black",
            "red"
          ],
          "visible_details": [
            "red detail",
            "sharp collar"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "waist",
          "garment": "red belt bag with black and white circle detail",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black",
            "red",
            "white"
          ],
          "visible_details": [
            "black and white circle detail"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black shirt under jacket",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_003"
          ],
          "confidence": 0.95
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
        "fact_013",
        "fact_014"
      ],
      "observation_ids": [
        "obs_env_001",
        "obs_env_002"
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
        "obs_clothing_001",
        "obs_hair_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_015",
        "fact_016",
        "fact_017",
        "fact_018"
      ],
      "name_text_observation_ids": [
        "obs_ui_text_001",
        "obs_ui_text_002"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_ui_text_005"
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
        "obs_ui_text_004"
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
        "blond hair",
        "green eyes",
        "black jacket",
        "red belt bag",
        "cloudy sky",
        "pointing finger"
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
      "evidence_quality": "medium",
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
      "semantic_fact_id": "semfact_003",
      "category": "action",
      "label": "right hand finger pointing forward",
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
          "right hand finger pointing forward"
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
    },
    {
      "semantic_fact_id": "semfact_004",
      "category": "environment",
      "label": "cloudy sky",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_001"
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
          "cloudy sky"
        ],
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
      "term": "blond hair",
      "supporting_observation_ids": [
        "obs_hair_001",
        "obs_hair_002"
      ]
    },
    {
      "term": "green eyes",
      "supporting_observation_ids": [
        "obs_face_001"
      ]
    },
    {
      "term": "black jacket",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "red belt bag",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "cloudy sky",
      "supporting_observation_ids": [
        "obs_env_001"
      ]
    },
    {
      "term": "pointing finger",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cloudy sky",
        "source_observation_ids": [
          "obs_env_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "downward-left orientation",
        "source_observation_ids": [
          "obs_pose_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
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
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left hand relaxed downward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right hand finger pointing forward",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_env_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_env_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-117 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.98`
- Cost USD: `0.0091456`
- Artwork observations: `9`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `3`
- Derived digest: Fact digest. Scene subjects: female human character. Visible observations: female human character, face, hair, blue sleeve garment, arm extended forward, ornate hat with spiral horns and gem, purple eyes, neutral mouth facial evidence.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human character | female human character | scene_subject | foreground | high | 0.99 |
| face | face | human_appearance | foreground | high | 0.99 |
| hair | hair | human_appearance | foreground | high | 0.99 |
| blue sleeve garment | blue sleeve garment | clothing | foreground | high | 0.99 |
| arm extended forward | arm extended forward | human_appearance | foreground | medium | 0.98 |
| ornate white and purple hat with spiral horns and gem | ornate hat with spiral horns and gem | objects_and_props | foreground | high | 0.99 |
| purple eyes | purple eyes | human_appearance | foreground | high | 0.99 |
| neutral mouth expression | neutral mouth facial evidence | human_appearance | foreground | high | 0.95 |
| sparkling light effects background | sparkling light effects background | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| name text 'ムク' in top left | card_ui_text | top-left | visible | 0.99 |
| text 'トレーナーズ' top right | card_ui_text | top-right | visible | 0.99 |
| text 'サポート' top left | card_ui_text | top-left | visible | 0.99 |
| copyright line visible bottom | copyright_text | bottom | visible | 0.94 |
| collector number '117/081 SAR' bottom left | collector_number | bottom-left | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject is female human character with purple eyes and | obs_human_expression_001, obs_human_eye_001, obs_subject_001 | 0.99 |
| fact_002 | human_appearance | face visible with purple eyes and neutral mouth facial evidence | obs_human_expression_001, obs_human_eye_001, obs_human_face_001 | 0.95 |
| fact_003 | human_appearance | hair is purple and styled around face | obs_hair_001 | 0.99 |
| fact_004 | human_appearance | left arm extended forward with blue sleeve garment | obs_arm_001, obs_clothing_001 | 0.98 |
| fact_005 | clothing | wearing white and purple ornate hat with spiral horns and gem | obs_object_001 | 0.99 |
| fact_006 | environment | background with sparkling light effects | obs_environment_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_007 | card name text visible 'ムク' (Muku) in top left | obs_card_ui_name_001 | 0.99 |
| fact_008 | top right text shows 'トレーナーズ' (Trainers) | obs_card_ui_subtype_001 | 0.99 |
| fact_009 | top left shows 'サポート' (Support) text | obs_card_ui_supporter_001 | 0.99 |
| fact_010 | collector number visible '117/081 SAR' bottom left | obs_card_ui_number_001 | 0.98 |
| fact_011 | copyright line text visible at bottom | obs_card_ui_copyright_001 | 0.94 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_007",
    "fact_008",
    "fact_009",
    "fact_010",
    "fact_011"
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
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | low | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | medium |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | complete | low | medium |  |
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
| face | obs_human_face_001 |
| hair | obs_hair_001 |
| blue sleeve garment | obs_clothing_001 |
| arm extended forward | obs_arm_001 |
| ornate hat with spiral horns and gem | obs_object_001 |
| purple eyes | obs_human_eye_001 |
| neutral mouth facial evidence | obs_human_expression_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_arm_001, obs_subject_001 | deterministic_rule | 0.99 |
| hat | obs_object_001 | deterministic_rule | 0.99 |
| reaching | obs_arm_001, obs_subject_001 | deterministic_rule | 0.99 |
| spiral motif | obs_object_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human character. Visible observations: female human character, face, hair, blue sleeve garment, arm extended forward, ornate hat with spiral horns and gem, purple eyes, neutral mouth facial evidence.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_review_conflicts_with_entries`
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
      "observation_id": "obs_human_face_001",
      "kind": "human_appearance",
      "label": "face",
      "normalized_label": "face",
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
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue sleeve garment",
      "normalized_label": "blue sleeve garment",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_arm_001",
      "kind": "human_appearance",
      "label": "arm extended forward",
      "normalized_label": "arm extended forward",
      "scene_layer": "foreground",
      "frame_position": "center-bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "ornate white and purple hat with spiral horns and gem",
      "normalized_label": "ornate hat with spiral horns and gem",
      "scene_layer": "foreground",
      "frame_position": "upper-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_eye_001",
      "kind": "human_appearance",
      "label": "purple eyes",
      "normalized_label": "purple eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_expression_001",
      "kind": "human_appearance",
      "label": "neutral mouth expression",
      "normalized_label": "neutral mouth facial evidence",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "sparkling light effects background",
      "normalized_label": "sparkling light effects background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "name text 'ムク' in top left",
      "normalized_label": "name text",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_subtype_001",
      "kind": "card_ui_text",
      "label": "text 'トレーナーズ' top right",
      "normalized_label": "subtype text",
      "scene_layer": "ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_supporter_001",
      "kind": "card_ui_text",
      "label": "text 'サポート' top left",
      "normalized_label": "supporter text",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "copyright line visible bottom",
      "normalized_label": "copyright line",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "collector number '117/081 SAR' bottom left",
      "normalized_label": "collector number",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
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
      "field_path": "scene_subject[0].identity",
      "claim": "scene subject is female human character with purple eyes and",
      "value": "female human character",
      "supporting_observation_ids": [
        "obs_human_expression_001",
        "obs_human_eye_001",
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "face",
      "claim": "face visible with purple eyes and neutral mouth facial evidence",
      "value": "face with purple eyes and neutral mouth",
      "supporting_observation_ids": [
        "obs_human_expression_001",
        "obs_human_eye_001",
        "obs_human_face_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "hair",
      "claim": "hair is purple and styled around face",
      "value": "purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "arms",
      "claim": "left arm extended forward with blue sleeve garment",
      "value": "left arm extended with blue sleeve garment",
      "supporting_observation_ids": [
        "obs_arm_001",
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "headwear",
      "claim": "wearing white and purple ornate hat with spiral horns and gem",
      "value": "ornate spiral horned hat with gem",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "environment",
      "field_path": "visual_effects",
      "claim": "background with sparkling light effects",
      "value": "sparkling light effects background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible 'ムク' (Muku) in top left",
      "value": "ムク",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "subtype_text",
      "claim": "top right text shows 'トレーナーズ' (Trainers)",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_subtype_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "supporter_text",
      "claim": "top left shows 'サポート' (Support) text",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_supporter_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible '117/081 SAR' bottom left",
      "value": "117/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line text visible at bottom",
      "value": "copyright line visible",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "medium"
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
        "hair"
      ],
      "physical_features": [
        "neutral mouth expression",
        "purple eyes"
      ],
      "pose": [
        "reaching"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "purple eyes visible",
        "mouth": "neutral",
        "eyebrows": "cannot determine",
        "face_position": "front visible",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "blue sleeve garment",
        "white and purple ornate hat with spiral horns and gem"
      ],
      "colors": [
        "blue garment",
        "purple hair",
        "white and purple hat"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_arm_001",
      "obs_clothing_001",
      "obs_hair_001",
      "obs_human_expression_001",
      "obs_human_eye_001",
      "obs_human_face_001",
      "obs_object_001",
      "obs_subject_001"
    ],
    "midground": [],
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
      "obs_environment_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "ornate white and purple hat with spiral horns and gem",
      "normalized_label": "ornate hat with spiral horns and gem",
      "object_type": "headwear",
      "colors": [
        "purple",
        "white"
      ],
      "material_appearance": [
        "smooth"
      ],
      "location": "on head",
      "count_reference": "not_counted",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights",
      "sparkling effects"
    ],
    "shadows": [
      "soft shadows on face"
    ],
    "highlights": [
      "white highlights on hat and hair"
    ],
    "composition": [
      "centered subject",
      "medium close-up"
    ],
    "camera_angle": "eye-level",
    "framing": "tight crop around upper body and face",
    "cropping": [
      "hands partially cropped"
    ],
    "depth": "shallow",
    "motion_cues": [
      "none"
    ],
    "motifs": [
      "spiral shapes in hat"
    ],
    "repeated_shapes": [
      "spiral horns"
    ],
    "style_cues": [
      "bright color palette"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
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
        "fact_004"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "neutral mouth",
            "purple eyes"
          ],
          "supporting_observation_ids": [
            "obs_human_expression_001",
            "obs_human_eye_001",
            "obs_human_face_001"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "center",
          "eyes": "purple eyes visible",
          "mouth": "neutral",
          "eyebrows": "cannot determine",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_human_expression_001",
            "obs_human_eye_001"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple hair",
          "details": [
            "colored purple"
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
          "label": "left arm extended forward",
          "details": [
            "blue sleeve"
          ],
          "supporting_observation_ids": [
            "obs_arm_001",
            "obs_clothing_001"
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
        "fact_005"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "head",
          "garment": "ornate hat with spiral horns and gem",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "purple",
            "white"
          ],
          "visible_details": [
            "smooth surface",
            "spiral horns"
          ],
          "supporting_observation_ids": [
            "obs_object_001"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_005"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
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
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_object_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_object_001",
        "obs_subject_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_006"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_007",
        "fact_008",
        "fact_009",
        "fact_010",
        "fact_011"
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
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
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
        "face",
        "hair",
        "blue sleeve garment",
        "arm extended forward",
        "ornate hat with spiral horns and gem",
        "purple eyes",
        "neutral mouth facial evidence"
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
      "review_status": "complete",
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
      "term": "face",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ]
    },
    {
      "term": "hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "blue sleeve garment",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "arm extended forward",
      "supporting_observation_ids": [
        "obs_arm_001"
      ]
    },
    {
      "term": "ornate hat with spiral horns and gem",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "purple eyes",
      "supporting_observation_ids": [
        "obs_human_eye_001"
      ]
    },
    {
      "term": "neutral mouth facial evidence",
      "supporting_observation_ids": [
        "obs_human_expression_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_arm_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "hat",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_arm_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_object_001"
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
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0110432`
- Artwork observations: `14`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: unknown human male figure. Visible observations: male human figure, blond hair, black outfit, long sleeved shirt, red belt bag, standing, right hand ok sign, side face visible. Semantic facts: standing, right hand forming OK sign.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human male figure | male human figure | scene_subject | midground | high | 0.99 |
| blond hair | blond hair | feature | midground | high | 0.98 |
| black outfit | black outfit | feature | midground | high | 0.95 |
| long sleeved shirt | long sleeved shirt | feature | midground | medium | 0.9 |
| red belt bag | red belt bag | feature | midground | medium | 0.9 |
| standing body position | standing | feature | midground | high | 0.99 |
| right hand forming 'OK' sign | right hand ok sign | feature | midground | medium | 0.95 |
| face visible in profile | side face visible | feature | midground | high | 0.99 |
| neutral mouth | neutral mouth | feature | midground | medium | 0.9 |
| yellow eyes | yellow eyes | feature | midground | high | 0.9 |
| blue sky with clouds | sky with clouds | scene_environment | background | medium | 0.95 |
| mountains | mountains | scene_environment | background | medium | 0.9 |
| sun | sun | scene_environment | background | medium | 0.9 |
| bright lighting with lens flare | bright lighting | feature | foreground | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top-center | visible | 0.9 |
| supporter label in Japanese top-left | card_ui_text | top-left | visible | 0.9 |
| trainer label in Japanese top-right | card_ui_text | top-right | visible | 0.9 |
| Japanese descriptive text in lower text area | card_ui_text | bottom-center | visible | 0.85 |
| set symbol and collector number bottom-left | card_ui_text | bottom-left | visible | 0.9 |
| copyright and legal text bottom | card_ui_text | bottom-center | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair color | obs_hair_001 | 0.98 |
| fact_clothing_001 | clothing | wearing black outfit | obs_clothing_001 | 0.95 |
| fact_clothing_002 | clothing | wearing long sleeved shirt | obs_clothing_002 | 0.9 |
| fact_clothing_003 | clothing | wearing red belt bag | obs_clothing_003 | 0.9 |
| fact_pose_001 | creature_anatomy | standing pose | obs_pose_001 | 0.99 |
| fact_gesture_001 | human_appearance | right hand forming OK sign | obs_gesture_001 | 0.95 |
| fact_facial_evidence_001 | human_appearance | face visible in profile | obs_face_001 | 0.99 |
| fact_facial_evidence_002 | human_appearance | mouth neutral | obs_expression_001 | 0.9 |
| fact_facial_evidence_003 | human_appearance | yellow eyes | obs_eyes_001 | 0.9 |
| fact_environment_001 | environment | blue sky with clouds | obs_environment_001 | 0.95 |
| fact_environment_002 | environment | mountains visible | obs_environment_002 | 0.9 |
| fact_environment_003 | environment | sun visible | obs_environment_003 | 0.9 |
| fact_visual_001 | color_and_light | bright lighting with lens flare effects | obs_lighting_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text present in Japanese | obs_card_ui_001 | 0.9 |
| fact_card_ui_002 | supporter label present in Japanese | obs_card_ui_002 | 0.9 |
| fact_card_ui_003 | trainer label present in Japanese | obs_card_ui_003 | 0.9 |
| fact_card_ui_004 | lower descriptive text present in Japanese | obs_card_ui_004 | 0.85 |
| fact_card_ui_005 | set symbol and collector number visible | obs_card_ui_005 | 0.9 |
| fact_card_ui_006 | copyright and legal text visible | obs_card_ui_006 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003",
    "fact_card_ui_004",
    "fact_card_ui_005",
    "fact_card_ui_006"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001",
    "obs_card_ui_002",
    "obs_card_ui_003"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_005"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_005"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_006"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_004"
  ],
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
| human_appearance | complete | low | high |  |
| creature_anatomy | likely_complete | low | high |  |
| clothing | complete | low | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | medium | medium |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | action | standing | obs_subject_001 | obs_pose_001 | standing body position standing | 0.99 |
| sem_fact_002 | action | right hand forming OK sign | obs_subject_001 | obs_gesture_001 | right hand forming OK sign | 0.95 |

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
| male human figure | obs_subject_001 |
| blond hair | obs_hair_001 |
| black outfit | obs_clothing_001 |
| long sleeved shirt | obs_clothing_002 |
| red belt bag | obs_clothing_003 |
| standing | obs_pose_001 |
| right hand ok sign | obs_gesture_001 |
| side face visible | obs_face_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cloud | obs_environment_001 | deterministic_rule | 0.95 |
| right hand forming OK sign | obs_gesture_001 | deterministic_rule | 0.95 |
| right orientation | obs_gesture_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_001 | deterministic_rule | 0.95 |
| standing | obs_gesture_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| sun | obs_environment_003 | deterministic_rule | 0.9 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown human male figure. Visible observations: male human figure, blond hair, black outfit, long sleeved shirt, red belt bag, standing, right hand ok sign, side face visible. Semantic facts: standing, right hand forming OK sign.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human male figure",
      "normalized_label": "male human figure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "feature",
      "label": "blond hair",
      "normalized_label": "blond hair",
      "scene_layer": "midground",
      "frame_position": "upper-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "feature",
      "label": "black outfit",
      "normalized_label": "black outfit",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "feature",
      "label": "long sleeved shirt",
      "normalized_label": "long sleeved shirt",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "feature",
      "label": "red belt bag",
      "normalized_label": "red belt bag",
      "scene_layer": "midground",
      "frame_position": "lower-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "feature",
      "label": "standing body position",
      "normalized_label": "standing",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_gesture_001",
      "kind": "feature",
      "label": "right hand forming 'OK' sign",
      "normalized_label": "right hand ok sign",
      "scene_layer": "midground",
      "frame_position": "upper-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "feature",
      "label": "face visible in profile",
      "normalized_label": "side face visible",
      "scene_layer": "midground",
      "frame_position": "upper-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_expression_001",
      "kind": "feature",
      "label": "neutral mouth",
      "normalized_label": "neutral mouth",
      "scene_layer": "midground",
      "frame_position": "upper-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "feature",
      "label": "yellow eyes",
      "normalized_label": "yellow eyes",
      "scene_layer": "midground",
      "frame_position": "upper-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "scene_environment",
      "label": "blue sky with clouds",
      "normalized_label": "sky with clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "scene_environment",
      "label": "mountains",
      "normalized_label": "mountains",
      "scene_layer": "background",
      "frame_position": "lower-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "scene_environment",
      "label": "sun",
      "normalized_label": "sun",
      "scene_layer": "background",
      "frame_position": "upper-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "feature",
      "label": "bright lighting with lens flare",
      "normalized_label": "bright lighting",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "supporter label in Japanese top-left",
      "normalized_label": "supporter label",
      "scene_layer": "card_ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "trainer label in Japanese top-right",
      "normalized_label": "trainer label",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "Japanese descriptive text in lower text area",
      "normalized_label": "card descriptive text",
      "scene_layer": "card_ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "set symbol and collector number bottom-left",
      "normalized_label": "set symbol collector number",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "copyright and legal text bottom",
      "normalized_label": "copyright legal text",
      "scene_layer": "card_ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "scene subject",
      "value": "human male figure",
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
      "value": "blond",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0].garment",
      "claim": "wearing black outfit",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[0].sleeve_type",
      "claim": "wearing long sleeved shirt",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_003",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "wearing red belt bag",
      "value": "true",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "standing pose",
      "value": "standing",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_gesture_001",
      "module": "human_appearance",
      "field_path": "gestures[0]",
      "claim": "right hand forming OK sign",
      "value": "true",
      "supporting_observation_ids": [
        "obs_gesture_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_facial_evidence_001",
      "module": "human_appearance",
      "field_path": "facial_evidence.face_position",
      "claim": "face visible in profile",
      "value": "true",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_facial_evidence_002",
      "module": "human_appearance",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth neutral",
      "value": "true",
      "supporting_observation_ids": [
        "obs_expression_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_facial_evidence_003",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "yellow eyes",
      "value": "true",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "blue sky with clouds",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "terrain",
      "claim": "mountains visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "sky",
      "claim": "sun visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_001",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "bright lighting with lens flare effects",
      "value": "true",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text present in Japanese",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "supporter label present in Japanese",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "trainer label present in Japanese",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "lower descriptive text present in Japanese",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "set symbol and collector number visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "copyright and legal text visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown human male figure",
      "identity_confidence": 0.9,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "neck",
        "shoulders"
      ],
      "physical_features": [
        "blond hair",
        "yellow eyes"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "right",
      "action_state": [
        "right hand forming OK"
      ],
      "facial_evidence": {
        "eyes": "visible and yellow",
        "mouth": "neutral",
        "eyebrows": "not visible",
        "face_position": "side-profile",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black long sleeved shirt",
        "red belt bag"
      ],
      "colors": [
        "black",
        "blond",
        "red"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_lighting_001"
    ],
    "midground": [
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_expression_001",
      "obs_eyes_001",
      "obs_face_001",
      "obs_gesture_001",
      "obs_hair_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "clouds",
      "sun"
    ],
    "ground": [],
    "terrain": [
      "mountains"
    ],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
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
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright",
      "lens flare"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights on hair and clothing"
    ],
    "composition": [
      "central figure framing",
      "diagonal light rays"
    ],
    "camera_angle": "side profile close-up",
    "framing": "tight around upper body",
    "cropping": [
      "tight crop of subject"
    ],
    "depth": "deep with background mountains",
    "motion_cues": [
      "light rays implying energy or motion"
    ],
    "motifs": [
      "angular light streaks"
    ],
    "repeated_shapes": [
      "angular shards and light streaks"
    ],
    "style_cues": [
      "with sharp lines"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
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
        "fact_facial_evidence_001",
        "fact_facial_evidence_002",
        "fact_facial_evidence_003",
        "fact_gesture_001",
        "fact_hair_001",
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "neutral mouth",
            "yellow eyes"
          ],
          "supporting_observation_ids": [
            "obs_expression_001",
            "obs_eyes_001"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "visibility": "visible",
          "details": [
            "right hand forming OK sign"
          ],
          "supporting_observation_ids": [
            "obs_gesture_001"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "side-profile",
          "eyes": "yellow",
          "mouth": "neutral",
          "eyebrows": "not visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_expression_001",
            "obs_eyes_001",
            "obs_face_001"
          ],
          "confidence": 0.9
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blond hair",
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
          "label": "right hand OK sign",
          "details": [],
          "supporting_observation_ids": [
            "obs_gesture_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_pose_001"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "standing"
          ],
          "orientation": "right",
          "action_state": [
            "right hand forming OK"
          ],
          "supporting_observation_ids": [
            "obs_gesture_001",
            "obs_pose_001"
          ],
          "confidence": 0.99
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_clothing_001",
        "fact_clothing_002",
        "fact_clothing_003"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and arms",
          "garment": "black long sleeved shirt",
          "neckline_type": "",
          "sleeve_type": "long sleeves",
          "colors": [
            "black"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_001",
            "obs_clothing_002"
          ],
          "confidence": 0.9
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "red belt bag",
          "details": [],
          "supporting_observation_ids": [
            "obs_clothing_003"
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
      "fact_ids": [
        "fact_visual_001"
      ],
      "observation_ids": [
        "obs_lighting_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_visual_001"
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
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004",
        "fact_card_ui_005",
        "fact_card_ui_006"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001",
        "obs_card_ui_002",
        "obs_card_ui_003"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_005"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_005"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_006"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_004"
      ],
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
        "male human figure",
        "blond hair",
        "black outfit",
        "long sleeved shirt",
        "red belt bag",
        "standing",
        "right hand ok sign",
        "side face visible"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
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
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "semantic_fact_id": "sem_fact_001",
      "category": "action",
      "label": "standing",
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
          "standing body position"
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
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "action",
      "label": "right hand forming OK sign",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_gesture_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "right hand forming OK sign"
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
      "term": "male human figure",
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
      "term": "black outfit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "long sleeved shirt",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "red belt bag",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ]
    },
    {
      "term": "standing",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "right hand ok sign",
      "supporting_observation_ids": [
        "obs_gesture_001"
      ]
    },
    {
      "term": "side face visible",
      "supporting_observation_ids": [
        "obs_face_001"
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
        "confidence": 0.95
      },
      {
        "concept": "right hand forming OK sign",
        "source_observation_ids": [
          "obs_gesture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_gesture_001",
          "obs_pose_001",
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
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_gesture_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sun",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-111 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.93`
- Cost USD: `0.0094684`
- Artwork observations: `9`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: unknown female human. Visible observations: human female, purple hair curly, hands clasped, white coat purple blue details, black purple dress stripes, blue gloves purple accents, crown blue gold black spiral, face purple eyes neutral. Semantic facts: hands clasped.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human figure | human female | scene_subject | foreground | high | 0.99 |
| purple long hair with curls | purple hair curly | human_appearance | foreground | high | 0.99 |
| hands clasped | hands clasped | human_appearance | foreground | high | 0.98 |
| white coat with purple and blue details | white coat purple blue details | clothing | foreground | high | 0.99 |
| black and purple dress with horizontal stripes | black purple dress stripes | clothing | foreground | high | 0.99 |
| blue gloves with purple accents | blue gloves purple accents | clothing | foreground | high | 0.98 |
| blue and gold crown with spiral black decorations | crown blue gold black spiral | clothing | foreground | high | 0.99 |
| face with visible purple eyes, neutral expression | face purple eyes neutral | human_appearance | foreground | high | 0.99 |
| gray stone wall and stairs background indoor | stone wall stairs indoor | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | Presence of a female human subject in the scene | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | Hair color and style are purple with curls | obs_hair_001 | 0.99 |
| fact_003 | human_appearance | Hands are clasped | obs_hand_gesture_001 | 0.98 |
| fact_004 | clothing | Wears a white coat with purple and blue details | obs_clothing_001 | 0.99 |
| fact_005 | clothing | Black and purple dress with horizontal stripes under coat | obs_clothing_002 | 0.99 |
| fact_006 | clothing | Wears blue gloves with purple accents | obs_accessory_001 | 0.98 |
| fact_007 | clothing | Wears a blue and gold crown with spiral black decorations | obs_accessory_002 | 0.99 |
| fact_008 | human_appearance | Face visible with purple eyes and | obs_face_001 | 0.99 |
| fact_009 | environment | Indoor stone wall background with stairs | obs_environment_001 | 0.95 |

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
| environment | complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_crop | medium | medium | name_text: visible card name text partially cropped, not fully readable; collector_number: collector number partially cropped and hard to read; set_symbol: set symbol partially cropped and unreadable; rarity_mark: rarity mark partially cropped and unreadable; copyright_line: copyright line faint and partially cropped, low confidence OCR; bottom_line_text: bottom line print text partially cropped and unreadable; illustrator_text: illustrator text partly cropped and unclear |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | action | hands clasped | obs_subject_001 | obs_hand_gesture_001 | hands clasped | 0.98 |

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
| curly hair | obs_hair_001 |
| blue and gold crown | obs_accessory_002 |
| white coat | obs_clothing_001 |
| indoor stone wall environment | obs_environment_001 |
| stairs background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.98 |
| gloves | obs_accessory_001 | deterministic_rule | 0.98 |
| hands clasped | obs_hand_gesture_001 | deterministic_rule | 0.98 |
| spiral motif | obs_accessory_002 | deterministic_rule | 0.99 |
| stairs | obs_environment_001 | deterministic_rule | 0.95 |
| standing | obs_subject_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown female human. Visible observations: human female, purple hair curly, hands clasped, white coat purple blue details, black purple dress stripes, blue gloves purple accents, crown blue gold black spiral, face purple eyes neutral. Semantic facts: hands clasped.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human figure",
      "normalized_label": "human female",
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
      "label": "purple long hair with curls",
      "normalized_label": "purple hair curly",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_gesture_001",
      "kind": "human_appearance",
      "label": "hands clasped",
      "normalized_label": "hands clasped",
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
      "label": "white coat with purple and blue details",
      "normalized_label": "white coat purple blue details",
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
      "label": "black and purple dress with horizontal stripes",
      "normalized_label": "black purple dress stripes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing",
      "label": "blue gloves with purple accents",
      "normalized_label": "blue gloves purple accents",
      "scene_layer": "foreground",
      "frame_position": "center_lower",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_002",
      "kind": "clothing",
      "label": "blue and gold crown with spiral black decorations",
      "normalized_label": "crown blue gold black spiral",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "face with visible purple eyes, neutral expression",
      "normalized_label": "face purple eyes neutral",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "gray stone wall and stairs background indoor",
      "normalized_label": "stone wall stairs indoor",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "Presence of a female human subject in the scene",
      "value": "true",
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
      "claim": "Hair color and style are purple with curls",
      "value": "purple long hair with curls",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "gesture[0]",
      "claim": "Hands are clasped",
      "value": "hands clasped",
      "supporting_observation_ids": [
        "obs_hand_gesture_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "Wears a white coat with purple and blue details",
      "value": "white coat with purple and blue details",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "Black and purple dress with horizontal stripes under coat",
      "value": "black and purple dress with horizontal stripes",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "Wears blue gloves with purple accents",
      "value": "blue gloves with purple accents",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "clothing",
      "field_path": "accessories[1]",
      "claim": "Wears a blue and gold crown with spiral black decorations",
      "value": "blue and gold crown with black spiral decorations",
      "supporting_observation_ids": [
        "obs_accessory_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "human_appearance",
      "field_path": "face[0]",
      "claim": "Face visible with purple eyes and",
      "value": "face with purple eyes",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "Indoor stone wall background with stairs",
      "value": "stone wall and stairs indoor",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown female human",
      "identity_confidence": 0.98,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "neck",
        "shoulders"
      ],
      "physical_features": [
        "purple eyes",
        "purple hair"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "forward",
      "action_state": [
        "hands clasped"
      ],
      "facial_evidence": {
        "eyes": "visible purple eyes",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "visible face",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black and purple dress",
        "blue and gold crown",
        "blue gloves",
        "white coat"
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
      "obs_accessory_001",
      "obs_accessory_002",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_face_001",
      "obs_hair_001",
      "obs_hand_gesture_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor",
      "stairs",
      "stone walls"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [
      "stone"
    ],
    "plants": [],
    "architecture": [
      "stairs",
      "stone wall"
    ],
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
      "gold",
      "gray",
      "purple",
      "white"
    ],
    "lighting": [
      "soft indoor lighting"
    ],
    "shadows": [
      "soft shadows on stairs and walls"
    ],
    "highlights": [
      "subtle highlights on hair and clothing"
    ],
    "composition": [
      "centered subject",
      "framing stairs background"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing on subject from waist up",
    "cropping": [
      "full body subject visible"
    ],
    "depth": "moderate depth with background stairs",
    "motion_cues": [],
    "motifs": [
      "horizontal stripes on dress",
      "spiral motif on crown"
    ],
    "repeated_shapes": [
      "curly hair spirals",
      "horizontal streaks"
    ],
    "style_cues": [
      "anime-style illustration",
      "digital art"
    ],
    "supporting_observation_ids": [
      "obs_accessory_002",
      "obs_clothing_001",
      "obs_clothing_002",
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
        "fact_008"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "purple eyes"
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
          "face_position": "visible face",
          "eyes": "visible purple eyes",
          "mouth": "neutral",
          "eyebrows": "neutral",
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
          "label": "purple long hair with curls",
          "details": [
            "curly hair spirals"
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
          "details": [],
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
      "pose_orientation": [],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "white coat",
          "neckline_type": "collar",
          "sleeve_type": "long sleeves",
          "colors": [
            "blue",
            "purple",
            "white"
          ],
          "visible_details": [
            "purple and blue details"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black and purple dress",
          "neckline_type": "round",
          "sleeve_type": "none visible",
          "colors": [
            "black",
            "purple"
          ],
          "visible_details": [
            "horizontal stripes"
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
          "label": "blue gloves with purple accents",
          "details": [],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue and gold crown with spiral black decorations",
          "details": [
            "spiral motif"
          ],
          "supporting_observation_ids": [
            "obs_accessory_002"
          ],
          "confidence": 0.99
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_009"
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
        "curly hair",
        "blue and gold crown",
        "white coat",
        "indoor stone wall environment",
        "stairs background"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text",
          "reason": "visible card name text partially cropped, not fully readable",
          "affected_observation_ids": []
        },
        {
          "field_path": "collector_number",
          "reason": "collector number partially cropped and hard to read",
          "affected_observation_ids": []
        },
        {
          "field_path": "set_symbol",
          "reason": "set symbol partially cropped and unreadable",
          "affected_observation_ids": []
        },
        {
          "field_path": "rarity_mark",
          "reason": "rarity mark partially cropped and unreadable",
          "affected_observation_ids": []
        },
        {
          "field_path": "copyright_line",
          "reason": "copyright line faint and partially cropped, low confidence OCR",
          "affected_observation_ids": []
        },
        {
          "field_path": "bottom_line_text",
          "reason": "bottom line print text partially cropped and unreadable",
          "affected_observation_ids": []
        },
        {
          "field_path": "illustrator_text",
          "reason": "illustrator text partly cropped and unclear",
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
      "term": "curly hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "blue and gold crown",
      "supporting_observation_ids": [
        "obs_accessory_002"
      ]
    },
    {
      "term": "white coat",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "indoor stone wall environment",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "stairs background",
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
        "confidence": 0.98
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_accessory_001"
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
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_accessory_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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

### GV-PK-JPN-M5-075 - カスミの元気

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.01023`
- Artwork observations: `11`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female human. Visible observations: indoor room, plant, table. Semantic facts: winking.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human | female human | scene_subject | foreground | primary | 0.99 |
| hair | hair | human_appearance | foreground | primary | 0.99 |
| top | top | clothing | foreground | primary | 0.99 |
| shorts | shorts | clothing | foreground | primary | 0.99 |
| wristband | wristband | clothing | foreground | secondary | 0.95 |
| hair ties | hair ties | clothing | foreground | secondary | 0.95 |
| indoor room | indoor room | environment | background | medium | 0.99 |
| plant | plant | objects_and_props | midground | medium | 0.98 |
| metal table | table | objects_and_props | midground | medium | 0.98 |
| face | face | human_appearance | foreground | primary | 0.99 |
| winking | winking | human_appearance | foreground | primary | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_gender_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_hair_appearance_001 | human_appearance | hair color and style | obs_accessory_002, obs_hair_001 | 0.98 |
| fact_clothing_top_001 | clothing | top color and style | obs_clothing_001 | 0.99 |
| fact_clothing_bottom_001 | clothing | bottom color and style | obs_clothing_002 | 0.99 |
| fact_accessories_001 | clothing | left wristband color and type | obs_accessory_001 | 0.95 |
| fact_clothing_hair_ties_001 | clothing | hair ties color and style | obs_accessory_002 | 0.95 |
| fact_pose_001 | creature_anatomy | pose | obs_expression_001, obs_subject_001 | 0.95 |
| fact_environment_001 | environment | indoors | obs_environment_001 | 0.99 |
| fact_objects_001 | objects_and_props | plant | obs_object_001 | 0.98 |
| fact_objects_002 | objects_and_props | metal table | obs_object_002 | 0.98 |

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
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text_observation_ids: name text blurry and partially small, partially readable, verified by visible Japanese text; collector_number_observation_ids: collector number text small and blurry |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001 | expression | winking | obs_subject_001 | obs_expression_001 | smiling one eye closed in wink one eye open neutral face fully visible body leaning forward right arm extended leaning forward reaching outward | 0.95 |

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
| orange hair ponytails | obs_accessory_002, obs_hair_001 |
| blue athletic outfit | obs_clothing_001, obs_clothing_002 |
| indoor room | obs_environment_001 |
| green plant | obs_object_001 |
| metal table | obs_object_002 |
| winking girl | obs_expression_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_expression_001, obs_subject_001 | deterministic_rule | 0.99 |
| leaning forward | obs_expression_001, obs_subject_001 | deterministic_rule | 0.99 |
| open hand | obs_expression_001, obs_subject_001 | deterministic_rule | 0.95 |
| plant | obs_object_001 | deterministic_rule | 0.98 |
| reaching | obs_expression_001, obs_subject_001 | deterministic_rule | 0.99 |
| table | obs_object_002 | deterministic_rule | 0.98 |
| winking | obs_expression_001 | deterministic_rule | 0.95 |
| winking expression | obs_expression_001, obs_subject_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human. Visible observations: indoor room, plant, table. Semantic facts: winking.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human",
      "normalized_label": "female human",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "hair",
      "normalized_label": "hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "top",
      "normalized_label": "top",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "shorts",
      "normalized_label": "shorts",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing",
      "label": "wristband",
      "normalized_label": "wristband",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_002",
      "kind": "clothing",
      "label": "hair ties",
      "normalized_label": "hair ties",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor room",
      "normalized_label": "indoor room",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "plant",
      "normalized_label": "plant",
      "scene_layer": "midground",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "objects_and_props",
      "label": "metal table",
      "normalized_label": "table",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "face",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_expression_001",
      "kind": "human_appearance",
      "label": "winking",
      "normalized_label": "winking",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_gender_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "subject identity",
      "value": "female human",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_appearance_001",
      "module": "human_appearance",
      "field_path": "hair[0].label",
      "claim": "hair color and style",
      "value": "short orange hair tied in twin ponytails",
      "supporting_observation_ids": [
        "obs_accessory_002",
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_top_001",
      "module": "clothing",
      "field_path": "garments[0].garment",
      "claim": "top color and style",
      "value": "dark blue cropped tank top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_bottom_001",
      "module": "clothing",
      "field_path": "garments[1].garment",
      "claim": "bottom color and style",
      "value": "dark blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessories_001",
      "module": "clothing",
      "field_path": "accessories[0].label",
      "claim": "left wristband color and type",
      "value": "black wristband",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_hair_ties_001",
      "module": "clothing",
      "field_path": "accessories[1].label",
      "claim": "hair ties color and style",
      "value": "black hair ties in ponytails",
      "supporting_observation_ids": [
        "obs_accessory_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose[0].pose",
      "claim": "pose",
      "value": "winking woman leaning forward with one hand extended",
      "supporting_observation_ids": [
        "obs_expression_001",
        "obs_subject_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "indoors",
      "value": "indoor room with tiled floor and large windows",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_001",
      "module": "objects_and_props",
      "field_path": "objects[0].label",
      "claim": "plant",
      "value": "green leafy plant to the left",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_002",
      "module": "objects_and_props",
      "field_path": "objects[1].label",
      "claim": "metal table",
      "value": "metal table to the right with horizontal bars",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.98,
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
        "arms",
        "face",
        "hands",
        "legs",
        "midriff",
        "upper chest"
      ],
      "physical_features": [
        "orange hair tied in twin ponytails"
      ],
      "pose": [
        "leaning forward",
        "reaching"
      ],
      "orientation": "forward",
      "action_state": [
        "winking"
      ],
      "facial_evidence": {
        "eyes": "one eye open, one eye winking",
        "mouth": "smiling mouth open with teeth visible",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": [
          "face fully visible"
        ]
      },
      "clothing_or_accessories": [
        "black hair ties",
        "black wristband on left wrist",
        "dark blue cropped tank top",
        "dark blue shorts"
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
      "obs_accessory_002",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_expression_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_object_001",
      "obs_object_002"
    ],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor room"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "tiled floor"
    ],
    "terrain": [],
    "plants": [
      "green leafy plant"
    ],
    "architecture": [
      "large windows"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "daytime with natural light"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_object_001",
      "obs_object_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "plant",
      "normalized_label": "plant",
      "object_type": "plant",
      "colors": [
        "green"
      ],
      "material_appearance": [
        "leafy"
      ],
      "location": "left side near window",
      "count_reference": "count_plant_001",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_object_002",
      "label": "metal table",
      "normalized_label": "table",
      "object_type": "furniture",
      "colors": [
        "blue",
        "grey"
      ],
      "material_appearance": [
        "flat surface",
        "metallic"
      ],
      "location": "right side in middle ground",
      "count_reference": "count_table_001",
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
      "bright"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "natural highlights on hair and skin"
    ],
    "composition": [
      "foreground subject with background windows and plants",
      "subject centered"
    ],
    "camera_angle": "eye-level",
    "framing": "medium close-up",
    "cropping": [
      "full subject visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [
      "subject leaning forward, arm extended"
    ],
    "motifs": [
      "modern indoor gym or room theme"
    ],
    "repeated_shapes": [
      "rectangular tiles",
      "window panes"
    ],
    "style_cues": [
      "anime-style illustration"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_object_001",
      "obs_object_002",
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
        "fact_subject_gender_001"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_hair_appearance_001",
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "one eye winking",
            "smiling mouth open with teeth visible"
          ],
          "supporting_observation_ids": [
            "obs_expression_001",
            "obs_face_001"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "one eye open, one eye winking",
          "mouth": "smiling mouth open with teeth visible",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "face fully visible"
          ],
          "supporting_observation_ids": [
            "obs_expression_001",
            "obs_face_001"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange hair tied in twin ponytails",
          "details": [
            "short hair",
            "two high ponytails secured with black hair ties"
          ],
          "supporting_observation_ids": [
            "obs_accessory_002",
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "leaning forward with right arm extended and open hand",
          "details": [
            "body posture forward-leaning",
            "right hand open, reaching outward"
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
          "label": "black wristband on left wrist",
          "details": [
            "simple black colored wristband"
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
        "fact_pose_001"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "leaning forward",
            "open hand",
            "reaching",
            "winking expression"
          ],
          "orientation": "forward",
          "action_state": [
            "winking"
          ],
          "supporting_observation_ids": [
            "obs_expression_001",
            "obs_subject_001"
          ],
          "confidence": 0.95
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_accessories_001",
        "fact_clothing_bottom_001",
        "fact_clothing_hair_ties_001",
        "fact_clothing_top_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper body",
          "garment": "dark blue cropped tank top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "dark blue"
          ],
          "visible_details": [
            "cropped design exposing midriff"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "lower body",
          "garment": "dark blue shorts",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "dark blue"
          ],
          "visible_details": [
            "shorts ending upper thighs"
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
          "label": "black wristband",
          "details": [
            "simple wristband on left wrist"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black hair ties",
          "details": [
            "two black hair ties securing ponytails"
          ],
          "supporting_observation_ids": [
            "obs_accessory_002"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_objects_001",
        "fact_objects_002"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_002"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_object_001",
        "obs_object_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_pose_001"
      ],
      "observation_ids": [
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_clothing_bottom_001",
        "fact_clothing_top_001",
        "fact_hair_appearance_001"
      ],
      "observation_ids": [
        "obs_clothing_001",
        "obs_clothing_002",
        "obs_hair_001"
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
        "orange hair ponytails",
        "blue athletic outfit",
        "indoor room",
        "green plant",
        "metal table",
        "winking girl"
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
          "field_path": "name_text_observation_ids",
          "reason": "name text blurry and partially small, partially readable, verified by visible Japanese text",
          "affected_observation_ids": []
        },
        {
          "field_path": "collector_number_observation_ids",
          "reason": "collector number text small and blurry",
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
      "semantic_fact_id": "sem_fact_001",
      "category": "expression",
      "label": "winking",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_expression_001"
      ],
      "evidence": {
        "mouth": [
          "smiling"
        ],
        "eyes": [
          "one eye closed in wink",
          "one eye open"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "face fully visible"
        ],
        "body_language": [
          "body leaning forward",
          "right arm extended"
        ],
        "body_position": [
          "leaning forward"
        ],
        "motion_state": [
          "reaching outward"
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
      "term": "orange hair ponytails",
      "supporting_observation_ids": [
        "obs_accessory_002",
        "obs_hair_001"
      ]
    },
    {
      "term": "blue athletic outfit",
      "supporting_observation_ids": [
        "obs_clothing_001",
        "obs_clothing_002"
      ]
    },
    {
      "term": "indoor room",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "green plant",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "metal table",
      "supporting_observation_ids": [
        "obs_object_002"
      ]
    },
    {
      "term": "winking girl",
      "supporting_observation_ids": [
        "obs_expression_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_expression_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "leaning forward",
        "source_observation_ids": [
          "obs_expression_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "open hand",
        "source_observation_ids": [
          "obs_expression_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_expression_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "table",
        "source_observation_ids": [
          "obs_object_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "winking",
        "source_observation_ids": [
          "obs_expression_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "winking expression",
        "source_observation_ids": [
          "obs_expression_001",
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

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.94`
- Attribute confidence: `0.93`
- Cost USD: `0.0090356`
- Artwork observations: `9`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: dark sky, lightning bolts, lightning bolt, tree, trees, trees, aurora light bands, mountain range. Semantic facts: night, lightning, aurora-like light bands, trees. Counts: trees: many.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| night sky | dark sky | sky | background | high | 0.99 |
| three lightning bolts | lightning bolts | object | midground | high | 0.98 |
| one lightning bolt red at tree | lightning bolt | object | midground | medium | 0.95 |
| tree struck by red lightning | tree | object | midground | medium | 0.94 |
| group of dark silhouetted leafless trees | trees | object | midground | medium | 0.95 |
| trees with a mix of leafless and evergreen | trees | object | midground | medium | 0.93 |
| aurora-like green and red light bands in sky | aurora light bands | object | background | high | 0.97 |
| mountain range silhouette at horizon | mountain range | object | background | medium | 0.96 |
| dark ground terrain in foreground | ground | object | foreground | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_environment_001 | environment | sky | obs_sky_001 | 0.99 |
| fact_environment_002 | environment | weather | obs_lightning_001, obs_lightning_002 | 0.98 |
| fact_environment_003 | environment | plants | obs_red_lightning_tree_001, obs_trees_001, obs_trees_002 | 0.96 |
| fact_environment_004 | environment | terrain | obs_mountain_range_001 | 0.96 |
| fact_environment_005 | environment | ground | obs_ground_001 | 0.96 |
| fact_environment_006 | environment | sky | obs_light_bands_001 | 0.97 |

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
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | card_ui_and_print_markers.name_text_observation_ids: partially unreadable text, possible OCR ambiguity |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_001 | environment | night |  | obs_sky_001 | dark sky | 0.99 |
| sem_002 | environment | lightning |  | obs_lightning_001, obs_lightning_002 | zig-zag bright white and red lines dark sky lightning bolts red lightning lightning strikes tree | 0.98 |
| sem_003 | environment | aurora-like light bands |  | obs_light_bands_001 | aurora-like colored light bands | 0.97 |
| sem_004 | environment | trees |  | obs_red_lightning_tree_001, obs_trees_001, obs_trees_002 | leafless and evergreen trees trees struck by lightning lightning strikes tree | 0.96 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| trees | many | density and overlapping | obs_red_lightning_tree_001, obs_trees_001, obs_trees_002 | 0.9 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| striking | obs_lightning_002 | obs_red_lightning_tree_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| card_ui_and_print_markers.name_text_observation_ids | partially unreadable card name text area |  |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| lightning | obs_lightning_001, obs_lightning_002 |
| aurora | obs_light_bands_001 |
| trees | obs_red_lightning_tree_001, obs_trees_001, obs_trees_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora-like light bands | obs_light_bands_001 | deterministic_rule | 0.97 |
| centered composition | obs_lightning_001 | deterministic_rule | 0.92 |
| lightning | obs_lightning_001, obs_lightning_002 | deterministic_rule | 0.98 |
| night | obs_sky_001 | deterministic_rule | 0.99 |
| sky | obs_sky_001 | deterministic_rule | 0.99 |
| terrain | obs_ground_001, obs_mountain_range_001 | deterministic_rule | 0.96 |
| tree | obs_red_lightning_tree_001, obs_trees_001, obs_trees_002 | deterministic_rule | 0.95 |
| trees | obs_red_lightning_tree_001, obs_trees_001, obs_trees_002 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark sky, lightning bolts, lightning bolt, tree, trees, trees, aurora light bands, mountain range. Semantic facts: night, lightning, aurora-like light bands, trees. Counts: trees: many.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_count_reference_inconsistent`, `potential_metadata_or_identity_language`, `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "night sky",
      "normalized_label": "dark sky",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_001",
      "kind": "object",
      "label": "three lightning bolts",
      "normalized_label": "lightning bolts",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_002",
      "kind": "object",
      "label": "one lightning bolt red at tree",
      "normalized_label": "lightning bolt",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_red_lightning_tree_001",
      "kind": "object",
      "label": "tree struck by red lightning",
      "normalized_label": "tree",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "object",
      "label": "group of dark silhouetted leafless trees",
      "normalized_label": "trees",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_002",
      "kind": "object",
      "label": "trees with a mix of leafless and evergreen",
      "normalized_label": "trees",
      "scene_layer": "midground",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_bands_001",
      "kind": "object",
      "label": "aurora-like green and red light bands in sky",
      "normalized_label": "aurora light bands",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mountain_range_001",
      "kind": "object",
      "label": "mountain range silhouette at horizon",
      "normalized_label": "mountain range",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ground_001",
      "kind": "object",
      "label": "dark ground terrain in foreground",
      "normalized_label": "ground",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky",
      "value": "dark sky",
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
      "claim": "weather",
      "value": "lightning",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "plants",
      "value": "trees",
      "supporting_observation_ids": [
        "obs_red_lightning_tree_001",
        "obs_trees_001",
        "obs_trees_002"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_004",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain",
      "value": "mountain range",
      "supporting_observation_ids": [
        "obs_mountain_range_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_005",
      "module": "environment",
      "field_path": "ground",
      "claim": "ground",
      "value": "dark terrain",
      "supporting_observation_ids": [
        "obs_ground_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_006",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky",
      "value": "aurora-like light bands",
      "supporting_observation_ids": [
        "obs_light_bands_001"
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
      "count_id": "count_trees_001",
      "normalized_label": "trees",
      "count_type": "many",
      "exact_count": 0,
      "estimated_min": 4,
      "estimated_max": 10,
      "abstention_reason": "density and overlapping",
      "supporting_observation_ids": [
        "obs_red_lightning_tree_001",
        "obs_trees_001",
        "obs_trees_002"
      ],
      "scene_layer": "midground",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_ground_001"
    ],
    "midground": [
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_red_lightning_tree_001",
      "obs_trees_001",
      "obs_trees_002"
    ],
    "background": [
      "obs_light_bands_001",
      "obs_mountain_range_001",
      "obs_sky_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "aurora-like light bands",
      "dark sky"
    ],
    "ground": [
      "dark terrain"
    ],
    "terrain": [
      "mountain range"
    ],
    "plants": [
      "trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [
      "lightning"
    ],
    "time_of_day_cues": [
      "night"
    ],
    "supporting_observation_ids": [
      "obs_ground_001",
      "obs_light_bands_001",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_mountain_range_001",
      "obs_red_lightning_tree_001",
      "obs_sky_001",
      "obs_trees_001",
      "obs_trees_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_lightning_001",
      "label": "three lightning bolts",
      "normalized_label": "lightning bolts",
      "object_type": "natural phenomenon",
      "colors": [
        "pinkish",
        "white"
      ],
      "material_appearance": [
        "bright light"
      ],
      "location": "center midground",
      "count_reference": "count_lightning_bolts_001",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_lightning_002",
      "label": "lightning bolt red at tree",
      "normalized_label": "lightning bolt",
      "object_type": "natural phenomenon",
      "colors": [
        "red",
        "white"
      ],
      "material_appearance": [
        "bright light"
      ],
      "location": "right midground",
      "count_reference": "count_lightning_bolts_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_red_lightning_tree_001",
      "label": "tree struck by lightning",
      "normalized_label": "tree",
      "object_type": "plant",
      "colors": [
        "black",
        "dark gray"
      ],
      "material_appearance": [
        "rough bark"
      ],
      "location": "right midground",
      "count_reference": "count_trees_001",
      "confidence": 0.94
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_lightning_002",
      "target_observation_id": "obs_red_lightning_tree_001",
      "relationship": "striking",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "black",
      "dark blue",
      "green",
      "red",
      "white"
    ],
    "lighting": [
      "bright lightning illumination",
      "nighttime scene lighting"
    ],
    "shadows": [
      "deep shadows on terrain and trees"
    ],
    "highlights": [
      "lightning bright highlights"
    ],
    "composition": [
      "aurora-like light bands in upper background",
      "centered lightning bolts"
    ],
    "camera_angle": "frontal gaze",
    "framing": "tight card border framing",
    "cropping": [
      "full card art visible"
    ],
    "depth": "clear depth from foreground, midground to background",
    "motion_cues": [
      "lightning lines"
    ],
    "motifs": [
      "aurora light bands",
      "lightning"
    ],
    "repeated_shapes": [
      "branches",
      "lightning zig-zag lines"
    ],
    "style_cues": [
      "dark atmospheric",
      "lighting"
    ],
    "supporting_observation_ids": [
      "obs_ground_001",
      "obs_light_bands_001",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_mountain_range_001",
      "obs_red_lightning_tree_001",
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
        "fact_environment_002"
      ],
      "object_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_red_lightning_tree_001"
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
        "obs_ground_001",
        "obs_light_bands_001",
        "obs_lightning_001",
        "obs_lightning_002",
        "obs_mountain_range_001",
        "obs_red_lightning_tree_001",
        "obs_sky_001",
        "obs_trees_001",
        "obs_trees_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_light_bands_001",
        "obs_lightning_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_light_bands_001",
        "obs_lightning_001",
        "obs_sky_001"
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
      "fact_ids": [
        "fact_count_trees_001"
      ],
      "count_ids": [
        "count_trees_001"
      ]
    },
    "relationships": {
      "fact_ids": [
        "fact_rel_001"
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
        "lightning",
        "aurora",
        "trees"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "card_ui_and_print_markers.name_text_observation_ids",
          "reason": "partially unreadable text, possible OCR ambiguity",
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
      "review_status": "complete",
      "omission_risk": "low",
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
      "semantic_fact_id": "sem_001",
      "category": "environment",
      "label": "night",
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
          "dark sky"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_002",
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
        "motion_state": [
          "zig-zag bright white and red lines"
        ],
        "environment": [
          "dark sky"
        ],
        "objects": [
          "lightning bolts",
          "red lightning"
        ],
        "relationships": [
          "lightning strikes tree"
        ],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_003",
      "category": "environment",
      "label": "aurora-like light bands",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_light_bands_001"
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
          "aurora-like colored light bands"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_004",
      "category": "environment",
      "label": "trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_red_lightning_tree_001",
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
          "leafless and evergreen trees"
        ],
        "objects": [
          "trees struck by lightning"
        ],
        "relationships": [
          "lightning strikes tree"
        ],
        "other": []
      },
      "confidence": 0.96,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [
    {
      "field": "card_ui_and_print_markers.name_text_observation_ids",
      "reason": "partially unreadable card name text area",
      "affected_observation_ids": []
    }
  ],
  "fact_grounded_search_terms": [
    {
      "term": "lightning",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ]
    },
    {
      "term": "aurora",
      "supporting_observation_ids": [
        "obs_light_bands_001"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_red_lightning_tree_001",
        "obs_trees_001",
        "obs_trees_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_lightning_001"
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
        "confidence": 0.98
      },
      {
        "concept": "night",
        "source_observation_ids": [
          "obs_sky_001"
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
        "concept": "terrain",
        "source_observation_ids": [
          "obs_ground_001",
          "obs_mountain_range_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_red_lightning_tree_001",
          "obs_trees_001",
          "obs_trees_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "trees",
        "source_observation_ids": [
          "obs_red_lightning_tree_001",
          "obs_trees_001",
          "obs_trees_002"
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
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0087504`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium building, purple color bands, blue color bands, light blue color bands, green emblem on stadium building, stadium entrance with glass windows, pathway with green hedges and lights, pathway lights. Counts: pathway lights: 6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium building | stadium building | object | midground | high | 0.99 |
| purple color bands | purple color bands | object | midground | medium | 0.95 |
| blue color bands | blue color bands | object | midground | medium | 0.95 |
| light blue color bands | light blue color bands | object | midground | medium | 0.95 |
| green emblem on stadium building | green emblem on stadium building | object | midground | high | 0.99 |
| stadium entrance with glass windows | stadium entrance with glass windows | object | midground | medium | 0.98 |
| pathway with green hedges and lights | pathway with green hedges and lights | object | foreground | high | 0.97 |
| a row of pathway lights | pathway lights | object | foreground | medium | 0.97 |
| group of dark green trees | trees | object | background | medium | 0.96 |
| blue sky with white clouds | sky | object | background | medium | 0.98 |
| water body reflecting lights | water body | object | background | medium | 0.95 |
| metallic stadium roof structure | stadium roof structure | object | midground | medium | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_stadium_building_001 | 0.99 |
| fact_env_002 | environment | architecture | obs_stadium_structure_001 | 0.96 |
| fact_env_003 | environment | plants | obs_trees_001 | 0.96 |
| fact_env_004 | environment | sky | obs_sky_001 | 0.98 |
| fact_env_005 | environment | water | obs_water_001 | 0.95 |
| fact_env_006 | environment | terrain | obs_pathway_lights_001, obs_stadium_pathway_001 | 0.97 |

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
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text_observation_ids: text partially blurry and unreadable |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| pathway lights | exact | 6 | obs_pathway_lights_001 | 0.97 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| located on | obs_stadium_emblem_001 | obs_stadium_building_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| stadium building | obs_stadium_building_001 |
| trees | obs_trees_001 |
| blue sky | obs_sky_001 |
| water body | obs_water_001 |
| pathway lights | obs_pathway_lights_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_stadium_building_001, obs_stadium_emblem_001, obs_stadium_structure_001 | deterministic_rule | 0.99 |
| centered composition | obs_stadium_building_001, obs_stadium_emblem_001 | deterministic_rule | 0.92 |
| circular motif | obs_stadium_emblem_001 | deterministic_rule | 0.92 |
| emblem | obs_stadium_emblem_001 | deterministic_rule | 0.99 |
| sky | obs_sky_001 | deterministic_rule | 0.98 |
| tree | obs_trees_001 | deterministic_rule | 0.96 |
| water | obs_water_001 | deterministic_rule | 0.95 |
| window | obs_stadium_entrance_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium building, purple color bands, blue color bands, light blue color bands, green emblem on stadium building, stadium entrance with glass windows, pathway with green hedges and lights, pathway lights. Counts: pathway lights: 6.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_building_001",
      "kind": "object",
      "label": "stadium building",
      "normalized_label": "stadium building",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_color_bands_001",
      "kind": "object",
      "label": "purple color bands",
      "normalized_label": "purple color bands",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_color_bands_002",
      "kind": "object",
      "label": "blue color bands",
      "normalized_label": "blue color bands",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_color_bands_003",
      "kind": "object",
      "label": "light blue color bands",
      "normalized_label": "light blue color bands",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_emblem_001",
      "kind": "object",
      "label": "green emblem on stadium building",
      "normalized_label": "green emblem on stadium building",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_entrance_001",
      "kind": "object",
      "label": "stadium entrance with glass windows",
      "normalized_label": "stadium entrance with glass windows",
      "scene_layer": "midground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_pathway_001",
      "kind": "object",
      "label": "pathway with green hedges and lights",
      "normalized_label": "pathway with green hedges and lights",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pathway_lights_001",
      "kind": "object",
      "label": "a row of pathway lights",
      "normalized_label": "pathway lights",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "object",
      "label": "group of dark green trees",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_001",
      "kind": "object",
      "label": "blue sky with white clouds",
      "normalized_label": "sky",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_water_001",
      "kind": "object",
      "label": "water body reflecting lights",
      "normalized_label": "water body",
      "scene_layer": "background",
      "frame_position": "right_bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_structure_001",
      "kind": "object",
      "label": "metallic stadium roof structure",
      "normalized_label": "stadium roof structure",
      "scene_layer": "midground",
      "frame_position": "top_center",
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
      "value": "stadium building",
      "supporting_observation_ids": [
        "obs_stadium_building_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "architecture",
      "claim": "architecture",
      "value": "stadium roof structure",
      "supporting_observation_ids": [
        "obs_stadium_structure_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "plants",
      "value": "trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky",
      "value": "blue sky with white clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "water",
      "claim": "water",
      "value": "water body reflecting lights",
      "supporting_observation_ids": [
        "obs_water_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain",
      "value": "paved pathway with green hedges and pathway lights",
      "supporting_observation_ids": [
        "obs_pathway_lights_001",
        "obs_stadium_pathway_001"
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
      "count_id": "count_pathway_lights_001",
      "normalized_label": "pathway lights",
      "count_type": "exact",
      "exact_count": 6,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_pathway_lights_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.97
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_pathway_lights_001",
      "obs_stadium_pathway_001"
    ],
    "midground": [
      "obs_stadium_building_001",
      "obs_stadium_color_bands_001",
      "obs_stadium_color_bands_002",
      "obs_stadium_color_bands_003",
      "obs_stadium_emblem_001",
      "obs_stadium_entrance_001",
      "obs_stadium_structure_001"
    ],
    "background": [
      "obs_sky_001",
      "obs_trees_001",
      "obs_water_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium building"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "white clouds"
    ],
    "ground": [
      "paved pathway with green hedges and lights"
    ],
    "terrain": [
      "paved pathway"
    ],
    "plants": [
      "trees"
    ],
    "architecture": [
      "stadium roof structure"
    ],
    "water": [
      "water body"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_pathway_lights_001",
      "obs_sky_001",
      "obs_stadium_building_001",
      "obs_stadium_pathway_001",
      "obs_stadium_structure_001",
      "obs_trees_001",
      "obs_water_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_stadium_emblem_001",
      "label": "green emblem on stadium building",
      "normalized_label": "green emblem",
      "object_type": "emblem",
      "colors": [
        "green",
        "white"
      ],
      "material_appearance": [],
      "location": "stadium building facade",
      "count_reference": "count_emblem_001",
      "confidence": 0.99
    },
    {
      "observation_id": "obs_pathway_lights_001",
      "label": "pathway lights",
      "normalized_label": "pathway lights",
      "object_type": "lights",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "along pathway",
      "count_reference": "count_pathway_lights_001",
      "confidence": 0.97
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_stadium_emblem_001",
      "target_observation_id": "obs_stadium_building_001",
      "relationship": "located on",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "green",
      "purple",
      "white"
    ],
    "lighting": [
      "bright outdoor lighting"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "glossy highlights on stadium structure"
    ],
    "composition": [
      "centered stadium building",
      "foreground pathway leading into scene"
    ],
    "camera_angle": "eye-level angle",
    "framing": "tight framing on stadium front and pathway",
    "cropping": [
      "bottom cropped at pathway edges"
    ],
    "depth": "deep with foreground, midground, and background",
    "motion_cues": [],
    "motifs": [
      "architectural roof structure",
      "stadium circular emblem"
    ],
    "repeated_shapes": [
      "circular emblem shape",
      "row of pathway lights"
    ],
    "style_cues": [
      "detailed realistic painting style"
    ],
    "supporting_observation_ids": [
      "obs_pathway_lights_001",
      "obs_sky_001",
      "obs_stadium_building_001",
      "obs_stadium_emblem_001",
      "obs_stadium_pathway_001",
      "obs_stadium_structure_001",
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
        "fact_env_001"
      ],
      "object_observation_ids": [
        "obs_pathway_lights_001",
        "obs_stadium_emblem_001"
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
        "obs_pathway_lights_001",
        "obs_sky_001",
        "obs_stadium_building_001",
        "obs_stadium_pathway_001",
        "obs_stadium_structure_001",
        "obs_trees_001",
        "obs_water_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_stadium_building_001",
        "obs_stadium_pathway_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_sky_001",
        "obs_stadium_building_001",
        "obs_stadium_color_bands_001",
        "obs_stadium_color_bands_002",
        "obs_stadium_color_bands_003"
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
        "count_pathway_lights_001"
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
        "trees",
        "blue sky",
        "water body",
        "pathway lights"
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
      "abstentions": [
        {
          "field_path": "name_text_observation_ids",
          "reason": "text partially blurry and unreadable",
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
      "review_status": "complete",
      "omission_risk": "low",
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
      "term": "stadium building",
      "supporting_observation_ids": [
        "obs_stadium_building_001"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "water body",
      "supporting_observation_ids": [
        "obs_water_001"
      ]
    },
    {
      "term": "pathway lights",
      "supporting_observation_ids": [
        "obs_pathway_lights_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_stadium_building_001",
          "obs_stadium_emblem_001",
          "obs_stadium_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_stadium_building_001",
          "obs_stadium_emblem_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_stadium_emblem_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "emblem",
        "source_observation_ids": [
          "obs_stadium_emblem_001"
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
        "confidence": 0.98
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_water_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_stadium_entrance_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
- Attribute confidence: `0.95`
- Cost USD: `0.0070516`
- Artwork observations: `7`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: lava colors red orange.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| volcanic lava pool terrain | volcanic lava pool terrain | environment | background | salient | 0.98 |
| rock formation walls around the lava pool | rock formation walls | environment | background | prominent | 0.95 |
| rectangular raised fighting platform in lava pool | fighting platform | objects_and_props | midground | salient | 0.98 |
| steam or smoke rising from lava cracks | steam or smoke | objects_and_props | background | moderate | 0.9 |
| central composition with fighting platform in middle | central composition | composition | midground | salient | 0.99 |
| bright red and orange lava colors | lava colors red orange | color_and_light | background | high | 0.98 |
| dark gray and black rock colors | rock colors dark gray black | color_and_light | background | moderate | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_environment_001 | environment | The card depicts a volcanic lava pool terrain environment | obs_environment_001 | 0.98 |
| fact_environment_002 | environment | The card shows rock formation walls surrounding the lava pool | obs_environment_002 | 0.95 |
| fact_environment_003 | environment | There is a rectangular raised fighting platform in the middle of the lava pool | obs_environment_003 | 0.98 |
| fact_environment_004 | environment | Steam or smoke is visible rising from cracks in the lava | obs_environment_004 | 0.9 |
| fact_composition_001 | composition | The card artwork uses central composition with fighting platform in the middle | obs_composition_001 | 0.99 |
| fact_color_001 | color_and_light | The palette includes bright red and orange lava colors | obs_color_001 | 0.98 |
| fact_color_002 | color_and_light | The palette includes dark gray and black rock colors | obs_color_002 | 0.95 |

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
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
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
| volcanic lava pool terrain | obs_environment_001 |
| rock formation walls | obs_environment_002 |
| fighting platform | obs_environment_003 |
| steam or smoke | obs_environment_004 |
| central composition | obs_composition_001 |
| lava colors red orange | obs_color_001 |
| rock colors dark gray black | obs_color_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_composition_001 | deterministic_rule | 0.99 |
| smoke | obs_environment_004 | deterministic_rule | 0.9 |
| terrain | obs_color_002, obs_environment_001, obs_environment_002 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: lava colors red orange.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "volcanic lava pool terrain",
      "normalized_label": "volcanic lava pool terrain",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "rock formation walls around the lava pool",
      "normalized_label": "rock formation walls",
      "scene_layer": "background",
      "frame_position": "mid",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "objects_and_props",
      "label": "rectangular raised fighting platform in lava pool",
      "normalized_label": "fighting platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "objects_and_props",
      "label": "steam or smoke rising from lava cracks",
      "normalized_label": "steam or smoke",
      "scene_layer": "background",
      "frame_position": "varied",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "central composition with fighting platform in middle",
      "normalized_label": "central composition",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color_and_light",
      "label": "bright red and orange lava colors",
      "normalized_label": "lava colors red orange",
      "scene_layer": "background",
      "frame_position": "entire",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color_and_light",
      "label": "dark gray and black rock colors",
      "normalized_label": "rock colors dark gray black",
      "scene_layer": "background",
      "frame_position": "varied",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "The card depicts a volcanic lava pool terrain environment",
      "value": "volcanic lava pool terrain",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "terrain",
      "claim": "The card shows rock formation walls surrounding the lava pool",
      "value": "rock formation walls",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "There is a rectangular raised fighting platform in the middle of the lava pool",
      "value": "fighting platform",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_004",
      "module": "environment",
      "field_path": "other",
      "claim": "Steam or smoke is visible rising from cracks in the lava",
      "value": "steam or smoke",
      "supporting_observation_ids": [
        "obs_environment_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "composition",
      "claim": "The card artwork uses central composition with fighting platform in the middle",
      "value": "central composition",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "The palette includes bright red and orange lava colors",
      "value": "bright red and orange lava colors",
      "supporting_observation_ids": [
        "obs_color_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_002",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "The palette includes dark gray and black rock colors",
      "value": "dark gray and black rock colors",
      "supporting_observation_ids": [
        "obs_color_002"
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
    "foreground": [],
    "midground": [
      "obs_composition_001",
      "obs_environment_003"
    ],
    "background": [
      "obs_color_001",
      "obs_color_002",
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_004"
    ]
  },
  "environment": {
    "setting": [
      "volcanic lava pool terrain"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [],
    "ground": [
      "lava pool"
    ],
    "terrain": [
      "rock formation walls"
    ],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
      "obs_environment_004"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_environment_003",
      "label": "fighting platform",
      "normalized_label": "fighting platform",
      "object_type": "platform",
      "colors": [
        "black",
        "red"
      ],
      "material_appearance": [
        "matte",
        "solid"
      ],
      "location": "middle of lava pool",
      "count_reference": "not_visible",
      "confidence": 0.98
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "bright red",
      "dark gray",
      "orange"
    ],
    "lighting": [
      "bright lighting on platform"
    ],
    "shadows": [
      "shadows below platform edges"
    ],
    "highlights": [
      "highlighted lava flow edges"
    ],
    "composition": [
      "central composition"
    ],
    "camera_angle": "slightly angled top-down",
    "framing": "tight framing on platform and lava pool",
    "cropping": [
      "no crop"
    ],
    "depth": "moderate depth with layers of lava and rock walls",
    "motion_cues": [
      "steam rising"
    ],
    "motifs": [
      "lava flow pattern on platform"
    ],
    "repeated_shapes": [
      "lava cracks"
    ],
    "style_cues": [
      "stylized illustration"
    ],
    "supporting_observation_ids": [
      "obs_color_001",
      "obs_color_002",
      "obs_composition_001",
      "obs_environment_001",
      "obs_environment_003",
      "obs_environment_004"
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
        "fact_environment_003"
      ],
      "object_observation_ids": [
        "obs_environment_003"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001",
        "fact_environment_002",
        "fact_environment_003",
        "fact_environment_004"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004"
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
        "fact_color_002"
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
        "volcanic lava pool terrain",
        "rock formation walls",
        "fighting platform",
        "steam or smoke",
        "central composition",
        "lava colors red orange",
        "rock colors dark gray black"
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
      "term": "volcanic lava pool terrain",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "rock formation walls",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "fighting platform",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "steam or smoke",
      "supporting_observation_ids": [
        "obs_environment_004"
      ]
    },
    {
      "term": "central composition",
      "supporting_observation_ids": [
        "obs_composition_001"
      ]
    },
    {
      "term": "lava colors red orange",
      "supporting_observation_ids": [
        "obs_color_001"
      ]
    },
    {
      "term": "rock colors dark gray black",
      "supporting_observation_ids": [
        "obs_color_002"
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
        "confidence": 0.99
      },
      {
        "concept": "smoke",
        "source_observation_ids": [
          "obs_environment_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_color_002",
          "obs_environment_001",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11525-019 - High Pressure System

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `1`
- Attribute confidence: `1`
- Cost USD: `0.0065628`
- Artwork observations: `8`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Semantic facts: 7 palm trees. Counts: palm trees: 7.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| partly cloudy sky with blue areas and white clouds | sky partly cloudy | environment | background | salient | 1 |
| purple and blue diagonal light bands | colored light bands purple blue diagonal | environment | background | salient | 1 |
| rocky and sandy terrain with scattered stones | rocky sandy terrain | environment | midground | salient | 1 |
| bright green circular grassy area in center | circular green grassy area | environment | midground | salient | 1 |
| stone steps leading up to grassy area | stone steps | environment | midground | salient | 1 |
| multiple palm trees with green fronds | palm trees | environment | midground | salient | 1 |
| group of 7 palm trees visible | 7 palm trees | environment | midground | salient | 1 |
| stone wall in background | stone wall | environment | midground | salient | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_sky_001 | environment | sky condition | obs_env_sky_001 | 1 |
| fact_env_light_bands_001 | environment | presence of colored light bands | obs_env_light_bands_001 | 1 |
| fact_env_terrain_001 | environment | terrain type | obs_env_terrain_001 | 1 |
| fact_env_grass_patch_001 | environment | grassy area in terrain | obs_env_grass_patch_001 | 1 |
| fact_env_steps_001 | environment | presence of stone steps | obs_env_steps_001 | 1 |
| fact_env_trees_001 | environment | type of visible plants | obs_env_trees_001 | 1 |
| fact_env_trees_count_001 | counts | number of palm trees | obs_env_trees_group_001 | 1 |
| fact_env_architecture_001 | environment | presence of stone wall | obs_env_architecture_001 | 1 |

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
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_palm_tree_group_001 | environment | 7 palm trees |  | obs_env_trees_001, obs_env_trees_group_001 | visible palm trees, counted 7 | 1 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| palm trees | exact | 7 | obs_env_trees_group_001 | 1 |

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
| sky partly cloudy | obs_env_sky_001 |
| colored light bands purple blue diagonal | obs_env_light_bands_001 |
| rocky sandy terrain | obs_env_terrain_001 |
| circular green grassy area | obs_env_grass_patch_001 |
| stone steps | obs_env_steps_001 |
| palm trees | obs_env_trees_001 |
| 7 palm trees | obs_env_trees_group_001 |
| stone wall | obs_env_architecture_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| 7 palm trees | obs_env_trees_001, obs_env_trees_group_001 | deterministic_rule | 1 |
| aurora-like light bands | obs_env_light_bands_001 | deterministic_rule | 1 |
| circular motif | obs_env_grass_patch_001 | deterministic_rule | 1 |
| diagonal composition | obs_env_light_bands_001 | deterministic_rule | 1 |
| sky | obs_env_sky_001 | deterministic_rule | 1 |
| stairs | obs_env_steps_001 | deterministic_rule | 1 |
| terrain | obs_env_terrain_001 | deterministic_rule | 1 |
| tree | obs_env_trees_001, obs_env_trees_group_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Semantic facts: 7 palm trees. Counts: palm trees: 7.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_env_sky_001",
      "kind": "environment",
      "label": "partly cloudy sky with blue areas and white clouds",
      "normalized_label": "sky partly cloudy",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_light_bands_001",
      "kind": "environment",
      "label": "purple and blue diagonal light bands",
      "normalized_label": "colored light bands purple blue diagonal",
      "scene_layer": "background",
      "frame_position": "top left to right center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_terrain_001",
      "kind": "environment",
      "label": "rocky and sandy terrain with scattered stones",
      "normalized_label": "rocky sandy terrain",
      "scene_layer": "midground",
      "frame_position": "center to bottom",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_grass_patch_001",
      "kind": "environment",
      "label": "bright green circular grassy area in center",
      "normalized_label": "circular green grassy area",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_steps_001",
      "kind": "environment",
      "label": "stone steps leading up to grassy area",
      "normalized_label": "stone steps",
      "scene_layer": "midground",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_trees_001",
      "kind": "environment",
      "label": "multiple palm trees with green fronds",
      "normalized_label": "palm trees",
      "scene_layer": "midground",
      "frame_position": "various",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_trees_group_001",
      "kind": "environment",
      "label": "group of 7 palm trees visible",
      "normalized_label": "7 palm trees",
      "scene_layer": "midground",
      "frame_position": "various",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_architecture_001",
      "kind": "environment",
      "label": "stone wall in background",
      "normalized_label": "stone wall",
      "scene_layer": "midground",
      "frame_position": "background center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_sky_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky condition",
      "value": "partly cloudy",
      "supporting_observation_ids": [
        "obs_env_sky_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_light_bands_001",
      "module": "environment",
      "field_path": "colored_light_bands",
      "claim": "presence of colored light bands",
      "value": "purple and blue diagonal streaks",
      "supporting_observation_ids": [
        "obs_env_light_bands_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_terrain_001",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain type",
      "value": "rocky and sandy",
      "supporting_observation_ids": [
        "obs_env_terrain_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_grass_patch_001",
      "module": "environment",
      "field_path": "terrain",
      "claim": "grassy area in terrain",
      "value": "bright green circular patch",
      "supporting_observation_ids": [
        "obs_env_grass_patch_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_steps_001",
      "module": "environment",
      "field_path": "terrain",
      "claim": "presence of stone steps",
      "value": "stone steps leading up to grassy area",
      "supporting_observation_ids": [
        "obs_env_steps_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_trees_001",
      "module": "environment",
      "field_path": "plants",
      "claim": "type of visible plants",
      "value": "palm trees",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_trees_count_001",
      "module": "counts",
      "field_path": "count_ids",
      "claim": "number of palm trees",
      "value": "7",
      "supporting_observation_ids": [
        "obs_env_trees_group_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_architecture_001",
      "module": "environment",
      "field_path": "architecture",
      "claim": "presence of stone wall",
      "value": "stone wall in background",
      "supporting_observation_ids": [
        "obs_env_architecture_001"
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
      "count_id": "count_palm_trees_001",
      "normalized_label": "palm trees",
      "count_type": "exact",
      "exact_count": 7,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_env_trees_group_001"
      ],
      "scene_layer": "midground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_env_architecture_001",
      "obs_env_grass_patch_001",
      "obs_env_steps_001",
      "obs_env_terrain_001",
      "obs_env_trees_001",
      "obs_env_trees_group_001"
    ],
    "background": [
      "obs_env_light_bands_001",
      "obs_env_sky_001"
    ]
  },
  "environment": {
    "setting": [
      "stone wall enclosed open area"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "partly cloudy"
    ],
    "ground": [
      "green grass patch",
      "rocky sandy terrain"
    ],
    "terrain": [
      "grassy patch",
      "rocky",
      "sandy",
      "stone steps"
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
      "obs_env_architecture_001",
      "obs_env_grass_patch_001",
      "obs_env_light_bands_001",
      "obs_env_sky_001",
      "obs_env_steps_001",
      "obs_env_terrain_001",
      "obs_env_trees_001",
      "obs_env_trees_group_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "beige",
      "blue",
      "brown",
      "green",
      "purple",
      "white"
    ],
    "lighting": [
      "bright with shadows and highlights"
    ],
    "shadows": [
      "soft shadows from trees and steps"
    ],
    "highlights": [
      "highlights on tree leaves and clouds"
    ],
    "composition": [
      "centered green circle with radial lines",
      "framing by palm trees",
      "horizontal stone wall in background"
    ],
    "camera_angle": "eye level",
    "framing": "medium frame including sky, trees, stones, and wall",
    "cropping": [
      "full card frame"
    ],
    "depth": "visible background and midground depth",
    "motion_cues": [],
    "motifs": [
      "circular grassy motif",
      "stone step motif"
    ],
    "repeated_shapes": [
      "palm tree frond shapes"
    ],
    "style_cues": [
      "digital art",
      "realistic style"
    ],
    "supporting_observation_ids": [
      "obs_env_architecture_001",
      "obs_env_grass_patch_001",
      "obs_env_light_bands_001",
      "obs_env_sky_001",
      "obs_env_steps_001",
      "obs_env_trees_001"
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
        "fact_env_architecture_001",
        "fact_env_grass_patch_001",
        "fact_env_light_bands_001",
        "fact_env_sky_001",
        "fact_env_steps_001",
        "fact_env_terrain_001",
        "fact_env_trees_001",
        "fact_env_trees_count_001"
      ],
      "observation_ids": [
        "obs_env_architecture_001",
        "obs_env_grass_patch_001",
        "obs_env_light_bands_001",
        "obs_env_sky_001",
        "obs_env_steps_001",
        "obs_env_terrain_001",
        "obs_env_trees_001",
        "obs_env_trees_group_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_architecture_001",
        "obs_env_grass_patch_001",
        "obs_env_light_bands_001",
        "obs_env_steps_001",
        "obs_env_trees_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_grass_patch_001",
        "obs_env_light_bands_001",
        "obs_env_sky_001",
        "obs_env_trees_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_env_light_bands_001"
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
      "fact_ids": [
        "fact_env_trees_count_001"
      ],
      "count_ids": [
        "count_palm_trees_001"
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
        "sky partly cloudy",
        "colored light bands purple blue diagonal",
        "rocky sandy terrain",
        "circular green grassy area",
        "stone steps",
        "palm trees",
        "7 palm trees",
        "stone wall"
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_palm_tree_group_001",
      "category": "environment",
      "label": "7 palm trees",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_env_trees_001",
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
          "visible palm trees, counted 7"
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
      "term": "sky partly cloudy",
      "supporting_observation_ids": [
        "obs_env_sky_001"
      ]
    },
    {
      "term": "colored light bands purple blue diagonal",
      "supporting_observation_ids": [
        "obs_env_light_bands_001"
      ]
    },
    {
      "term": "rocky sandy terrain",
      "supporting_observation_ids": [
        "obs_env_terrain_001"
      ]
    },
    {
      "term": "circular green grassy area",
      "supporting_observation_ids": [
        "obs_env_grass_patch_001"
      ]
    },
    {
      "term": "stone steps",
      "supporting_observation_ids": [
        "obs_env_steps_001"
      ]
    },
    {
      "term": "palm trees",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ]
    },
    {
      "term": "7 palm trees",
      "supporting_observation_ids": [
        "obs_env_trees_group_001"
      ]
    },
    {
      "term": "stone wall",
      "supporting_observation_ids": [
        "obs_env_architecture_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "7 palm trees",
        "source_observation_ids": [
          "obs_env_trees_001",
          "obs_env_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_env_light_bands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_env_grass_patch_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_env_light_bands_001"
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
        "concept": "stairs",
        "source_observation_ids": [
          "obs_env_steps_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_env_terrain_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_env_trees_001",
          "obs_env_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
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
- Attribute confidence: `0.98`
- Cost USD: `0.0083388`
- Artwork observations: `12`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: bomb, bomb body segment, bomb body segment, bomb body segment, fuse, sparks, bright spark, explosion background. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | high | 0.99 |
| bomb body segment 1 | bomb body segment | object | foreground | medium | 0.98 |
| bomb body segment 2 | bomb body segment | object | foreground | medium | 0.98 |
| bomb body segment 3 | bomb body segment | object | foreground | medium | 0.98 |
| fuse | fuse | object | foreground | medium | 0.97 |
| sparks at fuse tip | sparks | object | foreground | medium | 0.95 |
| bright spark glow | bright spark | object | foreground | medium | 0.95 |
| explosion background | explosion background | environment | background | high | 0.99 |
| orange flame aura | orange flame aura | environment | background | medium | 0.98 |
| blue flame aura | blue flame aura | environment | background | medium | 0.97 |
| yellow diagonal stripes on bomb | yellow diagonal stripes | object | foreground | medium | 0.98 |
| black bomb body with segmented panels | black bomb body | object | foreground | high | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text 'ごうかいボム' | card_ui_text | top_left | fully_visible | 0.99 |
| top left header text with Poké Ball icon and Japanese text | card_ui_text | top_left | fully_visible | 0.95 |
| top right header text 'トレーナーズ' | card_ui_text | top_right | fully_visible | 0.95 |
| text block at bottom in white on purple background | card_ui_text | bottom_center | fully_visible | 0.98 |
| illustrator text 'illus. inose yukie' | card_ui_text | bottom_left | fully_visible | 0.96 |
| set icon 'J M5' | card_ui_symbol | bottom_left | fully_visible | 0.96 |
| collector number '106/081 SR' | card_ui_text | bottom_left | fully_visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_count_001 | counts | exact count of bombs | obs_obj_001 | 0.99 |
| fact_obj_color_001 | objects_and_props | bomb body color | obs_obj_009 | 0.99 |
| fact_obj_pattern_001 | objects_and_props | yellow diagonal stripes on bomb body | obs_obj_008 | 0.98 |
| fact_obj_fuse_001 | objects_and_props | fuse on bomb | obs_obj_005 | 0.97 |
| fact_obj_sparks_001 | visual_effects | sparks at fuse tip | obs_obj_006, obs_obj_007 | 0.95 |
| fact_env_explosion_001 | environment | explosion background | obs_env_001, obs_env_002, obs_env_003 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_001 | card name text | obs_card_ui_001 | 0.99 |
| fact_card_header_001 | top left header text with Poké Ball icon and Japanese text | obs_card_ui_002 | 0.95 |
| fact_card_header_002 | top right header text | obs_card_ui_003 | 0.95 |
| fact_card_textblock_001 | bottom text block | obs_card_ui_004 | 0.98 |
| fact_card_illustrator_001 | illustrator text | obs_card_ui_005 | 0.96 |
| fact_card_seticon_001 | set symbol | obs_card_ui_006 | 0.96 |
| fact_card_collector_001 | collector number | obs_card_ui_007 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_collector_001",
    "fact_card_header_001",
    "fact_card_header_002",
    "fact_card_illustrator_001",
    "fact_card_name_001",
    "fact_card_seticon_001",
    "fact_card_textblock_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_007"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_006"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
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
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | complete | none | high |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | high |  |

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
| emanates from fuse tip | obs_obj_006 | obs_obj_005 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| bomb | obs_obj_001 |
| bomb body segment | obs_obj_002 |
| fuse | obs_obj_005 |
| sparks | obs_obj_006 |
| bright spark | obs_obj_007 |
| explosion background | obs_env_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| bomb | obs_env_001, obs_obj_001, obs_obj_002, obs_obj_003, obs_obj_004, obs_obj_006, obs_obj_009 | deterministic_rule | 0.99 |
| centered composition | obs_env_001 | deterministic_rule | 0.92 |
| diagonal composition | obs_obj_008 | deterministic_rule | 0.98 |
| explosion | obs_env_001 | deterministic_rule | 0.99 |
| flame | obs_env_002, obs_env_003 | deterministic_rule | 0.98 |
| radial lines | obs_env_001 | deterministic_rule | 0.92 |
| spark | obs_obj_006, obs_obj_007 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body segment, bomb body segment, bomb body segment, fuse, sparks, bright spark, explosion background. Counts: bomb: 1.
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
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_002",
      "kind": "object",
      "label": "bomb body segment 1",
      "normalized_label": "bomb body segment",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_003",
      "kind": "object",
      "label": "bomb body segment 2",
      "normalized_label": "bomb body segment",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_004",
      "kind": "object",
      "label": "bomb body segment 3",
      "normalized_label": "bomb body segment",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_005",
      "kind": "object",
      "label": "fuse",
      "normalized_label": "fuse",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_006",
      "kind": "object",
      "label": "sparks at fuse tip",
      "normalized_label": "sparks",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_007",
      "kind": "object",
      "label": "bright spark glow",
      "normalized_label": "bright spark",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_001",
      "kind": "environment",
      "label": "explosion background",
      "normalized_label": "explosion background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_002",
      "kind": "environment",
      "label": "orange flame aura",
      "normalized_label": "orange flame aura",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_003",
      "kind": "environment",
      "label": "blue flame aura",
      "normalized_label": "blue flame aura",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_008",
      "kind": "object",
      "label": "yellow diagonal stripes on bomb",
      "normalized_label": "yellow diagonal stripes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_009",
      "kind": "object",
      "label": "black bomb body with segmented panels",
      "normalized_label": "black bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text 'ごうかいボム'",
      "normalized_label": "card name text 'ごうかいボム'",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "top left header text with Poké Ball icon and Japanese text",
      "normalized_label": "pokémon tool header text",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "top right header text 'トレーナーズ'",
      "normalized_label": "trainers header text",
      "scene_layer": "interface",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "text block at bottom in white on purple background",
      "normalized_label": "rule text block",
      "scene_layer": "interface",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "illustrator text 'illus. inose yukie'",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_symbol",
      "label": "set icon 'J M5'",
      "normalized_label": "set icon 'J M5'",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "collector number '106/081 SR'",
      "normalized_label": "collector number",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_count_001",
      "module": "counts",
      "field_path": "exact_count",
      "claim": "exact count of bombs",
      "value": "1",
      "supporting_observation_ids": [
        "obs_obj_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_color_001",
      "module": "objects_and_props",
      "field_path": "colors",
      "claim": "bomb body color",
      "value": "black",
      "supporting_observation_ids": [
        "obs_obj_009"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_pattern_001",
      "module": "objects_and_props",
      "field_path": "colors",
      "claim": "yellow diagonal stripes on bomb body",
      "value": "yellow",
      "supporting_observation_ids": [
        "obs_obj_008"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_fuse_001",
      "module": "objects_and_props",
      "field_path": "object_type",
      "claim": "fuse on bomb",
      "value": "fuse",
      "supporting_observation_ids": [
        "obs_obj_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_sparks_001",
      "module": "visual_effects",
      "field_path": "label",
      "claim": "sparks at fuse tip",
      "value": "sparks",
      "supporting_observation_ids": [
        "obs_obj_006",
        "obs_obj_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_explosion_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "explosion background",
      "value": "explosion background",
      "supporting_observation_ids": [
        "obs_env_001",
        "obs_env_002",
        "obs_env_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_header_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "top left header text with Poké Ball icon and Japanese text",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_header_002",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "top right header text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_textblock_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "bottom text block",
      "value": "rule text block in Japanese white text on purple background",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_seticon_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_collector_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "106/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_007"
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
      "count_id": "count_bomb_001",
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
      "obs_obj_004",
      "obs_obj_005",
      "obs_obj_006",
      "obs_obj_007",
      "obs_obj_008",
      "obs_obj_009"
    ],
    "midground": [],
    "background": [
      "obs_env_001",
      "obs_env_002",
      "obs_env_003"
    ]
  },
  "environment": {
    "setting": [
      "explosion background"
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
      "obs_env_001",
      "obs_env_002",
      "obs_env_003"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "device",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "matte surface"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.99
    },
    {
      "observation_id": "obs_obj_005",
      "label": "fuse",
      "normalized_label": "fuse",
      "object_type": "component",
      "colors": [
        "red"
      ],
      "material_appearance": [
        "rubber-like appearance-like"
      ],
      "location": "top center",
      "count_reference": "count_bomb_001",
      "confidence": 0.97
    },
    {
      "observation_id": "obs_obj_006",
      "label": "sparks at fuse tip",
      "normalized_label": "sparks",
      "object_type": "effect",
      "colors": [
        "white",
        "yellow"
      ],
      "material_appearance": [
        "bright glow"
      ],
      "location": "top center",
      "count_reference": "count_bomb_001",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_obj_006",
      "target_observation_id": "obs_obj_005",
      "relationship": "emanates from fuse tip",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "orange",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright spark highlight"
    ],
    "shadows": [
      "soft shadows beneath bomb"
    ],
    "highlights": [
      "bright reflection on bomb body",
      "spark highlight"
    ],
    "composition": [
      "central object with radial explosion background"
    ],
    "camera_angle": "front-facing, slightly elevated angle",
    "framing": "tight framing to bomb with background glow",
    "cropping": [
      "full bomb visible, fuse tip near top edge"
    ],
    "depth": "moderate depth separation between bomb and explosion background",
    "motion_cues": [
      "explosion flames radiate outward",
      "sparks motion implied"
    ],
    "motifs": [
      "explosion",
      "round segmented bomb",
      "striped pattern"
    ],
    "repeated_shapes": [
      "circular body segments"
    ],
    "style_cues": [
      "bold black outlines",
      "bright cartoon-style highlight"
    ],
    "supporting_observation_ids": [
      "obs_env_001",
      "obs_env_002",
      "obs_env_003",
      "obs_obj_001",
      "obs_obj_005",
      "obs_obj_006"
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
        "fact_obj_color_001",
        "fact_obj_count_001",
        "fact_obj_fuse_001",
        "fact_obj_pattern_001",
        "fact_obj_sparks_001"
      ],
      "object_observation_ids": [
        "obs_obj_001",
        "obs_obj_005",
        "obs_obj_006"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_explosion_001"
      ],
      "observation_ids": [
        "obs_env_001",
        "obs_env_002",
        "obs_env_003"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_env_explosion_001"
      ],
      "observation_ids": [
        "obs_env_001",
        "obs_env_002",
        "obs_env_003"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_env_explosion_001",
        "fact_obj_color_001",
        "fact_obj_pattern_001",
        "fact_obj_sparks_001"
      ],
      "observation_ids": [
        "obs_env_001",
        "obs_env_002",
        "obs_env_003",
        "obs_obj_006",
        "obs_obj_008",
        "obs_obj_009"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_obj_sparks_001"
      ],
      "observation_ids": [
        "obs_obj_006",
        "obs_obj_007"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_collector_001",
        "fact_card_header_001",
        "fact_card_header_002",
        "fact_card_illustrator_001",
        "fact_card_name_001",
        "fact_card_seticon_001",
        "fact_card_textblock_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_007"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_006"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
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
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [
        "fact_obj_count_001"
      ],
      "count_ids": [
        "count_bomb_001"
      ]
    },
    "relationships": {
      "fact_ids": [
        "fact_obj_sparks_001"
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
        "bomb",
        "bomb body segment",
        "fuse",
        "sparks",
        "bright spark",
        "explosion background"
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
      "review_status": "complete",
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
      "term": "bomb body segment",
      "supporting_observation_ids": [
        "obs_obj_002"
      ]
    },
    {
      "term": "fuse",
      "supporting_observation_ids": [
        "obs_obj_005"
      ]
    },
    {
      "term": "sparks",
      "supporting_observation_ids": [
        "obs_obj_006"
      ]
    },
    {
      "term": "bright spark",
      "supporting_observation_ids": [
        "obs_obj_007"
      ]
    },
    {
      "term": "explosion background",
      "supporting_observation_ids": [
        "obs_env_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "bomb",
        "source_observation_ids": [
          "obs_env_001",
          "obs_obj_001",
          "obs_obj_002",
          "obs_obj_003",
          "obs_obj_004",
          "obs_obj_006",
          "obs_obj_009"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_env_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_obj_008"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_env_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_env_002",
          "obs_env_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "radial lines",
        "source_observation_ids": [
          "obs_env_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_obj_006",
          "obs_obj_007"
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
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.0080628`
- Artwork observations: `4`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: dark bell, geometric bell shape, black and white, blue purple vortex background. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Dark Bell | dark bell | object | midground | high | 0.99 |
| multi-faceted geometric bell shape | geometric bell shape | object | midground | high | 0.95 |
| dark black color with white outlines | black and white | object | midground | high | 0.98 |
| blue and purple swirling vortex background | blue purple vortex background | object | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text at top | card_ui_text | top | fully_visible | 0.98 |
| Japanese card name text ダークベル | card_ui_text | top | fully_visible | 0.99 |
| Japanese description text | card_ui_text | bottom | fully_visible | 0.97 |
| Set info text 'J M5 105/081 SR' | card_ui_text | bottom_left | fully_visible | 0.99 |
| Illustrator text 'Illus. Toyste Beach' | card_ui_text | bottom_left | fully_visible | 0.98 |
| Copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' | copyright_text | bottom | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | main object is a bell-shaped item called Dark Bell | obs_obj_darkbell_001, obs_obj_darkbell_color_001, obs_obj_darkbell_shape_001 | 0.99 |
| fact_002 | environment | background composed of blue and purple swirling vortex | obs_bg_swirl_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_003 | card name text is dark bell in Japanese | obs_cardui_cardname_001 | 0.99 |
| fact_004 | description printed in Japanese | obs_cardui_text_bottom_001 | 0.97 |
| fact_005 | collector set code is J M5 105/081 SR | obs_cardui_setinfo_001 | 0.99 |
| fact_006 | illustrator is Toyste Beach | obs_cardui_artist_001 | 0.98 |
| fact_007 | copyright line from Pokémon/Nintendo/Creatures/GAME FREAK in 2026 | obs_cardui_copyright_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_003",
    "fact_004",
    "fact_005",
    "fact_006",
    "fact_007"
  ],
  "name_text_observation_ids": [
    "obs_cardui_cardname_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_cardui_setinfo_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_cardui_setinfo_001"
  ],
  "copyright_line_observation_ids": [
    "obs_cardui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_cardui_text_bottom_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_cardui_artist_001"
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
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| dark bell | exact | 1 | obs_obj_darkbell_001 | 0.99 |

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
| dark bell | obs_obj_darkbell_001 |
| blue purple swirling vortex | obs_bg_swirl_001 |
| geometric bell shape | obs_obj_darkbell_shape_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| spiral motif | obs_bg_swirl_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, geometric bell shape, black and white, blue purple vortex background. Counts: dark bell: 1.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_obj_darkbell_001",
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
      "observation_id": "obs_obj_darkbell_shape_001",
      "kind": "object",
      "label": "multi-faceted geometric bell shape",
      "normalized_label": "geometric bell shape",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_darkbell_color_001",
      "kind": "object",
      "label": "dark black color with white outlines",
      "normalized_label": "black and white",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bg_swirl_001",
      "kind": "object",
      "label": "blue and purple swirling vortex background",
      "normalized_label": "blue purple vortex background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_jpntext_top_001",
      "kind": "card_ui_text",
      "label": "Japanese text at top",
      "normalized_label": "japanese text top",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_cardname_001",
      "kind": "card_ui_text",
      "label": "Japanese card name text ダークベル",
      "normalized_label": "dark bell japanese",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_text_bottom_001",
      "kind": "card_ui_text",
      "label": "Japanese description text",
      "normalized_label": "japanese description text",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_setinfo_001",
      "kind": "card_ui_text",
      "label": "Set info text 'J M5 105/081 SR'",
      "normalized_label": "set info text",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_artist_001",
      "kind": "card_ui_text",
      "label": "Illustrator text 'Illus. Toyste Beach'",
      "normalized_label": "illustrator text",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_copyright_001",
      "kind": "copyright_text",
      "label": "Copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.'",
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
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "main object is a bell-shaped item called Dark Bell",
      "value": "dark bell",
      "supporting_observation_ids": [
        "obs_obj_darkbell_001",
        "obs_obj_darkbell_color_001",
        "obs_obj_darkbell_shape_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "environment",
      "field_path": "[0]",
      "claim": "background composed of blue and purple swirling vortex",
      "value": "blue and purple swirling vortex background",
      "supporting_observation_ids": [
        "obs_bg_swirl_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is dark bell in Japanese",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_cardui_cardname_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "description printed in Japanese",
      "value": "Japanese description text",
      "supporting_observation_ids": [
        "obs_cardui_text_bottom_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector set code is J M5 105/081 SR",
      "value": "J M5 105/081 SR",
      "supporting_observation_ids": [
        "obs_cardui_setinfo_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator is Toyste Beach",
      "value": "Toyste Beach",
      "supporting_observation_ids": [
        "obs_cardui_artist_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line from Pokémon/Nintendo/Creatures/GAME FREAK in 2026",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_cardui_copyright_001"
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
      "count_id": "count_001",
      "normalized_label": "dark bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_obj_darkbell_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_cardui_artist_001",
      "obs_cardui_cardname_001",
      "obs_cardui_copyright_001",
      "obs_cardui_jpntext_top_001",
      "obs_cardui_setinfo_001",
      "obs_cardui_text_bottom_001"
    ],
    "midground": [
      "obs_obj_darkbell_001",
      "obs_obj_darkbell_color_001",
      "obs_obj_darkbell_shape_001"
    ],
    "background": [
      "obs_bg_swirl_001"
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
      "obs_bg_swirl_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_darkbell_001",
      "label": "Dark Bell",
      "normalized_label": "dark bell",
      "object_type": "item",
      "colors": [
        "black",
        "blue",
        "white"
      ],
      "material_appearance": [
        "dark rounded surface",
        "glossy highlights",
        "white outlines"
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
      "dark blues",
      "purples",
      "white"
    ],
    "lighting": [
      "glossy highlights on bell"
    ],
    "shadows": [
      "soft shadowing"
    ],
    "highlights": [
      "white outlines highlight bell facets"
    ],
    "composition": [
      "central composition",
      "swirling vortex background"
    ],
    "camera_angle": "frontal",
    "framing": "medium close-up",
    "cropping": [
      "full card borders visible"
    ],
    "depth": "moderate depth with bell in front of vortex",
    "motion_cues": [
      "implied swirling vortex"
    ],
    "motifs": [
      "circular swirl",
      "geometric facets"
    ],
    "repeated_shapes": [
      "multi-faceted geometric shapes"
    ],
    "style_cues": [
      "stylized illustration"
    ],
    "supporting_observation_ids": [
      "obs_bg_swirl_001",
      "obs_obj_darkbell_001"
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
        "fact_001"
      ],
      "object_observation_ids": [
        "obs_obj_darkbell_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_002"
      ],
      "observation_ids": [
        "obs_bg_swirl_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_bg_swirl_001",
        "obs_obj_darkbell_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_bg_swirl_001",
        "obs_obj_darkbell_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_bg_swirl_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007"
      ],
      "name_text_observation_ids": [
        "obs_cardui_cardname_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_cardui_setinfo_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_cardui_setinfo_001"
      ],
      "copyright_line_observation_ids": [
        "obs_cardui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_cardui_text_bottom_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_cardui_artist_001"
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
        "dark bell",
        "blue purple swirling vortex",
        "geometric bell shape"
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
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_obj_darkbell_001"
      ]
    },
    {
      "term": "blue purple swirling vortex",
      "supporting_observation_ids": [
        "obs_bg_swirl_001"
      ]
    },
    {
      "term": "geometric bell shape",
      "supporting_observation_ids": [
        "obs_obj_darkbell_shape_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_bg_swirl_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
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
- Cost USD: `0.0067776`
- Artwork observations: `3`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Visible observations: silver star-shaped badge with two pointed ribbons, silver white, light blue white gradient swirls. Counts: badge: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| silver star-shaped badge with two pointed ribbons | silver star-shaped badge with two pointed ribbons | object | midground | high | 1 |
| silver, white | silver white | color_patch | midground | medium | 1 |
| light blue and white gradient swirls | light blue white gradient swirls | background | background | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| リトライバッジ | card_name_text | top_left | visible | 1 |
| ポケモンのどうぐ | card_ui_text | top_left_banner | visible | 1 |
| トレーナーズ | card_ui_text | top_right_banner | visible | 1 |
| illus. Toyste Beach | illustrator_text | bottom_left_illustrator | visible | 1 |
| 074/081 | collector_number | bottom_left_number | visible | 1 |
| m5 | set_symbol | bottom_left_set_symbol | visible | 1 |
| U | print_marker | bottom_left_print_marker | visible | 1 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | bottom_line_text | bottom_line | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_008 | objects_and_props | main object presence | obs_central_object_001 | 1 |
| fact_009 | objects_and_props | main object colors | obs_central_object_colors_001 | 1 |
| fact_010 | environment | background pattern | obs_background_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_001 | card name | obs_card_name_text_001 | 1 |
| fact_002 | card type text visible | obs_card_type_text_001 | 1 |
| fact_003 | trainer type visible | obs_trainer_type_text_001 | 1 |
| fact_004 | illustrator name | obs_illustrator_text_001 | 1 |
| fact_005 | collector number visible | obs_set_code_text_001 | 1 |
| fact_006 | set symbol visible | obs_set_symbol_001 | 1 |
| fact_007 | print marker visible | obs_set_code_text_002 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_001",
    "fact_002",
    "fact_003",
    "fact_004",
    "fact_005",
    "fact_006",
    "fact_007"
  ],
  "name_text_observation_ids": [
    "obs_card_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_set_code_text_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_set_code_text_002"
  ],
  "copyright_line_observation_ids": [
    "obs_bottom_text_block_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_bottom_text_block_001"
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
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | none | high |  |
| environment | none_visible | none | high |  |
| composition | none_visible | none | high |  |
| color_and_light | none_visible | none | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| badge | exact | 1 | obs_central_object_001 | 1 |

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
| silver star-shaped badge with two pointed ribbons | obs_central_object_001 |
| silver white | obs_central_object_colors_001 |
| light blue white gradient swirls | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| none derived | | | |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: silver star-shaped badge with two pointed ribbons, silver white, light blue white gradient swirls. Counts: badge: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_card_name_text_001",
      "kind": "card_name_text",
      "label": "リトライバッジ",
      "normalized_label": "リトライバッジ",
      "scene_layer": "foreground",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_type_text_001",
      "kind": "card_ui_text",
      "label": "ポケモンのどうぐ",
      "normalized_label": "ポケモンのどうぐ",
      "scene_layer": "foreground",
      "frame_position": "top_left_banner",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trainer_type_text_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "トレーナーズ",
      "scene_layer": "foreground",
      "frame_position": "top_right_banner",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illus. Toyste Beach",
      "normalized_label": "illus. Toyste Beach",
      "scene_layer": "foreground",
      "frame_position": "bottom_left_illustrator",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_code_text_001",
      "kind": "collector_number",
      "label": "074/081",
      "normalized_label": "074/081",
      "scene_layer": "foreground",
      "frame_position": "bottom_left_number",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_symbol_001",
      "kind": "set_symbol",
      "label": "m5",
      "normalized_label": "m5",
      "scene_layer": "foreground",
      "frame_position": "bottom_left_set_symbol",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_code_text_002",
      "kind": "print_marker",
      "label": "U",
      "normalized_label": "U",
      "scene_layer": "foreground",
      "frame_position": "bottom_left_print_marker",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bottom_text_block_001",
      "kind": "bottom_line_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "scene_layer": "foreground",
      "frame_position": "bottom_line",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_central_object_001",
      "kind": "object",
      "label": "silver star-shaped badge with two pointed ribbons",
      "normalized_label": "silver star-shaped badge with two pointed ribbons",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_central_object_colors_001",
      "kind": "color_patch",
      "label": "silver, white",
      "normalized_label": "silver white",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "background",
      "label": "light blue and white gradient swirls",
      "normalized_label": "light blue white gradient swirls",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_name_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "card_ui_and_print_markers",
      "field_path": "card_type_text",
      "claim": "card type text visible",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_type_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "card_ui_and_print_markers",
      "field_path": "trainer_type_text",
      "claim": "trainer type visible",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_trainer_type_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name",
      "value": "illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "074/081",
      "supporting_observation_ids": [
        "obs_set_code_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "print_marker",
      "claim": "print marker visible",
      "value": "U",
      "supporting_observation_ids": [
        "obs_set_code_text_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "objects_and_props",
      "field_path": "main_object",
      "claim": "main object presence",
      "value": "silver star-shaped badge with two pointed ribbons",
      "supporting_observation_ids": [
        "obs_central_object_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "objects_and_props",
      "field_path": "main_object_colors",
      "claim": "main object colors",
      "value": "silver white",
      "supporting_observation_ids": [
        "obs_central_object_colors_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "background_pattern",
      "claim": "background pattern",
      "value": "light blue and white gradient swirls",
      "supporting_observation_ids": [
        "obs_background_001"
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
      "count_id": "count_001",
      "normalized_label": "badge",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_central_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_bottom_text_block_001",
      "obs_card_name_text_001",
      "obs_card_type_text_001",
      "obs_illustrator_text_001",
      "obs_set_code_text_001",
      "obs_set_code_text_002",
      "obs_set_symbol_001",
      "obs_trainer_type_text_001"
    ],
    "midground": [
      "obs_central_object_001",
      "obs_central_object_colors_001"
    ],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "",
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
      "observation_id": "obs_central_object_001",
      "label": "silver star-shaped badge with two pointed ribbons",
      "normalized_label": "silver star-shaped badge with two pointed ribbons",
      "object_type": "item",
      "colors": [
        "silver",
        "white"
      ],
      "material_appearance": [
        "smooth metallic-looking surface"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 1
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
      "even diffuse lighting"
    ],
    "shadows": [
      "soft shadows below badge"
    ],
    "highlights": [
      "metallic highlights on badge edges"
    ],
    "composition": [
      "central composition"
    ],
    "camera_angle": "frontal",
    "framing": "central tight framing",
    "cropping": [
      "full badge visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "star shape"
    ],
    "repeated_shapes": [
      "star"
    ],
    "style_cues": [
      "clean graphic style"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_central_object_001"
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
        "fact_008",
        "fact_009"
      ],
      "object_observation_ids": [
        "obs_central_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_010"
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
        "fact_001",
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007"
      ],
      "name_text_observation_ids": [
        "obs_card_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_set_code_text_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_set_code_text_002"
      ],
      "copyright_line_observation_ids": [
        "obs_bottom_text_block_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_bottom_text_block_001"
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
      "fact_ids": [
        "fact_008"
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
        "silver star-shaped badge with two pointed ribbons",
        "silver white",
        "light blue white gradient swirls"
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
      "term": "silver star-shaped badge with two pointed ribbons",
      "supporting_observation_ids": [
        "obs_central_object_001"
      ]
    },
    {
      "term": "silver white",
      "supporting_observation_ids": [
        "obs_central_object_colors_001"
      ]
    },
    {
      "term": "light blue white gradient swirls",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": []
  }
}
```

</details>

### GV-PK-JPN-M5-073 - ごうかいボム

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0091984`
- Artwork observations: `7`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: bomb object fuse lit, black spherical bomb with yellow striped band and lit fuse, black shiny bomb body, yellow black striped band bomb, red fuse lit flame, yellow explosion symbol bomb, blue orange glow behind bomb. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| main illustrated scene showing bomb object with fuse lit | bomb object fuse lit | artwork_scene | foreground | high | 1 |
| black spherical bomb with yellow and black striped band around middle and top fuse burning | black spherical bomb with yellow striped band and lit fuse | object | foreground | high | 1 |
| black round bomb body polished shiny surface | black shiny bomb body | object_part | foreground | high | 1 |
| yellow and black striped band around bomb midsection | yellow black striped band bomb | object_part | foreground | high | 1 |
| top fuse with red cord and lit spark flame | red fuse lit flame | object_part | foreground | high | 1 |
| yellow explosion symbol printed on bomb body | yellow explosion symbol bomb | visual_effect | foreground | medium | 1 |
| blue and orange radiant glow behind bomb | blue orange glow behind bomb | abstract_background | background | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text ごうかいボム in black near top center | card_ui_text | top_center | fully_visible | 1 |
| set symbol with black J in white square labeled m5 at bottom left | set_symbol | bottom_left | fully_visible | 1 |
| collector number 073/081 at bottom left | collector_number | bottom_left | fully_visible | 1 |
| japanese description text in bottom text box | card_ui_text | bottom_center | fully_visible | 1 |
| illustrator text illus. inose yukie bottom left | illustrator_text | bottom_left | fully_visible | 1 |
| copyright text ©2026 Pokémon/Nintendo/Creatures/GAME FREAK bottom center | copyright_text | bottom_center | partially_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_bomb_001 | objects_and_props | main object is a bomb | obs_object_bomb_001 | 1 |
| fact_object_bomb_band_001 | objects_and_props | bomb has yellow and black striped band around its middle | obs_object_bomb_band_001 | 1 |
| fact_object_bomb_body_001 | objects_and_props | bomb body is black and shiny | obs_object_bomb_body_001 | 1 |
| fact_object_fuse_001 | objects_and_props | bomb has lit fuse with red cord and bright spark | obs_object_fuse_001 | 1 |
| fact_object_bomb_explosion_symbol_001 | objects_and_props | bomb body has yellow explosion symbol | obs_visual_effect_001 | 1 |
| fact_background_glow_001 | visual_effects | background behind bomb is blue and orange radiant glow | obs_background_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_name_001 | card name text ごうかいボム is visible | obs_card_name_text_001 | 1 |
| fact_set_symbol_001 | set symbol J m5 visible at card bottom left | obs_card_set_symbol_001 | 1 |
| fact_collector_number_001 | collector number 073/081 clearly visible | obs_card_number_001 | 1 |
| fact_description_text_jp_001 | japanese description text visible in bottom text box | obs_text_box_jp_001 | 1 |
| fact_illustrator_text_001 | illustrator text illus. inose yukie visible | obs_illustrator_text_001 | 1 |
| fact_copyright_text_001 | copyright text ©2026 Pokémon/Nintendo/Creatures/GAME FREAK is visible | obs_copyright_text_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_name_001",
    "fact_collector_number_001",
    "fact_copyright_text_001",
    "fact_description_text_jp_001",
    "fact_illustrator_text_001",
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
    "obs_card_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_copyright_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_text_box_jp_001"
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
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_object_bomb_001 | 1 |

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
| bomb object fuse lit | obs_artwork_001 |
| black spherical bomb with yellow striped band and lit fuse | obs_object_bomb_001 |
| black reflective-looking bomb body | obs_object_bomb_body_001 |
| yellow black striped band bomb | obs_object_bomb_band_001 |
| red fuse lit flame | obs_object_fuse_001 |
| yellow explosion symbol bomb | obs_visual_effect_001 |
| blue orange glow behind bomb | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| bomb | obs_artwork_001, obs_background_001, obs_object_bomb_001, obs_object_bomb_band_001, obs_object_bomb_body_001, obs_object_fuse_001, obs_visual_effect_001 | deterministic_rule | 1 |
| emblem | obs_visual_effect_001 | deterministic_rule | 1 |
| explosion | obs_visual_effect_001 | deterministic_rule | 1 |
| flame | obs_object_fuse_001 | deterministic_rule | 1 |
| glowing highlights | obs_background_001, obs_object_fuse_001 | deterministic_rule | 1 |
| reflective-looking surface | obs_object_bomb_body_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb object fuse lit, black spherical bomb with yellow striped band and lit fuse, black shiny bomb body, yellow black striped band bomb, red fuse lit flame, yellow explosion symbol bomb, blue orange glow behind bomb. Counts: bomb: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_artwork_001",
      "kind": "artwork_scene",
      "label": "main illustrated scene showing bomb object with fuse lit",
      "normalized_label": "bomb object fuse lit",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bomb_001",
      "kind": "object",
      "label": "black spherical bomb with yellow and black striped band around middle and top fuse burning",
      "normalized_label": "black spherical bomb with yellow striped band and lit fuse",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bomb_body_001",
      "kind": "object_part",
      "label": "black round bomb body polished shiny surface",
      "normalized_label": "black shiny bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bomb_band_001",
      "kind": "object_part",
      "label": "yellow and black striped band around bomb midsection",
      "normalized_label": "yellow black striped band bomb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_fuse_001",
      "kind": "object_part",
      "label": "top fuse with red cord and lit spark flame",
      "normalized_label": "red fuse lit flame",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_effect_001",
      "kind": "visual_effect",
      "label": "yellow explosion symbol printed on bomb body",
      "normalized_label": "yellow explosion symbol bomb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "abstract_background",
      "label": "blue and orange radiant glow behind bomb",
      "normalized_label": "blue orange glow behind bomb",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text ごうかいボム in black near top center",
      "normalized_label": "card name ごうかいボム",
      "scene_layer": "interface",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol with black J in white square labeled m5 at bottom left",
      "normalized_label": "set symbol J m5",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "collector_number",
      "label": "collector number 073/081 at bottom left",
      "normalized_label": "collector number 073/081",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_box_jp_001",
      "kind": "card_ui_text",
      "label": "japanese description text in bottom text box",
      "normalized_label": "japanese description text",
      "scene_layer": "interface",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator text illus. inose yukie bottom left",
      "normalized_label": "illustrator inose yukie",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_copyright_text_001",
      "kind": "copyright_text",
      "label": "copyright text ©2026 Pokémon/Nintendo/Creatures/GAME FREAK bottom center",
      "normalized_label": "copyright 2026 Pokémon Nintendo Creatures GAME FREAK",
      "scene_layer": "interface",
      "frame_position": "bottom_center",
      "visibility": "partially_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_object_bomb_001",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "main object is a bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_object_bomb_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_band_001",
      "module": "objects_and_props",
      "field_path": "object_parts.band",
      "claim": "bomb has yellow and black striped band around its middle",
      "value": "yellow and black striped band",
      "supporting_observation_ids": [
        "obs_object_bomb_band_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_body_001",
      "module": "objects_and_props",
      "field_path": "object_parts.body",
      "claim": "bomb body is black and shiny",
      "value": "black shiny",
      "supporting_observation_ids": [
        "obs_object_bomb_body_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_fuse_001",
      "module": "objects_and_props",
      "field_path": "object_parts.fuse",
      "claim": "bomb has lit fuse with red cord and bright spark",
      "value": "red lit fuse with spark",
      "supporting_observation_ids": [
        "obs_object_fuse_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bomb_explosion_symbol_001",
      "module": "objects_and_props",
      "field_path": "object_parts.details",
      "claim": "bomb body has yellow explosion symbol",
      "value": "yellow explosion symbol",
      "supporting_observation_ids": [
        "obs_visual_effect_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_background_glow_001",
      "module": "visual_effects",
      "field_path": "background",
      "claim": "background behind bomb is blue and orange radiant glow",
      "value": "blue and orange radiant glow",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text ごうかいボム is visible",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_name_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol J m5 visible at card bottom left",
      "value": "J m5",
      "supporting_observation_ids": [
        "obs_card_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number 073/081 clearly visible",
      "value": "073/081",
      "supporting_observation_ids": [
        "obs_card_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_description_text_jp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "japanese description text visible in bottom text box",
      "value": "japanese description text present",
      "supporting_observation_ids": [
        "obs_text_box_jp_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text illus. inose yukie visible",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_copyright_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text ©2026 Pokémon/Nintendo/Creatures/GAME FREAK is visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_copyright_text_001"
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
      "count_id": "count_obj_bomb_001",
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
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_artwork_001",
      "obs_object_bomb_001",
      "obs_object_bomb_band_001",
      "obs_object_bomb_body_001",
      "obs_object_fuse_001",
      "obs_visual_effect_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "",
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
      "observation_id": "obs_object_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "tool",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight",
        "reflective-looking"
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
      "bright highlights on bomb"
    ],
    "shadows": [
      "soft shadows on bomb surface"
    ],
    "highlights": [
      "bright specular highlight on bomb body"
    ],
    "composition": [
      "bomb centered"
    ],
    "camera_angle": "frontal",
    "framing": "medium close-up",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [
      "sparks from lit fuse"
    ],
    "motifs": [
      "circular",
      "radiant burst",
      "striped band"
    ],
    "repeated_shapes": [
      "circles",
      "stripes"
    ],
    "style_cues": [
      "stylized illustration"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_object_bomb_001",
      "obs_object_fuse_001",
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
        "fact_object_bomb_band_001",
        "fact_object_bomb_body_001",
        "fact_object_bomb_explosion_symbol_001",
        "fact_object_fuse_001"
      ],
      "object_observation_ids": [
        "obs_object_bomb_001",
        "obs_object_bomb_band_001",
        "obs_object_bomb_body_001",
        "obs_object_fuse_001",
        "obs_visual_effect_001"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_background_glow_001"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_background_glow_001"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_background_glow_001",
        "fact_object_bomb_explosion_symbol_001"
      ],
      "observation_ids": [
        "obs_background_001",
        "obs_visual_effect_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_name_001",
        "fact_collector_number_001",
        "fact_copyright_text_001",
        "fact_description_text_jp_001",
        "fact_illustrator_text_001",
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
        "obs_card_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_copyright_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_text_box_jp_001"
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
        "bomb object fuse lit",
        "black spherical bomb with yellow striped band and lit fuse",
        "black reflective-looking bomb body",
        "yellow black striped band bomb",
        "red fuse lit flame",
        "yellow explosion symbol bomb",
        "blue orange glow behind bomb"
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
      "term": "bomb object fuse lit",
      "supporting_observation_ids": [
        "obs_artwork_001"
      ]
    },
    {
      "term": "black spherical bomb with yellow striped band and lit fuse",
      "supporting_observation_ids": [
        "obs_object_bomb_001"
      ]
    },
    {
      "term": "black reflective-looking bomb body",
      "supporting_observation_ids": [
        "obs_object_bomb_body_001"
      ]
    },
    {
      "term": "yellow black striped band bomb",
      "supporting_observation_ids": [
        "obs_object_bomb_band_001"
      ]
    },
    {
      "term": "red fuse lit flame",
      "supporting_observation_ids": [
        "obs_object_fuse_001"
      ]
    },
    {
      "term": "yellow explosion symbol bomb",
      "supporting_observation_ids": [
        "obs_visual_effect_001"
      ]
    },
    {
      "term": "blue orange glow behind bomb",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "bomb",
        "source_observation_ids": [
          "obs_artwork_001",
          "obs_background_001",
          "obs_object_bomb_001",
          "obs_object_bomb_band_001",
          "obs_object_bomb_body_001",
          "obs_object_fuse_001",
          "obs_visual_effect_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "emblem",
        "source_observation_ids": [
          "obs_visual_effect_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_visual_effect_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_object_fuse_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_background_001",
          "obs_object_fuse_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "reflective-looking surface",
        "source_observation_ids": [
          "obs_object_bomb_body_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-101: fact_graph_semantic_fact_label_not_supported_v1:svf_001
- GV-PK-JPN-M5-096: fact_graph_semantic_fact_label_not_supported_v1:semfact_pose_001
- GV-PK-JPN-M5-110: fact_graph_semantic_fact_label_not_supported_v1:semfact_001
