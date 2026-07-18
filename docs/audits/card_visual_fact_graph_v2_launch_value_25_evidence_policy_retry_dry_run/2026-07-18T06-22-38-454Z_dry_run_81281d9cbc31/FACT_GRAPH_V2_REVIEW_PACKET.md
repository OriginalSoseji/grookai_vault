# Card Visual Fact Graph V2 Review Packet

Generated rows: 21
Validation failures: 4
Skipped images: 0
Estimated cost USD: 0.2509552

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0115176`
- Artwork observations: `10`
- Card UI / print-marker observations: `10`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, lantern body, lantern arms with flames, curled flame torches, floating pose, purple and black colors, glowing eyes, black skeletal pattern. Semantic facts: floating, purple flames, dark background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | high | 0.99 |
| lantern body | lantern body | object | foreground | high | 0.95 |
| lantern arms with flames | lantern arms with flames | object | foreground | high | 0.95 |
| curled flame torches | curled flame torches | object | foreground | high | 0.96 |
| floating pose | floating pose | pose | foreground | high | 0.98 |
| purple and black colors | purple and black colors | color | foreground | high | 0.97 |
| glowing eyes | glowing eyes | feature | foreground | high | 0.91 |
| black skeletal pattern | black skeletal pattern | feature | foreground | high | 0.92 |
| purple flames | purple flames | effect | foreground | high | 0.95 |
| dark background | dark background | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text Mega Chandelure ex in Japanese | card_ui_text | top_center | fully_visible | 0.98 |
| HP 350 | hp_text | top_right | fully_visible | 0.98 |
| psychic-type symbol | card_ui_symbol | top_left | fully_visible | 0.96 |
| Abyss Eye set symbol | set_symbol | bottom_left | fully_visible | 0.85 |
| card number 113/081 | collector_number | bottom_left | fully_visible | 0.98 |
| weakness symbol x2 | card_ui_symbol | bottom_center_left | fully_visible | 0.95 |
| resistance symbol -30 | card_ui_symbol | bottom_center | fully_visible | 0.95 |
| retreat cost 2 colorless | card_ui_symbol | bottom_center_right | fully_visible | 0.93 |
| SAR rarity mark | rarity_mark | bottom_left | fully_visible | 0.93 |
| bottom copyright and legal text area | bottom_line_text | bottom | fully_visible | 0.7 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_mega_chandelure_001 | subjects | scene subject is Mega Chandelure | obs_subject_001 | 0.99 |
| fact_creature_anatomy_lantern_body_001 | creature_anatomy | has lantern body | obs_creature_body_001 | 0.95 |
| fact_creature_anatomy_arms_flamed_001 | creature_anatomy | lantern arms have flames at ends | obs_creature_arms_001, obs_creature_flamed_torches_001 | 0.95 |
| fact_creature_pose_floating_001 | creature_anatomy | pose is floating | obs_creature_floating_pose_001 | 0.98 |
| fact_creature_colors_001 | creature_anatomy | colors are purple and black | obs_creature_color_001 | 0.97 |
| fact_creature_facial_features_eyes_glowing_001 | creature_anatomy | eyes are glowing | obs_creature_facial_features_001 | 0.91 |
| fact_creature_markings_black_skeletal_001 | creature_anatomy | black skeletal pattern present | obs_creature_markings_001 | 0.92 |
| fact_creature_effects_purple_flames_001 | creature_anatomy | purple flames around subject | obs_creature_flame_effect_001 | 0.95 |
| fact_environment_dark_background_001 | environment | dark background environment | obs_environment_dark_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text visible in Japanese | obs_card_ui_name_001 | 0.98 |
| fact_card_ui_hp_text_001 | HP text 350 visible | obs_card_ui_hp_001 | 0.98 |
| fact_card_ui_type_symbol_001 | psychic type symbol visible | obs_card_ui_type_001 | 0.96 |
| fact_card_ui_set_symbol_001 | Abyss Eye set symbol present | obs_card_ui_set_001 | 0.85 |
| fact_card_ui_number_001 | card number 113/081 visible | obs_card_ui_number_001 | 0.98 |
| fact_card_ui_weakness_001 | weakness symbol x2 | obs_card_ui_weakness_001 | 0.95 |
| fact_card_ui_resistance_001 | resistance symbol -30 | obs_card_ui_resistance_001 | 0.95 |
| fact_card_ui_retreat_001 | retreat cost 2 colorless | obs_card_ui_retreat_001 | 0.93 |
| fact_card_ui_rarity_001 | SAR rarity mark | obs_card_ui_rarity_001 | 0.93 |
| fact_card_ui_bottom_text_001 | bottom legal text area visible | obs_card_ui_text_bottom_001 | 0.7 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_bottom_text_001",
    "fact_card_ui_hp_text_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_number_001",
    "fact_card_ui_rarity_001",
    "fact_card_ui_resistance_001",
    "fact_card_ui_retreat_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_type_symbol_001",
    "fact_card_ui_weakness_001"
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
    "obs_card_ui_set_001",
    "obs_card_ui_type_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_rarity_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_bottom_001"
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | low | medium |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_floating_001 | state | floating | obs_subject_001 | obs_creature_floating_pose_001 | floating pose floating | 0.98 |
| svf_purple_flames_001 | environment | purple flames | obs_subject_001 | obs_creature_flame_effect_001 | purple flames | 0.95 |
| svf_dark_background_001 | environment | dark background |  | obs_environment_dark_001 | dark background | 0.9 |

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
| lantern body | obs_creature_body_001 |
| floating pose | obs_creature_floating_pose_001 |
| purple flames | obs_creature_flame_effect_001 |
| glowing eyes | obs_creature_facial_features_001 |
| dark background | obs_environment_dark_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| dark background | obs_environment_dark_001 | deterministic_rule | 0.9 |
| flame | obs_creature_arms_001, obs_creature_flame_effect_001, obs_creature_flamed_torches_001 | deterministic_rule | 0.96 |
| floating | obs_creature_floating_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| floating orientation | obs_creature_floating_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_creature_arms_001, obs_creature_facial_features_001 | deterministic_rule | 0.92 |
| purple flames | obs_creature_flame_effect_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: mega chandelure, lantern body, lantern arms with flames, curled flame torches, floating pose, purple and black colors, glowing eyes, black skeletal pattern. Semantic facts: floating, purple flames, dark background.
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
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "object",
      "label": "lantern body",
      "normalized_label": "lantern body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_arms_001",
      "kind": "object",
      "label": "lantern arms with flames",
      "normalized_label": "lantern arms with flames",
      "scene_layer": "foreground",
      "frame_position": "center_bottom_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_flamed_torches_001",
      "kind": "object",
      "label": "curled flame torches",
      "normalized_label": "curled flame torches",
      "scene_layer": "foreground",
      "frame_position": "bottom_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_floating_pose_001",
      "kind": "pose",
      "label": "floating pose",
      "normalized_label": "floating pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_color_001",
      "kind": "color",
      "label": "purple and black colors",
      "normalized_label": "purple and black colors",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_facial_features_001",
      "kind": "feature",
      "label": "glowing eyes",
      "normalized_label": "glowing eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_markings_001",
      "kind": "feature",
      "label": "black skeletal pattern",
      "normalized_label": "black skeletal pattern",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_flame_effect_001",
      "kind": "effect",
      "label": "purple flames",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "around_subject",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_dark_001",
      "kind": "environment",
      "label": "dark background",
      "normalized_label": "dark background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text Mega Chandelure ex in Japanese",
      "normalized_label": "card_name_text",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 350",
      "normalized_label": "hp_text_350",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "psychic-type symbol",
      "normalized_label": "psychic_type_symbol",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "set_symbol",
      "label": "Abyss Eye set symbol",
      "normalized_label": "abyss_eye_set_symbol",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "card number 113/081",
      "normalized_label": "card_number_113_081",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_weakness_001",
      "kind": "card_ui_symbol",
      "label": "weakness symbol x2",
      "normalized_label": "weakness_symbol_x2",
      "scene_layer": "ui",
      "frame_position": "bottom_center_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_resistance_001",
      "kind": "card_ui_symbol",
      "label": "resistance symbol -30",
      "normalized_label": "resistance_symbol_minus_30",
      "scene_layer": "ui",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_retreat_001",
      "kind": "card_ui_symbol",
      "label": "retreat cost 2 colorless",
      "normalized_label": "retreat_cost_2",
      "scene_layer": "ui",
      "frame_position": "bottom_center_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_001",
      "kind": "rarity_mark",
      "label": "SAR rarity mark",
      "normalized_label": "sar_rarity_mark",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_text_bottom_001",
      "kind": "bottom_line_text",
      "label": "bottom copyright and legal text area",
      "normalized_label": "bottom_legal_text_area",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.7,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_mega_chandelure_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "scene subject is Mega Chandelure",
      "value": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_lantern_body_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.lantern_body",
      "claim": "has lantern body",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_body_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_arms_flamed_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.lantern_arms",
      "claim": "lantern arms have flames at ends",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_arms_001",
        "obs_creature_flamed_torches_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_floating_001",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "pose is floating",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_creature_floating_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_colors_001",
      "module": "creature_anatomy",
      "field_path": "colors",
      "claim": "colors are purple and black",
      "value": "purple and black",
      "supporting_observation_ids": [
        "obs_creature_color_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_facial_features_eyes_glowing_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.eyes",
      "claim": "eyes are glowing",
      "value": "glowing",
      "supporting_observation_ids": [
        "obs_creature_facial_features_001"
      ],
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_markings_black_skeletal_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.markings",
      "claim": "black skeletal pattern present",
      "value": "black skeletal pattern",
      "supporting_observation_ids": [
        "obs_creature_markings_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_effects_purple_flames_001",
      "module": "creature_anatomy",
      "field_path": "effects.flames",
      "claim": "purple flames around subject",
      "value": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_flame_effect_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_dark_background_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "dark background environment",
      "value": "dark background",
      "supporting_observation_ids": [
        "obs_environment_dark_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible in Japanese",
      "value": "Mega Chandelure ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text 350 visible",
      "value": "350 HP",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "psychic type symbol visible",
      "value": "psychic",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Abyss Eye set symbol present",
      "value": "Abyss Eye",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "card number 113/081 visible",
      "value": "113/081",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_weakness_001",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_symbol",
      "claim": "weakness symbol x2",
      "value": "x2",
      "supporting_observation_ids": [
        "obs_card_ui_weakness_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_resistance_001",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_symbol",
      "claim": "resistance symbol -30",
      "value": "-30",
      "supporting_observation_ids": [
        "obs_card_ui_resistance_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_retreat_001",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "retreat cost 2 colorless",
      "value": "2 colorless",
      "supporting_observation_ids": [
        "obs_card_ui_retreat_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_rarity_001",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "SAR rarity mark",
      "value": "SAR",
      "supporting_observation_ids": [
        "obs_card_ui_rarity_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "bottom legal text area visible",
      "value": "visible but text unreadable",
      "supporting_observation_ids": [
        "obs_card_ui_text_bottom_001"
      ],
      "confidence": 0.7,
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
        "curled flame torches",
        "lantern arms with flames",
        "lantern body"
      ],
      "physical_features": [
        "black skeletal pattern",
        "glowing eyes"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "floating",
      "action_state": [],
      "facial_evidence": {
        "eyes": "glowing",
        "mouth": "cannot determine",
        "eyebrows": "cannot determine",
        "face_position": "centered",
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
      "obs_creature_arms_001",
      "obs_creature_body_001",
      "obs_creature_color_001",
      "obs_creature_facial_features_001",
      "obs_creature_flame_effect_001",
      "obs_creature_flamed_torches_001",
      "obs_creature_floating_pose_001",
      "obs_creature_markings_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_dark_001"
    ]
  },
  "environment": {
    "setting": [
      "dark background"
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
      "obs_environment_dark_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "purple",
      "yellow-orange (flame colors)"
    ],
    "lighting": [
      "glowing flame ends on arms",
      "highlight on lantern body"
    ],
    "shadows": [
      "shadow on lower right and background"
    ],
    "highlights": [
      "bright highlights on body curves"
    ],
    "composition": [
      "centered subject",
      "floating pose with flames curling"
    ],
    "camera_angle": "front diagonal slightly below",
    "framing": "full body centered",
    "cropping": [],
    "depth": "distinct separation of subject from background",
    "motion_cues": [
      "flame flicker illusion"
    ],
    "motifs": [
      "ghostly flames",
      "lantern theme"
    ],
    "repeated_shapes": [
      "curled flames on arms"
    ],
    "style_cues": [
      "digital painted",
      "game art style",
      "sharp outlines"
    ],
    "supporting_observation_ids": [
      "obs_creature_arms_001",
      "obs_creature_body_001",
      "obs_creature_flame_effect_001",
      "obs_environment_dark_001",
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
        "fact_subject_mega_chandelure_001"
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
        "fact_creature_anatomy_arms_flamed_001",
        "fact_creature_anatomy_lantern_body_001",
        "fact_creature_colors_001",
        "fact_creature_effects_purple_flames_001",
        "fact_creature_facial_features_eyes_glowing_001",
        "fact_creature_markings_black_skeletal_001",
        "fact_creature_pose_floating_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "lantern body",
          "feature": "body",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "purple"
          ],
          "details": [
            "lantern shape"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_001"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "eyes",
          "visibility": "fully_visible",
          "colors": [
            "yellow-orange"
          ],
          "details": [
            "glowing eyes"
          ],
          "supporting_observation_ids": [
            "obs_creature_facial_features_001"
          ],
          "confidence": 0.91
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "markings",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "black skeletal pattern"
          ],
          "supporting_observation_ids": [
            "obs_creature_markings_001"
          ],
          "confidence": 0.92
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "floating",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_creature_floating_pose_001"
          ],
          "confidence": 0.98
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple flames",
          "details": [
            "flames surround subject and arms"
          ],
          "supporting_observation_ids": [
            "obs_creature_flame_effect_001"
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
        "fact_environment_dark_background_001"
      ],
      "observation_ids": [
        "obs_environment_dark_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_flame_effect_001",
        "obs_creature_floating_pose_001",
        "obs_environment_dark_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_color_001",
        "obs_creature_facial_features_001",
        "obs_creature_flamed_torches_001",
        "obs_environment_dark_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_creature_flame_effect_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_bottom_text_001",
        "fact_card_ui_hp_text_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_number_001",
        "fact_card_ui_rarity_001",
        "fact_card_ui_resistance_001",
        "fact_card_ui_retreat_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_type_symbol_001",
        "fact_card_ui_weakness_001"
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
        "obs_card_ui_set_001",
        "obs_card_ui_type_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_rarity_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_bottom_001"
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
        "lantern body",
        "floating pose",
        "purple flames",
        "glowing eyes",
        "dark background"
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
      "review_status": "complete",
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
      "semantic_fact_id": "svf_floating_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_floating_pose_001"
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
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "svf_purple_flames_001",
      "category": "environment",
      "label": "purple flames",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_flame_effect_001"
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
          "purple flames"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "svf_dark_background_001",
      "category": "environment",
      "label": "dark background",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_dark_001"
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
          "dark background"
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
      "term": "lantern body",
      "supporting_observation_ids": [
        "obs_creature_body_001"
      ]
    },
    {
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_creature_floating_pose_001"
      ]
    },
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_flame_effect_001"
      ]
    },
    {
      "term": "glowing eyes",
      "supporting_observation_ids": [
        "obs_creature_facial_features_001"
      ]
    },
    {
      "term": "dark background",
      "supporting_observation_ids": [
        "obs_environment_dark_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "dark background",
        "source_observation_ids": [
          "obs_environment_dark_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_arms_001",
          "obs_creature_flame_effect_001",
          "obs_creature_flamed_torches_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_floating_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "floating orientation",
        "source_observation_ids": [
          "obs_creature_floating_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_creature_arms_001",
          "obs_creature_facial_features_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "purple flames",
        "source_observation_ids": [
          "obs_creature_flame_effect_001"
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
- Review status: `pending`
- Description confidence: `0.93`
- Attribute confidence: `0.92`
- Cost USD: `0.0096108`
- Artwork observations: `11`
- Card UI / print-marker observations: `12`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, body, head, eyes, mouth, spikes, limbs not visible, floating. Semantic facts: floating, abstract digital circuit background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | high | 1 |
| body_main | body | creature_anatomy | foreground | high | 1 |
| head | head | creature_anatomy | foreground | high | 1 |
| eyes | eyes | creature_anatomy | foreground | high | 0.9 |
| mouth | mouth | creature_anatomy | foreground | high | 0.8 |
| head_spikes | spikes | creature_anatomy | foreground | high | 1 |
| limbs_not_visible | limbs not visible | creature_anatomy | foreground | high | 1 |
| floating | floating | creature_anatomy | foreground | high | 0.95 |
| color_palette | yellow gold | color_and_light | foreground | high | 1 |
| abstract_golden_digital_circuit_background | abstract golden digital circuit background | environment | background | medium | 1 |
| central_frontal_subject | central frontal subject | composition | foreground | high | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card_name_text_megadarkrai_ex_japanese | card_ui_text | top_center | fully_visible | 1 |
| hp_280 | card_ui_text | top_right | fully_visible | 1 |
| dark_type_symbol | card_ui_symbol | top_right | fully_visible | 1 |
| attack_1_name | card_ui_text | mid_left | fully_visible | 1 |
| attack_2_name | card_ui_text | mid_left_lower | fully_visible | 1 |
| illustrator_5ban_Graphics | card_ui_text | bottom_left | fully_visible | 1 |
| card_number_118_081 | card_ui_text | bottom_left_center | fully_visible | 1 |
| set_symbol_jpn_m5 | card_ui_symbol | bottom_left_center | fully_visible | 1 |
| weakness_grass_x2 | card_ui_text | bottom_left_below_number | fully_visible | 1 |
| resistance_none | card_ui_text | bottom_left_below_weakness | fully_visible | 1 |
| retreat_cost_two_colorless | card_ui_text | bottom_right | fully_visible | 1 |
| copyright_pokémon_Nintendo_Creatures_GAMEFREAK_2026 | card_ui_text | bottom_center | fully_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 1 |
| fact_creature_body_001 | creature_anatomy | body region main body | obs_creature_body_001 | 1 |
| fact_creature_head_001 | creature_anatomy | head presence | obs_creature_head_001 | 1 |
| fact_creature_eyes_001 | creature_anatomy | eyes visible | obs_creature_eye_001 | 0.9 |
| fact_creature_mouth_001 | creature_anatomy | mouth visible | obs_creature_mouth_001 | 0.8 |
| fact_creature_spikes_001 | creature_anatomy | head spikes | obs_creature_spikes_001 | 1 |
| fact_creature_limbs_001 | creature_anatomy | limbs visible | obs_creature_limbs_001 | 1 |
| fact_creature_pose_001 | creature_anatomy | pose orientation | obs_creature_orientation_001 | 0.95 |
| fact_creature_color_001 | color_and_light | primary color palette | obs_creature_color_001 | 1 |
| fact_environment_001 | environment | background pattern | obs_environment_background_001 | 1 |
| fact_composition_001 | composition | subject position | obs_composition_frontal_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text | obs_card_ui_001 | 1 |
| fact_card_ui_002 | HP text | obs_card_ui_002 | 1 |
| fact_card_ui_003 | energy type symbol | obs_card_ui_003 | 1 |
| fact_card_ui_004 | attack names text | obs_card_ui_004, obs_card_ui_005 | 1 |
| fact_card_ui_005 | illustrator text | obs_card_ui_006 | 1 |
| fact_card_ui_006 | collector number | obs_card_ui_007 | 1 |
| fact_card_ui_007 | set symbol | obs_card_ui_008 | 1 |
| fact_card_ui_008 | weakness text | obs_card_ui_009 | 1 |
| fact_card_ui_009 | resistance text | obs_card_ui_010 | 1 |
| fact_card_ui_010 | retreat cost | obs_card_ui_011 | 1 |
| fact_card_ui_011 | copyright line text | obs_card_ui_012 | 1 |

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
    "fact_card_ui_009",
    "fact_card_ui_010",
    "fact_card_ui_011"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_007"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_008"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_012"
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
| sem_fact_002 | state | floating | obs_subject_001 | obs_creature_orientation_001 | floating | 0.95 |
| sem_fact_003 | environment | abstract digital circuit background |  | obs_environment_background_001 | abstract golden digital circuit background | 1 |

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
| floating Pokemon | obs_creature_orientation_001 |
| golden digital circuit background | obs_environment_background_001 |
| Japanese ex text | obs_subject_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| abstract digital circuit background | obs_environment_background_001 | deterministic_rule | 1 |
| centered composition | obs_composition_frontal_001 | deterministic_rule | 1 |
| floating | obs_creature_orientation_001, obs_subject_001 | deterministic_rule | 1 |
| upright orientation | obs_creature_orientation_001, obs_subject_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, body, head, eyes, mouth, spikes, limbs not visible, floating. Semantic facts: floating, abstract digital circuit background.
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
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "creature_anatomy",
      "label": "body_main",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_head_001",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_eye_001",
      "kind": "creature_anatomy",
      "label": "eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "head_area",
      "visibility": "partially_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_creature_mouth_001",
      "kind": "creature_anatomy",
      "label": "mouth",
      "normalized_label": "mouth",
      "scene_layer": "foreground",
      "frame_position": "head_area",
      "visibility": "not_visible",
      "salience": "high",
      "confidence": 0.8,
      "evidence_strength": "weak"
    },
    {
      "observation_id": "obs_creature_spikes_001",
      "kind": "creature_anatomy",
      "label": "head_spikes",
      "normalized_label": "spikes",
      "scene_layer": "foreground",
      "frame_position": "head_surround",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_limbs_001",
      "kind": "creature_anatomy",
      "label": "limbs_not_visible",
      "normalized_label": "limbs not visible",
      "scene_layer": "foreground",
      "frame_position": "bottom_crop",
      "visibility": "not_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_orientation_001",
      "kind": "creature_anatomy",
      "label": "floating",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_color_001",
      "kind": "color_and_light",
      "label": "color_palette",
      "normalized_label": "yellow gold",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_background_001",
      "kind": "environment",
      "label": "abstract_golden_digital_circuit_background",
      "normalized_label": "abstract golden digital circuit background",
      "scene_layer": "background",
      "frame_position": "full_frame",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_frontal_001",
      "kind": "composition",
      "label": "central_frontal_subject",
      "normalized_label": "central frontal subject",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card_name_text_megadarkrai_ex_japanese",
      "normalized_label": "card name text megadarkrai ex japanese",
      "scene_layer": "card_ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "hp_280",
      "normalized_label": "hp 280",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "dark_type_symbol",
      "normalized_label": "dark type symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "attack_1_name",
      "normalized_label": "attack name 1",
      "scene_layer": "card_ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "attack_2_name",
      "normalized_label": "attack name 2",
      "scene_layer": "card_ui",
      "frame_position": "mid_left_lower",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "illustrator_5ban_Graphics",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "card_number_118_081",
      "normalized_label": "card number 118/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "card_ui_symbol",
      "label": "set_symbol_jpn_m5",
      "normalized_label": "set symbol jpn m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_009",
      "kind": "card_ui_text",
      "label": "weakness_grass_x2",
      "normalized_label": "weakness grass x2",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_below_number",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_010",
      "kind": "card_ui_text",
      "label": "resistance_none",
      "normalized_label": "resistance none",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_below_weakness",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_011",
      "kind": "card_ui_text",
      "label": "retreat_cost_two_colorless",
      "normalized_label": "retreat cost two colorless",
      "scene_layer": "card_ui",
      "frame_position": "bottom_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_012",
      "kind": "card_ui_text",
      "label": "copyright_pokémon_Nintendo_Creatures_GAMEFREAK_2026",
      "normalized_label": "copyright pokémon nintendo creatures gamefreak 2026",
      "scene_layer": "card_ui",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 1,
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
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_body_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.body_main",
      "claim": "body region main body",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_body_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_head_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "head presence",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_head_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_eyes_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.eyes",
      "claim": "eyes visible",
      "value": "partially visible with eye details obscured",
      "supporting_observation_ids": [
        "obs_creature_eye_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_creature_mouth_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.mouth",
      "claim": "mouth visible",
      "value": "not visible or obscured",
      "supporting_observation_ids": [
        "obs_creature_mouth_001"
      ],
      "confidence": 0.8,
      "evidence_strength": "weak"
    },
    {
      "fact_id": "fact_creature_spikes_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.spikes_on_head",
      "claim": "head spikes",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_spikes_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_limbs_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.limbs_visible",
      "claim": "limbs visible",
      "value": "not visible / cropped out",
      "supporting_observation_ids": [
        "obs_creature_limbs_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.orientation",
      "claim": "pose orientation",
      "value": "floating upright centered",
      "supporting_observation_ids": [
        "obs_creature_orientation_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_color_001",
      "module": "color_and_light",
      "field_path": "colors.primary_palette",
      "claim": "primary color palette",
      "value": "golden yellow",
      "supporting_observation_ids": [
        "obs_creature_color_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting.background",
      "claim": "background pattern",
      "value": "abstract golden digital circuit design",
      "supporting_observation_ids": [
        "obs_environment_background_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "composition.central_subject_position",
      "claim": "subject position",
      "value": "centered frontal",
      "supporting_observation_ids": [
        "obs_composition_frontal_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガダークライ ex (Mega Darkrai ex) in Japanese",
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
      "claim": "HP text",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy type symbol",
      "value": "Dark type symbol",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_names",
      "claim": "attack names text",
      "value": "Two attacks visible with Japanese text",
      "supporting_observation_ids": [
        "obs_card_ui_004",
        "obs_card_ui_005"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "118/081",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_008",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness_text",
      "claim": "weakness text",
      "value": "Grass x2",
      "supporting_observation_ids": [
        "obs_card_ui_009"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_009",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance_text",
      "claim": "resistance text",
      "value": "none",
      "supporting_observation_ids": [
        "obs_card_ui_010"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_010",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "retreat cost",
      "value": "two colorless energies",
      "supporting_observation_ids": [
        "obs_card_ui_011"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_011",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_012"
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
        "body main",
        "eyes",
        "head",
        "spikes"
      ],
      "physical_features": [
        "head spikes"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "partially visible with details obscured",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center top",
        "other_visible_evidence": [
          "head spikes"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "golden yellow"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_creature_body_001",
      "obs_creature_eye_001",
      "obs_creature_head_001",
      "obs_creature_spikes_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_background_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract golden digital circuit"
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
      "obs_environment_background_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark brown shadows",
      "gold",
      "yellow"
    ],
    "lighting": [
      "high contrast",
      "highlight on subject center"
    ],
    "shadows": [
      "shadow under spikes"
    ],
    "highlights": [
      "golden reflective highlights"
    ],
    "composition": [
      "centered subject",
      "symmetrical motif background"
    ],
    "camera_angle": "straight frontal",
    "framing": "tight crop on upper body",
    "cropping": [
      "lower limbs cropped"
    ],
    "depth": "shallow depth",
    "motion_cues": [],
    "motifs": [
      "circuit"
    ],
    "repeated_shapes": [
      "circuit lines",
      "rounded spikes"
    ],
    "style_cues": [
      "digital art",
      "glowing effects"
    ],
    "supporting_observation_ids": [
      "obs_creature_spikes_001",
      "obs_environment_background_001",
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
        "fact_creature_body_001",
        "fact_creature_eyes_001",
        "fact_creature_head_001",
        "fact_creature_limbs_001",
        "fact_creature_mouth_001",
        "fact_creature_pose_001",
        "fact_creature_spikes_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body main",
          "feature": "body",
          "visibility": "fully_visible",
          "colors": [
            "golden yellow"
          ],
          "details": [
            "digital art style body"
          ],
          "supporting_observation_ids": [
            "obs_creature_body_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head",
          "visibility": "fully_visible",
          "colors": [
            "golden yellow"
          ],
          "details": [
            "head spikes present"
          ],
          "supporting_observation_ids": [
            "obs_creature_head_001",
            "obs_creature_spikes_001"
          ],
          "confidence": 1
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "eyes",
          "visibility": "partially_visible",
          "colors": [
            "dark areas"
          ],
          "details": [
            "eyes partially visible but obscured"
          ],
          "supporting_observation_ids": [
            "obs_creature_eye_001"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "mouth",
          "visibility": "not_visible",
          "colors": [],
          "details": [
            "mouth not visible or obscured"
          ],
          "supporting_observation_ids": [
            "obs_creature_mouth_001"
          ],
          "confidence": 0.8
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "spikes",
          "visibility": "fully_visible",
          "colors": [
            "golden yellow"
          ],
          "details": [
            "sharp spikes surrounding head"
          ],
          "supporting_observation_ids": [
            "obs_creature_spikes_001"
          ],
          "confidence": 1
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
            "obs_creature_orientation_001"
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
        "obs_environment_background_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_composition_001"
      ],
      "observation_ids": [
        "obs_composition_frontal_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_creature_color_001"
      ],
      "observation_ids": [
        "obs_creature_color_001"
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
        "fact_card_ui_009",
        "fact_card_ui_010",
        "fact_card_ui_011"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_007"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_008"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_012"
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
        "floating Pokemon",
        "golden digital circuit background",
        "Japanese ex text"
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
      "semantic_fact_id": "sem_fact_002",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_orientation_001"
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
      "semantic_fact_id": "sem_fact_003",
      "category": "environment",
      "label": "abstract digital circuit background",
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
          "abstract golden digital circuit background"
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
      "term": "floating Pokemon",
      "supporting_observation_ids": [
        "obs_creature_orientation_001"
      ]
    },
    {
      "term": "golden digital circuit background",
      "supporting_observation_ids": [
        "obs_environment_background_001"
      ]
    },
    {
      "term": "Japanese ex text",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "abstract digital circuit background",
        "source_observation_ids": [
          "obs_environment_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_frontal_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_orientation_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_creature_orientation_001",
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
- Attribute confidence: `0.96`
- Cost USD: `0.0123864`
- Artwork observations: `16`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Excadrill. Visible observations: mega excadrill, head, horn, eyes, mouth, front claws, tail, body segments. Counts: front claws: 2, eyes: 2.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Excadrill | mega excadrill | scene_subject | foreground | high | 0.99 |
| head | head | creature_anatomy | foreground | high | 0.99 |
| drill shape horn on head | horn | creature_anatomy | foreground | high | 0.95 |
| two eyes | eyes | creature_anatomy | foreground | high | 0.98 |
| mouth | mouth | creature_anatomy | foreground | medium | 0.95 |
| two front claws with three nails each | front claws | creature_anatomy | foreground | high | 0.95 |
| tail seen behind | tail | creature_anatomy | foreground | medium | 0.9 |
| spiral body segments | body segments | creature_anatomy | foreground | high | 0.98 |
| red triangular markings on back | markings | creature_anatomy | foreground | high | 0.95 |
| gray black colored main body | body color | creature_anatomy | foreground | high | 0.99 |
| pinkish inside of ears | ear color | creature_anatomy | foreground | medium | 0.9 |
| eyes looking forward | eye direction | creature_anatomy | foreground | medium | 0.95 |
| subject positioned sideways with head turned forward | sideways pose | creature_anatomy | foreground | high | 0.95 |
| standing on rear claws | standing pose | creature_anatomy | foreground | high | 0.9 |
| red and yellow flame like abstract shapes around | flame effects | objects_and_props | foreground | medium | 0.85 |
| dark background with red and yellow luminous pattern | abstract glowing background | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text for card name 'メガドリュウズ ex' | card_ui_text | top | fully_visible | 0.99 |
| HP 340 text | card_ui_text | top right | fully_visible | 0.99 |
| two colorless energy symbols near bottom | card_ui_symbol | bottom left | fully_visible | 0.99 |
| Attack text lines in Japanese below the artwork | card_ui_text | below artwork | fully_visible | 0.95 |
| Copyright and illustrator text at bottom left corner | card_ui_text | bottom left | partially_visible | 0.9 |
| The collector number 101/081 SR at bottom middle | card_ui_text | bottom center | fully_visible | 0.99 |
| Set symbol J M5 in black and yellow bottom left | card_ui_symbol | bottom left | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | body region head visible | obs_creature_anatomy_001 | 0.99 |
| fact_creature_anatomy_002 | creature_anatomy | horn feature present | obs_creature_anatomy_002 | 0.95 |
| fact_creature_anatomy_003 | creature_anatomy | eyes visible | obs_creature_anatomy_003 | 0.98 |
| fact_creature_anatomy_004 | creature_anatomy | mouth visible | obs_creature_anatomy_004 | 0.95 |
| fact_creature_anatomy_005 | creature_anatomy | front claws visible | obs_creature_anatomy_005 | 0.95 |
| fact_creature_anatomy_006 | creature_anatomy | tail visible | obs_creature_anatomy_006 | 0.9 |
| fact_creature_anatomy_007 | creature_anatomy | body segments visible | obs_creature_anatomy_007 | 0.98 |
| fact_creature_anatomy_008 | creature_anatomy | red triangular markings on back | obs_creature_anatomy_008 | 0.95 |
| fact_creature_anatomy_009 | creature_anatomy | body color | obs_creature_anatomy_009 | 0.99 |
| fact_creature_anatomy_010 | creature_anatomy | ear color | obs_creature_anatomy_010 | 0.9 |
| fact_creature_anatomy_011 | creature_anatomy | pose orientation | obs_pose_orientation_001 | 0.95 |
| fact_creature_anatomy_012 | creature_anatomy | pose action state | obs_pose_orientation_002 | 0.9 |
| fact_environment_001 | environment | background setting | obs_environment_001, obs_objects_and_props_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text | obs_card_ui_text_001 | 0.99 |
| fact_card_ui_and_print_markers_002 | HP text | obs_card_ui_text_002 | 0.99 |
| fact_card_ui_and_print_markers_003 | energy symbols | obs_card_ui_symbol_001 | 0.99 |
| fact_card_ui_and_print_markers_004 | attack text visible in Japanese below artwork | obs_card_ui_text_003 | 0.95 |
| fact_card_ui_and_print_markers_005 | copyright and illustrator text visible | obs_card_ui_text_004 | 0.9 |
| fact_card_ui_and_print_markers_006 | collector number and rarity | obs_card_ui_text_005 | 0.99 |
| fact_card_ui_and_print_markers_007 | set symbol | obs_card_ui_symbol_002 | 0.99 |

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
    "obs_card_ui_symbol_002"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_004"
  ],
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
| objects_and_props | complete | none | medium |  |
| environment | complete | low | high |  |
| composition | likely_complete | low | medium |  |
| color_and_light | likely_complete | low | medium |  |
| visual_effects | likely_complete | medium | medium |  |
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
| front claws | exact | 2 | obs_creature_anatomy_005 | 0.95 |
| eyes | exact | 2 | obs_creature_anatomy_003 | 0.98 |

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
| head | obs_creature_anatomy_001 |
| horn | obs_creature_anatomy_002 |
| eyes | obs_creature_anatomy_003 |
| mouth | obs_creature_anatomy_004 |
| front claws | obs_creature_anatomy_005 |
| tail | obs_creature_anatomy_006 |
| body segments | obs_creature_anatomy_007 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_001, obs_objects_and_props_001 | deterministic_rule | 0.92 |
| flame | obs_objects_and_props_001 | deterministic_rule | 0.92 |
| forward orientation | obs_creature_anatomy_005, obs_pose_orientation_001, obs_pose_orientation_002, obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_environment_001 | deterministic_rule | 0.92 |
| sideways body with head turned forward | obs_pose_orientation_001, obs_pose_orientation_002, obs_subject_001 | deterministic_rule | 0.99 |
| standing | obs_pose_orientation_002, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Excadrill. Visible observations: mega excadrill, head, horn, eyes, mouth, front claws, tail, body segments. Counts: front claws: 2, eyes: 2.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
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
      "label": "drill shape horn on head",
      "normalized_label": "horn",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "two eyes",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "mouth",
      "normalized_label": "mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "two front claws with three nails each",
      "normalized_label": "front claws",
      "scene_layer": "foreground",
      "frame_position": "center_bottom",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "tail seen behind",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "spiral body segments",
      "normalized_label": "body segments",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_008",
      "kind": "creature_anatomy",
      "label": "red triangular markings on back",
      "normalized_label": "markings",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_009",
      "kind": "creature_anatomy",
      "label": "gray black colored main body",
      "normalized_label": "body color",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_010",
      "kind": "creature_anatomy",
      "label": "pinkish inside of ears",
      "normalized_label": "ear color",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_011",
      "kind": "creature_anatomy",
      "label": "eyes looking forward",
      "normalized_label": "eye direction",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_orientation_001",
      "kind": "creature_anatomy",
      "label": "subject positioned sideways with head turned forward",
      "normalized_label": "sideways pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_orientation_002",
      "kind": "creature_anatomy",
      "label": "standing on rear claws",
      "normalized_label": "standing pose",
      "scene_layer": "foreground",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_001",
      "kind": "objects_and_props",
      "label": "red and yellow flame like abstract shapes around",
      "normalized_label": "flame effects",
      "scene_layer": "foreground",
      "frame_position": "surrounding subject",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark background with red and yellow luminous pattern",
      "normalized_label": "abstract glowing background",
      "scene_layer": "background",
      "frame_position": "full card",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "Japanese text for card name 'メガドリュウズ ex'",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "HP 340 text",
      "normalized_label": "HP text",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_001",
      "kind": "card_ui_symbol",
      "label": "two colorless energy symbols near bottom",
      "normalized_label": "energy symbols",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "Attack text lines in Japanese below the artwork",
      "normalized_label": "attack text",
      "scene_layer": "card_ui",
      "frame_position": "below artwork",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "Copyright and illustrator text at bottom left corner",
      "normalized_label": "copyright and illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "partially_visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "The collector number 101/081 SR at bottom middle",
      "normalized_label": "collector number and rarity text",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_002",
      "kind": "card_ui_symbol",
      "label": "Set symbol J M5 in black and yellow bottom left",
      "normalized_label": "set symbol",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0].identity",
      "claim": "subject identity",
      "value": "Mega Excadrill",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "[0].body_regions.head",
      "claim": "body region head visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "[0].physical_features.horn",
      "claim": "horn feature present",
      "value": "drill shape horn on head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "[0].physical_features.eyes",
      "claim": "eyes visible",
      "value": "two eyes visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "[0].physical_features.mouth",
      "claim": "mouth visible",
      "value": "mouth visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "[0].body_regions.front_claws",
      "claim": "front claws visible",
      "value": "two claws with three nails each",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "[0].body_regions.tail",
      "claim": "tail visible",
      "value": "tail behind",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "[0].physical_features.body_segments",
      "claim": "body segments visible",
      "value": "spiral body segments",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_008",
      "module": "creature_anatomy",
      "field_path": "[0].physical_features.markings",
      "claim": "red triangular markings on back",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_008"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_009",
      "module": "creature_anatomy",
      "field_path": "[0].colors.body_color",
      "claim": "body color",
      "value": "gray black",
      "supporting_observation_ids": [
        "obs_creature_anatomy_009"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_010",
      "module": "creature_anatomy",
      "field_path": "[0].colors.ear_color",
      "claim": "ear color",
      "value": "pinkish",
      "supporting_observation_ids": [
        "obs_creature_anatomy_010"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_011",
      "module": "creature_anatomy",
      "field_path": "[0].pose.orientation",
      "claim": "pose orientation",
      "value": "sideways body with head turned forward",
      "supporting_observation_ids": [
        "obs_pose_orientation_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_012",
      "module": "creature_anatomy",
      "field_path": "[0].pose.action_state",
      "claim": "pose action state",
      "value": "standing on rear claws",
      "supporting_observation_ids": [
        "obs_pose_orientation_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background setting",
      "value": "abstract dark with red and yellow glowing flames",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_objects_and_props_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガドリュウズ ex (Mega Excadrill ex)",
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
      "value": "340",
      "supporting_observation_ids": [
        "obs_card_ui_text_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy symbols",
      "value": "two colorless energy symbols near bottom",
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
      "claim": "attack text visible in Japanese below artwork",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright and illustrator text visible",
      "value": "visible with partial legibility",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and rarity",
      "value": "101/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_002"
      ],
      "confidence": 0.99,
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
        "body segments",
        "eyes",
        "front claws",
        "head",
        "horn",
        "markings",
        "mouth",
        "tail"
      ],
      "physical_features": [
        "drill shape horn on head",
        "mouth",
        "red triangular markings on back",
        "spiral body segments",
        "two eyes",
        "two front claws with three nails each"
      ],
      "pose": [
        "sideways body with head turned forward",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [
        "standing"
      ],
      "facial_evidence": {
        "eyes": "visible veins around eyes",
        "mouth": "closed",
        "eyebrows": "not visible",
        "face_position": "side view",
        "other_visible_evidence": [
          "pink inside of ears"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "gray black",
        "pink inside ears",
        "red",
        "yellow"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_claws_001",
      "normalized_label": "front claws",
      "count_type": "exact",
      "exact_count": 2,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    },
    {
      "count_id": "count_eyes_001",
      "normalized_label": "eyes",
      "count_type": "exact",
      "exact_count": 2,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "scene_layer": "foreground",
      "confidence": 0.98
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
      "obs_creature_anatomy_008",
      "obs_creature_anatomy_009",
      "obs_creature_anatomy_010",
      "obs_creature_anatomy_011",
      "obs_objects_and_props_001",
      "obs_pose_orientation_001",
      "obs_pose_orientation_002",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract glowing background",
      "dark background"
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
      "obs_objects_and_props_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_and_props_001",
      "label": "red and yellow flame like abstract shapes",
      "normalized_label": "abstract flames",
      "object_type": "flame/effect",
      "colors": [
        "red",
        "yellow"
      ],
      "material_appearance": [],
      "location": "around subject",
      "count_reference": "count_flames_001",
      "confidence": 0.85
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark gray",
      "pink",
      "red",
      "yellow"
    ],
    "lighting": [
      "glowing red and yellow highlights"
    ],
    "shadows": [
      "soft shadows on subject body"
    ],
    "highlights": [
      "red and yellow highlights on markings and background"
    ],
    "composition": [
      "central subject with surrounding abstract flames"
    ],
    "camera_angle": "eye level",
    "framing": "subject centered",
    "cropping": [
      "full subject visible except tail partly cut"
    ],
    "depth": "medium depth with well defined foreground",
    "motion_cues": [],
    "motifs": [
      "triangular red markings"
    ],
    "repeated_shapes": [
      "triangular markings on back"
    ],
    "style_cues": [
      "glowing effects",
      "illustrated digital artwork"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_008",
      "obs_creature_anatomy_009",
      "obs_environment_001",
      "obs_objects_and_props_001"
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
        "fact_creature_anatomy_008",
        "fact_creature_anatomy_009",
        "fact_creature_anatomy_010",
        "fact_creature_anatomy_011",
        "fact_creature_anatomy_012"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "eyes",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "pink",
            "white"
          ],
          "details": [
            "eyes looking forward",
            "two eyes visible"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003",
            "obs_creature_anatomy_011"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "mouth",
          "visibility": "fully_visible",
          "colors": [
            "pink"
          ],
          "details": [
            "mouth visible"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "horn",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "gray"
          ],
          "details": [
            "drill shape horn on head"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "markings",
          "visibility": "fully_visible",
          "colors": [
            "red"
          ],
          "details": [
            "red triangular markings on back"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_008"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "sideways body with head turned forward"
          ],
          "orientation": "forward",
          "action_state": [
            "standing on rear claws"
          ],
          "supporting_observation_ids": [
            "obs_pose_orientation_001",
            "obs_pose_orientation_002"
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
        "obs_environment_001",
        "obs_objects_and_props_001"
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
        "obs_creature_anatomy_009",
        "obs_environment_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_objects_and_props_001"
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
        "obs_card_ui_symbol_002"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_004"
      ],
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
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_claws_001",
        "count_eyes_001"
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
        "head",
        "horn",
        "eyes",
        "mouth",
        "front claws",
        "tail",
        "body segments"
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
      "omission_risk": "none",
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
      "evidence_quality": "medium",
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
      "review_status": "likely_complete",
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
      "term": "head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ]
    },
    {
      "term": "horn",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    },
    {
      "term": "eyes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ]
    },
    {
      "term": "mouth",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "front claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ]
    },
    {
      "term": "tail",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ]
    },
    {
      "term": "body segments",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
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
          "obs_objects_and_props_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_objects_and_props_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_005",
          "obs_pose_orientation_001",
          "obs_pose_orientation_002",
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
        "concept": "sideways body with head turned forward",
        "source_observation_ids": [
          "obs_pose_orientation_001",
          "obs_pose_orientation_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_pose_orientation_002",
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
- Attribute confidence: `0.97`
- Cost USD: `0.0121112`
- Artwork observations: `21`
- Card UI / print-marker observations: `10`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, head, torso, left arm, right arm, left leg, right leg, ears. Semantic facts: purple pink electric background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | mega zeraora | scene_subject | foreground | high | 0.99 |
| body region - head | head | creature_anatomy | foreground | high | 0.98 |
| body region - torso | torso | creature_anatomy | foreground | high | 0.98 |
| body region - left arm | left arm | creature_anatomy | foreground | high | 0.98 |
| body region - right arm | right arm | creature_anatomy | foreground | high | 0.98 |
| body region - left leg | left leg | creature_anatomy | foreground | high | 0.98 |
| body region - right leg | right leg | creature_anatomy | foreground | high | 0.98 |
| body feature - ears | ears | creature_anatomy | foreground | medium | 0.96 |
| body feature - tail | tail | creature_anatomy | foreground | medium | 0.95 |
| body feature - claws | claws | creature_anatomy | foreground | medium | 0.95 |
| body feature - fur | fur | creature_anatomy | foreground | high | 0.99 |
| body markings - blue accents | blue markings | creature_anatomy | foreground | high | 0.98 |
| body markings - yellow accents | yellow markings | creature_anatomy | foreground | high | 0.98 |
| body markings - black base color | black base color | creature_anatomy | foreground | high | 0.99 |
| eye color - yellow and blue | eyes yellow blue | creature_anatomy | foreground | high | 0.97 |
| mouth - closed | mouth closed | creature_anatomy | foreground | medium | 0.95 |
| pose - crouching with forearms extended | crouching pose | creature_anatomy | foreground | high | 0.98 |
| orientation - facing right | facing right | creature_anatomy | foreground | high | 0.99 |
| electric energy effects - blue bolts and yellow streaks | electric effects | creature_anatomy | foreground | high | 0.95 |
| background - purple and pink gradient with electric motif | purple pink electric background | environment | background | medium | 0.96 |
| electric spark logo silhouette in background | electric spark logo | objects_and_props | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガゼラオラex | card_ui_text | top | fully_visible | 0.99 |
| HP 270 in white text with yellow outline | hp_text | top right | fully_visible | 0.99 |
| Lightning type symbol yellow with white outline | card_ui_symbol | top right near HP | fully_visible | 0.99 |
| attack name text 1 in Japanese with energy icon (lightning): サンダーフィスト | card_ui_text | center left | fully_visible | 0.95 |
| attack damage 60× | card_ui_text | center left | fully_visible | 0.95 |
| attack name text 2 in Japanese with 3 lightning energy icons: ゼプトターン | card_ui_text | center left below first attack | fully_visible | 0.95 |
| attack damage 150 | card_ui_text | center left below second attack | fully_visible | 0.95 |
| copyright and illustrator text: Illus. 5ban Graphics | bottom_line_text | bottom left | fully_visible | 0.97 |
| collector number 096/081 SR | collector_number | bottom center | fully_visible | 0.97 |
| set symbol J M5 | set_symbol | bottom left center | fully_visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | This card visually depicts Mega Zeraora | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | Visible head of Mega Zeraora | obs_creature_anatomy_001 | 0.98 |
| fact_003 | creature_anatomy | Visible torso of Mega Zeraora | obs_creature_anatomy_002 | 0.98 |
| fact_004 | creature_anatomy | Visible left arm of Mega Zeraora | obs_creature_anatomy_003 | 0.98 |
| fact_005 | creature_anatomy | Visible right arm of Mega Zeraora | obs_creature_anatomy_004 | 0.98 |
| fact_006 | creature_anatomy | Visible left leg of Mega Zeraora | obs_creature_anatomy_005 | 0.98 |
| fact_007 | creature_anatomy | Visible right leg of Mega Zeraora | obs_creature_anatomy_006 | 0.98 |
| fact_008 | creature_anatomy | Visible ears of Mega Zeraora | obs_creature_anatomy_007 | 0.96 |
| fact_009 | creature_anatomy | Visible tail of Mega Zeraora | obs_creature_anatomy_008 | 0.95 |
| fact_010 | creature_anatomy | Visible claws on limbs of Mega Zeraora | obs_creature_anatomy_009 | 0.95 |
| fact_011 | creature_anatomy | Black fur covering Mega Zeraora's body | obs_creature_anatomy_010, obs_creature_anatomy_013 | 0.99 |
| fact_012 | creature_anatomy | Bright blue markings on head, torso, and limbs | obs_creature_anatomy_011 | 0.98 |
| fact_013 | creature_anatomy | Yellow lightning bolt-shaped markings on body | obs_creature_anatomy_012 | 0.98 |
| fact_014 | creature_anatomy | Eyes have yellow and blue coloration | obs_creature_anatomy_014 | 0.97 |
| fact_015 | creature_anatomy | Mouth is closed | obs_creature_anatomy_015 | 0.95 |
| fact_016 | creature_anatomy | Mega Zeraora is crouching with forearms extended | obs_pose_001 | 0.98 |
| fact_017 | creature_anatomy | Mega Zeraora is facing right | obs_pose_002 | 0.99 |
| fact_018 | creature_anatomy | Electric energy effects depicted as blue bolts and yellow streaks around arms and head | obs_creature_effect_001 | 0.95 |
| fact_019 | environment | Background has purple and pink gradient with electric motif | obs_environment_001 | 0.96 |
| fact_020 | objects_and_props | Electric spark logo silhouette visible in background | obs_object_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_021 | Card name text is メガゼラオラex in Japanese characters | obs_card_ui_001 | 0.99 |
| fact_022 | HP printed as 270 in white text with yellow outline | obs_card_ui_002 | 0.99 |
| fact_023 | Set symbol J M5 visible | obs_card_ui_010 | 0.97 |
| fact_024 | Collector number 096/081 with rarity SR visible | obs_card_ui_009 | 0.97 |
| fact_025 | Illustrator text Illus. 5ban Graphics visible | obs_card_ui_008 | 0.97 |
| fact_026 | Attack named サンダーフィスト requiring 1 lightning energy | obs_card_ui_004 | 0.95 |
| fact_027 | Attack damage 60× | obs_card_ui_005 | 0.95 |
| fact_028 | Attack named ゼプトターン requiring 3 lightning energies | obs_card_ui_006 | 0.95 |
| fact_029 | Attack damage 150 | obs_card_ui_007 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_021",
    "fact_022",
    "fact_023",
    "fact_024",
    "fact_025",
    "fact_026",
    "fact_027",
    "fact_028",
    "fact_029"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_009"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_010"
  ],
  "rarity_mark_observation_ids": [],
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
    "obs_card_ui_008"
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
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | medium | fact_grounded_search_terms: limited to visible subject and background only |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_003 | environment | purple pink electric background |  | obs_environment_001 | electric motif purple pink gradient | 0.96 |

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
| electric energy | obs_creature_effect_001 |
| lightning bolt pattern | obs_creature_anatomy_011, obs_creature_anatomy_012 |
| purple pink background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| crouching | obs_pose_001, obs_pose_002, obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_creature_anatomy_003, obs_creature_anatomy_005 | deterministic_rule | 0.98 |
| lightning | obs_object_001 | deterministic_rule | 0.95 |
| purple pink electric background | obs_environment_001 | deterministic_rule | 0.96 |
| right orientation | obs_creature_anatomy_004, obs_creature_anatomy_006, obs_pose_001, obs_pose_002, obs_subject_001 | deterministic_rule | 0.99 |
| spark | obs_object_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Visible observations: mega zeraora, head, torso, left arm, right arm, left leg, right leg, ears. Semantic facts: purple pink electric background.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`
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
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "body region - head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "body region - torso",
      "normalized_label": "torso",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "body region - left arm",
      "normalized_label": "left arm",
      "scene_layer": "foreground",
      "frame_position": "left center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "body region - right arm",
      "normalized_label": "right arm",
      "scene_layer": "foreground",
      "frame_position": "right center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "body region - left leg",
      "normalized_label": "left leg",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "body region - right leg",
      "normalized_label": "right leg",
      "scene_layer": "foreground",
      "frame_position": "bottom right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "body feature - ears",
      "normalized_label": "ears",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_008",
      "kind": "creature_anatomy",
      "label": "body feature - tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_009",
      "kind": "creature_anatomy",
      "label": "body feature - claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "arms and legs",
      "visibility": "partially_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_010",
      "kind": "creature_anatomy",
      "label": "body feature - fur",
      "normalized_label": "fur",
      "scene_layer": "foreground",
      "frame_position": "entire body",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_011",
      "kind": "creature_anatomy",
      "label": "body markings - blue accents",
      "normalized_label": "blue markings",
      "scene_layer": "foreground",
      "frame_position": "head, torso, limbs",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_012",
      "kind": "creature_anatomy",
      "label": "body markings - yellow accents",
      "normalized_label": "yellow markings",
      "scene_layer": "foreground",
      "frame_position": "head, torso, limbs",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_013",
      "kind": "creature_anatomy",
      "label": "body markings - black base color",
      "normalized_label": "black base color",
      "scene_layer": "foreground",
      "frame_position": "entire body",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_014",
      "kind": "creature_anatomy",
      "label": "eye color - yellow and blue",
      "normalized_label": "eyes yellow blue",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_015",
      "kind": "creature_anatomy",
      "label": "mouth - closed",
      "normalized_label": "mouth closed",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "pose - crouching with forearms extended",
      "normalized_label": "crouching pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_002",
      "kind": "creature_anatomy",
      "label": "orientation - facing right",
      "normalized_label": "facing right",
      "scene_layer": "foreground",
      "frame_position": "center right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_effect_001",
      "kind": "creature_anatomy",
      "label": "electric energy effects - blue bolts and yellow streaks",
      "normalized_label": "electric effects",
      "scene_layer": "foreground",
      "frame_position": "arms and head",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "background - purple and pink gradient with electric motif",
      "normalized_label": "purple pink electric background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "electric spark logo silhouette in background",
      "normalized_label": "electric spark logo",
      "scene_layer": "background",
      "frame_position": "right midground",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガゼラオラex",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 270 in white text with yellow outline",
      "normalized_label": "HP 270",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "Lightning type symbol yellow with white outline",
      "normalized_label": "electric type symbol",
      "scene_layer": "ui",
      "frame_position": "top right near HP",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "attack name text 1 in Japanese with energy icon (lightning): サンダーフィスト",
      "normalized_label": "attack name thunder fist",
      "scene_layer": "ui",
      "frame_position": "center left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "attack damage 60×",
      "normalized_label": "attack damage 60x",
      "scene_layer": "ui",
      "frame_position": "center left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "attack name text 2 in Japanese with 3 lightning energy icons: ゼプトターン",
      "normalized_label": "attack name zept turn",
      "scene_layer": "ui",
      "frame_position": "center left below first attack",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "attack damage 150",
      "normalized_label": "attack damage 150",
      "scene_layer": "ui",
      "frame_position": "center left below second attack",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "bottom_line_text",
      "label": "copyright and illustrator text: Illus. 5ban Graphics",
      "normalized_label": "illustrator 5ban Graphics",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_009",
      "kind": "collector_number",
      "label": "collector number 096/081 SR",
      "normalized_label": "collector number 096/081 SR",
      "scene_layer": "ui",
      "frame_position": "bottom center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_010",
      "kind": "set_symbol",
      "label": "set symbol J M5",
      "normalized_label": "set symbol J M5",
      "scene_layer": "ui",
      "frame_position": "bottom left center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "This card visually depicts Mega Zeraora",
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
      "field_path": "body_regions.head",
      "claim": "Visible head of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.torso",
      "claim": "Visible torso of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.left_arm",
      "claim": "Visible left arm of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "body_regions.right_arm",
      "claim": "Visible right arm of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "body_regions.left_leg",
      "claim": "Visible left leg of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "body_regions.right_leg",
      "claim": "Visible right leg of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "creature_anatomy",
      "field_path": "physical_features.ears",
      "claim": "Visible ears of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "creature_anatomy",
      "field_path": "physical_features.tail",
      "claim": "Visible tail of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_008"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "creature_anatomy",
      "field_path": "physical_features.claws",
      "claim": "Visible claws on limbs of Mega Zeraora",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_009"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "creature_anatomy",
      "field_path": "physical_features.fur",
      "claim": "Black fur covering Mega Zeraora's body",
      "value": "black fur",
      "supporting_observation_ids": [
        "obs_creature_anatomy_010",
        "obs_creature_anatomy_013"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "creature_anatomy",
      "field_path": "physical_features.markings.blue",
      "claim": "Bright blue markings on head, torso, and limbs",
      "value": "blue markings",
      "supporting_observation_ids": [
        "obs_creature_anatomy_011"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "creature_anatomy",
      "field_path": "physical_features.markings.yellow",
      "claim": "Yellow lightning bolt-shaped markings on body",
      "value": "yellow markings",
      "supporting_observation_ids": [
        "obs_creature_anatomy_012"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "creature_anatomy",
      "field_path": "face.eyes.color",
      "claim": "Eyes have yellow and blue coloration",
      "value": "yellow and blue eyes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_014"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "creature_anatomy",
      "field_path": "face.mouth.expression",
      "claim": "Mouth is closed",
      "value": "mouth closed",
      "supporting_observation_ids": [
        "obs_creature_anatomy_015"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "creature_anatomy",
      "field_path": "pose.body_position",
      "claim": "Mega Zeraora is crouching with forearms extended",
      "value": "crouching pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "creature_anatomy",
      "field_path": "pose.orientation",
      "claim": "Mega Zeraora is facing right",
      "value": "facing right",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_018",
      "module": "creature_anatomy",
      "field_path": "effects.electric_energy",
      "claim": "Electric energy effects depicted as blue bolts and yellow streaks around arms and head",
      "value": "electric energy effects",
      "supporting_observation_ids": [
        "obs_creature_effect_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_019",
      "module": "environment",
      "field_path": "background.color_gradient_and_pattern",
      "claim": "Background has purple and pink gradient with electric motif",
      "value": "purple pink electric background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_020",
      "module": "objects_and_props",
      "field_path": "objects.background_logo",
      "claim": "Electric spark logo silhouette visible in background",
      "value": "electric spark logo",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_021",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text is メガゼラオラex in Japanese characters",
      "value": "メガゼラオラex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_022",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP printed as 270 in white text with yellow outline",
      "value": "270 HP",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_023",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol J M5 visible",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_010"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_024",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number 096/081 with rarity SR visible",
      "value": "096/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_009"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_025",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text Illus. 5ban Graphics visible",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_026",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_names_and_costs[0]",
      "claim": "Attack named サンダーフィスト requiring 1 lightning energy",
      "value": "サンダーフィスト, 1 lightning energy",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_027",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage[0]",
      "claim": "Attack damage 60×",
      "value": "60× damage",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_028",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_names_and_costs[1]",
      "claim": "Attack named ゼプトターン requiring 3 lightning energies",
      "value": "ゼプトターン, 3 lightning energy",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_029",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_damage[1]",
      "claim": "Attack damage 150",
      "value": "150 damage",
      "supporting_observation_ids": [
        "obs_card_ui_007"
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
        "claws",
        "ears",
        "fur",
        "head",
        "left arm",
        "left leg",
        "right arm",
        "right leg",
        "tail",
        "torso"
      ],
      "physical_features": [
        "black base color",
        "blue markings",
        "electric energy effects",
        "yellow markings"
      ],
      "pose": [
        "crouching"
      ],
      "orientation": "right",
      "action_state": [
        "none visible"
      ],
      "facial_evidence": {
        "eyes": "yellow and blue",
        "mouth": "closed",
        "eyebrows": "cannot determine",
        "face_position": "front angle",
        "other_visible_evidence": [
          "electric blue markings"
        ]
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
      "obs_creature_anatomy_015",
      "obs_creature_effect_001",
      "obs_pose_001",
      "obs_pose_002",
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
      "electric charged background"
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
      "observation_id": "obs_object_001",
      "label": "electric spark logo silhouette",
      "normalized_label": "electric spark logo silhouette",
      "object_type": "symbol",
      "colors": [
        "pink",
        "yellow"
      ],
      "material_appearance": [
        "flat color"
      ],
      "location": "background midground right side",
      "count_reference": "not_visible",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "bright yellow",
      "electric blue",
      "pink",
      "purple"
    ],
    "lighting": [
      "even lighting with bright highlights"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "highlight edges on blue markings and yellow spikes"
    ],
    "composition": [
      "subject centered with diagonal pose"
    ],
    "camera_angle": "slightly low angle",
    "framing": "tight around subject",
    "cropping": [
      "subject fully visible"
    ],
    "depth": "clear depth with background and midground separation",
    "motion_cues": [
      "electric bolts suggest motion and energy"
    ],
    "motifs": [
      "electricity",
      "lightning bolts"
    ],
    "repeated_shapes": [
      "lightning bolt patterns"
    ],
    "style_cues": [
      "bold outlines",
      "bright saturated colors",
      "sharp edges"
    ],
    "supporting_observation_ids": [
      "obs_creature_effect_001",
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
        "fact_014",
        "fact_015",
        "fact_016",
        "fact_017",
        "fact_018"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "head",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "blue",
            "yellow"
          ],
          "details": [
            "head shape with lightning bolt pattern"
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
          "region": "head",
          "feature": "eyes",
          "visibility": "fully_visible",
          "colors": [
            "blue",
            "yellow"
          ],
          "details": [
            "bright eyes with blue highlights"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_014"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "mouth",
          "visibility": "fully_visible",
          "colors": [],
          "details": [
            "mouth closed"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_015"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms and legs",
          "feature": "claws",
          "visibility": "partially_visible",
          "colors": [
            "black"
          ],
          "details": [
            "sharp claws visible on limbs"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_009"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "entire body",
          "feature": "fur",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "black fur base color"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_010",
            "obs_creature_anatomy_013"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head, torso, limbs",
          "feature": "markings",
          "visibility": "fully_visible",
          "colors": [
            "blue",
            "yellow"
          ],
          "details": [
            "bright blue and yellow lightning shaped markings"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_011",
            "obs_creature_anatomy_012"
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
          "orientation": "right",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_001",
            "obs_pose_002"
          ],
          "confidence": 0.98
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "electric energy effects",
          "details": [
            "blue bolts",
            "yellow streaks around arms and head"
          ],
          "supporting_observation_ids": [
            "obs_creature_effect_001"
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
      "fact_ids": [
        "fact_020"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_019"
      ],
      "observation_ids": [
        "obs_environment_001"
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
        "obs_creature_effect_001",
        "obs_environment_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_018"
      ],
      "observation_ids": [
        "obs_creature_effect_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_021",
        "fact_022",
        "fact_023",
        "fact_024",
        "fact_025",
        "fact_026",
        "fact_027",
        "fact_028",
        "fact_029"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_009"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_010"
      ],
      "rarity_mark_observation_ids": [],
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
        "obs_card_ui_008"
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
        "lightning bolt pattern",
        "purple pink background"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "fact_grounded_search_terms",
          "reason": "limited to visible subject and background only",
          "affected_observation_ids": [
            "obs_environment_001",
            "obs_subject_001"
          ]
        }
      ]
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_003",
      "category": "environment",
      "label": "purple pink electric background",
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
          "electric motif",
          "purple pink gradient"
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
      "term": "electric energy",
      "supporting_observation_ids": [
        "obs_creature_effect_001"
      ]
    },
    {
      "term": "lightning bolt pattern",
      "supporting_observation_ids": [
        "obs_creature_anatomy_011",
        "obs_creature_anatomy_012"
      ]
    },
    {
      "term": "purple pink background",
      "supporting_observation_ids": [
        "obs_environment_001"
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
          "obs_pose_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_003",
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "purple pink electric background",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_creature_anatomy_006",
          "obs_pose_001",
          "obs_pose_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_object_001"
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
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0098344`
- Artwork observations: `10`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | dominant | 0.99 |
| darkrai body | darkrai body | object | foreground | dominant | 0.95 |
| darkrai head center | darkrai head center | object | foreground | dominant | 0.95 |
| darkrai right eye pink | darkrai eye pink | object | foreground | dominant | 0.95 |
| darkrai left eye not visible | darkrai eye not visible | object | foreground | moderate | 0.85 |
| darkrai right arm claws greenish | darkrai right arm claws | object | foreground | dominant | 0.95 |
| darkrai left arm claws greenish | darkrai left arm claws | object | foreground | dominant | 0.95 |
| darkrai shadowy flame effects | darkrai shadowy flame effects | object | foreground | dominant | 0.95 |
| dark rocky/organic background with greenish orbs | rocky background green orbs | environment | background | moderate | 0.9 |
| palette mainly black, gray, purple, green accents | dark palette with purple and green accents | composition | all | dominant | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese 'メガダークライex' | card_ui_text | top | fully_visible | 0.99 |
| HP text '280' with water type symbol | card_ui_text | top right | fully_visible | 0.99 |
| attack name text in Japanese 'ナイトレイド' and attack damage '110+' | card_ui_text | middle right | fully_visible | 0.99 |
| additional attack text and effects in Japanese below attack names | card_ui_text | middle | fully_visible | 0.99 |
| energy cost symbols for attacks (water droplets) | card_ui_symbol | middle right | fully_visible | 0.99 |
| set symbol in bottom left corner with code 'M5' | set_symbol | bottom left | fully_visible | 0.95 |
| collector number '114/081 SAR' | collector_number | bottom left | fully_visible | 0.95 |
| illustrator name 'Illus. AKIRA EGAWA' | illustrator_text | bottom left | fully_visible | 0.95 |
| copyright text at bottom inclusive of '© 2026 Pokémon/Nintendo/Creatures/GAME FREAK' | copyright_text | bottom | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject | obs_subject_001 | 0.99 |
| fact_creature_anatomy_body_001 | creature_anatomy | body presence | obs_creature_anatomy_darkrai_body | 0.95 |
| fact_creature_anatomy_head_001 | creature_anatomy | head presence | obs_creature_anatomy_darkrai_head_center | 0.95 |
| fact_creature_anatomy_eyes_001 | creature_anatomy | right eye color | obs_creature_anatomy_darkrai_eye_right | 0.95 |
| fact_creature_anatomy_eyes_002 | creature_anatomy | left eye visibility | obs_creature_anatomy_darkrai_eye_left | 0.85 |
| fact_creature_anatomy_claws_001 | creature_anatomy | right arm claws color | obs_creature_anatomy_darkrai_claws_right_arm | 0.95 |
| fact_creature_anatomy_claws_002 | creature_anatomy | left arm claws color | obs_creature_anatomy_darkrai_claws_left_arm | 0.95 |
| fact_creature_anatomy_effects_001 | creature_anatomy | shadowy flame effects around body | obs_creature_anatomy_darkrai_shadow_flame_effects | 0.95 |
| fact_environment_001 | environment | rocky organic background with greenish orbs | obs_background_001 | 0.9 |
| fact_composition_001 | composition | color palette main | obs_palette_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_name_text_001 | name text | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_and_print_markers_hp_text_001 | HP value and type | obs_card_ui_hp_001 | 0.99 |
| fact_card_ui_and_print_markers_attack_text_001 | attack name and damage | obs_card_ui_attack_name_001 | 0.99 |
| fact_card_ui_and_print_markers_attack_text_002 | second attack text | obs_card_ui_text_section_001 | 0.99 |
| fact_card_ui_and_print_markers_energy_cost_001 | energy cost symbols | obs_card_ui_energy_cost_001 | 0.99 |
| fact_card_ui_and_print_markers_set_symbol_001 | set symbol code | obs_card_ui_set_symbol_001 | 0.95 |
| fact_card_ui_and_print_markers_collector_number_001 | collector number and rarity code | obs_card_ui_collector_number_001 | 0.95 |
| fact_card_ui_and_print_markers_illustrator_text_001 | illustrator name | obs_card_ui_illustrator_text_001 | 0.95 |
| fact_card_ui_and_print_markers_copyright_text_001 | copyright text | obs_card_ui_bottom_text_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_attack_text_001",
    "fact_card_ui_and_print_markers_attack_text_002",
    "fact_card_ui_and_print_markers_collector_number_001",
    "fact_card_ui_and_print_markers_copyright_text_001",
    "fact_card_ui_and_print_markers_energy_cost_001",
    "fact_card_ui_and_print_markers_hp_text_001",
    "fact_card_ui_and_print_markers_illustrator_text_001",
    "fact_card_ui_and_print_markers_name_text_001",
    "fact_card_ui_and_print_markers_set_symbol_001"
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
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_energy_cost_001"
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
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_002 | action | floating | obs_subject_001 | obs_subject_001 | body raised from ground centered stationary | 0.95 |

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
| shadow flames | obs_creature_anatomy_darkrai_shadow_flame_effects |
| dark rocky background | obs_background_001 |
| purple eye | obs_creature_anatomy_darkrai_eye_right |
| green claws | obs_creature_anatomy_darkrai_claws_left_arm, obs_creature_anatomy_darkrai_claws_right_arm |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered | obs_subject_001 | deterministic_rule | 0.99 |
| flame | obs_creature_anatomy_darkrai_shadow_flame_effects | deterministic_rule | 0.95 |
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_creature_anatomy_darkrai_claws_left_arm | deterministic_rule | 0.95 |
| right orientation | obs_creature_anatomy_darkrai_claws_right_arm | deterministic_rule | 0.95 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.99 |

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
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_darkrai_body",
      "kind": "object",
      "label": "darkrai body",
      "normalized_label": "darkrai body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_darkrai_head_center",
      "kind": "object",
      "label": "darkrai head center",
      "normalized_label": "darkrai head center",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_darkrai_eye_right",
      "kind": "object",
      "label": "darkrai right eye pink",
      "normalized_label": "darkrai eye pink",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_darkrai_eye_left",
      "kind": "object",
      "label": "darkrai left eye not visible",
      "normalized_label": "darkrai eye not visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "partially_visible",
      "salience": "moderate",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_darkrai_claws_right_arm",
      "kind": "object",
      "label": "darkrai right arm claws greenish",
      "normalized_label": "darkrai right arm claws",
      "scene_layer": "foreground",
      "frame_position": "lower right",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_darkrai_claws_left_arm",
      "kind": "object",
      "label": "darkrai left arm claws greenish",
      "normalized_label": "darkrai left arm claws",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_darkrai_shadow_flame_effects",
      "kind": "object",
      "label": "darkrai shadowy flame effects",
      "normalized_label": "darkrai shadowy flame effects",
      "scene_layer": "foreground",
      "frame_position": "around subject",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "dark rocky/organic background with greenish orbs",
      "normalized_label": "rocky background green orbs",
      "scene_layer": "background",
      "frame_position": "full card",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "composition",
      "label": "palette mainly black, gray, purple, green accents",
      "normalized_label": "dark palette with purple and green accents",
      "scene_layer": "all",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese 'メガダークライex'",
      "normalized_label": "card name text mega darkrai ex",
      "scene_layer": "ui",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP text '280' with water type symbol",
      "normalized_label": "hp 280 water type symbol",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "fully_visible",
      "salience": "dominant",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_name_001",
      "kind": "card_ui_text",
      "label": "attack name text in Japanese 'ナイトレイド' and attack damage '110+'",
      "normalized_label": "attack name night raid 110+ damage",
      "scene_layer": "ui",
      "frame_position": "middle right",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_section_001",
      "kind": "card_ui_text",
      "label": "additional attack text and effects in Japanese below attack names",
      "normalized_label": "attack text in Japanese for two attacks",
      "scene_layer": "ui",
      "frame_position": "middle",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_cost_001",
      "kind": "card_ui_symbol",
      "label": "energy cost symbols for attacks (water droplets)",
      "normalized_label": "water type energy cost symbols",
      "scene_layer": "ui",
      "frame_position": "middle right",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol in bottom left corner with code 'M5'",
      "normalized_label": "set symbol M5",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "collector number '114/081 SAR'",
      "normalized_label": "collector number 114 of 81 SAR",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator name 'Illus. AKIRA EGAWA'",
      "normalized_label": "illustrator akira egawa",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "fully_visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "copyright_text",
      "label": "copyright text at bottom inclusive of '© 2026 Pokémon/Nintendo/Creatures/GAME FREAK'",
      "normalized_label": "copyright text 2026 pokemon nintendo creatures game freak",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "moderate",
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
      "claim": "body presence",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_body"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_head_001",
      "module": "creature_anatomy",
      "field_path": "head",
      "claim": "head presence",
      "value": "visible center",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_head_center"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_eyes_001",
      "module": "creature_anatomy",
      "field_path": "eyes",
      "claim": "right eye color",
      "value": "pink/purple",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_eye_right"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_eyes_002",
      "module": "creature_anatomy",
      "field_path": "eyes",
      "claim": "left eye visibility",
      "value": "partially visible or obscured",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_eye_left"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_creature_anatomy_claws_001",
      "module": "creature_anatomy",
      "field_path": "limbs.claws.right_arm",
      "claim": "right arm claws color",
      "value": "greenish",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_claws_right_arm"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_claws_002",
      "module": "creature_anatomy",
      "field_path": "limbs.claws.left_arm",
      "claim": "left arm claws color",
      "value": "greenish",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_claws_left_arm"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_effects_001",
      "module": "creature_anatomy",
      "field_path": "effects",
      "claim": "shadowy flame effects around body",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_shadow_flame_effects"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "rocky organic background with greenish orbs",
      "value": "present",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "palette",
      "claim": "color palette main",
      "value": "black, gray, purple, green accents",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "name text",
      "value": "メガダークライex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_hp_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value and type",
      "value": "280 water",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_attack_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack name and damage",
      "value": "ナイトレイド 110+",
      "supporting_observation_ids": [
        "obs_card_ui_attack_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_attack_text_002",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "second attack text",
      "value": "アビスアイ",
      "supporting_observation_ids": [
        "obs_card_ui_text_section_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_energy_cost_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbols",
      "claim": "energy cost symbols",
      "value": "water droplets",
      "supporting_observation_ids": [
        "obs_card_ui_energy_cost_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol code",
      "value": "M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number and rarity code",
      "value": "114/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name",
      "value": "AKIRA EGAWA",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_copyright_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text",
      "value": "© 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
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
        "head",
        "left arm claws",
        "right arm claws",
        "shadowy flame effects"
      ],
      "physical_features": [
        "greenish claws",
        "pink right eye"
      ],
      "pose": [
        "centered",
        "floating"
      ],
      "orientation": "upright",
      "action_state": [
        "static"
      ],
      "facial_evidence": {
        "eyes": "one visible right eye pink",
        "mouth": "not clearly visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gray",
        "green accents",
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
      "obs_creature_anatomy_darkrai_body",
      "obs_creature_anatomy_darkrai_claws_left_arm",
      "obs_creature_anatomy_darkrai_claws_right_arm",
      "obs_creature_anatomy_darkrai_eye_right",
      "obs_creature_anatomy_darkrai_head_center",
      "obs_creature_anatomy_darkrai_shadow_flame_effects",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "dark rocky organic environment"
    ],
    "indoor_outdoor": "uncertain",
    "sky": [],
    "ground": [],
    "terrain": [
      "rocky"
    ],
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
      "gray",
      "green",
      "purple"
    ],
    "lighting": [
      "dark with violet highlights"
    ],
    "shadows": [
      "strong shadows on body form"
    ],
    "highlights": [
      "bright purple glow in eye"
    ],
    "composition": [
      "subject centered",
      "subject floating"
    ],
    "camera_angle": "frontal",
    "framing": "full card with margins",
    "cropping": [
      "subject fully visible"
    ],
    "depth": "medium depth",
    "motion_cues": [],
    "motifs": [
      "shadow flame pattern"
    ],
    "repeated_shapes": [],
    "style_cues": [
      "detailed shadow and texture"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_darkrai_shadow_flame_effects",
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
        "fact_creature_anatomy_body_001",
        "fact_creature_anatomy_claws_001",
        "fact_creature_anatomy_claws_002",
        "fact_creature_anatomy_effects_001",
        "fact_creature_anatomy_eyes_001",
        "fact_creature_anatomy_eyes_002",
        "fact_creature_anatomy_head_001"
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
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_composition_001"
      ],
      "observation_ids": [
        "obs_palette_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_composition_001"
      ],
      "observation_ids": [
        "obs_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_creature_anatomy_effects_001"
      ],
      "observation_ids": [
        "obs_creature_anatomy_darkrai_shadow_flame_effects"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_attack_text_001",
        "fact_card_ui_and_print_markers_attack_text_002",
        "fact_card_ui_and_print_markers_collector_number_001",
        "fact_card_ui_and_print_markers_copyright_text_001",
        "fact_card_ui_and_print_markers_energy_cost_001",
        "fact_card_ui_and_print_markers_hp_text_001",
        "fact_card_ui_and_print_markers_illustrator_text_001",
        "fact_card_ui_and_print_markers_name_text_001",
        "fact_card_ui_and_print_markers_set_symbol_001"
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
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_energy_cost_001"
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
        "floating",
        "shadow flames",
        "dark rocky background",
        "purple eye",
        "green claws"
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
          "body raised from ground"
        ],
        "body_position": [
          "centered"
        ],
        "motion_state": [
          "stationary"
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
      "term": "floating",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "shadow flames",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_shadow_flame_effects"
      ]
    },
    {
      "term": "dark rocky background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "purple eye",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_eye_right"
      ]
    },
    {
      "term": "green claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_darkrai_claws_left_arm",
        "obs_creature_anatomy_darkrai_claws_right_arm"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_creature_anatomy_darkrai_shadow_flame_effects"
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
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_darkrai_claws_left_arm"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_darkrai_claws_right_arm"
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
- Cost USD: `0.0103724`
- Artwork observations: `14`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: green yellow background, dark shadows, color palette black gray green yellow pink. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary | 0.98 |
| Mega Darkrai body | mega darkrai body | object | foreground | primary | 0.98 |
| Mega Darkrai head with eyes and mouth | mega darkrai head | object | foreground | primary | 0.98 |
| black color on creature body | black | attribute | foreground | primary | 0.98 |
| gray color on creature head | gray | attribute | foreground | primary | 0.95 |
| pink eyes | pink | attribute | foreground | primary | 0.95 |
| Mega Darkrai tail | mega darkrai tail | object | foreground | primary | 0.95 |
| Mega Darkrai claws on limbs | mega darkrai claws | object | foreground | primary | 0.95 |
| Mega Darkrai horns or spikes on head | mega darkrai horns | object | foreground | primary | 0.95 |
| Mega Darkrai posed diagonally and upright | diagonal upright pose | pose | foreground | primary | 0.95 |
| Mega Darkrai appears floating | floating | action | foreground | primary | 0.95 |
| green and yellow abstract background | green yellow background | environment | background | medium | 0.9 |
| dark shadows around the creature | dark shadows | environment | midground | medium | 0.9 |
| color palette includes black, gray, green, yellow, pink | color palette black gray green yellow pink | attribute | all | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| name text in Japanese: メガダークライEX | card_name_text | top left | visible | 0.99 |
| HP 280 text | hp_text | top right | visible | 0.99 |
| Dark-type energy symbol | card_ui_symbol | top right | visible | 0.99 |
| 099/081 SR | collector_number | bottom left | visible | 0.98 |
| Set code J M5 symbol | set_symbol | bottom left | visible | 0.98 |
| Illustrator 5ban Graphics | illustrator_text | bottom left | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | The main scene subject is Mega Darkrai | obs_subject_001 | 0.98 |
| fact_002 | creature_anatomy | Mega Darkrai has a primarily black body color | obs_color_black_001 | 0.98 |
| fact_003 | creature_anatomy | Mega Darkrai head is gray with pink eyes | obs_color_gray_001, obs_color_pink_001 | 0.95 |
| fact_004 | creature_anatomy | Mega Darkrai has tail, claws, and horns visible | obs_creature_anatomy_claws_001, obs_creature_anatomy_horns_001, obs_creature_anatomy_tail_001 | 0.95 |
| fact_005 | creature_anatomy | Mega Darkrai is posed upright and diagonal | obs_creature_pose_001 | 0.95 |
| fact_006 | creature_anatomy | Mega Darkrai appears to be floating | obs_creature_action_001 | 0.95 |
| fact_007 | environment | Background is an abstract green and yellow pattern | obs_environment_001 | 0.9 |
| fact_008 | environment | Dark shadows visible around the creature | obs_environment_002 | 0.9 |
| fact_009 | color_and_light | Color palette includes black, gray, green, yellow, pink | obs_visual_design_palette_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_010 | Card name text is 'メガダークライEX' in Japanese | obs_card_ui_text_name_001 | 0.99 |
| fact_011 | HP value is 280 | obs_card_ui_text_hp_001 | 0.99 |
| fact_012 | Dark-type energy symbol is visible | obs_card_ui_text_energy_001 | 0.99 |
| fact_013 | Collector number text is '099/081 SR' | obs_card_ui_text_number_001 | 0.98 |
| fact_014 | Set symbol for set code J M5 is visible | obs_card_ui_text_set_001 | 0.98 |
| fact_015 | Illustrator text reads '5ban Graphics' | obs_card_ui_text_illustrator_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_010",
    "fact_011",
    "fact_012",
    "fact_013",
    "fact_014",
    "fact_015"
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
    "obs_card_ui_text_set_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_text_energy_001"
  ],
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
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | medium |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_002 | action | floating | obs_subject_001 | obs_creature_action_001 | floating upright floating | 0.95 |

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
| floating pose | obs_creature_action_001 |
| pink eyes | obs_color_pink_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal | obs_creature_action_001, obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.98 |
| diagonal composition | obs_creature_pose_001 | deterministic_rule | 0.95 |
| floating | obs_creature_action_001 | deterministic_rule | 0.95 |
| upright | obs_creature_action_001, obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.98 |
| upright orientation | obs_creature_action_001, obs_creature_pose_001, obs_subject_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: green yellow background, dark shadows, color palette black gray green yellow pink. Semantic facts: floating.
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
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_body_001",
      "kind": "object",
      "label": "Mega Darkrai body",
      "normalized_label": "mega darkrai body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_head_001",
      "kind": "object",
      "label": "Mega Darkrai head with eyes and mouth",
      "normalized_label": "mega darkrai head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_black_001",
      "kind": "attribute",
      "label": "black color on creature body",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_gray_001",
      "kind": "attribute",
      "label": "gray color on creature head",
      "normalized_label": "gray",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_pink_001",
      "kind": "attribute",
      "label": "pink eyes",
      "normalized_label": "pink",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_tail_001",
      "kind": "object",
      "label": "Mega Darkrai tail",
      "normalized_label": "mega darkrai tail",
      "scene_layer": "foreground",
      "frame_position": "rear",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_claws_001",
      "kind": "object",
      "label": "Mega Darkrai claws on limbs",
      "normalized_label": "mega darkrai claws",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_horns_001",
      "kind": "object",
      "label": "Mega Darkrai horns or spikes on head",
      "normalized_label": "mega darkrai horns",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_pose_001",
      "kind": "pose",
      "label": "Mega Darkrai posed diagonally and upright",
      "normalized_label": "diagonal upright pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_action_001",
      "kind": "action",
      "label": "Mega Darkrai appears floating",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "green and yellow abstract background",
      "normalized_label": "green yellow background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "dark shadows around the creature",
      "normalized_label": "dark shadows",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_visual_design_palette_001",
      "kind": "attribute",
      "label": "color palette includes black, gray, green, yellow, pink",
      "normalized_label": "color palette black gray green yellow pink",
      "scene_layer": "all",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_text_name_001",
      "kind": "card_name_text",
      "label": "name text in Japanese: メガダークライEX",
      "normalized_label": "name text mega darkrai ex",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_hp_001",
      "kind": "hp_text",
      "label": "HP 280 text",
      "normalized_label": "hp 280",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_energy_001",
      "kind": "card_ui_symbol",
      "label": "Dark-type energy symbol",
      "normalized_label": "dark energy symbol",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_number_001",
      "kind": "collector_number",
      "label": "099/081 SR",
      "normalized_label": "099/081 sr",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_set_001",
      "kind": "set_symbol",
      "label": "Set code J M5 symbol",
      "normalized_label": "set symbol j m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator 5ban Graphics",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "card_ui",
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
      "field_path": "identity",
      "claim": "The main scene subject is Mega Darkrai",
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
      "field_path": "body_color",
      "claim": "Mega Darkrai has a primarily black body color",
      "value": "black",
      "supporting_observation_ids": [
        "obs_color_black_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "head_color",
      "claim": "Mega Darkrai head is gray with pink eyes",
      "value": "gray, pink eyes",
      "supporting_observation_ids": [
        "obs_color_gray_001",
        "obs_color_pink_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "anatomy_parts",
      "claim": "Mega Darkrai has tail, claws, and horns visible",
      "value": "tail, claws, horns",
      "supporting_observation_ids": [
        "obs_creature_anatomy_claws_001",
        "obs_creature_anatomy_horns_001",
        "obs_creature_anatomy_tail_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "Mega Darkrai is posed upright and diagonal",
      "value": "upright diagonal",
      "supporting_observation_ids": [
        "obs_creature_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "action_state",
      "claim": "Mega Darkrai appears to be floating",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_creature_action_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_007",
      "module": "environment",
      "field_path": "background_colors",
      "claim": "Background is an abstract green and yellow pattern",
      "value": "green, yellow",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "background_shadows",
      "claim": "Dark shadows visible around the creature",
      "value": "dark shadows",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_009",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "Color palette includes black, gray, green, yellow, pink",
      "value": "black, gray, green, yellow, pink",
      "supporting_observation_ids": [
        "obs_visual_design_palette_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text is 'メガダークライEX' in Japanese",
      "value": "メガダークライEX",
      "supporting_observation_ids": [
        "obs_card_ui_text_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value is 280",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_text_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Dark-type energy symbol is visible",
      "value": "Dark energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_text_energy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number text is '099/081 SR'",
      "value": "099/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_text_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol for set code J M5 is visible",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_text_set_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text reads '5ban Graphics'",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_text_illustrator_001"
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
      "identity_confidence": 0.98,
      "anatomy": [
        "claws",
        "horns",
        "tail"
      ],
      "physical_features": [
        "gray head",
        "pink eyes"
      ],
      "pose": [
        "diagonal",
        "upright"
      ],
      "orientation": "upright",
      "action_state": [
        "floating"
      ],
      "facial_evidence": {
        "eyes": "open and pink",
        "mouth": "not clearly visible",
        "eyebrows": "not clearly visible",
        "face_position": "front right 3/4 angle",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gray",
        "pink"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_creature_anatomy_claws_001",
      "obs_creature_anatomy_horns_001",
      "obs_creature_anatomy_tail_001",
      "obs_creature_body_001",
      "obs_creature_head_001",
      "obs_subject_001"
    ],
    "midground": [
      "obs_environment_002"
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
      "obs visual design palette 001"
    ],
    "lighting": [],
    "shadows": [
      "obs environment 002"
    ],
    "highlights": [],
    "composition": [],
    "camera_angle": "eye-level",
    "framing": "centered",
    "cropping": [],
    "depth": "medium",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_environment_002",
      "obs_visual_design_palette_001"
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
          "feature": "color",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_color_black_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "color",
          "visibility": "visible",
          "colors": [
            "gray"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_color_gray_001"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eyes",
          "feature": "color",
          "visibility": "visible",
          "colors": [
            "pink"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_color_pink_001"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal",
            "upright"
          ],
          "orientation": "upright",
          "action_state": [
            "floating"
          ],
          "supporting_observation_ids": [
            "obs_creature_action_001",
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
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_007",
        "fact_008"
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
        "fact_009"
      ],
      "observation_ids": [
        "obs_visual_design_palette_001"
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
        "fact_015"
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
        "obs_card_ui_text_set_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_text_energy_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_illustrator_001"
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
        "pink eyes"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_002",
      "category": "action",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_creature_action_001"
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
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_creature_action_001"
      ]
    },
    {
      "term": "pink eyes",
      "supporting_observation_ids": [
        "obs_color_pink_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal",
        "source_observation_ids": [
          "obs_creature_action_001",
          "obs_creature_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_creature_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_action_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "upright",
        "source_observation_ids": [
          "obs_creature_action_001",
          "obs_creature_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_creature_action_001",
          "obs_creature_pose_001",
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
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.99`
- Cost USD: `0.0124016`
- Artwork observations: `13`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Semantic facts: floating, glowing smoky background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Chandelure | mega chandelure | scene_subject | foreground | primary_subject | 1 |
| central glass body | central glass body | body_region | foreground | primary_subject_body_feature | 1 |
| crown top flame | crown top flame | body_region | foreground | distinctive_feature | 1 |
| multiple candle arms with flames | multiple candle arms with flames | body_region | foreground | distinctive_feature | 1 |
| lantern handle swirl | lantern handle swirl | body_region | foreground | secondary_body_feature | 1 |
| purple flames on crown and arms | purple flames on crown and arms | physical_feature | foreground | distinctive_feature_color | 1 |
| glowing yellow and black body parts | glowing yellow and black body parts | physical_feature | foreground | color_feature | 1 |
| purple, yellow, black, blue, pink colors | palette purple yellow black blue pink | palette | foreground | color_palette | 1 |
| blue and pink glowing smoky background | blue pink glowing smoky background | environment | background | environment_background | 1 |
| floating posture | floating | pose_orientation | foreground | pose | 1 |
| front facing with upward crown | front facing upward crown | pose_orientation | foreground | head_orientation | 1 |
| no visible mouth | no visible mouth | mouth | foreground | mouth_visibility | 1 |
| no visible eyes | no visible eyes | eyes | foreground | eye_visibility | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese with Mega Chandelure ex | card_ui_text | top_center | fully_visible | 1 |
| HP 350 | hp_text | top_right | fully_visible | 1 |
| Psychic energy symbol at top right | card_ui_symbol | top_right | fully_visible | 1 |
| Lantern evolution symbol top left | card_ui_symbol | top_left | fully_visible | 1 |
| set symbol J M5 bottom left | set_symbol | bottom_left | fully_visible | 1 |
| illustrator text 5ban Graphics bottom left | illustrator_text | bottom_left | fully_visible | 1 |
| Japanese attack and ability text center lower | card_ui_text | center_lower | fully_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 1 |
| fact_anatomy_001 | creature_anatomy | central glass body presence | obs_body_region_001 | 1 |
| fact_anatomy_002 | creature_anatomy | crown top flame presence | obs_body_region_002 | 1 |
| fact_anatomy_003 | creature_anatomy | multiple candle arms with flames | obs_body_region_003 | 1 |
| fact_anatomy_004 | creature_anatomy | lantern handle swirl presence | obs_body_region_004 | 1 |
| fact_anatomy_005 | creature_anatomy | purple flames on crown and arms | obs_creature_feature_001 | 1 |
| fact_anatomy_006 | creature_anatomy | glowing yellow and black color parts | obs_creature_feature_002 | 1 |
| fact_grounded_search_terms_001 | fact_grounded_search_terms | search term | obs_subject_001 | 1 |
| fact_grounded_search_terms_002 | fact_grounded_search_terms | search term | obs_creature_feature_001 | 1 |
| fact_grounded_search_terms_003 | fact_grounded_search_terms | search term | obs_pose_001 | 1 |
| fact_grounded_search_terms_004 | fact_grounded_search_terms | search term | obs_creature_feature_002 | 1 |
| fact_creature_anatomy_001 | creature_anatomy | pose | obs_pose_001 | 1 |
| fact_creature_anatomy_002 | creature_anatomy | orientation | obs_head_orientation_001 | 1 |
| fact_creature_anatomy_003 | creature_anatomy | eye visibility | obs_eyes_001 | 1 |
| fact_creature_anatomy_004 | creature_anatomy | mouth visibility | obs_mouth_001 | 1 |
| fact_environment_001 | environment | background colors | obs_background_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_name_001 | card name text visible | obs_card_ui_name_001 | 1 |
| fact_card_ui_and_print_markers_hp_001 | hp text visible | obs_card_ui_hp_001 | 1 |
| fact_card_ui_and_print_markers_energy_001 | psychic energy symbol visible | obs_card_ui_energy_001 | 1 |
| fact_card_ui_and_print_markers_type_icon_001 | lantern evolution symbol visible | obs_card_ui_type_icon_001 | 1 |
| fact_card_ui_and_print_markers_set_symbol_001 | set symbol visible | obs_card_ui_set_symbol_001 | 1 |
| fact_card_ui_and_print_markers_illustrator_001 | illustrator text visible | obs_card_ui_illustrator_001 | 1 |
| fact_card_ui_and_print_markers_attack_text_001 | attack and ability text visible | obs_card_ui_text_detail_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_attack_text_001",
    "fact_card_ui_and_print_markers_energy_001",
    "fact_card_ui_and_print_markers_hp_001",
    "fact_card_ui_and_print_markers_illustrator_001",
    "fact_card_ui_and_print_markers_name_001",
    "fact_card_ui_and_print_markers_set_symbol_001",
    "fact_card_ui_and_print_markers_type_icon_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001",
    "obs_card_ui_type_icon_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_detail_001"
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
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_vf_003 | state | floating | obs_subject_001 | obs_pose_001 | floating floating | 1 |
| sem_vf_004 | environment | glowing smoky background |  | obs_background_001 | blue and pink glowing smoky background | 1 |

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
| purple flames | obs_creature_feature_001 |
| floating pose | obs_pose_001 |
| glowing yellow and black body | obs_creature_feature_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_body_region_001 | deterministic_rule | 1 |
| flame | obs_body_region_002, obs_body_region_003, obs_creature_feature_001 | deterministic_rule | 1 |
| floating | obs_head_orientation_001, obs_pose_001, obs_subject_001 | deterministic_rule | 1 |
| forward orientation | obs_head_orientation_001, obs_pose_001, obs_subject_001 | deterministic_rule | 1 |
| glowing highlights | obs_background_001, obs_creature_feature_002 | deterministic_rule | 1 |
| glowing smoky background | obs_background_001 | deterministic_rule | 1 |
| smoke | obs_background_001 | deterministic_rule | 1 |
| spiral motif | obs_body_region_004 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Chandelure. Semantic facts: floating, glowing smoky background.
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
      "salience": "primary_subject",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "body_region",
      "label": "central glass body",
      "normalized_label": "central glass body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_body_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "body_region",
      "label": "crown top flame",
      "normalized_label": "crown top flame",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "distinctive_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "body_region",
      "label": "multiple candle arms with flames",
      "normalized_label": "multiple candle arms with flames",
      "scene_layer": "foreground",
      "frame_position": "spread",
      "visibility": "fully_visible",
      "salience": "distinctive_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_004",
      "kind": "body_region",
      "label": "lantern handle swirl",
      "normalized_label": "lantern handle swirl",
      "scene_layer": "foreground",
      "frame_position": "right_mid",
      "visibility": "fully_visible",
      "salience": "secondary_body_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_feature_001",
      "kind": "physical_feature",
      "label": "purple flames on crown and arms",
      "normalized_label": "purple flames on crown and arms",
      "scene_layer": "foreground",
      "frame_position": "middle",
      "visibility": "fully_visible",
      "salience": "distinctive_feature_color",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_feature_002",
      "kind": "physical_feature",
      "label": "glowing yellow and black body parts",
      "normalized_label": "glowing yellow and black body parts",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "color_feature",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "palette",
      "label": "purple, yellow, black, blue, pink colors",
      "normalized_label": "palette purple yellow black blue pink",
      "scene_layer": "foreground",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "color_palette",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "blue and pink glowing smoky background",
      "normalized_label": "blue pink glowing smoky background",
      "scene_layer": "background",
      "frame_position": "behind_subject",
      "visibility": "fully_visible",
      "salience": "environment_background",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose_orientation",
      "label": "floating posture",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "pose",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_head_orientation_001",
      "kind": "pose_orientation",
      "label": "front facing with upward crown",
      "normalized_label": "front facing upward crown",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "head_orientation",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "mouth",
      "label": "no visible mouth",
      "normalized_label": "no visible mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "mouth_visibility",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "eyes",
      "label": "no visible eyes",
      "normalized_label": "no visible eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "eye_visibility",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese with Mega Chandelure ex",
      "normalized_label": "name_text_mega_chandelure_ex_japanese",
      "scene_layer": "card_ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "name_text",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "hp_text",
      "label": "HP 350",
      "normalized_label": "hp_350",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "hp_text",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_001",
      "kind": "card_ui_symbol",
      "label": "Psychic energy symbol at top right",
      "normalized_label": "psychic_energy_symbol_top_right",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "energy_symbol",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_icon_001",
      "kind": "card_ui_symbol",
      "label": "Lantern evolution symbol top left",
      "normalized_label": "lantern_evolution_symbol_top_left",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "type_icon",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol J M5 bottom left",
      "normalized_label": "set_symbol_j_m5_bottom_left",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "set_symbol",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text 5ban Graphics bottom left",
      "normalized_label": "illustrator_5ban_graphics_bottom_left",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "illustrator_text",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_detail_001",
      "kind": "card_ui_text",
      "label": "Japanese attack and ability text center lower",
      "normalized_label": "attack_and_ability_text_japanese_center_lower",
      "scene_layer": "card_ui",
      "frame_position": "center_lower",
      "visibility": "fully_visible",
      "salience": "attack_and_ability_text",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "subject identity",
      "value": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.central_glass_body",
      "claim": "central glass body presence",
      "value": "present",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.crown_top_flame_presence",
      "claim": "crown top flame presence",
      "value": "present",
      "supporting_observation_ids": [
        "obs_body_region_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "body_regions.multiple_candle_arms",
      "claim": "multiple candle arms with flames",
      "value": "present",
      "supporting_observation_ids": [
        "obs_body_region_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.lantern_handle_swirl",
      "claim": "lantern handle swirl presence",
      "value": "present",
      "supporting_observation_ids": [
        "obs_body_region_004"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "physical_features.flame_color",
      "claim": "purple flames on crown and arms",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_feature_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "physical_features.body_colors",
      "claim": "glowing yellow and black color parts",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_feature_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_terms_001",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[0]",
      "claim": "search term",
      "value": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_terms_002",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[1]",
      "claim": "search term",
      "value": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_feature_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_terms_003",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[2]",
      "claim": "search term",
      "value": "floating pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_grounded_search_terms_004",
      "module": "fact_grounded_search_terms",
      "field_path": "terms[3]",
      "claim": "search term",
      "value": "glowing yellow and black body",
      "supporting_observation_ids": [
        "obs_creature_feature_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.pose",
      "claim": "pose",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.orientation",
      "claim": "orientation",
      "value": "front facing with upward crown",
      "supporting_observation_ids": [
        "obs_head_orientation_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "facial_features.eyes",
      "claim": "eye visibility",
      "value": "no visible eyes",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "facial_features.mouth",
      "claim": "mouth visibility",
      "value": "no visible mouth",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background colors",
      "value": "blue and pink glowing smoky background",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "Japanese text Mega Chandelure ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "hp text visible",
      "value": "HP 350",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_energy_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "psychic energy symbol visible",
      "value": "psychic symbol top right",
      "supporting_observation_ids": [
        "obs_card_ui_energy_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_type_icon_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "lantern evolution symbol visible",
      "value": "lantern evolution symbol top left",
      "supporting_observation_ids": [
        "obs_card_ui_type_icon_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "J M5 symbol bottom left",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "5ban Graphics bottom left",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_attack_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_and_ability_text",
      "claim": "attack and ability text visible",
      "value": "Japanese text on center lower",
      "supporting_observation_ids": [
        "obs_card_ui_text_detail_001"
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
        "central glass body",
        "crown top flame",
        "lantern handle swirl",
        "multiple candle arms with flames"
      ],
      "physical_features": [
        "glowing yellow and black body parts",
        "purple flames on crown and arms"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "no visible eyes",
        "mouth": "no visible mouth",
        "eyebrows": "not visible",
        "face_position": "front facing",
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
      "obs_body_region_001",
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_body_region_004",
      "obs_creature_feature_001",
      "obs_creature_feature_002",
      "obs_eyes_001",
      "obs_head_orientation_001",
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "obs palette 001"
    ],
    "lighting": [
      "strong glowing purple and blue"
    ],
    "shadows": [
      "none obvious"
    ],
    "highlights": [
      "yellow glowing highlights on body"
    ],
    "composition": [
      "central subject",
      "subject fills card center"
    ],
    "camera_angle": "frontal",
    "framing": "tight",
    "cropping": [],
    "depth": "shallow",
    "motion_cues": [
      "floating"
    ],
    "motifs": [
      "circular swirls and flames"
    ],
    "repeated_shapes": [
      "candle arms",
      "flame tips"
    ],
    "style_cues": [
      "bright vibrant colors",
      "digital illustration style"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_creature_feature_001",
      "obs_creature_feature_002",
      "obs_palette_001",
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
        "fact_anatomy_002",
        "fact_anatomy_003",
        "fact_anatomy_004",
        "fact_anatomy_005",
        "fact_anatomy_006",
        "fact_creature_anatomy_001",
        "fact_creature_anatomy_002",
        "fact_creature_anatomy_003",
        "fact_creature_anatomy_004"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "central glass body",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "crown top flame",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_002"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "multiple candle arms",
          "feature": "flames",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_003",
            "obs_creature_feature_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "lantern handle swirl",
          "feature": "",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_004"
          ],
          "confidence": 1
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "crown and arms",
          "feature": "purple flames",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_feature_001"
          ],
          "confidence": 1
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "glowing yellow and black parts",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "yellow"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_creature_feature_002"
          ],
          "confidence": 1
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "forward",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_head_orientation_001",
            "obs_pose_001"
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
        "obs_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_attack_text_001",
        "fact_card_ui_and_print_markers_energy_001",
        "fact_card_ui_and_print_markers_hp_001",
        "fact_card_ui_and_print_markers_illustrator_001",
        "fact_card_ui_and_print_markers_name_001",
        "fact_card_ui_and_print_markers_set_symbol_001",
        "fact_card_ui_and_print_markers_type_icon_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001",
        "obs_card_ui_type_icon_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_detail_001"
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
      "fact_ids": [
        "fact_grounded_search_terms_001",
        "fact_grounded_search_terms_002",
        "fact_grounded_search_terms_003",
        "fact_grounded_search_terms_004"
      ],
      "terms": [
        "purple flames",
        "floating pose",
        "glowing yellow and black body"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_vf_003",
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
          "floating"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 1,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_vf_004",
      "category": "environment",
      "label": "glowing smoky background",
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
          "blue and pink glowing smoky background"
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
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_creature_feature_001"
      ]
    },
    {
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "glowing yellow and black body",
      "supporting_observation_ids": [
        "obs_creature_feature_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_body_region_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "flame",
        "source_observation_ids": [
          "obs_body_region_002",
          "obs_body_region_003",
          "obs_creature_feature_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_head_orientation_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_head_orientation_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_background_001",
          "obs_creature_feature_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "glowing smoky background",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "smoke",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_body_region_004"
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
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0132752`
- Artwork observations: `16`
- Card UI / print-marker observations: `18`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: メガドリュウズex.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| メガドリュウズex Pokémon | メガドリュウズex Pokémon | scene_subject | foreground | primary | 1 |
| メガドリュウズex head | head | creature_anatomy | foreground | primary | 1 |
| cone-shaped snout | cone-shaped snout | creature_anatomy | foreground | primary | 1 |
| large drill claw right arm | drill claw right arm | creature_anatomy | foreground | primary | 1 |
| large drill claw left arm | drill claw left arm | creature_anatomy | foreground | primary | 1 |
| purple/dark gray body | body color purple dark gray | creature_anatomy | foreground | primary | 1 |
| red triangular marking on chest | red triangular chest marking | creature_anatomy | foreground | primary | 1 |
| narrow eyes with half-lidded or serious expression | narrow eyes half-lidded | creature_anatomy | foreground | primary | 1 |
| red markings on face | red facial markings | creature_anatomy | foreground | primary | 1 |
| spike horn on head | head spike horn | creature_anatomy | foreground | primary | 1 |
| diagonal body orientation to right | diagonal body orientation right | creature_anatomy | foreground | primary | 1 |
| arms raised forward | arms raised forward | creature_anatomy | foreground | primary | 1 |
| background with multicolor bright streaks including red and yellow | multicolor bright streaks background | environment | background | secondary | 1 |
| holographic sparkle/glitter effect visible over full card illustration | holographic sparkle glitter effect | environment | foreground | tertiary | 1 |
| no visible clothing | no clothing | clothing | foreground | primary | 1 |
| no visible objects or props held or visible | no objects or props | objects_and_props | foreground | primary | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text メガドリュウズex in yellow and black | card_ui_text | top_center | fully_visible | 1 |
| HP 340 in black text | hp_text | top_right | fully_visible | 1 |
| metal type energy symbol next to HP | card_ui_symbol | top_right | fully_visible | 1 |
| stage 1 evolution label top left | card_ui_symbol | top_left | fully_visible | 1 |
| mole Pokémon pre-evolution icon top left corner | card_ui_text | top_left | fully_visible | 1 |
| attack energy cost symbols: two metal energies for first attack | card_ui_text | mid_left | fully_visible | 1 |
| attack name text ほりくずす | card_ui_text | mid_left | fully_visible | 1 |
| attack damage text 90 | card_ui_text | mid_left | fully_visible | 1 |
| attack energy cost symbols: three metal energies for second attack | card_ui_text | mid_left | fully_visible | 1 |
| attack name text マキシマムドリル | card_ui_text | mid_left | fully_visible | 1 |
| attack damage text 200+ | card_ui_text | mid_left | fully_visible | 1 |
| weakness symbol and ×2 fire at bottom left | card_ui_text | bottom_left | fully_visible | 1 |
| resistance symbol and -30 grass at bottom center | card_ui_text | bottom_center | fully_visible | 1 |
| retreat cost four colorless energy symbols at bottom right | card_ui_text | bottom_right | fully_visible | 1 |
| illustrator text Illus. Keisuke Azuma bottom left | illustrator_text | bottom_left | fully_visible | 1 |
| set symbol J m5 bottom left | card_ui_text | bottom_left | fully_visible | 1 |
| card number 063/081 bottom center | card_ui_text | bottom_center | fully_visible | 1 |
| copyright 2026 Pokémon/Nintendo/Creatures/GAME FREAK bottom center | copyright_text | bottom_center | fully_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subj_001 | subjects | subject identity | obs_subject_001 | 1 |
| fact_creature_anatomy_001 | creature_anatomy | head shape | obs_creature_anatomy_001, obs_creature_anatomy_002, obs_creature_anatomy_009 | 1 |
| fact_creature_anatomy_002 | creature_anatomy | body color | obs_creature_anatomy_005 | 1 |
| fact_creature_anatomy_003 | creature_anatomy | red triangular chest marking | obs_creature_anatomy_006 | 1 |
| fact_creature_anatomy_004 | creature_anatomy | facial markings | obs_creature_anatomy_008 | 1 |
| fact_creature_anatomy_005 | creature_anatomy | eye expression | obs_creature_anatomy_007 | 1 |
| fact_creature_anatomy_006 | creature_anatomy | body orientation | obs_pose_001 | 1 |
| fact_creature_anatomy_007 | creature_anatomy | arms raised forward position | obs_pose_002 | 1 |
| fact_creature_anatomy_008 | creature_anatomy | right arm | obs_creature_anatomy_003 | 1 |
| fact_creature_anatomy_009 | creature_anatomy | left arm | obs_creature_anatomy_004 | 1 |
| fact_clothing_001 | clothing | clothing presence | obs_clothing_001 | 1 |
| fact_environment_001 | environment | background visual pattern | obs_environment_001 | 1 |
| fact_environment_002 | environment | special effect | obs_environment_002 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_001 | card name text visible | obs_card_ui_001 | 1 |
| fact_card_ui_and_print_markers_002 | HP value visible | obs_card_ui_002 | 1 |
| fact_card_ui_and_print_markers_003 | set symbol visible | obs_card_ui_016 | 1 |
| fact_card_ui_and_print_markers_004 | collector number visible | obs_card_ui_017 | 1 |
| fact_card_ui_and_print_markers_005 | illustrator name visible | obs_card_ui_015 | 1 |
| fact_card_ui_and_print_markers_006 | weakness symbol and value | obs_card_ui_012 | 1 |
| fact_card_ui_and_print_markers_007 | resistance symbol and value | obs_card_ui_013 | 1 |
| fact_card_ui_and_print_markers_008 | retreat cost symbols | obs_card_ui_014 | 1 |

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
    "obs_card_ui_017"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_016"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_018"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_015"
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
| human_appearance | not_applicable | none | not_applicable |  |
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
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
| drill claws | obs_creature_anatomy_003, obs_creature_anatomy_004 |
| cone-shaped snout | obs_creature_anatomy_002 |
| red triangular chest mark | obs_creature_anatomy_006 |
| diagonal pose | obs_pose_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| arms raised forward | obs_subject_001 | deterministic_rule | 1 |
| diagonal body orientation right | obs_subject_001 | deterministic_rule | 1 |
| diagonal composition | obs_pose_001 | deterministic_rule | 1 |
| forward orientation | obs_pose_002 | deterministic_rule | 1 |
| left orientation | obs_creature_anatomy_004 | deterministic_rule | 1 |
| right orientation | obs_creature_anatomy_003, obs_pose_001, obs_subject_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: メガドリュウズex.
- Quality flags: `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "メガドリュウズex Pokémon",
      "normalized_label": "メガドリュウズex Pokémon",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "メガドリュウズex head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "cone-shaped snout",
      "normalized_label": "cone-shaped snout",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "large drill claw right arm",
      "normalized_label": "drill claw right arm",
      "scene_layer": "foreground",
      "frame_position": "mid_right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "large drill claw left arm",
      "normalized_label": "drill claw left arm",
      "scene_layer": "foreground",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "purple/dark gray body",
      "normalized_label": "body color purple dark gray",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "red triangular marking on chest",
      "normalized_label": "red triangular chest marking",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "narrow eyes with half-lidded or serious expression",
      "normalized_label": "narrow eyes half-lidded",
      "scene_layer": "foreground",
      "frame_position": "center_face",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_008",
      "kind": "creature_anatomy",
      "label": "red markings on face",
      "normalized_label": "red facial markings",
      "scene_layer": "foreground",
      "frame_position": "center_face",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_009",
      "kind": "creature_anatomy",
      "label": "spike horn on head",
      "normalized_label": "head spike horn",
      "scene_layer": "foreground",
      "frame_position": "center_head",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "diagonal body orientation to right",
      "normalized_label": "diagonal body orientation right",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_002",
      "kind": "creature_anatomy",
      "label": "arms raised forward",
      "normalized_label": "arms raised forward",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "background with multicolor bright streaks including red and yellow",
      "normalized_label": "multicolor bright streaks background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "holographic sparkle/glitter effect visible over full card illustration",
      "normalized_label": "holographic sparkle glitter effect",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "tertiary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "no visible clothing",
      "normalized_label": "no clothing",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "no visible objects or props held or visible",
      "normalized_label": "no objects or props",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text メガドリュウズex in yellow and black",
      "normalized_label": "card name メガドリュウズex",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 340 in black text",
      "normalized_label": "HP 340",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_symbol",
      "label": "metal type energy symbol next to HP",
      "normalized_label": "metal type symbol",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_symbol",
      "label": "stage 1 evolution label top left",
      "normalized_label": "stage 1 evolution symbol",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "mole Pokémon pre-evolution icon top left corner",
      "normalized_label": "pre-evolution icon",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "attack energy cost symbols: two metal energies for first attack",
      "normalized_label": "attack cost two metal energies first attack",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "attack name text ほりくずす",
      "normalized_label": "attack name ほりくずす",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "card_ui_text",
      "label": "attack damage text 90",
      "normalized_label": "attack damage 90",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_009",
      "kind": "card_ui_text",
      "label": "attack energy cost symbols: three metal energies for second attack",
      "normalized_label": "attack cost three metal energies second attack",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_010",
      "kind": "card_ui_text",
      "label": "attack name text マキシマムドリル",
      "normalized_label": "attack name マキシマムドリル",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_011",
      "kind": "card_ui_text",
      "label": "attack damage text 200+",
      "normalized_label": "attack damage 200+",
      "scene_layer": "ui",
      "frame_position": "mid_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_012",
      "kind": "card_ui_text",
      "label": "weakness symbol and ×2 fire at bottom left",
      "normalized_label": "weakness fire ×2",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_013",
      "kind": "card_ui_text",
      "label": "resistance symbol and -30 grass at bottom center",
      "normalized_label": "resistance grass -30",
      "scene_layer": "ui",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_014",
      "kind": "card_ui_text",
      "label": "retreat cost four colorless energy symbols at bottom right",
      "normalized_label": "retreat cost four colorless",
      "scene_layer": "ui",
      "frame_position": "bottom_right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_015",
      "kind": "illustrator_text",
      "label": "illustrator text Illus. Keisuke Azuma bottom left",
      "normalized_label": "illustrator Keisuke Azuma",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_016",
      "kind": "card_ui_text",
      "label": "set symbol J m5 bottom left",
      "normalized_label": "set symbol J m5",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_017",
      "kind": "card_ui_text",
      "label": "card number 063/081 bottom center",
      "normalized_label": "card number 063/081",
      "scene_layer": "ui",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_018",
      "kind": "copyright_text",
      "label": "copyright 2026 Pokémon/Nintendo/Creatures/GAME FREAK bottom center",
      "normalized_label": "copyright 2026 Pokémon Nintendo Creatures GAME FREAK",
      "scene_layer": "ui",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "tertiary",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subj_001",
      "module": "subjects",
      "field_path": "scene_subject[0]",
      "claim": "subject identity",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "anatomy.head",
      "claim": "head shape",
      "value": "cone-shaped snout, spike horn",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001",
        "obs_creature_anatomy_002",
        "obs_creature_anatomy_009"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "anatomy.body_color",
      "claim": "body color",
      "value": "purple/dark gray",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "anatomy.markings",
      "claim": "red triangular chest marking",
      "value": "present",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "anatomy.facial_features",
      "claim": "facial markings",
      "value": "red marks on face",
      "supporting_observation_ids": [
        "obs_creature_anatomy_008"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "facial_evidence.eyes",
      "claim": "eye expression",
      "value": "narrow half-lidded",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "body orientation",
      "value": "diagonal to right",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.action_state",
      "claim": "arms raised forward position",
      "value": "arms raised forward",
      "supporting_observation_ids": [
        "obs_pose_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_008",
      "module": "creature_anatomy",
      "field_path": "anatomy.arms",
      "claim": "right arm",
      "value": "large drill claw",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_009",
      "module": "creature_anatomy",
      "field_path": "anatomy.arms",
      "claim": "left arm",
      "value": "large drill claw",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "visible_clothing",
      "claim": "clothing presence",
      "value": "none",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background visual pattern",
      "value": "multicolor bright streaks with red and yellow",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "background_effect",
      "claim": "special effect",
      "value": "holographic sparkle glitter",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "card name text visible",
      "value": "メガドリュウズex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value visible",
      "value": "340",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_003",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "J m5",
      "supporting_observation_ids": [
        "obs_card_ui_016"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "063/081",
      "supporting_observation_ids": [
        "obs_card_ui_017"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_005",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator name visible",
      "value": "Keisuke Azuma",
      "supporting_observation_ids": [
        "obs_card_ui_015"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_006",
      "module": "card_ui_and_print_markers",
      "field_path": "weakness",
      "claim": "weakness symbol and value",
      "value": "fire ×2",
      "supporting_observation_ids": [
        "obs_card_ui_012"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_007",
      "module": "card_ui_and_print_markers",
      "field_path": "resistance",
      "claim": "resistance symbol and value",
      "value": "grass -30",
      "supporting_observation_ids": [
        "obs_card_ui_013"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_008",
      "module": "card_ui_and_print_markers",
      "field_path": "retreat_cost",
      "claim": "retreat cost symbols",
      "value": "four colorless",
      "supporting_observation_ids": [
        "obs_card_ui_014"
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
        "obs creature anatomy 001",
        "obs creature anatomy 002",
        "obs creature anatomy 003",
        "obs creature anatomy 004",
        "obs creature anatomy 005",
        "obs creature anatomy 006",
        "obs creature anatomy 007",
        "obs creature anatomy 008",
        "obs creature anatomy 009"
      ],
      "physical_features": [
        "cone-shaped snout",
        "large drill claws on both arms",
        "red facial markings",
        "red triangular chest marking",
        "spike horn on head"
      ],
      "pose": [
        "arms raised forward",
        "diagonal body orientation right"
      ],
      "orientation": "right",
      "action_state": [
        "not standing"
      ],
      "facial_evidence": {
        "eyes": "narrow half-lidded",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "dark gray",
        "orange",
        "purple",
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_creature_anatomy_008",
      "obs_creature_anatomy_009",
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
      "holographic card art background"
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
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark gray",
      "orange",
      "purple",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "even lighting with sparkling highlights"
    ],
    "shadows": [],
    "highlights": [
      "sparkle glitter effect"
    ],
    "composition": [
      "diagonal body placement"
    ],
    "camera_angle": "straight-on medium close-up",
    "framing": "centered subject with partial border effects",
    "cropping": [
      "no cropping"
    ],
    "depth": "shallow depth emphasizing subject",
    "motion_cues": [
      "pose with drill arms raised"
    ],
    "motifs": [
      "cone shape theme",
      "triangular red chest marking"
    ],
    "repeated_shapes": [
      "cone shapes in arms and snout"
    ],
    "style_cues": [
      "card art style"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
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
        "fact_creature_anatomy_001",
        "fact_creature_anatomy_002",
        "fact_creature_anatomy_003",
        "fact_creature_anatomy_004",
        "fact_creature_anatomy_005",
        "fact_creature_anatomy_006",
        "fact_creature_anatomy_007",
        "fact_creature_anatomy_008",
        "fact_creature_anatomy_009"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_clothing_001"
      ],
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
        "obs_pose_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002"
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
        "fact_card_ui_and_print_markers_008"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_017"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_016"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_018"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_015"
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
        "drill claws",
        "cone-shaped snout",
        "red triangular chest mark",
        "diagonal pose"
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "drill claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003",
        "obs_creature_anatomy_004"
      ]
    },
    {
      "term": "cone-shaped snout",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    },
    {
      "term": "red triangular chest mark",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ]
    },
    {
      "term": "diagonal pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "arms raised forward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "diagonal body orientation right",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_pose_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_003",
          "obs_pose_001",
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
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0074896`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female character. Visible observations: arched windows, pipe, lamp lights on wall.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female character | female character | scene_subject | foreground | primary | 0.99 |
| hair | hair | human_appearance | foreground | primary | 0.99 |
| cape | cape | clothing | foreground | primary | 0.99 |
| brick wall | brick wall | environment | background | secondary | 0.95 |
| arched windows | arched windows | environment | background | medium | 0.95 |
| pipe | pipe | environment | background | medium | 0.95 |
| lamp lights on wall | lamp lights on wall | environment | background | medium | 0.95 |
| hats with star and jewel | hat with star and jewel | clothing | foreground | primary | 0.97 |
| pale skin | pale skin | creature_anatomy | foreground | primary | 0.99 |
| purple hair | purple hair | human_appearance | foreground | primary | 0.99 |
| neutral facial expression |  | human_appearance | foreground | primary | 0.95 |
| long-sleeve garment with stars and formal blue bow | long sleeve garment with stars and bow | clothing | foreground | primary | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject identity | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair color | obs_hair_001, obs_physical_feature_002 | 0.99 |
| fact_003 | human_appearance | facial expression | obs_facial_evidence_001 | 0.95 |
| fact_004 | clothing | wearing hat | obs_clothing_002 | 0.97 |
| fact_005 | clothing | wearing cape | obs_clothing_001, obs_clothing_003 | 0.97 |
| fact_006 | creature_anatomy | skin color | obs_physical_feature_001 | 0.99 |
| fact_007 | environment | scene background elements | obs_environment_001, obs_environment_002, obs_environment_003, obs_environment_004 | 0.95 |

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
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | low | collector_number: collector number text partially visible but not fully legible |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
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
| purple hair | obs_hair_001, obs_physical_feature_002 |
| white cape | obs_clothing_001 |
| star hat | obs_clothing_002 |
| brick wall background | obs_environment_001 |
| arched windows | obs_environment_002 |
| pipe | obs_environment_003 |
| lamp lights | obs_environment_004 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cape | obs_clothing_001, obs_clothing_002 | deterministic_rule | 0.99 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| front-facing | obs_subject_001 | deterministic_rule | 0.99 |
| hat | obs_clothing_002 | deterministic_rule | 0.97 |
| standing | obs_subject_001 | deterministic_rule | 0.99 |
| window | obs_environment_002 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female character. Visible observations: arched windows, pipe, lamp lights on wall.
- Quality flags: `partial_card_ui_due_to_low_resolution`, `potential_module_incomplete_or_low_evidence`, `potential_overconfident_ambiguous_setting`, `potential_speculative_setting_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female character",
      "normalized_label": "female character",
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
      "label": "cape",
      "normalized_label": "cape",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "brick wall",
      "normalized_label": "brick wall",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "arched windows",
      "normalized_label": "arched windows",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "pipe",
      "normalized_label": "pipe",
      "scene_layer": "background",
      "frame_position": "bottom right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "environment",
      "label": "lamp lights on wall",
      "normalized_label": "lamp lights on wall",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "hats with star and jewel",
      "normalized_label": "hat with star and jewel",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_001",
      "kind": "creature_anatomy",
      "label": "pale skin",
      "normalized_label": "pale skin",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_physical_feature_002",
      "kind": "human_appearance",
      "label": "purple hair",
      "normalized_label": "purple hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_evidence_001",
      "kind": "human_appearance",
      "label": "neutral facial expression",
      "normalized_label": "",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "clothing",
      "label": "long-sleeve garment with stars and formal blue bow",
      "normalized_label": "long sleeve garment with stars and bow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "scene subject identity",
      "value": "female character",
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
      "claim": "hair color",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_hair_001",
        "obs_physical_feature_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "facial_expression",
      "claim": "facial expression",
      "value": "neutral",
      "supporting_observation_ids": [
        "obs_facial_evidence_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "headwear",
      "claim": "wearing hat",
      "value": "hat with star and jewel",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "clothing.garment",
      "claim": "wearing cape",
      "value": "white cape with star pattern",
      "supporting_observation_ids": [
        "obs_clothing_001",
        "obs_clothing_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "skin.color",
      "claim": "skin color",
      "value": "pale",
      "supporting_observation_ids": [
        "obs_physical_feature_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "environment",
      "field_path": "background.elements",
      "claim": "scene background elements",
      "value": "brick wall, arched windows, pipe, lamp lights",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003",
        "obs_environment_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female character",
      "identity_confidence": 0.99,
      "anatomy": [
        "hair",
        "skin"
      ],
      "physical_features": [
        "pale skin",
        "purple hair"
      ],
      "pose": [
        "front-facing",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [
        "neutral"
      ],
      "facial_evidence": {
        "eyes": "normal",
        "mouth": "neutral",
        "eyebrows": "normal",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "blue bow",
        "hat with star and jewel",
        "long sleeve garment",
        "white cape with star pattern"
      ],
      "colors": [
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
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_facial_evidence_001",
      "obs_hair_001",
      "obs_physical_feature_001",
      "obs_physical_feature_002",
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
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "stone floor"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "arches",
      "brick wall",
      "lamps",
      "pipe"
    ],
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "cream",
      "gold",
      "purple",
      "white"
    ],
    "lighting": [
      "warm artificial lighting from wall lamps"
    ],
    "shadows": [
      "soft shadow under character"
    ],
    "highlights": [
      "hair and jewel highlights"
    ],
    "composition": [
      "centered composition"
    ],
    "camera_angle": "eye-level",
    "framing": "medium close-up",
    "cropping": [
      "full face and upper torso visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "star pattern on cape and hat"
    ],
    "repeated_shapes": [
      "arches in background"
    ],
    "style_cues": [
      "clean line art",
      "flat colors with shading"
    ],
    "supporting_observation_ids": [
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_environment_001",
      "obs_environment_002",
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
        "fact_003"
      ],
      "visible_body_regions": [],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "normal",
          "mouth": "neutral",
          "eyebrows": "normal",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_facial_evidence_001"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "hair",
          "details": [
            "purple color",
            "straight, shoulder-length"
          ],
          "supporting_observation_ids": [
            "obs_hair_001",
            "obs_physical_feature_002"
          ],
          "confidence": 0.99
        }
      ],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_006"
      ],
      "body_regions": [],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "skin",
          "feature": "pale skin",
          "visibility": "fully_visible",
          "colors": [
            "pale"
          ],
          "details": [
            "smooth skin color"
          ],
          "supporting_observation_ids": [
            "obs_physical_feature_001"
          ],
          "confidence": 0.99
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "front-facing",
            "standing"
          ],
          "orientation": "forward",
          "action_state": [
            "neutral"
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
      "fact_ids": [
        "fact_004",
        "fact_005"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "body",
          "garment": "white cape with star pattern",
          "neckline_type": "cannot determine",
          "sleeve_type": "long sleeve",
          "colors": [
            "white",
            "yellow"
          ],
          "visible_details": [
            "star pattern on left sleeve"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001",
            "obs_clothing_003"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "hat with star and jewel",
          "details": [
            "hat has star shape and jewel on front"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
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
        "fact_007"
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
        "white cape",
        "star hat",
        "brick wall background",
        "arched windows",
        "pipe",
        "lamp lights"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "low",
      "abstentions": [
        {
          "field_path": "collector_number",
          "reason": "collector number text partially visible but not fully legible",
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "purple hair",
      "supporting_observation_ids": [
        "obs_hair_001",
        "obs_physical_feature_002"
      ]
    },
    {
      "term": "white cape",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "star hat",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "brick wall background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "arched windows",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "pipe",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "lamp lights",
      "supporting_observation_ids": [
        "obs_environment_004"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cape",
        "source_observation_ids": [
          "obs_clothing_001",
          "obs_clothing_002"
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
        "concept": "front-facing",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "hat",
        "source_observation_ids": [
          "obs_clothing_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
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

### GV-PK-JPN-M5-109 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.00931`
- Artwork observations: `11`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `9`
- Derived digest: Fact digest. Scene subjects: unknown_human. Visible observations: human, hair blond light bangs side shaved, eye green, face neutral, black hoodie angular shoulders, maroon belt bag, hand reaching forward, hand relaxed lowered. Semantic facts: standing, stormy cloudy sky, flying green leaves, grass field.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| gender ambiguous human character | human | scene_subject | foreground | high | 0.99 |
| light blond hair with three wide bangs and side shaved undercut | hair blond light bangs side shaved | feature | foreground | high | 0.95 |
| green eyes | eye green | feature | foreground | high | 0.95 |
| visible face with neutral mouth and focused eyes | face neutral | feature | foreground | high | 0.95 |
| black hoodie with purple and red accents and angular shoulder pads | black hoodie angular shoulders | clothing | foreground | high | 0.95 |
| maroon belt bag worn around waist | maroon belt bag | clothing | foreground | high | 0.95 |
| right hand reaching forward with fingers slightly curled | hand reaching forward | feature | foreground | high | 0.95 |
| left hand relaxed lowered | hand relaxed lowered | feature | foreground | high | 0.95 |
| stormy cloudy sky with dynamic clouds | stormy cloudy sky | environment | background | medium | 0.9 |
| green leaf debris flying in air | flying green leaves | environment | midground | medium | 0.9 |
| green grass field foreground | green grass field | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text for card name グラジオの決戦 | card_ui_text | top left | visible | 0.95 |
| Japanese text for card type トレーナーズ (Trainers) | card_ui_text | top right | visible | 0.95 |
| Japanese text サポート (Supporter) in red | card_ui_text | top left below card name | visible | 0.95 |
| block of Japanese text in card description area | card_ui_text | middle | visible | 0.9 |
| card type reminder text in Japanese サポートは、自分の番に1枚しか使えない。 | card_ui_text | bottom | visible | 0.95 |
| illustrator text Illus. akagi | illustrator_text | bottom left | visible | 0.95 |
| collector number 109/081 SR | collector_number | bottom center | visible | 0.95 |
| set symbol and code J M5 | set_symbol | bottom left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | character identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair style and color | obs_hair_001 | 0.95 |
| fact_eye_001 | human_appearance | eye color | obs_eye_001 | 0.95 |
| fact_face_001 | human_appearance | facial expression visible | obs_face_001 | 0.95 |
| fact_clothing_001 | clothing | garment worn | obs_clothing_hoodie_001 | 0.95 |
| fact_clothing_002 | clothing | accessory | obs_clothing_beltbag_001 | 0.95 |
| fact_hand_001 | human_appearance | right hand posture | obs_hand_001 | 0.95 |
| fact_hand_002 | human_appearance | left hand posture | obs_hand_002 | 0.95 |
| fact_environment_001 | environment | sky condition | obs_environment_001 | 0.9 |
| fact_environment_002 | environment | flying leaves | obs_environment_002 | 0.9 |
| fact_environment_003 | environment | ground surface | obs_environment_003 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_cardname_001 | card name text | obs_card_ui_cardname_001 | 0.95 |
| fact_cardtype_001 | card type text | obs_card_ui_type_001 | 0.95 |
| fact_supporter_001 | supporter indicator text | obs_card_ui_subtitle_001 | 0.95 |
| fact_textbody_001 | main card text block | obs_card_ui_textbody_001 | 0.9 |
| fact_supporterreminder_001 | supporter rule reminder text | obs_card_ui_bottom_001 | 0.95 |
| fact_illustrator_001 | illustrator | obs_card_ui_illustrator_001 | 0.95 |
| fact_collector_001 | collector number and rarity | obs_card_ui_setcode_001 | 0.95 |
| fact_set_symbol_001 | set symbol and code | obs_card_ui_setlogo_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_cardname_001",
    "fact_cardtype_001",
    "fact_collector_001",
    "fact_illustrator_001",
    "fact_set_symbol_001",
    "fact_supporter_001",
    "fact_supporterreminder_001",
    "fact_textbody_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_cardname_001",
    "obs_card_ui_subtitle_001",
    "obs_card_ui_type_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_setcode_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_setlogo_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_setcode_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_001",
    "obs_card_ui_textbody_001"
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
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | partial_due_to_low_resolution | low | medium | visual_effects.observation_ids: some subtle effects might be missed due to image resolution |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | state | standing | obs_subject_001 | obs_hand_001, obs_hand_002, obs_subject_001 | left hand relaxed down right hand reaching forward standing | 0.95 |
| semfact_002 | environment | stormy cloudy sky |  | obs_environment_001 | stormy cloudy sky | 0.9 |
| semfact_003 | environment | flying green leaves |  | obs_environment_002 | flying leaves flying green leaves | 0.9 |
| semfact_004 | environment | grass field |  | obs_environment_003 | green grass field | 0.9 |

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
| human with blond hair | obs_hair_001 |
| stormy sky | obs_environment_001 |
| flying leaves | obs_environment_002 |
| black hoodie | obs_clothing_hoodie_001 |
| maroon belt bag | obs_clothing_beltbag_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| flying | obs_environment_002 | deterministic_rule | 0.9 |
| flying green leaves | obs_environment_002 | deterministic_rule | 0.9 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| grass field | obs_environment_003 | deterministic_rule | 0.9 |
| left arm relaxed down | obs_subject_001 | deterministic_rule | 0.99 |
| reaching | obs_hand_001, obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_001 | deterministic_rule | 0.9 |
| standing | obs_hand_001, obs_hand_002, obs_subject_001 | deterministic_rule | 0.99 |
| stormy cloudy sky | obs_environment_001 | deterministic_rule | 0.9 |
| terrain | obs_environment_003 | deterministic_rule | 0.9 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown_human. Visible observations: human, hair blond light bangs side shaved, eye green, face neutral, black hoodie angular shoulders, maroon belt bag, hand reaching forward, hand relaxed lowered. Semantic facts: standing, stormy cloudy sky, flying green leaves, grass field.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`, `potential_weather_field_alignment_missing`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "gender ambiguous human character",
      "normalized_label": "human",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "feature",
      "label": "light blond hair with three wide bangs and side shaved undercut",
      "normalized_label": "hair blond light bangs side shaved",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "feature",
      "label": "green eyes",
      "normalized_label": "eye green",
      "scene_layer": "foreground",
      "frame_position": "upper center face",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "feature",
      "label": "visible face with neutral mouth and focused eyes",
      "normalized_label": "face neutral",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_hoodie_001",
      "kind": "clothing",
      "label": "black hoodie with purple and red accents and angular shoulder pads",
      "normalized_label": "black hoodie angular shoulders",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_beltbag_001",
      "kind": "clothing",
      "label": "maroon belt bag worn around waist",
      "normalized_label": "maroon belt bag",
      "scene_layer": "foreground",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_001",
      "kind": "feature",
      "label": "right hand reaching forward with fingers slightly curled",
      "normalized_label": "hand reaching forward",
      "scene_layer": "foreground",
      "frame_position": "lower right center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_002",
      "kind": "feature",
      "label": "left hand relaxed lowered",
      "normalized_label": "hand relaxed lowered",
      "scene_layer": "foreground",
      "frame_position": "lower left center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "stormy cloudy sky with dynamic clouds",
      "normalized_label": "stormy cloudy sky",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "green leaf debris flying in air",
      "normalized_label": "flying green leaves",
      "scene_layer": "midground",
      "frame_position": "mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "green grass field foreground",
      "normalized_label": "green grass field",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_cardname_001",
      "kind": "card_ui_text",
      "label": "Japanese text for card name グラジオの決戦",
      "normalized_label": "card_name_japanese",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_text",
      "label": "Japanese text for card type トレーナーズ (Trainers)",
      "normalized_label": "card_type_japanese",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_subtitle_001",
      "kind": "card_ui_text",
      "label": "Japanese text サポート (Supporter) in red",
      "normalized_label": "supporter_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "top left below card name",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_textbody_001",
      "kind": "card_ui_text",
      "label": "block of Japanese text in card description area",
      "normalized_label": "card_description_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "middle",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_001",
      "kind": "card_ui_text",
      "label": "card type reminder text in Japanese サポートは、自分の番に1枚しか使えない。",
      "normalized_label": "supporter_reminder_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text Illus. akagi",
      "normalized_label": "illustrator_akagi",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_setcode_001",
      "kind": "collector_number",
      "label": "collector number 109/081 SR",
      "normalized_label": "collector_number_109_081_SR",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_setlogo_001",
      "kind": "set_symbol",
      "label": "set symbol and code J M5",
      "normalized_label": "set_symbol_J_M5",
      "scene_layer": "card_ui",
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
      "field_path": "scene_subject[0].identity",
      "claim": "character identity",
      "value": "unknown human",
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
      "value": "light blond hair with three wide bangs and side shaved undercut",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eye_001",
      "module": "human_appearance",
      "field_path": "face.eyes",
      "claim": "eye color",
      "value": "green",
      "supporting_observation_ids": [
        "obs_eye_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "face.facial_evidence",
      "claim": "facial expression visible",
      "value": "neutral mouth and eyes",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0].label",
      "claim": "garment worn",
      "value": "black hoodie with purple and red angular shoulder pads",
      "supporting_observation_ids": [
        "obs_clothing_hoodie_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[1].label",
      "claim": "accessory",
      "value": "maroon belt bag worn around waist",
      "supporting_observation_ids": [
        "obs_clothing_beltbag_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hand_001",
      "module": "human_appearance",
      "field_path": "arms_and_hands[0]",
      "claim": "right hand posture",
      "value": "reaching forward with fingers slightly curled",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hand_002",
      "module": "human_appearance",
      "field_path": "arms_and_hands[1]",
      "claim": "left hand posture",
      "value": "relaxed lowered",
      "supporting_observation_ids": [
        "obs_hand_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky condition",
      "value": "stormy cloudy sky with clouds",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "plants",
      "claim": "flying leaves",
      "value": "green leaf debris flying in air",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "ground",
      "claim": "ground surface",
      "value": "green grass field",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardname_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text",
      "value": "グラジオの決戦 (Gladion's Final Battle)",
      "supporting_observation_ids": [
        "obs_card_ui_cardname_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardtype_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card type text",
      "value": "トレーナーズ (Trainers)",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_supporter_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "supporter indicator text",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_subtitle_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_textbody_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "main card text block",
      "value": "Japanese text block visible",
      "supporting_observation_ids": [
        "obs_card_ui_textbody_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_supporterreminder_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "supporter rule reminder text",
      "value": "サポートは、自分の番に1枚しか使えない。 (Supporters can only be used one per turn)",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator",
      "value": "akagi",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_collector_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "collector number and rarity",
      "value": "109/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_setcode_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "set symbol and code",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_setlogo_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown_human",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "neck"
      ],
      "physical_features": [
        "green eyes",
        "light blond hair"
      ],
      "pose": [
        "left arm relaxed down",
        "reaching",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "neutral",
        "eyebrows": "visible",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black hoodie with angular shoulder pads",
        "maroon belt bag"
      ],
      "colors": [
        "black",
        "light blond",
        "maroon",
        "purple",
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
      "obs_clothing_beltbag_001",
      "obs_clothing_hoodie_001",
      "obs_eye_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_hand_001",
      "obs_hand_002",
      "obs_subject_001"
    ],
    "midground": [
      "obs_environment_002"
    ],
    "background": [
      "obs_environment_001",
      "obs_environment_003"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "outdoor",
    "sky": [
      "stormy cloudy"
    ],
    "ground": [
      "grass field"
    ],
    "terrain": [],
    "plants": [
      "flying green leaves"
    ],
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
      "dark muted colors",
      "green",
      "light blond",
      "maroon",
      "purple"
    ],
    "lighting": [
      "soft ambient"
    ],
    "shadows": [
      "soft diffuse shadows"
    ],
    "highlights": [
      "light hair highlights"
    ],
    "composition": [
      "central subject",
      "upper right hand extended"
    ],
    "camera_angle": "eye level",
    "framing": "medium close-up",
    "cropping": [
      "full figure visible"
    ],
    "depth": "moderate depth with background sky and ground layers",
    "motion_cues": [
      "flying leaves"
    ],
    "motifs": [
      "angular shapes on clothing"
    ],
    "repeated_shapes": [
      "angular shoulder pads"
    ],
    "style_cues": [
      "bold colors",
      "sharp lines"
    ],
    "supporting_observation_ids": [
      "obs_clothing_hoodie_001",
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
        "fact_eye_001",
        "fact_face_001",
        "fact_hair_001",
        "fact_hand_001",
        "fact_hand_002"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "green eyes",
            "light blond hair",
            "neutral mouth"
          ],
          "supporting_observation_ids": [
            "obs_eye_001",
            "obs_face_001",
            "obs_hair_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "visibility": "visible",
          "details": [
            "left hand relaxed down",
            "right hand reaching forward"
          ],
          "supporting_observation_ids": [
            "obs_hand_001",
            "obs_hand_002"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "visible",
          "mouth": "neutral",
          "eyebrows": "visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "light blond hair with three wide bangs and side shaved undercut",
          "details": [
            "side shaved undercut",
            "three wide bangs"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.95
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
          "garment": "black hoodie with purple and red angular shoulder pads",
          "neckline_type": "hooded neckline",
          "sleeve_type": "long sleeves",
          "colors": [
            "black",
            "purple",
            "red"
          ],
          "visible_details": [
            "angular shoulder pads"
          ],
          "supporting_observation_ids": [
            "obs_clothing_hoodie_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "maroon belt bag worn around waist",
          "details": [
            "belt bag"
          ],
          "supporting_observation_ids": [
            "obs_clothing_beltbag_001"
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
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_clothing_hoodie_001",
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
        "fact_cardname_001",
        "fact_cardtype_001",
        "fact_collector_001",
        "fact_illustrator_001",
        "fact_set_symbol_001",
        "fact_supporter_001",
        "fact_supporterreminder_001",
        "fact_textbody_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_cardname_001",
        "obs_card_ui_subtitle_001",
        "obs_card_ui_type_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_setcode_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_setlogo_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_setcode_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_001",
        "obs_card_ui_textbody_001"
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
        "human with blond hair",
        "stormy sky",
        "flying leaves",
        "black hoodie",
        "maroon belt bag"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "visual_effects.observation_ids",
          "reason": "some subtle effects might be missed due to image resolution",
          "affected_observation_ids": [
            "obs_environment_002"
          ]
        }
      ]
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
      "semantic_fact_id": "semfact_001",
      "category": "state",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hand_001",
        "obs_hand_002",
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "left hand relaxed down",
          "right hand reaching forward"
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
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_002",
      "category": "environment",
      "label": "stormy cloudy sky",
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
          "stormy cloudy sky"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_003",
      "category": "environment",
      "label": "flying green leaves",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [
          "flying leaves"
        ],
        "environment": [
          "flying green leaves"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_004",
      "category": "environment",
      "label": "grass field",
      "subject_observation_id": "",
      "supporting_observation_ids": [
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
          "green grass field"
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
      "term": "human with blond hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "stormy sky",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "flying leaves",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "black hoodie",
      "supporting_observation_ids": [
        "obs_clothing_hoodie_001"
      ]
    },
    {
      "term": "maroon belt bag",
      "supporting_observation_ids": [
        "obs_clothing_beltbag_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "flying",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "flying green leaves",
        "source_observation_ids": [
          "obs_environment_002"
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
        "concept": "grass field",
        "source_observation_ids": [
          "obs_environment_003"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "left arm relaxed down",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_hand_001",
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
        "confidence": 0.9
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_hand_001",
          "obs_hand_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "stormy cloudy sky",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "terrain",
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

### GV-PK-JPN-M5-117 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.9`
- Attribute confidence: `0.88`
- Cost USD: `0.0084608`
- Artwork observations: `10`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: human female. Visible observations: human female, face visible, hair purple, hair bangs, eyes purple, mouth neutral, clothing blue long sleeve, headpiece white gold.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human female | human female | scene_subject | foreground | high | 0.98 |
| face visible | face visible | human_appearance | foreground | high | 0.99 |
| purple hair | hair purple | human_appearance | foreground | high | 0.95 |
| hair with bangs | hair bangs | human_appearance | foreground | high | 0.94 |
| purple eyes | eyes purple | human_appearance | foreground | high | 0.96 |
| neutral mouth | mouth neutral | human_appearance | foreground | high | 0.9 |
| blue long-sleeve garment | clothing blue long sleeve | clothing | foreground | high | 0.95 |
| white and gold headpiece | headpiece white gold | clothing | foreground | high | 0.92 |
| ornate headpiece with horns and a gem | ornate headpiece horns gem | objects_and_props | foreground | high | 0.95 |
| colorful abstract background with orange and yellow hues | abstract background orange yellow | environment | background | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: ムク | card_ui_text | top_left | fully_visible | 0.95 |
| top left orange-red text サポート (Support) | card_ui_text | top_left | fully_visible | 0.94 |
| top right Japanese text トレーナーズ (Trainers) | card_ui_text | top_right | fully_visible | 0.92 |
| bottom left set and card number 117/081 SAR | card_ui_text | bottom_left | fully_visible | 0.9 |
| bottom left small text including copyright line | card_ui_text | bottom_left | fully_visible | 0.85 |
| card description text in Japanese beneath illustration | card_ui_text | center_below_artwork | fully_visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | identity | obs_subject_001 | 0.98 |
| fact_hair_001 | human_appearance | hair color | obs_human_appearance_002 | 0.95 |
| fact_hair_002 | human_appearance | hair style feature | obs_human_appearance_003 | 0.94 |
| fact_face_001 | human_appearance | eye color | obs_human_appearance_004 | 0.96 |
| fact_face_002 | human_appearance | mouth expression | obs_human_appearance_005 | 0.9 |
| fact_clothing_001 | clothing | garment color and type | obs_clothing_001 | 0.95 |
| fact_clothing_002 | clothing | headpiece colors and features | obs_clothing_002, obs_object_001 | 0.92 |
| fact_environment_001 | environment | background description | obs_environment_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text | obs_card_ui_001 | 0.95 |
| fact_card_ui_002 | support label text | obs_card_ui_002 | 0.94 |
| fact_card_ui_003 | trainers category text | obs_card_ui_003 | 0.92 |
| fact_card_ui_004 | set and card number | obs_card_ui_004 | 0.9 |
| fact_card_ui_005 | copyright line text | obs_card_ui_005 | 0.85 |
| fact_card_ui_006 | card description text | obs_card_ui_006 | 0.9 |

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
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_004"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_004"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_005"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_006"
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
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | medium | medium | fact_grounded_search_terms: image slight low res blur may obscure finer details |

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
| purple hair | obs_human_appearance_002 |
| ornate headpiece | obs_object_001 |
| blue long-sleeve garment | obs_clothing_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.98 |
| left arm forward | obs_subject_001 | deterministic_rule | 0.98 |
| standing | obs_subject_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human female. Visible observations: human female, face visible, hair purple, hair bangs, eyes purple, mouth neutral, clothing blue long sleeve, headpiece white gold.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human female",
      "normalized_label": "human female",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_001",
      "kind": "human_appearance",
      "label": "face visible",
      "normalized_label": "face visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_002",
      "kind": "human_appearance",
      "label": "purple hair",
      "normalized_label": "hair purple",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_003",
      "kind": "human_appearance",
      "label": "hair with bangs",
      "normalized_label": "hair bangs",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_004",
      "kind": "human_appearance",
      "label": "purple eyes",
      "normalized_label": "eyes purple",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_005",
      "kind": "human_appearance",
      "label": "neutral mouth",
      "normalized_label": "mouth neutral",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue long-sleeve garment",
      "normalized_label": "clothing blue long sleeve",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "white and gold headpiece",
      "normalized_label": "headpiece white gold",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "ornate headpiece with horns and a gem",
      "normalized_label": "ornate headpiece horns gem",
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
      "label": "colorful abstract background with orange and yellow hues",
      "normalized_label": "abstract background orange yellow",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: ムク",
      "normalized_label": "card_name_text_japanese",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "top left orange-red text サポート (Support)",
      "normalized_label": "support_text_japanese",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "top right Japanese text トレーナーズ (Trainers)",
      "normalized_label": "trainers_text_japanese",
      "scene_layer": "interface",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "bottom left set and card number 117/081 SAR",
      "normalized_label": "set_card_number_117_081_SAR",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "bottom left small text including copyright line",
      "normalized_label": "copyright_line_text",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "card description text in Japanese beneath illustration",
      "normalized_label": "card_description_text_japanese",
      "scene_layer": "interface",
      "frame_position": "center_below_artwork",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "identity",
      "value": "human female",
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
      "claim": "hair color",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_human_appearance_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_002",
      "module": "human_appearance",
      "field_path": "hair",
      "claim": "hair style feature",
      "value": "bangs",
      "supporting_observation_ids": [
        "obs_human_appearance_003"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "eyes",
      "claim": "eye color",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_human_appearance_004"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_002",
      "module": "human_appearance",
      "field_path": "mouth",
      "claim": "mouth expression",
      "value": "neutral",
      "supporting_observation_ids": [
        "obs_human_appearance_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments",
      "claim": "garment color and type",
      "value": "blue long sleeve garment",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "headwear",
      "claim": "headpiece colors and features",
      "value": "white and gold ornate headpiece with horns and gem",
      "supporting_observation_ids": [
        "obs_clothing_002",
        "obs_object_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background description",
      "value": "colorful abstract background with orange and yellow hues",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text",
      "value": "ムク",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "support_text_observation_ids",
      "claim": "support label text",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "trainers_text_observation_ids",
      "claim": "trainers category text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "set and card number",
      "value": "117/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "copyright line text",
      "value": "visible small print",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "card description text",
      "value": "Japanese text beneath illustration",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human female",
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
        "left arm forward",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "blue long sleeve garment",
        "white and gold headpiece with horns and gem"
      ],
      "colors": [
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
      "obs_clothing_002",
      "obs_human_appearance_001",
      "obs_human_appearance_002",
      "obs_human_appearance_003",
      "obs_human_appearance_004",
      "obs_human_appearance_005",
      "obs_object_001",
      "obs_subject_001"
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
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "ornate headpiece with horns and a gem",
      "normalized_label": "headpiece",
      "object_type": "headwear",
      "colors": [
        "gold",
        "white"
      ],
      "material_appearance": [
        "ornate",
        "reflective-looking"
      ],
      "location": "head",
      "count_reference": "count_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "gold",
      "orange",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights on headpiece"
    ],
    "shadows": [
      "soft shadows under chin"
    ],
    "highlights": [
      "bright highlights on headpiece"
    ],
    "composition": [
      "central subject portrait with background fill"
    ],
    "camera_angle": "slightly above eye level",
    "framing": "portrait framing",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [
      "arm reaching forward"
    ],
    "motifs": [
      "ornate curved horns pattern"
    ],
    "repeated_shapes": [],
    "style_cues": [
      "stylized anime illustration"
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
        "fact_face_002",
        "fact_hair_001",
        "fact_hair_002"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "neutral mouth",
            "purple eyes"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_001",
            "obs_human_appearance_004",
            "obs_human_appearance_005"
          ],
          "confidence": 0.9
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
            "obs_human_appearance_001",
            "obs_human_appearance_004",
            "obs_human_appearance_005"
          ],
          "confidence": 0.9
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple hair",
          "details": [
            "with bangs"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_002",
            "obs_human_appearance_003"
          ],
          "confidence": 0.95
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
          "body_area": "arms",
          "garment": "long-sleeve shirt",
          "neckline_type": "",
          "sleeve_type": "long sleeve",
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
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "white and gold ornate headpiece with horns and gem",
          "details": [
            "curved horns",
            "gold gem",
            "ornate headpiece"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002",
            "obs_object_001"
          ],
          "confidence": 0.92
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": [
        "obs_object_001"
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
        "obs_environment_001",
        "obs_object_001",
        "obs_subject_001"
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
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004",
        "fact_card_ui_005",
        "fact_card_ui_006"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_004"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_004"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_005"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_006"
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
        "purple hair",
        "ornate headpiece",
        "blue long-sleeve garment"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "fact_grounded_search_terms",
          "reason": "image slight low res blur may obscure finer details",
          "affected_observation_ids": [
            "obs_subject_001"
          ]
        }
      ]
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "purple hair",
      "supporting_observation_ids": [
        "obs_human_appearance_002"
      ]
    },
    {
      "term": "ornate headpiece",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "blue long-sleeve garment",
      "supporting_observation_ids": [
        "obs_clothing_001"
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
        "concept": "left arm forward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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

### GV-PK-JPN-M5-116 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0091984`
- Artwork observations: `11`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Scene subjects: male human trainer. Visible observations: human male character, hair, black jacket, bag, face, hand, hand, clear sky. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human male character | human male character | scene_subject | foreground | high | 0.99 |
| short blond hair | hair | object | foreground | medium | 0.95 |
| black jacket with spikes on collar and sleeves | black jacket | object | foreground | high | 0.98 |
| red crossbody bag | bag | object | foreground | medium | 0.95 |
| face visible in profile left | face | human_appearance | foreground | high | 0.99 |
| left hand raised with fingers in 'okay' gesture | hand | human_appearance | foreground | medium | 0.98 |
| right hand near waist | hand | human_appearance | foreground | medium | 0.98 |
| blue sky with clouds and bright sunlight | clear sky | environment | background | high | 0.98 |
| green rocky terrain with sharp formations and mountains | rocky terrain | environment | background | high | 0.98 |
| several bright pink and white light streaks crossing image diagonally | light streak effects | environment | foreground | medium | 0.95 |
| large sun disc in sky at upper left | sun | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: 'グラジオの決戦' | card_ui_text | top left | visible | 0.99 |
| card type text in Japanese: 'トレーナーズ' at top right | card_ui_text | top right | visible | 0.99 |
| supporter type text in Japanese: 'サポート' top left red | card_ui_text | top left | visible | 0.99 |
| printed legal and copyright text at bottom center in Japanese and English | card_ui_text | bottom | visible | 0.95 |
| card set and number text: 'J M5 116/081 SAR' bottom left corner | card_ui_text | bottom left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject is a male human trainer | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair is short and blond | obs_hair_001 | 0.95 |
| fact_clothing_001 | clothing | wearing black jacket with spikes on collar and sleeves | obs_clothing_001 | 0.98 |
| fact_clothing_002 | clothing | wearing red crossbody bag | obs_clothing_002 | 0.95 |
| fact_body_region_001 | human_appearance | face visible in left profile | obs_body_region_001 | 0.99 |
| fact_body_region_002 | human_appearance | left hand in 'OK' gesture | obs_body_region_002 | 0.98 |
| fact_body_region_003 | human_appearance | right hand near waist | obs_body_region_003 | 0.98 |
| fact_environment_001 | environment | clear blue sky with clouds and bright sunlight | obs_environment_001, obs_environment_004 | 0.98 |
| fact_environment_002 | environment | green rocky terrain with mountains and sharp rock formations | obs_environment_002 | 0.98 |
| fact_environment_003 | environment | multiple bright pink and white light streaks crossing image | obs_environment_003 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text in Japanese 'グラジオの決戦' | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_type_001 | card type text in Japanese 'トレーナーズ' at top right | obs_card_ui_type_001 | 0.99 |
| fact_card_ui_support_001 | supporter type text in Japanese 'サポート' red at top left | obs_card_ui_support_001 | 0.99 |
| fact_card_ui_bottom_001 | copyright text visible at bottom center in Japanese and English | obs_card_ui_bottom_001 | 0.95 |
| fact_card_ui_code_001 | card set code and collector number visible as 'J M5 116/081 SAR' | obs_card_ui_code_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_bottom_001",
    "fact_card_ui_code_001",
    "fact_card_ui_name_001",
    "fact_card_ui_support_001",
    "fact_card_ui_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_code_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_001"
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
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
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
| semfact_pose_standing_001 | action | standing | obs_subject_001 | obs_body_region_002, obs_body_region_003, obs_subject_001 | left hand raised right hand lowered upright standing body position stationary | 0.98 |

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
| black jacket with spikes | obs_clothing_001 |
| blond hair | obs_hair_001 |
| red crossbody bag | obs_clothing_002 |
| blue sky | obs_environment_001 |
| rocky terrain | obs_environment_002 |
| light streak effects | obs_environment_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| left hand raised making 'OK' gesture | obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_subject_001 | deterministic_rule | 0.99 |
| right hand near waist | obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_001 | deterministic_rule | 0.98 |
| standing | obs_body_region_002, obs_body_region_003, obs_subject_001 | deterministic_rule | 0.99 |
| terrain | obs_environment_002 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: male human trainer. Visible observations: human male character, hair, black jacket, bag, face, hand, hand, clear sky. Semantic facts: standing.
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
      "kind": "object",
      "label": "short blond hair",
      "normalized_label": "hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "object",
      "label": "black jacket with spikes on collar and sleeves",
      "normalized_label": "black jacket",
      "scene_layer": "foreground",
      "frame_position": "torso",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "object",
      "label": "red crossbody bag",
      "normalized_label": "bag",
      "scene_layer": "foreground",
      "frame_position": "waist",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "human_appearance",
      "label": "face visible in profile left",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "human_appearance",
      "label": "left hand raised with fingers in 'okay' gesture",
      "normalized_label": "hand",
      "scene_layer": "foreground",
      "frame_position": "left hand",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "human_appearance",
      "label": "right hand near waist",
      "normalized_label": "hand",
      "scene_layer": "foreground",
      "frame_position": "right hand",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "blue sky with clouds and bright sunlight",
      "normalized_label": "clear sky",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "green rocky terrain with sharp formations and mountains",
      "normalized_label": "rocky terrain",
      "scene_layer": "background",
      "frame_position": "lower background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "several bright pink and white light streaks crossing image diagonally",
      "normalized_label": "light streak effects",
      "scene_layer": "foreground",
      "frame_position": "across subject",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_004",
      "kind": "environment",
      "label": "large sun disc in sky at upper left",
      "normalized_label": "sun",
      "scene_layer": "background",
      "frame_position": "upper left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: 'グラジオの決戦'",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_text",
      "label": "card type text in Japanese: 'トレーナーズ' at top right",
      "normalized_label": "trainer type text",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_support_001",
      "kind": "card_ui_text",
      "label": "supporter type text in Japanese: 'サポート' top left red",
      "normalized_label": "supporter text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_001",
      "kind": "card_ui_text",
      "label": "printed legal and copyright text at bottom center in Japanese and English",
      "normalized_label": "copyright text",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_code_001",
      "kind": "card_ui_text",
      "label": "card set and number text: 'J M5 116/081 SAR' bottom left corner",
      "normalized_label": "set and collector number",
      "scene_layer": "ui",
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
      "field_path": "scene_subject.identity",
      "claim": "scene subject is a male human trainer",
      "value": "male human trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair.label",
      "claim": "hair is short and blond",
      "value": "short blond hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments.jacket",
      "claim": "wearing black jacket with spikes on collar and sleeves",
      "value": "black jacket with spikes",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "accessories.bag",
      "claim": "wearing red crossbody bag",
      "value": "red crossbody bag",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_region_001",
      "module": "human_appearance",
      "field_path": "face.visibility",
      "claim": "face visible in left profile",
      "value": "visible face left profile",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_region_002",
      "module": "human_appearance",
      "field_path": "left_hand.gesture",
      "claim": "left hand in 'OK' gesture",
      "value": "OK gesture left hand",
      "supporting_observation_ids": [
        "obs_body_region_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_region_003",
      "module": "human_appearance",
      "field_path": "right_hand.position",
      "claim": "right hand near waist",
      "value": "right hand near waist",
      "supporting_observation_ids": [
        "obs_body_region_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting.sky",
      "claim": "clear blue sky with clouds and bright sunlight",
      "value": "clear blue sky with clouds and bright sun",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "setting.terrain",
      "claim": "green rocky terrain with mountains and sharp rock formations",
      "value": "green rocky terrain",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "effects.light_streaks",
      "claim": "multiple bright pink and white light streaks crossing image",
      "value": "light streak effects",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text in Japanese 'グラジオの決戦'",
      "value": "グラジオの決戦",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_type_text",
      "claim": "card type text in Japanese 'トレーナーズ' at top right",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_support_001",
      "module": "card_ui_and_print_markers",
      "field_path": "supporter_text",
      "claim": "supporter type text in Japanese 'サポート' red at top left",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_support_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text visible at bottom center in Japanese and English",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_code_and_number",
      "claim": "card set code and collector number visible as 'J M5 116/081 SAR'",
      "value": "J M5 116/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_code_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "male human trainer",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "head",
        "torso"
      ],
      "physical_features": [
        "short blond hair"
      ],
      "pose": [
        "left hand raised making 'OK' gesture",
        "right hand near waist",
        "standing"
      ],
      "orientation": "left",
      "action_state": [
        "standing still"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "neutral",
        "eyebrows": "normal",
        "face_position": "left profile",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black jacket with spikes",
        "red crossbody bag"
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
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_environment_003",
      "obs_hair_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_004"
    ]
  },
  "environment": {
    "setting": [
      "clear blue sky with clouds",
      "rocky terrain"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "sun",
      "white clouds"
    ],
    "ground": [
      "green plants",
      "rocky dirt terrain"
    ],
    "terrain": [
      "mountains",
      "rock formations"
    ],
    "plants": [
      "green shrubbery"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "bright sunlight"
    ],
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
      "blond yellow",
      "bright blues",
      "greens",
      "red",
      "white"
    ],
    "lighting": [
      "bright sunlight",
      "high contrast"
    ],
    "shadows": [
      "soft shadows on character"
    ],
    "highlights": [
      "glossy highlights on black jacket and hair"
    ],
    "composition": [
      "centered character",
      "diagonal light rays"
    ],
    "camera_angle": "eye level",
    "framing": "tight framing on character",
    "cropping": [
      "full upper body visible",
      "head near top edge"
    ],
    "depth": "deep with background mountains",
    "motion_cues": [
      "light streaks suggesting motion"
    ],
    "motifs": [
      "light streaks",
      "spiked jacket motif"
    ],
    "repeated_shapes": [
      "triangular spikes on jacket collar and sleeves"
    ],
    "style_cues": [
      "bright saturated colors"
    ],
    "supporting_observation_ids": [
      "obs_clothing_001",
      "obs_environment_003",
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
        "fact_body_region_001",
        "fact_body_region_002",
        "fact_body_region_003",
        "fact_hair_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "face visible in left profile"
          ],
          "supporting_observation_ids": [
            "obs_body_region_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "left hand",
          "visibility": "visible",
          "details": [
            "left hand raised in 'OK' gesture"
          ],
          "supporting_observation_ids": [
            "obs_body_region_002"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "right hand",
          "visibility": "visible",
          "details": [
            "right hand near waist"
          ],
          "supporting_observation_ids": [
            "obs_body_region_003"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "left profile",
          "eyes": "visible",
          "mouth": "neutral",
          "eyebrows": "normal",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_body_region_001"
          ],
          "confidence": 0.99
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "short blond hair",
          "details": [
            "bright blond color",
            "short style"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.95
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "OK gesture with left hand",
          "details": [
            "thumb and index finger forming circle"
          ],
          "supporting_observation_ids": [
            "obs_body_region_002"
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
        "fact_clothing_001",
        "fact_clothing_002"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black jacket",
          "neckline_type": "high collar with spikes",
          "sleeve_type": "long sleeves with spikes",
          "colors": [
            "black"
          ],
          "visible_details": [
            "spiked collar",
            "spiked sleeves"
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
          "label": "red crossbody bag",
          "details": [
            "worn over shoulder across chest"
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
        "fact_environment_001",
        "fact_environment_002",
        "fact_environment_003"
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
      "observation_ids": [
        "obs_environment_003"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_clothing_001",
        "obs_environment_001",
        "obs_environment_003",
        "obs_hair_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_environment_003"
      ],
      "observation_ids": [
        "obs_environment_003"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_bottom_001",
        "fact_card_ui_code_001",
        "fact_card_ui_name_001",
        "fact_card_ui_support_001",
        "fact_card_ui_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_code_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_001"
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
        "black jacket with spikes",
        "blond hair",
        "red crossbody bag",
        "blue sky",
        "rocky terrain",
        "light streak effects"
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
      "semantic_fact_id": "semfact_pose_standing_001",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_body_region_002",
        "obs_body_region_003",
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "left hand raised",
          "right hand lowered"
        ],
        "body_position": [
          "upright standing body position"
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
      "term": "black jacket with spikes",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "blond hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "red crossbody bag",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "rocky terrain",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "light streak effects",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "left hand raised making 'OK' gesture",
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
        "concept": "right hand near waist",
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
        "confidence": 0.98
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_body_region_002",
          "obs_body_region_003",
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
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-111 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.97`
- Attribute confidence: `0.95`
- Cost USD: `0.0115532`
- Artwork observations: `17`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: unknown female human. Visible observations: purple hair, black hair tips, blue white ornate headpiece spiral extensions, face visible, purple eyes, neutral mouth, neck visible, shoulders visible.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human subject | female human subject | scene_subject | foreground | primary | 0.99 |
| purple hair | purple hair | human_appearance | foreground | high | 0.95 |
| black hair tips | black hair tips | human_appearance | foreground | medium | 0.92 |
| blue and white ornate headpiece with spiral extensions | blue white ornate headpiece spiral extensions | objects_and_props | foreground | high | 0.93 |
| face fully visible | face visible | human_appearance | foreground | high | 0.98 |
| purple eyes | purple eyes | human_appearance | foreground | high | 0.97 |
| neutral mouth expression | neutral mouth | human_appearance | foreground | medium | 0.9 |
| visible neck | neck visible | human_appearance | foreground | medium | 0.95 |
| visible shoulders | shoulders visible | human_appearance | foreground | medium | 0.95 |
| visible upper chest | upper chest visible | human_appearance | foreground | medium | 0.9 |
| visible arms | arms visible | human_appearance | foreground | high | 0.95 |
| hands visible, clasped together | hands clasped | human_appearance | foreground | high | 0.96 |
| long-sleeve white coat with yellow circular emblem around waist | long-sleeve white coat yellow emblem waist | clothing | foreground | high | 0.95 |
| black dress or garment under white coat with blue and purple ribbons hanging | black dress blue purple ribbons | clothing | foreground | high | 0.92 |
| light blue gloves covering hands | light blue gloves | clothing | foreground | high | 0.95 |
| stone brick walls and steps in background | stone brick walls steps | environment | background | medium | 0.96 |
| stairs with stone-like texture on right | stone stairs | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject is a female human | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair has purple color | obs_human_hair_001 | 0.95 |
| fact_003 | human_appearance | tips of hair are black | obs_human_hair_002 | 0.92 |
| fact_004 | human_appearance | face is fully visible | obs_face_001 | 0.98 |
| fact_005 | human_appearance | eyes are purple | obs_eyes_001 | 0.97 |
| fact_006 | human_appearance | mouth has | obs_mouth_001 | 0.9 |
| fact_007 | human_appearance | neck is visible | obs_neck_001 | 0.95 |
| fact_008 | human_appearance | shoulders are visible | obs_shoulders_001 | 0.95 |
| fact_009 | human_appearance | upper chest is visible | obs_upper_chest_001 | 0.9 |
| fact_010 | human_appearance | arms are visible | obs_arms_001 | 0.95 |
| fact_011 | human_appearance | hands are visible and clasped together | obs_hands_001 | 0.96 |
| fact_012 | clothing | coat is white with yellow emblem | obs_clothing_001 | 0.95 |
| fact_013 | clothing | under coat black dress or garment with blue and purple ribbons | obs_clothing_002 | 0.92 |
| fact_014 | clothing | hands covered with light blue gloves | obs_gloves_001 | 0.95 |
| fact_015 | objects_and_props | subject wears blue and white ornate headpiece with spiral side extensions | obs_headwear_001 | 0.93 |
| fact_016 | environment | background stone brick walls | obs_environment_001 | 0.96 |
| fact_017 | environment | stairs made of stone texture on right side | obs_environment_002 | 0.95 |

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
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | name_text_observation_ids: text partially visible but cannot be reliably read; collector_number_observation_ids: text low resolution, partially obscured; set_symbol_observation_ids: symbol blurred, uncertain reading; rarity_mark_observation_ids: rarity mark visible but unclear; copyright_line_observation_ids: small print not readable; bottom_line_text_observation_ids: text too small for reliable OCR; illustrator_text_observation_ids: illustrator text partially legible but not fully confirmed |
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
| female human with purple hair | obs_human_hair_001, obs_subject_001 |
| blue and white ornate headpiece with spiral curls | obs_headwear_001 |
| stone brick wall background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_gloves_001 | deterministic_rule | 0.95 |
| hands clasped | obs_subject_001 | deterministic_rule | 0.99 |
| spiral motif | obs_headwear_001 | deterministic_rule | 0.93 |
| stairs | obs_environment_001, obs_environment_002 | deterministic_rule | 0.96 |
| standing | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown female human. Visible observations: purple hair, black hair tips, blue white ornate headpiece spiral extensions, face visible, purple eyes, neutral mouth, neck visible, shoulders visible.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human subject",
      "normalized_label": "female human subject",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_hair_001",
      "kind": "human_appearance",
      "label": "purple hair",
      "normalized_label": "purple hair",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_hair_002",
      "kind": "human_appearance",
      "label": "black hair tips",
      "normalized_label": "black hair tips",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_headwear_001",
      "kind": "objects_and_props",
      "label": "blue and white ornate headpiece with spiral extensions",
      "normalized_label": "blue white ornate headpiece spiral extensions",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "face fully visible",
      "normalized_label": "face visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "human_appearance",
      "label": "purple eyes",
      "normalized_label": "purple eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "human_appearance",
      "label": "neutral mouth expression",
      "normalized_label": "neutral mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_neck_001",
      "kind": "human_appearance",
      "label": "visible neck",
      "normalized_label": "neck visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_shoulders_001",
      "kind": "human_appearance",
      "label": "visible shoulders",
      "normalized_label": "shoulders visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_upper_chest_001",
      "kind": "human_appearance",
      "label": "visible upper chest",
      "normalized_label": "upper chest visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_arms_001",
      "kind": "human_appearance",
      "label": "visible arms",
      "normalized_label": "arms visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hands_001",
      "kind": "human_appearance",
      "label": "hands visible, clasped together",
      "normalized_label": "hands clasped",
      "scene_layer": "foreground",
      "frame_position": "center_lower",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "long-sleeve white coat with yellow circular emblem around waist",
      "normalized_label": "long-sleeve white coat yellow emblem waist",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "black dress or garment under white coat with blue and purple ribbons hanging",
      "normalized_label": "black dress blue purple ribbons",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_gloves_001",
      "kind": "clothing",
      "label": "light blue gloves covering hands",
      "normalized_label": "light blue gloves",
      "scene_layer": "foreground",
      "frame_position": "center_lower",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "stone brick walls and steps in background",
      "normalized_label": "stone brick walls steps",
      "scene_layer": "background",
      "frame_position": "mid_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "stairs with stone-like texture on right",
      "normalized_label": "stone stairs",
      "scene_layer": "background",
      "frame_position": "right_lower",
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
      "field_path": "[0]",
      "claim": "subject is a female human",
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
      "field_path": "hair.color",
      "claim": "hair has purple color",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_human_hair_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "hair.tip_color",
      "claim": "tips of hair are black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_human_hair_002"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "face.visibility",
      "claim": "face is fully visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "human_appearance",
      "field_path": "eyes.color",
      "claim": "eyes are purple",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "mouth.expression",
      "claim": "mouth has",
      "value": "neutral",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "neck.visibility",
      "claim": "neck is visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_neck_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "human_appearance",
      "field_path": "shoulders.visibility",
      "claim": "shoulders are visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_shoulders_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "human_appearance",
      "field_path": "upper_chest.visibility",
      "claim": "upper chest is visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_upper_chest_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "human_appearance",
      "field_path": "arms.visibility",
      "claim": "arms are visible",
      "value": "true",
      "supporting_observation_ids": [
        "obs_arms_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "human_appearance",
      "field_path": "hands.visibility_and_pose",
      "claim": "hands are visible and clasped together",
      "value": "visible and clasped",
      "supporting_observation_ids": [
        "obs_hands_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "clothing",
      "field_path": "garments.coat.color",
      "claim": "coat is white with yellow emblem",
      "value": "white yellow emblem",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "clothing",
      "field_path": "garments.dress.color_and_features",
      "claim": "under coat black dress or garment with blue and purple ribbons",
      "value": "black blue purple",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "clothing",
      "field_path": "accessories.gloves.color",
      "claim": "hands covered with light blue gloves",
      "value": "light blue",
      "supporting_observation_ids": [
        "obs_gloves_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "objects_and_props",
      "field_path": "headwear",
      "claim": "subject wears blue and white ornate headpiece with spiral side extensions",
      "value": "blue white ornate headpiece spiral",
      "supporting_observation_ids": [
        "obs_headwear_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_016",
      "module": "environment",
      "field_path": "background.wall_material",
      "claim": "background stone brick walls",
      "value": "stone brick",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_017",
      "module": "environment",
      "field_path": "background.stairs_material_and_position",
      "claim": "stairs made of stone texture on right side",
      "value": "stone stairs right",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown female human",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "neck",
        "shoulders",
        "upper chest"
      ],
      "physical_features": [
        "purple eyes",
        "purple hair with black tips"
      ],
      "pose": [
        "hands clasped",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "fully visible",
        "mouth": "neutral",
        "eyebrows": "not specified",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black dress with blue and purple ribbons",
        "blue and white ornate headpiece with spiral extensions",
        "light blue gloves",
        "white long-sleeve coat with yellow emblem"
      ],
      "colors": [
        "black",
        "blue",
        "light blue",
        "purple",
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
      "obs_arms_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_eyes_001",
      "obs_face_001",
      "obs_gloves_001",
      "obs_hands_001",
      "obs_headwear_001",
      "obs_human_hair_001",
      "obs_human_hair_002",
      "obs_mouth_001",
      "obs_neck_001",
      "obs_shoulders_001",
      "obs_subject_001",
      "obs_upper_chest_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "stone floor visible"
    ],
    "terrain": [],
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
      "observation_id": "obs_headwear_001",
      "label": "blue and white ornate headpiece with spiral side extensions",
      "normalized_label": "blue white ornate headpiece spiral extensions",
      "object_type": "headwear",
      "colors": [
        "blue",
        "white"
      ],
      "material_appearance": [
        "glossy",
        "smooth"
      ],
      "location": "on subject's head",
      "count_reference": "count_001",
      "confidence": 0.93
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "grey",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "front lighting",
      "soft lighting"
    ],
    "shadows": [
      "soft shadows on face and clothes"
    ],
    "highlights": [
      "light reflections on headpiece"
    ],
    "composition": [
      "centered subject",
      "medium close-up framing"
    ],
    "camera_angle": "eye-level",
    "framing": "medium close-up",
    "cropping": [
      "full subject visible"
    ],
    "depth": "moderate depth",
    "motion_cues": [
      "still"
    ],
    "motifs": [
      "spiral shapes in headpiece"
    ],
    "repeated_shapes": [
      "spiral curls in headpiece"
    ],
    "style_cues": [
      "anime-style art",
      "clean lines",
      "digital art"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_headwear_001",
      "obs_human_hair_001",
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
        "fact_010",
        "fact_011"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "neutral mouth",
            "purple eyes"
          ],
          "supporting_observation_ids": [
            "obs_eyes_001",
            "obs_face_001",
            "obs_mouth_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "neck",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_neck_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "shoulders",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_shoulders_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "upper chest",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_upper_chest_001"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "visibility": "visible",
          "details": [],
          "supporting_observation_ids": [
            "obs_arms_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hands",
          "visibility": "visible",
          "details": [
            "clasped pose"
          ],
          "supporting_observation_ids": [
            "obs_hands_001"
          ],
          "confidence": 0.96
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "center",
          "eyes": "fully visible",
          "mouth": "neutral",
          "eyebrows": "not specified",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_eyes_001",
            "obs_mouth_001"
          ],
          "confidence": 0.9
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple hair with black tips",
          "details": [
            "two-tone color"
          ],
          "supporting_observation_ids": [
            "obs_human_hair_001",
            "obs_human_hair_002"
          ],
          "confidence": 0.93
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "hands clasped",
          "details": [
            "clasped fingers in front of chest"
          ],
          "supporting_observation_ids": [
            "obs_hands_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue and white ornate headpiece with spiral extensions",
          "details": [
            "decorative",
            "symmetric spirals"
          ],
          "supporting_observation_ids": [
            "obs_headwear_001"
          ],
          "confidence": 0.93
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
        "fact_012",
        "fact_013",
        "fact_014"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper body",
          "garment": "long sleeve coat",
          "neckline_type": "high collar",
          "sleeve_type": "long sleeve",
          "colors": [
            "white",
            "yellow"
          ],
          "visible_details": [
            "yellow circular emblem near waist"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black dress or garment",
          "neckline_type": "not visible",
          "sleeve_type": "not visible",
          "colors": [
            "black",
            "blue",
            "purple"
          ],
          "visible_details": [
            "blue and purple ribbons"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.92
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "light blue gloves",
          "details": [
            "covering hands"
          ],
          "supporting_observation_ids": [
            "obs_gloves_001"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_015"
      ],
      "object_observation_ids": [
        "obs_headwear_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_016",
        "fact_017"
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
        "female human with purple hair",
        "blue and white ornate headpiece with spiral curls",
        "stone brick wall background"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text_observation_ids",
          "reason": "text partially visible but cannot be reliably read",
          "affected_observation_ids": []
        },
        {
          "field_path": "collector_number_observation_ids",
          "reason": "text low resolution, partially obscured",
          "affected_observation_ids": []
        },
        {
          "field_path": "set_symbol_observation_ids",
          "reason": "symbol blurred, uncertain reading",
          "affected_observation_ids": []
        },
        {
          "field_path": "rarity_mark_observation_ids",
          "reason": "rarity mark visible but unclear",
          "affected_observation_ids": []
        },
        {
          "field_path": "copyright_line_observation_ids",
          "reason": "small print not readable",
          "affected_observation_ids": []
        },
        {
          "field_path": "bottom_line_text_observation_ids",
          "reason": "text too small for reliable OCR",
          "affected_observation_ids": []
        },
        {
          "field_path": "illustrator_text_observation_ids",
          "reason": "illustrator text partially legible but not fully confirmed",
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
      "term": "female human with purple hair",
      "supporting_observation_ids": [
        "obs_human_hair_001",
        "obs_subject_001"
      ]
    },
    {
      "term": "blue and white ornate headpiece with spiral curls",
      "supporting_observation_ids": [
        "obs_headwear_001"
      ]
    },
    {
      "term": "stone brick wall background",
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
        "concept": "gloves",
        "source_observation_ids": [
          "obs_gloves_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "hands clasped",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_headwear_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "stairs",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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

### GV-PK-JPN-M5-075 - カスミの元気

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0109868`
- Artwork observations: `10`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: unknown. Visible observations: female human trainer, orange hair, smiling winking expression, blue cropped tank top, blue shorts, black wristbands, standing with arm extended forward, indoor pool. Semantic facts: smiling, indoor pool.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer character | female human trainer | scene_subject | foreground | high | 0.99 |
| orange hair in two side ponytails | orange hair | human_appearance | foreground | high | 0.99 |
| winking with open mouth smiling expression | smiling winking expression | human_appearance | foreground | high | 0.95 |
| blue cropped tank top | blue cropped tank top | clothing | foreground | high | 0.98 |
| blue shorts | blue shorts | clothing | foreground | high | 0.98 |
| black wristbands on both wrists | black wristbands | clothing | foreground | medium | 0.96 |
| standing with right arm extended forward and left arm bent backward | standing with arm extended forward | human_appearance | foreground | high | 0.97 |
| indoor pool setting with tiled floor and large windows | indoor pool | environment | background | medium | 0.98 |
| plant with green leaves near left side | green leafy plant | environment | background | medium | 0.95 |
| metal handrail beside a pool | metal handrail | objects_and_props | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text 'カスミの元気' (Kasumi's Energy) | card_ui_text | top left | visible | 0.99 |
| trainer subtype text 'トレーナーズ' (Trainers) | card_ui_text | top right | visible | 0.99 |
| supporter card type text 'サポート' (Support) | card_ui_text | top left orange banner | visible | 0.98 |
| set symbol with code 'm5' | set_symbol | bottom left | visible | 0.99 |
| collector number '075/081' | collector_number | bottom left | visible | 0.99 |
| illustrator 'Illus. En Morikura' | illustrator_text | bottom left above set number | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject female human trainer character | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair orange in two side ponytails | obs_hair_001 | 0.99 |
| fact_facial_expression_001 | human_appearance | smiling with winking eye and open mouth | obs_facial_expression_001 | 0.95 |
| fact_clothing_001 | clothing | wearing blue cropped tank top | obs_clothing_001 | 0.98 |
| fact_clothing_002 | clothing | wearing blue shorts | obs_clothing_002 | 0.98 |
| fact_accessory_001 | clothing | wearing black wristbands on both wrists | obs_accessory_001 | 0.96 |
| fact_pose_001 | human_appearance | standing with right arm extended forward and left arm bent backward | obs_pose_001 | 0.97 |
| fact_environment_001 | environment | indoor pool with tiled floor and large windows | obs_environment_001, obs_environment_002, obs_objects_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text 'カスミの元気' | obs_card_ui_name_001 | 0.99 |
| fact_card_ui_type_001 | card type text 'トレーナーズ' | obs_card_ui_type_001 | 0.99 |
| fact_card_ui_supporter_001 | supporter card type text 'サポート' | obs_card_ui_supporter_001 | 0.98 |
| fact_card_ui_set_symbol_001 | set symbol with code 'm5' | obs_card_ui_set_symbol_001 | 0.99 |
| fact_card_ui_set_number_001 | collector number '075/081' | obs_card_ui_set_number_001 | 0.99 |
| fact_card_ui_artist_001 | illustrator 'Illus. En Morikura' | obs_card_ui_artist_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_artist_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_number_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_supporter_001",
    "fact_card_ui_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_type_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_artist_001"
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
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | medium | high |  |
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
| sem_fact_001 | expression | smiling | obs_subject_001 | obs_facial_expression_001 | open smiling one eye open one eye winking neutral face front standing | 0.95 |
| sem_fact_002 | scene_type | indoor pool | obs_subject_001 | obs_environment_001 | indoor pool green leafy plant metal handrail | 0.98 |

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
| orange hair | obs_hair_001 |
| blue cropped tank top | obs_clothing_001 |
| blue shorts | obs_clothing_002 |
| black wristbands | obs_accessory_001 |
| indoor pool | obs_environment_001 |
| green leafy plant | obs_environment_002 |
| metal handrail | obs_objects_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_pose_001, obs_subject_001 | deterministic_rule | 0.97 |
| indoor pool | obs_environment_001 | deterministic_rule | 0.98 |
| left arm bent backward | obs_pose_001, obs_subject_001 | deterministic_rule | 0.97 |
| plant | obs_environment_002 | deterministic_rule | 0.95 |
| reaching | obs_pose_001, obs_subject_001 | deterministic_rule | 0.97 |
| smiling | obs_facial_expression_001 | deterministic_rule | 0.95 |
| standing | obs_pose_001, obs_subject_001 | deterministic_rule | 0.97 |
| window | obs_environment_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown. Visible observations: female human trainer, orange hair, smiling winking expression, blue cropped tank top, blue shorts, black wristbands, standing with arm extended forward, indoor pool. Semantic facts: smiling, indoor pool.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human trainer character",
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
      "label": "orange hair in two side ponytails",
      "normalized_label": "orange hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_facial_expression_001",
      "kind": "human_appearance",
      "label": "winking with open mouth smiling expression",
      "normalized_label": "smiling winking expression",
      "scene_layer": "foreground",
      "frame_position": "face",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue cropped tank top",
      "normalized_label": "blue cropped tank top",
      "scene_layer": "foreground",
      "frame_position": "upper body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
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
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing",
      "label": "black wristbands on both wrists",
      "normalized_label": "black wristbands",
      "scene_layer": "foreground",
      "frame_position": "wrists",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "human_appearance",
      "label": "standing with right arm extended forward and left arm bent backward",
      "normalized_label": "standing with arm extended forward",
      "scene_layer": "foreground",
      "frame_position": "full body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor pool setting with tiled floor and large windows",
      "normalized_label": "indoor pool",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "plant with green leaves near left side",
      "normalized_label": "green leafy plant",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "metal handrail beside a pool",
      "normalized_label": "metal handrail",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text 'カスミの元気' (Kasumi's Energy)",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_text",
      "label": "trainer subtype text 'トレーナーズ' (Trainers)",
      "normalized_label": "trainer subtype text",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_supporter_001",
      "kind": "card_ui_text",
      "label": "supporter card type text 'サポート' (Support)",
      "normalized_label": "supporter text",
      "scene_layer": "card_ui",
      "frame_position": "top left orange banner",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol with code 'm5'",
      "normalized_label": "set symbol m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_number_001",
      "kind": "collector_number",
      "label": "collector number '075/081'",
      "normalized_label": "collector number 075/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_artist_001",
      "kind": "illustrator_text",
      "label": "illustrator 'Illus. En Morikura'",
      "normalized_label": "illustrator En Morikura",
      "scene_layer": "card_ui",
      "frame_position": "bottom left above set number",
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
      "field_path": "0",
      "claim": "scene subject female human trainer character",
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
      "field_path": "hair.0",
      "claim": "hair orange in two side ponytails",
      "value": "orange hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_facial_expression_001",
      "module": "human_appearance",
      "field_path": "facial_evidence",
      "claim": "smiling with winking eye and open mouth",
      "value": "smiling winking expression",
      "supporting_observation_ids": [
        "obs_facial_expression_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments.0",
      "claim": "wearing blue cropped tank top",
      "value": "blue cropped tank top",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments.1",
      "claim": "wearing blue shorts",
      "value": "blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessory_001",
      "module": "clothing",
      "field_path": "accessories.0",
      "claim": "wearing black wristbands on both wrists",
      "value": "black wristbands",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "human_appearance",
      "field_path": "pose_orientation",
      "claim": "standing with right arm extended forward and left arm bent backward",
      "value": "standing with right arm extended",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "indoor pool with tiled floor and large windows",
      "value": "indoor pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_objects_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text 'カスミの元気'",
      "value": "カスミの元気",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "card type text 'トレーナーズ'",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_supporter_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "supporter card type text 'サポート'",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_supporter_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol with code 'm5'",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number '075/081'",
      "value": "075/081",
      "supporting_observation_ids": [
        "obs_card_ui_set_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_artist_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator 'Illus. En Morikura'",
      "value": "Illus. En Morikura",
      "supporting_observation_ids": [
        "obs_card_ui_artist_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown",
      "identity_confidence": 0.5,
      "anatomy": [
        "arms",
        "face",
        "feet",
        "hands",
        "legs",
        "midriff",
        "neck",
        "shoulders",
        "upper chest"
      ],
      "physical_features": [
        "orange hair",
        "smiling winking facial expression"
      ],
      "pose": [
        "left arm bent backward",
        "reaching",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "one eye winking, one eye open",
        "mouth": "open, smiling",
        "eyebrows": "neutral",
        "face_position": "front",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristbands",
        "blue cropped tank top",
        "blue shorts"
      ],
      "colors": [
        "black",
        "blue",
        "orange"
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
      "obs_clothing_002",
      "obs_facial_expression_001",
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
      "indoor pool"
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
    "water": [
      "pool water"
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
      "label": "metal handrail beside pool",
      "normalized_label": "metal handrail",
      "object_type": "prop",
      "colors": [
        "gray",
        "metallic"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "background near pool",
      "count_reference": "",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "gray",
      "green",
      "orange",
      "white"
    ],
    "lighting": [
      "bright",
      "even lighting"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "hair highlights"
    ],
    "composition": [
      "background elements",
      "centered subject",
      "foreground subject"
    ],
    "camera_angle": "front eye-level",
    "framing": "medium full body",
    "cropping": [
      "full subject"
    ],
    "depth": "clear depth",
    "motion_cues": [],
    "motifs": [
      "fitness",
      "sporty theme"
    ],
    "repeated_shapes": [
      "rectangles in tiled floor and windows"
    ],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_hair_001",
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
        "fact_facial_expression_001",
        "fact_hair_001",
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "smiling winking expression"
          ],
          "supporting_observation_ids": [
            "obs_facial_expression_001"
          ],
          "confidence": 0.95
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "front",
          "eyes": "one eye winking, one eye open",
          "mouth": "open, smiling",
          "eyebrows": "neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_facial_expression_001"
          ],
          "confidence": 0.95
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange hair",
          "details": [
            "two side ponytails"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
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
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "left arm bent backward",
            "reaching",
            "standing"
          ],
          "orientation": "forward",
          "action_state": [],
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
        "fact_accessory_001",
        "fact_clothing_001",
        "fact_clothing_002"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "upper body",
          "garment": "blue cropped tank top",
          "neckline_type": "rounded neckline",
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
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands",
          "details": [
            "bands on both wrists"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.96
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
        "obs_clothing_001",
        "obs_clothing_002",
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
        "fact_card_ui_artist_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_number_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_supporter_001",
        "fact_card_ui_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_artist_001"
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
        "female human trainer",
        "orange hair",
        "blue cropped tank top",
        "blue shorts",
        "black wristbands",
        "indoor pool",
        "green leafy plant",
        "metal handrail"
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
      "omission_risk": "medium",
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
      "semantic_fact_id": "sem_fact_001",
      "category": "expression",
      "label": "smiling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_facial_expression_001"
      ],
      "evidence": {
        "mouth": [
          "open",
          "smiling"
        ],
        "eyes": [
          "one eye open",
          "one eye winking"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "face front"
        ],
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
      "confidence": 0.95,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002",
      "category": "scene_type",
      "label": "indoor pool",
      "subject_observation_id": "obs_subject_001",
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
          "indoor pool"
        ],
        "objects": [
          "green leafy plant",
          "metal handrail"
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
      "term": "female human trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "orange hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "blue cropped tank top",
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
      "term": "indoor pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "green leafy plant",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "metal handrail",
      "supporting_observation_ids": [
        "obs_objects_001"
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
        "confidence": 0.97
      },
      {
        "concept": "indoor pool",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "left arm bent backward",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "smiling",
        "source_observation_ids": [
          "obs_facial_expression_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0083236`
- Artwork observations: `13`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. No confident visible fact observations were extracted.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| lightning bolts | lightning bolts | object | foreground | salient | 1 |
| aurora-like colored light bands | aurora-like colored light bands | object | background | salient | 1 |
| dark clouds | dark clouds | object | midground | salient | 1 |
| leafless trees | leafless trees | object | midground | normal | 1 |
| mountain horizon | mountain horizon | object | background | normal | 1 |
| rocky terrain | rocky terrain | object | foreground | normal | 1 |
| palette of green, red, yellow, blue, white, purple | color palette mixture | feature | background and foreground | salient | 1 |
| bright colored lights with glowing effect | glowing colored lights | feature | background | salient | 1 |
| centered lightning with diagonal branches | centered diagonal lightning composition | feature | foreground | salient | 1 |
| aurora bands fanning across sky | aurora bands composition | feature | background | salient | 1 |
| lightning bolts | lightning bolts | layer_elements | foreground | salient | 1 |
| trees and dark clouds | trees and clouds | layer_elements | midground | normal | 1 |
| mountain horizon and aurora light bands | mountain horizon and aurora light bands | layer_elements | background | normal | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_environment_001 | environment | lightning present | obs_lightning_001 | 1 |
| fact_environment_002 | environment | aurora-like colored light bands visible | obs_aurora_001 | 1 |
| fact_environment_003 | environment | dark clouds present | obs_clouds_001 | 1 |
| fact_environment_004 | environment | leafless trees visible | obs_trees_001 | 1 |
| fact_environment_005 | environment | rocky terrain visible | obs_terrain_001 | 1 |
| fact_environment_006 | environment | mountain horizon visible | obs_horizon_001 | 1 |
| fact_environment_007 | color_and_light | card artwork palette includes green, red, yellow, blue, white, purple | obs_colors_001 | 1 |
| fact_environment_008 | color_and_light | bright glowing colored lights and lightning bolts light the scene | obs_light_001, obs_lightning_001 | 1 |
| fact_environment_009 | composition | lightning centered with diagonal branches, aurora bands fanning across sky | obs_composition_001, obs_composition_002 | 1 |
| fact_environment_010 | composition | lightning bolts present in foreground | obs_scene_layer_foreground_001 | 1 |
| fact_environment_011 | composition | trees and dark clouds present in midground | obs_scene_layer_midground_001 | 1 |
| fact_environment_012 | composition | mountain horizon and aurora light bands in background | obs_scene_layer_background_001 | 1 |

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
| lightning bolts | obs_lightning_001 |
| aurora-like colored light bands | obs_aurora_001 |
| dark clouds | obs_clouds_001 |
| color palette mixture | obs_colors_001 |
| glowing colored lights | obs_light_001 |
| centered diagonal lightning composition | obs_composition_001 |
| aurora bands composition | obs_composition_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora-like light bands | obs_aurora_001, obs_composition_002, obs_scene_layer_background_001 | deterministic_rule | 1 |
| centered composition | obs_composition_001 | deterministic_rule | 1 |
| cloud | obs_clouds_001, obs_scene_layer_midground_001 | deterministic_rule | 1 |
| diagonal composition | obs_composition_001 | deterministic_rule | 1 |
| glowing highlights | obs_light_001 | deterministic_rule | 1 |
| lightning | obs_composition_001, obs_lightning_001, obs_scene_layer_foreground_001 | deterministic_rule | 1 |
| terrain | obs_horizon_001, obs_scene_layer_background_001, obs_terrain_001 | deterministic_rule | 1 |
| tree | obs_scene_layer_midground_001, obs_trees_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. No confident visible fact observations were extracted.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_lightning_001",
      "kind": "object",
      "label": "lightning bolts",
      "normalized_label": "lightning bolts",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_aurora_001",
      "kind": "object",
      "label": "aurora-like colored light bands",
      "normalized_label": "aurora-like colored light bands",
      "scene_layer": "background",
      "frame_position": "upper half",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clouds_001",
      "kind": "object",
      "label": "dark clouds",
      "normalized_label": "dark clouds",
      "scene_layer": "midground",
      "frame_position": "upper center to upper left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "object",
      "label": "leafless trees",
      "normalized_label": "leafless trees",
      "scene_layer": "midground",
      "frame_position": "lower right",
      "visibility": "visible",
      "salience": "normal",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_horizon_001",
      "kind": "object",
      "label": "mountain horizon",
      "normalized_label": "mountain horizon",
      "scene_layer": "background",
      "frame_position": "middle horizontal band",
      "visibility": "visible",
      "salience": "normal",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_001",
      "kind": "object",
      "label": "rocky terrain",
      "normalized_label": "rocky terrain",
      "scene_layer": "foreground",
      "frame_position": "bottom area",
      "visibility": "visible",
      "salience": "normal",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_colors_001",
      "kind": "feature",
      "label": "palette of green, red, yellow, blue, white, purple",
      "normalized_label": "color palette mixture",
      "scene_layer": "background and foreground",
      "frame_position": "full image",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_001",
      "kind": "feature",
      "label": "bright colored lights with glowing effect",
      "normalized_label": "glowing colored lights",
      "scene_layer": "background",
      "frame_position": "upper and center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "feature",
      "label": "centered lightning with diagonal branches",
      "normalized_label": "centered diagonal lightning composition",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_002",
      "kind": "feature",
      "label": "aurora bands fanning across sky",
      "normalized_label": "aurora bands composition",
      "scene_layer": "background",
      "frame_position": "upper",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_scene_layer_foreground_001",
      "kind": "layer_elements",
      "label": "lightning bolts",
      "normalized_label": "lightning bolts",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_scene_layer_midground_001",
      "kind": "layer_elements",
      "label": "trees and dark clouds",
      "normalized_label": "trees and clouds",
      "scene_layer": "midground",
      "frame_position": "right and upper left",
      "visibility": "visible",
      "salience": "normal",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_scene_layer_background_001",
      "kind": "layer_elements",
      "label": "mountain horizon and aurora light bands",
      "normalized_label": "mountain horizon and aurora light bands",
      "scene_layer": "background",
      "frame_position": "middle and upper",
      "visibility": "visible",
      "salience": "normal",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "weather",
      "claim": "lightning present",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "sky",
      "claim": "aurora-like colored light bands visible",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_aurora_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "sky",
      "claim": "dark clouds present",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_clouds_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_004",
      "module": "environment",
      "field_path": "plants",
      "claim": "leafless trees visible",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_005",
      "module": "environment",
      "field_path": "terrain",
      "claim": "rocky terrain visible",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_006",
      "module": "environment",
      "field_path": "horizon",
      "claim": "mountain horizon visible",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_horizon_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_007",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "card artwork palette includes green, red, yellow, blue, white, purple",
      "value": "green, red, yellow, blue, white, purple",
      "supporting_observation_ids": [
        "obs_colors_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_008",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "bright glowing colored lights and lightning bolts light the scene",
      "value": "bright colored lights and lightning",
      "supporting_observation_ids": [
        "obs_light_001",
        "obs_lightning_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_009",
      "module": "composition",
      "field_path": "composition",
      "claim": "lightning centered with diagonal branches, aurora bands fanning across sky",
      "value": "centered diagonal lightning; aurora bands",
      "supporting_observation_ids": [
        "obs_composition_001",
        "obs_composition_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_010",
      "module": "composition",
      "field_path": "scene_layers.foreground",
      "claim": "lightning bolts present in foreground",
      "value": "lightning bolts",
      "supporting_observation_ids": [
        "obs_scene_layer_foreground_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_011",
      "module": "composition",
      "field_path": "scene_layers.midground",
      "claim": "trees and dark clouds present in midground",
      "value": "trees, dark clouds",
      "supporting_observation_ids": [
        "obs_scene_layer_midground_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_012",
      "module": "composition",
      "field_path": "scene_layers.background",
      "claim": "mountain horizon and aurora light bands in background",
      "value": "mountain horizon, aurora light bands",
      "supporting_observation_ids": [
        "obs_scene_layer_background_001"
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
    "foreground": [
      "obs_scene_layer_foreground_001"
    ],
    "midground": [
      "obs_scene_layer_midground_001"
    ],
    "background": [
      "obs_scene_layer_background_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "outdoor",
    "sky": [
      "aurora-like colored light bands",
      "dark clouds"
    ],
    "ground": [
      "rocky terrain"
    ],
    "terrain": [
      "rocky terrain"
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
      "obs_aurora_001",
      "obs_clouds_001",
      "obs_horizon_001",
      "obs_lightning_001",
      "obs_terrain_001",
      "obs_trees_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "green",
      "purple",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright colored lights",
      "glowing light effects",
      "lightning bolts"
    ],
    "shadows": [],
    "highlights": [
      "bright glowing light highlights"
    ],
    "composition": [
      "aurora bands fanning across sky",
      "centered diagonal lightning"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing on artwork scene",
    "cropping": [],
    "depth": "layered foreground to background depth",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [
      "lightning bolts"
    ],
    "style_cues": [
      "stylized aurora and lightning effects"
    ],
    "supporting_observation_ids": [
      "obs_colors_001",
      "obs_composition_001",
      "obs_composition_002",
      "obs_light_001",
      "obs_lightning_001"
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
        "fact_environment_001",
        "fact_environment_002",
        "fact_environment_003",
        "fact_environment_004",
        "fact_environment_005",
        "fact_environment_006"
      ],
      "observation_ids": [
        "obs_aurora_001",
        "obs_clouds_001",
        "obs_horizon_001",
        "obs_lightning_001",
        "obs_terrain_001",
        "obs_trees_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_environment_009",
        "fact_environment_010",
        "fact_environment_011",
        "fact_environment_012"
      ],
      "observation_ids": [
        "obs_composition_001",
        "obs_composition_002",
        "obs_scene_layer_background_001",
        "obs_scene_layer_foreground_001",
        "obs_scene_layer_midground_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_environment_007",
        "fact_environment_008"
      ],
      "observation_ids": [
        "obs_colors_001",
        "obs_light_001",
        "obs_lightning_001"
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
        "lightning bolts",
        "aurora-like colored light bands",
        "dark clouds",
        "color palette mixture",
        "glowing colored lights",
        "centered diagonal lightning composition",
        "aurora bands composition"
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
      "term": "lightning bolts",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ]
    },
    {
      "term": "aurora-like colored light bands",
      "supporting_observation_ids": [
        "obs_aurora_001"
      ]
    },
    {
      "term": "dark clouds",
      "supporting_observation_ids": [
        "obs_clouds_001"
      ]
    },
    {
      "term": "color palette mixture",
      "supporting_observation_ids": [
        "obs_colors_001"
      ]
    },
    {
      "term": "glowing colored lights",
      "supporting_observation_ids": [
        "obs_light_001"
      ]
    },
    {
      "term": "centered diagonal lightning composition",
      "supporting_observation_ids": [
        "obs_composition_001"
      ]
    },
    {
      "term": "aurora bands composition",
      "supporting_observation_ids": [
        "obs_composition_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_aurora_001",
          "obs_composition_002",
          "obs_scene_layer_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_clouds_001",
          "obs_scene_layer_midground_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_light_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_composition_001",
          "obs_lightning_001",
          "obs_scene_layer_foreground_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_horizon_001",
          "obs_scene_layer_background_001",
          "obs_terrain_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_scene_layer_midground_001",
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

### GV-PK-JPN-PMCG6-085 - Cinnabar City Gym

- Branch: `stadium`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.009114`
- Artwork observations: `8`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. No confident visible fact observations were extracted.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| raised platform | platform | object | midground | salient | 1 |
| red and black pattern on platform | pattern on platform | object | midground | salient | 1 |
| white circle with black outline and black symbol inside on platform | platform symbol | object | midground | salient | 0.95 |
| lava terrain | lava | environment | background | salient | 1 |
| lava flow from above | lava flow | environment | background | salient | 1 |
| orange glow from lava | lava glow | visual_effects | background | salient | 0.98 |
| steam or smoke near lava surface | steam | visual_effects | midground | salient | 0.85 |
| woodgrain textured wall or backdrop | woodgrain wall | object | background | salient | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| TRAINER text at top center | card_ui_text | top center | visible | 1 |
| Japanese text below trainer header | card_ui_text | top mid | visible | 1 |
| small vertical Japanese text on top right | card_ui_text | top right | visible | 0.97 |
| Japanese text paragraph in lower half | card_ui_text | bottom center | visible | 0.95 |
| fighting energy symbol near text paragraph | card_ui_symbol | bottom left of paragraph | visible | 0.9 |
| copyright text bottom | copyright_text | bottom edge center | visible | 0.9 |
| set symbol bottom right | set_symbol | bottom right | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_lava_flow_001, obs_lava_terrain_001, obs_stadium_frame_001, obs_stadium_platform_001 | 1 |
| fact_env_002 | environment | terrain | obs_lava_flow_001, obs_lava_glow_001, obs_lava_terrain_001 | 1 |
| fact_env_003 | environment | architecture | obs_platform_pattern_001, obs_platform_poster_001, obs_stadium_platform_001 | 1 |
| fact_env_004 | environment | visual effect | obs_steam_001 | 0.85 |
| fact_env_005 | environment | background structure | obs_stadium_frame_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card title text | obs_card_ui_text_trainer_001 | 1 |
| fact_card_ui_002 | Japanese text below trainer header | obs_card_ui_text_japanese_001 | 1 |
| fact_card_ui_003 | small vertical Japanese text | obs_card_ui_text_japanese_right_001 | 0.97 |
| fact_card_ui_004 | Japanese paragraph text | obs_card_ui_text_japanese_paragraph_001 | 0.95 |
| fact_card_ui_005 | energy symbol | obs_card_ui_symbol_energy_001 | 0.9 |
| fact_card_ui_006 | copyright text visible | obs_card_ui_symbol_copyright_001 | 0.9 |
| fact_card_ui_007 | set symbol visible | obs_card_ui_symbol_set_001 | 0.9 |

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
    "obs_card_ui_text_trainer_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [
    "obs_card_ui_symbol_set_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_symbol_copyright_001"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_symbol_energy_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_text_japanese_001",
    "obs_card_ui_text_japanese_paragraph_001",
    "obs_card_ui_text_japanese_right_001"
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | complete | low | medium |  |
| card_ui_and_print_markers | complete | low | high |  |
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
| volcanic lava stadium | obs_lava_terrain_001, obs_stadium_platform_001 |
| red and black platform | obs_platform_pattern_001, obs_stadium_platform_001 |
| steam near lava | obs_steam_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| glowing highlights | obs_lava_glow_001, obs_steam_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. No confident visible fact observations were extracted.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_platform_001",
      "kind": "object",
      "label": "raised platform",
      "normalized_label": "platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_platform_pattern_001",
      "kind": "object",
      "label": "red and black pattern on platform",
      "normalized_label": "pattern on platform",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_platform_poster_001",
      "kind": "object",
      "label": "white circle with black outline and black symbol inside on platform",
      "normalized_label": "platform symbol",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lava_terrain_001",
      "kind": "environment",
      "label": "lava terrain",
      "normalized_label": "lava",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lava_flow_001",
      "kind": "environment",
      "label": "lava flow from above",
      "normalized_label": "lava flow",
      "scene_layer": "background",
      "frame_position": "above platform center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lava_glow_001",
      "kind": "visual_effects",
      "label": "orange glow from lava",
      "normalized_label": "lava glow",
      "scene_layer": "background",
      "frame_position": "entire background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_steam_001",
      "kind": "visual_effects",
      "label": "steam or smoke near lava surface",
      "normalized_label": "steam",
      "scene_layer": "midground",
      "frame_position": "near lava and platform",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_stadium_frame_001",
      "kind": "object",
      "label": "woodgrain textured wall or backdrop",
      "normalized_label": "woodgrain wall",
      "scene_layer": "background",
      "frame_position": "behind platform",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_trainer_001",
      "kind": "card_ui_text",
      "label": "TRAINER text at top center",
      "normalized_label": "trainer text",
      "scene_layer": "foreground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_001",
      "kind": "card_ui_text",
      "label": "Japanese text below trainer header",
      "normalized_label": "Japanese text",
      "scene_layer": "foreground",
      "frame_position": "top mid",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_right_001",
      "kind": "card_ui_text",
      "label": "small vertical Japanese text on top right",
      "normalized_label": "small Japanese text top right",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_paragraph_001",
      "kind": "card_ui_text",
      "label": "Japanese text paragraph in lower half",
      "normalized_label": "Japanese paragraph text",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_energy_001",
      "kind": "card_ui_symbol",
      "label": "fighting energy symbol near text paragraph",
      "normalized_label": "energy symbol",
      "scene_layer": "foreground",
      "frame_position": "bottom left of paragraph",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_symbol_copyright_001",
      "kind": "copyright_text",
      "label": "copyright text bottom",
      "normalized_label": "copyright",
      "scene_layer": "foreground",
      "frame_position": "bottom edge center",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_card_ui_symbol_set_001",
      "kind": "set_symbol",
      "label": "set symbol bottom right",
      "normalized_label": "set symbol",
      "scene_layer": "foreground",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "volcanic lava stadium with platform",
      "supporting_observation_ids": [
        "obs_lava_flow_001",
        "obs_lava_terrain_001",
        "obs_stadium_frame_001",
        "obs_stadium_platform_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain",
      "value": "lava and molten rock",
      "supporting_observation_ids": [
        "obs_lava_flow_001",
        "obs_lava_glow_001",
        "obs_lava_terrain_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "architecture",
      "claim": "architecture",
      "value": "raised patterned platform with symbol",
      "supporting_observation_ids": [
        "obs_platform_pattern_001",
        "obs_platform_poster_001",
        "obs_stadium_platform_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "visual_effects",
      "claim": "visual effect",
      "value": "steam or smoke near lava",
      "supporting_observation_ids": [
        "obs_steam_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "background_structure",
      "claim": "background structure",
      "value": "woodgrain textured wall",
      "supporting_observation_ids": [
        "obs_stadium_frame_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card title text",
      "value": "TRAINER",
      "supporting_observation_ids": [
        "obs_card_ui_text_trainer_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "Japanese text below trainer header",
      "value": "visible text in Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "small vertical Japanese text",
      "value": "visible text in Japanese top right",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_right_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "other_print_marker",
      "claim": "Japanese paragraph text",
      "value": "visible text paragraph in lower half",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_paragraph_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "energy symbol",
      "value": "fighting energy symbol near text paragraph",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_energy_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text visible",
      "value": "copyright text bottom center visible",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_copyright_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "fact_id": "fact_card_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "set symbol bottom right visible",
      "supporting_observation_ids": [
        "obs_card_ui_symbol_set_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_card_ui_symbol_copyright_001",
      "obs_card_ui_symbol_energy_001",
      "obs_card_ui_symbol_set_001",
      "obs_card_ui_text_japanese_001",
      "obs_card_ui_text_japanese_paragraph_001",
      "obs_card_ui_text_japanese_right_001",
      "obs_card_ui_text_trainer_001"
    ],
    "midground": [
      "obs_stadium_platform_001",
      "obs_steam_001"
    ],
    "background": [
      "obs_lava_flow_001",
      "obs_lava_glow_001",
      "obs_lava_terrain_001",
      "obs_platform_pattern_001",
      "obs_platform_poster_001",
      "obs_stadium_frame_001"
    ]
  },
  "environment": {
    "setting": [
      "volcanic lava stadium"
    ],
    "indoor_outdoor": "uncertain",
    "sky": [],
    "ground": [
      "lava"
    ],
    "terrain": [
      "lava",
      "molten rock"
    ],
    "plants": [],
    "architecture": [
      "raised platform",
      "woodgrain textured wall"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_lava_flow_001",
      "obs_lava_terrain_001",
      "obs_platform_pattern_001",
      "obs_platform_poster_001",
      "obs_stadium_frame_001",
      "obs_stadium_platform_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_stadium_platform_001",
      "label": "raised platform",
      "normalized_label": "platform",
      "object_type": "structure",
      "colors": [
        "black",
        "red",
        "white"
      ],
      "material_appearance": [
        "smooth surface"
      ],
      "location": "midground",
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
      "white",
      "yellow"
    ],
    "lighting": [
      "bright orange glowing from lava"
    ],
    "shadows": [
      "shadow under platform"
    ],
    "highlights": [
      "glowing highlights on lava surface"
    ],
    "composition": [
      "background lava",
      "centered platform"
    ],
    "camera_angle": "slightly above eye level",
    "framing": "tight on platform and lava",
    "cropping": [
      "whole card composition"
    ],
    "depth": "moderate depth with foreground card UI and midground platform and background lava",
    "motion_cues": [
      "visible lava flow from above"
    ],
    "motifs": [
      "circular symbol on platform"
    ],
    "repeated_shapes": [
      "patterned motif on platform surface"
    ],
    "style_cues": [
      "painterly style"
    ],
    "supporting_observation_ids": [
      "obs_lava_flow_001",
      "obs_lava_glow_001",
      "obs_lava_terrain_001",
      "obs_platform_pattern_001",
      "obs_stadium_frame_001",
      "obs_stadium_platform_001",
      "obs_steam_001"
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
        "fact_env_001"
      ],
      "object_observation_ids": [
        "obs_stadium_platform_001"
      ]
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
        "obs_lava_flow_001",
        "obs_lava_glow_001",
        "obs_lava_terrain_001",
        "obs_platform_pattern_001",
        "obs_platform_poster_001",
        "obs_stadium_frame_001",
        "obs_stadium_platform_001",
        "obs_steam_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_lava_terrain_001",
        "obs_platform_pattern_001",
        "obs_stadium_platform_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_lava_glow_001",
        "obs_stadium_platform_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_env_004"
      ],
      "observation_ids": [
        "obs_steam_001"
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
        "obs_card_ui_text_trainer_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [
        "obs_card_ui_symbol_set_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_symbol_copyright_001"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_symbol_energy_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_text_japanese_001",
        "obs_card_ui_text_japanese_paragraph_001",
        "obs_card_ui_text_japanese_right_001"
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
        "volcanic lava stadium",
        "red and black platform",
        "steam near lava"
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
      "term": "volcanic lava stadium",
      "supporting_observation_ids": [
        "obs_lava_terrain_001",
        "obs_stadium_platform_001"
      ]
    },
    {
      "term": "red and black platform",
      "supporting_observation_ids": [
        "obs_platform_pattern_001",
        "obs_stadium_platform_001"
      ]
    },
    {
      "term": "steam near lava",
      "supporting_observation_ids": [
        "obs_steam_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_lava_glow_001",
          "obs_steam_001"
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
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0070172`
- Artwork observations: `11`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Counts: palm trees: 4-8.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| blue sky with light clouds | blue sky and light clouds | sky | background | salient | 0.98 |
| diagonal purple and blue light bands | purple and blue light bands | light_bands | background | moderate | 0.95 |
| diagonal purple and blue light bands | purple and blue light bands | light_bands | background | moderate | 0.95 |
| group of palm trees on right side | palm trees | tree_group | midground | salient | 0.98 |
| group of palm trees on left side | palm trees | tree_group | midground | salient | 0.98 |
| sandy ground with rocks and gravel | sandy rocky terrain | terrain | foreground | salient | 0.99 |
| green grass patch in center | grass patch | terrain | midground | salient | 0.99 |
| wooden fence behind grass patch | wooden fence | architecture | midground | moderate | 0.95 |
| circular symbol in grass patch center | circular symbol | object | midground | salient | 0.96 |
| stone steps in front of grass patch | stone steps | object | foreground | moderate | 0.98 |
| white clouds scattered in sky | white clouds | clouds | background | moderate | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | sky color and features | obs_clouds_001, obs_sky_001 | 0.98 |
| fact_env_002 | environment | presence of purple and blue diagonal light bands in sky | obs_light_bands_001, obs_light_bands_002 | 0.95 |
| fact_env_003 | environment | presence of palm trees on left and right sides | obs_trees_001, obs_trees_002 | 0.98 |
| fact_env_004 | environment | ground terrain characteristics | obs_terrain_001 | 0.99 |
| fact_env_005 | environment | presence of green grass patch centrally located | obs_terrain_002 | 0.99 |
| fact_env_006 | environment | presence of a wooden fence behind grass patch | obs_architecture_001 | 0.95 |
| fact_env_007 | objects_and_props | presence of circular symbol in grass patch center | obs_object_001 | 0.96 |
| fact_env_008 | objects_and_props | presence of stone steps in front of grass patch | obs_object_002 | 0.98 |

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
| relationships | complete | low | high |  |
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
| palm trees | estimated_range | 4-8 | obs_trees_001, obs_trees_002 | 0.9 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| contains symbol in patch | obs_terrain_002 | obs_object_001 | strong |
| contains stone steps in foreground | obs_terrain_001 | obs_object_002 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| blue sky and light clouds | obs_sky_001 |
| purple and blue light bands | obs_light_bands_001 |
| palm trees | obs_trees_001 |
| sandy rocky terrain | obs_terrain_001 |
| grass patch | obs_terrain_002 |
| wooden fence | obs_architecture_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| aurora-like light bands | obs_light_bands_001, obs_light_bands_002 | deterministic_rule | 0.95 |
| building | obs_architecture_001 | deterministic_rule | 0.95 |
| centered composition | obs_object_001, obs_terrain_002 | deterministic_rule | 0.92 |
| circular motif | obs_object_001 | deterministic_rule | 0.96 |
| cloud | obs_clouds_001, obs_sky_001 | deterministic_rule | 0.98 |
| fence | obs_architecture_001 | deterministic_rule | 0.95 |
| right orientation | obs_trees_001, obs_trees_002 | deterministic_rule | 0.92 |
| sky | obs_sky_001 | deterministic_rule | 0.98 |
| stairs | obs_object_002 | deterministic_rule | 0.98 |
| terrain | obs_terrain_001, obs_terrain_002 | deterministic_rule | 0.99 |
| tree | obs_trees_001, obs_trees_002 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: palm trees: 4-8.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "blue sky with light clouds",
      "normalized_label": "blue sky and light clouds",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_bands_001",
      "kind": "light_bands",
      "label": "diagonal purple and blue light bands",
      "normalized_label": "purple and blue light bands",
      "scene_layer": "background",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_bands_002",
      "kind": "light_bands",
      "label": "diagonal purple and blue light bands",
      "normalized_label": "purple and blue light bands",
      "scene_layer": "background",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "tree_group",
      "label": "group of palm trees on right side",
      "normalized_label": "palm trees",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_002",
      "kind": "tree_group",
      "label": "group of palm trees on left side",
      "normalized_label": "palm trees",
      "scene_layer": "midground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_001",
      "kind": "terrain",
      "label": "sandy ground with rocks and gravel",
      "normalized_label": "sandy rocky terrain",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_002",
      "kind": "terrain",
      "label": "green grass patch in center",
      "normalized_label": "grass patch",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_architecture_001",
      "kind": "architecture",
      "label": "wooden fence behind grass patch",
      "normalized_label": "wooden fence",
      "scene_layer": "midground",
      "frame_position": "center back",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "circular symbol in grass patch center",
      "normalized_label": "circular symbol",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "stone steps in front of grass patch",
      "normalized_label": "stone steps",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clouds_001",
      "kind": "clouds",
      "label": "white clouds scattered in sky",
      "normalized_label": "white clouds",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky color and features",
      "value": "blue sky with white clouds",
      "supporting_observation_ids": [
        "obs_clouds_001",
        "obs_sky_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "light_bands",
      "claim": "presence of purple and blue diagonal light bands in sky",
      "value": "yes",
      "supporting_observation_ids": [
        "obs_light_bands_001",
        "obs_light_bands_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "trees",
      "claim": "presence of palm trees on left and right sides",
      "value": "palm trees on both sides",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "terrain",
      "claim": "ground terrain characteristics",
      "value": "sandy ground with rocks and gravel",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "terrain",
      "claim": "presence of green grass patch centrally located",
      "value": "central green grass patch",
      "supporting_observation_ids": [
        "obs_terrain_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "architecture",
      "claim": "presence of a wooden fence behind grass patch",
      "value": "wooden fence",
      "supporting_observation_ids": [
        "obs_architecture_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "objects_and_props",
      "field_path": "object",
      "claim": "presence of circular symbol in grass patch center",
      "value": "circular symbol",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "objects_and_props",
      "field_path": "object",
      "claim": "presence of stone steps in front of grass patch",
      "value": "stone steps",
      "supporting_observation_ids": [
        "obs_object_002"
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
      "count_id": "count_trees_001",
      "normalized_label": "palm trees",
      "count_type": "estimated_range",
      "exact_count": 0,
      "estimated_min": 4,
      "estimated_max": 8,
      "abstention_reason": "count estimated due to grouping and partial occlusion",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ],
      "scene_layer": "midground",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_object_002",
      "obs_terrain_001"
    ],
    "midground": [
      "obs_architecture_001",
      "obs_object_001",
      "obs_terrain_002",
      "obs_trees_001",
      "obs_trees_002"
    ],
    "background": [
      "obs_clouds_001",
      "obs_light_bands_001",
      "obs_light_bands_002",
      "obs_sky_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor open area"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "white clouds"
    ],
    "ground": [
      "grass patch",
      "sandy ground"
    ],
    "terrain": [
      "grass",
      "rocky",
      "sand"
    ],
    "plants": [
      "palm trees"
    ],
    "architecture": [
      "wooden fence"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_architecture_001",
      "obs_clouds_001",
      "obs_light_bands_001",
      "obs_light_bands_002",
      "obs_sky_001",
      "obs_terrain_001",
      "obs_terrain_002",
      "obs_trees_001",
      "obs_trees_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "circular symbol",
      "normalized_label": "circular symbol",
      "object_type": "symbol",
      "colors": [
        "black"
      ],
      "material_appearance": [],
      "location": "center of grass patch",
      "count_reference": "count_symbol_001",
      "confidence": 0.96
    },
    {
      "observation_id": "obs_object_002",
      "label": "stone steps",
      "normalized_label": "stone steps",
      "object_type": "steps",
      "colors": [
        "gray"
      ],
      "material_appearance": [
        "rocky"
      ],
      "location": "below grass patch",
      "count_reference": "count_steps_001",
      "confidence": 0.98
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_terrain_002",
      "target_observation_id": "obs_object_001",
      "relationship": "contains symbol in patch",
      "evidence_strength": "strong"
    },
    {
      "relationship_id": "rel_002",
      "source_observation_id": "obs_terrain_001",
      "target_observation_id": "obs_object_002",
      "relationship": "contains stone steps in foreground",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "gray",
      "green",
      "purple"
    ],
    "lighting": [
      "bright daylight lighting",
      "soft shadows"
    ],
    "shadows": [
      "soft shadows cast by trees and objects"
    ],
    "highlights": [
      "moderate highlights on leaves and steps"
    ],
    "composition": [
      "central grass patch as visual focus",
      "horizon line near upper third",
      "symmetrical palm tree framing left and right"
    ],
    "camera_angle": "eye level angle, straight on",
    "framing": "centered on terrain patch",
    "cropping": [
      "complete card border visible"
    ],
    "depth": "moderate depth with foreground, midground, and background",
    "motion_cues": [],
    "motifs": [
      "circular symbol motif at center"
    ],
    "repeated_shapes": [
      "palm leaves repeated on both sides"
    ],
    "style_cues": [
      "realistic illustration style with painterly textures"
    ],
    "supporting_observation_ids": [
      "obs_light_bands_001",
      "obs_light_bands_002",
      "obs_object_001",
      "obs_object_002",
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
        "fact_env_007",
        "fact_env_008"
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
        "fact_env_006"
      ],
      "observation_ids": [
        "obs_architecture_001",
        "obs_clouds_001",
        "obs_light_bands_001",
        "obs_light_bands_002",
        "obs_sky_001",
        "obs_terrain_001",
        "obs_terrain_002",
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
      "fact_ids": [
        "fact_env_007",
        "fact_env_008"
      ],
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
      "fact_ids": [],
      "terms": [
        "blue sky and light clouds",
        "purple and blue light bands",
        "palm trees",
        "sandy rocky terrain",
        "grass patch",
        "wooden fence"
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
      "term": "blue sky and light clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "purple and blue light bands",
      "supporting_observation_ids": [
        "obs_light_bands_001"
      ]
    },
    {
      "term": "palm trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "sandy rocky terrain",
      "supporting_observation_ids": [
        "obs_terrain_001"
      ]
    },
    {
      "term": "grass patch",
      "supporting_observation_ids": [
        "obs_terrain_002"
      ]
    },
    {
      "term": "wooden fence",
      "supporting_observation_ids": [
        "obs_architecture_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "aurora-like light bands",
        "source_observation_ids": [
          "obs_light_bands_001",
          "obs_light_bands_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_architecture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_object_001",
          "obs_terrain_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_clouds_001",
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "fence",
        "source_observation_ids": [
          "obs_architecture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_trees_001",
          "obs_trees_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
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
        "concept": "stairs",
        "source_observation_ids": [
          "obs_object_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
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
        "confidence": 0.98
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
- Cost USD: `0.0098844`
- Artwork observations: `9`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | salient | 0.95 |
| bomb body | bomb body | object | foreground | salient | 0.95 |
| dark black color | color black | color_and_light | foreground | salient | 0.95 |
| octagonal prism shape with segmented panels | octagonal prism | composition | foreground | salient | 0.95 |
| yellow and white diagonal stripes on bomb body | yellow and white diagonal stripes | object | foreground | salient | 0.9 |
| red fuse with spark | red fuse with spark | object | foreground | salient | 0.95 |
| bright spark at fuse tip | bright spark | visual_effects | foreground | salient | 0.95 |
| black attachment at fuse base | black fuse attachment | object | foreground | salient | 0.9 |
| blue and orange explosive burst background | explosive burst background | environment | background | salient | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top | visible | 0.9 |
| top band text in Japanese | card_ui_text | top | visible | 0.85 |
| text box with Japanese text for card effect | card_ui_text | bottom center | visible | 0.9 |
| lower pink box with Japanese text | card_ui_text | bottom center | visible | 0.9 |
| illustrator text: Illus. Inose Yukie | illustrator_text | bottom left | visible | 0.9 |
| set icon: J M5 | set_symbol | bottom left | visible | 0.9 |
| collector number 106/081 SR | collector_number | bottom left | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_bomb_001 | objects_and_props | object present | obs_bomb_001 | 0.95 |
| fact_bomb_body_shape_001 | objects_and_props | shape of bomb body | obs_bomb_body_shape_001 | 0.95 |
| fact_bomb_body_color_001 | objects_and_props | color of bomb body | obs_bomb_body_color_001 | 0.95 |
| fact_bomb_body_stripes_001 | objects_and_props | color and pattern on bomb body | obs_bomb_stripe_001 | 0.9 |
| fact_bomb_fuse_001 | objects_and_props | bomb fuse | obs_bomb_fuse_001, obs_bomb_fuse_spark_001 | 0.95 |
| fact_bomb_fuse_attachment_001 | objects_and_props | fuse attachment | obs_bomb_fuse_attachment_001 | 0.9 |
| fact_environment_001 | environment | background burst colors | obs_bomb_background_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text visible | obs_card_ui_name_text_001 | 0.9 |
| fact_card_ui_top_band_text_001 | top band Japanese text visible | obs_card_ui_top_band_text_001 | 0.85 |
| fact_card_ui_effect_text_001 | effect text box visible with Japanese text | obs_card_ui_textbox_001 | 0.9 |
| fact_card_ui_lower_box_text_001 | lower pink box with Japanese text | obs_card_ui_bottom_box_001 | 0.9 |
| fact_card_ui_illustrator_text_001 | illustrator text visible | obs_card_ui_illustrator_text_001 | 0.9 |
| fact_card_ui_set_icon_001 | set icon visible | obs_card_ui_set_icon_001 | 0.9 |
| fact_card_ui_collector_number_001 | collector number visible | obs_card_ui_number_text_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_number_001",
    "fact_card_ui_effect_text_001",
    "fact_card_ui_illustrator_text_001",
    "fact_card_ui_lower_box_text_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_set_icon_001",
    "fact_card_ui_top_band_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_number_text_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_icon_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_box_001",
    "obs_card_ui_textbox_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_text_001"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": [
    "obs_card_ui_top_band_text_001"
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
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
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
| bomb | exact | 1 | obs_bomb_001 | 0.95 |

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
| octagonal prism | obs_bomb_body_shape_001 |
| yellow diagonal stripes | obs_bomb_stripe_001 |
| red fuse | obs_bomb_fuse_001 |
| bright spark | obs_bomb_fuse_spark_001 |
| explosive burst background | obs_bomb_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| diagonal composition | obs_bomb_stripe_001 | deterministic_rule | 0.9 |
| explosion | obs_bomb_background_001 | deterministic_rule | 0.92 |
| spark | obs_bomb_fuse_001, obs_bomb_fuse_spark_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: bomb: 1.
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
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_001",
      "kind": "object",
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_color_001",
      "kind": "color_and_light",
      "label": "dark black color",
      "normalized_label": "color black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_shape_001",
      "kind": "composition",
      "label": "octagonal prism shape with segmented panels",
      "normalized_label": "octagonal prism",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_stripe_001",
      "kind": "object",
      "label": "yellow and white diagonal stripes on bomb body",
      "normalized_label": "yellow and white diagonal stripes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "kind": "object",
      "label": "red fuse with spark",
      "normalized_label": "red fuse with spark",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_spark_001",
      "kind": "visual_effects",
      "label": "bright spark at fuse tip",
      "normalized_label": "bright spark",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_attachment_001",
      "kind": "object",
      "label": "black attachment at fuse base",
      "normalized_label": "black fuse attachment",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_background_001",
      "kind": "environment",
      "label": "blue and orange explosive burst background",
      "normalized_label": "explosive burst background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_band_text_001",
      "kind": "card_ui_text",
      "label": "top band text in Japanese",
      "normalized_label": "top band text",
      "scene_layer": "interface",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_textbox_001",
      "kind": "card_ui_text",
      "label": "text box with Japanese text for card effect",
      "normalized_label": "effect text box",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_box_001",
      "kind": "card_ui_text",
      "label": "lower pink box with Japanese text",
      "normalized_label": "lower pink text box",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator text: Illus. Inose Yukie",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_icon_001",
      "kind": "set_symbol",
      "label": "set icon: J M5",
      "normalized_label": "set symbol",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_text_001",
      "kind": "collector_number",
      "label": "collector number 106/081 SR",
      "normalized_label": "collector number",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_bomb_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.observations[obs_bomb_001]",
      "claim": "object present",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_body_shape_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.observations[obs_bomb_body_shape_001]",
      "claim": "shape of bomb body",
      "value": "octagonal prism with segmented panels",
      "supporting_observation_ids": [
        "obs_bomb_body_shape_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_body_color_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.observations[obs_bomb_body_color_001]",
      "claim": "color of bomb body",
      "value": "dark black",
      "supporting_observation_ids": [
        "obs_bomb_body_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_body_stripes_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.observations[obs_bomb_stripe_001]",
      "claim": "color and pattern on bomb body",
      "value": "yellow and white diagonal stripes",
      "supporting_observation_ids": [
        "obs_bomb_stripe_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_fuse_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.observations[obs_bomb_fuse_001]",
      "claim": "bomb fuse",
      "value": "red fuse with spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_fuse_spark_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bomb_fuse_attachment_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props.observations[obs_bomb_fuse_attachment_001]",
      "claim": "fuse attachment",
      "value": "black attachment at fuse base",
      "supporting_observation_ids": [
        "obs_bomb_fuse_attachment_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "environment.background",
      "claim": "background burst colors",
      "value": "blue and orange explosive burst",
      "supporting_observation_ids": [
        "obs_bomb_background_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.name_text_observation_ids",
      "claim": "card name text visible",
      "value": "Japanese text in top area",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_top_band_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.other_print_marker_observation_ids",
      "claim": "top band Japanese text visible",
      "value": "text in top banner area",
      "supporting_observation_ids": [
        "obs_card_ui_top_band_text_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_effect_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.bottom_line_text_observation_ids",
      "claim": "effect text box visible with Japanese text",
      "value": "text box in center bottom",
      "supporting_observation_ids": [
        "obs_card_ui_textbox_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_lower_box_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.bottom_line_text_observation_ids",
      "claim": "lower pink box with Japanese text",
      "value": "pink text box in lower center",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_box_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.illustrator_text_observation_ids",
      "claim": "illustrator text visible",
      "value": "Illus. Inose Yukie",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_icon_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.set_symbol_observation_ids",
      "claim": "set icon visible",
      "value": "J M5 set symbol",
      "supporting_observation_ids": [
        "obs_card_ui_set_icon_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_and_print_markers.collector_number_observation_ids",
      "claim": "collector number visible",
      "value": "106/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_number_text_001"
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
        "obs_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_bomb_001",
      "obs_bomb_body_001",
      "obs_bomb_body_color_001",
      "obs_bomb_body_shape_001",
      "obs_bomb_fuse_001",
      "obs_bomb_fuse_attachment_001",
      "obs_bomb_fuse_spark_001",
      "obs_bomb_stripe_001"
    ],
    "midground": [],
    "background": [
      "obs_bomb_background_001"
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
      "obs_bomb_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "tool",
      "colors": [
        "black",
        "red",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "bright spark",
        "dark rounded surface"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
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
      "white",
      "yellow"
    ],
    "lighting": [
      "bright spark on fuse",
      "highlight on bomb body"
    ],
    "shadows": [
      "shading on bomb panels"
    ],
    "highlights": [
      "white highlight on panels"
    ],
    "composition": [
      "centered bomb",
      "explosive burst background"
    ],
    "camera_angle": "frontal",
    "framing": "medium close-up",
    "cropping": [],
    "depth": "shallow",
    "motion_cues": [
      "spark brightness suggesting ignition"
    ],
    "motifs": [
      "explosive burst"
    ],
    "repeated_shapes": [
      "segment panels on bomb body"
    ],
    "style_cues": [
      "bright colors",
      "cartoon style"
    ],
    "supporting_observation_ids": [
      "obs_bomb_001",
      "obs_bomb_background_001",
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
        "fact_bomb_001",
        "fact_bomb_body_color_001",
        "fact_bomb_body_shape_001",
        "fact_bomb_body_stripes_001",
        "fact_bomb_fuse_001",
        "fact_bomb_fuse_attachment_001"
      ],
      "object_observation_ids": [
        "obs_bomb_001",
        "obs_bomb_body_color_001",
        "obs_bomb_body_shape_001",
        "obs_bomb_fuse_001",
        "obs_bomb_fuse_attachment_001",
        "obs_bomb_stripe_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_bomb_background_001"
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
        "obs_bomb_fuse_spark_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_collector_number_001",
        "fact_card_ui_effect_text_001",
        "fact_card_ui_illustrator_text_001",
        "fact_card_ui_lower_box_text_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_set_icon_001",
        "fact_card_ui_top_band_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_number_text_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_icon_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_box_001",
        "obs_card_ui_textbox_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": [
        "obs_card_ui_top_band_text_001"
      ]
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
        "octagonal prism",
        "yellow diagonal stripes",
        "red fuse",
        "bright spark",
        "explosive burst background"
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    },
    {
      "term": "octagonal prism",
      "supporting_observation_ids": [
        "obs_bomb_body_shape_001"
      ]
    },
    {
      "term": "yellow diagonal stripes",
      "supporting_observation_ids": [
        "obs_bomb_stripe_001"
      ]
    },
    {
      "term": "red fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001"
      ]
    },
    {
      "term": "bright spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_spark_001"
      ]
    },
    {
      "term": "explosive burst background",
      "supporting_observation_ids": [
        "obs_bomb_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_bomb_stripe_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_bomb_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_bomb_fuse_001",
          "obs_bomb_fuse_spark_001"
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
- Cost USD: `0.0092724`
- Artwork observations: `7`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark bell | dark bell | object | foreground | salient | 0.99 |
| dark bell body | dark bell body | object | foreground | salient | 0.98 |
| dark bell handle | dark bell handle | object | foreground | salient | 0.97 |
| glowing sphere inside dark bell | glowing sphere inside dark bell | object | foreground | salient | 0.96 |
| swirling vortex | swirling vortex | abstract_background | background | background | 0.94 |
| black with white outlines | black, white | color | foreground | salient | 0.95 |
| blue and purple gradient | blue, purple | color | background | background | 0.93 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| カード名名：ダークベル | card_ui_text | top left | visible | 0.95 |
| カードカテゴリー：グッズ | card_ui_text | top left | visible | 0.94 |
| カードタイプ：トレーナーズ | card_ui_text | top right | visible | 0.94 |
| illustrator name: Toyste Beach | illustrator_text | bottom left | visible | 0.96 |
| set code: J M5 number: 105/081 SR | set_symbol_and_number | bottom left | visible | 0.96 |
| copyright text: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK | copyright_text | bottom center | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_count_dark_bell_001 | counts | exact count of dark bell object | obs_object_dark_bell_001 | 0.99 |
| fact_object_dark_bell_material_color_001 | objects_and_props | dark bell color observed | obs_color_dark_bell_colors_001, obs_object_dark_bell_001 | 0.97 |
| fact_object_dark_bell_handle_001 | objects_and_props | dark bell has a handle section | obs_object_dark_bell_handle_001 | 0.95 |
| fact_object_dark_bell_inner_glow_001 | objects_and_props | dark bell contains glowing sphere inside | obs_object_dark_bell_inner_glowing_sphere_001 | 0.96 |
| fact_environment_background_001 | environment | background is swirling vortex | obs_background_vortex_001 | 0.94 |
| fact_environment_background_colors_001 | color_and_light | background colors observed | obs_color_background_gradient_001 | 0.94 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text visible in Japanese | obs_card_ui_name_text_japanese_001 | 0.95 |
| fact_card_ui_type_text_001 | card type text visible in Japanese as トレーナーズ | obs_card_ui_type_trainer_japanese_001 | 0.94 |
| fact_card_ui_category_goods_text_001 | card category text visible in Japanese as グッズ | obs_card_ui_category_goods_japanese_001 | 0.94 |
| fact_card_ui_artist_text_001 | illustrator text visible | obs_card_ui_artist_name_001 | 0.96 |
| fact_card_ui_set_and_number_001 | set code and number visible | obs_card_ui_set_symbol_and_number_001 | 0.96 |
| fact_card_ui_copyright_001 | copyright line visible | obs_card_ui_copyright_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_artist_text_001",
    "fact_card_ui_category_goods_text_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_set_and_number_001",
    "fact_card_ui_type_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_japanese_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_symbol_and_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_and_number_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_set_symbol_and_number_001"
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
    "obs_card_ui_artist_name_001"
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
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | low | medium |  |

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
| glowing sphere | obs_object_dark_bell_inner_glowing_sphere_001 |
| swirling vortex background | obs_background_vortex_001 |
| black and white bell | obs_color_dark_bell_colors_001, obs_object_dark_bell_001 |
| polygonal bell shape | obs_object_dark_bell_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_background_vortex_001 | deterministic_rule | 0.92 |
| glowing highlights | obs_object_dark_bell_inner_glowing_sphere_001 | deterministic_rule | 0.96 |
| spiral motif | obs_background_vortex_001 | deterministic_rule | 0.94 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: dark bell: 1.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`, `potential_module_incomplete_or_low_evidence`
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
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_body_001",
      "kind": "object",
      "label": "dark bell body",
      "normalized_label": "dark bell body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_handle_001",
      "kind": "object",
      "label": "dark bell handle",
      "normalized_label": "dark bell handle",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_inner_glowing_sphere_001",
      "kind": "object",
      "label": "glowing sphere inside dark bell",
      "normalized_label": "glowing sphere inside dark bell",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_vortex_001",
      "kind": "abstract_background",
      "label": "swirling vortex",
      "normalized_label": "swirling vortex",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_dark_bell_colors_001",
      "kind": "color",
      "label": "black with white outlines",
      "normalized_label": "black, white",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_background_gradient_001",
      "kind": "color",
      "label": "blue and purple gradient",
      "normalized_label": "blue, purple",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_japanese_001",
      "kind": "card_ui_text",
      "label": "カード名名：ダークベル",
      "normalized_label": "dark bell",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_category_goods_japanese_001",
      "kind": "card_ui_text",
      "label": "カードカテゴリー：グッズ",
      "normalized_label": "goods",
      "scene_layer": "card_ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_trainer_japanese_001",
      "kind": "card_ui_text",
      "label": "カードタイプ：トレーナーズ",
      "normalized_label": "trainers",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_artist_name_001",
      "kind": "illustrator_text",
      "label": "illustrator name: Toyste Beach",
      "normalized_label": "toyste beach",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_and_number_001",
      "kind": "set_symbol_and_number",
      "label": "set code: J M5 number: 105/081 SR",
      "normalized_label": "jpn-m5 105/081 sr",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "copyright text: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright 2026 pokemon nintendo creatures game freak",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "ui",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_count_dark_bell_001",
      "module": "counts",
      "field_path": "exact_count",
      "claim": "exact count of dark bell object",
      "value": "1",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_dark_bell_material_color_001",
      "module": "objects_and_props",
      "field_path": "colors",
      "claim": "dark bell color observed",
      "value": "black, white outlines",
      "supporting_observation_ids": [
        "obs_color_dark_bell_colors_001",
        "obs_object_dark_bell_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_dark_bell_handle_001",
      "module": "objects_and_props",
      "field_path": "object_parts",
      "claim": "dark bell has a handle section",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_dark_bell_handle_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_dark_bell_inner_glow_001",
      "module": "objects_and_props",
      "field_path": "inner_object",
      "claim": "dark bell contains glowing sphere inside",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_dark_bell_inner_glowing_sphere_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background is swirling vortex",
      "value": "swirling vortex background",
      "supporting_observation_ids": [
        "obs_background_vortex_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_colors_001",
      "module": "color_and_light",
      "field_path": "palette.background",
      "claim": "background colors observed",
      "value": "blue, purple gradient",
      "supporting_observation_ids": [
        "obs_color_background_gradient_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible in Japanese",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_japanese_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "type_text",
      "claim": "card type text visible in Japanese as トレーナーズ",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_type_trainer_japanese_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_category_goods_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "category_text",
      "claim": "card category text visible in Japanese as グッズ",
      "value": "グッズ",
      "supporting_observation_ids": [
        "obs_card_ui_category_goods_japanese_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_artist_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_artist_name_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_and_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_and_number",
      "claim": "set code and number visible",
      "value": "J M5 105/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_and_number_001"
      ],
      "confidence": 0.96,
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
      "confidence": 0.95,
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
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_color_dark_bell_colors_001",
      "obs_object_dark_bell_001",
      "obs_object_dark_bell_body_001",
      "obs_object_dark_bell_handle_001",
      "obs_object_dark_bell_inner_glowing_sphere_001"
    ],
    "midground": [],
    "background": [
      "obs_background_vortex_001",
      "obs_color_background_gradient_001"
    ]
  },
  "environment": {
    "setting": [
      "swirling vortex"
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
      "obs_background_vortex_001"
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
        "white"
      ],
      "material_appearance": [
        "dark rounded surface"
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
      "purple",
      "white"
    ],
    "lighting": [
      "glowing inner sphere"
    ],
    "shadows": [
      "dark shadows on bell facets"
    ],
    "highlights": [
      "white outlines on bell edges"
    ],
    "composition": [
      "central object with vortex background"
    ],
    "camera_angle": "straight-on",
    "framing": "tight",
    "cropping": [],
    "depth": "moderate depth with foreground object distinct from background",
    "motion_cues": [
      "swirling vortex background suggests motion"
    ],
    "motifs": [
      "geometric hexagonal and polygonal shapes on bell"
    ],
    "repeated_shapes": [
      "polygonal facets on bell body"
    ],
    "style_cues": [
      "glowing effect",
      "stylized geometric pattern"
    ],
    "supporting_observation_ids": [
      "obs_background_vortex_001",
      "obs_color_background_gradient_001",
      "obs_color_dark_bell_colors_001",
      "obs_object_dark_bell_001",
      "obs_object_dark_bell_inner_glowing_sphere_001"
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
        "fact_count_dark_bell_001",
        "fact_object_dark_bell_handle_001",
        "fact_object_dark_bell_inner_glow_001",
        "fact_object_dark_bell_material_color_001"
      ],
      "object_observation_ids": [
        "obs_object_dark_bell_001",
        "obs_object_dark_bell_body_001",
        "obs_object_dark_bell_handle_001",
        "obs_object_dark_bell_inner_glowing_sphere_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_background_001"
      ],
      "observation_ids": [
        "obs_background_vortex_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_environment_background_001"
      ],
      "observation_ids": [
        "obs_background_vortex_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_environment_background_colors_001"
      ],
      "observation_ids": [
        "obs_color_background_gradient_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_object_dark_bell_inner_glow_001"
      ],
      "observation_ids": [
        "obs_object_dark_bell_inner_glowing_sphere_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_artist_text_001",
        "fact_card_ui_category_goods_text_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_set_and_number_001",
        "fact_card_ui_type_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_japanese_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_symbol_and_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_and_number_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_set_symbol_and_number_001"
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
        "obs_card_ui_artist_name_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [
        "fact_count_dark_bell_001"
      ],
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
        "glowing sphere",
        "swirling vortex background",
        "black and white bell",
        "polygonal bell shape"
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
      "review_status": "not_applicable",
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
      "term": "glowing sphere",
      "supporting_observation_ids": [
        "obs_object_dark_bell_inner_glowing_sphere_001"
      ]
    },
    {
      "term": "swirling vortex background",
      "supporting_observation_ids": [
        "obs_background_vortex_001"
      ]
    },
    {
      "term": "black and white bell",
      "supporting_observation_ids": [
        "obs_color_dark_bell_colors_001",
        "obs_object_dark_bell_001"
      ]
    },
    {
      "term": "polygonal bell shape",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_background_vortex_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_object_dark_bell_inner_glowing_sphere_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_vortex_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-074 - リトライバッジ

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.007792`
- Artwork observations: `5`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: star-shaped badge, silver blue colors, five-pointed star, two ribbons, blue white swirl abstract background. Counts: star-shaped badge with ribbons: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| star-shaped badge with ribbons | star-shaped badge | objects_and_props | foreground | high | 0.99 |
| silver and blue colors | silver blue colors | color_and_light | foreground | medium | 0.99 |
| five-pointed star shape | five-pointed star | objects_and_props | foreground | high | 0.99 |
| two ribbons hanging from star badge | two ribbons | objects_and_props | foreground | medium | 0.99 |
| swirling blue and white abstract background | blue white swirl abstract background | environment | background | medium | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| リトライバッジ | card_ui_text | top_center | visible | 0.99 |
| ポケモンのどうぐ | card_ui_text | top_left_banner | visible | 0.98 |
| トレーナーズ | card_ui_text | top_right_banner | visible | 0.98 |
| Illus. Toyste Beach | illustrator_text | bottom_left | visible | 0.99 |
| J m5 set symbol | set_symbol | bottom_left | visible | 0.98 |
| 074/081 | collector_number | bottom_left | visible | 0.99 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom_center | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_main_art_badge_001 | objects_and_props | main visible object | obs_main_art_badge_001 | 0.99 |
| fact_badge_color_silver_blue_001 | color_and_light | badge dominant colors | obs_badge_color_silver_blue_001 | 0.99 |
| fact_badge_star_shape_001 | objects_and_props | badge shape | obs_badge_star_shape_001 | 0.99 |
| fact_badge_ribbons_001 | objects_and_props | badge includes two ribbons | obs_badge_ribbons_001 | 0.99 |
| fact_image_background_001 | environment | background description | obs_image_background_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text | obs_card_ui_name_text_001 | 0.99 |
| fact_card_ui_type_text_001 | card type text | obs_card_ui_type_text_001 | 0.98 |
| fact_card_ui_subtype_text_001 | card subtype text | obs_card_ui_subtype_text_001 | 0.98 |
| fact_illustrator_text_001 | illustrator text | obs_illustrator_text_001 | 0.99 |
| fact_card_ui_set_symbol_001 | set symbol | obs_card_ui_set_symbol_001 | 0.98 |
| fact_card_ui_card_number_001 | collector card number | obs_card_ui_card_number_001 | 0.99 |
| fact_card_ui_copyright_text_001 | copyright text | obs_card_ui_copyright_text_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_card_number_001",
    "fact_card_ui_copyright_text_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_subtype_text_001",
    "fact_card_ui_type_text_001",
    "fact_illustrator_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_text_001"
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
| star-shaped badge with ribbons | exact | 1 | obs_main_art_badge_001 | 0.99 |

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
| star-shaped badge | obs_main_art_badge_001 |
| five-pointed star | obs_badge_star_shape_001 |
| ribbons | obs_badge_ribbons_001 |
| silver and blue badge | obs_badge_color_silver_blue_001 |
| swirling blue white background | obs_image_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_main_art_badge_001 | deterministic_rule | 0.92 |
| metal-like appearance | obs_badge_ribbons_001, obs_main_art_badge_001 | deterministic_rule | 0.92 |
| spiral motif | obs_image_background_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: star-shaped badge, silver blue colors, five-pointed star, two ribbons, blue white swirl abstract background. Counts: star-shaped badge with ribbons: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "リトライバッジ",
      "normalized_label": "リトライバッジ",
      "scene_layer": "midground",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_text_001",
      "kind": "card_ui_text",
      "label": "ポケモンのどうぐ",
      "normalized_label": "ポケモンのどうぐ",
      "scene_layer": "midground",
      "frame_position": "top_left_banner",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_subtype_text_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "トレーナーズ",
      "scene_layer": "midground",
      "frame_position": "top_right_banner",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_main_art_badge_001",
      "kind": "objects_and_props",
      "label": "star-shaped badge with ribbons",
      "normalized_label": "star-shaped badge",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_badge_color_silver_blue_001",
      "kind": "color_and_light",
      "label": "silver and blue colors",
      "normalized_label": "silver blue colors",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_badge_star_shape_001",
      "kind": "objects_and_props",
      "label": "five-pointed star shape",
      "normalized_label": "five-pointed star",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_badge_ribbons_001",
      "kind": "objects_and_props",
      "label": "two ribbons hanging from star badge",
      "normalized_label": "two ribbons",
      "scene_layer": "foreground",
      "frame_position": "center_bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_image_background_001",
      "kind": "environment",
      "label": "swirling blue and white abstract background",
      "normalized_label": "blue white swirl abstract background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. Toyste Beach",
      "normalized_label": "Illus. Toyste Beach",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "J m5 set symbol",
      "normalized_label": "j m5",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_card_number_001",
      "kind": "collector_number",
      "label": "074/081",
      "normalized_label": "074/081",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_text_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 Pokémon Nintendo Creatures GAME FREAK",
      "scene_layer": "midground",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_type_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "type_text",
      "claim": "card type text",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_type_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_subtype_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "subtype_text",
      "claim": "card subtype text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_subtype_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_main_art_badge_001",
      "module": "objects_and_props",
      "field_path": "main_object",
      "claim": "main visible object",
      "value": "star-shaped badge with ribbons",
      "supporting_observation_ids": [
        "obs_main_art_badge_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_badge_color_silver_blue_001",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "badge dominant colors",
      "value": "silver, blue",
      "supporting_observation_ids": [
        "obs_badge_color_silver_blue_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_badge_star_shape_001",
      "module": "objects_and_props",
      "field_path": "shape",
      "claim": "badge shape",
      "value": "five-pointed star",
      "supporting_observation_ids": [
        "obs_badge_star_shape_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_badge_ribbons_001",
      "module": "objects_and_props",
      "field_path": "parts",
      "claim": "badge includes two ribbons",
      "value": "two ribbons hanging from star badge",
      "supporting_observation_ids": [
        "obs_badge_ribbons_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_image_background_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background description",
      "value": "swirling blue and white abstract",
      "supporting_observation_ids": [
        "obs_image_background_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "J m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_card_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_number",
      "claim": "collector card number",
      "value": "074/081",
      "supporting_observation_ids": [
        "obs_card_ui_card_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_text_001"
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
      "count_id": "count_badge_001",
      "normalized_label": "star-shaped badge with ribbons",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_main_art_badge_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_badge_color_silver_blue_001",
      "obs_badge_ribbons_001",
      "obs_badge_star_shape_001",
      "obs_main_art_badge_001"
    ],
    "midground": [
      "obs_card_ui_card_number_001",
      "obs_card_ui_copyright_text_001",
      "obs_card_ui_name_text_001",
      "obs_card_ui_set_symbol_001",
      "obs_card_ui_subtype_text_001",
      "obs_card_ui_type_text_001",
      "obs_illustrator_text_001"
    ],
    "background": [
      "obs_image_background_001"
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
      "obs_image_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_main_art_badge_001",
      "label": "star-shaped badge with ribbons",
      "normalized_label": "star-shaped badge",
      "object_type": "badge",
      "colors": [
        "blue",
        "silver"
      ],
      "material_appearance": [
        "metallic-looking highlights"
      ],
      "location": "center",
      "count_reference": "count_badge_001",
      "confidence": 0.99
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
      "bright highlight on badge edges"
    ],
    "shadows": [
      "soft shadows on badge ribbons"
    ],
    "highlights": [
      "metallic shining on badge star edges"
    ],
    "composition": [
      "centered main badge object",
      "curved ribbons"
    ],
    "camera_angle": "straight-on",
    "framing": "tight focus on badge",
    "cropping": [
      "full badge visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "ribbons",
      "star shape"
    ],
    "repeated_shapes": [
      "star points"
    ],
    "style_cues": [
      "clean digital art style"
    ],
    "supporting_observation_ids": [
      "obs_badge_color_silver_blue_001",
      "obs_badge_ribbons_001",
      "obs_badge_star_shape_001",
      "obs_main_art_badge_001"
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
        "fact_badge_ribbons_001",
        "fact_badge_star_shape_001",
        "fact_main_art_badge_001"
      ],
      "object_observation_ids": [
        "obs_badge_ribbons_001",
        "obs_badge_star_shape_001",
        "obs_main_art_badge_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_image_background_001"
      ],
      "observation_ids": [
        "obs_image_background_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_image_background_001"
      ],
      "observation_ids": [
        "obs_badge_ribbons_001",
        "obs_badge_star_shape_001",
        "obs_main_art_badge_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_badge_color_silver_blue_001"
      ],
      "observation_ids": [
        "obs_badge_color_silver_blue_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_card_number_001",
        "fact_card_ui_copyright_text_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_subtype_text_001",
        "fact_card_ui_type_text_001",
        "fact_illustrator_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_text_001"
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
        "count_badge_001"
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
        "star-shaped badge",
        "five-pointed star",
        "ribbons",
        "silver and blue badge",
        "swirling blue white background"
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
      "term": "star-shaped badge",
      "supporting_observation_ids": [
        "obs_main_art_badge_001"
      ]
    },
    {
      "term": "five-pointed star",
      "supporting_observation_ids": [
        "obs_badge_star_shape_001"
      ]
    },
    {
      "term": "ribbons",
      "supporting_observation_ids": [
        "obs_badge_ribbons_001"
      ]
    },
    {
      "term": "silver and blue badge",
      "supporting_observation_ids": [
        "obs_badge_color_silver_blue_001"
      ]
    },
    {
      "term": "swirling blue white background",
      "supporting_observation_ids": [
        "obs_image_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_main_art_badge_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_badge_ribbons_001",
          "obs_main_art_badge_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_image_background_001"
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
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0077392`
- Artwork observations: `11`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: bomb, bomb body, yellow stripe band, bomb fuse, bomb fuse spark, black octagonal panel, yellow explosion symbol, midground. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | midground | high | 0.99 |
| bomb body | bomb body | object | midground | high | 0.98 |
| bomb yellow stripe band | yellow stripe band | object | midground | medium | 0.95 |
| bomb fuse | bomb fuse | object | midground | medium | 0.97 |
| bomb fuse spark | bomb fuse spark | object | midground | medium | 0.96 |
| black octagonal panel on bomb body | black octagonal panel | object | midground | medium | 0.9 |
| yellow explosion symbol on bomb body | yellow explosion symbol | object | midground | medium | 0.92 |
| foreground | foreground | scene_layer | foreground | low | 1 |
| midground | midground | scene_layer | midground | high | 1 |
| background | background | scene_layer | background | medium | 1 |
| orange and blue background burst effect | orange blue burst | environment | background | medium | 0.97 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text ごうかいボム | card_ui_text | top_center | fully_visible | 0.98 |
| set symbol jpn-m5 m5 | card_ui_symbol | bottom_left | fully_visible | 0.99 |
| collector number 073/081 | collector_number | bottom_left | fully_visible | 0.98 |
| illus. inose yukie | illustrator_text | bottom_left | fully_visible | 0.96 |
| copyright ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom_center | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | object label | obs_object_001 | 0.99 |
| fact_obj_002 | objects_and_props | bomb body color | obs_object_002 | 0.98 |
| fact_obj_003 | objects_and_props | bomb body pattern | obs_object_006 | 0.9 |
| fact_obj_004 | objects_and_props | bomb yellow stripe band color | obs_object_003 | 0.95 |
| fact_obj_005 | objects_and_props | bomb fuse | obs_object_004, obs_object_005 | 0.97 |
| fact_obj_006 | objects_and_props | yellow explosion symbol on bomb body | obs_object_007 | 0.92 |
| fact_environment_001 | environment | background color burst | obs_environment_color_001 | 0.97 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_name_text_001 | 0.98 |
| fact_card_ui_set_symbol_001 | set symbol | obs_card_ui_set_symbol_001 | 0.99 |
| fact_card_ui_collector_number_001 | collector number | obs_card_ui_number_001 | 0.98 |
| fact_card_ui_illustrator_001 | illustrator text | obs_card_ui_text_illustrator_001 | 0.96 |
| fact_card_ui_copyright_001 | copyright line | obs_card_ui_text_copyright_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_collector_number_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_symbol_001"
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
  "copyright_line_observation_ids": [
    "obs_card_ui_text_copyright_001"
  ],
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
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
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
| bomb | exact | 1 | obs_object_001 | 0.99 |

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
| bomb | obs_object_001 |
| bomb body | obs_object_002 |
| yellow stripe band | obs_object_003 |
| bomb fuse | obs_object_004 |
| bomb fuse spark | obs_object_005 |
| black octagonal panel | obs_object_006 |
| yellow explosion symbol | obs_object_007 |
| midground | obs_scene_layer_midground_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_color_001 | deterministic_rule | 0.92 |
| explosion | obs_object_007 | deterministic_rule | 0.92 |
| glowing highlights | obs_object_002, obs_object_006, obs_object_007 | deterministic_rule | 0.92 |
| reflective-looking surface | obs_object_002, obs_object_006, obs_object_007 | deterministic_rule | 0.92 |
| spark | obs_object_005 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body, yellow stripe band, bomb fuse, bomb fuse spark, black octagonal panel, yellow explosion symbol, midground. Counts: bomb: 1.
- Quality flags: `potential_dramatic_inferred_action_language`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "bomb",
      "normalized_label": "bomb",
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
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_003",
      "kind": "object",
      "label": "bomb yellow stripe band",
      "normalized_label": "yellow stripe band",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_004",
      "kind": "object",
      "label": "bomb fuse",
      "normalized_label": "bomb fuse",
      "scene_layer": "midground",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_005",
      "kind": "object",
      "label": "bomb fuse spark",
      "normalized_label": "bomb fuse spark",
      "scene_layer": "midground",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_006",
      "kind": "object",
      "label": "black octagonal panel on bomb body",
      "normalized_label": "black octagonal panel",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_007",
      "kind": "object",
      "label": "yellow explosion symbol on bomb body",
      "normalized_label": "yellow explosion symbol",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_scene_layer_foreground_001",
      "kind": "scene_layer",
      "label": "foreground",
      "normalized_label": "foreground",
      "scene_layer": "foreground",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_scene_layer_midground_001",
      "kind": "scene_layer",
      "label": "midground",
      "normalized_label": "midground",
      "scene_layer": "midground",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_scene_layer_background_001",
      "kind": "scene_layer",
      "label": "background",
      "normalized_label": "background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_color_001",
      "kind": "environment",
      "label": "orange and blue background burst effect",
      "normalized_label": "orange blue burst",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text ごうかいボム",
      "normalized_label": "ごうかいボム",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "card_ui_symbol",
      "label": "set symbol jpn-m5 m5",
      "normalized_label": "jpn-m5 m5",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_001",
      "kind": "collector_number",
      "label": "collector number 073/081",
      "normalized_label": "073/081",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_illustrator_001",
      "kind": "illustrator_text",
      "label": "illus. inose yukie",
      "normalized_label": "illlus inose yukie",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_copyright_001",
      "kind": "copyright_text",
      "label": "copyright ©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright 2026 pokémon,nintendo,creatures,game freak",
      "scene_layer": "foreground",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "object label",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "[1].colors",
      "claim": "bomb body color",
      "value": "dark black",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "[1].physical_appearance",
      "claim": "bomb body pattern",
      "value": "black octagonal panels",
      "supporting_observation_ids": [
        "obs_object_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_004",
      "module": "objects_and_props",
      "field_path": "[2].colors",
      "claim": "bomb yellow stripe band color",
      "value": "yellow and black stripes",
      "supporting_observation_ids": [
        "obs_object_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_005",
      "module": "objects_and_props",
      "field_path": "[3]",
      "claim": "bomb fuse",
      "value": "red fuse with spark lit",
      "supporting_observation_ids": [
        "obs_object_004",
        "obs_object_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_006",
      "module": "objects_and_props",
      "field_path": "[4].symbols",
      "claim": "yellow explosion symbol on bomb body",
      "value": "yellow explosion mark",
      "supporting_observation_ids": [
        "obs_object_007"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background color burst",
      "value": "orange and blue burst effect",
      "supporting_observation_ids": [
        "obs_environment_color_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol",
      "value": "jpn-m5 m5",
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
      "claim": "collector number",
      "value": "073/081",
      "supporting_observation_ids": [
        "obs_card_ui_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_text_illustrator_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_copyright_001"
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
      "normalized_label": "bomb",
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
      "obs_scene_layer_foreground_001"
    ],
    "midground": [
      "obs_object_001",
      "obs_object_002",
      "obs_object_003",
      "obs_object_004",
      "obs_object_005",
      "obs_object_006",
      "obs_object_007",
      "obs_scene_layer_midground_001"
    ],
    "background": [
      "obs_environment_color_001",
      "obs_scene_layer_background_001"
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
      "obs_environment_color_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "device",
      "colors": [
        "dark black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded body"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "dark black",
      "orange",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright highlight on bomb body"
    ],
    "shadows": [
      "light shadow beneath bomb"
    ],
    "highlights": [
      "bright reflective highlight on bomb body"
    ],
    "composition": [
      "centered bomb with burst background"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing around bomb",
    "cropping": [
      "full bomb visible"
    ],
    "depth": "moderate depth with shadow",
    "motion_cues": [
      "lit fuse spark indicating ignition"
    ],
    "motifs": [
      "burst background motif",
      "explosion motif on bomb body"
    ],
    "repeated_shapes": [
      "octagonal panels on bomb body"
    ],
    "style_cues": [
      "cartoon style",
      "colorful illustration"
    ],
    "supporting_observation_ids": [
      "obs_environment_color_001",
      "obs_object_001",
      "obs_object_002",
      "obs_object_003",
      "obs_object_004",
      "obs_object_005",
      "obs_object_006",
      "obs_object_007"
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
        "fact_obj_006"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_002",
        "obs_object_003",
        "obs_object_004",
        "obs_object_005",
        "obs_object_006",
        "obs_object_007"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_color_001"
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
        "fact_card_ui_collector_number_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_symbol_001"
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
      "copyright_line_observation_ids": [
        "obs_card_ui_text_copyright_001"
      ],
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
        "bomb body",
        "yellow stripe band",
        "bomb fuse",
        "bomb fuse spark",
        "black octagonal panel",
        "yellow explosion symbol",
        "midground"
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "bomb body",
      "supporting_observation_ids": [
        "obs_object_002"
      ]
    },
    {
      "term": "yellow stripe band",
      "supporting_observation_ids": [
        "obs_object_003"
      ]
    },
    {
      "term": "bomb fuse",
      "supporting_observation_ids": [
        "obs_object_004"
      ]
    },
    {
      "term": "bomb fuse spark",
      "supporting_observation_ids": [
        "obs_object_005"
      ]
    },
    {
      "term": "black octagonal panel",
      "supporting_observation_ids": [
        "obs_object_006"
      ]
    },
    {
      "term": "yellow explosion symbol",
      "supporting_observation_ids": [
        "obs_object_007"
      ]
    },
    {
      "term": "midground",
      "supporting_observation_ids": [
        "obs_scene_layer_midground_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_environment_color_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_object_007"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_object_002",
          "obs_object_006",
          "obs_object_007"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "reflective-looking surface",
        "source_observation_ids": [
          "obs_object_002",
          "obs_object_006",
          "obs_object_007"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_object_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-112: fact_graph_semantic_fact_label_not_supported_v1:semantic_001
- GV-PK-JPN-M5-108: fact_graph_search_term_without_matching_fact_components:human face with open eyes and smiling mouth
- GV-PK-JPN-M5-110: fact_graph_typed_fact_observation_missing:obs_clothes_005
- GV-PK-JPN-S6A-100: fact_graph_semantic_fact_evidence_contradiction:svf_005:count_semantic_without_counted_visual_evidence

