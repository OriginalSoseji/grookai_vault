# Card Visual Fact Graph V2 Review Packet

Generated rows: 5
Validation failures: 0
Skipped images: 0
Estimated cost USD: 0.039782

## Rows

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- V2 stress role: `dense_pokemon_artwork`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0085304`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: gold, yellow, black, orange, head, arms, body, legs.
- Surface/scan digest: golden foil sheen on subject body and background

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Darkrai | scene_subject | foreground | primary_subject | 0.99 |
| gold | color | foreground | high | 1 |
| yellow | color | foreground | high | 1 |
| black | color | foreground | medium | 1 |
| orange | color | foreground | medium | 1 |
| head | body_region | foreground | high | 0.98 |
| arms | body_region | foreground | high | 0.95 |
| body | body_region | foreground | high | 0.98 |
| legs | body_region | foreground | high | 0.5 |
| spiky outlines on head and arms | physical_feature | foreground | high | 0.95 |
| floating upright pose | pose | foreground | high | 0.96 |
| facing slightly downward | orientation | foreground | medium | 0.9 |
| intricate golden pattern background | environment | background | high | 1 |
| psychic type symbol | object | foreground | medium | 1 |
| メガダークライex (Mega Darkrai ex in Japanese) | visual_text | foreground | medium | 0.99 |
| HP 280 | visual_text | foreground | medium | 0.99 |
| 118/081 MUR | visual_text | foreground | low | 0.99 |

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | complete | none | high |  |
| human_appearance | partial_due_to_crop | low | high |  |
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | likely_complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | complete | none | high |  |
| uncertainty_and_abstentions | complete | none | high |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | Mega Darkrai is the main subject | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | Mega Darkrai has a visible head | obs_body_region_001 | 0.98 |
| fact_003 | creature_anatomy | Mega Darkrai has visible arms | obs_body_region_002 | 0.95 |
| fact_004 | creature_anatomy | Mega Darkrai has a visible body | obs_body_region_003 | 0.98 |
| fact_005 | creature_anatomy | Mega Darkrai's legs are not visible | obs_body_region_004 | 0.5 |
| fact_006 | creature_anatomy | Mega Darkrai has spiky outlines on head and arms | obs_physical_feature_001 | 0.95 |
| fact_007 | creature_anatomy | Mega Darkrai is floating upright | obs_pose_001 | 0.96 |
| fact_008 | creature_anatomy | Mega Darkrai is facing slightly downward | obs_orientation_001 | 0.9 |
| fact_009 | environment | The card background is an intricate golden pattern | obs_background_001 | 1 |
| fact_010 | objects_and_props | Psychic type symbol is visible on the card | obs_object_001 | 1 |
| fact_011 | human_appearance | Card name text reads 'メガダークライex' (Mega Darkrai ex) | obs_text_001 | 0.99 |
| fact_012 | human_appearance | Card HP text reads '280' | obs_text_002 | 0.99 |
| fact_013 | human_appearance | Card number text reads '118/081 MUR' | obs_text_003 | 0.99 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

| Search term | Supporting observations |
|---|---|
| mega darkrai | obs_subject_001 |
| golden foil card | obs_background_001 |
| psychic type symbol | obs_object_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Darkrai",
      "normalized_label": "mega darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color",
      "label": "gold",
      "normalized_label": "gold",
      "scene_layer": "foreground",
      "frame_position": "all_over_subject",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color",
      "label": "yellow",
      "normalized_label": "yellow",
      "scene_layer": "foreground",
      "frame_position": "all_over_subject",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_003",
      "kind": "color",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "subject_details",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_004",
      "kind": "color",
      "label": "orange",
      "normalized_label": "orange",
      "scene_layer": "foreground",
      "frame_position": "subject_details",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "body_region",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "upper_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_002",
      "kind": "body_region",
      "label": "arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "middle_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "body_region",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "middle_center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_004",
      "kind": "body_region",
      "label": "legs",
      "normalized_label": "legs",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "not_visible",
      "salience": "high",
      "confidence": 0.5,
      "evidence_strength": "weak"
    },
    {
      "observation_id": "obs_physical_feature_001",
      "kind": "physical_feature",
      "label": "spiky outlines on head and arms",
      "normalized_label": "spiky outlines",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "floating upright pose",
      "normalized_label": "floating upright",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_orientation_001",
      "kind": "orientation",
      "label": "facing slightly downward",
      "normalized_label": "facing downward",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "intricate golden pattern background",
      "normalized_label": "golden pattern background",
      "scene_layer": "background",
      "frame_position": "full_card_back",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "psychic type symbol",
      "normalized_label": "psychic symbol",
      "scene_layer": "foreground",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_001",
      "kind": "visual_text",
      "label": "メガダークライex (Mega Darkrai ex in Japanese)",
      "normalized_label": "mega darkrai ex",
      "scene_layer": "foreground",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_002",
      "kind": "visual_text",
      "label": "HP 280",
      "normalized_label": "HP 280",
      "scene_layer": "foreground",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_003",
      "kind": "visual_text",
      "label": "118/081 MUR",
      "normalized_label": "118/081 mur",
      "scene_layer": "foreground",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "Mega Darkrai is the main subject",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "subjects[0].body_regions.head",
      "claim": "Mega Darkrai has a visible head",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "creature_anatomy",
      "field_path": "subjects[0].body_regions.arms",
      "claim": "Mega Darkrai has visible arms",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "subjects[0].body_regions.body",
      "claim": "Mega Darkrai has a visible body",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "subjects[0].body_regions.legs",
      "claim": "Mega Darkrai's legs are not visible",
      "value": "not visible",
      "supporting_observation_ids": [
        "obs_body_region_004"
      ],
      "confidence": 0.5,
      "evidence_strength": "weak"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "subjects[0].physical_features.spiky_outlines",
      "claim": "Mega Darkrai has spiky outlines on head and arms",
      "value": "present",
      "supporting_observation_ids": [
        "obs_physical_feature_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "subjects[0].pose",
      "claim": "Mega Darkrai is floating upright",
      "value": "floating upright",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "creature_anatomy",
      "field_path": "subjects[0].orientation",
      "claim": "Mega Darkrai is facing slightly downward",
      "value": "facing downward",
      "supporting_observation_ids": [
        "obs_orientation_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "background",
      "claim": "The card background is an intricate golden pattern",
      "value": "intricate golden pattern",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "objects_and_props",
      "field_path": "psychic_type_symbol",
      "claim": "Psychic type symbol is visible on the card",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "human_appearance",
      "field_path": "text.name",
      "claim": "Card name text reads 'メガダークライex' (Mega Darkrai ex)",
      "value": "visible text",
      "supporting_observation_ids": [
        "obs_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "human_appearance",
      "field_path": "text.hp",
      "claim": "Card HP text reads '280'",
      "value": "visible text",
      "supporting_observation_ids": [
        "obs_text_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "human_appearance",
      "field_path": "text.card_number",
      "claim": "Card number text reads '118/081 MUR'",
      "value": "visible text",
      "supporting_observation_ids": [
        "obs_text_003"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "body",
        "head"
      ],
      "physical_features": [
        "spiky outlines on head and arms"
      ],
      "pose": [
        "floating upright"
      ],
      "orientation": "facing downward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "not_visible",
        "mouth": "not_visible",
        "eyebrows": "not_visible",
        "face_position": "visible",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "gold",
        "orange",
        "yellow"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_object_001",
      "obs_subject_001",
      "obs_text_001",
      "obs_text_002",
      "obs_text_003"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
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
    "supporting_observation_ids": [
      "obs_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "psychic type symbol",
      "normalized_label": "psychic symbol",
      "object_type": "symbol",
      "colors": [
        "black",
        "purple"
      ],
      "material_appearance": [],
      "location": "top_right",
      "count_reference": "count_psychic_symbol_001",
      "confidence": 1
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "gold",
      "orange",
      "yellow"
    ],
    "lighting": [
      "bright front lighting"
    ],
    "shadows": [
      "soft shadows around subject edges"
    ],
    "highlights": [
      "golden foil highlights"
    ],
    "composition": [
      "centered subject"
    ],
    "camera_angle": "straight-on",
    "framing": "tight to subject with full card borders visible",
    "cropping": [
      "no crop"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [
      "none"
    ],
    "motifs": [
      "spiky motifs in design"
    ],
    "repeated_shapes": [
      "circular elements in background pattern"
    ],
    "style_cues": [
      "foil card design",
      "intricate pattern background"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_object_001",
      "obs_subject_001"
    ]
  },
  "surface_and_scan_cues": [
    {
      "observation_id": "obs_subject_001",
      "cue_type": "foil_glare",
      "cue": "golden foil sheen on subject body and background",
      "abstention": "",
      "confidence": 1
    }
  ],
  "coverage_reviews": {
    "subjects_review": "observed",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "none_visible",
    "scene_layers_review": "observed",
    "environment_review": "observed",
    "objects_and_props_review": "observed",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "observed"
  },
  "modules": {
    "subjects": {
      "fact_ids": [
        "fact_001"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_011",
        "fact_012",
        "fact_013"
      ],
      "visible_body_regions": [],
      "facial_evidence": [],
      "hair": [],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_008"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_002"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_003"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "legs",
          "feature": "",
          "visibility": "not_visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_004"
          ],
          "confidence": 0.5
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head and arms",
          "feature": "spiky outlines",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_physical_feature_001"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating upright"
          ],
          "orientation": "facing downward",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_orientation_001",
            "obs_pose_001"
          ],
          "confidence": 0.93
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
      "fact_ids": [
        "fact_010"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_009"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_color_001",
        "obs_color_002",
        "obs_color_003",
        "obs_color_004"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_subject_001"
      ]
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
      "observation_ids": [
        "obs_subject_001"
      ]
    },
    "uncertainty_and_abstentions": {
      "fact_ids": [],
      "fields": []
    },
    "fact_grounded_search_terms": {
      "fact_ids": [],
      "terms": [
        "golden foil card",
        "mega darkrai",
        "psychic type symbol"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "creature_anatomy",
      "review_status": "complete",
      "omission_risk": "none",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "uncertainty_and_abstentions",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "mega darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "golden foil card",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "psychic type symbol",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- V2 stress role: `trainer_person_artwork`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0082724`
- Derived digest: Fact digest. Scene subjects: female human trainer.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| female human trainer | scene_subject | foreground | primary | 0.99 |
| orange spiky hair tied back in a ponytail | human_appearance | foreground | primary | 0.99 |
| face with teal eyes, open mouth smiling | human_appearance | foreground | primary | 0.98 |
| left arm extended forward with clenched hand | human_appearance | foreground | primary | 0.98 |
| right arm bent with clenched fist near chest | human_appearance | foreground | primary | 0.98 |
| blue swimsuit one-piece garment | clothing | foreground | primary | 0.99 |
| black wristband on right wrist | clothing | foreground | primary | 0.95 |
| left knee bent visible with sneaker | human_appearance | foreground | primary | 0.97 |
| indoor swimming pool background | environment | background | secondary | 0.99 |
| pool water with reflections and sparkles | environment | background | secondary | 0.99 |
| white pool edge with red lane mark | environment | background | secondary | 0.95 |
| blue tiled wall with horizontal white stripe | environment | background | secondary | 0.96 |

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | This card shows one female human trainer. | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | The female trainer has orange hair styled in a spiky ponytail. | obs_hair_001 | 0.99 |
| fact_face_001 | human_appearance | The trainer's face shows teal eyes, and an open mouth smile. | obs_face_001 | 0.98 |
| fact_human_pose_001 | human_appearance | The female trainer is posed with the right arm bent and fist near chest, left arm extended forward with a clenched fist. | obs_arm_left_001, obs_arm_right_001 | 0.98 |
| fact_garment_001 | clothing | The trainer is wearing a blue one-piece swimsuit. | obs_clothing_001 | 0.99 |
| fact_accessory_001 | clothing | The trainer wears a black wristband on the right wrist. | obs_clothing_accessory_001 | 0.95 |
| fact_leg_001 | human_appearance | Visible left leg bent with sneaker shown. | obs_leg_left_knee_001 | 0.97 |
| fact_environment_001 | environment | The setting is an indoor swimming pool environment. | obs_environment_001, obs_environment_blue_wall_001, obs_environment_pool_details_001, obs_environment_pool_edge_001 | 0.99 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

| Search term | Supporting observations |
|---|---|
| female trainer | obs_subject_001 |
| blue swimsuit | obs_clothing_001 |
| orange hair ponytail | obs_hair_001 |
| indoor swimming pool | obs_environment_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human trainer",
      "normalized_label": "female human trainer",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "orange spiky hair tied back in a ponytail",
      "normalized_label": "orange hair ponytail",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "face with teal eyes, open mouth smiling",
      "normalized_label": "face teal eyes open mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_arm_left_001",
      "kind": "human_appearance",
      "label": "left arm extended forward with clenched hand",
      "normalized_label": "left arm extended fist",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_arm_right_001",
      "kind": "human_appearance",
      "label": "right arm bent with clenched fist near chest",
      "normalized_label": "right arm bent fist",
      "scene_layer": "foreground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "blue swimsuit one-piece garment",
      "normalized_label": "blue one-piece swimsuit",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_accessory_001",
      "kind": "clothing",
      "label": "black wristband on right wrist",
      "normalized_label": "black wristband right wrist",
      "scene_layer": "foreground",
      "frame_position": "center-right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_leg_left_knee_001",
      "kind": "human_appearance",
      "label": "left knee bent visible with sneaker",
      "normalized_label": "left knee bent sneaker",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool background",
      "normalized_label": "indoor swimming pool",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_pool_details_001",
      "kind": "environment",
      "label": "pool water with reflections and sparkles",
      "normalized_label": "pool water reflections sparkles",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_pool_edge_001",
      "kind": "environment",
      "label": "white pool edge with red lane mark",
      "normalized_label": "pool edge lane mark",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_blue_wall_001",
      "kind": "environment",
      "label": "blue tiled wall with horizontal white stripe",
      "normalized_label": "blue tiled wall white stripe",
      "scene_layer": "background",
      "frame_position": "background upper",
      "visibility": "visible",
      "salience": "secondary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "This card shows one female human trainer.",
      "value": "female human trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair[0].label",
      "claim": "The female trainer has orange hair styled in a spiky ponytail.",
      "value": "orange hair ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "facial_evidence[0]",
      "claim": "The trainer's face shows teal eyes, and an open mouth smile.",
      "value": "teal eyes, open mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_pose_001",
      "module": "human_appearance",
      "field_path": "pose_orientation[0].pose",
      "claim": "The female trainer is posed with the right arm bent and fist near chest, left arm extended forward with a clenched fist.",
      "value": "right arm bent fist, left arm extended fist",
      "supporting_observation_ids": [
        "obs_arm_left_001",
        "obs_arm_right_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_garment_001",
      "module": "clothing",
      "field_path": "garments[0].garment",
      "claim": "The trainer is wearing a blue one-piece swimsuit.",
      "value": "blue one-piece swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessory_001",
      "module": "clothing",
      "field_path": "accessories[0].label",
      "claim": "The trainer wears a black wristband on the right wrist.",
      "value": "black wristband right wrist",
      "supporting_observation_ids": [
        "obs_clothing_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_leg_001",
      "module": "human_appearance",
      "field_path": "visible_body_regions[0]",
      "claim": "Visible left leg bent with sneaker shown.",
      "value": "left knee bent sneaker",
      "supporting_observation_ids": [
        "obs_leg_left_knee_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "The setting is an indoor swimming pool environment.",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_blue_wall_001",
        "obs_environment_pool_details_001",
        "obs_environment_pool_edge_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human trainer",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "feet",
        "hands",
        "legs",
        "neck",
        "shoulders"
      ],
      "physical_features": [
        "open smiling mouth",
        "orange spiky ponytail hair",
        "teal eyes"
      ],
      "pose": [
        "left arm extended forward fist",
        "right arm bent fist near chest"
      ],
      "orientation": "frontal",
      "action_state": [
        "standing pose with fists"
      ],
      "facial_evidence": {
        "eyes": "open teal eyes",
        "mouth": "open",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband",
        "blue one-piece swimsuit"
      ],
      "colors": [
        "black",
        "blue",
        "orange"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_arm_left_001",
      "obs_arm_right_001",
      "obs_clothing_001",
      "obs_clothing_accessory_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_leg_left_knee_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_blue_wall_001",
      "obs_environment_pool_details_001",
      "obs_environment_pool_edge_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "pool water surface"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "blue tiled wall",
      "pool edge"
    ],
    "water": [
      "pool water"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_blue_wall_001",
      "obs_environment_pool_details_001",
      "obs_environment_pool_edge_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue swimsuit",
      "orange hair",
      "teal eyes",
      "white pool edge"
    ],
    "lighting": [
      "bright even indoor lighting"
    ],
    "shadows": [
      "soft minimal shadows"
    ],
    "highlights": [
      "sparkles on water surface"
    ],
    "composition": [
      "background pool tiles and water",
      "centralized figure"
    ],
    "camera_angle": "eye-level frontal medium shot",
    "framing": "tight medium framing",
    "cropping": [
      "cropped lower legs",
      "full torso visible"
    ],
    "depth": "moderate depth with background detail",
    "motion_cues": [
      "pose suggests energetic action stance"
    ],
    "motifs": [
      "sports/swimming theme"
    ],
    "repeated_shapes": [
      "rectangular tiles in background"
    ],
    "style_cues": [
      "anime style"
    ],
    "supporting_observation_ids": [
      "obs_clothing_001",
      "obs_environment_001",
      "obs_environment_blue_wall_001",
      "obs_environment_pool_details_001",
      "obs_hair_001",
      "obs_subject_001"
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
        "fact_subject_001"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_face_001",
        "fact_hair_001",
        "fact_human_pose_001",
        "fact_leg_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "open mouth",
            "teal eyes"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "hair",
          "visibility": "visible",
          "details": [
            "orange spiky ponytail hair"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "visibility": "visible",
          "details": [
            "left arm extended fist",
            "right arm bent fist"
          ],
          "supporting_observation_ids": [
            "obs_arm_left_001",
            "obs_arm_right_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "legs",
          "visibility": "visible",
          "details": [
            "left knee bent sneaker"
          ],
          "supporting_observation_ids": [
            "obs_leg_left_knee_001"
          ],
          "confidence": 0.97
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "open teal eyes",
          "mouth": "open",
          "eyebrows": "neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange spiky ponytail hair",
          "details": [
            "orange color",
            "spiky",
            "tied back in ponytail"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.99
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "right arm bent fist near chest",
          "details": [
            "fist clenched",
            "right arm bent"
          ],
          "supporting_observation_ids": [
            "obs_arm_right_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "left arm extended forward fist",
          "details": [
            "fist clenched",
            "left arm extended"
          ],
          "supporting_observation_ids": [
            "obs_arm_left_001"
          ],
          "confidence": 0.98
        }
      ],
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
      "fact_ids": [
        "fact_accessory_001",
        "fact_garment_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue one-piece swimsuit",
          "neckline_type": "scoop neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband on right wrist",
          "details": [
            "black color",
            "right wrist"
          ],
          "supporting_observation_ids": [
            "obs_clothing_accessory_001"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_blue_wall_001",
        "obs_environment_pool_details_001",
        "obs_environment_pool_edge_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_pool_details_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_pool_details_001"
      ]
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
        "blue swimsuit",
        "female trainer",
        "indoor swimming pool",
        "orange hair ponytail"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "female trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "blue swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "orange hair ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- V2 stress role: `environment_heavy_stadium`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0094828`
- Derived digest: Fact digest. Visible observations: large stadium structure with green leaf emblem, green leaf round emblem attached to stadium, set of four windows with blue and red shapes, curved paved road around stadium with purple and blue stripes, sidewalk with traffic cones and metal fence, short metal fence with vertical bars, metal road barricade near raised stairs, set of stone stairs leading up near water. Counts: traffic cone: 6, tree: 9-12.
- Surface/scan digest: golden card border with texture No reliable additional card-surface, foil, texture, glare, border, or printing-treatment cues are visible enough to describe from this scan.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| large stadium structure with green leaf emblem | environment | midground | high | 0.99 |
| green leaf round emblem attached to stadium | objects_and_props | midground | medium | 0.98 |
| set of four windows with blue and red shapes | objects_and_props | midground | medium | 0.95 |
| curved paved road around stadium with purple and blue stripes | environment | midground | medium | 0.97 |
| sidewalk with traffic cones and metal fence | environment | foreground | medium | 0.96 |
| multiple orange and white traffic cones | objects_and_props | foreground | low | 0.95 |
| traffic cones | counts | foreground | low | 0.95 |
| short metal fence with vertical bars | objects_and_props | foreground | medium | 0.95 |
| metal road barricade near raised stairs | objects_and_props | midground | medium | 0.96 |
| set of stone stairs leading up near water | environment | midground | medium | 0.97 |
| water body visible on the right side | environment | background | medium | 0.95 |
| group of dense dark green trees behind stadium | environment | background | high | 0.97 |
| trees | counts | background | high | 0.95 |
| clear blue sky with white clouds | environment | background | medium | 0.98 |
| golden grid or mesh enclosing top of stadium structure | objects_and_props | midground | medium | 0.96 |

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | none_visible | none | high |  |
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | partial_due_to_crop | medium | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | complete | low | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_traffic_cones_001 | counts | exact count of traffic cones | obs_obj_traffic_cones_001 | 0.95 |
| fact_trees_001 | counts | approximate count of trees | obs_env_trees_001 | 0.95 |
| fact_env_sky_001 | environment | sky is blue with white clouds | obs_env_sky_001 | 0.98 |
| fact_env_water_001 | environment | presence of water body right side | obs_env_water_001 | 0.95 |
| fact_env_stadium_001 | environment | presence of a large stadium architectural structure | obs_env_stadium_001, obs_obj_emblem_001 | 0.99 |
| fact_env_road_stripes_001 | environment | curved paved road with purple and blue stripes | obs_obj_road_001 | 0.97 |
| fact_env_stairs_001 | environment | stone stairs near water body | obs_obj_stairs_001 | 0.97 |
| fact_env_fencing_001 | objects_and_props | metal fence with vertical bars near sidewalk | obs_obj_metal_fence_001 | 0.95 |
| fact_env_barricade_001 | objects_and_props | metal road barricade near stairs | obs_obj_road_barricade_001 | 0.96 |
| fact_env_windows_001 | objects_and_props | four windows with blue and red shapes | obs_obj_windows_001 | 0.95 |
| fact_env_golden_grid_001 | objects_and_props | golden grid top enclosing stadium | obs_obj_golden_grid_001 | 0.96 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| traffic cone | exact | 6 | obs_obj_traffic_cones_001 | 0.95 |
| tree | estimated_range | 9-12 | obs_env_trees_001 | 0.95 |

| Search term | Supporting observations |
|---|---|
| stadium structure | obs_env_stadium_001 |
| leaf emblem | obs_obj_emblem_001 |
| traffic cones | obs_obj_traffic_cones_001 |
| metal fence | obs_obj_metal_fence_001 |
| stone stairs | obs_obj_stairs_001 |
| water body | obs_env_water_001 |
| trees | obs_env_trees_001 |
| golden grid | obs_obj_golden_grid_001 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_env_stadium_001",
      "kind": "environment",
      "label": "large stadium structure with green leaf emblem",
      "normalized_label": "stadium structure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_emblem_001",
      "kind": "objects_and_props",
      "label": "green leaf round emblem attached to stadium",
      "normalized_label": "leaf emblem",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_windows_001",
      "kind": "objects_and_props",
      "label": "set of four windows with blue and red shapes",
      "normalized_label": "windows",
      "scene_layer": "midground",
      "frame_position": "lower right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_road_001",
      "kind": "environment",
      "label": "curved paved road around stadium with purple and blue stripes",
      "normalized_label": "curved road with stripes",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_sidewalk_001",
      "kind": "environment",
      "label": "sidewalk with traffic cones and metal fence",
      "normalized_label": "sidewalk with cones and fence",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_traffic_cones_001",
      "kind": "objects_and_props",
      "label": "multiple orange and white traffic cones",
      "normalized_label": "traffic cones",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_count_traffic_cones_001",
      "kind": "counts",
      "label": "traffic cones",
      "normalized_label": "traffic cone",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_metal_fence_001",
      "kind": "objects_and_props",
      "label": "short metal fence with vertical bars",
      "normalized_label": "metal fence",
      "scene_layer": "foreground",
      "frame_position": "lower left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_road_barricade_001",
      "kind": "objects_and_props",
      "label": "metal road barricade near raised stairs",
      "normalized_label": "road barricade",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_stairs_001",
      "kind": "environment",
      "label": "set of stone stairs leading up near water",
      "normalized_label": "stone stairs",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_water_001",
      "kind": "environment",
      "label": "water body visible on the right side",
      "normalized_label": "water body",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_trees_001",
      "kind": "environment",
      "label": "group of dense dark green trees behind stadium",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "back right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_count_trees_001",
      "kind": "counts",
      "label": "trees",
      "normalized_label": "tree",
      "scene_layer": "background",
      "frame_position": "back right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_sky_001",
      "kind": "environment",
      "label": "clear blue sky with white clouds",
      "normalized_label": "sky with clouds",
      "scene_layer": "background",
      "frame_position": "upper left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_golden_grid_001",
      "kind": "objects_and_props",
      "label": "golden grid or mesh enclosing top of stadium structure",
      "normalized_label": "golden grid",
      "scene_layer": "midground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_traffic_cones_001",
      "module": "counts",
      "field_path": "counts[obs_count_traffic_cones_001]",
      "claim": "exact count of traffic cones",
      "value": "6",
      "supporting_observation_ids": [
        "obs_obj_traffic_cones_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_trees_001",
      "module": "counts",
      "field_path": "counts[obs_count_trees_001]",
      "claim": "approximate count of trees",
      "value": "at least 9",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_sky_001",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky is blue with white clouds",
      "value": "blue and white clouds",
      "supporting_observation_ids": [
        "obs_env_sky_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_water_001",
      "module": "environment",
      "field_path": "water",
      "claim": "presence of water body right side",
      "value": "visible water",
      "supporting_observation_ids": [
        "obs_env_water_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_stadium_001",
      "module": "environment",
      "field_path": "architecture",
      "claim": "presence of a large stadium architectural structure",
      "value": "large stadium with leaf emblem",
      "supporting_observation_ids": [
        "obs_env_stadium_001",
        "obs_obj_emblem_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_road_stripes_001",
      "module": "environment",
      "field_path": "terrain",
      "claim": "curved paved road with purple and blue stripes",
      "value": "striped road",
      "supporting_observation_ids": [
        "obs_obj_road_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_stairs_001",
      "module": "environment",
      "field_path": "terrain",
      "claim": "stone stairs near water body",
      "value": "visible stone stairs on right",
      "supporting_observation_ids": [
        "obs_obj_stairs_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_fencing_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "metal fence with vertical bars near sidewalk",
      "value": "metal fence",
      "supporting_observation_ids": [
        "obs_obj_metal_fence_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_barricade_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "metal road barricade near stairs",
      "value": "road barricade",
      "supporting_observation_ids": [
        "obs_obj_road_barricade_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_windows_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "four windows with blue and red shapes",
      "value": "windows with colored shapes",
      "supporting_observation_ids": [
        "obs_obj_windows_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_golden_grid_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props",
      "claim": "golden grid top enclosing stadium",
      "value": "golden grid",
      "supporting_observation_ids": [
        "obs_obj_golden_grid_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "obs_count_traffic_cones_001",
      "normalized_label": "traffic cone",
      "count_type": "exact",
      "exact_count": 6,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_obj_traffic_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    },
    {
      "count_id": "obs_count_trees_001",
      "normalized_label": "tree",
      "count_type": "estimated_range",
      "exact_count": 0,
      "estimated_min": 9,
      "estimated_max": 12,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ],
      "scene_layer": "background",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_obj_metal_fence_001",
      "obs_obj_traffic_cones_001"
    ],
    "midground": [
      "obs_env_stadium_001",
      "obs_obj_emblem_001",
      "obs_obj_golden_grid_001",
      "obs_obj_road_001",
      "obs_obj_road_barricade_001",
      "obs_obj_sidewalk_001",
      "obs_obj_stairs_001",
      "obs_obj_windows_001"
    ],
    "background": [
      "obs_env_sky_001",
      "obs_env_trees_001",
      "obs_env_water_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue",
      "white clouds"
    ],
    "ground": [
      "paved road",
      "sidewalk",
      "stone stairs"
    ],
    "terrain": [
      "curved road with purple and blue stripes",
      "grass near trees"
    ],
    "plants": [
      "dense green trees"
    ],
    "architecture": [
      "golden grid enclosure",
      "large stadium building with leaf emblem"
    ],
    "water": [
      "body of water visible right side"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_sky_001",
      "obs_env_stadium_001",
      "obs_env_trees_001",
      "obs_env_water_001",
      "obs_obj_road_001",
      "obs_obj_sidewalk_001",
      "obs_obj_stairs_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_emblem_001",
      "label": "green leaf round emblem",
      "normalized_label": "leaf emblem",
      "object_type": "symbol",
      "colors": [
        "green",
        "white"
      ],
      "material_appearance": [],
      "location": "stadium wall",
      "count_reference": "",
      "confidence": 0.98
    },
    {
      "observation_id": "obs_obj_windows_001",
      "label": "set of four windows",
      "normalized_label": "windows",
      "object_type": "window",
      "colors": [
        "blue",
        "red",
        "white"
      ],
      "material_appearance": [
        "transparent glass"
      ],
      "location": "stadium base",
      "count_reference": "",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_obj_traffic_cones_001",
      "label": "orange and white traffic cones",
      "normalized_label": "traffic cones",
      "object_type": "construction cone",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [],
      "location": "sidewalk",
      "count_reference": "obs_count_traffic_cones_001",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_obj_metal_fence_001",
      "label": "metal fence with vertical bars",
      "normalized_label": "metal fence",
      "object_type": "fence",
      "colors": [
        "gray"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "sidewalk near cones",
      "count_reference": "",
      "confidence": 0.95
    },
    {
      "observation_id": "obs_obj_road_barricade_001",
      "label": "metal road barricade",
      "normalized_label": "road barricade",
      "object_type": "barricade",
      "colors": [
        "gray",
        "orange",
        "white"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "near stone stairs",
      "count_reference": "",
      "confidence": 0.96
    },
    {
      "observation_id": "obs_obj_golden_grid_001",
      "label": "golden grid enclosure",
      "normalized_label": "golden grid",
      "object_type": "metal grid",
      "colors": [
        "golden yellow"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "top of stadium structure",
      "count_reference": "",
      "confidence": 0.96
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_obj_on_obs_env_stadium_001",
      "source_observation_id": "obs_obj_emblem_001",
      "target_observation_id": "obs_env_stadium_001",
      "relationship": "attached to",
      "evidence_strength": "strong"
    },
    {
      "relationship_id": "rel_obj_on_sidewalk_001",
      "source_observation_id": "obs_obj_traffic_cones_001",
      "target_observation_id": "obs_obj_sidewalk_001",
      "relationship": "placed on",
      "evidence_strength": "strong"
    },
    {
      "relationship_id": "rel_obj_near_stairs_001",
      "source_observation_id": "obs_obj_road_barricade_001",
      "target_observation_id": "obs_obj_stairs_001",
      "relationship": "near",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "blue",
      "gray",
      "green",
      "orange",
      "purple",
      "white",
      "yellow-gold"
    ],
    "lighting": [
      "diffused natural light"
    ],
    "shadows": [],
    "highlights": [
      "golden highlights on grid"
    ],
    "composition": [
      "asymmetric framing",
      "background trees balances stadium structure"
    ],
    "camera_angle": "slight low angle",
    "framing": "partial view, tilted",
    "cropping": [
      "partial crop of stadium right edge"
    ],
    "depth": "moderate depth of field",
    "motion_cues": [],
    "motifs": [
      "leaf symbol motif",
      "traffic control elements"
    ],
    "repeated_shapes": [
      "rectangular windows",
      "traffic cones"
    ],
    "style_cues": [
      "detailed realistic illustration",
      "digital painting"
    ],
    "supporting_observation_ids": [
      "obs_env_stadium_001",
      "obs_env_trees_001",
      "obs_obj_golden_grid_001",
      "obs_obj_sidewalk_001",
      "obs_obj_traffic_cones_001",
      "obs_obj_windows_001"
    ]
  },
  "surface_and_scan_cues": [
    {
      "observation_id": "obs_surface_001",
      "cue_type": "border",
      "cue": "golden card border with texture",
      "abstention": "",
      "confidence": 0.99
    }
  ],
  "coverage_reviews": {
    "subjects_review": "none_visible",
    "depicted_subjects_review": "none_visible",
    "character_representations_review": "none_visible",
    "counts_review": "observed",
    "scene_layers_review": "observed",
    "environment_review": "observed",
    "objects_and_props_review": "observed",
    "relationships_review": "observed",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "observed"
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
        "fact_env_barricade_001",
        "fact_env_fencing_001",
        "fact_env_golden_grid_001",
        "fact_env_windows_001"
      ],
      "object_observation_ids": [
        "obs_obj_emblem_001",
        "obs_obj_golden_grid_001",
        "obs_obj_metal_fence_001",
        "obs_obj_road_barricade_001",
        "obs_obj_traffic_cones_001",
        "obs_obj_windows_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_road_stripes_001",
        "fact_env_sky_001",
        "fact_env_stadium_001",
        "fact_env_stairs_001",
        "fact_env_water_001"
      ],
      "observation_ids": [
        "obs_env_sky_001",
        "obs_env_stadium_001",
        "obs_env_trees_001",
        "obs_env_water_001",
        "obs_obj_road_001",
        "obs_obj_sidewalk_001",
        "obs_obj_stairs_001"
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
    "counts": {
      "fact_ids": [
        "fact_traffic_cones_001",
        "fact_trees_001"
      ],
      "count_ids": [
        "obs_count_traffic_cones_001",
        "obs_count_trees_001"
      ]
    },
    "relationships": {
      "fact_ids": [],
      "relationship_ids": [
        "rel_obj_near_stairs_001",
        "rel_obj_on_obs_env_stadium_001",
        "rel_obj_on_sidewalk_001"
      ]
    },
    "surface_and_scan_cues": {
      "fact_ids": [],
      "observation_ids": [
        "obs_surface_001"
      ]
    },
    "uncertainty_and_abstentions": {
      "fact_ids": [],
      "fields": []
    },
    "fact_grounded_search_terms": {
      "fact_ids": [],
      "terms": [
        "golden grid",
        "leaf emblem",
        "metal fence",
        "stadium structure",
        "stone stairs",
        "traffic cones",
        "trees",
        "water body"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
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
      "module": "counts",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "relationships",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "surface_and_scan_cues",
      "review_status": "complete",
      "omission_risk": "low",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "stadium structure",
      "supporting_observation_ids": [
        "obs_env_stadium_001"
      ]
    },
    {
      "term": "leaf emblem",
      "supporting_observation_ids": [
        "obs_obj_emblem_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_obj_traffic_cones_001"
      ]
    },
    {
      "term": "metal fence",
      "supporting_observation_ids": [
        "obs_obj_metal_fence_001"
      ]
    },
    {
      "term": "stone stairs",
      "supporting_observation_ids": [
        "obs_obj_stairs_001"
      ]
    },
    {
      "term": "water body",
      "supporting_observation_ids": [
        "obs_env_water_001"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_env_trees_001"
      ]
    },
    {
      "term": "golden grid",
      "supporting_observation_ids": [
        "obs_obj_golden_grid_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-L1BSS-070 - Rainbow Energy

- Branch: `energy`
- V2 stress role: `abstract_energy`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.007102`
- Derived digest: Fact digest. Visible observations: large centered circular emblem with dark crescent shapes and blue glow, three white converging light streaks or beams pointing upward behind emblem, dark silhouette of four-eared creature with tail on left background, color gradient background from teal blue bottom to darker blue top, white glowing aura surrounding central circular emblem. Counts: centered circular emblem: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| large centered circular emblem with dark crescent shapes and blue glow | symbol | foreground | high | 0.99 |
| three white converging light streaks or beams pointing upward behind emblem | object | foreground | medium | 0.95 |
| silhouetted buildings in blue-gray shade on right background | object | background | low | 0.9 |
| dark silhouette of four-eared creature with tail on left background | object | background | medium | 0.9 |
| crescent moon shape white-blue on left behind creature silhouette | object | background | low | 0.9 |
| color gradient background from teal blue bottom to darker blue top | color_field | background | high | 0.99 |
| white glowing aura surrounding central circular emblem | effect | foreground | high | 0.98 |

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
| visual_effects | complete | low | high |  |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | There is a large centered circular emblem with dark crescent shapes and a blue glow | obs_symbol_001 | 0.99 |
| fact_002 | visual_effects | There are three white converging light streaks or beams pointing upward behind the emblem | obs_triple_light_streaks_002 | 0.95 |
| fact_003 | environment | There are multiple silhouetted buildings shown in blue-gray shade on the right background | obs_background_buildings_003 | 0.9 |
| fact_004 | environment | There is a dark silhouette of a creature with large ears and tail on the left background | obs_background_silhouette_creature_004 | 0.9 |
| fact_005 | environment | A crescent moon shape is visible in white-blue tone on the upper left background behind the creature silhouette | obs_background_moon_005 | 0.9 |
| fact_006 | color_and_light | The background features a teal-blue gradient transitioning to darker blue from bottom to top | obs_color_gradient_006 | 0.99 |
| fact_007 | visual_effects | A white glowing aura surrounds the central circular emblem | obs_white_glow_007 | 0.98 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| centered circular emblem | exact | 1 | obs_symbol_001 | 0.99 |

| Search term | Supporting observations |
|---|---|
| centered dark crescent shaped emblem | obs_symbol_001 |
| teal to dark blue gradient background | obs_color_gradient_006 |
| three white converging light streaks | obs_triple_light_streaks_002 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_symbol_001",
      "kind": "symbol",
      "label": "large centered circular emblem with dark crescent shapes and blue glow",
      "normalized_label": "centered circular emblem",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_triple_light_streaks_002",
      "kind": "object",
      "label": "three white converging light streaks or beams pointing upward behind emblem",
      "normalized_label": "white light streaks",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_background_buildings_003",
      "kind": "object",
      "label": "silhouetted buildings in blue-gray shade on right background",
      "normalized_label": "background buildings",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_background_silhouette_creature_004",
      "kind": "object",
      "label": "dark silhouette of four-eared creature with tail on left background",
      "normalized_label": "silhouette creature",
      "scene_layer": "background",
      "frame_position": "left",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_background_moon_005",
      "kind": "object",
      "label": "crescent moon shape white-blue on left behind creature silhouette",
      "normalized_label": "crescent moon",
      "scene_layer": "background",
      "frame_position": "upper_left",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_color_gradient_006",
      "kind": "color_field",
      "label": "color gradient background from teal blue bottom to darker blue top",
      "normalized_label": "blue gradient background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_white_glow_007",
      "kind": "effect",
      "label": "white glowing aura surrounding central circular emblem",
      "normalized_label": "white glow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "object.label",
      "claim": "There is a large centered circular emblem with dark crescent shapes and a blue glow",
      "value": "centered circular emblem with dark crescent shapes and blue glow",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "visual_effects",
      "field_path": "visual_effects.label",
      "claim": "There are three white converging light streaks or beams pointing upward behind the emblem",
      "value": "three white converging light streaks or beams",
      "supporting_observation_ids": [
        "obs_triple_light_streaks_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_003",
      "module": "environment",
      "field_path": "environment.architecture",
      "claim": "There are multiple silhouetted buildings shown in blue-gray shade on the right background",
      "value": "blue-gray silhouetted buildings",
      "supporting_observation_ids": [
        "obs_background_buildings_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_004",
      "module": "environment",
      "field_path": "environment.setting",
      "claim": "There is a dark silhouette of a creature with large ears and tail on the left background",
      "value": "silhouette creature with large ears and tail",
      "supporting_observation_ids": [
        "obs_background_silhouette_creature_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_005",
      "module": "environment",
      "field_path": "environment.sky",
      "claim": "A crescent moon shape is visible in white-blue tone on the upper left background behind the creature silhouette",
      "value": "crescent moon shape",
      "supporting_observation_ids": [
        "obs_background_moon_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_006",
      "module": "color_and_light",
      "field_path": "color_and_light.palette",
      "claim": "The background features a teal-blue gradient transitioning to darker blue from bottom to top",
      "value": "teal to dark blue gradient background",
      "supporting_observation_ids": [
        "obs_color_gradient_006"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "visual_effects",
      "field_path": "visual_effects.label",
      "claim": "A white glowing aura surrounds the central circular emblem",
      "value": "white glow surrounding emblem",
      "supporting_observation_ids": [
        "obs_white_glow_007"
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
      "count_id": "count_001",
      "normalized_label": "centered circular emblem",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_symbol_001",
      "obs_triple_light_streaks_002",
      "obs_white_glow_007"
    ],
    "midground": [],
    "background": [
      "obs_background_buildings_003",
      "obs_background_moon_005",
      "obs_background_silhouette_creature_004",
      "obs_color_gradient_006"
    ]
  },
  "environment": {
    "setting": [
      "silhouette creature with large ears and tail"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "crescent moon shape"
    ],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [
      "blue-gray silhouetted buildings"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "night time implied by moon and dark blue colors"
    ],
    "supporting_observation_ids": [
      "obs_background_buildings_003",
      "obs_background_moon_005",
      "obs_background_silhouette_creature_004",
      "obs_color_gradient_006"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_symbol_001",
      "label": "centered circular emblem with dark crescent shapes and blue glow",
      "normalized_label": "centered circular emblem",
      "object_type": "symbol",
      "colors": [
        "black",
        "blue",
        "dark gray",
        "white"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 0.99
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_triple_light_streaks_002",
      "target_observation_id": "obs_symbol_001",
      "relationship": "light_streaks_behind_symbol",
      "evidence_strength": "medium"
    }
  ],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "dark teal",
      "white"
    ],
    "lighting": [
      "backlit glow",
      "highlight on circular emblem"
    ],
    "shadows": [],
    "highlights": [
      "white aura glow"
    ],
    "composition": [
      "centered circular emblem",
      "symmetrical design",
      "triangular light beams pointing upward"
    ],
    "camera_angle": "straight-on",
    "framing": "tight center framing",
    "cropping": [],
    "depth": "shallow depth with clear background layers",
    "motion_cues": [],
    "motifs": [
      "converging triangular light shapes",
      "crescent shapes"
    ],
    "repeated_shapes": [
      "crescents",
      "triangles"
    ],
    "style_cues": [
      "glowing abstract digital art",
      "silhouetted shapes"
    ],
    "supporting_observation_ids": [
      "obs_background_buildings_003",
      "obs_background_moon_005",
      "obs_background_silhouette_creature_004",
      "obs_color_gradient_006",
      "obs_symbol_001",
      "obs_triple_light_streaks_002",
      "obs_white_glow_007"
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
    "relationships_review": "observed",
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
        "fact_001"
      ],
      "object_observation_ids": [
        "obs_symbol_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_006"
      ],
      "observation_ids": [
        "obs_background_buildings_003",
        "obs_background_moon_005",
        "obs_background_silhouette_creature_004",
        "obs_color_gradient_006"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_002"
      ],
      "observation_ids": [
        "obs_triple_light_streaks_002"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_006"
      ],
      "observation_ids": [
        "obs_color_gradient_006"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_002",
        "fact_007"
      ],
      "observation_ids": [
        "obs_triple_light_streaks_002",
        "obs_white_glow_007"
      ]
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_001"
      ]
    },
    "relationships": {
      "fact_ids": [],
      "relationship_ids": [
        "rel_001"
      ]
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
      "fact_ids": [
        "fact_001",
        "fact_002",
        "fact_006"
      ],
      "terms": [
        "centered dark crescent shaped emblem",
        "teal to dark blue gradient background",
        "three white converging light streaks"
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
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
      "review_status": "complete",
      "omission_risk": "low",
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
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "fact_grounded_search_terms",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "centered dark crescent shaped emblem",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "teal to dark blue gradient background",
      "supporting_observation_ids": [
        "obs_color_gradient_006"
      ]
    },
    {
      "term": "three white converging light streaks",
      "supporting_observation_ids": [
        "obs_triple_light_streaks_002"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-105 - Dark Bell

- Branch: `item_tool_supporter`
- V2 stress role: `object_heavy_item`
- Review status: `pending`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0063944`
- Derived digest: Fact digest. Visible observations: bell-shaped object, black polygonal bell body with white outlines, dark rounded body section near top handle, yellow stripe band near handle, handle made of connected polygon shapes, white sphere inside bell opening, vortex swirl purple-blue background. Counts: bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| bell-shaped object | object | foreground | high | 0.99 |
| black polygonal bell body with white outlines | object | foreground | high | 0.98 |
| dark rounded body section near top handle | object | foreground | medium | 0.95 |
| yellow stripe band near handle | object | foreground | medium | 0.96 |
| handle made of connected polygon shapes | object | foreground | medium | 0.97 |
| white sphere inside bell opening | object | foreground | high | 0.99 |
| vortex swirl purple-blue background | environment | background | high | 0.98 |

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | none_visible | none | not_applicable |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | object is bell | obs_object_001, obs_object_002, obs_object_005 | 0.99 |
| fact_002 | objects_and_props | bell body color | obs_object_002 | 0.98 |
| fact_003 | objects_and_props | bell body has dark rounded section and yellow stripe band | obs_object_003, obs_object_004 | 0.95 |
| fact_004 | objects_and_props | bell handle shape | obs_object_005 | 0.97 |
| fact_005 | objects_and_props | inside bell opening contains white sphere | obs_object_006 | 0.99 |
| fact_006 | environment | background swirl | obs_environment_001 | 0.98 |

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bell | exact | 1 | obs_object_001 | 0.99 |

| Search term | Supporting observations |
|---|---|
| bell-shaped polygon object | obs_object_001 |
| black bell with yellow stripe | obs_object_002, obs_object_004 |
| white sphere inside bell | obs_object_006 |
| purple blue swirling background | obs_environment_001 |
| polygonal handle and facets | obs_object_002, obs_object_005 |

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "bell-shaped object",
      "normalized_label": "bell",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "black polygonal bell body with white outlines",
      "normalized_label": "black polygonal bell",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_003",
      "kind": "object",
      "label": "dark rounded body section near top handle",
      "normalized_label": "dark rounded body section",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_004",
      "kind": "object",
      "label": "yellow stripe band near handle",
      "normalized_label": "yellow stripe band",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_005",
      "kind": "object",
      "label": "handle made of connected polygon shapes",
      "normalized_label": "polygonal handle",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_006",
      "kind": "object",
      "label": "white sphere inside bell opening",
      "normalized_label": "white sphere",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "vortex swirl purple-blue background",
      "normalized_label": "purple blue vortex swirl background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[bell]",
      "claim": "object is bell",
      "value": "bell-shaped object with polygonal facets and handle",
      "supporting_observation_ids": [
        "obs_object_001",
        "obs_object_002",
        "obs_object_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "objects_and_props[bell_body_color]",
      "claim": "bell body color",
      "value": "black with white outlines",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "objects_and_props[bodyside_details]",
      "claim": "bell body has dark rounded section and yellow stripe band",
      "value": "dark rounded body section and yellow stripe band near handle",
      "supporting_observation_ids": [
        "obs_object_003",
        "obs_object_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "objects_and_props",
      "field_path": "objects_and_props[handle_shape]",
      "claim": "bell handle shape",
      "value": "handle made of connected polygonal shapes",
      "supporting_observation_ids": [
        "obs_object_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "objects_and_props",
      "field_path": "objects_and_props[interior_element]",
      "claim": "inside bell opening contains white sphere",
      "value": "white sphere inside bell opening",
      "supporting_observation_ids": [
        "obs_object_006"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "environment",
      "field_path": "environment[background]",
      "claim": "background swirl",
      "value": "vortex swirl purple-blue background",
      "supporting_observation_ids": [
        "obs_environment_001"
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
      "count_id": "count_bell_001",
      "normalized_label": "bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 1,
      "estimated_max": 1,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_object_001",
      "obs_object_002",
      "obs_object_003",
      "obs_object_004",
      "obs_object_005",
      "obs_object_006"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
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
    "supporting_observation_ids": [
      "obs_environment_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "bell-shaped object",
      "normalized_label": "bell",
      "object_type": "device",
      "colors": [
        "black",
        "white",
        "yellow"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded body",
        "white sphere",
        "yellow stripe band"
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
      "blue",
      "purple",
      "white",
      "yellow"
    ],
    "lighting": [
      "bright highlights on bell body"
    ],
    "shadows": [
      "soft shadows under bell facets"
    ],
    "highlights": [
      "bright white sphere highlight",
      "metallic-looking highlights"
    ],
    "composition": [
      "central composition",
      "vortex swirl background"
    ],
    "camera_angle": "slightly tilted top-down",
    "framing": "centered tight crop",
    "cropping": [
      "full bell visible"
    ],
    "depth": "moderate depth",
    "motion_cues": [
      "background swirl implies motion"
    ],
    "motifs": [
      "polygonal shapes on bell"
    ],
    "repeated_shapes": [
      "polygonal facets"
    ],
    "style_cues": [
      "graphic style",
      "high contrast"
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
        "fact_001",
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_002",
        "obs_object_003",
        "obs_object_004",
        "obs_object_005",
        "obs_object_006"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_006"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_object_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_object_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001"
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
        "bell-shaped polygon object",
        "black bell with yellow stripe",
        "polygonal handle and facets",
        "purple blue swirling background",
        "white sphere inside bell"
      ]
    }
  },
  "module_reviews": [
    {
      "module": "subjects",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "bell-shaped polygon object",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "black bell with yellow stripe",
      "supporting_observation_ids": [
        "obs_object_002",
        "obs_object_004"
      ]
    },
    {
      "term": "white sphere inside bell",
      "supporting_observation_ids": [
        "obs_object_006"
      ]
    },
    {
      "term": "purple blue swirling background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "polygonal handle and facets",
      "supporting_observation_ids": [
        "obs_object_002",
        "obs_object_005"
      ]
    }
  ]
}
```

</details>

