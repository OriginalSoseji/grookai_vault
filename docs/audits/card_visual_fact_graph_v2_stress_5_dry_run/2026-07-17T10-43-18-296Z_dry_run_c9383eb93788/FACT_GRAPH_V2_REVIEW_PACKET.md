# Card Visual Fact Graph V2 Review Packet

Generated rows: 5
Validation failures: 0
Skipped images: 0
Estimated cost USD: 0.0428972

## Rows

### GV-PK-JPN-M5-118 - Mega Darkrai ex

- Branch: `pokemon`
- V2 stress role: `dense_pokemon_artwork`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.010076`
- Artwork observations: `9`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| Mega Darkrai | scene_subject | foreground | primary_subject | 0.99 |
| head with horn-like appendages | creature_anatomy | foreground | primary_subject_anatomy | 0.98 |
| eye partially visible beneath head appendage | creature_anatomy | foreground | primary_subject_facial_feature | 0.85 |
| spiked collar around neck area | creature_anatomy | foreground | primary_subject_anatomy_feature | 0.9 |
| arms emerged from body with clawed hands | creature_anatomy | foreground | primary_subject_limbs | 0.95 |
| body elongated with visible chest and torso | creature_anatomy | foreground | primary_subject_body | 0.95 |
| tail visible curling behind lower body | creature_anatomy | foreground | primary_subject_tail | 0.9 |
| golden ornate background pattern | environment | background | background | 0.99 |
| dark type energy symbols | objects_and_props | midground | energy_symbol | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガダークライ ex | card_ui_text | top | visible | 0.99 |
| HP text: 280 | card_ui_text | top right | visible | 0.99 |
| attack text in Japanese | card_ui_text | lower half | visible | 0.95 |
| set symbol and code: M5 | card_ui_symbol | bottom left | visible | 0.98 |
| collector number: 118/081 | card_ui_text | bottom left | visible | 0.98 |
| illustrator text: 5ban Graphics | card_ui_text | bottom left | visible | 0.99 |
| copyright line text (small print) at bottom | card_ui_text | bottom | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_mega_darkrai_001 | subjects | identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_head_001 | creature_anatomy | presence of head | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_eye_001 | creature_anatomy | eye visibility | obs_creature_anatomy_002 | 0.85 |
| fact_creature_anatomy_collar_001 | creature_anatomy | spiked collar around neck | obs_creature_anatomy_003 | 0.9 |
| fact_creature_anatomy_limbs_001 | creature_anatomy | arm anatomy | obs_creature_anatomy_004 | 0.95 |
| fact_creature_anatomy_body_001 | creature_anatomy | elongated body torso | obs_creature_anatomy_005 | 0.95 |
| fact_creature_anatomy_tail_001 | creature_anatomy | tail presence | obs_creature_anatomy_006 | 0.9 |
| fact_environment_background_001 | environment | background pattern | obs_environment_001 | 0.99 |
| fact_objects_and_props_001 | objects_and_props | energy symbols | obs_objects_and_props_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text | obs_card_ui_001 | 0.99 |
| fact_card_ui_hp_001 | HP value | obs_card_ui_002 | 0.99 |
| fact_card_ui_attack_text_001 | attack text present in Japanese | obs_card_ui_003 | 0.95 |
| fact_card_ui_set_symbol_001 | set symbol and code | obs_card_ui_004 | 0.98 |
| fact_card_ui_collector_number_001 | collector number | obs_card_ui_005 | 0.98 |
| fact_card_ui_illustrator_001 | illustrator text | obs_card_ui_006 | 0.99 |
| fact_card_ui_copyright_001 | copyright text | obs_card_ui_007 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_text_001",
    "fact_card_ui_collector_number_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001",
    "fact_card_ui_set_symbol_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_005"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_004"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_007"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_006"
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
| creature_anatomy | complete | low | high |  |
| clothing | none_visible | none | not_applicable |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | low | medium |  |

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
| Mega Darkrai | obs_subject_001 |
| yellow and gold color | obs_environment_001, obs_subject_001 |
| floating creature in center | obs_subject_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`, `potential_module_incomplete_or_low_evidence`
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
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "head with horn-like appendages",
      "normalized_label": "head with horn-like appendages",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_anatomy",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "eye partially visible beneath head appendage",
      "normalized_label": "eye partially visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_facial_feature",
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "spiked collar around neck area",
      "normalized_label": "spiked collar",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_anatomy_feature",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "arms emerged from body with clawed hands",
      "normalized_label": "arms with claws",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_limbs",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "body elongated with visible chest and torso",
      "normalized_label": "elongated body and torso",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_body",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "tail visible curling behind lower body",
      "normalized_label": "tail curling behind body",
      "scene_layer": "foreground",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "primary_subject_tail",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "golden ornate background pattern",
      "normalized_label": "golden ornate background",
      "scene_layer": "background",
      "frame_position": "full_card_frame",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_and_props_001",
      "kind": "objects_and_props",
      "label": "dark type energy symbols",
      "normalized_label": "dark energy symbols",
      "scene_layer": "midground",
      "frame_position": "upper left",
      "visibility": "visible",
      "salience": "energy_symbol",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガダークライ ex",
      "normalized_label": "card name text jp",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "card_ui_name",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "HP text: 280",
      "normalized_label": "hp text 280",
      "scene_layer": "card_ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "card_ui_hp",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "attack text in Japanese",
      "normalized_label": "attack text",
      "scene_layer": "card_ui",
      "frame_position": "lower half",
      "visibility": "visible",
      "salience": "card_ui_attack_text",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_symbol",
      "label": "set symbol and code: M5",
      "normalized_label": "set symbol M5",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "card_ui_set_symbol",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "collector number: 118/081",
      "normalized_label": "collector number 118/081",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "card_ui_collector_number",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "illustrator text: 5ban Graphics",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "card_ui_illustrator",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "copyright line text (small print) at bottom",
      "normalized_label": "copyright line",
      "scene_layer": "card_ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "card_ui_copyright",
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_mega_darkrai_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "identity",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_head_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "presence of head",
      "value": "head with horn-like appendages",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_eye_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.eye",
      "claim": "eye visibility",
      "value": "partially visible beneath head feature",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.85,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_collar_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.collar",
      "claim": "spiked collar around neck",
      "value": "visible yellow spiked collar",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_limbs_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.arms",
      "claim": "arm anatomy",
      "value": "arms with claws visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_body_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.torso",
      "claim": "elongated body torso",
      "value": "elongated yellow body and torso",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_tail_001",
      "module": "creature_anatomy",
      "field_path": "physical_features.tail",
      "claim": "tail presence",
      "value": "curled tail behind body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_background_001",
      "module": "environment",
      "field_path": "background",
      "claim": "background pattern",
      "value": "golden ornate pattern",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_and_props_001",
      "module": "objects_and_props",
      "field_path": "objects[0].label",
      "claim": "energy symbols",
      "value": "dark type energy symbols",
      "supporting_observation_ids": [
        "obs_objects_and_props_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text",
      "value": "メガダークライ ex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP value",
      "value": "280",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack text present in Japanese",
      "value": "visible attack text in Japanese characters",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol and code",
      "value": "M5",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number",
      "value": "118/081",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text",
      "value": "5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text",
      "value": "Copyright line visible at bottom",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "medium"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Darkrai",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms with claws",
        "curled tail",
        "elongated torso",
        "eye partly visible",
        "head",
        "horn-like appendages",
        "spiked collar"
      ],
      "physical_features": [
        "claws",
        "dark and yellow spikes collar",
        "yellow coloration"
      ],
      "pose": [
        "floating",
        "upright"
      ],
      "orientation": "frontal",
      "action_state": [],
      "facial_evidence": {
        "eyes": "partially visible",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "brown",
        "dark gray",
        "yellow"
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
      "obs_creature_anatomy_006",
      "obs_subject_001"
    ],
    "midground": [
      "obs_objects_and_props_001"
    ],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "abstract ornate pattern"
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
      "obs_environment_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_and_props_001",
      "label": "dark energy symbols",
      "normalized_label": "dark energy symbols",
      "object_type": "energy_symbol",
      "colors": [
        "black",
        "dark blue"
      ],
      "material_appearance": [
        "flat printed symbols"
      ],
      "location": "upper left corner",
      "count_reference": "",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark blue",
      "gold",
      "yellow"
    ],
    "lighting": [
      "even lighting",
      "highlighted golden sparkle texture"
    ],
    "shadows": [
      "soft shadows on figure"
    ],
    "highlights": [
      "shining golden highlights"
    ],
    "composition": [
      "central figure composition",
      "golden ornate background framing figure"
    ],
    "camera_angle": "straight-on",
    "framing": "full card framed",
    "cropping": [],
    "depth": "medium depth with layered background and foreground",
    "motion_cues": [],
    "motifs": [
      "angular horn shapes",
      "spiked collar"
    ],
    "repeated_shapes": [
      "angular geometric patterns",
      "spike shapes"
    ],
    "style_cues": [
      "gold foil texture",
      "stylized illustration"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_003",
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
        "fact_subject_mega_darkrai_001"
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
        "fact_creature_anatomy_body_001",
        "fact_creature_anatomy_collar_001",
        "fact_creature_anatomy_eye_001",
        "fact_creature_anatomy_head_001",
        "fact_creature_anatomy_limbs_001",
        "fact_creature_anatomy_tail_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "horn-like appendages",
          "visibility": "visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "horn-shaped extensions"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eye",
          "feature": "eye",
          "visibility": "partially visible",
          "colors": [
            "red"
          ],
          "details": [
            "eye partially obscured beneath head appendage"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.85
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "neck",
          "feature": "spiked collar",
          "visibility": "visible",
          "colors": [
            "brown",
            "yellow"
          ],
          "details": [
            "spiked collar around neck"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms",
          "feature": "clawed hands",
          "visibility": "visible",
          "colors": [
            "dark brown"
          ],
          "details": [
            "arms emerging from shoulders with claws"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "torso",
          "feature": "elongated body",
          "visibility": "visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "elongated torso body"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "curled tail",
          "visibility": "visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "tail curls behind body"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.9
        }
      ],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating",
            "upright"
          ],
          "orientation": "frontal",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.98
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
        "fact_objects_and_props_001"
      ],
      "object_observation_ids": [
        "obs_objects_and_props_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_background_001"
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
      "observation_ids": []
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_text_001",
        "fact_card_ui_collector_number_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001",
        "fact_card_ui_set_symbol_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_005"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_004"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_007"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_006"
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
        "floating creature in center",
        "Mega Darkrai",
        "yellow and gold color"
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
      "omission_risk": "low",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "yellow and gold color",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_subject_001"
      ]
    },
    {
      "term": "floating creature in center",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- V2 stress role: `trainer_person_artwork`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.93`
- Cost USD: `0.00801`
- Artwork observations: `10`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: human female.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| human female subject | scene_subject | foreground | primary_subject | 0.99 |
| face with visible eyes, mouth, eyebrows | face | foreground | primary_subject_face | 0.99 |
| orange spiky hair tied in ponytail | hair | foreground | primary_subject_hair | 0.98 |
| dark blue sleeveless swimsuit top | garment | foreground | primary_subject_clothing | 0.98 |
| dark blue swimsuit bottom | garment | foreground | primary_subject_clothing | 0.97 |
| black wristband on right wrist | accessory | foreground | primary_subject_accessory | 0.98 |
| right arm extended with fist clenched, left arm bent with fist near chest | pose | foreground | primary_subject_pose | 0.97 |
| indoor swimming pool area | environment | background | environment | 0.95 |
| swimming pool water with reflections and sparkles | object | background | environment | 0.94 |
| pool bench in background | object | background | environment_object | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese | card_name_text | top_left | fully_visible | 0.98 |
| supporter text in Japanese | card_ui_text | top_left_corner | fully_visible | 0.98 |
| trainers text in Japanese | card_ui_text | top_right_corner | fully_visible | 0.97 |
| instructional and legal text in Japanese | card_ui_text | bottom_center | fully_visible | 0.95 |
| card number 108/081 SR | collector_number | bottom_left | fully_visible | 0.99 |
| set symbol J M5 | set_symbol | bottom_left_near_number | fully_visible | 0.99 |
| copyright 2026 Nintendo Creatures GAME FREAK | copyright_text | bottom_left_corner | fully_visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | scene_subject is human female character | obs_subject_001 | 0.99 |
| fact_human_appearance_face_001 | human_appearance | face is visible with eyes, mouth open, eyebrows visible | obs_human_appearance_face_001 | 0.98 |
| fact_hair_001 | human_appearance | hair orange, spiky tied in ponytail | obs_hair_001 | 0.98 |
| fact_clothing_top_001 | clothing | wearing a dark blue sleeveless swimsuit top | obs_clothing_top_001 | 0.98 |
| fact_clothing_bottom_001 | clothing | wearing matching dark blue swimsuit bottom | obs_clothing_bottom_001 | 0.97 |
| fact_accessory_001 | clothing | black wristband worn on right wrist | obs_accessory_001 | 0.98 |
| fact_pose_001 | human_appearance | right arm extended in front with hand clenched into fist, left arm bent with hand near chest | obs_pose_001 | 0.97 |
| fact_environment_001 | environment | indoor swimming pool environment with water and bench visible | obs_environment_001, obs_environment_002, obs_environment_003 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_text_001 | card name text visible in Japanese characters top left | obs_card_ui_name_text_001 | 0.98 |
| fact_card_ui_top_left_text_001 | top left supporter text in Japanese | obs_card_ui_top_left_text_001 | 0.98 |
| fact_card_ui_top_right_text_001 | top right trainers text in Japanese | obs_card_ui_top_right_text_001 | 0.97 |
| fact_card_ui_bottom_text_001 | bottom center instructional and legal Japanese text | obs_card_ui_bottom_text_001 | 0.95 |
| fact_card_ui_number_symbol_001 | collector number visible 108/081 SR | obs_card_ui_number_symbol_001 | 0.99 |
| fact_card_ui_set_symbol_001 | set symbol visible J M5 | obs_card_ui_set_symbol_001 | 0.99 |
| fact_card_ui_copyright_text_001 | copyright text visible 2026 Nintendo/Creatures/GAME FREAK | obs_card_ui_copyright_text_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_bottom_text_001",
    "fact_card_ui_copyright_text_001",
    "fact_card_ui_name_text_001",
    "fact_card_ui_number_symbol_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_top_left_text_001",
    "fact_card_ui_top_right_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_number_symbol_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_number_symbol_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
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
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | partial_due_to_crop | low | medium |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

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
| human female trainer | obs_subject_001 |
| orange ponytail hair | obs_hair_001 |
| indoor swimming pool | obs_environment_001, obs_environment_002 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human female.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human female subject",
      "normalized_label": "human female",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_appearance_face_001",
      "kind": "face",
      "label": "face with visible eyes, mouth, eyebrows",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_face",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "hair",
      "label": "orange spiky hair tied in ponytail",
      "normalized_label": "orange hair ponytail spiky",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_hair",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_top_001",
      "kind": "garment",
      "label": "dark blue sleeveless swimsuit top",
      "normalized_label": "dark blue sleeveless swimsuit",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_clothing",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_bottom_001",
      "kind": "garment",
      "label": "dark blue swimsuit bottom",
      "normalized_label": "dark blue swimsuit bottom",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_clothing",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "accessory",
      "label": "black wristband on right wrist",
      "normalized_label": "black wristband right wrist",
      "scene_layer": "foreground",
      "frame_position": "right_mid",
      "visibility": "fully_visible",
      "salience": "primary_subject_accessory",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "right arm extended with fist clenched, left arm bent with fist near chest",
      "normalized_label": "arms raised right extended left bent",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_pose",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool area",
      "normalized_label": "indoor swimming pool",
      "scene_layer": "background",
      "frame_position": "background_center",
      "visibility": "fully_visible",
      "salience": "environment",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "object",
      "label": "swimming pool water with reflections and sparkles",
      "normalized_label": "pool water sparkling",
      "scene_layer": "background",
      "frame_position": "background_center",
      "visibility": "fully_visible",
      "salience": "environment",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "object",
      "label": "pool bench in background",
      "normalized_label": "pool bench",
      "scene_layer": "background",
      "frame_position": "background_right",
      "visibility": "fully_visible",
      "salience": "environment_object",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_name_text",
      "label": "card name text in Japanese",
      "normalized_label": "card_name_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_left_text_001",
      "kind": "card_ui_text",
      "label": "supporter text in Japanese",
      "normalized_label": "supporter_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "top_left_corner",
      "visibility": "fully_visible",
      "salience": "card_ui_label",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_top_right_text_001",
      "kind": "card_ui_text",
      "label": "trainers text in Japanese",
      "normalized_label": "trainers_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "top_right_corner",
      "visibility": "fully_visible",
      "salience": "card_ui_label",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "card_ui_text",
      "label": "instructional and legal text in Japanese",
      "normalized_label": "bottom_text_japanese",
      "scene_layer": "card_ui",
      "frame_position": "bottom_center",
      "visibility": "fully_visible",
      "salience": "legal_text",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_number_symbol_001",
      "kind": "collector_number",
      "label": "card number 108/081 SR",
      "normalized_label": "card_number_108_081_SR",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "set symbol J M5",
      "normalized_label": "set_symbol_j_m5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_near_number",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_text_001",
      "kind": "copyright_text",
      "label": "copyright 2026 Nintendo Creatures GAME FREAK",
      "normalized_label": "copyright_nintendo_creatures_gamefreak_2026",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left_corner",
      "visibility": "fully_visible",
      "salience": "copyright_line",
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "scene_subject is human female character",
      "value": "human female",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_human_appearance_face_001",
      "module": "human_appearance",
      "field_path": "faces[0]",
      "claim": "face is visible with eyes, mouth open, eyebrows visible",
      "value": "eyes green, mouth open smile, eyebrows visible",
      "supporting_observation_ids": [
        "obs_human_appearance_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "hair orange, spiky tied in ponytail",
      "value": "orange spiky ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_top_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "wearing a dark blue sleeveless swimsuit top",
      "value": "dark blue sleeveless swimsuit top",
      "supporting_observation_ids": [
        "obs_clothing_top_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_bottom_001",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "wearing matching dark blue swimsuit bottom",
      "value": "dark blue swimsuit bottom",
      "supporting_observation_ids": [
        "obs_clothing_bottom_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_accessory_001",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "black wristband worn on right wrist",
      "value": "black wristband right wrist",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "human_appearance",
      "field_path": "pose[0]",
      "claim": "right arm extended in front with hand clenched into fist, left arm bent with hand near chest",
      "value": "right arm extended fist clenched, left arm bent fist near chest",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "indoor swimming pool environment with water and bench visible",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0]",
      "claim": "card name text visible in Japanese characters top left",
      "value": "Visible Japanese card name text",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_top_left_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_text[0]",
      "claim": "top left supporter text in Japanese",
      "value": "Supporter text in Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_top_left_text_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_top_right_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_text[1]",
      "claim": "top right trainers text in Japanese",
      "value": "Trainers text in Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_top_right_text_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_bottom_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text[0]",
      "claim": "bottom center instructional and legal Japanese text",
      "value": "Legal and instruction text in Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_number_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0]",
      "claim": "collector number visible 108/081 SR",
      "value": "108/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_number_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol[0]",
      "claim": "set symbol visible J M5",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line[0]",
      "claim": "copyright text visible 2026 Nintendo/Creatures/GAME FREAK",
      "value": "Copyright 2026 Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human female",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face"
      ],
      "physical_features": [
        "orange spiky ponytail hair"
      ],
      "pose": [
        "left arm bent fist near chest",
        "right arm extended fist clenched"
      ],
      "orientation": "frontal",
      "action_state": [
        "ready gesture",
        "standing"
      ],
      "facial_evidence": {
        "eyes": "visible",
        "mouth": "open smiling",
        "eyebrows": "visible",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband right wrist",
        "dark blue sleeveless swimsuit top",
        "dark blue swimsuit bottom"
      ],
      "colors": [
        "black",
        "dark blue",
        "orange"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_accessory_001",
      "obs_clothing_bottom_001",
      "obs_clothing_top_001",
      "obs_hair_001",
      "obs_human_appearance_face_001",
      "obs_pose_001",
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
    "ground": [
      "pool deck"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "swimming pool building interior"
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "dark blue",
      "light blue",
      "orange",
      "white"
    ],
    "lighting": [
      "bright even lighting"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "pool water sparkles"
    ],
    "composition": [
      "centered subject",
      "close-up medium shot"
    ],
    "camera_angle": "eye-level",
    "framing": "tight framing on upper body",
    "cropping": [],
    "depth": "shallow depth",
    "motion_cues": [
      "posing gesture"
    ],
    "motifs": [
      "water sparkle effect"
    ],
    "repeated_shapes": [],
    "style_cues": [
      "anime style"
    ],
    "supporting_observation_ids": [
      "obs_environment_002",
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
        "fact_hair_001",
        "fact_human_appearance_face_001",
        "fact_pose_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "eyebrows visible",
            "eyes visible",
            "mouth open smiling"
          ],
          "supporting_observation_ids": [
            "obs_human_appearance_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "visible",
          "mouth": "open smiling",
          "eyebrows": "visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_human_appearance_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "hair",
          "details": [
            "orange",
            "spiky",
            "tied in ponytail"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "posing gesture",
          "details": [
            "left arm bent fist near chest",
            "right arm extended fist clenched"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband",
          "details": [
            "right wrist"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.98
        }
      ]
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
        "fact_clothing_bottom_001",
        "fact_clothing_top_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "dark blue sleeveless swimsuit top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "dark blue"
          ],
          "visible_details": [
            "swimsuit"
          ],
          "supporting_observation_ids": [
            "obs_clothing_top_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "hips",
          "garment": "dark blue swimsuit bottom",
          "neckline_type": "not_applicable",
          "sleeve_type": "not_applicable",
          "colors": [
            "dark blue"
          ],
          "visible_details": [
            "swimsuit bottom"
          ],
          "supporting_observation_ids": [
            "obs_clothing_bottom_001"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband",
          "details": [
            "right wrist"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.98
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
        "obs_environment_002",
        "obs_hair_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_002"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_bottom_text_001",
        "fact_card_ui_copyright_text_001",
        "fact_card_ui_name_text_001",
        "fact_card_ui_number_symbol_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_top_left_text_001",
        "fact_card_ui_top_right_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_number_symbol_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_number_symbol_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
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
      "fact_ids": [
        "fact_environment_001",
        "fact_hair_001",
        "fact_subject_001"
      ],
      "terms": [
        "human female trainer",
        "indoor swimming pool",
        "orange ponytail hair"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "human female trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "orange ponytail hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
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
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.008486`
- Artwork observations: `10`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium building, green grass or turf field with white pattern, pathway with reddish-purple and blue tiles, fence and orange-white safety cones, group of dark green trees, blue sky with light clouds, water body or river, metal framed stadium roof or trellis structure. Counts: safety cones: 6.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| stadium building | object | midground | high | 0.99 |
| green grass or turf field with white pattern | object | foreground | high | 0.98 |
| pathway with reddish-purple and blue tiles | object | foreground | medium | 0.95 |
| fence and orange-white safety cones | object | foreground | medium | 0.95 |
| group of dark green trees | object | background | medium | 0.96 |
| blue sky with light clouds | object | background | medium | 0.98 |
| water body or river | object | midground | medium | 0.96 |
| metal framed stadium roof or trellis structure | object | midground | medium | 0.97 |
| green circular stadium icon with leaf motif | object | midground | medium | 0.96 |
| set of stairs near pathway | object | foreground | medium | 0.94 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | The setting includes a stadium structure with field and metal roof | obs_architecture_elements_001, obs_stadium_structure_001 | 0.99 |
| fact_env_002 | environment | The ground has green grass or turf area with white pattern | obs_pattern_green_field_001 | 0.98 |
| fact_env_003 | environment | Pathway with reddish-purple and blue tiles present in foreground | obs_pathway_001 | 0.95 |
| fact_env_004 | environment | A group of dark green trees is visible | obs_trees_group_001 | 0.96 |
| fact_env_005 | environment | Blue sky with light clouds | obs_sky_001 | 0.98 |
| fact_env_006 | environment | Water body or river near stadium edge | obs_water_body_001 | 0.96 |
| fact_env_007 | environment | Metal framed roof or trellis structure over stadium | obs_architecture_elements_001 | 0.97 |
| fact_env_008 | environment | Safety cones and fencing along pathway on left side | obs_fence_and_cones_001 | 0.95 |
| fact_env_009 | environment | Stairs adjacent to pathway on right side | obs_stairs_001 | 0.94 |
| fact_env_010 | environment | Stadium has a circular green icon with white leaf motif | obs_stadium_symbol_001 | 0.96 |

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
| composition | not_applicable | none | not_applicable |  |
| color_and_light | not_applicable | none | not_applicable |  |
| visual_effects | not_applicable | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | card_ui_and_print_markers.name_text_observation_ids: visible card name text area is present but not readable; card_ui_and_print_markers.collector_number_observation_ids: collector number observation visible but unreadable |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| safety cones | exact | 6 | obs_fence_and_cones_001 | 0.95 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| displayed on | obs_stadium_symbol_001 | obs_stadium_structure_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| stadium structure | obs_stadium_structure_001 |
| group of trees | obs_trees_group_001 |
| safety cones | obs_fence_and_cones_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium building, green grass or turf field with white pattern, pathway with reddish-purple and blue tiles, fence and orange-white safety cones, group of dark green trees, blue sky with light clouds, water body or river, metal framed stadium roof or trellis structure. Counts: safety cones: 6.
- Quality flags: `potential_actual_material_claim_without_visual_evidence`, `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_structure_001",
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
      "observation_id": "obs_pattern_green_field_001",
      "kind": "object",
      "label": "green grass or turf field with white pattern",
      "normalized_label": "green grass turf",
      "scene_layer": "foreground",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pathway_001",
      "kind": "object",
      "label": "pathway with reddish-purple and blue tiles",
      "normalized_label": "colorful pathway",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_fence_and_cones_001",
      "kind": "object",
      "label": "fence and orange-white safety cones",
      "normalized_label": "fence and cones",
      "scene_layer": "foreground",
      "frame_position": "left_lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_group_001",
      "kind": "object",
      "label": "group of dark green trees",
      "normalized_label": "group of trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_001",
      "kind": "object",
      "label": "blue sky with light clouds",
      "normalized_label": "blue sky",
      "scene_layer": "background",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_water_body_001",
      "kind": "object",
      "label": "water body or river",
      "normalized_label": "water body",
      "scene_layer": "midground",
      "frame_position": "right_lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_architecture_elements_001",
      "kind": "object",
      "label": "metal framed stadium roof or trellis structure",
      "normalized_label": "metal framed structure",
      "scene_layer": "midground",
      "frame_position": "upper_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_symbol_001",
      "kind": "object",
      "label": "green circular stadium icon with leaf motif",
      "normalized_label": "stadium icon leaf green",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stairs_001",
      "kind": "object",
      "label": "set of stairs near pathway",
      "normalized_label": "stairs",
      "scene_layer": "foreground",
      "frame_position": "right_lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "The setting includes a stadium structure with field and metal roof",
      "value": "stadium structure",
      "supporting_observation_ids": [
        "obs_architecture_elements_001",
        "obs_stadium_structure_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "ground",
      "claim": "The ground has green grass or turf area with white pattern",
      "value": "green grass turf",
      "supporting_observation_ids": [
        "obs_pattern_green_field_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "ground",
      "claim": "Pathway with reddish-purple and blue tiles present in foreground",
      "value": "colorful tiled pathway",
      "supporting_observation_ids": [
        "obs_pathway_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "plants",
      "claim": "A group of dark green trees is visible",
      "value": "group of trees",
      "supporting_observation_ids": [
        "obs_trees_group_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "sky",
      "claim": "Blue sky with light clouds",
      "value": "blue sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "water",
      "claim": "Water body or river near stadium edge",
      "value": "water body",
      "supporting_observation_ids": [
        "obs_water_body_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_007",
      "module": "environment",
      "field_path": "architecture",
      "claim": "Metal framed roof or trellis structure over stadium",
      "value": "metal framed roof structure",
      "supporting_observation_ids": [
        "obs_architecture_elements_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_008",
      "module": "environment",
      "field_path": "repeated_elements",
      "claim": "Safety cones and fencing along pathway on left side",
      "value": "safety cones and fencing",
      "supporting_observation_ids": [
        "obs_fence_and_cones_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_009",
      "module": "environment",
      "field_path": "terrain",
      "claim": "Stairs adjacent to pathway on right side",
      "value": "stairs",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_env_010",
      "module": "environment",
      "field_path": "architecture",
      "claim": "Stadium has a circular green icon with white leaf motif",
      "value": "green leaf stadium icon",
      "supporting_observation_ids": [
        "obs_stadium_symbol_001"
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
      "count_id": "count_cones_001",
      "normalized_label": "safety cones",
      "count_type": "exact",
      "exact_count": 6,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_fence_and_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.95
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_fence_and_cones_001",
      "obs_pathway_001",
      "obs_pattern_green_field_001",
      "obs_stairs_001"
    ],
    "midground": [
      "obs_architecture_elements_001",
      "obs_stadium_structure_001",
      "obs_stadium_symbol_001",
      "obs_water_body_001"
    ],
    "background": [
      "obs_sky_001",
      "obs_trees_group_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium structure"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky with light clouds"
    ],
    "ground": [
      "colorful tiled pathway",
      "green grass turf"
    ],
    "terrain": [
      "stairs"
    ],
    "plants": [
      "group of trees"
    ],
    "architecture": [
      "green leaf stadium icon",
      "metal framed roof structure",
      "stadium building"
    ],
    "water": [
      "water body"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_architecture_elements_001",
      "obs_fence_and_cones_001",
      "obs_pathway_001",
      "obs_pattern_green_field_001",
      "obs_sky_001",
      "obs_stadium_structure_001",
      "obs_stadium_symbol_001",
      "obs_stairs_001",
      "obs_trees_group_001",
      "obs_water_body_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_fence_and_cones_001",
      "label": "safety cones and fence",
      "normalized_label": "safety cones and fence",
      "object_type": "prop",
      "colors": [
        "black",
        "orange",
        "white"
      ],
      "material_appearance": [
        "metal",
        "plastic"
      ],
      "location": "left lower foreground",
      "count_reference": "count_cones_001",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_pattern_001",
      "source_observation_id": "obs_stadium_symbol_001",
      "target_observation_id": "obs_stadium_structure_001",
      "relationship": "displayed on",
      "evidence_strength": "strong"
    }
  ],
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
      "even lighting",
      "soft shadows"
    ],
    "shadows": [
      "soft shadows under stairs and cones"
    ],
    "highlights": [
      "reflection on water surface"
    ],
    "composition": [
      "background trees framing scene",
      "foreground elements leading to stadium"
    ],
    "camera_angle": "slightly elevated frontal view",
    "framing": "full card scene framed",
    "cropping": [
      "no significant cropping"
    ],
    "depth": "clear foreground midground background separation",
    "motion_cues": [],
    "motifs": [
      "leaf icon"
    ],
    "repeated_shapes": [
      "circular cones",
      "rectangular pathway tiles"
    ],
    "style_cues": [
      "bright color palette",
      "detailed illustration style"
    ],
    "supporting_observation_ids": [
      "obs_architecture_elements_001",
      "obs_fence_and_cones_001",
      "obs_pathway_001",
      "obs_pattern_green_field_001",
      "obs_sky_001",
      "obs_stadium_structure_001",
      "obs_stadium_symbol_001",
      "obs_stairs_001",
      "obs_trees_group_001",
      "obs_water_body_001"
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
        "fact_env_008"
      ],
      "object_observation_ids": [
        "obs_fence_and_cones_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001",
        "fact_env_002",
        "fact_env_003",
        "fact_env_004",
        "fact_env_005",
        "fact_env_006",
        "fact_env_007",
        "fact_env_008",
        "fact_env_009",
        "fact_env_010"
      ],
      "observation_ids": [
        "obs_architecture_elements_001",
        "obs_fence_and_cones_001",
        "obs_pathway_001",
        "obs_pattern_green_field_001",
        "obs_sky_001",
        "obs_stadium_structure_001",
        "obs_stadium_symbol_001",
        "obs_stairs_001",
        "obs_trees_group_001",
        "obs_water_body_001"
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
        "count_cones_001"
      ]
    },
    "relationships": {
      "fact_ids": [
        "rel_pattern_001"
      ],
      "relationship_ids": [
        "rel_pattern_001"
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
        "fact_env_001",
        "fact_env_004",
        "fact_env_008"
      ],
      "terms": [
        "group of trees",
        "safety cones",
        "stadium structure"
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "visual_effects",
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
          "reason": "visible card name text area is present but not readable",
          "affected_observation_ids": [
            "obs_card_name_text_001"
          ]
        },
        {
          "field_path": "card_ui_and_print_markers.collector_number_observation_ids",
          "reason": "collector number observation visible but unreadable",
          "affected_observation_ids": [
            "obs_collector_number_001"
          ]
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "fact_grounded_search_terms",
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "stadium structure",
      "supporting_observation_ids": [
        "obs_stadium_structure_001"
      ]
    },
    {
      "term": "group of trees",
      "supporting_observation_ids": [
        "obs_trees_group_001"
      ]
    },
    {
      "term": "safety cones",
      "supporting_observation_ids": [
        "obs_fence_and_cones_001"
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
- Description confidence: `0.99`
- Attribute confidence: `0.95`
- Cost USD: `0.0087804`
- Artwork observations: `10`
- Card UI / print-marker observations: `3`
- Card UI module evidence references: `3`
- Derived digest: Fact digest. Visible observations: centered circular emblem with crescent cutout, three white radiating lines from center spread outward and downward, black and blue-gray gradient circular emblem with white highlights, dark teal to black gradient background, silhouette of quadruped animal with large ears on left side, crescent moon shape in upper left quadrant, three multi-story urban buildings in mid to right background, white glowing halo around circular emblem. Counts: circular emblem: 1.
- Surface/scan digest: yellowed aged border with rounded corners

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| centered circular emblem with crescent cutout | object | foreground | high | 0.99 |
| three white radiating lines from center spread outward and downward | visual_effect | foreground | high | 0.95 |
| black and blue-gray gradient circular emblem with white highlights | color_and_light | foreground | high | 0.98 |
| dark teal to black gradient background | color_and_light | background | high | 0.99 |
| silhouette of quadruped animal with large ears on left side | object | midground | medium | 0.9 |
| crescent moon shape in upper left quadrant | object | midground | medium | 0.95 |
| three multi-story urban buildings in mid to right background | object | midground | medium | 0.95 |
| flat cloud or fog shapes in top area | object | background | low | 0.85 |
| white glowing halo around circular emblem | visual_effect | foreground | high | 0.99 |
| yellowed aged border with rounded corners | surface_and_scan_cues | card ui | low | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| top left card name text 'ENERGY' in stylized metallic font | card_ui_text | top left | visible | 0.98 |
| top right Japanese text with crescent dark energy symbol | card_ui_text | top right | visible | 0.95 |
| bottom center copyright line text '©2009 Pokémon/Nintendo/Creatures/GAME FREAK.' | card_ui_text | bottom | visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_symbol_001 | objects_and_props | central circular emblem with crescent cutout | obs_symbol_001 | 0.99 |
| fact_lines_001 | visual_effects | three white radiating lines spread outward from center | obs_radiating_lines_001 | 0.95 |
| fact_palette_001 | color_and_light | black and blue-gray color gradient in emblem | obs_palette_001 | 0.98 |
| fact_palette_002 | color_and_light | dark teal to black gradient background | obs_palette_002 | 0.99 |
| fact_silhouette_001 | environment | silhouette of quadruped animal with large ears on left | obs_shadow_silhouette_001 | 0.9 |
| fact_moon_001 | objects_and_props | crescent moon shape in upper left quadrant | obs_crescent_moon_001 | 0.95 |
| fact_buildings_001 | environment | three multi-story buildings in right midground | obs_buildings_001 | 0.95 |
| fact_glow_001 | visual_effects | white glowing halo around central emblem | obs_white_glow_001 | 0.99 |
| fact_border_001 | surface_and_scan_cues | yellowed aged border with rounded corners | obs_border_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_cardname_text_001 | card name text 'ENERGY' top left in metallic font | obs_card_ui_name_001 | 0.98 |
| fact_cardname_text_002 | Japanese text with crescent dark energy symbol top right | obs_card_ui_name_002 | 0.95 |
| fact_copyright_text_001 | copyright text '©2009 Pokémon/Nintendo/Creatures/GAME FREAK.' bottom center | obs_card_ui_bottom_text_001 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_cardname_text_001",
    "fact_cardname_text_002",
    "fact_copyright_text_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001",
    "obs_card_ui_name_002"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_bottom_text_001"
  ],
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
| objects_and_props | complete | none | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | complete | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| circular emblem | exact | 1 | obs_symbol_001 | 0.99 |

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
| circular emblem | obs_symbol_001 |
| dark teal gradient background | obs_palette_002 |
| white radiating lines | obs_radiating_lines_001 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: centered circular emblem with crescent cutout, three white radiating lines from center spread outward and downward, black and blue-gray gradient circular emblem with white highlights, dark teal to black gradient background, silhouette of quadruped animal with large ears on left side, crescent moon shape in upper left quadrant, three multi-story urban buildings in mid to right background, white glowing halo around circular emblem. Counts: circular emblem: 1.
- Quality flags: `potential_abstract_shape_literalization`
- Policy results: 1

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_symbol_001",
      "kind": "object",
      "label": "centered circular emblem with crescent cutout",
      "normalized_label": "circular emblem",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_radiating_lines_001",
      "kind": "visual_effect",
      "label": "three white radiating lines from center spread outward and downward",
      "normalized_label": "radiating lines",
      "scene_layer": "foreground",
      "frame_position": "center to bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_and_light",
      "label": "black and blue-gray gradient circular emblem with white highlights",
      "normalized_label": "palette",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_002",
      "kind": "color_and_light",
      "label": "dark teal to black gradient background",
      "normalized_label": "palette",
      "scene_layer": "background",
      "frame_position": "full card",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_shadow_silhouette_001",
      "kind": "object",
      "label": "silhouette of quadruped animal with large ears on left side",
      "normalized_label": "silhouette of animal",
      "scene_layer": "midground",
      "frame_position": "left center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_crescent_moon_001",
      "kind": "object",
      "label": "crescent moon shape in upper left quadrant",
      "normalized_label": "crescent moon",
      "scene_layer": "midground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_buildings_001",
      "kind": "object",
      "label": "three multi-story urban buildings in mid to right background",
      "normalized_label": "buildings",
      "scene_layer": "midground",
      "frame_position": "right center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clouds_001",
      "kind": "object",
      "label": "flat cloud or fog shapes in top area",
      "normalized_label": "clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_white_glow_001",
      "kind": "visual_effect",
      "label": "white glowing halo around circular emblem",
      "normalized_label": "white glow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_border_001",
      "kind": "surface_and_scan_cues",
      "label": "yellowed aged border with rounded corners",
      "normalized_label": "aged border",
      "scene_layer": "card ui",
      "frame_position": "edge",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "top left card name text 'ENERGY' in stylized metallic font",
      "normalized_label": "card name text",
      "scene_layer": "card ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_002",
      "kind": "card_ui_text",
      "label": "top right Japanese text with crescent dark energy symbol",
      "normalized_label": "card name text",
      "scene_layer": "card ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_bottom_text_001",
      "kind": "card_ui_text",
      "label": "bottom center copyright line text '©2009 Pokémon/Nintendo/Creatures/GAME FREAK.'",
      "normalized_label": "copyright text",
      "scene_layer": "card ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_symbol_001",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "central circular emblem with crescent cutout",
      "value": "circular emblem with crescent cutout",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_lines_001",
      "module": "visual_effects",
      "field_path": "label",
      "claim": "three white radiating lines spread outward from center",
      "value": "three white radiating lines",
      "supporting_observation_ids": [
        "obs_radiating_lines_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_palette_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "black and blue-gray color gradient in emblem",
      "value": "black and blue-gray gradient",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_palette_002",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "dark teal to black gradient background",
      "value": "dark teal to black gradient",
      "supporting_observation_ids": [
        "obs_palette_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_silhouette_001",
      "module": "environment",
      "field_path": "label",
      "claim": "silhouette of quadruped animal with large ears on left",
      "value": "animal silhouette with large ears",
      "supporting_observation_ids": [
        "obs_shadow_silhouette_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_moon_001",
      "module": "objects_and_props",
      "field_path": "label",
      "claim": "crescent moon shape in upper left quadrant",
      "value": "crescent moon",
      "supporting_observation_ids": [
        "obs_crescent_moon_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_buildings_001",
      "module": "environment",
      "field_path": "label",
      "claim": "three multi-story buildings in right midground",
      "value": "three buildings",
      "supporting_observation_ids": [
        "obs_buildings_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_glow_001",
      "module": "visual_effects",
      "field_path": "label",
      "claim": "white glowing halo around central emblem",
      "value": "white glow",
      "supporting_observation_ids": [
        "obs_white_glow_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_border_001",
      "module": "surface_and_scan_cues",
      "field_path": "label",
      "claim": "yellowed aged border with rounded corners",
      "value": "yellowed border",
      "supporting_observation_ids": [
        "obs_border_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardname_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "card name text 'ENERGY' top left in metallic font",
      "value": "ENERGY",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardname_text_002",
      "module": "card_ui_and_print_markers",
      "field_path": "card_name_text",
      "claim": "Japanese text with crescent dark energy symbol top right",
      "value": "Japanese dark energy text",
      "supporting_observation_ids": [
        "obs_card_ui_name_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_copyright_text_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_text",
      "claim": "copyright text '©2009 Pokémon/Nintendo/Creatures/GAME FREAK.' bottom center",
      "value": "©2009 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "supporting_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_symbol_001",
      "normalized_label": "circular emblem",
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
      "obs_radiating_lines_001",
      "obs_symbol_001",
      "obs_white_glow_001"
    ],
    "midground": [
      "obs_buildings_001",
      "obs_shadow_silhouette_001"
    ],
    "background": [
      "obs_clouds_001",
      "obs_crescent_moon_001",
      "obs_palette_002"
    ]
  },
  "environment": {
    "setting": [
      "urban"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "crescent moon"
    ],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [
      "buildings"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "moonlight",
      "nighttime"
    ],
    "supporting_observation_ids": [
      "obs_buildings_001",
      "obs_crescent_moon_001",
      "obs_shadow_silhouette_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_symbol_001",
      "label": "centered circular emblem with crescent cutout",
      "normalized_label": "circular emblem",
      "object_type": "symbol",
      "colors": [
        "black",
        "blue-gray",
        "white"
      ],
      "material_appearance": [
        "glowing"
      ],
      "location": "center",
      "count_reference": "count_symbol_001",
      "confidence": 0.99
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue-gray",
      "dark teal",
      "white"
    ],
    "lighting": [
      "white glow around emblem"
    ],
    "shadows": [
      "animal silhouette shadow"
    ],
    "highlights": [
      "emblem highlight",
      "white glow"
    ],
    "composition": [
      "central emblem placement",
      "symmetrical radial design"
    ],
    "camera_angle": "frontal orthogonal",
    "framing": "tight on card artwork",
    "cropping": [
      "full artwork visible"
    ],
    "depth": "shallow depth, mostly 2D",
    "motion_cues": [
      "radiating energy lines"
    ],
    "motifs": [
      "circular motif",
      "crescent moon shape"
    ],
    "repeated_shapes": [
      "three radiating lines"
    ],
    "style_cues": [
      "glow effects",
      "stylized digital art"
    ],
    "supporting_observation_ids": [
      "obs_buildings_001",
      "obs_crescent_moon_001",
      "obs_radiating_lines_001",
      "obs_shadow_silhouette_001",
      "obs_symbol_001",
      "obs_white_glow_001"
    ]
  },
  "surface_and_scan_cues": [
    {
      "observation_id": "obs_border_001",
      "cue_type": "border",
      "cue": "yellowed aged border with rounded corners",
      "abstention": "",
      "confidence": 0.95
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
    "relationships_review": "none_visible",
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
        "fact_moon_001",
        "fact_symbol_001"
      ],
      "object_observation_ids": [
        "obs_crescent_moon_001",
        "obs_symbol_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_buildings_001",
        "fact_silhouette_001"
      ],
      "observation_ids": [
        "obs_buildings_001",
        "obs_crescent_moon_001",
        "obs_shadow_silhouette_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": []
    },
    "color_and_light": {
      "fact_ids": [
        "fact_palette_001",
        "fact_palette_002"
      ],
      "observation_ids": [
        "obs_palette_001",
        "obs_palette_002"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_glow_001",
        "fact_lines_001"
      ],
      "observation_ids": [
        "obs_radiating_lines_001",
        "obs_white_glow_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_cardname_text_001",
        "fact_cardname_text_002",
        "fact_copyright_text_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001",
        "obs_card_ui_name_002"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_bottom_text_001"
      ],
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
        "count_symbol_001"
      ]
    },
    "relationships": {
      "fact_ids": [],
      "relationship_ids": []
    },
    "surface_and_scan_cues": {
      "fact_ids": [],
      "observation_ids": [
        "obs_border_001"
      ]
    },
    "uncertainty_and_abstentions": {
      "fact_ids": [],
      "fields": []
    },
    "fact_grounded_search_terms": {
      "fact_ids": [
        "fact_lines_001",
        "fact_palette_002",
        "fact_symbol_001"
      ],
      "terms": [
        "circular emblem",
        "dark teal gradient background",
        "white radiating lines"
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
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "review_status": "complete",
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
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "circular emblem",
      "supporting_observation_ids": [
        "obs_symbol_001"
      ]
    },
    {
      "term": "dark teal gradient background",
      "supporting_observation_ids": [
        "obs_palette_002"
      ]
    },
    {
      "term": "white radiating lines",
      "supporting_observation_ids": [
        "obs_radiating_lines_001"
      ]
    }
  ]
}
```

</details>

### GV-PK-JPN-M5-105 - Dark Bell

- Branch: `item_tool_supporter`
- V2 stress role: `object_heavy_item`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0075448`
- Artwork observations: `6`
- Card UI / print-marker observations: `4`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Visible observations: dark bell, bell body, handle, gem-like knob inside bell, black and white geometric pattern on bell, purple swirl background. Counts: dark bells: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Observation | Kind | Layer | Salience | Confidence |
|---|---|---|---|---:|
| dark bell | object | midground | high | 0.98 |
| bell body | object | midground | high | 0.97 |
| handle | object | midground | medium | 0.95 |
| gem-like knob inside bell | object | midground | medium | 0.94 |
| black and white geometric pattern on bell | object | midground | medium | 0.9 |
| purple swirl background | object | background | high | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese - ダークベル | card_ui_text | top left | visible | 0.99 |
| card set and number text: jpn-m5 105/081 SR | card_ui_text | bottom left | visible | 0.99 |
| illustrator text: Illus. Toystep Beach | card_ui_text | bottom left | visible | 0.98 |
| Japanese description text below bell image | card_ui_text | lower center | visible | 0.96 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | main object is a bell | obs_obj_001, obs_obj_002, obs_obj_005 | 0.98 |
| fact_002 | objects_and_props | bell has a handle | obs_obj_003 | 0.95 |
| fact_003 | objects_and_props | bell interior contains gem-like spherical knob | obs_obj_004 | 0.94 |
| fact_004 | environment | background setting | obs_obj_006 | 0.96 |
| fact_009 | counts | exact count of dark bells | obs_obj_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_005 | card name text is visible in Japanese | obs_ui_001 | 0.99 |
| fact_006 | set and card number text is visible | obs_ui_002 | 0.99 |
| fact_007 | illustrator text is visible | obs_ui_003 | 0.98 |
| fact_008 | Japanese description text is visible below bell image | obs_ui_004 | 0.96 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_005",
    "fact_006",
    "fact_007",
    "fact_008"
  ],
  "name_text_observation_ids": [
    "obs_ui_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_ui_002"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_ui_004"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_ui_003"
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
| human_appearance | not_applicable | none | not_applicable |  |
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | not_applicable | none | not_applicable |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | high |  |
| color_and_light | none_visible | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| dark bells | exact | 1 | obs_obj_001 | 0.99 |

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
| dark bell | obs_obj_001 |
| geometric pattern | obs_obj_005 |
| purple swirl background | obs_obj_006 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: dark bell, bell body, handle, gem-like knob inside bell, black and white geometric pattern on bell, purple swirl background. Counts: dark bells: 1.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_obj_001",
      "kind": "object",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_002",
      "kind": "object",
      "label": "bell body",
      "normalized_label": "bell body",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_003",
      "kind": "object",
      "label": "handle",
      "normalized_label": "handle",
      "scene_layer": "midground",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_004",
      "kind": "object",
      "label": "gem-like knob inside bell",
      "normalized_label": "gem-like knob",
      "scene_layer": "midground",
      "frame_position": "center inside bell",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_005",
      "kind": "object",
      "label": "black and white geometric pattern on bell",
      "normalized_label": "geometric pattern",
      "scene_layer": "midground",
      "frame_position": "all over bell",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_obj_006",
      "kind": "object",
      "label": "purple swirl background",
      "normalized_label": "purple swirl background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese - ダークベル",
      "normalized_label": "dark bell",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_002",
      "kind": "card_ui_text",
      "label": "card set and number text: jpn-m5 105/081 SR",
      "normalized_label": "set and number text",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_003",
      "kind": "card_ui_text",
      "label": "illustrator text: Illus. Toystep Beach",
      "normalized_label": "illustrator text",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_004",
      "kind": "card_ui_text",
      "label": "Japanese description text below bell image",
      "normalized_label": "Japanese description text",
      "scene_layer": "foreground",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "[0]",
      "claim": "main object is a bell",
      "value": "dark bell with geometric patterns",
      "supporting_observation_ids": [
        "obs_obj_001",
        "obs_obj_002",
        "obs_obj_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "[1]",
      "claim": "bell has a handle",
      "value": "handle with geometric design",
      "supporting_observation_ids": [
        "obs_obj_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "[2]",
      "claim": "bell interior contains gem-like spherical knob",
      "value": "gem-like knob inside bell bottom",
      "supporting_observation_ids": [
        "obs_obj_004"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "environment",
      "field_path": "setting",
      "claim": "background setting",
      "value": "purple swirling vortex background",
      "supporting_observation_ids": [
        "obs_obj_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text is visible in Japanese",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "set and card number text is visible",
      "value": "jpn-m5 105/081 SR",
      "supporting_observation_ids": [
        "obs_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator text is visible",
      "value": "Illus. Toystep Beach",
      "supporting_observation_ids": [
        "obs_ui_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "Japanese description text is visible below bell image",
      "value": "Japanese description text",
      "supporting_observation_ids": [
        "obs_ui_004"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "counts",
      "field_path": "exact_count",
      "claim": "exact count of dark bells",
      "value": "1",
      "supporting_observation_ids": [
        "obs_obj_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "dark bells",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_obj_001"
      ],
      "scene_layer": "midground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_ui_001",
      "obs_ui_002",
      "obs_ui_003",
      "obs_ui_004"
    ],
    "midground": [
      "obs_obj_001",
      "obs_obj_002",
      "obs_obj_003",
      "obs_obj_004",
      "obs_obj_005"
    ],
    "background": [
      "obs_obj_006"
    ]
  },
  "environment": {
    "setting": [
      "purple swirling vortex"
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
      "obs_obj_006"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_obj_001",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "object_type": "tool-like object",
      "colors": [
        "black",
        "gray",
        "white"
      ],
      "material_appearance": [
        "bright highlight",
        "dark rounded body",
        "white geometric patterns"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 0.98
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "gray",
      "purple",
      "white"
    ],
    "lighting": [
      "bright highlight on bell",
      "dim glow on knob"
    ],
    "shadows": [
      "shadow under bell"
    ],
    "highlights": [
      "bright knob highlight",
      "white geometric pattern highlights"
    ],
    "composition": [
      "bell centered, diagonal orientation"
    ],
    "camera_angle": "frontal slightly tilted",
    "framing": "tight, bell fully in frame",
    "cropping": [
      "no cropping"
    ],
    "depth": "moderate depth with foreground and background contrast",
    "motion_cues": [
      "swirling vortex effect implies motion"
    ],
    "motifs": [
      "geometric shapes",
      "swirling spiral"
    ],
    "repeated_shapes": [
      "triangular facets on bell"
    ],
    "style_cues": [
      "clean lines",
      "high contrast",
      "stylized"
    ],
    "supporting_observation_ids": [
      "obs_obj_001",
      "obs_obj_005",
      "obs_obj_006"
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
        "fact_003"
      ],
      "object_observation_ids": [
        "obs_obj_001",
        "obs_obj_002",
        "obs_obj_003",
        "obs_obj_004",
        "obs_obj_005"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_004"
      ],
      "observation_ids": [
        "obs_obj_006"
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
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_005",
        "fact_006",
        "fact_007",
        "fact_008"
      ],
      "name_text_observation_ids": [
        "obs_ui_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_ui_002"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_ui_004"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_ui_003"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [
        "fact_009"
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
      "fact_ids": [
        "fact_001",
        "fact_004",
        "fact_005"
      ],
      "terms": [
        "dark bell",
        "geometric pattern",
        "purple swirl background"
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "creature_anatomy",
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "clothing",
      "review_status": "not_applicable",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_obj_001"
      ]
    },
    {
      "term": "geometric pattern",
      "supporting_observation_ids": [
        "obs_obj_005"
      ]
    },
    {
      "term": "purple swirl background",
      "supporting_observation_ids": [
        "obs_obj_006"
      ]
    }
  ]
}
```

</details>

