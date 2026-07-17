# Card Visual Fact Graph V2 Review Packet

Generated rows: 1
Validation failures: 3
Skipped images: 0
Estimated cost USD: 0.0368328

## Rows

### GV-PK-JPN-M5-105 - Dark Bell

- Branch: `item_tool_supporter`
- V2 stress role: `object_heavy_item`
- Review status: `pending`
- Description confidence: `0.995`
- Attribute confidence: `0.98`
- Cost USD: `0.008848`
- Artwork observations: `6`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Counts: bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bell-shaped object | bell | object | foreground | salient | 0.99 |
| black and dark blue bell with white outline | bell colors | object | foreground | salient | 0.97 |
| bell has multiple geometric facets and angular shapes | bell geometric facets | object | foreground | salient | 0.98 |
| bell handle with polygonal shapes and facets | bell handle polygonal | object | foreground | salient | 0.95 |
| white spherical clapper inside bell | bell clapper sphere | object | foreground | salient | 0.96 |
| dark blue and purple swirling vortex background | swirling vortex background | environment | background | salient | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese text banner at top left | card_ui_text | top_left | visible | 0.99 |
| Japanese text banner at top right | card_ui_text | top_right | visible | 0.99 |
| Japanese card name ダークベル | card_ui_text | upper_middle | visible | 0.99 |
| Illustrator text 'Illus. Toystep Beach' | illustrator_text | bottom_left | visible | 0.98 |
| Set code and card number at bottom left 'J M5 105/081 SR' | card_ui_text | bottom_left | visible | 0.98 |
| Copyright text at bottom center | copyright_text | bottom_center | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_bell_001 | objects_and_props | The main object is a bell-shaped item | obs_object_bell_001 | 0.99 |
| fact_object_bell_color_001 | objects_and_props | The bell has black and dark blue colors with white outlines | obs_object_bell_color_001 | 0.97 |
| fact_object_bell_detail_001 | objects_and_props | The bell has multiple geometric facets and angular shapes | obs_object_bell_detail_001, obs_object_bell_detail_002 | 0.97 |
| fact_object_bell_center_001 | objects_and_props | The bell contains a white spherical clapper inside | obs_object_bell_center_001 | 0.96 |
| fact_environment_background_001 | environment | The background is a dark blue and purple swirling vortex | obs_background_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | The card name text is visible in Japanese as ダークベル | obs_card_ui_text_japanese_name_001 | 0.99 |
| fact_card_ui_header_left_001 | Japanese text banner at top left | obs_card_ui_text_japanese_header_001 | 0.99 |
| fact_card_ui_header_right_001 | Japanese text banner at top right | obs_card_ui_text_japanese_header_002 | 0.99 |
| fact_card_ui_illustrator_001 | Illustrator name is visible as 'Illus. Toystep Beach' | obs_card_ui_text_illustrator_001 | 0.98 |
| fact_card_ui_set_code_and_number_001 | Set code and card number visible as 'J M5 105/081 SR' | obs_card_ui_text_set_code_001 | 0.98 |
| fact_card_ui_copyright_001 | Copyright text visible at the bottom | obs_card_ui_text_copyright_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_copyright_001",
    "fact_card_ui_header_left_001",
    "fact_card_ui_header_right_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_code_and_number_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_text_japanese_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_text_set_code_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_text_set_code_001"
  ],
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
  "other_print_marker_observation_ids": [
    "obs_card_ui_text_japanese_header_001",
    "obs_card_ui_text_japanese_header_002"
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
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
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
| bell | exact | 1 | obs_object_bell_001 | 0.99 |

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
| bell | obs_object_bell_001 |
| dark blue bell | obs_object_bell_color_001 |
| angular bell | obs_object_bell_detail_001, obs_object_bell_detail_002 |
| swirling vortex background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_background_001, obs_object_bell_001 | deterministic_rule | 0.92 |
| glowing highlights | obs_background_001, obs_object_bell_001 | deterministic_rule | 0.92 |
| spiral motif | obs_background_001 | deterministic_rule | 0.99 |
| spiral motif | obs_background_001, obs_object_bell_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: bell: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_bell_001",
      "kind": "object",
      "label": "bell-shaped object",
      "normalized_label": "bell",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bell_color_001",
      "kind": "object",
      "label": "black and dark blue bell with white outline",
      "normalized_label": "bell colors",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bell_detail_001",
      "kind": "object",
      "label": "bell has multiple geometric facets and angular shapes",
      "normalized_label": "bell geometric facets",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bell_detail_002",
      "kind": "object",
      "label": "bell handle with polygonal shapes and facets",
      "normalized_label": "bell handle polygonal",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_bell_center_001",
      "kind": "object",
      "label": "white spherical clapper inside bell",
      "normalized_label": "bell clapper sphere",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_header_001",
      "kind": "card_ui_text",
      "label": "Japanese text banner at top left",
      "normalized_label": "Japanese banner text",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_header_002",
      "kind": "card_ui_text",
      "label": "Japanese text banner at top right",
      "normalized_label": "Japanese banner text",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_japanese_name_001",
      "kind": "card_ui_text",
      "label": "Japanese card name ダークベル",
      "normalized_label": "dark bell name text",
      "scene_layer": "card_ui",
      "frame_position": "upper_middle",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator text 'Illus. Toystep Beach'",
      "normalized_label": "illustrator name",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_set_code_001",
      "kind": "card_ui_text",
      "label": "Set code and card number at bottom left 'J M5 105/081 SR'",
      "normalized_label": "set code and number",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_text_copyright_001",
      "kind": "copyright_text",
      "label": "Copyright text at bottom center",
      "normalized_label": "copyright text",
      "scene_layer": "card_ui",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "dark blue and purple swirling vortex background",
      "normalized_label": "swirling vortex background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_object_bell_001",
      "module": "objects_and_props",
      "field_path": "bell",
      "claim": "The main object is a bell-shaped item",
      "value": "bell-shaped object",
      "supporting_observation_ids": [
        "obs_object_bell_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bell_color_001",
      "module": "objects_and_props",
      "field_path": "bell.colors",
      "claim": "The bell has black and dark blue colors with white outlines",
      "value": "black dark blue white",
      "supporting_observation_ids": [
        "obs_object_bell_color_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bell_detail_001",
      "module": "objects_and_props",
      "field_path": "bell.details",
      "claim": "The bell has multiple geometric facets and angular shapes",
      "value": "geometric facets angular shapes",
      "supporting_observation_ids": [
        "obs_object_bell_detail_001",
        "obs_object_bell_detail_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_bell_center_001",
      "module": "objects_and_props",
      "field_path": "bell.center_feature",
      "claim": "The bell contains a white spherical clapper inside",
      "value": "white spherical clapper",
      "supporting_observation_ids": [
        "obs_object_bell_center_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "background",
      "claim": "The background is a dark blue and purple swirling vortex",
      "value": "dark blue purple swirling vortex",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "The card name text is visible in Japanese as ダークベル",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_header_left_001",
      "module": "card_ui_and_print_markers",
      "field_path": "header_text_left",
      "claim": "Japanese text banner at top left",
      "value": "グッズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_header_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_header_right_001",
      "module": "card_ui_and_print_markers",
      "field_path": "header_text_right",
      "claim": "Japanese text banner at top right",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_text_japanese_header_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator name is visible as 'Illus. Toystep Beach'",
      "value": "Illus. Toystep Beach",
      "supporting_observation_ids": [
        "obs_card_ui_text_illustrator_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_code_and_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_code_and_number",
      "claim": "Set code and card number visible as 'J M5 105/081 SR'",
      "value": "J M5 105/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_text_set_code_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "Copyright text visible at the bottom",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_text_copyright_001"
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
      "normalized_label": "bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_bell_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_object_bell_001",
      "obs_object_bell_center_001",
      "obs_object_bell_color_001",
      "obs_object_bell_detail_001",
      "obs_object_bell_detail_002"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract vortex"
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
      "obs_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_bell_001",
      "label": "bell-shaped object",
      "normalized_label": "bell",
      "object_type": "tool-like",
      "colors": [
        "black",
        "dark blue",
        "white"
      ],
      "material_appearance": [
        "angular shapes",
        "geometric facets"
      ],
      "location": "center",
      "count_reference": "count_bell_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark blue",
      "purple",
      "white"
    ],
    "lighting": [
      "bright highlight inside bell"
    ],
    "shadows": [
      "shadows on facets"
    ],
    "highlights": [
      "white reflection on facets"
    ],
    "composition": [
      "centered object",
      "swirling vortex background"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing on bell",
    "cropping": [],
    "depth": "sharp depth with central focus",
    "motion_cues": [
      "swirling background suggests motion"
    ],
    "motifs": [
      "geometric facets"
    ],
    "repeated_shapes": [
      "polygonal facets"
    ],
    "style_cues": [
      "stylized digital art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_object_bell_001"
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
        "fact_object_bell_001",
        "fact_object_bell_center_001",
        "fact_object_bell_color_001",
        "fact_object_bell_detail_001"
      ],
      "object_observation_ids": [
        "obs_object_bell_001",
        "obs_object_bell_center_001",
        "obs_object_bell_color_001",
        "obs_object_bell_detail_001"
      ]
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
      "fact_ids": [
        "fact_environment_background_001"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_environment_background_001",
        "fact_object_bell_color_001"
      ],
      "observation_ids": [
        "obs_background_001",
        "obs_object_bell_color_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_copyright_001",
        "fact_card_ui_header_left_001",
        "fact_card_ui_header_right_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_code_and_number_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_text_japanese_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_text_set_code_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_text_set_code_001"
      ],
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
      "other_print_marker_observation_ids": [
        "obs_card_ui_text_japanese_header_001",
        "obs_card_ui_text_japanese_header_002"
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
        "dark blue bell",
        "angular bell",
        "swirling vortex background"
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "bell",
      "supporting_observation_ids": [
        "obs_object_bell_001"
      ]
    },
    {
      "term": "dark blue bell",
      "supporting_observation_ids": [
        "obs_object_bell_color_001"
      ]
    },
    {
      "term": "angular bell",
      "supporting_observation_ids": [
        "obs_object_bell_detail_001",
        "obs_object_bell_detail_002"
      ]
    },
    {
      "term": "swirling vortex background",
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
          "obs_background_001",
          "obs_object_bell_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_background_001",
          "obs_object_bell_001"
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
          "obs_object_bell_001"
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

- GV-PK-JPN-M5-118: fact_graph_semantic_fact_label_not_supported_v1:semfact_001
- GV-PK-JPN-M5-108: fact_graph_semantic_fact_label_not_supported_v1:svf_003
- GV-PK-JPN-S6A-100: fact_graph_semantic_fact_label_not_supported_v1:semfact_002, fact_graph_semantic_fact_label_not_supported_v1:semfact_003, fact_graph_semantic_fact_label_not_supported_v1:semfact_005

