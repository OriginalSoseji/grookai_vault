# Card Visual Fact Graph V1 Review Packet

Generated rows: 4
Validation failures: 0
Skipped images: 0
Estimated cost USD: 0.0177189

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0025602`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, Chandelure body, Chandelure flames, purple body, dark colors, floating position, dark forest background, glowing flames.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Chandelure | scene_subject | foreground | high | 0.95 |
| Chandelure body | scene_subject | foreground | high | 0.9 |
| Chandelure flames | scene_subject | foreground | high | 0.9 |
| purple body | scene_subject | foreground | medium | 0.85 |
| dark colors | scene_subject | background | medium | 0.8 |
| floating position | scene_subject | foreground | medium | 0.9 |
| dark forest background | scene_layer | background | medium | 0.85 |
| glowing flames | scene_subject | foreground | high | 0.9 |
| glow effect | scene_layer | foreground | high | 0.9 |
| dark purple and black palette | scene_layer | background | medium | 0.8 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

| Search term | Supporting observations |
|---|---|
| Mega Chandelure | obs_subject_001 |
| dark forest background | obs_environment_001 |
| purple flames | obs_flaming_effects_001 |

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
      "observation_id": "obs_anatomy_001",
      "kind": "scene_subject",
      "label": "Chandelure body",
      "normalized_label": "Chandelure body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_anatomy_002",
      "kind": "scene_subject",
      "label": "Chandelure flames",
      "normalized_label": "Chandelure flames",
      "scene_layer": "foreground",
      "frame_position": "above",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_colors_001",
      "kind": "scene_subject",
      "label": "purple body",
      "normalized_label": "purple body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_colors_002",
      "kind": "scene_subject",
      "label": "dark colors",
      "normalized_label": "dark colors",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.8,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "scene_subject",
      "label": "floating position",
      "normalized_label": "floating position",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "scene_layer",
      "label": "dark forest background",
      "normalized_label": "dark forest background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_flaming_effects_001",
      "kind": "scene_subject",
      "label": "glowing flames",
      "normalized_label": "glowing flames",
      "scene_layer": "foreground",
      "frame_position": "around body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "scene_layer",
      "label": "glow effect",
      "normalized_label": "glow effect",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "scene_layer",
      "label": "dark purple and black palette",
      "normalized_label": "dark purple and black palette",
      "scene_layer": "background",
      "frame_position": "background",
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
        "body",
        "flames"
      ],
      "physical_features": [
        "purple body"
      ],
      "pose": [
        "floating position"
      ],
      "orientation": "center",
      "action_state": [
        "glowing"
      ],
      "facial_evidence": {
        "eyes": "not_visible",
        "mouth": "not_visible",
        "eyebrows": "not_visible",
        "face_position": "not_visible",
        "other_visible_evidence": [
          "flames glow"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "dark",
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
      "obs_anatomy_001",
      "obs_anatomy_002",
      "obs_colors_001",
      "obs_flaming_effects_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_colors_002",
      "obs_environment_001",
      "obs_lighting_001",
      "obs_palette_001"
    ]
  },
  "environment": {
    "setting": [
      "dark forest"
    ],
    "indoor_outdoor": "outdoor",
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
      "dark purple and black",
      "glow effect"
    ],
    "lighting": [
      "glow effect"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [],
    "camera_angle": "centered",
    "framing": "tight",
    "cropping": [],
    "depth": "visible",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_colors_001",
      "obs_flaming_effects_001"
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
      "term": "dark forest background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_flaming_effects_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.96`
- Cost USD: `0.0050058`
- Derived digest: Fact digest. Visible observations: lightning, lightning, colored light bands, colored light bands, colored light bands, trees, trees, palette.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| lightning | environment | background | high | 0.95 |
| lightning | environment | background | high | 0.9 |
| colored light bands | environment | background | high | 0.92 |
| colored light bands | environment | background | high | 0.93 |
| colored light bands | environment | background | high | 0.94 |
| trees | environment | foreground | medium | 0.85 |
| trees | environment | foreground | medium | 0.85 |
| palette | visual_design | background | high | 0.88 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

| Search term | Supporting observations |
|---|---|
| lightning storm | obs_lightning_001, obs_lightning_002 |
| colored light bands | obs_color_bands_001, obs_color_bands_002, obs_color_bands_003 |
| trees | obs_trees_001, obs_trees_002 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_lightning_001",
      "kind": "environment",
      "label": "lightning",
      "normalized_label": "lightning",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_002",
      "kind": "environment",
      "label": "lightning",
      "normalized_label": "lightning",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_bands_001",
      "kind": "environment",
      "label": "colored light bands",
      "normalized_label": "colored light bands",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_bands_002",
      "kind": "environment",
      "label": "colored light bands",
      "normalized_label": "colored light bands",
      "scene_layer": "background",
      "frame_position": "mid",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_bands_003",
      "kind": "environment",
      "label": "colored light bands",
      "normalized_label": "colored light bands",
      "scene_layer": "background",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "environment",
      "label": "trees",
      "normalized_label": "trees",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_trees_002",
      "kind": "environment",
      "label": "trees",
      "normalized_label": "trees",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "visual_design",
      "label": "palette",
      "normalized_label": "palette",
      "scene_layer": "background",
      "frame_position": "entire scene",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.88,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_trees_001",
      "obs_trees_002"
    ],
    "midground": [],
    "background": [
      "obs_color_bands_001",
      "obs_color_bands_002",
      "obs_color_bands_003",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_palette_001"
    ]
  },
  "environment": {
    "setting": [
      "lightning storm"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "dark with colored light bands"
    ],
    "ground": [],
    "terrain": [],
    "plants": [
      "trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [
      "lightning"
    ],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_color_bands_001",
      "obs_color_bands_002",
      "obs_color_bands_003",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_trees_001",
      "obs_trees_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark colors",
      "vibrant colors"
    ],
    "lighting": [
      "dynamic lighting"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "balanced"
    ],
    "camera_angle": "front",
    "framing": "centered",
    "cropping": [],
    "depth": "flat",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_color_bands_001",
      "obs_color_bands_002",
      "obs_color_bands_003",
      "obs_lightning_001",
      "obs_lightning_002"
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "lightning storm",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ]
    },
    {
      "term": "colored light bands",
      "supporting_observation_ids": [
        "obs_color_bands_001",
        "obs_color_bands_002",
        "obs_color_bands_003"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_trees_001",
        "obs_trees_002"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11541-013 - Psychic Energy

- Branch: `energy`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.0050517`
- Derived digest: Fact digest. Visible observations: black eye-like symbol, centered circular emblem, purple gradient, white radiating lines, symmetrical abstract composition, bright highlights, repeated circular shapes. Counts: black eye-like symbol: 1, purple gradient: 1, white radiating lines: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| black eye-like symbol | symbol | midground | high | 0.95 |
| centered circular emblem | central_emblem | midground | high | 0.95 |
| purple gradient | abstract_form | background | high | 0.9 |
| white radiating lines | abstract_form | background | medium | 0.85 |
| symmetrical abstract composition | abstract_form | midground | medium | 0.9 |
| bright highlights | highlight | midground | medium | 0.8 |
| repeated circular shapes | shape | midground | medium | 0.75 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| black eye-like symbol | exact | 1 | obs_symbol_001 | 0.95 |
| purple gradient | exact | 1 | obs_gradient_001 | 0.9 |
| white radiating lines | exact | 1 | obs_radiating_lines_001 | 0.85 |

| Search term | Supporting observations |
|---|---|
| black eye-like symbol | obs_symbol_001 |
| purple gradient | obs_gradient_001 |
| symmetrical abstract composition | obs_motif_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_symbol_001",
      "kind": "symbol",
      "label": "black eye-like symbol",
      "normalized_label": "black eye-like symbol",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_emblem_001",
      "kind": "central_emblem",
      "label": "centered circular emblem",
      "normalized_label": "centered circular emblem",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_gradient_001",
      "kind": "abstract_form",
      "label": "purple gradient",
      "normalized_label": "purple gradient",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_radiating_lines_001",
      "kind": "abstract_form",
      "label": "white radiating lines",
      "normalized_label": "white radiating lines",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_motif_001",
      "kind": "abstract_form",
      "label": "symmetrical abstract composition",
      "normalized_label": "symmetrical abstract composition",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_highlight_001",
      "kind": "highlight",
      "label": "bright highlights",
      "normalized_label": "bright highlights",
      "scene_layer": "midground",
      "frame_position": "various",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.8,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_repeat_shape_001",
      "kind": "shape",
      "label": "repeated circular shapes",
      "normalized_label": "repeated circular shapes",
      "scene_layer": "midground",
      "frame_position": "various",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.75,
      "evidence_strength": "weak"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_sym_001",
      "normalized_label": "black eye-like symbol",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.95
    },
    {
      "count_id": "count_gradient_001",
      "normalized_label": "purple gradient",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_gradient_001"
      ],
      "scene_layer": "background",
      "confidence": 0.9
    },
    {
      "count_id": "count_radiating_lines_001",
      "normalized_label": "white radiating lines",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_radiating_lines_001"
      ],
      "scene_layer": "background",
      "confidence": 0.85
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_emblem_001",
      "obs_highlight_001",
      "obs_motif_001",
      "obs_repeat_shape_001",
      "obs_symbol_001"
    ],
    "background": [
      "obs_gradient_001",
      "obs_radiating_lines_001"
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
      "bright",
      "high"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights"
    ],
    "composition": [
      "symmetrical composition"
    ],
    "camera_angle": "not_applicable",
    "framing": "not_applicable",
    "cropping": [],
    "depth": "not_applicable",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_gradient_001",
      "obs_radiating_lines_001",
      "obs_symbol_001"
    ]
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
      "term": "black eye-like symbol",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "purple gradient",
      "supporting_observation_ids": [
        "obs_gradient_001"
      ]
    },
    {
      "term": "symmetrical abstract composition",
      "supporting_observation_ids": [
        "obs_motif_001"
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
- Cost USD: `0.0051012`
- Derived digest: Fact digest. Visible observations: bomb, rounded body, yellow stripe, fuse, spark effect, radial lines. Counts: bomb: 1, stripe: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| bomb | object | foreground | high | 0.95 |
| rounded body | object | foreground | high | 0.95 |
| yellow stripe | object | foreground | medium | 0.9 |
| fuse | object | foreground | medium | 0.9 |
| spark effect | object | foreground | medium | 0.85 |
| radial lines | object | foreground | medium | 0.8 |
| colorful background | object | background | low | 0.75 |
| bright color palette | design | background | low | 0.7 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_bomb_001 | 0.95 |
| stripe | exact | 1 | obs_stripe_001 | 0.9 |

| Search term | Supporting observations |
|---|---|
| bomb | obs_bomb_001 |
| yellow stripe on bomb | obs_stripe_001 |
| colorful bomb background | obs_background_001 |

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
      "observation_id": "obs_body_001",
      "kind": "object",
      "label": "rounded body",
      "normalized_label": "rounded body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stripe_001",
      "kind": "object",
      "label": "yellow stripe",
      "normalized_label": "yellow stripe",
      "scene_layer": "foreground",
      "frame_position": "around body",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_fuse_001",
      "kind": "object",
      "label": "fuse",
      "normalized_label": "fuse",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_spark_001",
      "kind": "object",
      "label": "spark effect",
      "normalized_label": "spark effect",
      "scene_layer": "foreground",
      "frame_position": "next to fuse",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_radial_lines_001",
      "kind": "object",
      "label": "radial lines",
      "normalized_label": "radial lines",
      "scene_layer": "foreground",
      "frame_position": "around bomb",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "object",
      "label": "colorful background",
      "normalized_label": "colorful background",
      "scene_layer": "background",
      "frame_position": "around bomb",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.75,
      "evidence_strength": "weak"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "design",
      "label": "bright color palette",
      "normalized_label": "bright color palette",
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
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    },
    {
      "count_id": "count_stripe_001",
      "normalized_label": "stripe",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_stripe_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_body_001",
      "obs_bomb_001",
      "obs_fuse_001",
      "obs_radial_lines_001",
      "obs_spark_001",
      "obs_stripe_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001",
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
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "device",
      "colors": [
        "black",
        "yellow"
      ],
      "material_appearance": [
        "rounded surface"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_stripe_001",
      "label": "yellow stripe",
      "normalized_label": "yellow stripe",
      "object_type": "decoration",
      "colors": [
        "yellow"
      ],
      "material_appearance": [
        "decorative appearance"
      ],
      "location": "around body of bomb",
      "count_reference": "count_stripe_001",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "bright colors"
    ],
    "lighting": [
      "focus on bomb",
      "vibrant"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "central focus on bomb"
    ],
    "camera_angle": "straight-on",
    "framing": "centered",
    "cropping": [],
    "depth": "none",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_bomb_001"
    ]
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "not_applicable",
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
      "term": "yellow stripe on bomb",
      "supporting_observation_ids": [
        "obs_stripe_001"
      ]
    },
    {
      "term": "colorful bomb background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ]
}
```

</details>
