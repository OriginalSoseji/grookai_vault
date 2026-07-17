# Card Visual Fact Graph V1 Review Packet

Generated rows: 4
Validation failures: 0
Skipped images: 0
Estimated cost USD: 0.0165336

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.9`
- Attribute confidence: `0.8`
- Cost USD: `0.0022662`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, purple flames, dark space. Counts: purple flames: 3, dark space: not_visible.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Chandelure | scene_subject | foreground | high | 0.95 |
| purple flames | scene_subject | background | medium | 0.85 |
| dark space | scene_subject | background | medium | 0.8 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| purple flames | exact | 3 | obs_flame_001 | 0.85 |
| dark space | not_visible | none | obs_background_001 | 0.8 |

| Search term | Supporting observations |
|---|---|
| Mega Chandelure | obs_subject_001 |
| purple flames | obs_flame_001 |
| dark space | obs_background_001 |

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
      "observation_id": "obs_flame_001",
      "kind": "scene_subject",
      "label": "purple flames",
      "normalized_label": "purple flames",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "scene_subject",
      "label": "dark space",
      "normalized_label": "dark space",
      "scene_layer": "background",
      "frame_position": "entire",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.8,
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
        "arms",
        "body",
        "whiskers"
      ],
      "physical_features": [
        "floating",
        "long limbs",
        "rounded body",
        "shiny"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "facing forward",
      "action_state": [
        "floating"
      ],
      "facial_evidence": {
        "eyes": "not visible",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "front",
        "other_visible_evidence": [
          "flames",
          "orb"
        ]
      },
      "clothing_or_accessories": [
        "ornamental hands"
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
      "count_id": "count_flame_001",
      "normalized_label": "purple flames",
      "count_type": "exact",
      "exact_count": 3,
      "estimated_min": 3,
      "estimated_max": 3,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_flame_001"
      ],
      "scene_layer": "background",
      "confidence": 0.85
    },
    {
      "count_id": "count_background_001",
      "normalized_label": "dark space",
      "count_type": "not_visible",
      "exact_count": 0,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "scene_layer": "background",
      "confidence": 0.8
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001",
      "obs_flame_001"
    ]
  },
  "environment": {
    "setting": [
      "dark space"
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
      "obs_background_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "purple",
      "white"
    ],
    "lighting": [
      "dim",
      "glow"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "centered"
    ],
    "camera_angle": "frontal",
    "framing": "tight",
    "cropping": [],
    "depth": "flat",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_flame_001",
      "obs_subject_001"
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
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_flame_001"
      ]
    },
    {
      "term": "dark space",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `pending`
- Description confidence: `0.92`
- Attribute confidence: `0.9`
- Cost USD: `0.00484095`
- Derived digest: Fact digest. Scene subjects: stormy sky. Visible observations: stormy sky, lightning bolts, green, purple, blue, red colors, bare tree. Counts: lightning bolts: 3, bare trees: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| stormy sky | environment | background | high | 0.95 |
| lightning bolts | object | background | high | 0.94 |
| green, purple, blue, red colors | fact | background | medium | 0.9 |
| bare tree | object | foreground | medium | 0.92 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| lightning bolts | exact | 3 | obs_lightning_001 | 0.94 |
| bare trees | exact | 1 | obs_tree_001 | 0.92 |

| Search term | Supporting observations |
|---|---|
| stormy sky | obs_environment_001 |
| lightning bolts | obs_lightning_001 |
| bare tree | obs_tree_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "stormy sky",
      "normalized_label": "stormy sky",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_001",
      "kind": "object",
      "label": "lightning bolts",
      "normalized_label": "lightning bolts",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_colors_001",
      "kind": "fact",
      "label": "green, purple, blue, red colors",
      "normalized_label": "colors",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_tree_001",
      "kind": "object",
      "label": "bare tree",
      "normalized_label": "bare tree",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_environment_001",
      "subject_kind": "scene_subject",
      "identity": "stormy sky",
      "identity_confidence": 0.95,
      "anatomy": [],
      "physical_features": [
        "colors",
        "lightning"
      ],
      "pose": [],
      "orientation": "center",
      "action_state": [],
      "facial_evidence": {
        "eyes": "not applicable",
        "mouth": "not applicable",
        "eyebrows": "not applicable",
        "face_position": "not applicable",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_lightning_bolts_001",
      "normalized_label": "lightning bolts",
      "count_type": "exact",
      "exact_count": 3,
      "estimated_min": 3,
      "estimated_max": 3,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ],
      "scene_layer": "background",
      "confidence": 0.94
    },
    {
      "count_id": "count_trees_001",
      "normalized_label": "bare trees",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_tree_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.92
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_tree_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_lightning_001"
    ]
  },
  "environment": {
    "setting": [
      "stormy sky"
    ],
    "indoor_outdoor": "not applicable",
    "sky": [
      "thunderclouds"
    ],
    "ground": [],
    "terrain": [],
    "plants": [
      "bare tree"
    ],
    "architecture": [],
    "water": [],
    "weather": [
      "stormy"
    ],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_tree_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "green",
      "purple",
      "red"
    ],
    "lighting": [
      "flashes of lightning"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [],
    "camera_angle": "not applicable",
    "framing": "not applicable",
    "cropping": [],
    "depth": "not applicable",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_colors_001"
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
    "objects_and_props_review": "none_visible",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
  },
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "stormy sky",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "lightning bolts",
      "supporting_observation_ids": [
        "obs_lightning_001"
      ]
    },
    {
      "term": "bare tree",
      "supporting_observation_ids": [
        "obs_tree_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11541-013 - Psychic Energy

- Branch: `energy`
- Review status: `needs_review`
- Description confidence: `1`
- Attribute confidence: `1`
- Cost USD: `0.0047727`
- Derived digest: Fact digest. Visible observations: Psychic Energy Symbol, Purple Gradient, Radiating lights. Counts: psychic_energy_symbol: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Psychic Energy Symbol | symbol | foreground | high | 1 |
| Purple Gradient | color_field | background | high | 1 |
| Radiating lights | light_effect | foreground | medium | 1 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| psychic_energy_symbol | exact | 1 | obs_symbol_001 | 1 |

| Search term | Supporting observations |
|---|---|
| psychic energy card | obs_symbol_001 |
| purple gradient background | obs_palette_001 |
| radiating lights effect | obs_light_effect_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_symbol_001",
      "kind": "symbol",
      "label": "Psychic Energy Symbol",
      "normalized_label": "psychic_energy_symbol",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_field",
      "label": "Purple Gradient",
      "normalized_label": "purple_gradient",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_effect_001",
      "kind": "light_effect",
      "label": "Radiating lights",
      "normalized_label": "radiating_lights",
      "scene_layer": "foreground",
      "frame_position": "surrounding_symbol",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_symbol_001",
      "normalized_label": "psychic_energy_symbol",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "scene_layer": "foreground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_light_effect_001",
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
    "lighting": [
      "glow",
      "highlights"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "central_symbol",
      "circular_motif"
    ],
    "camera_angle": "straight",
    "framing": "card_format",
    "cropping": [],
    "depth": "flat",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [
      "circles"
    ],
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
      "term": "psychic energy card",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "purple gradient background",
      "supporting_observation_ids": [
        "obs_palette_001"
      ]
    },
    {
      "term": "radiating lights effect",
      "supporting_observation_ids": [
        "obs_light_effect_001"
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
- Cost USD: `0.00465375`
- Derived digest: Fact digest. Visible observations: bomb. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| bomb | object | foreground | high | 0.95 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_bomb_001 | 0.95 |

| Search term | Supporting observations |
|---|---|
| bomb | obs_bomb_001 |
| black bomb | obs_bomb_001 |
| explosive design | obs_bomb_001 |

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
    "background": []
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
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "item",
      "colors": [
        "black",
        "red",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "shiny",
        "smooth"
      ],
      "location": "foreground",
      "count_reference": "count_bomb_001",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "red",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "centered",
      "dynamic"
    ],
    "camera_angle": "frontal",
    "framing": "central",
    "cropping": [],
    "depth": "medium",
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
      "term": "black bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    },
    {
      "term": "explosive design",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    }
  ]
}
```

</details>
