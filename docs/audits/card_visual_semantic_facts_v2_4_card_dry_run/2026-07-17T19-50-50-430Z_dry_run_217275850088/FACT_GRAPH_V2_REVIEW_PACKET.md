# Card Visual Fact Graph V2 Review Packet

Generated rows: 2
Validation failures: 2
Skipped images: 0
Estimated cost USD: 0.0380696

## Rows

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- V2 stress role: `environment_heavy_stadium`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0083756`
- Artwork observations: `10`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium building, logo, blue sky, trees, pathway, staircase, traffic cones, fence. Counts: traffic cones: 6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium building with brown and purple walls and green accents | stadium building | object | midground | high | 0.99 |
| green logo on stadium wall | logo | object | midground | medium | 0.95 |
| blue sky with some clouds | blue sky | environment | background | medium | 0.99 |
| group of green trees | trees | environment | background | medium | 0.98 |
| pathway with tile pattern in green and gray tones | pathway | object | foreground | medium | 0.99 |
| wooden staircase leading upwards | staircase | object | midground | medium | 0.95 |
| six orange and white traffic cones arranged in pairs | traffic cones | object | foreground | medium | 0.95 |
| metal fence railings beside pathway | fence | object | foreground | medium | 0.95 |
| roof structure with white supports and translucent panels | roof structure | object | background | medium | 0.97 |
| warm orange and golden lighting | warm lighting | color_and_light | full_image | high | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_stadium_building_001 | 0.99 |
| fact_env_002 | environment | sky color | obs_sky_blue_001 | 0.99 |
| fact_env_003 | environment | trees | obs_trees_group_001 | 0.98 |
| fact_env_004 | environment | terrain type | obs_stadium_path_001, obs_staircase_001 | 0.99 |
| fact_env_005 | environment | architecture style | obs_stadium_building_001, obs_stadium_roof_structure_001 | 0.99 |
| fact_env_006 | environment | traffic cones count | obs_traffic_cones_001 | 0.95 |
| fact_env_007 | environment | metal fence | obs_metal_fence_001 | 0.95 |
| fact_env_008 | color_and_light | lighting color | obs_sunset_or_warm_lighting_001 | 0.98 |

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
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | not_applicable | none | not_applicable |  |
| counts | complete | low | high |  |
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
| traffic cones | exact | 6 | obs_traffic_cones_001 | 0.95 |

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
| stadium building | obs_stadium_building_001 |
| blue sky | obs_sky_blue_001 |
| green trees | obs_trees_group_001 |
| traffic cones | obs_traffic_cones_001 |
| stadium pathway | obs_stadium_path_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_stadium_building_001 | deterministic_rule | 0.99 |
| building | obs_stadium_roof_structure_001 | deterministic_rule | 0.97 |
| building | obs_metal_fence_001, obs_sky_blue_001, obs_stadium_building_001, obs_stadium_green_logo_001, obs_stadium_path_001, obs_stadium_roof_structure_001 | deterministic_rule | 0.92 |
| centered composition | obs_metal_fence_001, obs_sky_blue_001, obs_stadium_building_001, obs_stadium_green_logo_001, obs_stadium_path_001, obs_stadium_roof_structure_001 | deterministic_rule | 0.92 |
| cloud | obs_sky_blue_001 | deterministic_rule | 0.99 |
| sky | obs_sky_blue_001 | deterministic_rule | 0.99 |
| sky | obs_metal_fence_001, obs_sky_blue_001, obs_stadium_building_001, obs_stadium_green_logo_001, obs_stadium_path_001, obs_stadium_roof_structure_001 | deterministic_rule | 0.92 |
| terrain | obs_metal_fence_001, obs_sky_blue_001, obs_stadium_building_001, obs_stadium_green_logo_001, obs_stadium_path_001, obs_stadium_roof_structure_001 | deterministic_rule | 0.92 |
| tree | obs_trees_group_001 | deterministic_rule | 0.98 |
| tree | obs_metal_fence_001, obs_sky_blue_001, obs_stadium_building_001, obs_stadium_green_logo_001, obs_stadium_path_001, obs_stadium_roof_structure_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium building, logo, blue sky, trees, pathway, staircase, traffic cones, fence. Counts: traffic cones: 6.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_building_001",
      "kind": "object",
      "label": "stadium building with brown and purple walls and green accents",
      "normalized_label": "stadium building",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_green_logo_001",
      "kind": "object",
      "label": "green logo on stadium wall",
      "normalized_label": "logo",
      "scene_layer": "midground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_blue_001",
      "kind": "environment",
      "label": "blue sky with some clouds",
      "normalized_label": "blue sky",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_group_001",
      "kind": "environment",
      "label": "group of green trees",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_path_001",
      "kind": "object",
      "label": "pathway with tile pattern in green and gray tones",
      "normalized_label": "pathway",
      "scene_layer": "foreground",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_staircase_001",
      "kind": "object",
      "label": "wooden staircase leading upwards",
      "normalized_label": "staircase",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_traffic_cones_001",
      "kind": "object",
      "label": "six orange and white traffic cones arranged in pairs",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "left-bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_metal_fence_001",
      "kind": "object",
      "label": "metal fence railings beside pathway",
      "normalized_label": "fence",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_roof_structure_001",
      "kind": "object",
      "label": "roof structure with white supports and translucent panels",
      "normalized_label": "roof structure",
      "scene_layer": "background",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sunset_or_warm_lighting_001",
      "kind": "color_and_light",
      "label": "warm orange and golden lighting",
      "normalized_label": "warm lighting",
      "scene_layer": "full_image",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "stadium",
      "supporting_observation_ids": [
        "obs_stadium_building_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky color",
      "value": "blue with clouds",
      "supporting_observation_ids": [
        "obs_sky_blue_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "trees",
      "value": "green trees",
      "supporting_observation_ids": [
        "obs_trees_group_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain type",
      "value": "pathway and stairs",
      "supporting_observation_ids": [
        "obs_stadium_path_001",
        "obs_staircase_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "architecture",
      "claim": "architecture style",
      "value": "stadium with brown walls and roof structure",
      "supporting_observation_ids": [
        "obs_stadium_building_001",
        "obs_stadium_roof_structure_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "traffic cones count",
      "value": "6",
      "supporting_observation_ids": [
        "obs_traffic_cones_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "metal fence",
      "value": "present",
      "supporting_observation_ids": [
        "obs_metal_fence_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "lighting color",
      "value": "warm orange and golden lighting",
      "supporting_observation_ids": [
        "obs_sunset_or_warm_lighting_001"
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
      "count_id": "count_traffic_cones_001",
      "normalized_label": "traffic cones",
      "count_type": "exact",
      "exact_count": 6,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_traffic_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_metal_fence_001",
      "obs_stadium_path_001",
      "obs_traffic_cones_001"
    ],
    "midground": [
      "obs_stadium_building_001",
      "obs_stadium_green_logo_001",
      "obs_staircase_001"
    ],
    "background": [
      "obs_sky_blue_001",
      "obs_stadium_roof_structure_001",
      "obs_trees_group_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky"
    ],
    "ground": [
      "pathway tiles",
      "staircase"
    ],
    "terrain": [
      "man-made",
      "urban"
    ],
    "plants": [
      "trees"
    ],
    "architecture": [
      "roof structure",
      "stadium building"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "warm lighting"
    ],
    "supporting_observation_ids": [
      "obs_metal_fence_001",
      "obs_sky_blue_001",
      "obs_stadium_building_001",
      "obs_stadium_path_001",
      "obs_stadium_roof_structure_001",
      "obs_staircase_001",
      "obs_sunset_or_warm_lighting_001",
      "obs_traffic_cones_001",
      "obs_trees_group_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_stadium_green_logo_001",
      "label": "green logo on stadium wall",
      "normalized_label": "logo",
      "object_type": "logo",
      "colors": [
        "green",
        "white"
      ],
      "material_appearance": [],
      "location": "stadium wall",
      "count_reference": "",
      "confidence": 0.95
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
      "warm orange and golden lighting"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "background trees and sky",
      "foreground with path and cones",
      "midground stadium building"
    ],
    "camera_angle": "slightly elevated, angled view",
    "framing": "medium crop with stadium centered",
    "cropping": [],
    "depth": "deep with foreground, midground, and background",
    "motion_cues": [],
    "motifs": [
      "green logo motif",
      "stadium architecture"
    ],
    "repeated_shapes": [
      "cones",
      "rectangular windows"
    ],
    "style_cues": [
      "illustration with painterly texture"
    ],
    "supporting_observation_ids": [
      "obs_metal_fence_001",
      "obs_sky_blue_001",
      "obs_stadium_building_001",
      "obs_stadium_green_logo_001",
      "obs_stadium_path_001",
      "obs_stadium_roof_structure_001",
      "obs_staircase_001",
      "obs_sunset_or_warm_lighting_001",
      "obs_traffic_cones_001",
      "obs_trees_group_001"
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
        "fact_env_007"
      ],
      "object_observation_ids": [
        "obs_metal_fence_001",
        "obs_stadium_green_logo_001",
        "obs_traffic_cones_001"
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
        "obs_sky_blue_001",
        "obs_stadium_building_001",
        "obs_stadium_path_001",
        "obs_stadium_roof_structure_001",
        "obs_staircase_001",
        "obs_trees_group_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_env_008"
      ],
      "observation_ids": [
        "obs_sunset_or_warm_lighting_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_env_008"
      ],
      "observation_ids": [
        "obs_sunset_or_warm_lighting_001"
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
        "fact_env_006"
      ],
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
        "stadium building",
        "blue sky",
        "green trees",
        "traffic cones",
        "stadium pathway"
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
      "review_status": "not_applicable",
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
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_sky_blue_001"
      ]
    },
    {
      "term": "green trees",
      "supporting_observation_ids": [
        "obs_trees_group_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_traffic_cones_001"
      ]
    },
    {
      "term": "stadium pathway",
      "supporting_observation_ids": [
        "obs_stadium_path_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_stadium_building_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_stadium_roof_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_metal_fence_001",
          "obs_sky_blue_001",
          "obs_stadium_building_001",
          "obs_stadium_green_logo_001",
          "obs_stadium_path_001",
          "obs_stadium_roof_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_metal_fence_001",
          "obs_sky_blue_001",
          "obs_stadium_building_001",
          "obs_stadium_green_logo_001",
          "obs_stadium_path_001",
          "obs_stadium_roof_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_sky_blue_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_sky_blue_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_metal_fence_001",
          "obs_sky_blue_001",
          "obs_stadium_building_001",
          "obs_stadium_green_logo_001",
          "obs_stadium_path_001",
          "obs_stadium_roof_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_metal_fence_001",
          "obs_sky_blue_001",
          "obs_stadium_building_001",
          "obs_stadium_green_logo_001",
          "obs_stadium_path_001",
          "obs_stadium_roof_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_metal_fence_001",
          "obs_sky_blue_001",
          "obs_stadium_building_001",
          "obs_stadium_green_logo_001",
          "obs_stadium_path_001",
          "obs_stadium_roof_structure_001"
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
- V2 stress role: `object_heavy_item`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.99`
- Cost USD: `0.0064576`
- Artwork observations: `7`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: bell, bell body, bell handle, band, black silver pattern, highlight, swirling blue-purple vortex. Counts: bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bell-like object | bell | object | foreground | high | 1 |
| body of bell | bell body | object | foreground | high | 1 |
| handle of bell | bell handle | object | foreground | high | 1 |
| ring-like band | band | object | foreground | medium | 0.9 |
| black and silver geometric pattern | black silver pattern | object | foreground | medium | 1 |
| bright spot highlight on bell | highlight | object | foreground | medium | 0.95 |
| swirling blue-purple vortex background | swirling blue-purple vortex | environment | background | high | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| top left blue Japanese Katakana text | card_ui_text | top-left | visible | 0.95 |
| top right grey Japanese Katakana text | card_ui_text | top-right | visible | 0.95 |
| card name text in black Japanese Katakana characters | card_ui_text | top-left-below-header | visible | 1 |
| flavor or rule text in white Japanese characters on card lower-left | card_ui_text | lower-left | visible | 0.9 |
| illustrator name text 'Illus. Toystep Beach' | card_ui_text | bottom-left | visible | 0.95 |
| set icon 'J M5' and collector number '105/081 SR' in black and silver at bottom center | card_ui_text | bottom-center | visible | 1 |
| copyright text at bottom edge in small font | card_ui_text | bottom-edge | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | label | obs_object_001 | 1 |
| fact_002 | objects_and_props | colors | obs_object_001_black_and_silver_pattern | 1 |
| fact_003 | objects_and_props | location | obs_object_001 | 1 |
| fact_004 | counts | exact count | obs_object_001 | 1 |
| fact_005 | environment | background pattern | obs_background_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_006 | card name text | obs_text_003 | 1 |
| fact_007 | illustrator text | obs_text_005 | 0.95 |
| fact_008 | collector number and set code | obs_text_006 | 1 |
| fact_009 | copyright line text | obs_text_007 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_006",
    "fact_007",
    "fact_008",
    "fact_009"
  ],
  "name_text_observation_ids": [
    "obs_text_003"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_text_006"
  ],
  "set_symbol_observation_ids": [
    "obs_text_006"
  ],
  "rarity_mark_observation_ids": [
    "obs_text_006"
  ],
  "copyright_line_observation_ids": [
    "obs_text_007"
  ],
  "bottom_line_text_observation_ids": [],
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
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
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
| bell | exact | 1 | obs_object_001 | 1 |

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
| bell body | obs_object_001_body |
| bell handle | obs_object_001_handle |
| band | obs_object_001_neck_band |
| black silver pattern | obs_object_001_black_and_silver_pattern |
| highlight | obs_object_001_highlight |
| swirling blue-purple vortex | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_background_001, obs_object_001, obs_object_001_black_and_silver_pattern, obs_object_001_highlight | deterministic_rule | 0.92 |
| close crop | obs_background_001, obs_object_001, obs_object_001_black_and_silver_pattern, obs_object_001_highlight | deterministic_rule | 0.92 |
| spiral motif | obs_background_001 | deterministic_rule | 1 |
| spiral motif | obs_background_001, obs_object_001, obs_object_001_black_and_silver_pattern, obs_object_001_highlight | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bell, bell body, bell handle, band, black silver pattern, highlight, swirling blue-purple vortex. Counts: bell: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "bell-like object",
      "normalized_label": "bell",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001_body",
      "kind": "object",
      "label": "body of bell",
      "normalized_label": "bell body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001_handle",
      "kind": "object",
      "label": "handle of bell",
      "normalized_label": "bell handle",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001_neck_band",
      "kind": "object",
      "label": "ring-like band",
      "normalized_label": "band",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001_black_and_silver_pattern",
      "kind": "object",
      "label": "black and silver geometric pattern",
      "normalized_label": "black silver pattern",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001_highlight",
      "kind": "object",
      "label": "bright spot highlight on bell",
      "normalized_label": "highlight",
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
      "label": "swirling blue-purple vortex background",
      "normalized_label": "swirling blue-purple vortex",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_001",
      "kind": "card_ui_text",
      "label": "top left blue Japanese Katakana text",
      "normalized_label": "Japanese Katakana text",
      "scene_layer": "card_ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_002",
      "kind": "card_ui_text",
      "label": "top right grey Japanese Katakana text",
      "normalized_label": "Japanese Katakana text",
      "scene_layer": "card_ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_003",
      "kind": "card_ui_text",
      "label": "card name text in black Japanese Katakana characters",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top-left-below-header",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_004",
      "kind": "card_ui_text",
      "label": "flavor or rule text in white Japanese characters on card lower-left",
      "normalized_label": "rule text",
      "scene_layer": "card_ui",
      "frame_position": "lower-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_005",
      "kind": "card_ui_text",
      "label": "illustrator name text 'Illus. Toystep Beach'",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_006",
      "kind": "card_ui_text",
      "label": "set icon 'J M5' and collector number '105/081 SR' in black and silver at bottom center",
      "normalized_label": "set and collector number text",
      "scene_layer": "card_ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_007",
      "kind": "card_ui_text",
      "label": "copyright text at bottom edge in small font",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom-edge",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "label",
      "value": "bell-like object",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "[0].colors",
      "claim": "colors",
      "value": "black and silver",
      "supporting_observation_ids": [
        "obs_object_001_black_and_silver_pattern"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "[0].location",
      "claim": "location",
      "value": "foreground center",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "counts",
      "field_path": "[0]",
      "claim": "exact count",
      "value": "1",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "environment",
      "field_path": "setting",
      "claim": "background pattern",
      "value": "swirling blue-purple vortex",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "Japanese Katakana characters for 'Dark Bell'",
      "supporting_observation_ids": [
        "obs_text_003"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator text",
      "value": "Illus. Toystep Beach",
      "supporting_observation_ids": [
        "obs_text_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "collector number and set code",
      "value": "105/081 SR, J M5",
      "supporting_observation_ids": [
        "obs_text_006"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright line text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_text_007"
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
      "normalized_label": "bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_object_001",
      "obs_object_001_black_and_silver_pattern",
      "obs_object_001_body",
      "obs_object_001_handle",
      "obs_object_001_highlight",
      "obs_object_001_neck_band"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "swirling vortex"
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
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "bell-like object",
      "normalized_label": "bell",
      "object_type": "bell",
      "colors": [
        "black",
        "silver"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded body"
      ],
      "location": "foreground center",
      "count_reference": "count_001",
      "confidence": 1
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "purple",
      "silver",
      "white"
    ],
    "lighting": [
      "highlight on bell"
    ],
    "shadows": [],
    "highlights": [
      "bright spot highlight on bell"
    ],
    "composition": [
      "central bell object",
      "swirling vortex background"
    ],
    "camera_angle": "angled slightly from handle end to bell mouth",
    "framing": "central close crop with slight margin",
    "cropping": [],
    "depth": "3D depth perception from shading and highlights",
    "motion_cues": [
      "swirling vortex suggesting movement"
    ],
    "motifs": [
      "geometric polygon facets on bell"
    ],
    "repeated_shapes": [
      "diamond facets",
      "triangles"
    ],
    "style_cues": [
      "Japanese trading card illustration style",
      "stylized art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_object_001",
      "obs_object_001_black_and_silver_pattern",
      "obs_object_001_highlight"
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
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_005"
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
        "obs_object_001_highlight"
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
        "fact_009"
      ],
      "name_text_observation_ids": [
        "obs_text_003"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_text_006"
      ],
      "set_symbol_observation_ids": [
        "obs_text_006"
      ],
      "rarity_mark_observation_ids": [
        "obs_text_006"
      ],
      "copyright_line_observation_ids": [
        "obs_text_007"
      ],
      "bottom_line_text_observation_ids": [],
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
      "fact_ids": [
        "fact_004"
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
        "bell",
        "bell body",
        "bell handle",
        "band",
        "black silver pattern",
        "highlight",
        "swirling blue-purple vortex"
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
      "term": "bell body",
      "supporting_observation_ids": [
        "obs_object_001_body"
      ]
    },
    {
      "term": "bell handle",
      "supporting_observation_ids": [
        "obs_object_001_handle"
      ]
    },
    {
      "term": "band",
      "supporting_observation_ids": [
        "obs_object_001_neck_band"
      ]
    },
    {
      "term": "black silver pattern",
      "supporting_observation_ids": [
        "obs_object_001_black_and_silver_pattern"
      ]
    },
    {
      "term": "highlight",
      "supporting_observation_ids": [
        "obs_object_001_highlight"
      ]
    },
    {
      "term": "swirling blue-purple vortex",
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
          "obs_object_001",
          "obs_object_001_black_and_silver_pattern",
          "obs_object_001_highlight"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "close crop",
        "source_observation_ids": [
          "obs_background_001",
          "obs_object_001",
          "obs_object_001_black_and_silver_pattern",
          "obs_object_001_highlight"
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
        "confidence": 1
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_001",
          "obs_object_001",
          "obs_object_001_black_and_silver_pattern",
          "obs_object_001_highlight"
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
- GV-PK-JPN-M5-108: fact_graph_semantic_fact_label_not_supported_v1:semantic_fact_002

