# Card Visual Fact Graph V1 Review Packet

Generated rows: 2
Validation failures: 2
Skipped images: 0
Estimated cost USD: 0.0163842

## Rows

### GV-PK-JPN-TCGCOLLECTOR11541-013 - Psychic Energy

- Branch: `energy`
- Review status: `needs_review`
- Description confidence: `1`
- Attribute confidence: `1`
- Cost USD: `0.0048903`
- Derived digest: Fact digest. Visible observations: Psychic Energy Symbol, Purple Color Gradient, Smooth Surface. Counts: Psychic Energy Symbol: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Psychic Energy Symbol | symbol | foreground | high | 1 |
| Purple Color Gradient | palette | foreground | medium | 0.9 |
| Smooth Surface | texture | surface | medium | 0.95 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| Psychic Energy Symbol | exact | 1 | obs_symbol_001 | 1 |

| Search term | Supporting observations |
|---|---|
| Psychic Energy Symbol | obs_symbol_001 |
| Purple Color Palette | obs_palette_001 |
| Smooth Card Surface | obs_texture_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_symbol_001",
      "kind": "symbol",
      "label": "Psychic Energy Symbol",
      "normalized_label": "Psychic Energy Symbol",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "palette",
      "label": "Purple Color Gradient",
      "normalized_label": "Purple Color Gradient",
      "scene_layer": "foreground",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_texture_001",
      "kind": "texture",
      "label": "Smooth Surface",
      "normalized_label": "Smooth Surface",
      "scene_layer": "surface",
      "frame_position": "entire card",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_symbol_001",
      "normalized_label": "Psychic Energy Symbol",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_symbol_001"
    ],
    "midground": [],
    "background": [
      "obs_palette_001"
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
    "camera_angle": "not applicable",
    "framing": "full card",
    "cropping": [],
    "depth": "flat",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": []
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "observed",
    "environment_review": "not_applicable",
    "objects_and_props_review": "none_visible",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
  },
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Psychic Energy Symbol",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "Purple Color Palette",
      "supporting_observation_ids": [
        "obs_palette_001"
      ]
    },
    {
      "term": "Smooth Card Surface",
      "supporting_observation_ids": [
        "obs_texture_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-106 - Tremendous Bomb

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.00473235`
- Derived digest: Fact digest. Visible observations: bomb, explosion effect. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| bomb | object | foreground | high | 0.95 |
| explosion effect | object | background | medium | 0.9 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_bomb_001 | 0.95 |

| Search term | Supporting observations |
|---|---|
| bomb | obs_bomb_001 |
| explosion effect | obs_explosion_effect_001 |
| black bomb | obs_bomb_001 |

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
      "observation_id": "obs_explosion_effect_001",
      "kind": "object",
      "label": "explosion effect",
      "normalized_label": "explosion effect",
      "scene_layer": "background",
      "frame_position": "surrounding",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "moderate"
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
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_bomb_001"
    ],
    "midground": [],
    "background": [
      "obs_explosion_effect_001"
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
        "matte",
        "metallic"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_explosion_effect_001",
      "label": "explosion effect",
      "normalized_label": "explosion effect",
      "object_type": "visual effect",
      "colors": [
        "blue",
        "orange",
        "yellow"
      ],
      "material_appearance": [
        "abstract"
      ],
      "location": "surrounding",
      "count_reference": "not_visible",
      "confidence": 0.9
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
      "bright"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "central object"
    ],
    "camera_angle": "straight",
    "framing": "close-up",
    "cropping": [],
    "depth": "variable",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": []
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
    "surface_and_scan_cues_review": "not_applicable"
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
      "term": "explosion effect",
      "supporting_observation_ids": [
        "obs_explosion_effect_001"
      ]
    },
    {
      "term": "black bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    }
  ]
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-113: fact_graph_count_without_supporting_observation:count_tree_001, fact_graph_exact_count_missing:count_tree_001, fact_graph_search_terms_too_sparse, semantic_tags_too_sparse
- GV-PK-JPN-TCGCOLLECTOR11526-019: fact_graph_subject_observation_missing:obs_subject_001
