# Card Visual Fact Graph V1 Review Packet

Generated rows: 4
Validation failures: 0
Skipped images: 0
Estimated cost USD: 0.0161031

## Rows

### GV-PK-JPN-M5-113 - Mega Chandelure ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.92`
- Cost USD: `0.00232995`
- Derived digest: Fact digest. Scene subjects: Mega Chandelure. Visible observations: Mega Chandelure, purple flames, orb. Counts: purple flames: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Chandelure | scene_subject | midground | high | 0.95 |
| purple flames | object_and_prop | background | medium | 0.85 |
| orb | object_and_prop | midground | medium | 0.92 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| purple flames | exact | 1 | obs_light_source_001 | 0.85 |

| Search term | Supporting observations |
|---|---|
| Mega Chandelure | obs_subject_001 |
| purple flames | obs_light_source_001 |
| orb held by Mega Chandelure | obs_orb_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Chandelure",
      "normalized_label": "Mega Chandelure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_source_001",
      "kind": "object_and_prop",
      "label": "purple flames",
      "normalized_label": "purple flames",
      "scene_layer": "background",
      "frame_position": "behind",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    },
    {
      "observation_id": "obs_orb_001",
      "kind": "object_and_prop",
      "label": "orb",
      "normalized_label": "orb",
      "scene_layer": "midground",
      "frame_position": "held by Mega Chandelure",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
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
        "dark purple body",
        "flame-like tail",
        "orb holding"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "facing forward",
      "action_state": [
        "holding orb"
      ],
      "facial_evidence": {
        "eyes": "closed",
        "mouth": "visible",
        "eyebrows": "not visible",
        "face_position": "neutral",
        "other_visible_evidence": [
          "flames at back"
        ]
      },
      "clothing_or_accessories": [
        "none"
      ],
      "colors": [
        "black",
        "dark purple",
        "orange",
        "white"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_light_source_001",
      "normalized_label": "purple flames",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "none",
      "supporting_observation_ids": [
        "obs_light_source_001"
      ],
      "scene_layer": "background",
      "confidence": 0.85
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_orb_001",
      "obs_subject_001"
    ],
    "background": [
      "obs_light_source_001"
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
    "supporting_observation_ids": []
  },
  "objects_and_props": [
    {
      "observation_id": "obs_light_source_001",
      "label": "purple flames",
      "normalized_label": "purple flames",
      "object_type": "effect",
      "colors": [
        "purple"
      ],
      "material_appearance": [
        "flame-like"
      ],
      "location": "background",
      "count_reference": "count_light_source_001",
      "confidence": 0.85
    },
    {
      "observation_id": "obs_orb_001",
      "label": "orb",
      "normalized_label": "orb",
      "object_type": "prop",
      "colors": [
        "black",
        "orange"
      ],
      "material_appearance": [
        "glossy"
      ],
      "location": "held by Mega Chandelure",
      "count_reference": "none",
      "confidence": 0.92
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "orange",
      "purple",
      "white"
    ],
    "lighting": [
      "dim"
    ],
    "shadows": [
      "present"
    ],
    "highlights": [
      "glossy effect on orb"
    ],
    "composition": [
      "central focus on Mega Chandelure"
    ],
    "camera_angle": "frontal",
    "framing": "tight",
    "cropping": [],
    "depth": "medium",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [
      "fantasy"
    ],
    "supporting_observation_ids": []
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "observed",
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
      "term": "Mega Chandelure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "purple flames",
      "supporting_observation_ids": [
        "obs_light_source_001"
      ]
    },
    {
      "term": "orb held by Mega Chandelure",
      "supporting_observation_ids": [
        "obs_orb_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11526-019 - Magnetic Storm

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.004668`
- Derived digest: Fact digest. Scene subjects: Magnetic Storm. Visible observations: dark sky with lightning, lightning strike, lightning strike, colorful aurora lights. Counts: lightning strikes: many.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| dark sky with lightning | environment | background | high | 0.95 |
| lightning strike | object | background | high | 0.9 |
| lightning strike | object | background | high | 0.9 |
| colorful aurora lights | visual_design | background | medium | 0.85 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| lightning strikes | many | many | obs_lightning_001, obs_lightning_002 | 0.9 |

| Search term | Supporting observations |
|---|---|
| dark sky with lightning | obs_environment_001 |
| lightning strikes | obs_lightning_001, obs_lightning_002 |
| colorful aurora lights | obs_palette_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark sky with lightning",
      "normalized_label": "dark sky with lightning",
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
      "label": "lightning strike",
      "normalized_label": "lightning strike",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lightning_002",
      "kind": "object",
      "label": "lightning strike",
      "normalized_label": "lightning strike",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "visual_design",
      "label": "colorful aurora lights",
      "normalized_label": "aurora lights",
      "scene_layer": "background",
      "frame_position": "center",
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
      "identity": "Magnetic Storm",
      "identity_confidence": 0.9,
      "anatomy": [],
      "physical_features": [],
      "pose": [],
      "orientation": "",
      "action_state": [],
      "facial_evidence": {
        "eyes": "",
        "mouth": "",
        "eyebrows": "",
        "face_position": "",
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
      "count_id": "count_lightning_001",
      "normalized_label": "lightning strikes",
      "count_type": "many",
      "exact_count": 2,
      "estimated_min": 2,
      "estimated_max": 2,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ],
      "scene_layer": "background",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_lightning_001",
      "obs_lightning_002",
      "obs_palette_001"
    ]
  },
  "environment": {
    "setting": [
      "dark sky",
      "thunderstorm"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "dark",
      "lightning"
    ],
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
      "dark",
      "multicolored"
    ],
    "lighting": [
      "high contrast"
    ],
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
      "term": "dark sky with lightning",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "lightning strikes",
      "supporting_observation_ids": [
        "obs_lightning_001",
        "obs_lightning_002"
      ]
    },
    {
      "term": "colorful aurora lights",
      "supporting_observation_ids": [
        "obs_palette_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-TCGCOLLECTOR11541-013 - Psychic Energy

- Branch: `energy`
- Review status: `needs_review`
- Description confidence: `0.9`
- Attribute confidence: `0.85`
- Cost USD: `0.00453405`
- Derived digest: Fact digest. Visible observations: Psychic Energy Symbol, Purple Gradient, Radiating Lights.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Psychic Energy Symbol | symbol | foreground | high | 0.95 |
| Purple Gradient | gradient | background | medium | 0.9 |
| Radiating Lights | light_effects | background | medium | 0.85 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

| Search term | Supporting observations |
|---|---|
| Psychic Energy | obs_symbol_001 |
| purple gradient background | obs_gradient_001 |
| radiating lights effect | obs_light_effects_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_symbol_001",
      "kind": "symbol",
      "label": "Psychic Energy Symbol",
      "normalized_label": "psychic energy",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_gradient_001",
      "kind": "gradient",
      "label": "Purple Gradient",
      "normalized_label": "purple gradient",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_light_effects_001",
      "kind": "light_effects",
      "label": "Radiating Lights",
      "normalized_label": "radiating lights",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_symbol_001"
    ],
    "midground": [],
    "background": [
      "obs_gradient_001",
      "obs_light_effects_001"
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "purple",
      "white"
    ],
    "lighting": [
      "radiant",
      "soft"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "abstract design",
      "centralized symbol"
    ],
    "camera_angle": "frontal",
    "framing": "tight",
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
    "counts_review": "none_visible",
    "scene_layers_review": "observed",
    "environment_review": "none_visible",
    "objects_and_props_review": "none_visible",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
  },
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Psychic Energy",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "purple gradient background",
      "supporting_observation_ids": [
        "obs_gradient_001"
      ]
    },
    {
      "term": "radiating lights effect",
      "supporting_observation_ids": [
        "obs_light_effects_001"
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
- Cost USD: `0.0045711`
- Derived digest: Fact digest. Visible observations: bomb, flare, color explosion.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| bomb | object | foreground | high | 0.95 |
| flare | object | foreground | high | 0.9 |
| color explosion | object | background | medium | 0.85 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

| Search term | Supporting observations |
|---|---|
| bomb | obs_bomb_001 |
| color explosion | obs_palette_001 |
| black bomb with yellow stripes | obs_bomb_001 |

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
      "observation_id": "obs_flare_001",
      "kind": "object",
      "label": "flare",
      "normalized_label": "flare",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "object",
      "label": "color explosion",
      "normalized_label": "color explosion",
      "scene_layer": "background",
      "frame_position": "surrounding",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "moderate"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_bomb_001",
      "obs_flare_001"
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
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "item",
      "colors": [
        "black",
        "yellow"
      ],
      "material_appearance": [
        "metal",
        "plastic"
      ],
      "location": "center",
      "count_reference": "not_visible",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "orange",
      "yellow"
    ],
    "lighting": [
      "bright",
      "high contrast"
    ],
    "shadows": [],
    "highlights": [],
    "composition": [
      "background explosion",
      "centered bomb"
    ],
    "camera_angle": "straight_on",
    "framing": "close-up",
    "cropping": [],
    "depth": "flat",
    "motion_cues": [],
    "motifs": [],
    "repeated_shapes": [],
    "style_cues": [
      "cartoonish"
    ],
    "supporting_observation_ids": []
  },
  "surface_and_scan_cues": [],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "none_visible",
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
      "term": "color explosion",
      "supporting_observation_ids": [
        "obs_palette_001"
      ]
    },
    {
      "term": "black bomb with yellow stripes",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    }
  ]
}
```

</details>
