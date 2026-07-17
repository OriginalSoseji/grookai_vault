# Card Visual Fact Graph V2 Review Packet

Generated rows: 4
Validation failures: 0
Skipped images: 0
Estimated cost USD: 0.036116

## Rows

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- V2 stress role: `dense_pokemon_artwork`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.9`
- Cost USD: `0.008648`
- Artwork observations: `8`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: Japanese text.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary | 0.95 |
| head | head | creature_anatomy | foreground | primary | 0.9 |
| tentacle-like appendages | tentacle appendages | creature_anatomy | foreground | primary | 0.9 |
| eyes closed | eyes closed | creature_anatomy | foreground | primary | 0.8 |
| mouth not visible | mouth not visible | creature_anatomy | foreground | primary | 0.9 |
| floating pose | floating | creature_anatomy | foreground | primary | 0.95 |
| golden abstract background | golden abstract background | environment | background | primary | 0.95 |
| Japanese text in card interface | Japanese text | objects_and_props | midground | medium | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text: メガダークライ ex | card_ui_text | top | visible | 0.99 |
| HP 280 | hp_text | top_right | visible | 0.99 |
| set symbol lower left | set_symbol | bottom_left | visible | 0.85 |
| 118/081 | collector_number | bottom_left | visible | 0.9 |
| Illus. 5ban Graphics | illustrator_text | bottom_left | visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene subject | obs_subject_001 | 0.95 |
| fact_creature_anatomy_001 | creature_anatomy | visible body region | obs_creature_anatomy_001 | 0.9 |
| fact_creature_anatomy_002 | creature_anatomy | physical features | obs_creature_anatomy_002 | 0.9 |
| fact_creature_anatomy_003 | creature_anatomy | eye state | obs_creature_anatomy_003 | 0.8 |
| fact_creature_anatomy_004 | creature_anatomy | mouth visibility | obs_creature_anatomy_004 | 0.9 |
| fact_creature_anatomy_005 | creature_anatomy | pose | obs_creature_anatomy_005 | 0.95 |
| fact_environment_001 | environment | environment setting | obs_environment_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text | obs_card_ui_001 | 0.99 |
| fact_card_ui_002 | hp text | obs_card_ui_002 | 0.99 |
| fact_card_ui_003 | set symbol | obs_card_ui_003 | 0.85 |
| fact_card_ui_004 | collector number | obs_card_ui_004 | 0.9 |
| fact_card_ui_005 | illustrator text | obs_card_ui_005 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003",
    "fact_card_ui_004",
    "fact_card_ui_005"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_004"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_005"
  ],
  "error_marker_observation_ids": [],
  "other_print_marker_observation_ids": []
}
```

</details>

#### Module Completeness Reviews

| Module | Status | Omission risk | Evidence quality | Abstentions |
|---|---|---|---|---|
| subjects | complete | none | high |  |
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | complete | none | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | likely_complete | low | medium |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | likely_complete | low | medium |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | medium | mixed | terms: textual elements partially unreadable for detailed terms |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

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
| Japanese text | obs_objects_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| floating | obs_creature_anatomy_005 | deterministic_rule | 0.95 |
| floating | obs_subject_001 | deterministic_rule | 0.95 |
| radial lines | obs_environment_001, obs_subject_001 | deterministic_rule | 0.92 |
| upright orientation | obs_subject_001 | deterministic_rule | 0.95 |
| upright orientation | obs_creature_anatomy_005 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: Japanese text.
- Quality flags: `potential_module_incomplete_or_low_evidence`
- Policy results: 0

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
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "tentacle-like appendages",
      "normalized_label": "tentacle appendages",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "eyes closed",
      "normalized_label": "eyes closed",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "mouth not visible",
      "normalized_label": "mouth not visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "floating pose",
      "normalized_label": "floating",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "golden abstract background",
      "normalized_label": "golden abstract background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "Japanese text in card interface",
      "normalized_label": "Japanese text",
      "scene_layer": "midground",
      "frame_position": "interface",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text: メガダークライ ex",
      "normalized_label": "card name text mega darkrai ex",
      "scene_layer": "interface",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 280",
      "normalized_label": "HP 280",
      "scene_layer": "interface",
      "frame_position": "top_right",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "set_symbol",
      "label": "set symbol lower left",
      "normalized_label": "set symbol",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "collector_number",
      "label": "118/081",
      "normalized_label": "collector number 118/081",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "illustrator_text",
      "label": "Illus. 5ban Graphics",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "scene subject",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "head",
      "claim": "visible body region",
      "value": "head",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "appendages",
      "claim": "physical features",
      "value": "tentacle-like appendages",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "eyes",
      "claim": "eye state",
      "value": "closed",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.8,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "mouth",
      "claim": "mouth visibility",
      "value": "not visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose",
      "value": "floating",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "environment setting",
      "value": "golden abstract background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text[0]",
      "claim": "card name text",
      "value": "メガダークライ ex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text[0]",
      "claim": "hp text",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol[0]",
      "claim": "set symbol",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "collector number",
      "value": "118/081",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text[0]",
      "claim": "illustrator text",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.95,
      "anatomy": [
        "head",
        "tentacle-like appendages"
      ],
      "physical_features": [
        "tentacle-like appendages"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "upright",
      "action_state": [],
      "facial_evidence": {
        "eyes": "closed",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "golden"
      ],
      "visibility": "visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_subject_001"
    ],
    "midground": [
      "obs_objects_001"
    ],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "golden abstract background"
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
      "obs_environment_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "Japanese text in card interface",
      "normalized_label": "japanese text",
      "object_type": "text",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "printed ink"
      ],
      "location": "midground interface",
      "count_reference": "",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "golden",
      "yellow"
    ],
    "lighting": [
      "high contrast reflective"
    ],
    "shadows": [],
    "highlights": [
      "strong highlights on gold foil"
    ],
    "composition": [
      "center composition"
    ],
    "camera_angle": "head-on",
    "framing": "tight framing on subject",
    "cropping": [],
    "depth": "shallow depth",
    "motion_cues": [],
    "motifs": [
      "angular shapes",
      "radiating lines"
    ],
    "repeated_shapes": [
      "angular linear patterns"
    ],
    "style_cues": [
      "foil texture",
      "graphic design"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
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
    "objects_and_props_review": "observed",
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
      "fact_ids": [],
      "visible_body_regions": [],
      "facial_evidence": [],
      "hair": [],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_creature_anatomy_001",
        "fact_creature_anatomy_002",
        "fact_creature_anatomy_003",
        "fact_creature_anatomy_004",
        "fact_creature_anatomy_005"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "",
          "visibility": "visible",
          "colors": [],
          "details": [
            "centered face position"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.9
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "torso and limbs",
          "feature": "tentacle-like appendages",
          "visibility": "visible",
          "colors": [
            "golden"
          ],
          "details": [
            "angular and jagged"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.9
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "upright",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.95
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
      "fact_ids": [],
      "object_observation_ids": [
        "obs_objects_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004",
        "fact_card_ui_005"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_004"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_005"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
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
        "Japanese text"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "mixed",
      "abstentions": [
        {
          "field_path": "terms",
          "reason": "textual elements partially unreadable for detailed terms",
          "affected_observation_ids": [
            "obs_objects_001"
          ]
        }
      ]
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Japanese text",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "radial lines",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- V2 stress role: `trainer_person_artwork`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.00915`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: woman. Semantic facts: smiling.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| woman | woman | scene_subject | foreground | salient | 0.99 |
| orange hair in spiked style with side ponytail | orange hair spiked ponytail | object | foreground | salient | 0.99 |
| large teal eyes | large teal eyes | object | foreground | salient | 0.98 |
| blue one-piece swimsuit with tank top straps | blue one-piece swimsuit tank top neckline | object | foreground | salient | 0.99 |
| black wrist sweatband on right wrist | black wrist sweatband | object | foreground | salient | 0.95 |
| athletic standing pose with left fist forward and right arm bent | athletic stance left fist forward right arm bent | pose | foreground | salient | 0.95 |
| indoor swimming pool background | indoor swimming pool | environment | background | moderate | 0.9 |
| pool water with light reflections and sparkles | pool water reflections sparkles | object | background | moderate | 0.9 |
| poolside bench visible in background | pool bench | object | background | low | 0.85 |
| left hand clenched into fist | left clenched fist | object | foreground | salient | 0.98 |
| right hand clenched but less prominently | right clenched fist | object | foreground | moderate | 0.9 |
| visible arms and neck skin | visible skin arms neck | object | foreground | salient | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | There is one visible human subject, a woman in the foreground standing in center frame | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | The subject has orange spiked hair styled with a ponytail on the right side | obs_hair_001 | 0.99 |
| fact_003 | human_appearance | The subject has large teal eyes visible clearly | obs_eye_001 | 0.98 |
| fact_004 | clothing | The subject wears a blue one-piece swimsuit with tank top style neckline | obs_clothing_001 | 0.99 |
| fact_005 | clothing | The subject has a black wrist sweatband on her right wrist | obs_clothing_002 | 0.95 |
| fact_006 | human_appearance | The subject is posed with left fist forward and right arm bent in an athletic stance | obs_posture_001 | 0.95 |
| fact_007 | creature_anatomy | Visible skin regions include arms and neck | obs_skin_001 | 0.99 |
| fact_008 | objects_and_props | The poolside bench is visible in the background right side | obs_environment_003 | 0.85 |
| fact_009 | environment | The card artwork setting is an indoor swimming pool environment | obs_environment_001, obs_environment_002 | 0.9 |

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
| subjects | complete | none | high |  |
| human_appearance | complete | low | high |  |
| creature_anatomy | complete | none | high |  |
| clothing | complete | low | high |  |
| objects_and_props | complete | medium | medium |  |
| environment | complete | medium | medium |  |
| composition | partial_due_to_crop | medium | medium |  |
| color_and_light | partial_due_to_crop | medium | medium |  |
| visual_effects | partial_due_to_crop | medium | medium |  |
| card_ui_and_print_markers | partial_due_to_crop | high | low |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_001 | expression | smiling | obs_subject_001 | obs_subject_001 | open mouth with visible smile wide open eyes neutral face fully visible pose standing | 0.95 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|

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
| indoor swimming pool | obs_environment_001, obs_environment_002 |
| blue swimsuit | obs_clothing_001 |
| orange ponytail hair | obs_hair_001 |
| black wristband | obs_clothing_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| athletic stance | obs_subject_001 | deterministic_rule | 0.99 |
| athletic stance | obs_posture_001 | deterministic_rule | 0.95 |
| centered composition | obs_environment_001, obs_environment_002, obs_subject_001 | deterministic_rule | 0.92 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_posture_001 | deterministic_rule | 0.95 |
| forward-right orientation | obs_posture_001 | deterministic_rule | 0.95 |
| left fist forward | obs_subject_001 | deterministic_rule | 0.99 |
| left fist forward | obs_posture_001 | deterministic_rule | 0.95 |
| left orientation | obs_hands_001 | deterministic_rule | 0.98 |
| right arm bent | obs_subject_001 | deterministic_rule | 0.99 |
| right arm bent | obs_posture_001 | deterministic_rule | 0.95 |
| right orientation | obs_clothing_002 | deterministic_rule | 0.95 |
| right orientation | obs_hands_002 | deterministic_rule | 0.9 |
| smiling | obs_subject_001 | deterministic_rule | 0.95 |
| standing | obs_posture_001 | deterministic_rule | 0.95 |
| water | obs_environment_002 | deterministic_rule | 0.9 |
| water | obs_environment_001, obs_environment_002, obs_subject_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: woman. Semantic facts: smiling.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "woman",
      "normalized_label": "woman",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "object",
      "label": "orange hair in spiked style with side ponytail",
      "normalized_label": "orange hair spiked ponytail",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eye_001",
      "kind": "object",
      "label": "large teal eyes",
      "normalized_label": "large teal eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "object",
      "label": "blue one-piece swimsuit with tank top straps",
      "normalized_label": "blue one-piece swimsuit tank top neckline",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "object",
      "label": "black wrist sweatband on right wrist",
      "normalized_label": "black wrist sweatband",
      "scene_layer": "foreground",
      "frame_position": "right arm",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_posture_001",
      "kind": "pose",
      "label": "athletic standing pose with left fist forward and right arm bent",
      "normalized_label": "athletic stance left fist forward right arm bent",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
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
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "object",
      "label": "pool water with light reflections and sparkles",
      "normalized_label": "pool water reflections sparkles",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "object",
      "label": "poolside bench visible in background",
      "normalized_label": "pool bench",
      "scene_layer": "background",
      "frame_position": "background right",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hands_001",
      "kind": "object",
      "label": "left hand clenched into fist",
      "normalized_label": "left clenched fist",
      "scene_layer": "foreground",
      "frame_position": "center left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hands_002",
      "kind": "object",
      "label": "right hand clenched but less prominently",
      "normalized_label": "right clenched fist",
      "scene_layer": "foreground",
      "frame_position": "center right",
      "visibility": "visible",
      "salience": "moderate",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_skin_001",
      "kind": "object",
      "label": "visible arms and neck skin",
      "normalized_label": "visible skin arms neck",
      "scene_layer": "foreground",
      "frame_position": "arms neck",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "There is one visible human subject, a woman in the foreground standing in center frame",
      "value": "woman",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "The subject has orange spiked hair styled with a ponytail on the right side",
      "value": "orange hair spiked ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "facial_features.eyes",
      "claim": "The subject has large teal eyes visible clearly",
      "value": "large teal eyes",
      "supporting_observation_ids": [
        "obs_eye_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "The subject wears a blue one-piece swimsuit with tank top style neckline",
      "value": "blue one-piece swimsuit tank top neckline",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "The subject has a black wrist sweatband on her right wrist",
      "value": "black wrist sweatband",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "pose[0]",
      "claim": "The subject is posed with left fist forward and right arm bent in an athletic stance",
      "value": "athletic stance left fist forward right arm bent",
      "supporting_observation_ids": [
        "obs_posture_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "visible_body_regions",
      "claim": "Visible skin regions include arms and neck",
      "value": "arms neck skin visible",
      "supporting_observation_ids": [
        "obs_skin_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "objects_and_props",
      "field_path": "objects[0]",
      "claim": "The poolside bench is visible in the background right side",
      "value": "pool bench",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "setting",
      "claim": "The card artwork setting is an indoor swimming pool environment",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "woman",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "neck"
      ],
      "physical_features": [
        "large teal eyes",
        "orange spiked hair ponytail"
      ],
      "pose": [
        "athletic stance",
        "left fist forward",
        "right arm bent"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "open smiling",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": [
          "face fully visible"
        ]
      },
      "clothing_or_accessories": [
        "black wrist sweatband",
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
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_eye_001",
      "obs_hair_001",
      "obs_hands_001",
      "obs_hands_002",
      "obs_posture_001",
      "obs_skin_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003"
    ]
  },
  "environment": {
    "setting": [
      "indoor swimming pool"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [
      "poolside bench"
    ],
    "water": [
      "pool water"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_environment_003",
      "label": "pool bench",
      "normalized_label": "pool bench",
      "object_type": "furniture",
      "colors": [
        "blue"
      ],
      "material_appearance": [
        "plastic-like appearance or metal-like appearance appearance"
      ],
      "location": "background right",
      "count_reference": "count_001",
      "confidence": 0.85
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "orange",
      "skin tones",
      "white accents"
    ],
    "lighting": [
      "blue light reflections",
      "bright even lighting"
    ],
    "shadows": [
      "minimal shadows"
    ],
    "highlights": [
      "sparkles on pool water"
    ],
    "composition": [
      "centered subject",
      "parallel horizontal lines in background"
    ],
    "camera_angle": "eye level",
    "framing": "tight around subject upper body",
    "cropping": [],
    "depth": "clear separation between foreground and background",
    "motion_cues": [
      "gesture fist thrust forward"
    ],
    "motifs": [
      "light sparkles",
      "water theme"
    ],
    "repeated_shapes": [
      "angular hair spikes"
    ],
    "style_cues": [
      "bright clean"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
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
    "objects_and_props_review": "observed",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "none_visible"
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
        "fact_002",
        "fact_003",
        "fact_006",
        "fact_007"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms and neck",
          "visibility": "visible",
          "details": [
            "skin visible"
          ],
          "supporting_observation_ids": [
            "obs_skin_001"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "open",
          "mouth": "open smiling",
          "eyebrows": "neutral",
          "other_visible_evidence": [
            "face fully visible"
          ],
          "supporting_observation_ids": [
            "obs_eye_001"
          ],
          "confidence": 0.98
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange spiked hair with ponytail",
          "details": [
            "hair tied in ponytail on right side",
            "spiked style"
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
          "label": "athletic stance with left fist forward and right arm bent",
          "details": [
            "left fist clenched",
            "right arm bent"
          ],
          "supporting_observation_ids": [
            "obs_posture_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wrist sweatband on right wrist",
          "details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        }
      ]
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_007"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "athletic stance",
            "left fist forward",
            "right arm bent"
          ],
          "orientation": "forward",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_posture_001"
          ],
          "confidence": 0.95
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_004",
        "fact_005"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue one-piece swimsuit",
          "neckline_type": "tank top neckline",
          "sleeve_type": "strap sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [
            "solid color"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wrist sweatband",
          "details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_008"
      ],
      "object_observation_ids": [
        "obs_environment_003"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_009"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002"
      ]
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
        "indoor swimming pool",
        "blue swimsuit",
        "orange ponytail hair",
        "black wristband"
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "objects_and_props",
      "review_status": "complete",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "environment",
      "review_status": "complete",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "partial_due_to_crop",
      "omission_risk": "high",
      "evidence_quality": "low",
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "svf_001",
      "category": "expression",
      "label": "smiling",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [
          "open mouth with visible smile"
        ],
        "eyes": [
          "wide open eyes"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "face fully visible"
        ],
        "body_language": [
          "pose"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.95,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    {
      "term": "blue swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "orange ponytail hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "black wristband",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "athletic stance",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "athletic stance",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_environment_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "left fist forward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left fist forward",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_hands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right arm bent",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right arm bent",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_clothing_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_hands_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "smiling",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_posture_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_environment_002",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- V2 stress role: `environment_heavy_stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0086036`
- Artwork observations: `10`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium building, green leaf emblem, blue sky with clouds, tree, grass terrain, water body, pathway, fence. Counts: traffic cones: 3-3.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium building | stadium building | object | midground | high | 0.99 |
| green leaf emblem | green leaf emblem | object | midground | medium | 0.95 |
| blue sky with clouds | blue sky with clouds | sky | background | medium | 0.97 |
| trees | tree | object | background | medium | 0.95 |
| green grass terrain | grass terrain | object | foreground | high | 0.99 |
| river or water body | water body | object | background | medium | 0.96 |
| stone or tiled pathway | pathway | object | foreground | medium | 0.94 |
| metal fence | fence | object | foreground | medium | 0.95 |
| orange traffic cones | traffic cone | object | foreground | low | 0.9 |
| green pole or flagpole | pole | object | midground | medium | 0.94 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_stadium_building_001 | 0.99 |
| fact_env_002 | environment | architecture | obs_stadium_building_001, obs_stadium_sign_001 | 0.99 |
| fact_env_003 | environment | sky | obs_sky_001 | 0.97 |
| fact_env_004 | environment | plants | obs_tree_group_001 | 0.95 |
| fact_env_005 | environment | water body | obs_water_001 | 0.96 |
| fact_env_006 | environment | terrain | obs_terrain_grass_001 | 0.99 |
| fact_env_007 | environment | objects | obs_pathway_001 | 0.94 |
| fact_env_008 | environment | objects | obs_fence_001 | 0.95 |
| fact_env_009 | environment | objects | obs_traffic_cone_001 | 0.9 |
| fact_env_010 | environment | objects | obs_pole_001 | 0.94 |

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
| composition | partial_due_to_crop | medium | medium |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_crop | medium | medium |  |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| traffic cones | estimated_range | 3-3 | obs_traffic_cone_001 | 0.9 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| leads to | obs_pathway_001 | obs_stadium_building_001 | strong |
| along | obs_fence_001 | obs_pathway_001 | strong |
| along | obs_traffic_cone_001 | obs_pathway_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| stadium building | obs_stadium_building_001 |
| green leaf emblem | obs_stadium_sign_001 |
| blue sky | obs_sky_001 |
| grass terrain | obs_terrain_grass_001 |
| green pole | obs_pole_001 |
| metal fence | obs_fence_001 |
| river | obs_water_001 |
| stone pathway | obs_pathway_001 |
| traffic cones | obs_traffic_cone_001 |
| trees | obs_tree_group_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_stadium_building_001 | deterministic_rule | 0.99 |
| cloud | obs_sky_001 | deterministic_rule | 0.97 |
| reflective-looking surface | obs_fence_001, obs_pathway_001, obs_sky_001, obs_stadium_building_001, obs_stadium_sign_001, obs_terrain_grass_001 | deterministic_rule | 0.92 |
| sky | obs_sky_001 | deterministic_rule | 0.97 |
| terrain | obs_terrain_grass_001 | deterministic_rule | 0.99 |
| tree | obs_tree_group_001 | deterministic_rule | 0.95 |
| water | obs_water_001 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium building, green leaf emblem, blue sky with clouds, tree, grass terrain, water body, pathway, fence. Counts: traffic cones: 3-3.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_building_001",
      "kind": "object",
      "label": "stadium building",
      "normalized_label": "stadium building",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_sign_001",
      "kind": "object",
      "label": "green leaf emblem",
      "normalized_label": "green leaf emblem",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "blue sky with clouds",
      "normalized_label": "blue sky with clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_tree_group_001",
      "kind": "object",
      "label": "trees",
      "normalized_label": "tree",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_terrain_grass_001",
      "kind": "object",
      "label": "green grass terrain",
      "normalized_label": "grass terrain",
      "scene_layer": "foreground",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_water_001",
      "kind": "object",
      "label": "river or water body",
      "normalized_label": "water body",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pathway_001",
      "kind": "object",
      "label": "stone or tiled pathway",
      "normalized_label": "pathway",
      "scene_layer": "foreground",
      "frame_position": "center-bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_fence_001",
      "kind": "object",
      "label": "metal fence",
      "normalized_label": "fence",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_traffic_cone_001",
      "kind": "object",
      "label": "orange traffic cones",
      "normalized_label": "traffic cone",
      "scene_layer": "foreground",
      "frame_position": "left-bottom",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pole_001",
      "kind": "object",
      "label": "green pole or flagpole",
      "normalized_label": "pole",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "stadium environment with building and outdoor features",
      "supporting_observation_ids": [
        "obs_stadium_building_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "architecture",
      "claim": "architecture",
      "value": "stadium building with visible emblem",
      "supporting_observation_ids": [
        "obs_stadium_building_001",
        "obs_stadium_sign_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky",
      "value": "blue sky with visible clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "plants",
      "claim": "plants",
      "value": "group of green trees",
      "supporting_observation_ids": [
        "obs_tree_group_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "water",
      "claim": "water body",
      "value": "river or lake visible to the right",
      "supporting_observation_ids": [
        "obs_water_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain",
      "value": "green grass terrain in foreground",
      "supporting_observation_ids": [
        "obs_terrain_grass_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "objects",
      "value": "stone or tiled pathway leading to stadium",
      "supporting_observation_ids": [
        "obs_pathway_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "objects",
      "value": "metal fence along pathway",
      "supporting_observation_ids": [
        "obs_fence_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_009",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "objects",
      "value": "multiple orange traffic cones",
      "supporting_observation_ids": [
        "obs_traffic_cone_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_010",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "objects",
      "value": "green upright pole",
      "supporting_observation_ids": [
        "obs_pole_001"
      ],
      "confidence": 0.94,
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
      "estimated_min": 3,
      "estimated_max": 3,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_traffic_cone_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.9
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_fence_001",
      "obs_pathway_001",
      "obs_terrain_grass_001",
      "obs_traffic_cone_001"
    ],
    "midground": [
      "obs_pole_001",
      "obs_stadium_building_001",
      "obs_stadium_sign_001"
    ],
    "background": [
      "obs_sky_001",
      "obs_tree_group_001",
      "obs_water_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium environment"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "clouds"
    ],
    "ground": [
      "grass terrain",
      "stone pathway"
    ],
    "terrain": [
      "grass"
    ],
    "plants": [
      "trees"
    ],
    "architecture": [
      "emblem",
      "stadium building"
    ],
    "water": [
      "river or lake"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_fence_001",
      "obs_pathway_001",
      "obs_pole_001",
      "obs_sky_001",
      "obs_stadium_building_001",
      "obs_stadium_sign_001",
      "obs_terrain_grass_001",
      "obs_traffic_cone_001",
      "obs_tree_group_001",
      "obs_water_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_stadium_sign_001",
      "label": "green leaf emblem",
      "normalized_label": "green leaf emblem",
      "object_type": "symbol",
      "colors": [
        "green",
        "white"
      ],
      "material_appearance": [
        "reflective-looking"
      ],
      "location": "stadium building",
      "count_reference": "not_counted",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_pathway_leads_to_building_001",
      "source_observation_id": "obs_pathway_001",
      "target_observation_id": "obs_stadium_building_001",
      "relationship": "leads to",
      "evidence_strength": "strong"
    },
    {
      "relationship_id": "rel_fence_along_pathway_001",
      "source_observation_id": "obs_fence_001",
      "target_observation_id": "obs_pathway_001",
      "relationship": "along",
      "evidence_strength": "strong"
    },
    {
      "relationship_id": "rel_cones_along_pathway_001",
      "source_observation_id": "obs_traffic_cone_001",
      "target_observation_id": "obs_pathway_001",
      "relationship": "along",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "gray",
      "green",
      "orange"
    ],
    "lighting": [
      "soft natural light"
    ],
    "shadows": [
      "soft shadows from objects"
    ],
    "highlights": [
      "shiny emblem highlights"
    ],
    "composition": [
      "frontal stadium view with pathway"
    ],
    "camera_angle": "eye level",
    "framing": "portrait card format",
    "cropping": [
      "full card visible"
    ],
    "depth": "moderate depth with clear background layers",
    "motion_cues": [],
    "motifs": [
      "leaf symbol"
    ],
    "repeated_shapes": [
      "rectangular tiles on pathway"
    ],
    "style_cues": [
      "detailed semi-realistic illustration"
    ],
    "supporting_observation_ids": [
      "obs_fence_001",
      "obs_pathway_001",
      "obs_sky_001",
      "obs_stadium_building_001",
      "obs_stadium_sign_001",
      "obs_terrain_grass_001",
      "obs_traffic_cone_001",
      "obs_tree_group_001",
      "obs_water_001"
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
        "fact_env_007",
        "fact_env_008",
        "fact_env_009",
        "fact_env_010"
      ],
      "object_observation_ids": [
        "obs_fence_001",
        "obs_pathway_001",
        "obs_pole_001",
        "obs_stadium_sign_001",
        "obs_traffic_cone_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004",
        "fact_env_005",
        "fact_env_006"
      ],
      "observation_ids": [
        "obs_sky_001",
        "obs_stadium_building_001",
        "obs_stadium_sign_001",
        "obs_terrain_grass_001",
        "obs_tree_group_001",
        "obs_water_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_stadium_building_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_sky_001",
        "obs_stadium_sign_001"
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
      "fact_ids": [
        "rel_cones_along_pathway_001",
        "rel_fence_along_pathway_001",
        "rel_pathway_leads_to_building_001"
      ],
      "relationship_ids": [
        "rel_cones_along_pathway_001",
        "rel_fence_along_pathway_001",
        "rel_pathway_leads_to_building_001"
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
      "fact_ids": [],
      "terms": [
        "stadium building",
        "green leaf emblem",
        "blue sky",
        "grass terrain",
        "green pole",
        "metal fence",
        "river",
        "stone pathway",
        "traffic cones",
        "trees"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "review_status": "not_applicable",
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
      "term": "green leaf emblem",
      "supporting_observation_ids": [
        "obs_stadium_sign_001"
      ]
    },
    {
      "term": "blue sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "grass terrain",
      "supporting_observation_ids": [
        "obs_terrain_grass_001"
      ]
    },
    {
      "term": "green pole",
      "supporting_observation_ids": [
        "obs_pole_001"
      ]
    },
    {
      "term": "metal fence",
      "supporting_observation_ids": [
        "obs_fence_001"
      ]
    },
    {
      "term": "river",
      "supporting_observation_ids": [
        "obs_water_001"
      ]
    },
    {
      "term": "stone pathway",
      "supporting_observation_ids": [
        "obs_pathway_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_traffic_cone_001"
      ]
    },
    {
      "term": "trees",
      "supporting_observation_ids": [
        "obs_tree_group_001"
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
        "concept": "cloud",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "reflective-looking surface",
        "source_observation_ids": [
          "obs_fence_001",
          "obs_pathway_001",
          "obs_sky_001",
          "obs_stadium_building_001",
          "obs_stadium_sign_001",
          "obs_terrain_grass_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_sky_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_terrain_grass_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_tree_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_water_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
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
- Description confidence: `0.97`
- Attribute confidence: `0.95`
- Cost USD: `0.0097144`
- Artwork observations: `7`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `9`
- Derived digest: Fact digest. Visible observations: dark bell, pattern curved lines, color dark grey black, white outline, bell shape, white orb inside bell, purple blue swirl background. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark bell | dark bell | object | midground | high | 1 |
| pattern with curved lines | pattern curved lines | object | midground | medium | 0.9 |
| dark grey to black color | color dark grey black | object | midground | high | 1 |
| white outline around bell | white outline | object | midground | medium | 1 |
| bell-shaped main object | bell shape | object | midground | high | 1 |
| small white orb inside bell | white orb inside bell | object | midground | medium | 1 |
| purple and blue swirling vortex background | purple blue swirl background | environment | background | high | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| グッズ | card_ui_text | top left | visible | 1 |
| トレーナーズ | card_ui_text | top right | visible | 1 |
| ダークベル | card_ui_text | top left below header | visible | 1 |
| おたがいのバトルポケモン（ポケモンをのぞく）を、それぞれこんらんにする。 | card_ui_text | lower mid | visible | 1 |
| Illus. Toyste Beach | illustrator_text | bottom left | visible | 1 |
| J M5 | card_ui_text | bottom left | visible | 1 |
| 105/081 SR | collector_number | bottom left | visible | 1 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom center | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_object_dark_bell_001 | objects_and_props | The main object is a dark bell | obs_object_dark_bell_001 | 1 |
| fact_object_dark_bell_pattern_001 | objects_and_props | The dark bell has curved swirl patterns | obs_object_dark_bell_001_pattern_001 | 0.9 |
| fact_object_dark_bell_color_001 | objects_and_props | The dark bell object is dark grey to black | obs_object_dark_bell_001_colors_001 | 1 |
| fact_object_dark_bell_color_002 | objects_and_props | The dark bell object has white outlines | obs_object_dark_bell_001_colors_002 | 1 |
| fact_object_dark_bell_shape_001 | objects_and_props | The main object is bell-shaped | obs_object_dark_bell_001_shape_001 | 1 |
| fact_object_dark_bell_internal_feature_001 | objects_and_props | There is a small white orb inside the bell | obs_object_dark_bell_001_internal_feature_001 | 1 |
| fact_environment_background_001 | environment | The background is a purple and blue swirling vortex | obs_background_swirl_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_text_goods_001 | Top left text reads 'グッズ' meaning 'Goods' | obs_card_text_top_left_001 | 1 |
| fact_card_ui_text_trainers_001 | Top right text reads 'トレーナーズ' meaning 'Trainers' | obs_card_text_top_right_001 | 1 |
| fact_card_ui_text_name_001 | Card name text is 'ダークベル' meaning 'Dark Bell' | obs_card_text_name_001 | 1 |
| fact_card_ui_text_description_001 | Card descriptive text is present below the main image in Japanese | obs_card_text_description_001 | 1 |
| fact_card_ui_text_illustrator_001 | Illustrator text reads 'Illus. Toyste Beach' | obs_illustrator_text_001 | 1 |
| fact_card_ui_text_set_code_001 | Set symbol text reads 'J M5' | obs_set_code_001 | 1 |
| fact_card_ui_text_card_number_001 | Card number reads '105/081 SR' | obs_card_number_001 | 1 |
| fact_card_ui_text_copyright_001 | Copyright line is visible with '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' | obs_copyright_text_001 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_text_card_number_001",
    "fact_card_ui_text_copyright_001",
    "fact_card_ui_text_description_001",
    "fact_card_ui_text_goods_001",
    "fact_card_ui_text_illustrator_001",
    "fact_card_ui_text_name_001",
    "fact_card_ui_text_set_code_001",
    "fact_card_ui_text_trainers_001"
  ],
  "name_text_observation_ids": [
    "obs_card_text_name_001",
    "obs_card_text_top_left_001",
    "obs_card_text_top_right_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_code_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_number_001"
  ],
  "copyright_line_observation_ids": [
    "obs_copyright_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_text_description_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_illustrator_text_001"
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
| human_appearance | none_visible | none | not_applicable |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| dark bell | exact | 1 | obs_object_dark_bell_001 | 1 |

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
| pattern curved lines | obs_object_dark_bell_001_pattern_001 |
| color dark grey black | obs_object_dark_bell_001_colors_001 |
| white outline | obs_object_dark_bell_001_colors_002 |
| bell shape | obs_object_dark_bell_001_shape_001 |
| white orb inside bell | obs_object_dark_bell_001_internal_feature_001 |
| purple blue swirl background | obs_background_swirl_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_background_swirl_001, obs_object_dark_bell_001, obs_object_dark_bell_001_internal_feature_001, obs_object_dark_bell_001_pattern_001 | deterministic_rule | 0.92 |
| circular motif | obs_object_dark_bell_001_internal_feature_001 | deterministic_rule | 1 |
| circular motif | obs_background_swirl_001, obs_object_dark_bell_001, obs_object_dark_bell_001_internal_feature_001, obs_object_dark_bell_001_pattern_001 | deterministic_rule | 0.92 |
| glowing highlights | obs_background_swirl_001, obs_object_dark_bell_001, obs_object_dark_bell_001_internal_feature_001, obs_object_dark_bell_001_pattern_001 | deterministic_rule | 0.92 |
| spiral motif | obs_background_swirl_001 | deterministic_rule | 1 |
| spiral motif | obs_background_swirl_001, obs_object_dark_bell_001, obs_object_dark_bell_001_internal_feature_001, obs_object_dark_bell_001_pattern_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, pattern curved lines, color dark grey black, white outline, bell shape, white orb inside bell, purple blue swirl background. Counts: dark bell: 1.
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
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_001_pattern_001",
      "kind": "object",
      "label": "pattern with curved lines",
      "normalized_label": "pattern curved lines",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_001_colors_001",
      "kind": "object",
      "label": "dark grey to black color",
      "normalized_label": "color dark grey black",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_001_colors_002",
      "kind": "object",
      "label": "white outline around bell",
      "normalized_label": "white outline",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_001_shape_001",
      "kind": "object",
      "label": "bell-shaped main object",
      "normalized_label": "bell shape",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_dark_bell_001_internal_feature_001",
      "kind": "object",
      "label": "small white orb inside bell",
      "normalized_label": "white orb inside bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_swirl_001",
      "kind": "environment",
      "label": "purple and blue swirling vortex background",
      "normalized_label": "purple blue swirl background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_text_top_left_001",
      "kind": "card_ui_text",
      "label": "グッズ",
      "normalized_label": "goods",
      "scene_layer": "card_interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_text_top_right_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "trainers",
      "scene_layer": "card_interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_text_name_001",
      "kind": "card_ui_text",
      "label": "ダークベル",
      "normalized_label": "dark bell",
      "scene_layer": "card_interface",
      "frame_position": "top left below header",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_text_description_001",
      "kind": "card_ui_text",
      "label": "おたがいのバトルポケモン（ポケモンをのぞく）を、それぞれこんらんにする。",
      "normalized_label": "text describing battle pokemon confusion effect",
      "scene_layer": "card_interface",
      "frame_position": "lower mid",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illus. Toyste Beach",
      "normalized_label": "illustrator toyste beach",
      "scene_layer": "card_interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_code_001",
      "kind": "card_ui_text",
      "label": "J M5",
      "normalized_label": "set j m5",
      "scene_layer": "card_interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "collector_number",
      "label": "105/081 SR",
      "normalized_label": "105 of 81 sr",
      "scene_layer": "card_interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_copyright_text_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright pokémon nintendo creatures game freak",
      "scene_layer": "card_interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_object_dark_bell_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "The main object is a dark bell",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_dark_bell_pattern_001",
      "module": "objects_and_props",
      "field_path": "[0].pattern",
      "claim": "The dark bell has curved swirl patterns",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_pattern_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_dark_bell_color_001",
      "module": "objects_and_props",
      "field_path": "[0].colors",
      "claim": "The dark bell object is dark grey to black",
      "value": "dark grey to black",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_colors_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_dark_bell_color_002",
      "module": "objects_and_props",
      "field_path": "[0].colors",
      "claim": "The dark bell object has white outlines",
      "value": "white",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_colors_002"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_dark_bell_shape_001",
      "module": "objects_and_props",
      "field_path": "[0].shape",
      "claim": "The main object is bell-shaped",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_shape_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_dark_bell_internal_feature_001",
      "module": "objects_and_props",
      "field_path": "[0].internal_features",
      "claim": "There is a small white orb inside the bell",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_internal_feature_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "The background is a purple and blue swirling vortex",
      "value": "purple blue swirling vortex",
      "supporting_observation_ids": [
        "obs_background_swirl_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_goods_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0]",
      "claim": "Top left text reads 'グッズ' meaning 'Goods'",
      "value": "グッズ",
      "supporting_observation_ids": [
        "obs_card_text_top_left_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_trainers_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[1]",
      "claim": "Top right text reads 'トレーナーズ' meaning 'Trainers'",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_text_top_right_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[2]",
      "claim": "Card name text is 'ダークベル' meaning 'Dark Bell'",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_card_text_name_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_description_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text[0]",
      "claim": "Card descriptive text is present below the main image in Japanese",
      "value": "おたがいのバトルポケモン（ポケモンをのぞく）を、それぞれこんらんにする。",
      "supporting_observation_ids": [
        "obs_card_text_description_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text[0]",
      "claim": "Illustrator text reads 'Illus. Toyste Beach'",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol[0]",
      "claim": "Set symbol text reads 'J M5'",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_set_code_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_card_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "Card number reads '105/081 SR'",
      "value": "105/081 SR",
      "supporting_observation_ids": [
        "obs_card_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_text_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line[0]",
      "claim": "Copyright line is visible with '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.'",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_copyright_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_object_dark_bell_001",
      "normalized_label": "dark bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ],
      "scene_layer": "midground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_object_dark_bell_001",
      "obs_object_dark_bell_001_colors_001",
      "obs_object_dark_bell_001_colors_002",
      "obs_object_dark_bell_001_internal_feature_001",
      "obs_object_dark_bell_001_pattern_001",
      "obs_object_dark_bell_001_shape_001"
    ],
    "background": [
      "obs_background_swirl_001"
    ]
  },
  "environment": {
    "setting": [
      "purple blue swirling vortex"
    ],
    "indoor_outdoor": "",
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
      "object_type": "tool-like object",
      "colors": [
        "black",
        "dark grey",
        "white"
      ],
      "material_appearance": [
        "dark rounded surface",
        "white outline"
      ],
      "location": "center",
      "count_reference": "count_object_dark_bell_001",
      "confidence": 1
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
      "soft highlight on bell"
    ],
    "shadows": [
      "outlined shadows around bell elements"
    ],
    "highlights": [
      "white orb inside bell bright highlight"
    ],
    "composition": [
      "central single object",
      "swirling vortex background"
    ],
    "camera_angle": "45 degree tilted",
    "framing": "centered object with full vortex background",
    "cropping": [
      "full bell visible"
    ],
    "depth": "moderate depth based on shadowing and background swirl",
    "motion_cues": [
      "background swirl implying rotation or vortex motion"
    ],
    "motifs": [
      "circular bell shape",
      "curved swirl patterns on bell"
    ],
    "repeated_shapes": [
      "polygonal facets on bell"
    ],
    "style_cues": [
      "glowing highlight accents",
      "sharp outline style"
    ],
    "supporting_observation_ids": [
      "obs_background_swirl_001",
      "obs_object_dark_bell_001",
      "obs_object_dark_bell_001_internal_feature_001",
      "obs_object_dark_bell_001_pattern_001"
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
        "fact_object_dark_bell_001",
        "fact_object_dark_bell_color_001",
        "fact_object_dark_bell_color_002",
        "fact_object_dark_bell_internal_feature_001",
        "fact_object_dark_bell_pattern_001",
        "fact_object_dark_bell_shape_001"
      ],
      "object_observation_ids": [
        "obs_object_dark_bell_001",
        "obs_object_dark_bell_001_colors_001",
        "obs_object_dark_bell_001_colors_002",
        "obs_object_dark_bell_001_internal_feature_001",
        "obs_object_dark_bell_001_pattern_001",
        "obs_object_dark_bell_001_shape_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_background_001"
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
        "obs_object_dark_bell_001_colors_001",
        "obs_object_dark_bell_001_colors_002"
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
        "fact_card_ui_text_card_number_001",
        "fact_card_ui_text_copyright_001",
        "fact_card_ui_text_description_001",
        "fact_card_ui_text_goods_001",
        "fact_card_ui_text_illustrator_001",
        "fact_card_ui_text_name_001",
        "fact_card_ui_text_set_code_001",
        "fact_card_ui_text_trainers_001"
      ],
      "name_text_observation_ids": [
        "obs_card_text_name_001",
        "obs_card_text_top_left_001",
        "obs_card_text_top_right_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_code_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_number_001"
      ],
      "copyright_line_observation_ids": [
        "obs_copyright_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_text_description_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_object_dark_bell_001"
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
        "pattern curved lines",
        "color dark grey black",
        "white outline",
        "bell shape",
        "white orb inside bell",
        "purple blue swirl background"
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
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "review_status": "complete",
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
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001"
      ]
    },
    {
      "term": "pattern curved lines",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_pattern_001"
      ]
    },
    {
      "term": "color dark grey black",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_colors_001"
      ]
    },
    {
      "term": "white outline",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_colors_002"
      ]
    },
    {
      "term": "bell shape",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_shape_001"
      ]
    },
    {
      "term": "white orb inside bell",
      "supporting_observation_ids": [
        "obs_object_dark_bell_001_internal_feature_001"
      ]
    },
    {
      "term": "purple blue swirl background",
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
          "obs_object_dark_bell_001",
          "obs_object_dark_bell_001_internal_feature_001",
          "obs_object_dark_bell_001_pattern_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_dark_bell_001_internal_feature_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_background_swirl_001",
          "obs_object_dark_bell_001",
          "obs_object_dark_bell_001_internal_feature_001",
          "obs_object_dark_bell_001_pattern_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_background_swirl_001",
          "obs_object_dark_bell_001",
          "obs_object_dark_bell_001_internal_feature_001",
          "obs_object_dark_bell_001_pattern_001"
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
        "confidence": 1
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_swirl_001",
          "obs_object_dark_bell_001",
          "obs_object_dark_bell_001_internal_feature_001",
          "obs_object_dark_bell_001_pattern_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

