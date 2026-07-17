# Card Visual Fact Graph V1 Review Packet

Generated rows: 2
Validation failures: 2
Skipped images: 0
Estimated cost USD: 0.0166824

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `1`
- Attribute confidence: `0.95`
- Cost USD: `0.0022014`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, purple, black, white, purple flames. Counts: purple flames: 3.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Chandelure | scene_subject | foreground | high | 0.95 |
| purple, black, white | color | foreground | high | 0.9 |
| purple flames | scene_subject | foreground | high | 0.9 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| purple flames | exact | 3 | obs_flame_001 | 0.85 |

| Search term | Supporting observations |
|---|---|
| purple flames | obs_flame_001 |
| Mega Chandelure | obs_subject_001 |
| dark forest background |  |

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
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color",
      "label": "purple, black, white",
      "normalized_label": "purple, black, white",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_flame_001",
      "kind": "scene_subject",
      "label": "purple flames",
      "normalized_label": "purple flames",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Chandelure",
      "identity_confidence": 0.95,
      "anatomy": [
        "arms",
        "body",
        "tail"
      ],
      "physical_features": [
        "purple flames",
        "translucent body"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "facing forward",
      "action_state": [
        "not visible"
      ],
      "facial_evidence": {
        "eyes": "not visible",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "not visible",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "not applicable"
      ],
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
      "count_id": "count_flames_001",
      "normalized_label": "purple flames",
      "count_type": "exact",
      "exact_count": 3,
      "estimated_min": 3,
      "estimated_max": 3,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_flame_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.85
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_flame_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": []
  },
  "environment": {
    "setting": [
      "dark forest"
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
    "supporting_observation_ids": []
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "purple",
      "white"
    ],
    "lighting": [],
    "shadows": [],
    "highlights": [],
    "composition": [],
    "camera_angle": "unknown",
    "framing": "unknown",
    "cropping": [],
    "depth": "unknown",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": []
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "observed",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "observed",
    "environment_review": "not_applicable",
    "objects_and_props_review": "none_visible",
    "relationships_review": "none_visible",
    "visual_design_review": "not_applicable",
    "surface_and_scan_cues_review": "none_visible"
  },
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_flame_001"
      ]
    },
    {
      "term": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "dark forest background",
      "supporting_observation_ids": []
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.00494535`
- Derived digest: Fact digest. Scene subjects: aurora, lightning, bare trees. Visible observations: dark sky with colorful aurora, lightning bolts, bare trees. Counts: lightning bolts: 3, bare trees: not_visible.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| dark sky with colorful aurora | scene_subject | background | high | 0.95 |
| lightning bolts | scene_subject | background | high | 0.9 |
| bare trees | scene_subject | foreground | medium | 0.85 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| lightning bolts | exact | 3 | obs_environment_002 | 0.9 |
| bare trees | not_visible | visible but uncountable due to positioning | obs_environment_003 | 0.85 |

| Search term | Supporting observations |
|---|---|
| dark forest | obs_environment_001 |
| lightning bolts | obs_environment_002 |
| bare trees | obs_environment_003 |
| colorful aurora | obs_environment_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "scene_subject",
      "label": "dark sky with colorful aurora",
      "normalized_label": "aurora",
      "scene_layer": "background",
      "frame_position": "upper",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "scene_subject",
      "label": "lightning bolts",
      "normalized_label": "lightning",
      "scene_layer": "background",
      "frame_position": "upper",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "scene_subject",
      "label": "bare trees",
      "normalized_label": "trees",
      "scene_layer": "foreground",
      "frame_position": "lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_environment_001",
      "subject_kind": "scene_subject",
      "identity": "aurora",
      "identity_confidence": 0.95,
      "anatomy": [],
      "physical_features": [
        "colorful",
        "flowing"
      ],
      "pose": [],
      "orientation": "above",
      "action_state": [],
      "facial_evidence": {
        "eyes": "not applicable",
        "mouth": "not applicable",
        "eyebrows": "not applicable",
        "face_position": "not applicable",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "blue",
        "green",
        "pink",
        "purple"
      ],
      "visibility": "visible"
    },
    {
      "observation_id": "obs_environment_002",
      "subject_kind": "scene_subject",
      "identity": "lightning",
      "identity_confidence": 0.9,
      "anatomy": [],
      "physical_features": [
        "bright",
        "zigzag"
      ],
      "pose": [],
      "orientation": "above",
      "action_state": [],
      "facial_evidence": {
        "eyes": "not applicable",
        "mouth": "not applicable",
        "eyebrows": "not applicable",
        "face_position": "not applicable",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "white",
        "yellow"
      ],
      "visibility": "visible"
    },
    {
      "observation_id": "obs_environment_003",
      "subject_kind": "scene_subject",
      "identity": "bare trees",
      "identity_confidence": 0.85,
      "anatomy": [],
      "physical_features": [
        "leafless",
        "stark"
      ],
      "pose": [],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "not applicable",
        "mouth": "not applicable",
        "eyebrows": "not applicable",
        "face_position": "not applicable",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_lightning_001",
      "normalized_label": "lightning bolts",
      "count_type": "exact",
      "exact_count": 3,
      "estimated_min": 3,
      "estimated_max": 3,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "scene_layer": "background",
      "confidence": 0.9
    },
    {
      "count_id": "count_tree_group_001",
      "normalized_label": "bare trees",
      "count_type": "not_visible",
      "exact_count": 0,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "visible but uncountable due to positioning",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "scene_layer": "foreground",
      "confidence": 0.85
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_environment_003"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "environment": {
    "setting": [
      "dark forest"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "dark"
    ],
    "ground": [
      "bare"
    ],
    "terrain": [],
    "plants": [
      "trees"
    ],
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
      "colorful",
      "dark"
    ],
    "lighting": [
      "dynamic",
      "vibrant"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [],
    "camera_angle": "front",
    "framing": "full",
    "cropping": [],
    "depth": "high",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": []
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark forest",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "lightning bolts",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "bare trees",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    },
    {
      "term": "colorful aurora",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ]
}
```

</details>

## Validation Failures

- GV-PK-JPN-TCGCOLLECTOR11541-013: fact_graph_search_term_observation_missing:obs_subject_001, fact_graph_subject_observation_missing:obs_subject_001
- GV-PK-JPN-M5-106: fact_graph_search_terms_too_sparse, semantic_tags_too_sparse
