# Card Visual Fact Graph V2 Review Packet

Generated rows: 2
Validation failures: 2
Skipped images: 0
Estimated cost USD: 0.0326792

## Rows

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- V2 stress role: `environment_heavy_stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0063232`
- Artwork observations: `9`
- Card UI / print-marker observations: `1`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: sky, stadium building, windows, decorative path, traffic cones, railings, trees, river. Counts: traffic cones: 4-6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| blue sky with some clouds | sky | sky | background | medium | 0.95 |
| brown building with abstract rounded walls and blue and purple horizontal stripes | stadium building | building | midground | high | 0.98 |
| windows with reflections on building wall | windows | object | midground | medium | 0.9 |
| green pathway with yellow zigzag pattern | decorative path | object | foreground | high | 0.96 |
| group of orange and white traffic cones | traffic cones | object | foreground | medium | 0.9 |
| black railings alongside cones and pathway | railings | object | foreground | medium | 0.9 |
| cluster of green trees on right side | trees | plant | background | medium | 0.95 |
| river or water body with reflections on right side | river | object | background | medium | 0.95 |
| green vertical poles or structures near building | green poles | object | midground | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| green circular emblem with white leaf symbol on building wall and ground | object | center bottom and mid | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting includes stadium building | obs_structure_001 | 0.98 |
| fact_env_002 | environment | sky is blue with scattered clouds | obs_sky_001 | 0.95 |
| fact_env_003 | environment | there are multiple green trees | obs_trees_001 | 0.95 |
| fact_env_004 | environment | presence of river or water body | obs_river_001 | 0.95 |
| fact_env_005 | environment | presence of architectural elements: stadium building and poles | obs_green_poles_001, obs_structure_001 | 0.95 |

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
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | card_ui_and_print_markers.name_text_observation_ids: small text partly unreadable |
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
| traffic cones | estimated_range | 4-6 | obs_traffic_cones_001 | 0.9 |

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
| stadium building | obs_structure_001 |
| windows | obs_windows_001 |
| decorative path | obs_pathway_001 |
| traffic cones | obs_traffic_cones_001 |
| railings | obs_black_railings_001 |
| trees | obs_trees_001 |
| river | obs_river_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_structure_001 | deterministic_rule | 0.98 |
| building | obs_windows_001 | deterministic_rule | 0.9 |
| building | obs_green_poles_001 | deterministic_rule | 0.9 |
| building | obs_logo_001, obs_pathway_001, obs_structure_001, obs_traffic_cones_001, obs_windows_001 | deterministic_rule | 0.92 |
| circular motif | obs_structure_001 | deterministic_rule | 0.98 |
| cloud | obs_sky_001 | deterministic_rule | 0.95 |
| right orientation | obs_trees_001 | deterministic_rule | 0.95 |
| right orientation | obs_river_001 | deterministic_rule | 0.95 |
| sky | obs_sky_001 | deterministic_rule | 0.95 |
| terrain | obs_pathway_001 | deterministic_rule | 0.96 |
| terrain | obs_logo_001, obs_pathway_001, obs_structure_001, obs_traffic_cones_001, obs_windows_001 | deterministic_rule | 0.92 |
| tree | obs_trees_001 | deterministic_rule | 0.95 |
| water | obs_river_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: sky, stadium building, windows, decorative path, traffic cones, railings, trees, river. Counts: traffic cones: 4-6.
- Quality flags: `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "blue sky with some clouds",
      "normalized_label": "sky",
      "scene_layer": "background",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_structure_001",
      "kind": "building",
      "label": "brown building with abstract rounded walls and blue and purple horizontal stripes",
      "normalized_label": "stadium building",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_logo_001",
      "kind": "object",
      "label": "green circular emblem with white leaf symbol on building wall and ground",
      "normalized_label": "green leaf emblem",
      "scene_layer": "midground",
      "frame_position": "center bottom and mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_windows_001",
      "kind": "object",
      "label": "windows with reflections on building wall",
      "normalized_label": "windows",
      "scene_layer": "midground",
      "frame_position": "center lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pathway_001",
      "kind": "object",
      "label": "green pathway with yellow zigzag pattern",
      "normalized_label": "decorative path",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_traffic_cones_001",
      "kind": "object",
      "label": "group of orange and white traffic cones",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "left bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_black_railings_001",
      "kind": "object",
      "label": "black railings alongside cones and pathway",
      "normalized_label": "railings",
      "scene_layer": "foreground",
      "frame_position": "left bottom side",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "plant",
      "label": "cluster of green trees on right side",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "right background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_river_001",
      "kind": "object",
      "label": "river or water body with reflections on right side",
      "normalized_label": "river",
      "scene_layer": "background",
      "frame_position": "right foreground",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_green_poles_001",
      "kind": "object",
      "label": "green vertical poles or structures near building",
      "normalized_label": "green poles",
      "scene_layer": "midground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting includes stadium building",
      "value": "stadium building",
      "supporting_observation_ids": [
        "obs_structure_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky is blue with scattered clouds",
      "value": "blue sky with clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "there are multiple green trees",
      "value": "trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "water",
      "claim": "presence of river or water body",
      "value": "river",
      "supporting_observation_ids": [
        "obs_river_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "architecture",
      "claim": "presence of architectural elements: stadium building and poles",
      "value": "stadium building and green poles",
      "supporting_observation_ids": [
        "obs_green_poles_001",
        "obs_structure_001"
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
      "count_id": "count_traffic_cones_001",
      "normalized_label": "traffic cones",
      "count_type": "estimated_range",
      "exact_count": 0,
      "estimated_min": 4,
      "estimated_max": 6,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_traffic_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_black_railings_001",
      "obs_pathway_001",
      "obs_traffic_cones_001"
    ],
    "midground": [
      "obs_green_poles_001",
      "obs_logo_001",
      "obs_structure_001",
      "obs_windows_001"
    ],
    "background": [
      "obs_river_001",
      "obs_sky_001",
      "obs_trees_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue",
      "clouds"
    ],
    "ground": [
      "decorated concrete"
    ],
    "terrain": [
      "flat"
    ],
    "plants": [
      "trees"
    ],
    "architecture": [
      "metal poles",
      "modern stadium building"
    ],
    "water": [
      "river"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_green_poles_001",
      "obs_river_001",
      "obs_sky_001",
      "obs_structure_001",
      "obs_trees_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_traffic_cones_001",
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
      "location": "foreground left",
      "count_reference": "count_traffic_cones_001",
      "confidence": 0.9
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
      "white",
      "yellow"
    ],
    "lighting": [
      "diffuse natural daylight"
    ],
    "shadows": [
      "soft shadows on ground"
    ],
    "highlights": [
      "reflective windows"
    ],
    "composition": [
      "curved stadium walls",
      "foreground objects leading path"
    ],
    "camera_angle": "slight high angle, looking down and across field",
    "framing": "medium close framing of stadium corner and foreground",
    "cropping": [
      "full stadium corner visible"
    ],
    "depth": "moderate depth with background trees and sky",
    "motion_cues": [],
    "motifs": [
      "leaf emblem repeated on building and ground"
    ],
    "repeated_shapes": [
      "horizontal stripes",
      "zigzag pattern"
    ],
    "style_cues": [
      "realistic digital art"
    ],
    "supporting_observation_ids": [
      "obs_logo_001",
      "obs_pathway_001",
      "obs_structure_001",
      "obs_traffic_cones_001",
      "obs_windows_001"
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
        "fact_env_006"
      ],
      "object_observation_ids": [
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
        "obs_green_poles_001",
        "obs_river_001",
        "obs_sky_001",
        "obs_structure_001",
        "obs_trees_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_env_007"
      ],
      "observation_ids": [
        "obs_logo_001",
        "obs_pathway_001",
        "obs_structure_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_env_008"
      ],
      "observation_ids": [
        "obs_pathway_001",
        "obs_sky_001",
        "obs_structure_001"
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
        "sky",
        "stadium building",
        "windows",
        "decorative path",
        "traffic cones",
        "railings",
        "trees",
        "river"
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
          "field_path": "card_ui_and_print_markers.name_text_observation_ids",
          "reason": "small text partly unreadable",
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
      "term": "sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "stadium building",
      "supporting_observation_ids": [
        "obs_structure_001"
      ]
    },
    {
      "term": "windows",
      "supporting_observation_ids": [
        "obs_windows_001"
      ]
    },
    {
      "term": "decorative path",
      "supporting_observation_ids": [
        "obs_pathway_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_traffic_cones_001"
      ]
    },
    {
      "term": "railings",
      "supporting_observation_ids": [
        "obs_black_railings_001"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "river",
      "supporting_observation_ids": [
        "obs_river_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_windows_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_green_poles_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_logo_001",
          "obs_pathway_001",
          "obs_structure_001",
          "obs_traffic_cones_001",
          "obs_windows_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_structure_001"
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
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_river_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_pathway_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_logo_001",
          "obs_pathway_001",
          "obs_structure_001",
          "obs_traffic_cones_001",
          "obs_windows_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_river_001"
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
- V2 stress role: `object_heavy_item`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0073028`
- Artwork observations: `7`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Visible observations: dark bell, dark bell handle, dark bell part, dark bell frame, dark color, light reflective gem, blue vortex swirl background. Counts: dark bell objects: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark bell | dark bell | object | foreground | high | 0.99 |
| dark bell handle | dark bell handle | object | foreground | medium | 0.95 |
| dark bell bell part | dark bell part | object | foreground | high | 0.99 |
| dark bell bell frame | dark bell frame | object | foreground | medium | 0.9 |
| dark color | dark color | object | foreground | medium | 0.98 |
| light-reflective gem | light reflective gem | object | foreground | medium | 0.85 |
| blue vortex swirl background | blue vortex swirl background | environment | background | medium | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_ui_text | top left area | visible | 0.9 |
| card type text in Japanese | card_ui_text | top right area | visible | 0.9 |
| illustrator text 'Illus. Toyste Beach' | illustrator_text | bottom left | visible | 0.95 |
| set code J M5 105/081 SR | collector_number | bottom center | visible | 0.95 |
| bottom legal copyright line for 2026 Pokémon/Nintendo/Creatures/GAME FREAK | bottom_line_text | bottom edge | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_dark_bell_obj_001 | objects_and_props | The card contains the object 'Dark Bell' visually represented in the art | obs_object_dark_bell_001 | 0.99 |
| fact_dark_bell_handle_001 | objects_and_props | The Dark Bell has a handle part depicted in the illustration | obs_object_dark_bell_handle_001 | 0.95 |
| fact_dark_bell_bell_part_001 | objects_and_props | The Dark Bell has an octagonal bell part | obs_object_dark_bell_bell_part_001 | 0.99 |
| fact_dark_bell_color_dark_001 | objects_and_props | The Dark Bell has a dark color with bright highlights and patterns | obs_object_dark_bell_dark_color_001 | 0.98 |
| fact_dark_bell_gem_001 | objects_and_props | The Dark Bell's bell part has a shiny gem-like circle inside | obs_object_dark_bell_gem_001 | 0.85 |
| fact_background_blue_vortex_001 | environment | The background behind the Dark Bell is a blue vortex swirl pattern | obs_background_swirl_001 | 0.98 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_name_text_001 | Card name text is visible in Japanese | obs_card_ui_name_text_001 | 0.9 |
| fact_ui_card_type_001 | Card type text is visible in Japanese at the top right | obs_card_ui_type_text_001 | 0.9 |
| fact_ui_illustrator_001 | Illustrator text 'Illus. Toyste Beach' is visible in bottom left | obs_card_ui_illustrator_001 | 0.95 |
| fact_ui_collector_number_001 | Set code and collector number 'J M5 105/081 SR' is visible at bottom center | obs_card_ui_set_code_001 | 0.95 |
| fact_ui_bottom_line_001 | Copyright line for 2026 Pokémon/Nintendo/Creatures/GAME FREAK is visible | obs_card_ui_bottom_text_001 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_bottom_line_001",
    "fact_ui_card_type_001",
    "fact_ui_collector_number_001",
    "fact_ui_illustrator_001",
    "fact_ui_name_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_code_001"
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
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
| dark bell objects | exact | 1 | obs_object_dark_bell_001 | 0.99 |

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
| dark bell handle | obs_object_dark_bell_handle_001 |
| dark bell part | obs_object_dark_bell_bell_part_001 |
| dark bell frame | obs_object_dark_bell_bell_frame_001 |
| dark color | obs_object_dark_bell_dark_color_001 |
| light reflective gem | obs_object_dark_bell_gem_001 |
| blue vortex swirl background | obs_background_swirl_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_background_swirl_001, obs_object_dark_bell_001 | deterministic_rule | 0.92 |
| circular motif | obs_background_swirl_001, obs_object_dark_bell_001 | deterministic_rule | 0.92 |
| diagonal composition | obs_background_swirl_001, obs_object_dark_bell_001 | deterministic_rule | 0.92 |
| downward-right orientation | obs_background_swirl_001, obs_object_dark_bell_001 | deterministic_rule | 0.92 |
| glowing highlights | obs_background_swirl_001, obs_object_dark_bell_001 | deterministic_rule | 0.92 |
| spiral motif | obs_background_swirl_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, dark bell handle, dark bell part, dark bell frame, dark color, light reflective gem, blue vortex swirl background. Counts: dark bell objects: 1.
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
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_handle_001",
      "kind": "object",
      "label": "dark bell handle",
      "normalized_label": "dark bell handle",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_bell_part_001",
      "kind": "object",
      "label": "dark bell bell part",
      "normalized_label": "dark bell part",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_bell_frame_001",
      "kind": "object",
      "label": "dark bell bell frame",
      "normalized_label": "dark bell frame",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_dark_color_001",
      "kind": "object",
      "label": "dark color",
      "normalized_label": "dark color",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_gem_001",
      "kind": "object",
      "label": "light-reflective gem",
      "normalized_label": "light reflective gem",
      "scene_layer": "foreground",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_swirl_001",
      "kind": "environment",
      "label": "blue vortex swirl background",
      "normalized_label": "blue vortex swirl background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top left area",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_type_text_001",
      "kind": "card_ui_text",
      "label": "card type text in Japanese",
      "normalized_label": "card type text",
      "scene_layer": "card_ui",
      "frame_position": "top right area",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator text 'Illus. Toyste Beach'",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "collector_number",
      "label": "set code J M5 105/081 SR",
      "normalized_label": "collector number and rarity",
      "scene_layer": "card_ui",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "bottom legal copyright line for 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright text",
      "scene_layer": "card_ui",
      "frame_position": "bottom edge",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_dark_bell_obj_001",
      "module": "objects_and_props",
      "field_path": "objects[0]",
      "claim": "The card contains the object 'Dark Bell' visually represented in the art",
      "value": "dark bell",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_dark_bell_handle_001",
      "module": "objects_and_props",
      "field_path": "objects[1]",
      "claim": "The Dark Bell has a handle part depicted in the illustration",
      "value": "dark bell handle",
      "supporting_observation_ids": [
        "obs_object_dark_bell_handle_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_dark_bell_bell_part_001",
      "module": "objects_and_props",
      "field_path": "objects[2]",
      "claim": "The Dark Bell has an octagonal bell part",
      "value": "dark bell part",
      "supporting_observation_ids": [
        "obs_object_dark_bell_bell_part_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_dark_bell_color_dark_001",
      "module": "objects_and_props",
      "field_path": "objects[3].colors",
      "claim": "The Dark Bell has a dark color with bright highlights and patterns",
      "value": "dark with bright highlights and circular motifs",
      "supporting_observation_ids": [
        "obs_object_dark_bell_dark_color_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_dark_bell_gem_001",
      "module": "objects_and_props",
      "field_path": "objects[4]",
      "claim": "The Dark Bell's bell part has a shiny gem-like circle inside",
      "value": "light-reflective gem",
      "supporting_observation_ids": [
        "obs_object_dark_bell_gem_001"
      ],
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_background_blue_vortex_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "The background behind the Dark Bell is a blue vortex swirl pattern",
      "value": "blue vortex swirl background",
      "supporting_observation_ids": [
        "obs_background_swirl_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text is visible in Japanese",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_card_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card type text is visible in Japanese at the top right",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_type_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text 'Illus. Toyste Beach' is visible in bottom left",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Set code and collector number 'J M5 105/081 SR' is visible at bottom center",
      "value": "J M5 105/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_bottom_line_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text",
      "claim": "Copyright line for 2026 Pokémon/Nintendo/Creatures/GAME FREAK is visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_obj_dark_bell_001",
      "normalized_label": "dark bell objects",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
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
      "obs_object_dark_bell_001",
      "obs_object_dark_bell_bell_frame_001",
      "obs_object_dark_bell_bell_part_001",
      "obs_object_dark_bell_dark_color_001",
      "obs_object_dark_bell_gem_001",
      "obs_object_dark_bell_handle_001"
    ],
    "midground": [],
    "background": [
      "obs_background_swirl_001"
    ]
  },
  "environment": {
    "setting": [
      "blue vortex swirl background"
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
      "obs_background_swirl_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_dark_bell_001",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "object_type": "object",
      "colors": [
        "bright highlights",
        "dark"
      ],
      "material_appearance": [
        "bright metallic-like highlights",
        "dark rounded surface",
        "patterned with circular motifs"
      ],
      "location": "center",
      "count_reference": "count_obj_dark_bell_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blues",
      "bright highlights",
      "dark grays",
      "white"
    ],
    "lighting": [
      "some glow on gem",
      "strong directional lighting with bright highlights"
    ],
    "shadows": [
      "soft shadows under bell"
    ],
    "highlights": [
      "bright white highlights on bell edges",
      "glowing gem"
    ],
    "composition": [
      "central composition",
      "diagonal tilt downward right"
    ],
    "camera_angle": "close-up frontal angle",
    "framing": "full object visible",
    "cropping": [],
    "depth": "moderate with distinct foreground and background separation",
    "motion_cues": [
      "swirling vortex suggests motion in background"
    ],
    "motifs": [
      "circular patterns on bell"
    ],
    "repeated_shapes": [
      "octagonal shapes on bell"
    ],
    "style_cues": [
      "cartoon",
      "digital illustration"
    ],
    "supporting_observation_ids": [
      "obs_background_swirl_001",
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
        "fact_dark_bell_bell_part_001",
        "fact_dark_bell_color_dark_001",
        "fact_dark_bell_gem_001",
        "fact_dark_bell_handle_001",
        "fact_dark_bell_obj_001"
      ],
      "object_observation_ids": [
        "obs_object_dark_bell_001",
        "obs_object_dark_bell_bell_part_001",
        "obs_object_dark_bell_dark_color_001",
        "obs_object_dark_bell_gem_001",
        "obs_object_dark_bell_handle_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_background_blue_vortex_001"
      ],
      "observation_ids": [
        "obs_background_swirl_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_swirl_001",
        "obs_object_dark_bell_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_swirl_001",
        "obs_object_dark_bell_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_swirl_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_bottom_line_001",
        "fact_ui_card_type_001",
        "fact_ui_collector_number_001",
        "fact_ui_illustrator_001",
        "fact_ui_name_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_code_001"
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
        "count_obj_dark_bell_001"
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
        "dark bell handle",
        "dark bell part",
        "dark bell frame",
        "dark color",
        "light reflective gem",
        "blue vortex swirl background"
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
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ]
    },
    {
      "term": "dark bell handle",
      "supporting_observation_ids": [
        "obs_object_dark_bell_handle_001"
      ]
    },
    {
      "term": "dark bell part",
      "supporting_observation_ids": [
        "obs_object_dark_bell_bell_part_001"
      ]
    },
    {
      "term": "dark bell frame",
      "supporting_observation_ids": [
        "obs_object_dark_bell_bell_frame_001"
      ]
    },
    {
      "term": "dark color",
      "supporting_observation_ids": [
        "obs_object_dark_bell_dark_color_001"
      ]
    },
    {
      "term": "light reflective gem",
      "supporting_observation_ids": [
        "obs_object_dark_bell_gem_001"
      ]
    },
    {
      "term": "blue vortex swirl background",
      "supporting_observation_ids": [
        "obs_background_swirl_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_background_swirl_001",
          "obs_object_dark_bell_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_background_swirl_001",
          "obs_object_dark_bell_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_background_swirl_001",
          "obs_object_dark_bell_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "downward-right orientation",
        "source_observation_ids": [
          "obs_background_swirl_001",
          "obs_object_dark_bell_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_background_swirl_001",
          "obs_object_dark_bell_001"
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
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-118: fact_graph_semantic_fact_label_not_supported_v1:semfact_001, fact_graph_semantic_fact_label_not_supported_v1:semfact_002, fact_graph_semantic_fact_observation_missing:obs_visual_design_001
- GV-PK-JPN-M5-108: fact_graph_typed_fact_without_supporting_observation:fact_card_ui_002

