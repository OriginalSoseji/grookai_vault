# Card Visual Fact Graph V2 Review Packet

Generated rows: 2
Validation failures: 2
Skipped images: 0
Estimated cost USD: 0.0376664

## Rows

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- V2 stress role: `trainer_person_artwork`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0110648`
- Artwork observations: `10`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: female human trainer. Visible observations: human female, orange hair ponytail black hairband, human face with eyes eyebrows open mouth smiling, blue sleeveless swimsuit, black wristband right wrist, red white shoes, running pose, indoor swimming pool. Semantic facts: running.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human female subject | human female | scene_subject | foreground | high | 0.99 |
| orange hair tied in a ponytail with spiky tips and black hairband | orange hair ponytail black hairband | object | foreground | high | 0.99 |
| face with large teal eyes, eyebrows visible, open mouth smiling | human face with eyes eyebrows open mouth smiling | human_appearance | foreground | high | 0.99 |
| blue sleeveless swimsuit with scoop neckline | blue sleeveless swimsuit | object | foreground | high | 0.99 |
| black wristband on right wrist | black wristband right wrist | object | foreground | medium | 0.95 |
| red and white athletic shoes | red white shoes | object | foreground | medium | 0.95 |
| subject in dynamic running or lunging pose with left arm forward, right arm bent back | running pose | pose | foreground | high | 0.98 |
| indoor swimming pool area, blue water and pool lane ropes visible | indoor swimming pool | environment | background | medium | 0.98 |
| blue poolside benches visible in background | bench poolside | environment | background | medium | 0.95 |
| poolside floor visible, blue tile color | blue poolside floor | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name Japanese text "カスミの元気" at top left | card_name_text | top left | visible | 0.99 |
| trainer card type Japanese text "トレーナーズ" at top right | card_ui_text | top right | visible | 0.99 |
| supporter type Japanese text "サポート" at top left | card_ui_text | top left above name | visible | 0.99 |
| Japanese rules text block in middle lower part of card | card_ui_text | middle lower | visible | 0.93 |
| Japanese small text in bottom oval shape area | card_ui_text | bottom oval | visible | 0.9 |
| illustrator text "Illus. En Morikura" at bottom left | illustrator_text | bottom left | visible | 0.98 |
| set symbol with text "J M5" and number "108/081 SR" at bottom left | set_symbol | bottom left near illustrator | visible | 0.98 |
| copyright line "©2026 Pokémon/Nintendo/Creatures/GAME FREAK." at bottom center | copyright_text | bottom center | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject kind | obs_subject_001 | 0.99 |
| fact_subject_002 | subjects | identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair style | obs_hair_001 | 0.99 |
| fact_face_001 | human_appearance | eyes | obs_human_face_001 | 0.99 |
| fact_face_002 | human_appearance | mouth | obs_human_face_001 | 0.99 |
| fact_clothing_001 | clothing | garment | obs_clothing_001 | 0.99 |
| fact_clothing_002 | clothing | accessory | obs_clothing_002 | 0.95 |
| fact_clothing_003 | clothing | footwear | obs_clothing_003 | 0.95 |
| fact_pose_001 | creature_anatomy | pose | obs_pose_001 | 0.98 |
| fact_environment_001 | environment | setting | obs_environment_001 | 0.98 |
| fact_environment_002 | environment | object | obs_environment_002 | 0.95 |
| fact_environment_003 | environment | terrain | obs_environment_003 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_cardui_name_001 | card name text | obs_cardui_name_001 | 0.99 |
| fact_cardui_type_001 | card type text | obs_cardui_type_001 | 0.99 |
| fact_cardui_subtype_001 | subtype text | obs_cardui_subtype_001 | 0.99 |
| fact_cardui_rules_001 | rules text japanese | obs_cardui_textarea_001 | 0.93 |
| fact_cardui_bottomtext_001 | bottom line text | obs_cardui_bottomtext_001 | 0.9 |
| fact_cardui_illust_001 | illustrator text | obs_cardui_illust_001 | 0.98 |
| fact_cardui_set_001 | set symbol and number | obs_cardui_set_001 | 0.98 |
| fact_cardui_copyright_001 | copyright line | obs_cardui_copyright_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_cardui_bottomtext_001",
    "fact_cardui_copyright_001",
    "fact_cardui_illust_001",
    "fact_cardui_name_001",
    "fact_cardui_rules_001",
    "fact_cardui_set_001",
    "fact_cardui_subtype_001",
    "fact_cardui_type_001"
  ],
  "name_text_observation_ids": [
    "obs_cardui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_cardui_set_001"
  ],
  "set_symbol_observation_ids": [
    "obs_cardui_set_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_cardui_set_001"
  ],
  "copyright_line_observation_ids": [
    "obs_cardui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_cardui_bottomtext_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_cardui_illust_001"
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
| human_appearance | complete | none | high |  |
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | none | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfac_001 | action | running | obs_subject_001 | obs_pose_001 | open smiling large teal open visible face frontal arm back arm forward dynamic running pose in motion indoor swimming pool | 0.98 |

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
| running female trainer | obs_subject_001 |
| blue swimsuit | obs_clothing_001 |
| orange ponytail | obs_hair_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_environment_001, obs_hair_001, obs_human_face_001, obs_subject_001 | deterministic_rule | 0.92 |
| diagonal composition | obs_environment_001, obs_hair_001, obs_human_face_001, obs_subject_001 | deterministic_rule | 0.92 |
| forward-right orientation | obs_pose_001 | deterministic_rule | 0.98 |
| frontal orientation | obs_subject_001 | deterministic_rule | 0.99 |
| frontal orientation | obs_pose_001 | deterministic_rule | 0.98 |
| right orientation | obs_clothing_002 | deterministic_rule | 0.95 |
| running | obs_pose_001 | deterministic_rule | 0.98 |
| running | obs_subject_001 | deterministic_rule | 0.99 |
| sleeveless clothing | obs_clothing_001 | deterministic_rule | 0.99 |
| upward orientation | obs_environment_001, obs_hair_001, obs_human_face_001, obs_subject_001 | deterministic_rule | 0.92 |
| water | obs_environment_001 | deterministic_rule | 0.98 |
| water | obs_environment_001, obs_hair_001, obs_human_face_001, obs_subject_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Visible observations: human female, orange hair ponytail black hairband, human face with eyes eyebrows open mouth smiling, blue sleeveless swimsuit, black wristband right wrist, red white shoes, running pose, indoor swimming pool. Semantic facts: running.
- Quality flags: `potential_module_incomplete_or_low_evidence`
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
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "object",
      "label": "orange hair tied in a ponytail with spiky tips and black hairband",
      "normalized_label": "orange hair ponytail black hairband",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_face_001",
      "kind": "human_appearance",
      "label": "face with large teal eyes, eyebrows visible, open mouth smiling",
      "normalized_label": "human face with eyes eyebrows open mouth smiling",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "object",
      "label": "blue sleeveless swimsuit with scoop neckline",
      "normalized_label": "blue sleeveless swimsuit",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "object",
      "label": "black wristband on right wrist",
      "normalized_label": "black wristband right wrist",
      "scene_layer": "foreground",
      "frame_position": "right arm",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_003",
      "kind": "object",
      "label": "red and white athletic shoes",
      "normalized_label": "red white shoes",
      "scene_layer": "foreground",
      "frame_position": "lower center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose",
      "label": "subject in dynamic running or lunging pose with left arm forward, right arm bent back",
      "normalized_label": "running pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor swimming pool area, blue water and pool lane ropes visible",
      "normalized_label": "indoor swimming pool",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "blue poolside benches visible in background",
      "normalized_label": "bench poolside",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "poolside floor visible, blue tile color",
      "normalized_label": "blue poolside floor",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_name_001",
      "kind": "card_name_text",
      "label": "card name Japanese text \"カスミの元気\" at top left",
      "normalized_label": "card name japanese",
      "scene_layer": "interface",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_type_001",
      "kind": "card_ui_text",
      "label": "trainer card type Japanese text \"トレーナーズ\" at top right",
      "normalized_label": "trainer card type japanese",
      "scene_layer": "interface",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_subtype_001",
      "kind": "card_ui_text",
      "label": "supporter type Japanese text \"サポート\" at top left",
      "normalized_label": "supporter type japanese",
      "scene_layer": "interface",
      "frame_position": "top left above name",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_textarea_001",
      "kind": "card_ui_text",
      "label": "Japanese rules text block in middle lower part of card",
      "normalized_label": "rules text japanese",
      "scene_layer": "interface",
      "frame_position": "middle lower",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.93,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_cardui_bottomtext_001",
      "kind": "card_ui_text",
      "label": "Japanese small text in bottom oval shape area",
      "normalized_label": "bottom text japanese",
      "scene_layer": "interface",
      "frame_position": "bottom oval",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_cardui_illust_001",
      "kind": "illustrator_text",
      "label": "illustrator text \"Illus. En Morikura\" at bottom left",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_set_001",
      "kind": "set_symbol",
      "label": "set symbol with text \"J M5\" and number \"108/081 SR\" at bottom left",
      "normalized_label": "set symbol and number",
      "scene_layer": "interface",
      "frame_position": "bottom left near illustrator",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_cardui_copyright_001",
      "kind": "copyright_text",
      "label": "copyright line \"©2026 Pokémon/Nintendo/Creatures/GAME FREAK.\" at bottom center",
      "normalized_label": "copyright line",
      "scene_layer": "interface",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject[0]",
      "claim": "subject kind",
      "value": "scene subject",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_subject_002",
      "module": "subjects",
      "field_path": "scene_subject[0].identity",
      "claim": "identity",
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
      "field_path": "hair[0]",
      "claim": "hair style",
      "value": "orange ponytail with black hairband and spiky tips",
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
      "claim": "eyes",
      "value": "large teal eyes open",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_002",
      "module": "human_appearance",
      "field_path": "facial_evidence[0]",
      "claim": "mouth",
      "value": "open smiling mouth",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment",
      "value": "blue sleeveless swimsuit with scoop neckline",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "accessory",
      "value": "black wristband on right wrist",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_003",
      "module": "clothing",
      "field_path": "garments[1]",
      "claim": "footwear",
      "value": "red and white athletic shoes",
      "supporting_observation_ids": [
        "obs_clothing_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[0].pose",
      "claim": "pose",
      "value": "running or lunging with left arm forward and right arm back",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting[0]",
      "claim": "setting",
      "value": "indoor swimming pool",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "environment_furnishings[0]",
      "claim": "object",
      "value": "blue poolside benches",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_003",
      "module": "environment",
      "field_path": "terrain[0]",
      "claim": "terrain",
      "value": "blue tile floor around pool",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text",
      "value": "カスミの元気 (Japanese text)",
      "supporting_observation_ids": [
        "obs_cardui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_text_observation_ids[0]",
      "claim": "card type text",
      "value": "トレーナーズ (Japanese text)",
      "supporting_observation_ids": [
        "obs_cardui_type_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_subtype_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_text_observation_ids[1]",
      "claim": "subtype text",
      "value": "サポート (Japanese text)",
      "supporting_observation_ids": [
        "obs_cardui_subtype_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_rules_001",
      "module": "card_ui_and_print_markers",
      "field_path": "card_ui_text_observation_ids[2]",
      "claim": "rules text japanese",
      "value": "visible Japanese rules text",
      "supporting_observation_ids": [
        "obs_cardui_textarea_001"
      ],
      "confidence": 0.93,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_cardui_bottomtext_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids[0]",
      "claim": "bottom line text",
      "value": "visible Japanese bottom oval text",
      "supporting_observation_ids": [
        "obs_cardui_bottomtext_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_cardui_illust_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids[0]",
      "claim": "illustrator text",
      "value": "Illus. En Morikura",
      "supporting_observation_ids": [
        "obs_cardui_illust_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_set_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "set symbol and number",
      "value": "J M5 108/081 SR",
      "supporting_observation_ids": [
        "obs_cardui_set_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_cardui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids[0]",
      "claim": "copyright line",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_cardui_copyright_001"
      ],
      "confidence": 0.98,
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
        "midriff",
        "neck",
        "shoulders"
      ],
      "physical_features": [
        "orange hair ponytail black hairband"
      ],
      "pose": [
        "running"
      ],
      "orientation": "frontal",
      "action_state": [
        "in motion"
      ],
      "facial_evidence": {
        "eyes": "large teal open",
        "mouth": "open smiling",
        "eyebrows": "visible",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband right wrist",
        "blue sleeveless swimsuit",
        "red white shoes"
      ],
      "colors": [
        "black",
        "blue",
        "orange",
        "red",
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
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_clothing_003",
      "obs_hair_001",
      "obs_human_face_001",
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
      "blue tile floor around pool"
    ],
    "terrain": [
      "blue tile floor around pool"
    ],
    "plants": [],
    "architecture": [],
    "water": [
      "indoor pool water"
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
      "black",
      "blue",
      "orange",
      "red",
      "white"
    ],
    "lighting": [
      "bright even lighting"
    ],
    "shadows": [
      "soft shadows on skin and pool"
    ],
    "highlights": [
      "skin and watery reflections highlights"
    ],
    "composition": [
      "central subject framing",
      "dynamic diagonal movement"
    ],
    "camera_angle": "eye-level",
    "framing": "medium close-up",
    "cropping": [
      "full subject visible"
    ],
    "depth": "moderate depth between subject and background",
    "motion_cues": [
      "running pose arms and legs"
    ],
    "motifs": [
      "water sparkle motifs"
    ],
    "repeated_shapes": [
      "angular hair spikes",
      "water ripples"
    ],
    "style_cues": [
      "illustration",
      "bright vivid colors"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_hair_001",
      "obs_human_face_001",
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
        "fact_subject_001",
        "fact_subject_002"
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
        "fact_face_002",
        "fact_hair_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "eyebrows visible",
            "eyes open large teal",
            "mouth open smiling"
          ],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "large teal open",
          "mouth": "open smiling",
          "eyebrows": "visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "orange hair ponytail",
          "details": [
            "black hairband",
            "spiky tips"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.99
        }
      ],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_pose_001"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "running"
          ],
          "orientation": "frontal",
          "action_state": [
            "in motion"
          ],
          "supporting_observation_ids": [
            "obs_pose_001"
          ],
          "confidence": 0.98
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_clothing_001",
        "fact_clothing_002",
        "fact_clothing_003"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue sleeveless swimsuit",
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
          "details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
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
        "fact_environment_001",
        "fact_environment_002",
        "fact_environment_003"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
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
        "fact_cardui_bottomtext_001",
        "fact_cardui_copyright_001",
        "fact_cardui_illust_001",
        "fact_cardui_name_001",
        "fact_cardui_rules_001",
        "fact_cardui_set_001",
        "fact_cardui_subtype_001",
        "fact_cardui_type_001"
      ],
      "name_text_observation_ids": [
        "obs_cardui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_cardui_set_001"
      ],
      "set_symbol_observation_ids": [
        "obs_cardui_set_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_cardui_set_001"
      ],
      "copyright_line_observation_ids": [
        "obs_cardui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_cardui_bottomtext_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_cardui_illust_001"
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
        "running female trainer",
        "blue swimsuit",
        "orange ponytail"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfac_001",
      "category": "action",
      "label": "running",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [
          "open smiling"
        ],
        "eyes": [
          "large teal open"
        ],
        "eyebrows": [
          "visible"
        ],
        "facial_features": [
          "face frontal"
        ],
        "body_language": [
          "arm back",
          "arm forward"
        ],
        "body_position": [
          "dynamic running pose"
        ],
        "motion_state": [
          "in motion"
        ],
        "environment": [
          "indoor swimming pool"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "running female trainer",
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
      "term": "orange ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_hair_001",
          "obs_human_face_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_hair_001",
          "obs_human_face_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
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
        "concept": "running",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "running",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sleeveless clothing",
        "source_observation_ids": [
          "obs_clothing_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upward orientation",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_hair_001",
          "obs_human_face_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_hair_001",
          "obs_human_face_001",
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
- Cost USD: `0.0089104`
- Artwork observations: `11`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium structure with green emblem, stadium roof with gold framework, green emblem with leaf pattern on stadium wall, three window panels below emblem, green and gold patterned pathway, stone staircase to right side, orange traffic cones, black metal fencing. Counts: orange traffic cone: 5.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium structure with green emblem | stadium structure with green emblem | structure | midground | high | 0.99 |
| stadium roof with gold framework | stadium roof with gold framework | object_part | midground | medium | 0.95 |
| green emblem with leaf pattern on stadium wall | green emblem with leaf pattern on stadium wall | object | midground | medium | 0.95 |
| three window panels below emblem | three window panels below emblem | object | midground | medium | 0.95 |
| green and gold patterned pathway | green and gold patterned pathway | object | foreground | high | 0.98 |
| stone staircase to right side | stone staircase to right side | object | midground | medium | 0.95 |
| five orange traffic cones | orange traffic cones | object | foreground | medium | 0.97 |
| black metal fencing along pathway and stairs | black metal fencing | object | foreground | medium | 0.96 |
| group of green coniferous trees behind stadium | coniferous trees | plant | background | medium | 0.94 |
| clear sky with scattered clouds | clear sky with scattered clouds | sky | background | medium | 0.95 |
| body of water to the far right | water body | water | background | medium | 0.92 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | environment | The setting is a stadium environment with architectural structure and outdoor greenery | obs_sky_001, obs_stadium_roof_001, obs_stadium_structure_001, obs_trees_group_001 | 0.99 |
| fact_002 | environment | Stadium has a gold framework roof and large structure with emblem | obs_green_emblem_001, obs_stadium_roof_001, obs_stadium_structure_001 | 0.98 |
| fact_003 | environment | Stone staircase is present on right side | obs_stairs_001 | 0.95 |
| fact_004 | environment | There is a group of green coniferous trees behind the stadium | obs_trees_group_001 | 0.94 |
| fact_005 | environment | Clear sky with scattered clouds is visible | obs_sky_001 | 0.95 |
| fact_006 | environment | A body of water is visible to the far right | obs_water_001 | 0.92 |
| fact_007 | objects_and_props | There are five orange traffic cones visible on the pathway | obs_orange_traffic_cones_001 | 0.97 |
| fact_008 | objects_and_props | Black metal fencing lines the pathway and stairs on left and right sides | obs_black_metal_fencing_001 | 0.96 |

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
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_crop | medium | medium | name_text: name text partially visible but cannot be read fully |
| counts | complete | low | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| orange traffic cone | exact | 5 | obs_orange_traffic_cones_001 | 0.97 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| lines along edge of | obs_black_metal_fencing_001 | obs_stairs_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| stadium structure | obs_stadium_structure_001 |
| green emblem | obs_green_emblem_001 |
| traffic cones | obs_orange_traffic_cones_001 |
| stone pathway | obs_stadium_pathway_001 |
| coniferous trees | obs_trees_group_001 |
| clear sky | obs_sky_001 |
| body of water | obs_water_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_stadium_structure_001 | deterministic_rule | 0.99 |
| building | obs_orange_traffic_cones_001, obs_sky_001, obs_stadium_pathway_001, obs_stadium_roof_001, obs_stadium_structure_001, obs_trees_group_001 | deterministic_rule | 0.92 |
| centered composition | obs_orange_traffic_cones_001, obs_sky_001, obs_stadium_pathway_001, obs_stadium_roof_001, obs_stadium_structure_001, obs_trees_group_001 | deterministic_rule | 0.92 |
| cloud | obs_sky_001 | deterministic_rule | 0.95 |
| downward orientation | obs_window_panels_001 | deterministic_rule | 0.95 |
| glowing highlights | obs_orange_traffic_cones_001, obs_sky_001, obs_stadium_pathway_001, obs_stadium_roof_001, obs_stadium_structure_001, obs_trees_group_001 | deterministic_rule | 0.92 |
| right orientation | obs_stairs_001 | deterministic_rule | 0.95 |
| right orientation | obs_water_001 | deterministic_rule | 0.92 |
| sky | obs_sky_001 | deterministic_rule | 0.95 |
| sky | obs_orange_traffic_cones_001, obs_sky_001, obs_stadium_pathway_001, obs_stadium_roof_001, obs_stadium_structure_001, obs_trees_group_001 | deterministic_rule | 0.92 |
| tree | obs_trees_group_001 | deterministic_rule | 0.94 |
| tree | obs_orange_traffic_cones_001, obs_sky_001, obs_stadium_pathway_001, obs_stadium_roof_001, obs_stadium_structure_001, obs_trees_group_001 | deterministic_rule | 0.92 |
| water | obs_water_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium structure with green emblem, stadium roof with gold framework, green emblem with leaf pattern on stadium wall, three window panels below emblem, green and gold patterned pathway, stone staircase to right side, orange traffic cones, black metal fencing. Counts: orange traffic cone: 5.
- Quality flags: `partial_text_obscured`, `potential_module_fact_reference_missing`, `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_structure_001",
      "kind": "structure",
      "label": "stadium structure with green emblem",
      "normalized_label": "stadium structure with green emblem",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_roof_001",
      "kind": "object_part",
      "label": "stadium roof with gold framework",
      "normalized_label": "stadium roof with gold framework",
      "scene_layer": "midground",
      "frame_position": "top_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_green_emblem_001",
      "kind": "object",
      "label": "green emblem with leaf pattern on stadium wall",
      "normalized_label": "green emblem with leaf pattern on stadium wall",
      "scene_layer": "midground",
      "frame_position": "center_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_window_panels_001",
      "kind": "object",
      "label": "three window panels below emblem",
      "normalized_label": "three window panels below emblem",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_pathway_001",
      "kind": "object",
      "label": "green and gold patterned pathway",
      "normalized_label": "green and gold patterned pathway",
      "scene_layer": "foreground",
      "frame_position": "bottom_center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stairs_001",
      "kind": "object",
      "label": "stone staircase to right side",
      "normalized_label": "stone staircase to right side",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_orange_traffic_cones_001",
      "kind": "object",
      "label": "five orange traffic cones",
      "normalized_label": "orange traffic cones",
      "scene_layer": "foreground",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_black_metal_fencing_001",
      "kind": "object",
      "label": "black metal fencing along pathway and stairs",
      "normalized_label": "black metal fencing",
      "scene_layer": "foreground",
      "frame_position": "left_and_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_group_001",
      "kind": "plant",
      "label": "group of green coniferous trees behind stadium",
      "normalized_label": "coniferous trees",
      "scene_layer": "background",
      "frame_position": "right_center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_001",
      "kind": "sky",
      "label": "clear sky with scattered clouds",
      "normalized_label": "clear sky with scattered clouds",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_water_001",
      "kind": "water",
      "label": "body of water to the far right",
      "normalized_label": "water body",
      "scene_layer": "background",
      "frame_position": "right_bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "The setting is a stadium environment with architectural structure and outdoor greenery",
      "value": "stadium environment",
      "supporting_observation_ids": [
        "obs_sky_001",
        "obs_stadium_roof_001",
        "obs_stadium_structure_001",
        "obs_trees_group_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "environment",
      "field_path": "architecture",
      "claim": "Stadium has a gold framework roof and large structure with emblem",
      "value": "gold framework roof, large stadium structure",
      "supporting_observation_ids": [
        "obs_green_emblem_001",
        "obs_stadium_roof_001",
        "obs_stadium_structure_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "environment",
      "field_path": "terrain",
      "claim": "Stone staircase is present on right side",
      "value": "stone staircase",
      "supporting_observation_ids": [
        "obs_stairs_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "environment",
      "field_path": "plants",
      "claim": "There is a group of green coniferous trees behind the stadium",
      "value": "coniferous trees",
      "supporting_observation_ids": [
        "obs_trees_group_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "environment",
      "field_path": "sky",
      "claim": "Clear sky with scattered clouds is visible",
      "value": "clear sky with scattered clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "environment",
      "field_path": "water",
      "claim": "A body of water is visible to the far right",
      "value": "water body",
      "supporting_observation_ids": [
        "obs_water_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "objects_and_props",
      "field_path": "object_counts",
      "claim": "There are five orange traffic cones visible on the pathway",
      "value": "5",
      "supporting_observation_ids": [
        "obs_orange_traffic_cones_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "objects_and_props",
      "field_path": "object_detail",
      "claim": "Black metal fencing lines the pathway and stairs on left and right sides",
      "value": "black metal fencing",
      "supporting_observation_ids": [
        "obs_black_metal_fencing_001"
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
      "count_id": "count_traffic_cones_001",
      "normalized_label": "orange traffic cone",
      "count_type": "exact",
      "exact_count": 5,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_orange_traffic_cones_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.97
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_black_metal_fencing_001",
      "obs_orange_traffic_cones_001",
      "obs_stadium_pathway_001"
    ],
    "midground": [
      "obs_green_emblem_001",
      "obs_stadium_roof_001",
      "obs_stadium_structure_001",
      "obs_stairs_001",
      "obs_window_panels_001"
    ],
    "background": [
      "obs_sky_001",
      "obs_trees_group_001",
      "obs_water_001"
    ]
  },
  "environment": {
    "setting": [
      "stadium environment"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "clear sky with scattered clouds"
    ],
    "ground": [
      "grass patches",
      "stone pathway"
    ],
    "terrain": [
      "pathway",
      "stone staircase"
    ],
    "plants": [
      "coniferous trees"
    ],
    "architecture": [
      "gold framework roof",
      "stadium structure"
    ],
    "water": [
      "river or pond body of water"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_black_metal_fencing_001",
      "obs_green_emblem_001",
      "obs_orange_traffic_cones_001",
      "obs_sky_001",
      "obs_stadium_pathway_001",
      "obs_stadium_roof_001",
      "obs_stadium_structure_001",
      "obs_stairs_001",
      "obs_trees_group_001",
      "obs_water_001",
      "obs_window_panels_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_orange_traffic_cones_001",
      "label": "orange traffic cone",
      "normalized_label": "orange traffic cone",
      "object_type": "prop",
      "colors": [
        "orange",
        "white"
      ],
      "material_appearance": [
        "plastic-like appearance"
      ],
      "location": "along pathway and near stairs",
      "count_reference": "count_traffic_cones_001",
      "confidence": 0.97
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_black_metal_fencing_001",
      "target_observation_id": "obs_stairs_001",
      "relationship": "lines along edge of",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "gold",
      "green",
      "orange",
      "white"
    ],
    "lighting": [
      "daylight"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "some bright highlights on roof structure"
    ],
    "composition": [
      "background trees and sky",
      "foreground pathway leading to stadium"
    ],
    "camera_angle": "eye level",
    "framing": "stadium structure centered with foreground and background elements",
    "cropping": [
      "full card framed"
    ],
    "depth": "deep depth with distinct foreground, midground, and background",
    "motion_cues": [],
    "motifs": [
      "geometric pathway pattern",
      "leaf emblem"
    ],
    "repeated_shapes": [
      "rectangles",
      "triangles"
    ],
    "style_cues": [
      "detailed semi-realistic digital art"
    ],
    "supporting_observation_ids": [
      "obs_orange_traffic_cones_001",
      "obs_sky_001",
      "obs_stadium_pathway_001",
      "obs_stadium_roof_001",
      "obs_stadium_structure_001",
      "obs_trees_group_001"
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
        "fact_007",
        "fact_008"
      ],
      "object_observation_ids": [
        "obs_black_metal_fencing_001",
        "obs_orange_traffic_cones_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_001",
        "fact_002",
        "fact_003",
        "fact_004",
        "fact_005",
        "fact_006"
      ],
      "observation_ids": [
        "obs_black_metal_fencing_001",
        "obs_green_emblem_001",
        "obs_orange_traffic_cones_001",
        "obs_sky_001",
        "obs_stadium_pathway_001",
        "obs_stadium_roof_001",
        "obs_stadium_structure_001",
        "obs_stairs_001",
        "obs_trees_group_001",
        "obs_water_001",
        "obs_window_panels_001"
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
      "fact_ids": [
        "fact_007"
      ],
      "count_ids": [
        "count_traffic_cones_001"
      ]
    },
    "relationships": {
      "fact_ids": [
        "rel_001"
      ],
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
      "fact_ids": [],
      "terms": [
        "stadium structure",
        "green emblem",
        "traffic cones",
        "stone pathway",
        "coniferous trees",
        "clear sky",
        "body of water"
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
      "review_status": "partial_due_to_crop",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text",
          "reason": "name text partially visible but cannot be read fully",
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
      "evidence_quality": "high",
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "stadium structure",
      "supporting_observation_ids": [
        "obs_stadium_structure_001"
      ]
    },
    {
      "term": "green emblem",
      "supporting_observation_ids": [
        "obs_green_emblem_001"
      ]
    },
    {
      "term": "traffic cones",
      "supporting_observation_ids": [
        "obs_orange_traffic_cones_001"
      ]
    },
    {
      "term": "stone pathway",
      "supporting_observation_ids": [
        "obs_stadium_pathway_001"
      ]
    },
    {
      "term": "coniferous trees",
      "supporting_observation_ids": [
        "obs_trees_group_001"
      ]
    },
    {
      "term": "clear sky",
      "supporting_observation_ids": [
        "obs_sky_001"
      ]
    },
    {
      "term": "body of water",
      "supporting_observation_ids": [
        "obs_water_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_stadium_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_orange_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_pathway_001",
          "obs_stadium_roof_001",
          "obs_stadium_structure_001",
          "obs_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_orange_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_pathway_001",
          "obs_stadium_roof_001",
          "obs_stadium_structure_001",
          "obs_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
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
        "concept": "downward orientation",
        "source_observation_ids": [
          "obs_window_panels_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_orange_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_pathway_001",
          "obs_stadium_roof_001",
          "obs_stadium_structure_001",
          "obs_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_stairs_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_water_001"
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
        "confidence": 0.95
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_orange_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_pathway_001",
          "obs_stadium_roof_001",
          "obs_stadium_structure_001",
          "obs_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_orange_traffic_cones_001",
          "obs_sky_001",
          "obs_stadium_pathway_001",
          "obs_stadium_roof_001",
          "obs_stadium_structure_001",
          "obs_trees_group_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_water_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-118: fact_graph_search_terms_missing, semantic_tags_missing
- GV-PK-JPN-M5-105: fact_graph_search_terms_missing, semantic_tags_missing

