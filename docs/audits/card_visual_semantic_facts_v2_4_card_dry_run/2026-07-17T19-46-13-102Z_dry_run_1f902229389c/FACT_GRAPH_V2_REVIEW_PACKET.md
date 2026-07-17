# Card Visual Fact Graph V2 Review Packet

Generated rows: 2
Validation failures: 2
Skipped images: 0
Estimated cost USD: 0.0384904

## Rows

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- V2 stress role: `dense_pokemon_artwork`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0096952`
- Artwork observations: `9`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `8`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: Mega Darkrai, head, eyes, collar around neck, tentacle arms, body with yellow star features, floating pose, abstract yellow star background. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | Mega Darkrai | scene_subject | foreground | high | 0.99 |
| Head of Mega Darkrai | head | creature_anatomy | foreground | high | 0.99 |
| Eyes of Mega Darkrai closed or shadowed | eyes | creature_anatomy | foreground | high | 0.98 |
| Yellow collar around neck area | collar around neck | creature_anatomy | foreground | high | 0.99 |
| Four dark tentacle-like arms extending from body | tentacle arms | creature_anatomy | foreground | high | 0.99 |
| Body mostly dark with yellow star-shaped features | body with yellow star features | creature_anatomy | foreground | high | 0.99 |
| Mega Darkrai is floating | floating pose | creature_anatomy | foreground | high | 0.98 |
| Abstract yellow star-shaped and geometric background | abstract yellow star background | environment | background | medium | 0.99 |
| Palette primarily yellow and black | yellow and black palette | color_and_light | foreground and background | high | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| メガダークライ ex | card_name_text | top | visible | 0.99 |
| HP 280 | hp_text | top_right | visible | 0.99 |
| Dark Energy symbols x3 | energy_symbol | left_center | visible | 0.99 |
| Illus. 5ban Graphics | illustrator_text | bottom_left | visible | 0.98 |
| Set symbol JPN M5 | set_symbol | bottom_left | visible | 0.98 |
| 118/081 MUR | collector_number | bottom_left | visible | 0.98 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | bottom_line_text | bottom | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_mega_darkrai_001 | subjects | subject identity | obs_artwork_pokemon_mega_darkrai_001 | 0.99 |
| fact_face_eyes_closed_001 | creature_anatomy | Eyes closed or shadowed | obs_anatomy_eyes_001 | 0.98 |
| fact_pose_floating_001 | creature_anatomy | Pose | obs_pose_floating_001 | 0.98 |
| fact_color_palette_yellow_black_001 | color_and_light | Color palette | obs_color_palette_yellow_black_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_hp_280_001 | HP value | obs_card_ui_hp_text_001 | 0.99 |
| fact_name_text_mega_darkrai_ex_001 | Name text | obs_card_ui_name_text_001 | 0.99 |
| fact_energy_symbols_dark_3_001 | Energy symbols present | obs_card_ui_energy_symbol_001 | 0.99 |
| fact_illustrator_5ban_graphics_001 | Illustrator | obs_card_ui_illustrator_text_001 | 0.98 |
| fact_set_symbol_jpn_m5_001 | Set symbol | obs_card_ui_set_symbol_001 | 0.98 |
| fact_collector_number_118_081_mur_001 | Collector number | obs_card_ui_collector_number_001 | 0.98 |
| fact_bottom_line_copyright_001 | Copyright line | obs_card_ui_bottom_line_text_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_bottom_line_copyright_001",
    "fact_collector_number_118_081_mur_001",
    "fact_energy_symbols_dark_3_001",
    "fact_hp_280_001",
    "fact_illustrator_5ban_graphics_001",
    "fact_name_text_mega_darkrai_ex_001",
    "fact_set_symbol_jpn_m5_001"
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
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | likely_complete | low | high |  |
| composition | likely_complete | low | high |  |
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
| semfact_floating_001 | action | floating | obs_artwork_pokemon_mega_darkrai_001 | obs_pose_floating_001 | closed or shadowed eyes closed or shadowed floating floating floating | 0.98 |

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
| floating pose | obs_pose_floating_001 |
| yellow and black palette | obs_color_palette_yellow_black_001 |
| abstract yellow star background | obs_background_abstract_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_artwork_pokemon_mega_darkrai_001, obs_background_abstract_001, obs_color_palette_yellow_black_001 | deterministic_rule | 0.92 |
| floating | obs_pose_floating_001 | deterministic_rule | 0.98 |
| floating | obs_artwork_pokemon_mega_darkrai_001 | deterministic_rule | 0.99 |
| upright orientation | obs_artwork_pokemon_mega_darkrai_001 | deterministic_rule | 0.99 |
| upright orientation | obs_pose_floating_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: Mega Darkrai, head, eyes, collar around neck, tentacle arms, body with yellow star features, floating pose, abstract yellow star background. Semantic facts: floating.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_name_text",
      "label": "メガダークライ ex",
      "normalized_label": "Mega Darkrai ex",
      "scene_layer": "midground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_text_001",
      "kind": "hp_text",
      "label": "HP 280",
      "normalized_label": "HP 280",
      "scene_layer": "midground",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_energy_symbol_001",
      "kind": "energy_symbol",
      "label": "Dark Energy symbols x3",
      "normalized_label": "Dark Energy x3",
      "scene_layer": "midground",
      "frame_position": "left_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. 5ban Graphics",
      "normalized_label": "Illus. 5ban Graphics",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "Set symbol JPN M5",
      "normalized_label": "Set JPN M5",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "118/081 MUR",
      "normalized_label": "118/081",
      "scene_layer": "midground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_line_text_001",
      "kind": "bottom_line_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 Pokemon Nintendo Creatures GAME FREAK",
      "scene_layer": "midground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_pokemon_mega_darkrai_001",
      "kind": "scene_subject",
      "label": "Mega Darkrai",
      "normalized_label": "Mega Darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_head_001",
      "kind": "creature_anatomy",
      "label": "Head of Mega Darkrai",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_eyes_001",
      "kind": "creature_anatomy",
      "label": "Eyes of Mega Darkrai closed or shadowed",
      "normalized_label": "eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_neck_collar_001",
      "kind": "creature_anatomy",
      "label": "Yellow collar around neck area",
      "normalized_label": "collar around neck",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_tentacle_arms_001",
      "kind": "creature_anatomy",
      "label": "Four dark tentacle-like arms extending from body",
      "normalized_label": "tentacle arms",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_anatomy_body_001",
      "kind": "creature_anatomy",
      "label": "Body mostly dark with yellow star-shaped features",
      "normalized_label": "body with yellow star features",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_floating_001",
      "kind": "creature_anatomy",
      "label": "Mega Darkrai is floating",
      "normalized_label": "floating pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_abstract_001",
      "kind": "environment",
      "label": "Abstract yellow star-shaped and geometric background",
      "normalized_label": "abstract yellow star background",
      "scene_layer": "background",
      "frame_position": "full_frame",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_palette_yellow_black_001",
      "kind": "color_and_light",
      "label": "Palette primarily yellow and black",
      "normalized_label": "yellow and black palette",
      "scene_layer": "foreground and background",
      "frame_position": "full_frame",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_mega_darkrai_001",
      "module": "subjects",
      "field_path": "0",
      "claim": "subject identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_artwork_pokemon_mega_darkrai_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hp_280_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_hp_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_name_text_mega_darkrai_ex_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Name text",
      "value": "メガダークライ ex",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_energy_symbols_dark_3_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "Energy symbols present",
      "value": "Dark x3",
      "supporting_observation_ids": [
        "obs_card_ui_energy_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_illustrator_5ban_graphics_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_set_symbol_jpn_m5_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol",
      "value": "JPN M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_collector_number_118_081_mur_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number",
      "value": "118/081 MUR",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_bottom_line_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "Copyright line",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_line_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_eyes_closed_001",
      "module": "creature_anatomy",
      "field_path": "eyes",
      "claim": "Eyes closed or shadowed",
      "value": "closed or shadowed",
      "supporting_observation_ids": [
        "obs_anatomy_eyes_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_floating_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "Pose",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_pose_floating_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_palette_yellow_black_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "Color palette",
      "value": "yellow and black",
      "supporting_observation_ids": [
        "obs_color_palette_yellow_black_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_artwork_pokemon_mega_darkrai_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.99,
      "anatomy": [
        "body with star yellow features",
        "eyes",
        "head",
        "neck collar",
        "tentacle-like arms"
      ],
      "physical_features": [
        "eyes closed or shadowed"
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
      "obs_anatomy_body_001",
      "obs_anatomy_eyes_001",
      "obs_anatomy_head_001",
      "obs_anatomy_neck_collar_001",
      "obs_anatomy_tentacle_arms_001",
      "obs_artwork_pokemon_mega_darkrai_001",
      "obs_color_palette_yellow_black_001",
      "obs_pose_floating_001"
    ],
    "midground": [
      "obs_card_ui_bottom_line_text_001",
      "obs_card_ui_collector_number_001",
      "obs_card_ui_energy_symbol_001",
      "obs_card_ui_hp_text_001",
      "obs_card_ui_illustrator_text_001",
      "obs_card_ui_name_text_001",
      "obs_card_ui_set_symbol_001"
    ],
    "background": [
      "obs_background_abstract_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract"
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
      "obs_background_abstract_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "yellow"
    ],
    "lighting": [
      "bright with golden highlights"
    ],
    "shadows": [
      "soft shadows on figure"
    ],
    "highlights": [
      "highlight on yellow star shapes"
    ],
    "composition": [
      "centered figure",
      "symmetrical arms"
    ],
    "camera_angle": "straight on",
    "framing": "complete card art visible",
    "cropping": [],
    "depth": "moderate depth with overlapping arms",
    "motion_cues": [],
    "motifs": [
      "star shape motif"
    ],
    "repeated_shapes": [
      "star shapes"
    ],
    "style_cues": [
      "digital illustration style",
      "glowing light effects",
      "graded shading"
    ],
    "supporting_observation_ids": [
      "obs_artwork_pokemon_mega_darkrai_001",
      "obs_background_abstract_001",
      "obs_color_palette_yellow_black_001"
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
        "fact_subject_mega_darkrai_001"
      ],
      "scene_subject_observation_ids": [
        "obs_artwork_pokemon_mega_darkrai_001"
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
        "fact_face_eyes_closed_001",
        "fact_pose_floating_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_artwork_pokemon_mega_darkrai_001",
          "region": "head",
          "feature": "eyes",
          "visibility": "visible",
          "colors": [],
          "details": [
            "eyes closed or shadowed"
          ],
          "supporting_observation_ids": [
            "obs_anatomy_eyes_001"
          ],
          "confidence": 0.98
        }
      ],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_artwork_pokemon_mega_darkrai_001",
          "pose": [
            "floating"
          ],
          "orientation": "upright",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_pose_floating_001"
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
      "fact_ids": [],
      "observation_ids": [
        "obs_background_abstract_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_artwork_pokemon_mega_darkrai_001",
        "obs_background_abstract_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_palette_yellow_black_001"
      ],
      "observation_ids": [
        "obs_color_palette_yellow_black_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_bottom_line_copyright_001",
        "fact_collector_number_118_081_mur_001",
        "fact_energy_symbols_dark_3_001",
        "fact_hp_280_001",
        "fact_illustrator_5ban_graphics_001",
        "fact_name_text_mega_darkrai_ex_001",
        "fact_set_symbol_jpn_m5_001"
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
        "floating pose",
        "yellow and black palette",
        "abstract yellow star background"
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
      "semantic_fact_id": "semfact_floating_001",
      "category": "action",
      "label": "floating",
      "subject_observation_id": "obs_artwork_pokemon_mega_darkrai_001",
      "supporting_observation_ids": [
        "obs_pose_floating_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "closed or shadowed"
        ],
        "eyebrows": [],
        "facial_features": [
          "eyes closed or shadowed"
        ],
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
      "confidence": 0.98,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating pose",
      "supporting_observation_ids": [
        "obs_pose_floating_001"
      ]
    },
    {
      "term": "yellow and black palette",
      "supporting_observation_ids": [
        "obs_color_palette_yellow_black_001"
      ]
    },
    {
      "term": "abstract yellow star background",
      "supporting_observation_ids": [
        "obs_background_abstract_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_artwork_pokemon_mega_darkrai_001",
          "obs_background_abstract_001",
          "obs_color_palette_yellow_black_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_pose_floating_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_artwork_pokemon_mega_darkrai_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_artwork_pokemon_mega_darkrai_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_pose_floating_001"
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
- V2 stress role: `object_heavy_item`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0081344`
- Artwork observations: `3`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Counts: bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bell-shaped object | bell | object | midground | salient | 0.99 |
| black geometric patterned bell | bell | object | midground | salient | 0.98 |
| swirling blue and purple background | swirling blue purple background | environment | background | salient | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese ダークベル | card_ui_text | top_left | visible | 0.95 |
| set name text in Japanese グッズ and トレーナーズ | card_ui_text | top | visible | 0.9 |
| card illustrator text 'Illus. Toystep Beach' | card_ui_text | bottom_left | visible | 0.9 |
| card number and rarity '105/081 SR' | card_ui_text | bottom_left | visible | 0.9 |
| set code 'jpn-m5' | card_ui_text | bottom_left | visible | 0.9 |
| copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' | card_ui_text | bottom | visible | 0.95 |
| description text in Japanese below bell | card_ui_text | mid_lower | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_001 | objects_and_props | object is a bell | obs_object_001, obs_object_002 | 0.99 |
| fact_object_002 | objects_and_props | bell colors include black and white | obs_object_002 | 0.95 |
| fact_environment_001 | environment | background swirling blue and purple | obs_environment_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_cardui_001 | card name text is ダークベル (Dark Bell) | obs_card_ui_text_001 | 0.95 |
| fact_cardui_002 | set symbols include jpn-m5 and set code M5 | obs_card_ui_text_004, obs_card_ui_text_005 | 0.9 |
| fact_cardui_003 | collector number is 105/081 | obs_card_ui_text_004 | 0.9 |
| fact_cardui_004 | rarity mark visible as SR | obs_card_ui_text_004 | 0.9 |
| fact_cardui_005 | illustrator is Toystep Beach | obs_card_ui_text_003 | 0.9 |
| fact_cardui_006 | copyright text visible with Pokémon/Nintendo/Creatures/GAME FREAK | obs_card_ui_text_006 | 0.95 |
| fact_cardui_007 | text below bell shape visible but unreadable detail | obs_card_ui_text_007 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_cardui_001",
    "fact_cardui_002",
    "fact_cardui_003",
    "fact_cardui_004",
    "fact_cardui_005",
    "fact_cardui_006",
    "fact_cardui_007"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_004"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_text_005"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_text_004"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_text_006"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_text_007"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_text_003"
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
| color_and_light | none_visible | none | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bell | exact | 1 | obs_object_001, obs_object_002 | 0.99 |

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
| swirling blue purple background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_001, obs_object_001 | deterministic_rule | 0.92 |
| circular motif | obs_environment_001, obs_object_001 | deterministic_rule | 0.92 |
| glowing highlights | obs_environment_001, obs_object_001 | deterministic_rule | 0.92 |
| spiral motif | obs_environment_001 | deterministic_rule | 0.95 |
| spiral motif | obs_environment_001, obs_object_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: bell: 1.
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
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "black geometric patterned bell",
      "normalized_label": "bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "swirling blue and purple background",
      "normalized_label": "swirling blue purple background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese ダークベル",
      "normalized_label": "dark bell",
      "scene_layer": "foreground",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_002",
      "kind": "card_ui_text",
      "label": "set name text in Japanese グッズ and トレーナーズ",
      "normalized_label": "goods and trainers",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_003",
      "kind": "card_ui_text",
      "label": "card illustrator text 'Illus. Toystep Beach'",
      "normalized_label": "illus Toystep beach",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_004",
      "kind": "card_ui_text",
      "label": "card number and rarity '105/081 SR'",
      "normalized_label": "105/81 sr",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_005",
      "kind": "card_ui_text",
      "label": "set code 'jpn-m5'",
      "normalized_label": "jpn-m5",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_006",
      "kind": "card_ui_text",
      "label": "copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.'",
      "normalized_label": "copyright line",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_007",
      "kind": "card_ui_text",
      "label": "description text in Japanese below bell",
      "normalized_label": "description text",
      "scene_layer": "foreground",
      "frame_position": "mid_lower",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_object_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "object is a bell",
      "value": "bell",
      "supporting_observation_ids": [
        "obs_object_001",
        "obs_object_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_002",
      "module": "objects_and_props",
      "field_path": "[0].colors",
      "claim": "bell colors include black and white",
      "value": "black, white accents",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background swirling blue and purple",
      "value": "swirling blue and purple background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is ダークベル (Dark Bell)",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbols include jpn-m5 and set code M5",
      "value": "jpn-m5, M5",
      "supporting_observation_ids": [
        "obs_card_ui_text_004",
        "obs_card_ui_text_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number is 105/081",
      "value": "105/081",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "rarity mark visible as SR",
      "value": "SR",
      "supporting_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator is Toystep Beach",
      "value": "Toystep Beach",
      "supporting_observation_ids": [
        "obs_card_ui_text_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text visible with Pokémon/Nintendo/Creatures/GAME FREAK",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "text below bell shape visible but unreadable detail",
      "value": "japanese descriptive text below bell",
      "supporting_observation_ids": [
        "obs_card_ui_text_007"
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
      "normalized_label": "bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001",
        "obs_object_002"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_card_ui_text_001",
      "obs_card_ui_text_002",
      "obs_card_ui_text_003",
      "obs_card_ui_text_004",
      "obs_card_ui_text_005",
      "obs_card_ui_text_006",
      "obs_card_ui_text_007"
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
      "swirling blue and purple background"
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
      "label": "bell-shaped object",
      "normalized_label": "bell",
      "object_type": "object",
      "colors": [
        "black",
        "white"
      ],
      "material_appearance": [
        "dark rounded shape",
        "geometric pattern",
        "highlighted edges"
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
      "purple",
      "white"
    ],
    "lighting": [
      "glowing background effect",
      "highlight on bell edges"
    ],
    "shadows": [
      "soft shadows around bell"
    ],
    "highlights": [
      "bright highlight on bell"
    ],
    "composition": [
      "centered bell",
      "swirling background"
    ],
    "camera_angle": "frontal tilt",
    "framing": "center tight crop",
    "cropping": [
      "top and bottom edges visible"
    ],
    "depth": "moderate depth with foreground/midground/background layers",
    "motion_cues": [
      "background swirling effect around bell"
    ],
    "motifs": [
      "circular swirl",
      "geometric bell pattern"
    ],
    "repeated_shapes": [
      "triangles throughout bell design"
    ],
    "style_cues": [
      "digital art",
      "stylized geometric object"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
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
        "fact_object_001",
        "fact_object_002"
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
        "fact_cardui_001",
        "fact_cardui_002",
        "fact_cardui_003",
        "fact_cardui_004",
        "fact_cardui_005",
        "fact_cardui_006",
        "fact_cardui_007"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_text_005"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_text_004"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_text_006"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_text_007"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_text_003"
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
        "bell",
        "swirling blue purple background"
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
      "term": "swirling blue purple background",
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
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_object_001"
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
        "confidence": 0.95
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_environment_001",
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

## Validation Failures

- GV-PK-JPN-M5-108: fact_graph_semantic_fact_label_not_supported_v1:svf_002
- GV-PK-JPN-S6A-100: fact_graph_semantic_fact_label_not_supported_v1:semfact_001

