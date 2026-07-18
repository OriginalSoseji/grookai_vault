# Card Visual Fact Graph V2 Review Packet

Generated rows: 18
Validation failures: 7
Skipped images: 0
Estimated cost USD: 0.2393816

## Rows

### GV-PK-JPN-M5-101 - Mega Excadrill ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.96`
- Attribute confidence: `0.93`
- Cost USD: `0.0107392`
- Artwork observations: `18`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: mega_excadrill. Visible observations: mega excadrill, head, arms, claws, body, spikes, tail, dark gray. Semantic facts: standing.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Excadrill | mega excadrill | scene_subject | foreground | high | 0.99 |
| head | head | body_region | foreground | high | 0.98 |
| arms | arms | body_region | foreground | high | 0.98 |
| claws | claws | body_region | foreground | high | 0.97 |
| body | body | body_region | foreground | high | 0.98 |
| spikes | spikes | body_region | foreground | high | 0.95 |
| tail | tail | body_region | foreground | high | 0.96 |
| dark gray | dark gray | color | foreground | high | 0.95 |
| red | red | color | foreground | high | 0.95 |
| yellow | yellow | color | foreground | medium | 0.9 |
| diagonal orientation with body facing top right, head pointed to left | diagonal body facing top right head left | pose_orientation | foreground | high | 0.95 |
| standing or upright pose | standing upright | action_state | foreground | high | 0.9 |
| face facing left with visible eye and mouth | face facing left visible eye mouth | face_position | foreground | high | 0.97 |
| eye white with black pupil, eye open | open eye | facial_evidence | foreground | high | 0.98 |
| mouth closed, neutral expression | mouth closed neutral | facial_evidence | foreground | medium | 0.9 |
| claws are silver with red highlights | claws silver red highlights | creature_anatomy | foreground | medium | 0.92 |
| red spikes on back and head | red spikes back head | creature_anatomy | foreground | medium | 0.94 |
| dark background with yellow-orange circular motif | dark background yellow orange circular motif | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | subject is Mega Excadrill | obs_subject_001 | 0.99 |
| fact_002 | creature_anatomy | head is visible | obs_body_region_001 | 0.98 |
| fact_003 | creature_anatomy | arms are visible | obs_body_region_002 | 0.98 |
| fact_004 | creature_anatomy | claws are visible and silver with red highlights | obs_body_region_003, obs_claw_001 | 0.92 |
| fact_005 | creature_anatomy | body is visible | obs_body_region_004 | 0.98 |
| fact_006 | creature_anatomy | spikes on back and head are red | obs_body_region_005, obs_spikes_001 | 0.94 |
| fact_007 | creature_anatomy | tail is visible | obs_body_region_006 | 0.96 |
| fact_008 | creature_anatomy | Mega Excadrill is diagonally oriented with body facing top right and head pointed left | obs_pose_001 | 0.95 |
| fact_009 | creature_anatomy | Mega Excadrill is standing or upright | obs_action_001 | 0.9 |
| fact_010 | creature_anatomy | face is positioned facing left with visible eye and mouth | obs_face_001 | 0.97 |
| fact_011 | human_appearance | eye is open with white sclera and black pupil | obs_eyes_001 | 0.98 |
| fact_012 | human_appearance | mouth is closed with | obs_mouth_001 | 0.9 |
| fact_013 | color_and_light | Mega Excadrill is primarily dark gray with red and yellow markings | obs_color_001, obs_color_002, obs_color_003 | 0.95 |
| fact_014 | environment | The background is dark with yellow-orange circular motif | obs_background_001 | 0.95 |

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
| human_appearance | complete | none | high |  |
| creature_anatomy | complete | none | high |  |
| clothing | not_applicable | none | not_applicable |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_glare | medium | medium | name_text: print area partially obscured by glare; hp_text: print area partially obscured by glare; collector_number: print area partially obscured by glare; set_symbol: print area partially obscured by glare; rarity_mark: print area partially obscured by glare; copyright_line: print area partially obscured by glare; bottom_line_text: print area partially obscured by glare; illustrator_text: print area partially obscured by glare |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_001 | state | standing | obs_subject_001 | obs_action_001 | standing upright diagonal body facing top right head left | 0.9 |

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
| red spikes | obs_spikes_001 |
| dark gray body | obs_color_001 |
| yellow markings | obs_color_003 |
| circular motif background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_background_001 | deterministic_rule | 0.95 |
| diagonal body facing top right head left | obs_action_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| diagonal composition | obs_pose_001 | deterministic_rule | 0.95 |
| diagonal orientation | obs_action_001, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| left orientation | obs_face_001 | deterministic_rule | 0.97 |
| right orientation | obs_pose_001 | deterministic_rule | 0.95 |
| standing | obs_action_001 | deterministic_rule | 0.9 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: mega_excadrill. Visible observations: mega excadrill, head, arms, claws, body, spikes, tail, dark gray. Semantic facts: standing.
- Quality flags: `partial_card_ui_due_to_glare`, `potential_module_incomplete_or_low_evidence`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Excadrill",
      "normalized_label": "mega excadrill",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_001",
      "kind": "body_region",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
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
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_003",
      "kind": "body_region",
      "label": "claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_004",
      "kind": "body_region",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_005",
      "kind": "body_region",
      "label": "spikes",
      "normalized_label": "spikes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_region_006",
      "kind": "body_region",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color",
      "label": "dark gray",
      "normalized_label": "dark gray",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color",
      "label": "red",
      "normalized_label": "red",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_003",
      "kind": "color",
      "label": "yellow",
      "normalized_label": "yellow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "pose_orientation",
      "label": "diagonal orientation with body facing top right, head pointed to left",
      "normalized_label": "diagonal body facing top right head left",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_action_001",
      "kind": "action_state",
      "label": "standing or upright pose",
      "normalized_label": "standing upright",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "face_position",
      "label": "face facing left with visible eye and mouth",
      "normalized_label": "face facing left visible eye mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "facial_evidence",
      "label": "eye white with black pupil, eye open",
      "normalized_label": "open eye",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "facial_evidence",
      "label": "mouth closed, neutral expression",
      "normalized_label": "mouth closed neutral",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_claw_001",
      "kind": "creature_anatomy",
      "label": "claws are silver with red highlights",
      "normalized_label": "claws silver red highlights",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_spikes_001",
      "kind": "creature_anatomy",
      "label": "red spikes on back and head",
      "normalized_label": "red spikes back head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "dark background with yellow-orange circular motif",
      "normalized_label": "dark background yellow orange circular motif",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "subject is Mega Excadrill",
      "value": "Mega Excadrill",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "head is visible",
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
      "field_path": "body_regions.arms",
      "claim": "arms are visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "creature_anatomy",
      "field_path": "body_regions.claws",
      "claim": "claws are visible and silver with red highlights",
      "value": "visible, silver with red highlights",
      "supporting_observation_ids": [
        "obs_body_region_003",
        "obs_claw_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "creature_anatomy",
      "field_path": "body_regions.body",
      "claim": "body is visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "creature_anatomy",
      "field_path": "body_regions.spikes",
      "claim": "spikes on back and head are red",
      "value": "red spikes",
      "supporting_observation_ids": [
        "obs_body_region_005",
        "obs_spikes_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "creature_anatomy",
      "field_path": "body_regions.tail",
      "claim": "tail is visible",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_region_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "Mega Excadrill is diagonally oriented with body facing top right and head pointed left",
      "value": "diagonal orientation body top right head left",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "creature_anatomy",
      "field_path": "action_state",
      "claim": "Mega Excadrill is standing or upright",
      "value": "standing upright",
      "supporting_observation_ids": [
        "obs_action_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "creature_anatomy",
      "field_path": "face_position",
      "claim": "face is positioned facing left with visible eye and mouth",
      "value": "face facing left",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "eye is open with white sclera and black pupil",
      "value": "eye open white sclera black pupil",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "human_appearance",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth is closed with",
      "value": "mouth closed neutral",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "color_and_light",
      "field_path": "colors",
      "claim": "Mega Excadrill is primarily dark gray with red and yellow markings",
      "value": "dark gray, red, yellow",
      "supporting_observation_ids": [
        "obs_color_001",
        "obs_color_002",
        "obs_color_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "environment",
      "field_path": "setting",
      "claim": "The background is dark with yellow-orange circular motif",
      "value": "dark background with yellow-orange circular motif",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "mega_excadrill",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "body",
        "claws",
        "head",
        "spikes",
        "tail"
      ],
      "physical_features": [
        "dark gray body",
        "red spikes",
        "yellow markings"
      ],
      "pose": [
        "diagonal body facing top right head left"
      ],
      "orientation": "diagonal",
      "action_state": [
        "standing upright"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "closed neutral",
        "eyebrows": "not visible",
        "face_position": "face facing left",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "dark gray",
        "red",
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
      "obs_action_001",
      "obs_body_region_001",
      "obs_body_region_002",
      "obs_body_region_003",
      "obs_body_region_004",
      "obs_body_region_005",
      "obs_body_region_006",
      "obs_claw_001",
      "obs_color_001",
      "obs_color_002",
      "obs_color_003",
      "obs_eyes_001",
      "obs_face_001",
      "obs_mouth_001",
      "obs_pose_001",
      "obs_spikes_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "dark background with yellow-orange circular motif"
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
      "dark gray",
      "red",
      "yellow"
    ],
    "lighting": [
      "highlight on body"
    ],
    "shadows": [
      "shadow under body parts"
    ],
    "highlights": [
      "bright highlights on claws"
    ],
    "composition": [
      "centered subject",
      "diagonal pose composition"
    ],
    "camera_angle": "slightly tilted",
    "framing": "centered framing",
    "cropping": [
      "no significant cropping"
    ],
    "depth": "good depth with background separation",
    "motion_cues": [],
    "motifs": [
      "circular yellow-orange motif in background"
    ],
    "repeated_shapes": [
      "red spikes repeated"
    ],
    "style_cues": [
      "shading style"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_color_001",
      "obs_color_002",
      "obs_color_003",
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
        "fact_012"
      ],
      "visible_body_regions": [],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "face facing left",
          "eyes": "open",
          "mouth": "closed neutral",
          "eyebrows": "not visible",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_eyes_001",
            "obs_mouth_001"
          ],
          "confidence": 0.94
        }
      ],
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
        "fact_008",
        "fact_009",
        "fact_010"
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
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "claws",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "red",
            "silver"
          ],
          "details": [
            "claws visible with silver and red highlights"
          ],
          "supporting_observation_ids": [
            "obs_body_region_003",
            "obs_claw_001"
          ],
          "confidence": 0.92
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_004"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "spikes",
          "feature": "",
          "visibility": "visible",
          "colors": [
            "red"
          ],
          "details": [
            "red spikes on back and head"
          ],
          "supporting_observation_ids": [
            "obs_body_region_005",
            "obs_spikes_001"
          ],
          "confidence": 0.94
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "",
          "visibility": "visible",
          "colors": [],
          "details": [],
          "supporting_observation_ids": [
            "obs_body_region_006"
          ],
          "confidence": 0.96
        }
      ],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "diagonal body facing top right head left"
          ],
          "orientation": "diagonal",
          "action_state": [
            "standing upright"
          ],
          "supporting_observation_ids": [
            "obs_action_001",
            "obs_pose_001"
          ],
          "confidence": 0.925
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
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_014"
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
      "fact_ids": [
        "fact_013"
      ],
      "observation_ids": [
        "obs_color_001",
        "obs_color_002",
        "obs_color_003"
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
        "red spikes",
        "dark gray body",
        "yellow markings",
        "circular motif background"
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "review_status": "complete",
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
      "review_status": "partial_due_to_glare",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "name_text",
          "reason": "print area partially obscured by glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "hp_text",
          "reason": "print area partially obscured by glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "collector_number",
          "reason": "print area partially obscured by glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "set_symbol",
          "reason": "print area partially obscured by glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "rarity_mark",
          "reason": "print area partially obscured by glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "copyright_line",
          "reason": "print area partially obscured by glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "bottom_line_text",
          "reason": "print area partially obscured by glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "illustrator_text",
          "reason": "print area partially obscured by glare",
          "affected_observation_ids": []
        }
      ]
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
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_001",
      "category": "state",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_action_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "standing upright"
        ],
        "body_position": [
          "diagonal body facing top right head left"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "red spikes",
      "supporting_observation_ids": [
        "obs_spikes_001"
      ]
    },
    {
      "term": "dark gray body",
      "supporting_observation_ids": [
        "obs_color_001"
      ]
    },
    {
      "term": "yellow markings",
      "supporting_observation_ids": [
        "obs_color_003"
      ]
    },
    {
      "term": "circular motif background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal body facing top right head left",
        "source_observation_ids": [
          "obs_action_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "diagonal orientation",
        "source_observation_ids": [
          "obs_action_001",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_face_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_action_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-112 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.96`
- Cost USD: `0.0112268`
- Artwork observations: `11`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | mega zeraora | scene_subject | foreground | primary_subject | 0.99 |
| head with ears and eyes | head | creature_anatomy | foreground | primary_subject_anatomy | 0.98 |
| blue and black body | body | creature_anatomy | foreground | primary_subject_anatomy | 0.98 |
| yellow lightning markings on body | markings | creature_anatomy | foreground | markings | 0.97 |
| front right paw raised with glowing blue energy | right front paw raised | creature_anatomy | foreground | pose | 0.97 |
| left front paw partly forward and glowing | left front paw forward | creature_anatomy | foreground | pose | 0.95 |
| eyes looking forward, focused expression | eyes forward | creature_anatomy | foreground | expression | 0.96 |
| tail visible extending to left | tail | creature_anatomy | foreground | body_part | 0.95 |
| electric blue energy and lightning effects background | electric energy background | environment | background | background | 0.98 |
| dark blue and black abstract stormy background | stormy background | environment | background | background | 0.95 |
| no visible clothing or accessories | none | clothing | foreground | clothing_absent | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: メガゼラオラ ex | card_ui_text | top_center | fully_visible | 0.99 |
| HP 270 displayed top right with lightning energy symbol | card_ui_text | top_right | fully_visible | 0.99 |
| Japanese text for attack names and descriptions below artwork | card_ui_text | middle_bottom | fully_visible | 0.97 |
| illumination credit 'Illus. GIDORA' bottom left | card_ui_text | bottom_left | fully_visible | 0.98 |
| set symbol and code 'J M5' next to illustrator text | card_ui_text | bottom_left | fully_visible | 0.99 |
| collector number '112/081 SAR' bottom left | card_ui_text | bottom_left | fully_visible | 0.97 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | The scene subject is Mega Zeraora | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | The subject has a head with ears and eyes visible | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | The subject has blue and black colored body | obs_creature_anatomy_002 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | The subject has yellow lightning bolt shaped markings on the body | obs_creature_anatomy_003 | 0.97 |
| fact_creature_anatomy_004 | creature_anatomy | Right front paw is raised and emits glowing blue energy | obs_creature_anatomy_004 | 0.97 |
| fact_creature_anatomy_005 | creature_anatomy | Left front paw is partly forward and glowing blue | obs_creature_anatomy_005 | 0.95 |
| fact_creature_anatomy_006 | creature_anatomy | Eyes are looking forward with expression | obs_creature_anatomy_006 | 0.96 |
| fact_creature_anatomy_007 | creature_anatomy | Tail is visible extending left | obs_creature_anatomy_007 | 0.95 |
| fact_environment_001 | environment | Background shows electric blue energy and lightning effects | obs_environment_001 | 0.98 |
| fact_environment_002 | environment | Background is dark blue and black abstract stormy pattern | obs_environment_002 | 0.95 |
| fact_clothing_001 | clothing | No visible clothing or accessories on subject | obs_clothing_001 | 1 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | The card name text is visible and reads 'メガゼラオラ ex' | obs_card_ui_001 | 0.99 |
| fact_card_ui_002 | HP text is visible and reads '270' with lightning symbol | obs_card_ui_002 | 0.99 |
| fact_card_ui_003 | Japanese attack names and descriptions are visible below artwork | obs_card_ui_003 | 0.97 |
| fact_card_ui_004 | Illustrator credit 'Illus. GIDORA' is visible bottom left | obs_card_ui_004 | 0.98 |
| fact_card_ui_005 | Set symbol and code 'J M5' is visible bottom left | obs_card_ui_005 | 0.99 |
| fact_card_ui_006 | Collector number '112/081 SAR' is visible bottom left | obs_card_ui_006 | 0.97 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003",
    "fact_card_ui_004",
    "fact_card_ui_005",
    "fact_card_ui_006"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_002"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_006"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_005"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_004"
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
| clothing | complete | none | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

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
| electric energy background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_creature_anatomy_006 | deterministic_rule | 0.96 |
| forward-left orientation | obs_creature_anatomy_005 | deterministic_rule | 0.95 |
| forward-right orientation | obs_creature_anatomy_004 | deterministic_rule | 0.97 |
| glowing highlights | obs_environment_001 | deterministic_rule | 0.92 |
| left front paw forward | obs_creature_anatomy_004, obs_creature_anatomy_005, obs_creature_anatomy_006, obs_subject_001 | deterministic_rule | 0.99 |
| lightning | obs_creature_anatomy_003, obs_environment_001 | deterministic_rule | 0.98 |
| right front paw raised | obs_creature_anatomy_004, obs_creature_anatomy_005, obs_creature_anatomy_006, obs_subject_001 | deterministic_rule | 0.99 |
| upright orientation | obs_creature_anatomy_004, obs_creature_anatomy_005, obs_creature_anatomy_006, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora.
- Quality flags: `potential_canonical_metadata_in_visual_output`, `potential_module_review_conflicts_with_entries`, `potential_weather_field_alignment_missing`
- Policy results: 1

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Zeraora",
      "normalized_label": "mega zeraora",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "head with ears and eyes",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "primary_subject_anatomy",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "blue and black body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_anatomy",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "yellow lightning markings on body",
      "normalized_label": "markings",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "markings",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "front right paw raised with glowing blue energy",
      "normalized_label": "right front paw raised",
      "scene_layer": "foreground",
      "frame_position": "lower_center_right",
      "visibility": "fully_visible",
      "salience": "pose",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "left front paw partly forward and glowing",
      "normalized_label": "left front paw forward",
      "scene_layer": "foreground",
      "frame_position": "lower_center_left",
      "visibility": "fully_visible",
      "salience": "pose",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "eyes looking forward, focused expression",
      "normalized_label": "eyes forward",
      "scene_layer": "foreground",
      "frame_position": "center_top",
      "visibility": "fully_visible",
      "salience": "expression",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "tail visible extending to left",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "lower_left",
      "visibility": "fully_visible",
      "salience": "body_part",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "electric blue energy and lightning effects background",
      "normalized_label": "electric energy background",
      "scene_layer": "background",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "dark blue and black abstract stormy background",
      "normalized_label": "stormy background",
      "scene_layer": "background",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "no visible clothing or accessories",
      "normalized_label": "none",
      "scene_layer": "foreground",
      "frame_position": "all",
      "visibility": "fully_visible",
      "salience": "clothing_absent",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: メガゼラオラ ex",
      "normalized_label": "card_name_text",
      "scene_layer": "ui",
      "frame_position": "top_center",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "HP 270 displayed top right with lightning energy symbol",
      "normalized_label": "hp_text",
      "scene_layer": "ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "Japanese text for attack names and descriptions below artwork",
      "normalized_label": "attack_text",
      "scene_layer": "ui",
      "frame_position": "middle_bottom",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "illumination credit 'Illus. GIDORA' bottom left",
      "normalized_label": "illustrator_text",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "set symbol and code 'J M5' next to illustrator text",
      "normalized_label": "set_symbol_text",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "collector number '112/081 SAR' bottom left",
      "normalized_label": "collector_number_text",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui",
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "The scene subject is Mega Zeraora",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_regions.head",
      "claim": "The subject has a head with ears and eyes visible",
      "value": "head with ears and eyes",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "body_regions.body",
      "claim": "The subject has blue and black colored body",
      "value": "blue and black body",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "physical_features.markings",
      "claim": "The subject has yellow lightning bolt shaped markings on the body",
      "value": "yellow lightning bolt markings",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "pose.right_front_paw",
      "claim": "Right front paw is raised and emits glowing blue energy",
      "value": "raised with glowing blue energy",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "pose.left_front_paw",
      "claim": "Left front paw is partly forward and glowing blue",
      "value": "partly forward and glowing",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "facial_evidence.eyes",
      "claim": "Eyes are looking forward with expression",
      "value": "forward looking",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "body_regions.tail",
      "claim": "Tail is visible extending left",
      "value": "tail extending left",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "Background shows electric blue energy and lightning effects",
      "value": "electric blue energy and lightning effects background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "setting",
      "claim": "Background is dark blue and black abstract stormy pattern",
      "value": "dark blue and black stormy background",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "visibility",
      "claim": "No visible clothing or accessories on subject",
      "value": "none",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "The card name text is visible and reads 'メガゼラオラ ex'",
      "value": "メガゼラオラ ex",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP text is visible and reads '270' with lightning symbol",
      "value": "270 HP with lightning symbol",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "Japanese attack names and descriptions are visible below artwork",
      "value": "attack names and descriptions in Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator credit 'Illus. GIDORA' is visible bottom left",
      "value": "Illus. GIDORA",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol and code 'J M5' is visible bottom left",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number '112/081 SAR' is visible bottom left",
      "value": "112/081 SAR",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 0.99,
      "anatomy": [
        "body",
        "ears",
        "eyes",
        "front paws",
        "head",
        "tail"
      ],
      "physical_features": [
        "blue and black body",
        "glowing blue energy on paws",
        "yellow lightning bolt markings"
      ],
      "pose": [
        "left front paw forward",
        "right front paw raised"
      ],
      "orientation": "upright",
      "action_state": [
        "gaze"
      ],
      "facial_evidence": {
        "eyes": "forward looking",
        "mouth": "partly open in expression",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": [
          "glowing blue markings on face"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
        "light blue glowing",
        "white",
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "environment": {
    "setting": [
      "electric energy background",
      "stormy background"
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
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "light blue glowing",
      "white",
      "yellow"
    ],
    "lighting": [
      "glowing blue light effects on paws and face",
      "highlighted edges in yellow"
    ],
    "shadows": [
      "shadows under body and limbs"
    ],
    "highlights": [
      "yellow lightning bolt highlights on body markings"
    ],
    "composition": [
      "diagonal pose from bottom left to top right",
      "energetic electric background"
    ],
    "camera_angle": "slightly low angle",
    "framing": "central framed",
    "cropping": [],
    "depth": "shallow depth, subject close up",
    "motion_cues": [
      "energy sparks around paws"
    ],
    "motifs": [
      "lightning bolt motifs on body and background"
    ],
    "repeated_shapes": [
      "zigzag yellow lightning shapes"
    ],
    "style_cues": [
      "energy effects",
      "high contrast anime-style illustration"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_003",
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
        "fact_creature_anatomy_005",
        "fact_creature_anatomy_006",
        "fact_creature_anatomy_007"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "ears and eyes",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "blue"
          ],
          "details": [
            "forward facing eyes",
            "pointed ears"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "blue and black body",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "blue"
          ],
          "details": [
            "fur texture visible"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "yellow lightning markings",
          "visibility": "fully_visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "zigzag shaped lightning bolt patterns"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "right front paw",
          "feature": "raised with glowing blue energy",
          "visibility": "fully_visible",
          "colors": [
            "light blue glowing"
          ],
          "details": [
            "glowing energy effect",
            "paw is raised"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "left front paw",
          "feature": "partly forward and glowing",
          "visibility": "fully_visible",
          "colors": [
            "light blue glowing"
          ],
          "details": [
            "glowing energy effect"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_005"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "feature": "eyes looking forward",
          "visibility": "fully_visible",
          "colors": [
            "blue"
          ],
          "details": [
            "gaze"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "tail",
          "feature": "tail visible extending to left",
          "visibility": "fully_visible",
          "colors": [
            "black",
            "blue"
          ],
          "details": [
            "tail shape visible"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_007"
          ],
          "confidence": 0.95
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "yellow lightning bolt markings",
          "visibility": "fully_visible",
          "colors": [
            "yellow"
          ],
          "details": [
            "zigzag markings"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_003"
          ],
          "confidence": 0.97
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "left front paw forward",
            "right front paw raised"
          ],
          "orientation": "upright",
          "action_state": [
            "gaze"
          ],
          "supporting_observation_ids": [
            "obs_creature_anatomy_004",
            "obs_creature_anatomy_005",
            "obs_creature_anatomy_006"
          ],
          "confidence": 0.97
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_clothing_001"
      ],
      "garments": [],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001",
        "fact_environment_002"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
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
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004",
        "fact_card_ui_005",
        "fact_card_ui_006"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_002"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_006"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_005"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_004"
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
        "electric energy background"
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
      "term": "electric energy background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_006"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "forward-left orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "left front paw forward",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_creature_anatomy_005",
          "obs_creature_anatomy_006",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_creature_anatomy_003",
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right front paw raised",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_creature_anatomy_005",
          "obs_creature_anatomy_006",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "upright orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_004",
          "obs_creature_anatomy_005",
          "obs_creature_anatomy_006",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-096 - Mega Zeraora ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.0113648`
- Artwork observations: `13`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: Mega Zeraora. Semantic facts: lunging forward.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Zeraora | mega zeraora | scene_subject | foreground | primary_subject | 0.99 |
| body black with yellow stripes and blue patches | black body yellow stripes blue patches | creature_anatomy | foreground | primary_subject_feature | 0.98 |
| large yellow and blue ears and head crest | large ears and head crest yellow blue | creature_anatomy | foreground | primary_subject_feature | 0.98 |
| four limbs visible with clawed paws in action pose | four limbs clawed paws action pose | creature_anatomy | foreground | primary_subject_feature | 0.98 |
| tail visible with yellow tip | tail yellow tip | creature_anatomy | foreground | primary_subject_feature | 0.95 |
| face with blue mask pattern and yellow highlights | face blue mask yellow highlights | creature_anatomy | foreground | primary_subject_feature | 0.98 |
| eyes visible as yellow with sharp expression | eyes yellow sharp expression | creature_anatomy | foreground | primary_subject_feature | 0.9 |
| mouth closed with visible snout tip | mouth closed snout tip visible | creature_anatomy | foreground | primary_subject_feature | 0.9 |
| dynamic action pose lunging forward diagonally right | action pose lunging forward diagonally right | creature_anatomy | foreground | primary_subject_feature | 0.97 |
| purple-pink abstract background with lightning motifs | purple pink abstract background lightning motifs | environment | background | background | 0.98 |
| yellow lightning bolt stylized shape behind subject | yellow lightning bolt shape behind subject | objects_and_props | background | background_object | 0.92 |
| color palette of black, yellow, blue, purple, pink | color palette black yellow blue purple pink | color_and_light | all | palette | 0.99 |
| bright highlights on yellow stripes and blue patches | bright highlights yellow stripes blue patches | color_and_light | foreground | lighting | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text メガゼラオラex | card_ui_text | top | fully_visible | 0.98 |
| HP 270 text | card_ui_text | top_right | fully_visible | 0.98 |
| electric energy symbol near HP | card_ui_symbol | top_right | fully_visible | 0.99 |
| Illustrator Eban Graphics text | illustrator_text | bottom_left | fully_visible | 0.95 |
| 096/081 SR | collector_number | bottom_left | fully_visible | 0.95 |
| J M5 set symbol | set_symbol | bottom_left | fully_visible | 0.95 |
| Thunder Fist attack text with 60x damage | card_ui_text | mid_lower | fully_visible | 0.95 |
| Zepto Turn attack text with 150 damage | card_ui_text | mid_lower | fully_visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_creature_anatomy_001 | creature_anatomy | body coloration | obs_creature_anatomy_001 | 0.98 |
| fact_creature_anatomy_002 | creature_anatomy | head features | obs_creature_anatomy_002 | 0.98 |
| fact_creature_anatomy_003 | creature_anatomy | limbs visible | obs_creature_anatomy_003 | 0.98 |
| fact_creature_anatomy_004 | creature_anatomy | tail presence | obs_creature_anatomy_004 | 0.95 |
| fact_creature_anatomy_005 | creature_anatomy | face appearance | obs_creature_anatomy_005 | 0.98 |
| fact_creature_anatomy_006 | creature_anatomy | eyes | obs_creature_anatomy_006 | 0.9 |
| fact_creature_anatomy_007 | creature_anatomy | mouth | obs_creature_anatomy_007 | 0.9 |
| fact_creature_anatomy_008 | creature_anatomy | pose | obs_pose_001 | 0.97 |
| fact_environment_001 | environment | background | obs_environment_001, obs_objects_001 | 0.98 |
| fact_color_and_light_001 | color_and_light | color palette | obs_palette_001 | 0.99 |
| fact_color_and_light_002 | color_and_light | lighting | obs_lighting_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_and_print_markers_name_001 | card name text visible | obs_card_ui_name_001 | 0.98 |
| fact_card_ui_and_print_markers_hp_001 | HP 270 visible | obs_card_ui_hp_001 | 0.98 |
| fact_card_ui_and_print_markers_type_001 | card energy type symbol visible | obs_card_ui_type_001 | 0.99 |
| fact_card_ui_and_print_markers_illustrator_001 | illustrator text visible | obs_card_ui_illustrator_001 | 0.95 |
| fact_card_ui_and_print_markers_collector_number_001 | collector number visible | obs_card_ui_set_number_001 | 0.95 |
| fact_card_ui_and_print_markers_set_symbol_001 | set symbol visible | obs_card_ui_set_symbol_001 | 0.95 |
| fact_card_ui_and_print_markers_attack_001 | first attack visible | obs_card_ui_attack_001 | 0.95 |
| fact_card_ui_and_print_markers_attack_002 | second attack visible | obs_card_ui_attack_002 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_and_print_markers_attack_001",
    "fact_card_ui_and_print_markers_attack_002",
    "fact_card_ui_and_print_markers_collector_number_001",
    "fact_card_ui_and_print_markers_hp_001",
    "fact_card_ui_and_print_markers_illustrator_001",
    "fact_card_ui_and_print_markers_name_001",
    "fact_card_ui_and_print_markers_set_symbol_001",
    "fact_card_ui_and_print_markers_type_001"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_card_ui_hp_001"
  ],
  "collector_number_observation_ids": [
    "obs_card_ui_set_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_type_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_001"
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semantic_001 | action | lunging forward | obs_subject_001 | obs_pose_001 | yellow sharp expression blue mask with yellow highlights action pose lunging forward diagonally right lunging | 0.97 |

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
| lightning motif | obs_environment_001, obs_objects_001 |
| pose | obs_pose_001 |
| yellow lightning bolt | obs_objects_001 |
| purple pink background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward-right orientation | obs_pose_001 | deterministic_rule | 0.97 |
| glowing highlights | obs_lighting_001 | deterministic_rule | 0.95 |
| lightning | obs_environment_001, obs_objects_001 | deterministic_rule | 0.98 |
| lunging forward | obs_pose_001 | deterministic_rule | 0.97 |
| lunging forward diagonally right | obs_subject_001 | deterministic_rule | 0.99 |
| mask | obs_creature_anatomy_005 | deterministic_rule | 0.98 |
| right orientation | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Zeraora. Semantic facts: lunging forward.
- Quality flags: `potential_module_fact_reference_missing`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Zeraora",
      "normalized_label": "mega zeraora",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "body black with yellow stripes and blue patches",
      "normalized_label": "black body yellow stripes blue patches",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "large yellow and blue ears and head crest",
      "normalized_label": "large ears and head crest yellow blue",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "four limbs visible with clawed paws in action pose",
      "normalized_label": "four limbs clawed paws action pose",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "tail visible with yellow tip",
      "normalized_label": "tail yellow tip",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "face with blue mask pattern and yellow highlights",
      "normalized_label": "face blue mask yellow highlights",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "eyes visible as yellow with sharp expression",
      "normalized_label": "eyes yellow sharp expression",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "mouth closed with visible snout tip",
      "normalized_label": "mouth closed snout tip visible",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "dynamic action pose lunging forward diagonally right",
      "normalized_label": "action pose lunging forward diagonally right",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_feature",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "purple-pink abstract background with lightning motifs",
      "normalized_label": "purple pink abstract background lightning motifs",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "yellow lightning bolt stylized shape behind subject",
      "normalized_label": "yellow lightning bolt shape behind subject",
      "scene_layer": "background",
      "frame_position": "behind subject",
      "visibility": "fully_visible",
      "salience": "background_object",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color_and_light",
      "label": "color palette of black, yellow, blue, purple, pink",
      "normalized_label": "color palette black yellow blue purple pink",
      "scene_layer": "all",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "palette",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lighting_001",
      "kind": "color_and_light",
      "label": "bright highlights on yellow stripes and blue patches",
      "normalized_label": "bright highlights yellow stripes blue patches",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "lighting",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "card name text メガゼラオラex",
      "normalized_label": "card name メガゼラオラex",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "card_ui_text",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_hp_001",
      "kind": "card_ui_text",
      "label": "HP 270 text",
      "normalized_label": "HP 270",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "card_ui_text",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_symbol",
      "label": "electric energy symbol near HP",
      "normalized_label": "electric energy symbol",
      "scene_layer": "card_ui",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "card_ui_symbol",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "illustrator_text",
      "label": "Illustrator Eban Graphics text",
      "normalized_label": "illustrator eban graphics",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui_text",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_number_001",
      "kind": "collector_number",
      "label": "096/081 SR",
      "normalized_label": "096/081 SR",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui_text",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "J M5 set symbol",
      "normalized_label": "J M5",
      "scene_layer": "card_ui",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "card_ui_symbol",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_001",
      "kind": "card_ui_text",
      "label": "Thunder Fist attack text with 60x damage",
      "normalized_label": "Thunder Fist 60x damage",
      "scene_layer": "card_ui",
      "frame_position": "mid_lower",
      "visibility": "fully_visible",
      "salience": "card_ui_text",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_attack_002",
      "kind": "card_ui_text",
      "label": "Zepto Turn attack text with 150 damage",
      "normalized_label": "Zepto Turn 150 damage",
      "scene_layer": "card_ui",
      "frame_position": "mid_lower",
      "visibility": "fully_visible",
      "salience": "card_ui_text",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "subject identity",
      "value": "Mega Zeraora",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_001",
      "module": "creature_anatomy",
      "field_path": "body_color_pattern",
      "claim": "body coloration",
      "value": "black with yellow stripes and blue patches",
      "supporting_observation_ids": [
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_002",
      "module": "creature_anatomy",
      "field_path": "head_features",
      "claim": "head features",
      "value": "large yellow and blue ears and head crest",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_003",
      "module": "creature_anatomy",
      "field_path": "limbs",
      "claim": "limbs visible",
      "value": "four limbs with clawed paws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_004",
      "module": "creature_anatomy",
      "field_path": "tail",
      "claim": "tail presence",
      "value": "tail with yellow tip",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_005",
      "module": "creature_anatomy",
      "field_path": "face_details",
      "claim": "face appearance",
      "value": "blue mask with yellow highlights",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_006",
      "module": "creature_anatomy",
      "field_path": "eye_appearance",
      "claim": "eyes",
      "value": "yellow eyes with sharp expression",
      "supporting_observation_ids": [
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_007",
      "module": "creature_anatomy",
      "field_path": "mouth_appearance",
      "claim": "mouth",
      "value": "closed mouth visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_008",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose",
      "value": "action pose lunging forward diagonally right",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "background_color_and_objects",
      "claim": "background",
      "value": "purple-pink abstract with lightning motifs",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_objects_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_001",
      "module": "color_and_light",
      "field_path": "palette_colors",
      "claim": "color palette",
      "value": "black, yellow, blue, purple, pink",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_and_light_002",
      "module": "color_and_light",
      "field_path": "lighting",
      "claim": "lighting",
      "value": "bright highlights on yellow stripes and blue patches",
      "supporting_observation_ids": [
        "obs_lighting_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "メガゼラオラex",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text",
      "claim": "HP 270 visible",
      "value": "270",
      "supporting_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_type_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "card energy type symbol visible",
      "value": "electric",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "Eban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "096/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_set_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_attack_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_texts",
      "claim": "first attack visible",
      "value": "Thunder Fist 60x damage",
      "supporting_observation_ids": [
        "obs_card_ui_attack_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_and_print_markers_attack_002",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_texts",
      "claim": "second attack visible",
      "value": "Zepto Turn 150 damage",
      "supporting_observation_ids": [
        "obs_card_ui_attack_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Mega Zeraora",
      "identity_confidence": 0.99,
      "anatomy": [
        "body",
        "head",
        "limbs",
        "tail"
      ],
      "physical_features": [
        "blue patches",
        "clawed paws",
        "head crest",
        "large ears",
        "yellow stripes"
      ],
      "pose": [
        "lunging forward diagonally right"
      ],
      "orientation": "right",
      "action_state": [
        "action pose"
      ],
      "facial_evidence": {
        "eyes": "yellow sharp expression",
        "mouth": "closed",
        "eyebrows": "not visible",
        "face_position": "front right facing",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "blue",
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
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_creature_anatomy_003",
      "obs_creature_anatomy_004",
      "obs_creature_anatomy_005",
      "obs_creature_anatomy_006",
      "obs_creature_anatomy_007",
      "obs_pose_001",
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
      "obs_environment_001",
      "obs_objects_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "yellow lightning bolt stylized shape",
      "normalized_label": "lightning bolt shape",
      "object_type": "symbolic shape",
      "colors": [
        "yellow"
      ],
      "material_appearance": [],
      "location": "background behind subject",
      "count_reference": "none",
      "confidence": 0.92
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "pink",
      "purple",
      "yellow"
    ],
    "lighting": [
      "bright highlights on yellow and blue patches"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights on yellow stripes and blue patches"
    ],
    "composition": [
      "pose centered with background accents"
    ],
    "camera_angle": "slightly tilted",
    "framing": "tight Crop centered on subject",
    "cropping": [
      "none"
    ],
    "depth": "deep with background layers",
    "motion_cues": [
      "lunging action pose"
    ],
    "motifs": [
      "lightning motif abstract background"
    ],
    "repeated_shapes": [
      "sharp angular shapes in subject and background"
    ],
    "style_cues": [
      "linework",
      "bold color contrasts"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_lighting_001",
      "obs_objects_001",
      "obs_palette_001",
      "obs_pose_001"
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
        "fact_creature_anatomy_005",
        "fact_creature_anatomy_006",
        "fact_creature_anatomy_007",
        "fact_creature_anatomy_008"
      ],
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
        "fact_objects_001"
      ],
      "object_observation_ids": [
        "obs_objects_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_objects_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001",
        "obs_objects_001",
        "obs_pose_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_color_and_light_001",
        "fact_color_and_light_002"
      ],
      "observation_ids": [
        "obs_lighting_001",
        "obs_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_and_print_markers_attack_001",
        "fact_card_ui_and_print_markers_attack_002",
        "fact_card_ui_and_print_markers_collector_number_001",
        "fact_card_ui_and_print_markers_hp_001",
        "fact_card_ui_and_print_markers_illustrator_001",
        "fact_card_ui_and_print_markers_name_001",
        "fact_card_ui_and_print_markers_set_symbol_001",
        "fact_card_ui_and_print_markers_type_001"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_card_ui_hp_001"
      ],
      "collector_number_observation_ids": [
        "obs_card_ui_set_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_001"
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
        "lightning motif",
        "pose",
        "yellow lightning bolt",
        "purple pink background"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semantic_001",
      "category": "action",
      "label": "lunging forward",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "yellow sharp expression"
        ],
        "eyebrows": [],
        "facial_features": [
          "blue mask with yellow highlights"
        ],
        "body_language": [
          "action pose"
        ],
        "body_position": [
          "lunging forward diagonally right"
        ],
        "motion_state": [
          "lunging"
        ],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "lightning motif",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_objects_001"
      ]
    },
    {
      "term": "pose",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "yellow lightning bolt",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    },
    {
      "term": "purple pink background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward-right orientation",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_lighting_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "lightning",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_objects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "lunging forward",
        "source_observation_ids": [
          "obs_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "lunging forward diagonally right",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "mask",
        "source_observation_ids": [
          "obs_creature_anatomy_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-114 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `pending`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.009448`
- Artwork observations: `8`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai | mega darkrai | scene_subject | foreground | primary_subject | 0.99 |
| darkrai creature body | darkrai | object | foreground | primary_subject_part | 0.99 |
| dark body color | dark gray black | color | foreground | primary_subject_color | 0.99 |
| darkrai glowing eye | eye with purple glow | creature_anatomy | foreground | primary_anatomy_feature | 0.98 |
| darkrai tendril arms | tendrils limb | creature_anatomy | foreground | primary_anatomy_feature | 0.95 |
| darkrai black wispy texture | black wispy texture | creature_anatomy | foreground | primary_subject_body_feature | 0.98 |
| dark abstract background | dark abstract background | environment | background | background | 0.95 |
| color palette dark grays, blacks, purple accents | dark gray black purple | color | foreground | color_palette | 0.99 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese メガダークライex | card_ui_text | top | fully_visible | 0.99 |
| HP 280 | hp_text | top_right | fully_visible | 0.99 |
| dark type energy symbol | card_ui_symbol | top_right | fully_visible | 0.98 |
| attack text with 110+ damage | card_ui_text | mid_lower | fully_visible | 0.98 |
| illustrator Akira Egawa | illustrator_text | bottom_left | fully_visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | Pokemon identity is Mega Darkrai | obs_subject_001 | 0.99 |
| fact_anatomy_eye_001 | creature_anatomy | Eye feature glowing purple eye | obs_darkrai_eye_001 | 0.98 |
| fact_anatomy_limbs_001 | creature_anatomy | Limbs are tendrils | obs_darkrai_limb_001 | 0.95 |
| fact_anatomy_color_001 | creature_anatomy | Body color is dark gray and black | obs_darkrai_main_color_001 | 0.99 |
| fact_environment_001 | environment | Background is dark abstract | obs_background_001 | 0.95 |
| fact_color_palette_001 | color_and_light | Color palette includes dark grays, blacks, and purple accents | obs_palette_001 | 0.99 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | Card name text is メガダークライex (Mega Darkrai ex) | obs_card_name_001 | 0.99 |
| fact_card_ui_hp_001 | HP text shows 280 HP | obs_hp_001 | 0.99 |
| fact_card_ui_energy_001 | Energy symbol is dark type | obs_energy_symbol_001 | 0.98 |
| fact_card_ui_attack_001 | Attack text shows 110+ damage | obs_text_attack_001 | 0.98 |
| fact_card_ui_illustrator_001 | Illustrator is Akira Egawa | obs_illustrator_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attack_001",
    "fact_card_ui_energy_001",
    "fact_card_ui_hp_001",
    "fact_card_ui_illustrator_001",
    "fact_card_ui_name_001"
  ],
  "name_text_observation_ids": [
    "obs_card_name_001"
  ],
  "hp_text_observation_ids": [
    "obs_hp_001"
  ],
  "collector_number_observation_ids": [],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_text_attack_001"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_energy_symbol_001"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_illustrator_001"
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
| objects_and_props | none_visible | none | not_applicable |  |
| environment | likely_complete | low | medium |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_002 | state | floating | obs_subject_001 | obs_subject_001 | glowing purple glowing purple eye tendrils limb floating upright stationary dark abstract background | 0.99 |

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
| darkrai | obs_subject_001 |
| dark purple eye | obs_darkrai_eye_001 |
| floating darkrai | obs_subject_001 |
| dark shadow | obs_background_001 |
| tendrils limb | obs_darkrai_limb_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| floating | obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| glowing highlights | obs_darkrai_eye_001 | deterministic_rule | 0.98 |
| upright | obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Semantic facts: floating.
- Quality flags: `none`
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
      "visibility": "fully_visible",
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_darkrai_body_001",
      "kind": "object",
      "label": "darkrai creature body",
      "normalized_label": "darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_part",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_darkrai_main_color_001",
      "kind": "color",
      "label": "dark body color",
      "normalized_label": "dark gray black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_color",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_darkrai_eye_001",
      "kind": "creature_anatomy",
      "label": "darkrai glowing eye",
      "normalized_label": "eye with purple glow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_anatomy_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_darkrai_limb_001",
      "kind": "creature_anatomy",
      "label": "darkrai tendril arms",
      "normalized_label": "tendrils limb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_anatomy_feature",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_darkrai_body_effect_001",
      "kind": "creature_anatomy",
      "label": "darkrai black wispy texture",
      "normalized_label": "black wispy texture",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary_subject_body_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "dark abstract background",
      "normalized_label": "dark abstract background",
      "scene_layer": "background",
      "frame_position": "full_card",
      "visibility": "fully_visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_palette_001",
      "kind": "color",
      "label": "color palette dark grays, blacks, purple accents",
      "normalized_label": "dark gray black purple",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "color_palette",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese メガダークライex",
      "normalized_label": "card name mega darkrai ex",
      "scene_layer": "ui_layer",
      "frame_position": "top",
      "visibility": "fully_visible",
      "salience": "card_name",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hp_001",
      "kind": "hp_text",
      "label": "HP 280",
      "normalized_label": "HP 280",
      "scene_layer": "ui_layer",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "hp_text",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_energy_symbol_001",
      "kind": "card_ui_symbol",
      "label": "dark type energy symbol",
      "normalized_label": "dark energy symbol",
      "scene_layer": "ui_layer",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "energy_symbol",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_text_attack_001",
      "kind": "card_ui_text",
      "label": "attack text with 110+ damage",
      "normalized_label": "attack damage 110+",
      "scene_layer": "ui_layer",
      "frame_position": "mid_lower",
      "visibility": "fully_visible",
      "salience": "attack_text",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_001",
      "kind": "illustrator_text",
      "label": "illustrator Akira Egawa",
      "normalized_label": "illustrator akira egawa",
      "scene_layer": "ui_layer",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "illustrator_text",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "Pokemon identity is Mega Darkrai",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_eye_001",
      "module": "creature_anatomy",
      "field_path": "physical_features[0].feature",
      "claim": "Eye feature glowing purple eye",
      "value": "glowing purple eye",
      "supporting_observation_ids": [
        "obs_darkrai_eye_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_limbs_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation[0].pose",
      "claim": "Limbs are tendrils",
      "value": "tendrils",
      "supporting_observation_ids": [
        "obs_darkrai_limb_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_anatomy_color_001",
      "module": "creature_anatomy",
      "field_path": "body_regions[0].colors",
      "claim": "Body color is dark gray and black",
      "value": "dark gray black",
      "supporting_observation_ids": [
        "obs_darkrai_main_color_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "Background is dark abstract",
      "value": "dark abstract background",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_color_palette_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "Color palette includes dark grays, blacks, and purple accents",
      "value": "dark gray black purple",
      "supporting_observation_ids": [
        "obs_palette_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "Card name text is メガダークライex (Mega Darkrai ex)",
      "value": "メガダークライex",
      "supporting_observation_ids": [
        "obs_card_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_hp_001",
      "module": "card_ui_and_print_markers",
      "field_path": "hp_text_observation_ids",
      "claim": "HP text shows 280 HP",
      "value": "280",
      "supporting_observation_ids": [
        "obs_hp_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol_observation_ids",
      "claim": "Energy symbol is dark type",
      "value": "dark",
      "supporting_observation_ids": [
        "obs_energy_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attack_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "Attack text shows 110+ damage",
      "value": "110+",
      "supporting_observation_ids": [
        "obs_text_attack_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "Illustrator is Akira Egawa",
      "value": "Akira Egawa",
      "supporting_observation_ids": [
        "obs_illustrator_001"
      ],
      "confidence": 0.98,
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
        "body",
        "eye",
        "limbs"
      ],
      "physical_features": [
        "black wispy texture",
        "glowing purple eye",
        "tendrils limb"
      ],
      "pose": [
        "floating",
        "upright"
      ],
      "orientation": "forward",
      "action_state": [
        "stationary"
      ],
      "facial_evidence": {
        "eyes": "glowing purple",
        "mouth": "not visible",
        "eyebrows": "not visible",
        "face_position": "center",
        "other_visible_evidence": [
          "dark shadow outlines"
        ]
      },
      "clothing_or_accessories": [],
      "colors": [
        "black",
        "dark gray",
        "purple"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_darkrai_body_001",
      "obs_darkrai_body_effect_001",
      "obs_darkrai_eye_001",
      "obs_darkrai_limb_001",
      "obs_palette_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "dark abstract background"
    ],
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
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "dark gray",
      "purple"
    ],
    "lighting": [
      "dim",
      "glowing purple eye light"
    ],
    "shadows": [
      "heavy shadows around body"
    ],
    "highlights": [
      "subtle body highlights"
    ],
    "composition": [
      "central subject",
      "symmetrical tendrils"
    ],
    "camera_angle": "straight on",
    "framing": "tight framing over subject",
    "cropping": [
      "full body mostly visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [],
    "motifs": [
      "darkness",
      "shadow tendrils"
    ],
    "repeated_shapes": [],
    "style_cues": [
      "dark",
      "shadow surrealism"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_darkrai_body_001",
      "obs_darkrai_eye_001",
      "obs_darkrai_limb_001",
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
      "fact_ids": [],
      "visible_body_regions": [],
      "facial_evidence": [],
      "hair": [],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_anatomy_color_001",
        "fact_anatomy_eye_001",
        "fact_anatomy_limbs_001"
      ],
      "body_regions": [],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "eye",
          "feature": "glowing purple eye",
          "visibility": "fully_visible",
          "colors": [
            "purple"
          ],
          "details": [
            "glowing effect"
          ],
          "supporting_observation_ids": [
            "obs_darkrai_eye_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "limbs",
          "feature": "tendrils",
          "visibility": "fully_visible",
          "colors": [
            "black"
          ],
          "details": [
            "wispy tendrils shaped as limbs"
          ],
          "supporting_observation_ids": [
            "obs_darkrai_limb_001"
          ],
          "confidence": 0.95
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating",
            "upright"
          ],
          "orientation": "forward",
          "action_state": [
            "stationary"
          ],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.99
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
      "object_observation_ids": []
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
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
      "fact_ids": [
        "fact_color_palette_001"
      ],
      "observation_ids": [
        "obs_palette_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attack_001",
        "fact_card_ui_energy_001",
        "fact_card_ui_hp_001",
        "fact_card_ui_illustrator_001",
        "fact_card_ui_name_001"
      ],
      "name_text_observation_ids": [
        "obs_card_name_001"
      ],
      "hp_text_observation_ids": [
        "obs_hp_001"
      ],
      "collector_number_observation_ids": [],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_text_attack_001"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_energy_symbol_001"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_illustrator_001"
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
        "darkrai",
        "dark purple eye",
        "floating darkrai",
        "dark shadow",
        "tendrils limb"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    },
    {
      "module": "environment",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "svf_002",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "glowing purple"
        ],
        "eyebrows": [],
        "facial_features": [
          "glowing purple eye"
        ],
        "body_language": [
          "tendrils limb"
        ],
        "body_position": [
          "floating",
          "upright"
        ],
        "motion_state": [
          "stationary"
        ],
        "environment": [
          "dark abstract background"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.99,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "dark purple eye",
      "supporting_observation_ids": [
        "obs_darkrai_eye_001"
      ]
    },
    {
      "term": "floating darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "dark shadow",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "tendrils limb",
      "supporting_observation_ids": [
        "obs_darkrai_limb_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_darkrai_eye_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "upright",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-099 - Mega Darkrai ex

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.98`
- Cost USD: `0.0122996`
- Artwork observations: `20`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, body, head, eye, horns, arms, claws, tail. Semantic facts: floating, dark forest background.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Mega Darkrai Pokemon | mega darkrai | scene_subject | foreground | high | 0.99 |
| body | body | creature_anatomy | foreground | high | 0.98 |
| head | head | creature_anatomy | foreground | high | 0.98 |
| eye | eye | creature_anatomy | foreground | high | 0.97 |
| horns | horns | creature_anatomy | foreground | high | 0.95 |
| arms | arms | creature_anatomy | foreground | high | 0.96 |
| claws | claws | creature_anatomy | foreground | medium | 0.93 |
| tail | tail | creature_anatomy | foreground | high | 0.97 |
| legs | legs | creature_anatomy | foreground | medium | 0.9 |
| face side profile | face side profile | creature_anatomy | foreground | high | 0.98 |
| pink eye with slit pupil | pink eye slit pupil | creature_anatomy | foreground | high | 0.96 |
| black body | black | color_and_light | foreground | high | 0.99 |
| white mane | white | color_and_light | foreground | high | 0.98 |
| pink eye color | pink | color_and_light | foreground | high | 0.95 |
| yellow-green background glow | yellow green | color_and_light | background | high | 0.95 |
| floating horizontal pose | floating horizontal | creature_anatomy | foreground | high | 0.94 |
| dynamic body curves and spikes | curves spikes | visual_design | foreground | high | 0.9 |
| energy-like glow spikes on back | energy glow spikes back | objects_and_props | foreground | medium | 0.88 |
| dark shadowy forest background | dark forest | environment | background | medium | 0.87 |
| bright green mist or aura | green mist aura | environment | background | medium | 0.85 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese 'メガダークライ ex' | card_ui_text | top center | visible | 0.99 |
| HP 280 text | hp_text | top right | visible | 0.99 |
| darkness type energy symbol near HP | energy_symbol | top right | visible | 0.98 |
| attack names and descriptions in Japanese | card_ui_text | center | visible | 0.95 |
| collector number '099/081 SR' | collector_number | bottom left | visible | 0.95 |
| set symbol 'J M5' | set_symbol | bottom left | visible | 0.95 |
| illustrator text 'Illus. 5ban Graphics' | illustrator_text | bottom left | visible | 0.9 |
| copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK' | copyright_text | bottom center | visible | 0.9 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_mega_darkrai_001 | subjects | subject is Mega Darkrai Pokemon | obs_subject_001 | 0.99 |
| fact_creature_anatomy_body_001 | creature_anatomy | body color is black | obs_color_001, obs_creature_anatomy_001 | 0.99 |
| fact_creature_anatomy_head_001 | creature_anatomy | head has white mane | obs_color_002, obs_creature_anatomy_002 | 0.98 |
| fact_creature_anatomy_eye_001 | creature_anatomy | eye is pink with slit pupil | obs_color_003, obs_creature_anatomy_003, obs_creature_anatomy_010 | 0.96 |
| fact_creature_anatomy_horns_001 | creature_anatomy | horns are visible on head | obs_creature_anatomy_004 | 0.95 |
| fact_creature_anatomy_arms_001 | creature_anatomy | arms are visible with claws | obs_creature_anatomy_005, obs_creature_anatomy_006 | 0.95 |
| fact_creature_anatomy_tail_001 | creature_anatomy | tail is visible | obs_creature_anatomy_007 | 0.97 |
| fact_creature_anatomy_pose_001 | creature_anatomy | pose is floating horizontal | obs_pose_001 | 0.94 |
| fact_environment_001 | environment | background is dark shadowy forest with green mist | obs_color_004, obs_environment_001, obs_environment_002 | 0.87 |
| fact_visual_effects_001 | objects_and_props | energy-like glow spikes visible on back | obs_object_001 | 0.88 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text visible in Japanese 'メガダークライ ex' | obs_card_ui_001 | 0.99 |
| fact_card_ui_hp_001 | HP text visible as 280 | obs_card_ui_002 | 0.99 |
| fact_card_ui_energy_001 | darkness type energy symbol visible | obs_card_ui_003 | 0.98 |
| fact_card_ui_attacks_001 | attack names and descriptions visible in Japanese | obs_card_ui_004 | 0.95 |
| fact_card_ui_collector_number_001 | collector number text visible as '099/081 SR' | obs_card_ui_005 | 0.95 |
| fact_card_ui_set_symbol_001 | set symbol visible 'J M5' | obs_card_ui_006 | 0.95 |
| fact_card_ui_illustrator_001 | illustrator text visible as 'Illus. 5ban Graphics' | obs_card_ui_007 | 0.9 |
| fact_card_ui_copyright_001 | copyright text visible '©2026 Pokémon/Nintendo/Creatures/GAME FREAK' | obs_card_ui_008 | 0.9 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_attacks_001",
    "fact_card_ui_collector_number_001",
    "fact_card_ui_copyright_001",
    "fact_card_ui_energy_001",
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
    "obs_card_ui_006"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_008"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [
    "obs_card_ui_003"
  ],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_007"
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
| objects_and_props | complete | low | medium |  |
| environment | complete | low | medium |  |
| composition | likely_complete | low | medium |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | medium |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_visual_001 | state | floating | obs_subject_001 | obs_pose_001 | pink slit pupils white mane floating horizontal pose floating horizontal floating dark shadowy forest background green mist aura energy-like glow spikes on back | 0.94 |
| sem_visual_002 | environment | dark forest background |  | obs_environment_001, obs_environment_002 | dark shadowy forest background green mist aura | 0.87 |

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
| floating | obs_pose_001, obs_subject_001 |
| dark forest background | obs_environment_001 |
| pink slit pupils | obs_creature_anatomy_003, obs_creature_anatomy_010 |
| white mane | obs_creature_anatomy_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| dark forest background | obs_environment_001, obs_environment_002 | deterministic_rule | 0.87 |
| floating | obs_creature_anatomy_009, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| forest | obs_environment_001 | deterministic_rule | 0.87 |
| glowing highlights | obs_object_001 | deterministic_rule | 0.92 |
| right orientation | obs_creature_anatomy_009, obs_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| smoke | obs_environment_002 | deterministic_rule | 0.85 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Mega Darkrai. Visible observations: mega darkrai, body, head, eye, horns, arms, claws, tail. Semantic facts: floating, dark forest background.
- Quality flags: `potential_count_reference_inconsistent`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Mega Darkrai Pokemon",
      "normalized_label": "mega darkrai",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_001",
      "kind": "creature_anatomy",
      "label": "body",
      "normalized_label": "body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_002",
      "kind": "creature_anatomy",
      "label": "head",
      "normalized_label": "head",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_003",
      "kind": "creature_anatomy",
      "label": "eye",
      "normalized_label": "eye",
      "scene_layer": "foreground",
      "frame_position": "head area",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_004",
      "kind": "creature_anatomy",
      "label": "horns",
      "normalized_label": "horns",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_005",
      "kind": "creature_anatomy",
      "label": "arms",
      "normalized_label": "arms",
      "scene_layer": "foreground",
      "frame_position": "mid body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_006",
      "kind": "creature_anatomy",
      "label": "claws",
      "normalized_label": "claws",
      "scene_layer": "foreground",
      "frame_position": "arms",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_007",
      "kind": "creature_anatomy",
      "label": "tail",
      "normalized_label": "tail",
      "scene_layer": "foreground",
      "frame_position": "back body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_008",
      "kind": "creature_anatomy",
      "label": "legs",
      "normalized_label": "legs",
      "scene_layer": "foreground",
      "frame_position": "lower body",
      "visibility": "partially visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_creature_anatomy_009",
      "kind": "creature_anatomy",
      "label": "face side profile",
      "normalized_label": "face side profile",
      "scene_layer": "foreground",
      "frame_position": "head side",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_creature_anatomy_010",
      "kind": "creature_anatomy",
      "label": "pink eye with slit pupil",
      "normalized_label": "pink eye slit pupil",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_001",
      "kind": "color_and_light",
      "label": "black body",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_002",
      "kind": "color_and_light",
      "label": "white mane",
      "normalized_label": "white",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_003",
      "kind": "color_and_light",
      "label": "pink eye color",
      "normalized_label": "pink",
      "scene_layer": "foreground",
      "frame_position": "eye",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_color_004",
      "kind": "color_and_light",
      "label": "yellow-green background glow",
      "normalized_label": "yellow green",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "creature_anatomy",
      "label": "floating horizontal pose",
      "normalized_label": "floating horizontal",
      "scene_layer": "foreground",
      "frame_position": "full body",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_visual_design_001",
      "kind": "visual_design",
      "label": "dynamic body curves and spikes",
      "normalized_label": "curves spikes",
      "scene_layer": "foreground",
      "frame_position": "body and head",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "energy-like glow spikes on back",
      "normalized_label": "energy glow spikes back",
      "scene_layer": "foreground",
      "frame_position": "back",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.88,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "dark shadowy forest background",
      "normalized_label": "dark forest",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.87,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "bright green mist or aura",
      "normalized_label": "green mist aura",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese 'メガダークライ ex'",
      "normalized_label": "card name japanese megadarkrai ex",
      "scene_layer": "top bar",
      "frame_position": "top center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "hp_text",
      "label": "HP 280 text",
      "normalized_label": "hp 280",
      "scene_layer": "top bar",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "energy_symbol",
      "label": "darkness type energy symbol near HP",
      "normalized_label": "darkness energy symbol",
      "scene_layer": "top bar",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "attack names and descriptions in Japanese",
      "normalized_label": "attack names japanese",
      "scene_layer": "middle text",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "collector_number",
      "label": "collector number '099/081 SR'",
      "normalized_label": "collector number 099/081 sr",
      "scene_layer": "bottom left",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "set_symbol",
      "label": "set symbol 'J M5'",
      "normalized_label": "set symbol j m5",
      "scene_layer": "bottom left",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "illustrator_text",
      "label": "illustrator text 'Illus. 5ban Graphics'",
      "normalized_label": "illustrator 5ban graphics",
      "scene_layer": "bottom left",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "copyright_text",
      "label": "copyright text '©2026 Pokémon/Nintendo/Creatures/GAME FREAK'",
      "normalized_label": "copyright 2026 pokemon nintendo creatures game freak",
      "scene_layer": "bottom bar",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "medium"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_mega_darkrai_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "subject is Mega Darkrai Pokemon",
      "value": "Mega Darkrai",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_body_001",
      "module": "creature_anatomy",
      "field_path": "body",
      "claim": "body color is black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_color_001",
        "obs_creature_anatomy_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_head_001",
      "module": "creature_anatomy",
      "field_path": "head",
      "claim": "head has white mane",
      "value": "white",
      "supporting_observation_ids": [
        "obs_color_002",
        "obs_creature_anatomy_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_eye_001",
      "module": "creature_anatomy",
      "field_path": "eye",
      "claim": "eye is pink with slit pupil",
      "value": "pink slit pupil",
      "supporting_observation_ids": [
        "obs_color_003",
        "obs_creature_anatomy_003",
        "obs_creature_anatomy_010"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_horns_001",
      "module": "creature_anatomy",
      "field_path": "horns",
      "claim": "horns are visible on head",
      "value": "horns visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_arms_001",
      "module": "creature_anatomy",
      "field_path": "arms",
      "claim": "arms are visible with claws",
      "value": "arms with claws",
      "supporting_observation_ids": [
        "obs_creature_anatomy_005",
        "obs_creature_anatomy_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_tail_001",
      "module": "creature_anatomy",
      "field_path": "tail",
      "claim": "tail is visible",
      "value": "tail visible",
      "supporting_observation_ids": [
        "obs_creature_anatomy_007"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_creature_anatomy_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose",
      "claim": "pose is floating horizontal",
      "value": "floating horizontal",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "background is dark shadowy forest with green mist",
      "value": "dark forest with green mist",
      "supporting_observation_ids": [
        "obs_color_004",
        "obs_environment_001",
        "obs_environment_002"
      ],
      "confidence": 0.87,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_visual_effects_001",
      "module": "objects_and_props",
      "field_path": "effects",
      "claim": "energy-like glow spikes visible on back",
      "value": "energy glow spikes back",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.88,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible in Japanese 'メガダークライ ex'",
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
      "claim": "HP text visible as 280",
      "value": "280 HP",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_energy_001",
      "module": "card_ui_and_print_markers",
      "field_path": "energy_symbol",
      "claim": "darkness type energy symbol visible",
      "value": "darkness energy symbol",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_attacks_001",
      "module": "card_ui_and_print_markers",
      "field_path": "attack_text",
      "claim": "attack names and descriptions visible in Japanese",
      "value": "attack text Japanese",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_collector_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number text visible as '099/081 SR'",
      "value": "099/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol visible 'J M5'",
      "value": "J M5 set symbol",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_illustrator_001",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible as 'Illus. 5ban Graphics'",
      "value": "Illus. 5ban Graphics",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright text visible '©2026 Pokémon/Nintendo/Creatures/GAME FREAK'",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.9,
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
        "arms",
        "body",
        "claws",
        "eye",
        "head",
        "horns",
        "legs",
        "tail"
      ],
      "physical_features": [
        "pink slit pupils",
        "white mane"
      ],
      "pose": [
        "floating"
      ],
      "orientation": "right",
      "action_state": [],
      "facial_evidence": {
        "eyes": "pink slit pupils visible",
        "mouth": "not clearly visible",
        "eyebrows": "not visible",
        "face_position": "side profile head right",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [],
      "colors": [
        "black body",
        "pink eye",
        "white mane"
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
      "obs_creature_anatomy_007",
      "obs_creature_anatomy_008",
      "obs_creature_anatomy_009",
      "obs_creature_anatomy_010",
      "obs_object_001",
      "obs_pose_001",
      "obs_subject_001",
      "obs_visual_design_001"
    ],
    "midground": [],
    "background": [
      "obs_color_004",
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "environment": {
    "setting": [
      "dark shadowy forest background",
      "green mist aura"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [],
    "ground": [],
    "terrain": [
      "shadowy forest"
    ],
    "plants": [
      "forest trees"
    ],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_color_004",
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "energy-like glow spikes on back",
      "normalized_label": "energy glow spikes back",
      "object_type": "special effect",
      "colors": [
        "yellow-green"
      ],
      "material_appearance": [
        "energy",
        "glowing"
      ],
      "location": "attached to back",
      "count_reference": "count_001",
      "confidence": 0.88
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "pink",
      "white",
      "yellow-green"
    ],
    "lighting": [
      "contrast with dark body",
      "glowing yellow-green accents"
    ],
    "shadows": [
      "shadowed dark body"
    ],
    "highlights": [
      "white mane highlights"
    ],
    "composition": [
      "centered large subject",
      "pose diagonal body"
    ],
    "camera_angle": "side profile",
    "framing": "tight on full body",
    "cropping": [
      "full body visible"
    ],
    "depth": "moderate depth with distinct subject and background separation",
    "motion_cues": [
      "spikes",
      "floating pose"
    ],
    "motifs": [
      "dark aura",
      "energy glow"
    ],
    "repeated_shapes": [
      "spikes on back"
    ],
    "style_cues": [
      "high contrast"
    ],
    "supporting_observation_ids": [
      "obs_creature_anatomy_001",
      "obs_creature_anatomy_002",
      "obs_environment_001",
      "obs_object_001",
      "obs_visual_design_001"
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
        "fact_creature_anatomy_arms_001",
        "fact_creature_anatomy_body_001",
        "fact_creature_anatomy_eye_001",
        "fact_creature_anatomy_head_001",
        "fact_creature_anatomy_horns_001",
        "fact_creature_anatomy_pose_001",
        "fact_creature_anatomy_tail_001"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "body",
          "feature": "body",
          "visibility": "visible",
          "colors": [
            "black"
          ],
          "details": [],
          "supporting_observation_ids": [
            "obs_color_001",
            "obs_creature_anatomy_001"
          ],
          "confidence": 0.99
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "mane",
          "visibility": "visible",
          "colors": [
            "white"
          ],
          "details": [
            "long flowing mane"
          ],
          "supporting_observation_ids": [
            "obs_color_002",
            "obs_creature_anatomy_002"
          ],
          "confidence": 0.98
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "floating"
          ],
          "orientation": "right",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_creature_anatomy_009",
            "obs_pose_001"
          ],
          "confidence": 0.94
        }
      ],
      "effects": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "energy glow spikes on back",
          "details": [
            "yellow-green glowing spikes"
          ],
          "supporting_observation_ids": [
            "obs_object_001"
          ],
          "confidence": 0.88
        }
      ]
    },
    "clothing": {
      "fact_ids": [],
      "garments": [],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_visual_effects_001"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001"
      ],
      "observation_ids": [
        "obs_color_004",
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_visual_design_001"
      ]
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
      "fact_ids": [
        "fact_visual_effects_001"
      ],
      "observation_ids": [
        "obs_object_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_attacks_001",
        "fact_card_ui_collector_number_001",
        "fact_card_ui_copyright_001",
        "fact_card_ui_energy_001",
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
        "obs_card_ui_006"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_008"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [
        "obs_card_ui_003"
      ],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_007"
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
        "floating",
        "dark forest background",
        "pink slit pupils",
        "white mane"
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
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "environment",
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "evidence_quality": "medium",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_visual_001",
      "category": "state",
      "label": "floating",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [
          "pink slit pupils"
        ],
        "eyebrows": [],
        "facial_features": [
          "white mane"
        ],
        "body_language": [
          "floating horizontal pose"
        ],
        "body_position": [
          "floating horizontal"
        ],
        "motion_state": [
          "floating"
        ],
        "environment": [
          "dark shadowy forest background",
          "green mist aura"
        ],
        "objects": [
          "energy-like glow spikes on back"
        ],
        "relationships": [],
        "other": []
      },
      "confidence": 0.94,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_visual_002",
      "category": "environment",
      "label": "dark forest background",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "dark shadowy forest background",
          "green mist aura"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.87,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "floating",
      "supporting_observation_ids": [
        "obs_pose_001",
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
      "term": "pink slit pupils",
      "supporting_observation_ids": [
        "obs_creature_anatomy_003",
        "obs_creature_anatomy_010"
      ]
    },
    {
      "term": "white mane",
      "supporting_observation_ids": [
        "obs_creature_anatomy_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "dark forest background",
        "source_observation_ids": [
          "obs_environment_001",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.87
      },
      {
        "concept": "floating",
        "source_observation_ids": [
          "obs_creature_anatomy_009",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "forest",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.87
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_object_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_creature_anatomy_009",
          "obs_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "smoke",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.85
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-078 - ムク

- Branch: `pokemon`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.95`
- Cost USD: `0.0089816`
- Artwork observations: `12`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: unknown female human. Visible observations: female human figure, dark purple hair, white crown with blue swirl, face with, white cloak, black inner robe, blue belt with yellow buckle, right hand with blue glove. Semantic facts: standing, indoor.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human figure | female human figure | scene_subject | foreground | high | 0.99 |
| dark purple hair with curled bangs | dark purple hair | human_hair | foreground | high | 0.98 |
| white and blue rounded crown with swirl designs | white crown with blue swirl | human_accessory | foreground | medium | 0.95 |
| face with large purple eyes and neutral expression | face with | human_face | foreground | high | 0.99 |
| white cloak with yellow symbols on left sleeve | white cloak | human_clothing | foreground | high | 0.98 |
| black inner robe visible under cloak | black inner robe | human_clothing | foreground | high | 0.97 |
| blue belt with yellow centerpiece buckle | blue belt with yellow buckle | human_accessory | foreground | medium | 0.96 |
| right hand with blue glove | right hand with blue glove | human_body_part | foreground | medium | 0.95 |
| brick wall with arches and lights | brick wall with arches and lights | environment_architecture | background | medium | 0.97 |
| two lit wall lamps on brick wall | two lit wall lamps | environment_lighting | background | medium | 0.98 |
| stone tiled floor with drainage grate | stone tiled floor with drainage grate | environment_flooring | background | medium | 0.98 |
| pipe structure at right background | pipe structure | environment_object | background | low | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001_pose_orientation | creature_anatomy | pose | obs_hand_001, obs_subject_001 | 0.98 |
| fact_subject_001_hair_color | human_appearance | hair color | obs_hair_001 | 0.98 |
| fact_subject_001_headgear | human_appearance | headgear | obs_headgear_001 | 0.95 |
| fact_subject_001_face_expression | human_appearance | facial expression | obs_face_001 | 0.99 |
| fact_subject_001_clothing_outer | clothing | outer garment color and type | obs_clothing_001 | 0.98 |
| fact_subject_001_clothing_inner | clothing | inner garment color and type | obs_clothing_002 | 0.97 |
| fact_subject_001_accessory_belt | clothing | belt and buckle colors | obs_accessory_001 | 0.96 |
| fact_subject_001_hand_glove | human_appearance | hand glove color | obs_hand_001 | 0.95 |
| fact_environment_brick_wall | environment | wall material | obs_background_001 | 0.97 |
| fact_environment_lighting | environment | lighting sources | obs_environment_001 | 0.98 |
| fact_environment_floor | environment | flooring | obs_environment_002 | 0.98 |
| fact_environment_pipe | objects_and_props | pipe object | obs_environment_pipe_001 | 0.95 |

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
| human_appearance | complete | none | high |  |
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | not_applicable |  |
| color_and_light | none_visible | none | not_applicable |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_001_standing | action | standing | obs_subject_001 | obs_hand_001, obs_subject_001 | neutral large purple eyes neutral face visible arms relaxed standing upright still indoors pipe structure | 0.98 |
| sem_fact_002_indoor_environment | environment | indoor |  | obs_background_001, obs_environment_001, obs_environment_002 | arched architecture brick walls stone tiled floor wall lamps | 0.97 |

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
| female human figure | obs_subject_001 |
| white cloak with yellow symbol | obs_clothing_001 |
| indoor brick wall with arches | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_environment_pipe_001 | deterministic_rule | 0.95 |
| cape | obs_clothing_001 | deterministic_rule | 0.98 |
| frontal orientation | obs_hand_001, obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_hand_001 | deterministic_rule | 0.95 |
| indoor | obs_background_001, obs_environment_001, obs_environment_002 | deterministic_rule | 0.97 |
| right orientation | obs_hand_001 | deterministic_rule | 0.95 |
| spiral motif | obs_headgear_001 | deterministic_rule | 0.95 |
| standing | obs_hand_001, obs_subject_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown female human. Visible observations: female human figure, dark purple hair, white crown with blue swirl, face with, white cloak, black inner robe, blue belt with yellow buckle, right hand with blue glove. Semantic facts: standing, indoor.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human figure",
      "normalized_label": "female human figure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_hair",
      "label": "dark purple hair with curled bangs",
      "normalized_label": "dark purple hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_headgear_001",
      "kind": "human_accessory",
      "label": "white and blue rounded crown with swirl designs",
      "normalized_label": "white crown with blue swirl",
      "scene_layer": "foreground",
      "frame_position": "top center on head",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "solid"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_face",
      "label": "face with large purple eyes and neutral expression",
      "normalized_label": "face with",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "human_clothing",
      "label": "white cloak with yellow symbols on left sleeve",
      "normalized_label": "white cloak",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "human_clothing",
      "label": "black inner robe visible under cloak",
      "normalized_label": "black inner robe",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "human_accessory",
      "label": "blue belt with yellow centerpiece buckle",
      "normalized_label": "blue belt with yellow buckle",
      "scene_layer": "foreground",
      "frame_position": "mid torso",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "solid"
    },
    {
      "observation_id": "obs_hand_001",
      "kind": "human_body_part",
      "label": "right hand with blue glove",
      "normalized_label": "right hand with blue glove",
      "scene_layer": "foreground",
      "frame_position": "right side center",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "solid"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment_architecture",
      "label": "brick wall with arches and lights",
      "normalized_label": "brick wall with arches and lights",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment_lighting",
      "label": "two lit wall lamps on brick wall",
      "normalized_label": "two lit wall lamps",
      "scene_layer": "background",
      "frame_position": "left and right background",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment_flooring",
      "label": "stone tiled floor with drainage grate",
      "normalized_label": "stone tiled floor with drainage grate",
      "scene_layer": "background",
      "frame_position": "bottom foreground",
      "visibility": "fully_visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "solid"
    },
    {
      "observation_id": "obs_environment_pipe_001",
      "kind": "environment_object",
      "label": "pipe structure at right background",
      "normalized_label": "pipe structure",
      "scene_layer": "background",
      "frame_position": "right background",
      "visibility": "fully_visible",
      "salience": "low",
      "confidence": 0.95,
      "evidence_strength": "solid"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001_pose_orientation",
      "module": "creature_anatomy",
      "field_path": "pose_orientation.pose",
      "claim": "pose",
      "value": "standing upright",
      "supporting_observation_ids": [
        "obs_hand_001",
        "obs_subject_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_subject_001_hair_color",
      "module": "human_appearance",
      "field_path": "hair.color",
      "claim": "hair color",
      "value": "dark purple",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_subject_001_headgear",
      "module": "human_appearance",
      "field_path": "clothing_or_accessories.headgear",
      "claim": "headgear",
      "value": "white crown with blue swirl",
      "supporting_observation_ids": [
        "obs_headgear_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "solid"
    },
    {
      "fact_id": "fact_subject_001_face_expression",
      "module": "human_appearance",
      "field_path": "facial_evidence.expression",
      "claim": "facial expression",
      "value": "neutral",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_subject_001_clothing_outer",
      "module": "clothing",
      "field_path": "garments.outer",
      "claim": "outer garment color and type",
      "value": "white cloak with yellow symbol",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_subject_001_clothing_inner",
      "module": "clothing",
      "field_path": "garments.inner",
      "claim": "inner garment color and type",
      "value": "black robe",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_subject_001_accessory_belt",
      "module": "clothing",
      "field_path": "accessories.belt",
      "claim": "belt and buckle colors",
      "value": "blue belt with yellow buckle",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "solid"
    },
    {
      "fact_id": "fact_subject_001_hand_glove",
      "module": "human_appearance",
      "field_path": "accessories.hand",
      "claim": "hand glove color",
      "value": "blue glove on right hand",
      "supporting_observation_ids": [
        "obs_hand_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "solid"
    },
    {
      "fact_id": "fact_environment_brick_wall",
      "module": "environment",
      "field_path": "architecture.wall_material",
      "claim": "wall material",
      "value": "brick with arches",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_lighting",
      "module": "environment",
      "field_path": "lighting.wall_lamps",
      "claim": "lighting sources",
      "value": "two lit wall lamps",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_floor",
      "module": "environment",
      "field_path": "ground.flooring",
      "claim": "flooring",
      "value": "stone tile with drainage grate",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "solid"
    },
    {
      "fact_id": "fact_environment_pipe",
      "module": "objects_and_props",
      "field_path": "objects.pipe",
      "claim": "pipe object",
      "value": "pipe structure on right side",
      "supporting_observation_ids": [
        "obs_environment_pipe_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "solid"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown female human",
      "identity_confidence": 0.99,
      "anatomy": [
        "head",
        "right arm and hand visible",
        "torso"
      ],
      "physical_features": [
        "dark purple hair",
        "fair skin"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "frontal",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "large purple eyes",
        "mouth": "neutral",
        "eyebrows": "neutral",
        "face_position": "centered",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black inner robe",
        "blue belt",
        "blue glove on right hand",
        "white cloak with yellow symbol",
        "white crown with blue swirl"
      ],
      "colors": [
        "black",
        "blue",
        "dark purple",
        "white",
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
      "obs_accessory_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_face_001",
      "obs_hair_001",
      "obs_hand_001",
      "obs_headgear_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001",
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_pipe_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "stone tiled floor with drainage grate"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "brick walls with arches"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_pipe_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_environment_pipe_001",
      "label": "pipe structure",
      "normalized_label": "pipe structure",
      "object_type": "environment object",
      "colors": [
        "dark metallic"
      ],
      "material_appearance": [
        "metallic"
      ],
      "location": "right background",
      "count_reference": "",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "brownish brick",
      "dark purple",
      "warm light yellow",
      "white",
      "yellow"
    ],
    "lighting": [
      "even indoor lighting with two wall lamps"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "light reflections on headgear"
    ],
    "composition": [
      "centered figure, symmetrical background"
    ],
    "camera_angle": "straight-on",
    "framing": "medium portrait",
    "cropping": [],
    "depth": "clear depth with foreground figure and background architecture",
    "motion_cues": [],
    "motifs": [
      "arch motifs in brick walls",
      "circular swirl motifs in crown"
    ],
    "repeated_shapes": [
      "arches in background"
    ],
    "style_cues": [
      "clean line art",
      "soft shading"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
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
        "fact_subject_001_accessory_belt",
        "fact_subject_001_clothing_inner",
        "fact_subject_001_clothing_outer",
        "fact_subject_001_face_expression",
        "fact_subject_001_hair_color",
        "fact_subject_001_hand_glove",
        "fact_subject_001_headgear",
        "fact_subject_001_pose_orientation"
      ],
      "scene_subject_observation_ids": [
        "obs_subject_001"
      ],
      "depicted_subject_observation_ids": [],
      "character_representation_observation_ids": []
    },
    "human_appearance": {
      "fact_ids": [
        "fact_subject_001_face_expression",
        "fact_subject_001_hair_color",
        "fact_subject_001_hand_glove",
        "fact_subject_001_headgear"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "visibility": "fully_visible",
          "details": [
            "dark purple hair",
            "face"
          ],
          "supporting_observation_ids": [
            "obs_face_001",
            "obs_hair_001"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "large purple eyes",
          "mouth": "neutral",
          "eyebrows": "neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "dark purple hair with curled bangs",
          "details": [
            "curled bangs",
            "dark purple color",
            "soft texture"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "white crown with blue swirl designs",
          "details": [
            "crown on head",
            "rounded shape",
            "white with blue swirl"
          ],
          "supporting_observation_ids": [
            "obs_headgear_001"
          ],
          "confidence": 0.95
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue glove on right hand",
          "details": [
            "blue color",
            "right hand covered"
          ],
          "supporting_observation_ids": [
            "obs_hand_001"
          ],
          "confidence": 0.95
        }
      ]
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_subject_001_pose_orientation"
      ],
      "body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "hair",
          "visibility": "fully_visible",
          "colors": [
            "dark purple"
          ],
          "details": [
            "curled bangs"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "physical_features": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "feature": "face",
          "visibility": "fully_visible",
          "colors": [
            "fair skin",
            "purple eyes"
          ],
          "details": [
            "large eyes"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "standing"
          ],
          "orientation": "frontal",
          "action_state": [
            "still"
          ],
          "supporting_observation_ids": [
            "obs_hand_001",
            "obs_subject_001"
          ],
          "confidence": 0.98
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_subject_001_accessory_belt",
        "fact_subject_001_clothing_inner",
        "fact_subject_001_clothing_outer"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and arms",
          "garment": "white cloak",
          "neckline_type": "not visible",
          "sleeve_type": "long wide sleeves",
          "colors": [
            "white",
            "yellow"
          ],
          "visible_details": [
            "yellow star-like symbol left sleeve"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black inner robe",
          "neckline_type": "not visible",
          "sleeve_type": "long sleeves",
          "colors": [
            "black"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blue belt with yellow buckle",
          "details": [
            "belt around waist",
            "yellow centerpiece buckle"
          ],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.96
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_environment_pipe"
      ],
      "object_observation_ids": [
        "obs_environment_pipe_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_brick_wall",
        "fact_environment_floor",
        "fact_environment_lighting",
        "fact_environment_pipe"
      ],
      "observation_ids": [
        "obs_background_001",
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_pipe_001"
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
        "female human figure",
        "white cloak with yellow symbol",
        "indoor brick wall with arches"
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_001_standing",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hand_001",
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [
          "neutral"
        ],
        "eyes": [
          "large purple eyes"
        ],
        "eyebrows": [
          "neutral"
        ],
        "facial_features": [
          "face visible"
        ],
        "body_language": [
          "arms relaxed"
        ],
        "body_position": [
          "standing upright"
        ],
        "motion_state": [
          "still"
        ],
        "environment": [
          "indoors"
        ],
        "objects": [
          "pipe structure"
        ],
        "relationships": [],
        "other": []
      },
      "confidence": 0.98,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_002_indoor_environment",
      "category": "environment",
      "label": "indoor",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_background_001",
        "obs_environment_001",
        "obs_environment_002"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "arched architecture",
          "brick walls",
          "stone tiled floor",
          "wall lamps"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "female human figure",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "white cloak with yellow symbol",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "indoor brick wall with arches",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_environment_pipe_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "cape",
        "source_observation_ids": [
          "obs_clothing_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_hand_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_hand_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "indoor",
        "source_observation_ids": [
          "obs_background_001",
          "obs_environment_001",
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_hand_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_headgear_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_hand_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-108 - Misty's Vitality

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.99`
- Attribute confidence: `0.97`
- Cost USD: `0.0099936`
- Artwork observations: `10`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: unknown_human_female.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| Woman with orange hair in ponytail | woman with orange hair in ponytail | scene_subject | foreground | salient | 0.99 |
| Orange hair tied in ponytail with black hair tie | orange hair ponytail black hair tie | human_appearance | foreground | salient | 0.98 |
| Navy blue sleeveless one-piece swimsuit | navy blue sleeveless swimsuit | clothing | foreground | salient | 0.98 |
| Black wristband on left wrist | black wristband | clothing | foreground | salient | 0.9 |
| Woman's face with open eyes, smiling mouth, neutral eyebrows | face open eyes smiling mouth neutral eyebrows | human_appearance | foreground | salient | 0.99 |
| Visible bare arms and neck | bare arms neck | human_appearance | foreground | salient | 0.95 |
| Visible bare midriff | bare midriff | human_appearance | foreground | salient | 0.95 |
| Woman in forward-leaning fighting stance with left arm forward and right arm back | fighting stance arms forward back | human_appearance | foreground | salient | 0.98 |
| Indoor pool area with pool edge, benches, windows | indoor pool area benches windows | environment | background | salient | 0.95 |
| Blue bench in background | blue bench | objects_and_props | background | salient | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Card name text in Japanese: カスミの元気 | card_ui_text | top left | visible | 0.98 |
| Card type text in Japanese: トレーナーズ (Trainers) | card_ui_text | top right | visible | 0.98 |
| Card subtype text in Japanese: サポート (Support) | card_ui_text | top left | visible | 0.98 |
| Set code and number: J M5 108/081 SR | card_ui_text | bottom left | visible | 0.95 |
| Copyright line text at bottom: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom center | visible | 0.99 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | Woman subject presence | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | Hair style and color | obs_hair_001 | 0.98 |
| fact_003 | clothing | Garment style and color | obs_clothing_001 | 0.98 |
| fact_004 | clothing | Wristband color and location | obs_clothing_002 | 0.9 |
| fact_005 | human_appearance | Face visible with open eyes, smiling mouth, neutral eyebrows | obs_human_face_001 | 0.99 |
| fact_006 | human_appearance | Visible bare arms, neck, midriff | obs_human_body_001, obs_human_body_002 | 0.95 |
| fact_007 | human_appearance | Body pose fighting stance with arms positioned | obs_pose_001 | 0.98 |
| fact_008 | environment | Indoor pool area environment | obs_environment_001, obs_objects_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_009 | Card name text visible in Japanese | obs_card_ui_name_001 | 0.98 |
| fact_010 | Card type text visible in Japanese 'Trainers' | obs_card_ui_type_001 | 0.98 |
| fact_011 | Card subtype 'Support' text visible | obs_card_ui_supporter_001 | 0.98 |
| fact_012 | Set code and card number visible | obs_card_ui_set_001 | 0.95 |
| fact_013 | Copyright text visible at bottom | obs_card_ui_copyright_001 | 0.99 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_009",
    "fact_010",
    "fact_011",
    "fact_012",
    "fact_013"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001",
    "obs_card_ui_supporter_001",
    "obs_card_ui_type_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_001"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [
    "obs_card_ui_set_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | complete | low | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

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
| fighting stance woman | obs_pose_001 |
| orange hair ponytail woman | obs_hair_001 |
| navy blue swimsuit woman | obs_clothing_001 |
| indoor pool background | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| exposed midriff | obs_human_body_002 | deterministic_rule | 0.95 |
| fighting stance | obs_subject_001 | deterministic_rule | 0.99 |
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| left arm forward | obs_subject_001 | deterministic_rule | 0.99 |
| right arm back | obs_subject_001 | deterministic_rule | 0.99 |
| sleeveless clothing | obs_clothing_001 | deterministic_rule | 0.98 |
| window | obs_environment_001 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: unknown_human_female.
- Quality flags: `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "Woman with orange hair in ponytail",
      "normalized_label": "woman with orange hair in ponytail",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "Orange hair tied in ponytail with black hair tie",
      "normalized_label": "orange hair ponytail black hair tie",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "Navy blue sleeveless one-piece swimsuit",
      "normalized_label": "navy blue sleeveless swimsuit",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "Black wristband on left wrist",
      "normalized_label": "black wristband",
      "scene_layer": "foreground",
      "frame_position": "left wrist",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_face_001",
      "kind": "human_appearance",
      "label": "Woman's face with open eyes, smiling mouth, neutral eyebrows",
      "normalized_label": "face open eyes smiling mouth neutral eyebrows",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_body_001",
      "kind": "human_appearance",
      "label": "Visible bare arms and neck",
      "normalized_label": "bare arms neck",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_body_002",
      "kind": "human_appearance",
      "label": "Visible bare midriff",
      "normalized_label": "bare midriff",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pose_001",
      "kind": "human_appearance",
      "label": "Woman in forward-leaning fighting stance with left arm forward and right arm back",
      "normalized_label": "fighting stance arms forward back",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "Indoor pool area with pool edge, benches, windows",
      "normalized_label": "indoor pool area benches windows",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "Blue bench in background",
      "normalized_label": "blue bench",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "Card name text in Japanese: カスミの元気",
      "normalized_label": "card name text japanese",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_type_001",
      "kind": "card_ui_text",
      "label": "Card type text in Japanese: トレーナーズ (Trainers)",
      "normalized_label": "card type text japanese",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_supporter_001",
      "kind": "card_ui_text",
      "label": "Card subtype text in Japanese: サポート (Support)",
      "normalized_label": "card subtype support",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_001",
      "kind": "card_ui_text",
      "label": "Set code and number: J M5 108/081 SR",
      "normalized_label": "set code number",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "Copyright line text at bottom: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright line",
      "scene_layer": "ui",
      "frame_position": "bottom center",
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
      "field_path": "scene_subject.identity",
      "claim": "Woman subject presence",
      "value": "true",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair.label",
      "claim": "Hair style and color",
      "value": "Orange hair tied in ponytail with black hair tie",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "Garment style and color",
      "value": "Navy blue sleeveless one-piece swimsuit",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "Wristband color and location",
      "value": "Black wristband on left wrist",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "human_appearance",
      "field_path": "facial_evidence",
      "claim": "Face visible with open eyes, smiling mouth, neutral eyebrows",
      "value": "face open eyes smiling mouth neutral eyebrows",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "visible_body_regions",
      "claim": "Visible bare arms, neck, midriff",
      "value": "bare arms neck midriff",
      "supporting_observation_ids": [
        "obs_human_body_001",
        "obs_human_body_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "human_appearance",
      "field_path": "pose",
      "claim": "Body pose fighting stance with arms positioned",
      "value": "fighting stance arms forward back",
      "supporting_observation_ids": [
        "obs_pose_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "setting",
      "claim": "Indoor pool area environment",
      "value": "indoor pool area benches windows",
      "supporting_observation_ids": [
        "obs_environment_001",
        "obs_objects_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "Card name text visible in Japanese",
      "value": "カスミの元気",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "Card type text visible in Japanese 'Trainers'",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_type_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "Card subtype 'Support' text visible",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_card_ui_supporter_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "Set code and card number visible",
      "value": "J M5 108/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "Copyright text visible at bottom",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "unknown_human_female",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "midriff",
        "neck",
        "shoulders",
        "upper chest"
      ],
      "physical_features": [
        "blue eyes",
        "orange hair",
        "pony tail"
      ],
      "pose": [
        "fighting stance",
        "left arm forward",
        "right arm back"
      ],
      "orientation": "forward",
      "action_state": [
        "posing",
        "smiling",
        "standing"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "smiling",
        "eyebrows": "neutral",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristband left wrist",
        "navy blue sleeveless swimsuit"
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
      "obs_hair_001",
      "obs_human_body_001",
      "obs_human_body_002",
      "obs_human_face_001",
      "obs_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_objects_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor pool area"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "pool edge"
    ],
    "terrain": [],
    "plants": [],
    "architecture": [
      "benches",
      "windows"
    ],
    "water": [
      "pool water"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_objects_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "Blue bench",
      "normalized_label": "blue bench",
      "object_type": "bench",
      "colors": [
        "blue"
      ],
      "material_appearance": [
        "plastic-like appearance or metal-like appearance"
      ],
      "location": "background",
      "count_reference": "none",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "orange",
      "skin tone"
    ],
    "lighting": [
      "bright",
      "uniform"
    ],
    "shadows": [
      "minimal",
      "soft"
    ],
    "highlights": [
      "sparkle on pool water"
    ],
    "composition": [
      "centered subject",
      "pose"
    ],
    "camera_angle": "eye level",
    "framing": "medium shot",
    "cropping": [
      "full subject visible"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [
      "none"
    ],
    "motifs": [
      "water theme"
    ],
    "repeated_shapes": [
      "triangular hair spikes"
    ],
    "style_cues": [],
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
    "surface_and_scan_cues_review": "not_applicable"
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
        "fact_005",
        "fact_006",
        "fact_007"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "eyes open",
            "neutral eyebrows",
            "smiling mouth"
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
          "eyes": "open",
          "mouth": "smiling",
          "eyebrows": "neutral",
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
          "label": "orange hair ponytail black hair tie",
          "details": [
            "black hair tie",
            "orange hair",
            "tied in ponytail"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
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
      "fact_ids": [
        "fact_003",
        "fact_004"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "navy blue sleeveless one-piece swimsuit",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "navy blue"
          ],
          "visible_details": [
            "one-piece"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristband",
          "details": [
            "on left wrist"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.9
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": [
        "obs_objects_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_008"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_objects_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_subject_001"
      ]
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
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001",
        "obs_card_ui_supporter_001",
        "obs_card_ui_type_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [
        "obs_card_ui_set_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
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
        "fighting stance woman",
        "orange hair ponytail woman",
        "navy blue swimsuit woman",
        "indoor pool background"
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "term": "fighting stance woman",
      "supporting_observation_ids": [
        "obs_pose_001"
      ]
    },
    {
      "term": "orange hair ponytail woman",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "navy blue swimsuit woman",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "indoor pool background",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "exposed midriff",
        "source_observation_ids": [
          "obs_human_body_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "fighting stance",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
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
        "concept": "left arm forward",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right arm back",
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
        "confidence": 0.98
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-109 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.96`
- Cost USD: `0.0091476`
- Artwork observations: `7`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `5`
- Derived digest: Fact digest. Scene subjects: Gladion. Semantic facts: right hand extended forward, left hand open, stormy sky.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: not_applicable.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human male figure | human male figure | scene_subject | foreground | primary | 0.99 |
| blond hair with long bangs and a ponytail | blond hair | object | foreground | primary | 0.98 |
| male face with green eyes and serious expression | human male face | object | foreground | primary | 0.98 |
| wearing black hoodie with red and white design | human upper body clothing | object | foreground | primary | 0.97 |
| left hand open, right hand pointing forward | human hands | object | foreground | primary | 0.97 |
| red shoulder bag with circular button | red shoulder bag | object | foreground | secondary | 0.95 |
| stormy cloudy sky with green leaves blowing | stormy sky with leaves | environment | background | secondary | 0.96 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese: グラジオの決戦 | card_ui_text | top_left | fully_visible | 1 |
| top left category text in Japanese: サポート (Support) | card_ui_text | top_left | fully_visible | 1 |
| top right category text in Japanese: トレーナーズ (Trainers) | card_ui_text | top_right | fully_visible | 1 |
| bottom text block with ability or effect description in Japanese | card_ui_text | bottom | fully_visible | 0.98 |
| copyright text at bottom: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | card_ui_text | bottom | fully_visible | 1 |
| illustrator credit: illus. akagi | card_ui_text | bottom_left | fully_visible | 1 |
| set identifier and card number: J M5 109/081 SR | card_ui_text | bottom_right | fully_visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject kind | obs_subject_001 | 0.99 |
| fact_subject_002 | subjects | identity | obs_subject_001 | 0.9 |
| fact_hair_001 | human_appearance | label | obs_hair_001 | 0.98 |
| fact_face_001 | human_appearance | face visibility | obs_human_face_001 | 0.99 |
| fact_face_002 | human_appearance | eye color | obs_human_face_001 | 0.98 |
| fact_face_003 | human_appearance | mouth expression | obs_human_face_001 | 0.96 |
| fact_clothing_001 | clothing | garment | obs_human_upper_body_001 | 0.97 |
| fact_clothing_002 | clothing | sleeve type | obs_human_upper_body_001 | 0.97 |
| fact_clothing_003 | clothing | accessory label | obs_bag_001 | 0.95 |
| fact_pose_001 | creature_anatomy | right hand extended forward | obs_hands_001 | 0.97 |
| fact_pose_002 | creature_anatomy | left hand open | obs_hands_001 | 0.97 |
| fact_environment_001 | environment | sky condition | obs_background_001 | 0.96 |
| fact_environment_002 | environment | environment leaves are blown by wind | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_001 | card name text | obs_card_ui_001 | 1 |
| fact_card_ui_002 | copyright text | obs_card_ui_005 | 1 |
| fact_card_ui_003 | illustrator credit | obs_card_ui_006 | 1 |
| fact_card_ui_004 | set code and card number | obs_card_ui_007 | 1 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_001",
    "fact_card_ui_002",
    "fact_card_ui_003",
    "fact_card_ui_004"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_007"
  ],
  "set_symbol_observation_ids": [],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_card_ui_005"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_004"
  ],
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
| human_appearance | complete | none | high |  |
| creature_anatomy | complete | none | high |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | not_applicable | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_pose_001 | action | right hand extended forward | obs_subject_001 | obs_hands_001 | right hand extended forward | 0.97 |
| semfact_pose_002 | action | left hand open | obs_subject_001 | obs_hands_001 | left hand open | 0.97 |
| semfact_environment_001 | environment | stormy sky |  | obs_background_001 | blowing leaves green leaves blown by wind stormy cloudy sky | 0.96 |

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
| stormy sky | obs_background_001 |
| blond hair ponytail | obs_hair_001 |
| black hoodie | obs_human_upper_body_001 |
| red shoulder bag | obs_bag_001 |
| green eyes | obs_human_face_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_bag_001 | deterministic_rule | 0.92 |
| frontal orientation | obs_hands_001, obs_subject_001 | deterministic_rule | 0.97 |
| left hand open | obs_hands_001, obs_subject_001 | deterministic_rule | 0.97 |
| right hand extended forward | obs_hands_001, obs_subject_001 | deterministic_rule | 0.97 |
| sky | obs_background_001 | deterministic_rule | 0.96 |
| stormy sky | obs_background_001 | deterministic_rule | 0.96 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: Gladion. Semantic facts: right hand extended forward, left hand open, stormy sky.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human male figure",
      "normalized_label": "human male figure",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "object",
      "label": "blond hair with long bangs and a ponytail",
      "normalized_label": "blond hair",
      "scene_layer": "foreground",
      "frame_position": "center_head",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_face_001",
      "kind": "object",
      "label": "male face with green eyes and serious expression",
      "normalized_label": "human male face",
      "scene_layer": "foreground",
      "frame_position": "center_head",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_human_upper_body_001",
      "kind": "object",
      "label": "wearing black hoodie with red and white design",
      "normalized_label": "human upper body clothing",
      "scene_layer": "foreground",
      "frame_position": "center_upper_body",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hands_001",
      "kind": "object",
      "label": "left hand open, right hand pointing forward",
      "normalized_label": "human hands",
      "scene_layer": "foreground",
      "frame_position": "center_hands",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bag_001",
      "kind": "object",
      "label": "red shoulder bag with circular button",
      "normalized_label": "red shoulder bag",
      "scene_layer": "foreground",
      "frame_position": "lower_center",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "stormy cloudy sky with green leaves blowing",
      "normalized_label": "stormy sky with leaves",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese: グラジオの決戦",
      "normalized_label": "card name text",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "top left category text in Japanese: サポート (Support)",
      "normalized_label": "card category text",
      "scene_layer": "interface",
      "frame_position": "top_left",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "top right category text in Japanese: トレーナーズ (Trainers)",
      "normalized_label": "card category text",
      "scene_layer": "interface",
      "frame_position": "top_right",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "bottom text block with ability or effect description in Japanese",
      "normalized_label": "ability text",
      "scene_layer": "interface",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "copyright text at bottom: ©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright text",
      "scene_layer": "interface",
      "frame_position": "bottom",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "illustrator credit: illus. akagi",
      "normalized_label": "illustrator text",
      "scene_layer": "interface",
      "frame_position": "bottom_left",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "set identifier and card number: J M5 109/081 SR",
      "normalized_label": "set code and card number",
      "scene_layer": "interface",
      "frame_position": "bottom_right",
      "visibility": "fully_visible",
      "salience": "secondary",
      "confidence": 1,
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
      "value": "Gladion",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "fact_id": "fact_hair_001",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "label",
      "value": "blond hair with long bangs and ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "visible_body_regions.face",
      "claim": "face visibility",
      "value": "fully visible",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_002",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "eye color",
      "value": "green",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_003",
      "module": "human_appearance",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth expression",
      "value": "neutral or",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment",
      "value": "black hoodie with red and white design",
      "supporting_observation_ids": [
        "obs_human_upper_body_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[0].sleeve_type",
      "claim": "sleeve type",
      "value": "long sleeves",
      "supporting_observation_ids": [
        "obs_human_upper_body_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_003",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "accessory label",
      "value": "red shoulder bag with button",
      "supporting_observation_ids": [
        "obs_bag_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_001",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "right hand extended forward",
      "value": "true",
      "supporting_observation_ids": [
        "obs_hands_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_pose_002",
      "module": "creature_anatomy",
      "field_path": "pose_orientation",
      "claim": "left hand open",
      "value": "true",
      "supporting_observation_ids": [
        "obs_hands_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "sky condition",
      "value": "stormy cloudy sky",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "environment.plants",
      "claim": "environment leaves are blown by wind",
      "value": "true",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text",
      "value": "グラジオの決戦 (Gladion's Final Battle in Japanese)",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "copyright text",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text_observation_ids",
      "claim": "illustrator credit",
      "value": "illus. akagi",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids",
      "claim": "set code and card number",
      "value": "J M5 109/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "Gladion",
      "identity_confidence": 0.9,
      "anatomy": [
        "face",
        "hands"
      ],
      "physical_features": [
        "blond hair with ponytail",
        "green eyes"
      ],
      "pose": [
        "left hand open",
        "right hand extended forward"
      ],
      "orientation": "frontal",
      "action_state": [],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "neutral",
        "eyebrows": "frowning",
        "face_position": "centered",
        "other_visible_evidence": [
          ""
        ]
      },
      "clothing_or_accessories": [
        "black hoodie long sleeves",
        "red shoulder bag"
      ],
      "colors": [
        "black",
        "blond",
        "red",
        "white"
      ],
      "visibility": "fully_visible"
    }
  ],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_bag_001",
      "obs_hair_001",
      "obs_hands_001",
      "obs_human_face_001",
      "obs_human_upper_body_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "stormy sky"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "stormy cloudy sky"
    ],
    "ground": [],
    "terrain": [],
    "plants": [
      "green leaves blown by wind"
    ],
    "architecture": [],
    "water": [],
    "weather": [
      "stormy"
    ],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_bag_001",
      "label": "red shoulder bag with circular button",
      "normalized_label": "red shoulder bag",
      "object_type": "bag",
      "colors": [
        "red",
        "white"
      ],
      "material_appearance": [],
      "location": "left hip area",
      "count_reference": "",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blond",
      "green",
      "red",
      "white"
    ],
    "lighting": [
      "diffuse natural lighting"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "hair highlight"
    ],
    "composition": [
      "centered human figure portrait",
      "upper body focus"
    ],
    "camera_angle": "eye-level",
    "framing": "medium close-up",
    "cropping": [
      "full body upper half included"
    ],
    "depth": "shallow depth of field",
    "motion_cues": [
      "leaves blowing"
    ],
    "motifs": [
      "stormy outdoor atmosphere"
    ],
    "repeated_shapes": [
      "rounded bag button"
    ],
    "style_cues": [
      "sharp anime-style line art"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_bag_001",
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
    "objects_and_props_review": "observed",
    "relationships_review": "none_visible",
    "visual_design_review": "observed",
    "surface_and_scan_cues_review": "not_applicable"
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
        "fact_face_003",
        "fact_hair_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "fully_visible",
          "details": [
            "green eyes",
            "neutral mouth expression"
          ],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "centered",
          "eyes": "open",
          "mouth": "neutral",
          "eyebrows": "frowning",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_human_face_001"
          ],
          "confidence": 0.96
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blond hair with long bangs and ponytail",
          "details": [],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "gestures": [],
      "accessories": []
    },
    "creature_anatomy": {
      "fact_ids": [
        "fact_pose_001",
        "fact_pose_002"
      ],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "left hand open",
            "right hand extended forward"
          ],
          "orientation": "frontal",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_hands_001"
          ],
          "confidence": 0.97
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
          "body_area": "upper body",
          "garment": "black hoodie with red and white design",
          "neckline_type": "hooded neckline",
          "sleeve_type": "long sleeves",
          "colors": [
            "black",
            "red",
            "white"
          ],
          "visible_details": [
            "red and white large graphic design on chest"
          ],
          "supporting_observation_ids": [
            "obs_human_upper_body_001"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "red shoulder bag with circular button",
          "details": [
            "shoulder strap visible"
          ],
          "supporting_observation_ids": [
            "obs_bag_001"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [],
      "object_observation_ids": [
        "obs_bag_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001",
        "fact_environment_002"
      ],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_subject_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_001",
        "fact_card_ui_002",
        "fact_card_ui_003",
        "fact_card_ui_004"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_007"
      ],
      "set_symbol_observation_ids": [],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_card_ui_005"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_004"
      ],
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
        "stormy sky",
        "blond hair ponytail",
        "black hoodie",
        "red shoulder bag",
        "green eyes"
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
      "review_status": "complete",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_pose_001",
      "category": "action",
      "label": "right hand extended forward",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hands_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "right hand extended forward"
        ],
        "body_position": [],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_pose_002",
      "category": "action",
      "label": "left hand open",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hands_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "left hand open"
        ],
        "body_position": [],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.97,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_environment_001",
      "category": "environment",
      "label": "stormy sky",
      "subject_observation_id": "",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [
          "blowing leaves"
        ],
        "environment": [
          "green leaves blown by wind",
          "stormy cloudy sky"
        ],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.96,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "stormy sky",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    },
    {
      "term": "blond hair ponytail",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "black hoodie",
      "supporting_observation_ids": [
        "obs_human_upper_body_001"
      ]
    },
    {
      "term": "red shoulder bag",
      "supporting_observation_ids": [
        "obs_bag_001"
      ]
    },
    {
      "term": "green eyes",
      "supporting_observation_ids": [
        "obs_human_face_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_bag_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "frontal orientation",
        "source_observation_ids": [
          "obs_hands_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "left hand open",
        "source_observation_ids": [
          "obs_hands_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "right hand extended forward",
        "source_observation_ids": [
          "obs_hands_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.97
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "stormy sky",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-117 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.92`
- Cost USD: `0.010316`
- Artwork observations: `11`
- Card UI / print-marker observations: `6`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: human female character. Visible observations: human female, long purple hair, face, purple eyes, neutral mouth, blue long sleeve shirt, dark blue, yellow glove. Semantic facts: left arm extended forward, left hand visible with fingers extended.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human female character | human female | scene_subject | foreground | high | 0.99 |
| long purple hair with swirl shapes | long purple hair | hair | foreground | high | 0.98 |
| visible face with pale skin | face | face | foreground | high | 0.99 |
| purple eyes with highlights | purple eyes | eye | foreground | high | 0.97 |
| neutral mouth expression | neutral mouth | mouth | foreground | high | 0.95 |
| blue long sleeve garment | blue long sleeve shirt | clothing | foreground | high | 0.96 |
| dark blue clothing color | dark blue | color | foreground | high | 0.95 |
| yellow glove on left hand | yellow glove | clothing | foreground | medium | 0.91 |
| left arm extended forward | left arm extended | body_part | foreground | medium | 0.92 |
| left hand with fingers extended | left hand extended fingers | body_part | foreground | medium | 0.9 |
| bright background with orange, purple, and yellow colors | colorful bright background | environment | background | high | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese 'ムク' | card_ui_text | top left | visible | 0.95 |
| text in Japanese in small font at top left | card_ui_text | top left | visible | 0.9 |
| text in Japanese at top right | card_ui_text | top right | visible | 0.9 |
| text in Japanese near bottom area | card_ui_text | bottom | visible | 0.9 |
| set and number '117/081 SAR' | collector_number | bottom | visible | 0.98 |
| set code 'M5' with 'J' logo | card_ui_text | bottom left | visible | 0.94 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | There is 1 human scene subject | obs_subject_001 | 0.99 |
| fact_hair_color_001 | human_appearance | hair color is purple | obs_hair_001 | 0.98 |
| fact_body_part_left_arm_001 | human_appearance | left arm visible and extended forward | obs_body_part_arm_001 | 0.92 |
| fact_body_part_left_hand_001 | human_appearance | left hand visible with fingers extended | obs_body_part_hand_001 | 0.9 |
| fact_clothing_sleeve_001 | clothing | garment on arms is long sleeve | obs_clothing_sleeve_001 | 0.96 |
| fact_clothing_color_001 | clothing | garment color is dark blue | obs_clothing_color_001 | 0.95 |
| fact_clothing_glove_001 | clothing | yellow glove on left hand | obs_clothing_body_001 | 0.91 |
| fact_face_appearance_001 | human_appearance | face visible with pale skin | obs_face_001 | 0.99 |
| fact_eye_color_001 | human_appearance | eyes are purple with highlights | obs_eyes_001 | 0.97 |
| fact_mouth_expression_001 | human_appearance | mouth shows | obs_mouth_001 | 0.95 |
| fact_environment_001 | environment | background is bright with colorful hues of orange, purple, yellow | obs_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text is in Japanese 'ムク' | obs_print_marker_name_001 | 0.95 |
| fact_card_ui_supporter_001 | supporter card text in Japanese at top left | obs_print_marker_text_top_left_001 | 0.9 |
| fact_card_ui_trainer_001 | trainer text in Japanese at top right | obs_print_marker_text_top_right_001 | 0.9 |
| fact_card_ui_set_number_001 | card set and number '117/081 SAR' | obs_print_marker_set_number_001 | 0.98 |
| fact_card_ui_set_code_001 | set code 'M5' with 'J' logo | obs_print_marker_series_001 | 0.94 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_name_001",
    "fact_card_ui_set_code_001",
    "fact_card_ui_set_number_001",
    "fact_card_ui_supporter_001",
    "fact_card_ui_trainer_001"
  ],
  "name_text_observation_ids": [
    "obs_print_marker_name_001",
    "obs_print_marker_text_top_left_001",
    "obs_print_marker_text_top_right_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_print_marker_set_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_print_marker_series_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_print_marker_text_bottom_001"
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
| human_appearance | complete | low | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | low | high |  |
| objects_and_props | none_visible | none | not_applicable |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | complete | none | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_low_resolution | medium | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_fact_pose_001 | state | left arm extended forward | obs_subject_001 | obs_body_part_arm_001 | face visible left arm extended | 0.92 |
| sem_fact_body_part_001 | state | left hand visible with fingers extended | obs_subject_001 | obs_body_part_hand_001 | left hand visible | 0.9 |

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
| purple hair | obs_hair_001 |
| yellow glove | obs_clothing_body_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_clothing_body_001 | deterministic_rule | 0.91 |
| left arm extended forward | obs_body_part_arm_001 | deterministic_rule | 0.92 |
| left hand visible with fingers extended | obs_body_part_hand_001 | deterministic_rule | 0.9 |
| left orientation | obs_body_part_hand_001 | deterministic_rule | 0.9 |
| reaching | obs_body_part_arm_001, obs_subject_001 | deterministic_rule | 0.99 |
| spiral motif | obs_hair_001 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human female character. Visible observations: human female, long purple hair, face, purple eyes, neutral mouth, blue long sleeve shirt, dark blue, yellow glove. Semantic facts: left arm extended forward, left hand visible with fingers extended.
- Quality flags: `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human female character",
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
      "kind": "hair",
      "label": "long purple hair with swirl shapes",
      "normalized_label": "long purple hair",
      "scene_layer": "foreground",
      "frame_position": "upper center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "face",
      "label": "visible face with pale skin",
      "normalized_label": "face",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_eyes_001",
      "kind": "eye",
      "label": "purple eyes with highlights",
      "normalized_label": "purple eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_mouth_001",
      "kind": "mouth",
      "label": "neutral mouth expression",
      "normalized_label": "neutral mouth",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_sleeve_001",
      "kind": "clothing",
      "label": "blue long sleeve garment",
      "normalized_label": "blue long sleeve shirt",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_color_001",
      "kind": "color",
      "label": "dark blue clothing color",
      "normalized_label": "dark blue",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_body_001",
      "kind": "clothing",
      "label": "yellow glove on left hand",
      "normalized_label": "yellow glove",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_part_arm_001",
      "kind": "body_part",
      "label": "left arm extended forward",
      "normalized_label": "left arm extended",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_part_hand_001",
      "kind": "body_part",
      "label": "left hand with fingers extended",
      "normalized_label": "left hand extended fingers",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "environment",
      "label": "bright background with orange, purple, and yellow colors",
      "normalized_label": "colorful bright background",
      "scene_layer": "background",
      "frame_position": "full frame behind subject",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_print_marker_name_001",
      "kind": "card_ui_text",
      "label": "card name text in Japanese 'ムク'",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_print_marker_text_top_left_001",
      "kind": "card_ui_text",
      "label": "text in Japanese in small font at top left",
      "normalized_label": "supporter text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_print_marker_text_top_right_001",
      "kind": "card_ui_text",
      "label": "text in Japanese at top right",
      "normalized_label": "trainer text",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_print_marker_text_bottom_001",
      "kind": "card_ui_text",
      "label": "text in Japanese near bottom area",
      "normalized_label": "rules text",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_print_marker_set_number_001",
      "kind": "collector_number",
      "label": "set and number '117/081 SAR'",
      "normalized_label": "set number",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_print_marker_series_001",
      "kind": "card_ui_text",
      "label": "set code 'M5' with 'J' logo",
      "normalized_label": "set code",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.94,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0]",
      "claim": "There is 1 human scene subject",
      "value": "1",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_hair_color_001",
      "module": "human_appearance",
      "field_path": "hair[0]",
      "claim": "hair color is purple",
      "value": "purple",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_part_left_arm_001",
      "module": "human_appearance",
      "field_path": "visible_body_regions[0]",
      "claim": "left arm visible and extended forward",
      "value": "visible and extended",
      "supporting_observation_ids": [
        "obs_body_part_arm_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_body_part_left_hand_001",
      "module": "human_appearance",
      "field_path": "visible_body_regions[1]",
      "claim": "left hand visible with fingers extended",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_body_part_hand_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_sleeve_001",
      "module": "clothing",
      "field_path": "garments[0]",
      "claim": "garment on arms is long sleeve",
      "value": "long sleeve",
      "supporting_observation_ids": [
        "obs_clothing_sleeve_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_color_001",
      "module": "clothing",
      "field_path": "garments[0].colors[0]",
      "claim": "garment color is dark blue",
      "value": "dark blue",
      "supporting_observation_ids": [
        "obs_clothing_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_glove_001",
      "module": "clothing",
      "field_path": "accessories[0]",
      "claim": "yellow glove on left hand",
      "value": "yellow glove",
      "supporting_observation_ids": [
        "obs_clothing_body_001"
      ],
      "confidence": 0.91,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_appearance_001",
      "module": "human_appearance",
      "field_path": "visible_body_regions[2]",
      "claim": "face visible with pale skin",
      "value": "pale skin",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_eye_color_001",
      "module": "human_appearance",
      "field_path": "facial_evidence.eyes",
      "claim": "eyes are purple with highlights",
      "value": "purple eyes",
      "supporting_observation_ids": [
        "obs_eyes_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_mouth_expression_001",
      "module": "human_appearance",
      "field_path": "facial_evidence.mouth",
      "claim": "mouth shows",
      "value": "neutral mouth",
      "supporting_observation_ids": [
        "obs_mouth_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "environment.setting[0]",
      "claim": "background is bright with colorful hues of orange, purple, yellow",
      "value": "colorful bright background",
      "supporting_observation_ids": [
        "obs_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[0]",
      "claim": "card name text is in Japanese 'ムク'",
      "value": "ムク",
      "supporting_observation_ids": [
        "obs_print_marker_name_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_supporter_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[1]",
      "claim": "supporter card text in Japanese at top left",
      "value": "サポート",
      "supporting_observation_ids": [
        "obs_print_marker_text_top_left_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_trainer_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids[2]",
      "claim": "trainer text in Japanese at top right",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_print_marker_text_top_right_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_number_001",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number_observation_ids[0]",
      "claim": "card set and number '117/081 SAR'",
      "value": "117/081 SAR",
      "supporting_observation_ids": [
        "obs_print_marker_set_number_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_code_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids[0]",
      "claim": "set code 'M5' with 'J' logo",
      "value": "M5 J",
      "supporting_observation_ids": [
        "obs_print_marker_series_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human female character",
      "identity_confidence": 0.99,
      "anatomy": [
        "face",
        "head",
        "left arm",
        "left hand"
      ],
      "physical_features": [
        "pale skin",
        "purple hair"
      ],
      "pose": [
        "reaching"
      ],
      "orientation": "forward",
      "action_state": [
        "still"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "neutral",
        "eyebrows": "visible",
        "face_position": "center",
        "other_visible_evidence": [
          "face is visible"
        ]
      },
      "clothing_or_accessories": [
        "blue long sleeve garment",
        "yellow glove"
      ],
      "colors": [
        "blue",
        "purple",
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
      "obs_body_part_arm_001",
      "obs_body_part_hand_001",
      "obs_clothing_body_001",
      "obs_clothing_color_001",
      "obs_clothing_sleeve_001",
      "obs_eyes_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_mouth_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "colorful bright background"
    ],
    "indoor_outdoor": "uncertain",
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
      "blue",
      "orange",
      "purple",
      "yellow"
    ],
    "lighting": [
      "bright"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights on hair and eyes"
    ],
    "composition": [
      "central composition with subject in center"
    ],
    "camera_angle": "frontal",
    "framing": "centered",
    "cropping": [
      "full body visible"
    ],
    "depth": "shallow depth",
    "motion_cues": [],
    "motifs": [
      "curly hair motif"
    ],
    "repeated_shapes": [
      "swirl shapes in hair"
    ],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_background_001",
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
        "fact_body_part_left_arm_001",
        "fact_body_part_left_hand_001",
        "fact_eye_color_001",
        "fact_face_appearance_001",
        "fact_hair_color_001",
        "fact_mouth_expression_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "left arm",
          "visibility": "visible",
          "details": [
            "extended forward"
          ],
          "supporting_observation_ids": [
            "obs_body_part_arm_001"
          ],
          "confidence": 0.92
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "left hand",
          "visibility": "visible",
          "details": [
            "fingers extended"
          ],
          "supporting_observation_ids": [
            "obs_body_part_hand_001"
          ],
          "confidence": 0.9
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "pale skin"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.99
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "center",
          "eyes": "purple eyes",
          "mouth": "neutral",
          "eyebrows": "visible",
          "other_visible_evidence": [
            "face visible"
          ],
          "supporting_observation_ids": [
            "obs_eyes_001",
            "obs_face_001",
            "obs_mouth_001"
          ],
          "confidence": 0.96
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "purple hair",
          "details": [
            "curly swirl shapes",
            "long"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
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
      "fact_ids": [
        "fact_clothing_color_001",
        "fact_clothing_glove_001",
        "fact_clothing_sleeve_001"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "arms",
          "garment": "long sleeve shirt",
          "neckline_type": "",
          "sleeve_type": "long sleeve",
          "colors": [
            "dark blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_color_001",
            "obs_clothing_sleeve_001"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "yellow glove",
          "details": [],
          "supporting_observation_ids": [
            "obs_clothing_body_001"
          ],
          "confidence": 0.91
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
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_subject_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_hair_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_name_001",
        "fact_card_ui_set_code_001",
        "fact_card_ui_set_number_001",
        "fact_card_ui_supporter_001",
        "fact_card_ui_trainer_001"
      ],
      "name_text_observation_ids": [
        "obs_print_marker_name_001",
        "obs_print_marker_text_top_left_001",
        "obs_print_marker_text_top_right_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_print_marker_set_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_print_marker_series_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_print_marker_text_bottom_001"
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
      "fact_ids": [],
      "terms": [
        "purple hair",
        "yellow glove"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
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
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_fact_pose_001",
      "category": "state",
      "label": "left arm extended forward",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_body_part_arm_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [
          "face visible"
        ],
        "body_language": [
          "left arm extended"
        ],
        "body_position": [],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.92,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "sem_fact_body_part_001",
      "category": "state",
      "label": "left hand visible with fingers extended",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_body_part_hand_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "left hand visible"
        ],
        "body_position": [],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.9,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "purple hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "yellow glove",
      "supporting_observation_ids": [
        "obs_clothing_body_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_clothing_body_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.91
      },
      {
        "concept": "left arm extended forward",
        "source_observation_ids": [
          "obs_body_part_arm_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "left hand visible with fingers extended",
        "source_observation_ids": [
          "obs_body_part_hand_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_body_part_hand_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_body_part_arm_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_hair_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-116 - Gladion's Final Battle

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.96`
- Attribute confidence: `0.95`
- Cost USD: `0.0111304`
- Artwork observations: `11`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: human male trainer standing. Visible observations: human male subject standing, blonde medium straight hair, side profile face with yellow eyes, black jacket with purple and red accents, black pants, right hand showing three fingers near face gesture, left hand on stomach, brown shoulder bag with red strap. Semantic facts: standing, right hand showing three fingers near face.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| human male subject, standing side view, facing right | human male subject standing | scene_subject | foreground | high | 0.99 |
| straight blonde hair, medium length with prominent strand falling forward | blonde medium straight hair | human_appearance | foreground | high | 0.98 |
| face visible, side profile, sharp features, open visible eyes with yellow irises | side profile face with yellow eyes | human_appearance | foreground | high | 0.97 |
| black long-sleeved jacket with purple and red accents and wide collar, high neckline | black jacket with purple and red accents | clothing | foreground | high | 0.96 |
| black pants | black pants | clothing | foreground | medium | 0.95 |
| right hand raised near face making hand gesture with three fingers extended | right hand showing three fingers near face gesture | human_appearance | foreground | high | 0.94 |
| left hand resting on stomach area | left hand on stomach | human_appearance | foreground | high | 0.93 |
| brown shoulder bag with reddish strap | brown shoulder bag with red strap | objects_and_props | foreground | medium | 0.95 |
| blue sky with white clouds and bright sun to left top | bright sky with white clouds and sun | environment | background | medium | 0.96 |
| mountain and rocky terrain in lower background | mountain terrain background | environment | background | medium | 0.95 |
| shiny pink-purple light streaks across whole image diagonally | pink-purple light streaks | visual_effects | foreground | medium | 0.92 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text in Japanese at top left | card_ui_and_print_markers | top left | visible | 0.98 |
| card type text 'トレーナーズ' at top right | card_ui_and_print_markers | top right | visible | 0.98 |
| Japanese text with rules and description mid card bottom | card_ui_and_print_markers | mid bottom | visible | 0.95 |
| set symbol and number 'J M5 116/081 SAR' at bottom left | card_ui_and_print_markers | bottom left | visible | 0.98 |
| copyright and credits text at bottom | card_ui_and_print_markers | bottom | visible | 0.96 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_subject_001 | subjects | subject identity | obs_subject_001 | 0.99 |
| fact_hair_001 | human_appearance | hair label | obs_hair_001 | 0.98 |
| fact_face_001 | human_appearance | eye color and openness | obs_face_001 | 0.97 |
| fact_clothing_001 | clothing | main garment | obs_clothing_001 | 0.96 |
| fact_clothing_002 | clothing | bottom garment | obs_clothing_002 | 0.95 |
| fact_gesture_001 | human_appearance | right hand gesture | obs_hands_001 | 0.94 |
| fact_gesture_002 | human_appearance | left hand position | obs_hands_002 | 0.93 |
| fact_object_001 | objects_and_props | accessory | obs_object_001 | 0.95 |
| fact_environment_001 | environment | environment setting | obs_environment_001 | 0.96 |
| fact_environment_002 | environment | terrain setting | obs_environment_002 | 0.95 |
| fact_visual_effects_001 | visual_effects | visual effect | obs_effects_001 | 0.92 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_card_ui_name_001 | card name text presence | obs_ui_name_001 | 0.98 |
| fact_card_ui_trainer_001 | card type text presence | obs_ui_trainer_001 | 0.98 |
| fact_card_ui_rules_001 | card rules text | obs_ui_text_001 | 0.95 |
| fact_card_ui_set_symbol_001 | set symbol and number visible | obs_ui_set_symbol_001 | 0.98 |
| fact_card_ui_copyright_001 | copyright and credits text | obs_ui_copyright_001 | 0.96 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_card_ui_copyright_001",
    "fact_card_ui_name_001",
    "fact_card_ui_rules_001",
    "fact_card_ui_set_symbol_001",
    "fact_card_ui_trainer_001"
  ],
  "name_text_observation_ids": [
    "obs_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_ui_set_symbol_001"
  ],
  "set_symbol_observation_ids": [
    "obs_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_ui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_ui_text_001",
    "obs_ui_trainer_001"
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
| creature_anatomy | not_applicable | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | none | high |  |
| environment | complete | none | high |  |
| composition | complete | none | high |  |
| color_and_light | likely_complete | low | medium |  |
| visual_effects | complete | none | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | partial_due_to_crop | medium | medium |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| semfact_pose_001 | action | standing | obs_subject_001 | obs_subject_001 | upright body posture standing | 0.99 |
| semfact_hands_gesture_001 | action | right hand showing three fingers near face | obs_subject_001 | obs_hands_001 | three fingers extended hand raised near face | 0.94 |

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
| human male trainer | obs_subject_001 |
| blonde hair | obs_hair_001 |
| black jacket | obs_clothing_001 |
| shoulder bag | obs_object_001 |
| mountain background | obs_environment_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| cloud | obs_environment_001 | deterministic_rule | 0.96 |
| diagonal composition | obs_effects_001 | deterministic_rule | 0.92 |
| left orientation | obs_hands_002 | deterministic_rule | 0.93 |
| right hand showing three fingers near face | obs_hands_001 | deterministic_rule | 0.94 |
| right orientation | obs_hands_001, obs_subject_001 | deterministic_rule | 0.99 |
| sky | obs_environment_001 | deterministic_rule | 0.96 |
| standing | obs_subject_001 | deterministic_rule | 0.99 |
| terrain | obs_environment_002 | deterministic_rule | 0.95 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: human male trainer standing. Visible observations: human male subject standing, blonde medium straight hair, side profile face with yellow eyes, black jacket with purple and red accents, black pants, right hand showing three fingers near face gesture, left hand on stomach, brown shoulder bag with red strap. Semantic facts: standing, right hand showing three fingers near face.
- Quality flags: `potential_module_incomplete_or_low_evidence`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "human male subject, standing side view, facing right",
      "normalized_label": "human male subject standing",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "straight blonde hair, medium length with prominent strand falling forward",
      "normalized_label": "blonde medium straight hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "face visible, side profile, sharp features, open visible eyes with yellow irises",
      "normalized_label": "side profile face with yellow eyes",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "clothing",
      "label": "black long-sleeved jacket with purple and red accents and wide collar, high neckline",
      "normalized_label": "black jacket with purple and red accents",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "clothing",
      "label": "black pants",
      "normalized_label": "black pants",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hands_001",
      "kind": "human_appearance",
      "label": "right hand raised near face making hand gesture with three fingers extended",
      "normalized_label": "right hand showing three fingers near face gesture",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hands_002",
      "kind": "human_appearance",
      "label": "left hand resting on stomach area",
      "normalized_label": "left hand on stomach",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_001",
      "kind": "objects_and_props",
      "label": "brown shoulder bag with reddish strap",
      "normalized_label": "brown shoulder bag with red strap",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "blue sky with white clouds and bright sun to left top",
      "normalized_label": "bright sky with white clouds and sun",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "mountain and rocky terrain in lower background",
      "normalized_label": "mountain terrain background",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_effects_001",
      "kind": "visual_effects",
      "label": "shiny pink-purple light streaks across whole image diagonally",
      "normalized_label": "pink-purple light streaks",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_name_001",
      "kind": "card_ui_and_print_markers",
      "label": "card name text in Japanese at top left",
      "normalized_label": "card name text Japanese",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_trainer_001",
      "kind": "card_ui_and_print_markers",
      "label": "card type text 'トレーナーズ' at top right",
      "normalized_label": "card type Trainer text",
      "scene_layer": "ui",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_text_001",
      "kind": "card_ui_and_print_markers",
      "label": "Japanese text with rules and description mid card bottom",
      "normalized_label": "card rules text",
      "scene_layer": "ui",
      "frame_position": "mid bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_set_symbol_001",
      "kind": "card_ui_and_print_markers",
      "label": "set symbol and number 'J M5 116/081 SAR' at bottom left",
      "normalized_label": "set symbol and number",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ui_copyright_001",
      "kind": "card_ui_and_print_markers",
      "label": "copyright and credits text at bottom",
      "normalized_label": "copyright and credits text",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "low",
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_subject_001",
      "module": "subjects",
      "field_path": "subjects[0].identity",
      "claim": "subject identity",
      "value": "human male trainer standing",
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
      "claim": "hair label",
      "value": "blonde straight medium-length hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_face_001",
      "module": "human_appearance",
      "field_path": "facial_evidence[0].eyes",
      "claim": "eye color and openness",
      "value": "yellow open eyes",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_001",
      "module": "clothing",
      "field_path": "garments[0].garment",
      "claim": "main garment",
      "value": "long-sleeved black jacket with purple and red accents",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_clothing_002",
      "module": "clothing",
      "field_path": "garments[1].garment",
      "claim": "bottom garment",
      "value": "black pants",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_gesture_001",
      "module": "human_appearance",
      "field_path": "gestures[0].label",
      "claim": "right hand gesture",
      "value": "three fingers extended near face",
      "supporting_observation_ids": [
        "obs_hands_001"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_gesture_002",
      "module": "human_appearance",
      "field_path": "gestures[1].label",
      "claim": "left hand position",
      "value": "left hand on stomach",
      "supporting_observation_ids": [
        "obs_hands_002"
      ],
      "confidence": 0.93,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_object_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0].label",
      "claim": "accessory",
      "value": "brown shoulder bag with reddish strap",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "environment setting",
      "value": "bright sky with white clouds and sun",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_environment_002",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain setting",
      "value": "mountainous rocky terrain background",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_visual_effects_001",
      "module": "visual_effects",
      "field_path": "effects[0].label",
      "claim": "visual effect",
      "value": "pink-purple diagonal light streaks",
      "supporting_observation_ids": [
        "obs_effects_001"
      ],
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_name_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text_observation_ids",
      "claim": "card name text presence",
      "value": "Japanese text at top left",
      "supporting_observation_ids": [
        "obs_ui_name_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_trainer_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "card type text presence",
      "value": "Trainer text at top right",
      "supporting_observation_ids": [
        "obs_ui_trainer_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_rules_001",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text_observation_ids",
      "claim": "card rules text",
      "value": "Japanese rules text visible mid card-bottom",
      "supporting_observation_ids": [
        "obs_ui_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_set_symbol_001",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol_observation_ids",
      "claim": "set symbol and number visible",
      "value": "symbol and 116/081 SAR at bottom left",
      "supporting_observation_ids": [
        "obs_ui_set_symbol_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_card_ui_copyright_001",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line_observation_ids",
      "claim": "copyright and credits text",
      "value": "visible copyright text at bottom",
      "supporting_observation_ids": [
        "obs_ui_copyright_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "human male trainer standing",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "feet",
        "hands",
        "head",
        "legs",
        "neck",
        "shoulders",
        "torso"
      ],
      "physical_features": [
        "blonde straight medium-length hair",
        "yellow eyes"
      ],
      "pose": [
        "standing"
      ],
      "orientation": "right",
      "action_state": [
        "making hand gesture with right hand",
        "resting left hand on stomach"
      ],
      "facial_evidence": {
        "eyes": "open",
        "mouth": "closed",
        "eyebrows": "neutral",
        "face_position": "side profile",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black long-sleeved jacket with purple and red accents",
        "black pants",
        "brown shoulder bag"
      ],
      "colors": [
        "black",
        "blonde",
        "brown",
        "purple",
        "red"
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
      "obs_effects_001",
      "obs_face_001",
      "obs_hair_001",
      "obs_hands_001",
      "obs_hands_002",
      "obs_object_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "environment": {
    "setting": [
      "bright sky with white clouds and sun"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky",
      "bright sun",
      "white clouds"
    ],
    "ground": [
      "rocky mountainous terrain"
    ],
    "terrain": [
      "mountainous rocky"
    ],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [
      "daytime"
    ],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "brown shoulder bag with reddish strap",
      "normalized_label": "brown shoulder bag with red strap",
      "object_type": "bag",
      "colors": [
        "brown",
        "red"
      ],
      "material_appearance": [],
      "location": "shoulder and side",
      "count_reference": "",
      "confidence": 0.95
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blonde yellow",
      "blue sky",
      "purple",
      "red",
      "white clouds"
    ],
    "lighting": [
      "bright daylight",
      "sunlight"
    ],
    "shadows": [
      "light shadows on subject"
    ],
    "highlights": [
      "bright highlights on face and hair"
    ],
    "composition": [
      "centered human subject",
      "diagonal light streaks across frame"
    ],
    "camera_angle": "side profile",
    "framing": "mid shot",
    "cropping": [
      "full body visible"
    ],
    "depth": "medium depth",
    "motion_cues": [
      "light diagonal streaks implying motion or energy"
    ],
    "motifs": [
      "sharp angular shapes in lighting"
    ],
    "repeated_shapes": [
      "light streaks"
    ],
    "style_cues": [
      "sharp line art",
      "vivid colors"
    ],
    "supporting_observation_ids": [
      "obs_effects_001",
      "obs_environment_001",
      "obs_environment_002"
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
      "fact_ids": [
        "fact_face_001",
        "fact_gesture_001",
        "fact_gesture_002",
        "fact_hair_001"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "visibility": "visible",
          "details": [
            "blonde straight hair",
            "yellow eyes open"
          ],
          "supporting_observation_ids": [
            "obs_face_001",
            "obs_hair_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "eyes open",
            "mouth closed",
            "side profile visible face"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.97
        },
        {
          "subject_observation_id": "obs_subject_001",
          "region": "arms and hands",
          "visibility": "visible",
          "details": [
            "left hand resting on stomach",
            "right hand fingers extended near face"
          ],
          "supporting_observation_ids": [
            "obs_hands_001",
            "obs_hands_002"
          ],
          "confidence": 0.94
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "side profile",
          "eyes": "open",
          "mouth": "closed",
          "eyebrows": "neutral",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.97
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "blonde straight medium-length hair",
          "details": [
            "medium length",
            "prominent strand forward",
            "straight"
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
          "label": "right hand three fingers extended near face",
          "details": [
            "raised hand gesture"
          ],
          "supporting_observation_ids": [
            "obs_hands_001"
          ],
          "confidence": 0.94
        },
        {
          "subject_observation_id": "obs_subject_001",
          "label": "left hand on stomach",
          "details": [
            "hand resting"
          ],
          "supporting_observation_ids": [
            "obs_hands_002"
          ],
          "confidence": 0.93
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
        "fact_clothing_001",
        "fact_clothing_002"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso and arms",
          "garment": "black long-sleeved jacket with purple and red accents and wide collar",
          "neckline_type": "high",
          "sleeve_type": "long sleeves",
          "colors": [
            "black",
            "purple",
            "red"
          ],
          "visible_details": [
            "wide collar"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.96
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "legs",
          "garment": "black pants",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.95
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "brown shoulder bag with reddish strap",
          "details": [
            "bag strap",
            "shoulder bag"
          ],
          "supporting_observation_ids": [
            "obs_object_001"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_object_001"
      ],
      "object_observation_ids": [
        "obs_object_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_environment_001",
        "fact_environment_002"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_visual_effects_001"
      ],
      "observation_ids": [
        "obs_effects_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_environment_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_visual_effects_001"
      ],
      "observation_ids": [
        "obs_effects_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_card_ui_copyright_001",
        "fact_card_ui_name_001",
        "fact_card_ui_rules_001",
        "fact_card_ui_set_symbol_001",
        "fact_card_ui_trainer_001"
      ],
      "name_text_observation_ids": [
        "obs_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_ui_set_symbol_001"
      ],
      "set_symbol_observation_ids": [
        "obs_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_ui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_ui_text_001",
        "obs_ui_trainer_001"
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
      "fact_ids": [],
      "terms": [
        "human male trainer",
        "blonde hair",
        "black jacket",
        "shoulder bag",
        "mountain background"
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
      "review_status": "not_applicable",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
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
      "evidence_quality": "medium",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "semfact_pose_001",
      "category": "action",
      "label": "standing",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "upright body posture"
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
      "confidence": 0.99,
      "uncertainty": "none"
    },
    {
      "semantic_fact_id": "semfact_hands_gesture_001",
      "category": "action",
      "label": "right hand showing three fingers near face",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_hands_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [
          "three fingers extended"
        ],
        "body_position": [
          "hand raised near face"
        ],
        "motion_state": [],
        "environment": [],
        "objects": [],
        "relationships": [],
        "other": []
      },
      "confidence": 0.94,
      "uncertainty": "none"
    }
  ],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "human male trainer",
      "supporting_observation_ids": [
        "obs_subject_001"
      ]
    },
    {
      "term": "blonde hair",
      "supporting_observation_ids": [
        "obs_hair_001"
      ]
    },
    {
      "term": "black jacket",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "shoulder bag",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "mountain background",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "cloud",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "diagonal composition",
        "source_observation_ids": [
          "obs_effects_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "left orientation",
        "source_observation_ids": [
          "obs_hands_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      },
      {
        "concept": "right hand showing three fingers near face",
        "source_observation_ids": [
          "obs_hands_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_hands_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sky",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-111 - Gwynn

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.97`
- Attribute confidence: `0.96`
- Cost USD: `0.0078292`
- Artwork observations: `7`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Scene subjects: female human. Semantic facts: indoor stone staircase. Counts: female human subject: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human subject | female human | scene_subject | foreground | primary | 0.99 |
| dark purple hair with gradient | dark purple hair | human_appearance | foreground | primary | 0.98 |
| blue and gold ornate hat with black spiral antennae | blue and gold hat with black spirals | objects_and_props | foreground | primary | 0.95 |
| white coat with pointed ends | white coat | human_appearance | foreground | primary | 0.98 |
| black dress with gold and blue belt | black dress with belt | human_appearance | foreground | primary | 0.97 |
| hands clasped together with purple gloves | hands clasped, purple gloves | human_appearance | foreground | primary | 0.96 |
| gray stone stairs and wall background | stone stairs and walls | environment | background | background | 0.98 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | The main illustrated subject is a female human | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | The human subject has dark purple hair with gradient | obs_hair_001 | 0.98 |
| fact_003 | human_appearance | The human subject wears a blue and gold ornate hat with black spiral antennae | obs_accessory_001 | 0.95 |
| fact_004 | clothing | The human subject wears a white coat with pointed ends | obs_clothing_001 | 0.98 |
| fact_005 | clothing | The human subject wears a black dress with a gold and blue belt | obs_clothing_002 | 0.97 |
| fact_006 | human_appearance | The human subject wears purple gloves and has hands clasped together | obs_hand_pose_001 | 0.96 |
| fact_007 | environment | The background environment includes gray stone stairs and stone walls | obs_environment_001 | 0.98 |

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
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | likely_complete | low | medium |  |
| color_and_light | likely_complete | medium | medium |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | partial_due_to_low_resolution | medium | medium | card_ui_and_print_markers.name_text_observation_ids: unable to fully read name text due to low resolution or glare; card_ui_and_print_markers.collector_number_observation_ids: unable to fully read collector number due to low resolution or glare; card_ui_and_print_markers.set_symbol_observation_ids: set symbol partially obscured or in low resolution; card_ui_and_print_markers.rarity_mark_observation_ids: rarity mark not clearly visible due to low resolution; card_ui_and_print_markers.copyright_line_observation_ids: copyright line is partially readable but low resolution; card_ui_and_print_markers.bottom_line_text_observation_ids: bottom line text is partially readable but low resolution; card_ui_and_print_markers.illustrator_text_observation_ids: illustrator text partly unclear or low resolution |
| counts | complete | none | high |  |
| relationships | complete | low | high |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | not_applicable | none | not_applicable |  |
| fact_grounded_search_terms | not_applicable | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| sem_002 | scene_type | indoor stone staircase | obs_environment_001 | obs_environment_001 | indoor stone stairs stone wall | 0.98 |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| female human subject | exact | 1 | obs_subject_001 | 0.99 |

#### Relationships

| Relationship | Source | Target | Evidence |
|---|---|---|---|
| wearing | obs_subject_001 | obs_accessory_001 | strong |

#### Uncertainty And Abstentions

| Field | Reason | Affected observations |
|---|---|---|
| none recorded | | |

#### Search Terms

| Search term | Supporting observations |
|---|---|
| woman with purple hair | obs_hair_001, obs_subject_001 |
| blue and gold spiral hat | obs_accessory_001 |
| white coat | obs_clothing_001 |
| black dress with belt | obs_clothing_002 |
| purple gloves | obs_hand_pose_001 |
| indoor stone staircase | obs_environment_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_subject_001 | deterministic_rule | 0.99 |
| gloves | obs_hand_pose_001 | deterministic_rule | 0.96 |
| hands clasped together in front | obs_subject_001 | deterministic_rule | 0.99 |
| hat | obs_accessory_001 | deterministic_rule | 0.95 |
| indoor stone staircase | obs_environment_001 | deterministic_rule | 0.98 |
| spiral motif | obs_accessory_001 | deterministic_rule | 0.92 |
| stairs | obs_environment_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human. Semantic facts: indoor stone staircase. Counts: female human subject: 1.
- Quality flags: `potential_module_incomplete_or_low_evidence`, `potential_module_review_conflicts_with_entries`, `potential_pose_or_action_without_visible_support`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_subject_001",
      "kind": "scene_subject",
      "label": "female human subject",
      "normalized_label": "female human",
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
      "label": "dark purple hair with gradient",
      "normalized_label": "dark purple hair",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "objects_and_props",
      "label": "blue and gold ornate hat with black spiral antennae",
      "normalized_label": "blue and gold hat with black spirals",
      "scene_layer": "foreground",
      "frame_position": "head",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_001",
      "kind": "human_appearance",
      "label": "white coat with pointed ends",
      "normalized_label": "white coat",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_002",
      "kind": "human_appearance",
      "label": "black dress with gold and blue belt",
      "normalized_label": "black dress with belt",
      "scene_layer": "foreground",
      "frame_position": "body",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hand_pose_001",
      "kind": "human_appearance",
      "label": "hands clasped together with purple gloves",
      "normalized_label": "hands clasped, purple gloves",
      "scene_layer": "foreground",
      "frame_position": "hands",
      "visibility": "visible",
      "salience": "primary",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "gray stone stairs and wall background",
      "normalized_label": "stone stairs and walls",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "scene_subject.identity",
      "claim": "The main illustrated subject is a female human",
      "value": "female human",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair.color",
      "claim": "The human subject has dark purple hair with gradient",
      "value": "dark purple",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "head.accessories",
      "claim": "The human subject wears a blue and gold ornate hat with black spiral antennae",
      "value": "blue and gold hat with black spirals",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "clothing",
      "field_path": "garments.outer_coat",
      "claim": "The human subject wears a white coat with pointed ends",
      "value": "white coat",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments.inner_dress",
      "claim": "The human subject wears a black dress with a gold and blue belt",
      "value": "black dress with belt",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "human_appearance",
      "field_path": "hands.gloves",
      "claim": "The human subject wears purple gloves and has hands clasped together",
      "value": "purple gloves, hands clasped",
      "supporting_observation_ids": [
        "obs_hand_pose_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "environment",
      "field_path": "background.stones_and_stairs",
      "claim": "The background environment includes gray stone stairs and stone walls",
      "value": "stone stairs and walls",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [
    {
      "observation_id": "obs_subject_001",
      "subject_kind": "scene_subject",
      "identity": "female human",
      "identity_confidence": 0.99,
      "anatomy": [
        "arms",
        "face",
        "hands",
        "head",
        "neck",
        "torso"
      ],
      "physical_features": [
        "pale skin",
        "purple eyes"
      ],
      "pose": [
        "hands clasped together in front"
      ],
      "orientation": "forward",
      "action_state": [
        "standing still"
      ],
      "facial_evidence": {
        "eyes": "visible, looking forward",
        "mouth": "neutral, slightly open",
        "eyebrows": "normal",
        "face_position": "fully visible",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black dress with belt",
        "blue and gold hat with black spirals",
        "purple gloves",
        "white coat"
      ],
      "colors": [
        "black",
        "blue",
        "gold",
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
      "count_id": "count_001",
      "normalized_label": "female human subject",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_accessory_001",
      "obs_clothing_001",
      "obs_clothing_002",
      "obs_hair_001",
      "obs_hand_pose_001",
      "obs_subject_001"
    ],
    "midground": [],
    "background": [
      "obs_environment_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor stone staircase"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [
      "stone stairs",
      "stone walls"
    ],
    "plants": [],
    "architecture": [
      "stone stairs",
      "stone wall"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_accessory_001",
      "label": "blue and gold ornate hat with black spiral antennae",
      "normalized_label": "blue and gold hat with black spirals",
      "object_type": "accessory",
      "colors": [
        "black",
        "blue",
        "gold"
      ],
      "material_appearance": [
        "glossy"
      ],
      "location": "head",
      "count_reference": "count_001",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "relationship_id": "rel_001",
      "source_observation_id": "obs_subject_001",
      "target_observation_id": "obs_accessory_001",
      "relationship": "wearing",
      "evidence_strength": "strong"
    }
  ],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "gold",
      "gray",
      "purple",
      "white"
    ],
    "lighting": [
      "soft shadows from above right"
    ],
    "shadows": [
      "shadow cast on stone wall"
    ],
    "highlights": [
      "glossy highlights on hat and gloves"
    ],
    "composition": [
      "centered subject",
      "symmetrical framing by stairs"
    ],
    "camera_angle": "eye-level",
    "framing": "medium close-up",
    "cropping": [
      "full upper body visible"
    ],
    "depth": "medium depth with background stones visible",
    "motion_cues": [],
    "motifs": [
      "swirling spiral hat design"
    ],
    "repeated_shapes": [
      "spiral shapes on hat"
    ],
    "style_cues": [
      "detailed"
    ],
    "supporting_observation_ids": [
      "obs_accessory_001",
      "obs_environment_001",
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
    "objects_and_props_review": "observed",
    "relationships_review": "observed",
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
        "fact_006"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "head",
          "visibility": "visible",
          "details": [
            "face visible",
            "purple hair with gradient"
          ],
          "supporting_observation_ids": [
            "obs_hair_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "fully visible",
          "eyes": "visible, looking forward",
          "mouth": "neutral, slightly open",
          "eyebrows": "normal",
          "other_visible_evidence": [],
          "supporting_observation_ids": [
            "obs_subject_001"
          ],
          "confidence": 0.96
        }
      ],
      "hair": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "dark purple hair with gradient",
          "details": [
            "framing face",
            "shoulder length"
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
          "label": "hands clasped together",
          "details": [
            "wearing purple gloves"
          ],
          "supporting_observation_ids": [
            "obs_hand_pose_001"
          ],
          "confidence": 0.96
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
        "fact_004",
        "fact_005"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "white coat",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "white"
          ],
          "visible_details": [
            "pointed ends"
          ],
          "supporting_observation_ids": [
            "obs_clothing_001"
          ],
          "confidence": 0.98
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "black dress with belt",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "black",
            "blue",
            "gold"
          ],
          "visible_details": [
            "belt with gold gear shaped buckle and vertical blue stripes"
          ],
          "supporting_observation_ids": [
            "obs_clothing_002"
          ],
          "confidence": 0.97
        }
      ],
      "accessories": []
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_003"
      ],
      "object_observation_ids": [
        "obs_accessory_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_007"
      ],
      "observation_ids": [
        "obs_environment_001"
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
        "obs_accessory_001",
        "obs_clothing_001"
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
      "fact_ids": [
        "fact_001"
      ],
      "count_ids": [
        "count_001"
      ]
    },
    "relationships": {
      "fact_ids": [
        "fact_003"
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
        "woman with purple hair",
        "blue and gold spiral hat",
        "white coat",
        "black dress with belt",
        "purple gloves",
        "indoor stone staircase"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "medium",
      "abstentions": []
    },
    {
      "module": "color_and_light",
      "review_status": "likely_complete",
      "omission_risk": "medium",
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
      "review_status": "partial_due_to_low_resolution",
      "omission_risk": "medium",
      "evidence_quality": "medium",
      "abstentions": [
        {
          "field_path": "card_ui_and_print_markers.name_text_observation_ids",
          "reason": "unable to fully read name text due to low resolution or glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "card_ui_and_print_markers.collector_number_observation_ids",
          "reason": "unable to fully read collector number due to low resolution or glare",
          "affected_observation_ids": []
        },
        {
          "field_path": "card_ui_and_print_markers.set_symbol_observation_ids",
          "reason": "set symbol partially obscured or in low resolution",
          "affected_observation_ids": []
        },
        {
          "field_path": "card_ui_and_print_markers.rarity_mark_observation_ids",
          "reason": "rarity mark not clearly visible due to low resolution",
          "affected_observation_ids": []
        },
        {
          "field_path": "card_ui_and_print_markers.copyright_line_observation_ids",
          "reason": "copyright line is partially readable but low resolution",
          "affected_observation_ids": []
        },
        {
          "field_path": "card_ui_and_print_markers.bottom_line_text_observation_ids",
          "reason": "bottom line text is partially readable but low resolution",
          "affected_observation_ids": []
        },
        {
          "field_path": "card_ui_and_print_markers.illustrator_text_observation_ids",
          "reason": "illustrator text partly unclear or low resolution",
          "affected_observation_ids": []
        }
      ]
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
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
      "review_status": "not_applicable",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "sem_002",
      "category": "scene_type",
      "label": "indoor stone staircase",
      "subject_observation_id": "obs_environment_001",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "evidence": {
        "mouth": [],
        "eyes": [],
        "eyebrows": [],
        "facial_features": [],
        "body_language": [],
        "body_position": [],
        "motion_state": [],
        "environment": [
          "indoor",
          "stone stairs",
          "stone wall"
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
      "term": "woman with purple hair",
      "supporting_observation_ids": [
        "obs_hair_001",
        "obs_subject_001"
      ]
    },
    {
      "term": "blue and gold spiral hat",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ]
    },
    {
      "term": "white coat",
      "supporting_observation_ids": [
        "obs_clothing_001"
      ]
    },
    {
      "term": "black dress with belt",
      "supporting_observation_ids": [
        "obs_clothing_002"
      ]
    },
    {
      "term": "purple gloves",
      "supporting_observation_ids": [
        "obs_hand_pose_001"
      ]
    },
    {
      "term": "indoor stone staircase",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "gloves",
        "source_observation_ids": [
          "obs_hand_pose_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.96
      },
      {
        "concept": "hands clasped together in front",
        "source_observation_ids": [
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "hat",
        "source_observation_ids": [
          "obs_accessory_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "indoor stone staircase",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_accessory_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "stairs",
        "source_observation_ids": [
          "obs_environment_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-075 - カスミの元気

- Branch: `trainer`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.98`
- Cost USD: `0.0102116`
- Artwork observations: `10`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Scene subjects: female human trainer. Semantic facts: winking.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| female human trainer | female human trainer | scene_subject | foreground | primary_subject | 0.99 |
| orange hair in two spiked pigtails | orange hair | human_appearance | foreground | primary_subject_feature | 0.99 |
| face with winking eye and smiling mouth | face expression winking and smiling | human_appearance | foreground | primary_subject_feature | 0.98 |
| blue sports crop top sleeveless | blue sleeveless crop top | clothing | foreground | primary_subject_feature | 0.99 |
| blue sports shorts | blue shorts | clothing | foreground | primary_subject_feature | 0.99 |
| black wristbands on both wrists | black wristbands | clothing | foreground | primary_subject_feature | 0.95 |
| standing pose with left arm extended toward viewer, right arm bent back | standing with extended left arm and bent right arm | human_appearance | foreground | primary_subject_pose | 0.99 |
| indoor gym/tile floor with windows letting in light | indoor gym environment | environment | background | background | 0.95 |
| green leafy potted plant on left side | potted plant | environment | background | background | 0.94 |
| blue gym equipment bar in background | gym equipment bar | environment | background | background | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| card name text カスミの元気 | card_ui_text | top left | visible | 0.99 |
| set code m5 in black box | card_ui_symbol | bottom left | visible | 0.99 |
| collector number 075/081 U | card_ui_text | bottom left | visible | 0.99 |
| illustrator text Illus. En Morikura | illustrator_text | bottom left | visible | 0.99 |
| copyright text ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | bottom_line_text | bottom | visible | 0.98 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | subjects | scene subject presence | obs_subject_001 | 0.99 |
| fact_002 | human_appearance | hair color and style | obs_hair_001 | 0.99 |
| fact_003 | human_appearance | face expression | obs_face_001 | 0.98 |
| fact_004 | human_appearance | pose | obs_body_pose_001 | 0.99 |
| fact_005 | clothing | garment type and color | obs_clothing_top_001 | 0.99 |
| fact_006 | clothing | garment type and color | obs_clothing_bottom_001 | 0.99 |
| fact_007 | clothing | accessory color and placement | obs_accessory_001 | 0.95 |
| fact_008 | environment | environment setting | obs_environment_001 | 0.95 |
| fact_009 | environment | plant type | obs_environment_002 | 0.94 |
| fact_010 | environment | gym equipment visible | obs_environment_003 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_011 | card name text visible | obs_card_name_text_001 | 0.99 |
| fact_012 | set code visible | obs_set_code_001 | 0.99 |
| fact_013 | collector number visible | obs_card_number_001 | 0.99 |
| fact_014 | illustrator text visible | obs_illustrator_text_001 | 0.99 |
| fact_015 | copyright line visible | obs_bottom_text_001 | 0.98 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_011",
    "fact_012",
    "fact_013",
    "fact_014",
    "fact_015"
  ],
  "name_text_observation_ids": [
    "obs_card_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_code_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [
    "obs_bottom_text_001"
  ],
  "bottom_line_text_observation_ids": [
    "obs_bottom_text_001"
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
| subjects | complete | none | high |  |
| human_appearance | complete | none | high |  |
| creature_anatomy | none_visible | none | not_applicable |  |
| clothing | complete | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | none | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | not_applicable |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | none_visible | none | not_applicable |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | not_applicable |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| svf_001 | expression | winking | obs_subject_001 | obs_face_001 | smiling mouth left eye winking right eye open visible neutral face frontal left arm extended towards viewer right arm bent back standing pose indoor gym gym equipment bar potted plant | 0.98 |

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
| indoor gym environment | obs_environment_001 |
| potted plant | obs_environment_002 |
| gym equipment bar | obs_environment_003 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| forward orientation | obs_body_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| plant | obs_environment_002 | deterministic_rule | 0.94 |
| reaching | obs_body_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| right arm bent back | obs_body_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| sleeveless clothing | obs_clothing_top_001 | deterministic_rule | 0.99 |
| standing | obs_body_pose_001, obs_subject_001 | deterministic_rule | 0.99 |
| winking | obs_face_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Scene subjects: female human trainer. Semantic facts: winking.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

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
      "salience": "primary_subject",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_hair_001",
      "kind": "human_appearance",
      "label": "orange hair in two spiked pigtails",
      "normalized_label": "orange hair",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_feature",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_face_001",
      "kind": "human_appearance",
      "label": "face with winking eye and smiling mouth",
      "normalized_label": "face expression winking and smiling",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_feature",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_top_001",
      "kind": "clothing",
      "label": "blue sports crop top sleeveless",
      "normalized_label": "blue sleeveless crop top",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_feature",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_clothing_bottom_001",
      "kind": "clothing",
      "label": "blue sports shorts",
      "normalized_label": "blue shorts",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_feature",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_accessory_001",
      "kind": "clothing",
      "label": "black wristbands on both wrists",
      "normalized_label": "black wristbands",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_feature",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_body_pose_001",
      "kind": "human_appearance",
      "label": "standing pose with left arm extended toward viewer, right arm bent back",
      "normalized_label": "standing with extended left arm and bent right arm",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "primary_subject_pose",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_001",
      "kind": "environment",
      "label": "indoor gym/tile floor with windows letting in light",
      "normalized_label": "indoor gym environment",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_002",
      "kind": "environment",
      "label": "green leafy potted plant on left side",
      "normalized_label": "potted plant",
      "scene_layer": "background",
      "frame_position": "left",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_environment_003",
      "kind": "environment",
      "label": "blue gym equipment bar in background",
      "normalized_label": "gym equipment bar",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "background",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_name_text_001",
      "kind": "card_ui_text",
      "label": "card name text カスミの元気",
      "normalized_label": "card name text",
      "scene_layer": "ui",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_code_001",
      "kind": "card_ui_symbol",
      "label": "set code m5 in black box",
      "normalized_label": "set code m5",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "card_ui_text",
      "label": "collector number 075/081 U",
      "normalized_label": "collector number 075/081 U",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "illustrator text Illus. En Morikura",
      "normalized_label": "illustrator text",
      "scene_layer": "ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "ui_element",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bottom_text_001",
      "kind": "bottom_line_text",
      "label": "copyright text ©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "copyright line",
      "scene_layer": "ui",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "ui_element",
      "confidence": 0.98,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "subjects",
      "field_path": "[0]",
      "claim": "scene subject presence",
      "value": "female human trainer present",
      "supporting_observation_ids": [
        "obs_subject_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "human_appearance",
      "field_path": "hair",
      "claim": "hair color and style",
      "value": "orange hair in two spiked pigtails",
      "supporting_observation_ids": [
        "obs_hair_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "human_appearance",
      "field_path": "facial_evidence",
      "claim": "face expression",
      "value": "winking eye and smiling mouth",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "human_appearance",
      "field_path": "pose_orientation",
      "claim": "pose",
      "value": "standing with left arm extended and right arm bent back",
      "supporting_observation_ids": [
        "obs_body_pose_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "clothing",
      "field_path": "garments.top",
      "claim": "garment type and color",
      "value": "blue sleeveless crop top",
      "supporting_observation_ids": [
        "obs_clothing_top_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "clothing",
      "field_path": "garments.bottom",
      "claim": "garment type and color",
      "value": "blue shorts",
      "supporting_observation_ids": [
        "obs_clothing_bottom_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "clothing",
      "field_path": "accessories.wristbands",
      "claim": "accessory color and placement",
      "value": "black wristbands on both wrists",
      "supporting_observation_ids": [
        "obs_accessory_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "environment",
      "field_path": "setting",
      "claim": "environment setting",
      "value": "indoor gym with tile floor and windows",
      "supporting_observation_ids": [
        "obs_environment_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "environment",
      "field_path": "plants",
      "claim": "plant type",
      "value": "green leafy potted plant",
      "supporting_observation_ids": [
        "obs_environment_002"
      ],
      "confidence": 0.94,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "environment",
      "field_path": "objects_and_props",
      "claim": "gym equipment visible",
      "value": "blue gym equipment bar",
      "supporting_observation_ids": [
        "obs_environment_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text visible",
      "value": "カスミの元気",
      "supporting_observation_ids": [
        "obs_card_name_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set code visible",
      "value": "m5",
      "supporting_observation_ids": [
        "obs_set_code_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number visible",
      "value": "075/081 U",
      "supporting_observation_ids": [
        "obs_card_number_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text visible",
      "value": "Illus. En Morikura",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_015",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_bottom_text_001"
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
        "shoulders",
        "upper chest"
      ],
      "physical_features": [
        "orange hair in two spiked pigtails"
      ],
      "pose": [
        "reaching",
        "right arm bent back",
        "standing"
      ],
      "orientation": "forward",
      "action_state": [],
      "facial_evidence": {
        "eyes": "left eye winking, right eye open",
        "mouth": "smiling mouth",
        "eyebrows": "visible neutral",
        "face_position": "frontal",
        "other_visible_evidence": []
      },
      "clothing_or_accessories": [
        "black wristbands both wrists",
        "blue shorts",
        "blue sleeveless crop top"
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
      "obs_accessory_001",
      "obs_body_pose_001",
      "obs_clothing_bottom_001",
      "obs_clothing_top_001",
      "obs_face_001",
      "obs_hair_001",
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
      "indoor gym"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "tile floor"
    ],
    "terrain": [],
    "plants": [
      "potted plant"
    ],
    "architecture": [
      "windows"
    ],
    "water": [],
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
      "label": "blue gym equipment bar",
      "normalized_label": "gym equipment",
      "object_type": "prop",
      "colors": [
        "blue"
      ],
      "material_appearance": [],
      "location": "background",
      "count_reference": "",
      "confidence": 0.9
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "green",
      "orange",
      "white"
    ],
    "lighting": [
      "soft natural lighting from windows"
    ],
    "shadows": [
      "soft shadows under subject"
    ],
    "highlights": [
      "highlight on hair"
    ],
    "composition": [
      "centered subject",
      "indoor gym background"
    ],
    "camera_angle": "eye-level",
    "framing": "medium close-up",
    "cropping": [],
    "depth": "moderate depth with background elements visible",
    "motion_cues": [
      "subject in pose reaching forward"
    ],
    "motifs": [
      "sports fitness theme"
    ],
    "repeated_shapes": [
      "rounded shapes in gym bars"
    ],
    "style_cues": [],
    "supporting_observation_ids": [
      "obs_environment_001",
      "obs_environment_002",
      "obs_environment_003",
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
        "fact_004"
      ],
      "visible_body_regions": [
        {
          "subject_observation_id": "obs_subject_001",
          "region": "face",
          "visibility": "visible",
          "details": [
            "smiling mouth",
            "winking left eye"
          ],
          "supporting_observation_ids": [
            "obs_face_001"
          ],
          "confidence": 0.98
        }
      ],
      "facial_evidence": [
        {
          "subject_observation_id": "obs_subject_001",
          "face_position": "frontal",
          "eyes": "left eye winking, right eye open",
          "mouth": "smiling mouth",
          "eyebrows": "visible neutral",
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
          "label": "orange hair",
          "details": [
            "two spiked pigtails"
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
      "fact_ids": [],
      "body_regions": [],
      "physical_features": [],
      "pose_orientation": [
        {
          "subject_observation_id": "obs_subject_001",
          "pose": [
            "reaching",
            "right arm bent back",
            "standing"
          ],
          "orientation": "forward",
          "action_state": [],
          "supporting_observation_ids": [
            "obs_body_pose_001"
          ],
          "confidence": 0.99
        }
      ],
      "effects": []
    },
    "clothing": {
      "fact_ids": [
        "fact_005",
        "fact_006",
        "fact_007"
      ],
      "garments": [
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "torso",
          "garment": "blue sleeveless crop top",
          "neckline_type": "round neckline",
          "sleeve_type": "sleeveless",
          "colors": [
            "blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_top_001"
          ],
          "confidence": 0.99
        },
        {
          "subject_observation_id": "obs_subject_001",
          "body_area": "lower body",
          "garment": "blue shorts",
          "neckline_type": "",
          "sleeve_type": "",
          "colors": [
            "blue"
          ],
          "visible_details": [],
          "supporting_observation_ids": [
            "obs_clothing_bottom_001"
          ],
          "confidence": 0.99
        }
      ],
      "accessories": [
        {
          "subject_observation_id": "obs_subject_001",
          "label": "black wristbands on both wrists",
          "details": [],
          "supporting_observation_ids": [
            "obs_accessory_001"
          ],
          "confidence": 0.95
        }
      ]
    },
    "objects_and_props": {
      "fact_ids": [
        "fact_010"
      ],
      "object_observation_ids": [
        "obs_environment_003"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_008",
        "fact_009"
      ],
      "observation_ids": [
        "obs_environment_001",
        "obs_environment_002",
        "obs_environment_003"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_004"
      ],
      "observation_ids": [
        "obs_body_pose_001"
      ]
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
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014",
        "fact_015"
      ],
      "name_text_observation_ids": [
        "obs_card_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_code_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [
        "obs_bottom_text_001"
      ],
      "bottom_line_text_observation_ids": [
        "obs_bottom_text_001"
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
        "indoor gym environment",
        "potted plant",
        "gym equipment bar"
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
      "omission_risk": "none",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "not_applicable",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [
    {
      "semantic_fact_id": "svf_001",
      "category": "expression",
      "label": "winking",
      "subject_observation_id": "obs_subject_001",
      "supporting_observation_ids": [
        "obs_face_001"
      ],
      "evidence": {
        "mouth": [
          "smiling mouth"
        ],
        "eyes": [
          "left eye winking",
          "right eye open"
        ],
        "eyebrows": [
          "visible neutral"
        ],
        "facial_features": [
          "face frontal"
        ],
        "body_language": [
          "left arm extended towards viewer",
          "right arm bent back"
        ],
        "body_position": [
          "standing"
        ],
        "motion_state": [
          "pose"
        ],
        "environment": [
          "indoor gym"
        ],
        "objects": [
          "gym equipment bar",
          "potted plant"
        ],
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
      "term": "indoor gym environment",
      "supporting_observation_ids": [
        "obs_environment_001"
      ]
    },
    {
      "term": "potted plant",
      "supporting_observation_ids": [
        "obs_environment_002"
      ]
    },
    {
      "term": "gym equipment bar",
      "supporting_observation_ids": [
        "obs_environment_003"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "forward orientation",
        "source_observation_ids": [
          "obs_body_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_environment_002"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.94
      },
      {
        "concept": "reaching",
        "source_observation_ids": [
          "obs_body_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "right arm bent back",
        "source_observation_ids": [
          "obs_body_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "sleeveless clothing",
        "source_observation_ids": [
          "obs_clothing_top_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "standing",
        "source_observation_ids": [
          "obs_body_pose_001",
          "obs_subject_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "winking",
        "source_observation_ids": [
          "obs_face_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-S6A-100 - Turffield Stadium

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0063368`
- Artwork observations: `10`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. Visible observations: stadium structure, circular green leaf logo, blue sky, trees, water body, stone pathway, bushes, lamp post.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| stadium structure with curved walls | stadium structure | environment_structure | midground | high | 0.99 |
| large green circular logo with white leaf on stadium | circular green leaf logo | environment_object | midground | medium | 0.95 |
| blue sky with white clouds | blue sky | environment_sky | background | medium | 0.95 |
| dense group of green trees | trees | environment_plants | background | medium | 0.95 |
| water body with reflections | water body | environment_water | midground | medium | 0.95 |
| stepped stone pathway with railings | stone pathway | environment_terrain | foreground | medium | 0.92 |
| green bushes | bushes | environment_plants | midground | medium | 0.9 |
| green lamp post | lamp post | environment_object | midground | medium | 0.9 |
| stone paved ground with green patterned carpet | paved ground with green carpet | environment_terrain | foreground | high | 0.95 |
| three rectangular stadium windows | stadium windows | environment_architecture | midground | medium | 0.93 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | setting | obs_repeated_stadium_windows_001, obs_stadium_sign_001, obs_stadium_structure_001 | 0.95 |
| fact_env_002 | environment | sky | obs_sky_001 | 0.95 |
| fact_env_003 | environment | plants | obs_green_bushes_001, obs_trees_001 | 0.95 |
| fact_env_004 | environment | water | obs_river_or_pond_001 | 0.95 |
| fact_env_005 | environment | terrain | obs_ground_001, obs_pathway_001 | 0.95 |
| fact_env_006 | environment | architecture | obs_lamp_post_001, obs_repeated_stadium_windows_001, obs_stadium_structure_001 | 0.95 |

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
| objects_and_props | none_visible | none | high |  |
| environment | complete | none | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | none_visible | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

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
| stadium structure | obs_stadium_structure_001 |
| circular green leaf logo | obs_stadium_sign_001 |
| blue sky | obs_sky_001 |
| trees | obs_trees_001 |
| water body | obs_river_or_pond_001 |
| stone pathway | obs_pathway_001 |
| bushes | obs_green_bushes_001 |
| lamp post | obs_lamp_post_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| building | obs_repeated_stadium_windows_001, obs_stadium_structure_001 | deterministic_rule | 0.99 |
| circular motif | obs_stadium_sign_001 | deterministic_rule | 0.95 |
| plant | obs_green_bushes_001, obs_trees_001 | deterministic_rule | 0.95 |
| sky | obs_sky_001 | deterministic_rule | 0.95 |
| terrain | obs_ground_001, obs_pathway_001 | deterministic_rule | 0.95 |
| tree | obs_trees_001 | deterministic_rule | 0.95 |
| water | obs_river_or_pond_001 | deterministic_rule | 0.95 |
| window | obs_repeated_stadium_windows_001 | deterministic_rule | 0.93 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: stadium structure, circular green leaf logo, blue sky, trees, water body, stone pathway, bushes, lamp post.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_stadium_structure_001",
      "kind": "environment_structure",
      "label": "stadium structure with curved walls",
      "normalized_label": "stadium structure",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_stadium_sign_001",
      "kind": "environment_object",
      "label": "large green circular logo with white leaf on stadium",
      "normalized_label": "circular green leaf logo",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_sky_001",
      "kind": "environment_sky",
      "label": "blue sky with white clouds",
      "normalized_label": "blue sky",
      "scene_layer": "background",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_trees_001",
      "kind": "environment_plants",
      "label": "dense group of green trees",
      "normalized_label": "trees",
      "scene_layer": "background",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_river_or_pond_001",
      "kind": "environment_water",
      "label": "water body with reflections",
      "normalized_label": "water body",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_pathway_001",
      "kind": "environment_terrain",
      "label": "stepped stone pathway with railings",
      "normalized_label": "stone pathway",
      "scene_layer": "foreground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.92,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_green_bushes_001",
      "kind": "environment_plants",
      "label": "green bushes",
      "normalized_label": "bushes",
      "scene_layer": "midground",
      "frame_position": "center-left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_lamp_post_001",
      "kind": "environment_object",
      "label": "green lamp post",
      "normalized_label": "lamp post",
      "scene_layer": "midground",
      "frame_position": "right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_ground_001",
      "kind": "environment_terrain",
      "label": "stone paved ground with green patterned carpet",
      "normalized_label": "paved ground with green carpet",
      "scene_layer": "foreground",
      "frame_position": "bottom",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_repeated_stadium_windows_001",
      "kind": "environment_architecture",
      "label": "three rectangular stadium windows",
      "normalized_label": "stadium windows",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.93,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "setting",
      "value": "outdoor sports stadium",
      "supporting_observation_ids": [
        "obs_repeated_stadium_windows_001",
        "obs_stadium_sign_001",
        "obs_stadium_structure_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_002",
      "module": "environment",
      "field_path": "sky",
      "claim": "sky",
      "value": "blue with white clouds",
      "supporting_observation_ids": [
        "obs_sky_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_003",
      "module": "environment",
      "field_path": "plants",
      "claim": "plants",
      "value": "trees, bushes",
      "supporting_observation_ids": [
        "obs_green_bushes_001",
        "obs_trees_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_004",
      "module": "environment",
      "field_path": "water",
      "claim": "water",
      "value": "pond or river",
      "supporting_observation_ids": [
        "obs_river_or_pond_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_005",
      "module": "environment",
      "field_path": "terrain",
      "claim": "terrain",
      "value": "stone paved ground and stone steps",
      "supporting_observation_ids": [
        "obs_ground_001",
        "obs_pathway_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_006",
      "module": "environment",
      "field_path": "architecture",
      "claim": "architecture",
      "value": "stadium walls, windows, and lamp post",
      "supporting_observation_ids": [
        "obs_lamp_post_001",
        "obs_repeated_stadium_windows_001",
        "obs_stadium_structure_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_ground_001",
      "obs_pathway_001"
    ],
    "midground": [
      "obs_green_bushes_001",
      "obs_lamp_post_001",
      "obs_repeated_stadium_windows_001",
      "obs_river_or_pond_001",
      "obs_stadium_sign_001",
      "obs_stadium_structure_001"
    ],
    "background": [
      "obs_sky_001",
      "obs_trees_001"
    ]
  },
  "environment": {
    "setting": [
      "outdoor sports stadium"
    ],
    "indoor_outdoor": "outdoor",
    "sky": [
      "blue sky with white clouds"
    ],
    "ground": [
      "stone paved ground",
      "stone steps"
    ],
    "terrain": [
      "stone paved ground",
      "stone steps"
    ],
    "plants": [
      "bushes",
      "trees"
    ],
    "architecture": [
      "lamp post",
      "stadium walls",
      "stadium windows"
    ],
    "water": [
      "pond or river"
    ],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_green_bushes_001",
      "obs_ground_001",
      "obs_lamp_post_001",
      "obs_pathway_001",
      "obs_repeated_stadium_windows_001",
      "obs_river_or_pond_001",
      "obs_sky_001",
      "obs_stadium_sign_001",
      "obs_stadium_structure_001",
      "obs_trees_001"
    ]
  },
  "objects_and_props": [],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "brown",
      "gray",
      "green",
      "purple",
      "white"
    ],
    "lighting": [
      "daylight lighting"
    ],
    "shadows": [
      "soft shadows visible"
    ],
    "highlights": [
      "no strong highlights"
    ],
    "composition": [
      "background sky and trees",
      "foreground pathway",
      "midground stadium"
    ],
    "camera_angle": "slightly elevated angle",
    "framing": "centered on stadium facade",
    "cropping": [],
    "depth": "moderate depth with foreground pathway and background trees",
    "motion_cues": [],
    "motifs": [
      "stadium architectural motif"
    ],
    "repeated_shapes": [
      "circular logo",
      "rectangular windows"
    ],
    "style_cues": [
      "detailed digital painting style"
    ],
    "supporting_observation_ids": [
      "obs_ground_001",
      "obs_pathway_001",
      "obs_repeated_stadium_windows_001",
      "obs_sky_001",
      "obs_stadium_sign_001",
      "obs_stadium_structure_001",
      "obs_trees_001"
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
      "fact_ids": [],
      "object_observation_ids": []
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
        "obs_green_bushes_001",
        "obs_ground_001",
        "obs_lamp_post_001",
        "obs_pathway_001",
        "obs_repeated_stadium_windows_001",
        "obs_river_or_pond_001",
        "obs_sky_001",
        "obs_stadium_sign_001",
        "obs_stadium_structure_001",
        "obs_trees_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_pathway_001",
        "obs_sky_001",
        "obs_stadium_structure_001",
        "obs_trees_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_sky_001",
        "obs_stadium_structure_001"
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
        "stadium structure",
        "circular green leaf logo",
        "blue sky",
        "trees",
        "water body",
        "stone pathway",
        "bushes",
        "lamp post"
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
      "review_status": "none_visible",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
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
      "module": "card_ui_and_print_markers",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "counts",
      "review_status": "none_visible",
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
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "term": "circular green leaf logo",
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
      "term": "trees",
      "supporting_observation_ids": [
        "obs_trees_001"
      ]
    },
    {
      "term": "water body",
      "supporting_observation_ids": [
        "obs_river_or_pond_001"
      ]
    },
    {
      "term": "stone pathway",
      "supporting_observation_ids": [
        "obs_pathway_001"
      ]
    },
    {
      "term": "bushes",
      "supporting_observation_ids": [
        "obs_green_bushes_001"
      ]
    },
    {
      "term": "lamp post",
      "supporting_observation_ids": [
        "obs_lamp_post_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "building",
        "source_observation_ids": [
          "obs_repeated_stadium_windows_001",
          "obs_stadium_structure_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      },
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_stadium_sign_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "plant",
        "source_observation_ids": [
          "obs_green_bushes_001",
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
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
        "concept": "terrain",
        "source_observation_ids": [
          "obs_ground_001",
          "obs_pathway_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "tree",
        "source_observation_ids": [
          "obs_trees_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "water",
        "source_observation_ids": [
          "obs_river_or_pond_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "window",
        "source_observation_ids": [
          "obs_repeated_stadium_windows_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.93
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-PMCG6-085 - Cinnabar City Gym

- Branch: `stadium`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.92`
- Cost USD: `0.0071404`
- Artwork observations: `9`
- Card UI / print-marker observations: `0`
- Card UI module evidence references: `0`
- Derived digest: Fact digest. No confident visible fact observations were extracted.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| lava terrain | lava terrain | environment | background | salient | 0.99 |
| rocky cave walls | rocky cave walls | environment | background | salient | 0.95 |
| pool of lava | lava pool | environment | background | salient | 0.98 |
| rectangular volleyball court | volleyball court | objects_and_props | midground | salient | 0.97 |
| volleyball court net | volleyball court net | objects_and_props | midground | salient | 0.9 |
| volleyball court posts | volleyball court posts | objects_and_props | midground | salient | 0.85 |
| bright orange and red lava colors | lava colors | color_and_light | background | salient | 0.99 |
| dark purple cave walls | dark purple | color_and_light | background | salient | 0.98 |
| volleyball court is at a slight 3D angle, pointing upper-right | volleyball court angled top right | composition | foreground | salient | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| none recorded | | | | |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_env_001 | environment | environment setting | obs_env_001, obs_env_002, obs_env_003 | 0.95 |
| fact_objects_001 | objects_and_props | presence of volleyball court | obs_objects_001, obs_objects_002, obs_objects_003 | 0.9 |
| fact_colors_001 | color_and_light | color palette includes bright orange, red, dark purple | obs_colors_001, obs_colors_002 | 0.98 |
| fact_composition_001 | composition | volleyball court orientation | obs_composition_001 | 0.95 |

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
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | none_visible | none | high |  |
| counts | none_visible | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | high |  |

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
| lava terrain | obs_env_001 |
| rocky cave walls | obs_env_002 |
| lava pool | obs_env_003 |
| volleyball court | obs_objects_001 |
| volleyball court net | obs_objects_002 |
| volleyball court posts | obs_objects_003 |
| lava colors | obs_colors_001 |
| dark purple | obs_colors_002 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| right orientation | obs_composition_001 | deterministic_rule | 0.95 |
| terrain | obs_env_001 | deterministic_rule | 0.99 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. No confident visible fact observations were extracted.
- Quality flags: `potential_count_reference_inconsistent`, `potential_module_review_conflicts_with_entries`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_env_001",
      "kind": "environment",
      "label": "lava terrain",
      "normalized_label": "lava terrain",
      "scene_layer": "background",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_002",
      "kind": "environment",
      "label": "rocky cave walls",
      "normalized_label": "rocky cave walls",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_env_003",
      "kind": "environment",
      "label": "pool of lava",
      "normalized_label": "lava pool",
      "scene_layer": "background",
      "frame_position": "midground",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_001",
      "kind": "objects_and_props",
      "label": "rectangular volleyball court",
      "normalized_label": "volleyball court",
      "scene_layer": "midground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_objects_002",
      "kind": "objects_and_props",
      "label": "volleyball court net",
      "normalized_label": "volleyball court net",
      "scene_layer": "midground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_objects_003",
      "kind": "objects_and_props",
      "label": "volleyball court posts",
      "normalized_label": "volleyball court posts",
      "scene_layer": "midground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.85,
      "evidence_strength": "medium"
    },
    {
      "observation_id": "obs_colors_001",
      "kind": "color_and_light",
      "label": "bright orange and red lava colors",
      "normalized_label": "lava colors",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_colors_002",
      "kind": "color_and_light",
      "label": "dark purple cave walls",
      "normalized_label": "dark purple",
      "scene_layer": "background",
      "frame_position": "background",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_composition_001",
      "kind": "composition",
      "label": "volleyball court is at a slight 3D angle, pointing upper-right",
      "normalized_label": "volleyball court angled top right",
      "scene_layer": "foreground",
      "frame_position": "central",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "setting",
      "claim": "environment setting",
      "value": "volcanic interior with lava and rocky walls",
      "supporting_observation_ids": [
        "obs_env_001",
        "obs_env_002",
        "obs_env_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_objects_001",
      "module": "objects_and_props",
      "field_path": "volleyball court",
      "claim": "presence of volleyball court",
      "value": "volleyball court with net and posts",
      "supporting_observation_ids": [
        "obs_objects_001",
        "obs_objects_002",
        "obs_objects_003"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_colors_001",
      "module": "color_and_light",
      "field_path": "palette",
      "claim": "color palette includes bright orange, red, dark purple",
      "value": "lava bright orange and red, cave dark purple",
      "supporting_observation_ids": [
        "obs_colors_001",
        "obs_colors_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_composition_001",
      "module": "composition",
      "field_path": "object orientation",
      "claim": "volleyball court orientation",
      "value": "angled slightly upward to the right",
      "supporting_observation_ids": [
        "obs_composition_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [],
  "scene_layers": {
    "foreground": [
      "obs_composition_001"
    ],
    "midground": [
      "obs_env_003",
      "obs_objects_001",
      "obs_objects_002",
      "obs_objects_003"
    ],
    "background": [
      "obs_colors_001",
      "obs_colors_002",
      "obs_env_001",
      "obs_env_002"
    ]
  },
  "environment": {
    "setting": [
      "lava pool",
      "lava terrain",
      "rocky cave walls",
      "volcanic interior"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [
      "lava pool",
      "lava terrain"
    ],
    "terrain": [
      "lava",
      "rocky",
      "volcanic"
    ],
    "plants": [],
    "architecture": [
      "court net",
      "court posts",
      "volleyball court"
    ],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_env_001",
      "obs_env_002",
      "obs_env_003",
      "obs_objects_001",
      "obs_objects_002",
      "obs_objects_003"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_objects_001",
      "label": "volleyball court",
      "normalized_label": "volleyball court",
      "object_type": "sports court",
      "colors": [
        "black",
        "red",
        "white"
      ],
      "material_appearance": [
        "flat surface"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 0.97
    },
    {
      "observation_id": "obs_objects_002",
      "label": "volleyball net",
      "normalized_label": "volleyball net",
      "object_type": "net",
      "colors": [
        "black",
        "red",
        "white"
      ],
      "material_appearance": [
        "mesh"
      ],
      "location": "middle of court",
      "count_reference": "count_002",
      "confidence": 0.9
    },
    {
      "observation_id": "obs_objects_003",
      "label": "volleyball posts",
      "normalized_label": "volleyball posts",
      "object_type": "posts",
      "colors": [
        "black"
      ],
      "material_appearance": [
        "cylindrical"
      ],
      "location": "sides of court",
      "count_reference": "count_003",
      "confidence": 0.85
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "bright orange",
      "dark purple",
      "red",
      "white"
    ],
    "lighting": [
      "bright high contrast"
    ],
    "shadows": [
      "soft shadows"
    ],
    "highlights": [
      "bright highlights on court edges"
    ],
    "composition": [
      "central composition"
    ],
    "camera_angle": "slightly angled top right",
    "framing": "tight framing on court",
    "cropping": [],
    "depth": "medium depth",
    "motion_cues": [],
    "motifs": [
      "volleyball court pattern"
    ],
    "repeated_shapes": [
      "rectangles on court"
    ],
    "style_cues": [
      "dramatic lighting"
    ],
    "supporting_observation_ids": [
      "obs_colors_001",
      "obs_colors_002",
      "obs_composition_001",
      "obs_objects_001"
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
        "fact_objects_001"
      ],
      "object_observation_ids": [
        "obs_objects_001",
        "obs_objects_002",
        "obs_objects_003"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_env_001",
        "obs_env_002",
        "obs_env_003",
        "obs_objects_001",
        "obs_objects_002",
        "obs_objects_003"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_composition_001"
      ],
      "observation_ids": [
        "obs_composition_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_colors_001"
      ],
      "observation_ids": [
        "obs_colors_001",
        "obs_colors_002"
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
        "lava terrain",
        "rocky cave walls",
        "lava pool",
        "volleyball court",
        "volleyball court net",
        "volleyball court posts",
        "lava colors",
        "dark purple"
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "card_ui_and_print_markers",
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "counts",
      "review_status": "none_visible",
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
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
      "abstentions": []
    }
  ],
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "lava terrain",
      "supporting_observation_ids": [
        "obs_env_001"
      ]
    },
    {
      "term": "rocky cave walls",
      "supporting_observation_ids": [
        "obs_env_002"
      ]
    },
    {
      "term": "lava pool",
      "supporting_observation_ids": [
        "obs_env_003"
      ]
    },
    {
      "term": "volleyball court",
      "supporting_observation_ids": [
        "obs_objects_001"
      ]
    },
    {
      "term": "volleyball court net",
      "supporting_observation_ids": [
        "obs_objects_002"
      ]
    },
    {
      "term": "volleyball court posts",
      "supporting_observation_ids": [
        "obs_objects_003"
      ]
    },
    {
      "term": "lava colors",
      "supporting_observation_ids": [
        "obs_colors_001"
      ]
    },
    {
      "term": "dark purple",
      "supporting_observation_ids": [
        "obs_colors_002"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "right orientation",
        "source_observation_ids": [
          "obs_composition_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "terrain",
        "source_observation_ids": [
          "obs_env_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.99
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-106 - Tremendous Bomb

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.95`
- Attribute confidence: `0.95`
- Cost USD: `0.0093764`
- Artwork observations: `10`
- Card UI / print-marker observations: `7`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | object | foreground | salient | 0.99 |
| bomb body | bomb body | object | foreground | salient | 0.98 |
| black | black | color | foreground | salient | 0.95 |
| yellow band on bomb | bomb band | object | foreground | salient | 0.95 |
| yellow | yellow | color | foreground | salient | 0.95 |
| bomb fuse | bomb fuse | object | foreground | salient | 0.98 |
| red | red | color | foreground | salient | 0.95 |
| spark at bomb fuse end | spark | visual_effects | foreground | salient | 0.98 |
| shiny highlight on bomb body | highlight | visual_effects | foreground | salient | 0.95 |
| orange and blue radiant background | background gradient | environment | background | salient | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| Japanese card name text at top | card_ui_text | top | visible | 0.99 |
| Japanese card type text at top | card_ui_text | top | visible | 0.99 |
| Japanese card explanatory text block below artwork | card_ui_text | below artwork | visible | 0.99 |
| Japanese text within purple oval shape at bottom right | card_ui_text | bottom right | visible | 0.98 |
| Illustrator text 'Illus. inose yukie' at bottom left | illustrator_text | bottom left | visible | 0.95 |
| Set symbol 'J M5' at bottom left | set_symbol | bottom left | visible | 0.95 |
| Card number 106/081 with SR rarity mark at bottom left | collector_number | bottom left | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | The card shows one bomb object | obs_bomb_001 | 0.99 |
| fact_002 | objects_and_props | The bomb body is black | obs_bomb_body_color_001 | 0.95 |
| fact_003 | objects_and_props | The bomb body has a yellow band | obs_bomb_band_color_001 | 0.95 |
| fact_004 | objects_and_props | The bomb has a red fuse | obs_bomb_fuse_001, obs_bomb_fuse_color_001 | 0.95 |
| fact_005 | visual_effects | There is a visible spark at the fuse end | obs_bomb_fuse_spark_001 | 0.98 |
| fact_006 | visual_effects | The bomb body shows a bright shiny highlight | obs_bomb_body_highlights_001 | 0.95 |
| fact_007 | environment | The background behind the bomb is a radiant orange and blue gradient | obs_bomb_background_001 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_008 | Japanese card name text is visible at the top | obs_card_text_top_001 | 0.99 |
| fact_009 | Japanese card type text is visible at the top | obs_card_type_text_001 | 0.99 |
| fact_010 | Japanese explanatory card text block below artwork | obs_card_text_bottom_001 | 0.99 |
| fact_011 | Japanese text in purple oval shape at bottom right | obs_card_text_bottom_002 | 0.98 |
| fact_012 | Illustrator name 'Illus. inose yukie' is visible at bottom left | obs_illustrator_text_001 | 0.95 |
| fact_013 | Set symbol 'J M5' is visible at bottom left | obs_set_symbol_001 | 0.95 |
| fact_014 | Card number '106/081' and rarity 'SR' are visible at bottom left | obs_card_number_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_008",
    "fact_009",
    "fact_010",
    "fact_011",
    "fact_012",
    "fact_013",
    "fact_014"
  ],
  "name_text_observation_ids": [
    "obs_card_text_top_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_number_001"
  ],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [
    "obs_card_text_bottom_001",
    "obs_card_text_bottom_002"
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
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | complete | low | high |  |
| color_and_light | complete | low | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | none_visible | none | not_applicable |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_bomb_001 | 0.99 |

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
| bomb | obs_bomb_001 |
| bomb body | obs_bomb_body_001 |
| black | obs_bomb_body_color_001 |
| bomb band | obs_bomb_band_001 |
| yellow | obs_bomb_band_color_001 |
| bomb fuse | obs_bomb_fuse_001 |
| red | obs_bomb_fuse_color_001 |
| spark | obs_bomb_fuse_spark_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_bomb_001 | deterministic_rule | 0.92 |
| glowing highlights | obs_bomb_body_highlights_001 | deterministic_rule | 0.92 |
| reflective-looking surface | obs_bomb_body_highlights_001 | deterministic_rule | 0.92 |
| spark | obs_bomb_fuse_spark_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: bomb: 1.
- Quality flags: `potential_module_review_conflicts_with_entries`
- Policy results: 0

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
      "salience": "salient",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_001",
      "kind": "object",
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_color_001",
      "kind": "color",
      "label": "black",
      "normalized_label": "black",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_band_001",
      "kind": "object",
      "label": "yellow band on bomb",
      "normalized_label": "bomb band",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_band_color_001",
      "kind": "color",
      "label": "yellow",
      "normalized_label": "yellow",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_001",
      "kind": "object",
      "label": "bomb fuse",
      "normalized_label": "bomb fuse",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_color_001",
      "kind": "color",
      "label": "red",
      "normalized_label": "red",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_fuse_spark_001",
      "kind": "visual_effects",
      "label": "spark at bomb fuse end",
      "normalized_label": "spark",
      "scene_layer": "foreground",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_body_highlights_001",
      "kind": "visual_effects",
      "label": "shiny highlight on bomb body",
      "normalized_label": "highlight",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_bomb_background_001",
      "kind": "environment",
      "label": "orange and blue radiant background",
      "normalized_label": "background gradient",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_text_top_001",
      "kind": "card_ui_text",
      "label": "Japanese card name text at top",
      "normalized_label": "card name text",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_type_text_001",
      "kind": "card_ui_text",
      "label": "Japanese card type text at top",
      "normalized_label": "card type text",
      "scene_layer": "card_ui",
      "frame_position": "top",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_text_bottom_001",
      "kind": "card_ui_text",
      "label": "Japanese card explanatory text block below artwork",
      "normalized_label": "card text block",
      "scene_layer": "card_ui",
      "frame_position": "below artwork",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_text_bottom_002",
      "kind": "card_ui_text",
      "label": "Japanese text within purple oval shape at bottom right",
      "normalized_label": "card text in oval",
      "scene_layer": "card_ui",
      "frame_position": "bottom right",
      "visibility": "visible",
      "salience": "prominent",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_illustrator_text_001",
      "kind": "illustrator_text",
      "label": "Illustrator text 'Illus. inose yukie' at bottom left",
      "normalized_label": "illustrator text",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "minor",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_set_symbol_001",
      "kind": "set_symbol",
      "label": "Set symbol 'J M5' at bottom left",
      "normalized_label": "set symbol",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "minor",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_number_001",
      "kind": "collector_number",
      "label": "Card number 106/081 with SR rarity mark at bottom left",
      "normalized_label": "card number and rarity",
      "scene_layer": "card_ui",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "minor",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "[0].label",
      "claim": "The card shows one bomb object",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "[0].colors",
      "claim": "The bomb body is black",
      "value": "black",
      "supporting_observation_ids": [
        "obs_bomb_body_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "[0].colors",
      "claim": "The bomb body has a yellow band",
      "value": "yellow",
      "supporting_observation_ids": [
        "obs_bomb_band_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "objects_and_props",
      "field_path": "[1].label",
      "claim": "The bomb has a red fuse",
      "value": "red fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001",
        "obs_bomb_fuse_color_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "visual_effects",
      "field_path": "[0].label",
      "claim": "There is a visible spark at the fuse end",
      "value": "spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_spark_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "visual_effects",
      "field_path": "[1].label",
      "claim": "The bomb body shows a bright shiny highlight",
      "value": "shiny highlight",
      "supporting_observation_ids": [
        "obs_bomb_body_highlights_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "environment",
      "field_path": "setting",
      "claim": "The background behind the bomb is a radiant orange and blue gradient",
      "value": "radiant orange and blue background",
      "supporting_observation_ids": [
        "obs_bomb_background_001"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[0].label",
      "claim": "Japanese card name text is visible at the top",
      "value": "Japanese card name text",
      "supporting_observation_ids": [
        "obs_card_text_top_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text[1].label",
      "claim": "Japanese card type text is visible at the top",
      "value": "Japanese card type text",
      "supporting_observation_ids": [
        "obs_card_type_text_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text[0].label",
      "claim": "Japanese explanatory card text block below artwork",
      "value": "Japanese explanatory text",
      "supporting_observation_ids": [
        "obs_card_text_bottom_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "bottom_line_text[1].label",
      "claim": "Japanese text in purple oval shape at bottom right",
      "value": "Japanese text in purple oval",
      "supporting_observation_ids": [
        "obs_card_text_bottom_002"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text[0].label",
      "claim": "Illustrator name 'Illus. inose yukie' is visible at bottom left",
      "value": "Illustrator name",
      "supporting_observation_ids": [
        "obs_illustrator_text_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol[0].label",
      "claim": "Set symbol 'J M5' is visible at bottom left",
      "value": "set symbol 'J M5'",
      "supporting_observation_ids": [
        "obs_set_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_014",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number[0].label",
      "claim": "Card number '106/081' and rarity 'SR' are visible at bottom left",
      "value": "card number and rarity mark",
      "supporting_observation_ids": [
        "obs_card_number_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "bomb",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_bomb_001",
      "obs_bomb_band_001",
      "obs_bomb_body_001",
      "obs_bomb_body_highlights_001",
      "obs_bomb_fuse_001",
      "obs_bomb_fuse_spark_001"
    ],
    "midground": [],
    "background": [
      "obs_bomb_background_001"
    ]
  },
  "environment": {
    "setting": [
      "radiant orange and blue background"
    ],
    "indoor_outdoor": "uncertain",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_bomb_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "mechanical",
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
      "count_reference": "count_001",
      "confidence": 0.99
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
      "bright highlight on bomb body"
    ],
    "shadows": [
      "shadowed facets on bomb body"
    ],
    "highlights": [
      "bright shiny highlight"
    ],
    "composition": [
      "central bomb object with radiant background"
    ],
    "camera_angle": "frontal and slightly above",
    "framing": "tight framing on bomb centered",
    "cropping": [
      "well cropped"
    ],
    "depth": "moderate depth perception",
    "motion_cues": [
      "spark at fuse"
    ],
    "motifs": [
      "radiant gradient background"
    ],
    "repeated_shapes": [
      "segmented bomb body bands"
    ],
    "style_cues": [
      "graphic cartoon style"
    ],
    "supporting_observation_ids": [
      "obs_bomb_001",
      "obs_bomb_background_001",
      "obs_bomb_body_highlights_001",
      "obs_bomb_fuse_spark_001"
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
        "fact_004"
      ],
      "object_observation_ids": [
        "obs_bomb_001",
        "obs_bomb_band_001",
        "obs_bomb_body_001",
        "obs_bomb_fuse_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_007"
      ],
      "observation_ids": [
        "obs_bomb_background_001"
      ]
    },
    "composition": {
      "fact_ids": [
        "fact_006"
      ],
      "observation_ids": [
        "obs_bomb_001",
        "obs_bomb_body_highlights_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [
        "fact_006"
      ],
      "observation_ids": [
        "obs_bomb_body_highlights_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [
        "fact_005"
      ],
      "observation_ids": [
        "obs_bomb_fuse_spark_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_008",
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013",
        "fact_014"
      ],
      "name_text_observation_ids": [
        "obs_card_text_top_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_number_001"
      ],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [
        "obs_card_text_bottom_001",
        "obs_card_text_bottom_002"
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
      "fact_ids": [
        "fact_001"
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
      "fact_ids": [],
      "terms": [
        "bomb",
        "bomb body",
        "black",
        "bomb band",
        "yellow",
        "bomb fuse",
        "red",
        "spark"
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
      "evidence_quality": "high",
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_bomb_001"
      ]
    },
    {
      "term": "bomb body",
      "supporting_observation_ids": [
        "obs_bomb_body_001"
      ]
    },
    {
      "term": "black",
      "supporting_observation_ids": [
        "obs_bomb_body_color_001"
      ]
    },
    {
      "term": "bomb band",
      "supporting_observation_ids": [
        "obs_bomb_band_001"
      ]
    },
    {
      "term": "yellow",
      "supporting_observation_ids": [
        "obs_bomb_band_color_001"
      ]
    },
    {
      "term": "bomb fuse",
      "supporting_observation_ids": [
        "obs_bomb_fuse_001"
      ]
    },
    {
      "term": "red",
      "supporting_observation_ids": [
        "obs_bomb_fuse_color_001"
      ]
    },
    {
      "term": "spark",
      "supporting_observation_ids": [
        "obs_bomb_fuse_spark_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_bomb_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "glowing highlights",
        "source_observation_ids": [
          "obs_bomb_body_highlights_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "reflective-looking surface",
        "source_observation_ids": [
          "obs_bomb_body_highlights_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_bomb_fuse_spark_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-105 - Dark Bell

- Branch: `item_tool_supporter`
- Review status: `needs_review`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.00895`
- Artwork observations: `5`
- Card UI / print-marker observations: `8`
- Card UI module evidence references: `7`
- Derived digest: Fact digest. Counts: dark bell: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| dark bell | dark bell | object | midground | salient | 1 |
| bell handle | bell handle | object | midground | salient | 0.95 |
| bell body | bell body | object | midground | salient | 0.95 |
| circle inside bell body | circle inside bell | object | midground | salient | 0.9 |
| purple vortex background | purple vortex background | environment | background | supporting | 0.9 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| name text Japanese ダークベル | card_ui_text | top left | visible | 1 |
| Japanese category text グッズ | card_ui_text | top left | visible | 0.95 |
| Japanese category text トレーナーズ | card_ui_text | top right | visible | 0.95 |
| illustrator text Illus. Toystre Beach | card_ui_text | bottom left | visible | 0.9 |
| set code J M5 | card_ui_text | bottom left | visible | 0.9 |
| card number 105/081 SR | card_ui_text | bottom left | visible | 0.9 |
| copyright 2026 Pokémon/Nintendo/Creatures/GAME FREAK | card_ui_text | bottom center | visible | 1 |
| card description text in Japanese | card_ui_text | middle bottom | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_001 | objects_and_props | object is a bell | obs_object_001 | 1 |
| fact_002 | objects_and_props | bell has handle | obs_object_002 | 0.95 |
| fact_003 | objects_and_props | bell has body with geometric facets | obs_object_003 | 0.95 |
| fact_004 | objects_and_props | bell body contains inner circle shape | obs_object_004 | 0.9 |
| fact_005 | environment | background is purple vortex swirl | obs_object_005 | 0.9 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_006 | card name text is ダークベル (Dark Bell) in Japanese | obs_card_ui_001 | 1 |
| fact_007 | card category text is グッズ (Goods) | obs_card_ui_002 | 0.95 |
| fact_008 | card category text is トレーナーズ (Trainers) | obs_card_ui_003 | 0.95 |
| fact_009 | illustrator is Toystre Beach | obs_card_ui_004 | 0.9 |
| fact_010 | set code is J M5 | obs_card_ui_005 | 0.9 |
| fact_011 | collector number is 105/081 SR | obs_card_ui_006 | 0.9 |
| fact_012 | copyright line visible with text 2026 Pokémon/Nintendo/Creatures/GAME FREAK | obs_card_ui_007 | 1 |
| fact_013 | card has Japanese description text | obs_card_ui_008 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_006",
    "fact_007",
    "fact_008",
    "fact_009",
    "fact_010",
    "fact_011",
    "fact_012",
    "fact_013"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_006"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_005"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_006"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_007"
  ],
  "bottom_line_text_observation_ids": [
    "obs_card_ui_008"
  ],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_004"
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
| environment | complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | likely_complete | low | high |  |
| card_ui_and_print_markers | complete | none | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | not_applicable |  |
| surface_and_scan_cues | none_visible | none | not_applicable |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | none | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| dark bell | exact | 1 | obs_object_001 | 1 |

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
| dark bell | obs_object_001 |
| black geometric bell | obs_object_001 |
| purple vortex background | obs_object_005 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| circular motif | obs_object_004 | deterministic_rule | 0.9 |
| spiral motif | obs_object_005 | deterministic_rule | 0.92 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Counts: dark bell: 1.
- Quality flags: `potential_canonical_metadata_in_fact_grounded_search_terms`, `potential_canonical_metadata_in_visual_output`, `potential_metadata_or_identity_language`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_object_001",
      "kind": "object",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_002",
      "kind": "object",
      "label": "bell handle",
      "normalized_label": "bell handle",
      "scene_layer": "midground",
      "frame_position": "upper left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_003",
      "kind": "object",
      "label": "bell body",
      "normalized_label": "bell body",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_004",
      "kind": "object",
      "label": "circle inside bell body",
      "normalized_label": "circle inside bell",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_object_005",
      "kind": "environment",
      "label": "purple vortex background",
      "normalized_label": "purple vortex background",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "supporting",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_001",
      "kind": "card_ui_text",
      "label": "name text Japanese ダークベル",
      "normalized_label": "dark bell",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_002",
      "kind": "card_ui_text",
      "label": "Japanese category text グッズ",
      "normalized_label": "goods (item category)",
      "scene_layer": "foreground",
      "frame_position": "top left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_003",
      "kind": "card_ui_text",
      "label": "Japanese category text トレーナーズ",
      "normalized_label": "trainers",
      "scene_layer": "foreground",
      "frame_position": "top right",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_004",
      "kind": "card_ui_text",
      "label": "illustrator text Illus. Toystre Beach",
      "normalized_label": "illustrator toystre beach",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_005",
      "kind": "card_ui_text",
      "label": "set code J M5",
      "normalized_label": "set code jm5",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_006",
      "kind": "card_ui_text",
      "label": "card number 105/081 SR",
      "normalized_label": "card number 105/081 sr",
      "scene_layer": "foreground",
      "frame_position": "bottom left",
      "visibility": "visible",
      "salience": "salient",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_007",
      "kind": "card_ui_text",
      "label": "copyright 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "normalized_label": "copyright 2026 pokémon/nintendo/creatures/game freak",
      "scene_layer": "foreground",
      "frame_position": "bottom center",
      "visibility": "visible",
      "salience": "supporting",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_008",
      "kind": "card_ui_text",
      "label": "card description text in Japanese",
      "normalized_label": "card description text",
      "scene_layer": "foreground",
      "frame_position": "middle bottom",
      "visibility": "visible",
      "salience": "supporting",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_001",
      "module": "objects_and_props",
      "field_path": "objects.object_001",
      "claim": "object is a bell",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_002",
      "module": "objects_and_props",
      "field_path": "objects.object_001.body_parts.handle",
      "claim": "bell has handle",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_003",
      "module": "objects_and_props",
      "field_path": "objects.object_001.body_parts.body",
      "claim": "bell has body with geometric facets",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_004",
      "module": "objects_and_props",
      "field_path": "objects.object_001.details.inner_circle",
      "claim": "bell body contains inner circle shape",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_005",
      "module": "environment",
      "field_path": "environment.background",
      "claim": "background is purple vortex swirl",
      "value": "true",
      "supporting_observation_ids": [
        "obs_object_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_006",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is ダークベル (Dark Bell) in Japanese",
      "value": "ダークベル",
      "supporting_observation_ids": [
        "obs_card_ui_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_007",
      "module": "card_ui_and_print_markers",
      "field_path": "category_text",
      "claim": "card category text is グッズ (Goods)",
      "value": "グッズ",
      "supporting_observation_ids": [
        "obs_card_ui_002"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_008",
      "module": "card_ui_and_print_markers",
      "field_path": "category_text",
      "claim": "card category text is トレーナーズ (Trainers)",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_003"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_009",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator is Toystre Beach",
      "value": "Toystre Beach",
      "supporting_observation_ids": [
        "obs_card_ui_004"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_010",
      "module": "card_ui_and_print_markers",
      "field_path": "set_code",
      "claim": "set code is J M5",
      "value": "J M5",
      "supporting_observation_ids": [
        "obs_card_ui_005"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_011",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number is 105/081 SR",
      "value": "105/081 SR",
      "supporting_observation_ids": [
        "obs_card_ui_006"
      ],
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_012",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "copyright line visible with text 2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "value": "2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_007"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_013",
      "module": "card_ui_and_print_markers",
      "field_path": "card_description_text",
      "claim": "card has Japanese description text",
      "value": "visible",
      "supporting_observation_ids": [
        "obs_card_ui_008"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_001",
      "normalized_label": "dark bell",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_card_ui_001",
      "obs_card_ui_002",
      "obs_card_ui_003",
      "obs_card_ui_004",
      "obs_card_ui_005",
      "obs_card_ui_006",
      "obs_card_ui_007",
      "obs_card_ui_008"
    ],
    "midground": [
      "obs_object_001",
      "obs_object_002",
      "obs_object_003",
      "obs_object_004"
    ],
    "background": [
      "obs_object_005"
    ]
  },
  "environment": {
    "setting": [
      "indoor or abstract"
    ],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_object_005"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_object_001",
      "label": "dark bell",
      "normalized_label": "dark bell",
      "object_type": "object",
      "colors": [
        "black",
        "blue highlights",
        "dark gray",
        "white outlines"
      ],
      "material_appearance": [
        "dark rounded surface",
        "faceted geometric shapes",
        "white outline"
      ],
      "location": "center",
      "count_reference": "count_001",
      "confidence": 1
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "black",
      "blue",
      "dark gray",
      "purple",
      "white"
    ],
    "lighting": [
      "center glow highlight on bell body",
      "shiny highlight on facets"
    ],
    "shadows": [
      "soft shadow under bell handle"
    ],
    "highlights": [
      "blue luminous highlights on bell surfaces"
    ],
    "composition": [
      "bell slightly angled upwards to upper left",
      "center composition"
    ],
    "camera_angle": "straight on",
    "framing": "tight framing of bell with vortex background",
    "cropping": [],
    "depth": "moderate depth with sharp focus on bell",
    "motion_cues": [
      "swirling background suggesting motion"
    ],
    "motifs": [
      "vortex swirl behind bell"
    ],
    "repeated_shapes": [
      "geometric polygonal shapes on bell body"
    ],
    "style_cues": [
      "bold contrast",
      "clean lines"
    ],
    "supporting_observation_ids": [
      "obs_object_001",
      "obs_object_005"
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
        "fact_004"
      ],
      "object_observation_ids": [
        "obs_object_001",
        "obs_object_002",
        "obs_object_003",
        "obs_object_004"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_005"
      ],
      "observation_ids": [
        "obs_object_005"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_001",
        "obs_object_005"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_001",
        "obs_object_005"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": [
        "obs_object_005"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_006",
        "fact_007",
        "fact_008",
        "fact_009",
        "fact_010",
        "fact_011",
        "fact_012",
        "fact_013"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_006"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_005"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_006"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_007"
      ],
      "bottom_line_text_observation_ids": [
        "obs_card_ui_008"
      ],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_004"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
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
      "fact_ids": [],
      "terms": [
        "dark bell",
        "black geometric bell",
        "purple vortex background"
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
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "likely_complete",
      "omission_risk": "low",
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
      "review_status": "likely_complete",
      "omission_risk": "low",
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
      "review_status": "none_visible",
      "omission_risk": "none",
      "evidence_quality": "high",
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "dark bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "black geometric bell",
      "supporting_observation_ids": [
        "obs_object_001"
      ]
    },
    {
      "term": "purple vortex background",
      "supporting_observation_ids": [
        "obs_object_005"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "circular motif",
        "source_observation_ids": [
          "obs_object_004"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_object_005"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-074 - リトライバッジ

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `1`
- Attribute confidence: `0.95`
- Cost USD: `0.0074776`
- Artwork observations: `5`
- Card UI / print-marker observations: `9`
- Card UI module evidence references: `6`
- Derived digest: Fact digest. Visible observations: star badge, star, silver metallic, ribbon, blue swirl. Counts: silver star badge with ribbon: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| silver star badge | star badge | object | midground | high | 1 |
| star shape | star | object_part | midground | high | 1 |
| silver metallic-colored | silver metallic | object_material_appearance | midground | high | 0.9 |
| silver ribbon | ribbon | object_part | midground | medium | 0.95 |
| blue swirled pattern | blue swirl | background | background | medium | 1 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| リトライバッジ | card_name_text | top-left | visible | 1 |
| トレーナーズ | card_ui_text | top-right | visible | 1 |
| Illus. Toyste Beach | illustrator_text | bottom-left | visible | 1 |
| JPN M5 | set_symbol | bottom-left | visible | 1 |
| 074/081 | collector_number | bottom-left | visible | 1 |
| ©2026 Pokémon/Nintendo/Creatures/GAME FREAK. | copyright_text | bottom-center | visible | 1 |
| U | rarity_mark | bottom-left | visible | 1 |
| ポケモンのどうぐ | card_ui_text | top-left-bar | visible | 1 |
| Japanese text rule box | card_ui_text | center-lower | visible | 1 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | The card features a silver star-shaped badge with a ribbon in the illustration | obs_main_object_001, obs_main_object_material_appearance_001, obs_main_object_ribbon_001, obs_main_object_shape_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | Card name text visible as 'リトライバッジ' | obs_card_ui_name_text_001 | 1 |
| fact_ui_002 | Card type indicated as 'トレーナーズ' text | obs_card_ui_subtype_text_001 | 1 |
| fact_ui_003 | Illustrator text 'Illus. Toyste Beach' is visible | obs_card_ui_illus_and_credits_001 | 1 |
| fact_ui_004 | Set symbol 'JPN M5' is visible on card | obs_card_ui_set_icon_001 | 1 |
| fact_ui_005 | Collector number '074/081' is visible | obs_card_ui_collector_number_001 | 1 |
| fact_ui_006 | Copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' is visible | obs_card_ui_copyright_001 | 1 |
| fact_ui_007 | Rarity mark 'U' is visible | obs_card_ui_rarity_mark_001 | 1 |
| fact_ui_008 | Card has 'ポケモンのどうぐ' text in title bar visible | obs_card_ui_level_bar_001 | 1 |
| fact_ui_009 | Rule box text visible in Japanese in center-lower panel | obs_card_ui_rulebox_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_001",
    "fact_ui_002",
    "fact_ui_003",
    "fact_ui_004",
    "fact_ui_005",
    "fact_ui_006",
    "fact_ui_007",
    "fact_ui_008",
    "fact_ui_009"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_text_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_collector_number_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_icon_001"
  ],
  "rarity_mark_observation_ids": [
    "obs_card_ui_rarity_mark_001"
  ],
  "copyright_line_observation_ids": [
    "obs_card_ui_copyright_001"
  ],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illus_and_credits_001"
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
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | likely_complete | low | high |  |
| composition | likely_complete | low | high |  |
| color_and_light | likely_complete | low | high |  |
| visual_effects | none_visible | none | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | none | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | not_applicable | none | high |  |
| fact_grounded_search_terms | likely_complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| silver star badge with ribbon | exact | 1 | obs_main_object_001 | 1 |

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
| silver star badge | obs_main_object_001 |
| star badge with ribbon | obs_main_object_ribbon_001 |
| blue swirl background | obs_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| metal-like appearance | obs_main_object_material_appearance_001 | deterministic_rule | 0.9 |
| spiral motif | obs_background_001 | deterministic_rule | 1 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: star badge, star, silver metallic, ribbon, blue swirl. Counts: silver star badge with ribbon: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_card_ui_name_text_001",
      "kind": "card_name_text",
      "label": "リトライバッジ",
      "normalized_label": "リトライバッジ",
      "scene_layer": "ui",
      "frame_position": "top-left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_subtype_text_001",
      "kind": "card_ui_text",
      "label": "トレーナーズ",
      "normalized_label": "トレーナーズ",
      "scene_layer": "ui",
      "frame_position": "top-right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_main_object_001",
      "kind": "object",
      "label": "silver star badge",
      "normalized_label": "star badge",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_main_object_shape_001",
      "kind": "object_part",
      "label": "star shape",
      "normalized_label": "star",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_main_object_material_appearance_001",
      "kind": "object_material_appearance",
      "label": "silver metallic-colored",
      "normalized_label": "silver metallic",
      "scene_layer": "midground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.9,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_main_object_ribbon_001",
      "kind": "object_part",
      "label": "silver ribbon",
      "normalized_label": "ribbon",
      "scene_layer": "midground",
      "frame_position": "center-bottom",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_background_001",
      "kind": "background",
      "label": "blue swirled pattern",
      "normalized_label": "blue swirl",
      "scene_layer": "background",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illus_and_credits_001",
      "kind": "illustrator_text",
      "label": "Illus. Toyste Beach",
      "normalized_label": "illus toyste beach",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_icon_001",
      "kind": "set_symbol",
      "label": "JPN M5",
      "normalized_label": "jpn m5",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_collector_number_001",
      "kind": "collector_number",
      "label": "074/081",
      "normalized_label": "074/081",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_copyright_001",
      "kind": "copyright_text",
      "label": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK.",
      "normalized_label": "©2026 pokémon/nintendo/creatures/game freak.",
      "scene_layer": "ui",
      "frame_position": "bottom-center",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rarity_mark_001",
      "kind": "rarity_mark",
      "label": "U",
      "normalized_label": "uncommon",
      "scene_layer": "ui",
      "frame_position": "bottom-left",
      "visibility": "visible",
      "salience": "low",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_level_bar_001",
      "kind": "card_ui_text",
      "label": "ポケモンのどうぐ",
      "normalized_label": "pokemon tool",
      "scene_layer": "ui",
      "frame_position": "top-left-bar",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_rulebox_001",
      "kind": "card_ui_text",
      "label": "Japanese text rule box",
      "normalized_label": "rule box text",
      "scene_layer": "ui",
      "frame_position": "center-lower",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 1,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "main_object",
      "claim": "The card features a silver star-shaped badge with a ribbon in the illustration",
      "value": "silver star badge with ribbon",
      "supporting_observation_ids": [
        "obs_main_object_001",
        "obs_main_object_material_appearance_001",
        "obs_main_object_ribbon_001",
        "obs_main_object_shape_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "Card name text visible as 'リトライバッジ'",
      "value": "リトライバッジ",
      "supporting_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "card_type_text",
      "claim": "Card type indicated as 'トレーナーズ' text",
      "value": "トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_subtype_text_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "Illustrator text 'Illus. Toyste Beach' is visible",
      "value": "Illus. Toyste Beach",
      "supporting_observation_ids": [
        "obs_card_ui_illus_and_credits_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "Set symbol 'JPN M5' is visible on card",
      "value": "JPN M5",
      "supporting_observation_ids": [
        "obs_card_ui_set_icon_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "Collector number '074/081' is visible",
      "value": "074/081",
      "supporting_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_006",
      "module": "card_ui_and_print_markers",
      "field_path": "copyright_line",
      "claim": "Copyright line '©2026 Pokémon/Nintendo/Creatures/GAME FREAK.' is visible",
      "value": "©2026 Pokémon/Nintendo/Creatures/GAME FREAK",
      "supporting_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_007",
      "module": "card_ui_and_print_markers",
      "field_path": "rarity_mark",
      "claim": "Rarity mark 'U' is visible",
      "value": "U",
      "supporting_observation_ids": [
        "obs_card_ui_rarity_mark_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_008",
      "module": "card_ui_and_print_markers",
      "field_path": "level_bar_text",
      "claim": "Card has 'ポケモンのどうぐ' text in title bar visible",
      "value": "ポケモンのどうぐ",
      "supporting_observation_ids": [
        "obs_card_ui_level_bar_001"
      ],
      "confidence": 1,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_009",
      "module": "card_ui_and_print_markers",
      "field_path": "rule_box_text",
      "claim": "Rule box text visible in Japanese in center-lower panel",
      "value": "Japanese rule box text present",
      "supporting_observation_ids": [
        "obs_card_ui_rulebox_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "subjects": [],
  "depicted_subjects": [],
  "character_representations": [],
  "counts": [
    {
      "count_id": "count_obj_001",
      "normalized_label": "silver star badge with ribbon",
      "count_type": "exact",
      "exact_count": 1,
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_main_object_001"
      ],
      "scene_layer": "midground",
      "confidence": 1
    }
  ],
  "scene_layers": {
    "foreground": [],
    "midground": [
      "obs_main_object_001",
      "obs_main_object_material_appearance_001",
      "obs_main_object_ribbon_001",
      "obs_main_object_shape_001"
    ],
    "background": [
      "obs_background_001"
    ]
  },
  "environment": {
    "setting": [
      "indoor or artificial background"
    ],
    "indoor_outdoor": "uncertain",
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
      "observation_id": "obs_main_object_001",
      "label": "silver star badge with ribbon",
      "normalized_label": "silver star badge with ribbon",
      "object_type": "badge",
      "colors": [
        "silver",
        "white"
      ],
      "material_appearance": [
        "metallic-looking"
      ],
      "location": "center",
      "count_reference": "count_obj_001",
      "confidence": 1
    }
  ],
  "relationships": [],
  "visual_design": {
    "palette": [
      "blue",
      "silvery gray",
      "white"
    ],
    "lighting": [
      "diffuse even lighting"
    ],
    "shadows": [],
    "highlights": [
      "bright highlights on badge"
    ],
    "composition": [
      "badge centered"
    ],
    "camera_angle": "straight-on",
    "framing": "tight framing on badge",
    "cropping": [],
    "depth": "moderate depth with background swirl",
    "motion_cues": [],
    "motifs": [
      "ribbon tails",
      "star shape"
    ],
    "repeated_shapes": [],
    "style_cues": [
      "clean digital style"
    ],
    "supporting_observation_ids": [
      "obs_background_001",
      "obs_main_object_001",
      "obs_main_object_material_appearance_001",
      "obs_main_object_ribbon_001",
      "obs_main_object_shape_001"
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
        "fact_obj_001"
      ],
      "object_observation_ids": [
        "obs_main_object_001"
      ]
    },
    "environment": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001"
      ]
    },
    "composition": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_main_object_001"
      ]
    },
    "color_and_light": {
      "fact_ids": [],
      "observation_ids": [
        "obs_background_001",
        "obs_main_object_material_appearance_001"
      ]
    },
    "visual_effects": {
      "fact_ids": [],
      "observation_ids": []
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005",
        "fact_ui_006",
        "fact_ui_007",
        "fact_ui_008",
        "fact_ui_009"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_text_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_collector_number_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_icon_001"
      ],
      "rarity_mark_observation_ids": [
        "obs_card_ui_rarity_mark_001"
      ],
      "copyright_line_observation_ids": [
        "obs_card_ui_copyright_001"
      ],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illus_and_credits_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_obj_001"
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
        "silver star badge",
        "star badge with ribbon",
        "blue swirl background"
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
      "review_status": "likely_complete",
      "omission_risk": "low",
      "evidence_quality": "high",
      "abstentions": []
    },
    {
      "module": "composition",
      "review_status": "likely_complete",
      "omission_risk": "low",
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
  "semantic_visual_facts": [],
  "uncertainty_and_abstentions": [],
  "fact_grounded_search_terms": [
    {
      "term": "silver star badge",
      "supporting_observation_ids": [
        "obs_main_object_001"
      ]
    },
    {
      "term": "star badge with ribbon",
      "supporting_observation_ids": [
        "obs_main_object_ribbon_001"
      ]
    },
    {
      "term": "blue swirl background",
      "supporting_observation_ids": [
        "obs_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "metal-like appearance",
        "source_observation_ids": [
          "obs_main_object_material_appearance_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.9
      },
      {
        "concept": "spiral motif",
        "source_observation_ids": [
          "obs_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 1
      }
    ]
  }
}
```

</details>

### GV-PK-JPN-M5-073 - ごうかいボム

- Branch: `item_tool_supporter`
- Review status: `pending`
- Description confidence: `0.98`
- Attribute confidence: `0.97`
- Cost USD: `0.0091544`
- Artwork observations: `7`
- Card UI / print-marker observations: `5`
- Card UI module evidence references: `4`
- Derived digest: Fact digest. Visible observations: bomb, bomb body, bomb fuse, explosion icon, yellow and black band around bomb, spark explosion at fuse tip, blue and orange radial burst background. Counts: bomb: 1.
- Surface/scan digest: No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: none_visible.

#### Artwork Observations

| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |
|---|---|---|---|---|---:|
| bomb | bomb | objects_and_props | foreground | high | 0.99 |
| bomb body | bomb body | objects_and_props | foreground | high | 0.98 |
| bomb fuse | bomb fuse | objects_and_props | foreground | medium | 0.96 |
| explosion icon | explosion icon | objects_and_props | foreground | medium | 0.96 |
| yellow and black band around bomb | yellow and black band around bomb | objects_and_props | foreground | medium | 0.97 |
| spark explosion at fuse tip | spark explosion at fuse tip | visual_effects | foreground | high | 0.98 |
| blue and orange radial burst background | blue and orange radial burst background | environment | background | medium | 0.95 |

#### Card UI And Print-Marker Observations

| Observation | Kind | Frame position | Visibility | Confidence |
|---|---|---|---|---:|
| ごうかいボム | card_ui_text | top_left | visible | 0.99 |
| illus. inose yukie | card_ui_text | bottom_left | visible | 0.98 |
| 073/081 | collector_number | bottom_left | visible | 0.98 |
| jpn-m5 | set_symbol | bottom_left | visible | 0.95 |
| ポケモンのどうぐ トレーナーズ | card_ui_text | top_bar | visible | 0.95 |

#### Typed Artwork Modules

| Typed fact | Module | Claim | Support | Confidence |
|---|---|---|---|---:|
| fact_obj_001 | objects_and_props | main object on card is a bomb | obs_artwork_bomb_001 | 0.99 |
| fact_obj_002 | objects_and_props | bomb body is black and round with a reflective looking highlight | obs_artwork_bomb_body_001 | 0.98 |
| fact_obj_003 | objects_and_props | bomb has a red fuse | obs_artwork_bomb_fuse_001 | 0.96 |
| fact_obj_004 | objects_and_props | bomb has a yellow explosion icon on the body | obs_artwork_bomb_explosion_icon_001 | 0.96 |
| fact_obj_005 | objects_and_props | bomb has a yellow and black diagonal striped band around the middle | obs_artwork_bomb_band_001 | 0.97 |
| fact_ve_001 | visual_effects | there is a bright spark explosion effect at the tip of the fuse | obs_artwork_explosion_effect_001 | 0.98 |
| fact_env_001 | environment | background is a radial burst pattern with blue and orange colors | obs_artwork_background_001 | 0.95 |

#### Card UI And Print-Marker Module

| Typed fact | Claim | Support | Confidence |
|---|---|---|---:|
| fact_ui_001 | card name text is ごうかいボム | obs_card_ui_name_001 | 0.99 |
| fact_ui_002 | illustrator text is illus. inose yukie | obs_card_ui_illustrator_001 | 0.98 |
| fact_ui_003 | collector number is 073/081 | obs_card_ui_set_code_001 | 0.98 |
| fact_ui_004 | set symbol code is jpn-m5 | obs_card_ui_set_symbol_001 | 0.95 |
| fact_ui_005 | top bar text says ポケモンのどうぐ トレーナーズ | obs_card_ui_jp_trainer_text_001 | 0.95 |

<details><summary>Card UI module JSON</summary>

```json
{
  "fact_ids": [
    "fact_ui_001",
    "fact_ui_002",
    "fact_ui_003",
    "fact_ui_004",
    "fact_ui_005"
  ],
  "name_text_observation_ids": [
    "obs_card_ui_name_001"
  ],
  "hp_text_observation_ids": [],
  "collector_number_observation_ids": [
    "obs_card_ui_set_code_001"
  ],
  "set_symbol_observation_ids": [
    "obs_card_ui_set_symbol_001"
  ],
  "rarity_mark_observation_ids": [],
  "copyright_line_observation_ids": [],
  "bottom_line_text_observation_ids": [],
  "promo_stamp_observation_ids": [],
  "logo_observation_ids": [],
  "energy_symbol_observation_ids": [],
  "regulation_mark_observation_ids": [],
  "illustrator_text_observation_ids": [
    "obs_card_ui_illustrator_001"
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
| human_appearance | none_visible | none | high |  |
| creature_anatomy | none_visible | none | high |  |
| clothing | none_visible | none | high |  |
| objects_and_props | complete | low | high |  |
| environment | complete | low | high |  |
| composition | none_visible | none | high |  |
| color_and_light | none_visible | none | high |  |
| visual_effects | complete | low | high |  |
| card_ui_and_print_markers | complete | low | high |  |
| counts | complete | low | high |  |
| relationships | none_visible | none | high |  |
| surface_and_scan_cues | none_visible | none | high |  |
| uncertainty_and_abstentions | none_visible | none | high |  |
| fact_grounded_search_terms | complete | low | high |  |

#### Semantic Visual Facts

| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |
|---|---|---|---|---|---|---:|
| none recorded | | | | | | |

#### Counts

| Count | Type | Value | Support | Confidence |
|---|---|---|---|---:|
| bomb | exact | 1 | obs_artwork_bomb_001 | 0.99 |

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
| bomb | obs_artwork_bomb_001 |
| black rounded body | obs_artwork_bomb_body_001 |
| red fuse | obs_artwork_bomb_fuse_001 |
| yellow and black striped band | obs_artwork_bomb_band_001 |
| explosion spark | obs_artwork_explosion_effect_001 |
| blue and orange radial burst background | obs_artwork_background_001 |

#### Canonical Visual Concepts

| Concept | Source observations | Derivation | Confidence |
|---|---|---|---:|
| centered composition | obs_artwork_bomb_001 | deterministic_rule | 0.92 |
| explosion | obs_artwork_bomb_explosion_icon_001, obs_artwork_explosion_effect_001 | deterministic_rule | 0.98 |
| radial lines | obs_artwork_background_001 | deterministic_rule | 0.95 |
| spark | obs_artwork_explosion_effect_001 | deterministic_rule | 0.98 |

#### Flags And Digest

- Deterministic compatibility digest: Fact digest. Visible observations: bomb, bomb body, bomb fuse, explosion icon, yellow and black band around bomb, spark explosion at fuse tip, blue and orange radial burst background. Counts: bomb: 1.
- Quality flags: `none`
- Policy results: 0

<details><summary>Full fact graph JSON</summary>

```json
{
  "observations": [
    {
      "observation_id": "obs_card_ui_name_001",
      "kind": "card_ui_text",
      "label": "ごうかいボム",
      "normalized_label": "ごうかいボム",
      "scene_layer": "ui",
      "frame_position": "top_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_illustrator_001",
      "kind": "card_ui_text",
      "label": "illus. inose yukie",
      "normalized_label": "illus. inose yukie",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_code_001",
      "kind": "collector_number",
      "label": "073/081",
      "normalized_label": "073/081",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_set_symbol_001",
      "kind": "set_symbol",
      "label": "jpn-m5",
      "normalized_label": "jpn-m5",
      "scene_layer": "ui",
      "frame_position": "bottom_left",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_card_ui_jp_trainer_text_001",
      "kind": "card_ui_text",
      "label": "ポケモンのどうぐ トレーナーズ",
      "normalized_label": "ポケモンのどうぐ トレーナーズ",
      "scene_layer": "ui",
      "frame_position": "top_bar",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_001",
      "kind": "objects_and_props",
      "label": "bomb",
      "normalized_label": "bomb",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_body_001",
      "kind": "objects_and_props",
      "label": "bomb body",
      "normalized_label": "bomb body",
      "scene_layer": "foreground",
      "frame_position": "center",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_fuse_001",
      "kind": "objects_and_props",
      "label": "bomb fuse",
      "normalized_label": "bomb fuse",
      "scene_layer": "foreground",
      "frame_position": "center_right",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_explosion_icon_001",
      "kind": "objects_and_props",
      "label": "explosion icon",
      "normalized_label": "explosion icon",
      "scene_layer": "foreground",
      "frame_position": "on_bomb_body",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_bomb_band_001",
      "kind": "objects_and_props",
      "label": "yellow and black band around bomb",
      "normalized_label": "yellow and black band around bomb",
      "scene_layer": "foreground",
      "frame_position": "around_bomb_body",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_explosion_effect_001",
      "kind": "visual_effects",
      "label": "spark explosion at fuse tip",
      "normalized_label": "spark explosion at fuse tip",
      "scene_layer": "foreground",
      "frame_position": "fuse_tip",
      "visibility": "visible",
      "salience": "high",
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "observation_id": "obs_artwork_background_001",
      "kind": "environment",
      "label": "blue and orange radial burst background",
      "normalized_label": "blue and orange radial burst background",
      "scene_layer": "background",
      "frame_position": "full",
      "visibility": "visible",
      "salience": "medium",
      "confidence": 0.95,
      "evidence_strength": "strong"
    }
  ],
  "typed_facts": [
    {
      "fact_id": "fact_obj_001",
      "module": "objects_and_props",
      "field_path": "objects_and_props[0]",
      "claim": "main object on card is a bomb",
      "value": "bomb",
      "supporting_observation_ids": [
        "obs_artwork_bomb_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_002",
      "module": "objects_and_props",
      "field_path": "objects_and_props[1]",
      "claim": "bomb body is black and round with a reflective looking highlight",
      "value": "black rounded body with reflective highlight",
      "supporting_observation_ids": [
        "obs_artwork_bomb_body_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_003",
      "module": "objects_and_props",
      "field_path": "objects_and_props[2]",
      "claim": "bomb has a red fuse",
      "value": "red fuse",
      "supporting_observation_ids": [
        "obs_artwork_bomb_fuse_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_004",
      "module": "objects_and_props",
      "field_path": "objects_and_props[3]",
      "claim": "bomb has a yellow explosion icon on the body",
      "value": "yellow explosion icon",
      "supporting_observation_ids": [
        "obs_artwork_bomb_explosion_icon_001"
      ],
      "confidence": 0.96,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_obj_005",
      "module": "objects_and_props",
      "field_path": "objects_and_props[4]",
      "claim": "bomb has a yellow and black diagonal striped band around the middle",
      "value": "yellow and black striped band",
      "supporting_observation_ids": [
        "obs_artwork_bomb_band_001"
      ],
      "confidence": 0.97,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ve_001",
      "module": "visual_effects",
      "field_path": "visual_effects[0]",
      "claim": "there is a bright spark explosion effect at the tip of the fuse",
      "value": "bright spark explosion",
      "supporting_observation_ids": [
        "obs_artwork_explosion_effect_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_env_001",
      "module": "environment",
      "field_path": "environment.background",
      "claim": "background is a radial burst pattern with blue and orange colors",
      "value": "blue and orange radial burst",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_001",
      "module": "card_ui_and_print_markers",
      "field_path": "name_text",
      "claim": "card name text is ごうかいボム",
      "value": "ごうかいボム",
      "supporting_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "confidence": 0.99,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_002",
      "module": "card_ui_and_print_markers",
      "field_path": "illustrator_text",
      "claim": "illustrator text is illus. inose yukie",
      "value": "illus. inose yukie",
      "supporting_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_003",
      "module": "card_ui_and_print_markers",
      "field_path": "collector_number",
      "claim": "collector number is 073/081",
      "value": "073/081",
      "supporting_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "confidence": 0.98,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_004",
      "module": "card_ui_and_print_markers",
      "field_path": "set_symbol",
      "claim": "set symbol code is jpn-m5",
      "value": "jpn-m5",
      "supporting_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "confidence": 0.95,
      "evidence_strength": "strong"
    },
    {
      "fact_id": "fact_ui_005",
      "module": "card_ui_and_print_markers",
      "field_path": "top_bar_text",
      "claim": "top bar text says ポケモンのどうぐ トレーナーズ",
      "value": "ポケモンのどうぐ トレーナーズ",
      "supporting_observation_ids": [
        "obs_card_ui_jp_trainer_text_001"
      ],
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
      "estimated_min": 0,
      "estimated_max": 0,
      "abstention_reason": "",
      "supporting_observation_ids": [
        "obs_artwork_bomb_001"
      ],
      "scene_layer": "foreground",
      "confidence": 0.99
    }
  ],
  "scene_layers": {
    "foreground": [
      "obs_artwork_bomb_001",
      "obs_artwork_bomb_band_001",
      "obs_artwork_bomb_body_001",
      "obs_artwork_bomb_explosion_icon_001",
      "obs_artwork_bomb_fuse_001",
      "obs_artwork_explosion_effect_001"
    ],
    "midground": [],
    "background": [
      "obs_artwork_background_001"
    ]
  },
  "environment": {
    "setting": [],
    "indoor_outdoor": "indoor",
    "sky": [],
    "ground": [],
    "terrain": [],
    "plants": [],
    "architecture": [],
    "water": [],
    "weather": [],
    "time_of_day_cues": [],
    "supporting_observation_ids": [
      "obs_artwork_background_001"
    ]
  },
  "objects_and_props": [
    {
      "observation_id": "obs_artwork_bomb_001",
      "label": "bomb",
      "normalized_label": "bomb",
      "object_type": "main object",
      "colors": [
        "black",
        "red",
        "yellow"
      ],
      "material_appearance": [
        "dark rounded body",
        "reflective highlight"
      ],
      "location": "center",
      "count_reference": "count_bomb_001",
      "confidence": 0.99
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
      "bright spark on fuse",
      "highlight on bomb body"
    ],
    "shadows": [
      "soft shadows on bomb surface"
    ],
    "highlights": [
      "reflective highlight on bomb"
    ],
    "composition": [
      "centered main object",
      "radial burst background"
    ],
    "camera_angle": "slightly top side angle",
    "framing": "tight framing on bomb object",
    "cropping": [],
    "depth": "shallow depth of field",
    "motion_cues": [
      "spark explosion effect"
    ],
    "motifs": [
      "explosion icon"
    ],
    "repeated_shapes": [
      "hexagonal panels on bomb body"
    ],
    "style_cues": [
      "bright vivid colors",
      "clean line art"
    ],
    "supporting_observation_ids": [
      "obs_artwork_background_001",
      "obs_artwork_bomb_001",
      "obs_artwork_explosion_effect_001"
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
        "fact_obj_001",
        "fact_obj_002",
        "fact_obj_003",
        "fact_obj_004",
        "fact_obj_005"
      ],
      "object_observation_ids": [
        "obs_artwork_bomb_001",
        "obs_artwork_bomb_band_001",
        "obs_artwork_bomb_body_001",
        "obs_artwork_bomb_explosion_icon_001",
        "obs_artwork_bomb_fuse_001"
      ]
    },
    "environment": {
      "fact_ids": [
        "fact_env_001"
      ],
      "observation_ids": [
        "obs_artwork_background_001"
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
      "fact_ids": [
        "fact_ve_001"
      ],
      "observation_ids": [
        "obs_artwork_explosion_effect_001"
      ]
    },
    "card_ui_and_print_markers": {
      "fact_ids": [
        "fact_ui_001",
        "fact_ui_002",
        "fact_ui_003",
        "fact_ui_004",
        "fact_ui_005"
      ],
      "name_text_observation_ids": [
        "obs_card_ui_name_001"
      ],
      "hp_text_observation_ids": [],
      "collector_number_observation_ids": [
        "obs_card_ui_set_code_001"
      ],
      "set_symbol_observation_ids": [
        "obs_card_ui_set_symbol_001"
      ],
      "rarity_mark_observation_ids": [],
      "copyright_line_observation_ids": [],
      "bottom_line_text_observation_ids": [],
      "promo_stamp_observation_ids": [],
      "logo_observation_ids": [],
      "energy_symbol_observation_ids": [],
      "regulation_mark_observation_ids": [],
      "illustrator_text_observation_ids": [
        "obs_card_ui_illustrator_001"
      ],
      "error_marker_observation_ids": [],
      "other_print_marker_observation_ids": []
    },
    "counts": {
      "fact_ids": [],
      "count_ids": [
        "count_bomb_001"
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
        "bomb",
        "black rounded body",
        "red fuse",
        "yellow and black striped band",
        "explosion spark",
        "blue and orange radial burst background"
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
      "review_status": "complete",
      "omission_risk": "low",
      "evidence_quality": "high",
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
      "omission_risk": "low",
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
      "review_status": "none_visible",
      "omission_risk": "none",
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
      "term": "bomb",
      "supporting_observation_ids": [
        "obs_artwork_bomb_001"
      ]
    },
    {
      "term": "black rounded body",
      "supporting_observation_ids": [
        "obs_artwork_bomb_body_001"
      ]
    },
    {
      "term": "red fuse",
      "supporting_observation_ids": [
        "obs_artwork_bomb_fuse_001"
      ]
    },
    {
      "term": "yellow and black striped band",
      "supporting_observation_ids": [
        "obs_artwork_bomb_band_001"
      ]
    },
    {
      "term": "explosion spark",
      "supporting_observation_ids": [
        "obs_artwork_explosion_effect_001"
      ]
    },
    {
      "term": "blue and orange radial burst background",
      "supporting_observation_ids": [
        "obs_artwork_background_001"
      ]
    }
  ],
  "canonical_visual_concepts": {
    "concept_schema_version": "CARD_VISUAL_CONTROLLED_VOCABULARY_V1",
    "concepts": [
      {
        "concept": "centered composition",
        "source_observation_ids": [
          "obs_artwork_bomb_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.92
      },
      {
        "concept": "explosion",
        "source_observation_ids": [
          "obs_artwork_bomb_explosion_icon_001",
          "obs_artwork_explosion_effect_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      },
      {
        "concept": "radial lines",
        "source_observation_ids": [
          "obs_artwork_background_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.95
      },
      {
        "concept": "spark",
        "source_observation_ids": [
          "obs_artwork_explosion_effect_001"
        ],
        "derivation": "deterministic_rule",
        "confidence": 0.98
      }
    ]
  }
}
```

</details>

## Validation Failures

- GV-PK-JPN-M5-113: fact_graph_environment_claim_without_support
- GV-PK-JPN-M5-118: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_002
- GV-PK-JPN-M5-097: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_003
- GV-PK-JPN-M5-063: fact_graph_semantic_fact_label_not_supported_v1:sem_001
- GV-PK-JPN-M5-110: fact_graph_semantic_fact_label_not_supported_v1:sem_004
- GV-PK-JPN-TCGCOLLECTOR11526-019: fact_graph_semantic_fact_label_not_supported_v1:sem_fact_night_001
- GV-PK-JPN-TCGCOLLECTOR11525-019: fact_graph_module_observation_missing:fact_graph.modules.objects_and_props.object_observation_ids:obj_palm_trees_left_001, fact_graph_module_observation_missing:fact_graph.modules.objects_and_props.object_observation_ids:obj_palm_trees_right_001, fact_graph_module_observation_missing:fact_graph.modules.objects_and_props.object_observation_ids:obj_stone_steps_001, fact_graph_module_observation_missing:fact_graph.modules.objects_and_props.object_observation_ids:obj_stone_wall_001, fact_graph_object_observation_missing:obj_palm_trees_left_001, fact_graph_object_observation_missing:obj_palm_trees_right_001, fact_graph_object_observation_missing:obj_stone_steps_001, fact_graph_object_observation_missing:obj_stone_wall_001

