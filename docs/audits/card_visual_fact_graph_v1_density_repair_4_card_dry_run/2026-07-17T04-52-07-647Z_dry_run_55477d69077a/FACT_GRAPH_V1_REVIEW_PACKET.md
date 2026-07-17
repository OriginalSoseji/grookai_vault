# Card Visual Fact Graph V1 Review Packet

Generated rows: 2
Validation failures: 2
Skipped images: 0
Estimated cost USD: 0.01774815

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.00252705`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, body, flames, lantern body, purple, black, white, floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Chandelure | scene_subject | foreground | high | 0.95 |
| body | anatomy | foreground | high | 0.93 |
| flames | anatomy | foreground | high | 0.9 |
| lantern body | anatomy | foreground | high | 0.9 |
| purple | physical_features | foreground | high | 0.91 |
| black | physical_features | foreground | high | 0.91 |
| white | physical_features | foreground | high | 0.91 |
| floating | pose | foreground | high | 0.95 |
| dark clouds | environment | background | medium | 0.85 |
| light effects | effects | foreground | medium | 0.87 |
| dark colors | palette | background | medium | 0.84 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

| Search term | Supporting observations |
|---|---|
| Mega Chandelure | obs_subject_001 |
| floating Mega Chandelure | obs_pose_001, obs_subject_001 |
| dark clouds background | obs_background_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure",
      "normalized_label": "Mega Chandelure",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_001",
      "kind": "anatomy",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_flame_001",
      "kind": "anatomy",
      "label": "flames",
      "normalized_label": "flame",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lantern_001",
      "kind": "anatomy",
      "label": "lantern body",
      "normalized_label": "lantern body",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "physical_features",
      "label": "purple",
      "normalized_label": "purple",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "physical_features",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_003",
      "kind": "physical_features",
      "label": "white",
      "normalized_label": "white",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "floating",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "dark clouds",
      "normalized_label": "dark clouds",
      "scene_layer": "background",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_light_effect_001",
      "kind": "effects",
      "label": "light effects",
      "normalized_label": "light effect",
      "scene_layer": "foreground",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.87,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "palette",
      "label": "dark colors",
      "normalized_label": "dark colors",
      "scene_layer": "background",
      "frame_position": "visible",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.84,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Chandelure",
      "identity_confidence": 0.95,
      "anatomy": [
        "body"
      ],
      "physical_features": [
        "black",
        "purple",
        "white"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upward",
      "action_state": [
        "not_known"
      ],
      "facial_evidence": {
        "eyes": "not_visible",
        "mouth": "not_visible",
        "eyebrows": "not_visible",
        "face_position": "not_visible",
        "other_visible_evidence": []
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
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_body_001",
      "obs_flame_001",
      "obs_lantern_001",
      "obs_light_effect_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "dark clouds"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "dark"
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
      "dark colors"
    ],
    "lighting": [],
    "shadows": [],
    "highlights": [],
    "composition": [],
    "camera_angle": "",
    "framing": "",
    "cropping": [],
    "depth": "",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "floating Mega Chandelure",
      "supporting_observation_ids": [
        "obs_pose_001",
        "obs_subject_001"
      ]
    },
    {
      "term": "dark clouds background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-106 - Tremendous Bomb

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `0.9`
- Attribute confidence: `0.9`
- Cost USD: `0.00532065`
- Derived digest: Fact digest. Visible observations: bomb, round body, yellow stripe, red fuse, spark, radial lines. Counts: bomb: 1, yellow stripe: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| bomb | object | foreground | high | 0.95 |
| round body | object | foreground | high | 0.95 |
| yellow stripe | object | foreground | high | 0.9 |
| red fuse | object | foreground | high | 0.9 |
| spark | object | foreground | high | 0.85 |
| radial lines | object | foreground | high | 0.8 |
| background color regions | object | background | low | 0.75 |
| color palette | object | background | low | 0.7 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_bomb_001 | 0.95 |
| yellow stripe | exact | 1 | obs_bomb_stripe_001 | 0.9 |

| Search term | Supporting observations |
|---|---|
| bomb | obs_bomb_001 |
| yellow stripe | obs_bomb_stripe_001 |
| black rounded body | obs_bomb_body_001 |

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
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_001",
      "kind": "object",
      "label": "round body",
      "normalized_label": "round body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_stripe_001",
      "kind": "object",
      "label": "yellow stripe",
      "normalized_label": "stripe",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "kind": "object",
      "label": "red fuse",
      "normalized_label": "fuse",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_spark_001",
      "kind": "object",
      "label": "spark",
      "normalized_label": "spark",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_radial_lines_001",
      "kind": "object",
      "label": "radial lines",
      "normalized_label": "lines",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.8,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_background_color_001",
      "kind": "object",
      "label": "background color regions",
      "normalized_label": "background color",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.75,
      "evidence_strength": "weak"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "object",
      "label": "color palette",
      "normalized_label": "palette",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.7,
      "evidence_strength": "weak"
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
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    },
    {
      "count_id": "count_stripe_001",
      "normalized_label": "yellow stripe",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_bomb_stripe_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_bomb_001",
      "obs_bomb_body_001",
      "obs_bomb_fuse_001",
      "obs_bomb_spark_001",
      "obs_bomb_stripe_001",
      "obs_radial_lines_001"
    ],
    "midground": [],
    "background": [
      "obs_background_color_001",
      "obs_palette_001"
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
    "supporting_observation_ids": []
  },
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "item",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded surface",
        "yellow band"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_bomb_body_001",
      "label": "rounded body",
      "normalized_label": "rounded body",
      "object_type": "item",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "dark rounded surface"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_bomb_stripe_001",
      "label": "stripe",
      "normalized_label": "stripe",
      "object_type": "item",
      "colors": [
        "yellow"
      ],
      "material_appearance": [
        "yellow band"
      ],
      "location": "center",
      "count_reference": "count_stripe_001",
      "confidence": 0.9
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "label": "fuse",
      "normalized_label": "fuse",
      "object_type": "item",
      "colors": [
        "red"
      ],
      "material_appearance": [
        "red surface"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.9
    },
    {
      "observation_id": "obs_bomb_spark_001",
      "label": "spark",
      "normalized_label": "spark",
      "object_type": "effect",
      "colors": [
        "orange",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.85
    },
    {
      "observation_id": "obs_radial_lines_001",
      "label": "radial lines",
      "normalized_label": "lines",
      "object_type": "design",
      "colors": [
        "various"
      ],
      "material_appearance": [],
      "location": "background",
      "count_reference": "count_bomb_001",
      "confidence": 0.8
    },
    {
      "observation_id": "obs_background_color_001",
      "label": "background color regions",
      "normalized_label": "background",
      "object_type": "design",
      "colors": [
        "blue",
        "orange"
      ],
      "material_appearance": [],
      "location": "background",
      "count_reference": "count_bomb_001",
      "confidence": 0.75
    },
    {
      "observation_id": "obs_palette_001",
      "label": "color palette",
      "normalized_label": "palette",
      "object_type": "design",
      "colors": [
        "bright colors"
      ],
      "material_appearance": [],
      "location": "background",
      "count_reference": "count_bomb_001",
      "confidence": 0.7
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "bright colors",
      "red",
      "yellow"
    ],
    "lighting": [
      "bright"
    ],
    "shadows": [],
    "highlights": [
      "bright highlight"
    ],
    "composition": [],
    "camera_angle": "frontal",
    "framing": "centered",
    "cropping": [],
    "depth": "flat",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_bomb_001",
      "obs_bomb_body_001",
      "obs_bomb_fuse_001",
      "obs_bomb_spark_001",
      "obs_bomb_stripe_001",
      "obs_radial_lines_001"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    },
    {
      "term": "yellow stripe",
      "supporting_observation_ids": [
        "obs_bomb_stripe_001"
      ]
    },
    {
      "term": "black rounded body",
      "supporting_observation_ids": [
        "obs_bomb_body_001"
      ]
    }
  ]
}
```

</details>

## Validation Failures

- GV-PK-JPN-TCGCOLLECTOR11526-019: fact_graph_subjects_not_expected_for_branch:stadium, fact_graph_nonliving_subject_identity:obs_lightning_001, fact_graph_high_salience_observations_too_sparse:stadium:3
- GV-PK-JPN-TCGCOLLECTOR11541-013: fact_graph_high_salience_observations_too_sparse:energy:3
